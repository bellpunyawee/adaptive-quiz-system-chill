// src/app/api/admin/export/csv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/export/csv
 * Export quiz responses to CSV format
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const authError = await requireAdmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);

    // Parse filters (same as logs API)
    const userId = searchParams.get('userId') || undefined;
    const quizType = searchParams.get('quizType') || undefined;
    const isCorrectParam = searchParams.get('isCorrect');
    const isCorrect = isCorrectParam ? isCorrectParam === 'true' : undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const search = searchParams.get('search') || undefined;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (userId) where.userId = userId;
    if (quizType) where.quiz = { quizType };
    if (isCorrect !== undefined) where.isCorrect = isCorrect;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' as const } } },
        { user: { email: { contains: search, mode: 'insensitive' as const } } },
        { question: { text: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    // Fetch all matching records (limit to 10,000 for safety)
    const logs = await prisma.userAnswer.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        quiz: {
          select: {
            quizType: true,
          },
        },
        question: {
          select: {
            text: true,
            cell: {
              select: {
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000, // Safety limit
    });

    // Generate CSV content
    const headers = [
      'Timestamp',
      'User Name',
      'User Email',
      'Quiz Type',
      'Topic',
      'Question',
      'Selected Answer',
      'Correct Answer',
      'Result',
      'Response Time (ms)',
      'Ability (θ)',
    ];

    const rows = logs.map((log) => {
      const selectedOption = log.question.answerOptions.find(
        (opt) => opt.id === log.selectedOptionId
      );
      const correctOption = log.question.answerOptions.find((opt) => opt.isCorrect);

      return [
        log.createdAt.toISOString(),
        log.user.name || 'N/A',
        log.user.email || 'N/A',
        log.quiz.quizType || 'regular',
        log.question.cell.name,
        `"${log.question.text.replace(/"/g, '""')}"`, // Escape quotes
        `"${selectedOption?.text.replace(/"/g, '""') || 'N/A'}"`,
        `"${correctOption?.text.replace(/"/g, '""') || 'N/A'}"`,
        log.isCorrect ? 'Correct' : 'Incorrect',
        log.responseTime?.toString() || 'N/A',
        log.abilityAtTime?.toFixed(2) || 'N/A',
      ];
    });

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `quiz-logs-${timestamp}.csv`;

    // Return CSV with appropriate headers
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[CSV Export Error]:', error);
    return NextResponse.json(
      {
        error: 'Failed to export CSV.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
