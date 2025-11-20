/**
 * Monitoring and Analytics for Contextual Bandit
 *
 * Tracks:
 * - Performance metrics (latency, cache hit rate)
 * - Model quality (feature importance, weight stability)
 * - Regret (cumulative suboptimality)
 * - A/B test comparisons
 */

import prisma from "@/lib/db";
import { getModelManager } from './model-manager';

export interface ContextualBanditMetrics {
  // Performance
  avgSelectionLatency: number;      // ms
  avgUpdateLatency: number;         // ms
  cacheHitRate: number;             // 0-1

  // Model quality
  avgObservationCount: number;      // per question
  totalModels: number;
  activeModels: number;             // models with obs > 0

  // Usage
  totalDecisions: number;
  decisionsToday: number;
  algorithmsUsed: {
    hybrid: number;
    linucb: number;
    irt: number;
  };

  // Regret (approximate)
  estimatedCumulativeRegret: number;
}

/**
 * Calculate comprehensive metrics
 */
export async function getMetrics(): Promise<ContextualBanditMetrics> {
  const modelManager = getModelManager();
  const cacheStats = modelManager.getCacheStats();

  // Get all models metadata
  const models = await modelManager.getAllModels();

  const totalModels = models.length;
  const activeModels = models.filter(m => m.observationCount > 0).length;
  const avgObservationCount = totalModels > 0
    ? models.reduce((sum, m) => sum + m.observationCount, 0) / totalModels
    : 0;

  // Get decision counts
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalDecisions, decisionsToday, algorithmCounts] = await Promise.all([
    prisma.decisionSnapshot.count(),
    prisma.decisionSnapshot.count({
      where: {
        timestamp: { gte: todayStart },
      },
    }),
    prisma.decisionSnapshot.groupBy({
      by: ['algorithm'],
      _count: true,
    }),
  ]);

  const algorithmsUsed = {
    hybrid: 0,
    linucb: 0,
    irt: 0,
  };

  for (const group of algorithmCounts) {
    const algo = group.algorithm as keyof typeof algorithmsUsed;
    if (algo in algorithmsUsed) {
      algorithmsUsed[algo] = group._count;
    }
  }

  return {
    avgSelectionLatency: 0, // TODO: Implement timing tracking
    avgUpdateLatency: 0,
    cacheHitRate: cacheStats.hitRate,

    avgObservationCount,
    totalModels,
    activeModels,

    totalDecisions,
    decisionsToday,
    algorithmsUsed,

    estimatedCumulativeRegret: 0, // TODO: Implement regret calculation
  };
}

/**
 * Get feature importance for a specific question
 * (Analyzes weight vector to see which features matter most)
 */
export async function getFeatureImportance(
  questionId: string
): Promise<Array<{ featureIndex: number; featureName: string; weight: number; absWeight: number }>> {
  const modelManager = getModelManager();
  const model = await modelManager.getModel(questionId);

  const weights = model.getWeights();

  const featureNames = [
    // User features (6)
    'user_theta_norm',
    'user_sem_norm',
    'user_confidence',
    'user_experience',
    'user_recent_accuracy',
    'user_session_progress',
    // Question features (5)
    'question_difficulty_norm',
    'question_discrimination_norm',
    'question_guessing_norm',
    'question_exposure_rate',
    'question_historical_correct_rate',
    // Interaction features (4)
    'interaction_theta_difficulty_distance',
    'interaction_irt_probability',
    'interaction_fisher_information',
    'interaction_topic_weakness_match',
  ];

  const importance = weights.map((weight, index) => ({
    featureIndex: index,
    featureName: featureNames[index] || `feature_${index}`,
    weight,
    absWeight: Math.abs(weight),
  }));

  // Sort by absolute weight (descending)
  importance.sort((a, b) => b.absWeight - a.absWeight);

  return importance;
}

/**
 * Get top N most important features across all models
 */
export async function getGlobalFeatureImportance(
  topN: number = 10
): Promise<Array<{ featureName: string; avgAbsWeight: number; frequency: number }>> {
  const modelManager = getModelManager();
  const allModels = await modelManager.getAllModels();

  // Only consider models with sufficient observations
  const matureModels = allModels.filter(m => m.observationCount >= 10);

  if (matureModels.length === 0) {
    return [];
  }

  const featureNames = [
    'user_theta_norm',
    'user_sem_norm',
    'user_confidence',
    'user_experience',
    'user_recent_accuracy',
    'user_session_progress',
    'question_difficulty_norm',
    'question_discrimination_norm',
    'question_guessing_norm',
    'question_exposure_rate',
    'question_historical_correct_rate',
    'interaction_theta_difficulty_distance',
    'interaction_irt_probability',
    'interaction_fisher_information',
    'interaction_topic_weakness_match',
  ];

  // Accumulate weights for each feature
  const featureStats = new Map<string, { totalAbsWeight: number; count: number }>();

  for (const modelMeta of matureModels) {
    const model = await modelManager.getModel(modelMeta.questionId);
    const weights = model.getWeights();

    weights.forEach((weight, index) => {
      const name = featureNames[index] || `feature_${index}`;
      const stats = featureStats.get(name) || { totalAbsWeight: 0, count: 0 };

      stats.totalAbsWeight += Math.abs(weight);
      stats.count += 1;

      featureStats.set(name, stats);
    });
  }

  // Calculate averages
  const importance = Array.from(featureStats.entries()).map(([name, stats]) => ({
    featureName: name,
    avgAbsWeight: stats.totalAbsWeight / stats.count,
    frequency: stats.count,
  }));

  // Sort by average absolute weight
  importance.sort((a, b) => b.avgAbsWeight - a.avgAbsWeight);

  return importance.slice(0, topN);
}

