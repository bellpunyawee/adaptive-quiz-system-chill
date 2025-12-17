// src/app/api/courses/[courseId]/questions/[id]/route.ts
// Individual question management within a course

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { canManageCourse } from '@/lib/course-authorization';
import prisma from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { courseId: string; id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const question = await prisma.question.findUnique({
      where: {
        id: params.id,
        courseId: params.courseId, // ✅ Course scoping
      },
      include: {
        cell: {
          select: {
            id: true,
            name: true,
          },
        },
        answerOptions: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error('[Get Question Error]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; id: string } }
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

    // Verify question belongs to this course
    const existingQuestion = await prisma.question.findUnique({
      where: { id: params.id },
      select: { courseId: true },
    });

    if (!existingQuestion || existingQuestion.courseId !== params.courseId) {
      return NextResponse.json(
        { error: 'Question not found in this course' },
        { status: 404 }
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
      isActive,
      answerOptions,
      tagIds,
    } = body;

    // If cellId is being updated, verify it belongs to this course
    if (cellId) {
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
    }

    // Update question
    const updateData: any = {};
    if (text !== undefined) updateData.text = text;
    if (explanation !== undefined) updateData.explanation = explanation;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (datasetUrl !== undefined) updateData.datasetUrl = datasetUrl;
    if (datasetFilename !== undefined) updateData.datasetFilename = datasetFilename;
    if (bloomTaxonomy !== undefined) updateData.bloomTaxonomy = bloomTaxonomy;
    if (cellId !== undefined) updateData.cellId = cellId;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle answer options update
    if (answerOptions) {
      // Delete existing answer options
      await prisma.answerOption.deleteMany({
        where: { questionId: params.id },
      });

      // Create new answer options
      updateData.answerOptions = {
        create: answerOptions.map((option: any) => ({
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      };
    }

    // Handle tags update
    if (tagIds !== undefined) {
      // Delete existing tags
      await prisma.questionTag.deleteMany({
        where: { questionId: params.id },
      });

      // Create new tags
      if (tagIds.length > 0) {
        updateData.tags = {
          create: tagIds.map((tagId: string) => ({
            tag: { connect: { id: tagId } },
          })),
        };
      }
    }

    const question = await prisma.question.update({
      where: { id: params.id },
      data: updateData,
      include: {
        answerOptions: true,
        tags: {
          include: {
            tag: true,
          },
        },
        cell: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error('[Update Question Error]:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { courseId: string; id: string } }
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

    // Verify question belongs to this course
    const existingQuestion = await prisma.question.findUnique({
      where: { id: params.id },
      select: { courseId: true },
    });

    if (!existingQuestion || existingQuestion.courseId !== params.courseId) {
      return NextResponse.json(
        { error: 'Question not found in this course' },
        { status: 404 }
      );
    }

    // Delete question (cascades to answer options and tags)
    await prisma.question.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Delete Question Error]:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}
