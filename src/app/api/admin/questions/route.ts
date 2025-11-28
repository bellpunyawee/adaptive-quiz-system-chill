import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

// GET - List all questions with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cellId = searchParams.get('cellId');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags'); // Comma-separated tag names

    const where: any = {};

    if (cellId) {
      where.cellId = cellId;
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.text = {
        contains: search,
      };
    }

    // Filter by tags (AND logic: question must have ALL specified tags)
    if (tags) {
      const tagNames = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagNames.length > 0) {
        where.tags = {
          some: {
            tag: {
              name: { in: tagNames },
            },
          },
        };
      }
    }

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
        id: 'desc',
      },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

// POST - Create new question
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      text,
      explanation,
      imageUrl,
      bloomTaxonomy,
      cellId,
      options, // Array of { text, isCorrect }
      difficulty_b,
      discrimination_a,
      tagIds, // Array of tag IDs (optional)
    } = body;

    // Validation
    if (!text || !cellId || !options || options.length < 2) {
      return NextResponse.json(
        { error: 'Missing required fields or insufficient options' },
        { status: 400 }
      );
    }

    // Validate option count (4 or 5 options)
    if (options.length < 4 || options.length > 5) {
      return NextResponse.json(
        { error: 'Questions must have 4 or 5 options' },
        { status: 400 }
      );
    }

    // Validate exactly one correct answer
    const correctCount = options.filter((opt: any) => opt.isCorrect).length;
    if (correctCount !== 1) {
      return NextResponse.json(
        { error: 'Exactly one option must be marked as correct' },
        { status: 400 }
      );
    }

    // Create question with options and tags
    const question = await prisma.question.create({
      data: {
        text,
        explanation,
        imageUrl,
        bloomTaxonomy,
        cellId,
        difficulty_b: difficulty_b || 0,
        discrimination_a: discrimination_a || 1,
        answerOptions: {
          create: options.map((opt: any) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          })),
        },
        ...(tagIds && tagIds.length > 0 && {
          tags: {
            create: tagIds.map((tagId: string) => ({
              tag: {
                connect: { id: tagId },
              },
            })),
          },
        }),
      },
      include: {
        answerOptions: true,
        cell: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a question (will be in [id]/route.ts)
// PUT/PATCH - Update a question (will be in [id]/route.ts)
