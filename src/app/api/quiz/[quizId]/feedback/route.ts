/**
 * Quiz Feedback API Endpoint
 *
 * Generates personalized feedback for completed quizzes using Gemini 2.5 Flash
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';
import {
  generateFeedback,
  validateGeminiConfig,
  estimateCost,
} from '@/lib/ai/gemini-client';
import {
  assembleQuizContext,
  buildFeedbackPrompt,
  anonymizeContext,
} from '@/lib/ai/context-assembler';

const prisma = new PrismaClient();

/**
 * POST /api/quiz/[quizId]/feedback
 *
 * Generate personalized feedback for a completed quiz
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const startTime = Date.now();

  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { quizId } = await params;

    // 2. Validate Gemini configuration
    if (!validateGeminiConfig()) {
      return NextResponse.json(
        {
          error: 'Feedback service not configured',
          message: 'GEMINI_API_KEY is not set in environment variables',
        },
        { status: 500 }
      );
    }

    // 3. Verify quiz exists and belongs to user
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { userAnswers: true },
    });

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    if (quiz.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - This quiz does not belong to you' },
        { status: 403 }
      );
    }

    // 4. Check if quiz is completed
    if (quiz.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Quiz not completed',
          message: 'Feedback can only be generated for completed quizzes',
        },
        { status: 400 }
      );
    }

    // 5. Check if feedback already exists (optional caching)
    const existingFeedback = await prisma.feedbackLog.findFirst({
      where: {
        userId,
        quizId,
        feedbackType: 'quiz_summary',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Return cached feedback if it exists and is recent (within 1 hour)
    if (existingFeedback) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (existingFeedback.createdAt > hourAgo) {
        return NextResponse.json({
          feedback: parseFeedbackText(existingFeedback.feedbackText),
          metadata: {
            generatedAt: existingFeedback.createdAt,
            tokensUsed: existingFeedback.tokensUsed,
            responseTime: existingFeedback.responseTime,
            usedCache: true,
            modelUsed: existingFeedback.modelUsed,
          },
        });
      }
    }

    // 6. Assemble quiz context
    const context = await assembleQuizContext(quizId, userId);

    // 7. Anonymize context for PDPA compliance
    const anonymizedContext = anonymizeContext(context);

    // 8. Build prompt
    const prompt = buildFeedbackPrompt(anonymizedContext);

    // 9. Generate feedback using Gemini
    const { text: feedbackText, tokensUsed } = await generateFeedback(prompt);

    const responseTime = Date.now() - startTime;
    const cost = estimateCost(tokensUsed);

    // 10. Parse and structure feedback
    console.log('Raw feedback text from Gemini:', feedbackText);
    const structuredFeedback = parseFeedbackText(feedbackText);
    console.log('Parsed feedback structure:', {
      summary: structuredFeedback.summary?.substring(0, 50) + '...',
      strengthsCount: structuredFeedback.strengths?.length,
      improvementsCount: structuredFeedback.improvements?.length,
      nextStepsCount: structuredFeedback.nextSteps?.length,
    });

    // 11. Save feedback log for analytics
    await prisma.feedbackLog.create({
      data: {
        userId,
        quizId,
        feedbackText,
        feedbackType: 'quiz_summary',
        tokensUsed: tokensUsed.total,
        responseTime,
        usedCache: false,
        modelUsed: 'gemini-2.5-flash',
      },
    });

    // 12. Return structured feedback
    return NextResponse.json({
      feedback: structuredFeedback,
      metadata: {
        generatedAt: new Date(),
        tokensUsed: tokensUsed.total,
        responseTime,
        usedCache: false,
        modelUsed: 'gemini-2.5-flash',
        cost: `$${cost.toFixed(6)}`,
      },
    });
  } catch (error: any) {
    console.error('[Feedback] Error generating feedback:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate feedback',
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/quiz/[quizId]/feedback
 *
 * Retrieve existing feedback for a quiz
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId } = await params;
    const userId = session.user.id;

    // Fetch most recent feedback for this quiz
    const feedback = await prisma.feedbackLog.findFirst({
      where: {
        userId,
        quizId,
        feedbackType: 'quiz_summary',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!feedback) {
      return NextResponse.json(
        { error: 'No feedback found for this quiz' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      feedback: parseFeedbackText(feedback.feedbackText),
      metadata: {
        generatedAt: feedback.createdAt,
        tokensUsed: feedback.tokensUsed,
        responseTime: feedback.responseTime,
        usedCache: feedback.usedCache,
        modelUsed: feedback.modelUsed,
      },
    });
  } catch (error: any) {
    console.error('[Feedback] Error retrieving feedback:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve feedback', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Parse feedback text into structured format
 * Extracts sections from markdown-formatted feedback
 */
function parseFeedbackText(text: string): {
  summary: string;
  strengths: string[];
  improvements: string[];
  insights: string;
  nextSteps: string[];
  fullText: string;
} {
  // Default structure
  const result = {
    summary: '',
    strengths: [] as string[],
    improvements: [] as string[],
    insights: '',
    nextSteps: [] as string[],
    fullText: text,
  };

  try {
    // Extract Performance Summary
    const summaryMatch = text.match(
      /\*\*Performance Summary\*\*\s*([\s\S]*?)(?=\*\*|$)/i
    );
    if (summaryMatch) {
      result.summary = summaryMatch[1].trim();
    }

    // Extract Key Strengths (bullet points)
    const strengthsMatch = text.match(
      /\*\*Key Strengths\*\*\s*([\s\S]*?)(?=\*\*|$)/i
    );
    if (strengthsMatch) {
      result.strengths = extractBulletPoints(strengthsMatch[1]);
    }

    // Extract Growth Opportunities
    const improvementsMatch = text.match(
      /\*\*Growth Opportunities\*\*\s*([\s\S]*?)(?=\*\*|$)/i
    );
    if (improvementsMatch) {
      result.improvements = extractBulletPoints(improvementsMatch[1]);
    }

    // Extract Recommended Next Steps
    const nextStepsMatch = text.match(
      /\*\*Recommended Next Steps\*\*\s*([\s\S]*?)$/i
    );
    if (nextStepsMatch) {
      result.nextSteps = extractBulletPoints(nextStepsMatch[1]);
    }

    // Insights is the full text for now (can be refined)
    result.insights = text;
  } catch (error) {
    console.warn('[Feedback] Error parsing feedback text:', error);
    // Return full text as fallback
  }

  return result;
}

/**
 * Extract bullet points from markdown text
 */
function extractBulletPoints(text: string): string[] {
  const lines = text.split('\n');
  const bullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match -, •, *, or numbered bullets (1., 2., etc.)
    if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim());
    }
  }

  return bullets.filter((b) => b.length > 0);
}
