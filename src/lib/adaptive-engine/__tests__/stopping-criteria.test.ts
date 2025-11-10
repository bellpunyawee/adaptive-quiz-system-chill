import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateSEM,
  getStoppingConfigForQuizType,
  StoppingConfig
} from '../stopping-criteria';

describe('Stopping Criteria - Sprint 1 Improvements', () => {

  describe('calculateSEM', () => {
    it('should calculate correct SEM from Fisher Information', () => {
      // SEM = 1 / sqrt(I)
      expect(calculateSEM(1)).toBe(1);
      expect(calculateSEM(4)).toBe(0.5);
      expect(calculateSEM(9)).toBeCloseTo(0.333, 2);
      expect(calculateSEM(16)).toBe(0.25);
    });

    it('should return Infinity for zero or negative information', () => {
      expect(calculateSEM(0)).toBe(Infinity);
      expect(calculateSEM(-1)).toBe(Infinity);
    });
  });

  describe('getStoppingConfigForQuizType', () => {
    describe('baseline quiz configuration', () => {
      it('should return thorough config for baseline', () => {
        const config = getStoppingConfigForQuizType('baseline');

        expect(config.minQuestions).toBe(10);
        expect(config.maxQuestions).toBe(50);
        expect(config.targetSEM).toBe(0.25); // Higher precision
        expect(config.enablePSER).toBe(true);
        expect(config.pserThreshold).toBe(0.03); // More aggressive
        expect(config.minInfoThreshold).toBe(0.08);
      });

      it('should require more questions than regular', () => {
        const baseline = getStoppingConfigForQuizType('baseline');
        const regular = getStoppingConfigForQuizType('regular');

        expect(baseline.minQuestions).toBeGreaterThan(regular.minQuestions);
        expect(baseline.maxQuestions).toBeGreaterThan(regular.maxQuestions);
      });

      it('should have stricter SEM target than regular', () => {
        const baseline = getStoppingConfigForQuizType('baseline');
        const regular = getStoppingConfigForQuizType('regular');

        expect(baseline.targetSEM).toBeLessThan(regular.targetSEM);
      });
    });

    describe('practice quiz configuration', () => {
      it('should return fast config for practice-new', () => {
        const config = getStoppingConfigForQuizType('practice-new');

        expect(config.minQuestions).toBe(3);
        expect(config.maxQuestions).toBe(20);
        expect(config.targetSEM).toBe(0.4); // Lower precision OK
        expect(config.pserThreshold).toBe(0.10); // Stop faster
        expect(config.minInfoThreshold).toBe(0.15);
      });

      it('should return fast config for practice-review', () => {
        const config = getStoppingConfigForQuizType('practice-review');

        expect(config.minQuestions).toBe(3);
        expect(config.maxQuestions).toBe(20);
        expect(config.targetSEM).toBe(0.4);
      });

      it('should require fewer questions than regular', () => {
        const practice = getStoppingConfigForQuizType('practice-new');
        const regular = getStoppingConfigForQuizType('regular');

        expect(practice.minQuestions).toBeLessThan(regular.minQuestions);
        expect(practice.maxQuestions).toBeLessThan(regular.maxQuestions);
      });

      it('should have looser SEM target than regular', () => {
        const practice = getStoppingConfigForQuizType('practice-new');
        const regular = getStoppingConfigForQuizType('regular');

        expect(practice.targetSEM).toBeGreaterThan(regular.targetSEM);
      });

      it('should have higher PSER threshold (stop faster)', () => {
        const practice = getStoppingConfigForQuizType('practice-new');
        const regular = getStoppingConfigForQuizType('regular');

        expect(practice.pserThreshold).toBeGreaterThan(regular.pserThreshold || 0);
      });
    });

    describe('regular quiz configuration', () => {
      it('should return balanced default config', () => {
        const config = getStoppingConfigForQuizType('regular');

        expect(config.minQuestions).toBe(5);
        expect(config.maxQuestions).toBe(30);
        expect(config.targetSEM).toBe(0.3);
        expect(config.confidenceLevel).toBe(0.95);
        expect(config.enablePSER).toBe(true);
        expect(config.pserThreshold).toBe(0.05);
        expect(config.enableMinInfoRule).toBe(true);
        expect(config.minInfoThreshold).toBe(0.1);
      });

      it('should return default for unknown quiz type', () => {
        const config = getStoppingConfigForQuizType('unknown-type');
        const regular = getStoppingConfigForQuizType('regular');

        expect(config).toEqual(regular);
      });
    });

    describe('PSER and MinInfo features', () => {
      it('should enable PSER by default for all quiz types', () => {
        const baseline = getStoppingConfigForQuizType('baseline');
        const practice = getStoppingConfigForQuizType('practice-new');
        const regular = getStoppingConfigForQuizType('regular');

        expect(baseline.enablePSER).toBe(true);
        expect(practice.enablePSER).toBe(true);
        expect(regular.enablePSER).toBe(true);
      });

      it('should enable MinInfoRule by default for all quiz types', () => {
        const baseline = getStoppingConfigForQuizType('baseline');
        const practice = getStoppingConfigForQuizType('practice-new');
        const regular = getStoppingConfigForQuizType('regular');

        expect(baseline.enableMinInfoRule).toBe(true);
        expect(practice.enableMinInfoRule).toBe(true);
        expect(regular.enableMinInfoRule).toBe(true);
      });

      it('should have valid PSER thresholds (0-1 range)', () => {
        const baseline = getStoppingConfigForQuizType('baseline');
        const practice = getStoppingConfigForQuizType('practice-new');
        const regular = getStoppingConfigForQuizType('regular');

        expect(baseline.pserThreshold).toBeGreaterThan(0);
        expect(baseline.pserThreshold).toBeLessThan(1);

        expect(practice.pserThreshold).toBeGreaterThan(0);
        expect(practice.pserThreshold).toBeLessThan(1);

        expect(regular.pserThreshold).toBeGreaterThan(0);
        expect(regular.pserThreshold).toBeLessThan(1);
      });
    });

    describe('configuration consistency', () => {
      it('should have minQuestions <= maxQuestions', () => {
        const types = ['baseline', 'practice-new', 'practice-review', 'regular'];

        types.forEach(type => {
          const config = getStoppingConfigForQuizType(type);
          expect(config.minQuestions).toBeLessThanOrEqual(config.maxQuestions);
        });
      });

      it('should have positive SEM targets', () => {
        const types = ['baseline', 'practice-new', 'practice-review', 'regular'];

        types.forEach(type => {
          const config = getStoppingConfigForQuizType(type);
          expect(config.targetSEM).toBeGreaterThan(0);
        });
      });

      it('should have valid confidence levels (0-1)', () => {
        const types = ['baseline', 'practice-new', 'practice-review', 'regular'];

        types.forEach(type => {
          const config = getStoppingConfigForQuizType(type);
          expect(config.confidenceLevel).toBeGreaterThan(0);
          expect(config.confidenceLevel).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  describe('PSER threshold interpretation', () => {
    it('should interpret PSER thresholds correctly', () => {
      // Baseline: 3% improvement needed to continue (strict)
      // Practice: 10% improvement needed to continue (loose)
      // Regular: 5% improvement needed to continue (balanced)

      const baseline = getStoppingConfigForQuizType('baseline');
      const practice = getStoppingConfigForQuizType('practice-new');
      const regular = getStoppingConfigForQuizType('regular');

      // Lower threshold = more likely to continue (more questions)
      expect(baseline.pserThreshold).toBeLessThan(regular.pserThreshold || 0);

      // Higher threshold = more likely to stop (fewer questions)
      expect(practice.pserThreshold).toBeGreaterThan(regular.pserThreshold || 0);
    });
  });
});
