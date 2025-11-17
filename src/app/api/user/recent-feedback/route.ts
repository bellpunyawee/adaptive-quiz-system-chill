/**
 * User Recent Feedback API
 *
 * GET /api/user/recent-feedback
 * Retrieves the most recent AI-generated feedback for the user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get limit from query params (default: 3)
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '3', 10);

    // Fetch recent feedback logs with quiz details
    const feedbackLogs = await prisma.feedbackLog.findMany({
      where: {
        userId,
        feedbackType: 'quiz_summary',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Fetch quiz details for each feedback
    const feedbacks = await Promise.all(
      feedbackLogs.map(async (log) => {
        const quiz = await prisma.quiz.findUnique({
          where: { id: log.quizId },
          include: {
            userAnswers: {
              select: {
                isCorrect: true,
              },
            },
          },
        });

        if (!quiz) {
          return null;
        }

        const totalQuestions = quiz.userAnswers.length;
        const correctAnswers = quiz.userAnswers.filter((a) => a.isCorrect).length;
        const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

        // Extract key insight from feedback (first sentence or bullet point)
        const feedbackText = log.feedbackText;
        let keyInsight = '';

        // Try to extract summary section
        const summaryMatch = feedbackText.match(/\*\*Performance Summary\*\*\s*(.*?)(?=\*\*|$)/is);
        if (summaryMatch) {
          const summary = summaryMatch[1].trim();
          // Get first sentence
          const firstSentence = summary.split(/[.!?]/)[0];
          keyInsight = firstSentence.substring(0, 150) + (firstSentence.length > 150 ? '...' : '');
        } else {
          // Fallback: get first 150 characters
          keyInsight = feedbackText.substring(0, 150) + (feedbackText.length > 150 ? '...' : '');
        }

        return {
          feedbackId: log.id, // Unique feedback log ID
          quizId: quiz.id,
          quizDate: quiz.completedAt || quiz.createdAt,
          quizScore: score,
          feedbackText: log.feedbackText,
          summary: log.feedbackText,
          keyInsight: keyInsight || `Quiz completed with ${score}% accuracy`,
        };
      })
    );

    // Filter out null entries
    const validFeedbacks = feedbacks.filter((f) => f !== null);

    return NextResponse.json({
      feedbacks: validFeedbacks,
      count: validFeedbacks.length,
    });
  } catch (error: any) {
    console.error('[Recent Feedback] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent feedback', message: error.message },
      { status: 500 }
    );
  }
}