/**
 * Calculate regret for a specific quiz
 * Regret = difference between optimal selection and actual selection
 */
export async function calculateQuizRegret(quizId: string): Promise<number> {
  // Get all decisions for this quiz
  const decisions = await prisma.decisionSnapshot.findMany({
    where: { quizId },
    orderBy: { timestamp: 'asc' },
  });

  if (decisions.length === 0) {
    return 0;
  }

  // TODO: Implement proper regret calculation
  // Would need to:
  // 1. For each decision, determine what the optimal choice would have been (hindsight)
  // 2. Calculate reward difference between actual and optimal
  // 3. Sum across all decisions

  // For now, return placeholder
  return 0;
}

/**
 * Get model statistics for a question
 */
export async function getModelStats(questionId: string): Promise<{
  observationCount: number;
  avgReward: number;
  weightNorm: number;
  lastUpdated: Date;
}> {
  const modelManager = getModelManager();
  const model = await modelManager.getModel(questionId);

  const weights = model.getWeights();
  const weightNorm = Math.sqrt(weights.reduce((sum, w) => sum + w * w, 0));

  const record = await prisma.contextualModel.findUnique({
    where: { id: questionId },
  });

  // Calculate avg reward (would need to track this separately for accuracy)
  // For now, approximate from observation count
  const avgReward = 0.5; // Placeholder

  return {
    observationCount: model.getObservationCount(),
    avgReward,
    weightNorm,
    lastUpdated: record?.lastUpdated || new Date(),
  };
}

/**
 * Get comparison metrics between contextual bandit and IRT baseline
 */
export async function getComparisonMetrics(
  startDate: Date,
  endDate: Date
): Promise<{
  contextualBandit: {
    users: number;
    avgQuestionsToMastery: number;
    avgAccuracy: number;
  };
  irtBaseline: {
    users: number;
    avgQuestionsToMastery: number;
    avgAccuracy: number;
  };
}> {
  // Get quizzes in date range
  const quizzes = await prisma.quiz.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'completed',
    },
    include: {
      userAnswers: true,
    },
  });

  // Split by algorithm
  const contextualQuizzes = quizzes.filter(q =>
    q.userAnswers.some(a =>
      // Check if any answer has a decision snapshot with contextual algorithm
      true // TODO: Implement proper filtering
    )
  );

  const irtQuizzes = quizzes.filter(q => !contextualQuizzes.includes(q));

  // Calculate metrics for each group
  const contextualMetrics = calculateGroupMetrics(contextualQuizzes);
  const irtMetrics = calculateGroupMetrics(irtQuizzes);

  return {
    contextualBandit: contextualMetrics,
    irtBaseline: irtMetrics,
  };
}

/**
 * Helper: Calculate metrics for a group of quizzes
 */
function calculateGroupMetrics(quizzes: any[]): {
  users: number;
  avgQuestionsToMastery: number;
  avgAccuracy: number;
} {
  if (quizzes.length === 0) {
    return {
      users: 0,
      avgQuestionsToMastery: 0,
      avgAccuracy: 0,
    };
  }

  const uniqueUsers = new Set(quizzes.map(q => q.userId)).size;

  const totalQuestions = quizzes.reduce((sum, q) => sum + q.userAnswers.length, 0);
  const avgQuestions = totalQuestions / quizzes.length;

  const correctAnswers = quizzes.reduce(
    (sum, q) => sum + q.userAnswers.filter((a: any) => a.isCorrect).length,
    0
  );
  const avgAccuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

  return {
    users: uniqueUsers,
    avgQuestionsToMastery: avgQuestions,
    avgAccuracy,
  };
}

/**
 * Log performance metric
 */
export function logPerformance(
  operation: string,
  durationMs: number,
  metadata?: Record<string, any>
): void {
  console.log(`[Contextual Bandit Performance] ${operation}: ${durationMs.toFixed(2)}ms`, metadata || '');
}

/**
 * Get metrics summary as string (for logging/debugging)
 */
export async function getMetricsSummary(): Promise<string> {
  const metrics = await getMetrics();

  return `
Contextual Bandit Metrics:
  Models:
    Total: ${metrics.totalModels}
    Active: ${metrics.activeModels}
    Avg Observations: ${metrics.avgObservationCount.toFixed(1)}

  Decisions:
    Total: ${metrics.totalDecisions}
    Today: ${metrics.decisionsToday}
    By Algorithm:
      - Hybrid: ${metrics.algorithmsUsed.hybrid}
      - LinUCB: ${metrics.algorithmsUsed.linucb}
      - IRT: ${metrics.algorithmsUsed.irt}

  Performance:
    Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%

  Quality:
    Estimated Regret: ${metrics.estimatedCumulativeRegret.toFixed(2)}
  `.trim();
}
