// src/app/api/courses/[courseId]/route.ts
// Single course API

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

    const course = await prisma.course.findUnique({
      where: {
        id: params.courseId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        joinCode: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error('[Course API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}
