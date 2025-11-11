// src/app/api/user/ability-history/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

/**
 * GET /api/user/ability-history?days=30
 *
 * Returns user's ability progression over time
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch ability history
    const historyRecords = await prisma.abilityHistory.findMany({
      where: {
        userId: session.user.id,
        updatedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        cell: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: 'asc'
      }
    });

    // Group by cell (topic)
    const historyByTopic = new Map<string, typeof historyRecords>();
    historyRecords.forEach(record => {
      const cellId = record.cellId;
      if (!historyByTopic.has(cellId)) {
        historyByTopic.set(cellId, []);
      }
      historyByTopic.get(cellId)!.push(record);
    });

    // Transform to frontend format
    const history = Array.from(historyByTopic.entries()).map(([cellId, records]) => ({
      cellId,
      cellName: records[0].cell.name,
      dataPoints: records.map(r => ({
        date: r.updatedAt,
        ability_theta: r.ability_theta,
        confidence: r.confidence || 0,
        quizId: r.quizId || undefined
      }))
    }));

    // Get baseline data for comparison
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        baselineQuizId: true
      }
    });

    let baseline: Array<{ cellId: string; cellName: string; ability_theta: number; date: Date }> = [];

    if (user?.baselineQuizId) {
      const baselineHistory = await prisma.abilityHistory.findMany({
        where: {
          userId: session.user.id,
          quizId: user.baselineQuizId
        },
        include: {
          cell: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      baseline = baselineHistory.map(h => ({
        cellId: h.cellId,
        cellName: h.cell.name,
        ability_theta: h.ability_theta,
        date: h.updatedAt
      }));
    }

    return NextResponse.json({
      history,
      baseline,
      dateRange: {
        start: startDate,
        end: endDate,
        days
      }
    });
  } catch (error) {
    console.error('Error fetching ability history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ability history' },
      { status: 500 }
    );
  }
}
