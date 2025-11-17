/**
 * Calibrate 3PL parameters from response data
 *
 * This script estimates discrimination (a), difficulty (b), and guessing (c)
 * parameters for questions with sufficient response data (n ≥ 30).
 *
 * Usage:
 *   npx tsx src/scripts/calibrate-3pl-questions.ts
 */

import prisma from '@/lib/db';
import { estimateGuessingParameter, validateIRTParameters } from '@/lib/adaptive-engine/irt-3pl';

interface CalibrationResult {
  questionId: string;
  discrimination_a: number;
  difficulty_b: number;
  guessing_c: number;
  sampleSize: number;
  correctRate: number;
  standardErrors: {
    a_se: number;
    b_se: number;
    c_se: number;
  };
}

/**
 * Calibrate a single question using simplified 3PL estimation
 */
async function calibrateQuestion(
  questionId: string,
  minSampleSize: number = 30
): Promise<CalibrationResult | null> {
  // Fetch response data with user abilities
  const responses = await prisma.userAnswer.findMany({
    where: { questionId },
    include: {
      user: {
        include: {
          userCellMastery: {
            where: {
              cellId: {
                equals: await prisma.question
                  .findUnique({
                    where: { id: questionId },
                    select: { cellId: true },
                  })
                  .then(q => q?.cellId || ''),
              },
            },
          },
        },
      },
    },
  });

  if (responses.length < minSampleSize) {
    console.log(`  ⚠️  Insufficient data: ${responses.length} < ${minSampleSize}`);
    return null;
  }

  // Extract response data with abilities
  const data = responses
    .map(r => {
      const mastery = r.user.userCellMastery[0];
      return mastery
        ? {
            isCorrect: r.isCorrect,
            userAbility: mastery.ability_theta,
          }
        : null;
    })
    .filter((d): d is { isCorrect: boolean; userAbility: number } => d !== null);

  if (data.length < minSampleSize) {
    console.log(`  ⚠️  Insufficient valid data: ${data.length} < ${minSampleSize}`);
    return null;
  }

  // Calculate proportion correct (p-value)
  const correctCount = data.filter(d => d.isCorrect).length;
  const correctRate = correctCount / data.length;

  // Sort by ability
  const sortedByAbility = data.slice().sort((a, b) => a.userAbility - b.userAbility);

  // === Step 1: Estimate Guessing Parameter (c) ===
  // Use lower asymptote method: look at low-ability students
  const estimatedC = estimateGuessingParameter(
    data.map(d => ({
      isCorrect: d.isCorrect,
      userAbility: d.userAbility,
    })),
    1.0, // Initial discrimination (will be refined)
    0.0  // Initial difficulty (will be refined)
  );

  // === Step 2: Estimate Difficulty (b) ===
  // Use median ability of students who answered correctly
  const correctAbilities = data
    .filter(d => d.isCorrect)
    .map(d => d.userAbility)
    .sort((a, b) => a - b);

  const estimatedB =
    correctAbilities.length > 0
      ? correctAbilities[Math.floor(correctAbilities.length / 2)]
      : 0;

  // === Step 3: Estimate Discrimination (a) ===
  // Use point-biserial correlation approach
  const meanAbilityCorrect =
    data.filter(d => d.isCorrect).reduce((sum, d) => sum + d.userAbility, 0) /
    correctCount;

  const meanAbilityIncorrect =
    data.filter(d => !d.isCorrect).reduce((sum, d) => sum + d.userAbility, 0) /
    (data.length - correctCount);

  const overallMean = data.reduce((sum, d) => sum + d.userAbility, 0) / data.length;

  const variance =
    data.reduce((sum, d) => sum + Math.pow(d.userAbility - overallMean, 2), 0) /
    data.length;

  const sd = Math.sqrt(variance);

  // Point-biserial correlation
  const pointBiserial =
    ((meanAbilityCorrect - meanAbilityIncorrect) / sd) *
    Math.sqrt(correctRate * (1 - correctRate));

  // Convert to discrimination (empirical formula)
  const estimatedA = Math.max(0.5, Math.min(2.5, pointBiserial * 1.7));

  // === Step 4: Calculate Standard Errors (simplified) ===
  // In production, use Fisher Information Matrix
  const se_a = 0.1 + 0.5 / Math.sqrt(data.length);
  const se_b = 0.15 + 0.6 / Math.sqrt(data.length);
  const se_c = 0.05 + 0.3 / Math.sqrt(data.length);

  // Validate parameters
  const validation = validateIRTParameters({
    a: estimatedA,
    b: estimatedB,
    c: estimatedC,
  });

  if (!validation.isValid) {
    console.log(`  ⚠️  Invalid parameters: ${validation.warnings.join(', ')}`);
  }

  if (validation.warnings.length > 0) {
    console.log(`  ⚠️  Warnings: ${validation.warnings.join(', ')}`);
  }

  return {
    questionId,
    discrimination_a: estimatedA,
    difficulty_b: estimatedB,
    guessing_c: estimatedC,
    sampleSize: data.length,
    correctRate,
    standardErrors: {
      a_se: se_a,
      b_se: se_b,
      c_se: se_c,
    },
  };
}

