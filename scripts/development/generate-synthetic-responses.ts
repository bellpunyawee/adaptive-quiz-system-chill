/**
 * Generate synthetic response data for 3PL IRT calibration
 *
 * This script simulates realistic student responses based on known IRT parameters,
 * allowing us to test and calibrate the 3PL model before having real production data.
 *
 * Usage:
 *   npx tsx src/scripts/generate-synthetic-responses.ts
 */

import prisma from '@/lib/db';
import { calculate3PLProbability } from '@/lib/adaptive-engine/irt-3pl';

/**
 * Generate a synthetic student population with varying abilities
 * Uses normal distribution: N(0, 1)
 */
function generateStudentAbilities(numStudents: number): number[] {
  const abilities: number[] = [];

  for (let i = 0; i < numStudents; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Clamp to reasonable range
    const theta = Math.max(-3, Math.min(3, z));
    abilities.push(theta);
  }

  return abilities;
}

/**
 * Simulate a student's response to a question using 3PL model
 */
function simulateResponse(
  studentAbility: number,
  questionDifficulty: number,
  questionDiscrimination: number,
  questionGuessing: number
): boolean {
  // Calculate probability of correct response
  const probability = calculate3PLProbability(studentAbility, {
    a: questionDiscrimination,
    b: questionDifficulty,
    c: questionGuessing,
  });

  // Simulate response (Bernoulli trial)
  return Math.random() < probability;
}

/**
 * Generate synthetic responses for all questions
 */
