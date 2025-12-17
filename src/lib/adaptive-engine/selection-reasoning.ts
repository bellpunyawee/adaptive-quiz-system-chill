/**
 * Question Selection Reasoning Generator (Dynamic Version)
 *
 * Generates human-readable, context-driven explanations for why each question
 * was selected. Uses dynamic text composition instead of static templates to
 * provide personalized, non-repetitive reasoning.
 *
 * @module selection-reasoning
 */

import { UncertaintySignal } from './knowledge-gap-analyzer';

/**
 * Context information used to determine selection reasoning
 */
export interface SelectionContext {
  // Core identifiers
  cellName: string;
  questionId: string;

  // Selection strategy indicators
  isWarmup: boolean;
  isFirstInCell: boolean;
  cellSelectionCount: number;
  totalCellsInQuiz: number;

  // Quiz progress
  questionCount: number;
  maxQuestions: number;

  // Algorithm parameters
  explorationParam: number;
  kliScore: number;
  ucbScore: number;

  // Question properties
  difficulty_b: number;
  userAbility: number;
}

/**
 * Human-readable selection reasoning
 */
export interface SelectionReasoning {
  category: 'warmup' | 'content-balance' | 'confirmation' | 'information' | 'exploration' | 'improvement' | 'foundation-check';
  categoryLabel: string;
  reasoningText: string;
}

/**
 * Generate dynamic, context-aware reasoning for question selection
 *
 * Composes reasoning from multiple contextual parts to avoid template-like text.
 * Shows uncertainty-specific guidance only when provided (post-quiz analysis).
 *
 * @param context - Technical selection context from adaptive engine
 * @param uncertaintySignal - Optional uncertainty signal (from post-quiz analysis)
 * @returns Selection reasoning with category and dynamic text
 */
export function generateDynamicReasoning(
  context: SelectionContext,
  uncertaintySignal?: UncertaintySignal
): SelectionReasoning {
  const parts: string[] = [];

  // Part 1: Question position context
  if (context.isFirstInCell) {
    parts.push(`This was your first question in ${context.cellName}.`);
  } else {
    const questionNum = context.cellSelectionCount + 1;
    parts.push(`This was question ${questionNum} in ${context.cellName}.`);
  }

  // Part 2: Difficulty-ability match context
  const diffMatch = context.difficulty_b - context.userAbility;
  if (Math.abs(diffMatch) < 0.3) {
    parts.push(`The difficulty closely matched your estimated ability.`);
  } else if (diffMatch > 0.5) {
    parts.push(`This was slightly more challenging to test your upper limits.`);
  } else if (diffMatch < -0.5) {
    parts.push(`This was a foundational question to confirm your understanding.`);
  }

  // Part 3: Uncertainty-specific guidance (only when flagged)
  if (uncertaintySignal) {
    parts.push(getUncertaintyGuidance(uncertaintySignal));
  }

  // Determine category and label based on context and signals
  const { category, categoryLabel } = determineCategoryAndLabel(context, uncertaintySignal);

  return {
    category,
    categoryLabel,
    reasoningText: parts.join(' '),
  };
}

/**
 * Get uncertainty-specific guidance text
 */
function getUncertaintyGuidance(signal: UncertaintySignal): string {
  switch (signal.signalType) {
    case 'incorrect':
      return `Consider reviewing this concept before your next attempt.`;
    case 'easy_correct':
      return `While correct, this was below your typical level - ensure you're solid on fundamentals.`;
    case 'mixed_topic':
      return `Your mixed results suggest this topic may benefit from additional review.`;
  }
}

/**
 * Determine category and label based on context and uncertainty signal
 */
