/**
 * Reward Calculator - Multi-objective reward function
 *
 * Combines multiple signals:
 * 1. Correctness (primary): Did the user answer correctly?
 * 2. Information Gain: Did this question reduce uncertainty?
 * 3. Speed Bonus: Did the user answer efficiently?
 *
 * Default weights: 0.7 correctness + 0.2 info_gain + 0.1 speed
 */

export interface RewardComponents {
  correctness: number;    // 0 or 1
  infoGain: number;       // [0, 1] normalized
  speedBonus: number;     // [0, 1] normalized
  totalReward: number;    // Weighted sum
}

export interface RewardConfig {
  weightCorrectness: number;   // Default: 0.7
  weightInfoGain: number;       // Default: 0.2
  weightSpeed: number;          // Default: 0.1
  maxResponseTime: number;      // Seconds, default: 120
  useMultiObjective: boolean;   // Default: true
}

const DEFAULT_CONFIG: RewardConfig = {
  weightCorrectness: 0.7,
  weightInfoGain: 0.2,
  weightSpeed: 0.1,
  maxResponseTime: 120, // 2 minutes
  useMultiObjective: true,
};

/**
 * Calculate reward for a user's response
 *
 * @param isCorrect - Whether the answer was correct
 * @param semBefore - Standard error before answering
 * @param semAfter - Standard error after answering
 * @param responseTime - Time taken to answer (seconds)
 * @param config - Reward configuration (optional)
 * @returns Reward components and total reward
 */
export function calculateReward(
  isCorrect: boolean,
  semBefore: number,
  semAfter: number,
  responseTime: number,
  config: Partial<RewardConfig> = {}
): RewardComponents {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 1. Correctness component (binary)
  const correctness = isCorrect ? 1 : 0;

  // 2. Information gain component (normalized)
  let infoGain = 0;
  if (cfg.useMultiObjective && semBefore > 0) {
    // Relative reduction in uncertainty
    const semReduction = (semBefore - semAfter) / semBefore;
    // Normalize to [0, 1], typical reduction is 0-50%
    infoGain = Math.max(0, Math.min(1, semReduction * 2));
  }

  // 3. Speed bonus component (normalized)
  let speedBonus = 0;
  if (cfg.useMultiObjective && responseTime > 0) {
    // Fast response gets bonus, slow response gets penalty
    // Linear decay from 1 (instant) to 0 (maxResponseTime)
    speedBonus = Math.max(0, 1 - responseTime / cfg.maxResponseTime);
  }

  // Calculate weighted total
  let totalReward: number;

  if (cfg.useMultiObjective) {
    // Ensure weights sum to 1
    const totalWeight = cfg.weightCorrectness + cfg.weightInfoGain + cfg.weightSpeed;
    const normWeightCorrectness = cfg.weightCorrectness / totalWeight;
    const normWeightInfoGain = cfg.weightInfoGain / totalWeight;
    const normWeightSpeed = cfg.weightSpeed / totalWeight;

    totalReward =
      normWeightCorrectness * correctness +
      normWeightInfoGain * infoGain +
      normWeightSpeed * speedBonus;
  } else {
    // Simple binary reward
    totalReward = correctness;
  }

  return {
    correctness,
    infoGain,
    speedBonus,
    totalReward,
  };
}

/**
 * Calculate simple binary reward (for baseline)
 */
export function calculateBinaryReward(isCorrect: boolean): number {
  return isCorrect ? 1 : 0;
}

/**
 * Calculate information-weighted reward
 * Combines correctness with information gain
 */
export function calculateInfoWeightedReward(
  isCorrect: boolean,
  semBefore: number,
  semAfter: number
): number {
  const correctness = isCorrect ? 1 : 0;

  if (semBefore <= 0) {
    return correctness;
  }

  // Information gain (normalized)
  const semReduction = (semBefore - semAfter) / semBefore;
  const infoGain = Math.max(0, Math.min(1, semReduction * 2));

  // 70% correctness, 30% info gain
  return 0.7 * correctness + 0.3 * infoGain;
}

/**
 * Validate reward is in valid range
 */
export function validateReward(reward: number): boolean {
  return isFinite(reward) && reward >= 0 && reward <= 1;
}

/**
 * Log reward calculation (for debugging/analysis)
 */
export function logReward(
  components: RewardComponents,
  userId: string,
  questionId: string
): void {
  console.log(`[Reward] User: ${userId}, Question: ${questionId}`);
  console.log(`  Correctness: ${components.correctness}`);
  console.log(`  Info Gain: ${components.infoGain.toFixed(3)}`);
  console.log(`  Speed Bonus: ${components.speedBonus.toFixed(3)}`);
  console.log(`  Total Reward: ${components.totalReward.toFixed(3)}`);
}

/**
 * Get reward statistics from a set of responses
 */
export function getRewardStatistics(rewards: number[]): {
  mean: number;
  std: number;
  min: number;
  max: number;
  count: number;
} {
  if (rewards.length === 0) {
    return { mean: 0, std: 0, min: 0, max: 0, count: 0 };
  }

  const sum = rewards.reduce((a, b) => a + b, 0);
  const mean = sum / rewards.length;

  const variance = rewards.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rewards.length;
  const std = Math.sqrt(variance);

  const min = Math.min(...rewards);
  const max = Math.max(...rewards);

  return { mean, std, min, max, count: rewards.length };
}
