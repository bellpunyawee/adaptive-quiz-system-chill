/**
 * Context Assembler for Quiz Feedback
 *
 * Aggregates quiz performance data, learner profile, and ability history
 * to create rich context for LLM-based feedback generation.
 */

import { PrismaClient } from '@prisma/client';
import { interpretAbility } from './gemini-client';

const prisma = new PrismaClient();

// ============================================================================
// Enhanced Error Analysis Types
// ============================================================================

export interface ConceptError {
  questionId: string;
  topicName: string;
  topicId: string;
  bloomLevel: string | null;
  difficulty_b: number;
  responseTime: number | null;
  errorType: 'incorrect' | 'skipped' | 'slow_correct';
}

export interface ErrorCluster {
  conceptArea: string;
  topicId: string;
  errorCount: number;
  errorRate: number; // 0-1
  totalQuestions: number;
  avgDifficulty: number;
  bloomDistribution: Record<string, number>;
}

export interface BloomAnalysis {
  levelBreakdown: Array<{
    level: string;
    attempted: number;
    correct: number;
    accuracy: number;
  }>;
  weakestLevel: string | null;
  strongestLevel: string | null;
}

export interface ResponseTimeInsights {
  avgCorrectTime: number;
  avgIncorrectTime: number;
  slowThreshold: number; // 90th percentile
}

export interface ErrorAnalysis {
  conceptErrors: ConceptError[];
  errorClusters: ErrorCluster[];
  responseTimeInsights: ResponseTimeInsights;
}

export interface MasteryGaugeData {
  topicName: string;
  topicId: string;
  masteryPercentage: number; // 0-100
  abilityTheta: number;
  status: 'beginner' | 'developing' | 'proficient' | 'mastered';
  questionsAnswered: number;
  accuracy: number;
}

export interface EnhancedQuizContext extends QuizContext {
  errorAnalysis: ErrorAnalysis;
  bloomAnalysis: BloomAnalysis;
  masteryGauges: MasteryGaugeData[];
}

// ============================================================================
// Original QuizContext Types
// ============================================================================

export interface QuizContext {
  quiz: {
    id: string;
    correctCount: number;
    totalQuestions: number;
    accuracy: number;
    topics: string[];
    duration: number; // in minutes
    quizType: string;
    completedAt: Date | null;
  };
  userMastery: {
    ability_theta: number;
    confidence: number | null;
    responseCount: number;
    masteryStatus: number;
  };
  abilityHistory: {
    growthFromBaseline: number;
    recentQuizCount: number;
    avgAccuracy: number;
    strongestTopic: string;
    weakestTopic: string;
    trendDirection: 'improving' | 'stable' | 'declining';
  };
  topicPerformance: Array<{
    topicName: string;
    topicId: string;
    accuracy: number;
    abilityTheta: number;
    masteryStatus: string;
    questionsAnswered: number;
  }>;
  difficultQuestions: Array<{
    questionId: string;
    topicName: string;
    difficulty_b: number;
    discrimination_a: number;
    isCorrect: boolean;
  }>;
}

/**
 * Assemble comprehensive context for quiz feedback generation
 */
