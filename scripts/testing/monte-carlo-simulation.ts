/**
 * Monte Carlo Simulation for Adaptive Quiz System
 *
 * Runs multiple independent simulations to measure:
 * - Accuracy (RMSE, MAE, Bias, Correlation)
 * - Precision (test-retest reliability, measurement consistency)
 * - Confidence intervals and statistical significance
 * - System stability across different student populations
 *
 * Usage:
 *   npx tsx src/scripts/monte-carlo-simulation.ts [numRuns] [studentsPerRun] [maxQuestions]
 */

import prisma from '@/lib/db';
import { calculate3PLProbability } from '@/lib/adaptive-engine/irt-3pl';
import { estimateAbility, type IRTResponse } from '@/lib/adaptive-engine/irt-estimator-enhanced';

interface SimulationRun {
  runId: number;
  students: StudentResult[];
  metrics: PerformanceMetrics;
}

interface StudentResult {
  studentId: string;
  trueAbility: number;
  estimatedAbility: number;
  sem: number;
  questionsAnswered: number;
  responses: IRTResponse[];
}

interface PerformanceMetrics {
  // Accuracy
  rmse: number;
  mae: number;
  bias: number;
  correlation: number;

  // Efficiency
  avgQuestions: number;
  avgSEM: number;
  percentConverged: number;

  // Coverage
  coverage68: number;  // % within 1 SE
  coverage95: number;  // % within 2 SE
}

interface PrecisionMetrics {
  // Test-retest reliability (simulate same student twice)
  testRetestCorrelation: number;
  avgAbilityDifference: number;
  semOfDifferences: number;

  // Measurement consistency
  conditionalSEM: {
    lowAbility: number;    // θ < -1
    mediumAbility: number; // -1 ≤ θ ≤ 1
    highAbility: number;   // θ > 1
  };

  // Reliability coefficient (Cronbach's alpha equivalent for IRT)
  reliability: number;

  // Standard Error of Estimate (precision of measurement)
  standardErrorOfEstimate: number;
}

interface MonteCarloResults {
  numRuns: number;
  studentsPerRun: number;
  maxQuestions: number;

  // Aggregate metrics across all runs
  accuracy: {
    meanRMSE: number;
    sdRMSE: number;
    ci95RMSE: [number, number];
    meanCorrelation: number;
    sdCorrelation: number;
    ci95Correlation: [number, number];
  };

  precision: PrecisionMetrics;

  // Stability metrics
  stability: {
    rmseVariability: number;      // CV of RMSE across runs
    correlationVariability: number; // CV of correlation across runs
  };

