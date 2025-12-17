/**
 * Knowledge Gap Analyzer
 *
 * Analyzes quiz performance to detect uncertainty signals and identify
 * knowledge gaps that warrant additional review. Uses three main signals:
 * - Incorrect answers (high severity)
 * - Correct answers on easy questions relative to ability (medium severity)
 * - Mixed performance within a topic (medium severity)
 *
 * @module knowledge-gap-analyzer
 */

/**
 * Signal indicating uncertainty about user's knowledge in a specific area
 */
export interface UncertaintySignal {
  questionId: string;
  cellId: string;
  cellName: string;
  signalType: 'incorrect' | 'easy_correct' | 'mixed_topic';
  severity: 'low' | 'medium' | 'high';
  details: string;
}

/**
 * Analysis of performance within a single topic/cell
 */
export interface TopicAnalysis {
  cellId: string;
  cellName: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  avgResponseTime: number;
  hasMixedPerformance: boolean;
  hasEasyCorrects: boolean;
  uncertaintySignals: UncertaintySignal[];
  reviewPriority: 'low' | 'medium' | 'high';
  reviewReason: string;
}

/**
 * User answer with question details
 */
interface UserAnswerWithQuestion {
  id: string;
  questionId: string;
  isCorrect: boolean;
  responseTime: number | null;
  abilityAtTime: number | null;
  question: {
    id: string;
    cellId: string;
    difficulty_b: number;
    cell: {
      name: string;
    };
  };
}

/**
 * Configuration for uncertainty detection thresholds
 */
interface AnalyzerConfig {
  easyCorrectThreshold: number; // Ability - difficulty gap to flag as "easy"
  minResponseTime: number; // Minimum time to NOT flag as guess (unused for now)
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: AnalyzerConfig = {
  easyCorrectThreshold: parseFloat(process.env.UNCERTAINTY_EASY_THRESHOLD || '1.0'),
  minResponseTime: parseInt(process.env.UNCERTAINTY_MIN_RESPONSE_TIME || '5000', 10),
};

/**
 * Analyze quiz answers to identify knowledge gaps and uncertainty signals
 *
 * @param userId - User ID (for future use with knowledge gap persistence)
 * @param quizId - Quiz ID (for future use with knowledge gap persistence)
 * @param answers - Array of user answers with question details
 * @param config - Optional configuration overrides
 * @returns Topics to review and per-question uncertainty flags
 */
export async function analyzeQuizForKnowledgeGaps(
  userId: string,
  quizId: string,
  answers: UserAnswerWithQuestion[],
  config: Partial<AnalyzerConfig> = {}
): Promise<{
  topicsToReview: TopicAnalysis[];
  questionFlags: Map<string, UncertaintySignal>;
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Group answers by cell/topic
  const topicMap = new Map<string, UserAnswerWithQuestion[]>();
  for (const answer of answers) {
    const cellId = answer.question.cellId;
    if (!topicMap.has(cellId)) {
      topicMap.set(cellId, []);
    }
    topicMap.get(cellId)!.push(answer);
  }

  const topicsToReview: TopicAnalysis[] = [];
  const questionFlags = new Map<string, UncertaintySignal>();

  // Analyze each topic
  for (const [cellId, topicAnswers] of topicMap) {
    const cellName = topicAnswers[0].question.cell.name;
    const analysis = analyzeTopicPerformance(cellId, cellName, topicAnswers, finalConfig);

    // Add per-question flags
    for (const signal of analysis.uncertaintySignals) {
      questionFlags.set(signal.questionId, signal);
    }

    // Add to review list if there are uncertainty signals
    if (analysis.uncertaintySignals.length > 0) {
      topicsToReview.push(analysis);
    }
  }

  // Sort by priority (high > medium > low) and then by incorrect count
  topicsToReview.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.reviewPriority] - priorityOrder[a.reviewPriority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.incorrectCount - a.incorrectCount;
  });

  return { topicsToReview, questionFlags };
}

/**
 * Analyze performance within a single topic
 */
