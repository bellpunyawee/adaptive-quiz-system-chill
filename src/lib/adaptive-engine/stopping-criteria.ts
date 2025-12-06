import prisma from "@/lib/db";
import { calculateKullbackLeiblerInformation } from "./irt-estimator";
import {
  getConfig as getConvergenceConfig,
  shouldUseDistributionAwareConvergence,
  getAdaptiveSEMThreshold,
  getOptimalDifficultyRange,
  type DistributionAwareConvergenceConfig,
} from "./convergence-config";

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
  pserThreshold: 0.05, // SELECTIVE ROLLBACK: reverted to 0.05 (0.03 hurt reliability)
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
 * Check if difficulty-specific question pool is exhausted
 *
 * Distribution-aware exhaustion detection: checks if optimal difficulty range
 * for current theta has sufficient questions available.
 *
 * Part of Phase 3 solution for U-shaped pool distribution (68.7% at extremes).
 *
 * @param userId - User ID
 * @param quizId - Quiz ID
 * @param cellId - Cell (topic) ID
 * @param currentTheta - Current ability estimate
 * @param config - Convergence configuration
 * @returns Exhaustion check result
 */
async function checkDifficultyRangeExhaustion(
  userId: string,
  quizId: string,
  cellId: string,
  currentTheta: number,
  config: DistributionAwareConvergenceConfig
): Promise<{
  isExhausted: boolean;
  availableCount: number;
  optimalRange: { minDifficulty: number; maxDifficulty: number };
  allAvailableCount: number;
}> {
  // Calculate optimal difficulty range based on theta
  const optimalRange = getOptimalDifficultyRange(currentTheta);

  console.log(
    `[EXHAUSTION] Checking pool for cell ${cellId}, θ=${currentTheta.toFixed(2)}, ` +
    `optimal range: [${optimalRange.minDifficulty.toFixed(2)}, ${optimalRange.maxDifficulty.toFixed(2)}]`
  );

  // Query questions in optimal difficulty range
  const questionsInRange = await prisma.question.findMany({
    where: {
      cellId,
      isActive: true,
      difficulty_b: {
        gte: optimalRange.minDifficulty,
        lte: optimalRange.maxDifficulty,
      },
      userAnswers: {
        none: {
          userId,
          quizId,
        },
      },
    },
  });

  // Also get total available questions (for rescue logic)
  const allAvailableQuestions = await prisma.question.findMany({
    where: {
      cellId,
      isActive: true,
      userAnswers: {
        none: {
          userId,
          quizId,
        },
      },
    },
  });

  const availableCount = questionsInRange.length;
  const allAvailableCount = allAvailableQuestions.length;
  const threshold = config.poolExhaustion.minQuestionsThreshold;
  const isExhausted = availableCount < threshold;

  console.log(
    `[EXHAUSTION] Available in optimal range: ${availableCount}, ` +
    `all available: ${allAvailableCount}, ` +
    `threshold: ${threshold}, ` +
    `exhausted: ${isExhausted ? 'YES' : 'NO'}`
  );

  return {
    isExhausted,
    availableCount,
    optimalRange,
    allAvailableCount,
  };
}

/**
 * Execute rescue logic when pool exhaustion detected
 *
 * 4-step graceful degradation cascade:
 * 1. Relax difficulty range to ±0.75 (from ±0.5)
 * 2. Relax further to ±1.0
 * 3. Relax SEM threshold by +0.1
 * 4. Hard stop (mark cell complete)
 *
 * Philosophy: Gathering imperfect data > gathering no data
 * IRT is robust to moderate difficulty mismatch.
 *
 * @param userId - User ID
 * @param quizId - Quiz ID
 * @param cellId - Cell ID
 * @param currentTheta - Current ability estimate
 * @param exhaustionInfo - Result from checkDifficultyRangeExhaustion
 * @param currentSEMThreshold - Current SEM threshold
 * @param config - Convergence configuration
 * @returns Rescue action decision
 */
