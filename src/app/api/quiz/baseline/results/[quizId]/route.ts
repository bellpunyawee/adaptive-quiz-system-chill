// src/app/api/quiz/baseline/results/[quizId]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { calculateBaselineResults } from '@/lib/adaptive-engine/baseline-engine';
import prisma from '@/lib/db';

/**
 * GET /api/quiz/baseline/results/[quizId]
 * Get baseline assessment results summary
 */
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

    // Verify quiz exists and is a baseline quiz
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    }

    if (quiz.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if ((quiz as any).quizType !== 'baseline') {
      return NextResponse.json(
        { error: 'This is not a baseline assessment quiz.' },
        { status: 400 }
      );
    }

    if (quiz.status !== 'completed') {
      return NextResponse.json(
        { error: 'Baseline assessment not yet completed.' },
        { status: 400 }
      );
    }

    // Calculate results
    const results = await calculateBaselineResults(session.user.id, quizId);

    // Classify cells as strengths or areas for growth
    const strengths = results.cells
      .filter((cell) => cell.abilityTheta >= 0.5)
      .sort((a, b) => b.abilityTheta - a.abilityTheta);

    const areasForGrowth = results.cells
      .filter((cell) => cell.abilityTheta < 0.5)
      .sort((a, b) => a.abilityTheta - b.abilityTheta);

    // Generate personalized recommendations
    const recommendations = generateRecommendations(strengths, areasForGrowth, results.overall);

    // Fetch quiz history (questions, answers, explanations)
    const quizHistory = await prisma.userAnswer.findMany({
      where: {
        userId: session.user.id,
        quizId: quizId,
      },
      include: {
        question: {
          include: {
            answerOptions: true,
            cell: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Format quiz history for frontend
    const formattedHistory = quizHistory.map((answer) => {
      const selectedOption = answer.question.answerOptions.find(
        (opt) => opt.id === answer.selectedOptionId
      );
      const correctOption = answer.question.answerOptions.find((opt) => opt.isCorrect);

      return {
        questionId: answer.questionId,
        questionText: answer.question.text,
        cellName: answer.question.cell.name,
        difficulty: answer.question.difficulty_b,
        isCorrect: answer.isCorrect,
        selectedOption: selectedOption ? {
          id: selectedOption.id,
          text: selectedOption.text,
        } : null,
        correctOption: correctOption ? {
          id: correctOption.id,
          text: correctOption.text,
        } : null,
        allOptions: answer.question.answerOptions.map((opt) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
        explanation: answer.question.explanation,
        answeredAt: answer.createdAt,
      };
    });

    return NextResponse.json({
      quizId: quiz.id,
      completedAt: quiz.completedAt,
      overall: results.overall,
      cells: results.cells,
      strengths,
      areasForGrowth,
      recommendations,
      history: formattedHistory,
    });
  } catch (error) {
    console.error('[Baseline Results API Error]:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch baseline results.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate personalized recommendations based on baseline results
 */
function generateRecommendations(
  strengths: any[],
  areasForGrowth: any[],
  overall: any
): string[] {
  const recommendations: string[] = [];

  // Overall performance recommendations
  if (overall.accuracy >= 80) {
    recommendations.push(
      'Excellent performance! You have a strong foundation in Python programming.'
    );
  } else if (overall.accuracy >= 60) {
    recommendations.push(
      'Good foundation! Continue practicing to strengthen your Python skills.'
    );
  } else {
    recommendations.push(
      "You're building your Python skills. Focus on the fundamentals and practice regularly."
    );
  }

  // Strength-based recommendations
  if (strengths.length > 0) {
    const topStrength = strengths[0].cellName;
    recommendations.push(
      `Your strongest area is ${topStrength}. Consider exploring advanced topics in this area.`
    );
  }

  // Growth area recommendations
  if (areasForGrowth.length > 0) {
    const primaryGrowthArea = areasForGrowth[0].cellName;
    recommendations.push(
      `Focus on ${primaryGrowthArea} to build confidence. Start with our adaptive quizzes targeting this topic.`
    );

    if (areasForGrowth.length >= 2) {
      const secondaryGrowthArea = areasForGrowth[1].cellName;
      recommendations.push(
        `After mastering ${primaryGrowthArea}, work on ${secondaryGrowthArea} to round out your skills.`
      );
    }
  }

  // Balanced learning recommendation
  if (strengths.length > 0 && areasForGrowth.length > 0) {
    recommendations.push(
      'Use our adaptive quiz system to balance review of your strong areas with targeted practice on growth areas.'
    );
  } else if (strengths.length === 0) {
    recommendations.push(
      'Focus on building fundamentals across all topics. Take your time and practice consistently.'
    );
  } else {
    recommendations.push(
      "You're performing well across all topics! Challenge yourself with more complex questions."
    );
  }

  return recommendations;
}
