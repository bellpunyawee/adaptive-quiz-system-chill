// src/lib/adaptive-engine/irt-estimator.ts
// Pure TypeScript implementation - NO external dependencies required
import prisma from "@/lib/db";

/**
 * Maximum Likelihood Estimation for 2PL IRT Model
 * Estimates user ability (theta) given question parameters and response pattern
 * 
 * This is a pure TypeScript implementation using Newton-Raphson method
 * No external IRT libraries needed!
 */
export function estimateAbilityMLE(
  responses: { difficulty_b: number; discrimination_a: number; isCorrect: boolean }[],
  initialTheta: number = 0,
  maxIterations: number = 50,
  tolerance: number = 0.001
): number {
  if (responses.length === 0) return 0;

  let theta = initialTheta;

  for (let iter = 0; iter < maxIterations; iter++) {
    let firstDerivative = 0;
    let secondDerivative = 0;

    for (const item of responses) {
      const z = item.discrimination_a * (theta - item.difficulty_b);
      const p = 1 / (1 + Math.exp(-z));
      
      // Clamp probability to avoid numerical issues
      const pClamped = Math.max(0.0001, Math.min(0.9999, p));
      
      // First derivative (score function)
      // u_i = a_i * (x_i - p_i)
      const score = item.discrimination_a * ((item.isCorrect ? 1 : 0) - pClamped);
      firstDerivative += score;
      
      // Second derivative (information)
      // I_i = a_i^2 * p_i * (1 - p_i)
      const information = item.discrimination_a * item.discrimination_a * pClamped * (1 - pClamped);
      secondDerivative -= information;
    }

    // Check for convergence issues
    if (Math.abs(secondDerivative) < 1e-10) {
      console.warn('[IRT] Second derivative too small, stopping iteration');
      break;
    }
    
    // Newton-Raphson update: θ(n+1) = θ(n) - f'(θ) / f''(θ)
    const delta = -firstDerivative / secondDerivative;
    
    // Add step size control to prevent overshooting
    const stepSize = Math.min(1.0, Math.abs(1.0 / (iter + 1)));
    theta += delta * stepSize;

    // Check convergence
    if (Math.abs(delta) < tolerance) {
      break;
    }
    
    // Prevent theta from going to extreme values during iteration
    theta = Math.max(-3, Math.min(3, theta));
  }

  // Final constraint to reasonable bounds
  return Math.max(-4, Math.min(4, theta));
}

/**
 * Calculate the probability of correct response using 2PL IRT model
 */
export function calculateProbability(
  theta: number,
  difficulty_b: number,
  discrimination_a: number
): number {
  const z = discrimination_a * (theta - difficulty_b);
  return 1 / (1 + Math.exp(-z));
}

/**
 * Calculate Fisher Information at a given ability level
 * This tells us how informative a question is for measuring ability
 */
export function calculateFisherInformation(
  theta: number,
  difficulty_b: number,
  discrimination_a: number
): number {
  const p = calculateProbability(theta, difficulty_b, discrimination_a);
  return discrimination_a * discrimination_a * p * (1 - p);
}

/**
 * Estimate question parameters using Marginal Maximum Likelihood
 * This is computationally intensive and should be run periodically, not in real-time
 */
export async function estimateQuestionParameters(questionId: string) {
  // Fetch all responses to this question
  const responses = await prisma.userAnswer.findMany({
    where: { questionId },
    include: {
      user: {
        include: {
          userCellMastery: {
            include: { cell: true }
          }
        }
      },
      question: {
        include: { cell: true }
      }
    }
  });

  if (responses.length < 30) {
    // Not enough data for reliable estimation
    return null;
  }

  // Extract user abilities and responses
  const data = responses.map(r => {
    const mastery = r.user.userCellMastery.find(m => m.cellId === r.question.cellId);
    return {
      theta: mastery?.ability_theta || 0,
      isCorrect: r.isCorrect
    };
  });

  // Calculate proportion correct
  const pCorrect = data.filter(d => d.isCorrect).length / data.length;

  // Estimate difficulty (b parameter)
  // For a perfect discriminating item, b = theta where p(theta) = 0.5
  const sortedByTheta = [...data].sort((a, b) => a.theta - b.theta);
  const medianIndex = Math.floor(sortedByTheta.length / 2);
  let estimatedDifficulty = sortedByTheta[medianIndex].theta;

  // Estimate discrimination (a parameter) using point-biserial correlation
  const meanThetaCorrect = data.filter(d => d.isCorrect)
    .reduce((sum, d) => sum + d.theta, 0) / data.filter(d => d.isCorrect).length;
  
  const meanThetaIncorrect = data.filter(d => !d.isCorrect)
    .reduce((sum, d) => sum + d.theta, 0) / data.filter(d => !d.isCorrect).length;

  const overallMean = data.reduce((sum, d) => sum + d.theta, 0) / data.length;
  const variance = data.reduce((sum, d) => sum + Math.pow(d.theta - overallMean, 2), 0) / data.length;
  const sd = Math.sqrt(variance);

  // Point-biserial correlation as proxy for discrimination
  const pointBiserial = ((meanThetaCorrect - meanThetaIncorrect) / sd) * 
    Math.sqrt(pCorrect * (1 - pCorrect));

  // Convert correlation to discrimination parameter (approximate)
  const estimatedDiscrimination = Math.max(0.5, Math.min(2.5, pointBiserial * 1.7));

  return {
    difficulty_b: estimatedDifficulty,
    discrimination_a: estimatedDiscrimination
  };
}

/**
 * Main function to recalibrate all IRT parameters for a user
 */
export async function recalibrateUserParameters(userId: string): Promise<void> {
  console.log(`[IRT] Starting parameter recalibration for user: ${userId}`);

  // Get all cells for this user
  const userMasteries = await prisma.userCellMastery.findMany({
    where: { userId },
    include: { cell: true }
  });

  // Update ability estimate for each cell
  for (const mastery of userMasteries) {
    const cellAnswers = await prisma.userAnswer.findMany({
      where: {
        userId,
        question: { cellId: mastery.cellId }
      },
      include: {
        question: true
      }
    });

    if (cellAnswers.length === 0) continue;

    // Prepare data for MLE
    const responses = cellAnswers.map(ans => ({
      difficulty_b: ans.question.difficulty_b,
      discrimination_a: ans.question.discrimination_a,
      isCorrect: ans.isCorrect
    }));

    // Estimate new ability
    const newTheta = estimateAbilityMLE(responses, mastery.ability_theta);

    // Update database
    await prisma.userCellMastery.update({
      where: { id: mastery.id },
      data: { ability_theta: newTheta }
    });

    console.log(`[IRT] Updated ability for cell ${mastery.cell.name}: ${mastery.ability_theta.toFixed(2)} → ${newTheta.toFixed(2)}`);
  }
}

/**
 * Background job to recalibrate question parameters
 * Should be run periodically (e.g., nightly) for questions with sufficient data
 */
export async function recalibrateQuestionParameters(): Promise<void> {
  console.log('[IRT] Starting question parameter recalibration');

  const questions = await prisma.question.findMany({
    include: {
      userAnswers: true
    }
  });

  let updatedCount = 0;

  for (const question of questions) {
    if (question.userAnswers.length < 30) continue;

    const newParams = await estimateQuestionParameters(question.id);
    
    if (newParams) {
      await prisma.question.update({
        where: { id: question.id },
        data: {
          difficulty_b: newParams.difficulty_b,
          discrimination_a: newParams.discrimination_a
        }
      });
      updatedCount++;
    }
  }

  console.log(`[IRT] Recalibrated ${updatedCount} questions`);
}