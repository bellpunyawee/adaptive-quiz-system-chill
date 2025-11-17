/**
 * Unit tests for Gemini AI Client
 * Tests the core functionality of feedback generation without making real API calls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  estimateCost,
  interpretAbility,
  validateGeminiConfig,
} from '../gemini-client';

describe('Gemini Client - Cost Estimation', () => {
  it('should calculate cost correctly for input tokens', () => {
    const tokensUsed = { input: 1000, output: 0 };
    const cost = estimateCost(tokensUsed);

    // $0.15 per 1M input tokens
    // 1000 / 1,000,000 * 0.15 = 0.00015
    expect(cost).toBeCloseTo(0.00015, 6);
  });

  it('should calculate cost correctly for output tokens', () => {
    const tokensUsed = { input: 0, output: 1000 };
    const cost = estimateCost(tokensUsed);

    // $0.60 per 1M output tokens
    // 1000 / 1,000,000 * 0.60 = 0.0006
    expect(cost).toBeCloseTo(0.0006, 6);
  });

  it('should calculate combined cost for input and output tokens', () => {
    const tokensUsed = { input: 500, output: 300 };
    const cost = estimateCost(tokensUsed);

    // Input: 500 / 1,000,000 * 0.15 = 0.000075
    // Output: 300 / 1,000,000 * 0.60 = 0.00018
    // Total: 0.000255
    expect(cost).toBeCloseTo(0.000255, 6);
  });

  it('should handle realistic feedback generation token usage', () => {
    // Realistic scenario: ~600 input, ~250 output tokens
    const tokensUsed = { input: 600, output: 250 };
    const cost = estimateCost(tokensUsed);

    // Should be around $0.00024
    expect(cost).toBeLessThan(0.001);
    expect(cost).toBeGreaterThan(0.0001);
  });

  it('should handle zero tokens', () => {
    const tokensUsed = { input: 0, output: 0 };
    const cost = estimateCost(tokensUsed);

    expect(cost).toBe(0);
  });
});

describe('Gemini Client - Ability Interpretation', () => {
  it('should interpret very high ability as Advanced', () => {
    expect(interpretAbility(2.0)).toBe('Advanced');
    expect(interpretAbility(1.6)).toBe('Advanced');
  });

  it('should interpret high ability as Proficient', () => {
    expect(interpretAbility(1.5)).toBe('Proficient');
    expect(interpretAbility(1.0)).toBe('Proficient');
    expect(interpretAbility(0.6)).toBe('Proficient');
  });

  it('should interpret medium ability as Developing', () => {
    expect(interpretAbility(0.5)).toBe('Developing');
    expect(interpretAbility(0.0)).toBe('Developing');
    expect(interpretAbility(-0.4)).toBe('Developing');
  });

  it('should interpret low ability as Foundational', () => {
    expect(interpretAbility(-0.5)).toBe('Foundational');
    expect(interpretAbility(-1.0)).toBe('Foundational');
    expect(interpretAbility(-2.0)).toBe('Foundational');
  });

  it('should handle boundary values correctly', () => {
    expect(interpretAbility(1.5001)).toBe('Advanced');
    expect(interpretAbility(1.5)).toBe('Proficient');
    expect(interpretAbility(0.5001)).toBe('Proficient');
    expect(interpretAbility(0.5)).toBe('Developing');
    expect(interpretAbility(-0.4999)).toBe('Developing');
    expect(interpretAbility(-0.5)).toBe('Foundational');
  });
});

describe('Gemini Client - Configuration Validation', () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    // Reset environment before each test
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.GEMINI_API_KEY = originalEnv;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  it('should return true when GEMINI_API_KEY is set', () => {
    process.env.GEMINI_API_KEY = 'test-api-key';
    expect(validateGeminiConfig()).toBe(true);
  });

  it('should return false when GEMINI_API_KEY is not set', () => {
    delete process.env.GEMINI_API_KEY;
    expect(validateGeminiConfig()).toBe(false);
  });

  it('should return false when GEMINI_API_KEY is empty string', () => {
    process.env.GEMINI_API_KEY = '';
    expect(validateGeminiConfig()).toBe(false);
  });
});

describe('Gemini Client - Token Usage Patterns', () => {
  it('should estimate cost for typical quiz feedback (10 questions)', () => {
    // Typical scenario:
    // - Quiz context: ~400 tokens
    // - User history: ~150 tokens
    // - Prompt template: ~50 tokens
    // Total input: ~600 tokens
    // Output: ~250 tokens (feedback)

    const tokensUsed = { input: 600, output: 250 };
    const cost = estimateCost(tokensUsed);

    expect(cost).toBeLessThan(0.0003);
  });

  it('should estimate cost for baseline assessment feedback (30 questions)', () => {
    // Larger context for baseline
    const tokensUsed = { input: 1200, output: 300 };
    const cost = estimateCost(tokensUsed);

    expect(cost).toBeLessThan(0.0005);
  });

  it('should verify monthly cost for 100 users with 4 quizzes each', () => {
    // 100 users * 4 quizzes = 400 feedback generations
    // Average: 600 input + 250 output per feedback
    const singleFeedbackCost = estimateCost({ input: 600, output: 250 });
    const monthlyCost = singleFeedbackCost * 400;

    // Should be around $0.10 per month
    expect(monthlyCost).toBeLessThan(0.15);
    expect(monthlyCost).toBeGreaterThan(0.05);
  });
});

describe('Gemini Client - Edge Cases', () => {
  it('should handle very large token counts', () => {
    const tokensUsed = { input: 1_000_000, output: 500_000 };
    const cost = estimateCost(tokensUsed);

    // $0.15 + $0.30 = $0.45
    expect(cost).toBeCloseTo(0.45, 2);
  });

  it('should handle fractional token counts', () => {
    const tokensUsed = { input: 100.5, output: 50.3 };
    const cost = estimateCost(tokensUsed);

    expect(cost).toBeGreaterThan(0);
    expect(typeof cost).toBe('number');
  });

  it('should interpret extreme ability values', () => {
    expect(interpretAbility(10)).toBe('Advanced');
    expect(interpretAbility(-10)).toBe('Foundational');
    expect(interpretAbility(0)).toBe('Developing');
  });
});
