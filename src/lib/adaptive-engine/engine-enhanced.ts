// src/lib/adaptive-engine/engine-enhanced.ts

import prisma from "@/lib/db";
import { calculateUCB } from "./ucb";
import { 
  estimateAbility, 
  calculateKullbackLeiblerInformation,
  IRTResponse
} from "./irt-estimator-enhanced";
import { questionPoolManager } from "./question-pool-manager";
import { shouldStopQuiz } from "./stopping-criteria";
import { engineMonitor, PerformanceTimer } from "./monitoring";
import { Prisma } from "@prisma/client";

const questionWithAnswerOptions = Prisma.validator<Prisma.QuestionDefaultArgs>()({
  include: { answerOptions: true },
});

export type QuestionWithAnswerOptions = Prisma.QuestionGetPayload<typeof questionWithAnswerOptions>;

type UserMasteryWithCell = Prisma.UserCellMasteryGetPayload<{
  include: { cell: true };
}>;

/**
 * Get cell selection statistics for content balancing
 */
async function getCellSelectionStats(userId: string, quizId: string) {
  const answers = await prisma.userAnswer.findMany({
    where: { userId, quizId },
    include: { question: { select: { cellId: true } } }
  });

  const cellSelections = new Map<string, number>();
  answers.forEach(answer => {
    const count = cellSelections.get(answer.question.cellId) || 0;
    cellSelections.set(answer.question.cellId, count + 1);
  });

  return {
    cellSelections,
    totalSelections: answers.length
  };
}

/**
 * Apply content balancing to cell scores
 */
function applyContentBalancing(
  userMasteries: UserMasteryWithCell[],
  cellSelections: Map<string, number>,
  totalSelections: number,
  maxQuestionsPerCell: number = 5
): Array<{ cellId: string; cellName: string; score: number }> {
  return userMasteries.map(mastery => {
    const cellCount = cellSelections.get(mastery.cellId) || 0;
    
    // Base score: inverse of selection count (prioritize less-selected cells)
    const baseScore = 1 / (cellCount + 1);
    
    // Penalty if exceeding max per cell
    const penalty = cellCount >= maxQuestionsPerCell ? 0.1 : 1.0;
    
    // Consider mastery level (prioritize cells with lower mastery)
    const masteryFactor = mastery.mastery_status === 0 ? 1.0 : 0.5;
    
    const finalScore = baseScore * penalty * masteryFactor;
    
    return {
      cellId: mastery.cellId,
      cellName: mastery.cell.name,
      score: finalScore
    };
  });
}

/**
 * Enhanced question selection with exposure control and EAP/MLE
 */
