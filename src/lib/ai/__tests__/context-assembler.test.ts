/**
 * Unit tests for Context Assembler
 * Tests anonymization and prompt building functions
 */

import { describe, it, expect } from 'vitest';
import {
  anonymizeContext,
  buildFeedbackPrompt,
  type QuizContext,
} from '../context-assembler';

// Mock quiz context for testing
const mockQuizContext: QuizContext = {
  quiz: {
    id: 'quiz_test_123',
    correctCount: 7,
    totalQuestions: 10,
    accuracy: 70,
    topics: ['Python Basics', 'Data Structures', 'Algorithms'],
    duration: 15,
    quizType: 'adaptive',
    completedAt: new Date('2025-01-14T10:30:00Z'),
  },
  userMastery: {
    ability_theta: 0.5,
    confidence: 0.3,
    responseCount: 50,
    masteryStatus: 2,
  },
  abilityHistory: {
    growthFromBaseline: 0.3,
    recentQuizCount: 5,
    avgAccuracy: 72,
    strongestTopic: 'Python Basics',
    weakestTopic: 'Algorithms',
    trendDirection: 'improving',
  },
  topicPerformance: [
    {
      topicName: 'Python Basics',
      topicId: 'topic_1',
      accuracy: 85,
      abilityTheta: 0.8,
      masteryStatus: 'Proficient',
      questionsAnswered: 20,
    },
    {
      topicName: 'Data Structures',
      topicId: 'topic_2',
      accuracy: 70,
      abilityTheta: 0.4,
      masteryStatus: 'Developing',
      questionsAnswered: 15,
    },
    {
      topicName: 'Algorithms',
      topicId: 'topic_3',
      accuracy: 55,
      abilityTheta: 0.1,
      masteryStatus: 'Developing',
      questionsAnswered: 15,
    },
  ],
  difficultQuestions: [
    {
      questionId: 'q1',
      topicName: 'Algorithms',
      difficulty_b: 1.2,
      discrimination_a: 1.5,
      isCorrect: false,
    },
    {
      questionId: 'q2',
      topicName: 'Data Structures',
      difficulty_b: 0.9,
      discrimination_a: 1.3,
      isCorrect: false,
    },
  ],
};

describe('Context Assembler - Anonymization', () => {
  it('should remove quiz ID from context', () => {
    const anonymized = anonymizeContext(mockQuizContext);

    expect(anonymized).not.toContain('quiz_test_123');
    expect(anonymized).not.toContain(mockQuizContext.quiz.id);
  });

  it('should remove topic IDs from context', () => {
    const anonymized = anonymizeContext(mockQuizContext);

    expect(anonymized).not.toContain('topic_1');
    expect(anonymized).not.toContain('topic_2');
    expect(anonymized).not.toContain('topic_3');
  });

  it('should remove question IDs from context', () => {
    const anonymized = anonymizeContext(mockQuizContext);

    expect(anonymized).not.toContain('q1');
    expect(anonymized).not.toContain('q2');
  });

  it('should preserve topic names (not PII)', () => {
    const anonymized = anonymizeContext(mockQuizContext);

    expect(anonymized).toContain('Python Basics');
    expect(anonymized).toContain('Data Structures');
    expect(anonymized).toContain('Algorithms');
  });

  it('should preserve performance metrics', () => {
    const anonymized = anonymizeContext(mockQuizContext);

    expect(anonymized).toContain('70%'); // accuracy
    expect(anonymized).toContain('7/10'); // correct count
    expect(anonymized).toContain('improving'); // trend
  });

  it('should preserve ability estimates', () => {
    const anonymized = anonymizeContext(mockQuizContext);

    expect(anonymized).toContain('0.5'); // ability theta
    expect(anonymized).toContain('Proficient'); // mastery status
  });

  it('should be valid JSON-like structure', () => {
    const anonymized = anonymizeContext(mockQuizContext);

    // Should contain structured data markers
    expect(anonymized).toContain('Quiz Performance:');
    expect(anonymized).toContain('User Mastery Level:');
    expect(anonymized).toContain('Topic Performance:');
  });
});

describe('Context Assembler - Prompt Building', () => {
  it('should include quiz performance summary', () => {
    const context = anonymizeContext(mockQuizContext);
    const prompt = buildFeedbackPrompt(context);

    expect(prompt).toContain('7 out of 10');
    expect(prompt).toContain('70%');
  });

  it('should include ability estimate interpretation', () => {
    const context = anonymizeContext(mockQuizContext);
    const prompt = buildFeedbackPrompt(context);

    expect(prompt).toContain('ability');
    expect(prompt).toContain('theta');
  });

  it('should include topic breakdown', () => {
    const context = anonymizeContext(mockQuizContext);
    const prompt = buildFeedbackPrompt(context);

    expect(prompt).toContain('Python Basics');
    expect(prompt).toContain('Data Structures');
    expect(prompt).toContain('Algorithms');
  });

  it('should include learning trajectory', () => {
    const context = anonymizeContext(mockQuizContext);
    const prompt = buildFeedbackPrompt(context);

    expect(prompt).toContain('improving');
    expect(prompt).toContain('growth');
  });

  it('should request structured feedback format', () => {
    const context = anonymizeContext(mockQuizContext);
    const prompt = buildFeedbackPrompt(context);

    expect(prompt).toContain('Performance Summary');
    expect(prompt).toContain('Key Strengths');
    expect(prompt).toContain('Growth Opportunities');
    expect(prompt).toContain('Recommended Next Steps');
  });

  it('should include context data in prompt', () => {
    const context = anonymizeContext(mockQuizContext);
    const prompt = buildFeedbackPrompt(context);

    expect(prompt).toContain(context);
  });

  it('should produce non-empty prompt', () => {
    const context = anonymizeContext(mockQuizContext);
    const prompt = buildFeedbackPrompt(context);

    expect(prompt.length).toBeGreaterThan(100);
  });
});

