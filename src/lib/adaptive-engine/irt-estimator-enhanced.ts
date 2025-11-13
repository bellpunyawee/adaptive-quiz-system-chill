// src/lib/adaptive-engine/irt-estimator-enhanced.ts

import prisma from "@/lib/db";
import {
  calculate3PLProbability,
  calculate2PLProbability,
  calculate3PLInformation,
  calculate2PLInformation,
  type IrtParameters
} from './irt-3pl';

/**
 * Response data structure for IRT estimation (supports both 2PL and 3PL)
 */
export interface IRTResponse {
  difficulty_b: number;
  discrimination_a: number;
  guessing_c?: number;      // Optional: for 3PL model
  irtModel?: '2PL' | '3PL'; // Optional: model type
  isCorrect: boolean;
}

/**
 * IRT estimation result with confidence metrics
 */
export interface AbilityEstimate {
  theta: number;           // Ability estimate
  sem: number;            // Standard Error of Measurement
  confidence: number;     // Confidence level (0-1)
  method: 'EAP' | 'MLE';  // Estimation method used
}

/**
 * Calculate probability of correct response (supports 2PL and 3PL)
 */
export function calculateProbability(
  theta: number,
  difficulty_b: number,
  discrimination_a: number,
  guessing_c: number = 0
): number {
  if (guessing_c > 0.01) {
    // Use 3PL model
    return calculate3PLProbability(theta, {
      a: discrimination_a,
      b: difficulty_b,
      c: guessing_c
    });
  } else {
    // Use 2PL model
    return calculate2PLProbability(theta, discrimination_a, difficulty_b);
  }
}

/**
 * Calculate Fisher Information at a given theta (supports 2PL and 3PL)
 */
export function calculateInformation(
  theta: number,
  difficulty_b: number,
  discrimination_a: number,
  guessing_c: number = 0
): number {
  if (guessing_c > 0.01) {
    // Use 3PL information function
    return calculate3PLInformation(theta, {
      a: discrimination_a,
      b: difficulty_b,
      c: guessing_c
    });
  } else {
    // Use 2PL information function
    return calculate2PLInformation(theta, discrimination_a, difficulty_b);
  }
}

/**
 * Calculate Standard Error of Measurement (supports 2PL and 3PL)
 * SEM = 1 / sqrt(Information)
 */
export function calculateSEM(
  theta: number,
  responses: IRTResponse[]
): number {
  if (responses.length === 0) return Infinity;

  const totalInformation = responses.reduce((sum, r) => {
    return sum + calculateInformation(
      theta,
      r.difficulty_b,
      r.discrimination_a,
      r.guessing_c || 0
    );
  }, 0);

  if (totalInformation === 0) return Infinity;
  return 1 / Math.sqrt(totalInformation);
}

/**
 * Maximum Likelihood Estimation (MLE) using Newton-Raphson
 * Best for users with 5+ responses
 * 
 * @param responses - Array of item responses
 * @param initialTheta - Starting ability estimate
 * @param maxIterations - Maximum iteration count
 * @param tolerance - Convergence threshold
 */
export function estimateAbilityMLE(
  responses: IRTResponse[],
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
      const p = calculateProbability(
        theta,
        item.difficulty_b,
        item.discrimination_a,
        item.guessing_c || 0
      );

      // Clamp probability to avoid numerical issues
      const pClamped = Math.max(0.0001, Math.min(0.9999, p));

      // For 3PL, the derivatives are more complex
      const c = item.guessing_c || 0;

      if (c > 0.01) {
        // 3PL derivatives
        const pStar = pClamped - c;
        const qStar = 1 - c;

        // First derivative for 3PL
        const score = (item.discrimination_a * pStar * (qStar - pStar) / qStar) *
          ((item.isCorrect ? 1 : 0) - pClamped) / (pClamped * (1 - pClamped));
        firstDerivative += score;

        // Second derivative (information) for 3PL
        const information = calculateInformation(
          theta,
          item.difficulty_b,
          item.discrimination_a,
          c
        );
        secondDerivative -= information;
      } else {
        // 2PL derivatives (original logic)
        const score = item.discrimination_a * ((item.isCorrect ? 1 : 0) - pClamped);
        firstDerivative += score;

        const information = item.discrimination_a * item.discrimination_a * pClamped * (1 - pClamped);
        secondDerivative -= information;
      }
    }

    // Check for convergence issues
    if (Math.abs(secondDerivative) < 1e-10) {
      console.warn('[IRT-MLE] Second derivative too small, stopping iteration');
      break;
    }
    
    // Newton-Raphson update: θ(n+1) = θ(n) - f'(θ) / f''(θ)
    const delta = -firstDerivative / secondDerivative;
    
    // Adaptive step size to prevent overshooting
    const stepSize = Math.min(1.0, 1.0 / Math.sqrt(iter + 1));
    theta += delta * stepSize;

    // Check convergence
    if (Math.abs(delta) < tolerance) {
      break;
    }
    
    // Constrain to reasonable bounds during iteration
    theta = Math.max(-3, Math.min(3, theta));
  }

  // Final constraint to reasonable bounds
  return Math.max(-4, Math.min(4, theta));
}

