/**
 * Unit tests for PersonalizedFeedback Component Logic
 * Tests feedback parsing and data transformation
 */

import { describe, it, expect } from 'vitest';

/**
 * Helper function to extract bullet points from markdown text
 * (Extracted from PersonalizedFeedback component for testing)
 */
function extractBulletPoints(text: string): string[] {
  const lines = text.split('\n');
  const bullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      bullets.push(trimmed.replace(/^[-•]\s*/, '').trim());
    }
  }

  return bullets.filter((b) => b.length > 0);
}

/**
 * Parse feedback text into structured format
 * (Extracted from route.ts for testing)
 */
function parseFeedbackText(text: string): {
  summary: string;
  strengths: string[];
  improvements: string[];
  insights: string;
  nextSteps: string[];
  fullText: string;
} {
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

    result.insights = text;
  } catch (error) {
    console.warn('Error parsing feedback text:', error);
  }

  return result;
}

describe('PersonalizedFeedback - Bullet Point Extraction', () => {
  it('should extract bullet points with dash prefix', () => {
    const text = `
- First bullet point
- Second bullet point
- Third bullet point
    `;

    const bullets = extractBulletPoints(text);

    expect(bullets).toHaveLength(3);
    expect(bullets[0]).toBe('First bullet point');
    expect(bullets[1]).toBe('Second bullet point');
    expect(bullets[2]).toBe('Third bullet point');
  });

  it('should extract bullet points with bullet character', () => {
    const text = `
• First item
• Second item
• Third item
    `;

    const bullets = extractBulletPoints(text);

    expect(bullets).toHaveLength(3);
    expect(bullets[0]).toBe('First item');
  });

  it('should handle mixed whitespace', () => {
    const text = `
  -   First point with extra spaces
-Second point with no space
  - Third point normal
    `;

    const bullets = extractBulletPoints(text);

    expect(bullets).toHaveLength(3);
    expect(bullets[0]).toBe('First point with extra spaces');
    expect(bullets[1]).toBe('Second point with no space');
    expect(bullets[2]).toBe('Third point normal');
  });

  it('should ignore non-bullet lines', () => {
    const text = `
This is a regular line
- This is a bullet
Another regular line
- Another bullet
    `;

    const bullets = extractBulletPoints(text);

    expect(bullets).toHaveLength(2);
    expect(bullets[0]).toBe('This is a bullet');
    expect(bullets[1]).toBe('Another bullet');
  });

  it('should filter out empty bullets', () => {
    const text = `
- Valid bullet
-
-
- Another valid bullet
    `;

    const bullets = extractBulletPoints(text);

    expect(bullets).toHaveLength(2);
    expect(bullets[0]).toBe('Valid bullet');
    expect(bullets[1]).toBe('Another valid bullet');
  });
});

