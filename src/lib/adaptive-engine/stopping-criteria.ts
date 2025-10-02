// src/lib/adaptive-engine/stopping-criteria.ts
import prisma from "@/lib/db";
import { calculateFisherInformation } from "./irt-estimator";

export interface StoppingConfig {
  minQuestions: number;
  maxQuestions: number;
  targetSEM: number; // Standard Error of Measurement
  confidenceLevel: number; // e.g., 0.95 for 95% confidence
  minInformationGain: number; // Stop if information gain is too low
}

const DEFAULT_CONFIG: StoppingConfig = {
  minQuestions: 5,
  maxQuestions: 30,
  targetSEM: 0.3,
  confidenceLevel: 0.95,
  minInformationGain: 0.01
};

/**
 * Calculate Standard Error of Measurement based on Fisher Information
 */
export function calculateSEM(totalInformation: number): number {
  if (totalInformation <= 0) return Infinity;
  return 1 / Math.sqrt(totalInformation);
}

/**
 * Calculate total information gathered so far
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

  // Get user's current ability for each cell
  const masteries = await prisma.userCellMastery.findMany({
    where: { userId },
    select: { cellId: true, ability_theta: true }
  });

  const thetaMap = new Map(
    masteries.map(m => [m.cellId, m.ability_theta])
  );

  // Calculate information per cell
  const informationPerCell = new Map<string, number>();

  answers.forEach((answer) => {
    const cellId = answer.question.cellId;
    const theta = thetaMap.get(cellId) || 0;
    
    const information = calculateFisherInformation(
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
  // Get basic quiz stats
  const [answerCount, allCells, masteredCells] = await Promise.all([
    prisma.userAnswer.count({ where: { userId, quizId } }),
    prisma.cell.count(),
    prisma.userCellMastery.count({ 
      where: { userId, mastery_status: 1 } 
    })
  ]);

  // Hard stop conditions
  if (answerCount >= config.maxQuestions) {
    return {
      shouldStop: true,
      reason: 'Maximum questions reached',
      details: {
        questionCount: answerCount,
        averageSEM: 0,
        cellsCompleted: masteredCells,
        totalCells: allCells
      }
    };
  }

  if (answerCount < config.minQuestions) {
    return {
      shouldStop: false,
      reason: 'Minimum questions not yet reached',
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
      reason: 'All cells mastered',
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
      reason: `Precision target achieved (SEM: ${averageSEM.toFixed(3)})`,
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
      totalRecentInformation += calculateFisherInformation(
        theta,
        ans.question.difficulty_b,
        ans.question.discrimination_a
      );
    });

    const avgRecentInformation = totalRecentInformation / recentAnswers.length;

    if (avgRecentInformation < config.minInformationGain) {
      return {
        shouldStop: true,
        reason: 'Diminishing returns - information gain too low',
        details: {
          questionCount: answerCount,
          averageSEM,
          cellsCompleted: masteredCells,
          totalCells: allCells
        }
      };
    }
  }

  return {
    shouldStop: false,
    reason: 'Continue testing',
    details: {
      questionCount: answerCount,
      averageSEM,
      cellsCompleted: masteredCells,
      totalCells: allCells
    }
  };
}

/**
 * Get detailed quiz progress report
 */
export async function getQuizProgress(
  userId: string,
  quizId: string
): Promise<{
  totalQuestions: number;
  cellProgress: Array<{
    cellName: string;
    questionsAnswered: number;
    correctAnswers: number;
    accuracy: number;
    currentTheta: number;
    informationGathered: number;
    sem: number;
    isMastered: boolean;
  }>;
  overallAccuracy: number;
  estimatedCompletion: number; // 0-1
}> {
  const [answers, allCells, masteries] = await Promise.all([
    prisma.userAnswer.findMany({
      where: { userId, quizId },
      include: {
        question: {
          include: { cell: true }
        }
      }
    }),
    prisma.cell.findMany(),
    prisma.userCellMastery.findMany({
      where: { userId },
      include: { cell: true }
    })
  ]);

  const informationPerCell = await calculateTotalInformation(userId, quizId);

  // Group answers by cell
  const cellStats = new Map<string, {
    total: number;
    correct: number;
    cellName: string;
  }>();

  answers.forEach((ans) => {
    const cellId = ans.question.cellId;
    const stats = cellStats.get(cellId) || { 
      total: 0, 
      correct: 0,
      cellName: ans.question.cell.name 
    };
    stats.total++;
    if (ans.isCorrect) stats.correct++;
    cellStats.set(cellId, stats);
  });

  const cellProgress = allCells.map(cell => {
    const stats = cellStats.get(cell.id) || { 
      total: 0, 
      correct: 0,
      cellName: cell.name 
    };
    const mastery = masteries.find(m => m.cellId === cell.id);
    const information = informationPerCell.get(cell.id) || 0;

    return {
      cellName: cell.name,
      questionsAnswered: stats.total,
      correctAnswers: stats.correct,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      currentTheta: mastery?.ability_theta || 0,
      informationGathered: information,
      sem: calculateSEM(information),
      isMastered: mastery?.mastery_status === 1
    };
  });

  const totalCorrect = answers.filter((a) => a.isCorrect).length;
  const overallAccuracy = answers.length > 0 ? totalCorrect / answers.length : 0;

  // Estimate completion based on mastered cells and information gathered
  const masteredCount = masteries.filter((m) => m.mastery_status === 1).length;
  const masteryProgress = masteredCount / allCells.length;
  
  const avgSEM = cellProgress.reduce((sum: number, cp) => sum + cp.sem, 0) / cellProgress.length;
  const precisionProgress = Math.max(0, Math.min(1, 1 - (avgSEM / 1.0))); // Normalize to 0-1

  const estimatedCompletion = (masteryProgress * 0.7) + (precisionProgress * 0.3);

  return {
    totalQuestions: answers.length,
    cellProgress,
    overallAccuracy,
    estimatedCompletion
  };
}