async function generateSyntheticResponses(
  numStudentsPerQuestion: number = 50,
  options: {
    onlyMissingData?: boolean;
    minResponses?: number;
  } = {}
) {
  console.log('🎲 Starting synthetic response generation...\n');

  const { onlyMissingData = false, minResponses = 30 } = options;

  // Get all active questions
  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
    },
    include: {
      _count: {
        select: {
          userAnswers: true,
        },
      },
    },
  });

  console.log(`📊 Found ${questions.length} active questions`);

  // Filter questions if only generating for those with missing data
  const questionsToProcess = onlyMissingData
    ? questions.filter(q => q._count.userAnswers < minResponses)
    : questions;

  console.log(`🎯 Processing ${questionsToProcess.length} questions\n`);

  if (questionsToProcess.length === 0) {
    console.log('✅ All questions have sufficient response data!');
    return;
  }

  // Get or create synthetic users
  const syntheticUsers = await getOrCreateSyntheticUsers(numStudentsPerQuestion);
  console.log(`👥 Created/found ${syntheticUsers.length} synthetic users\n`);

  // Generate abilities for synthetic students
  const studentAbilities = generateStudentAbilities(syntheticUsers.length);

  // Get all cells to create mastery records
  const cells = await prisma.cell.findMany();
  console.log(`📚 Found ${cells.length} cells\n`);

  // Create userCellMastery records for synthetic users if they don't exist
  console.log(`🔧 Setting up cell mastery records...`);
  for (let i = 0; i < syntheticUsers.length; i++) {
    const user = syntheticUsers[i];
    const ability = studentAbilities[i];

    for (const cell of cells) {
      // Check if mastery record exists
      const existingMastery = await prisma.userCellMastery.findUnique({
        where: {
          userId_cellId: {
            userId: user.id,
            cellId: cell.id,
          },
        },
      });

      if (!existingMastery) {
        await prisma.userCellMastery.create({
          data: {
            userId: user.id,
            cellId: cell.id,
            ability_theta: ability,
            sem: 0.5,
            confidence: 0.8,
            selection_count: 0,
            mastery_status: 0,
            responseCount: 0,
          },
        });
      }
    }
  }
  console.log(`✅ Cell mastery records ready\n`);

  let totalResponsesCreated = 0;
  let questionsProcessed = 0;

  for (const question of questionsToProcess) {
    questionsProcessed++;
    console.log(`[${questionsProcessed}/${questionsToProcess.length}] Processing question: ${question.text.substring(0, 50)}...`);

    let responsesForQuestion = 0;

    // Each synthetic user answers this question
    for (let i = 0; i < syntheticUsers.length; i++) {
      const user = syntheticUsers[i];
      const ability = studentAbilities[i];

      // Check if user already answered this question
      const existingAnswer = await prisma.userAnswer.findFirst({
        where: {
          userId: user.id,
          questionId: question.id,
        },
      });

      if (existingAnswer) {
        continue; // Skip if already answered
      }

      // Simulate response
      const isCorrect = simulateResponse(
        ability,
        question.difficulty_b,
        question.discrimination_a,
        question.guessing_c
      );

      // Get a random quiz for this user (or create one)
      let quiz = await prisma.quiz.findFirst({
        where: {
          userId: user.id,
          status: 'in-progress',
        },
      });

      if (!quiz) {
        quiz = await prisma.quiz.create({
          data: {
            userId: user.id,
            status: 'in-progress',
            quizType: 'synthetic',
            maxQuestions: 1000,
          },
        });
      }

      // Get correct answer option
      const correctOption = await prisma.answerOption.findFirst({
        where: {
          questionId: question.id,
          isCorrect: true,
        },
      });

      if (!correctOption) {
        console.warn(`  ⚠️  No correct answer option found for question ${question.id}`);
        continue;
      }

      // Get random wrong answer option (if incorrect)
      let selectedOption = correctOption;
      if (!isCorrect) {
        const wrongOptions = await prisma.answerOption.findMany({
          where: {
            questionId: question.id,
            isCorrect: false,
          },
        });

        if (wrongOptions.length > 0) {
          selectedOption = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
        }
      }

      // Create user answer
      await prisma.userAnswer.create({
        data: {
          userId: user.id,
          quizId: quiz.id,
          questionId: question.id,
          selectedOptionId: selectedOption.id,
          isCorrect,
          abilityAtTime: ability,
          responseTime: Math.floor(Math.random() * 30000) + 5000, // 5-35 seconds
        },
      });

      responsesForQuestion++;
      totalResponsesCreated++;
    }

    // Update question response count
    await prisma.question.update({
      where: { id: question.id },
      data: {
        responseCount: {
          increment: responsesForQuestion,
        },
      },
    });

    console.log(`  ✅ Created ${responsesForQuestion} responses (Total: ${totalResponsesCreated})\n`);
  }

  console.log(`\n🎉 Synthetic data generation complete!`);
  console.log(`📈 Summary:`);
  console.log(`   - Questions processed: ${questionsProcessed}`);
  console.log(`   - Total responses created: ${totalResponsesCreated}`);
  console.log(`   - Synthetic users: ${syntheticUsers.length}`);
}

/**
 * Get or create synthetic users for testing
 */
async function getOrCreateSyntheticUsers(count: number) {
  const existingUsers = await prisma.user.findMany({
    where: {
      email: {
        startsWith: 'synthetic_',
      },
    },
    take: count,
  });

  const usersToCreate = count - existingUsers.length;

  if (usersToCreate > 0) {
    console.log(`📝 Creating ${usersToCreate} new synthetic users...`);

    // Create users one by one (SQLite doesn't support createMany)
    for (let i = 0; i < usersToCreate; i++) {
      const userId = existingUsers.length + i + 1;
      try {
        await prisma.user.create({
          data: {
            email: `synthetic_${userId}@example.com`,
            name: `Synthetic Student ${userId}`,
            role: 'user',
          },
        });
      } catch (error) {
        // Skip if user already exists
        if (!(error instanceof Error) || !error.message.includes('Unique constraint')) {
          throw error;
        }
      }
    }
  }

  // Fetch all synthetic users
  return prisma.user.findMany({
    where: {
      email: {
        startsWith: 'synthetic_',
      },
    },
    take: count,
  });
}

/**
 * Set known 3PL parameters for testing
 * This allows us to validate calibration accuracy
 */
