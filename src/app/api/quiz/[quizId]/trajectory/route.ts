/**
 * Quiz Trajectory API
 *
 * GET /api/quiz/[quizId]/trajectory
 *
 * Returns quiz performance history for the current user,
 * highlighting the current quiz in the trajectory.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

interface QuizDataPoint {
  quizId: string;
  date: Date;
  score: number;
  questionsCount: number;
  isCurrentQuiz: boolean;
}

interface TrajectoryResponse {
  quizzes: QuizDataPoint[];
  trend: 'improving' | 'stable' | 'declining';
  averageScore: number;
  improvement: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId } = await params;
    const { searchParams } = new URL(request.url);
    const maxQuizzes = parseInt(searchParams.get('maxQuizzes') || '10', 10);
    const days = parseInt(searchParams.get('days') || '90', 10);

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch completed quizzes for the user
    const quizzes = await prisma.quiz.findMany({
      where: {
        userId: session.user.id,
        status: 'completed',
        completedAt: { gte: startDate },
      },
      include: {
        userAnswers: {
          select: {
            isCorrect: true,
          },
        },
      },
      orderBy: {
        completedAt: 'asc',
      },
      take: maxQuizzes * 2, // Fetch more to ensure we have enough after filtering
    });

    // Filter to only quizzes with answers and calculate scores
    const quizDataPoints: QuizDataPoint[] = quizzes
      .filter((q) => q.userAnswers.length > 0 && q.completedAt)
      .slice(-maxQuizzes)
      .map((q) => {
        const correctCount = q.userAnswers.filter((a) => a.isCorrect).length;
        const score = Math.round((correctCount / q.userAnswers.length) * 100);

        return {
          quizId: q.id,
          date: q.completedAt!,
          score,
          questionsCount: q.userAnswers.length,
          isCurrentQuiz: q.id === quizId,
        };
      });

    // Calculate average score
    const averageScore =
      quizDataPoints.length > 0
        ? quizDataPoints.reduce((sum, q) => sum + q.score, 0) / quizDataPoints.length
        : 0;

    // Calculate improvement (first vs last quiz)
    const improvement =
      quizDataPoints.length >= 2
        ? quizDataPoints[quizDataPoints.length - 1].score - quizDataPoints[0].score
        : 0;

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (quizDataPoints.length >= 3) {
      // Compare average of first half vs second half
      const midpoint = Math.floor(quizDataPoints.length / 2);
      const firstHalfAvg =
        quizDataPoints.slice(0, midpoint).reduce((sum, q) => sum + q.score, 0) / midpoint;
      const secondHalfAvg =
        quizDataPoints.slice(midpoint).reduce((sum, q) => sum + q.score, 0) /
        (quizDataPoints.length - midpoint);

      const diff = secondHalfAvg - firstHalfAvg;
      if (diff > 5) trend = 'improving';
      else if (diff < -5) trend = 'declining';
    }

    const response: TrajectoryResponse = {
      quizzes: quizDataPoints,
      trend,
      averageScore,
      improvement,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Trajectory API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trajectory data' },
      { status: 500 }
    );
  }
}
