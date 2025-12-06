/**
 * Operational Health Monitoring
 *
 * Phase 4: Operational Reliability Metrics
 *
 * PRIMARY KPIS (Formative Assessment Mode):
 * 1. Actionable Precision Rate - % students with SEM < 0.50
 * 2. Rescue Rate - % questions requiring rescue logic
 * 3. Crash Rate - % students hitting Step 4 (hard stop)
 *
 * DEPRECATED: Fairness Gap (relative equality) - not applicable to formative assessment
 */

import {
  getAbilityQuintile,
  getActionablePrecisionThreshold,
  hasActionablePrecision,
  calculateActionablePrecisionRate,
  type AbilityQuintile,
} from '../adaptive-engine/convergence-config';

export interface QuintileHealth {
  quintile: AbilityQuintile;
  count: number;
  avgSEM: number;
  maxSEM: number;
  targetSEM: number;
  achievedTarget: boolean;
  actionablePrecisionRate: number;  // % with SEM < 0.50
  rescues: {
    step1: number;
    step2: number;
    step3: number;
    step4: number;
    total: number;
  };
}

export interface OperationalHealthMetrics {
  // PRIMARY KPIS
  actionablePrecisionRate: number;   // % students with SEM < 0.50 (target: >90%)
  rescueRate: number;                 // % questions needing rescue (target: <30%)
  crashRate: number;                  // % students hitting Step 4 (target: <1%)

  // SUPPORTING METRICS
  avgQuestionsPerStudent: number;
  avgSEM: number;
  totalStudents: number;
  totalQuestions: number;

  // QUINTILE BREAKDOWN
  quintileBreakdown: QuintileHealth[];

  // SYSTEM HEALTH ALERTS
  alerts: {
    level: 'ok' | 'warning' | 'critical';
    message: string;
  }[];

  // METADATA
  timestamp: Date;
  assessmentContext: 'formative' | 'summative';
}

/**
 * Calculate operational health metrics from simulation results
 *
 * @param results - Monte Carlo simulation results
 * @returns Operational health metrics
 */
export function calculateOperationalHealth(results: {
  config: { numStudents: number };
  avgQuestions: number;
  avgSEM: number;
  quintileMetrics: Array<{
    quintile: string;
    count: number;
    avgSEM: number;
    maxSEM: number;
    rescueStep1: number;
    rescueStep2: number;
    rescueStep3: number;
    rescueStep4: number;
    totalRescues: number;
  }>;
  rescueDistribution: {
    step1: number;
    step2: number;
    step3: number;
    step4: number;
  };
}): OperationalHealthMetrics {
  const totalStudents = results.config.numStudents;
  const totalQuestions = results.avgQuestions * totalStudents;
  const totalRescues =
    results.rescueDistribution.step1 +
    results.rescueDistribution.step2 +
    results.rescueDistribution.step3 +
    results.rescueDistribution.step4;

  // PRIMARY KPI 1: Actionable Precision Rate
  const semValues = results.quintileMetrics.map(q => q.avgSEM);
  const actionablePrecisionRate = calculateActionablePrecisionRate(semValues);

  // PRIMARY KPI 2: Rescue Rate
  const rescueRate = (totalRescues / totalQuestions) * 100;

  // PRIMARY KPI 3: Crash Rate
  const crashRate = (results.rescueDistribution.step4 / totalQuestions) * 100;

  // Quintile Breakdown
  const quintileBreakdown: QuintileHealth[] = results.quintileMetrics.map(q => {
    const quintile = q.quintile as AbilityQuintile;

    // Target SEM for this quintile (from convergence config)
    const targetSEM = getQuintileTargetSEM(quintile);

    // Actionable precision rate for this quintile
    const actionablePrecisionRate = hasActionablePrecision(q.avgSEM) ? 100 : 0;

    return {
      quintile,
      count: q.count,
      avgSEM: q.avgSEM,
      maxSEM: q.maxSEM,
      targetSEM,
      achievedTarget: q.avgSEM <= targetSEM,
      actionablePrecisionRate,
      rescues: {
        step1: q.rescueStep1,
        step2: q.rescueStep2,
        step3: q.rescueStep3,
        step4: q.rescueStep4,
        total: q.totalRescues,
      },
    };
  });

  // System Health Alerts
  const alerts: { level: 'ok' | 'warning' | 'critical'; message: string }[] = [];

  if (actionablePrecisionRate < 90) {
    alerts.push({
      level: 'warning',
      message: `Actionable precision rate ${actionablePrecisionRate.toFixed(1)}% below 90% target`,
    });
  }

  if (rescueRate > 40) {
    alerts.push({
      level: 'critical',
      message: `Rescue rate ${rescueRate.toFixed(1)}% exceeds 40% threshold - content starvation detected`,
    });
  } else if (rescueRate > 30) {
    alerts.push({
      level: 'warning',
      message: `Rescue rate ${rescueRate.toFixed(1)}% approaching 30% threshold`,
    });
  }

  if (crashRate > 1) {
    alerts.push({
      level: 'critical',
      message: `Crash rate ${crashRate.toFixed(1)}% exceeds 1% threshold - pool exhaustion detected`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      level: 'ok',
      message: 'All operational metrics within healthy ranges',
    });
  }

  return {
    // Primary KPIs
    actionablePrecisionRate,
    rescueRate,
    crashRate,

    // Supporting metrics
    avgQuestionsPerStudent: results.avgQuestions,
    avgSEM: results.avgSEM,
    totalStudents,
    totalQuestions,

    // Breakdown
    quintileBreakdown,

    // Alerts
    alerts,

    // Metadata
    timestamp: new Date(),
    assessmentContext: 'formative',
  };
}

