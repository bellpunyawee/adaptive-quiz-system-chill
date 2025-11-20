/**
 * Context Builder - Combines all features into 15-dimensional context vector
 * This is the core feature engineering for the contextual bandit
 */

import { extractUserFeatures, UserState } from './user-features';
import { extractQuestionFeatures, QuestionAttributes } from './question-features';
import { extractInteractionFeatures } from './interaction-features';

export const CONTEXT_DIMENSION = 15;

export interface ContextVector {
  features: number[]; // 15-dimensional vector
  featureNames: string[];
  metadata: {
    userId: string;
    questionId: string;
    timestamp: Date;
  };
}

/**
 * Build complete 15-dimensional context vector
 *
 * Composition:
 * - User features (6): theta, SEM, confidence, response_count, recent_accuracy, session_progress
 * - Question features (5): b, a, c, exposure_rate, historical_correct_rate
 * - Interaction features (4): |theta-b|, IRT_prob, Fisher_info, topic_match
 *
 * @param user - User state
 * @param question - Question attributes
 * @param userId - User ID for metadata
 * @param questionId - Question ID for metadata
 * @returns 15D context vector with metadata
 */
export function buildContext(
  user: UserState,
  question: QuestionAttributes & { id: string; cellId: string },
  userId: string,
  userTopicMastery: number = 0.5 // Default neutral mastery
): ContextVector {
  // Extract user features (6D)
  const userFeatureVector = extractUserFeatures(user);

  // Extract question features (5D)
  const questionFeatureVector = extractQuestionFeatures(question);

  // Extract interaction features (4D)
  const interactionFeatureVector = extractInteractionFeatures(
    user.theta,
    question.difficulty_b,
    question.discrimination_a,
    question.guessing_c,
    userTopicMastery,
    question.cellId
  );

  // Combine all features (6 + 5 + 4 = 15)
  const features = [
    ...userFeatureVector.features,
    ...questionFeatureVector.features,
    ...interactionFeatureVector.features,
  ];

  const featureNames = [
    ...userFeatureVector.featureNames,
    ...questionFeatureVector.featureNames,
    ...interactionFeatureVector.featureNames,
  ];

  // Validate dimension
  if (features.length !== CONTEXT_DIMENSION) {
    throw new Error(
      `Context dimension mismatch: expected ${CONTEXT_DIMENSION}, got ${features.length}`
    );
  }

  // Validate all features are in [0, 1] range
  for (let i = 0; i < features.length; i++) {
    if (!isFinite(features[i])) {
      console.error(`[Context Builder] Feature ${i} (${featureNames[i]}) is not finite: ${features[i]}`);
      throw new Error(`Invalid feature at index ${i}: ${features[i]}`);
    }
    if (features[i] < 0 || features[i] > 1) {
      console.warn(
        `[Context Builder] Feature ${i} (${featureNames[i]}) out of [0,1] range: ${features[i]}`
      );
      // Clamp to valid range
      features[i] = Math.max(0, Math.min(1, features[i]));
    }
  }

  return {
    features,
    featureNames,
    metadata: {
      userId,
      questionId: question.id,
      timestamp: new Date(),
    },
  };
}

/**
 * Serialize context vector to bytes for database storage
 */
export function serializeContext(context: ContextVector): Buffer {
  // Store as Float64Array for precision
  const buffer = Buffer.allocUnsafe(CONTEXT_DIMENSION * 8); // 8 bytes per float64

  for (let i = 0; i < CONTEXT_DIMENSION; i++) {
    buffer.writeDoubleLE(context.features[i], i * 8);
  }

  return buffer;
}

/**
 * Deserialize context vector from bytes
 */
export function deserializeContext(buffer: Buffer): number[] {
  if (buffer.length !== CONTEXT_DIMENSION * 8) {
    throw new Error(
      `Invalid context buffer size: expected ${CONTEXT_DIMENSION * 8} bytes, got ${buffer.length}`
    );
  }

  const features: number[] = [];

  for (let i = 0; i < CONTEXT_DIMENSION; i++) {
    features.push(buffer.readDoubleLE(i * 8));
  }

  return features;
}

/**
 * Convert context features to string for logging/debugging
 */
export function contextToString(context: ContextVector): string {
  const lines = ['Context Vector (15D):'];

  for (let i = 0; i < context.features.length; i++) {
    lines.push(`  [${i}] ${context.featureNames[i]}: ${context.features[i].toFixed(4)}`);
  }

  return lines.join('\n');
}

/**
 * Validate a context vector is valid for LinUCB
 */
export function validateContext(context: ContextVector): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check dimension
  if (context.features.length !== CONTEXT_DIMENSION) {
    errors.push(
      `Dimension mismatch: expected ${CONTEXT_DIMENSION}, got ${context.features.length}`
    );
  }

  // Check each feature
  for (let i = 0; i < context.features.length; i++) {
    const feature = context.features[i];

    if (!isFinite(feature)) {
      errors.push(`Feature ${i} (${context.featureNames[i]}) is not finite: ${feature}`);
    } else if (feature < 0 || feature > 1) {
      errors.push(
        `Feature ${i} (${context.featureNames[i]}) out of range [0,1]: ${feature}`
      );
    }
  }

  // Check metadata
  if (!context.metadata.userId) {
    errors.push('Missing userId in metadata');
  }
  if (!context.metadata.questionId) {
    errors.push('Missing questionId in metadata');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get feature names for the context vector
 */
export function getFeatureNames(): string[] {
  return [
    // User features (6)
    'user_theta_norm',
    'user_sem_norm',
    'user_confidence',
    'user_experience',
    'user_recent_accuracy',
    'user_session_progress',
    // Question features (5)
    'question_difficulty_norm',
    'question_discrimination_norm',
    'question_guessing_norm',
    'question_exposure_rate',
    'question_historical_correct_rate',
    // Interaction features (4)
    'interaction_theta_difficulty_distance',
    'interaction_irt_probability',
    'interaction_fisher_information',
    'interaction_topic_weakness_match',
  ];
}
