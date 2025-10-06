import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import type { QuizSettings } from '@/types/quiz-settings';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings: QuizSettings = await req.json();

    // Validate settings
    if (settings.topicSelection === 'manual' && settings.selectedCells.length === 0) {
      return NextResponse.json({ 
        error: 'At least one topic must be selected for manual mode' 
      }, { status: 400 });
    }

    // Reset mastery status for the user
    await prisma.userCellMastery.updateMany({
      where: { userId: session.user.id },
      data: { 
        mastery_status: 0,
        selection_count: 0,
      },
    });

    // Create quiz with settings
    const quiz = await prisma.quiz.create({
      data: {
        userId: session.user.id,
        status: 'in-progress',
        startedAt: new Date(),
        explorationParam: settings.explorationParam,
        timerMinutes: settings.timerMinutes,
        maxQuestions: settings.maxQuestions,
        topicSelection: settings.topicSelection,
        selectedCells: settings.topicSelection === 'manual' 
          ? JSON.stringify(settings.selectedCells) 
          : null,
      },
    });

    return NextResponse.json({ quizId: quiz.id });
  } catch (error) {
    console.error('[API] Error creating quiz with settings:', error);
    return NextResponse.json({ 
      error: 'Failed to create quiz' 
    }, { status: 500 });
  }
}