async function executeRescueLogic(
  userId: string,
  quizId: string,
  cellId: string,
  currentTheta: number,
  exhaustionInfo: {
    isExhausted: boolean;
    availableCount: number;
    optimalRange: { minDifficulty: number; maxDifficulty: number };
    allAvailableCount: number;
  },
  currentSEMThreshold: number,
  config: DistributionAwareConvergenceConfig
): Promise<{
  action: 'continue' | 'stop';
  reason: string;
  adjustedRange?: { minDifficulty: number; maxDifficulty: number };
  adjustedSEMThreshold?: number;
  degradationStep?: number;
}> {
  const threshold = config.poolExhaustion.minQuestionsThreshold;
  const verbose = config.rescue.logVerbose;

  console.log(`[RESCUE] Initiating rescue logic for cell ${cellId}, θ=${currentTheta.toFixed(2)}`);

  // Step 1: Relax to ±0.75 (width multiplier 1.5)
  const step1Width = config.rescue.degradationSteps[0] || 1.5;
  const step1Range = getOptimalDifficultyRange(currentTheta, step1Width);

  const step1Questions = await prisma.question.findMany({
    where: {
      cellId,
      isActive: true,
      difficulty_b: {
        gte: step1Range.minDifficulty,
        lte: step1Range.maxDifficulty,
      },
      userAnswers: {
        none: {
          userId,
          quizId,
        },
      },
    },
  });

  if (step1Questions.length >= threshold) {
    console.log(
      `[RESCUE] Step 1 SUCCESS: Found ${step1Questions.length} questions in relaxed range ` +
      `[${step1Range.minDifficulty.toFixed(2)}, ${step1Range.maxDifficulty.toFixed(2)}] (±${step1Width / 2})`
    );
    return {
      action: 'continue',
      reason: 'rescue_step1_relaxed_difficulty',
      adjustedRange: step1Range,
      degradationStep: 1,
    };
  }

  if (verbose) {
    console.log(
      `[RESCUE] Step 1 FAILED: Only ${step1Questions.length} questions in ±${step1Width / 2} range, ` +
      `need ${threshold}`
    );
  }

  // Step 2: Relax further to ±1.0 (width multiplier 2.0)
  const step2Width = config.rescue.degradationSteps[1] || 2.0;
  const step2Range = getOptimalDifficultyRange(currentTheta, step2Width);

  const step2Questions = await prisma.question.findMany({
    where: {
      cellId,
      isActive: true,
      difficulty_b: {
        gte: step2Range.minDifficulty,
        lte: step2Range.maxDifficulty,
      },
      userAnswers: {
        none: {
          userId,
          quizId,
        },
      },
    },
  });

  if (step2Questions.length >= threshold) {
    console.log(
      `[RESCUE] Step 2 SUCCESS: Found ${step2Questions.length} questions in further relaxed range ` +
      `[${step2Range.minDifficulty.toFixed(2)}, ${step2Range.maxDifficulty.toFixed(2)}] (±${step2Width / 2})`
    );
    return {
      action: 'continue',
      reason: 'rescue_step2_relaxed_further',
      adjustedRange: step2Range,
      degradationStep: 2,
    };
  }

  if (verbose) {
    console.log(
      `[RESCUE] Step 2 FAILED: Only ${step2Questions.length} questions in ±${step2Width / 2} range, ` +
      `need ${threshold}`
    );
  }

  // Step 3: Relax SEM threshold (accept lower precision)
  if (exhaustionInfo.allAvailableCount >= threshold) {
    const adjustedSEM = currentSEMThreshold + config.rescue.semRelaxation;
    console.log(
      `[RESCUE] Step 3 SUCCESS: Relaxing SEM threshold from ${currentSEMThreshold.toFixed(3)} ` +
      `to ${adjustedSEM.toFixed(3)} (+${config.rescue.semRelaxation}). ` +
      `${exhaustionInfo.allAvailableCount} questions available (any difficulty)`
    );
    return {
      action: 'continue',
      reason: 'rescue_step3_relaxed_sem',
      adjustedSEMThreshold: adjustedSEM,
      degradationStep: 3,
    };
  }

  if (verbose) {
    console.log(
      `[RESCUE] Step 3 FAILED: Only ${exhaustionInfo.allAvailableCount} total questions available, ` +
      `need ${threshold}`
    );
  }

  // Step 4: Hard stop (pool completely exhausted)
  console.log(
    `[RESCUE] Step 4: Pool completely exhausted for cell ${cellId}. ` +
    `Marking cell as complete. ` +
    `Only ${exhaustionInfo.allAvailableCount} questions remain.`
  );

  return {
    action: 'stop',
    reason: 'pool_completely_exhausted',
    degradationStep: 4,
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

  // ===== CHECK DISTRIBUTION-AWARE CONVERGENCE FEATURE FLAG =====
  const useDistributionAware = shouldUseDistributionAwareConvergence(userId);
  const convergenceConfig = useDistributionAware ? getConvergenceConfig() : null;

  console.log(
    `[STOPPING] Distribution-Aware Convergence: ${useDistributionAware ? 'ENABLED' : 'DISABLED'}` +
    (useDistributionAware ? ` (Traffic: ${convergenceConfig!.trafficAllocation}%)` : '')
  );

  // ===== FETCH QUIZ SETTINGS FOR MAX QUESTIONS =====
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { maxQuestions: true, quizType: true }
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

  // ===== CALCULATE EFFECTIVE TARGET SEM (ADAPTIVE IF ENABLED) =====
  let effectiveTargetSEM = config.targetSEM;

  if (useDistributionAware && convergenceConfig) {
    // Calculate weighted average of adaptive thresholds across active cells
    const activeMasteries = await prisma.userCellMastery.findMany({
      where: { userId, mastery_status: 0 }
    });

    if (activeMasteries.length > 0) {
      const quizType = quiz?.quizType || 'regular';
      const adaptiveThresholds = activeMasteries.map(m =>
        getAdaptiveSEMThreshold(m.ability_theta, quizType)
      );
      effectiveTargetSEM =
        adaptiveThresholds.reduce((sum, t) => sum + t, 0) / adaptiveThresholds.length;

      console.log(
        `[STOPPING] Using adaptive SEM threshold: ${effectiveTargetSEM.toFixed(3)} ` +
        `(vs fixed: ${config.targetSEM.toFixed(3)})`
      );
    }
  }

  // Check if precision target is met
  if (averageSEM <= effectiveTargetSEM) {
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

  // ===== POOL EXHAUSTION CHECK (DISTRIBUTION-AWARE CONVERGENCE) =====
  if (useDistributionAware && convergenceConfig?.poolExhaustion.enableDetection) {
    const activeMasteries = await prisma.userCellMastery.findMany({
      where: {
        userId,
        mastery_status: 0
      }
    });

    for (const mastery of activeMasteries) {
      const exhaustionCheck = await checkDifficultyRangeExhaustion(
        userId,
        quizId,
        mastery.cellId,
        mastery.ability_theta,
        convergenceConfig
      );

      if (exhaustionCheck.isExhausted) {
        console.log(
          `[STOPPING] Pool exhaustion detected for cell ${mastery.cellId} ` +
          `(θ=${mastery.ability_theta.toFixed(2)})`
        );
        console.log(
          `[STOPPING] Available in optimal range [${exhaustionCheck.optimalRange.minDifficulty.toFixed(2)}, ` +
          `${exhaustionCheck.optimalRange.maxDifficulty.toFixed(2)}]: ${exhaustionCheck.availableCount}`
        );

        const rescueResult = await executeRescueLogic(
          userId,
          quizId,
          mastery.cellId,
          mastery.ability_theta,
          exhaustionCheck,
          effectiveTargetSEM,
          convergenceConfig
        );

        if (rescueResult.action === 'stop') {
          // Mark cell complete
          await prisma.userCellMastery.update({
            where: {
              userId_cellId: {
                userId,
                cellId: mastery.cellId
              }
            },
            data: { mastery_status: 1 }
          });

          console.log(`[STOPPING] Cell ${mastery.cellId} marked as complete due to pool exhaustion`);

          // If this was the last active cell, stop quiz
          if (activeMasteries.length === 1) {
            return {
              shouldStop: true,
              reason: 'difficulty_range_exhausted',
              details: {
                questionCount: answerCount,
                averageSEM,
                cellsCompleted: masteredCells + 1,
                totalCells: allCells
              }
            };
          }
        }
      }
    }
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