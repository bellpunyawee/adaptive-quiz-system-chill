/**
 * Comprehensive Research Metrics for Adaptive Quiz System
 *
 * Implements publication-ready metrics including:
 * - ECE (Expected Calibration Error)
 * - Brier Score
 * - Kendall's Tau (rank correlation)
 * - NDCG (Normalized Discounted Cumulative Gain)
 * - Precision@K (recommendation quality)
 * - Top-K Precision (high-stakes identification)
 * - AUC (ranking probability)
 *
 * For research/publication use
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface PredictionResult {
  prob: number;  // Predicted probability [0, 1]
  correct: boolean;  // Actual outcome
}

export interface AbilityEstimate {
  studentId: string;
  estimatedAbility: number;  // θ estimate
  trueAbility: number;  // Ground truth (for simulation)
}

export interface QuestionRecommendation {
  questionId: string;
  difficulty: number;  // IRT difficulty parameter (b)
  score: number;  // Ranking score (UCB, LinUCB, etc.)
}

export interface ComprehensiveMetrics {
  // Calibration
  ece: number;  // Expected Calibration Error
  brierScore: number;  // Brier Score
  reliabilityDiagram: ReliabilityBin[];

  // Ranking
  kendallTau: number;  // Rank correlation
  auc: number;  // Area Under Curve (ranking)
  topKPrecision: {
    p5: number;
    p10: number;
    p20: number;
  };

  // Recommendation Quality
  precisionAtK: {
    p3: number;
    p5: number;
    p10: number;
  };
  ndcg: {
    ndcg5: number;
    ndcg10: number;
  };

  // Fairness
  performanceByQuintile: AbilityQuintileMetrics[];
}

export interface ReliabilityBin {
  binIndex: number;
  binRange: [number, number];  // e.g., [0.0, 0.1]
  avgConfidence: number;  // Average predicted probability in bin
  avgAccuracy: number;  // Actual accuracy in bin
  count: number;  // Number of predictions
}

export interface AbilityQuintileMetrics {
  quintile: string;  // 'Q1_low', 'Q2', 'Q3_medium', 'Q4', 'Q5_high'
  range: [number, number];  // Ability range
  rmse: number;
  sem: number;
  count: number;
}

// ============================================================================
// CALIBRATION METRICS
// ============================================================================

/**
 * Calculate Expected Calibration Error (ECE)
 *
 * ECE measures how well predicted probabilities match observed frequencies.
 * Perfect calibration = 0.0
 *
 * @param predictions Array of prediction results
 * @param M Number of bins (default: 10)
 * @returns ECE value [0, 1]
 *
 * Target: ECE < 0.05 (well-calibrated)
 */
export function calculateECE(
  predictions: PredictionResult[],
  M: number = 10
): number {
  if (predictions.length === 0) return 0;

  const bins = Array.from({ length: M }, () => ({
    total: 0,
    correct: 0,
    conf_sum: 0,
  }));

  // Assign predictions to bins
  predictions.forEach(({ prob, correct }) => {
    const binIndex = Math.min(Math.floor(prob * M), M - 1);
    bins[binIndex].total++;
    bins[binIndex].correct += correct ? 1 : 0;
    bins[binIndex].conf_sum += prob;
  });

  // Calculate ECE
  const ece = bins.reduce((sum, bin) => {
    if (bin.total === 0) return sum;

    const accuracy = bin.correct / bin.total;
    const confidence = bin.conf_sum / bin.total;
    const weight = bin.total / predictions.length;

    return sum + weight * Math.abs(accuracy - confidence);
  }, 0);

  return ece;
}

/**
 * Calculate Brier Score
 *
 * Brier = (1/n) * Σ (p_i - y_i)²
 *
 * Combines calibration and discrimination in single metric.
 * Lower is better, perfect score = 0.0
 *
 * @param predictions Array of prediction results
 * @returns Brier Score [0, 1]
 *
 * Target: < 0.20
 */
export function calculateBrierScore(predictions: PredictionResult[]): number {
  if (predictions.length === 0) return 0;

  const sumSquaredErrors = predictions.reduce((sum, { prob, correct }) => {
    const actualValue = correct ? 1 : 0;
    const error = prob - actualValue;
    return sum + error * error;
  }, 0);

  return sumSquaredErrors / predictions.length;
}

/**
 * Generate reliability diagram data
 *
 * For visualization: plot avgConfidence (x) vs avgAccuracy (y)
 * Perfect calibration = diagonal line
 *
 * @param predictions Array of prediction results
 * @param M Number of bins
 * @returns Array of reliability bins
 */
