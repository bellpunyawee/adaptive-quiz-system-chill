// src/lib/adaptive-engine/__tests__/engine.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateUCB } from '../ucb';
import { estimateAbilityMLE, calculateProbability, calculateKullbackLeiblerInformation } from '../irt-estimator';
import { calculateSEM } from '../stopping-criteria';
import { calculateContentBalanceScore } from '../content-balancer';

describe('UCB Algorithm', () => {
  it('should return very high score for unselected items', () => {
    const ucb = calculateUCB(0, 0, 1, 0, 100);
    expect(ucb).toBe(1e9);
  });

  it('should calculate valid UCB score for selected items', () => {
    const ucb = calculateUCB(0.5, 0.0, 1.0, 5, 100);
    expect(ucb).toBeGreaterThan(-Infinity);
    expect(ucb).toBeLessThan(Infinity);
  });

  it('should increase exploration bonus with total selections', () => {
    const ucb1 = calculateUCB(0, 0, 1, 5, 100);
    const ucb2 = calculateUCB(0, 0, 1, 5, 200);
    expect(ucb2).toBeGreaterThan(ucb1);
  });

  it('should handle edge cases without crashing', () => {
    expect(() => calculateUCB(0, 0, 0, 1, 10)).not.toThrow();
    expect(() => calculateUCB(10, -10, 2, 1, 10)).not.toThrow();
    expect(() => calculateUCB(-10, 10, 0.5, 1, 10)).not.toThrow();
  });
});

