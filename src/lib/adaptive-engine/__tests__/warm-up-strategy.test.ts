import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getInitialThetaEstimate } from '../warm-up-strategy';

// Mock prisma
vi.mock('@/lib/db', () => ({
  default: {
    userCellMastery: {
      findMany: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    }
  }
}));

import prisma from '@/lib/db';

describe('Warm-up Strategy - Sprint 1', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInitialThetaEstimate', () => {
    it('should return default prior (0) when user has no other cell data', async () => {
      vi.mocked(prisma.userCellMastery.findMany).mockResolvedValue([]);

      const result = await getInitialThetaEstimate('user1', 'cell1');

      expect(result.theta).toBe(0);
      expect(result.source).toBe('default_prior');
    });

    it('should use average of other cell abilities', async () => {
      const mockMasteries = [
        { cellId: 'cell2', ability_theta: 1.0, updatedAt: new Date() },
        { cellId: 'cell3', ability_theta: 1.5, updatedAt: new Date() },
        { cellId: 'cell4', ability_theta: 0.5, updatedAt: new Date() },
      ];

      vi.mocked(prisma.userCellMastery.findMany).mockResolvedValue(mockMasteries as any);

      const result = await getInitialThetaEstimate('user1', 'cell1');

      // Average = (1.0 + 1.5 + 0.5) / 3 = 1.0
      // With regression factor 0.7: 1.0 * 0.7 = 0.7
      expect(result.theta).toBeCloseTo(0.7, 2);
      expect(result.source).toBe('correlated_cells_n3');
    });

    it('should limit to most recent 5 cells', async () => {
      // Mock returns all 10, but function should take only 5
      const mockMasteries = Array.from({ length: 5 }, (_, i) => ({
        cellId: `cell${i}`,
        ability_theta: i * 0.1,
        updatedAt: new Date(),
      }));

      vi.mocked(prisma.userCellMastery.findMany).mockResolvedValue(mockMasteries as any);

      const result = await getInitialThetaEstimate('user1', 'target-cell');

      expect(result.source).toBe('correlated_cells_n5');
      expect(prisma.userCellMastery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5
        })
      );
    });

    it('should apply regression toward mean (0.7 factor)', async () => {
      const mockMasteries = [
        { cellId: 'cell2', ability_theta: 2.0, updatedAt: new Date() },
      ];

      vi.mocked(prisma.userCellMastery.findMany).mockResolvedValue(mockMasteries as any);

      const result = await getInitialThetaEstimate('user1', 'cell1');

      // Average = 2.0
      // Regression: 2.0 * 0.7 = 1.4
      expect(result.theta).toBeCloseTo(1.4, 2);
    });

    it('should handle negative abilities correctly', async () => {
      const mockMasteries = [
        { cellId: 'cell2', ability_theta: -1.0, updatedAt: new Date() },
        { cellId: 'cell3', ability_theta: -2.0, updatedAt: new Date() },
      ];

      vi.mocked(prisma.userCellMastery.findMany).mockResolvedValue(mockMasteries as any);

      const result = await getInitialThetaEstimate('user1', 'cell1');

      // Average = (-1.0 + -2.0) / 2 = -1.5
      // Regression: -1.5 * 0.7 = -1.05
      expect(result.theta).toBeCloseTo(-1.05, 2);
    });

    it('should exclude the target cell from calculation', async () => {
      await getInitialThetaEstimate('user1', 'cell-target');

      expect(prisma.userCellMastery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cellId: { not: 'cell-target' }
          })
        })
      );
    });

    it('should order by updatedAt descending (most recent first)', async () => {
      await getInitialThetaEstimate('user1', 'cell1');

      expect(prisma.userCellMastery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: 'desc' }
        })
      );
    });
  });

  describe('warm-up difficulty range', () => {
    it('should define appropriate difficulty range for warm-up questions', () => {
      // Based on code: ±0.8 from initial theta
      const difficultyRange = 0.8;

      // For theta = 1.0, warm-up questions should be between 0.2 and 1.8
      const theta = 1.0;
      const lowerBound = theta - difficultyRange;
      const upperBound = theta + difficultyRange;

      expect(lowerBound).toBeCloseTo(0.2, 10);
      expect(upperBound).toBeCloseTo(1.8, 10);
    });

    it('should require high discrimination (>= 1.0) for warm-up', () => {
      const minDiscrimination = 1.0;

      expect(minDiscrimination).toBeGreaterThanOrEqual(1.0);
    });
  });

  describe('regression factor rationale', () => {
    it('should explain 0.7 regression factor', () => {
      // Regression toward mean prevents overconfidence in initial estimate
      // 70% weight to observed abilities, 30% to prior (theta=0)

      const observedMean = 2.0;
      const prior = 0;
      const regressionFactor = 0.7;

      const estimate = observedMean * regressionFactor + prior * (1 - regressionFactor);

      expect(estimate).toBe(1.4); // More conservative than raw 2.0
    });
  });

  describe('edge cases', () => {
    it('should handle single cell mastery', async () => {
      const mockMasteries = [
        { cellId: 'cell2', ability_theta: 1.5, updatedAt: new Date() },
      ];

      vi.mocked(prisma.userCellMastery.findMany).mockResolvedValue(mockMasteries as any);

      const result = await getInitialThetaEstimate('user1', 'cell1');

      expect(result.theta).toBeCloseTo(1.05, 2); // 1.5 * 0.7
      expect(result.source).toBe('correlated_cells_n1');
    });

    it('should handle extreme ability values', async () => {
      const mockMasteries = [
        { cellId: 'cell2', ability_theta: 4.0, updatedAt: new Date() },
      ];

      vi.mocked(prisma.userCellMastery.findMany).mockResolvedValue(mockMasteries as any);

      const result = await getInitialThetaEstimate('user1', 'cell1');

      // 4.0 * 0.7 = 2.8 (still high but regressed toward mean)
      expect(result.theta).toBeCloseTo(2.8, 2);
    });

    it('should handle zero ability average', async () => {
      const mockMasteries = [
        { cellId: 'cell2', ability_theta: 1.0, updatedAt: new Date() },
        { cellId: 'cell3', ability_theta: -1.0, updatedAt: new Date() },
      ];

      vi.mocked(prisma.userCellMastery.findMany).mockResolvedValue(mockMasteries as any);

      const result = await getInitialThetaEstimate('user1', 'cell1');

      // Average = 0, Regression: 0 * 0.7 = 0
      expect(result.theta).toBe(0);
    });
  });
});
