// src/lib/adaptive-engine/engine.ts (Final Integrated Version)
import prisma from "@/lib/db";
import { calculateUCB } from "./ucb";
import { recalibrateUserParameters } from "./irt-estimator";
import { engineCache } from "./cache";
import { applyContentBalancing, getCellSelectionStats } from "./content-balancer";
import { shouldStopQuiz, getQuizProgress } from "./stopping-criteria";
import { engineMonitor, PerformanceTimer } from "./monitoring";
import { Prisma } from "@prisma/client";

const questionWithAnswerOptions = Prisma.validator<Prisma.QuestionDefaultArgs>()({
  include: { answerOptions: true },
});

export type QuestionWithAnswerOptions = Prisma.QuestionGetPayload<typeof questionWithAnswerOptions>;

// Type for user mastery with cell included
type UserMasteryWithCell = Prisma.UserCellMasteryGetPayload<{
  include: { cell: true };
}>;

/**
 * Enhanced IRT recalibration with monitoring
 */
async function estimateAndUpdateIRTParameters(userId: string) {
  const timer = new PerformanceTimer();
  
  try {
    await recalibrateUserParameters(userId);
    console.log(`[ENGINE] IRT recalibration completed in ${timer.elapsed()}ms`);
  } catch (error) {
    console.error(`[ENGINE] Failed to recalibrate IRT parameters:`, error);
    // Don't throw - we don't want to break the quiz flow
  }
}

/**
 * Fully integrated adaptive question selection
 */
