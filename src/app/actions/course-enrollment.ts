// src/app/actions/course-enrollment.ts
// Server actions for course enrollment

'use server';

import { auth } from '@/auth';
import { enrollWithJoinCode } from '@/lib/course-authorization';
import { revalidatePath } from 'next/cache';

export interface EnrollmentResult {
  success: boolean;
  message?: string;
  error?: string;
  courseId?: string;
}

/**
 * Server action: Enroll in a course using a join code
 * @param joinCode - The 6-character join code
 */
export async function enrollInCourse(joinCode: string): Promise<EnrollmentResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be signed in to enroll in a course.',
      };
    }

    // Validate join code format
    const cleanCode = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(cleanCode)) {
      return {
        success: false,
        error: 'Join code must be exactly 6 alphanumeric characters.',
      };
    }

    // Attempt enrollment
    const result = await enrollWithJoinCode(session.user.id, cleanCode);

    // Revalidate relevant paths
    if (result.success && result.courseId) {
      revalidatePath('/courses');
      revalidatePath(`/courses/${result.courseId}`);
      revalidatePath('/dashboard');
    }

    return result;
  } catch (error) {
    console.error('Enrollment action error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
