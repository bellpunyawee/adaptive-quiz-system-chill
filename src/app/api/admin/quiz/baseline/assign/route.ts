// src/app/api/admin/quiz/baseline/assign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

/**
 * POST /api/admin/quiz/baseline/assign
 * Admin/Instructor creates a baseline assessment quiz for a specific learner
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Check if user is authenticated and has admin/instructor role
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminRole = session.user.role;
    if (adminRole !== 'admin' && adminRole !== 'instructor') {
      return NextResponse.json(
        { error: 'Forbidden: Admin or instructor access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Validate target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        baselineCompleted: true,
        baselineQuizId: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Enforce "one baseline per user" rule
    if (targetUser.baselineCompleted) {
      return NextResponse.json(
        {
          error: `${targetUser.name} has already completed a baseline assessment`,
          baselineQuizId: targetUser.baselineQuizId,
          completedBy: targetUser.name,
        },
        { status: 400 }
      );
    }

    // Check if there are baseline-tagged questions available
    const totalBaselineQuestions = await prisma.question.count({
      where: {
        isActive: true,
        tags: {
          some: {
            tag: {
              name: 'baseline',
            },
          },
        },
      },
    });

    if (totalBaselineQuestions === 0) {
      return NextResponse.json(
        {
          error: 'No baseline questions available',
          details: 'Please tag questions with "baseline" before creating a baseline assessment.',
        },
        { status: 400 }
      );
    }

    // Get all cells
    const cells = await prisma.cell.findMany({
      select: { id: true, name: true },
    });

    if (cells.length === 0) {
      return NextResponse.json(
        { error: 'No topics found in the system' },
        { status: 400 }
      );
    }

    // Count baseline questions per topic and calculate max questions
    const QUESTIONS_PER_CELL = 3;
    let maxQuestions = 0;
    const topicsWithQuestions: string[] = [];
    const topicsWithoutQuestions: string[] = [];

    for (const cell of cells) {
      const count = await prisma.question.count({
        where: {
          cellId: cell.id,
          isActive: true,
          tags: {
            some: {
              tag: {
                name: 'baseline',
              },
            },
          },
        },
      });

      if (count > 0) {
        const questionsFromThisTopic = Math.min(count, QUESTIONS_PER_CELL);
        maxQuestions += questionsFromThisTopic;
        topicsWithQuestions.push(`${cell.name} (${count})`);
      } else {
        topicsWithoutQuestions.push(cell.name);
      }
    }

    console.log(
      `[Admin Baseline] Creating quiz with ${maxQuestions} questions from ${topicsWithQuestions.length} topics`
    );
    if (topicsWithoutQuestions.length > 0) {
      console.warn(
        `[Admin Baseline] No baseline questions for: ${topicsWithoutQuestions.join(', ')}`
      );
    }

    // Reset mastery status for clean baseline (optional, but good practice)
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
        maxQuestions, // Calculated based on available baseline questions
        explorationParam: 0.5, // Balanced exploration
        timerMinutes: null, // No timer for baseline
        topicSelection: 'system', // System-controlled topic selection
      },
    });

    console.log(
      `[Admin Baseline] Admin ${session.user.email} created baseline quiz ${quiz.id} for user ${targetUser.email}`
    );

    return NextResponse.json({
      quizId: quiz.id,
      quizType: 'baseline',
      learnerName: targetUser.name || targetUser.email,
      learnerId: targetUser.id,
      message: 'Baseline assessment quiz created successfully',
      questionsCount: quiz.maxQuestions,
    });
  } catch (error) {
    console.error('[Admin Baseline Assignment Error]:', error);
    return NextResponse.json(
      {
        error: 'Failed to create baseline assessment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
