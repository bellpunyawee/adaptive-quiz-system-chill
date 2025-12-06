/**
 * Distribution-Aware Adaptive Convergence Configuration
 *
 * Implements ability-adaptive SEM thresholds and pool exhaustion detection
 * to address fairness gaps caused by U-shaped question pool distribution.
 *
 * Phase 3: Software patch for content limitations (U-shaped pool: 68.7% extremes)
 * Phase 4: Operational reliability pivot - formative assessment mode
 *
 * STRATEGIC PIVOT: Abandon "fairness gap" metric (relative equality) in favor of
 * "actionable precision" (absolute SEM thresholds) for formative assessment contexts.
 */

export type AbilityQuintile = 'Q1_low' | 'Q2' | 'Q3_medium' | 'Q4' | 'Q5_high';

export interface DistributionAwareConvergenceConfig {
  // Master feature flag
  enabled: boolean;                    // Default: false
  trafficAllocation: number;           // 0-100%, default: 0

  // Formative assessment mode (operational reliability)
  formativeMode: boolean;              // Default: true (actionable precision vs fairness gap)

  // Ability-adaptive SEM thresholds
  semThresholds: {
    q1_low: number;                    // θ < -1.0, default: 0.50 (relaxed for extremes)
    q2: number;                        // -1.0 ≤ θ < -0.3, default: 0.35
    q3_medium: number;                 // -0.3 ≤ θ ≤ 0.3, default: 0.35
    q4: number;                        // 0.3 < θ ≤ 1.0, default: 0.35
    q5_high: number;                   // θ > 1.0, default: 0.50 (relaxed for extremes)
  };

  // Pool exhaustion detection
  poolExhaustion: {
    enableDetection: boolean;          // Default: true
    difficultyRangeWidth: number;      // Default: 1.0 (±0.5)
    minQuestionsThreshold: number;     // Default: 3
    checkFrequency: 'per-cell';        // Per-cell checking
  };

  // Rescue logic
  rescue: {
    strategy: 'graceful-degradation';  // Recommended approach
    degradationSteps: number[];        // [1.5, 2.0] = [±0.75, ±1.0]
    semRelaxation: number;             // Default: 0.10 (+0.1 to SEM threshold)
    logVerbose: boolean;               // Detailed logging
  };
}

/**
 * Default configuration (formative mode enabled, operational reliability targets)
 *
 * Phase 4 Strategic Pivot:
 * - Formative mode: ON (actionable precision, not fairness gap)
 * - Q1/Q5: Relaxed to 0.50 (accept information scarcity at extremes)
 * - Q2/Q3/Q4: Tightened to 0.35 (pool healthy after Phase 4)
 *
 * Rationale: For practice/learning systems, absolute SEM thresholds matter more
 * than relative equality. SEM < 0.50 provides sufficient precision for diagnostic
 * decisions ("needs help" vs "proficient").
 */
export const DEFAULT_CONVERGENCE_CONFIG: DistributionAwareConvergenceConfig = {
  // Feature flags
  enabled: true,               // ENABLED by default (Phase 4 deployed)
  trafficAllocation: 100,      // 100% traffic (full rollout)

  // Formative assessment mode (operational reliability)
  formativeMode: true,         // Use actionable precision targets

  // Ability-adaptive SEM thresholds (UPDATED for operational reliability)
  // Extremes (Q1/Q5): Accept wider CI due to information scarcity
  // Center (Q2/Q3/Q4): Tighter CI due to healthy pool (13% easy, 16% hard)
  semThresholds: {
    q1_low: 0.50,      // Low ability: wider CI (information limit)
    q2: 0.35,          // Easy range: moderate precision (pool now healthy)
    q3_medium: 0.35,   // Medium: moderate precision (pool adequate)
    q4: 0.35,          // Hard range: moderate precision (pool now healthy)
    q5_high: 0.50,     // High ability: wider CI (information limit)
  },

  // Pool exhaustion detection
  poolExhaustion: {
    enableDetection: true,
    difficultyRangeWidth: 1.0,      // ±0.5 standard width
    minQuestionsThreshold: 3,       // Exhausted if < 3 questions available
    checkFrequency: 'per-cell',
  },

  // Rescue logic (graceful degradation)
  rescue: {
    strategy: 'graceful-degradation',
    degradationSteps: [1.5, 2.0],   // Step 1: ±0.75, Step 2: ±1.0
    semRelaxation: 0.10,             // Step 3: +0.1 to SEM
    logVerbose: false,
  },
};

