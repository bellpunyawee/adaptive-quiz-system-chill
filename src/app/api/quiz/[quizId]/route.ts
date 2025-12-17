// src/app/api/quiz/[quizId]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { selectNextQuestionForUser, processUserAnswer } from '@/lib/adaptive-engine/engine-enhanced';
import { selectBaselineQuestion, getBaselineProgress } from '@/lib/adaptive-engine/baseline-engine';
import { updateSpacedRepetition } from '@/lib/spaced-repetition';
import { analyzeQuizForKnowledgeGaps } from '@/lib/adaptive-engine/knowledge-gap-analyzer';
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

      // Analyze quiz for knowledge gaps and persist them
      try {
        const userAnswers = await prisma.userAnswer.findMany({
          where: {
            quizId: quizId,
            userId: session.user.id,
          },
          include: {
            question: {
              include: {
                cell: {
                  select: { name: true, id: true }
                }
              }
            }
          }
        });

        const { topicsToReview } = await analyzeQuizForKnowledgeGaps(
          session.user.id,
          quizId,
          userAnswers
        );

        // Persist knowledge gaps to database
        if (topicsToReview.length > 0) {
          await prisma.knowledgeGap.createMany({
            data: topicsToReview.map(topic => ({
              userId: session.user.id,
              topicId: topic.cellId,
              gapDescription: topic.reviewReason,
              severity: topic.reviewPriority,
              addressed: false,
              identifiedAt: new Date()
            })),
            skipDuplicates: true // Avoid duplicate entries if quiz analyzed multiple times
          });
          console.log(`[KnowledgeGaps] Identified ${topicsToReview.length} knowledge gaps for user ${session.user.id}`);
        }
      } catch (error) {
        // Don't fail quiz completion if knowledge gap analysis fails
        console.error('[KnowledgeGaps] Failed to analyze quiz for knowledge gaps:', error);
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

    // Get cell information for transparency metadata
    const cell = await prisma.cell.findUnique({
      where: { id: nextQuestion.cellId },
      select: { name: true }
    });

    // Remove sensitive IRT parameters from response
    const { discrimination_a, difficulty_b, answerOptions, selectionReasoning, ...publicQuestionData } = nextQuestion;

    // Calculate difficulty label for UI
    const difficultyLabel = difficulty_b < -1 ? 'Easy' :
                           difficulty_b < 1 ? 'Medium' : 'Hard';

    // Shuffle options to prevent pattern guessing and add stochasticity
    const publicOptions = answerOptions
      .map(({ id, text }) => ({ id, text }))
      .sort(() => Math.random() - 0.5);

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
        answeredCount,
        // Transparency metadata
        topicName: cell?.name || 'Unknown Topic',
        bloomTaxonomy: nextQuestion.bloomTaxonomy,
        difficultyLabel: difficultyLabel,
        selectionMetadata: selectionReasoning ? {
          category: selectionReasoning.category,
          categoryLabel: selectionReasoning.categoryLabel,
          reasoningText: selectionReasoning.reasoningText
        } : undefined
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
    const { questionId, selectedOptionId, responseTime, questionDisplayedAt, wasSkipped, selectionMetadata } = body;

    if (!questionId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Allow null selectedOptionId only if wasSkipped is true
    if (!selectedOptionId && !wasSkipped) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Validate response time (prevent invalid data)
    const validatedResponseTime =
      responseTime &&
      typeof responseTime === 'number' &&
      responseTime > 0 &&
      responseTime < 300000 // Max 5 minutes
        ? responseTime
        : null;

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
      const [correctOption, question, selectedAnswer] = await Promise.all([
        prisma.answerOption.findFirst({
          where: { questionId: questionId, isCorrect: true },
        }),
        prisma.question.findUnique({
          where: { id: questionId }
        }),
        existingAnswer.selectedOptionId ? prisma.answerOption.findUnique({
          where: { id: existingAnswer.selectedOptionId },
          select: { text: true }
        }) : null
      ]);

      return NextResponse.json({
        isCorrect: existingAnswer.isCorrect,
        wasSkipped: existingAnswer.wasSkipped,
        correctOptionId: correctOption?.id || '',
        correctAnswerText: correctOption?.text || '',
        userAnswerText: existingAnswer.wasSkipped ? 'Skipped' : (selectedAnswer?.text || ''),
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

    // Handle skip: treat as incorrect
    const isCorrect = wasSkipped ? false : (selectedOptionId === correctOption.id);

    // Record the answer (with abilityAtTime for tracking)
    const userMastery = await prisma.userCellMastery.findUnique({
      where: {
        userId_cellId: {
          userId: session.user.id,
          cellId: question.cellId
        }
      }
    });

    const createdAnswer = await prisma.userAnswer.create({
      data: {
        userId: session.user.id,
        quizId: quizId,
        questionId: questionId,
        selectedOptionId: wasSkipped ? null : selectedOptionId,
        isCorrect: isCorrect,
        wasSkipped: wasSkipped || false,
        skipReason: wasSkipped ? 'dont_know' : null,
        abilityAtTime: userMastery?.ability_theta || 0,
        responseTime: validatedResponseTime,
        questionDisplayedAt: questionDisplayedAt ? new Date(questionDisplayedAt) : null,
        // Store selection reasoning for post-quiz transparency
        selectionMetadata: selectionMetadata ? JSON.stringify(selectionMetadata) : null,
      },
    });

    console.log(`[API] Answer recorded: Question ${questionId}, Correct: ${isCorrect}, Response Time: ${validatedResponseTime}ms`);

    // Update spaced repetition schedule for practice modes
    if (quiz.quizType === 'practice-review' || quiz.quizType === 'practice-new' || quiz.quizType === 'review-mistakes') {
      const responseTime = createdAnswer.responseTime || 30000; // Default 30s if not tracked
      await updateSpacedRepetition(
        session.user.id,
        questionId,
        isCorrect,
        responseTime
      );
      console.log(`[SpacedRepetition] Updated review schedule for question ${questionId}`);
    }

    // Process answer through adaptive engine (DOES NOT create duplicate)
    await processUserAnswer(
      session.user.id,
      quizId,
      questionId,
      wasSkipped ? '' : selectedOptionId, // Pass empty string for skipped (won't be used)
      wasSkipped
    );

    // Get the selected answer text for feedback
    const selectedAnswer = wasSkipped ? null : await prisma.answerOption.findUnique({
      where: { id: selectedOptionId },
      select: { text: true }
    });

    // Return feedback with explanation
    return NextResponse.json({
      isCorrect: isCorrect,
      wasSkipped: wasSkipped || false,
      correctOptionId: correctOption.id,
      correctAnswerText: correctOption.text,
      userAnswerText: wasSkipped ? 'Skipped' : (selectedAnswer?.text || ''),
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