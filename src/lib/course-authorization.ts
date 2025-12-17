// src/lib/course-authorization.ts
// Course authorization utilities for checking user access to courses

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { redirect } from 'next/navigation';

export type CourseRole = 'INSTRUCTOR' | 'STUDENT' | 'ADMIN';

export interface CourseAuthResult {
  authorized: boolean;
  role?: CourseRole;
  enrollment?: {
    id: string;
    role: string;
    enrolledAt: Date;
  };
  course?: {
    id: string;
    title: string;
    instructorId: string;
  };
}

/**
 * Check if a user has access to a course
 * @param userId - The user ID to check
 * @param courseId - The course ID to check access for
 * @returns CourseAuthResult with authorization status and role
 */
export async function checkCourseAccess(
  userId: string,
  courseId: string
): Promise<CourseAuthResult> {
  // Fetch user with role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    return { authorized: false };
  }

  // Admins have access to all courses
  if (user.role === 'admin') {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, instructorId: true },
    });

    if (!course) {
      return { authorized: false };
    }

    return {
      authorized: true,
      role: 'ADMIN',
      course,
    };
  }

  // Fetch course and check instructor ownership
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, instructorId: true, isActive: true },
  });

  if (!course) {
    return { authorized: false };
  }

  // Check if user is the course instructor
  if (course.instructorId === userId) {
    return {
      authorized: true,
      role: 'INSTRUCTOR',
      course,
    };
  }

  // Check if user is enrolled as a student
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    select: {
      id: true,
      role: true,
      enrolledAt: true,
    },
  });

  if (enrollment) {
    return {
      authorized: true,
      role: enrollment.role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT',
      enrollment,
      course,
    };
  }

  // User is not authorized
  return { authorized: false };
}

/**
 * Require course access or redirect to 403
 * Use this in server components and route handlers
 * @param courseId - The course ID to check access for
 * @param requiredRole - Optional: require a specific role (INSTRUCTOR or ADMIN)
 * @returns CourseAuthResult if authorized, otherwise redirects
 */
export async function requireCourseAccess(
  courseId: string,
  requiredRole?: 'INSTRUCTOR' | 'ADMIN'
): Promise<CourseAuthResult> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/courses/' + courseId);
  }

  const authResult = await checkCourseAccess(session.user.id, courseId);

  if (!authResult.authorized) {
    redirect('/403?reason=course_access_denied');
  }

  // Check if user has the required role
  if (requiredRole) {
    if (requiredRole === 'INSTRUCTOR' && authResult.role !== 'INSTRUCTOR' && authResult.role !== 'ADMIN') {
      redirect('/403?reason=instructor_access_required');
    }
    if (requiredRole === 'ADMIN' && authResult.role !== 'ADMIN') {
      redirect('/403?reason=admin_access_required');
    }
  }

  return authResult;
}

/**
 * Get all courses the user has access to
 * @param userId - The user ID
 * @returns Array of courses with access role
 */
export async function getUserCourses(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    return [];
  }

  // If admin, return all courses
  if (user.role === 'admin') {
    const allCourses = await prisma.course.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        description: true,
        joinCode: true,
        instructorId: true,
        createdAt: true,
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            questions: true,
            cells: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return allCourses.map((course) => ({
      ...course,
      userRole: 'ADMIN' as CourseRole,
    }));
  }

  // Get courses where user is instructor (owner)
  const ownedCourses = await prisma.course.findMany({
    where: {
      instructorId: userId,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      description: true,
      joinCode: true,
      instructorId: true,
      createdAt: true,
      instructor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          questions: true,
          cells: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get courses where user is enrolled
  const enrolledCourses = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          joinCode: true,
          instructorId: true,
          createdAt: true,
          isActive: true,
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              questions: true,
              cells: true,
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  // Combine and deduplicate
  const coursesMap = new Map<string, any>();

  // Add owned courses first (instructor role takes precedence)
  ownedCourses.forEach((course) => {
    coursesMap.set(course.id, {
      ...course,
      userRole: 'INSTRUCTOR' as CourseRole,
    });
  });

  // Add enrolled courses (don't overwrite if already an instructor)
  enrolledCourses.forEach(({ course, role }) => {
    if (course.isActive && !coursesMap.has(course.id)) {
      coursesMap.set(course.id, {
        ...course,
        userRole: (role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT') as CourseRole,
      });
    }
  });

  return Array.from(coursesMap.values());
}

/**
 * Check if user can manage course content (create/edit questions, topics, etc.)
 * Only instructors and admins can manage content
 */
export async function canManageCourse(
  userId: string,
  courseId: string
): Promise<boolean> {
  const authResult = await checkCourseAccess(userId, courseId);
  return authResult.authorized && (authResult.role === 'INSTRUCTOR' || authResult.role === 'ADMIN');
}

/**
 * Verify join code and enroll student in course
 * @param userId - The user ID to enroll
 * @param joinCode - The 6-character join code
 * @returns Enrollment result
 */
export async function enrollWithJoinCode(userId: string, joinCode: string) {
  // Find course by join code
  const course = await prisma.course.findUnique({
    where: { joinCode: joinCode.toUpperCase() },
    select: { id: true, title: true, isActive: true },
  });

  if (!course) {
    return {
      success: false,
      error: 'Invalid join code. Please check the code and try again.',
    };
  }

  if (!course.isActive) {
    return {
      success: false,
      error: 'This course is no longer active.',
    };
  }

  // Check if already enrolled
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: course.id,
      },
    },
  });

  if (existingEnrollment) {
    return {
      success: false,
      error: 'You are already enrolled in this course.',
      courseId: course.id,
    };
  }

  // Create enrollment
  try {
    await prisma.enrollment.create({
      data: {
        userId,
        courseId: course.id,
        role: 'STUDENT',
      },
    });

    return {
      success: true,
      message: `Successfully enrolled in "${course.title}"`,
      courseId: course.id,
    };
  } catch (error) {
    console.error('Enrollment error:', error);
    return {
      success: false,
      error: 'Failed to enroll in course. Please try again.',
    };
  }
}
