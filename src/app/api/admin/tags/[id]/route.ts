// src/app/api/admin/tags/[id]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

type Params = Promise<{ id: string }>;

/**
 * GET /api/admin/tags/:id
 * Get a single tag with its question count
 */
export async function GET(req: Request, { params }: { params: Params }) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error('[Tags API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tag', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tags/:id
 * Update a tag (admin only)
 */
export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, color, category } = body;

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // If name is being updated, check for uniqueness
    if (name && name !== existingTag.name) {
      const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '-');
      const duplicate = await prisma.tag.findUnique({
        where: { name: normalizedName },
      });

      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 409 });
      }
    }

    // Update tag
    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        ...(name && { name: name.trim().toLowerCase().replace(/\s+/g, '-') }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(category && { category }),
      },
    });

    console.log(`[Admin] Updated tag: ${updatedTag.name} by user ${session.user.id}`);

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error('[Tags API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to update tag', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tags/:id
 * Delete a tag with safety check (admin only)
 */
export async function DELETE(req: Request, { params }: { params: Params }) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Check if tag exists and get question count
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Warn if tag is in use (but allow deletion - cascade will handle cleanup)
    if (tag._count.questions > 0) {
      console.warn(
        `[Admin] Deleting tag "${tag.name}" which is assigned to ${tag._count.questions} questions`
      );
    }

    // Delete tag (cascade will remove QuestionTag entries)
    await prisma.tag.delete({
      where: { id },
    });

    console.log(`[Admin] Deleted tag: ${tag.name} by user ${session.user.id}`);

    return NextResponse.json({
      message: 'Tag deleted successfully',
      deletedTag: tag.name,
      questionCount: tag._count.questions,
    });
  } catch (error) {
    console.error('[Tags API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
