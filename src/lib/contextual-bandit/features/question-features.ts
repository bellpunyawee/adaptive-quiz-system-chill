/**
 * Extract and normalize question attribute features for contextual bandit
 */

import {
  normalizeDifficulty,
  normalizeDiscrimination,
  normalizeGuessing,
  normalizeExposureRate,
  normalizeCorrectRate,
} from './normalization';

export interface QuestionAttributes {
  difficulty_b: number;
  discrimination_a: number;
  guessing_c: number;
  exposureCount: number;
  maxExposure: number;
  correctRate: number; // Historical average P(correct)
}

export interface QuestionFeatureVector {
  features: number[];
  featureNames: string[];
}

/**
 * Extract 5-dimensional question feature vector
 *
 * Features:
 * 1. Normalized difficulty (b)
 * 2. Normalized discrimination (a)
 * 3. Normalized guessing parameter (c)
 * 4. Exposure rate (how often used)
 * 5. Historical correct rate
 */
export function extractQuestionFeatures(
  question: QuestionAttributes
): QuestionFeatureVector {
  const features = [
    normalizeDifficulty(question.difficulty_b),
    normalizeDiscrimination(question.discrimination_a),
    normalizeGuessing(question.guessing_c),
    normalizeExposureRate(question.exposureCount, question.maxExposure),
    normalizeCorrectRate(question.correctRate),
  ];

  const featureNames = [
    'question_difficulty_norm',
    'question_discrimination_norm',
    'question_guessing_norm',
    'question_exposure_rate',
    'question_historical_correct_rate',
  ];

  return { features, featureNames };
}

/**
 * Validate question features are in valid range
 */
export function validateQuestionFeatures(features: number[]): boolean {
  if (features.length !== 5) {
    console.error(`[Question Features] Expected 5 features, got ${features.length}`);
    return false;
  }

  for (let i = 0; i < features.length; i++) {
    if (!isFinite(features[i]) || features[i] < 0 || features[i] > 1) {
      console.error(`[Question Features] Feature ${i} out of range: ${features[i]}`);
      return false;
    }
  }

  return true;
}