function determineCategoryAndLabel(
  context: SelectionContext,
  uncertaintySignal?: UncertaintySignal
): { category: SelectionReasoning['category']; categoryLabel: string } {
  // Priority 1: Uncertainty signals (post-quiz analysis)
  if (uncertaintySignal) {
    switch (uncertaintySignal.signalType) {
      case 'incorrect':
        return { category: 'improvement', categoryLabel: 'Area for Improvement' };
      case 'easy_correct':
        return { category: 'foundation-check', categoryLabel: 'Foundation Check' };
      case 'mixed_topic':
        return { category: 'improvement', categoryLabel: 'Topic Needs Review' };
    }
  }

  // Priority 2: Warm-up (first question in topic)
  if (context.isWarmup || context.isFirstInCell) {
    return { category: 'warmup', categoryLabel: 'Building Foundations' };
  }

  // Priority 3: Content balancing
  const avgSelectionsPerCell = context.questionCount / (context.totalCellsInQuiz || 1);
  const isUnderrepresented = context.cellSelectionCount < avgSelectionsPerCell * 0.7;
  if (isUnderrepresented && context.totalCellsInQuiz > 1) {
    return { category: 'content-balance', categoryLabel: 'Exploring New Topics' };
  }

  // Priority 4: Confirmation phase (late quiz, low exploration)
  const quizProgress = context.questionCount / context.maxQuestions;
  const isConfirmationPhase = quizProgress > 0.6 && context.explorationParam < 0.9;
  if (isConfirmationPhase) {
    return { category: 'confirmation', categoryLabel: 'Confirming Understanding' };
  }

  // Priority 5: High information value
  const hasHighInformation = context.kliScore > 0.15;
  if (hasHighInformation) {
    return { category: 'information', categoryLabel: 'Maximizing Information' };
  }

  // Default: Exploration mode
  return { category: 'exploration', categoryLabel: 'Balancing Coverage' };
}

/**
 * Generate human-readable reasoning for question selection (legacy interface)
 *
 * This is the original function that generates reasoning without uncertainty signals.
 * Used during quiz session when questions are selected.
 *
 * @param context - Technical selection context from adaptive engine
 * @returns Selection reasoning with category and user-friendly text
 */
export function generateSelectionReasoning(context: SelectionContext): SelectionReasoning {
  return generateDynamicReasoning(context);
}

/**
 * Generate reasoning for baseline assessment questions
 *
 * Baseline quizzes use different selection logic (systematic coverage
 * rather than adaptive IRT selection), so they need different reasoning.
 *
 * @param cellName - Name of the topic/cell being assessed
 * @param questionNumber - Current question number within the cell
 * @param totalPerCell - Total questions planned for this cell
 * @returns Selection reasoning for baseline context
 */
export function generateBaselineReasoning(
  cellName: string,
  questionNumber: number,
  totalPerCell: number
): SelectionReasoning {
  return {
    category: 'warmup', // Baseline is effectively a comprehensive warm-up
    categoryLabel: 'Comprehensive Assessment',
    reasoningText: `This is question ${questionNumber} of ${totalPerCell} in ${cellName}. We're systematically covering all topics to establish your baseline abilities.`,
  };
}

/**
 * Helper function to calculate difficulty match quality
 * Used internally for potential future enhancements
 *
 * @param difficulty_b - Question difficulty parameter
 * @param userAbility - User's current ability estimate (theta)
 * @returns Absolute difference (lower is better match)
 */
export function calculateDifficultyMatch(difficulty_b: number, userAbility: number): number {
  return Math.abs(difficulty_b - userAbility);
}

/**
 * Map difficulty value to human-readable label
 *
 * @param difficulty_b - IRT difficulty parameter
 * @returns Easy, Medium, or Hard label
 */
export function getDifficultyLabel(difficulty_b: number): 'Easy' | 'Medium' | 'Hard' {
  if (difficulty_b < -1) return 'Easy';
  if (difficulty_b < 1) return 'Medium';
  return 'Hard';
}

/**
 * Determine if a question selection was exploration-focused
 *
 * @param explorationParam - Current exploration parameter (decays over quiz)
 * @returns True if in exploration mode (high exploration parameter)
 */
export function isExplorationMode(explorationParam: number): boolean {
  return explorationParam >= 0.9;
}

/**
 * Determine if a question selection was exploitation-focused
 *
 * @param explorationParam - Current exploration parameter (decays over quiz)
 * @returns True if in exploitation mode (low exploration parameter)
 */
export function isExploitationMode(explorationParam: number): boolean {
  return explorationParam < 0.9;
}