async function setKnown3PLParameters() {
  console.log('🔧 Setting known 3PL parameters for testing...\n');

  const questions = await prisma.question.findMany({
    where: { isActive: true },
    take: 20, // Set parameters for first 20 questions
  });

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    // Set known parameters (varying across questions)
    const knownParams = {
      discrimination_a: 0.8 + Math.random() * 1.4, // 0.8 to 2.2
      difficulty_b: -2 + Math.random() * 4,         // -2 to +2
      guessing_c: 0.15 + Math.random() * 0.15,      // 0.15 to 0.30
      irtModel: '3PL',
    };

    await prisma.question.update({
      where: { id: question.id },
      data: knownParams,
    });

    console.log(`  Question ${i + 1}: a=${knownParams.discrimination_a.toFixed(2)}, b=${knownParams.difficulty_b.toFixed(2)}, c=${knownParams.guessing_c.toFixed(2)}`);
  }

  console.log('\n✅ Known parameters set!\n');
}

/**
 * Generate statistics about synthetic data
 */
async function generateStatistics() {
  console.log('\n📊 Generating statistics...\n');

  const totalQuestions = await prisma.question.count({
    where: { isActive: true },
  });

  const totalResponses = await prisma.userAnswer.count();

  const questionsWithSufficientData = await prisma.question.count({
    where: {
      isActive: true,
      responseCount: {
        gte: 30,
      },
    },
  });

  const avgResponsesPerQuestion = await prisma.question.aggregate({
    where: { isActive: true },
    _avg: {
      responseCount: true,
    },
  });

  console.log(`📈 Statistics:`);
  console.log(`   - Total active questions: ${totalQuestions}`);
  console.log(`   - Total responses: ${totalResponses}`);
  console.log(`   - Questions with ≥30 responses: ${questionsWithSufficientData}`);
  console.log(`   - Avg responses per question: ${avgResponsesPerQuestion._avg.responseCount?.toFixed(1) || 0}`);
  console.log(`   - Questions ready for calibration: ${questionsWithSufficientData} (${((questionsWithSufficientData / totalQuestions) * 100).toFixed(1)}%)`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 3PL Synthetic Data Generator\n');
  console.log('=' .repeat(60));
  console.log();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const mode = args[0] || 'generate';
  const numStudents = parseInt(args[1]) || 50;

  try {
    switch (mode) {
      case 'set-params':
        // Set known 3PL parameters for testing
        await setKnown3PLParameters();
        break;

      case 'generate':
        // Generate synthetic responses
        await generateSyntheticResponses(numStudents, {
          onlyMissingData: false,
        });
        await generateStatistics();
        break;

      case 'fill-gaps':
        // Only generate for questions with < 30 responses
        await generateSyntheticResponses(numStudents, {
          onlyMissingData: true,
          minResponses: 30,
        });
        await generateStatistics();
        break;

      case 'stats':
        // Just show statistics
        await generateStatistics();
        break;

      case 'full':
        // Full workflow: set params → generate → stats
        await setKnown3PLParameters();
        await generateSyntheticResponses(numStudents);
        await generateStatistics();
        break;

      default:
        console.log('Usage:');
        console.log('  npx tsx src/scripts/generate-synthetic-responses.ts [mode] [numStudents]');
        console.log();
        console.log('Modes:');
        console.log('  generate      - Generate synthetic responses for all questions (default)');
        console.log('  fill-gaps     - Only generate for questions with <30 responses');
        console.log('  set-params    - Set known 3PL parameters for testing');
        console.log('  stats         - Show statistics only');
        console.log('  full          - Run full workflow (set-params → generate → stats)');
        console.log();
        console.log('Examples:');
        console.log('  npx tsx src/scripts/generate-synthetic-responses.ts generate 50');
        console.log('  npx tsx src/scripts/generate-synthetic-responses.ts fill-gaps 100');
        console.log('  npx tsx src/scripts/generate-synthetic-responses.ts full 50');
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

export { generateSyntheticResponses, setKnown3PLParameters, generateStatistics };
