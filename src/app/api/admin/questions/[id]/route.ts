import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { del } from '@vercel/blob';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single question
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    const question = await prisma.question.findUnique({
      where: { id },
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
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    );
  }
}

// PATCH - Update question
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body = await request.json();
    const {
      text,
      explanation,
      imageUrl,
      bloomTaxonomy,
      cellId,
      options,
      difficulty_b,
      discrimination_a,
    } = body;

    // Get existing question
    const existingQuestion = await prisma.question.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    if (!existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // If options are provided, validate them
    if (options) {
      if (options.length < 4 || options.length > 5) {
        return NextResponse.json(
          { error: 'Questions must have 4 or 5 options' },
          { status: 400 }
        );
      }

      const correctCount = options.filter((opt: any) => opt.isCorrect).length;
      if (correctCount !== 1) {
        return NextResponse.json(
          { error: 'Exactly one option must be marked as correct' },
          { status: 400 }
        );
      }
    }

    // If imageUrl changed and old image exists, delete old image from Blob
    if (
      imageUrl !== undefined &&
      existingQuestion.imageUrl &&
      existingQuestion.imageUrl !== imageUrl
    ) {
      try {
        await del(existingQuestion.imageUrl, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch (error) {
        console.error('Error deleting old image:', error);
        // Continue anyway - don't fail the update if image deletion fails
      }
    }

    // Update question
    const updateData: any = {
      ...(text !== undefined && { text }),
      ...(explanation !== undefined && { explanation }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(bloomTaxonomy !== undefined && { bloomTaxonomy }),
      ...(cellId !== undefined && { cellId }),
      ...(difficulty_b !== undefined && { difficulty_b }),
      ...(discrimination_a !== undefined && { discrimination_a }),
    };

    // If options are provided, update them
    if (options) {
      // Delete existing options and create new ones
      await prisma.answerOption.deleteMany({
        where: { questionId: id },
      });

      updateData.answerOptions = {
        create: options.map((opt: any) => ({
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
      };
    }

    const question = await prisma.question.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

// DELETE - Delete question
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Get question to check for image
    const question = await prisma.question.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Delete image from Blob if it exists
    if (question.imageUrl) {
      try {
        await del(question.imageUrl, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch (error) {
        console.error('Error deleting image:', error);
        // Continue anyway
      }
    }

    // Delete question (cascade will delete answer options)
    await prisma.question.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}
