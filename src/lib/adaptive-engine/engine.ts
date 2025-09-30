import prisma from "@/lib/db";
import { calculateUCB } from "./ucb";
import { Prisma } from "@prisma/client";

// This creates a TypeScript type that matches a Question object
// when it's queried with its answerOptions included.
const questionWithAnswerOptions = Prisma.validator<Prisma.QuestionDefaultArgs>()({
  include: { answerOptions: true },
});

export type QuestionWithAnswerOptions = Prisma.QuestionGetPayload<typeof questionWithAnswerOptions>;

// ==================================================================
// === THIS IS THE STUB FOR THE COMPLEX IRT RECALIBRATION STEP ===
// ==================================================================
async function estimateAndUpdateIRTParameters(userId: string) {
  console.log(`STUB: Recalibrating all IRT parameters for cells and user ${userId}'s ability.`);
  // In a real system, this is where the computationally intensive 'twopl_mml' logic would run.
  return;
}

/**
 * Main function to select the next question for a user based on the full adaptive logic.
 * @param userId - The ID of the user taking the quiz.
 * @returns The next Question object to present, or null if the quiz is complete.
 */
export async function selectNextQuestionForUser(
  userId: string,
  quizId: string
): Promise<QuestionWithAnswerOptions | null> {
  console.log(`[ENGINE] Starting question selection for user: ${userId}`);
  
  // --- Layer 1: Select a Topic/Cell using KLI-UCB ---
  const userMasteryData = await prisma.userCellMastery.findMany({
    where: { userId, mastery_status: 0 },
    include: { cell: true },
  });

  if (userMasteryData.length === 0) {
    console.log(`[ENGINE] User has mastered all available cells.`);
    return null;
  }

  const totalCellSelections = userMasteryData.reduce((sum, m) => sum + m.selection_count, 1);
  let bestCell = null;
  let maxUCB = -Infinity;

  for (const mastery of userMasteryData) {
    const ucb = calculateUCB(
      mastery.ability_theta,
      mastery.cell.difficulty_b,
      mastery.cell.discrimination_a,
      mastery.selection_count,
      totalCellSelections
    );
    if (ucb > maxUCB) {
      maxUCB = ucb;
      bestCell = mastery.cell;
    }
  }

  if (!bestCell) {
    console.error(`[ENGINE] CRITICAL: Could not select a best cell for user ${userId}.`);
    return null;
  }
  console.log(`[ENGINE] Selected Cell: ${bestCell.name} with UCB score ${maxUCB}`);

  // --- Layer 2: Select a Question from the chosen Cell using KLI-UCB ---
   const answeredQuestionIds = (
    await prisma.userAnswer.findMany({
      where: { userId, quizId }, // <-- USE quizId HERE
      select: { questionId: true },
    })
  ).map((a) => a.questionId);

  const availableQuestions = await prisma.question.findMany({
    where: { cellId: bestCell.id, id: { notIn: answeredQuestionIds } },
    include: { answerOptions: true },
  });

  if (availableQuestions.length === 0) {
    console.log(`[ENGINE] Cell ${bestCell.name} is exhausted. Marking as complete.`);
    await prisma.userCellMastery.update({
      where: { userId_cellId: { userId, cellId: bestCell.id } },
      data: { mastery_status: 1 },
    });
    return selectNextQuestionForUser(userId, quizId); // Recurse to find the next best cell
  }

  // Find the user's ability for the selected cell
  const currentCellMastery = userMasteryData.find(m => m.cellId === bestCell.id);
  if (!currentCellMastery) {
    console.error(`[ENGINE] CRITICAL: Could not find mastery data for selected cell ${bestCell.name}.`);
    return availableQuestions[0]; // Fallback to prevent crash
  }
  
  // Fetch counts in a more optimized way
  const userAnswerCounts = await prisma.userAnswer.groupBy({
    by: ['questionId'],
    where: { userId, question: { cellId: bestCell.id } },
    _count: { questionId: true },
  });
  
  const questionSelectionCounts = new Map(
    userAnswerCounts.map(c => [c.questionId, c._count.questionId || 0])
  );
  const totalQuestionSelectionsInCell = userAnswerCounts.length;

  let bestQuestion: QuestionWithAnswerOptions | null = null;
  let maxQuestionUCB = -Infinity;

  for (const question of availableQuestions) {
    const questionSelectionCount = questionSelectionCounts.get(question.id) || 0;
    const ucb = calculateUCB(
      currentCellMastery.ability_theta,
      question.difficulty_b,
      question.discrimination_a,
      questionSelectionCount,
      totalQuestionSelectionsInCell + 1 // Add 1 to avoid log(0)
    );

    if (ucb > maxQuestionUCB) {
      maxQuestionUCB = ucb;
      bestQuestion = question;
    }
  }

  if (!bestQuestion) {
    console.error(`[ENGINE] CRITICAL: UCB failed to select a question from cell ${bestCell.name}.`);
    return availableQuestions[0]; // Fallback to prevent crash
  }

  console.log(`[ENGINE] Selected Question ID: ${bestQuestion.id} from cell ${bestCell.name} with UCB ${maxQuestionUCB}`);

  // Increment selection count for the chosen cell before returning
  await prisma.userCellMastery.update({
    where: { userId_cellId: { userId, cellId: bestCell.id } },
    data: { selection_count: { increment: 1 } },
  });

  return bestQuestion;
}

/**
 * Processes a user's answer, checks for cell mastery, and triggers recalibration.
 */
export async function processUserAnswer(userId: string, quizId: string, questionId: string, isCorrect: boolean) {
  console.log(`[ENGINE] Processing answer for user ${userId} on question ${questionId}. Correct: ${isCorrect}`);
  
  const answeredQuestion = await prisma.question.findUnique({
    where: { id: questionId },
    select: { cellId: true }
  });

  if (answeredQuestion) {
    const { cellId } = answeredQuestion;
    
    // Fetch all necessary data in parallel for efficiency
    const [questionsInCell, userAnswersInCell] = await Promise.all([
      prisma.question.count({ where: { cellId } }),
      prisma.userAnswer.findMany({ where: { userId, question: { cellId } } })
    ]);

    const correctAnswersInCell = userAnswersInCell.filter(a => a.isCorrect).length + (isCorrect ? 1 : 0);
    const answeredCountInCell = userAnswersInCell.length + 1; // +1 for the current answer

    let masteryAchieved = false;
    
    // Logic from your guide:
    if (questionsInCell > 3) {
      const masteryThreshold = 0.7;
      if ((correctAnswersInCell / answeredCountInCell) >= masteryThreshold && answeredCountInCell > 1) {
        masteryAchieved = true;
      }
    } else {
      if (isCorrect) {
        masteryAchieved = true;
      }
    }

    if (masteryAchieved) {
      console.log(`[ENGINE] User ${userId} has achieved mastery for cell ${cellId}!`);
      await prisma.userCellMastery.update({
        where: { userId_cellId: { userId, cellId } },
        data: { mastery_status: 1 }
      });
    }
  }
  
  // Trigger recalibration of IRT parameters
  await estimateAndUpdateIRTParameters(userId);
}