/**
 * Adaptive Learning Metrics Evaluation
 *
 * Evaluates the adaptive quiz system using metrics from adaptive learning literature:
 * 1. Precision: How accurately the system selects appropriate questions
 * 2. Learning Gain: Improvement in ability estimates over time
 *
 * References:
 * - Bystrova et al. (2018): Precision in adaptive learning
 * - Melesko and Ramanauskaite (2021): Adaptive system evaluation
 * - Bolsinova et al. (2022): Precision in adaptive testing
 * - Nabizadeh et al. (2020): Learning gain measurement
 *
 * Usage:
 *   npx tsx src/scripts/adaptive-learning-metrics.ts [numStudents] [maxQuestions]
 */

import prisma from '@/lib/db';
import { calculate3PLProbability } from '@/lib/adaptive-engine/irt-3pl';
import { estimateAbility, type IRTResponse } from '@/lib/adaptive-engine/irt-estimator-enhanced';

interface PrecisionMetrics {
  // Overall precision (Equation 6 from literature)
  overallPrecision: number;        // TP / (TP + FP)
  truePositives: number;           // Correct items, correctly answered
  falsePositives: number;          // Incorrect items, incorrectly answered (should be filtered)
  trueNegatives: number;           // Easy items not selected for high-ability
  falseNegatives: number;          // Hard items not selected for low-ability

  // Precision by difficulty match
  precisionByDifficulty: {
    perfect: number;      // |θ - b| < 0.5
    good: number;         // 0.5 ≤ |θ - b| < 1.0
    poor: number;         // |θ - b| ≥ 1.0
  };

  // Question selection quality
  avgDifficultyMatch: number;      // How close questions are to ability
  percentOptimalQuestions: number; // % questions within optimal range
}

interface LearningGainMetrics {
  // Learning gain (Equation 7 from literature)
  avgLearningGain: number;         // Δθ = θ - θ₀
  medianLearningGain: number;
  stdLearningGain: number;

  // Learning gain by ability level
  gainByAbilityLevel: {
    low: number;                   // θ < -1
    medium: number;                // -1 ≤ θ ≤ 1
    high: number;                  // θ > 1
  };

  // Learning trajectory
  avgQuestionsToConverge: number;
  percentImproved: number;         // % students with positive gain
  percentSignificantGain: number;  // % with gain > 0.5
}

interface AdaptiveLearningResults {
  precision: PrecisionMetrics;
  learningGain: LearningGainMetrics;
  systemEffectiveness: {
    overallScore: number;          // Combined metric
    recommendation: string;
  };
}

/**
 * Generate student abilities
 */
function generateAbilities(count: number): number[] {
  const abilities: number[] = [];
  for (let i = 0; i < count; i++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    abilities.push(Math.max(-3, Math.min(3, z)));
  }
  return abilities;
}

/**
 * Simulate response
 */
function simulateResponse(
  ability: number,
  difficulty: number,
  discrimination: number,
  guessing: number
): boolean {
  const p = calculate3PLProbability(ability, {
    a: discrimination,
    b: difficulty,
    c: guessing,
  });
  return Math.random() < p;
}

/**
 * Calculate precision metrics
 *
 * Precision measures how well the system selects appropriate questions:
 * - True Positive (TP): Question matches ability, student answers correctly
 * - False Positive (FP): Question too hard/easy, student answers incorrectly
 */
