// src/app/api/quiz/[quizId]/route.ts (Enhanced Version)
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { selectNextQuestionForUser, processUserAnswer, getQuizStatus } from '@/lib/adaptive-engine/engine';
import prisma from '@/lib/db';
import { PerformanceTimer } from '@/lib/adaptive-engine/monitoring';

export async function GET(req: Request) {
  const timer = new PerformanceTimer();
  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const quizId = pathSegments[pathSegments.length - 1];

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID is missing from the URL.' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({ 
      where: { id: quizId },
      select: { id: true, status: true, userId: true }
    });
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    if (quiz.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get comprehensive quiz status
    const quizStatus = await getQuizStatus(session.user.id, quizId);

    if (!quizStatus?.shouldContinue) {
      await prisma.quiz.update({
        where: { id: quizId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
      
      return NextResponse.json({ 
        status: 'completed',
        reason: quizStatus?.stoppingReason || 'Quiz complete',
        details: quizStatus?.details
      });
    }

    // Select next question
    const nextQuestion = await selectNextQuestionForUser(session.user.id, quizId);

    if (!nextQuestion) {
      await prisma.quiz.update({
        where: { id: quizId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
      return NextResponse.json({ status: 'completed' });
    }

    // Remove sensitive IRT parameters from response
    const { discrimination_a, difficulty_b, answerOptions, ...publicQuestionData } = nextQuestion;
    const publicOptions = answerOptions.map(({ id, text }) => ({ id, text }));

    console.log(`[API] Question selected in ${timer.elapsed()}ms`);

    return NextResponse.json({
      status: 'in-progress',
      question: { 
        ...publicQuestionData, 
        options: publicOptions,
        progress: quizStatus.progress
      },
    });
  } catch (error) {
    console.error("[API GET Error]:", error);
    return NextResponse.json({ 
      error: 'Failed to fetch question.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const timer = new PerformanceTimer();
  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const quizId = pathSegments[pathSegments.length - 1];

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID is missing from the URL.' }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    if (quiz.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { questionId, selectedOptionId, responseTime } = body;

    if (!questionId || !selectedOptionId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Validate and get correct answer
    const [question, correctOption] = await Promise.all([
      prisma.question.findUnique({
        where: { id: questionId },
        include: { cell: true }
      }),
      prisma.answerOption.findFirst({
        where: { questionId: questionId, isCorrect: true },
      })
    ]);

    if (!correctOption || !question) {
      return NextResponse.json({ error: 'Question configuration error.' }, { status: 500 });
    }

    const isCorrect = selectedOptionId === correctOption.id;

    // Record the answer
    await prisma.userAnswer.create({
      data: {
        userId: session.user.id,
        quizId: quizId,
        questionId: questionId,
        selectedOptionId: selectedOptionId,
        isCorrect: isCorrect,
      },
    });

    // Process answer through adaptive engine
    await processUserAnswer(
      session.user.id, 
      quizId, 
      questionId, 
      isCorrect,
      responseTime
    );

    console.log(`[API] Answer processed in ${timer.elapsed()}ms`);

    // Return feedback with explanation
    return NextResponse.json({
      isCorrect: isCorrect,
      correctOptionId: correctOption.id,
      explanation: question.explanation || 'No explanation available.',
      cellName: question.cell.name,
      responseTime: timer.elapsed()
    });

  } catch (error) {
    console.error("[API POST Error]:", error);
    return NextResponse.json({ 
      error: 'Failed to submit answer.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// New endpoint for quiz analytics
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const quizId = pathSegments[pathSegments.length - 1];

    const quizStatus = await getQuizStatus(session.user.id, quizId);

    return NextResponse.json({
      status: 'success',
      data: quizStatus
    });

  } catch (error) {
    console.error("[API PATCH Error]:", error);
    return NextResponse.json({ error: 'Failed to get quiz status.' }, { status: 500 });
  }
}