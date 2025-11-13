/**
 * Three-Parameter Logistic (3PL) IRT Model
 * Extends 2PL by adding a guessing parameter (c)
 *
 * 3PL Formula: P(θ) = c + (1 - c) / (1 + exp(-a(θ - b)))
 *
 * Where:
 * - θ (theta) = ability parameter
 * - a = discrimination (0.5 to 2.5)
 * - b = difficulty (-3 to +3)
 * - c = guessing parameter (0 to 0.35)
 */

export interface IrtParameters {
  a: number;  // Discrimination
  b: number;  // Difficulty
  c: number;  // Guessing (pseudo-chance level)
}

/**
 * Calculate probability of correct response using 3PL model
 *
 * @param theta - User ability estimate
 * @param params - IRT parameters (a, b, c)
 * @returns Probability of correct response (0 to 1)
 */
export function calculate3PLProbability(
  theta: number,
  params: IrtParameters
): number {
  const { a, b, c } = params;

  // Validate guessing parameter
  if (c < 0 || c > 0.35) {
    console.warn(`Guessing parameter c=${c} out of typical range [0, 0.35]`);
  }

  // 3PL formula: P(θ) = c + (1 - c) / (1 + exp(-a(θ - b)))
  const logit = a * (theta - b);
  const twoPlPart = 1 / (1 + Math.exp(-logit));

  return c + (1 - c) * twoPlPart;
}

/**
 * Calculate 2PL probability (for backward compatibility)
 *
 * @param theta - User ability estimate
 * @param a - Discrimination
 * @param b - Difficulty
 * @returns Probability of correct response (0 to 1)
 */
export function calculate2PLProbability(
  theta: number,
  a: number,
  b: number
): number {
  const logit = a * (theta - b);
  return 1 / (1 + Math.exp(-logit));
}

/**
 * Calculate Fisher Information for 3PL model
 * More complex than 2PL due to guessing parameter
 *
 * @param theta - User ability estimate
 * @param params - IRT parameters (a, b, c)
 * @returns Fisher information (higher = more informative)
 */
export function calculate3PLInformation(
  theta: number,
  params: IrtParameters
): number {
  const { a, c } = params;

  // Calculate P(θ) and Q(θ)
  const p = calculate3PLProbability(theta, params);
  const q = 1 - p;

  // Calculate P'(θ) - derivative of 3PL
  const pStar = p - c;  // P*(θ) = P(θ) - c
  const qStar = 1 - c;  // Q*(θ) = 1 - c

  // P'(θ) = a × P*(θ) × [Q*(θ) - P*(θ)] / Q*(θ)
  const pPrime = a * pStar * (qStar - pStar) / qStar;

  // Fisher Information: I(θ) = [P'(θ)]² / [P(θ) × Q(θ)]
  const information = (pPrime * pPrime) / (p * q);

  return information;
}

/**
 * Calculate Fisher Information for 2PL model (for backward compatibility)
 *
 * @param theta - User ability estimate
 * @param a - Discrimination
 * @param b - Difficulty
 * @returns Fisher information
 */
export function calculate2PLInformation(
  theta: number,
  a: number,
  b: number
): number {
  const logit = a * (theta - b);
  const p = 1 / (1 + Math.exp(-logit));
  return a * a * p * (1 - p);
}

/**
 * Calculate standard error of ability estimate
 * SE = 1 / √I(θ)
 *
 * @param theta - User ability estimate
 * @param params - IRT parameters (a, b, c)
 * @returns Standard error
 */
export function calculate3PLSE(
  theta: number,
  params: IrtParameters
): number {
  const information = calculate3PLInformation(theta, params);
  return 1 / Math.sqrt(information);
}

/**
 * Estimate guessing parameter from response data
 * Uses lower asymptote of ICC (Item Characteristic Curve)
 *
 * Strategy: Look at proportion correct among low-ability students
 *
 * @param responses - Array of user responses with abilities
 * @param discrimination - Question discrimination parameter
 * @param difficulty - Question difficulty parameter
 * @returns Estimated guessing parameter (c)
 */