  allRuns: SimulationRun[];
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
 * Simulate response using 3PL
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
 * Simulate one student taking a quiz
 */
async function simulateStudent(
  trueAbility: number,
  maxQuestions: number,
  questions: any[],
  targetSEM: number = 0.5
): Promise<StudentResult> {
  const responses: IRTResponse[] = [];
  let currentEstimate = 0;
  let currentSEM = Infinity;

  for (let q = 0; q < maxQuestions; q++) {
    // Select question
    let selectedQuestion;
    if (responses.length < 3) {
      // Warm-up: medium difficulty
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

    // Stop if converged
    if (currentSEM < targetSEM && responses.length >= 5) {
      break;
    }
  }

  return {
    studentId: `s${Math.random().toString(36).substr(2, 9)}`,
    trueAbility,
    estimatedAbility: currentEstimate,
    sem: currentSEM,
    questionsAnswered: responses.length,
    responses,
  };
}

/**
 * Calculate performance metrics for one run
 */
function calculateMetrics(students: StudentResult[]): PerformanceMetrics {
  const n = students.length;

  // Accuracy
  const errors = students.map(s => s.estimatedAbility - s.trueAbility);
  const rmse = Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / n);
  const mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / n;
  const bias = errors.reduce((sum, e) => sum + e, 0) / n;

  // Correlation
  const meanTrue = students.reduce((sum, s) => sum + s.trueAbility, 0) / n;
  const meanEst = students.reduce((sum, s) => sum + s.estimatedAbility, 0) / n;
  const num = students.reduce((sum, s) =>
    sum + (s.trueAbility - meanTrue) * (s.estimatedAbility - meanEst), 0);
  const denTrue = Math.sqrt(students.reduce((sum, s) =>
    sum + Math.pow(s.trueAbility - meanTrue, 2), 0));
  const denEst = Math.sqrt(students.reduce((sum, s) =>
    sum + Math.pow(s.estimatedAbility - meanEst, 2), 0));
  const correlation = num / (denTrue * denEst);

  // Efficiency
  const avgQuestions = students.reduce((sum, s) => sum + s.questionsAnswered, 0) / n;
  const avgSEM = students.reduce((sum, s) => sum + s.sem, 0) / n;
  const percentConverged = (students.filter(s => s.sem < 0.5).length / n) * 100;

  // Coverage
  const within1SE = students.filter(s =>
    Math.abs(s.estimatedAbility - s.trueAbility) <= s.sem).length;
  const within2SE = students.filter(s =>
    Math.abs(s.estimatedAbility - s.trueAbility) <= 2 * s.sem).length;

  return {
    rmse,
    mae,
    bias,
    correlation,
    avgQuestions,
    avgSEM,
    percentConverged,
    coverage68: (within1SE / n) * 100,
    coverage95: (within2SE / n) * 100,
  };
}

/**
 * Calculate precision metrics (test-retest reliability)
 */
async function calculatePrecision(
  questions: any[],
  numPairs: number = 50,
  maxQuestions: number = 25
): Promise<PrecisionMetrics> {
  console.log('\n🔬 Calculating precision metrics (test-retest reliability)...');

  // Generate student abilities
  const abilities = generateAbilities(numPairs);

  // Test-retest: simulate each student twice
  const testResults: StudentResult[] = [];
  const retestResults: StudentResult[] = [];

  for (let i = 0; i < numPairs; i++) {
    process.stdout.write(`  Progress: ${i + 1}/${numPairs}\r`);

    const ability = abilities[i];

    // Test 1
    const test1 = await simulateStudent(ability, maxQuestions, questions);
    testResults.push(test1);

    // Test 2 (same student, different questions/responses)
    const test2 = await simulateStudent(ability, maxQuestions, questions);
    retestResults.push(test2);
  }

  console.log('');

  // Test-retest correlation
  const meanTest = testResults.reduce((sum, s) => sum + s.estimatedAbility, 0) / numPairs;
  const meanRetest = retestResults.reduce((sum, s) => sum + s.estimatedAbility, 0) / numPairs;

  const numerator = testResults.reduce((sum, s, i) =>
    sum + (s.estimatedAbility - meanTest) * (retestResults[i].estimatedAbility - meanRetest), 0);
  const denomTest = Math.sqrt(testResults.reduce((sum, s) =>
    sum + Math.pow(s.estimatedAbility - meanTest, 2), 0));
  const denomRetest = Math.sqrt(retestResults.reduce((sum, s) =>
    sum + Math.pow(s.estimatedAbility - meanRetest, 2), 0));

  const testRetestCorrelation = numerator / (denomTest * denomRetest);

  // Average difference between tests
  const differences = testResults.map((s, i) =>
    s.estimatedAbility - retestResults[i].estimatedAbility);
  const avgAbilityDifference = Math.abs(
    differences.reduce((sum, d) => sum + d, 0) / numPairs
  );

  // SEM of differences
  const meanDiff = differences.reduce((sum, d) => sum + d, 0) / numPairs;
  const semOfDifferences = Math.sqrt(
    differences.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) / numPairs
  );

  // Conditional SEM by ability level
  const lowAbility = testResults.filter(s => s.trueAbility < -1);
  const mediumAbility = testResults.filter(s =>
    s.trueAbility >= -1 && s.trueAbility <= 1);
  const highAbility = testResults.filter(s => s.trueAbility > 1);

  const conditionalSEM = {
    lowAbility: lowAbility.length > 0
      ? lowAbility.reduce((sum, s) => sum + s.sem, 0) / lowAbility.length
      : 0,
    mediumAbility: mediumAbility.length > 0
      ? mediumAbility.reduce((sum, s) => sum + s.sem, 0) / mediumAbility.length
      : 0,
    highAbility: highAbility.length > 0
      ? highAbility.reduce((sum, s) => sum + s.sem, 0) / highAbility.length
      : 0,
  };

  // Reliability coefficient (IRT reliability)
  // reliability = 1 - (avg SEM² / variance of true scores)
  const avgSEM = testResults.reduce((sum, s) => sum + s.sem, 0) / numPairs;
  const trueScoreVariance = testResults.reduce((sum, s) =>
    sum + Math.pow(s.trueAbility - abilities.reduce((a, b) => a + b, 0) / numPairs, 2), 0
  ) / numPairs;
  const reliability = Math.max(0, 1 - (avgSEM * avgSEM / trueScoreVariance));

  // Standard Error of Estimate
  const predictions = testResults.map(s => s.estimatedAbility);
  const actuals = testResults.map(s => s.trueAbility);
  const see = Math.sqrt(
    predictions.reduce((sum, p, i) =>
      sum + Math.pow(p - actuals[i], 2), 0) / numPairs
  );

  return {
    testRetestCorrelation,
    avgAbilityDifference,
    semOfDifferences,
    conditionalSEM,
    reliability,
    standardErrorOfEstimate: see,
  };
}

/**
 * Run Monte Carlo simulation
 */