describe('Context Assembler - Edge Cases', () => {
  it('should handle perfect quiz score', () => {
    const perfectContext: QuizContext = {
      ...mockQuizContext,
      quiz: {
        ...mockQuizContext.quiz,
        correctCount: 10,
        totalQuestions: 10,
        accuracy: 100,
      },
    };

    const anonymized = anonymizeContext(perfectContext);
    expect(anonymized).toContain('100%');
    expect(anonymized).toContain('10/10');
  });

  it('should handle zero score quiz', () => {
    const zeroContext: QuizContext = {
      ...mockQuizContext,
      quiz: {
        ...mockQuizContext.quiz,
        correctCount: 0,
        totalQuestions: 10,
        accuracy: 0,
      },
    };

    const anonymized = anonymizeContext(zeroContext);
    expect(anonymized).toContain('0%');
    expect(anonymized).toContain('0/10');
  });

  it('should handle negative ability theta', () => {
    const lowAbilityContext: QuizContext = {
      ...mockQuizContext,
      userMastery: {
        ...mockQuizContext.userMastery,
        ability_theta: -0.8,
      },
    };

    const anonymized = anonymizeContext(lowAbilityContext);
    expect(anonymized).toContain('-0.8');
  });

  it('should handle empty topic list', () => {
    const noTopicsContext: QuizContext = {
      ...mockQuizContext,
      topicPerformance: [],
    };

    const anonymized = anonymizeContext(noTopicsContext);
    // Should still be valid
    expect(anonymized.length).toBeGreaterThan(0);
  });

  it('should handle no difficult questions', () => {
    const noDifficultContext: QuizContext = {
      ...mockQuizContext,
      difficultQuestions: [],
    };

    const anonymized = anonymizeContext(noDifficultContext);
    expect(anonymized.length).toBeGreaterThan(0);
  });

  it('should handle baseline quiz type', () => {
    const baselineContext: QuizContext = {
      ...mockQuizContext,
      quiz: {
        ...mockQuizContext.quiz,
        quizType: 'baseline',
      },
    };

    const anonymized = anonymizeContext(baselineContext);
    expect(anonymized).toContain('baseline');
  });

  it('should handle very long topic names', () => {
    const longTopicContext: QuizContext = {
      ...mockQuizContext,
      topicPerformance: [
        {
          topicName: 'Advanced Object-Oriented Programming with Design Patterns and SOLID Principles',
          topicId: 'topic_long',
          accuracy: 75,
          abilityTheta: 0.5,
          masteryStatus: 'Developing',
          questionsAnswered: 10,
        },
      ],
    };

    const anonymized = anonymizeContext(longTopicContext);
    expect(anonymized).toContain('Advanced Object-Oriented Programming');
  });
});

describe('Context Assembler - Data Integrity', () => {
  it('should preserve all accuracy values', () => {
    const context = anonymizeContext(mockQuizContext);

    // Check all accuracy values are preserved
    expect(context).toContain('70%'); // overall
    expect(context).toContain('85%'); // Python Basics
    expect(context).toContain('70%'); // Data Structures (note: same as overall, should appear twice)
    expect(context).toContain('55%'); // Algorithms
  });

  it('should preserve trend direction exactly', () => {
    const improvingContext = { ...mockQuizContext };
    const stableContext = {
      ...mockQuizContext,
      abilityHistory: { ...mockQuizContext.abilityHistory, trendDirection: 'stable' as const },
    };
    const decliningContext = {
      ...mockQuizContext,
      abilityHistory: { ...mockQuizContext.abilityHistory, trendDirection: 'declining' as const },
    };

    expect(anonymizeContext(improvingContext)).toContain('improving');
    expect(anonymizeContext(stableContext)).toContain('stable');
    expect(anonymizeContext(decliningContext)).toContain('declining');
  });

  it('should handle special characters in topic names', () => {
    const specialCharsContext: QuizContext = {
      ...mockQuizContext,
      topicPerformance: [
        {
          topicName: 'C++ & C# Programming',
          topicId: 'topic_special',
          accuracy: 80,
          abilityTheta: 0.6,
          masteryStatus: 'Proficient',
          questionsAnswered: 12,
        },
      ],
    };

    const anonymized = anonymizeContext(specialCharsContext);
    expect(anonymized).toContain('C++ & C#');
  });
});
