// src/app/api/courses/[courseId]/questions/route.ts
// Course-scoped question management API

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { canManageCourse } from '@/lib/course-authorization';
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

    const { searchParams } = new URL(req.url);
    const cellId = searchParams.get('cellId');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Build where clause
    const where: any = {
      courseId: params.courseId, // ✅ CRITICAL: Course scoping
    };

    if (cellId && cellId !== 'all') {
      where.cellId = cellId;
    }

    if (isActive && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.text = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (tags) {
      const tagNames = tags.split(',').map((t) => t.trim());
      where.tags = {
        some: {
          tag: {
            name: {
              in: tagNames,
            },
          },
        },
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.question.count({ where });

    // Calculate pagination
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const questions = await prisma.question.findMany({
      where,
      include: {
        cell: {
          select: {
            id: true,
            name: true,
          },
        },
        answerOptions: {
          select: {
            id: true,
            text: true,
            isCorrect: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: {
        text: 'asc',
      },
      skip,
      take,
    });

    return NextResponse.json({
      questions,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    });
  } catch (error) {
    console.error('[Course Questions API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can manage this course
    const canManage = await canManageCourse(session.user.id, params.courseId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have permission to manage this course' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      text,
      explanation,
      imageUrl,
      datasetUrl,
      datasetFilename,
      bloomTaxonomy,
      cellId,
      answerOptions,
      tagIds,
    } = body;

    // Validate required fields
    if (!text || !cellId || !answerOptions || answerOptions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify cellId belongs to this course
    const cell = await prisma.cell.findUnique({
      where: { id: cellId },
      select: { courseId: true },
    });

    if (!cell || cell.courseId !== params.courseId) {
      return NextResponse.json(
        { error: 'Invalid topic - topic does not belong to this course' },
        { status: 400 }
      );
    }

    // Create question with course scoping
    const question = await prisma.question.create({
      data: {
        text,
        explanation,
        imageUrl,
        datasetUrl,
        datasetFilename,
        bloomTaxonomy,
        cellId,
        courseId: params.courseId, // ✅ CRITICAL: Course scoping
        answerOptions: {
          create: answerOptions.map((option: any) => ({
            text: option.text,
            isCorrect: option.isCorrect,
          })),
        },
        tags: tagIds
          ? {
              create: tagIds.map((tagId: string) => ({
                tag: { connect: { id: tagId } },
              })),
            }
          : undefined,
      },
      include: {
        answerOptions: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error('[Course Question Create Error]:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}
