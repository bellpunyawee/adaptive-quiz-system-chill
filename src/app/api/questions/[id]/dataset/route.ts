import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Download dataset for a question
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication - any authenticated user can download
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get question with dataset info
    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        datasetUrl: true,
        datasetFilename: true,
      },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    if (!question.datasetUrl) {
      return NextResponse.json(
        { error: 'No dataset attached to this question' },
        { status: 404 }
      );
    }

    // Redirect to the Vercel Blob URL for download
    // This allows the browser to handle the download with proper headers
    return NextResponse.redirect(question.datasetUrl);

  } catch (error) {
    console.error('Error fetching dataset:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dataset' },
      { status: 500 }
    );
  }
}
