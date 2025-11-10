import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateAdmissionProbability,
  applyExposureControl,
  selectWithExposureControl,
  getExposureStatistics,
  DEFAULT_EXPOSURE_CONFIG
} from '../sympson-hetter';

// Mock prisma
vi.mock('@/lib/db', () => ({
  default: {
    question: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    quiz: {
      count: vi.fn(),
    },
    userAnswer: {
      count: vi.fn(),
    }
  }
}));

import prisma from '@/lib/db';

describe('Sympson-Hetter Exposure Control - Sprint 2', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateAdmissionProbability', () => {
    it('should return probability 1.0 when exposure control disabled', async () => {
      const config = { ...DEFAULT_EXPOSURE_CONFIG, enabled: false };
      const result = await calculateAdmissionProbability('q1', config);

      expect(result.admissionProbability).toBe(1.0);
      expect(result.exposureRate).toBe(0);
    });

    it('should return probability 1.0 for never-used question', async () => {
      vi.mocked(prisma.question.findUnique).mockResolvedValue({
        exposureCount: 0,
        lastUsed: null
      } as any);

      vi.mocked(prisma.quiz.count).mockResolvedValue(100);
      vi.mocked(prisma.userAnswer.count).mockResolvedValue(1000);

      const result = await calculateAdmissionProbability('q1', DEFAULT_EXPOSURE_CONFIG);

      expect(result.admissionProbability).toBe(1.0);
      expect(result.exposureRate).toBe(0);
    });

    it('should calculate admission probability using Sympson-Hetter formula', async () => {
      // Question used 200 times out of 1000 total answers = 20% exposure rate
      // Max exposure rate is 20%, so P = min(1, 0.20/0.20) = 1.0
      vi.mocked(prisma.question.findUnique).mockResolvedValue({
        exposureCount: 200,
        lastUsed: new Date()
      } as any);

      vi.mocked(prisma.quiz.count).mockResolvedValue(100);
      vi.mocked(prisma.userAnswer.count).mockResolvedValue(1000);

      const result = await calculateAdmissionProbability('q1', DEFAULT_EXPOSURE_CONFIG);

      expect(result.exposureRate).toBeCloseTo(0.20, 2);
      expect(result.admissionProbability).toBeCloseTo(1.0, 2);
    });

    it('should reduce admission probability for overexposed items', async () => {
      // Question used 400 times out of 1000 total = 40% exposure rate
      // Max is 20%, so P = min(1, 0.20/0.40) = 0.5
      vi.mocked(prisma.question.findUnique).mockResolvedValue({
        exposureCount: 400,
        lastUsed: new Date()
      } as any);

      vi.mocked(prisma.quiz.count).mockResolvedValue(100);
      vi.mocked(prisma.userAnswer.count).mockResolvedValue(1000);

      const result = await calculateAdmissionProbability('q1', DEFAULT_EXPOSURE_CONFIG);

      expect(result.exposureRate).toBeCloseTo(0.40, 2);
      expect(result.admissionProbability).toBeCloseTo(0.5, 2);
    });

    it('should enforce minimum admission threshold', async () => {
      // Extreme overexposure: 900 out of 1000 = 90% exposure
      // P = min(1, 0.20/0.90) = 0.222, but threshold is 0.05
      // Should return max(0.05, 0.222) = 0.222
      vi.mocked(prisma.question.findUnique).mockResolvedValue({
        exposureCount: 900,
        lastUsed: new Date()
      } as any);

      vi.mocked(prisma.quiz.count).mockResolvedValue(100);
      vi.mocked(prisma.userAnswer.count).mockResolvedValue(1000);

      const result = await calculateAdmissionProbability('q1', DEFAULT_EXPOSURE_CONFIG);

      expect(result.admissionProbability).toBeGreaterThanOrEqual(0.05);
      expect(result.admissionProbability).toBeLessThan(0.3);
    });

    it('should return 0 probability for non-existent question', async () => {
      vi.mocked(prisma.question.findUnique).mockResolvedValue(null);

      const result = await calculateAdmissionProbability('invalid-id', DEFAULT_EXPOSURE_CONFIG);

      expect(result.admissionProbability).toBe(0);
      expect(result.exposureRate).toBe(0);
    });
  });

  describe('applyExposureControl', () => {
    it('should admit all questions when control disabled', async () => {
      const config = { ...DEFAULT_EXPOSURE_CONFIG, enabled: false };
      const results = await applyExposureControl(['q1', 'q2', 'q3'], config);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.shouldAdmit)).toBe(true);
      expect(results.every(r => r.admissionProbability === 1.0)).toBe(true);
    });

    it('should return empty array for empty input', async () => {
      const results = await applyExposureControl([], DEFAULT_EXPOSURE_CONFIG);

      expect(results).toHaveLength(0);
    });

    it('should make probabilistic admission decisions', async () => {
      // Mock Math.random for deterministic testing
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = () => {
        // Return values: 0.1, 0.6, 0.9
        const values = [0.1, 0.6, 0.9];
        return values[callCount++ % values.length];
      };

      vi.mocked(prisma.question.findUnique).mockResolvedValue({
        exposureCount: 200,
        lastUsed: new Date()
      } as any);

      vi.mocked(prisma.quiz.count).mockResolvedValue(100);
      vi.mocked(prisma.userAnswer.count).mockResolvedValue(1000);

      // Admission prob = 1.0, so random values 0.1, 0.6, 0.9 all < 1.0 → all admitted
      const results = await applyExposureControl(['q1', 'q2', 'q3'], DEFAULT_EXPOSURE_CONFIG);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.shouldAdmit)).toBe(true);

      Math.random = originalRandom;
    });
  });

  describe('selectWithExposureControl', () => {
    it('should return null for empty candidate list', async () => {
      const result = await selectWithExposureControl([], DEFAULT_EXPOSURE_CONFIG);

      expect(result).toBeNull();
    });

    it('should admit first question if probability is high', async () => {
      vi.mocked(prisma.question.findUnique).mockResolvedValue({
        exposureCount: 10,
        lastUsed: new Date()
      } as any);

      vi.mocked(prisma.quiz.count).mockResolvedValue(100);
      vi.mocked(prisma.userAnswer.count).mockResolvedValue(1000);

      const candidates = [
        { id: 'q1', score: 0.9 },
        { id: 'q2', score: 0.8 },
        { id: 'q3', score: 0.7 }
      ];

      // High admission probability (1.0), so first question should be admitted
      const result = await selectWithExposureControl(candidates, DEFAULT_EXPOSURE_CONFIG);

      expect(result).toBe('q1');
    });

    it('should try next best question if first is rejected', async () => {
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = () => {
        // First call: 0.95 (reject if P < 0.95)
        // Second call: 0.1 (admit if P > 0.1)
        return callCount++ === 0 ? 0.95 : 0.1;
      };

      // First question: high exposure (low admission prob)
      // Second question: low exposure (high admission prob)
      vi.mocked(prisma.question.findUnique).mockImplementation((args: any) => {
        const id = args.where.id;
        if (id === 'q1') {
          return Promise.resolve({ exposureCount: 800, lastUsed: new Date() } as any);
        } else {
          return Promise.resolve({ exposureCount: 10, lastUsed: new Date() } as any);
        }
      });

      vi.mocked(prisma.quiz.count).mockResolvedValue(100);
      vi.mocked(prisma.userAnswer.count).mockResolvedValue(1000);

      const candidates = [
        { id: 'q1', score: 0.9 },
        { id: 'q2', score: 0.8 },
      ];

      const result = await selectWithExposureControl(candidates, DEFAULT_EXPOSURE_CONFIG);

      // Should skip q1 and select q2
      expect(result).toBe('q2');

      Math.random = originalRandom;
    });

    it('should force-admit best question if all rejected', async () => {
      const originalRandom = Math.random;
      Math.random = () => 0.99; // Always reject (random > any admission prob)

      vi.mocked(prisma.question.findUnique).mockResolvedValue({
        exposureCount: 900,
        lastUsed: new Date()
      } as any);

      vi.mocked(prisma.quiz.count).mockResolvedValue(100);
      vi.mocked(prisma.userAnswer.count).mockResolvedValue(1000);

      const candidates = [
        { id: 'q1', score: 0.9 },
        { id: 'q2', score: 0.8 }
      ];

      const result = await selectWithExposureControl(candidates, DEFAULT_EXPOSURE_CONFIG);

      // Should force-admit q1 (best candidate)
      expect(result).toBe('q1');

      Math.random = originalRandom;
    });
  });

  describe('getExposureStatistics', () => {
    it('should calculate exposure statistics correctly', async () => {
      const mockQuestions = [
        { id: 'q1', exposureCount: 0, maxExposure: 10, lastUsed: null, cellId: 'c1' },
        { id: 'q2', exposureCount: 5, maxExposure: 10, lastUsed: new Date(), cellId: 'c1' },
        { id: 'q3', exposureCount: 10, maxExposure: 10, lastUsed: new Date(), cellId: 'c1' },
        { id: 'q4', exposureCount: 15, maxExposure: 10, lastUsed: new Date(), cellId: 'c1' },
      ];

      vi.mocked(prisma.question.findMany).mockResolvedValue(mockQuestions as any);

      const stats = await getExposureStatistics();

      expect(stats.totalQuestions).toBe(4);
      expect(stats.maxExposure).toBe(15);
      expect(stats.minExposure).toBe(0);
      expect(stats.underexposedCount).toBe(1); // q1 with 0 exposure
      expect(stats.overexposedCount).toBe(2); // q3, q4 at/over max
    });

    it('should filter by cellId if provided', async () => {
      vi.mocked(prisma.question.findMany).mockResolvedValue([
        { id: 'q1', exposureCount: 5, maxExposure: 10, lastUsed: new Date(), cellId: 'c1' }
      ] as any);

      const stats = await getExposureStatistics('c1');

      expect(prisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cellId: 'c1', isActive: true }
        })
      );
    });

    it('should calculate Gini coefficient for inequality', async () => {
      // Perfectly equal distribution
      const equalQuestions = [
        { id: 'q1', exposureCount: 5, maxExposure: 10, lastUsed: new Date(), cellId: 'c1' },
        { id: 'q2', exposureCount: 5, maxExposure: 10, lastUsed: new Date(), cellId: 'c1' },
        { id: 'q3', exposureCount: 5, maxExposure: 10, lastUsed: new Date(), cellId: 'c1' },
      ];

      vi.mocked(prisma.question.findMany).mockResolvedValue(equalQuestions as any);

      const stats = await getExposureStatistics();

      // Gini coefficient for perfect equality should be close to 0
      expect(parseFloat(stats.giniCoefficient)).toBeLessThan(0.1);
    });
  });

  describe('Sympson-Hetter formula validation', () => {
    it('should implement correct formula: P = min(1, r_max / r_observed)', async () => {
      const testCases = [
        { observed: 0.10, max: 0.20, expectedP: 1.0 },   // Under-exposed
        { observed: 0.20, max: 0.20, expectedP: 1.0 },   // At target
        { observed: 0.40, max: 0.20, expectedP: 0.5 },   // Over-exposed
        { observed: 0.80, max: 0.20, expectedP: 0.25 },  // Heavily over-exposed
      ];

      for (const testCase of testCases) {
        // Mock exposure count to achieve desired rate
        const totalAnswers = 1000;
        const exposureCount = testCase.observed * totalAnswers;

        vi.mocked(prisma.question.findUnique).mockResolvedValue({
          exposureCount,
          lastUsed: new Date()
        } as any);

        vi.mocked(prisma.quiz.count).mockResolvedValue(100);
        vi.mocked(prisma.userAnswer.count).mockResolvedValue(totalAnswers);

        const config = { ...DEFAULT_EXPOSURE_CONFIG, maxExposureRate: testCase.max };
        const result = await calculateAdmissionProbability('q1', config);

        expect(result.admissionProbability).toBeCloseTo(testCase.expectedP, 2);
      }
    });
  });
});
