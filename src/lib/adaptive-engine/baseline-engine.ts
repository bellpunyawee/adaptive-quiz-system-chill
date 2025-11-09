// src/lib/adaptive-engine/baseline-engine.ts
/**
 * Baseline Assessment Engine
 *
 * Purpose: Conducts structured initial assessment with forced topic coverage
 * - 15 questions total (3 per topic)
 * - Adaptive selection within each topic
 * - Starts at medium difficulty (θ ≈ 0)
 * - Provides comprehensive ability profile
 */

import prisma from '@/lib/db';
import { estimateAbility } from './irt-estimator-enhanced';

interface BaselineQuestion {
  id: string;
  text: string;
  cellId: string;
  cellName: string;
  difficulty_b: number;
  discrimination_a: number;
  answerOptions: Array<{ id: string; text: string }>;
}

interface BaselineProgress {
  cellId: string;
  cellName: string;
  questionsAsked: number;
  questionsTarget: number;
  completed: boolean;
}

/**
 * Select next question for baseline assessment
 * Ensures 3 questions per topic with adaptive selection
 */
export async function selectBaselineQuestion(
  userId: string,
  quizId: string
): Promise<BaselineQuestion | null> {
  // Get all cells (topics)
  const cells = await prisma.cell.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' }, // Consistent order
  });

  if (cells.length === 0) {
    throw new Error('No topics (cells) found in database');
  }

  // Get already answered questions in this quiz
  const answeredQuestions = await prisma.userAnswer.findMany({
    where: {
      userId,
      quizId,
    },
    include: {
      question: {
        select: {
          cellId: true,
        },
      },
    },
  });

  // Count questions per cell
  const cellQuestionCounts = new Map<string, number>();
  const answeredQuestionIds = new Set<string>();

  for (const answer of answeredQuestions) {
    const cellId = answer.question.cellId;
    cellQuestionCounts.set(cellId, (cellQuestionCounts.get(cellId) || 0) + 1);
    answeredQuestionIds.add(answer.questionId);
  }

  const QUESTIONS_PER_CELL = 3;

  // Find first cell that hasn't reached 3 questions
  let targetCell: { id: string; name: string } | null = null;
  for (const cell of cells) {
    const count = cellQuestionCounts.get(cell.id) || 0;
    if (count < QUESTIONS_PER_CELL) {
      targetCell = cell;
      break;
    }
  }

  // If all cells complete, baseline is done
  if (!targetCell) {
    return null;
  }

  // Get user's current ability estimate for this cell
  const userMastery = await prisma.userCellMastery.findUnique({
    where: {
      userId_cellId: {
        userId,
        cellId: targetCell.id,
      },
    },
  });

  const currentAbility = userMastery?.ability_theta || 0;
  const questionsAnswered = cellQuestionCounts.get(targetCell.id) || 0;

  // Select question adaptively within this cell
  const question = await selectQuestionForCell(
    targetCell.id,
    currentAbility,
    answeredQuestionIds,
    questionsAnswered
  );

  if (!question) {
    console.warn(`No available question found for cell ${targetCell.name}`);
    return null;
  }

  return {
    ...question,
    cellName: targetCell.name,
  };
}

/**
 * Select optimal question within a specific cell for baseline
 */