export async function assembleQuizContext(
  quizId: string,
  userId: string
): Promise<QuizContext> {
  // 1. Get quiz details with all answers
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      userAnswers: {
        include: {
          question: {
            include: {
              cell: true,
            },
          },
        },
      },
    },
  });

  if (!quiz) {
    throw new Error(`Quiz ${quizId} not found`);
  }

  // 2. Calculate quiz metrics
  const totalQuestions = quiz.userAnswers.length;
  const correctCount = quiz.userAnswers.filter((a) => a.isCorrect).length;
  const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;

  const uniqueTopics = [
    ...new Set(quiz.userAnswers.map((a) => a.question.cell.name)),
  ];

  const duration = quiz.completedAt && quiz.startedAt
    ? Math.round((quiz.completedAt.getTime() - quiz.startedAt.getTime()) / 60000)
    : 0;

  // 3. Get user's overall mastery across all topics
  const userCellMasteries = await prisma.userCellMastery.findMany({
    where: { userId },
    include: { cell: true },
  });

  // Calculate average ability and confidence
  const avgAbility =
    userCellMasteries.reduce((sum, m) => sum + m.ability_theta, 0) /
    (userCellMasteries.length || 1);
  const avgConfidence =
    userCellMasteries.reduce((sum, m) => sum + (m.confidence || 0), 0) /
    (userCellMasteries.length || 1);
  const totalResponses = userCellMasteries.reduce(
    (sum, m) => sum + m.responseCount,
    0
  );
  const masteryCount = userCellMasteries.filter((m) => m.mastery_status === 1).length;

  // 4. Get ability history for trend analysis
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const abilityHistoryRecords = await prisma.abilityHistory.findMany({
    where: {
      userId,
      updatedAt: { gte: thirtyDaysAgo },
    },
    include: { cell: true },
    orderBy: { updatedAt: 'asc' },
  });

  // Get baseline ability (first record or user's first quiz)
  const baselineAbility = abilityHistoryRecords[0]?.ability_theta || 0;
  const currentAbility = avgAbility;
  const growthFromBaseline = currentAbility - baselineAbility;

  // Calculate recent quiz performance
  const recentQuizzes = await prisma.quiz.findMany({
    where: {
      userId,
      status: 'completed',
      completedAt: { gte: thirtyDaysAgo },
    },
    include: {
      userAnswers: true,
    },
  });

  const recentQuizCount = recentQuizzes.length;
  const avgAccuracy =
    recentQuizzes.reduce((sum, q) => {
      const total = q.userAnswers.length;
      const correct = q.userAnswers.filter((a) => a.isCorrect).length;
      return sum + (total > 0 ? correct / total : 0);
    }, 0) / (recentQuizCount || 1);

  // Determine trend direction
  let trendDirection: 'improving' | 'stable' | 'declining' = 'stable';
  if (abilityHistoryRecords.length >= 3) {
    const recentRecords = abilityHistoryRecords.slice(-5);
    const earlyAvg =
      recentRecords.slice(0, 2).reduce((sum, r) => sum + r.ability_theta, 0) / 2;
    const lateAvg =
      recentRecords.slice(-2).reduce((sum, r) => sum + r.ability_theta, 0) / 2;

    if (lateAvg - earlyAvg > 0.3) trendDirection = 'improving';
    else if (lateAvg - earlyAvg < -0.3) trendDirection = 'declining';
  }

  // 5. Get topic-specific performance
  const topicPerformance = userCellMasteries.map((mastery) => {
    const topicAnswers = quiz.userAnswers.filter(
      (a) => a.question.cellId === mastery.cellId
    );
    const topicCorrect = topicAnswers.filter((a) => a.isCorrect).length;
    const topicAccuracy =
      topicAnswers.length > 0 ? topicCorrect / topicAnswers.length : 0;

    return {
      topicName: mastery.cell.name,
      topicId: mastery.cellId,
      accuracy: topicAccuracy,
      abilityTheta: mastery.ability_theta,
      masteryStatus:
        mastery.mastery_status === 1 ? 'Mastered' : 'In Progress',
      questionsAnswered: topicAnswers.length,
    };
  }).filter((t) => t.questionsAnswered > 0); // Only include topics from this quiz

  // Find strongest and weakest topics
  const strongestTopic =
    topicPerformance.sort((a, b) => b.abilityTheta - a.abilityTheta)[0]
      ?.topicName || 'N/A';
  const weakestTopic =
    topicPerformance.sort((a, b) => a.abilityTheta - b.abilityTheta)[0]
      ?.topicName || 'N/A';

  // 6. Get difficult questions (incorrect answers or low discrimination)
  const difficultQuestions = quiz.userAnswers
    .filter((a) => !a.isCorrect)
    .map((a) => ({
      questionId: a.questionId,
      topicName: a.question.cell.name,
      difficulty_b: a.question.difficulty_b,
      discrimination_a: a.question.discrimination_a,
      isCorrect: a.isCorrect,
    }));

  // 7. Assemble final context
  return {
    quiz: {
      id: quiz.id,
      correctCount,
      totalQuestions,
      accuracy,
      topics: uniqueTopics,
      duration,
      quizType: quiz.quizType,
      completedAt: quiz.completedAt,
    },
    userMastery: {
      ability_theta: avgAbility,
      confidence: avgConfidence,
      responseCount: totalResponses,
      masteryStatus: masteryCount,
    },
    abilityHistory: {
      growthFromBaseline,
      recentQuizCount,
      avgAccuracy,
      strongestTopic,
      weakestTopic,
      trendDirection,
    },
    topicPerformance,
    difficultQuestions,
  };
}

