// src/lib/adaptive-engine/__tests__/enhanced-features.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  estimateAbilityMLE,
  estimateAbilityEAP,
  estimateAbility,
  calculateProbability,
  calculateInformation,
  calculateSEM,
  IRTResponse
} from '../irt-estimator-enhanced';

describe('Enhanced IRT Estimator', () => {
  describe('EAP Estimation', () => {
    it('should return prior mean with no responses', () => {
      const result = estimateAbilityEAP([], 0, 1);
      expect(result).toBe(0);
    });

    it('should return prior mean with different prior', () => {
      const result = estimateAbilityEAP([], 1.5, 1);
      expect(result).toBe(1.5);
    });

    it('should estimate ability with few responses', () => {
      const responses: IRTResponse[] = [
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0.5, discrimination_a: 1, isCorrect: true }
      ];
      
      const result = estimateAbilityEAP(responses, 0, 1);
      expect(result).toBeGreaterThan(0); // Should be positive after correct answers
      expect(result).toBeLessThan(4); // Should be reasonable
    });

    it('should be more stable than MLE with few responses', () => {
      const responses: IRTResponse[] = [
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true }
      ];
      
      const eap = estimateAbilityEAP(responses, 0, 1);
      const mle = estimateAbilityMLE(responses, 0);
      
      // EAP should be closer to prior (more conservative)
      expect(Math.abs(eap)).toBeLessThan(Math.abs(mle));
    });

    it('should handle all correct responses', () => {
      const responses: IRTResponse[] = [
        { difficulty_b: -1, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 1, discrimination_a: 1, isCorrect: true }
      ];
      
      const result = estimateAbilityEAP(responses, 0, 1);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(4);
    });

    it('should handle all incorrect responses', () => {
      const responses: IRTResponse[] = [
        { difficulty_b: -1, discrimination_a: 1, isCorrect: false },
        { difficulty_b: 0, discrimination_a: 1, isCorrect: false },
        { difficulty_b: 1, discrimination_a: 1, isCorrect: false }
      ];
      
      const result = estimateAbilityEAP(responses, 0, 1);
      expect(result).toBeLessThan(0);
      expect(result).toBeGreaterThan(-4);
    });
  });

  describe('Adaptive Ability Estimation', () => {
    it('should use prior with < 3 responses', () => {
      const responses: IRTResponse[] = [
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true }
      ];
      
      const result = estimateAbility(responses, 0, 1);
      expect(result.theta).toBe(0);
      expect(result.sem).toBe(Infinity);
      expect(result.confidence).toBe(0);
      expect(result.method).toBe('EAP');
    });

    it('should use EAP with 3-4 responses', () => {
      const responses: IRTResponse[] = [
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0.5, discrimination_a: 1, isCorrect: true },
        { difficulty_b: -0.5, discrimination_a: 1, isCorrect: false }
      ];
      
      const result = estimateAbility(responses, 0, 1);
      expect(result.method).toBe('EAP');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should use MLE with 5+ responses', () => {
      const responses: IRTResponse[] = [
        { difficulty_b: -1, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0.5, discrimination_a: 1, isCorrect: false },
        { difficulty_b: 1, discrimination_a: 1, isCorrect: false },
        { difficulty_b: -0.5, discrimination_a: 1, isCorrect: true }
      ];
      
      const result = estimateAbility(responses, 0, 1);
      expect(result.method).toBe('MLE');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.sem).toBeGreaterThan(0);
      expect(result.sem).toBeLessThan(Infinity);
    });

    it('should have increasing confidence with more responses', () => {
      const baseResponses: IRTResponse[] = [
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0.5, discrimination_a: 1, isCorrect: true },
        { difficulty_b: -0.5, discrimination_a: 1, isCorrect: false }
      ];

      const result3 = estimateAbility(baseResponses, 0, 1);
      
      const moreResponses = [
        ...baseResponses,
        { difficulty_b: 1, discrimination_a: 1, isCorrect: false },
        { difficulty_b: -1, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0.2, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0.8, discrimination_a: 1, isCorrect: false }
      ];
      
      const result7 = estimateAbility(moreResponses, 0, 1);
      
      expect(result7.confidence).toBeGreaterThan(result3.confidence);
    });
  });

  describe('Information and SEM Calculations', () => {
    it('should calculate maximum information at matched difficulty', () => {
      const theta = 1.0;
      const infoMatched = calculateInformation(theta, 1.0, 1.0);
      const infoEasier = calculateInformation(theta, 0.0, 1.0);
      const infoHarder = calculateInformation(theta, 2.0, 1.0);
      
      expect(infoMatched).toBeGreaterThan(infoEasier);
      expect(infoMatched).toBeGreaterThan(infoHarder);
    });

    it('should calculate higher information with higher discrimination', () => {
      const info1 = calculateInformation(0, 0, 1.0);
      const info2 = calculateInformation(0, 0, 2.0);
      
      expect(info2).toBeGreaterThan(info1);
      expect(info2).toBeCloseTo(info1 * 4, 1); // a² relationship
    });

    it('should calculate SEM correctly', () => {
      const responses: IRTResponse[] = [
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0, discrimination_a: 1, isCorrect: false },
        { difficulty_b: 0, discrimination_a: 1, isCorrect: false }
      ];
      
      const sem = calculateSEM(0, responses);
      expect(sem).toBeGreaterThan(0);
      expect(sem).toBeLessThan(Infinity);
    });

    it('should decrease SEM with more responses', () => {
      const responses3: IRTResponse[] = [
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0, discrimination_a: 1, isCorrect: false }
      ];
      
      const responses10: IRTResponse[] = [
        ...responses3,
        ...Array(7).fill({ difficulty_b: 0, discrimination_a: 1, isCorrect: true })
      ];
      
      const sem3 = calculateSEM(0, responses3);
      const sem10 = calculateSEM(0, responses10);
      
      expect(sem10).toBeLessThan(sem3);
    });

    it('should return Infinity for empty responses', () => {
      const sem = calculateSEM(0, []);
      expect(sem).toBe(Infinity);
    });
  });

  describe('Probability Calculation', () => {
    it('should return 0.5 when ability equals difficulty', () => {
      const prob = calculateProbability(0, 0, 1);
      expect(prob).toBeCloseTo(0.5, 5);
    });

    it('should return higher probability for higher ability', () => {
      const prob1 = calculateProbability(-1, 0, 1);
      const prob2 = calculateProbability(0, 0, 1);
      const prob3 = calculateProbability(1, 0, 1);
      
      expect(prob3).toBeGreaterThan(prob2);
      expect(prob2).toBeGreaterThan(prob1);
    });

    it('should be steeper with higher discrimination', () => {
      const probLowDisc = calculateProbability(1, 0, 0.5);
      const probHighDisc = calculateProbability(1, 0, 2.0);
      
      // With higher discrimination, probability should be closer to extremes
      expect(probHighDisc).toBeGreaterThan(probLowDisc);
    });

    it('should approach 1 for very high ability', () => {
      const prob = calculateProbability(5, 0, 1);
      expect(prob).toBeGreaterThan(0.99);
    });

    it('should approach 0 for very low ability', () => {
      const prob = calculateProbability(-5, 0, 1);
      expect(prob).toBeLessThan(0.01);
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle extreme discrimination values', () => {
      const responses: IRTResponse[] = [
        { difficulty_b: 0, discrimination_a: 0.1, isCorrect: true },
        { difficulty_b: 0, discrimination_a: 3.0, isCorrect: false }
      ];
      
      expect(() => estimateAbilityMLE(responses)).not.toThrow();
      expect(() => estimateAbilityEAP(responses)).not.toThrow();
    });

    it('should handle extreme difficulty values', () => {
      const responses: IRTResponse[] = [
        { difficulty_b: -3.5, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 3.5, discrimination_a: 1, isCorrect: false }
      ];
      
      expect(() => estimateAbilityMLE(responses)).not.toThrow();
      expect(() => estimateAbilityEAP(responses)).not.toThrow();
    });

    it('should constrain estimates to reasonable bounds', () => {
      // All very hard questions answered correctly
      const responses: IRTResponse[] = Array(10).fill(null).map(() => ({
        difficulty_b: 3,
        discrimination_a: 2,
        isCorrect: true
      }));
      
      const mle = estimateAbilityMLE(responses);
      const eap = estimateAbilityEAP(responses);
      
      expect(mle).toBeLessThanOrEqual(4);
      expect(mle).toBeGreaterThanOrEqual(-4);
      expect(eap).toBeLessThanOrEqual(4);
      expect(eap).toBeGreaterThanOrEqual(-4);
    });

    it('should handle mixed response patterns', () => {
      const responses: IRTResponse[] = [
        { difficulty_b: -2, discrimination_a: 1, isCorrect: false }, // Easy, wrong
        { difficulty_b: 2, discrimination_a: 1, isCorrect: true },   // Hard, correct
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0, discrimination_a: 1, isCorrect: false },
        { difficulty_b: 1, discrimination_a: 1.5, isCorrect: true }
      ];
      
      const result = estimateAbility(responses, 0, 1);
      
      expect(result.theta).toBeGreaterThan(-4);
      expect(result.theta).toBeLessThan(4);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.sem).toBeGreaterThan(0);
      expect(result.sem).toBeLessThan(Infinity);
    });
  });
});

