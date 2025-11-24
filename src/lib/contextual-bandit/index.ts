/**
 * Contextual Bandit - Main Export
 *
 * Exports all public APIs for the contextual bandit system
 */

// Core algorithm
export { LinUCBModel } from './algorithms/linucb';
export type { LinUCBPrediction, LinUCBModelState } from './algorithms/linucb';

// Model management
export { ModelManager, getModelManager, resetModelManager } from './model-manager';

// Feature engineering
export { buildContext, serializeContext, deserializeContext, validateContext, CONTEXT_DIMENSION } from './features/context-builder';
export { extractUserFeatures, calculateRecentAccuracy } from './features/user-features';
export { extractQuestionFeatures } from './features/question-features';
export { extractInteractionFeatures } from './features/interaction-features';

// Reward calculation
export { calculateReward, calculateBinaryReward, calculateInfoWeightedReward } from './reward-calculator';
export type { RewardComponents, RewardConfig } from './reward-calculator';

// Hybrid scoring
export { calculateHybridScore, calculatePureLinUCBScore, calculatePureIRTScore, getRecommendedWeights } from './hybrid';
export type { HybridScore, HybridConfig } from './hybrid';

// Configuration
export {
  getConfig,
  updateConfig,
  resetConfig,
  shouldUseContextualBandit,
  getAlgorithmMode,
  validateConfig,
  loadConfigFromEnv,
  getConfigSummary,
} from './config';
export type { ContextualBanditConfig, ContextualBanditMode } from './config';

// Selection engine
export {
  selectQuestionContextual,
  processAnswerContextual,
  shouldUseContextualBanditForUser,
  getAlgorithmModeForUser,
} from './engine-contextual';

// Monitoring
export {
  getMetrics,
  getFeatureImportance,
  getGlobalFeatureImportance,
  calculateQuizRegret,
  getModelStats,
  getComparisonMetrics,
  logPerformance,
  getMetricsSummary,
} from './monitoring';
export type { ContextualBanditMetrics } from './monitoring';