async function runMonteCarloSimulation(
  numRuns: number = 10,
  studentsPerRun: number = 50,
  maxQuestions: number = 25
): Promise<MonteCarloResults> {
  console.log('🎲 Monte Carlo Simulation Starting...\n');
  console.log(`Configuration:`);
  console.log(`  - Number of runs: ${numRuns}`);
  console.log(`  - Students per run: ${studentsPerRun}`);
  console.log(`  - Max questions: ${maxQuestions}`);
  console.log(`  - Total simulations: ${numRuns * studentsPerRun}\n`);

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

  // Run simulations
  const allRuns: SimulationRun[] = [];

  for (let run = 0; run < numRuns; run++) {
    console.log(`📊 Run ${run + 1}/${numRuns}`);

    // Generate student population for this run
    const abilities = generateAbilities(studentsPerRun);
    const students: StudentResult[] = [];

    for (let i = 0; i < studentsPerRun; i++) {
      process.stdout.write(`  Students: ${i + 1}/${studentsPerRun}\r`);
      const student = await simulateStudent(abilities[i], maxQuestions, questions);
      students.push(student);
    }

    // Calculate metrics for this run
    const metrics = calculateMetrics(students);

    allRuns.push({
      runId: run + 1,
      students,
      metrics,
    });

    console.log(`  RMSE: ${metrics.rmse.toFixed(3)}, Correlation: ${metrics.correlation.toFixed(3)}\n`);
  }

  // Calculate precision metrics
  const precision = await calculatePrecision(questions, 50, maxQuestions);

  // Aggregate results across runs
  const rmses = allRuns.map(r => r.metrics.rmse);
  const correlations = allRuns.map(r => r.metrics.correlation);

  const meanRMSE = rmses.reduce((a, b) => a + b, 0) / numRuns;
  const sdRMSE = Math.sqrt(
    rmses.reduce((sum, r) => sum + Math.pow(r - meanRMSE, 2), 0) / numRuns
  );
  const ci95RMSE: [number, number] = [
    meanRMSE - 1.96 * sdRMSE / Math.sqrt(numRuns),
    meanRMSE + 1.96 * sdRMSE / Math.sqrt(numRuns),
  ];

  const meanCorrelation = correlations.reduce((a, b) => a + b, 0) / numRuns;
  const sdCorrelation = Math.sqrt(
    correlations.reduce((sum, c) => sum + Math.pow(c - meanCorrelation, 2), 0) / numRuns
  );
  const ci95Correlation: [number, number] = [
    meanCorrelation - 1.96 * sdCorrelation / Math.sqrt(numRuns),
    meanCorrelation + 1.96 * sdCorrelation / Math.sqrt(numRuns),
  ];

  // Stability metrics (coefficient of variation)
  const rmseVariability = (sdRMSE / meanRMSE) * 100;
  const correlationVariability = (sdCorrelation / meanCorrelation) * 100;

  return {
    numRuns,
    studentsPerRun,
    maxQuestions,
    accuracy: {
      meanRMSE,
      sdRMSE,
      ci95RMSE,
      meanCorrelation,
      sdCorrelation,
      ci95Correlation,
    },
    precision,
    stability: {
      rmseVariability,
      correlationVariability,
    },
    allRuns,
  };
}

/**
 * Print comprehensive results
 */
