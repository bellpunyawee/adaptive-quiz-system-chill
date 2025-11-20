/**
 * Contextual Bandit Configuration
 *
 * Feature flags and settings for gradual rollout and A/B testing
 */

export type ContextualBanditMode = 'disabled' | 'linucb' | 'hybrid' | 'irt-only';

export interface ContextualBanditConfig {
  // Feature flags
  enabled: boolean;                    // Master switch (default: false)
  mode: ContextualBanditMode;          // Algorithm mode (default: 'hybrid')
  trafficAllocation: number;           // % of users on contextual (0-100, default: 0)

  // LinUCB parameters
  contextDimension: number;            // Context vector dimension (default: 15)
  explorationAlpha: number;            // LinUCB exploration parameter (default: 1.5)
  regularization: number;              // Ridge regression lambda (default: 1.0)

  // Hybrid parameters
  hybridLinucbWeight: number;          // Weight for LinUCB in hybrid (default: 0.7)
  hybridIrtWeight: number;             // Weight for IRT in hybrid (default: 0.3)
  useAdaptiveWeights: boolean;         // Adjust weights by confidence (default: true)

  // Reward function
  useMultiObjectiveReward: boolean;    // Use multi-objective vs binary (default: true)
  rewardWeightCorrectness: number;     // Weight for correctness (default: 0.7)
  rewardWeightInfoGain: number;        // Weight for info gain (default: 0.2)
  rewardWeightSpeed: number;           // Weight for speed (default: 0.1)

  // Model management
  maxCacheSize: number;                // Max models in memory (default: 1000)
  enablePreloading: boolean;           // Preload models for candidate questions (default: true)

  // Logging and monitoring
  enableDecisionLogging: boolean;      // Log decisions to DecisionSnapshot (default: true)
  enableMetrics: boolean;              // Track performance metrics (default: true)
  logVerbose: boolean;                 // Verbose console logging (default: false)
}

// Default configuration (conservative settings)
export const DEFAULT_CONFIG: ContextualBanditConfig = {
  // Feature flags
  enabled: false,               // Disabled by default
  mode: 'hybrid',               // Hybrid mode when enabled
  trafficAllocation: 0,         // 0% traffic initially

  // LinUCB parameters
  contextDimension: 15,
  explorationAlpha: 1.5,
  regularization: 1.0,

  // Hybrid parameters
  hybridLinucbWeight: 0.7,
  hybridIrtWeight: 0.3,
  useAdaptiveWeights: true,

  // Reward function
  useMultiObjectiveReward: true,
  rewardWeightCorrectness: 0.7,
  rewardWeightInfoGain: 0.2,
  rewardWeightSpeed: 0.1,

  // Model management
  maxCacheSize: 1000,
  enablePreloading: true,

  // Logging and monitoring
  enableDecisionLogging: true,
  enableMetrics: true,
  logVerbose: false,
};

// Current configuration (mutable, can be updated at runtime)
let currentConfig: ContextualBanditConfig = { ...DEFAULT_CONFIG };

/**
 * Get current configuration
 */
export function getConfig(): ContextualBanditConfig {
  return { ...currentConfig };
}

/**
 * Update configuration (partial update)
 */
export function updateConfig(updates: Partial<ContextualBanditConfig>): void {
  currentConfig = { ...currentConfig, ...updates };
  console.log('[Contextual Bandit] Configuration updated:', updates);
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  currentConfig = { ...DEFAULT_CONFIG };
  console.log('[Contextual Bandit] Configuration reset to defaults');
}

/**
 * Check if contextual bandit should be used for a given user
 *
 * Uses consistent hashing based on userId to ensure:
 * - Same user always gets same variant
 * - Traffic allocation is respected
 *
 * @param userId - User identifier
 * @returns true if user should use contextual bandit
 */
export function shouldUseContextualBandit(userId: string): boolean {
  // Check master switch
  if (!currentConfig.enabled) {
    return false;
  }

  // Check traffic allocation
  if (currentConfig.trafficAllocation === 0) {
    return false;
  }

  if (currentConfig.trafficAllocation === 100) {
    return true;
  }

  // Hash-based allocation for consistent assignment
  const hash = simpleHash(userId);
  const bucket = hash % 100; // 0-99

  return bucket < currentConfig.trafficAllocation;
}

