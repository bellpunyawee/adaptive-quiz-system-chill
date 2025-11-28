// src/app/api/admin/tags/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

/**
 * GET /api/admin/tags
 * List all tags with question counts
 */
export async function GET() {
  try {
    const session = await auth();

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

    // Get all tags with question counts
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { questions: true },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('[Tags API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tags
 * Create a new tag (admin only)
 */
export async function POST(req: Request) {
  try {
    const session = await auth();

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

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    // Normalize name (lowercase, trim, replace spaces with hyphens)
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '-');

    // Check if tag already exists
    const existing = await prisma.tag.findUnique({
      where: { name: normalizedName },
    });

    if (existing) {
      return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 409 });
    }

    // Create tag
    const tag = await prisma.tag.create({
      data: {
        name: normalizedName,
        description: description || null,
        color: color || '#6B7280', // Default gray
        category: category || 'custom',
      },
    });

    console.log(`[Admin] Created tag: ${tag.name} by user ${session.user.id}`);

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('[Tags API Error]:', error);
    return NextResponse.json(
      { error: 'Failed to create tag', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