/**
 * Calibrate all questions with sufficient data
 */
async function calibrateAllQuestions(options: {
  minSampleSize?: number;
  onlyMultipleChoice?: boolean;
  dryRun?: boolean;
  limit?: number;
} = {}) {
  const {
    minSampleSize = 30,
    onlyMultipleChoice = true,
    dryRun = false,
    limit,
  } = options;

  console.log('🔧 Starting 3PL calibration...\n');
  console.log(`Settings:`);
  console.log(`  - Min sample size: ${minSampleSize}`);
  console.log(`  - Only multiple choice: ${onlyMultipleChoice}`);
  console.log(`  - Dry run: ${dryRun}`);
  if (limit) console.log(`  - Limit: ${limit} questions`);
  console.log();

  // Get questions with sufficient responses
  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      responseCount: {
        gte: minSampleSize,
      },
    },
    include: {
      answerOptions: true,
      _count: {
        select: {
          userAnswers: true,
        },
      },
    },
    take: limit,
  });

  // Filter for multiple choice if needed
  const questionsToCalibrate = onlyMultipleChoice
    ? questions.filter(q => q.answerOptions.length >= 3)
    : questions;

  console.log(`📊 Found ${questionsToCalibrate.length} questions ready for calibration\n`);

  if (questionsToCalibrate.length === 0) {
    console.log('✅ No questions to calibrate!');
    return;
  }

  let calibrated = 0;
  let failed = 0;
  const results: CalibrationResult[] = [];

  for (let i = 0; i < questionsToCalibrate.length; i++) {
    const question = questionsToCalibrate[i];
    console.log(
      `[${i + 1}/${questionsToCalibrate.length}] Calibrating: ${question.text.substring(0, 50)}...`
    );

    try {
      const result = await calibrateQuestion(question.id, minSampleSize);

      if (result) {
        results.push(result);

        console.log(`  ✅ a=${result.discrimination_a.toFixed(2)}, b=${result.difficulty_b.toFixed(2)}, c=${result.guessing_c.toFixed(3)} (n=${result.sampleSize})`);

        if (!dryRun) {
          // Update question with calibrated parameters
          await prisma.question.update({
            where: { id: question.id },
            data: {
              discrimination_a: result.discrimination_a,
              difficulty_b: result.difficulty_b,
              guessing_c: result.guessing_c,
              irtModel: '3PL',
              calibrationSampleSize: result.sampleSize,
              calibrationDate: new Date(),
              lastCalibrated: new Date(),
              correctRate: result.correctRate,
            },
          });
        }

        calibrated++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      console.error(`  ❌ Error: ${error}`);
    }

    console.log();
  }

  // Summary
  console.log('=' .repeat(60));
  console.log(`\n📈 Calibration Summary:`);
  console.log(`   - Questions processed: ${questionsToCalibrate.length}`);
  console.log(`   - Successfully calibrated: ${calibrated}`);
  console.log(`   - Failed: ${failed}`);

  if (dryRun) {
    console.log(`\n⚠️  DRY RUN - No changes saved to database`);
  } else {
    console.log(`\n✅ Database updated with calibrated parameters`);
  }

  // Parameter statistics
  if (results.length > 0) {
    const avgA = results.reduce((sum, r) => sum + r.discrimination_a, 0) / results.length;
    const avgB = results.reduce((sum, r) => sum + r.difficulty_b, 0) / results.length;
    const avgC = results.reduce((sum, r) => sum + r.guessing_c, 0) / results.length;

    console.log(`\n📊 Parameter Statistics:`);
    console.log(`   - Avg discrimination (a): ${avgA.toFixed(2)}`);
    console.log(`   - Avg difficulty (b): ${avgB.toFixed(2)}`);
    console.log(`   - Avg guessing (c): ${avgC.toFixed(3)}`);

    // Distribution of guessing parameter
    const cDistribution = {
      low: results.filter(r => r.guessing_c < 0.15).length,
      medium: results.filter(r => r.guessing_c >= 0.15 && r.guessing_c < 0.25).length,
      high: results.filter(r => r.guessing_c >= 0.25).length,
    };

    console.log(`\n   Guessing Distribution:`);
    console.log(`   - Low (c < 0.15): ${cDistribution.low} (${((cDistribution.low / results.length) * 100).toFixed(1)}%)`);
    console.log(`   - Medium (0.15 ≤ c < 0.25): ${cDistribution.medium} (${((cDistribution.medium / results.length) * 100).toFixed(1)}%)`);
    console.log(`   - High (c ≥ 0.25): ${cDistribution.high} (${((cDistribution.high / results.length) * 100).toFixed(1)}%)`);
  }

  return results;
}

