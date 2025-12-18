// src/app/api/courses/join/route.ts
// API for students to join courses using join codes

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { joinCode } = body;

    // Validate join code
    if (!joinCode) {
      return NextResponse.json(
        { error: 'Join code is required' },
        { status: 400 }
      );
    }

    // Convert to uppercase
    const code = joinCode.trim().toUpperCase();

    // Validate format
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid join code format' },
        { status: 400 }
      );
    }

    // Find course by join code
    const course = await prisma.course.findUnique({
      where: { joinCode: code },
      select: {
        id: true,
        title: true,
        isActive: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found. Please check your join code.' },
        { status: 404 }
      );
    }

    if (!course.isActive) {
      return NextResponse.json(
        { error: 'This course is no longer active' },
        { status: 403 }
      );
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: course.id,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        {
          message: 'Already enrolled in this course',
          courseId: course.id,
          alreadyEnrolled: true,
        },
        { status: 200 }
      );
    }

    // Create enrollment
    await prisma.enrollment.create({
      data: {
        userId: session.user.id,
        courseId: course.id,
        role: 'STUDENT',
      },
    });

    return NextResponse.json(
      {
        message: `Successfully enrolled in ${course.title}`,
        courseId: course.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Course Join Error]:', error);
    return NextResponse.json(
      { error: 'Failed to join course' },
      { status: 500 }
    );
  }
}