export function generateReliabilityDiagram(
  predictions: PredictionResult[],
  M: number = 10
): ReliabilityBin[] {
  const bins = Array.from({ length: M }, (_, i) => ({
    binIndex: i,
    binRange: [i / M, (i + 1) / M] as [number, number],
    avgConfidence: 0,
    avgAccuracy: 0,
    count: 0,
    _correctSum: 0,
    _confSum: 0,
  }));

  // Collect data
  predictions.forEach(({ prob, correct }) => {
    const binIndex = Math.min(Math.floor(prob * M), M - 1);
    bins[binIndex].count++;
    bins[binIndex]._correctSum += correct ? 1 : 0;
    bins[binIndex]._confSum += prob;
  });

  // Calculate averages
  return bins.map((bin) => ({
    binIndex: bin.binIndex,
    binRange: bin.binRange,
    avgConfidence: bin.count > 0 ? bin._confSum / bin.count : 0,
    avgAccuracy: bin.count > 0 ? bin._correctSum / bin.count : 0,
    count: bin.count,
  }));
}

// ============================================================================
// RANKING METRICS
// ============================================================================

/**
 * Calculate Kendall's Tau (τ) - Rank Correlation
 *
 * More robust to outliers than Pearson correlation.
 * Measures fraction of concordant pairs minus discordant pairs.
 *
 * @param estimates Array of ability estimates
 * @returns Kendall's τ ∈ [-1, 1]
 *
 * Target: τ > 0.70
 */
export function calculateKendallTau(estimates: AbilityEstimate[]): number {
  if (estimates.length < 2) return 0;

  let concordant = 0;
  let discordant = 0;

  for (let i = 0; i < estimates.length; i++) {
    for (let j = i + 1; j < estimates.length; j++) {
      const trueOrder = estimates[i].trueAbility > estimates[j].trueAbility;
      const estOrder = estimates[i].estimatedAbility > estimates[j].estimatedAbility;

      if (trueOrder === estOrder) {
        concordant++;
      } else {
        discordant++;
      }
    }
  }

  const totalPairs = concordant + discordant;
  return totalPairs > 0 ? (concordant - discordant) / totalPairs : 0;
}

/**
 * Calculate AUC (Area Under ROC Curve) for ranking
 *
 * AUC = P(θ_high > θ_low | ability_high > ability_low)
 * Probability of correctly ranking two random students
 *
 * @param estimates Array of ability estimates
 * @returns AUC ∈ [0, 1]
 *
 * Target: AUC > 0.90
 */
export function calculateAUC(estimates: AbilityEstimate[]): number {
  if (estimates.length < 2) return 0.5;

  let concordant = 0;
  let discordant = 0;

  for (let i = 0; i < estimates.length; i++) {
    for (let j = i + 1; j < estimates.length; j++) {
      const trueOrder = estimates[i].trueAbility > estimates[j].trueAbility;
      const estOrder = estimates[i].estimatedAbility > estimates[j].estimatedAbility;

      if (trueOrder === estOrder) {
        concordant++;
      } else {
        discordant++;
      }
    }
  }

  const totalPairs = concordant + discordant;
  return totalPairs > 0 ? concordant / totalPairs : 0.5;
}

/**
 * Calculate Top-K Precision
 *
 * Precision of identifying top-K students (for leaderboards, honors, etc.)
 *
 * @param estimates Array of ability estimates
 * @param k Number of top students to identify
 * @returns Precision ∈ [0, 1]
 *
 * Targets: P@5 > 0.80, P@10 > 0.75, P@20 > 0.70
 */
export function calculateTopKPrecision(
  estimates: AbilityEstimate[],
  k: number
): number {
  if (estimates.length < k) return 0;

  // Get top-K by true ability
  const trueTopK = new Set(
    [...estimates]
      .sort((a, b) => b.trueAbility - a.trueAbility)
      .slice(0, k)
      .map((e) => e.studentId)
  );

  // Get top-K by estimated ability
  const estTopK = new Set(
    [...estimates]
      .sort((a, b) => b.estimatedAbility - a.estimatedAbility)
      .slice(0, k)
      .map((e) => e.studentId)
  );

  // Calculate intersection
  const intersection = new Set(
    [...trueTopK].filter((id) => estTopK.has(id))
  );

  return intersection.size / k;
}

// ============================================================================
// RECOMMENDATION QUALITY METRICS
// ============================================================================

/**
 * Calculate Precision@K for question recommendations
 *
 * Measures how many of the top-K recommended questions are well-matched
 * to the user's ability level.
 *
 * Well-matched = |θ - b| < threshold
 *
 * @param rankedQuestions Questions ranked by recommendation score
 * @param userAbility User's ability estimate (θ)
 * @param k Number of top recommendations to evaluate
 * @param threshold Distance threshold for "well-matched" (default: 0.5)
 * @returns Precision@K ∈ [0, 1]
 *
 * Targets: P@3 > 0.80, P@5 > 0.75, P@10 > 0.65
 */
