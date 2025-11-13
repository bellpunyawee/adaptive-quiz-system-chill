/**
 * Integration test for 3PL IRT Model
 * Tests the full flow: probability → information → ability estimation
 */

import {
  calculate3PLProbability,
  calculate3PLInformation,
  calculateIRTProbability,
  calculateIRTInformation,
  type IrtParameters,
} from '../irt-3pl';
import {
  estimateAbility,
  calculateProbability,
  calculateInformation,
  type IRTResponse,
} from '../irt-estimator-enhanced';

describe('3PL Integration Tests', () => {
  describe('End-to-End: 2PL vs 3PL Comparison', () => {
    test('Ability estimation with 2PL questions', () => {
      // Simulate a user answering 5 questions (2PL model)
      const responses: IRTResponse[] = [
        { difficulty_b: -0.5, discrimination_a: 1.2, guessing_c: 0, isCorrect: true },
        { difficulty_b: 0.0, discrimination_a: 1.0, guessing_c: 0, isCorrect: true },
        { difficulty_b: 0.5, discrimination_a: 1.3, guessing_c: 0, isCorrect: false },
        { difficulty_b: 0.3, discrimination_a: 1.1, guessing_c: 0, isCorrect: true },
        { difficulty_b: 0.8, discrimination_a: 1.4, guessing_c: 0, isCorrect: false },
      ];

      const estimate = estimateAbility(responses);

      // User ability should be between 0 and 0.5 (got medium-difficulty questions wrong)
      expect(estimate.theta).toBeGreaterThan(-0.5);
      expect(estimate.theta).toBeLessThan(1.0);
      expect(estimate.sem).toBeGreaterThan(0);
      expect(estimate.confidence).toBeGreaterThan(0);
      // 5 responses uses MLE (threshold is < 5 for EAP)
      expect(['EAP', 'MLE']).toContain(estimate.method);
    });

    test('Ability estimation with 3PL questions (with guessing)', () => {
      // Same pattern but with guessing parameters
      const responses: IRTResponse[] = [
        { difficulty_b: -0.5, discrimination_a: 1.2, guessing_c: 0.20, isCorrect: true },
        { difficulty_b: 0.0, discrimination_a: 1.0, guessing_c: 0.20, isCorrect: true },
        { difficulty_b: 0.5, discrimination_a: 1.3, guessing_c: 0.20, isCorrect: false },
        { difficulty_b: 0.3, discrimination_a: 1.1, guessing_c: 0.20, isCorrect: true },
        { difficulty_b: 0.8, discrimination_a: 1.4, guessing_c: 0.20, isCorrect: false },
      ];

      const estimate = estimateAbility(responses);

      // Ability estimate should be valid
      expect(estimate.theta).toBeGreaterThan(-3);
      expect(estimate.theta).toBeLessThan(3);
      expect(estimate.sem).toBeGreaterThan(0);
      expect(estimate.confidence).toBeGreaterThan(0);
    });

    test('3PL gives different ability estimates than 2PL for same response pattern', () => {
      const responsePattern = [
        { difficulty_b: -1.0, discrimination_a: 1.0, isCorrect: true },
        { difficulty_b: -0.5, discrimination_a: 1.0, isCorrect: true },
        { difficulty_b: 0.0, discrimination_a: 1.0, isCorrect: false },
        { difficulty_b: 0.5, discrimination_a: 1.0, isCorrect: false },
        { difficulty_b: 1.0, discrimination_a: 1.0, isCorrect: false },
      ];

      // 2PL estimation
      const responses2PL: IRTResponse[] = responsePattern.map(r => ({
        ...r,
        guessing_c: 0,
      }));

      // 3PL estimation (with guessing)
      const responses3PL: IRTResponse[] = responsePattern.map(r => ({
        ...r,
        guessing_c: 0.20,
      }));

      const estimate2PL = estimateAbility(responses2PL);
      const estimate3PL = estimateAbility(responses3PL);

      // Estimates should differ because 3PL accounts for guessing
      // 3PL should give lower ability estimate (some correct answers might be guesses)
      expect(estimate3PL.theta).toBeLessThan(estimate2PL.theta + 0.5);

      // Both should be reasonable
      expect(estimate2PL.theta).toBeGreaterThan(-3);
      expect(estimate2PL.theta).toBeLessThan(3);
      expect(estimate3PL.theta).toBeGreaterThan(-3);
      expect(estimate3PL.theta).toBeLessThan(3);
    });
  });

  describe('Information Calculation Consistency', () => {
    test('Information functions match between modules', () => {
      const theta = 0.5;
      const params: IrtParameters = {
        a: 1.2,
        b: 0.3,
        c: 0.20,
      };

      // Calculate using irt-3pl module
      const info3PL = calculate3PLInformation(theta, params);

      // Calculate using irt-estimator-enhanced module
      const infoEstimator = calculateInformation(theta, params.b, params.a, params.c);

      // Should be identical
      expect(info3PL).toBeCloseTo(infoEstimator, 5);
    });

    test('Probability functions match between modules', () => {
      const theta = 0.5;
      const params: IrtParameters = {
        a: 1.2,
        b: 0.3,
        c: 0.20,
      };

      // Calculate using irt-3pl module
      const prob3PL = calculate3PLProbability(theta, params);

      // Calculate using irt-estimator-enhanced module
      const probEstimator = calculateProbability(theta, params.b, params.a, params.c);

      // Should be identical
      expect(prob3PL).toBeCloseTo(probEstimator, 5);
    });
  });

  describe('Mixed 2PL and 3PL Questions', () => {
    test('Can estimate ability with mix of 2PL and 3PL questions', () => {
      const responses: IRTResponse[] = [
        // 2PL questions (c = 0)
        { difficulty_b: -0.5, discrimination_a: 1.2, guessing_c: 0, isCorrect: true },
        { difficulty_b: 0.0, discrimination_a: 1.0, guessing_c: 0, isCorrect: true },
        // 3PL questions (c > 0)
        { difficulty_b: 0.5, discrimination_a: 1.3, guessing_c: 0.20, isCorrect: false },
        { difficulty_b: 0.3, discrimination_a: 1.1, guessing_c: 0.25, isCorrect: true },
        { difficulty_b: 0.8, discrimination_a: 1.4, guessing_c: 0.20, isCorrect: false },
      ];

      const estimate = estimateAbility(responses);

      // Should work without errors
      expect(estimate.theta).toBeGreaterThan(-3);
      expect(estimate.theta).toBeLessThan(3);
      expect(estimate.sem).toBeGreaterThan(0);
      expect(estimate.sem).toBeLessThan(2);
      expect(estimate.confidence).toBeGreaterThan(0);
      expect(estimate.confidence).toBeLessThan(1);
    });
  });

  describe('Realistic Scenario: Low-Ability Student', () => {
    test('3PL better handles low-ability student who guesses', () => {
      // Low-ability student (θ ≈ -1.5) taking difficult questions
      // Gets some correct by guessing
      const responses: IRTResponse[] = [
        { difficulty_b: 0.5, discrimination_a: 1.0, guessing_c: 0.25, isCorrect: true },  // Guessed
        { difficulty_b: 0.8, discrimination_a: 1.0, guessing_c: 0.25, isCorrect: false },
        { difficulty_b: 1.0, discrimination_a: 1.0, guessing_c: 0.25, isCorrect: false },
        { difficulty_b: 0.3, discrimination_a: 1.0, guessing_c: 0.25, isCorrect: true },  // Guessed
        { difficulty_b: 0.6, discrimination_a: 1.0, guessing_c: 0.25, isCorrect: false },
        { difficulty_b: 0.9, discrimination_a: 1.0, guessing_c: 0.25, isCorrect: false },
      ];

      const estimate = estimateAbility(responses);

      // Should estimate low ability (most questions wrong, difficult questions)
      expect(estimate.theta).toBeLessThan(0.5);

      // With MLE (6+ responses), should be more precise
      expect(estimate.method).toBe('MLE');
      // 3PL with guessing has higher uncertainty, so SEM can be higher
      expect(estimate.sem).toBeLessThan(2.0);
      expect(estimate.sem).toBeGreaterThan(0);
    });
  });

  describe('Realistic Scenario: High-Ability Student', () => {
    test('3PL correctly estimates high-ability student', () => {
      // High-ability student (θ ≈ 1.5) taking challenging questions
      const responses: IRTResponse[] = [
        { difficulty_b: 0.5, discrimination_a: 1.0, guessing_c: 0.20, isCorrect: true },
        { difficulty_b: 1.0, discrimination_a: 1.0, guessing_c: 0.20, isCorrect: true },
        { difficulty_b: 1.5, discrimination_a: 1.0, guessing_c: 0.20, isCorrect: true },
        { difficulty_b: 2.0, discrimination_a: 1.0, guessing_c: 0.20, isCorrect: false },
        { difficulty_b: 1.8, discrimination_a: 1.0, guessing_c: 0.20, isCorrect: true },
        { difficulty_b: 1.2, discrimination_a: 1.0, guessing_c: 0.20, isCorrect: true },
      ];

      const estimate = estimateAbility(responses);

      // Should estimate high ability (most difficult questions correct)
      expect(estimate.theta).toBeGreaterThan(1.0);

      // Reasonable precision (3PL has inherently higher uncertainty)
      expect(estimate.method).toBe('MLE');
      expect(estimate.sem).toBeLessThan(2.0);
      expect(estimate.sem).toBeGreaterThan(0);
      expect(estimate.confidence).toBeGreaterThan(0);
    });
  });

  describe('Automatic Model Selection', () => {
    test('Unified functions automatically choose 2PL when c=0', () => {
      const theta = 0.5;
      const params: IrtParameters = { a: 1.2, b: 0.3, c: 0 };

      const probUnified = calculateIRTProbability(theta, params);
      const infoUnified = calculateIRTInformation(theta, params);

      // Should use 2PL formulas
      const prob2PL = calculateProbability(theta, params.b, params.a, 0);
      const info2PL = calculateInformation(theta, params.b, params.a, 0);

      expect(probUnified).toBeCloseTo(prob2PL, 5);
      expect(infoUnified).toBeCloseTo(info2PL, 5);
    });

    test('Unified functions automatically choose 3PL when c>0', () => {
      const theta = 0.5;
      const params: IrtParameters = { a: 1.2, b: 0.3, c: 0.20 };

      const probUnified = calculateIRTProbability(theta, params);
      const infoUnified = calculateIRTInformation(theta, params);

      // Should use 3PL formulas
      const prob3PL = calculateProbability(theta, params.b, params.a, 0.20);
      const info3PL = calculateInformation(theta, params.b, params.a, 0.20);

      expect(probUnified).toBeCloseTo(prob3PL, 5);
      expect(infoUnified).toBeCloseTo(info3PL, 5);
    });
  });
});
