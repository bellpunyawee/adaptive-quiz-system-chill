/**
 * Context Assembler for Quiz Feedback
 *
 * Aggregates quiz performance data, learner profile, and ability history
 * to create rich context for LLM-based feedback generation.
 */

import { PrismaClient } from '@prisma/client';
import { interpretAbility } from './gemini-client';

const prisma = new PrismaClient();

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