function calculatePrecision(
  students: Array<{
    trueAbility: number;
    responses: Array<{
      difficulty_b: number;
      discrimination_a: number;
      guessing_c: number;
      isCorrect: boolean;
    }>;
  }>
): PrecisionMetrics {
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;

  let perfectMatch = 0;
  let goodMatch = 0;
  let poorMatch = 0;

  let totalDifficultyDiff = 0;
  let totalQuestions = 0;
  let optimalQuestions = 0;

  for (const student of students) {
    const ability = student.trueAbility;

    for (const response of student.responses) {
      const difficulty = response.difficulty_b;
      const difficultyDiff = Math.abs(ability - difficulty);

      // Categorize difficulty match
      if (difficultyDiff < 0.5) {
        perfectMatch++;
        optimalQuestions++;
      } else if (difficultyDiff < 1.0) {
        goodMatch++;
      } else {
        poorMatch++;
      }

      totalDifficultyDiff += difficultyDiff;
      totalQuestions++;

      // Calculate TP, FP based on question appropriateness
      const isOptimal = difficultyDiff < 1.0; // Question within reasonable range

      if (isOptimal && response.isCorrect) {
        truePositives++; // Good question, correctly answered
      } else if (isOptimal && !response.isCorrect) {
        // Still counts as TP - question was appropriate, just answered incorrectly
        // This is normal and expected
        truePositives++;
      } else if (!isOptimal && response.isCorrect) {
        // Question was too easy/hard but answered correctly (possibly lucky)
        falsePositives++;
      } else {
        // Question was too easy/hard and answered incorrectly
        falsePositives++;
      }
    }
  }

  const totalSelected = truePositives + falsePositives;
  const overallPrecision = totalSelected > 0 ? truePositives / totalSelected : 0;

  const totalMatches = perfectMatch + goodMatch + poorMatch;

  return {
    overallPrecision,
    truePositives,
    falsePositives,
    trueNegatives: 0, // Not applicable in adaptive testing (we don't track non-selected items)
    falseNegatives: 0,
    precisionByDifficulty: {
      perfect: totalMatches > 0 ? (perfectMatch / totalMatches) * 100 : 0,
      good: totalMatches > 0 ? (goodMatch / totalMatches) * 100 : 0,
      poor: totalMatches > 0 ? (poorMatch / totalMatches) * 100 : 0,
    },
    avgDifficultyMatch: totalQuestions > 0 ? totalDifficultyDiff / totalQuestions : 0,
    percentOptimalQuestions: totalQuestions > 0 ? (optimalQuestions / totalQuestions) * 100 : 0,
  };
}

/**
 * Calculate learning gain metrics
 *
 * Learning Gain (Equation 7): Δθ = θ - θ₀
 * Where:
 * - θ = final ability estimate
 * - θ₀ = initial ability estimate
 */
function calculateLearningGain(
  students: Array<{
    trueAbility: number;
    initialEstimate: number;
    finalEstimate: number;
    questionsAnswered: number;
  }>
): LearningGainMetrics {
  // Calculate learning gains
  const gains = students.map(s => s.finalEstimate - s.initialEstimate);

  const avgLearningGain = gains.reduce((sum, g) => sum + g, 0) / gains.length;

  const sortedGains = gains.slice().sort((a, b) => a - b);
  const medianLearningGain = sortedGains[Math.floor(gains.length / 2)];

  const variance = gains.reduce((sum, g) => sum + Math.pow(g - avgLearningGain, 2), 0) / gains.length;
  const stdLearningGain = Math.sqrt(variance);

  // Learning gain by ability level
  const lowAbility = students.filter(s => s.trueAbility < -1);
  const mediumAbility = students.filter(s => s.trueAbility >= -1 && s.trueAbility <= 1);
  const highAbility = students.filter(s => s.trueAbility > 1);

  const gainByAbilityLevel = {
    low: lowAbility.length > 0
      ? lowAbility.reduce((sum, s) => sum + (s.finalEstimate - s.initialEstimate), 0) / lowAbility.length
      : 0,
    medium: mediumAbility.length > 0
      ? mediumAbility.reduce((sum, s) => sum + (s.finalEstimate - s.initialEstimate), 0) / mediumAbility.length
      : 0,
    high: highAbility.length > 0
      ? highAbility.reduce((sum, s) => sum + (s.finalEstimate - s.initialEstimate), 0) / highAbility.length
      : 0,
  };

  // Convergence metrics
  const avgQuestionsToConverge = students.reduce((sum, s) => sum + s.questionsAnswered, 0) / students.length;

  // Improvement metrics
  const improved = students.filter(s => s.finalEstimate > s.initialEstimate).length;
  const significantGain = students.filter(s => (s.finalEstimate - s.initialEstimate) > 0.5).length;

  const percentImproved = (improved / students.length) * 100;
  const percentSignificantGain = (significantGain / students.length) * 100;

  return {
    avgLearningGain,
    medianLearningGain,
    stdLearningGain,
    gainByAbilityLevel,
    avgQuestionsToConverge,
    percentImproved,
    percentSignificantGain,
  };
}

