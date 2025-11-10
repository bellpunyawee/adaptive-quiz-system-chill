import crypto from 'crypto';

export interface ABTestConfig {
  testName: string;
  description: string;
  variantA: string; // Description of control
  variantB: string; // Description of treatment
  trafficSplit: number; // 0.5 = 50/50 split
  isActive: boolean;
}

/**
 * Assign user to A/B test variant using stable hashing
 * Same user + same test always gets same variant
 */
export function assignVariant(userId: string, testName: string, trafficSplit: number = 0.5): 'A' | 'B' {
  // Create stable hash from userId + testName
  const hash = crypto
    .createHash('md5')
    .update(userId + testName)
    .digest('hex');

  // Convert first 8 hex characters to number between 0 and 1
  const value = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;

  return value < trafficSplit ? 'A' : 'B';
}

/**
 * Check if user is in variant B (treatment) for a given test
 */
export function isVariantB(userId: string, testName: string, trafficSplit: number = 0.5): boolean {
  return assignVariant(userId, testName, trafficSplit) === 'B';
}

/**
 * Get active A/B tests configuration
 * In future, this could be loaded from database or config file
 */
export function getActiveTests(): ABTestConfig[] {
  return [
    {
      testName: 'pser-stopping',
      description: 'Test PSER stopping criterion vs traditional fixed-SEM',
      variantA: 'Traditional fixed-SEM stopping (targetSEM=0.3)',
      variantB: 'PSER stopping with 5% improvement threshold',
      trafficSplit: 0.5,
      isActive: true
    },
    {
      testName: 'warm-up-strategy',
      description: 'Test improved warm-up vs random first question',
      variantA: 'Random first question from pool',
      variantB: 'Warm-up strategy with correlated theta estimate',
      trafficSplit: 0.5,
      isActive: true
    }
  ];
}

/**
 * Get specific test configuration
 */
export function getTestConfig(testName: string): ABTestConfig | undefined {
  return getActiveTests().find(test => test.testName === testName);
}

/**
 * Log A/B test metrics (to be stored in database)
 */
export interface ABTestMetrics {
  testName: string;
  variant: 'A' | 'B';
  userId: string;
  quizId: string;
  questionCount: number;
  avgSEM: number;
  quizDurationMs: number;
  completionRate: number;
  cellsMastered: number;
  overallAccuracy: number;
}

/**
 * Calculate statistical significance between two variants
 * Returns p-value from Welch's t-test
 */
export function calculateSignificance(
  variantA: number[],
  variantB: number[]
): { pValue: number; significant: boolean; meanDiff: number } {
  const n1 = variantA.length;
  const n2 = variantB.length;

  if (n1 < 2 || n2 < 2) {
    return { pValue: 1, significant: false, meanDiff: 0 };
  }

  // Calculate means
  const mean1 = variantA.reduce((sum, val) => sum + val, 0) / n1;
  const mean2 = variantB.reduce((sum, val) => sum + val, 0) / n2;
  const meanDiff = mean2 - mean1;

  // Calculate variances
  const var1 = variantA.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (n1 - 1);
  const var2 = variantB.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (n2 - 1);

  // Welch's t-statistic
  const tStat = meanDiff / Math.sqrt(var1 / n1 + var2 / n2);

  // Degrees of freedom (Welch-Satterthwaite)
  const df = Math.pow(var1 / n1 + var2 / n2, 2) /
    (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));

  // Approximate p-value (two-tailed)
  // For proper implementation, use a t-distribution library
  // This is a rough approximation
  const pValue = 2 * (1 - approximateTCDF(Math.abs(tStat), df));

  return {
    pValue,
    significant: pValue < 0.05,
    meanDiff
  };
}

/**
 * Approximate cumulative distribution function for t-distribution
 * This is a simplified approximation - for production use a proper statistics library
 */
function approximateTCDF(t: number, df: number): number {
  // For large df, t-distribution approaches normal distribution
  if (df > 100) {
    return approximateNormalCDF(t);
  }

  // Simplified approximation using normal CDF
  // For better accuracy, use a statistics library like jstat
  return approximateNormalCDF(t * Math.sqrt(df / (df + t * t)));
}

/**
 * Approximate CDF of standard normal distribution
 */
function approximateNormalCDF(z: number): number {
  // Using error function approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  return z > 0 ? 1 - p : p;
}