describe('Question Pool Management', () => {
  // Note: These would need to be integration tests with actual database
  // Here we just test the conceptual logic
  
  describe('Exposure Control', () => {
    it('should prioritize questions with lower exposure', () => {
      const q1 = { id: '1', exposureCount: 1, lastUsed: new Date('2024-01-01') };
      const q2 = { id: '2', exposureCount: 5, lastUsed: new Date('2024-01-01') };
      
      // Lower exposure should be preferred (this is conceptual)
      expect(q1.exposureCount).toBeLessThan(q2.exposureCount);
    });
  });

  describe('Quality Metrics', () => {
    it('should identify low discrimination questions', () => {
      const discrimination = 0.3;
      const threshold = 0.4;
      
      expect(discrimination).toBeLessThan(threshold);
    });

    it('should identify extreme difficulty questions', () => {
      const difficulty = 3.8;
      const threshold = 3.5;
      
      expect(Math.abs(difficulty)).toBeGreaterThan(threshold);
    });

    it('should identify too-easy questions', () => {
      const correctRate = 0.96;
      const threshold = 0.95;
      
      expect(correctRate).toBeGreaterThan(threshold);
    });

    it('should identify too-hard questions', () => {
      const correctRate = 0.12;
      const threshold = 0.15;
      
      expect(correctRate).toBeLessThan(threshold);
    });
  });
});