import prisma from "@/lib/db";
import { calculateKullbackLeiblerInformation } from "./irt-estimator";

export interface StoppingConfig {
  minQuestions: number;
  maxQuestions: number;
  targetSEM: number;
  confidenceLevel: number;
  minInformationGain: number;
}

const DEFAULT_CONFIG: StoppingConfig = {
  minQuestions: 5,
  maxQuestions: 30,
  targetSEM: 0.3,
  confidenceLevel: 0.95,
  minInformationGain: 0.01
};

/**
 * Calculate Standard Error of Measurement
 */
export function calculateSEM(totalInformation: number): number {
  if (totalInformation <= 0) return Infinity;
  return 1 / Math.sqrt(totalInformation);
}

/**
 * Calculate total Kullback-Leibler Information
 */
export async function calculateTotalInformation(
  userId: string,
  quizId: string
): Promise<Map<string, number>> {
  const answers = await prisma.userAnswer.findMany({
    where: { userId, quizId },
    include: {
      question: {
        include: { cell: true }
      }
    }
  });

  const masteries = await prisma.userCellMastery.findMany({
    where: { userId },
    select: { cellId: true, ability_theta: true }
  });

  const thetaMap = new Map(
    masteries.map((m) => [m.cellId, m.ability_theta])
  );

  const informationPerCell = new Map<string, number>();

  answers.forEach((answer) => {
    const cellId = answer.question.cellId;
    const theta = thetaMap.get(cellId) || 0;
    
    const information = calculateKullbackLeiblerInformation(
      theta,
      answer.question.difficulty_b,
      answer.question.discrimination_a
    );

    const currentInfo = informationPerCell.get(cellId) || 0;
    informationPerCell.set(cellId, currentInfo + information);
  });

  return informationPerCell;
}

/**
 * Check if stopping criteria are met
 * NOW USES QUIZ-SPECIFIC MAX QUESTIONS SETTING
 */
