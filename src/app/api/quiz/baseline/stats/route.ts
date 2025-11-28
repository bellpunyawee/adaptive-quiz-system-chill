// src/app/api/quiz/baseline/stats/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * GET /api/quiz/baseline/stats
 * Returns statistics about available baseline questions
 * - No authentication required (public info)
 */
export async function GET() {
  try {
    // Get all cells (topics)
    const cells = await prisma.cell.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    if (cells.length === 0) {
      return NextResponse.json({
        totalTopics: 0,
        topicsWithBaseline: 0,
        totalBaselineQuestions: 0,
        expectedQuizLength: 0,
        topics: [],
        questionsPerTopic: 3,
      });
    }

    const QUESTIONS_PER_CELL = 3;
    const topicStats = [];
    let totalBaselineQuestions = 0;
    let topicsWithBaseline = 0;
    let expectedQuizLength = 0;

    // Get baseline question count for each topic
    for (const cell of cells) {
      const count = await prisma.question.count({
        where: {
          cellId: cell.id,
          isActive: true,
          tags: {
            some: {
              tag: {
                name: 'baseline',
              },
            },
          },
        },
      });

      if (count > 0) {
        topicsWithBaseline++;
        totalBaselineQuestions += count;
        const questionsFromThisTopic = Math.min(count, QUESTIONS_PER_CELL);
        expectedQuizLength += questionsFromThisTopic;

        topicStats.push({
          id: cell.id,
          name: cell.name,
          totalQuestions: count,
          willUse: questionsFromThisTopic,
          hasEnough: count >= QUESTIONS_PER_CELL,
        });
      }
    }

    return NextResponse.json({
      totalTopics: cells.length,
      topicsWithBaseline,
      totalBaselineQuestions,
      expectedQuizLength,
      questionsPerTopic: QUESTIONS_PER_CELL,
      topics: topicStats,
      estimatedTimeMinutes: Math.ceil(expectedQuizLength * 1.5), // ~1.5 min per question
    });
  } catch (error) {
    console.error('[Baseline Stats API Error]:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch baseline statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