export function estimateGuessingParameter(
  responses: Array<{
    isCorrect: boolean;
    userAbility: number;
  }>,
  discrimination: number,
  difficulty: number
): number {
  if (responses.length < 10) {
    // Insufficient data, return default
    return 0.20;  // Typical for 5-option multiple choice
  }

  // Sort responses by ability (low to high)
  const sortedResponses = responses
    .slice()
    .sort((a, b) => a.userAbility - b.userAbility);

  // Take bottom 20% of ability levels (or at least 5 responses)
  const lowAbilityCount = Math.max(5, Math.floor(responses.length * 0.2));
  const lowAbilityResponses = sortedResponses.slice(0, lowAbilityCount);

  // Calculate proportion correct for low-ability students
  const correctCount = lowAbilityResponses.filter(r => r.isCorrect).length;
  const proportionCorrect = correctCount / lowAbilityCount;

  // Estimate c as the lower asymptote
  // Apply constraints: c ∈ [0, 0.35]
  const estimatedC = Math.max(0, Math.min(0.35, proportionCorrect));

  return estimatedC;
}

/**
 * Decide whether to use 2PL or 3PL for a specific question
 *
 * Use 3PL if:
 * 1. Question is multiple-choice with ≥ 3 options
 * 2. Have sufficient calibration data (n ≥ 30)
 * 3. Estimated guessing is meaningful (c > 0.10)
 *
 * @param questionType - Type of question
 * @param numOptions - Number of answer options
 * @param calibrationData - Optional calibration data
 * @returns Whether to use 3PL model
 */
export function shouldUse3PL(
  questionType: string,
  numOptions: number,
  calibrationData?: {
    sampleSize: number;
    estimatedGuessing: number;
  }
): boolean {
  // Use 3PL only for multiple-choice with ≥ 3 options
  if (questionType !== 'multiple_choice' || numOptions < 3) {
    return false;
  }

  if (!calibrationData) {
    return false;  // Need calibration data
  }

  // Need sufficient sample size for reliable calibration
  if (calibrationData.sampleSize < 30) {
    return false;
  }

  // Only use 3PL if guessing is meaningful (c > 0.10)
  if (calibrationData.estimatedGuessing < 0.10) {
    return false;
  }

  return true;
}

/**
 * Unified function to calculate probability (2PL or 3PL)
 * Automatically selects appropriate model based on parameters
 *
 * @param theta - User ability estimate
 * @param params - IRT parameters
 * @returns Probability of correct response
 */
export function calculateIRTProbability(
  theta: number,
  params: IrtParameters
): number {
  // If c ≈ 0, use 2PL for efficiency
  if (params.c < 0.01) {
    return calculate2PLProbability(theta, params.a, params.b);
  }

  // Otherwise use 3PL
  return calculate3PLProbability(theta, params);
}

/**
 * Unified function to calculate information (2PL or 3PL)
 * Automatically selects appropriate model based on parameters
 *
 * @param theta - User ability estimate
 * @param params - IRT parameters
 * @returns Fisher information
 */
export function calculateIRTInformation(
  theta: number,
  params: IrtParameters
): number {
  // If c ≈ 0, use 2PL for efficiency
  if (params.c < 0.01) {
    return calculate2PLInformation(theta, params.a, params.b);
  }

  // Otherwise use 3PL
  return calculate3PLInformation(theta, params);
}

/**
 * Get default guessing parameter based on number of options
 *
 * @param numOptions - Number of answer options
 * @returns Default guessing parameter
 */
export function getDefaultGuessingParameter(numOptions: number): number {
  if (numOptions <= 2) {
    return 0.0;  // True/False - no guessing benefit
  } else if (numOptions === 3) {
    return 0.15;  // 3 options ≈ 33% chance, but realistically 15%
  } else if (numOptions === 4) {
    return 0.20;  // 4 options ≈ 25% chance, adjusted to 20%
  } else if (numOptions === 5) {
    return 0.20;  // 5 options ≈ 20% chance
  } else {
    return 0.15;  // 6+ options, conservative estimate
  }
}

/**
 * Validate IRT parameters
 *
 * @param params - IRT parameters to validate
 * @returns Object with validation result and any warnings
 */
export function validateIRTParameters(params: IrtParameters): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Validate discrimination (a)
  if (params.a < 0.5) {
    warnings.push(`Discrimination a=${params.a} is very low (< 0.5). Question may have poor quality.`);
  }
  if (params.a > 2.5) {
    warnings.push(`Discrimination a=${params.a} is very high (> 2.5). This is unusual.`);
  }
  if (params.a <= 0) {
    warnings.push(`Discrimination a=${params.a} must be positive.`);
    return { isValid: false, warnings };
  }

  // Validate difficulty (b)
  if (params.b < -3 || params.b > 3) {
    warnings.push(`Difficulty b=${params.b} is outside typical range [-3, 3].`);
  }

  // Validate guessing (c)
  if (params.c < 0 || params.c > 0.35) {
    warnings.push(`Guessing c=${params.c} is outside valid range [0, 0.35].`);
    return { isValid: false, warnings };
  }

  return { isValid: true, warnings };
}