describe('PersonalizedFeedback - Feedback Parsing', () => {
  it('should parse complete feedback with all sections', () => {
    const feedbackText = `**Performance Summary**
You scored 80% (8/10 correct), demonstrating solid understanding.

**Key Strengths**
- Strong grasp of Python fundamentals
- Excellent problem-solving approach
- Good debugging skills

**Growth Opportunities**
- Need more practice with algorithms
- Review data structures concepts
- Improve time complexity analysis

**Recommended Next Steps**
- Complete 10 algorithm practice problems
- Review binary search trees
- Practice big O notation exercises`;

    const parsed = parseFeedbackText(feedbackText);

    expect(parsed.summary).toContain('scored 80%');
    expect(parsed.summary).toContain('solid understanding');
    expect(parsed.strengths).toHaveLength(3);
    expect(parsed.strengths[0]).toBe('Strong grasp of Python fundamentals');
    expect(parsed.improvements).toHaveLength(3);
    expect(parsed.improvements[0]).toBe('Need more practice with algorithms');
    expect(parsed.nextSteps).toHaveLength(3);
    expect(parsed.nextSteps[0]).toBe('Complete 10 algorithm practice problems');
    expect(parsed.fullText).toBe(feedbackText);
  });

  it('should handle feedback with missing sections gracefully', () => {
    const feedbackText = `**Performance Summary**
Good work on the quiz!

**Key Strengths**
- You did well`;

    const parsed = parseFeedbackText(feedbackText);

    expect(parsed.summary).toContain('Good work');
    expect(parsed.strengths).toHaveLength(1);
    expect(parsed.improvements).toHaveLength(0);
    expect(parsed.nextSteps).toHaveLength(0);
  });

  it('should extract summary without bullet points', () => {
    const feedbackText = `**Performance Summary**
You completed the assessment with 90% accuracy, which is excellent.
Your ability estimate improved significantly from the baseline.

**Key Strengths**
- Great job overall`;

    const parsed = parseFeedbackText(feedbackText);

    expect(parsed.summary).toContain('90% accuracy');
    expect(parsed.summary).toContain('ability estimate improved');
    expect(parsed.summary).not.toContain('**Key Strengths**');
  });

  it('should handle case-insensitive section headers', () => {
    const feedbackText = `**performance summary**
Good work

**key strengths**
- Item 1

**GROWTH OPPORTUNITIES**
- Need improvement

**recommended next steps**
- Practice more`;

    const parsed = parseFeedbackText(feedbackText);

    expect(parsed.summary).toBeTruthy();
    expect(parsed.strengths).toHaveLength(1);
    expect(parsed.improvements).toHaveLength(1);
    expect(parsed.nextSteps).toHaveLength(1);
  });

  it('should preserve full text even if parsing fails', () => {
    const malformedFeedback = 'This is just plain text without any formatting';

    const parsed = parseFeedbackText(malformedFeedback);

    expect(parsed.fullText).toBe(malformedFeedback);
    expect(parsed.summary).toBe('');
    expect(parsed.strengths).toHaveLength(0);
  });

  it('should handle feedback with multiple paragraphs in summary', () => {
    const feedbackText = `**Performance Summary**
You scored 75% on this adaptive quiz, which shows good progress.

Your ability estimate (θ = 0.5) indicates developing proficiency. You've shown
improvement in recent sessions, which is encouraging.

**Key Strengths**
- Consistent effort`;

    const parsed = parseFeedbackText(feedbackText);

    expect(parsed.summary).toContain('scored 75%');
    expect(parsed.summary).toContain('ability estimate');
    expect(parsed.summary).toContain('improvement in recent sessions');
  });

  it('should handle very long bullet points', () => {
    const feedbackText = `**Key Strengths**
- You demonstrated excellent understanding of object-oriented programming principles, including encapsulation, inheritance, and polymorphism, which shows strong conceptual knowledge

**Growth Opportunities**
- While your algorithm implementation is correct, consider optimizing for time complexity by using more efficient data structures like hash maps instead of nested loops`;

    const parsed = parseFeedbackText(feedbackText);

    expect(parsed.strengths[0]).toContain('object-oriented programming');
    expect(parsed.strengths[0].length).toBeGreaterThan(100);
    expect(parsed.improvements[0]).toContain('hash maps');
  });

  it('should handle special characters in feedback', () => {
    const feedbackText = `**Performance Summary**
You scored 85% on C++ & algorithms!

**Key Strengths**
- Great use of pointers & references
- Strong understanding of <template> syntax

**Recommended Next Steps**
- Practice with std::vector & std::map`;

    const parsed = parseFeedbackText(feedbackText);

    expect(parsed.summary).toContain('C++ & algorithms');
    expect(parsed.strengths[0]).toContain('pointers & references');
    expect(parsed.strengths[1]).toContain('<template>');
  });
});

describe('PersonalizedFeedback - Edge Cases', () => {
  it('should handle empty feedback text', () => {
    const parsed = parseFeedbackText('');

    expect(parsed.summary).toBe('');
    expect(parsed.strengths).toHaveLength(0);
    expect(parsed.improvements).toHaveLength(0);
    expect(parsed.nextSteps).toHaveLength(0);
    expect(parsed.fullText).toBe('');
  });

  it('should handle feedback with only headers', () => {
    const feedbackText = `**Performance Summary**
**Key Strengths**
**Growth Opportunities**
**Recommended Next Steps**`;

    const parsed = parseFeedbackText(feedbackText);

    expect(parsed.summary).toBe('');
    expect(parsed.strengths).toHaveLength(0);
  });

  it('should handle extremely long feedback text', () => {
    const longSummary = 'A'.repeat(1000);
    const feedbackText = `**Performance Summary**
${longSummary}

**Key Strengths**
- Strength 1`;

    const parsed = parseFeedbackText(feedbackText);

    expect(parsed.summary.length).toBeGreaterThan(999);
    expect(parsed.strengths).toHaveLength(1);
  });

  it('should handle feedback with numbered lists instead of bullets', () => {
    const feedbackText = `**Recommended Next Steps**
1. First step
2. Second step
3. Third step`;

    const parsed = parseFeedbackText(feedbackText);

    // Numbered lists won't be extracted (design choice)
    // But full text should still be preserved
    expect(parsed.fullText).toContain('1. First step');
  });

  it('should handle Unicode characters in feedback', () => {
    const feedbackText = `**Performance Summary**
Great work! 🎉 You scored 90%

**Key Strengths**
- Excellent progress 📈
- Strong fundamentals ✨`;

    const parsed = parseFeedbackText(feedbackText);

    expect(parsed.summary).toContain('🎉');
    expect(parsed.strengths[0]).toContain('📈');
  });
});
