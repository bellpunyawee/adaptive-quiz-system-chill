/**
 * Unit tests for 3PL IRT Model
 */

import {
  calculate3PLProbability,
  calculate2PLProbability,
  calculate3PLInformation,
  calculate2PLInformation,
  calculate3PLSE,
  estimateGuessingParameter,
  shouldUse3PL,
  calculateIRTProbability,
  calculateIRTInformation,
  getDefaultGuessingParameter,
  validateIRTParameters,
  type IrtParameters,
} from '../irt-3pl';

describe('3PL IRT Model - Probability Functions', () => {
  test('3PL probability converges to c as theta approaches -∞', () => {
    const params: IrtParameters = { a: 1.0, b: 0.0, c: 0.25 };
    const prob = calculate3PLProbability(-10, params);

    // At very low ability, probability should approach guessing parameter
    expect(prob).toBeCloseTo(0.25, 1);
  });

  test('3PL probability approaches 1 as theta approaches +∞', () => {
    const params: IrtParameters = { a: 1.0, b: 0.0, c: 0.25 };
    const prob = calculate3PLProbability(10, params);

    // At very high ability, probability should approach 1
    expect(prob).toBeCloseTo(1.0, 1);
  });

  test('3PL probability is between c and 1', () => {
    const params: IrtParameters = { a: 1.2, b: 0.0, c: 0.20 };

    for (let theta = -3; theta <= 3; theta += 0.5) {
      const prob = calculate3PLProbability(theta, params);
      expect(prob).toBeGreaterThanOrEqual(0.20);
      expect(prob).toBeLessThanOrEqual(1.0);
    }
  });

  test('3PL reduces to 2PL when c=0', () => {
    const theta = 0.5;
    const params: IrtParameters = { a: 1.2, b: -0.3, c: 0.0 };

    const prob3PL = calculate3PLProbability(theta, params);
    const prob2PL = calculate2PLProbability(theta, params.a, params.b);

    expect(prob3PL).toBeCloseTo(prob2PL, 5);
  });

  test('2PL probability is monotonically increasing with theta', () => {
    const params = { a: 1.0, b: 0.0 };
    let prevProb = 0;

    for (let theta = -3; theta <= 3; theta += 0.5) {
      const prob = calculate2PLProbability(theta, params.a, params.b);
      expect(prob).toBeGreaterThanOrEqual(prevProb);
      prevProb = prob;
    }
  });

  test('Higher discrimination increases slope of ICC', () => {
    const theta = 0.0;
    const b = 0.0;

    const probLowA = calculate2PLProbability(theta, 0.5, b);
    const probHighA = calculate2PLProbability(theta, 2.0, b);

    // At theta = b, both should be 0.5
    expect(probLowA).toBeCloseTo(0.5, 2);
    expect(probHighA).toBeCloseTo(0.5, 2);

    // But at theta = b + 1, higher discrimination should give higher probability
    const probLowA_Plus = calculate2PLProbability(1.0, 0.5, b);
    const probHighA_Plus = calculate2PLProbability(1.0, 2.0, b);

    expect(probHighA_Plus).toBeGreaterThan(probLowA_Plus);
  });
});

describe('3PL IRT Model - Information Functions', () => {
  test('3PL information is always positive', () => {
    const params: IrtParameters = { a: 1.5, b: 0.0, c: 0.20 };

    for (let theta = -3; theta <= 3; theta += 0.5) {
      const info = calculate3PLInformation(theta, params);
      expect(info).toBeGreaterThan(0);
    }
  });

  test('Information is maximized near difficulty parameter b', () => {
    const params: IrtParameters = { a: 1.5, b: 1.0, c: 0.20 };

    const infoAtB = calculate3PLInformation(params.b, params);
    const infoFarFromB = calculate3PLInformation(params.b - 2, params);

    expect(infoAtB).toBeGreaterThan(infoFarFromB);
  });

  test('Higher discrimination gives higher information', () => {
    const theta = 0.0;
    const paramsLowA: IrtParameters = { a: 0.8, b: 0.0, c: 0.20 };
    const paramsHighA: IrtParameters = { a: 2.0, b: 0.0, c: 0.20 };

    const infoLowA = calculate3PLInformation(theta, paramsLowA);
    const infoHighA = calculate3PLInformation(theta, paramsHighA);

    expect(infoHighA).toBeGreaterThan(infoLowA);
  });

  test('3PL information reduces to 2PL information when c=0', () => {
    const theta = 0.5;
    const params: IrtParameters = { a: 1.2, b: -0.3, c: 0.0 };

    const info3PL = calculate3PLInformation(theta, params);
    const info2PL = calculate2PLInformation(theta, params.a, params.b);

    expect(info3PL).toBeCloseTo(info2PL, 5);
  });

  test('Standard error decreases with higher information', () => {
    const theta = 0.0;
    const paramsLowInfo: IrtParameters = { a: 0.8, b: 0.0, c: 0.20 };
    const paramsHighInfo: IrtParameters = { a: 2.0, b: 0.0, c: 0.20 };

    const seLowInfo = calculate3PLSE(theta, paramsLowInfo);
    const seHighInfo = calculate3PLSE(theta, paramsHighInfo);

    expect(seHighInfo).toBeLessThan(seLowInfo);
  });
});

