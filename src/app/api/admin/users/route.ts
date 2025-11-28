// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

/**
 * GET /api/admin/users
 * Fetch users filtered by role
 * Query params: role (optional) - filter by user role
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Check if user is authenticated and has admin/instructor role
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    if (userRole !== 'admin' && userRole !== 'instructor') {
      return NextResponse.json(
        { error: 'Forbidden: Admin or instructor access required' },
        { status: 403 }
      );
    }

    // Get role filter from query params
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');

    // Build query
    const whereClause = roleFilter ? { role: roleFilter } : {};

    // Fetch users
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        baselineCompleted: true,
        baselineCompletedAt: true,
      },
      orderBy: [
        { name: 'asc' },
        { email: 'asc' },
      ],
    });

    return NextResponse.json({
      users,
      count: users.length,
    });
  } catch (error) {
    console.error('[Admin Users API Error]:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
