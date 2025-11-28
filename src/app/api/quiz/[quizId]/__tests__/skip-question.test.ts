/**
 * Tests for "I Don't Know" button / skip question functionality
 *
 * Tests cover:
 * - Skip request handling
 * - Database record creation with wasSkipped flag
 * - Feedback response format for skipped questions
 * - IRT processing of skipped questions (treated as incorrect)
 * - Analytics tracking of skip events
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import prisma from '@/lib/db';
import { auth } from '@/auth';

// Mock authentication
jest.mock('@/auth', () => ({
  auth: jest.fn()
}));

// Mock adaptive engine
jest.mock('@/lib/adaptive-engine/engine-enhanced', () => ({
  processUserAnswer: jest.fn().mockResolvedValue({
    isCorrect: false,
    abilityUpdate: {
      oldTheta: 0,
      newTheta: -0.5,
      confidence: 0.7,
      method: 'EAP'
    }
  })
}));

describe('Skip Question Feature', () => {
  const mockUserId = 'test-user-123';
  const mockQuizId = 'test-quiz-456';
  const mockQuestionId = 'test-question-789';

  beforeEach(async () => {
    // Setup authenticated user
    (auth as jest.Mock).mockResolvedValue({
      user: { id: mockUserId }
    });

    // Create test data
    await prisma.user.create({
      data: {
        id: mockUserId,
        email: 'test@example.com',
        role: 'user'
      }
    });

    const cell = await prisma.cell.create({
      data: {
        name: 'Test Cell',
        difficulty_b: 0.5,
        discrimination_a: 1.0
      }
    });

    await prisma.quiz.create({
      data: {
        id: mockQuizId,
        userId: mockUserId,
        status: 'in-progress'
      }
    });

    const question = await prisma.question.create({
      data: {
        id: mockQuestionId,
        text: 'Test question?',
        cellId: cell.id,
        difficulty_b: 0.5,
        discrimination_a: 1.0,
        guessing_c: 0.25,
        irtModel: '3PL'
      }
    });

    await prisma.answerOption.createMany({
      data: [
        { questionId: question.id, text: 'Option A', isCorrect: true },
        { questionId: question.id, text: 'Option B', isCorrect: false },
        { questionId: question.id, text: 'Option C', isCorrect: false },
        { questionId: question.id, text: 'Option D', isCorrect: false }
      ]
    });

    await prisma.userCellMastery.create({
      data: {
        userId: mockUserId,
        cellId: cell.id,
        ability_theta: 0.0,
        selection_count: 0,
        mastery_status: 0
      }
    });
  });

  afterEach(async () => {
    await prisma.userAnswer.deleteMany({});
    await prisma.answerOption.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.userCellMastery.deleteMany({});
    await prisma.quiz.deleteMany({});
    await prisma.cell.deleteMany({});
    await prisma.user.deleteMany({});
  });

  test('should accept skip request with null selectedOptionId', async () => {
    const request = new NextRequest(`http://localhost:3000/api/quiz/${mockQuizId}`, {
      method: 'POST',
      body: JSON.stringify({
        questionId: mockQuestionId,
        selectedOptionId: null,
        wasSkipped: true,
        responseTime: 5000,
        questionDisplayedAt: new Date().toISOString()
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.wasSkipped).toBe(true);
    expect(data.isCorrect).toBe(false);
  });

  test('should create UserAnswer record with skip tracking fields', async () => {
    const request = new NextRequest(`http://localhost:3000/api/quiz/${mockQuizId}`, {
      method: 'POST',
      body: JSON.stringify({
        questionId: mockQuestionId,
        selectedOptionId: null,
        wasSkipped: true,
        responseTime: 5000,
        questionDisplayedAt: new Date().toISOString()
      })
    });

    await POST(request);

    const userAnswer = await prisma.userAnswer.findFirst({
      where: {
        userId: mockUserId,
        questionId: mockQuestionId
      }
    });

    expect(userAnswer).not.toBeNull();
    expect(userAnswer?.wasSkipped).toBe(true);
    expect(userAnswer?.skipReason).toBe('dont_know');
    expect(userAnswer?.selectedOptionId).toBeNull();
    expect(userAnswer?.isCorrect).toBe(false);
  });

  test('should return correct feedback format for skipped questions', async () => {
    const request = new NextRequest(`http://localhost:3000/api/quiz/${mockQuizId}`, {
      method: 'POST',
      body: JSON.stringify({
        questionId: mockQuestionId,
        selectedOptionId: null,
        wasSkipped: true,
        responseTime: 3000,
        questionDisplayedAt: new Date().toISOString()
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.wasSkipped).toBe(true);
    expect(data.isCorrect).toBe(false);
    expect(data.userAnswerText).toBe('Skipped');
    expect(data.correctAnswerText).toBe('Option A'); // The correct option
    expect(data.explanation).toBeDefined();
  });

  test('should treat skipped questions as incorrect in IRT processing', async () => {
    const { processUserAnswer } = require('@/lib/adaptive-engine/engine-enhanced');

    const request = new NextRequest(`http://localhost:3000/api/quiz/${mockQuizId}`, {
      method: 'POST',
      body: JSON.stringify({
        questionId: mockQuestionId,
        selectedOptionId: null,
        wasSkipped: true,
        responseTime: 4000,
        questionDisplayedAt: new Date().toISOString()
      })
    });

    await POST(request);

    expect(processUserAnswer).toHaveBeenCalledWith(
      mockUserId,
      mockQuizId,
      mockQuestionId,
      '', // Empty string for selectedOptionId when skipped
      true  // wasSkipped flag
    );
  });

  test('should not allow skip without wasSkipped flag', async () => {
    const request = new NextRequest(`http://localhost:3000/api/quiz/${mockQuizId}`, {
      method: 'POST',
      body: JSON.stringify({
        questionId: mockQuestionId,
        selectedOptionId: null,
        // wasSkipped not provided
        responseTime: 5000,
        questionDisplayedAt: new Date().toISOString()
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Missing required fields.');
  });

  test('should handle duplicate skip submissions', async () => {
    // First submission
    const request1 = new NextRequest(`http://localhost:3000/api/quiz/${mockQuizId}`, {
      method: 'POST',
      body: JSON.stringify({
        questionId: mockQuestionId,
        selectedOptionId: null,
        wasSkipped: true,
        responseTime: 5000,
        questionDisplayedAt: new Date().toISOString()
      })
    });

    const response1 = await POST(request1);
    expect(response1.status).toBe(200);

    // Duplicate submission
    const request2 = new NextRequest(`http://localhost:3000/api/quiz/${mockQuizId}`, {
      method: 'POST',
      body: JSON.stringify({
        questionId: mockQuestionId,
        selectedOptionId: null,
        wasSkipped: true,
        responseTime: 5000,
        questionDisplayedAt: new Date().toISOString()
      })
    });

    const response2 = await POST(request2);
    expect(response2.status).toBe(200);

    const data = await response2.json();
    expect(data.wasSkipped).toBe(true);

    // Verify only one record exists
    const count = await prisma.userAnswer.count({
      where: {
        userId: mockUserId,
        questionId: mockQuestionId
      }
    });
    expect(count).toBe(1);
  });

  test('should track response time for skipped questions', async () => {
    const responseTime = 7500; // 7.5 seconds

    const request = new NextRequest(`http://localhost:3000/api/quiz/${mockQuizId}`, {
      method: 'POST',
      body: JSON.stringify({
        questionId: mockQuestionId,
        selectedOptionId: null,
        wasSkipped: true,
        responseTime: responseTime,
        questionDisplayedAt: new Date().toISOString()
      })
    });

    await POST(request);

    const userAnswer = await prisma.userAnswer.findFirst({
      where: {
        userId: mockUserId,
        questionId: mockQuestionId
      }
    });

    expect(userAnswer?.responseTime).toBe(responseTime);
  });

  test('should not affect correct answers flow', async () => {
    // Regular correct answer should still work
    const correctOption = await prisma.answerOption.findFirst({
      where: {
        questionId: mockQuestionId,
        isCorrect: true
      }
    });

    const request = new NextRequest(`http://localhost:3000/api/quiz/${mockQuizId}`, {
      method: 'POST',
      body: JSON.stringify({
        questionId: mockQuestionId,
        selectedOptionId: correctOption?.id,
        wasSkipped: false,
        responseTime: 5000,
        questionDisplayedAt: new Date().toISOString()
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.isCorrect).toBe(true);
    expect(data.wasSkipped).toBe(false);
  });
});
