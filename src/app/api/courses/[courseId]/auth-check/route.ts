// src/app/api/courses/[courseId]/auth-check/route.ts
// API endpoint for client-side course authorization checks

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkCourseAccess } from '@/lib/course-authorization';

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { authorized: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const authResult = await checkCourseAccess(session.user.id, params.courseId);

    if (!authResult.authorized) {
      return NextResponse.json(
        { authorized: false, error: 'Not authorized to access this course' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      authorized: true,
      role: authResult.role,
      course: {
        id: authResult.course?.id,
        title: authResult.course?.title,
      },
    });
  } catch (error) {
    console.error('Course auth check error:', error);
    return NextResponse.json(
      { authorized: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
