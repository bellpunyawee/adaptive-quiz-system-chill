// src/lib/adaptive-engine/sympson-hetter.ts
// Sympson-Hetter Exposure Control (1985)
// Prevents overuse of highly informative items through probabilistic admission

import prisma from '@/lib/db';

/**
 * Sympson-Hetter exposure control parameters
 */
export interface ExposureControlConfig {
  enabled: boolean;
  maxExposureRate: number;  // Target maximum exposure rate (e.g., 0.20 = 20%)
  admissionThreshold: number; // Minimum admission probability (e.g., 0.05 = 5%)
  calibrationSampleSize: number; // Sample size for computing exposure rates
}

/**
 * Default Sympson-Hetter configuration
 */
export const DEFAULT_EXPOSURE_CONFIG: ExposureControlConfig = {
  enabled: true,
  maxExposureRate: 0.20,      // Max 20% exposure rate
  admissionThreshold: 0.05,    // Min 5% admission probability
  calibrationSampleSize: 100,  // Based on 100 recent quiz sessions
};

/**
 * Question with admission probability
 */
export interface QuestionWithAdmission {
  questionId: string;
  admissionProbability: number;
  exposureRate: number;
  shouldAdmit: boolean;
}

/**
 * Calculate admission probability for a question using Sympson-Hetter
 *
 * P_admission = min(1, maxExposureRate / observedExposureRate)
 *
 * If a question is being used too frequently, reduce its admission probability
 * to achieve the target maximum exposure rate.
 *
 * @param questionId - Question ID
 * @param config - Exposure control configuration
 * @returns Admission probability (0-1)
 */
export async function calculateAdmissionProbability(
  questionId: string,
  config: ExposureControlConfig = DEFAULT_EXPOSURE_CONFIG
): Promise<{ admissionProbability: number; exposureRate: number }> {
  if (!config.enabled) {
    return { admissionProbability: 1.0, exposureRate: 0 };
  }

  // Get question's exposure count and last usage
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { exposureCount: true, lastUsed: true }
  });

  if (!question) {
    return { admissionProbability: 0, exposureRate: 0 };
  }

  // Get total number of questions administered in recent sessions
  const recentQuizCount = await prisma.quiz.count({
    where: {
      status: 'completed',
      completedAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    take: config.calibrationSampleSize
  });

  // Get total answers in calibration window
  const totalAnswersInWindow = await prisma.userAnswer.count({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  });

  // Calculate observed exposure rate
  const observedExposureRate = totalAnswersInWindow > 0
    ? question.exposureCount / totalAnswersInWindow
    : 0;

  // Sympson-Hetter formula: P = min(1, r_max / r_observed)
  let admissionProbability = 1.0;

  if (observedExposureRate > 0) {
    admissionProbability = Math.min(
      1.0,
      config.maxExposureRate / observedExposureRate
    );
  }

  // Apply minimum threshold
  admissionProbability = Math.max(
    config.admissionThreshold,
    admissionProbability
  );

  return {
    admissionProbability,
    exposureRate: observedExposureRate
  };
}

/**
 * Apply Sympson-Hetter admission control to a list of candidate questions
 *
 * For each question:
 * 1. Calculate admission probability
 * 2. Generate random number [0,1]
 * 3. Admit if random < admission probability
 *
 * @param questionIds - Candidate question IDs
 * @param config - Exposure control configuration
 * @returns Questions that passed admission control
 */
export async function applyExposureControl(
  questionIds: string[],
  config: ExposureControlConfig = DEFAULT_EXPOSURE_CONFIG
): Promise<QuestionWithAdmission[]> {
  if (!config.enabled || questionIds.length === 0) {
    return questionIds.map(id => ({
      questionId: id,
      admissionProbability: 1.0,
      exposureRate: 0,
      shouldAdmit: true
    }));
  }

  const results: QuestionWithAdmission[] = [];

  for (const questionId of questionIds) {
    const { admissionProbability, exposureRate } = await calculateAdmissionProbability(
      questionId,
      config
    );

    // Probabilistic admission decision
    const randomValue = Math.random();
    const shouldAdmit = randomValue < admissionProbability;

    results.push({
      questionId,
      admissionProbability,
      exposureRate,
      shouldAdmit
    });
  }

  return results;
}

