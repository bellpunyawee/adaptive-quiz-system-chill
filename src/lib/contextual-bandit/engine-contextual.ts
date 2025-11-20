/**
 * Contextual Bandit Selection Engine
 *
 * Integrates with existing adaptive engine to provide context-aware question selection
 * using LinUCB algorithm combined with IRT-based UCB (hybrid mode).
 */

import prisma from "@/lib/db";
import { getModelManager } from './model-manager';
import { buildContext, serializeContext } from './features/context-builder';
import { calculateRecentAccuracy } from './features/user-features';
import { calculateHybridScore } from './hybrid';
import { calculateReward } from './reward-calculator';
import { getConfig, shouldUseContextualBandit, getAlgorithmMode } from './config';
import type { QuestionWithAnswerOptions } from '../adaptive-engine/engine-enhanced';

interface UserStateForContext {
  theta: number;
  sem: number;
  confidence: number;
  responseCount: number;
  recentAccuracy: number;
  questionsInSession: number;
}

interface QuestionCandidate {
  id: string;
  cellId: string;
  difficulty_b: number;
  discrimination_a: number;
  guessing_c: number;
  exposureCount: number;
  maxExposure: number;
  correctRate: number;
}

/**
 * Select next question using contextual bandit
 *
 * @param userId - User identifier
 * @param quizId - Quiz identifier
 * @param availableQuestions - Pool of available questions
 * @param userState - Current user state (ability, uncertainty, etc.)
 * @param totalSelections - Total selections in this quiz
 * @returns Selected question or null
 */