/**
 * Build feedback prompt from quiz context
 */
export function buildFeedbackPrompt(context: QuizContext): string {
  const { quiz, userMastery, abilityHistory, topicPerformance, difficultQuestions } =
    context;

  return `You are an expert educational psychometrician providing personalized feedback for adaptive quiz assessments based on Item Response Theory (IRT) models.

Your feedback must be:
1. CONCISE: 150-250 words maximum (adult learners are time-conscious)
2. ACTIONABLE: Provide specific, implementable next steps
3. EVIDENCE-BASED: Reference their psychometric data explicitly
4. GROWTH-ORIENTED: Focus on learning trajectory, not just scores
5. RESPECTFUL: Professional tone for university-level students

Structure your feedback in this format:

**Performance Summary** (2-3 sentences)
- Overall assessment of quiz performance
- Contextualize with their learning trajectory

**Key Strengths** (1-2 bullet points)
- What they demonstrated mastery in
- Specific topics or skills

**Growth Opportunities** (1-2 bullet points)
- Areas needing attention
- Specific misconceptions or gaps

**Recommended Next Steps** (2-3 actionable items)
- Concrete practice activities
- Focus topics for review
- Study strategies

IMPORTANT:
- NEVER mention raw IRT theta (θ) scores
- Use interpretations: "strong understanding" (θ>1), "developing proficiency" (0<θ<1), "building foundations" (θ<0)
- Avoid educational jargon; use plain, adult-appropriate language
- Be encouraging but honest about areas needing work
- Focus on growth mindset and continuous improvement

---

Generate personalized feedback for this quiz performance:

## Quiz Summary
- Score: ${quiz.correctCount}/${quiz.totalQuestions} (${(quiz.accuracy * 100).toFixed(1)}%)
- Topics Covered: ${quiz.topics.join(', ')}
- Time Spent: ${quiz.duration} minutes
- Quiz Type: ${quiz.quizType === 'baseline' ? 'Baseline Assessment' : 'Regular Quiz'}

## Learner Profile
- Current Ability Level: ${interpretAbility(userMastery.ability_theta)} (θ=${userMastery.ability_theta.toFixed(2)})
- Confidence in Estimates: ${((userMastery.confidence || 0) * 100).toFixed(0)}%
- Growth Since Baseline: ${abilityHistory.growthFromBaseline > 0 ? '+' : ''}${abilityHistory.growthFromBaseline.toFixed(2)} points
- Total Responses: ${userMastery.responseCount}
- Topics Mastered: ${userMastery.masteryStatus}

## Topic-Specific Breakdown
${topicPerformance
  .map(
    (t) =>
      `- ${t.topicName}: ${(t.accuracy * 100).toFixed(0)}% correct (${t.questionsAnswered} questions), Mastery: ${t.masteryStatus}, Ability: ${interpretAbility(t.abilityTheta)}`
  )
  .join('\n')}

## Recent Learning Trajectory (Past 30 Days)
- Quizzes Completed: ${abilityHistory.recentQuizCount}
- Average Accuracy: ${(abilityHistory.avgAccuracy * 100).toFixed(0)}%
- Strongest Topic: ${abilityHistory.strongestTopic}
- Topic Needing Most Attention: ${abilityHistory.weakestTopic}
- Improvement Trend: ${abilityHistory.trendDirection}

## Challenging Questions
${difficultQuestions.length > 0 ? difficultQuestions.map((q) => `- ${q.topicName} (difficulty: ${q.difficulty_b.toFixed(2)}, discrimination: ${q.discrimination_a.toFixed(2)})`).join('\n') : 'No incorrect answers - excellent work!'}

Generate the personalized feedback now, following the structured format provided in your system instructions.
`;
}