async function selectQuestionForCell(
  cellId: string,
  userAbility: number,
  excludeQuestionIds: Set<string>,
  questionsAnsweredInCell: number
): Promise<BaselineQuestion | null> {
  // Get all active questions in this cell
  const questions = await prisma.question.findMany({
    where: {
      cellId,
      isActive: true,
      id: {
        notIn: Array.from(excludeQuestionIds),
      },
    },
    include: {
      answerOptions: {
        select: {
          id: true,
          text: true,
        },
      },
      cell: {
        select: {
          name: true,
        },
      },
    },
  });

  if (questions.length === 0) {
    return null;
  }

  // Adaptive selection strategy based on progress in this cell
  let targetDifficulty: number;

  if (questionsAnsweredInCell === 0) {
    // First question: Start at medium difficulty
    targetDifficulty = 0;
  } else {
    // Subsequent questions: Target near current ability estimate
    targetDifficulty = userAbility;
  }

  // Calculate information value for each question using IRT
  // Information = a^2 * P(θ) * (1 - P(θ))
  // where P(θ) = 1 / (1 + exp(-a(θ - b)))

  const questionsWithScores = questions.map((q) => {
    const difficulty = q.difficulty_b;
    const discrimination = q.discrimination_a;

    // Calculate probability of correct response
    const z = discrimination * (userAbility - difficulty);
    const prob = 1 / (1 + Math.exp(-z));

    // Information is maximized when prob ≈ 0.5 (at user's ability level)
    const information = Math.pow(discrimination, 2) * prob * (1 - prob);

    // Distance penalty: prefer questions closer to target difficulty
    const distancePenalty = Math.abs(difficulty - targetDifficulty);

    // Combined score: prioritize information, then proximity
    const score = information - (0.3 * distancePenalty);

    return {
      question: q,
      score,
      information,
      difficulty,
    };
  });

  // Sort by score (descending)
  questionsWithScores.sort((a, b) => b.score - a.score);

  // Select top question
  const selected = questionsWithScores[0];

  console.log(`[Baseline] Selected question for cell ${cellId}:`, {
    difficulty: selected.difficulty.toFixed(2),
    information: selected.information.toFixed(3),
    userAbility: userAbility.toFixed(2),
    questionNumber: questionsAnsweredInCell + 1,
  });

  return {
    id: selected.question.id,
    text: selected.question.text,
    cellId: selected.question.cellId,
    cellName: selected.question.cell.name,
    difficulty_b: selected.question.difficulty_b,
    discrimination_a: selected.question.discrimination_a,
    answerOptions: selected.question.answerOptions,
  };
}

/**
 * Get baseline assessment progress
 */
export async function getBaselineProgress(
  userId: string,
  quizId: string
): Promise<BaselineProgress[]> {
  const cells = await prisma.cell.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  const answeredQuestions = await prisma.userAnswer.findMany({
    where: {
      userId,
      quizId,
    },
    include: {
      question: {
        select: {
          cellId: true,
        },
      },
    },
  });

  const cellQuestionCounts = new Map<string, number>();
  for (const answer of answeredQuestions) {
    const cellId = answer.question.cellId;
    cellQuestionCounts.set(cellId, (cellQuestionCounts.get(cellId) || 0) + 1);
  }

  const QUESTIONS_PER_CELL = 3;

  return cells.map((cell) => ({
    cellId: cell.id,
    cellName: cell.name,
    questionsAsked: cellQuestionCounts.get(cell.id) || 0,
    questionsTarget: QUESTIONS_PER_CELL,
    completed: (cellQuestionCounts.get(cell.id) || 0) >= QUESTIONS_PER_CELL,
  }));
}

/**
 * Calculate baseline assessment results summary
 */
export async function calculateBaselineResults(userId: string, quizId: string) {
  // Get all cells
  const cells = await prisma.cell.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  // Get baseline quiz answers
  const answers = await prisma.userAnswer.findMany({
    where: {
      userId,
      quizId,
    },
    include: {
      question: {
        select: {
          cellId: true,
          difficulty_b: true,
          discrimination_a: true,
        },
      },
    },
  });

  // Get current mastery estimates
  const masteryRecords = await prisma.userCellMastery.findMany({
    where: {
      userId,
      cellId: {
        in: cells.map((c) => c.id),
      },
    },
  });

  const masteryMap = new Map(
    masteryRecords.map((m) => [m.cellId, m])
  );

  // Compile results per cell
  const cellResults = cells.map((cell) => {
    const cellAnswers = answers.filter((a) => a.question.cellId === cell.id);
    const mastery = masteryMap.get(cell.id);

    const correctCount = cellAnswers.filter((a) => a.isCorrect).length;
    const totalCount = cellAnswers.length;
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

    return {
      cellId: cell.id,
      cellName: cell.name,
      abilityTheta: mastery?.ability_theta || 0,
      sem: mastery?.sem || 1,
      confidence: mastery?.confidence || 0,
      questionsAnswered: totalCount,
      correctAnswers: correctCount,
      accuracy: Math.round(accuracy),
    };
  });

  // Overall summary
  const overallCorrect = answers.filter((a) => a.isCorrect).length;
  const overallTotal = answers.length;
  const overallAccuracy = overallTotal > 0
    ? Math.round((overallCorrect / overallTotal) * 100)
    : 0;

  const averageTheta = cellResults.reduce((sum, c) => sum + c.abilityTheta, 0) / cellResults.length;

  return {
    cells: cellResults,
    overall: {
      questionsAnswered: overallTotal,
      correctAnswers: overallCorrect,
      accuracy: overallAccuracy,
      averageAbility: averageTheta,
    },
  };
}
