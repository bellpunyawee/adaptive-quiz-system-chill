import prisma from "@/lib/db";
import { sm2Scheduler } from "./sm2-scheduler";

/**
 * Get questions due for spaced repetition review
 *
 * Priority:
 * 1. Questions past their review date (overdue)
 * 2. Questions due today
 * 3. New incorrect questions (not yet in review system)
 *
 * @param userId - User ID
 * @param cellId - Optional: filter by cell
 * @param count - Number of questions to return
 * @returns Questions ready for review
 */
export async function getSpacedRepetitionQuestions(
  userId: string,
  cellId?: string,
  count: number = 10
) {
  const now = new Date();

  // Get questions due for review (ordered by most overdue first)
  const dueReviews = await prisma.questionReview.findMany({
    where: {
      userId,
      nextReviewDate: { lte: now },
      ...(cellId && {
        question: { cellId }
      })
    },
    orderBy: { nextReviewDate: 'asc' }, // Most overdue first
    take: count,
    include: {
      question: {
        include: {
          answerOptions: true,
          cell: true
        }
      }
    }
  });

  // If we don't have enough due reviews, add new incorrect questions
  if (dueReviews.length < count) {
    const reviewedQuestionIds = dueReviews.map(r => r.questionId);

    // Get incorrect questions not yet in review system
    const newIncorrect = await prisma.userAnswer.findMany({
      where: {
        userId,
        isCorrect: false,
        questionId: { notIn: reviewedQuestionIds },
        ...(cellId && {
          question: { cellId }
        })
      },
      distinct: ['questionId'],
      orderBy: { createdAt: 'desc' }, // Most recent mistakes first
      take: count - dueReviews.length,
      include: {
        question: {
          include: {
            answerOptions: true,
            cell: true
          }
        }
      }
    });

    return {
      dueReviews: dueReviews.map(r => r.question),
      newQuestions: newIncorrect.map(a => a.question),
      totalCount: dueReviews.length + newIncorrect.length
    };
  }

  return {
    dueReviews: dueReviews.map(r => r.question),
    newQuestions: [],
    totalCount: dueReviews.length
  };
}

/**
 * Update spaced repetition schedule after answering a question
 *
 * @param userId - User ID
 * @param questionId - Question ID
 * @param isCorrect - Whether answer was correct
 * @param responseTime - Time taken (milliseconds)
 * @returns Updated review data
 */
export async function updateSpacedRepetition(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  responseTime: number
) {
  // Map response to quality score
  const quality = sm2Scheduler.mapResponseToQuality(isCorrect, responseTime);

  // Get or create review record
  let review = await prisma.questionReview.findUnique({
    where: {
      userId_questionId: {
        userId,
        questionId
      }
    }
  });

  if (!review) {
    // Create initial review record
    const now = new Date();
    review = await prisma.questionReview.create({
      data: {
        userId,
        questionId,
        lastReviewed: now,
        reviewCount: 0,
        easinessFactor: 2.5, // Default starting EF
        interval: 1,
        nextReviewDate: now // Will be updated immediately below
      }
    });
  }

  // Calculate next review using SM-2
  const nextReview = sm2Scheduler.calculateNextReview(
    {
      reviewCount: review.reviewCount,
      easinessFactor: review.easinessFactor,
      interval: review.interval,
      lastReviewed: review.lastReviewed
    },
    quality
  );

  // Update review record
  const updated = await prisma.questionReview.update({
    where: { id: review.id },
    data: {
      lastReviewed: new Date(),
      reviewCount: nextReview.reviewCount, // Use count from SM-2 algorithm
      easinessFactor: nextReview.easinessFactor,
      interval: nextReview.interval,
      nextReviewDate: nextReview.nextReviewDate
    }
  });

  return {
    quality,
    nextReviewDate: nextReview.nextReviewDate,
    interval: nextReview.interval,
    easinessFactor: nextReview.easinessFactor
  };
}

/**
 * Get upcoming reviews for a user
 *
 * @param userId - User ID
 * @param days - Number of days ahead to look (default 7)
 * @returns Reviews grouped by date
 */
export async function getUpcomingReviews(
  userId: string,
  days: number = 7
) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const reviews = await prisma.questionReview.findMany({
    where: {
      userId,
      nextReviewDate: {
        gte: now,
        lte: futureDate
      }
    },
    orderBy: { nextReviewDate: 'asc' },
    include: {
      question: {
        include: { cell: true }
      }
    }
  });

  // Group by date
  const grouped = new Map<string, typeof reviews>();

  reviews.forEach(review => {
    const dateKey = review.nextReviewDate.toISOString().split('T')[0];
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(review);
  });

  return Array.from(grouped.entries()).map(([date, reviews]) => ({
    date,
    count: reviews.length,
    reviews
  }));
}

/**
 * Get review statistics for a user
 *
 * @param userId - User ID
 * @returns Review statistics
 */
export async function getReviewStatistics(userId: string) {
  const now = new Date();

  const [total, dueToday, overdue, avgEF, avgInterval] = await Promise.all([
    // Total reviews in system
    prisma.questionReview.count({ where: { userId } }),

    // Due today
    prisma.questionReview.count({
      where: {
        userId,
        nextReviewDate: {
          gte: new Date(now.setHours(0, 0, 0, 0)),
          lt: new Date(now.setHours(23, 59, 59, 999))
        }
      }
    }),

    // Overdue
    prisma.questionReview.count({
      where: {
        userId,
        nextReviewDate: { lt: new Date() }
      }
    }),

    // Average easiness factor
    prisma.questionReview.aggregate({
      where: { userId },
      _avg: { easinessFactor: true }
    }),

    // Average interval
    prisma.questionReview.aggregate({
      where: { userId },
      _avg: { interval: true }
    })
  ]);

  return {
    totalReviews: total,
    dueToday,
    overdue,
    averageEasinessFactor: avgEF._avg.easinessFactor || 2.5,
    averageInterval: avgInterval._avg.interval || 1
  };
}