export async function shouldStopQuiz(
  userId: string,
  quizId: string,
  config: StoppingConfig = DEFAULT_CONFIG
): Promise<{
  shouldStop: boolean;
  reason: string;
  details: {
    questionCount: number;
    averageSEM: number;
    cellsCompleted: number;
    totalCells: number;
  };
}> {
  
  // ===== FETCH QUIZ SETTINGS FOR MAX QUESTIONS =====
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { maxQuestions: true }
  });

  // Use quiz-specific max questions if available, otherwise use config default
  const maxQuestionsLimit = quiz?.maxQuestions ?? config.maxQuestions;

  console.log(`[STOPPING] Using max questions limit: ${maxQuestionsLimit}`);

  // Get basic quiz stats
  const [answerCount, allCells, masteredCells] = await Promise.all([
    prisma.userAnswer.count({ where: { userId, quizId } }),
    prisma.cell.count(),
    prisma.userCellMastery.count({ 
      where: { userId, mastery_status: 1 } 
    })
  ]);

  // ===== HARD STOP: MAX QUESTIONS (USES QUIZ SETTING) =====
  if (answerCount >= maxQuestionsLimit) {
    return {
      shouldStop: true,
      reason: 'max_questions_reached',
      details: {
        questionCount: answerCount,
        averageSEM: 0,
        cellsCompleted: masteredCells,
        totalCells: allCells
      }
    };
  }

  // Minimum questions check
  if (answerCount < config.minQuestions) {
    return {
      shouldStop: false,
      reason: 'minimum_not_reached',
      details: {
        questionCount: answerCount,
        averageSEM: Infinity,
        cellsCompleted: masteredCells,
        totalCells: allCells
      }
    };
  }

  // All cells mastered
  if (masteredCells === allCells) {
    return {
      shouldStop: true,
      reason: 'all_cells_mastered',
      details: {
        questionCount: answerCount,
        averageSEM: 0,
        cellsCompleted: masteredCells,
        totalCells: allCells
      }
    };
  }

  // Calculate measurement precision
  const informationPerCell = await calculateTotalInformation(userId, quizId);
  
  const semValues: number[] = [];
  informationPerCell.forEach((info: number) => {
    semValues.push(calculateSEM(info));
  });

  const averageSEM = semValues.length > 0
    ? semValues.reduce((sum: number, sem: number) => sum + sem, 0) / semValues.length
    : Infinity;

  // Check if precision target is met
  if (averageSEM <= config.targetSEM) {
    return {
      shouldStop: true,
      reason: 'precision_achieved',
      details: {
        questionCount: answerCount,
        averageSEM,
        cellsCompleted: masteredCells,
        totalCells: allCells
      }
    };
  }

  // Check information gain from recent questions
  if (answerCount >= 10) {
    const recentAnswers = await prisma.userAnswer.findMany({
      where: { userId, quizId },
      include: {
        question: {
          include: { cell: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const masteries = await prisma.userCellMastery.findMany({
      where: { userId },
      select: { cellId: true, ability_theta: true }
    });

    const thetaMap = new Map(
      masteries.map(m => [m.cellId, m.ability_theta])
    );

    let totalRecentInformation = 0;
    recentAnswers.forEach((ans) => {
      const theta = thetaMap.get(ans.question.cellId) || 0;
      totalRecentInformation += calculateKullbackLeiblerInformation(
        theta,
        ans.question.difficulty_b,
        ans.question.discrimination_a
      );
    });

    const avgRecentInfo = totalRecentInformation / recentAnswers.length;

    if (avgRecentInfo < config.minInformationGain) {
      return {
        shouldStop: true,
        reason: 'low_information_gain',
        details: {
          questionCount: answerCount,
          averageSEM,
          cellsCompleted: masteredCells,
          totalCells: allCells
        }
      };
    }
  }

  // Continue quiz
  return {
    shouldStop: false,
    reason: 'criteria_not_met',
    details: {
      questionCount: answerCount,
      averageSEM,
      cellsCompleted: masteredCells,
      totalCells: allCells
    }
  };
}

/**
 * Get detailed quiz progress
 */
export async function getQuizProgress(userId: string, quizId: string) {
  const answers = await prisma.userAnswer.findMany({
    where: { userId, quizId },
    include: {
      question: {
        include: { cell: true }
      }
    }
  });

  const allCells = await prisma.cell.findMany();
  const masteries = await prisma.userCellMastery.findMany({
    where: { userId }
  });

  const cellStats = new Map<string, { correct: number; total: number }>();
  answers.forEach((ans) => {
    const cellId = ans.question.cellId;
    const stats = cellStats.get(cellId) || { correct: 0, total: 0 };
    stats.total++;
    if (ans.isCorrect) stats.correct++;
    cellStats.set(cellId, stats);
  });

  const informationPerCell = await calculateTotalInformation(userId, quizId);

  const cellProgress = allCells.map((cell) => {
    const stats = cellStats.get(cell.id) || { correct: 0, total: 0 };
    const mastery = masteries.find((m) => m.cellId === cell.id);
    const information = informationPerCell.get(cell.id) || 0;

    return {
      cellId: cell.id,
      cellName: cell.name,
      questionsAnswered: stats.total,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      currentTheta: mastery?.ability_theta || 0,
      informationGathered: information,
      sem: calculateSEM(information),
      isMastered: mastery?.mastery_status === 1
    };
  });

  const totalCorrect = answers.filter((a) => a.isCorrect).length;
  const overallAccuracy = answers.length > 0 ? totalCorrect / answers.length : 0;

  const masteredCount = masteries.filter((m) => m.mastery_status === 1).length;
  const masteryProgress = masteredCount / allCells.length;
  
  const avgSEM = cellProgress.reduce((sum: number, cp) => sum + cp.sem, 0) / cellProgress.length;
  const precisionProgress = Math.max(0, Math.min(1, 1 - (avgSEM / 1.0)));

  const estimatedCompletion = (masteryProgress * 0.7) + (precisionProgress * 0.3);

  return {
    totalQuestions: answers.length,
    cellProgress,
    overallAccuracy,
    estimatedCompletion
  };
}