// ============================================================================
// Enhanced Error Analysis Functions
// ============================================================================

/**
 * Type for user answers with question and cell data
 */
type UserAnswerWithQuestion = {
  id: string;
  questionId: string;
  isCorrect: boolean;
  responseTime: number | null;
  selectedOptionId: string | null;
  question: {
    id: string;
    text: string;
    difficulty_b: number;
    discrimination_a: number;
    bloomTaxonomy: string | null;
    cellId: string;
    cell: {
      id: string;
      name: string;
    };
  };
};

/**
 * Calculate the 90th percentile of response times for slow answer detection
 */
function calculateSlowThreshold(responseTimes: number[]): number {
  if (responseTimes.length === 0) return 60000; // Default 60 seconds
  const sorted = [...responseTimes].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.9);
  return sorted[Math.min(index, sorted.length - 1)];
}

/**
 * Convert ability theta to mastery status label
 */
export function getMasteryStatus(
  abilityTheta: number
): 'beginner' | 'developing' | 'proficient' | 'mastered' {
  if (abilityTheta >= 1.5) return 'mastered';
  if (abilityTheta >= 0.5) return 'proficient';
  if (abilityTheta >= -0.5) return 'developing';
  return 'beginner';
}

/**
 * Convert ability theta to mastery percentage (0-100)
 * Maps theta range [-3, 3] to [0, 100]
 */
export function thetaToMasteryPercentage(abilityTheta: number): number {
  // Clamp theta to [-3, 3] range
  const clampedTheta = Math.max(-3, Math.min(3, abilityTheta));
  // Map to 0-100 percentage
  return Math.round(((clampedTheta + 3) / 6) * 100);
}

/**
 * Analyze errors from user answers to identify patterns and clusters
 */
export function analyzeErrors(
  userAnswers: UserAnswerWithQuestion[],
  slowThreshold?: number
): ErrorAnalysis {
  // Calculate slow threshold if not provided
  const responseTimes = userAnswers
    .filter((a) => a.responseTime !== null)
    .map((a) => a.responseTime as number);
  const threshold = slowThreshold ?? calculateSlowThreshold(responseTimes);

  // Build concept errors list
  const conceptErrors: ConceptError[] = [];

  for (const answer of userAnswers) {
    let errorType: 'incorrect' | 'skipped' | 'slow_correct' | null = null;

    if (answer.selectedOptionId === null) {
      errorType = 'skipped';
    } else if (!answer.isCorrect) {
      errorType = 'incorrect';
    } else if (answer.responseTime && answer.responseTime > threshold) {
      errorType = 'slow_correct';
    }

    if (errorType) {
      conceptErrors.push({
        questionId: answer.questionId,
        topicName: answer.question.cell.name,
        topicId: answer.question.cellId,
        bloomLevel: answer.question.bloomTaxonomy,
        difficulty_b: answer.question.difficulty_b,
        responseTime: answer.responseTime,
        errorType,
      });
    }
  }

  // Build error clusters by topic
  const topicMap = new Map<
    string,
    {
      topicId: string;
      topicName: string;
      errors: number;
      total: number;
      difficulties: number[];
      bloomCounts: Record<string, number>;
    }
  >();

  for (const answer of userAnswers) {
    const topicId = answer.question.cellId;
    const existing = topicMap.get(topicId) || {
      topicId,
      topicName: answer.question.cell.name,
      errors: 0,
      total: 0,
      difficulties: [],
      bloomCounts: {},
    };

    existing.total++;
    if (!answer.isCorrect || answer.selectedOptionId === null) {
      existing.errors++;
      existing.difficulties.push(answer.question.difficulty_b);

      const bloom = answer.question.bloomTaxonomy || 'Unknown';
      existing.bloomCounts[bloom] = (existing.bloomCounts[bloom] || 0) + 1;
    }

    topicMap.set(topicId, existing);
  }

  const errorClusters: ErrorCluster[] = Array.from(topicMap.values())
    .filter((t) => t.errors > 0)
    .map((t) => ({
      conceptArea: t.topicName,
      topicId: t.topicId,
      errorCount: t.errors,
      errorRate: t.total > 0 ? t.errors / t.total : 0,
      totalQuestions: t.total,
      avgDifficulty:
        t.difficulties.length > 0
          ? t.difficulties.reduce((a, b) => a + b, 0) / t.difficulties.length
          : 0,
      bloomDistribution: t.bloomCounts,
    }))
    .sort((a, b) => b.errorRate - a.errorRate);

  // Calculate response time insights
  const correctTimes = userAnswers
    .filter((a) => a.isCorrect && a.responseTime !== null)
    .map((a) => a.responseTime as number);
  const incorrectTimes = userAnswers
    .filter((a) => !a.isCorrect && a.responseTime !== null)
    .map((a) => a.responseTime as number);

  const responseTimeInsights: ResponseTimeInsights = {
    avgCorrectTime:
      correctTimes.length > 0
        ? correctTimes.reduce((a, b) => a + b, 0) / correctTimes.length
        : 0,
    avgIncorrectTime:
      incorrectTimes.length > 0
        ? incorrectTimes.reduce((a, b) => a + b, 0) / incorrectTimes.length
        : 0,
    slowThreshold: threshold,
  };

  return {
    conceptErrors,
    errorClusters,
    responseTimeInsights,
  };
}