function analyzeTopicPerformance(
  cellId: string,
  cellName: string,
  answers: UserAnswerWithQuestion[],
  config: AnalyzerConfig
): TopicAnalysis {
  const uncertaintySignals: UncertaintySignal[] = [];
  let correctCount = 0;
  let incorrectCount = 0;
  let totalResponseTime = 0;
  let responseTimeCount = 0;
  let hasEasyCorrects = false;

  // Analyze each answer in this topic
  for (const answer of answers) {
    if (answer.isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    // Track response time
    if (answer.responseTime) {
      totalResponseTime += answer.responseTime;
      responseTimeCount++;
    }

    // Signal A: Incorrect answer - always flag (high severity)
    if (!answer.isCorrect) {
      uncertaintySignals.push({
        questionId: answer.questionId,
        cellId,
        cellName,
        signalType: 'incorrect',
        severity: 'high',
        details: `You answered this ${cellName} question incorrectly.`,
      });
    }

    // Signal C: Correct on easy question but user has higher ability
    // Only flag if we have ability estimate
    if (answer.isCorrect && answer.abilityAtTime !== null) {
      const difficultyGap = answer.abilityAtTime - answer.question.difficulty_b;
      if (difficultyGap > config.easyCorrectThreshold) {
        hasEasyCorrects = true;
        uncertaintySignals.push({
          questionId: answer.questionId,
          cellId,
          cellName,
          signalType: 'easy_correct',
          severity: 'medium',
          details: `This was an easier question relative to your ability level.`,
        });
      }
    }
  }

  // Signal D: Mixed performance in topic
  const hasMixedPerformance = correctCount > 0 && incorrectCount > 0;
  if (hasMixedPerformance) {
    // Add mixed_topic signal to all questions in this topic
    for (const answer of answers) {
      // Only add if not already flagged with a higher severity signal
      const existingFlag = uncertaintySignals.find(s => s.questionId === answer.questionId);
      if (!existingFlag || existingFlag.severity !== 'high') {
        uncertaintySignals.push({
          questionId: answer.questionId,
          cellId,
          cellName,
          signalType: 'mixed_topic',
          severity: 'medium',
          details: `You had mixed results in ${cellName} (${correctCount}/${correctCount + incorrectCount} correct).`,
        });
      }
    }
  }

  const avgResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

  // Determine review priority
  const reviewPriority = determineReviewPriority(incorrectCount, correctCount, hasEasyCorrects);
  const reviewReason = generateReviewReason(
    cellName,
    correctCount,
    incorrectCount,
    hasEasyCorrects,
    hasMixedPerformance
  );

  return {
    cellId,
    cellName,
    totalQuestions: answers.length,
    correctCount,
    incorrectCount,
    avgResponseTime,
    hasMixedPerformance,
    hasEasyCorrects,
    uncertaintySignals,
    reviewPriority,
    reviewReason,
  };
}

/**
 * Determine review priority based on performance metrics
 */
function determineReviewPriority(
  incorrectCount: number,
  correctCount: number,
  hasEasyCorrects: boolean
): 'low' | 'medium' | 'high' {
  const total = incorrectCount + correctCount;
  const incorrectRate = total > 0 ? incorrectCount / total : 0;

  // High priority: More than 50% incorrect
  if (incorrectRate > 0.5) {
    return 'high';
  }

  // Medium priority: Some incorrect or has easy corrects (possible gaps)
  if (incorrectCount > 0 || hasEasyCorrects) {
    return 'medium';
  }

  // Low priority: All correct, no easy correct flags
  return 'low';
}

/**
 * Generate human-readable review reason
 */
function generateReviewReason(
  cellName: string,
  correctCount: number,
  incorrectCount: number,
  hasEasyCorrects: boolean,
  hasMixedPerformance: boolean
): string {
  const total = correctCount + incorrectCount;

  // Case 1: Mixed performance (highest priority message)
  if (hasMixedPerformance) {
    return `You had mixed results (${correctCount}/${total} correct). Some concepts may need reinforcement.`;
  }

  // Case 2: All incorrect
  if (incorrectCount === total) {
    return `This topic needs review. Consider revisiting the core concepts.`;
  }

  // Case 3: Some incorrect
  if (incorrectCount > 0) {
    return `You got ${incorrectCount} of ${total} questions wrong. Review these areas to strengthen your understanding.`;
  }

  // Case 4: All correct but has easy correct flags
  if (hasEasyCorrects) {
    return `You answered correctly but on easier questions. Ensure you're solid on fundamentals.`;
  }

  // Default (shouldn't reach here if logic is correct)
  return `Consider reviewing this topic.`;
}

/**
 * Helper function to check if a question should show "Why This Question?" section
 *
 * @param questionId - Question ID to check
 * @param questionFlags - Map of question flags from analyzer
 * @returns True if question has uncertainty signal
 */
export function shouldShowReasoningForQuestion(
  questionId: string,
  questionFlags: Map<string, UncertaintySignal>
): boolean {
  return questionFlags.has(questionId);
}
