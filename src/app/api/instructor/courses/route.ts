// src/app/api/instructor/courses/route.ts
// API for instructor course management

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is instructor or admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'instructor' && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Instructor access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, description, joinCode } = body;

    // Validate required fields
    if (!title || !joinCode) {
      return NextResponse.json(
        { error: 'Title and join code are required' },
        { status: 400 }
      );
    }

    // Validate join code format (6 alphanumeric characters)
    if (!/^[A-Z0-9]{6}$/.test(joinCode)) {
      return NextResponse.json(
        { error: 'Join code must be 6 uppercase alphanumeric characters' },
        { status: 400 }
      );
    }

    // Check if join code already exists
    const existingCourse = await prisma.course.findUnique({
      where: { joinCode },
    });

    if (existingCourse) {
      return NextResponse.json(
        { error: 'Join code already in use. Please choose another.' },
        { status: 409 }
      );
    }

    // Create course
    const course = await prisma.course.create({
      data: {
        title,
        description,
        joinCode,
        instructorId: session.user.id,
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error('[Instructor Course Create Error]:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch instructor's courses
    const courses = await prisma.course.findMany({
      where: {
        instructorId: session.user.id,
      },
      include: {
        _count: {
          select: {
            enrollments: true,
            questions: true,
            quizzes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error('[Instructor Courses List Error]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
