import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();
    const { courseId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is instructor or admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'instructor' && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Instructor access required' },
        { status: 403 }
      );
    }

    // Verify course ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        joinCode: true,
        instructorId: true,
      },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (course.instructorId !== session.user.id && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Not course instructor' },
        { status: 403 }
      );
    }

    // Get all students enrolled in this course
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: courseId,
        role: 'STUDENT',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Get detailed stats for each student
    const reports = await Promise.all(
      enrollments.map(async (enrollment) => {
        const studentId = enrollment.user.id;

        // Get all quizzes for this student in this course
        const quizzes = await prisma.quiz.findMany({
          where: {
            userId: studentId,
            courseId: courseId,
          },
          include: {
            userAnswers: {
              include: {
                question: {
                  include: {
                    cell: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        const completedQuizzes = quizzes.filter((q) => q.status === 'completed');
        const allAnswers = quizzes.flatMap((q) => q.userAnswers);
        const correctAnswers = allAnswers.filter((a) => a.isCorrect);

        // Calculate stats
        const stats = {
          totalQuizzes: quizzes.length,
          completedQuizzes: completedQuizzes.length,
          totalQuestions: allAnswers.length,
          correctAnswers: correctAnswers.length,
          accuracy:
            allAnswers.length > 0
              ? (correctAnswers.length / allAnswers.length) * 100
              : 0,
          avgResponseTime:
            allAnswers.length > 0
              ? allAnswers.reduce((sum, a) => sum + (a.responseTime || 0), 0) /
                allAnswers.filter((a) => a.responseTime !== null).length
              : 0,
          lastActivity:
            quizzes.length > 0 ? quizzes[0].createdAt.toISOString() : null,
        };

        // Get recent activity (last 20 answers)
        const recentActivity = allAnswers.slice(0, 20).map((answer) => ({
          quizId: answer.quizId,
          createdAt: answer.createdAt.toISOString(),
          questionText: answer.question.text,
          isCorrect: answer.isCorrect,
          responseTime: answer.responseTime,
          topic: answer.question.cell.name,
        }));

        return {
          student: enrollment.user,
          stats,
          recentActivity,
        };
      })
    );

    // Sort by student name
    reports.sort((a, b) =>
      (a.student.name || '').localeCompare(b.student.name || '')
    );

    return NextResponse.json({
      course: {
        id: course.id,
        title: course.title,
        joinCode: course.joinCode,
      },
      reports,
    });
  } catch (error) {
    console.error('Error fetching student reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
