// src/app/api/admin/exposure/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getExposureStatistics,
  resetExposureCounts,
  DEFAULT_EXPOSURE_CONFIG
} from '@/lib/adaptive-engine/sympson-hetter';
import prisma from '@/lib/db';

/**
 * GET /api/admin/exposure
 * Get exposure statistics for monitoring
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (optional - remove if you want all users to see stats)
    // const user = await prisma.user.findUnique({
    //   where: { id: session.user.id },
    //   select: { role: true }
    // });
    // if (user?.role !== 'admin') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const url = new URL(req.url);
    const cellId = url.searchParams.get('cellId') || undefined;

    // Get exposure statistics
    const stats = await getExposureStatistics(cellId);

    // Get top exposed questions
    const topExposed = await prisma.question.findMany({
      where: cellId ? { cellId, isActive: true } : { isActive: true },
      orderBy: { exposureCount: 'desc' },
      take: 10,
      select: {
        id: true,
        text: true,
        exposureCount: true,
        maxExposure: true,
        lastUsed: true,
        cell: {
          select: { name: true }
        }
      }
    });

    // Get underexposed questions
    const underExposed = await prisma.question.findMany({
      where: cellId ? { cellId, isActive: true, exposureCount: 0 } : { isActive: true, exposureCount: 0 },
      take: 10,
      select: {
        id: true,
        text: true,
        exposureCount: true,
        cell: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json({
      statistics: stats,
      config: DEFAULT_EXPOSURE_CONFIG,
      topExposed: topExposed.map(q => ({
        id: q.id,
        text: q.text.substring(0, 100) + '...',
        cell: q.cell.name,
        exposureCount: q.exposureCount,
        maxExposure: q.maxExposure,
        lastUsed: q.lastUsed,
        overexposed: q.exposureCount >= q.maxExposure
      })),
      underExposed: underExposed.map(q => ({
        id: q.id,
        text: q.text.substring(0, 100) + '...',
        cell: q.cell.name,
        exposureCount: q.exposureCount
      }))
    });

  } catch (error) {
    console.error('[API] Exposure stats error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch exposure statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/exposure/reset
 * Reset exposure counts (admin only)
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { cellId, action } = body;

    if (action === 'reset') {
      const resetCount = await resetExposureCounts(cellId);

      return NextResponse.json({
        success: true,
        message: `Reset exposure counts for ${resetCount} questions`,
        resetCount
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[API] Exposure reset error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reset exposure counts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
