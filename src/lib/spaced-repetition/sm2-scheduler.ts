/**
 * SM-2 (SuperMemo 2) Spaced Repetition Algorithm
 *
 * Research basis: Wozniak, P. A. (1990). Algorithm SM-2
 * Optimal interval: 80% retention threshold (MemoryLab NOLAI 2024)
 *
 * Algorithm:
 * - EF (Easiness Factor): 1.3 to 2.5+, starts at 2.5
 * - Interval multiplied by EF after each successful review
 * - Failed reviews reset interval to 1 day
 */

export interface ReviewData {
  reviewCount: number;
  easinessFactor: number;
  interval: number; // days
  lastReviewed: Date;
}

export interface SM2Result {
  interval: number;      // days until next review
  easinessFactor: number; // updated EF
  nextReviewDate: Date;
  reviewCount: number;   // updated review count
}

/**
 * Quality of recall (0-5 scale):
 * 5 - Perfect response
 * 4 - Correct response after hesitation
 * 3 - Correct response with difficulty
 * 2 - Incorrect but remembered
 * 1 - Incorrect, barely familiar
 * 0 - Complete blackout
 */
export type RecallQuality = 0 | 1 | 2 | 3 | 4 | 5;

export class SM2Scheduler {
  /**
   * Calculate next review based on SM-2 algorithm
   *
   * @param currentData - Current review state
   * @param quality - Quality of recall (0-5)
   * @returns Updated review parameters
   */
  calculateNextReview(
    currentData: ReviewData,
    quality: RecallQuality
  ): SM2Result {
    // Update easiness factor
    let newEF = this.updateEasinessFactor(currentData.easinessFactor, quality);

    // Calculate new interval and review count
    let newInterval: number;
    let newReviewCount: number;

    if (quality < 3) {
      // Failed recall - reset to day 1, but keep review count
      newInterval = 1;
      newReviewCount = currentData.reviewCount; // Don't increment on failure
    } else {
      // Successful recall - use SM-2 formula
      newReviewCount = currentData.reviewCount + 1; // Increment on success

      if (currentData.reviewCount === 0) {
        newInterval = 1; // First review
      } else if (currentData.reviewCount === 1) {
        newInterval = 6; // Second review
      } else {
        // Subsequent reviews: multiply previous interval by EF
        newInterval = Math.round(currentData.interval * newEF);
      }
    }

    // Calculate next review date
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + newInterval);

    return {
      interval: newInterval,
      easinessFactor: newEF,
      nextReviewDate: nextDate,
      reviewCount: newReviewCount
    };
  }

  /**
   * Update easiness factor based on recall quality
   *
   * Formula: EF' = EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02))
   *
   * @param currentEF - Current easiness factor
   * @param quality - Recall quality (0-5)
   * @returns Updated easiness factor (minimum 1.3)
   */
  private updateEasinessFactor(
    currentEF: number,
    quality: RecallQuality
  ): number {
    const adjustment = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    const newEF = currentEF + adjustment;

    // Minimum EF is 1.3 (prevents too-long intervals for difficult items)
    return Math.max(1.3, newEF);
  }

  /**
   * Map quiz response to recall quality (0-5)
   *
   * @param isCorrect - Whether answer was correct
   * @param responseTime - Time taken to answer (milliseconds)
   * @returns Recall quality score
   */
  mapResponseToQuality(
    isCorrect: boolean,
    responseTime: number
  ): RecallQuality {
    if (!isCorrect) {
      return 0; // Complete failure
    }

    // Correct answer - quality based on response time
    // Fast = better recall quality
    const avgTime = 30000; // 30 seconds baseline

    if (responseTime < avgTime * 0.5) {
      return 5; // Very fast (< 15s)
    } else if (responseTime < avgTime) {
      return 4; // Fast (15-30s)
    } else if (responseTime < avgTime * 2) {
      return 3; // Normal (30-60s)
    } else {
      return 2; // Slow (> 60s) - technically correct but struggled
    }
  }

  /**
   * Get optimal review schedule projection
   * Shows when reviews will occur if all successful
   *
   * @param initialEF - Starting easiness factor (default 2.5)
   * @param maxReviews - Number of reviews to project
   * @returns Array of projected review dates
   */
  projectReviewSchedule(
    initialEF: number = 2.5,
    maxReviews: number = 10
  ): { reviewNumber: number; daysFromStart: number; interval: number }[] {
    const schedule = [];
    let currentData: ReviewData = {
      reviewCount: 0,
      easinessFactor: initialEF,
      interval: 1,
      lastReviewed: new Date()
    };

    let totalDays = 0;

    for (let i = 0; i < maxReviews; i++) {
      const result = this.calculateNextReview(currentData, 5); // Assume perfect recall

      totalDays += result.interval;

      schedule.push({
        reviewNumber: i + 1,
        daysFromStart: totalDays,
        interval: result.interval
      });

      // Update for next iteration
      currentData = {
        reviewCount: currentData.reviewCount + 1,
        easinessFactor: result.easinessFactor,
        interval: result.interval,
        lastReviewed: result.nextReviewDate
      };
    }

    return schedule;
  }
}

/**
 * Singleton instance for easy access
 */
export const sm2Scheduler = new SM2Scheduler();
