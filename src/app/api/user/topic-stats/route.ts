// src/app/api/user/topic-stats/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all cells (topics)
    const cells = await prisma.cell.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get user's mastery data for each cell
    const masteryData = await prisma.userCellMastery.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        cellId: true,
        ability_theta: true,
        mastery_status: true,
        responseCount: true,
        updatedAt: true,
      },
    });

    // Get user's answer statistics per cell
    const userAnswers = await prisma.userAnswer.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        question: {
          select: {
            cellId: true,
          },
        },
      },
    });

    // Calculate accuracy per cell
    const cellStats = new Map<string, { correct: number; total: number }>();
    userAnswers.forEach((answer) => {
      const cellId = answer.question.cellId;
      const current = cellStats.get(cellId) || { correct: 0, total: 0 };
      cellStats.set(cellId, {
        correct: current.correct + (answer.isCorrect ? 1 : 0),
        total: current.total + 1,
      });
    });

    // Create mastery map for quick lookup
    const masteryMap = new Map(
      masteryData.map((m) => [
        m.cellId,
        {
          abilityTheta: m.ability_theta,
          masteryStatus: m.mastery_status,
          responseCount: m.responseCount,
          lastPracticed: m.updatedAt,
        },
      ])
    );

    // Combine all data
    const topics = cells.map((cell) => {
      const stats = cellStats.get(cell.id);
      const mastery = masteryMap.get(cell.id);
      const accuracy = stats ? Math.round((stats.correct / stats.total) * 100) : 0;

      return {
        cellId: cell.id,
        cellName: cell.name,
        abilityTheta: mastery?.abilityTheta ?? 0,
        masteryStatus: mastery?.masteryStatus ?? 0,
        accuracy,
        questionsAnswered: stats?.total ?? 0,
        correctAnswers: stats?.correct ?? 0,
        lastPracticed: mastery?.lastPracticed ?? null,
        suggestedPractice: accuracy < 70 && (stats?.total ?? 0) > 0, // Suggest if low accuracy and has attempts
      };
    });

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('[Topic Stats API Error]:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch topic statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
