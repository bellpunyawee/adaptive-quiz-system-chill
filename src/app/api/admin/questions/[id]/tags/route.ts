// src/app/api/admin/questions/[id]/tags/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

type Params = Promise<{ id: string }>;

/**
 * POST /api/admin/questions/:id/tags
 * Assign tags to a question
 * Body: { tagIds: string[] }
 */
export async function POST(req: Request, { params }: { params: Params }) {
  try {
    const session = await auth();
    const { id: questionId } = await params;

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
    const { tagIds } = body;

    // Validation
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json({ error: 'tagIds must be a non-empty array' }, { status: 400 });
    }

    // Check if question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Verify all tags exist
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
    });

    if (tags.length !== tagIds.length) {
      return NextResponse.json({ error: 'One or more tag IDs are invalid' }, { status: 400 });
    }

    // Filter out existing assignments to avoid duplicates (SQLite doesn't support skipDuplicates)
    const existing = await prisma.questionTag.findMany({
      where: {
        questionId,
        tagId: { in: tagIds },
      },
      select: { tagId: true },
    });

    const existingTagIds = new Set(existing.map((e) => e.tagId));
    const newTagIds = tagIds.filter((tagId) => !existingTagIds.has(tagId));

    // Create tag assignments
    const result = await prisma.questionTag.createMany({
      data: newTagIds.map((tagId) => ({
        questionId,
        tagId,
      })),
    });

    console.log(
      `[Admin] Assigned ${result.count} tags to question ${questionId} by user ${session.user.id}`
    );

    // Return updated question with tags
    const updatedQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: `Successfully assigned ${result.count} tags`,
      question: updatedQuestion,
    });
  } catch (error) {
    console.error('[Question Tags API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to assign tags', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/questions/:id/tags
 * Remove all tags from a question or specific tags
 * Body: { tagIds?: string[] } (if empty, removes all tags)
 */
export async function DELETE(req: Request, { params }: { params: Params }) {
  try {
    const session = await auth();
    const { id: questionId } = await params;

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
    const { tagIds } = body;

    // Check if question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    let result;
    if (!tagIds || tagIds.length === 0) {
      // Remove all tags from question
      result = await prisma.questionTag.deleteMany({
        where: { questionId },
      });
    } else {
      // Remove specific tags
      result = await prisma.questionTag.deleteMany({
        where: {
          questionId,
          tagId: { in: tagIds },
        },
      });
    }

    console.log(`[Admin] Removed ${result.count} tags from question ${questionId} by user ${session.user.id}`);

    return NextResponse.json({
      message: `Successfully removed ${result.count} tags`,
      removedCount: result.count,
    });
  } catch (error) {
    console.error('[Question Tags API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to remove tags', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
