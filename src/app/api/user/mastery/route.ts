// src/app/api/user/mastery/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

/**
 * GET /api/user/mastery
 *
 * Returns user's ability estimates across all topics
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all topic mastery data for user
    const masteryData = await prisma.userCellMastery.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        cell: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: {
        ability_theta: 'desc' // Highest ability first
      }
    });

    // Calculate mastery level based on ability_theta
    const getMasteryLevel = (theta: number): 'beginner' | 'intermediate' | 'advanced' | 'mastered' => {
      if (theta >= 1.5) return 'mastered';
      if (theta >= 1.0) return 'advanced';
      if (theta >= 0.5) return 'intermediate';
      return 'beginner';
    };

    // Transform data for frontend
    const topics = masteryData.map(m => ({
      cellId: m.cellId,
      cellName: m.cell.name,
      ability_theta: m.ability_theta,
      sem: m.sem || 0,
      confidence: m.confidence || 0,
      responseCount: m.responseCount,
      lastEstimated: m.lastEstimated,
      masteryLevel: getMasteryLevel(m.ability_theta),
      // Convert theta to 0-100 percentage for easier visualization
      abilityPercentage: Math.round(((m.ability_theta + 3) / 6) * 100), // Map -3 to +3 → 0 to 100
    }));

    // Calculate overall statistics
    const overallStats = {
      averageAbility: masteryData.length > 0
        ? masteryData.reduce((sum, m) => sum + m.ability_theta, 0) / masteryData.length
        : 0,
      topicsStarted: masteryData.length,
      topicsMastered: masteryData.filter(m => m.ability_theta >= 1.5).length,
      totalResponses: masteryData.reduce((sum, m) => sum + m.responseCount, 0),
    };

    return NextResponse.json({
      topics,
      overallStats
    });
  } catch (error) {
    console.error('Error fetching mastery data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mastery data' },
      { status: 500 }
    );
  }
}
