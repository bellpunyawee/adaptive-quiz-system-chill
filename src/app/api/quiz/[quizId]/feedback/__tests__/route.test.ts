/**
 * Integration tests for Personalized Feedback API
 * Tests POST and GET endpoints with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  default: {
    quiz: {
      findUnique: vi.fn(),
    },
    feedbackLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/ai/gemini-client', () => ({
  validateGeminiConfig: vi.fn(() => true),
  generateFeedback: vi.fn(),
  estimateCost: vi.fn(() => 0.00025),
}));

vi.mock('@/lib/ai/context-assembler', () => ({
  assembleQuizContext: vi.fn(),
  anonymizeContext: vi.fn((ctx) => JSON.stringify(ctx)),
  buildFeedbackPrompt: vi.fn((ctx) => `Generate feedback for: ${ctx}`),
}));

import { auth } from '@/auth';
import prisma from '@/lib/db';
import { generateFeedback } from '@/lib/ai/gemini-client';
import { assembleQuizContext } from '@/lib/ai/context-assembler';

describe('Feedback API - POST /api/quiz/[quizId]/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/quiz/test-quiz-id/feedback', {
      method: 'POST',
    });

    const response = await POST(req, { params: Promise.resolve({ quizId: 'test-quiz-id' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 404 if quiz is not found', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.quiz.findUnique).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/quiz/test-quiz-id/feedback', {
      method: 'POST',
    });

    const response = await POST(req, { params: Promise.resolve({ quizId: 'test-quiz-id' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Quiz not found');
  });

  it('should return 403 if quiz does not belong to user', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
      id: 'quiz-123',
      userId: 'different-user',
      status: 'completed',
      userAnswers: [],
    } as any);

    const req = new NextRequest('http://localhost:3000/api/quiz/quiz-123/feedback', {
      method: 'POST',
    });

    const response = await POST(req, { params: Promise.resolve({ quizId: 'quiz-123' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 400 if quiz is not completed', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
      id: 'quiz-123',
      userId: 'user-123',
      status: 'in-progress',
      userAnswers: [],
    } as any);

    const req = new NextRequest('http://localhost:3000/api/quiz/quiz-123/feedback', {
      method: 'POST',
    });

    const response = await POST(req, { params: Promise.resolve({ quizId: 'quiz-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Quiz not completed');
  });

  it('should return cached feedback if it exists and is recent', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
      id: 'quiz-123',
      userId: 'user-123',
      status: 'completed',
      userAnswers: [],
    } as any);

    const recentFeedback = {
      id: 'feedback-1',
      userId: 'user-123',
      quizId: 'quiz-123',
      feedbackText: '**Performance Summary**\nGood job!\n**Key Strengths**\n- Strong basics',
      feedbackType: 'quiz_summary',
      tokensUsed: 850,
      responseTime: 2500,
      usedCache: false,
      modelUsed: 'gemini-2.5-flash',
      createdAt: new Date(), // Recent
    };

    vi.mocked(prisma.feedbackLog.findFirst).mockResolvedValue(recentFeedback as any);

    const req = new NextRequest('http://localhost:3000/api/quiz/quiz-123/feedback', {
      method: 'POST',
    });

    const response = await POST(req, { params: Promise.resolve({ quizId: 'quiz-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metadata.usedCache).toBe(true);
    expect(vi.mocked(generateFeedback)).not.toHaveBeenCalled();
  });

  it('should generate new feedback if none exists', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
      id: 'quiz-123',
      userId: 'user-123',
      status: 'completed',
      userAnswers: [],
    } as any);

    vi.mocked(prisma.feedbackLog.findFirst).mockResolvedValue(null);

    vi.mocked(assembleQuizContext).mockResolvedValue({
      quiz: {
        id: 'quiz-123',
        correctCount: 8,
        totalQuestions: 10,
        accuracy: 80,
        topics: ['Python'],
        duration: 20,
        quizType: 'adaptive',
        completedAt: new Date(),
      },
    } as any);

    vi.mocked(generateFeedback).mockResolvedValue({
      text: '**Performance Summary**\nExcellent work!\n**Key Strengths**\n- Very strong\n**Growth Opportunities**\n- Minor areas\n**Recommended Next Steps**\n- Keep practicing',
      tokensUsed: { input: 600, output: 250, total: 850 },
    });

    vi.mocked(prisma.feedbackLog.create).mockResolvedValue({
      id: 'new-feedback',
      feedbackText: 'Generated feedback',
      tokensUsed: 850,
      responseTime: 2500,
      usedCache: false,
      modelUsed: 'gemini-2.5-flash',
    } as any);

    const req = new NextRequest('http://localhost:3000/api/quiz/quiz-123/feedback', {
      method: 'POST',
    });

    const response = await POST(req, { params: Promise.resolve({ quizId: 'quiz-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.feedback).toBeDefined();
    expect(data.feedback.summary).toBeDefined();
    expect(data.metadata.usedCache).toBe(false);
    expect(vi.mocked(generateFeedback)).toHaveBeenCalled();
    expect(vi.mocked(prisma.feedbackLog.create)).toHaveBeenCalled();
  });
});

describe('Feedback API - GET /api/quiz/[quizId]/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/quiz/test-quiz-id/feedback');

    const response = await GET(req, { params: Promise.resolve({ quizId: 'test-quiz-id' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if no feedback exists for quiz', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: new Date().toISOString(),
    });

    vi.mocked(prisma.feedbackLog.findFirst).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/quiz/quiz-123/feedback');

    const response = await GET(req, { params: Promise.resolve({ quizId: 'quiz-123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('No feedback found');
  });

  it('should return existing feedback', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: new Date().toISOString(),
    });

    const existingFeedback = {
      id: 'feedback-1',
      userId: 'user-123',
      quizId: 'quiz-123',
      feedbackText: '**Performance Summary**\nGreat work!\n**Key Strengths**\n- Excellent basics',
      feedbackType: 'quiz_summary',
      tokensUsed: 850,
      responseTime: 2500,
      usedCache: false,
      modelUsed: 'gemini-2.5-flash',
      createdAt: new Date(),
    };

    vi.mocked(prisma.feedbackLog.findFirst).mockResolvedValue(existingFeedback as any);

    const req = new NextRequest('http://localhost:3000/api/quiz/quiz-123/feedback');

    const response = await GET(req, { params: Promise.resolve({ quizId: 'quiz-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.feedback).toBeDefined();
    expect(data.metadata.tokensUsed).toBe(850);
    expect(data.metadata.responseTime).toBe(2500);
  });

  it('should parse feedback text into structured format', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: new Date().toISOString(),
    });

    const feedbackText = `**Performance Summary**
You scored 80% (8/10 correct).

**Key Strengths**
- Strong understanding of Python basics
- Good problem-solving skills

**Growth Opportunities**
- Need more practice with algorithms
- Review data structures concepts

**Recommended Next Steps**
- Practice 5 algorithm problems
- Review linked lists and trees`;

    vi.mocked(prisma.feedbackLog.findFirst).mockResolvedValue({
      feedbackText,
      tokensUsed: 850,
      responseTime: 2500,
      usedCache: false,
      modelUsed: 'gemini-2.5-flash',
      createdAt: new Date(),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/quiz/quiz-123/feedback');

    const response = await GET(req, { params: Promise.resolve({ quizId: 'quiz-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.feedback.summary).toBeDefined();
    expect(data.feedback.strengths).toBeInstanceOf(Array);
    expect(data.feedback.improvements).toBeInstanceOf(Array);
    expect(data.feedback.nextSteps).toBeInstanceOf(Array);
  });
});
