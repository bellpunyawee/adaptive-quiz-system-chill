// src/app/api/quiz/[quizId]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { selectNextQuestionForUser, processUserAnswer } from '@/lib/adaptive-engine/engine-enhanced';
import { selectBaselineQuestion, getBaselineProgress } from '@/lib/adaptive-engine/baseline-engine';
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

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true, status: true, userId: true, quizType: true }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    if (quiz.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if this is a baseline quiz
    const isBaseline = quiz.quizType === 'baseline';

    // Select next question (different logic for baseline vs regular)
    let nextQuestion;
    if (isBaseline) {
      nextQuestion = await selectBaselineQuestion(session.user.id, quizId);
    } else {
      nextQuestion = await selectNextQuestionForUser(session.user.id, quizId);
    }

    if (!nextQuestion) {
      // Quiz complete - update status
      await prisma.quiz.update({
        where: { id: quizId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      // If baseline quiz, mark user as baseline completed
      if (isBaseline) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            baselineCompleted: true,
            baselineCompletedAt: new Date(),
            baselineQuizId: quizId,
          },
        });
        console.log(`[Baseline] User ${session.user.id} completed baseline assessment`);
      }

      return NextResponse.json({ status: 'completed', quizType: quiz.quizType });
    }

    // Get quiz settings and answered count
    const [quizSettings, answeredCount] = await Promise.all([
      prisma.quiz.findUnique({
        where: { id: quizId },
        select: { maxQuestions: true }
      }),
      prisma.userAnswer.count({
        where: { quizId: quizId, userId: session.user.id }
      })
    ]);

    // Remove sensitive IRT parameters from response
    const { discrimination_a, difficulty_b, answerOptions, ...publicQuestionData } = nextQuestion;
    const publicOptions = answerOptions.map(({ id, text }) => ({ id, text }));

    // Get baseline progress if this is a baseline quiz
    let baselineProgress;
    if (isBaseline) {
      baselineProgress = await getBaselineProgress(session.user.id, quizId);
    }

    return NextResponse.json({
      status: 'in-progress',
      quizType: quiz.quizType,
      question: {
        ...publicQuestionData,
        options: publicOptions,
        totalQuestions: quizSettings?.maxQuestions || 10,
        answeredCount
      },
      ...(baselineProgress && { baselineProgress }), // Include if baseline quiz
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
    const { questionId, selectedOptionId } = body;

    if (!questionId || !selectedOptionId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // ===== CRITICAL FIX: Check for duplicate submission =====
    const existingAnswer = await prisma.userAnswer.findFirst({
      where: {
        userId: session.user.id,
        quizId: quizId,
        questionId: questionId,
      }
    });

    if (existingAnswer) {
      console.log(`[API] Duplicate submission detected for question ${questionId}, returning existing answer`);
      
      // Return the existing feedback instead of creating duplicate
      const correctOption = await prisma.answerOption.findFirst({
        where: { questionId: questionId, isCorrect: true },
      });

      const question = await prisma.question.findUnique({
        where: { id: questionId }
      });

      return NextResponse.json({
        isCorrect: existingAnswer.isCorrect,
        correctOptionId: correctOption?.id || '',
        explanation: question?.explanation || 'No explanation available.',
      });
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

    // Record the answer (with abilityAtTime for tracking)
    const userMastery = await prisma.userCellMastery.findUnique({
      where: {
        userId_cellId: {
          userId: session.user.id,
          cellId: question.cellId
        }
      }
    });

    await prisma.userAnswer.create({
      data: {
        userId: session.user.id,
        quizId: quizId,
        questionId: questionId,
        selectedOptionId: selectedOptionId,
        isCorrect: isCorrect,
        abilityAtTime: userMastery?.ability_theta || 0,
      },
    });

    console.log(`[API] Answer recorded: Question ${questionId}, Correct: ${isCorrect}`);

    // Process answer through adaptive engine (DOES NOT create duplicate)
    await processUserAnswer(
      session.user.id, 
      quizId, 
      questionId, 
      selectedOptionId
    );

    // Return feedback with explanation
    return NextResponse.json({
      isCorrect: isCorrect,
      correctOptionId: correctOption.id,
      explanation: question.explanation || 'No explanation available.',
    });

  } catch (error) {
    console.error("[API POST Error]:", error);
    return NextResponse.json({ 
      error: 'Failed to submit answer.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}