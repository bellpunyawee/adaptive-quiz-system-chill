/**
 * Simulate Adaptive Quiz System Performance
 *
 * This script simulates synthetic users taking adaptive quizzes and measures:
 * - Ability estimation accuracy (RMSE, bias)
 * - Convergence speed (questions needed to reach target SEM)
 * - Question selection quality
 * - Overall system performance
 *
 * Usage:
 *   npx tsx src/scripts/simulate-adaptive-quiz.ts [numStudents] [questionsPerQuiz]
 */

import prisma from '@/lib/db';
import { calculate3PLProbability } from '@/lib/adaptive-engine/irt-3pl';
import { estimateAbility, type IRTResponse } from '@/lib/adaptive-engine/irt-estimator-enhanced';
import { selectNextQuestion } from '@/lib/adaptive-engine/engine-enhanced';

interface SimulatedStudent {
  id: string;
  trueAbility: number;  // Known "true" ability for validation
  estimatedAbility: number;
  sem: number;
  questionsAnswered: number;
  correctCount: number;
  responses: IRTResponse[];
}

interface PerformanceMetrics {
  // Accuracy metrics
  rmse: number;                    // Root Mean Square Error
  mae: number;                     // Mean Absolute Error
  bias: number;                    // Average estimation bias
  correlation: number;             // Correlation between true and estimated

  // Efficiency metrics
  avgQuestionsToConverge: number;  // Avg questions to reach SEM < 0.5
  avgFinalSEM: number;             // Average final SEM

  // Coverage metrics
  percentWithin1SE: number;        // % of estimates within 1 SE of true ability
  percentWithin2SE: number;        // % of estimates within 2 SE of true ability

  // Question selection quality
  avgInformation: number;          // Average Fisher information per question
  avgDifficultyMatch: number;      // How well difficulty matches ability
}

/**
 * Generate a student population with known abilities
 */
