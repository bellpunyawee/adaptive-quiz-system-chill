import prisma from "@/lib/db";
import { calculateKullbackLeiblerInformation } from "./irt-estimator";

export interface StoppingConfig {
  minQuestions: number;
  maxQuestions: number;
  targetSEM: number;
  confidenceLevel: number;
  minInformationGain: number;
  // PSER (Predictive SEM Reduction) config
  enablePSER?: boolean;
  pserThreshold?: number; // Stop if next item would improve SEM by less than this % (e.g., 0.05 = 5%)
  // Minimum information threshold
  enableMinInfoRule?: boolean;
  minInfoThreshold?: number; // Stop if no items exceed this information threshold (e.g., 0.1)
}

const DEFAULT_CONFIG: StoppingConfig = {
  minQuestions: 5,
  maxQuestions: 30,
  targetSEM: 0.3,
  confidenceLevel: 0.95,
  minInformationGain: 0.01,
  enablePSER: true,
  pserThreshold: 0.05, // 5% improvement threshold
  enableMinInfoRule: true,
  minInfoThreshold: 0.1
};

/**
 * Get stopping configuration optimized for different quiz types
 */
export function getStoppingConfigForQuizType(quizType: string): StoppingConfig {
  switch (quizType) {
    case 'baseline':
      // Baseline assessments need to be thorough and precise
      return {
        minQuestions: 10,
        maxQuestions: 50,
        targetSEM: 0.25,  // Higher precision
        confidenceLevel: 0.95,
        minInformationGain: 0.01,
        enablePSER: true,
        pserThreshold: 0.03, // More aggressive (only 3% improvement needed)
        enableMinInfoRule: true,
        minInfoThreshold: 0.08
      };

    case 'practice-new':
    case 'practice-review':
      // Practice can be shorter and less precise (focus on exposure)
      return {
        minQuestions: 3,
        maxQuestions: 20,
        targetSEM: 0.4,   // Lower precision OK
        confidenceLevel: 0.90,
        minInformationGain: 0.02,
        enablePSER: true,
        pserThreshold: 0.10, // Stop faster (need 10% improvement to continue)
        enableMinInfoRule: true,
        minInfoThreshold: 0.15
      };

    case 'regular':
    default:
      // Regular quizzes use balanced settings
      return DEFAULT_CONFIG;
  }
}

/**
 * Calculate Standard Error of Measurement
 */
export function calculateSEM(totalInformation: number): number {
  if (totalInformation <= 0) return Infinity;
  return 1 / Math.sqrt(totalInformation);
}

/**
 * Calculate Fisher Information for 2PL IRT model
 * Fisher Information is used for SEM calculation (different from KLI used for item selection)
 * I(θ) = a² × P(θ) × (1 - P(θ))
 */
function calculateFisherInformation(
  theta: number,
  difficulty_b: number,
  discrimination_a: number
): number {
  const z = discrimination_a * (theta - difficulty_b);
  const p = 1 / (1 + Math.exp(-z));
  const pClamped = Math.max(0.01, Math.min(0.99, p));

  return discrimination_a * discrimination_a * pClamped * (1 - pClamped);
}

/**
 * Predict SEM reduction if we were to administer the next best available item
 * Returns the projected SEM and improvement percentage
 */