export async function selectNextQuestionForUser(
  userId: string,
  quizId: string
): Promise<QuestionWithAnswerOptions | null> {
  const timer = new PerformanceTimer();
  console.log(`[ENGINE] ====== Starting Question Selection ======`);
  console.log(`[ENGINE] User: ${userId}, Quiz: ${quizId}`);

  try {
    // STEP 0: Check stopping criteria
    const stoppingCheck = await shouldStopQuiz(userId, quizId);
    
    if (stoppingCheck.shouldStop) {
      console.log(`[ENGINE] Quiz should stop: ${stoppingCheck.reason}`);
      console.log(`[ENGINE] Details:`, stoppingCheck.details);
      
      // Track quiz completion
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { startedAt: true }
      });
      
      if (quiz) {
        const totalTime = Date.now() - quiz.startedAt.getTime();
        await engineMonitor.trackQuizCompletion(
          userId,
          quizId,
          stoppingCheck.details.questionCount,
          totalTime,
          {
            cellsMastered: stoppingCheck.details.cellsCompleted,
            totalCells: stoppingCheck.details.totalCells,
            overallAccuracy: 0, // Calculate from answers
            averageSEM: stoppingCheck.details.averageSEM
          }
        );
      }
      
      return null;
    }

    // STEP 1: Get or cache user mastery data
    const cacheKey = engineCache.getUserMasteryKey(userId);
    let userMasteryData = engineCache.get(cacheKey);

    if (!userMasteryData) {
      userMasteryData = await prisma.userCellMastery.findMany({
        where: { userId, mastery_status: 0 },
        include: { cell: true },
      });
      engineCache.set(cacheKey, userMasteryData, 2 * 60 * 1000); // Cache for 2 min
    }

    if (userMasteryData.length === 0) {
      console.log(`[ENGINE] User has mastered all available cells.`);
      return null;
    }

    // STEP 2: Get content balance stats
    const { cellSelections, totalSelections } = await getCellSelectionStats(userId, quizId);

    // STEP 3: Select best cell with content balancing
    const totalCellSelections = userMasteryData.reduce(
      (sum: number, m: UserMasteryWithCell) => sum + m.selection_count, 
      1
    );
    let bestCell = null;
    let maxScore = -Infinity;
    let selectedUCB = 0;

    console.log(`[ENGINE] --- Cell Selection Phase ---`);
    for (const mastery of userMasteryData) {
      const rawUCB = calculateUCB(
        mastery.ability_theta,
        mastery.cell.difficulty_b,
        mastery.cell.discrimination_a,
        mastery.selection_count,
        totalCellSelections
      );

      // Apply content balancing
      const balancedScore = applyContentBalancing(
        rawUCB,
        mastery.cellId,
        cellSelections,
        totalSelections
      );

      console.log(
        `[ENGINE]   ${mastery.cell.name.padEnd(25)} | ` +
        `θ=${mastery.ability_theta.toFixed(2).padStart(5)} | ` +
        `UCB=${rawUCB.toFixed(3).padStart(8)} | ` +
        `Balanced=${balancedScore.toFixed(3).padStart(8)} | ` +
        `Selections=${mastery.selection_count}`
      );

      if (balancedScore > maxScore) {
        maxScore = balancedScore;
        selectedUCB = rawUCB;
        bestCell = mastery.cell;
      }
    }

    if (!bestCell) {
      throw new Error('Could not select a best cell');
    }

    console.log(`[ENGINE] ✓ Selected: ${bestCell.name} (Score: ${maxScore.toFixed(3)})`);

    // STEP 4: Get available questions (with caching)
    const questionCacheKey = engineCache.getQuestionPoolKey(bestCell.id);
    let allQuestions = engineCache.get<QuestionWithAnswerOptions[]>(questionCacheKey);

    if (!allQuestions) {
      allQuestions = await prisma.question.findMany({
        where: { cellId: bestCell.id },
        include: { answerOptions: true },
      });
      engineCache.set(questionCacheKey, allQuestions, 10 * 60 * 1000); // Cache for 10 min
    }

    // Get answered questions
    const answerCacheKey = engineCache.getAnswerHistoryKey(userId, quizId);
    let answeredQuestionIds = engineCache.get<string[]>(answerCacheKey);

    if (!answeredQuestionIds) {
      answeredQuestionIds = (
        await prisma.userAnswer.findMany({
          where: { userId, quizId },
          select: { questionId: true },
        })
      ).map(a => a.questionId);
      engineCache.set(answerCacheKey, answeredQuestionIds, 1 * 60 * 1000); // Cache for 1 min
    }

    const unansweredQuestions = allQuestions.filter(
      q => !answeredQuestionIds.includes(q.id)
    );

    if (unansweredQuestions.length === 0) {
      console.log(`[ENGINE] Cell ${bestCell.name} exhausted, marking complete`);
      await prisma.userCellMastery.update({
        where: { userId_cellId: { userId, cellId: bestCell.id } },
        data: { mastery_status: 1 },
      });
      engineCache.invalidateUserCache(userId);
      return selectNextQuestionForUser(userId, quizId);
    }

    // STEP 5: Select best question
    const currentCellMastery = userMasteryData.find((m: UserMasteryWithCell) => m.cellId === bestCell.id);
    if (!currentCellMastery) {
      throw new Error('Could not find mastery data for selected cell');
    }

    const userAnswersInCell = await prisma.userAnswer.findMany({
      where: { userId, question: { cellId: bestCell.id } },
      select: { questionId: true }
    });

    const questionSelectionCounts = new Map<string, number>();
    userAnswersInCell.forEach(ans => {
      questionSelectionCounts.set(
        ans.questionId,
        (questionSelectionCounts.get(ans.questionId) || 0) + 1
      );
    });

    const totalQuestionSelectionsInCell = userAnswersInCell.length;
    let bestQuestion: QuestionWithAnswerOptions | null = null;
    let maxQuestionUCB = -Infinity;

    console.log(`[ENGINE] --- Question Selection Phase (${unansweredQuestions.length} available) ---`);
    
    for (const question of unansweredQuestions.slice(0, 10)) { // Log only first 10 for brevity
      const questionSelectionCount = questionSelectionCounts.get(question.id) || 0;
      const ucb = calculateUCB(
        currentCellMastery.ability_theta,
        question.difficulty_b,
        question.discrimination_a,
        questionSelectionCount,
        totalQuestionSelectionsInCell + 1
      );

      console.log(
        `[ENGINE]   Q-${question.id.slice(0, 8)} | ` +
        `b=${question.difficulty_b.toFixed(2).padStart(5)} | ` +
        `UCB=${ucb.toFixed(3).padStart(8)}`
      );

      if (ucb > maxQuestionUCB) {
        maxQuestionUCB = ucb;
        bestQuestion = question;
      }
    }

    if (!bestQuestion) {
      console.error(`[ENGINE] UCB failed, using fallback`);
      bestQuestion = unansweredQuestions[0];
    }

    console.log(`[ENGINE] ✓ Selected Question: ${bestQuestion.id.slice(0, 8)}... (UCB: ${maxQuestionUCB.toFixed(3)})`);

    // STEP 6: Update metadata
    await prisma.userCellMastery.update({
      where: { userId_cellId: { userId, cellId: bestCell.id } },
      data: { selection_count: { increment: 1 } },
    });

    // Invalidate relevant caches
    engineCache.invalidateByPrefix(`mastery:${userId}`);

    // Track performance
    const elapsed = timer.elapsed();
    await engineMonitor.trackQuestionSelection(
      userId,
      quizId,
      bestQuestion.id,
      bestCell.id,
      selectedUCB,
      elapsed
    );

    console.log(`[ENGINE] ====== Selection Complete (${elapsed}ms) ======\n`);

    return bestQuestion;

  } catch (error) {
    console.error('[ENGINE] FATAL ERROR:', error);
    engineMonitor.trackError(userId, quizId, error as Error, {
      step: 'question_selection'
    });
    throw error;
  }
}