/**
 * Simulate one student taking adaptive quiz
 */
async function simulateStudent(
  trueAbility: number,
  maxQuestions: number,
  questions: any[],
  targetSEM: number = 0.5
): Promise<{
  trueAbility: number;
  initialEstimate: number;
  finalEstimate: number;
  questionsAnswered: number;
  responses: IRTResponse[];
}> {
  const responses: IRTResponse[] = [];
  let currentEstimate = 0;
  let currentSEM = Infinity;
  let initialEstimate = 0;

  for (let q = 0; q < maxQuestions; q++) {
    // Select question
    let selectedQuestion;
    if (responses.length < 3) {
      // Warm-up
      const mediumQs = questions.filter(qu => Math.abs(qu.difficulty_b) < 0.5);
      selectedQuestion = mediumQs[Math.floor(Math.random() * mediumQs.length)] || questions[0];
    } else {
      // Adaptive: near current estimate
      const scored = questions.map(qu => ({
        question: qu,
        score: qu.discrimination_a * qu.discrimination_a * 0.25 /
               (1 + Math.abs(qu.difficulty_b - currentEstimate)),
      }));
      scored.sort((a, b) => b.score - a.score);
      selectedQuestion = scored[0].question;
    }

    // Simulate response
    const isCorrect = simulateResponse(
      trueAbility,
      selectedQuestion.difficulty_b,
      selectedQuestion.discrimination_a,
      selectedQuestion.guessing_c
    );

    responses.push({
      difficulty_b: selectedQuestion.difficulty_b,
      discrimination_a: selectedQuestion.discrimination_a,
      guessing_c: selectedQuestion.guessing_c,
      irtModel: '3PL',
      isCorrect,
    });

    // Re-estimate
    const estimate = estimateAbility(responses);
    currentEstimate = estimate.theta;
    currentSEM = estimate.sem;

    // Store initial estimate (after first 3 questions)
    if (responses.length === 3) {
      initialEstimate = currentEstimate;
    }

    // Stop if converged
    if (currentSEM < targetSEM && responses.length >= 5) {
      break;
    }
  }

  // If we didn't reach 3 questions, use first estimate as initial
  if (responses.length < 3) {
    initialEstimate = currentEstimate;
  }

  return {
    trueAbility,
    initialEstimate,
    finalEstimate: currentEstimate,
    questionsAnswered: responses.length,
    responses,
  };
}

/**
 * Run adaptive learning metrics evaluation
 */