export function calculatePrecisionAtK(
  rankedQuestions: QuestionRecommendation[],
  userAbility: number,
  k: number,
  threshold: number = 0.5
): number {
  if (rankedQuestions.length === 0 || k === 0) return 0;

  const topK = rankedQuestions.slice(0, Math.min(k, rankedQuestions.length));
  const wellMatched = topK.filter(
    (q) => Math.abs(q.difficulty - userAbility) < threshold
  ).length;

  return wellMatched / k;
}

/**
 * Calculate NDCG (Normalized Discounted Cumulative Gain)
 *
 * Measures ranking quality with position awareness.
 * Top recommendations matter more than lower ones.
 *
 * Relevance score: exp(-|θ - b|) - exponential decay by distance
 *
 * @param rankedQuestions Questions ranked by recommendation score
 * @param userAbility User's ability estimate (θ)
 * @param k Number of top recommendations to evaluate
 * @returns NDCG ∈ [0, 1]
 *
 * Targets: NDCG@5 > 0.85, NDCG@10 > 0.80
 */
export function calculateNDCG(
  rankedQuestions: QuestionRecommendation[],
  userAbility: number,
  k: number
): number {
  if (rankedQuestions.length === 0 || k === 0) return 0;

  const relevance = (q: QuestionRecommendation) =>
    Math.exp(-Math.abs(q.difficulty - userAbility));

  // DCG of current ranking
  const topK = rankedQuestions.slice(0, Math.min(k, rankedQuestions.length));
  const dcg = topK.reduce((sum, q, i) => {
    const position = i + 1;
    return sum + relevance(q) / Math.log2(position + 1);
  }, 0);

  // IDCG of ideal ranking (sorted by relevance)
  const idealRanking = [...rankedQuestions].sort(
    (a, b) => relevance(b) - relevance(a)
  );
  const idealTopK = idealRanking.slice(0, Math.min(k, idealRanking.length));
  const idcg = idealTopK.reduce((sum, q, i) => {
    const position = i + 1;
    return sum + relevance(q) / Math.log2(position + 1);
  }, 0);

  return idcg > 0 ? dcg / idcg : 0;
}

// ============================================================================
// FAIRNESS METRICS
// ============================================================================

/**
 * Calculate performance metrics by ability quintile
 *
 * Ensures the system performs fairly across different ability levels.
 *
 * @param estimates Array of ability estimates with SEM
 * @returns Metrics for each quintile
 *
 * Target: Max SEM difference < 0.10
 */
export function calculateQuintileMetrics(
  estimates: Array<AbilityEstimate & { sem: number }>
): AbilityQuintileMetrics[] {
  if (estimates.length === 0) return [];

  // Define quintiles
  const quintiles = [
    { name: 'Q1_low', range: [-Infinity, -1.0] as [number, number] },
    { name: 'Q2', range: [-1.0, -0.5] as [number, number] },
    { name: 'Q3_medium', range: [-0.5, 0.5] as [number, number] },
    { name: 'Q4', range: [0.5, 1.0] as [number, number] },
    { name: 'Q5_high', range: [1.0, Infinity] as [number, number] },
  ];

  return quintiles.map((quintile) => {
    const inQuintile = estimates.filter(
      (e) =>
        e.trueAbility >= quintile.range[0] &&
        e.trueAbility < quintile.range[1]
    );

    if (inQuintile.length === 0) {
      return {
        quintile: quintile.name,
        range: quintile.range,
        rmse: 0,
        sem: 0,
        count: 0,
      };
    }

    // Calculate RMSE
    const sumSquaredErrors = inQuintile.reduce(
      (sum, e) =>
        sum + Math.pow(e.estimatedAbility - e.trueAbility, 2),
      0
    );
    const rmse = Math.sqrt(sumSquaredErrors / inQuintile.length);

    // Calculate average SEM
    const avgSEM =
      inQuintile.reduce((sum, e) => sum + e.sem, 0) /
      inQuintile.length;

    return {
      quintile: quintile.name,
      range: quintile.range,
      rmse,
      sem: avgSEM,
      count: inQuintile.length,
    };
  });
}

// ============================================================================
// COMPREHENSIVE EVALUATION
// ============================================================================