/**
 * Analyze performance by Bloom's Taxonomy levels
 */
export function analyzeBloomPerformance(
  userAnswers: UserAnswerWithQuestion[]
): BloomAnalysis {
  const bloomMap = new Map<
    string,
    { attempted: number; correct: number }
  >();

  // Bloom's Taxonomy levels in order
  const bloomLevels = [
    'Remember',
    'Understand',
    'Apply',
    'Analyze',
    'Evaluate',
    'Create',
  ];

  // Initialize all levels
  for (const level of bloomLevels) {
    bloomMap.set(level, { attempted: 0, correct: 0 });
  }

  // Aggregate data
  for (const answer of userAnswers) {
    const bloom = answer.question.bloomTaxonomy || 'Unknown';
    const existing = bloomMap.get(bloom) || { attempted: 0, correct: 0 };
    existing.attempted++;
    if (answer.isCorrect) {
      existing.correct++;
    }
    bloomMap.set(bloom, existing);
  }

  // Build breakdown array
  const levelBreakdown = Array.from(bloomMap.entries())
    .filter(([, data]) => data.attempted > 0)
    .map(([level, data]) => ({
      level,
      attempted: data.attempted,
      correct: data.correct,
      accuracy: data.attempted > 0 ? data.correct / data.attempted : 0,
    }));

  // Find weakest and strongest levels
  const sortedByAccuracy = [...levelBreakdown]
    .filter((l) => l.attempted >= 1)
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakestLevel = sortedByAccuracy[0]?.level || null;
  const strongestLevel =
    sortedByAccuracy[sortedByAccuracy.length - 1]?.level || null;

  return {
    levelBreakdown,
    weakestLevel,
    strongestLevel,
  };
}

/**
 * Assemble enhanced quiz context with error analysis and mastery gauges
 */