/**
 * Get quintile-specific target SEM
 * (mirrors convergence-config.ts DEFAULT values)
 */
function getQuintileTargetSEM(quintile: AbilityQuintile): number {
  const targets = {
    Q1_low: 0.50,
    Q2: 0.35,
    Q3_medium: 0.35,
    Q4: 0.35,
    Q5_high: 0.50,
  };
  return targets[quintile];
}

/**
 * Format operational health report as text
 *
 * @param metrics - Operational health metrics
 * @returns Formatted report string
 */
export function formatOperationalHealthReport(metrics: OperationalHealthMetrics): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('OPERATIONAL HEALTH METRICS (Formative Assessment Mode)');
  lines.push('='.repeat(80));

  // PRIMARY KPIS
  lines.push('');
  lines.push('PRIMARY KPIS:');
  lines.push('─'.repeat(80));

  const apStatus = metrics.actionablePrecisionRate >= 90 ? '✓' : '✗';
  lines.push(
    `  Actionable Precision Rate:  ${metrics.actionablePrecisionRate.toFixed(1)}% ${apStatus} (target: >90%)`
  );

  const rrStatus = metrics.rescueRate < 30 ? '✓' : '✗';
  lines.push(
    `  Rescue Rate:                ${metrics.rescueRate.toFixed(1)}% ${rrStatus} (target: <30%)`
  );

  const crStatus = metrics.crashRate < 1 ? '✓' : '✗';
  lines.push(
    `  Crash Rate:                 ${metrics.crashRate.toFixed(1)}% ${crStatus} (target: <1%)`
  );

  // SUPPORTING METRICS
  lines.push('');
  lines.push('SUPPORTING METRICS:');
  lines.push('─'.repeat(80));
  lines.push(`  Total Students:             ${metrics.totalStudents}`);
  lines.push(`  Total Questions:            ${metrics.totalQuestions.toFixed(0)}`);
  lines.push(`  Avg Questions/Student:      ${metrics.avgQuestionsPerStudent.toFixed(1)}`);
  lines.push(`  Avg SEM:                    ${metrics.avgSEM.toFixed(3)}`);

  // QUINTILE BREAKDOWN
  lines.push('');
  lines.push('QUINTILE BREAKDOWN (Formative Mode Targets):');
  lines.push('─'.repeat(80));
  lines.push(
    '  Quintile        Count   Avg SEM   Target   Status   Rescues   Step1   Step2   Step3   Step4'
  );
  lines.push('─'.repeat(80));

  metrics.quintileBreakdown.forEach(q => {
    const status = q.achievedTarget ? 'PASS' : 'FAIL';
    const statusSymbol = q.achievedTarget ? '✓' : '✗';

    // Special handling for Q1/Q5 with high SEMs (information limits)
    let displayStatus = status;
    if ((q.quintile === 'Q1_low' || q.quintile === 'Q5_high') && q.avgSEM > q.targetSEM) {
      displayStatus = 'ACCEPTABLE';  // Information scarcity is expected
    }

    lines.push(
      `  ${q.quintile.padEnd(15)} ${q.count.toString().padStart(5)}   ` +
        `${q.avgSEM.toFixed(3)}   ${q.targetSEM.toFixed(2)}   ` +
        `${displayStatus.padEnd(6)} ${statusSymbol}   ` +
        `${q.rescues.total.toString().padStart(7)}   ` +
        `${q.rescues.step1.toString().padStart(5)}   ` +
        `${q.rescues.step2.toString().padStart(5)}   ` +
        `${q.rescues.step3.toString().padStart(5)}   ` +
        `${q.rescues.step4.toString().padStart(5)}`
    );
  });

  // SYSTEM HEALTH ALERTS
  lines.push('');
  lines.push('SYSTEM HEALTH ALERTS:');
  lines.push('─'.repeat(80));

  metrics.alerts.forEach(alert => {
    const symbol = alert.level === 'ok' ? '✓' : alert.level === 'warning' ? '⚠' : '✗';
    const levelStr = alert.level.toUpperCase().padEnd(8);
    lines.push(`  [${symbol}] ${levelStr} ${alert.message}`);
  });

  lines.push('='.repeat(80));

  return lines.join('\n');
}