export async function selectQuestionContextual(
  userId: string,
  quizId: string,
  availableQuestions: QuestionWithAnswerOptions[],
  userState: {
    theta: number;
    sem: number;
    confidence: number;
    responseCount: number;
  },
  totalSelections: number
): Promise<QuestionWithAnswerOptions | null> {
  const config = getConfig();

  console.log(`[Contextual Bandit] Selecting question for user ${userId}`);
  console.log(`[Contextual Bandit] Available questions: ${availableQuestions.length}`);
  console.log(`[Contextual Bandit] User state: θ=${userState.theta.toFixed(2)}, SEM=${userState.sem.toFixed(2)}`);

  if (availableQuestions.length === 0) {
    console.warn('[Contextual Bandit] No available questions');
    return null;
  }

  // Step 1: Get recent accuracy for user
  const recentResponses = await prisma.userAnswer.findMany({
    where: { userId, quizId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { isCorrect: true },
  });

  const recentAccuracy = calculateRecentAccuracy(recentResponses);

  // Step 2: Build user state for context
  const userStateForContext: UserStateForContext = {
    ...userState,
    recentAccuracy,
    questionsInSession: totalSelections,
  };

  // Step 3: Get model manager
  const modelManager = getModelManager();

  // Step 4: Preload models for all available questions (optimization)
  if (config.enablePreloading) {
    const questionIds = availableQuestions.map(q => q.id);
    await modelManager.preloadModels(questionIds);
  }

  // Step 5: Calculate scores for all questions
  const scores: Array<{
    question: QuestionWithAnswerOptions;
    finalScore: number;
    linucbScore: number;
    irtScore: number;
    context: number[];
  }> = [];

  for (const question of availableQuestions) {
    try {
      // Get user's topic mastery for this cell
      const userCellMastery = await prisma.userCellMastery.findUnique({
        where: {
          userId_cellId: {
            userId,
            cellId: question.cellId,
          },
        },
      });

      const topicMastery = userCellMastery?.confidence ?? 0.5; // Default neutral

      // Build context vector
      const contextVector = buildContext(
        userStateForContext,
        {
          id: question.id,
          cellId: question.cellId,
          difficulty_b: question.difficulty_b,
          discrimination_a: question.discrimination_a,
          guessing_c: question.guessing_c,
          exposureCount: question.exposureCount,
          maxExposure: question.maxExposure,
          correctRate: question.correctRate ?? 0.5,
        },
        userId,
        topicMastery
      );

      // Get LinUCB model
      const model = await modelManager.getModel(question.id);

      // Calculate hybrid score (LinUCB + IRT)
      const hybridScore = calculateHybridScore(
        model,
        contextVector.features,
        userState.theta,
        question.difficulty_b,
        question.discrimination_a,
        question.exposureCount,
        totalSelections,
        {
          linucbAlpha: config.explorationAlpha,
          irtExplorationC: 1.0,
          useAdaptiveWeights: config.useAdaptiveWeights,
        }
      );

      scores.push({
        question,
        finalScore: hybridScore.finalScore,
        linucbScore: hybridScore.linucbScore,
        irtScore: hybridScore.irtScore,
        context: contextVector.features,
      });

      if (config.logVerbose) {
        console.log(`[Contextual Bandit] Q${question.id.slice(0, 8)}: score=${hybridScore.finalScore.toFixed(4)}, LinUCB=${hybridScore.linucbScore.toFixed(4)}, IRT=${hybridScore.irtScore.toFixed(4)}`);
      }
    } catch (error) {
      console.error(`[Contextual Bandit] Error scoring question ${question.id}:`, error);
      // Skip this question
    }
  }

  if (scores.length === 0) {
    console.error('[Contextual Bandit] No questions could be scored');
    return null;
  }

  // Step 6: Sort by final score (descending)
  scores.sort((a, b) => b.finalScore - a.finalScore);

  // Step 7: Select best question
  const selected = scores[0];

  // Step 8: Log decision (if enabled)
  if (config.enableDecisionLogging) {
    try {
      await prisma.decisionSnapshot.create({
        data: {
          userId,
          questionId: selected.question.id,
          quizId,
          context: Buffer.from(new Float64Array(selected.context).buffer),
          ucbScore: selected.finalScore,
          muScore: selected.linucbScore, // Approximate
          sigmaScore: 0, // Would need to extract from model
          thetaAtTime: userState.theta,
          algorithm: 'hybrid',
        },
      });
    } catch (error) {
      console.error('[Contextual Bandit] Failed to log decision:', error);
      // Don't fail selection if logging fails
    }
  }

  console.log(`[Contextual Bandit] Selected question: ${selected.question.id} (score: ${selected.finalScore.toFixed(4)})`);

  return selected.question;
}

/**
 * Process user answer and update contextual bandit model
 *
 * @param userId - User identifier
 * @param quizId - Quiz identifier
 * @param questionId - Question that was answered
 * @param isCorrect - Whether answer was correct
 * @param userStateBeforeAnswer - User state when question was shown
 * @param userStateAfterAnswer - User state after answer processed
 * @param responseTime - Time taken to answer (seconds)
 */
export async function processAnswerContextual(
  userId: string,
  quizId: string,
  questionId: string,
  isCorrect: boolean,
  userStateBeforeAnswer: {
    theta: number;
    sem: number;
  },
  userStateAfterAnswer: {
    theta: number;
    sem: number;
  },
  responseTime: number
): Promise<void> {
  const config = getConfig();

  console.log(`[Contextual Bandit] Processing answer for question ${questionId}`);

  try {
    // Step 1: Calculate reward
    const rewardComponents = calculateReward(
      isCorrect,
      userStateBeforeAnswer.sem,
      userStateAfterAnswer.sem,
      responseTime,
      {
        weightCorrectness: config.rewardWeightCorrectness,
        weightInfoGain: config.rewardWeightInfoGain,
        weightSpeed: config.rewardWeightSpeed,
        useMultiObjective: config.useMultiObjectiveReward,
      }
    );

    if (config.logVerbose) {
      console.log(`[Contextual Bandit] Reward components:`, rewardComponents);
    }

    // Step 2: Retrieve decision context
    const decision = await prisma.decisionSnapshot.findFirst({
      where: {
        userId,
        quizId,
        questionId,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    if (!decision) {
      console.warn(`[Contextual Bandit] No decision snapshot found for question ${questionId}`);
      return;
    }

    // Step 3: Deserialize context
    const contextBuffer = decision.context;
    const contextArray = new Float64Array(
      contextBuffer.buffer,
      contextBuffer.byteOffset,
      contextBuffer.byteLength / 8
    );
    const context = Array.from(contextArray);

    // Step 4: Update LinUCB model
    const modelManager = getModelManager();
    const model = await modelManager.getModel(questionId);

    model.update(context, rewardComponents.totalReward);

    // Step 5: Save updated model
    await modelManager.saveModel(questionId, model);

    console.log(`[Contextual Bandit] Model updated for question ${questionId}, reward=${rewardComponents.totalReward.toFixed(3)}`);
  } catch (error) {
    console.error(`[Contextual Bandit] Failed to process answer:`, error);
    // Don't throw - this shouldn't break the quiz flow
  }
}

/**
 * Check if contextual bandit should be used for this user/quiz
 *
 * @param userId - User identifier
 * @returns true if contextual bandit should be used
 */
export function shouldUseContextualBanditForUser(userId: string): boolean {
  return shouldUseContextualBandit(userId);
}

/**
 * Get algorithm mode for user
 */
export function getAlgorithmModeForUser(userId: string) {
  return getAlgorithmMode(userId);
}