function printResults(results: MonteCarloResults) {
  console.log('\n' + '='.repeat(80));
  console.log('🎲 MONTE CARLO SIMULATION RESULTS');
  console.log('='.repeat(80));

  console.log('\n📋 CONFIGURATION');
  console.log('-'.repeat(80));
  console.log(`  Simulation runs:        ${results.numRuns}`);
  console.log(`  Students per run:       ${results.studentsPerRun}`);
  console.log(`  Total simulations:      ${results.numRuns * results.studentsPerRun}`);
  console.log(`  Max questions:          ${results.maxQuestions}`);

  console.log('\n📈 ACCURACY METRICS (Aggregated across all runs)');
  console.log('-'.repeat(80));
  console.log(`  RMSE (Root Mean Square Error):`);
  console.log(`    Mean:                 ${results.accuracy.meanRMSE.toFixed(3)}`);
  console.log(`    SD:                   ${results.accuracy.sdRMSE.toFixed(3)}`);
  console.log(`    95% CI:               [${results.accuracy.ci95RMSE[0].toFixed(3)}, ${results.accuracy.ci95RMSE[1].toFixed(3)}]`);
  console.log(`    Variability (CV):     ${results.stability.rmseVariability.toFixed(1)}%`);
  console.log(``);
  console.log(`  Correlation (True vs Estimated):`);
  console.log(`    Mean:                 ${results.accuracy.meanCorrelation.toFixed(3)}`);
  console.log(`    SD:                   ${results.accuracy.sdCorrelation.toFixed(3)}`);
  console.log(`    95% CI:               [${results.accuracy.ci95Correlation[0].toFixed(3)}, ${results.accuracy.ci95Correlation[1].toFixed(3)}]`);
  console.log(`    Variability (CV):     ${results.stability.correlationVariability.toFixed(1)}%`);

  console.log('\n🎯 PRECISION METRICS (Test-Retest Reliability)');
  console.log('-'.repeat(80));
  console.log(`  Test-Retest Correlation:        ${results.precision.testRetestCorrelation.toFixed(3)}`);
  console.log(`    (How consistent are estimates for same student?)`);
  console.log(`    > 0.90: Excellent reliability`);
  console.log(`    > 0.80: Good reliability`);
  console.log(`    > 0.70: Acceptable reliability`);
  console.log(``);
  console.log(`  Avg Difference (Test vs Retest): ${results.precision.avgAbilityDifference.toFixed(3)}`);
  console.log(`    (How much do estimates vary between tests?)`);
  console.log(``);
  console.log(`  SEM of Differences:              ${results.precision.semOfDifferences.toFixed(3)}`);
  console.log(`    (Measurement error between tests)`);
  console.log(``);
  console.log(`  Reliability Coefficient:         ${results.precision.reliability.toFixed(3)}`);
  console.log(`    (IRT reliability, analogous to Cronbach's alpha)`);
  console.log(`    > 0.90: Excellent`);
  console.log(`    > 0.80: Good`);
  console.log(`    > 0.70: Acceptable`);

  console.log('\n📊 CONDITIONAL SEM (Precision by Ability Level)');
  console.log('-'.repeat(80));
  console.log(`  Low Ability (θ < -1):            ${results.precision.conditionalSEM.lowAbility.toFixed(3)}`);
  console.log(`  Medium Ability (-1 ≤ θ ≤ 1):     ${results.precision.conditionalSEM.mediumAbility.toFixed(3)}`);
  console.log(`  High Ability (θ > 1):            ${results.precision.conditionalSEM.highAbility.toFixed(3)}`);
  console.log(``);
  console.log(`  (Lower SEM = more precise measurement)`);

  console.log('\n⚡ STABILITY METRICS');
  console.log('-'.repeat(80));
  console.log(`  RMSE Variability:                ${results.stability.rmseVariability.toFixed(1)}%`);
  console.log(`  Correlation Variability:         ${results.stability.correlationVariability.toFixed(1)}%`);
  console.log(``);
  console.log(`  (Lower variability = more stable system)`);
  console.log(`  < 10%: Very stable`);
  console.log(`  < 20%: Stable`);
  console.log(`  > 20%: Variable (check for issues)`);

  console.log('\n📋 RUN-BY-RUN RESULTS');
  console.log('-'.repeat(80));
  console.log(`  Run | RMSE   | Corr   | Avg Q | Coverage68 | Coverage95`);
  console.log('-'.repeat(80));
  results.allRuns.forEach(run => {
    console.log(
      `  ${run.runId.toString().padStart(3)} | ` +
      `${run.metrics.rmse.toFixed(3)} | ` +
      `${run.metrics.correlation.toFixed(3)} | ` +
      `${run.metrics.avgQuestions.toFixed(1).padStart(5)} | ` +
      `${run.metrics.coverage68.toFixed(1).padStart(10)}% | ` +
      `${run.metrics.coverage95.toFixed(1).padStart(10)}%`
    );
  });

  console.log('\n💡 INTERPRETATION');
  console.log('-'.repeat(80));

  const rmseStatus = results.accuracy.meanRMSE < 0.5 ? '✅ Good' :
                     results.accuracy.meanRMSE < 0.7 ? '⚠️ Acceptable' : '❌ Needs Improvement';
  const corrStatus = results.accuracy.meanCorrelation > 0.8 ? '✅ Good' :
                     results.accuracy.meanCorrelation > 0.7 ? '⚠️ Acceptable' : '❌ Needs Improvement';
  const reliabilityStatus = results.precision.testRetestCorrelation > 0.8 ? '✅ Good' :
                           results.precision.testRetestCorrelation > 0.7 ? '⚠️ Acceptable' : '❌ Needs Improvement';

  console.log(`  Accuracy (RMSE):          ${rmseStatus}`);
  console.log(`  Validity (Correlation):   ${corrStatus}`);
  console.log(`  Precision (Reliability):  ${reliabilityStatus}`);
  console.log(``);
  console.log(`  Standard Error of Estimate: ${results.precision.standardErrorOfEstimate.toFixed(3)}`);

  console.log('\n' + '='.repeat(80));
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const numRuns = parseInt(args[0]) || 10;
  const studentsPerRun = parseInt(args[1]) || 50;
  const maxQuestions = parseInt(args[2]) || 25;

  const results = await runMonteCarloSimulation(numRuns, studentsPerRun, maxQuestions);
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

export { runMonteCarloSimulation, calculatePrecision };