/**
 * Simple string hash function (djb2 algorithm)
 * Returns a positive integer
 */
function simpleHash(str: string): number {
  let hash = 5381;

  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }

  return Math.abs(hash);
}

/**
 * Get algorithm mode for a user
 *
 * @param userId - User identifier
 * @returns Algorithm mode to use
 */
export function getAlgorithmMode(userId: string): ContextualBanditMode {
  if (!shouldUseContextualBandit(userId)) {
    return 'irt-only';
  }

  return currentConfig.mode;
}

/**
 * Validate configuration
 * @returns Validation result with errors if any
 */
export function validateConfig(config: ContextualBanditConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Traffic allocation
  if (config.trafficAllocation < 0 || config.trafficAllocation > 100) {
    errors.push(`trafficAllocation must be in [0, 100], got ${config.trafficAllocation}`);
  }

  // Exploration alpha
  if (config.explorationAlpha < 0) {
    errors.push(`explorationAlpha must be >= 0, got ${config.explorationAlpha}`);
  }

  // Regularization
  if (config.regularization <= 0) {
    errors.push(`regularization must be > 0, got ${config.regularization}`);
  }

  // Hybrid weights
  if (config.hybridLinucbWeight + config.hybridIrtWeight !== 1.0) {
    const sum = config.hybridLinucbWeight + config.hybridIrtWeight;
    if (Math.abs(sum - 1.0) > 0.01) { // Allow small floating point errors
      errors.push(`Hybrid weights must sum to 1.0, got ${sum}`);
    }
  }

  // Reward weights
  const rewardSum = config.rewardWeightCorrectness +
                    config.rewardWeightInfoGain +
                    config.rewardWeightSpeed;
  if (Math.abs(rewardSum - 1.0) > 0.01) {
    errors.push(`Reward weights must sum to 1.0, got ${rewardSum}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): void {
  const updates: Partial<ContextualBanditConfig> = {};

  if (process.env.CONTEXTUAL_BANDIT_ENABLED) {
    updates.enabled = process.env.CONTEXTUAL_BANDIT_ENABLED === 'true';
  }

  if (process.env.CONTEXTUAL_BANDIT_MODE) {
    updates.mode = process.env.CONTEXTUAL_BANDIT_MODE as ContextualBanditMode;
  }

  if (process.env.CONTEXTUAL_BANDIT_TRAFFIC) {
    updates.trafficAllocation = parseFloat(process.env.CONTEXTUAL_BANDIT_TRAFFIC);
  }

  if (process.env.CONTEXTUAL_BANDIT_ALPHA) {
    updates.explorationAlpha = parseFloat(process.env.CONTEXTUAL_BANDIT_ALPHA);
  }

  if (process.env.CONTEXTUAL_BANDIT_VERBOSE) {
    updates.logVerbose = process.env.CONTEXTUAL_BANDIT_VERBOSE === 'true';
  }

  if (Object.keys(updates).length > 0) {
    updateConfig(updates);
  }
}

/**
 * Get configuration summary for logging
 */
export function getConfigSummary(): string {
  const cfg = currentConfig;

  return `
Contextual Bandit Configuration:
  Enabled: ${cfg.enabled}
  Mode: ${cfg.mode}
  Traffic Allocation: ${cfg.trafficAllocation}%

  LinUCB Parameters:
    Exploration Alpha: ${cfg.explorationAlpha}
    Regularization: ${cfg.regularization}

  Hybrid Parameters:
    LinUCB Weight: ${cfg.hybridLinucbWeight}
    IRT Weight: ${cfg.hybridIrtWeight}
    Adaptive Weights: ${cfg.useAdaptiveWeights}

  Reward Function:
    Multi-Objective: ${cfg.useMultiObjectiveReward}
    Correctness: ${cfg.rewardWeightCorrectness}
    Info Gain: ${cfg.rewardWeightInfoGain}
    Speed: ${cfg.rewardWeightSpeed}

  Model Management:
    Max Cache Size: ${cfg.maxCacheSize}
    Preloading: ${cfg.enablePreloading}

  Logging:
    Decision Logging: ${cfg.enableDecisionLogging}
    Metrics: ${cfg.enableMetrics}
    Verbose: ${cfg.logVerbose}
  `.trim();
}

// Load from environment on module import
loadConfigFromEnv();
