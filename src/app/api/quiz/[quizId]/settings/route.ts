import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

export async function GET(
  req: Request,
  context: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId } = await context.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        explorationParam: true,
        timerMinutes: true,
        maxQuestions: true,
        topicSelection: true,
        userId: true
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (quiz.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      explorationParam: quiz.explorationParam,
      timerMinutes: quiz.timerMinutes,
      maxQuestions: quiz.maxQuestions,
      topicSelection: quiz.topicSelection
    });

  } catch (error) {
    console.error('[API] Error fetching quiz settings:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch settings' 
    }, { status: 500 });
  }
}