describe('3PL IRT Model - Guessing Parameter Estimation', () => {
  test('Estimated guessing parameter is within bounds [0, 0.35]', () => {
    const responses = [
      { isCorrect: true, userAbility: -2.0 },
      { isCorrect: false, userAbility: -1.8 },
      { isCorrect: true, userAbility: -1.5 },
      { isCorrect: false, userAbility: -1.2 },
      { isCorrect: true, userAbility: -1.0 },
      { isCorrect: false, userAbility: -0.8 },
      { isCorrect: true, userAbility: -0.5 },
      { isCorrect: false, userAbility: -0.2 },
      { isCorrect: true, userAbility: 0.0 },
      { isCorrect: true, userAbility: 0.2 },
    ];

    const c = estimateGuessingParameter(responses, 1.0, 0.0);

    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(0.35);
  });

  test('Returns default for insufficient data', () => {
    const responses = [
      { isCorrect: true, userAbility: -2.0 },
      { isCorrect: false, userAbility: -1.0 },
    ];

    const c = estimateGuessingParameter(responses, 1.0, 0.0);

    // Should return default value
    expect(c).toBe(0.20);
  });

  test('Varying correct rates produce different guessing estimates', () => {
    const responsesMediumGuessing = Array.from({ length: 30 }, (_, i) => ({
      isCorrect: i < 6,  // 20% correct (medium guessing)
      userAbility: -2.0 + i * 0.1,
    }));

    const responsesLowGuessing = Array.from({ length: 30 }, (_, i) => ({
      isCorrect: i < 2,  // ~7% correct (low guessing)
      userAbility: -2.0 + i * 0.1,
    }));

    const cMedium = estimateGuessingParameter(responsesMediumGuessing, 1.0, 0.0);
    const cLow = estimateGuessingParameter(responsesLowGuessing, 1.0, 0.0);

    // Medium guessing should have higher c than low guessing
    expect(cMedium).toBeGreaterThan(cLow);
    // Both should be within valid range
    expect(cMedium).toBeGreaterThanOrEqual(0);
    expect(cMedium).toBeLessThanOrEqual(0.35);
  });
});

describe('3PL IRT Model - Model Selection', () => {
  test('shouldUse3PL returns false for non-multiple-choice', () => {
    const result = shouldUse3PL('open_ended', 4, {
      sampleSize: 50,
      estimatedGuessing: 0.20,
    });

    expect(result).toBe(false);
  });

  test('shouldUse3PL returns false for insufficient options', () => {
    const result = shouldUse3PL('multiple_choice', 2, {
      sampleSize: 50,
      estimatedGuessing: 0.20,
    });

    expect(result).toBe(false);
  });

  test('shouldUse3PL returns false for insufficient sample size', () => {
    const result = shouldUse3PL('multiple_choice', 4, {
      sampleSize: 20,  // < 30
      estimatedGuessing: 0.20,
    });

    expect(result).toBe(false);
  });

  test('shouldUse3PL returns false for low guessing parameter', () => {
    const result = shouldUse3PL('multiple_choice', 4, {
      sampleSize: 50,
      estimatedGuessing: 0.05,  // < 0.10
    });

    expect(result).toBe(false);
  });

  test('shouldUse3PL returns true when all conditions met', () => {
    const result = shouldUse3PL('multiple_choice', 4, {
      sampleSize: 50,
      estimatedGuessing: 0.20,
    });

    expect(result).toBe(true);
  });

  test('shouldUse3PL returns false without calibration data', () => {
    const result = shouldUse3PL('multiple_choice', 4);
    expect(result).toBe(false);
  });
});

describe('3PL IRT Model - Unified Functions', () => {
  test('calculateIRTProbability uses 2PL when c ≈ 0', () => {
    const theta = 0.5;
    const params: IrtParameters = { a: 1.2, b: -0.3, c: 0.005 };

    const probUnified = calculateIRTProbability(theta, params);
    const prob2PL = calculate2PLProbability(theta, params.a, params.b);

    expect(probUnified).toBeCloseTo(prob2PL, 5);
  });

  test('calculateIRTProbability uses 3PL when c > 0', () => {
    const theta = 0.5;
    const params: IrtParameters = { a: 1.2, b: -0.3, c: 0.20 };

    const probUnified = calculateIRTProbability(theta, params);
    const prob3PL = calculate3PLProbability(theta, params);

    expect(probUnified).toBeCloseTo(prob3PL, 5);
  });

  test('calculateIRTInformation uses 2PL when c ≈ 0', () => {
    const theta = 0.5;
    const params: IrtParameters = { a: 1.2, b: -0.3, c: 0.005 };

    const infoUnified = calculateIRTInformation(theta, params);
    const info2PL = calculate2PLInformation(theta, params.a, params.b);

    expect(infoUnified).toBeCloseTo(info2PL, 5);
  });

  test('calculateIRTInformation uses 3PL when c > 0', () => {
    const theta = 0.5;
    const params: IrtParameters = { a: 1.2, b: -0.3, c: 0.20 };

    const infoUnified = calculateIRTInformation(theta, params);
    const info3PL = calculate3PLInformation(theta, params);

    expect(infoUnified).toBeCloseTo(info3PL, 5);
  });
});