// Current configuration (mutable, can be updated at runtime)
let currentConfig: DistributionAwareConvergenceConfig = { ...DEFAULT_CONVERGENCE_CONFIG };

/**
 * Get current configuration
 */
export function getConfig(): DistributionAwareConvergenceConfig {
  return { ...currentConfig };
}

/**
 * Update configuration (partial update)
 */
export function updateConfig(updates: Partial<DistributionAwareConvergenceConfig>): void {
  currentConfig = { ...currentConfig, ...updates };
  console.log('[Convergence] Configuration updated:', updates);
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  currentConfig = { ...DEFAULT_CONVERGENCE_CONFIG };
  console.log('[Convergence] Configuration reset to defaults');
}

/**
 * Map theta (ability) to ability quintile
 *
 * Quintiles based on Phase 1/2 analysis:
 * - Q1_low: θ < -1.0 (struggles with easy items)
 * - Q2: -1.0 ≤ θ < -0.3 (below average)
 * - Q3_medium: -0.3 ≤ θ ≤ 0.3 (average)
 * - Q4: 0.3 < θ ≤ 1.0 (above average)
 * - Q5_high: θ > 1.0 (masters hard items)
 *
 * @param theta - Ability estimate
 * @returns Ability quintile classification
 */
export function getAbilityQuintile(theta: number): AbilityQuintile {
  if (theta < -1.0) return 'Q1_low';
  if (theta < -0.3) return 'Q2';
  if (theta <= 0.3) return 'Q3_medium';
  if (theta <= 1.0) return 'Q4';
  return 'Q5_high';
}

/**
 * Get adaptive SEM threshold for a given theta
 *
 * Returns quintile-specific SEM threshold. Can be further refined by quiz type.
 *
 * @param theta - Current ability estimate
 * @param quizType - Quiz type ('baseline', 'regular', 'practice-new', etc.)
 * @returns Adaptive SEM threshold
 */
export function getAdaptiveSEMThreshold(theta: number, quizType: string = 'regular'): number {
  const quintile = getAbilityQuintile(theta);
  const baseThresholds = currentConfig.semThresholds;

  let baseThreshold: number;
  switch (quintile) {
    case 'Q1_low':
      baseThreshold = baseThresholds.q1_low;
      break;
    case 'Q2':
      baseThreshold = baseThresholds.q2;
      break;
    case 'Q3_medium':
      baseThreshold = baseThresholds.q3_medium;
      break;
    case 'Q4':
      baseThreshold = baseThresholds.q4;
      break;
    case 'Q5_high':
      baseThreshold = baseThresholds.q5_high;
      break;
  }

  // Refine by quiz type (baseline needs more precision, practice less)
  switch (quizType) {
    case 'baseline':
      return Math.max(0.20, baseThreshold - 0.05); // Slightly tighter for baseline
    case 'practice-new':
    case 'practice-review':
      return baseThreshold + 0.05; // Slightly looser for practice
    default:
      return baseThreshold;
  }
}

/**
 * Get quintile-specific difficulty range width
 *
 * Extremes (Q1/Q5) need wider ranges due to pool scarcity.
 * Center (Q3) can use tighter ranges due to pool abundance.
 *
 * Based on actual pool distribution:
 * - Very Easy: 48.5% (Q1 oversupplied)
 * - Easy: 7.0% (Q2 undersupplied)
 * - Medium: 20.1% (Q3 moderate)
 * - Hard: 4.2% (Q4 severely undersupplied)
 * - Very Hard: 20.3% (Q5 moderate)
 *
 * @param theta - Current ability estimate
 * @returns Range width multiplier
 */
