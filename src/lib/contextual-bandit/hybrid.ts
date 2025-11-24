/**
 * Hybrid Scoring - Combines LinUCB contextual bandit with IRT-based UCB
 *
 * Motivation:
 * - LinUCB: Learns personalized question selection from context
 * - IRT-UCB: Proven psychometric approach with strong theoretical foundation
 *
 * Hybrid approach gets best of both worlds:
 * - Safety: IRT provides fallback when contextual model is uncertain
 * - Personalization: LinUCB adapts to individual learning patterns
 * - Gradual transition: Start with IRT, shift to LinUCB as model learns
 *
 * Weight Evolution (Bayesian-optimized):
 * - Phase 1 (Q0-7): 40.3% → 70.8% LinUCB (conservative start, fast ramp-up)
 * - Phase 2 (Q7-26): 70.8% → 87.1% LinUCB (gradual learning phase)
 * - Phase 3 (Q26+): 87.1% → 97.0% LinUCB (sigma-adaptive, high confidence)
 */

import { LinUCBModel } from './algorithms/linucb';
import { calculateUCB as calculateIRTUCB } from '../adaptive-engine/ucb';

export interface HybridScore {
  linucbScore: number;      // LinUCB UCB score
  irtScore: number;          // IRT-based UCB score
  finalScore: number;        // Weighted combination
  linucbWeight: number;      // Weight applied to LinUCB
  irtWeight: number;         // Weight applied to IRT
  components: {
    mu: number;              // LinUCB expected reward
    sigma: number;           // LinUCB uncertainty
    kli: number;             // KLI from IRT
    exploration: number;     // UCB1 exploration bonus
  };
}

export interface HybridConfig {
  baseLinucbWeight: number;     // Base weight for LinUCB (default: 0.7)
  baseIrtWeight: number;         // Base weight for IRT (default: 0.3)
  useAdaptiveWeights: boolean;   // Adjust weights based on confidence (default: true)
  linucbAlpha: number;           // LinUCB exploration parameter (default: 1.5)
  irtExplorationC: number;       // IRT UCB exploration constant (default: 1.0)
  minLinucbWeight: number;       // Minimum LinUCB weight (default: 0.403, optimized)
  maxLinucbWeight: number;       // Maximum LinUCB weight (default: 0.970, optimized)
}

const DEFAULT_HYBRID_CONFIG: HybridConfig = {
  baseLinucbWeight: 0.7,
  baseIrtWeight: 0.3,
  useAdaptiveWeights: true,
  linucbAlpha: 1.5,
  irtExplorationC: 1.0,
  minLinucbWeight: 0.403,  // Optimized via Bayesian optimization (was 0.5)
  maxLinucbWeight: 0.970,  // Optimized via Bayesian optimization (was 0.9)
};

/**
 * Calculate hybrid score combining LinUCB and IRT
 *
 * @param model - LinUCB model for this question
 * @param context - Context vector (15D)
 * @param userAbility - User's theta (IRT ability)
 * @param questionDifficulty - Question's b parameter
 * @param questionDiscrimination - Question's a parameter
 * @param questionSelections - Times this question selected
 * @param totalSelections - Total selections across all questions
 * @param config - Hybrid configuration
 * @returns Hybrid score with components
 */
