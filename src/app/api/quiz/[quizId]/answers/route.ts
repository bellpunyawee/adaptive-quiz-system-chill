// src/app/api/quiz/[quizId]/answers/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

export async function GET(
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
      select: { userId: true }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (quiz.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all answers for this quiz
    const answers = await prisma.userAnswer.findMany({
      where: { 
        quizId: quizId,
        userId: session.user.id 
      },
      orderBy: { createdAt: 'asc' },
      select: {
        isCorrect: true,
        createdAt: true
      }
    });

    return NextResponse.json(answers);

  } catch (error) {
    console.error('[API] Get answers error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch answers' 
    }, { status: 500 });
  }
}