describe('3PL IRT Model - Helper Functions', () => {
  test('getDefaultGuessingParameter returns 0 for 2 options', () => {
    expect(getDefaultGuessingParameter(2)).toBe(0.0);
  });

  test('getDefaultGuessingParameter returns reasonable values', () => {
    expect(getDefaultGuessingParameter(3)).toBe(0.15);
    expect(getDefaultGuessingParameter(4)).toBe(0.20);
    expect(getDefaultGuessingParameter(5)).toBe(0.20);
    expect(getDefaultGuessingParameter(6)).toBe(0.15);
  });

  test('validateIRTParameters accepts valid parameters', () => {
    const params: IrtParameters = { a: 1.2, b: 0.5, c: 0.20 };
    const result = validateIRTParameters(params);

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBe(0);
  });

  test('validateIRTParameters warns about low discrimination', () => {
    const params: IrtParameters = { a: 0.3, b: 0.0, c: 0.20 };
    const result = validateIRTParameters(params);

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('very low');
  });

  test('validateIRTParameters warns about high discrimination', () => {
    const params: IrtParameters = { a: 3.0, b: 0.0, c: 0.20 };
    const result = validateIRTParameters(params);

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('very high');
  });

  test('validateIRTParameters rejects negative discrimination', () => {
    const params: IrtParameters = { a: -1.0, b: 0.0, c: 0.20 };
    const result = validateIRTParameters(params);

    expect(result.isValid).toBe(false);
    expect(result.warnings.some(w => w.includes('must be positive'))).toBe(true);
  });

  test('validateIRTParameters warns about extreme difficulty', () => {
    const params: IrtParameters = { a: 1.0, b: 5.0, c: 0.20 };
    const result = validateIRTParameters(params);

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('outside typical range');
  });

  test('validateIRTParameters rejects invalid guessing parameter', () => {
    const paramsNegative: IrtParameters = { a: 1.0, b: 0.0, c: -0.1 };
    const resultNegative = validateIRTParameters(paramsNegative);

    expect(resultNegative.isValid).toBe(false);

    const paramsTooHigh: IrtParameters = { a: 1.0, b: 0.0, c: 0.5 };
    const resultTooHigh = validateIRTParameters(paramsTooHigh);

    expect(resultTooHigh.isValid).toBe(false);
  });
});

describe('3PL IRT Model - Edge Cases', () => {
  test('Handles extreme theta values gracefully', () => {
    const params: IrtParameters = { a: 1.0, b: 0.0, c: 0.20 };

    const probVeryLow = calculate3PLProbability(-100, params);
    const probVeryHigh = calculate3PLProbability(100, params);

    expect(probVeryLow).toBeCloseTo(0.20, 1);
    expect(probVeryHigh).toBeCloseTo(1.0, 5);
    expect(isFinite(probVeryLow)).toBe(true);
    expect(isFinite(probVeryHigh)).toBe(true);
  });

  test('Information is finite for all reasonable inputs', () => {
    const params: IrtParameters = { a: 1.5, b: 0.0, c: 0.20 };

    for (let theta = -5; theta <= 5; theta += 0.5) {
      const info = calculate3PLInformation(theta, params);
      expect(isFinite(info)).toBe(true);
      expect(info).toBeGreaterThan(0);
    }
  });

  test('Probability at difficulty b is affected by guessing', () => {
    const params2PL: IrtParameters = { a: 1.0, b: 0.0, c: 0.0 };
    const params3PL: IrtParameters = { a: 1.0, b: 0.0, c: 0.20 };

    const prob2PL = calculate3PLProbability(0.0, params2PL);
    const prob3PL = calculate3PLProbability(0.0, params3PL);

    // At θ = b, 2PL gives P = 0.5
    expect(prob2PL).toBeCloseTo(0.5, 2);

    // At θ = b, 3PL gives P = c + (1-c) * 0.5 = 0.20 + 0.80 * 0.5 = 0.60
    expect(prob3PL).toBeCloseTo(0.60, 2);
    expect(prob3PL).toBeGreaterThan(prob2PL);
  });
});