/**
 * Calculate all metrics at once for a complete evaluation
 *
 * @param predictions Prediction results (for calibration)
 * @param estimates Ability estimates (for ranking)
 * @param recommendations Question recommendations (for recommendation quality)
 * @param userAbility User's current ability (for recommendation evaluation)
 * @returns Comprehensive metrics object
 */
export function calculateComprehensiveMetrics(params: {
  predictions: PredictionResult[];
  estimates: Array<AbilityEstimate & { sem: number }>;
  recommendations?: QuestionRecommendation[];
  userAbility?: number;
}): ComprehensiveMetrics {
  const { predictions, estimates, recommendations, userAbility } = params;

  return {
    // Calibration
    ece: calculateECE(predictions),
    brierScore: calculateBrierScore(predictions),
    reliabilityDiagram: generateReliabilityDiagram(predictions),

    // Ranking
    kendallTau: calculateKendallTau(estimates),
    auc: calculateAUC(estimates),
    topKPrecision: {
      p5: calculateTopKPrecision(estimates, 5),
      p10: calculateTopKPrecision(estimates, 10),
      p20: calculateTopKPrecision(estimates, 20),
    },

    // Recommendation Quality
    precisionAtK: {
      p3:
        recommendations && userAbility !== undefined
          ? calculatePrecisionAtK(recommendations, userAbility, 3)
          : 0,
      p5:
        recommendations && userAbility !== undefined
          ? calculatePrecisionAtK(recommendations, userAbility, 5)
          : 0,
      p10:
        recommendations && userAbility !== undefined
          ? calculatePrecisionAtK(recommendations, userAbility, 10)
          : 0,
    },
    ndcg: {
      ndcg5:
        recommendations && userAbility !== undefined
          ? calculateNDCG(recommendations, userAbility, 5)
          : 0,
      ndcg10:
        recommendations && userAbility !== undefined
          ? calculateNDCG(recommendations, userAbility, 10)
          : 0,
    },

    // Fairness
    performanceByQuintile: calculateQuintileMetrics(estimates),
  };
}

/**
 * Format comprehensive metrics as readable string (for logging/reporting)
 */
export function formatMetricsReport(metrics: ComprehensiveMetrics): string {
  const fairnessIssues = metrics.performanceByQuintile.some(
    (q) => q.sem > 0.4
  )
    ? '⚠️  Warning: High SEM in some quintiles'
    : '✓ Balanced across ability levels';

  return `
╔════════════════════════════════════════════════════════════════╗
║              COMPREHENSIVE RESEARCH METRICS                    ║
╠════════════════════════════════════════════════════════════════╣

📊 CALIBRATION METRICS
  ECE (Expected Calibration Error): ${metrics.ece.toFixed(4)} ${
    metrics.ece < 0.05 ? '✓ Excellent' : metrics.ece < 0.10 ? '⚠️  Acceptable' : '❌ Poor'
  }
  Brier Score:                       ${metrics.brierScore.toFixed(4)} ${
    metrics.brierScore < 0.20 ? '✓ Good' : '⚠️  High'
  }

📈 RANKING METRICS
  Kendall's Tau (τ):                 ${metrics.kendallTau.toFixed(4)} ${
    metrics.kendallTau > 0.70 ? '✓ Strong' : '⚠️  Weak'
  }
  AUC (Ranking):                     ${metrics.auc.toFixed(4)} ${
    metrics.auc > 0.90 ? '✓ Excellent' : metrics.auc > 0.80 ? '⚠️  Good' : '❌ Poor'
  }

  Top-K Precision:
    P@5:                             ${metrics.topKPrecision.p5.toFixed(4)}
    P@10:                            ${metrics.topKPrecision.p10.toFixed(4)}
    P@20:                            ${metrics.topKPrecision.p20.toFixed(4)}

🎯 RECOMMENDATION QUALITY
  Precision@K:
    P@3:                             ${metrics.precisionAtK.p3.toFixed(4)}
    P@5:                             ${metrics.precisionAtK.p5.toFixed(4)}
    P@10:                            ${metrics.precisionAtK.p10.toFixed(4)}

  NDCG (Ranking Quality):
    NDCG@5:                          ${metrics.ndcg.ndcg5.toFixed(4)}
    NDCG@10:                         ${metrics.ndcg.ndcg10.toFixed(4)}

⚖️  FAIRNESS ANALYSIS
  ${fairnessIssues}

  Performance by Ability Quintile:
${metrics.performanceByQuintile
  .map(
    (q) =>
      `    ${q.quintile.padEnd(12)} (n=${q.count.toString().padStart(4)}): RMSE=${q.rmse.toFixed(3)}, SEM=${q.sem.toFixed(3)}`
  )
  .join('\n')}

╚════════════════════════════════════════════════════════════════╝
`.trim();
}