export async function selectNextQuestionForUser(
  userId: string,
  quizId: string
): Promise<QuestionWithAnswerOptions | null> {
  const timer = new PerformanceTimer();
  console.log(`[ENGINE] ====== Starting Enhanced Question Selection ======`);
  console.log(`[ENGINE] User: ${userId}, Quiz: ${quizId}`);

  try {
    // STEP 0: Check stopping criteria
    const stoppingCheck = await shouldStopQuiz(userId, quizId);
    
    if (stoppingCheck.shouldStop) {
      console.log(`[ENGINE] Stopping quiz: ${stoppingCheck.reason}`);
      // Log quiz completion if stopping
      await engineMonitor.trackQuizCompletion(
        userId,
        quizId,
        stoppingCheck.details.questionCount,
        0, // totalTime - calculate if needed
        {
          cellsMastered: stoppingCheck.details.cellsCompleted,
          totalCells: stoppingCheck.details.totalCells,
          overallAccuracy: 0,
          averageSEM: stoppingCheck.details.averageSEM
        }
      );
      return null;
    }

    // STEP 1: Get user's current ability estimates for all cells
    const userMasteries = await prisma.userCellMastery.findMany({
      where: { 
        userId,
        mastery_status: 0 // Only non-mastered cells
      },
      include: { cell: true }
    });

    if (userMasteries.length === 0) {
      console.log(`[ENGINE] No available cells (all mastered)`);
      return null;
    }

    // STEP 2: Determine which cell to target next (content balancing)
    const { cellSelections, totalSelections } = await getCellSelectionStats(userId, quizId);
    const cellScores = applyContentBalancing(userMasteries, cellSelections, totalSelections);
    
    // Select cell with highest priority
    const targetCell = cellScores.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    console.log(`[ENGINE] Target cell: ${targetCell.cellName} (score: ${targetCell.score.toFixed(2)})`);

    const mastery = userMasteries.find(m => m.cellId === targetCell.cellId);
    if (!mastery) {
      throw new Error(`Mastery record not found for cell ${targetCell.cellId}`);
    }

    // STEP 3: Get available questions with exposure control
    const answeredQuestions = await prisma.userAnswer.findMany({
      where: { userId, quizId },
      select: { questionId: true }
    });

    console.log(`[ENGINE] User has answered ${answeredQuestions.length} questions in this quiz`);

    const availableQuestions = await questionPoolManager.getAvailableQuestions({
      cellId: targetCell.cellId,
      userId,
      quizId, // Pass quizId to only exclude questions from current quiz
      excludeQuestionIds: answeredQuestions.map(a => a.questionId)
    });

    if (availableQuestions.length === 0) {
      // Check if cell has ANY questions
      const totalQuestionsInCell = await prisma.question.count({
        where: { cellId: targetCell.cellId }
      });

      console.log(`[ENGINE] No available questions for cell ${targetCell.cellName}`);
      console.log(`[ENGINE] Total questions in cell: ${totalQuestionsInCell}`);
      console.log(`[ENGINE] Already answered: ${answeredQuestions.length}`);
      
      if (totalQuestionsInCell === 0) {
        console.log(`[ENGINE] ⚠️ Cell has no questions! Please add questions to this cell.`);
      } else if (totalQuestionsInCell === answeredQuestions.length) {
        console.log(`[ENGINE] ✓ User has answered all questions in this cell.`);
      }

      // Log using the monitor's log method
      engineMonitor.log({
        userId,
        quizId,
        eventType: 'error',
        data: {
          message: 'No available questions',
          cellId: targetCell.cellId,
          cellName: targetCell.cellName,
          totalInCell: totalQuestionsInCell,
          answered: answeredQuestions.length
        }
      });
      return null;
    }

    console.log(`[ENGINE] ${availableQuestions.length} available questions after exposure filtering`);

    // STEP 4: Calculate information value for each question using KLI
    const questionScores = availableQuestions.map(question => {
      const kli = calculateKullbackLeiblerInformation(
        mastery.ability_theta,
        question.difficulty_b,
        question.discrimination_a
      );

      return {
        question,
        kli,
        exposurePenalty: question.exposureCount * 0.1 // Penalize frequently used questions
      };
    });

    // STEP 5: Apply UCB algorithm for exploration-exploitation balance
    const totalQuizSelections = await prisma.userAnswer.count({
      where: { userId, quizId }
    });

    const ucbScores = questionScores.map(qs => {
      // Get question-specific selection count
      const questionSelections = qs.question.exposureCount;

      // UCB score combines information value with exploration bonus
      const ucbScore = calculateUCB(
        qs.kli,                    // Exploitation: information value
        -qs.exposurePenalty,       // Penalty for overuse
        1.0,                       // Information weight
        questionSelections,        // This item's selection count
        totalQuizSelections + 1    // Total selections
      );

      return {
        ...qs,
        ucbScore
      };
    });

    // Sort by UCB score and select the best
    ucbScores.sort((a, b) => b.ucbScore - a.ucbScore);
    const selectedQuestion = ucbScores[0].question;

    console.log(`[ENGINE] Selected question: ${selectedQuestion.id}`);
    console.log(`[ENGINE] - KLI: ${ucbScores[0].kli.toFixed(3)}`);
    console.log(`[ENGINE] - UCB Score: ${ucbScores[0].ucbScore.toFixed(3)}`);
    console.log(`[ENGINE] - Difficulty: ${selectedQuestion.difficulty_b.toFixed(2)}`);
    console.log(`[ENGINE] - User ability: ${mastery.ability_theta.toFixed(2)}`);
    console.log(`[ENGINE] - Exposure count: ${selectedQuestion.exposureCount}`);

    // STEP 6: Track question usage
    await questionPoolManager.trackQuestionUsage(
      selectedQuestion.id,
      userId,
      mastery.ability_theta
    );

    // STEP 7: Update cell selection stats
    await prisma.userCellMastery.update({
      where: { id: mastery.id },
      data: { selection_count: { increment: 1 } }
    });

    // Log performance metrics
    await engineMonitor.trackQuestionSelection(
      userId,
      quizId,
      selectedQuestion.id,
      targetCell.cellId,
      ucbScores[0].ucbScore,
      timer.elapsed()
    );

    console.log(`[ENGINE] Selection completed in ${timer.elapsed()}ms`);
    console.log(`[ENGINE] ====== Question Selection Complete ======\n`);

    return selectedQuestion;

  } catch (error) {
    engineMonitor.trackError(
      userId,
      quizId,
      error as Error,
      { step: 'question_selection' }
    );
    throw error;
  }
}

