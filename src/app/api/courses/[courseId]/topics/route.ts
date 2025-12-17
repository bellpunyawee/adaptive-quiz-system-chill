// src/app/api/courses/[courseId]/topics/route.ts
// Course-scoped topics (cells) API

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkCourseAccess } from '@/lib/course-authorization';
import prisma from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this course
    const authResult = await checkCourseAccess(session.user.id, params.courseId);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this course' },
        { status: 403 }
      );
    }

    const topics = await prisma.cell.findMany({
      where: {
        courseId: params.courseId,
      },
      select: {
        id: true,
        name: true,
        difficulty_b: true,
        discrimination_a: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('[Course Topics API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}