export function calculateHybridScore(
  model: LinUCBModel,
  context: number[],
  userAbility: number,
  questionDifficulty: number,
  questionDiscrimination: number,
  questionSelections: number,
  totalSelections: number,
  config: Partial<HybridConfig> = {}
): HybridScore {
  const cfg = { ...DEFAULT_HYBRID_CONFIG, ...config };

  // 1. Calculate LinUCB score
  const linucbPrediction = model.predict(context, cfg.linucbAlpha);
  const linucbScore = linucbPrediction.ucb;

  // 2. Calculate IRT-based UCB score
  const irtScore = calculateIRTUCB(
    userAbility,
    questionDifficulty,
    questionDiscrimination,
    questionSelections,
    totalSelections,
    cfg.irtExplorationC
  );

  // 3. Determine weights
  let linucbWeight = cfg.baseLinucbWeight;
  let irtWeight = cfg.baseIrtWeight;

  if (cfg.useAdaptiveWeights) {
    // Use TOTAL selections (student progress) as primary driver
    // totalSelections represents how many questions the student has answered
    const studentProgress = totalSelections || 0;

    // Allow parameter override from environment variables (for optimization)
    const isOptimizationMode = process.env.HYBRID_OPTIMIZATION_MODE === 'true';
    const initialWeight = isOptimizationMode && process.env.HYBRID_INITIAL_WEIGHT
      ? parseFloat(process.env.HYBRID_INITIAL_WEIGHT)
      : cfg.minLinucbWeight;
    const phase1End = isOptimizationMode && process.env.HYBRID_PHASE1_END
      ? parseInt(process.env.HYBRID_PHASE1_END)
      : 7;  // Optimized via Bayesian optimization (was 10)
    const phase2End = isOptimizationMode && process.env.HYBRID_PHASE2_END
      ? parseInt(process.env.HYBRID_PHASE2_END)
      : 26;  // Optimized via Bayesian optimization (was 20)
    const phase1Target = isOptimizationMode && process.env.HYBRID_PHASE1_TARGET
      ? parseFloat(process.env.HYBRID_PHASE1_TARGET)
      : 0.708;  // Optimized via Bayesian optimization (was 0.65)
    const phase2Target = isOptimizationMode && process.env.HYBRID_PHASE2_TARGET
      ? parseFloat(process.env.HYBRID_PHASE2_TARGET)
      : 0.871;  // Optimized via Bayesian optimization (was 0.85)
    const maxWeight = isOptimizationMode && process.env.HYBRID_MAX_WEIGHT
      ? parseFloat(process.env.HYBRID_MAX_WEIGHT)
      : cfg.maxLinucbWeight;

    // Phase-based weight evolution for proper ramp-up
    if (studentProgress < phase1End) {
      // Very early: trust IRT more
      const progress = studentProgress / phase1End; // 0 to 1
      linucbWeight = initialWeight + (phase1Target - initialWeight) * progress;
    } else if (studentProgress < phase2End) {
      // Learning phase: ramp up quickly
      const progress = (studentProgress - phase1End) / (phase2End - phase1End); // 0 to 1
      linucbWeight = phase1Target + (phase2Target - phase1Target) * progress;
    } else {
      // Confident phase: use sigma for fine-tuning
      // Use exponential decay for less conservative sigma scaling
      const sigmaBased = Math.exp(-linucbPrediction.sigma / 2);
      // σ=0 → 1.0, σ=1 → 0.61, σ=2 → 0.37, σ=3 → 0.22

      linucbWeight = phase2Target + (maxWeight - phase2Target) * sigmaBased;
    }

    irtWeight = 1 - linucbWeight;
  }

  // 4. Normalize IRT score to similar scale as LinUCB
  // IRT scores can vary widely, normalize using sigmoid
  const irtScoreNormalized = sigmoid(irtScore / 2); // Divide by 2 for softer sigmoid

  // 5. Normalize LinUCB score (already roughly [0, 1] but can exceed)
  const linucbScoreNormalized = sigmoid(linucbScore);

  // 6. Calculate weighted combination
  const finalScore = linucbWeight * linucbScoreNormalized + irtWeight * irtScoreNormalized;

  // 7. Extract KLI and exploration components from IRT score for logging
  // (This is approximate since calculateIRTUCB combines them internally)
  const kliApprox = irtScore - cfg.irtExplorationC * Math.sqrt(
    totalSelections > 0 ? Math.log(totalSelections) / Math.max(1, questionSelections) : 0
  );
  const explorationApprox = irtScore - kliApprox;

  return {
    linucbScore: linucbScoreNormalized,
    irtScore: irtScoreNormalized,
    finalScore,
    linucbWeight,
    irtWeight,
    components: {
      mu: linucbPrediction.mu,
      sigma: linucbPrediction.sigma,
      kli: kliApprox,
      exploration: explorationApprox,
    },
  };
}

/**
 * Sigmoid function for score normalization
 * Maps (-∞, +∞) to (0, 1)
 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Calculate pure LinUCB score (no hybrid)
 */
export function calculatePureLinUCBScore(
  model: LinUCBModel,
  context: number[],
  alpha: number = 1.5
): number {
  const prediction = model.predict(context, alpha);
  return prediction.ucb;
}

/**
 * Calculate pure IRT score (no hybrid)
 */
export function calculatePureIRTScore(
  userAbility: number,
  questionDifficulty: number,
  questionDiscrimination: number,
  questionSelections: number,
  totalSelections: number,
  explorationC: number = 1.0
): number {
  return calculateIRTUCB(
    userAbility,
    questionDifficulty,
    questionDiscrimination,
    questionSelections,
    totalSelections,
    explorationC
  );
}

/**
 * Get recommended weights based on model maturity
 *
 * @param observationCount - Number of observations for this question
 * @returns Recommended LinUCB and IRT weights
 */
export function getRecommendedWeights(observationCount: number): {
  linucbWeight: number;
  irtWeight: number;
} {
  // Gradually increase LinUCB weight as model accumulates observations
  // 0-10 obs: 50% LinUCB, 50% IRT
  // 10-50 obs: 50% → 80% LinUCB
  // 50+ obs: 80% LinUCB, 20% IRT

  let linucbWeight: number;

  if (observationCount < 10) {
    linucbWeight = 0.5;
  } else if (observationCount < 50) {
    // Linear interpolation from 0.5 to 0.8
    const progress = (observationCount - 10) / 40; // 0 to 1
    linucbWeight = 0.5 + 0.3 * progress;
  } else {
    linucbWeight = 0.8;
  }

  return {
    linucbWeight,
    irtWeight: 1 - linucbWeight,
  };
}

/**
 * Log hybrid score components (for debugging/analysis)
 */
export function logHybridScore(
  score: HybridScore,
  questionId: string,
  userId: string
): void {
  console.log(`[Hybrid Score] User: ${userId}, Question: ${questionId}`);
  console.log(`  LinUCB Score: ${score.linucbScore.toFixed(4)} (weight: ${score.linucbWeight.toFixed(2)})`);
  console.log(`    μ (expected): ${score.components.mu.toFixed(4)}`);
  console.log(`    σ (uncertainty): ${score.components.sigma.toFixed(4)}`);
  console.log(`  IRT Score: ${score.irtScore.toFixed(4)} (weight: ${score.irtWeight.toFixed(2)})`);
  console.log(`    KLI: ${score.components.kli.toFixed(4)}`);
  console.log(`    Exploration: ${score.components.exploration.toFixed(4)}`);
  console.log(`  Final Score: ${score.finalScore.toFixed(4)}`);
}