/**
 * Process user answer with enhanced ability estimation
 */
export async function processUserAnswer(
  userId: string,
  quizId: string,
  questionId: string,
  selectedOptionId: string
): Promise<{
  isCorrect: boolean;
  abilityUpdate: {
    oldTheta: number;
    newTheta: number;
    confidence: number;
    method: 'EAP' | 'MLE';
  } | null;
}> {
  const timer = new PerformanceTimer();
  console.log(`[ENGINE] Processing answer for question ${questionId}`);

  // Get question and check correctness
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { answerOptions: true }
  });

  if (!question) {
    throw new Error(`Question ${questionId} not found`);
  }

  const selectedOption = question.answerOptions.find(opt => opt.id === selectedOptionId);
  if (!selectedOption) {
    throw new Error(`Answer option ${selectedOptionId} not found`);
  }

  const isCorrect = selectedOption.isCorrect;

  // Get user's current ability for this cell
  const mastery = await prisma.userCellMastery.findUnique({
    where: {
      userId_cellId: {
        userId,
        cellId: question.cellId
      }
    }
  });

  if (!mastery) {
    throw new Error(`Mastery record not found for user ${userId}, cell ${question.cellId}`);
  }

  const oldTheta = mastery.ability_theta;

  // Save the answer with ability at time of question
  await prisma.userAnswer.create({
    data: {
      userId,
      quizId,
      questionId,
      selectedOptionId,
      isCorrect,
      abilityAtTime: oldTheta,
      responseTime: null // Can be added if tracked on frontend
    }
  });

  // Update question statistics
  await questionPoolManager.updateQuestionAfterResponse(questionId, isCorrect);

  // Get all responses for this cell
  const cellAnswers = await prisma.userAnswer.findMany({
    where: {
      userId,
      question: { cellId: question.cellId }
    },
    include: { question: true }
  });

  // Re-estimate ability using enhanced estimator
  const responses: IRTResponse[] = cellAnswers.map(ans => ({
    difficulty_b: ans.question.difficulty_b,
    discrimination_a: ans.question.discrimination_a,
    isCorrect: ans.isCorrect
  }));

  const abilityEstimate = estimateAbility(responses, 0, 1, oldTheta);

  // Update mastery record with new estimate
  await prisma.userCellMastery.update({
    where: { id: mastery.id },
    data: {
      ability_theta: abilityEstimate.theta,
      sem: abilityEstimate.sem,
      confidence: abilityEstimate.confidence,
      lastEstimated: new Date(),
      responseCount: responses.length
    }
  });

  // Log to ability history
  await prisma.abilityHistory.create({
    data: {
      userId,
      cellId: question.cellId,
      ability_theta: abilityEstimate.theta,
      confidence: abilityEstimate.confidence,
      quizId
    }
  });

  console.log(
    `[ENGINE] Ability updated: ${oldTheta.toFixed(2)} → ${abilityEstimate.theta.toFixed(2)} ` +
    `(${isCorrect ? 'correct' : 'incorrect'}, method: ${abilityEstimate.method}, ` +
    `confidence: ${abilityEstimate.confidence.toFixed(2)})`
  );

  // Track answer processing
  engineMonitor.trackAnswerProcessing(
    userId,
    quizId,
    questionId,
    isCorrect,
    timer.elapsed()
  );

  return {
    isCorrect,
    abilityUpdate: {
      oldTheta,
      newTheta: abilityEstimate.theta,
      confidence: abilityEstimate.confidence,
      method: abilityEstimate.method
    }
  };
}

/**
 * Initialize user mastery records for a new quiz
 */
export async function initializeUserMastery(userId: string): Promise<void> {
  const cells = await prisma.cell.findMany();

  for (const cell of cells) {
    await prisma.userCellMastery.upsert({
      where: {
        userId_cellId: {
          userId,
          cellId: cell.id
        }
      },
      create: {
        userId,
        cellId: cell.id,
        ability_theta: 0,
        selection_count: 0,
        mastery_status: 0,
        sem: null,
        confidence: 0,
        responseCount: 0
      },
      update: {} // Don't overwrite existing records
    });
  }

  console.log(`[ENGINE] Initialized mastery records for user ${userId}`);
}