export function getQuintileSpecificRangeWidth(theta: number): number {
  const quintile = getAbilityQuintile(theta);

  switch (quintile) {
    case 'Q1_low':
      return 1.2;  // ±0.6 (wider due to limited challenging items)
    case 'Q2':
      return 1.0;  // ±0.5 (standard)
    case 'Q3_medium':
      return 0.8;  // ±0.4 (tighter, most questions available)
    case 'Q4':
      return 1.0;  // ±0.5 (standard, despite scarcity - rescue will help)
    case 'Q5_high':
      return 1.2;  // ±0.6 (wider due to ceiling effects)
  }
}

/**
 * Calculate optimal difficulty range based on theta
 *
 * IRT principle: Information maximized when difficulty ≈ theta
 * Optimal range: [theta - width/2, theta + width/2]
 *
 * Uses quintile-specific width by default, or custom width if provided.
 *
 * @param theta - Current ability estimate
 * @param customWidth - Optional custom width multiplier (overrides quintile-specific)
 * @returns Optimal difficulty range
 */
export function getOptimalDifficultyRange(
  theta: number,
  customWidth?: number
): { minDifficulty: number; maxDifficulty: number } {
  const baseWidth = currentConfig.poolExhaustion.difficultyRangeWidth;
  const widthMultiplier = customWidth ?? getQuintileSpecificRangeWidth(theta);
  const actualWidth = baseWidth * widthMultiplier;

  const halfWidth = actualWidth / 2;

  return {
    minDifficulty: theta - halfWidth,
    maxDifficulty: theta + halfWidth,
  };
}

/**
 * Check if distribution-aware convergence should be used for a given user
 *
 * Uses consistent hashing based on userId to ensure:
 * - Same user always gets same variant
 * - Traffic allocation is respected
 *
 * @param userId - User identifier
 * @returns true if user should use distribution-aware convergence
 */
