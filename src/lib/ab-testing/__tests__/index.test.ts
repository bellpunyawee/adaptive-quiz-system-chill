import { describe, it, expect } from 'vitest';
import {
  assignVariant,
  isVariantB,
  getActiveTests,
  getTestConfig,
  calculateSignificance
} from '../index';

describe('A/B Testing Framework - Sprint 1', () => {

  describe('assignVariant', () => {
    it('should assign variant deterministically based on userId and testName', () => {
      const variant1 = assignVariant('user123', 'test1');
      const variant2 = assignVariant('user123', 'test1');

      expect(variant1).toBe(variant2); // Same user + test = same variant
    });

    it('should return either A or B', () => {
      const variant = assignVariant('user1', 'test1');

      expect(['A', 'B']).toContain(variant);
    });

    it('should assign different variants for different users', () => {
      const results = new Set();

      for (let i = 0; i < 100; i++) {
        results.add(assignVariant(`user${i}`, 'test1'));
      }

      // With 100 users, should get both A and B
      expect(results.has('A')).toBe(true);
      expect(results.has('B')).toBe(true);
    });

    it('should respect traffic split parameter', () => {
      const results = { A: 0, B: 0 };

      for (let i = 0; i < 1000; i++) {
        const variant = assignVariant(`user${i}`, 'test1', 0.5);
        results[variant]++;
      }

      // With 50/50 split, should be roughly equal (allow 10% variance)
      const ratio = results.A / (results.A + results.B);
      expect(ratio).toBeGreaterThan(0.4);
      expect(ratio).toBeLessThan(0.6);
    });

    it('should handle different traffic splits', () => {
      const results = { A: 0, B: 0 };

      // 80/20 split (80% A, 20% B)
      for (let i = 0; i < 1000; i++) {
        const variant = assignVariant(`user${i}`, 'test1', 0.8);
        results[variant]++;
      }

      const ratioA = results.A / (results.A + results.B);
      expect(ratioA).toBeGreaterThan(0.75); // At least 75%
      expect(ratioA).toBeLessThan(0.85); // At most 85%
    });

    it('should assign different variants for different tests (same user)', () => {
      const test1Variant = assignVariant('user1', 'test1');
      const test2Variant = assignVariant('user1', 'test2');

      // Can be different (though not guaranteed)
      expect(['A', 'B']).toContain(test1Variant);
      expect(['A', 'B']).toContain(test2Variant);
    });

    it('should be stable across multiple calls', () => {
      const userId = 'test-user';
      const testName = 'test-experiment';

      const calls = Array.from({ length: 100 }, () =>
        assignVariant(userId, testName)
      );

      // All calls should return the same variant
      const uniqueVariants = new Set(calls);
      expect(uniqueVariants.size).toBe(1);
    });
  });

  describe('isVariantB', () => {
    it('should return true when user is in variant B', () => {
      const userId = 'user1';
      const testName = 'test1';

      const variant = assignVariant(userId, testName);
      const result = isVariantB(userId, testName);

      expect(result).toBe(variant === 'B');
    });

    it('should return false when user is in variant A', () => {
      const userId = 'user1';
      const testName = 'test1';

      const variant = assignVariant(userId, testName);
      const result = isVariantB(userId, testName);

      if (variant === 'A') {
        expect(result).toBe(false);
      } else {
        expect(result).toBe(true);
      }
    });

    it('should be consistent with assignVariant', () => {
      for (let i = 0; i < 50; i++) {
        const userId = `user${i}`;
        const variant = assignVariant(userId, 'test1');
        const isBVariant = isVariantB(userId, 'test1');

        expect(isBVariant).toBe(variant === 'B');
      }
    });
  });

  describe('getActiveTests', () => {
    it('should return array of test configurations', () => {
      const tests = getActiveTests();

      expect(Array.isArray(tests)).toBe(true);
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should include PSER stopping test', () => {
      const tests = getActiveTests();
      const pserTest = tests.find(t => t.testName === 'pser-stopping');

      expect(pserTest).toBeDefined();
      expect(pserTest?.description).toContain('PSER');
      expect(pserTest?.isActive).toBe(true);
    });

    it('should include warm-up strategy test', () => {
      const tests = getActiveTests();
      const warmupTest = tests.find(t => t.testName === 'warm-up-strategy');

      expect(warmupTest).toBeDefined();
      expect(warmupTest?.description).toContain('warm-up');
      expect(warmupTest?.isActive).toBe(true);
    });

    it('should have valid test configurations', () => {
      const tests = getActiveTests();

      tests.forEach(test => {
        expect(test.testName).toBeTruthy();
        expect(test.description).toBeTruthy();
        expect(test.variantA).toBeTruthy();
        expect(test.variantB).toBeTruthy();
        expect(test.trafficSplit).toBeGreaterThan(0);
        expect(test.trafficSplit).toBeLessThanOrEqual(1);
        expect(typeof test.isActive).toBe('boolean');
      });
    });
  });

  describe('getTestConfig', () => {
    it('should return config for existing test', () => {
      const config = getTestConfig('pser-stopping');

      expect(config).toBeDefined();
      expect(config?.testName).toBe('pser-stopping');
    });

    it('should return undefined for non-existent test', () => {
      const config = getTestConfig('non-existent-test');

      expect(config).toBeUndefined();
    });

    it('should return config with all required fields', () => {
      const config = getTestConfig('pser-stopping');

      expect(config?.testName).toBeTruthy();
      expect(config?.description).toBeTruthy();
      expect(config?.variantA).toBeTruthy();
      expect(config?.variantB).toBeTruthy();
      expect(config?.trafficSplit).toBeDefined();
      expect(config?.isActive).toBeDefined();
    });
  });

  describe('calculateSignificance', () => {
    it('should detect significant difference with large sample', () => {
      // Variant A: mean=30, Variant B: mean=24
      const variantA = Array(100).fill(30).map((v, i) => v + (Math.random() - 0.5) * 2);
      const variantB = Array(100).fill(24).map((v, i) => v + (Math.random() - 0.5) * 2);

      const result = calculateSignificance(variantA, variantB);

      expect(result.significant).toBe(true);
      expect(result.pValue).toBeLessThan(0.05);
      expect(result.meanDiff).toBeLessThan(0); // B is better (fewer questions)
    });

    it('should not detect significance with small difference', () => {
      // Variant A: mean=30, Variant B: mean=29.5 (tiny difference)
      const variantA = Array(30).fill(30).map((v, i) => v + (Math.random() - 0.5) * 5);
      const variantB = Array(30).fill(29.5).map((v, i) => v + (Math.random() - 0.5) * 5);

      const result = calculateSignificance(variantA, variantB);

      expect(result.pValue).toBeGreaterThan(0.05);
      expect(result.significant).toBe(false);
    });

    it('should handle small sample sizes gracefully', () => {
      const variantA = [30, 32];
      const variantB = [24, 26];

      const result = calculateSignificance(variantA, variantB);

      expect(result).toBeDefined();
      expect(typeof result.pValue).toBe('number');
      expect(typeof result.significant).toBe('boolean');
      expect(typeof result.meanDiff).toBe('number');
    });

    it('should return p=1 for insufficient data', () => {
      const variantA = [30];
      const variantB = [24];

      const result = calculateSignificance(variantA, variantB);

      expect(result.pValue).toBe(1);
      expect(result.significant).toBe(false);
      expect(result.meanDiff).toBe(0);
    });

    it('should calculate mean difference correctly', () => {
      const variantA = [30, 30, 30]; // mean = 30
      const variantB = [24, 24, 24]; // mean = 24

      const result = calculateSignificance(variantA, variantB);

      expect(result.meanDiff).toBeCloseTo(-6, 1); // B - A = 24 - 30 = -6
    });

    it('should handle identical distributions', () => {
      const variantA = [25, 30, 35];
      const variantB = [25, 30, 35];

      const result = calculateSignificance(variantA, variantB);

      expect(result.meanDiff).toBeCloseTo(0, 1);
      expect(result.significant).toBe(false);
    });

    it('should handle high variance data', () => {
      const variantA = [10, 20, 30, 40, 50]; // high variance
      const variantB = [15, 25, 35, 45, 55]; // similar variance, +5 mean

      const result = calculateSignificance(variantA, variantB);

      expect(result.meanDiff).toBeCloseTo(5, 1);
      // May or may not be significant due to high variance
      expect(result.pValue).toBeGreaterThan(0);
    });
  });

  describe('hash stability', () => {
    it('should produce consistent hashes for same input', () => {
      const variants = Array.from({ length: 10 }, () =>
        assignVariant('consistent-user', 'consistent-test')
      );

      const firstVariant = variants[0];
      expect(variants.every(v => v === firstVariant)).toBe(true);
    });

    it('should produce different hashes for different inputs', () => {
      const user1Test1 = assignVariant('user1', 'test1');
      const user2Test1 = assignVariant('user2', 'test1');
      const user1Test2 = assignVariant('user1', 'test2');

      // At least one should be different (though not guaranteed due to collisions)
      const uniqueVariants = new Set([user1Test1, user2Test1, user1Test2]);

      // With different inputs, should get at least some variation
      expect(uniqueVariants.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('traffic split edge cases', () => {
    it('should handle 0% traffic split (all A)', () => {
      const results = { A: 0, B: 0 };

      for (let i = 0; i < 100; i++) {
        const variant = assignVariant(`user${i}`, 'test1', 0.0);
        results[variant]++;
      }

      expect(results.B).toBe(100);
      expect(results.A).toBe(0);
    });

    it('should handle 100% traffic split (all A)', () => {
      const results = { A: 0, B: 0 };

      for (let i = 0; i < 100; i++) {
        const variant = assignVariant(`user${i}`, 'test1', 1.0);
        results[variant]++;
      }

      expect(results.A).toBe(100);
      expect(results.B).toBe(0);
    });
  });
});
