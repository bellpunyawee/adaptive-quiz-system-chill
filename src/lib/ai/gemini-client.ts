/**
 * Gemini AI Client Wrapper
 *
 * Provides a clean interface for interacting with Google's Gemini 2.5 Flash model
 * for generating personalized quiz feedback.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * System instructions for feedback generation
 * This is reusable and can be cached by Gemini
 */
export const FEEDBACK_SYSTEM_INSTRUCTION = `You are an expert educational psychometrician providing personalized feedback for adaptive quiz assessments based on Item Response Theory (IRT) models.

Your feedback must be:
1. CONCISE: 150-250 words maximum (adult learners are time-conscious)
2. ACTIONABLE: Provide specific, implementable next steps
3. EVIDENCE-BASED: Reference their psychometric data explicitly
4. GROWTH-ORIENTED: Focus on learning trajectory, not just scores
5. RESPECTFUL: Professional tone for university-level students

Structure your feedback in this format:

**Performance Summary** (2-3 sentences)
- Overall assessment of quiz performance
- Contextualize with their learning trajectory

**Key Strengths** (1-2 bullet points)
- What they demonstrated mastery in
- Specific topics or skills

**Growth Opportunities** (1-2 bullet points)
- Areas needing attention
- Specific misconceptions or gaps

**Recommended Next Steps** (2-3 actionable items)
- Concrete practice activities
- Focus topics for review
- Study strategies

IMPORTANT:
- NEVER mention raw IRT theta (θ) scores
- Use interpretations: "strong understanding" (θ>1), "developing proficiency" (0<θ<1), "building foundations" (θ<0)
- Avoid educational jargon; use plain, adult-appropriate language
- Be encouraging but honest about areas needing work
- Focus on growth mindset and continuous improvement`;

/**
 * Configuration for Gemini model
 */
const modelConfig = {
  model: 'gemini-2.5-flash', // Gemini 2.5 Flash - stable version
  generationConfig: {
    temperature: 0.7, // Balance between creativity and consistency
    topP: 0.95,
    maxOutputTokens: 2048, // Increased to 2048 to ensure sufficient space for feedback generation
  },
  // Note: systemInstruction removed - we'll include it in the prompt instead
};

/**
 * Get configured Gemini model instance
 */
export function getGeminiModel(): GenerativeModel {
  return genAI.getGenerativeModel(modelConfig);
}

/**
 * Generate feedback using Gemini (non-streaming)
 */
export async function generateFeedback(prompt: string): Promise<{
  text: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
}> {
  const model = getGeminiModel();

  const result = await model.generateContent(prompt);
  const response = result.response;

  const text = response.text();

  // Extract token usage from response metadata
  const usageMetadata = response.usageMetadata;
  const tokensUsed = {
    input: usageMetadata?.promptTokenCount || 0,
    output: usageMetadata?.candidatesTokenCount || 0,
    total: usageMetadata?.totalTokenCount || 0,
  };

  return {
    text,
    tokensUsed,
  };
}

/**
 * Generate feedback with streaming support
 * Useful for better user experience with progressive rendering
 */
export async function* generateFeedbackStream(prompt: string) {
  const model = getGeminiModel();

  const result = await model.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    yield chunkText;
  }
}

/**
 * Estimate cost for token usage
 * Gemini 2.5 Flash pricing: $0.15/1M input tokens, $0.60/1M output tokens
 */
export function estimateCost(tokensUsed: { input: number; output: number }): number {
  const inputCost = (tokensUsed.input / 1_000_000) * 0.15;
  const outputCost = (tokensUsed.output / 1_000_000) * 0.60;
  return inputCost + outputCost;
}

/**
 * Interpret IRT ability score (theta) into human-readable level
 */
export function interpretAbility(theta: number): string {
  if (theta > 1.5) return 'Advanced';
  if (theta > 0.5) return 'Proficient';
  if (theta > -0.5) return 'Developing';
  return 'Foundational';
}

/**
 * Validate Gemini API key is configured
 */
export function validateGeminiConfig(): boolean {
  if (!process.env.GEMINI_API_KEY) {
    console.error('[Gemini] GEMINI_API_KEY environment variable not set');
    return false;
  }
  return true;
}