describe('IRT Calculations', () => {
  describe('calculateProbability', () => {
    it('should return 0.5 when ability equals difficulty', () => {
      const prob = calculateProbability(0, 0, 1);
      expect(prob).toBeCloseTo(0.5, 2);
    });

    it('should return higher probability when ability exceeds difficulty', () => {
      const prob = calculateProbability(2, 0, 1);
      expect(prob).toBeGreaterThan(0.5);
    });

    it('should return lower probability when difficulty exceeds ability', () => {
      const prob = calculateProbability(-2, 0, 1);
      expect(prob).toBeLessThan(0.5);
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

  describe('estimateAbilityMLE', () => {
    it('should estimate positive ability for mostly correct responses', () => {
      const responses = [
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0.5, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 1, discrimination_a: 1, isCorrect: true },
        { difficulty_b: -0.5, discrimination_a: 1, isCorrect: true },
      ];
      const theta = estimateAbilityMLE(responses, 0);
      expect(theta).toBeGreaterThan(0);
      expect(theta).toBeLessThan(4); // Within bounds
    });

    it('should estimate negative ability for mostly incorrect responses', () => {
      const responses = [
        { difficulty_b: 0, discrimination_a: 1, isCorrect: false },
        { difficulty_b: 0.5, discrimination_a: 1, isCorrect: false },
        { difficulty_b: -1, discrimination_a: 1, isCorrect: false },
      ];
      const theta = estimateAbilityMLE(responses, 0);
      expect(theta).toBeLessThan(0);
      expect(theta).toBeGreaterThan(-4); // Within bounds
    });

    it('should estimate near-zero ability for mixed responses', () => {
      const responses = [
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0, discrimination_a: 1, isCorrect: false },
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 0, discrimination_a: 1, isCorrect: false },
      ];
      const theta = estimateAbilityMLE(responses, 0);
      // For 50/50 on difficulty=0 items, theta should be near 0
      expect(Math.abs(theta)).toBeLessThan(1.0); // More lenient threshold
    });

    it('should handle perfectly correct responses', () => {
      const responses = Array(5).fill({ 
        difficulty_b: 0, 
        discrimination_a: 1, 
        isCorrect: true 
      });
      const theta = estimateAbilityMLE(responses, 0);
      expect(theta).toBeGreaterThan(1);
      expect(theta).toBeLessThanOrEqual(4); // Should hit upper bound
    });

    it('should handle perfectly incorrect responses', () => {
      const responses = Array(5).fill({ 
        difficulty_b: 0, 
        discrimination_a: 1, 
        isCorrect: false 
      });
      const theta = estimateAbilityMLE(responses, 0);
      expect(theta).toBeLessThan(-1);
      expect(theta).toBeGreaterThanOrEqual(-4); // Should hit lower bound
    });

    it('should constrain theta to reasonable bounds', () => {
      const responses = Array(20).fill({ 
        difficulty_b: -5, 
        discrimination_a: 1, 
        isCorrect: true 
      });
      const theta = estimateAbilityMLE(responses, 0);
      expect(theta).toBeLessThanOrEqual(4);
      expect(theta).toBeGreaterThanOrEqual(-4);
    });

    it('should return 0 for empty response array', () => {
      const theta = estimateAbilityMLE([], 0);
      expect(theta).toBe(0);
    });

    it('should converge from different starting points', () => {
      const responses = [
        { difficulty_b: 0, discrimination_a: 1, isCorrect: true },
        { difficulty_b: 1, discrimination_a: 1, isCorrect: true },
        { difficulty_b: -1, discrimination_a: 1, isCorrect: false },
      ];
      
      const theta1 = estimateAbilityMLE(responses, -2);
      const theta2 = estimateAbilityMLE(responses, 2);
      
      // Should converge to similar values regardless of starting point
      expect(Math.abs(theta1 - theta2)).toBeLessThan(0.5);
    });
  });

  describe('calculateKullbackLeiblerInformation', () => {
    it('should return zero when probability equals prior (p=0.5)', () => {
      // When θ = b, p = 0.5, and with prior q = 0.5, KL should be 0
      const info = calculateKullbackLeiblerInformation(0, 0, 1);
      expect(info).toBeCloseTo(0, 5);
    });

    it('should return positive information when probability differs from prior', () => {
      // When θ > b, p > 0.5, so KL should be positive
      const info1 = calculateKullbackLeiblerInformation(1, 0, 1);
      expect(info1).toBeGreaterThan(0);
      
      // When θ < b, p < 0.5, so KL should also be positive
      const info2 = calculateKullbackLeiblerInformation(-1, 0, 1);
      expect(info2).toBeGreaterThan(0);
    });

    it('should be symmetric around p=0.5', () => {
      // KL should be equal for p=0.6 and p=0.4 (equidistant from 0.5)
      const info1 = calculateKullbackLeiblerInformation(0.7, 0, 1); // p ≈ 0.668
      const info2 = calculateKullbackLeiblerInformation(-0.7, 0, 1); // p ≈ 0.332
      
      // Should be approximately equal due to symmetry
      expect(Math.abs(info1 - info2)).toBeLessThan(0.01);
    });

    it('should increase with distance from p=0.5', () => {
      // Further from 0.5 = more information
      const infoNear = calculateKullbackLeiblerInformation(0.3, 0, 1); // p ≈ 0.574
      const infoFar = calculateKullbackLeiblerInformation(2, 0, 1); // p ≈ 0.881
      
      expect(infoFar).toBeGreaterThan(infoNear);
    });

    it('should increase with discrimination parameter', () => {
      // Higher discrimination creates stronger separation from p=0.5
      const info1 = calculateKullbackLeiblerInformation(1, 0, 1); // a=1
      const info2 = calculateKullbackLeiblerInformation(1, 0, 2); // a=2
      
      // With higher discrimination, p moves further from 0.5
      expect(info2).toBeGreaterThan(info1);
    });

    it('should return valid values for various ability-difficulty combinations', () => {
      const testCases = [
        { theta: 0, b: 0, a: 1 }, // p=0.5, KL=0
        { theta: 1, b: 0, a: 1 }, // p>0.5, KL>0
        { theta: -1, b: 0, a: 1 }, // p<0.5, KL>0
        { theta: 0, b: 1, a: 1 }, // p<0.5, KL>0
        { theta: 2, b: -2, a: 1.5 }, // p>>0.5, KL>0
      ];

      testCases.forEach(({ theta, b, a }) => {
        const info = calculateKullbackLeiblerInformation(theta, b, a);
        expect(isFinite(info)).toBe(true);
        expect(info).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle extreme discrimination values', () => {
      expect(() => calculateKullbackLeiblerInformation(0, 0, 0.001)).not.toThrow();
      expect(() => calculateKullbackLeiblerInformation(0, 0, 10)).not.toThrow();
      
      // With extreme discrimination and mismatched ability/difficulty
      const info = calculateKullbackLeiblerInformation(2, 0, 10);
      expect(info).toBeGreaterThan(0);
    });
  });

  describe('calculateSEM', () => {
    it('should decrease as information increases', () => {
      const sem1 = calculateSEM(1);
      const sem2 = calculateSEM(4);
      expect(sem2).toBeLessThan(sem1);
    });

    it('should return Infinity for zero information', () => {
      const sem = calculateSEM(0);
      expect(sem).toBe(Infinity);
    });

    it('should be inversely proportional to sqrt of information', () => {
      const sem1 = calculateSEM(4);
      const sem2 = calculateSEM(16);
      expect(sem1 / sem2).toBeCloseTo(2, 1);
    });
  });
});

describe('Content Balancing', () => {
  it('should penalize over-represented cells', () => {
    const cellSelections = new Map([
      ['cell1', 10],
      ['cell2', 2]
    ]);
    
    const score1 = calculateContentBalanceScore('cell1', cellSelections, 12);
    const score2 = calculateContentBalanceScore('cell2', cellSelections, 12);
    
    expect(score1).toBeGreaterThan(score2);
  });

  it('should give equal scores to equally represented cells', () => {
    const cellSelections = new Map([
      ['cell1', 5],
      ['cell2', 5]
    ]);
    
    const score1 = calculateContentBalanceScore('cell1', cellSelections, 10);
    const score2 = calculateContentBalanceScore('cell2', cellSelections, 10);
    
    expect(score1).toBeCloseTo(score2, 5);
  });

  it('should handle cells with zero selections', () => {
    const cellSelections = new Map([['cell1', 5]]);
    const score = calculateContentBalanceScore('cell2', cellSelections, 5);
    expect(score).toBe(0);
  });
});

describe('Integration Tests', () => {
  it('should calculate KLI for questions at different difficulties', () => {
    // Simulate a learner with ability 1.0
    const ability = 1.0;
    
    // Questions with different difficulties
    const questions = [
      { id: 'q1', difficulty_b: -2, discrimination_a: 1 }, // Much easier, p >> 0.5
      { id: 'q2', difficulty_b: 0, discrimination_a: 1 },  // Easier, p > 0.5
      { id: 'q3', difficulty_b: 1, discrimination_a: 1 },  // Matched, p = 0.5, KL = 0
      { id: 'q4', difficulty_b: 3, discrimination_a: 1 },  // Much harder, p << 0.5
    ];
    
    // Calculate KLI for each
    const informationScores = questions.map((q) => ({
      id: q.id,
      info: calculateKullbackLeiblerInformation(ability, q.difficulty_b, q.discrimination_a),
      difficulty: q.difficulty_b
    }));
    
    console.log('KLI scores:', informationScores);
    
    // Questions away from matched difficulty should have positive KLI
    const q1Score = informationScores.find((s) => s.id === 'q1');
    const q2Score = informationScores.find((s) => s.id === 'q2');
    const q3Score = informationScores.find((s) => s.id === 'q3');
    const q4Score = informationScores.find((s) => s.id === 'q4');
    
    expect(q1Score?.info).toBeGreaterThan(0); // Far from match
    expect(q2Score?.info).toBeGreaterThan(0); // Somewhat from match
    expect(q3Score?.info).toBeCloseTo(0, 3);  // Perfect match, p=0.5
    expect(q4Score?.info).toBeGreaterThan(0); // Far from match
    
    // Questions furthest from ability should have highest KLI
    expect(q1Score!.info).toBeGreaterThan(q2Score!.info);
    expect(q4Score!.info).toBeGreaterThan(q2Score!.info);
  });

  it('should estimate higher ability after correct responses to difficult questions', () => {
    const initialTheta = 0;
    
    // All correct on difficult questions
    const responses = [
      { difficulty_b: 1, discrimination_a: 1, isCorrect: true },
      { difficulty_b: 1.5, discrimination_a: 1, isCorrect: true },
      { difficulty_b: 2, discrimination_a: 1, isCorrect: true },
    ];
    
    const finalTheta = estimateAbilityMLE(responses, initialTheta);
    expect(finalTheta).toBeGreaterThan(initialTheta);
    expect(finalTheta).toBeGreaterThan(1);
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle empty response patterns', () => {
    const theta = estimateAbilityMLE([], 0);
    expect(theta).toBe(0);
  });

  it('should handle extreme discrimination values', () => {
    expect(() => calculateProbability(0, 0, 0.001)).not.toThrow();
    expect(() => calculateProbability(0, 0, 10)).not.toThrow();
  });

  it('should handle negative discrimination gracefully', () => {
    const prob = calculateProbability(0, 0, -1);
    expect(prob).toBeGreaterThanOrEqual(0);
    expect(prob).toBeLessThanOrEqual(1);
  });
});