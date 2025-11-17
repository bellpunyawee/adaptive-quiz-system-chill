/**
 * Tier 2 Algorithmic Improvements Configuration
 *
 * Provides configurable parameters for advanced adaptive engine features:
 * - Discrimination bonuses for high-quality items
 * - Decaying exploration parameters
 * - Sigmoid content balancing (Phase 2)
 * - Adaptive warm-up strategies (Phase 2)
 */

export interface Tier2Config {
  // Question Selection Enhancements
  questionSelection: {
    useDiscriminationBonus: boolean;
    discriminationWeight: number;  // Multiplier for sqrt(discrimination) bonus
    exposurePenaltyWeight: number; // Weight for exposure penalty
  };

  // Exploration Decay (Phase 1)
  exploration: {
    useDecay: boolean;
    initialParam: number;  // Start high (exploration)
    finalParam: number;    // End low (exploitation)
  };

  // Content Balancing (Phase 2 - not yet implemented)
  contentBalancing: {
    useSigmoid: boolean;
    sigmoidSteepness: number;  // 1.0 = gentle, 3.0 = steep
    maxQuestionsPerCell: number;
  };

  // Warm-up Strategy (Phase 2 - not yet implemented)
  warmup: {
    useAdaptiveRange: boolean;
    minRange: number;
    maxRange: number;
  };
}

/**
 * Default Tier 2 configuration
 * Phase 1: discrimination bonus + decaying exploration enabled
 * Phase 2: sigmoid + adaptive warmup disabled (not yet implemented)
 */
export const DEFAULT_TIER2_CONFIG: Tier2Config = {
  questionSelection: {
    useDiscriminationBonus: false,  // OPTION A: DISABLED (was hurting difficulty matching)
    discriminationWeight: 0.15,     // Not used when disabled
    exposurePenaltyWeight: 0.25,    // From selective rollback
  },
  exploration: {
    useDecay: true,                 // OPTION A: KEPT (gentle decay shows promise)
    initialParam: 1.2,              // FIXED: Reduced from 1.5 to 1.2 (gentler exploration)
    finalParam: 0.8,                // FIXED: Increased from 0.5 to 0.8 (less aggressive exploitation)
  },
  // Phase 2 features (not yet active)
  contentBalancing: {
    useSigmoid: false,  // Will enable in Phase 2
    sigmoidSteepness: 2.0,
    maxQuestionsPerCell: 5,
  },
  warmup: {
    useAdaptiveRange: false,  // Will enable in Phase 2
    minRange: 0.8,
    maxRange: 1.5,
  },
};

/**
 * Get Tier 2 configuration for a specific quiz type
 */
export function getTier2ConfigForQuizType(quizType: string): Tier2Config {
  const baseConfig = { ...DEFAULT_TIER2_CONFIG };

  switch (quizType) {
    case 'baseline':
      // Baseline: More exploitation, tighter parameters
      return {
        ...baseConfig,
        exploration: {
          ...baseConfig.exploration,
          initialParam: 1.2,
          finalParam: 0.3,
        },
        questionSelection: {
          ...baseConfig.questionSelection,
          discriminationWeight: 0.4, // Higher weight for baseline precision
        },
      };

    case 'practice-new':
    case 'practice-review':
      // Practice: More exploration, looser parameters
      return {
        ...baseConfig,
        exploration: {
          ...baseConfig.exploration,
          initialParam: 1.8,
          finalParam: 0.7,
        },
      };

    default:
      return baseConfig;
  }
}

/**
 * Calculate decaying exploration parameter
 * Starts high (exploration) and decays to low (exploitation) as quiz progresses
 */
export function getDecayingExplorationParam(
  questionsAnswered: number,
  maxQuestions: number,
  config: Tier2Config['exploration']
): number {
  if (!config.useDecay) {
    return config.initialParam; // No decay, use initial param throughout
  }

  // Linear decay from initial to final
  const progress = Math.min(questionsAnswered / maxQuestions, 1.0);
  return config.initialParam - (config.initialParam - config.finalParam) * progress;
}

/**
 * Calculate discrimination bonus for question selection
 * Higher discrimination items get a boost in selection score
 */
export function getDiscriminationBonus(
  discrimination: number,
  config: Tier2Config['questionSelection']
): number {
  if (!config.useDiscriminationBonus) {
    return 0;
  }

  // sqrt dampens the effect to prevent over-weighting
  // e.g., a=2.0 → bonus=0.42, a=1.0 → bonus=0.30, a=0.5 → bonus=0.21
  return Math.sqrt(discrimination) * config.discriminationWeight;
}