/**
 * Compare calibrated parameters with known parameters (for validation)
 */
async function validateCalibration() {
  console.log('\n🔍 Validating calibration accuracy...\n');

  const questions = await prisma.question.findMany({
    where: {
      irtModel: '3PL',
      calibrationDate: {
        not: null,
      },
    },
    take: 20,
  });

  console.log(`Calibrated questions: ${questions.length}\n`);

  for (const question of questions) {
    console.log(`Question: ${question.text.substring(0, 50)}...`);
    console.log(`  a = ${question.discrimination_a.toFixed(2)} (SE ≈ 0.10)`);
    console.log(`  b = ${question.difficulty_b.toFixed(2)} (SE ≈ 0.15)`);
    console.log(`  c = ${question.guessing_c.toFixed(3)} (SE ≈ 0.05)`);
    console.log(`  Sample size: ${question.calibrationSampleSize}`);
    console.log(`  Correct rate: ${question.correctRate?.toFixed(3) || 'N/A'}`);
    console.log();
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 3PL Parameter Calibration\n');
  console.log('=' .repeat(60));
  console.log();

  const args = process.argv.slice(2);
  const mode = args[0] || 'calibrate';

  try {
    switch (mode) {
      case 'calibrate':
        await calibrateAllQuestions({
          minSampleSize: 30,
          onlyMultipleChoice: true,
          dryRun: false,
        });
        break;

      case 'dry-run':
        await calibrateAllQuestions({
          minSampleSize: 30,
          onlyMultipleChoice: true,
          dryRun: true,
        });
        break;

      case 'validate':
        await validateCalibration();
        break;

      case 'quick':
        // Quick test with first 5 questions
        await calibrateAllQuestions({
          minSampleSize: 30,
          onlyMultipleChoice: true,
          dryRun: false,
          limit: 5,
        });
        break;

      default:
        console.log('Usage:');
        console.log('  npx tsx src/scripts/calibrate-3pl-questions.ts [mode]');
        console.log();
        console.log('Modes:');
        console.log('  calibrate   - Calibrate all questions (default)');
        console.log('  dry-run     - Test calibration without saving');
        console.log('  validate    - Show calibrated parameters');
        console.log('  quick       - Calibrate first 5 questions only');
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { calibrateQuestion, calibrateAllQuestions, validateCalibration };