/**
 * Expected A Posteriori (EAP) Estimation using Bayesian approach
 * Better for users with < 5 responses (more stable than MLE)
 * 
 * Uses numerical integration over a discrete theta grid
 * 
 * @param responses - Array of item responses
 * @param priorMean - Prior distribution mean (population average)
 * @param priorSD - Prior distribution standard deviation
 * @param gridPoints - Number of quadrature points (more = more accurate)
 */
export function estimateAbilityEAP(
  responses: IRTResponse[],
  priorMean: number = 0,
  priorSD: number = 1,
  gridPoints: number = 49
): number {
  if (responses.length === 0) return priorMean;

  // Create theta grid from -4 to +4
  const thetaMin = -4;
  const thetaMax = 4;
  const thetaStep = (thetaMax - thetaMin) / (gridPoints - 1);
  
  const quadraturePoints: Array<{ theta: number; weight: number }> = [];
  
  // Gaussian quadrature weights and points
  for (let i = 0; i < gridPoints; i++) {
    const theta = thetaMin + i * thetaStep;
    
    // Prior probability: Normal(priorMean, priorSD)
    const zScore = (theta - priorMean) / priorSD;
    const priorProb = Math.exp(-0.5 * zScore * zScore) / (priorSD * Math.sqrt(2 * Math.PI));
    
    // Likelihood: Product of response probabilities (supports 2PL and 3PL)
    let likelihood = 1.0;
    for (const item of responses) {
      const p = calculateProbability(
        theta,
        item.difficulty_b,
        item.discrimination_a,
        item.guessing_c || 0
      );
      const pClamped = Math.max(0.0001, Math.min(0.9999, p));

      // P(response | theta) = p^x × (1-p)^(1-x)
      likelihood *= item.isCorrect ? pClamped : (1 - pClamped);
    }
    
    // Posterior ∝ Prior × Likelihood
    const posterior = priorProb * likelihood;
    
    quadraturePoints.push({ theta, weight: posterior });
  }
  
  // Normalize weights
  const totalWeight = quadraturePoints.reduce((sum, point) => sum + point.weight, 0);
  
  if (totalWeight === 0) {
    console.warn('[IRT-EAP] Total weight is zero, returning prior mean');
    return priorMean;
  }
  
  // Calculate expected value: E[θ | responses] = Σ(θ × P(θ | responses))
  const eapEstimate = quadraturePoints.reduce((sum, point) => {
    return sum + point.theta * (point.weight / totalWeight);
  }, 0);
  
  return Math.max(-4, Math.min(4, eapEstimate));
}

/**
 * Adaptive ability estimation - automatically chooses best method
 * 
 * Strategy:
 * - < 3 responses: Return prior (not enough data)
 * - 3-5 responses: Use EAP (more stable)
 * - 5+ responses: Use MLE (more accurate)
 */
export function estimateAbility(
  responses: IRTResponse[],
  priorMean: number = 0,
  priorSD: number = 1,
  currentTheta?: number
): AbilityEstimate {
  const responseCount = responses.length;
  
  // Not enough data - return prior
  if (responseCount < 3) {
    return {
      theta: priorMean,
      sem: Infinity,
      confidence: 0,
      method: 'EAP'
    };
  }
  
  // Few responses - use EAP (Bayesian estimation)
  if (responseCount < 5) {
    const theta = estimateAbilityEAP(responses, priorMean, priorSD);
    const sem = calculateSEM(theta, responses);
    const confidence = Math.min(1, responseCount / 10); // Scale confidence by response count
    
    return {
      theta,
      sem,
      confidence,
      method: 'EAP'
    };
  }
  
  // Sufficient responses - use MLE
  const initialTheta = currentTheta ?? priorMean;
  const theta = estimateAbilityMLE(responses, initialTheta);
  const sem = calculateSEM(theta, responses);
  
  // Confidence based on SEM: lower SEM = higher confidence
  // SEM typically ranges from 0.2 (high precision) to 1.0 (low precision)
  const confidence = Math.max(0, Math.min(1, 1 - sem / 2));
  
  return {
    theta,
    sem,
    confidence,
    method: 'MLE'
  };
}

/**
 * Calculate Kullback-Leibler Information (KLI)
 * Measures how informative a question is for the learner (supports 2PL and 3PL)
 */
export function calculateKullbackLeiblerInformation(
  theta: number,
  difficulty_b: number,
  discrimination_a: number,
  guessing_c: number = 0
): number {
  const p_theta = calculateProbability(theta, difficulty_b, discrimination_a, guessing_c);
  const p_clamped = Math.max(0.01, Math.min(0.99, p_theta));

  // Prior distribution (uniform: 50% chance)
  const q_x = 0.5;

  // KL Divergence: KL(P||Q) = p×log(p/q) + (1-p)×log((1-p)/(1-q))
  const term1 = p_clamped * Math.log(p_clamped / q_x);
  const term2 = (1 - p_clamped) * Math.log((1 - p_clamped) / (1 - q_x));

  if (!isFinite(term1) || !isFinite(term2)) {
    return 0;
  }

  return Math.max(0, term1 + term2);
}