async function evaluateAdaptiveLearningMetrics(
  numStudents: number = 100,
  maxQuestions: number = 25
): Promise<AdaptiveLearningResults> {
  console.log('🎓 Adaptive Learning Metrics Evaluation\n');
  console.log(`Configuration:`);
  console.log(`  - Students: ${numStudents}`);
  console.log(`  - Max questions: ${maxQuestions}\n`);

  // Load questions
  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      irtModel: '3PL',
    },
  });

  if (questions.length === 0) {
    throw new Error('No calibrated 3PL questions found');
  }

  console.log(`✅ Found ${questions.length} calibrated 3PL questions\n`);

  // Generate student population
  console.log('👥 Generating student population...');
  const abilities = generateAbilities(numStudents);

  // Simulate students
  console.log('🎯 Simulating adaptive quizzes...\n');
  const students: Array<{
    trueAbility: number;
    initialEstimate: number;
    finalEstimate: number;
    questionsAnswered: number;
    responses: IRTResponse[];
  }> = [];

  for (let i = 0; i < numStudents; i++) {
    process.stdout.write(`  Progress: ${i + 1}/${numStudents} (${((i + 1) / numStudents * 100).toFixed(0)}%)\r`);
    const student = await simulateStudent(abilities[i], maxQuestions, questions);
    students.push(student);
  }

  console.log('\n✅ Simulations complete\n');

  // Calculate metrics
  console.log('📊 Calculating metrics...\n');

  const precision = calculatePrecision(students);
  const learningGain = calculateLearningGain(students);

  // Calculate overall effectiveness score
  // Weighted combination of precision and learning gain
  const precisionScore = precision.overallPrecision * 100; // 0-100
  const learningGainScore = Math.min(100, (learningGain.percentSignificantGain / 50) * 100); // 0-100
  const overallScore = (precisionScore * 0.6 + learningGainScore * 0.4);

  let recommendation = '';
  if (overallScore >= 80) {
    recommendation = 'Excellent - System is highly effective';
  } else if (overallScore >= 60) {
    recommendation = 'Good - System is effective, minor improvements possible';
  } else if (overallScore >= 40) {
    recommendation = 'Acceptable - System works but needs improvement';
  } else {
    recommendation = 'Needs Improvement - Consider revising question selection algorithm';
  }

  return {
    precision,
    learningGain,
    systemEffectiveness: {
      overallScore,
      recommendation,
    },
  };
}

/**
 * Print results
 */
