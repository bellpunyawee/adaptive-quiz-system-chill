import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { selectNextQuestionForUser, processUserAnswer } from '@/lib/adaptive-engine/engine';
import prisma from '@/lib/db';

export async function GET(req: Request) {
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

    // Pass the quizId to the engine
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

    const totalQuestions = await prisma.question.count(); // Total available questions
    const answeredCount = await prisma.userAnswer.count({
        where: { quizId: quizId }
    });

    const { discrimination_a, difficulty_b, answerOptions, ...publicQuestionData } = nextQuestion;
    const publicOptions = answerOptions.map(({ id, text }) => ({ id, text }));

    return NextResponse.json({
      status: 'in-progress',
      question: { ...publicQuestionData, options: publicOptions, totalQuestions, answeredCount },
    });
  } catch (error) {
    console.error("API GET Error:", error);
    return NextResponse.json({ error: 'Failed to fetch question.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const { questionId, selectedOptionId } = await req.json();

    const correctOption = await prisma.answerOption.findFirst({
      where: { questionId: questionId, isCorrect: true },
    });

    if (!correctOption) {
      return NextResponse.json({ error: 'Question configuration error.' }, { status: 500 });
    }

    const isCorrect = correctOption.id === selectedOptionId;

    await prisma.userAnswer.create({
      data: {
        userId: session.user.id,
        quizId: quizId,
        questionId: questionId,
        selectedOptionId: selectedOptionId,
        isCorrect: isCorrect,
      },
    });

    // Pass the quizId to the engine
    await processUserAnswer(session.user.id, quizId, questionId, isCorrect);

    const question = await prisma.question.findUnique({ where: { id: questionId } });

    return NextResponse.json({
      isCorrect,
      correctOptionId: correctOption.id,
      explanation: question?.explanation || 'No explanation available.',
    });
  } catch (error) {
    console.error("API POST Error:", error);
    return NextResponse.json({ error: 'Failed to submit answer.' }, { status: 500 });
  }
}