/**
 * Recalibrate user parameters for all cells
 * Updates ability estimates based on all responses
 */
export async function recalibrateUserParameters(userId: string): Promise<void> {
  console.log(`[IRT] Starting parameter recalibration for user: ${userId}`);

  const userMasteries = await prisma.userCellMastery.findMany({
    where: { userId },
    include: { cell: true }
  });

  for (const mastery of userMasteries) {
    const cellAnswers = await prisma.userAnswer.findMany({
      where: {
        userId,
        question: { cellId: mastery.cellId }
      },
      include: { question: true }
    });

    if (cellAnswers.length === 0) continue;

    // Prepare responses for estimation (includes 3PL parameters)
    const responses: IRTResponse[] = cellAnswers.map(ans => ({
      difficulty_b: ans.question.difficulty_b,
      discrimination_a: ans.question.discrimination_a,
      guessing_c: ans.question.guessing_c || 0,
      irtModel: (ans.question.irtModel as '2PL' | '3PL') || '2PL',
      isCorrect: ans.isCorrect
    }));

    // Use adaptive estimation
    const estimate = estimateAbility(responses, 0, 1, mastery.ability_theta);

    // Update database with enhanced metrics
    await prisma.userCellMastery.update({
      where: { id: mastery.id },
      data: {
        ability_theta: estimate.theta,
        sem: estimate.sem,
        confidence: estimate.confidence,
        lastEstimated: new Date(),
        responseCount: responses.length
      }
    });

    console.log(
      `[IRT] Updated ${mastery.cell.name}: θ=${estimate.theta.toFixed(2)}, ` +
      `SEM=${estimate.sem.toFixed(3)}, confidence=${estimate.confidence.toFixed(2)}, ` +
      `method=${estimate.method}`
    );
  }
}

/**
 * Estimate question parameters from response data
 * Used for periodic recalibration of item bank
 */
export async function estimateQuestionParameters(
  questionId: string
): Promise<{ difficulty_b: number; discrimination_a: number } | null> {
  const answers = await prisma.userAnswer.findMany({
    where: { questionId },
    include: {
      user: {
        include: {
          userCellMastery: {
            where: {
              cellId: (await prisma.question.findUnique({
                where: { id: questionId },
                select: { cellId: true }
              }))?.cellId ?? ''
            }
          }
        }
      }
    }
  });

  if (answers.length < 30) {
    console.log(`[IRT] Question ${questionId}: Insufficient data (${answers.length} < 30)`);
    return null;
  }

  // Prepare data
  const data = answers
    .map(ans => {
      const mastery = ans.user.userCellMastery[0];
      return mastery
        ? { theta: mastery.ability_theta, isCorrect: ans.isCorrect }
        : null;
    })
    .filter((d): d is { theta: number; isCorrect: boolean } => d !== null);

  if (data.length < 30) return null;

  // Calculate p-value (proportion correct)
  const pCorrect = data.filter(d => d.isCorrect).length / data.length;

  // Estimate difficulty using median theta of correct responses
  const correctThetas = data.filter(d => d.isCorrect).map(d => d.theta).sort((a, b) => a - b);
  const estimatedDifficulty = correctThetas.length > 0
    ? correctThetas[Math.floor(correctThetas.length / 2)]
    : 0;

  // Estimate discrimination using point-biserial correlation
  const meanThetaCorrect = data.filter(d => d.isCorrect)
    .reduce((sum, d) => sum + d.theta, 0) / data.filter(d => d.isCorrect).length;
  
  const meanThetaIncorrect = data.filter(d => !d.isCorrect)
    .reduce((sum, d) => sum + d.theta, 0) / data.filter(d => !d.isCorrect).length;

  const overallMean = data.reduce((sum, d) => sum + d.theta, 0) / data.length;
  const variance = data.reduce((sum, d) => sum + Math.pow(d.theta - overallMean, 2), 0) / data.length;
  const sd = Math.sqrt(variance);

  const pointBiserial = ((meanThetaCorrect - meanThetaIncorrect) / sd) * 
    Math.sqrt(pCorrect * (1 - pCorrect));

  const estimatedDiscrimination = Math.max(0.5, Math.min(2.5, pointBiserial * 1.7));

  console.log(
    `[IRT] Question ${questionId}: b=${estimatedDifficulty.toFixed(2)}, ` +
    `a=${estimatedDiscrimination.toFixed(2)}, p=${pCorrect.toFixed(2)}`
  );

  return {
    difficulty_b: estimatedDifficulty,
    discrimination_a: estimatedDiscrimination
  };
}