async function predictSEMReduction(
  userId: string,
  quizId: string,
  cellId: string,
  currentTheta: number,
  currentTotalInfo: number
): Promise<{ projectedSEM: number; improvementPct: number; nextItemInfo: number }> {
  // Get best available question for this cell
  const availableQuestions = await prisma.question.findMany({
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
    orderBy: { exposureCount: 'asc' },
    take: 10 // Check top 10 least-exposed questions
  });

  if (availableQuestions.length === 0) {
    return { projectedSEM: Infinity, improvementPct: 0, nextItemInfo: 0 };
  }

  // Find question with maximum Fisher Information at current theta
  let maxInfo = 0;
  for (const q of availableQuestions) {
    const info = calculateFisherInformation(currentTheta, q.difficulty_b, q.discrimination_a);
    if (info > maxInfo) {
      maxInfo = info;
    }
  }

  // Calculate projected information and SEM
  const projectedTotalInfo = currentTotalInfo + maxInfo;
  const currentSEM = calculateSEM(currentTotalInfo);
  const projectedSEM = calculateSEM(projectedTotalInfo);

  // Calculate improvement percentage
  const improvementPct = currentSEM > 0
    ? (currentSEM - projectedSEM) / currentSEM
    : 0;

  return { projectedSEM, improvementPct, nextItemInfo: maxInfo };
}

/**
 * Check if any remaining questions provide minimum information threshold
 * Returns true if we should stop (no informative questions left)
 */
async function checkMinimumInformationRule(
  userId: string,
  quizId: string,
  cellId: string,
  currentTheta: number,
  threshold: number
): Promise<{ shouldStop: boolean; maxAvailableInfo: number }> {
  const availableQuestions = await prisma.question.findMany({
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
    take: 20 // Check a reasonable sample
  });

  if (availableQuestions.length === 0) {
    return { shouldStop: true, maxAvailableInfo: 0 };
  }

  // Find maximum available information
  let maxInfo = 0;
  for (const q of availableQuestions) {
    const info = calculateFisherInformation(currentTheta, q.difficulty_b, q.discrimination_a);
    if (info > maxInfo) {
      maxInfo = info;
    }
  }

  return {
    shouldStop: maxInfo < threshold,
    maxAvailableInfo: maxInfo
  };
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
    // Before stopping, check PSER if enabled
    if (config.enablePSER && config.pserThreshold) {
      // Get active cells (not mastered) to check
      const activeMasteries = await prisma.userCellMastery.findMany({
        where: {
          userId,
          mastery_status: 0 // Not mastered
        }
      });

      // Check PSER for each active cell
      for (const mastery of activeMasteries) {
        const cellInfo = informationPerCell.get(mastery.cellId) || 0;
        if (cellInfo > 0) {
          const pser = await predictSEMReduction(
            userId,
            quizId,
            mastery.cellId,
            mastery.ability_theta,
            cellInfo
          );

          // If any cell would benefit significantly, continue
          if (pser.improvementPct >= config.pserThreshold) {
            console.log(`[STOPPING] PSER check: Cell ${mastery.cellId} would improve ${(pser.improvementPct * 100).toFixed(1)}%, continuing...`);
            return {
              shouldStop: false,
              reason: 'pser_suggests_continue',
              details: {
                questionCount: answerCount,
                averageSEM,
                cellsCompleted: masteredCells,
                totalCells: allCells
              }
            };
          }
        }
      }

      console.log(`[STOPPING] PSER check: All cells below ${(config.pserThreshold * 100)}% improvement threshold`);
    }

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

  // Check minimum information rule if enabled
  if (config.enableMinInfoRule && config.minInfoThreshold) {
    const activeMasteries = await prisma.userCellMastery.findMany({
      where: {
        userId,
        mastery_status: 0
      }
    });

    let anyInformativeQuestions = false;
    for (const mastery of activeMasteries) {
      const minInfoCheck = await checkMinimumInformationRule(
        userId,
        quizId,
        mastery.cellId,
        mastery.ability_theta,
        config.minInfoThreshold
      );

      if (!minInfoCheck.shouldStop) {
        anyInformativeQuestions = true;
        break;
      }
    }

    if (!anyInformativeQuestions) {
      console.log(`[STOPPING] No remaining questions exceed minimum information threshold ${config.minInfoThreshold}`);
      return {
        shouldStop: true,
        reason: 'no_informative_items_remaining',
        details: {
          questionCount: answerCount,
          averageSEM,
          cellsCompleted: masteredCells,
          totalCells: allCells
        }
      };
    }
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