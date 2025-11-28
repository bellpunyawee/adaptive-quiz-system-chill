// src/app/api/admin/questions/bulk-tag/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

/**
 * POST /api/admin/questions/bulk-tag
 * Assign or remove tags from multiple questions
 * Body: { questionIds: string[], tagIds: string[], action: 'add' | 'remove' }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role (admin or instructor)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== 'admin' && user.role !== 'instructor')) {
      return NextResponse.json({ error: 'Forbidden - Admin or instructor access required' }, { status: 403 });
    }

    const body = await req.json();
    const { questionIds, tagIds, action } = body;

    // Validation
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: 'questionIds must be a non-empty array' }, { status: 400 });
    }

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json({ error: 'tagIds must be a non-empty array' }, { status: 400 });
    }

    if (action !== 'add' && action !== 'remove') {
      return NextResponse.json({ error: 'action must be either "add" or "remove"' }, { status: 400 });
    }

    // Verify all questions exist
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true },
    });

    if (questions.length !== questionIds.length) {
      return NextResponse.json({ error: 'One or more question IDs are invalid' }, { status: 400 });
    }

    // Verify all tags exist
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true, name: true },
    });

    if (tags.length !== tagIds.length) {
      return NextResponse.json({ error: 'One or more tag IDs are invalid' }, { status: 400 });
    }

    let result;
    if (action === 'add') {
      // Add tags to questions
      const tagAssignments = questionIds.flatMap((questionId) =>
        tagIds.map((tagId) => ({
          questionId,
          tagId,
        }))
      );

      // Filter out existing assignments to avoid duplicates (SQLite doesn't support skipDuplicates)
      const existing = await prisma.questionTag.findMany({
        where: {
          OR: tagAssignments.map(({ questionId, tagId }) => ({
            questionId,
            tagId,
          })),
        },
        select: {
          questionId: true,
          tagId: true,
        },
      });

      const existingSet = new Set(
        existing.map((e) => `${e.questionId}-${e.tagId}`)
      );

      const newAssignments = tagAssignments.filter(
        ({ questionId, tagId }) => !existingSet.has(`${questionId}-${tagId}`)
      );

      result = await prisma.questionTag.createMany({
        data: newAssignments,
      });

      console.log(
        `[Admin] Bulk assigned ${result.count} tag-question pairs by user ${session.user.id}`
      );

      return NextResponse.json({
        message: `Successfully assigned tags to ${questionIds.length} questions`,
        action: 'add',
        questionCount: questionIds.length,
        tagCount: tagIds.length,
        assignmentsCreated: result.count,
        tags: tags.map((t) => t.name),
      });
    } else {
      // Remove tags from questions
      result = await prisma.questionTag.deleteMany({
        where: {
          questionId: { in: questionIds },
          tagId: { in: tagIds },
        },
      });

      console.log(
        `[Admin] Bulk removed ${result.count} tag-question pairs by user ${session.user.id}`
      );

      return NextResponse.json({
        message: `Successfully removed tags from ${questionIds.length} questions`,
        action: 'remove',
        questionCount: questionIds.length,
        tagCount: tagIds.length,
        assignmentsRemoved: result.count,
        tags: tags.map((t) => t.name),
      });
    }
  } catch (error) {
    console.error('[Bulk Tag API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to bulk assign/remove tags', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
