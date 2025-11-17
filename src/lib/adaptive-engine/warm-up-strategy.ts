import prisma from "@/lib/db";

/**
 * Get initial theta estimate using correlated cell abilities
 * If user has mastery data from other cells, use weighted average
 * Otherwise return default prior (0)
 */
export async function getInitialThetaEstimate(
  userId: string,
  targetCellId: string
): Promise<{ theta: number; source: string }> {
  // Get user's mastery in other cells
  const otherMasteries = await prisma.userCellMastery.findMany({
    where: {
      userId,
      cellId: { not: targetCellId }
    },
    orderBy: { updatedAt: 'desc' },
    take: 5 // Use most recent 5 cells
  });

  if (otherMasteries.length === 0) {
    return { theta: 0, source: 'default_prior' };
  }

  // Simple approach: use average of other cell abilities
  // In future, could weight by correlation between cells
  const totalTheta = otherMasteries.reduce((sum, m) => sum + m.ability_theta, 0);
  const averageTheta = totalTheta / otherMasteries.length;

  // Regress slightly toward mean (0) to be conservative
  const regressionFactor = 0.7; // 70% weight to observed, 30% to prior
  const estimatedTheta = averageTheta * regressionFactor;

  return {
    theta: estimatedTheta,
    source: `correlated_cells_n${otherMasteries.length}`
  };
}

/**
 * Select a good warm-up question for initial assessment
 * Criteria:
 * - Medium difficulty (close to estimated theta)
 * - High discrimination (informative)
 * - Not overexposed
 * - Random selection within pool to avoid always same first question
 */
export async function selectWarmupQuestion(
  userId: string,
  quizId: string,
  cellId: string,
  initialTheta: number
) {
  // Define warm-up pool criteria (SELECTIVE ROLLBACK: kept wider range ±1.2, reverted discrimination to 1.0)
  const difficultyRange = 1.2; // ±1.2 from initial theta (KEPT - helps optimal questions)
  const minDiscrimination = 1.0; // High discrimination questions only (REVERTED - 1.2 was too restrictive)

  const warmupPool = await prisma.question.findMany({
    where: {
      cellId,
      isActive: true,
      difficulty_b: {
        gte: initialTheta - difficultyRange,
        lte: initialTheta + difficultyRange
      },
      discrimination_a: {
        gte: minDiscrimination
      },
      // Not already answered in this quiz
      userAnswers: {
        none: {
          userId,
          quizId
        }
      }
    },
    orderBy: [
      { exposureCount: 'asc' },  // Prefer less exposed
      { lastUsed: 'asc' }        // Prefer least recently used
    ],
    take: 5, // Get top 5 candidates
    include: { answerOptions: true }
  });

  if (warmupPool.length === 0) {
    // Fallback: just get any available question
    return prisma.question.findFirst({
      where: {
        cellId,
        isActive: true,
        userAnswers: {
          none: {
            userId,
            quizId
          }
        }
      },
      include: { answerOptions: true }
    });
  }

  // Randomly select from top 5 to avoid always same first question
  const randomIndex = Math.floor(Math.random() * warmupPool.length);
  return warmupPool[randomIndex];
}
