// src/app/api/quiz/start/route.ts
// API endpoint for starting a course-scoped quiz

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkCourseAccess } from '@/lib/course-authorization';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      courseId,
      userId,
      maxQuestions,
      quizType,
      topicSelection,
      selectedCells,
      explorationParam = 0.5,
      timerMinutes = null,
    } = body;

    // Validate required parameters
    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 }
      );
    }

    if (!maxQuestions || maxQuestions < 1) {
      return NextResponse.json(
        { error: 'maxQuestions must be at least 1' },
        { status: 400 }
      );
    }

    // Verify user has access to this course
    const authResult = await checkCourseAccess(session.user.id, courseId);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this course' },
        { status: 403 }
      );
    }

    // Validate topic selection
    if (topicSelection === 'manual') {
      if (!selectedCells || selectedCells.length === 0) {
        return NextResponse.json(
          { error: 'At least one topic must be selected for manual mode' },
          { status: 400 }
        );
      }

      // Verify all selected topics belong to this course
      const topicCount = await prisma.cell.count({
        where: {
          id: { in: selectedCells },
          courseId,
        },
      });

      if (topicCount !== selectedCells.length) {
        return NextResponse.json(
          { error: 'Some selected topics do not belong to this course' },
          { status: 400 }
        );
      }
    }

    // For baseline quizzes, check if user has already completed one for this course
    if (quizType === 'baseline') {
      const existingBaseline = await prisma.quiz.findFirst({
        where: {
          userId: session.user.id,
          courseId,
          quizType: 'baseline',
          status: 'completed',
        },
      });

      if (existingBaseline) {
        return NextResponse.json(
          {
            error: 'Baseline assessment already completed for this course',
            baselineQuizId: existingBaseline.id,
          },
          { status: 400 }
        );
      }

      // Reset course-specific mastery for baseline
      // Get all topic IDs for this course
      const courseTopics = await prisma.cell.findMany({
        where: { courseId },
        select: { id: true },
      });
      const courseTopicIds = courseTopics.map((t) => t.id);

      // Reset mastery for all topics in this course
      await prisma.userCellMastery.updateMany({
        where: {
          userId: session.user.id,
          cellId: { in: courseTopicIds },
        },
        data: {
          selection_count: 0,
          mastery_status: 0,
        },
      });
    }

    // Create course-scoped quiz
    const quiz = await prisma.quiz.create({
      data: {
        userId: session.user.id,
        courseId, // ✅ CRITICAL: Course scoping
        status: 'in-progress',
        quizType: quizType || 'regular',
        maxQuestions,
        explorationParam,
        timerMinutes,
        topicSelection: topicSelection || 'system',
        selectedCells:
          topicSelection === 'manual' && selectedCells
            ? JSON.stringify(selectedCells)
            : null,
        startedAt: new Date(),
      },
    });

    console.log(
      `[Quiz Start] Created ${quizType || 'regular'} quiz ${quiz.id} for user ${session.user.id} in course ${courseId}`
    );

    return NextResponse.json({
      quizId: quiz.id,
      quizType: quiz.quizType,
      courseId: quiz.courseId,
      message: 'Quiz started successfully',
    });
  } catch (error) {
    console.error('[Quiz Start API Error]:', error);
    return NextResponse.json(
      {
        error: 'Failed to start quiz',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
