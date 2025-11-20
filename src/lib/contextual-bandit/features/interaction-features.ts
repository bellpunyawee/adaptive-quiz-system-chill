/**
 * Extract interaction features between user and question
 * These capture the relationship between user state and question attributes
 */

import { calculateIRTProbability, calculateIRTInformation } from '../../adaptive-engine/irt-3pl';
import { normalizeDistance, normalizeFisherInfo } from './normalization';

export interface InteractionFeatures {
  thetaDifficultyDistance: number;
  irtProbability: number;
  fisherInformation: number;
  topicMatch: number;
}

export interface InteractionFeatureVector {
  features: number[];
  featureNames: string[];
}

/**
 * Extract 4-dimensional interaction feature vector
 *
 * Features:
 * 1. Distance |θ - b| (normalized)
 * 2. IRT probability P(θ | b, a, c)
 * 3. Fisher information (expected info gain)
 * 4. Topic match (1 if user weak in this topic, 0 otherwise)
 */
export function extractInteractionFeatures(
  theta: number,
  difficulty_b: number,
  discrimination_a: number,
  guessing_c: number,
  userTopicMastery: number, // User's mastery in this topic [0, 1]
  questionCellId: string // For topic matching
): InteractionFeatureVector {
  // 1. Distance between ability and difficulty
  const distance = Math.abs(theta - difficulty_b);
  const normalizedDistance = normalizeDistance(distance);

  // 2. IRT probability
  const irtProb = calculateIRTProbability(theta, {
    a: discrimination_a,
    b: difficulty_b,
    c: guessing_c,
  });

  // 3. Fisher information (how much this question reduces uncertainty)
  const fisherInfo = calculateIRTInformation(theta, {
    a: discrimination_a,
    b: difficulty_b,
    c: guessing_c,
  });
  const normalizedFisherInfo = normalizeFisherInfo(fisherInfo);

  // 4. Topic match (1 if user has low mastery in this topic)
  const topicMatch = userTopicMastery < 0.5 ? 1 : 0;

  const features = [
    normalizedDistance,
    irtProb,
    normalizedFisherInfo,
    topicMatch,
  ];

  const featureNames = [
    'interaction_theta_difficulty_distance',
    'interaction_irt_probability',
    'interaction_fisher_information',
    'interaction_topic_weakness_match',
  ];

  return { features, featureNames };
}

/**
 * Validate interaction features are in valid range
 */
export function validateInteractionFeatures(features: number[]): boolean {
  if (features.length !== 4) {
    console.error(`[Interaction Features] Expected 4 features, got ${features.length}`);
    return false;
  }

  for (let i = 0; i < features.length; i++) {
    if (!isFinite(features[i]) || features[i] < 0 || features[i] > 1) {
      console.error(`[Interaction Features] Feature ${i} out of range: ${features[i]}`);
      return false;
    }
  }

  return true;
}