/**
 * Check if operational health is acceptable
 *
 * @param metrics - Operational health metrics
 * @returns true if all critical thresholds are met
 */
export function isOperationalHealthAcceptable(metrics: OperationalHealthMetrics): boolean {
  // Check critical thresholds
  const actionablePrecisionOK = metrics.actionablePrecisionRate >= 90;
  const rescueRateOK = metrics.rescueRate < 30;
  const crashRateOK = metrics.crashRate < 1;

  // All must pass for acceptable health
  return actionablePrecisionOK && rescueRateOK && crashRateOK;
}

/**
 * Compare operational health between two configurations
 *
 * @param baseline - Baseline metrics (e.g., Phase 3)
 * @param current - Current metrics (e.g., Phase 4)
 * @returns Comparison report
 */
export function compareOperationalHealth(
  baseline: OperationalHealthMetrics,
  current: OperationalHealthMetrics
): {
  improvements: string[];
  regressions: string[];
  summary: string;
} {
  const improvements: string[] = [];
  const regressions: string[] = [];

  // Actionable Precision
  const apDiff = current.actionablePrecisionRate - baseline.actionablePrecisionRate;
  if (Math.abs(apDiff) > 1) {
    if (apDiff > 0) {
      improvements.push(
        `Actionable precision improved by ${apDiff.toFixed(1)}% (${baseline.actionablePrecisionRate.toFixed(1)}% → ${current.actionablePrecisionRate.toFixed(1)}%)`
      );
    } else {
      regressions.push(
        `Actionable precision decreased by ${Math.abs(apDiff).toFixed(1)}% (${baseline.actionablePrecisionRate.toFixed(1)}% → ${current.actionablePrecisionRate.toFixed(1)}%)`
      );
    }
  }

  // Rescue Rate (lower is better)
  const rrDiff = current.rescueRate - baseline.rescueRate;
  if (Math.abs(rrDiff) > 1) {
    if (rrDiff < 0) {
      improvements.push(
        `Rescue rate reduced by ${Math.abs(rrDiff).toFixed(1)}% (${baseline.rescueRate.toFixed(1)}% → ${current.rescueRate.toFixed(1)}%)`
      );
    } else {
      regressions.push(
        `Rescue rate increased by ${rrDiff.toFixed(1)}% (${baseline.rescueRate.toFixed(1)}% → ${current.rescueRate.toFixed(1)}%)`
      );
    }
  }

  // Crash Rate
  const crDiff = current.crashRate - baseline.crashRate;
  if (Math.abs(crDiff) > 0.1) {
    if (crDiff < 0) {
      improvements.push(
        `Crash rate reduced by ${Math.abs(crDiff).toFixed(1)}% (${baseline.crashRate.toFixed(1)}% → ${current.crashRate.toFixed(1)}%)`
      );
    } else if (crDiff > 0) {
      regressions.push(
        `Crash rate increased by ${crDiff.toFixed(1)}% (${baseline.crashRate.toFixed(1)}% → ${current.crashRate.toFixed(1)}%)`
      );
    }
  }

  // Summary
  let summary = '';
  if (improvements.length > regressions.length) {
    summary = `✓ Overall improvement: ${improvements.length} metrics improved, ${regressions.length} regressed`;
  } else if (regressions.length > improvements.length) {
    summary = `✗ Overall regression: ${regressions.length} metrics regressed, ${improvements.length} improved`;
  } else {
    summary = `~ Mixed results: ${improvements.length} improvements, ${regressions.length} regressions`;
  }

  return {
    improvements,
    regressions,
    summary,
  };
}
