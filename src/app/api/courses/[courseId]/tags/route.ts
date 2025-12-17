// src/app/api/courses/[courseId]/tags/route.ts
// Course-scoped tags API

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

    const tags = await prisma.tag.findMany({
      where: {
        courseId: params.courseId,
      },
      select: {
        id: true,
        name: true,
        color: true,
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('[Course Tags API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
