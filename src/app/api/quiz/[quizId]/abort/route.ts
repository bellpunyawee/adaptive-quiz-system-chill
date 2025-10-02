// src/app/api/quiz/[quizId]/abort/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: { quizId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId } = params;

    // Verify quiz belongs to user
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { userId: true, status: true }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (quiz.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mark quiz as aborted (we'll use a special status)
    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        status: 'aborted',
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Quiz aborted successfully' 
    });

  } catch (error) {
    console.error('[API] Abort quiz error:', error);
    return NextResponse.json({ 
      error: 'Failed to abort quiz' 
    }, { status: 500 });
  }
}