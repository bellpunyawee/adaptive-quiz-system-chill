// src/lib/adaptive-engine/content-balancer.ts
import prisma from "@/lib/db";

export interface ContentBalanceConfig {
  maxQuestionsPerCell: number;
  minCellCoverage: number; // Minimum percentage of cells to cover
  diversityWeight: number; // 0-1, higher = more diverse
}

const DEFAULT_CONFIG: ContentBalanceConfig = {
  maxQuestionsPerCell: 5,
  minCellCoverage: 0.5,
  diversityWeight: 0.3
};

/**
 * Calculate content balance score for a cell
 * Lower score = should prioritize this cell more
 */
export function calculateContentBalanceScore(
  cellId: string,
  cellSelections: Map<string, number>,
  totalSelections: number,
  config: ContentBalanceConfig = DEFAULT_CONFIG
): number {
  const thisSelections = cellSelections.get(cellId) || 0;
  
  // Penalize over-represented cells
  const representationRatio = totalSelections > 0 
    ? thisSelections / totalSelections 
    : 0;
  
  // Exponential penalty for exceeding max
  const overMaxPenalty = Math.max(0, thisSelections - config.maxQuestionsPerCell);
  const penalty = Math.exp(overMaxPenalty * 0.5);
  
  return representationRatio * penalty;
}

/**
 * Adjust UCB score based on content balance
 */
export function applyContentBalancing(
  ucbScore: number,
  cellId: string,
  cellSelections: Map<string, number>,
  totalSelections: number,
  config: ContentBalanceConfig = DEFAULT_CONFIG
): number {
  const balanceScore = calculateContentBalanceScore(
    cellId,
    cellSelections,
    totalSelections,
    config
  );
  
  // Reduce UCB for over-represented cells
  const adjustment = 1 - (balanceScore * config.diversityWeight);
  
  return ucbScore * Math.max(0.1, adjustment); // Never reduce below 10%
}

/**
 * Check if quiz meets minimum diversity requirements
 */
export async function checkContentDiversity(
  userId: string,
  quizId: string,
  config: ContentBalanceConfig = DEFAULT_CONFIG
): Promise<{
  isDiverse: boolean;
  cellCoverage: number;
  recommendations: string[];
}> {
  // Get all available cells
  const allCells = await prisma.cell.findMany({
    select: { id: true, name: true }
  });
  
  // Get answered questions in this quiz
  const answers = await prisma.userAnswer.findMany({
    where: { userId, quizId },
    include: {
      question: {
        select: { cellId: true }
      }
    }
  });
  
  // Count cells covered
  const coveredCells = new Set(answers.map((a) => a.question.cellId));
  const cellCoverage = coveredCells.size / allCells.length;
  
  // Check cell distribution
  const cellCounts = new Map<string, number>();
  answers.forEach((a) => {
    const count = cellCounts.get(a.question.cellId) || 0;
    cellCounts.set(a.question.cellId, count + 1);
  });
  
  const recommendations: string[] = [];
  
  // Check if any cell is over-represented
  cellCounts.forEach((count: number, cellId: string) => {
    if (count > config.maxQuestionsPerCell) {
      const cell = allCells.find(c => c.id === cellId);
      recommendations.push(
        `Cell "${cell?.name}" has ${count} questions, exceeding the limit of ${config.maxQuestionsPerCell}`
      );
    }
  });
  
  // Check if coverage is sufficient
  if (cellCoverage < config.minCellCoverage) {
    recommendations.push(
      `Only ${(cellCoverage * 100).toFixed(0)}% of cells covered. Aim for at least ${(config.minCellCoverage * 100).toFixed(0)}%`
    );
  }
  
  return {
    isDiverse: cellCoverage >= config.minCellCoverage && recommendations.length === 0,
    cellCoverage,
    recommendations
  };
}

/**
 * Get cell selection statistics for balancing
 */
export async function getCellSelectionStats(
  userId: string,
  quizId: string
): Promise<{
  cellSelections: Map<string, number>;
  totalSelections: number;
}> {
  const answers = await prisma.userAnswer.findMany({
    where: { userId, quizId },
    include: {
      question: {
        select: { cellId: true }
      }
    }
  });
  
  const cellSelections = new Map<string, number>();
  
  answers.forEach((a) => {
    const count = cellSelections.get(a.question.cellId) || 0;
    cellSelections.set(a.question.cellId, count + 1);
  });
  
  return {
    cellSelections,
    totalSelections: answers.length
  };
}