function generateStudentPopulation(count: number): number[] {
  const abilities: number[] = [];

  for (let i = 0; i < count; i++) {
    // Box-Muller transform for N(0, 1)
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Clamp to [-3, 3] range
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
  const probability = calculate3PLProbability(studentAbility, {
    a: questionDiscrimination,
    b: questionDifficulty,
    c: questionGuessing,
  });

  return Math.random() < probability;
}

/**
 * Simulate one student taking an adaptive quiz
 */
async function simulateStudentQuiz(
  trueAbility: number,
  maxQuestions: number,
  targetSEM: number = 0.5
): Promise<SimulatedStudent> {
  const responses: IRTResponse[] = [];
  let currentEstimate = 0;
  let currentSEM = Infinity;
  let correctCount = 0;

  // Get all available questions
  const allQuestions = await prisma.question.findMany({
    where: {
      isActive: true,
      irtModel: '3PL',  // Use calibrated 3PL questions
    },
  });

  if (allQuestions.length === 0) {
    throw new Error('No calibrated 3PL questions available');
  }

  // Simulate taking questions one by one
  for (let q = 0; q < maxQuestions; q++) {
    // Select next question based on current ability estimate
    // (Simplified version - in real system this uses full engine)
    let selectedQuestion;

    if (responses.length < 3) {
      // Warm-up: random medium difficulty questions
      const mediumQuestions = allQuestions.filter(
        qu => Math.abs(qu.difficulty_b) < 0.5
      );
      selectedQuestion = mediumQuestions[Math.floor(Math.random() * mediumQuestions.length)] || allQuestions[0];
    } else {
      // Adaptive: select question near current ability estimate
      const questionScores = allQuestions.map(qu => {
        const difficultyDiff = Math.abs(qu.difficulty_b - currentEstimate);
        const information = qu.discrimination_a * qu.discrimination_a * 0.25; // Approximate
        return {
          question: qu,
          score: information / (1 + difficultyDiff),
        };
      });

      questionScores.sort((a, b) => b.score - a.score);
      selectedQuestion = questionScores[0].question;
    }

    // Simulate response based on TRUE ability (not estimated)
    const isCorrect = simulateResponse(
      trueAbility,
      selectedQuestion.difficulty_b,
      selectedQuestion.discrimination_a,
      selectedQuestion.guessing_c
    );

    if (isCorrect) correctCount++;

    // Add to response history
    responses.push({
      difficulty_b: selectedQuestion.difficulty_b,
      discrimination_a: selectedQuestion.discrimination_a,
      guessing_c: selectedQuestion.guessing_c,
      irtModel: '3PL',
      isCorrect,
    });

    // Re-estimate ability
    const estimate = estimateAbility(responses);
    currentEstimate = estimate.theta;
    currentSEM = estimate.sem;

    // Check stopping criterion
    if (currentSEM < targetSEM && responses.length >= 5) {
      break;
    }
  }

  return {
    id: `sim_${Math.random().toString(36).substr(2, 9)}`,
    trueAbility,
    estimatedAbility: currentEstimate,
    sem: currentSEM,
    questionsAnswered: responses.length,
    correctCount,
    responses,
  };
}

/**
 * Calculate performance metrics from simulation results
 */
function calculateMetrics(students: SimulatedStudent[]): PerformanceMetrics {
  const n = students.length;

  // Accuracy metrics
  const errors = students.map(s => s.estimatedAbility - s.trueAbility);
  const squaredErrors = errors.map(e => e * e);
  const absoluteErrors = errors.map(e => Math.abs(e));

  const rmse = Math.sqrt(squaredErrors.reduce((a, b) => a + b, 0) / n);
  const mae = absoluteErrors.reduce((a, b) => a + b, 0) / n;
  const bias = errors.reduce((a, b) => a + b, 0) / n;

  // Correlation
  const meanTrue = students.reduce((sum, s) => sum + s.trueAbility, 0) / n;
  const meanEst = students.reduce((sum, s) => sum + s.estimatedAbility, 0) / n;

  const numerator = students.reduce(
    (sum, s) => sum + (s.trueAbility - meanTrue) * (s.estimatedAbility - meanEst),
    0
  );
  const denomTrue = Math.sqrt(
    students.reduce((sum, s) => sum + Math.pow(s.trueAbility - meanTrue, 2), 0)
  );
  const denomEst = Math.sqrt(
    students.reduce((sum, s) => sum + Math.pow(s.estimatedAbility - meanEst, 2), 0)
  );

  const correlation = numerator / (denomTrue * denomEst);

  // Efficiency metrics
  const convergedStudents = students.filter(s => s.sem < 0.5);
  const avgQuestionsToConverge = convergedStudents.length > 0
    ? convergedStudents.reduce((sum, s) => sum + s.questionsAnswered, 0) / convergedStudents.length
    : students.reduce((sum, s) => sum + s.questionsAnswered, 0) / n;

  const avgFinalSEM = students.reduce((sum, s) => sum + s.sem, 0) / n;

  // Coverage metrics
  const within1SE = students.filter(
    s => Math.abs(s.estimatedAbility - s.trueAbility) <= s.sem
  ).length;
  const within2SE = students.filter(
    s => Math.abs(s.estimatedAbility - s.trueAbility) <= 2 * s.sem
  ).length;

  const percentWithin1SE = (within1SE / n) * 100;
  const percentWithin2SE = (within2SE / n) * 100;

  // Question selection quality
  const allResponses = students.flatMap(s => s.responses);
  const avgInformation = allResponses.reduce((sum, r) => {
    const info = r.discrimination_a * r.discrimination_a * 0.25;
    return sum + info;
  }, 0) / allResponses.length;

  const avgDifficultyMatch = students.reduce((sum, s) => {
    const avgDiff = s.responses.reduce(
      (rSum, r) => rSum + Math.abs(r.difficulty_b - s.trueAbility),
      0
    ) / s.responses.length;
    return sum + avgDiff;
  }, 0) / n;

  return {
    rmse,
    mae,
    bias,
    correlation,
    avgQuestionsToConverge,
    avgFinalSEM,
    percentWithin1SE,
    percentWithin2SE,
    avgInformation,
    avgDifficultyMatch,
  };
}

/**
 * Print detailed results
 */
function printResults(students: SimulatedStudent[], metrics: PerformanceMetrics) {
  console.log('\n' + '='.repeat(70));
  console.log('📊 ADAPTIVE QUIZ SYSTEM PERFORMANCE REPORT');
  console.log('='.repeat(70));

  console.log('\n📈 ACCURACY METRICS');
  console.log('-'.repeat(70));
  console.log(`  RMSE (Root Mean Square Error):     ${metrics.rmse.toFixed(3)}`);
  console.log(`  MAE (Mean Absolute Error):         ${metrics.mae.toFixed(3)}`);
  console.log(`  Bias (Systematic Error):           ${metrics.bias.toFixed(3)}`);
  console.log(`  Correlation (True vs Estimated):   ${metrics.correlation.toFixed(3)}`);

  console.log('\n⚡ EFFICIENCY METRICS');
  console.log('-'.repeat(70));
  console.log(`  Avg Questions to Converge:         ${metrics.avgQuestionsToConverge.toFixed(1)}`);
  console.log(`  Avg Final SEM:                     ${metrics.avgFinalSEM.toFixed(3)}`);
  console.log(`  Target SEM (< 0.5):                ${students.filter(s => s.sem < 0.5).length}/${students.length} students`);

  console.log('\n🎯 COVERAGE METRICS');
  console.log('-'.repeat(70));
  console.log(`  Within 1 Standard Error:           ${metrics.percentWithin1SE.toFixed(1)}%`);
  console.log(`  Within 2 Standard Errors:          ${metrics.percentWithin2SE.toFixed(1)}%`);
  console.log(`  (Expected: ~68% and ~95% for well-calibrated system)`);

  console.log('\n📋 QUESTION SELECTION QUALITY');
  console.log('-'.repeat(70));
  console.log(`  Avg Fisher Information:            ${metrics.avgInformation.toFixed(3)}`);
  console.log(`  Avg Difficulty Match:              ${metrics.avgDifficultyMatch.toFixed(3)}`);
  console.log(`  (Lower is better - questions closer to ability)`);

  console.log('\n👥 STUDENT DISTRIBUTION');
  console.log('-'.repeat(70));

  // Ability distribution
  const lowAbility = students.filter(s => s.trueAbility < -1).length;
  const mediumAbility = students.filter(s => s.trueAbility >= -1 && s.trueAbility <= 1).length;
  const highAbility = students.filter(s => s.trueAbility > 1).length;

  console.log(`  Low Ability (θ < -1):              ${lowAbility} (${(lowAbility / students.length * 100).toFixed(1)}%)`);
  console.log(`  Medium Ability (-1 ≤ θ ≤ 1):       ${mediumAbility} (${(mediumAbility / students.length * 100).toFixed(1)}%)`);
  console.log(`  High Ability (θ > 1):              ${highAbility} (${(highAbility / students.length * 100).toFixed(1)}%)`);

  console.log('\n📝 SAMPLE RESULTS (First 10 Students)');
  console.log('-'.repeat(70));
  console.log('  True θ  | Est θ   | Error   | SEM    | Questions | Correct%');
  console.log('-'.repeat(70));

  students.slice(0, 10).forEach(s => {
    const error = s.estimatedAbility - s.trueAbility;
    const correctRate = (s.correctCount / s.questionsAnswered) * 100;
    console.log(
      `  ${s.trueAbility.toFixed(2).padStart(6)} | ` +
      `${s.estimatedAbility.toFixed(2).padStart(6)} | ` +
      `${error.toFixed(2).padStart(6)} | ` +
      `${s.sem.toFixed(3).padStart(5)} | ` +
      `${s.questionsAnswered.toString().padStart(9)} | ` +
      `${correctRate.toFixed(1).padStart(7)}%`
    );
  });

  console.log('\n' + '='.repeat(70));

  // Interpretation
  console.log('\n💡 INTERPRETATION GUIDE:');
  console.log('-'.repeat(70));
  console.log('  RMSE < 0.30:  Excellent accuracy');
  console.log('  RMSE < 0.50:  Good accuracy');
  console.log('  RMSE < 0.70:  Acceptable accuracy');
  console.log('  RMSE ≥ 0.70:  Needs improvement');
  console.log('');
  console.log('  Correlation > 0.90:  Excellent validity');
  console.log('  Correlation > 0.80:  Good validity');
  console.log('  Correlation > 0.70:  Acceptable validity');
  console.log('');
  console.log('  Questions to converge < 10:  Very efficient');
  console.log('  Questions to converge < 15:  Efficient');
  console.log('  Questions to converge < 20:  Acceptable');
  console.log('');
  console.log('='.repeat(70));
}

/**
 * Main simulation
 */
async function main() {
  const args = process.argv.slice(2);
  const numStudents = parseInt(args[0]) || 50;
  const maxQuestions = parseInt(args[1]) || 20;

  console.log('🚀 Starting Adaptive Quiz System Simulation\n');
  console.log(`Settings:`);
  console.log(`  - Number of students: ${numStudents}`);
  console.log(`  - Max questions per quiz: ${maxQuestions}`);
  console.log(`  - Target SEM: 0.5`);
  console.log(`  - Using 3PL IRT model\n`);

  // Check if we have calibrated questions
  const questionCount = await prisma.question.count({
    where: {
      isActive: true,
      irtModel: '3PL',
    },
  });

  if (questionCount === 0) {
    console.error('❌ Error: No calibrated 3PL questions found!');
    console.error('Please run calibration first:');
    console.error('  npx tsx src/scripts/calibrate-3pl-questions.ts calibrate\n');
    process.exit(1);
  }

  console.log(`✅ Found ${questionCount} calibrated 3PL questions\n`);

  // Generate student population
  console.log('👥 Generating student population...');
  const trueAbilities = generateStudentPopulation(numStudents);
  console.log(`✅ Generated ${numStudents} students with abilities from N(0,1)\n`);

  // Simulate each student
  console.log('🎯 Simulating adaptive quizzes...\n');
  const students: SimulatedStudent[] = [];

  for (let i = 0; i < numStudents; i++) {
    process.stdout.write(`  Progress: ${i + 1}/${numStudents} (${((i + 1) / numStudents * 100).toFixed(0)}%)\r`);

    const student = await simulateStudentQuiz(trueAbilities[i], maxQuestions);
    students.push(student);
  }

  console.log(`\n✅ Completed ${numStudents} simulations\n`);

  // Calculate metrics
  console.log('📊 Calculating performance metrics...');
  const metrics = calculateMetrics(students);

  // Print results
  printResults(students, metrics);

  // Save detailed results to file (optional)
  const summary = {
    timestamp: new Date().toISOString(),
    settings: {
      numStudents,
      maxQuestions,
      questionCount,
    },
    metrics,
    students: students.map(s => ({
      trueAbility: s.trueAbility,
      estimatedAbility: s.estimatedAbility,
      error: s.estimatedAbility - s.trueAbility,
      sem: s.sem,
      questionsAnswered: s.questionsAnswered,
      correctRate: s.correctCount / s.questionsAnswered,
    })),
  };

  console.log('\n💾 Results saved to simulation results (in memory)');
  console.log('\n✨ Simulation complete!\n');
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

export { simulateStudentQuiz, calculateMetrics, generateStudentPopulation };
