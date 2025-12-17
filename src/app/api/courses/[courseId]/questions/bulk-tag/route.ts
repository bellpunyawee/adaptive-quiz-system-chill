// src/app/api/courses/[courseId]/questions/bulk-tag/route.ts
// Bulk tag assignment for course questions

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { canManageCourse } from '@/lib/course-authorization';
import prisma from '@/lib/db';

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
    const { questionIds, tagIds, action } = body;

    // Validate input
    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: 'questionIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json(
        { error: 'tagIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!action || !['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "add" or "remove"' },
        { status: 400 }
      );
    }

    // Verify all questions belong to this course
    const questionCount = await prisma.question.count({
      where: {
        id: { in: questionIds },
        courseId: params.courseId,
      },
    });

    if (questionCount !== questionIds.length) {
      return NextResponse.json(
        { error: 'Some questions do not belong to this course' },
        { status: 400 }
      );
    }

    // Verify all tags belong to this course
    const tagCount = await prisma.tag.count({
      where: {
        id: { in: tagIds },
        courseId: params.courseId,
      },
    });

    if (tagCount !== tagIds.length) {
      return NextResponse.json(
        { error: 'Some tags do not belong to this course' },
        { status: 400 }
      );
    }

    if (action === 'add') {
      // Add tags to questions
      const operations = [];
      for (const questionId of questionIds) {
        for (const tagId of tagIds) {
          operations.push(
            prisma.questionTag.upsert({
              where: {
                questionId_tagId: {
                  questionId,
                  tagId,
                },
              },
              create: {
                questionId,
                tagId,
              },
              update: {}, // No update needed, just ensure it exists
            })
          );
        }
      }

      await prisma.$transaction(operations);
    } else {
      // Remove tags from questions
      await prisma.questionTag.deleteMany({
        where: {
          questionId: { in: questionIds },
          tagId: { in: tagIds },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${action === 'add' ? 'added' : 'removed'} ${tagIds.length} tag(s) ${
        action === 'add' ? 'to' : 'from'
      } ${questionIds.length} question(s)`,
    });
  } catch (error) {
    console.error('[Bulk Tag Error]:', error);
    return NextResponse.json(
      { error: 'Failed to update tags' },
      { status: 500 }
    );
  }
}
