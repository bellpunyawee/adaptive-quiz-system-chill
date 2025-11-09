// src/app/api/admin/export/json/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/export/json
 * Export quiz responses to JSON format
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
            id: true,
            name: true,
            email: true,
          },
        },
        quiz: {
          select: {
            id: true,
            quizType: true,
            createdAt: true,
          },
        },
        question: {
          select: {
            id: true,
            text: true,
            difficulty_b: true,
            discrimination_a: true,
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

    // Format data for JSON export
    const formattedLogs = logs.map((log) => {
      const selectedOption = log.question.answerOptions.find(
        (opt) => opt.id === log.selectedOptionId
      );
      const correctOption = log.question.answerOptions.find((opt) => opt.isCorrect);

      return {
        timestamp: log.createdAt,
        user: {
          id: log.user.id,
          name: log.user.name,
          email: log.user.email,
        },
        quiz: {
          id: log.quiz.id,
          type: log.quiz.quizType,
          createdAt: log.quiz.createdAt,
        },
        question: {
          id: log.question.id,
          text: log.question.text,
          topic: log.question.cell.name,
          difficulty: log.question.difficulty_b,
          discrimination: log.question.discrimination_a,
        },
        response: {
          selectedOption: selectedOption
            ? {
                id: selectedOption.id,
                text: selectedOption.text,
              }
            : null,
          correctOption: correctOption
            ? {
                id: correctOption.id,
                text: correctOption.text,
              }
            : null,
          isCorrect: log.isCorrect,
          responseTime: log.responseTime,
          abilityAtTime: log.abilityAtTime,
        },
      };
    });

    const exportData = {
      exportDate: new Date().toISOString(),
      filters: {
        userId,
        quizType,
        isCorrect,
        startDate,
        endDate,
        search,
      },
      totalRecords: formattedLogs.length,
      data: formattedLogs,
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `quiz-logs-${timestamp}.json`;

    // Return JSON with appropriate headers
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[JSON Export Error]:', error);
    return NextResponse.json(
      {
        error: 'Failed to export JSON.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
