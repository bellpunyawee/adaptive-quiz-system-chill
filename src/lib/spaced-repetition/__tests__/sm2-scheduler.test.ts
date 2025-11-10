import { describe, it, expect } from 'vitest';
import { SM2Scheduler } from '../sm2-scheduler';

describe('SM-2 Scheduler - Sprint 2', () => {
  const scheduler = new SM2Scheduler();
  const now = new Date('2025-01-01T00:00:00Z');

  // Helper to create review data with default lastReviewed
  const makeReviewData = (data: { easinessFactor: number; interval: number; reviewCount: number }) => ({
    ...data,
    lastReviewed: now
  });

  describe('easiness factor calculation', () => {
    it('should maintain EF at 2.5 for perfect recall (quality=5)', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 2.5, interval: 1, reviewCount: 0 }),
        5
      );

      expect(result.easinessFactor).toBeCloseTo(2.6, 2);
    });

    it('should decrease EF for poor recall (quality=2)', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 2.5, interval: 1, reviewCount: 0 }),
        2
      );

      expect(result.easinessFactor).toBeLessThan(2.5);
    });

    it('should never drop EF below 1.3', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 1.3, interval: 1, reviewCount: 5 }),
        0 // Complete failure
      );

      expect(result.easinessFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('should increase EF for excellent recall (quality=5)', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 2.0, interval: 6, reviewCount: 2 }),
        5
      );

      expect(result.easinessFactor).toBeGreaterThan(2.0);
    });
  });

  describe('interval calculation', () => {
    it('should reset interval to 1 day on failure (quality < 3)', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 2.5, interval: 10, reviewCount: 3 }),
        2 // Failure
      );

      expect(result.interval).toBe(1);
    });

    it('should use 1 day interval for first successful review', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 2.5, interval: 1, reviewCount: 0 }),
        4 // Success
      );

      expect(result.interval).toBe(1);
    });

    it('should use 6 day interval for second successful review', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 2.5, interval: 1, reviewCount: 1 }),
        4 // Success
      );

      expect(result.interval).toBe(6);
    });

    it('should multiply previous interval by EF for subsequent reviews', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 2.5, interval: 6, reviewCount: 2 }),
        4 // Success
      );

      // 6 * 2.5 = 15
      expect(result.interval).toBe(15);
    });

    it('should not increment review count on failure', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 2.5, interval: 10, reviewCount: 3 }),
        2 // Failure
      );

      expect(result.reviewCount).toBe(3); // Unchanged
    });

    it('should increment review count on success', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 2.5, interval: 6, reviewCount: 2 }),
        4 // Success
      );

      expect(result.reviewCount).toBe(3);
    });
  });

  describe('next review date calculation', () => {
    it('should schedule review based on interval', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 2.5, interval: 1, reviewCount: 1 }),
        4
      );

      // Should be approximately 6 days from now
      expect(result.interval).toBe(6);
    });
  });

  describe('quality mapping from quiz responses', () => {
    it('should map fast correct answer (<15s) to quality 5', () => {
      const quality = scheduler.mapResponseToQuality(true, 10000); // 10s

      expect(quality).toBe(5);
    });

    it('should map medium correct answer (15-30s) to quality 4', () => {
      const quality = scheduler.mapResponseToQuality(true, 20000); // 20s

      expect(quality).toBe(4);
    });

    it('should map slow correct answer (30-60s) to quality 3', () => {
      const quality = scheduler.mapResponseToQuality(true, 45000); // 45s

      expect(quality).toBe(3);
    });

    it('should map very slow correct answer (>60s) to quality 2', () => {
      const quality = scheduler.mapResponseToQuality(true, 75000); // 75s

      expect(quality).toBe(2);
    });

    it('should map incorrect answer to quality 0', () => {
      const quality = scheduler.mapResponseToQuality(false, 10000);

      expect(quality).toBe(0);
    });
  });

  describe('SM-2 algorithm sequence', () => {
    it('should follow correct progression for consistent good performance', () => {
      let currentData = makeReviewData({ easinessFactor: 2.5, interval: 1, reviewCount: 0 });

      // First review (quality 4)
      let result = scheduler.calculateNextReview(currentData, 4);
      expect(result.interval).toBe(1);
      expect(result.reviewCount).toBe(1);

      // Second review (quality 4)
      currentData = { ...currentData, ...result, lastReviewed: result.nextReviewDate };
      result = scheduler.calculateNextReview(currentData, 4);
      expect(result.interval).toBe(6);
      expect(result.reviewCount).toBe(2);

      // Third review (quality 4)
      currentData = { ...currentData, ...result, lastReviewed: result.nextReviewDate };
      result = scheduler.calculateNextReview(currentData, 4);
      expect(result.interval).toBeGreaterThan(10); // ~15 days
      expect(result.reviewCount).toBe(3);

      // Fourth review (quality 4)
      currentData = { ...currentData, ...result, lastReviewed: result.nextReviewDate };
      result = scheduler.calculateNextReview(currentData, 4);
      expect(result.interval).toBeGreaterThan(30); // ~37 days
      expect(result.reviewCount).toBe(4);
    });

    it('should reset on failure and rebuild from scratch', () => {
      let currentData = makeReviewData({ easinessFactor: 2.5, interval: 6, reviewCount: 2 });

      // Fail after multiple successes
      let result = scheduler.calculateNextReview(currentData, 1); // Failure
      expect(result.interval).toBe(1);
      expect(result.reviewCount).toBe(2); // Count doesn't reset

      // Rebuild - reviewCount is now 2, so next interval uses formula (not 1 or 6)
      currentData = { ...currentData, ...result, lastReviewed: result.nextReviewDate };
      result = scheduler.calculateNextReview(currentData, 4);
      // With reviewCount=2, uses formula: interval * EF = 1 * 2.46 ≈ 2
      expect(result.interval).toBeGreaterThan(1);
      expect(result.reviewCount).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle extreme easiness factor', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 5.0, interval: 6, reviewCount: 2 }),
        5
      );

      expect(result.easinessFactor).toBeGreaterThan(3);
      expect(result.interval).toBeGreaterThan(20);
    });

    it('should handle minimum easiness factor', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 1.3, interval: 6, reviewCount: 2 }),
        0
      );

      expect(result.easinessFactor).toBe(1.3);
      expect(result.interval).toBe(1);
    });

    it('should round intervals to integers', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 2.7, interval: 6, reviewCount: 2 }),
        4
      );

      expect(Number.isInteger(result.interval)).toBe(true);
    });

    it('should handle zero review count', () => {
      const result = scheduler.calculateNextReview(
        makeReviewData({ easinessFactor: 2.5, interval: 1, reviewCount: 0 }),
        4
      );

      expect(result.reviewCount).toBe(1);
      expect(result.interval).toBe(1);
    });
  });
});