export async function assembleEnhancedQuizContext(
  quizId: string,
  userId: string
): Promise<EnhancedQuizContext> {
  // Get base context
  const baseContext = await assembleQuizContext(quizId, userId);

  // Get quiz with full answer details for error analysis
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      userAnswers: {
        include: {
          question: {
            include: {
              cell: true,
            },
          },
        },
      },
    },
  });

  if (!quiz) {
    throw new Error(`Quiz ${quizId} not found`);
  }

  // Cast user answers to the expected type
  const userAnswers = quiz.userAnswers as unknown as UserAnswerWithQuestion[];

  // Perform error analysis
  const errorAnalysis = analyzeErrors(userAnswers);

  // Perform Bloom's Taxonomy analysis
  const bloomAnalysis = analyzeBloomPerformance(userAnswers);

  // Get user cell masteries for mastery gauges
  const userCellMasteries = await prisma.userCellMastery.findMany({
    where: { userId },
    include: { cell: true },
  });

  // Build mastery gauges for topics in this quiz
  const quizTopicIds = new Set(
    quiz.userAnswers.map((a) => a.question.cellId)
  );

  const masteryGauges: MasteryGaugeData[] = userCellMasteries
    .filter((m) => quizTopicIds.has(m.cellId))
    .map((m) => {
      // Calculate quiz-specific accuracy for this topic
      const topicAnswers = quiz.userAnswers.filter(
        (a) => a.question.cellId === m.cellId
      );
      const topicCorrect = topicAnswers.filter((a) => a.isCorrect).length;
      const topicAccuracy =
        topicAnswers.length > 0 ? topicCorrect / topicAnswers.length : 0;

      return {
        topicName: m.cell.name,
        topicId: m.cellId,
        masteryPercentage: thetaToMasteryPercentage(m.ability_theta),
        abilityTheta: m.ability_theta,
        status: getMasteryStatus(m.ability_theta),
        questionsAnswered: topicAnswers.length,
        accuracy: topicAccuracy,
      };
    })
    .sort((a, b) => b.masteryPercentage - a.masteryPercentage);

  return {
    ...baseContext,
    errorAnalysis,
    bloomAnalysis,
    masteryGauges,
  };
}

/**
 * Build enhanced feedback prompt with error analysis
 */
export function buildEnhancedFeedbackPrompt(context: EnhancedQuizContext): string {
  const basePrompt = buildFeedbackPrompt(context);

  // Add error pattern analysis section
  const errorPatternSection = context.errorAnalysis.errorClusters.length > 0
    ? `\n## Error Pattern Analysis
${context.errorAnalysis.errorClusters
  .slice(0, 5)
  .map(
    (c) =>
      `- ${c.conceptArea}: ${(c.errorRate * 100).toFixed(0)}% error rate (${c.errorCount}/${c.totalQuestions} questions)`
  )
  .join('\n')}`
    : '';

  // Add Bloom's Taxonomy section
  const bloomSection = context.bloomAnalysis.levelBreakdown.length > 0
    ? `\n## Bloom's Taxonomy Performance
${context.bloomAnalysis.levelBreakdown
  .map(
    (l) =>
      `- ${l.level}: ${(l.accuracy * 100).toFixed(0)}% (${l.correct}/${l.attempted})`
  )
  .join('\n')}
- Strongest cognitive level: ${context.bloomAnalysis.strongestLevel || 'N/A'}
- Area for growth: ${context.bloomAnalysis.weakestLevel || 'N/A'}`
    : '';

  // Add response time insights
  const timeSection = `\n## Response Time Insights
- Average time on correct answers: ${(context.errorAnalysis.responseTimeInsights.avgCorrectTime / 1000).toFixed(1)}s
- Average time on incorrect answers: ${(context.errorAnalysis.responseTimeInsights.avgIncorrectTime / 1000).toFixed(1)}s`;

  // Insert additional sections before the final instruction
  const insertPoint = basePrompt.lastIndexOf('Generate the personalized feedback now');

  return (
    basePrompt.slice(0, insertPoint) +
    errorPatternSection +
    bloomSection +
    timeSection +
    '\n\n' +
    basePrompt.slice(insertPoint)
  );
}

/**
 * Anonymize context by removing personally identifiable information
 * For PDPA compliance
 */
export function anonymizeContext(context: QuizContext): QuizContext {
  // Remove or hash any PII fields
  // Currently, the context doesn't contain names or emails
  // This is a placeholder for future enhancements
  return {
    ...context,
    // Add anonymization logic here if needed
  };
}
