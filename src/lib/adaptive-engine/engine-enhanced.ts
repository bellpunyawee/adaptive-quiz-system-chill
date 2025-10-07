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
 * Enhanced question selection with exposure control, EAP/MLE, and QUIZ SETTINGS SUPPORT
 */
export async function selectNextQuestionForUser(
  userId: string,
  quizId: string
): Promise<QuestionWithAnswerOptions | null> {
  const timer = new PerformanceTimer();
  console.log(`[ENGINE] ====== Starting Enhanced Question Selection ======`);
  console.log(`[ENGINE] User: ${userId}, Quiz: ${quizId}`);

  try {
    // ==========================================
    // STEP 0: FETCH QUIZ SETTINGS
    // ==========================================
    const quizSettings = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        explorationParam: true,
        maxQuestions: true,
        topicSelection: true,
        selectedCells: true,
      }
    });

    const explorationParameter = quizSettings?.explorationParam ?? 1.0;
    const maxQuestionsLimit = quizSettings?.maxQuestions ?? 50;
    const topicSelectionMode = quizSettings?.topicSelection ?? 'system';
    const selectedCellIds = topicSelectionMode === 'manual' && quizSettings?.selectedCells
      ? JSON.parse(quizSettings.selectedCells) as string[]
      : null;

    console.log(`[ENGINE] Quiz Settings:`, {
      explorationParameter,
      maxQuestionsLimit,
      topicSelectionMode,
      selectedCellsCount: selectedCellIds?.length ?? 0
    });

    // ==========================================
    // STEP 0.1: Check Max Questions Limit
    // ==========================================
    const answeredCount = await prisma.userAnswer.count({
      where: { userId, quizId }
    });

    if (answeredCount >= maxQuestionsLimit) {
      console.log(`[ENGINE] Max questions limit reached: ${answeredCount}/${maxQuestionsLimit}`);
      return null;
    }

    // ==========================================
    // STEP 0.2: Check Other Stopping Criteria
    // ==========================================
    const stoppingCheck = await shouldStopQuiz(userId, quizId);
    
    if (stoppingCheck.shouldStop) {
      console.log(`[ENGINE] Stopping quiz: ${stoppingCheck.reason}`);
      await engineMonitor.trackQuizCompletion(
        userId,
        quizId,
        stoppingCheck.details.questionCount,
        0,
        {
          cellsMastered: stoppingCheck.details.cellsCompleted,
          totalCells: stoppingCheck.details.totalCells,
          overallAccuracy: 0,
          averageSEM: stoppingCheck.details.averageSEM
        }
      );
      return null;
    }

    // ==========================================
    // STEP 1: Get User's Ability Estimates (WITH CELL FILTERING)
    // ==========================================
    let userMasteries: UserMasteryWithCell[];
    
    if (selectedCellIds && selectedCellIds.length > 0) {
      // Manual mode: only include selected cells
      userMasteries = await prisma.userCellMastery.findMany({
        where: { 
          userId,
          mastery_status: 0, // Only non-mastered cells
          cellId: { in: selectedCellIds } // FILTER by selected cells
        },
        include: { cell: true }
      });
      console.log(`[ENGINE] Manual mode: Loaded ${userMasteries.length} selected cells`);
    } else {
      // System recommendation: all unmastered cells
      userMasteries = await prisma.userCellMastery.findMany({
        where: { 
          userId,
          mastery_status: 0
        },
        include: { cell: true }
      });
      console.log(`[ENGINE] System mode: Loaded ${userMasteries.length} unmastered cells`);
    }

    if (userMasteries.length === 0) {
      console.log(`[ENGINE] No available cells`);
      return null;
    }

    // ==========================================
    // STEP 2: Determine Target Cell (Content Balancing)
    // ==========================================
    const { cellSelections, totalSelections } = await getCellSelectionStats(userId, quizId);
    const cellScores = applyContentBalancing(userMasteries, cellSelections, totalSelections);
    
    // Select cell with highest priority
    const targetCell = cellScores.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    console.log(`[ENGINE] Target cell: ${targetCell.cellName} (score: ${targetCell.score.toFixed(3)})`);

    // Get the mastery record for this cell
    const mastery = userMasteries.find(m => m.cellId === targetCell.cellId);
    if (!mastery) {
      throw new Error(`Mastery record not found for cell ${targetCell.cellId}`);
    }

    // ==========================================
    // STEP 3: Get Available Questions from Pool
    // ==========================================
    const availableQuestions = await questionPoolManager.getAvailableQuestions({
      cellId: targetCell.cellId,
      userId,
      quizId,
      excludeQuestionIds: []
    });

    if (availableQuestions.length === 0) {
      console.log(`[ENGINE] No available questions in cell ${targetCell.cellName}`);
      // Mark cell as complete and try again
      await prisma.userCellMastery.update({
        where: { id: mastery.id },
        data: { mastery_status: 1 }
      });
      return selectNextQuestionForUser(userId, quizId);
    }

    console.log(`[ENGINE] Found ${availableQuestions.length} available questions`);

    // ==========================================
    // STEP 4: Calculate Question Scores (KLI + UCB)
    // ==========================================
    
    // Get all answers in current quiz for UCB calculation
    const allQuizAnswers = await prisma.userAnswer.findMany({
      where: { userId, quizId },
      select: { questionId: true }
    });

    const totalQuizSelections = allQuizAnswers.length;
    const questionSelectionCounts = new Map<string, number>();
    
    allQuizAnswers.forEach(answer => {
      const count = questionSelectionCounts.get(answer.questionId) || 0;
      questionSelectionCounts.set(answer.questionId, count + 1);
    });

    const questionScores = availableQuestions.map(question => {
      // Calculate Kullback-Leibler Information
      const kli = calculateKullbackLeiblerInformation(
        mastery.ability_theta,
        question.difficulty_b,
        question.discrimination_a
      );

      // Calculate exposure penalty
      const exposurePenalty = question.exposureCount > 0 
        ? Math.log(question.exposureCount + 1) * 0.1 
        : 0;

      // Get selection count for this specific question in this quiz
      const questionSelections = questionSelectionCounts.get(question.id) || 0;

      // Calculate UCB score with CUSTOM EXPLORATION PARAMETER
      const ucbScore = calculateUCB(
        kli,                       // Exploitation: information value
        -exposurePenalty,          // Penalty for overuse
        explorationParameter,      // USE CUSTOM EXPLORATION PARAMETER
        questionSelections,        // This item's selection count
        totalQuizSelections + 1    // Total selections
      );

      return {
        question,
        kli,
        exposurePenalty,
        ucbScore
      };
    });

    // Sort by UCB score and select the best
    questionScores.sort((a, b) => b.ucbScore - a.ucbScore);
    const selectedQuestion = questionScores[0].question;

    console.log(`[ENGINE] Selected question: ${selectedQuestion.id}`);
    console.log(`[ENGINE] - KLI: ${questionScores[0].kli.toFixed(3)}`);
    console.log(`[ENGINE] - UCB Score: ${questionScores[0].ucbScore.toFixed(3)}`);
    console.log(`[ENGINE] - Difficulty: ${selectedQuestion.difficulty_b.toFixed(2)}`);
    console.log(`[ENGINE] - User ability: ${mastery.ability_theta.toFixed(2)}`);
    console.log(`[ENGINE] - Exposure count: ${selectedQuestion.exposureCount}`);
    console.log(`[ENGINE] - Exploration param: ${explorationParameter.toFixed(2)}`);

    // ==========================================
    // STEP 5: Track Question Usage
    // ==========================================
    await questionPoolManager.trackQuestionUsage(
      selectedQuestion.id,
      userId,
      mastery.ability_theta
    );

    // ==========================================
    // STEP 6: Update Cell Selection Stats
    // ==========================================
    await prisma.userCellMastery.update({
      where: { id: mastery.id },
      data: { selection_count: { increment: 1 } }
    });

    // ==========================================
    // STEP 7: Log Performance Metrics
    // ==========================================
    await engineMonitor.trackQuestionSelection(
      userId,
      quizId,
      selectedQuestion.id,
      targetCell.cellId,
      questionScores[0].ucbScore,
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
    include: { 
      answerOptions: true,
      cell: true
    }
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

  // Get all responses for this cell to re-estimate ability
  const cellResponses = await prisma.userAnswer.findMany({
    where: {
      userId,
      question: { cellId: question.cellId }
    },
    include: {
      question: {
        select: {
          difficulty_b: true,
          discrimination_a: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Build response pattern for IRT estimation
  const responses: IRTResponse[] = cellResponses.map(answer => ({
    difficulty_b: answer.question.difficulty_b,
    discrimination_a: answer.question.discrimination_a,
    isCorrect: answer.isCorrect
  }));

  console.log(`[ENGINE] Cell responses: ${cellResponses.length} answers`);

  // Estimate new ability using EAP or MLE
  const abilityEstimate = estimateAbility(responses, oldTheta, 1.0);

  console.log(
    `[ENGINE] Ability update: ${oldTheta.toFixed(2)} → ${abilityEstimate.theta.toFixed(2)} ` +
    `(SEM: ${abilityEstimate.sem.toFixed(3)}, method: ${abilityEstimate.method})`
  );

  // Update mastery record with new ability estimate
  await prisma.userCellMastery.update({
    where: { id: mastery.id },
    data: {
      ability_theta: abilityEstimate.theta,
      sem: abilityEstimate.sem,
      confidence: abilityEstimate.confidence,
      responseCount: responses.length,
      lastEstimated: new Date()
    }
  });

  // Check for mastery achievement
  // Criteria: Low standard error AND sufficient responses
  if (abilityEstimate.sem < 0.3 && responses.length >= 3) {
    await prisma.userCellMastery.update({
      where: { id: mastery.id },
      data: { mastery_status: 1 }
    });

    console.log(`[ENGINE] 🎉 Mastery achieved for cell ${question.cell.name}!`);

    // Track mastery achievement
    await engineMonitor.trackMastery(
      userId,
      quizId,
      question.cellId,
      question.cell.name,
      responses.length,
      abilityEstimate.confidence
    );
  }

  // Track answer processing performance
  engineMonitor.trackAnswerProcessing(
    userId,
    quizId,
    questionId,
    isCorrect,
    timer.elapsed()
  );

  console.log(`[ENGINE] Answer processing completed in ${timer.elapsed()}ms`);

  return {
    isCorrect,
    abilityUpdate: {
      oldTheta,
      newTheta: abilityEstimate.theta,
      confidence: abilityEstimate.confidence,
      method: responses.length < 10 ? 'EAP' : 'MLE'
    }
  };
}