function printResults(results: AdaptiveLearningResults) {
  console.log('='.repeat(80));
  console.log('🎓 ADAPTIVE LEARNING METRICS EVALUATION');
  console.log('='.repeat(80));

  console.log('\n📊 PRECISION METRICS (Question Selection Quality)');
  console.log('-'.repeat(80));
  console.log(`  Overall Precision:              ${(results.precision.overallPrecision * 100).toFixed(1)}%`);
  console.log(`    Formula: TP / (TP + FP)`);
  console.log(`    TP (appropriate questions):   ${results.precision.truePositives}`);
  console.log(`    FP (inappropriate questions): ${results.precision.falsePositives}`);
  console.log(``);
  console.log(`  Precision by Difficulty Match:`);
  console.log(`    Perfect (|θ - b| < 0.5):      ${results.precision.precisionByDifficulty.perfect.toFixed(1)}%`);
  console.log(`    Good (0.5 ≤ |θ - b| < 1.0):   ${results.precision.precisionByDifficulty.good.toFixed(1)}%`);
  console.log(`    Poor (|θ - b| ≥ 1.0):         ${results.precision.precisionByDifficulty.poor.toFixed(1)}%`);
  console.log(``);
  console.log(`  Question Selection Quality:`);
  console.log(`    Avg Difficulty Match:         ${results.precision.avgDifficultyMatch.toFixed(3)}`);
  console.log(`    Optimal Questions:            ${results.precision.percentOptimalQuestions.toFixed(1)}%`);

  console.log('\n📈 LEARNING GAIN METRICS (Ability Improvement)');
  console.log('-'.repeat(80));
  console.log(`  Average Learning Gain (Δθ):     ${results.learningGain.avgLearningGain.toFixed(3)}`);
  console.log(`    Formula: Δθ = θ - θ₀`);
  console.log(`    (Change from initial to final ability estimate)`);
  console.log(``);
  console.log(`  Median Learning Gain:           ${results.learningGain.medianLearningGain.toFixed(3)}`);
  console.log(`  Std Dev:                        ${results.learningGain.stdLearningGain.toFixed(3)}`);
  console.log(``);
  console.log(`  Learning Gain by Ability Level:`);
  console.log(`    Low (θ < -1):                 ${results.learningGain.gainByAbilityLevel.low.toFixed(3)}`);
  console.log(`    Medium (-1 ≤ θ ≤ 1):          ${results.learningGain.gainByAbilityLevel.medium.toFixed(3)}`);
  console.log(`    High (θ > 1):                 ${results.learningGain.gainByAbilityLevel.high.toFixed(3)}`);
  console.log(``);
  console.log(`  Learning Trajectory:`);
  console.log(`    Avg Questions to Converge:    ${results.learningGain.avgQuestionsToConverge.toFixed(1)}`);
  console.log(`    Students Improved:            ${results.learningGain.percentImproved.toFixed(1)}%`);
  console.log(`    Significant Gain (Δθ > 0.5):  ${results.learningGain.percentSignificantGain.toFixed(1)}%`);

  console.log('\n🎯 SYSTEM EFFECTIVENESS');
  console.log('-'.repeat(80));
  console.log(`  Overall Score:                  ${results.systemEffectiveness.overallScore.toFixed(1)}/100`);
  console.log(`    (60% Precision + 40% Learning Gain)`);
  console.log(``);
  console.log(`  Assessment: ${results.systemEffectiveness.recommendation}`);

  console.log('\n💡 INTERPRETATION GUIDE');
  console.log('-'.repeat(80));
  console.log(`  Precision:`);
  console.log(`    > 80%: Excellent question selection`);
  console.log(`    > 60%: Good question selection`);
  console.log(`    > 40%: Acceptable`);
  console.log(`    < 40%: Needs improvement`);
  console.log(``);
  console.log(`  Learning Gain (Δθ):`);
  console.log(`    Positive: Ability estimate improved (good)`);
  console.log(`    > 0.5: Significant improvement`);
  console.log(`    Near 0: Stable estimate (also good)`);
  console.log(`    Negative: May indicate measurement noise`);
  console.log(``);
  console.log(`  NOTE: In simulation, "learning gain" represents estimate refinement,`);
  console.log(`        not actual learning. With real students, this would measure`);
  console.log(`        true skill improvement over time.`);

  console.log('\n' + '='.repeat(80));

  // Detailed interpretation
  console.log('\n📋 DETAILED ANALYSIS');
  console.log('-'.repeat(80));

  const precisionStatus = results.precision.overallPrecision >= 0.8 ? '✅ Excellent' :
                         results.precision.overallPrecision >= 0.6 ? '✅ Good' :
                         results.precision.overallPrecision >= 0.4 ? '⚠️ Acceptable' : '❌ Needs Work';

  const optimalStatus = results.precision.percentOptimalQuestions >= 70 ? '✅ Excellent' :
                       results.precision.percentOptimalQuestions >= 50 ? '✅ Good' :
                       results.precision.percentOptimalQuestions >= 30 ? '⚠️ Acceptable' : '❌ Needs Work';

  const gainStatus = results.learningGain.percentSignificantGain >= 50 ? '✅ Excellent' :
                    results.learningGain.percentSignificantGain >= 30 ? '✅ Good' :
                    results.learningGain.percentSignificantGain >= 10 ? '⚠️ Acceptable' : '⚠️ Low';

  console.log(`  Precision (${(results.precision.overallPrecision * 100).toFixed(1)}%): ${precisionStatus}`);
  console.log(`  Optimal Questions (${results.precision.percentOptimalQuestions.toFixed(1)}%): ${optimalStatus}`);
  console.log(`  Significant Gain (${results.learningGain.percentSignificantGain.toFixed(1)}%): ${gainStatus}`);

  console.log('\n' + '='.repeat(80));
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const numStudents = parseInt(args[0]) || 100;
  const maxQuestions = parseInt(args[1]) || 25;

  const results = await evaluateAdaptiveLearningMetrics(numStudents, maxQuestions);
  printResults(results);
}

// Run if executed directly
if (require.main === module) {
  main()
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { evaluateAdaptiveLearningMetrics, calculatePrecision, calculateLearningGain };