/**
 * Select best question from candidates after applying exposure control
 * Falls back to next-best if top choice is rejected
 *
 * @param rankedQuestions - Questions ranked by information/selection score (best first)
 * @param config - Exposure control configuration
 * @returns Selected question ID or null
 */
export async function selectWithExposureControl(
  rankedQuestions: Array<{ id: string; score: number }>,
  config: ExposureControlConfig = DEFAULT_EXPOSURE_CONFIG
): Promise<string | null> {
  if (rankedQuestions.length === 0) return null;

  // Try each question in order until one is admitted
  for (const question of rankedQuestions) {
    const { admissionProbability, exposureRate } = await calculateAdmissionProbability(
      question.id,
      config
    );

    const randomValue = Math.random();
    if (randomValue < admissionProbability) {
      console.log(
        `[Sympson-Hetter] Admitted question ${question.id} ` +
        `(P=${admissionProbability.toFixed(3)}, exposure=${(exposureRate * 100).toFixed(1)}%)`
      );
      return question.id;
    } else {
      console.log(
        `[Sympson-Hetter] Rejected question ${question.id} ` +
        `(P=${admissionProbability.toFixed(3)}, random=${randomValue.toFixed(3)})`
      );
    }
  }

  // If all questions rejected (rare), admit the best one anyway
  console.log('[Sympson-Hetter] All questions rejected, forcing admission of best candidate');
  return rankedQuestions[0]?.id || null;
}

/**
 * Update question exposure count after administration
 *
 * @param questionId - Question that was administered
 */
export async function updateExposureCount(questionId: string): Promise<void> {
  await prisma.question.update({
    where: { id: questionId },
    data: {
      exposureCount: { increment: 1 },
      lastUsed: new Date()
    }
  });
}

/**
 * Get exposure statistics for monitoring
 *
 * @param cellId - Optional cell ID to filter by
 * @returns Exposure statistics
 */
export async function getExposureStatistics(cellId?: string) {
  const whereClause = cellId ? { cellId, isActive: true } : { isActive: true };

  const questions = await prisma.question.findMany({
    where: whereClause,
    select: {
      id: true,
      exposureCount: true,
      maxExposure: true,
      lastUsed: true,
      cellId: true
    }
  });

  const totalQuestions = questions.length;
  const exposureCounts = questions.map(q => q.exposureCount);
  const avgExposure = exposureCounts.reduce((a, b) => a + b, 0) / totalQuestions;
  const maxExposure = Math.max(...exposureCounts);
  const minExposure = Math.min(...exposureCounts);

  // Calculate exposure distribution
  const overexposedCount = questions.filter(
    q => q.exposureCount >= q.maxExposure
  ).length;
  const underexposedCount = questions.filter(q => q.exposureCount === 0).length;

  // Calculate Gini coefficient (inequality measure)
  const sortedExposures = [...exposureCounts].sort((a, b) => a - b);
  const n = sortedExposures.length;
  const sumOfProducts = sortedExposures.reduce((sum, val, idx) => sum + val * (idx + 1), 0);
  const giniNumerator = 2 * sumOfProducts;
  const giniDenominator = n * sortedExposures.reduce((a, b) => a + b, 0);
  const giniCoefficient = giniDenominator > 0
    ? (giniNumerator / giniDenominator) - (n + 1) / n
    : 0;

  return {
    totalQuestions,
    avgExposure: avgExposure.toFixed(2),
    maxExposure,
    minExposure,
    overexposedCount,
    overexposedPercentage: ((overexposedCount / totalQuestions) * 100).toFixed(1),
    underexposedCount,
    underexposedPercentage: ((underexposedCount / totalQuestions) * 100).toFixed(1),
    giniCoefficient: giniCoefficient.toFixed(3), // 0 = perfect equality, 1 = maximum inequality
  };
}

/**
 * Reset exposure counts (for testing or periodic recalibration)
 *
 * @param cellId - Optional cell ID to reset specific cell
 */
export async function resetExposureCounts(cellId?: string): Promise<number> {
  const whereClause = cellId ? { cellId } : {};

  const result = await prisma.question.updateMany({
    where: whereClause,
    data: {
      exposureCount: 0,
      lastUsed: null
    }
  });

  return result.count;
}