/**
 * Enhanced answer processing with full pipeline
 */
export async function processUserAnswer(
  userId: string,
  quizId: string,
  questionId: string,
  isCorrect: boolean,
  responseTime?: number
) {
  const timer = new PerformanceTimer();
  console.log(`[ENGINE] ====== Processing Answer ======`);
  console.log(`[ENGINE] User: ${userId}, Question: ${questionId.slice(0, 8)}..., Correct: ${isCorrect}`);

  try {
    // Track the answer
    if (responseTime) {
      engineMonitor.trackAnswerProcessing(userId, quizId, questionId, isCorrect, responseTime);
    }

    const answeredQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      include: { cell: true }
    });

    if (!answeredQuestion) {
      throw new Error(`Question ${questionId} not found`);
    }

    const { cellId, cell } = answeredQuestion;

    // Fetch current stats in parallel
    const [questionsInCell, userAnswersInCell, currentMastery] = await Promise.all([
      prisma.question.count({ where: { cellId } }),
      prisma.userAnswer.findMany({
        where: { userId, question: { cellId } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.userCellMastery.findUnique({
        where: { userId_cellId: { userId, cellId } }
      })
    ]);

    // Calculate mastery metrics
    const correctAnswersInCell = userAnswersInCell.filter(a => a.isCorrect).length + (isCorrect ? 1 : 0);
    const answeredCountInCell = userAnswersInCell.length + 1;
    const accuracy = correctAnswersInCell / answeredCountInCell;

    console.log(`[ENGINE] Cell Progress: ${correctAnswersInCell}/${answeredCountInCell} correct (${(accuracy * 100).toFixed(1)}%)`);

    let masteryAchieved = false;

    // Enhanced mastery detection
    if (questionsInCell > 3) {
      const masteryThreshold = 0.75;
      const recentAnswers = userAnswersInCell.slice(0, 3);
      const recentCorrect = recentAnswers.filter(a => a.isCorrect).length + (isCorrect ? 1 : 0);

      const overallMastery = accuracy >= masteryThreshold;
      const recentMastery = recentCorrect >= 3;
      const sufficientAttempts = answeredCountInCell >= 4;

      if (overallMastery && recentMastery && sufficientAttempts) {
        masteryAchieved = true;
      }

      console.log(`[ENGINE] Mastery Check: Overall=${overallMastery}, Recent=${recentMastery}, Attempts=${sufficientAttempts}`);
    } else {
      if (isCorrect && answeredCountInCell >= questionsInCell) {
        masteryAchieved = true;
      }
    }

    if (masteryAchieved) {
      console.log(`[ENGINE] 🎯 MASTERY ACHIEVED for "${cell.name}"!`);

      await prisma.userCellMastery.update({
        where: { userId_cellId: { userId, cellId } },
        data: { mastery_status: 1 }
      });

      // Track mastery achievement
      engineMonitor.trackMastery(
        userId,
        quizId,
        cellId,
        cell.name,
        answeredCountInCell,
        accuracy
      );

      // Invalidate caches
      engineCache.invalidateUserCache(userId);
    }

    // Trigger IRT recalibration asynchronously
    estimateAndUpdateIRTParameters(userId).catch(err =>
      console.error('[ENGINE] IRT recalibration failed:', err)
    );

    console.log(`[ENGINE] ====== Answer Processed (${timer.elapsed()}ms) ======\n`);

  } catch (error) {
    console.error('[ENGINE] ERROR processing answer:', error);
    engineMonitor.trackError(userId, quizId, error as Error, {
      step: 'answer_processing',
      questionId,
      isCorrect
    });
    throw error;
  }
}

/**
 * Get comprehensive quiz status
 */
export async function getQuizStatus(userId: string, quizId: string) {
  try {
    const [stoppingCheck, progress] = await Promise.all([
      shouldStopQuiz(userId, quizId),
      getQuizProgress(userId, quizId)
    ]);

    return {
      shouldContinue: !stoppingCheck.shouldStop,
      stoppingReason: stoppingCheck.reason,
      progress: {
        ...progress,
        estimatedQuestionsRemaining: Math.max(
          0,
          Math.ceil((1 - progress.estimatedCompletion) * 20)
        )
      },
      details: stoppingCheck.details
    };
  } catch (error) {
    console.error('[ENGINE] Error getting quiz status:', error);
    return null;
  }
}