export function shouldUseDistributionAwareConvergence(userId: string): boolean {
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
 * Validate configuration
 * @returns Validation result with errors if any
 */
export function validateConfig(config: DistributionAwareConvergenceConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Traffic allocation
  if (config.trafficAllocation < 0 || config.trafficAllocation > 100) {
    errors.push(`trafficAllocation must be in [0, 100], got ${config.trafficAllocation}`);
  }

  // SEM thresholds
  const thresholds = Object.values(config.semThresholds);
  if (thresholds.some(t => t <= 0 || t > 1.0)) {
    errors.push(`SEM thresholds must be in (0, 1.0]`);
  }

  // Pool exhaustion
  if (config.poolExhaustion.difficultyRangeWidth <= 0) {
    errors.push(`difficultyRangeWidth must be > 0, got ${config.poolExhaustion.difficultyRangeWidth}`);
  }

  if (config.poolExhaustion.minQuestionsThreshold < 0) {
    errors.push(`minQuestionsThreshold must be >= 0, got ${config.poolExhaustion.minQuestionsThreshold}`);
  }

  // Rescue logic
  if (config.rescue.degradationSteps.some(step => step <= 0)) {
    errors.push(`degradationSteps must all be > 0`);
  }

  if (config.rescue.semRelaxation < 0) {
    errors.push(`semRelaxation must be >= 0, got ${config.rescue.semRelaxation}`);
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
  const updates: Partial<DistributionAwareConvergenceConfig> = {};

  if (process.env.CONVERGENCE_ENABLED) {
    updates.enabled = process.env.CONVERGENCE_ENABLED === 'true';
  }

  if (process.env.CONVERGENCE_TRAFFIC) {
    updates.trafficAllocation = parseFloat(process.env.CONVERGENCE_TRAFFIC);
  }

  if (process.env.CONVERGENCE_VERBOSE) {
    if (!updates.rescue) updates.rescue = { ...currentConfig.rescue };
    updates.rescue = {
      ...currentConfig.rescue,
      logVerbose: process.env.CONVERGENCE_VERBOSE === 'true'
    };
  }

  // Allow overriding SEM thresholds via env
  if (process.env.CONVERGENCE_SEM_Q1) {
    if (!updates.semThresholds) updates.semThresholds = { ...currentConfig.semThresholds };
    updates.semThresholds = {
      ...currentConfig.semThresholds,
      q1_low: parseFloat(process.env.CONVERGENCE_SEM_Q1)
    };
  }

  if (process.env.CONVERGENCE_SEM_Q2) {
    if (!updates.semThresholds) updates.semThresholds = { ...currentConfig.semThresholds };
    updates.semThresholds = {
      ...(updates.semThresholds || currentConfig.semThresholds),
      q2: parseFloat(process.env.CONVERGENCE_SEM_Q2)
    };
  }

  if (process.env.CONVERGENCE_SEM_Q3) {
    if (!updates.semThresholds) updates.semThresholds = { ...currentConfig.semThresholds };
    updates.semThresholds = {
      ...(updates.semThresholds || currentConfig.semThresholds),
      q3_medium: parseFloat(process.env.CONVERGENCE_SEM_Q3)
    };
  }

  if (process.env.CONVERGENCE_SEM_Q4) {
    if (!updates.semThresholds) updates.semThresholds = { ...currentConfig.semThresholds };
    updates.semThresholds = {
      ...(updates.semThresholds || currentConfig.semThresholds),
      q4: parseFloat(process.env.CONVERGENCE_SEM_Q4)
    };
  }

  if (process.env.CONVERGENCE_SEM_Q5) {
    if (!updates.semThresholds) updates.semThresholds = { ...currentConfig.semThresholds };
    updates.semThresholds = {
      ...(updates.semThresholds || currentConfig.semThresholds),
      q5_high: parseFloat(process.env.CONVERGENCE_SEM_Q5)
    };
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
Distribution-Aware Adaptive Convergence Configuration:
  Enabled: ${cfg.enabled}
  Traffic Allocation: ${cfg.trafficAllocation}%
  Formative Mode: ${cfg.formativeMode ? 'ON' : 'OFF'} (${cfg.formativeMode ? 'actionable precision' : 'fairness gap'})

  Ability-Adaptive SEM Thresholds:
    Q1 (θ < -1.0):       ${cfg.semThresholds.q1_low}
    Q2 (-1.0 to -0.3):   ${cfg.semThresholds.q2}
    Q3 (-0.3 to 0.3):    ${cfg.semThresholds.q3_medium}
    Q4 (0.3 to 1.0):     ${cfg.semThresholds.q4}
    Q5 (θ > 1.0):        ${cfg.semThresholds.q5_high}

  Pool Exhaustion Detection:
    Enabled: ${cfg.poolExhaustion.enableDetection}
    Range Width: ±${cfg.poolExhaustion.difficultyRangeWidth / 2}
    Min Questions Threshold: ${cfg.poolExhaustion.minQuestionsThreshold}

  Rescue Logic:
    Strategy: ${cfg.rescue.strategy}
    Degradation Steps: ${cfg.rescue.degradationSteps.map(s => `±${s / 2}`).join(', ')}
    SEM Relaxation: +${cfg.rescue.semRelaxation}
    Verbose Logging: ${cfg.rescue.logVerbose}
  `.trim();
}

/**
 * Get actionable precision threshold (uniform target for formative assessment)
 *
 * In formative mode, we care about absolute precision, not relative equality.
 * A student is "actionably precise" if their SEM < 0.50, which provides
 * 95% confidence interval of ±0.98 logits - sufficient for diagnostic decisions.
 *
 * @returns Actionable precision threshold (0.50 for formative mode)
 */
export function getActionablePrecisionThreshold(): number {
  return currentConfig.formativeMode ? 0.50 : 0.30;
}

/**
 * Check if a student has achieved actionable precision
 *
 * @param sem - Student's current SEM
 * @returns true if student has actionable precision
 */
export function hasActionablePrecision(sem: number): boolean {
  return sem <= getActionablePrecisionThreshold();
}

/**
 * Calculate actionable precision rate for a set of SEMs
 *
 * Primary KPI for formative assessment mode.
 * Target: >90% of students achieve actionable precision.
 *
 * @param semValues - Array of SEM values
 * @returns Percentage of students with actionable precision
 */
export function calculateActionablePrecisionRate(semValues: number[]): number {
  if (semValues.length === 0) return 0;

  const threshold = getActionablePrecisionThreshold();
  const actionable = semValues.filter(sem => sem <= threshold).length;

  return (actionable / semValues.length) * 100;
}

// Load from environment on module import
loadConfigFromEnv();
