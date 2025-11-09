// src/app/api/quiz/baseline/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

/**
 * POST /api/quiz/baseline
 * Creates a new baseline assessment quiz
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user has already completed baseline
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        baselineCompleted: true,
        baselineQuizId: true,
      },
    });

    if (user?.baselineCompleted) {
      return NextResponse.json(
        {
          error: 'Baseline assessment already completed',
          baselineQuizId: user.baselineQuizId,
        },
        { status: 400 }
      );
    }

    // Reset mastery status (for clean baseline)
    await prisma.userCellMastery.updateMany({
      where: { userId },
      data: {
        selection_count: 0,
        mastery_status: 0,
      },
    });

    // Create baseline quiz
    const quiz = await prisma.quiz.create({
      data: {
        userId,
        status: 'in-progress',
        quizType: 'baseline',
        maxQuestions: 15, // 3 per topic × 5 topics
        explorationParam: 0.5, // Balanced
        timerMinutes: null, // No timer for baseline
        topicSelection: 'system', // System-controlled
      },
    });

    console.log(`[Baseline] Created baseline quiz ${quiz.id} for user ${userId}`);

    return NextResponse.json({
      quizId: quiz.id,
      quizType: 'baseline',
      message: 'Baseline assessment started',
    });
  } catch (error) {
    console.error('[Baseline API Error]:', error);
    return NextResponse.json(
      {
        error: 'Failed to create baseline assessment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/quiz/baseline
 * Check if user needs baseline assessment
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        baselineCompleted: true,
        baselineCompletedAt: true,
        baselineQuizId: true,
      },
    });

    return NextResponse.json({
      baselineCompleted: user?.baselineCompleted || false,
      baselineCompletedAt: user?.baselineCompletedAt,
      baselineQuizId: user?.baselineQuizId,
    });
  } catch (error) {
    console.error('[Baseline Check Error]:', error);
    return NextResponse.json(
      { error: 'Failed to check baseline status' },
      { status: 500 }
    );
  }
}
