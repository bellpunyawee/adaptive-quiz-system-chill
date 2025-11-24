/**
 * Extract and normalize user state features for contextual bandit
 */

import {
  normalizeTheta,
  normalizeSEM,
  normalizeConfidence,
  normalizeResponseCount,
  normalizeAccuracy,
  normalizeSessionProgress,
} from './normalization';

export interface UserState {
  theta: number;
  sem: number;
  confidence: number;
  responseCount: number;
  recentAccuracy: number;
  questionsInSession: number;
}

export interface UserFeatureVector {
  features: number[];
  featureNames: string[];
}

/**
 * Extract 6-dimensional user feature vector
 *
 * Features:
 * 1. Normalized ability (theta)
 * 2. Normalized uncertainty (SEM)
 * 3. Confidence
 * 4. Experience (response count)
 * 5. Recent performance (last 5 questions)
 * 6. Session progress
 */
export function extractUserFeatures(user: UserState): UserFeatureVector {
  const features = [
    normalizeTheta(user.theta),
    normalizeSEM(user.sem),
    normalizeConfidence(user.confidence),
    normalizeResponseCount(user.responseCount),
    normalizeAccuracy(user.recentAccuracy),
    normalizeSessionProgress(user.questionsInSession),
  ];

  const featureNames = [
    'user_theta_norm',
    'user_sem_norm',
    'user_confidence',
    'user_experience',
    'user_recent_accuracy',
    'user_session_progress',
  ];

  return { features, featureNames };
}

/**
 * Calculate recent accuracy from last N responses
 */
export function calculateRecentAccuracy(
  responses: Array<{ isCorrect: boolean }>,
  windowSize: number = 5
): number {
  if (responses.length === 0) return 0.5; // Neutral prior

  const recent = responses.slice(-windowSize);
  const correctCount = recent.filter(r => r.isCorrect).length;

  return correctCount / recent.length;
}

/**
 * Validate user features are in valid range
 */
export function validateUserFeatures(features: number[]): boolean {
  if (features.length !== 6) {
    console.error(`[User Features] Expected 6 features, got ${features.length}`);
    return false;
  }

  for (let i = 0; i < features.length; i++) {
    if (!isFinite(features[i]) || features[i] < 0 || features[i] > 1) {
      console.error(`[User Features] Feature ${i} out of range: ${features[i]}`);
      return false;
    }
  }

  return true;
}
