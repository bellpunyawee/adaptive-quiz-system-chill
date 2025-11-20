/**
 * Feature normalization utilities for contextual bandit
 * All features should be normalized to [0, 1] range for LinUCB stability
 */

/**
 * Normalize ability estimate (theta) from [-4, 4] to [0, 1]
 */
export function normalizeTheta(theta: number): number {
  return (theta + 4) / 8;
}

/**
 * Normalize Standard Error of Measurement from [0, 2] to [0, 1]
 */
export function normalizeSEM(sem: number): number {
  return Math.min(Math.max(sem / 2, 0), 1);
}

/**
 * Normalize confidence (already in [0, 1])
 */
export function normalizeConfidence(confidence: number): number {
  return Math.min(Math.max(confidence, 0), 1);
}

/**
 * Normalize response count with soft cap at 50
 */
export function normalizeResponseCount(count: number): number {
  return Math.min(count / 50, 1);
}

/**
 * Normalize accuracy rate (already in [0, 1])
 */
export function normalizeAccuracy(accuracy: number): number {
  return Math.min(Math.max(accuracy, 0), 1);
}

/**
 * Normalize session progress with cap at 30 questions
 */
export function normalizeSessionProgress(questionsAnswered: number): number {
  return Math.min(questionsAnswered / 30, 1);
}

/**
 * Normalize IRT difficulty from [-4, 4] to [0, 1]
 */
export function normalizeDifficulty(b: number): number {
  return (b + 4) / 8;
}

/**
 * Normalize IRT discrimination from [0.5, 2.5] to [0, 1]
 */
export function normalizeDiscrimination(a: number): number {
  return (a - 0.5) / 2.0;
}

/**
 * Normalize guessing parameter from [0, 0.35] to [0, 1]
 */
export function normalizeGuessing(c: number): number {
  return c / 0.35;
}

/**
 * Normalize exposure rate (already ratio, should be [0, 1])
 */
export function normalizeExposureRate(exposureCount: number, maxExposure: number): number {
  if (maxExposure === 0) return 0;
  return Math.min(exposureCount / maxExposure, 1);
}

/**
 * Normalize historical correct rate (already in [0, 1])
 */
export function normalizeCorrectRate(correctRate: number): number {
  return Math.min(Math.max(correctRate, 0), 1);
}

/**
 * Normalize distance between theta and difficulty [0, 8] to [0, 1]
 */
export function normalizeDistance(distance: number): number {
  return Math.min(distance / 8, 1);
}

/**
 * Normalize Fisher information (typically [0, 2]) to [0, 1]
 */
export function normalizeFisherInfo(info: number): number {
  return Math.min(info / 2, 1);
}

/**
 * Clamp value to [min, max] range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Safe division with fallback
 */
export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  if (denominator === 0 || !isFinite(denominator)) {
    return fallback;
  }
  const result = numerator / denominator;
  return isFinite(result) ? result : fallback;
}
