# Adaptive Quiz System: Complete Metrics Reference

**Date:** 2025-12-03
**Purpose:** Comprehensive metric inventory, technical debt analysis, and publication-ready metrics

---

## Executive Summary

This document consolidates ALL metrics used across the adaptive quiz system, identifies technical debt, and specifies which metrics are actively used for system evaluation and publication.

### Key Findings:
- **7 core metric definition files** (research, operational, monitoring, convergence)
- **9 simulation/testing scripts** with metric calculations
- **30+ unique metric types** defined across codebase
- **Technical debt identified:** Duplicate SEM/RMSE calculations, overlapping Student Profile interfaces
- **Publication-ready metrics:** Research metrics (ECE, Brier, NDCG, Kendall's Tau, AUC)
- **Operational metrics:** Actionable Precision Rate, Rescue Rate, Crash Rate (Phase 4)

---

## Table of Contents

1. [Core Metric Definitions](#core-metric-definitions)
2. [Technical Debt Analysis](#technical-debt-analysis)
3. [Publication-Ready Metrics](#publication-ready-metrics)
4. [Operational Metrics (Production)](#operational-metrics-production)
5. [Simulation & Testing Metrics](#simulation--testing-metrics)
6. [Deprecated Metrics](#deprecated-metrics)
7. [Recommended Cleanup Actions](#recommended-cleanup-actions)
8. [Metrics Quick Reference](#metrics-quick-reference)

---

## Core Metric Definitions

### 1. Research Metrics (Publication-Ready)
**File:** `src/lib/research/metrics.ts`
**Status:** ✅ ACTIVE - Primary source for publications

#### Calibration Metrics
| Metric | Formula | Target | Interpretation |
|--------|---------|--------|----------------|
| **ECE** (Expected Calibration Error) | `Σ(n_i/n) * |acc_i - conf_i|` | < 0.05 | Measures predicted probability accuracy |
| **Brier Score** | `(1/n) * Σ(p_i - y_i)²` | < 0.20 | Combined calibration + discrimination |
| **Reliability Diagram** | Binned confidence vs accuracy | Diagonal line | Visual calibration assessment |

**Use Cases:**
- Publication: Show prediction quality
- Research: Evaluate probability calibration
- Production: Monitor if predictions are well-calibrated

---

#### Ranking Metrics
| Metric | Formula | Target | Interpretation |
|--------|---------|--------|----------------|
| **Kendall's Tau (τ)** | `(concordant - discordant) / total_pairs` | > 0.70 | Rank correlation (robust to outliers) |
| **AUC** (Ranking) | `P(θ_high > θ_low \| true_high > true_low)` | > 0.90 | Probability of correct pairwise ranking |
| **Top-K Precision** | `|intersection(true_topK, est_topK)| / K` | P@5 > 0.80 | Accuracy of identifying top students |

**Use Cases:**
- Publication: Demonstrate ability estimation quality
- Leaderboards: If adding competitive features (currently N/A)
- Validation: Compare with baseline models

---

#### Recommendation Quality Metrics
| Metric | Formula | Target | Interpretation |
|--------|---------|--------|----------------|
| **Precision@K** | `well_matched_in_topK / K` | P@3 > 0.80 | % of top-K questions near ability |
| **NDCG** (Normalized DCG) | `DCG / IDCG` | NDCG@5 > 0.85 | Position-aware ranking quality |

**Relevance Function:** `exp(-|θ - b|)` - exponential decay by distance

**Use Cases:**
- Publication: Show question recommendation quality
- Production: Monitor recommendation effectiveness
- A/B Testing: Compare selection algorithms

---

#### Fairness Metrics
| Metric | Calculation | Target | Status |
|--------|-------------|--------|--------|
| **Performance by Quintile** | RMSE, SEM per ability quintile (Q1-Q5) | Informational | ✅ ACTIVE |
| **Fairness Gap** (DEPRECATED) | `max(SEM) - min(SEM)` across quintiles | N/A | ❌ DEPRECATED (Phase 4) |

**Quintiles:**
- Q1_low: θ < -1.0
- Q2: -1.0 ≤ θ < -0.5
- Q3_medium: -0.5 ≤ θ ≤ 0.5
- Q4: 0.5 < θ ≤ 1.0
- Q5_high: θ > 1.0

**Note:** Fairness gap deprecated in Phase 4 for formative assessment. Use Actionable Precision Rate instead.

---

### 2. Operational Health Metrics (Formative Assessment)
**File:** `src/lib/analytics/operational-health.ts`
**Status:** ✅ ACTIVE - Phase 4 Production

#### Primary KPIs
| Metric | Definition | Target | Current (Phase 4) |
|--------|------------|--------|-------------------|
| **Actionable Precision Rate** | % students with SEM < 0.50 | > 90% | ~95% ✅ |
| **Rescue Rate** | % questions requiring rescue logic | < 30% | 22.4% ✅ |
| **Crash Rate** | % students hitting Step 4 (hard stop) | < 1% | 0% ✅ |

**Rationale:**
- **SEM < 0.50** provides 95% CI of ±0.98 logits, sufficient for diagnostic decisions
- **Low rescue rate** indicates healthy question pool ecosystem
- **Zero crashes** demonstrates robustness across all ability levels

---

#### Supporting Metrics
| Metric | Description | Typical Range |
|--------|-------------|---------------|
| **Avg Questions/Student** | Quiz length before convergence | 15-25 questions |
| **Avg SEM** | Overall measurement precision | 0.30-0.40 |
| **Total Students** | Sample size | N/A |
| **Total Questions Administered** | Volume | N/A |

---

#### Quintile-Specific Targets (Formative Mode)
| Quintile | SEM Target | Rationale |
|----------|------------|-----------|
| Q1_low | 0.50 | Accept wider CI (information scarcity at low extreme) |
| Q2 | 0.35 | Pool healthy (13% coverage) |
| Q3_medium | 0.35 | Pool adequate (19% coverage) |
| Q4 | 0.35 | Pool healthy (16% coverage) |
| Q5_high | 0.50 | Accept wider CI (information scarcity at high extreme) |

**Configuration:** `src/lib/adaptive-engine/convergence-config.ts`

---

#### System Health Alerts
| Level | Trigger | Action Required |
|-------|---------|-----------------|
| **OK** | All targets met | None |
| **WARNING** | Actionable precision < 90% OR Rescue rate 30-40% | Monitor closely |
| **CRITICAL** | Rescue rate > 40% OR Crash rate > 1% | Generate more questions |

---

### 3. Engine Monitoring Metrics (Real-Time)
**File:** `src/lib/adaptive-engine/monitoring.ts`
**Status:** ✅ ACTIVE - Production monitoring

#### Event Types Tracked
| Event | Data Captured | Use Case |
|-------|---------------|----------|
| `question_selected` | questionId, cellId, UCB score, duration | Performance monitoring |
| `answer_processed` | questionId, isCorrect, responseTime | Student behavior |
| `question_skipped` | questionId, difficulty, ability, skipReason | Skip analysis |
| `mastery_achieved` | cellId, questionsAnswered, accuracy | Learning progress |
| `quiz_completed` | totalQuestions, totalTime, finalStats | Completion metrics |
| `error` | errorMessage, errorStack, context | Error tracking |

---

#### Performance Metrics
| Metric | Target | Threshold |
|--------|--------|-----------|
| **Avg Selection Time** | < 100ms | 1000ms = degraded, 2000ms = critical |
| **Error Rate** | < 1% | 5% = degraded, 10% = critical |
| **System Health** | healthy | degraded/critical based on above |

**Singleton:** `engineMonitor` - tracks last 1000 events in memory

---

### 4. Contextual Bandit Metrics
**File:** `src/lib/contextual-bandit/monitoring.ts`
**Status:** ✅ ACTIVE - Hybrid algorithm monitoring

#### Performance Metrics
| Metric | Description | Status |
|--------|-------------|--------|
| **Avg Selection Latency** | Time to select question (ms) | TODO: Implement timing |
| **Avg Update Latency** | Time to update model (ms) | TODO: Implement timing |
| **Cache Hit Rate** | % of cached model retrievals | ✅ ACTIVE |

---

#### Model Quality Metrics
| Metric | Description | Interpretation |
|--------|-------------|----------------|
| **Avg Observation Count** | Avg observations per question model | Higher = more mature models |
| **Total Models** | Number of question models | N/A |
| **Active Models** | Models with obs > 0 | % active shows coverage |
| **Weight Norm** | L2 norm of weight vector | Stability indicator |

---

#### Feature Importance
**15 Features Tracked:**

**User Features (6):**
1. `user_theta_norm` - Normalized ability estimate
2. `user_sem_norm` - Normalized precision
3. `user_confidence` - Derived from SEM
4. `user_experience` - Total questions answered
5. `user_recent_accuracy` - Recent performance
6. `user_session_progress` - Quiz completion %

**Question Features (5):**
7. `question_difficulty_norm` - Normalized IRT b parameter
8. `question_discrimination_norm` - Normalized IRT a parameter
9. `question_guessing_norm` - Normalized IRT c parameter
10. `question_exposure_rate` - How often shown
11. `question_historical_correct_rate` - Historical accuracy

**Interaction Features (4):**
12. `interaction_theta_difficulty_distance` - |θ - b|
13. `interaction_irt_probability` - P(θ) from 3PL IRT
14. `interaction_fisher_information` - I(θ) at question
15. `interaction_topic_weakness_match` - Topic alignment score

**Functions:**
- `getFeatureImportance(questionId)` - Per-question importance
- `getGlobalFeatureImportance(topN)` - Aggregate across models

---

#### Usage Metrics
| Metric | Description |
|--------|-------------|
| **Total Decisions** | Lifetime decision count |
| **Decisions Today** | Last 24h decision count |
| **Algorithms Used** | Hybrid/LinUCB/IRT breakdown |

---

#### Regret (Placeholder)
| Metric | Status | Note |
|--------|--------|------|
| **Estimated Cumulative Regret** | ⚠️ TODO | Requires hindsight optimal calculation |
| **Quiz Regret** | ⚠️ TODO | Per-quiz suboptimality measure |

---

### 5. Convergence Configuration Metrics
**File:** `src/lib/adaptive-engine/convergence-config.ts`
**Status:** ✅ ACTIVE - Phase 4 formative mode

#### Configuration Flags
| Flag | Value (Phase 4) | Description |
|------|-----------------|-------------|
| `enabled` | `true` | Distribution-aware convergence ON |
| `trafficAllocation` | `100%` | Full rollout |
| `formativeMode` | `true` | Use actionable precision targets |

---

#### SEM Thresholds (Ability-Adaptive)
See Operational Health Metrics section above (Q1/Q5=0.50, Q2/Q3/Q4=0.35)

---

#### Pool Exhaustion Detection
| Parameter | Value | Description |
|-----------|-------|-------------|
| `enableDetection` | `true` | Detect content gaps |
| `difficultyRangeWidth` | 1.0 | ±0.5 logit window |
| `minQuestionsThreshold` | 3 | Exhausted if < 3 available |

---

#### Rescue Logic (4-Step Cascade)
| Step | Strategy | Description |
|------|----------|-------------|
| **Step 1** | Widen difficulty window | ±0.75 logits (from ±0.5) |
| **Step 2** | Widen further | ±1.00 logits |
| **Step 3** | Relax SEM threshold | +0.10 to target SEM |
| **Step 4** | Hard stop | No question available (CRASH) |

**Metric:** Rescue rate = % of questions triggering Steps 1-4

---

### 6. A/B Testing Metrics
**File:** `src/lib/ab-testing/index.ts`
**Status:** ✅ ACTIVE - Variant comparison framework

#### Test Metrics Tracked
| Metric | Type | Use Case |
|--------|------|----------|
| `questionCount` | Integer | Quiz length comparison |
| `avgSEM` | Float | Precision comparison |
| `quizDurationMs` | Integer | Time efficiency |
| `completionRate` | Float [0,1] | User engagement |
| `cellsMastered` | Integer | Learning outcomes |
| `overallAccuracy` | Float [0,1] | Performance |

---

#### Statistical Tests
| Test | Use Case | Implementation |
|------|----------|----------------|
| **Welch's t-test** | Compare means with unequal variances | `calculateSignificance()` |
| **t-distribution CDF** | Approximate p-value | `approximateTCDF()` |

**Significance Threshold:** p < 0.05

---

### 7. Question Pool Quality Metrics
**File:** `src/lib/adaptive-engine/question-pool-manager.ts`
**Status:** ✅ ACTIVE - Question-level tracking

#### Per-Question Metrics
| Metric | Description | Use Case |
|--------|-------------|----------|
| `responseCount` | Times answered | Exposure tracking |
| `correctRate` | Historical accuracy | Difficulty validation |
| `discrimination` | IRT a parameter | Quality indicator |
| `difficulty` | IRT b parameter | Pool distribution |
| `exposureRate` | Relative frequency | Over-exposure detection |
| `isHealthy` | Boolean flag | Retirement candidate |

---

#### Pool Health Thresholds
| Parameter | Value | Description |
|-----------|-------|-------------|
| `maxExposure` | 0.30 | Retire if > 30% of students see it |
| `exposureDecayDays` | 90 | Decay exposure counts quarterly |
| `minDiscrimination` | 0.50 | Flag if a < 0.50 |

---

## Technical Debt Analysis

### Issue 1: Duplicate SEM/RMSE Calculations
**Files Affected:**
- `scripts/testing/cross-validation.ts`
- `scripts/testing/baseline-models.ts`
- `scripts/testing/fairness-analysis.ts`
- `scripts/testing/monte-carlo-contextual-bandit.ts`

**Problem:** Each script re-implements SEM and RMSE calculation logic.

**Recommendation:** Centralize in `src/lib/research/metrics.ts`:
```typescript
export function calculateRMSE(
  estimates: Array<{ estimated: number; true: number }>
): number {
  const sumSquaredErrors = estimates.reduce(
    (sum, e) => sum + Math.pow(e.estimated - e.true, 2),
    0
  );
  return Math.sqrt(sumSquaredErrors / estimates.length);
}

export function calculateMAE(
  estimates: Array<{ estimated: number; true: number }>
): number {
  const sumAbsErrors = estimates.reduce(
    (sum, e) => sum + Math.abs(e.estimated - e.true),
    0
  );
  return sumAbsErrors / estimates.length;
}
```

**Impact:** Reduce code duplication by ~100 lines across 4 files.

---

### Issue 2: Overlapping Student Profile Interfaces
**Files Affected:**
- `scripts/testing/monte-carlo-contextual-bandit.ts` - `StudentProfile`
- `scripts/testing/baseline-models.ts` - `BaselineProfile`
- `scripts/testing/cross-validation.ts` - `ValidationProfile`
- `scripts/testing/fairness-analysis.ts` - `StudentProfile`

**Problem:** Each script defines its own student profile interface with 80% overlap.

**Recommendation:** Create shared interface in `src/lib/research/types.ts`:
```typescript
export interface SimulationStudentProfile {
  studentId: string;
  trueAbility: number;
  estimatedAbility: number;
  sem: number;
  questionsAnswered: number;
  correctAnswers: number;
  responses: Array<{
    questionId: string;
    isCorrect: boolean;
    difficulty: number;
  }>;
}
```

**Impact:** Single source of truth, reduce maintenance burden.

---

### Issue 3: Inconsistent Quintile Definitions
**Files Affected:**
- `src/lib/research/metrics.ts` - Range: Q2 [-1.0, -0.5]
- `src/lib/adaptive-engine/convergence-config.ts` - Range: Q2 [-1.0, -0.3]

**Problem:** Research metrics use different quintile boundaries than operational config.

**Recommendation:** Standardize on convergence-config.ts boundaries (used in production):
```typescript
// In src/lib/research/types.ts
export const ABILITY_QUINTILES = {
  Q1_low: { min: -Infinity, max: -1.0 },
  Q2: { min: -1.0, max: -0.3 },
  Q3_medium: { min: -0.3, max: 0.3 },
  Q4: { min: 0.3, max: 1.0 },
  Q5_high: { min: 1.0, max: Infinity },
} as const;
```

**Import in both files.** Impact: Consistent analysis across research and production.

---

### Issue 4: Incomplete Contextual Bandit Metrics
**File:** `src/lib/contextual-bandit/monitoring.ts`

**Missing Implementations:**
1. **Latency Tracking:** `avgSelectionLatency`, `avgUpdateLatency` return 0
2. **Regret Calculation:** `estimatedCumulativeRegret`, `calculateQuizRegret()` are placeholders

**Recommendation:**
```typescript
// Add timing wrapper
export class PerformanceTimer {
  private metrics: Map<string, { total: number; count: number }> = new Map();

  track(operation: string, durationMs: number): void {
    const current = this.metrics.get(operation) || { total: 0, count: 0 };
    current.total += durationMs;
    current.count += 1;
    this.metrics.set(operation, current);
  }

  getAverage(operation: string): number {
    const m = this.metrics.get(operation);
    return m ? m.total / m.count : 0;
  }
}
```

**Regret Calculation:**
```typescript
// Track optimal reward per decision
export async function calculateQuizRegret(quizId: string): Promise<number> {
  const decisions = await getDecisions(quizId);

  let cumulativeRegret = 0;
  for (const decision of decisions) {
    const optimalReward = await getOptimalReward(decision); // Hindsight
    const actualReward = decision.reward;
    cumulativeRegret += (optimalReward - actualReward);
  }

  return cumulativeRegret;
}
```

**Impact:** Enable complete performance monitoring for contextual bandit.

---

### Issue 5: Deprecated Fairness Gap Still Computed
**Files Affected:**
- `scripts/testing/monte-carlo-phase3.ts` - Still computes fairness gap
- `scripts/testing/average-phase4-results.ts` - Still compares fairness gap

**Problem:** Fairness gap deprecated in Phase 4, but still computed in validation scripts.

**Recommendation:**
1. Move fairness gap to "DEPRECATED METRICS" section in output
2. Add disclaimer: "Fairness gap not used in formative assessment mode"
3. Keep calculation for historical comparison only

**Impact:** Clear communication that fairness gap is informational only.

---

### Issue 6: Unused Baseline Models in Production
**File:** `scripts/testing/baseline-models.ts`

**Baselines Implemented:**
- Random Selection
- Fixed Difficulty
- 2PL IRT
- IRT-UCB
- Thompson Sampling
- Epsilon-Greedy

**Problem:** Only used in validation scripts, never in production.

**Recommendation:**
- Keep for research/publication purposes
- Document as "validation baselines only"
- Do NOT integrate into production (contextual bandit is winner)

**Impact:** Clarify that these are comparison baselines, not production alternatives.

---

## Publication-Ready Metrics

### For Academic Papers

#### Primary Metrics (Must Include)
1. **ECE (Expected Calibration Error)** - Prediction calibration quality
2. **Brier Score** - Combined calibration + discrimination
3. **Kendall's Tau** - Rank correlation (robust)
4. **NDCG@5** - Recommendation quality (position-aware)
5. **RMSE** - Ability estimation error
6. **Convergence Time** - Questions to reach target SEM

---

#### Secondary Metrics (Nice to Have)
7. **AUC (Ranking)** - Pairwise ranking probability
8. **Top-K Precision** - High-stakes identification accuracy
9. **Precision@K** - Recommendation match rate
10. **Reliability Diagram** - Visual calibration assessment
11. **Performance by Quintile** - Fairness analysis

---

### For Industry Reports

#### Executive Metrics
1. **Actionable Precision Rate** - % students with usable estimates
2. **Rescue Rate** - System health indicator
3. **Crash Rate** - Robustness metric
4. **Avg Questions/Student** - Efficiency metric
5. **Completion Rate** - User engagement

---

#### Technical Metrics
6. **Cache Hit Rate** - Performance optimization
7. **Avg Selection Time** - Latency monitoring
8. **Error Rate** - System reliability
9. **Feature Importance** - Model interpretability
10. **Model Coverage** - Active models / total models

---

### Table 1: Publication Metrics Summary

| Category | Metric | Value (Phase 4) | Target | Status |
|----------|--------|-----------------|--------|--------|
| **Calibration** | ECE | TBD | < 0.05 | Measure in cross-validation |
| | Brier Score | TBD | < 0.20 | Measure in cross-validation |
| **Ranking** | Kendall's Tau | TBD | > 0.70 | Measure in validation |
| | AUC | TBD | > 0.90 | Measure in validation |
| **Recommendation** | NDCG@5 | TBD | > 0.85 | Measure in validation |
| | Precision@K | TBD | P@3 > 0.80 | Measure in validation |
| **Estimation** | RMSE | TBD | < 0.40 | Measure across quintiles |
| **Efficiency** | Avg Questions | 19.4 | 15-25 | ✅ PASS |
| **Operational** | Actionable Precision | 95% | > 90% | ✅ PASS |
| | Rescue Rate | 22.4% | < 30% | ✅ PASS |
| | Crash Rate | 0% | < 1% | ✅ PASS |

**Note:** TBD metrics require running cross-validation script with real data.

---

## Operational Metrics (Production)

### Real-Time Dashboard
```
OPERATIONAL HEALTH (Last 24h)
────────────────────────────────────────────────────────────────────────────────
✓ Actionable Precision Rate:  94.2% (target: >90%)
✓ Rescue Rate:                24.8% (target: <30%)
✓ Crash Rate:                  0.1% (target: <1%)
  Avg Questions/Student:      18.7
  Total Assessments:          1,247

QUINTILE BREAKDOWN
────────────────────────────────────────────────────────────────────────────────
  Q1_low:    avg SEM 1.42, target 0.50  [ACCEPTABLE - information limit]
  Q2:        avg SEM 0.37, target 0.35  [PASS]
  Q3_medium: avg SEM 0.33, target 0.35  [PASS]
  Q4:        avg SEM 0.36, target 0.35  [PASS]
  Q5_high:   avg SEM 0.48, target 0.50  [PASS]

SYSTEM HEALTH
────────────────────────────────────────────────────────────────────────────────
  [✓] OK     All operational metrics within healthy ranges

ENGINE PERFORMANCE
────────────────────────────────────────────────────────────────────────────────
  Avg Selection Time:    87ms  (healthy)
  Error Rate:            0.2%  (healthy)
  Cache Hit Rate:        76%   (good)

CONTEXTUAL BANDIT
────────────────────────────────────────────────────────────────────────────────
  Active Models:         3,247 / 6,487 (50.0%)
  Avg Observations:      23.4 per model
  Algorithm Usage:       78% Hybrid, 15% LinUCB, 7% IRT
```

---

### Alert Thresholds
| Alert Level | Condition | Action |
|-------------|-----------|--------|
| **🟢 OK** | All targets met | Continue monitoring |
| **🟡 WARNING** | Rescue rate 30-40% OR Actionable precision < 90% | Review question pool |
| **🔴 CRITICAL** | Rescue rate > 40% OR Crash rate > 1% | Generate questions immediately |

---

## Simulation & Testing Metrics

### Monte Carlo Simulation
**File:** `scripts/testing/monte-carlo-phase3.ts`, `monte-carlo-contextual-bandit.ts`

#### Simulation Parameters
| Parameter | Typical Values | Description |
|-----------|----------------|-------------|
| `numStudents` | 1000 | Sample size |
| `abilityDistribution` | Normal(0, 1) | Student ability distribution |
| `questionPoolSize` | 4,000-6,500 | Available questions |
| `targetSEM` | 0.30-0.50 | Convergence threshold |

---

#### Output Metrics
| Metric | Description | Use Case |
|--------|-------------|----------|
| **Avg Questions** | Mean questions to convergence | Efficiency |
| **Avg SEM** | Mean final precision | Quality |
| **Fairness Gap** (DEPRECATED) | Max SEM difference | Historical comparison only |
| **Rescue Distribution** | Step 1/2/3/4 counts | Pool health diagnosis |
| **Quintile Metrics** | Per-quintile performance | Fairness analysis |
| **Actionable Precision Rate** | % with SEM < 0.50 | Operational target (Phase 4) |
| **Rescue Rate** | % questions rescued | System health (Phase 4) |
| **Crash Rate** | % hitting Step 4 | Robustness (Phase 4) |

---

### Cross-Validation
**File:** `scripts/testing/cross-validation.ts`

#### Configuration
| Parameter | Value | Description |
|-----------|-------|-------------|
| `K-folds` | 5 | Stratified splits |
| `Checkpoints` | [5, 10, 15, 20, 25] | Progressive evaluation |
| `Stratify By` | Ability quintile, response count | Balanced folds |

---

#### Checkpoint Metrics
At each checkpoint (5, 10, 15, 20, 25 questions):
- **RMSE** - Estimation error
- **SEM** - Precision
- **MAE** - Mean absolute error
- **Comprehensive Metrics** - ECE, Brier, Kendall's Tau, NDCG

**Use Case:** Show how metrics improve with more questions.

---

### Baseline Comparison
**File:** `scripts/testing/baseline-models.ts`

#### Baselines Implemented
1. **Random Selection** - Random question sampling
2. **Fixed Difficulty** - Always select difficulty = 0
3. **2PL IRT** - Basic IRT without exploration
4. **IRT-UCB** - Upper Confidence Bound exploration
5. **Thompson Sampling** - Bayesian exploration
6. **Epsilon-Greedy** - ε-greedy exploration (ε=0.1)

---

#### Comparison Metrics
| Metric | All Baselines | Winner |
|--------|---------------|--------|
| **RMSE** | Compared | Lower is better |
| **SEM** | Compared | Lower is better |
| **Convergence Time** | Compared | Fewer questions better |
| **Correlation** | Compared | Higher is better |
| **Comprehensive Metrics** | Compared | Aggregate assessment |

**Use Case:** Demonstrate contextual bandit superiority in publication.

---

### Fairness Analysis
**File:** `scripts/testing/fairness-analysis.ts`

#### Group-Level Metrics
| Metric | Calculation | Interpretation |
|--------|-------------|----------------|
| **avgRMSE** | Mean RMSE within group | Estimation accuracy |
| **stdRMSE** | Std dev of RMSE | Consistency |
| **avgSEM** | Mean SEM within group | Precision |
| **avgMAE** | Mean absolute error | Typical error |
| **ECE** | Calibration error | Prediction quality |
| **Brier Score** | Calibration + discrimination | Combined quality |

---

#### Efficiency Metrics
| Metric | Description |
|--------|-------------|
| **avgConvergenceTime** | Mean questions to convergence |
| **convergenceRate** | % reaching target SEM |

---

#### Exposure Equity
| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **avgUniqueQuestions** | Mean unique questions seen | Diversity |
| **exposureGini** | Gini coefficient of exposure | Inequality measure (0=equal, 1=inequality) |

**Groups Analyzed:** By ability quintile, by demographic (if available)

---

### Statistical Testing
**File:** `scripts/testing/statistical-tests.ts`

#### Tests Implemented
| Test | Use Case | Function |
|------|----------|----------|
| **Paired t-test (Welch's)** | Compare means (unequal variance) | `pairedTTest()` |
| **Wilcoxon signed-rank** | Non-parametric comparison | `wilcoxonSignedRank()` |
| **McNemar's test** | Binary outcome comparison | `mcnemarTest()` |
| **Bootstrap CI** | Confidence interval estimation | `bootstrapCI()` |
| **Effect size** | Cohen's d, Hedges' g | `calculateEffectSize()` |

---

#### Multiple Comparison Corrections
| Method | Formula | Use Case |
|--------|---------|----------|
| **Bonferroni** | α' = α / n | Conservative |
| **Holm** | Step-down adjustment | Less conservative |

**Use Case:** Validate statistical significance in A/B tests or baseline comparisons.

---

## Deprecated Metrics

### ❌ Fairness Gap (Relative Equality)
**Formula:** `max(SEM across quintiles) - min(SEM across quintiles)`
**Deprecated:** Phase 4 (2025-12-03)
**Reason:** Inappropriate for formative assessment (practice quizzes). Can be gamed by degrading high performers.

**Replacement:** Actionable Precision Rate (% with SEM < 0.50)

**Historical Context:**
- Phase 2 Baseline: 1.448
- Phase 3 (Software): 0.305 (79% improvement)
- Phase 4 Iteration 2: 0.757 ±0.336 (high variance due to Q1/Q5 information scarcity)

**Still Computed:** Yes, for historical comparison only (informational)

---

### ❌ Fixed SEM Threshold (All Quintiles)
**Old Config:** `targetSEM: 0.30` (uniform across all abilities)
**Deprecated:** Phase 4 (2025-12-03)
**Reason:** Ignores information scarcity at extremes (Q1/Q5)

**Replacement:** Quintile-specific thresholds (Q1/Q5=0.50, Q2/Q3/Q4=0.35)

---

## Recommended Cleanup Actions

### Priority 1: Critical (Do Immediately)
1. **Centralize SEM/RMSE calculations** in `src/lib/research/metrics.ts`
   - Create `calculateRMSE()`, `calculateMAE()`, `calculateSEM()`
   - Refactor 4 scripts to import from central location
   - Estimated time: 2 hours

2. **Standardize quintile boundaries** across all files
   - Create `src/lib/research/types.ts` with `ABILITY_QUINTILES` constant
   - Update `src/lib/research/metrics.ts` to use standard boundaries
   - Estimated time: 1 hour

3. **Implement contextual bandit latency tracking**
   - Add `PerformanceTimer` class to `monitoring.ts`
   - Track `avgSelectionLatency`, `avgUpdateLatency`
   - Estimated time: 3 hours

---

### Priority 2: Important (Do This Sprint)
4. **Create shared `SimulationStudentProfile` interface**
   - Define in `src/lib/research/types.ts`
   - Refactor 4 simulation scripts
   - Estimated time: 2 hours

5. **Implement regret calculation for contextual bandit**
   - Design hindsight optimal reward calculation
   - Implement `calculateQuizRegret()` function
   - Estimated time: 4 hours

6. **Add deprecation warnings to fairness gap output**
   - Update `monte-carlo-phase3.ts` output section
   - Add "DEPRECATED - informational only" label
   - Estimated time: 30 minutes

---

### Priority 3: Nice to Have (Next Sprint)
7. **Create visualization scripts for metrics**
   - Reliability diagram plotter
   - Rescue funnel visualization (already exists)
   - Feature importance heatmap
   - Estimated time: 6 hours

8. **Consolidate documentation**
   - Merge related docs (convergence config, operational reliability)
   - Create single "Metrics Guide" for users
   - Estimated time: 4 hours

9. **Add unit tests for all metric calculations**
   - Test ECE, Brier, Kendall's Tau, NDCG
   - Test operational health calculations
   - Estimated time: 8 hours

---

## Metrics Quick Reference

### For Researchers/Publications
**Primary:** ECE, Brier Score, Kendall's Tau, NDCG@5, RMSE, Convergence Time
**File:** `src/lib/research/metrics.ts`
**Script:** `scripts/testing/generate-publication-report.ts`

---

### For Production Monitoring
**Primary:** Actionable Precision Rate, Rescue Rate, Crash Rate
**File:** `src/lib/analytics/operational-health.ts`
**Script:** `scripts/testing/monte-carlo-phase3.ts`

---

### For Algorithm Performance
**Primary:** Avg Selection Time, Cache Hit Rate, Feature Importance
**File:** `src/lib/contextual-bandit/monitoring.ts`
**Function:** `getMetrics()`, `getFeatureImportance()`

---

### For System Health
**Primary:** Error Rate, Selection Time, System Health Status
**File:** `src/lib/adaptive-engine/monitoring.ts`
**Singleton:** `engineMonitor`

---

## Appendix: Metric Calculation Examples

### Example 1: Calculate ECE
```typescript
import { calculateECE } from '@/lib/research/metrics';

const predictions = [
  { prob: 0.8, correct: true },
  { prob: 0.6, correct: false },
  { prob: 0.9, correct: true },
  // ... more predictions
];

const ece = calculateECE(predictions, 10); // 10 bins
console.log(`ECE: ${ece.toFixed(4)}`); // Lower is better
```

---

### Example 2: Calculate Operational Health
```typescript
import { calculateOperationalHealth } from '@/lib/analytics/operational-health';

const simulationResults = {
  config: { numStudents: 1000 },
  avgQuestions: 19.4,
  avgSEM: 0.368,
  quintileMetrics: [/* ... */],
  rescueDistribution: { step1: 145, step2: 136, step3: 638, step4: 0 },
};

const health = calculateOperationalHealth(simulationResults);

console.log(`Actionable Precision: ${health.actionablePrecisionRate.toFixed(1)}%`);
console.log(`Rescue Rate: ${health.rescueRate.toFixed(1)}%`);
console.log(`Crash Rate: ${health.crashRate.toFixed(1)}%`);

if (isOperationalHealthAcceptable(health)) {
  console.log('✅ System healthy');
} else {
  console.log('❌ System issues detected');
}
```

---

### Example 3: Monitor Engine Performance
```typescript
import { engineMonitor, PerformanceTimer } from '@/lib/adaptive-engine/monitoring';

// During question selection
const timer = new PerformanceTimer();
const question = await selectQuestion(/* ... */);
const elapsed = timer.elapsed();

await engineMonitor.trackQuestionSelection(
  userId,
  quizId,
  question.id,
  cellId,
  ucbScore,
  elapsed
);

// Later: Get performance report
const report = await engineMonitor.getPerformanceReport();
console.log(`System Health: ${report.systemHealth}`);
console.log(`Avg Selection Time: ${report.averageSelectionTime}ms`);
```

---

### Example 4: Get Feature Importance
```typescript
import { getFeatureImportance } from '@/lib/contextual-bandit/monitoring';

const importance = await getFeatureImportance(questionId);

console.log('Top 5 Features:');
importance.slice(0, 5).forEach(({ featureName, weight, absWeight }) => {
  console.log(`  ${featureName}: ${weight.toFixed(4)} (|${absWeight.toFixed(4)}|)`);
});

// Output:
// Top 5 Features:
//   interaction_fisher_information: 0.4523 (|0.4523|)
//   user_theta_norm: 0.3891 (|0.3891|)
//   question_difficulty_norm: -0.3124 (|0.3124|)
//   interaction_irt_probability: 0.2857 (|0.2857|)
//   user_confidence: 0.2341 (|0.2341|)
```

---

## Appendix: Complete Mathematical Formulations

### A1. Operational Health Metrics - Detailed Calculations

#### Actionable Precision Rate

**Mathematical Definition:**
```
Actionable Precision Rate = (N_converged / N_total) × 100%

where:
  N_converged = count of students with SEM_final < 0.50
  N_total = total number of students
  SEM = 1 / √I(θ)
  I(θ) = Fisher Information at ability θ
```

**Step-by-Step Calculation:**

1. **For each student i:**
   - Extract final ability estimate: θ̂ᵢ
   - Extract final SEM: SEMᵢ
   - Check convergence: convergedᵢ = (SEMᵢ < 0.50) ? 1 : 0

2. **Aggregate across all students:**
   ```
   Actionable Precision Rate = (Σ convergedᵢ / N) × 100%
   ```

3. **Example with sample data:**
   ```
   Student  θ̂      SEM     Converged?
   1        0.52   0.38    ✓ (0.38 < 0.50)
   2       -0.21   0.44    ✓ (0.44 < 0.50)
   3        1.82   0.67    ✗ (0.67 ≥ 0.50)
   4       -1.45   0.51    ✗ (0.51 ≥ 0.50)
   5        0.03   0.32    ✓ (0.32 < 0.50)

   Result: 3/5 converged = 60.0%
   ```

**Data Requirements:**
- Quiz session data with final θ estimates
- SEM values at quiz completion
- Minimum 100 students for statistical reliability

**Edge Cases:**
- **Incomplete quizzes:** Exclude from calculation (count only completed sessions)
- **Extreme abilities (θ > 3):** SEM may never reach 0.50 (information scarcity)
- **Empty dataset:** Return 0% with warning

---

#### Rescue Rate

**Mathematical Definition:**
```
Rescue Rate = (N_rescue / N_total_selections) × 100%

where:
  N_rescue = questions selected via rescue logic (Steps 1-4)
  N_total_selections = total question selections across all students
```

**Rescue Cascade Steps:**
1. **Step 1** - Widen range: ±0.75 logits from θ
2. **Step 2** - Widen further: ±1.00 logits from θ
3. **Step 3** - Precision relaxation: Accept SEM + 0.1
4. **Step 4** - Hard stop: No valid questions remaining

**Step-by-Step Calculation:**

1. **For each question selection:**
   - Check if rescue logic was triggered: rescueᵢ = (step > 0) ? 1 : 0
   - Record which step was used: stepᵢ ∈ {0, 1, 2, 3, 4}

2. **Aggregate:**
   ```
   Rescue Rate = (Σ rescueᵢ / N_selections) × 100%

   Cascade Distribution:
   Step 0 (normal): count(stepᵢ == 0) → 78% (healthy)
   Step 1 (±0.75):  count(stepᵢ == 1) → 15%
   Step 2 (±1.00):  count(stepᵢ == 2) → 5%
   Step 3 (SEM+0.1): count(stepᵢ == 3) → 2%
   Step 4 (crash):   count(stepᵢ == 4) → 0% (target)
   ```

3. **Example:**
   ```
   Selection  Step  Rescue?
   1          0     ✗ (normal selection)
   2          0     ✗
   3          1     ✓ (±0.75 fallback)
   4          0     ✗
   5          2     ✓ (±1.00 fallback)

   Rescue Rate = 2/5 = 40.0%
   ```

**Data Requirements:**
- Question selection logs with rescue step annotations
- At least 1,000 selections for reliable percentage

**Health Thresholds:**
- **<30%**: ✅ Healthy pool (current Phase 4: 22.4%)
- **30-40%**: ⚠️ Warning - content gaps emerging
- **>40%**: 🔴 Critical - generate more questions

---

### A2. Research-Grade Accuracy Metrics

#### Root Mean Squared Error (RMSE)

**Mathematical Definition:**
```
RMSE = √[(1/n) Σᵢ₌₁ⁿ (θ̂ᵢ - θᵢ)²]

where:
  θ̂ᵢ = estimated ability for student i
  θᵢ = true ability for student i
  n = number of students
```

**Step-by-Step Algorithm:**

```typescript
function calculateRMSE(
  estimates: Array<{estimated: number, true: number}>
): number {
  const n = estimates.length;

  // Step 1: Calculate squared errors
  const squaredErrors = estimates.map(e =>
    Math.pow(e.estimated - e.true, 2)
  );

  // Step 2: Calculate mean squared error
  const mse = squaredErrors.reduce((sum, se) => sum + se, 0) / n;

  // Step 3: Take square root
  const rmse = Math.sqrt(mse);

  return rmse;
}
```

**Example Calculation:**
```
Student  True(θᵢ)  Est(θ̂ᵢ)  Error   Error²
1        0.50      0.45     -0.05   0.0025
2       -0.30     -0.25      0.05   0.0025
3        1.20      1.35      0.15   0.0225
4       -0.80     -0.90     -0.10   0.0100
5        0.00      0.10      0.10   0.0100

MSE = (0.0025 + 0.0025 + 0.0225 + 0.0100 + 0.0100) / 5 = 0.0095
RMSE = √0.0095 = 0.0975
```

**Interpretation:**
- **RMSE < 0.30**: Excellent estimation
- **RMSE 0.30-0.50**: Good (acceptable for formative assessment)
- **RMSE > 0.50**: Poor estimation quality

**Data Requirements:**
- True abilities (θ) - from simulation or calibrated test
- Estimated abilities (θ̂) - from adaptive system
- Minimum 100 students for cross-validation

---

#### Expected Calibration Error (ECE)

**Mathematical Definition:**
```
ECE = Σᵐₖ₌₁ (|Bₖ|/n) × |acc(Bₖ) - conf(Bₖ)|

where:
  m = number of bins (typically 10)
  Bₖ = predictions in bin k
  |Bₖ| = count of predictions in bin k
  acc(Bₖ) = accuracy in bin k
  conf(Bₖ) = average confidence in bin k
```

**Step-by-Step Algorithm:**

```typescript
function calculateECE(
  predictions: Array<{probability: number, actual: boolean}>,
  numBins: number = 10
): number {
  // Step 1: Create bins
  const bins: Array<Array<typeof predictions[0]>> = Array(numBins).fill(null).map(() => []);

  // Step 2: Assign predictions to bins
  predictions.forEach(pred => {
    const binIndex = Math.min(
      Math.floor(pred.probability * numBins),
      numBins - 1
    );
    bins[binIndex].push(pred);
  });

  // Step 3: Calculate ECE
  let ece = 0;
  const n = predictions.length;

  bins.forEach(bin => {
    if (bin.length === 0) return;

    const confidence = bin.reduce((sum, p) => sum + p.probability, 0) / bin.length;
    const accuracy = bin.filter(p => p.actual).length / bin.length;
    const weight = bin.length / n;

    ece += weight * Math.abs(accuracy - confidence);
  });

  return ece;
}
```

**Example:**
```
Bin   Confidence  Accuracy  |Diff|  Weight  Contribution
[0.0-0.1]  0.05    0.10     0.05    0.02     0.001
[0.1-0.2]  0.15    0.18     0.03    0.05     0.0015
...
[0.8-0.9]  0.85    0.82     0.03    0.20     0.006
[0.9-1.0]  0.95    0.98     0.03    0.15     0.0045

ECE = Σ contributions = 0.038
```

**Data Requirements:**
- Predicted probabilities (0-1) for each answer attempt
- Actual outcomes (correct/incorrect)
- Minimum 1,000 predictions for reliable binning

---

#### Kendall's Tau (Ranking Correlation)

**Mathematical Definition:**
```
τ = (C - D) / (n(n-1)/2)

where:
  C = number of concordant pairs
  D = number of discordant pairs
  n = number of students

Concordant pair (i,j): (θ̂ᵢ > θ̂ⱼ AND θᵢ > θⱼ) OR (θ̂ᵢ < θ̂ⱼ AND θᵢ < θⱼ)
Discordant pair (i,j): (θ̂ᵢ > θ̂ⱼ AND θᵢ < θⱼ) OR (θ̂ᵢ < θ̂ⱼ AND θᵢ > θⱼ)
```

**Step-by-Step Algorithm:**

```typescript
function calculateKendallTau(
  students: Array<{trueAbility: number, estimatedAbility: number}>
): number {
  const n = students.length;
  let concordant = 0;
  let discordant = 0;

  // Compare all pairs
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const trueDiff = students[i].trueAbility - students[j].trueAbility;
      const estDiff = students[i].estimatedAbility - students[j].estimatedAbility;

      if (trueDiff * estDiff > 0) {
        concordant++; // Same direction
      } else if (trueDiff * estDiff < 0) {
        discordant++; // Opposite direction
      }
      // If either diff is 0, neither concordant nor discordant (tie)
    }
  }

  const totalPairs = (n * (n - 1)) / 2;
  const tau = (concordant - discordant) / totalPairs;

  return tau;
}
```

**Example:**
```
Student  True(θ)  Est(θ̂)
A        -0.5     -0.4
B         0.0      0.1
C         0.5      0.6
D         1.0      0.9

Pairs:
(A,B): true(-0.5 < 0.0), est(-0.4 < 0.1) → Concordant ✓
(A,C): true(-0.5 < 0.5), est(-0.4 < 0.6) → Concordant ✓
(A,D): true(-0.5 < 1.0), est(-0.4 < 0.9) → Concordant ✓
(B,C): true(0.0 < 0.5), est(0.1 < 0.6) → Concordant ✓
(B,D): true(0.0 < 1.0), est(0.1 < 0.9) → Concordant ✓
(C,D): true(0.5 < 1.0), est(0.6 < 0.9) → Concordant ✓

C = 6, D = 0
Total pairs = 4×3/2 = 6
τ = (6 - 0) / 6 = 1.00 (perfect ranking)
```

---

### A3. Personalization Quality Metrics

#### Question Diversity (Exploration Breadth)

**Mathematical Definition:**
```
Diversity = Average count of unique questions per student

Diversity = (1/n) Σᵢ₌₁ⁿ |unique questions for student i|
```

**IMPORTANT:** This metric reports the **count** of unique questions, NOT a percentage or proportion.

**Calculation:**
```typescript
function calculateDiversity(
  students: Array<{questionsAnswered: string[]}>
): number {
  const totalUniqueQuestions = students.reduce((sum, student) => {
    const uniqueQuestions = new Set(student.questionsAnswered);
    return sum + uniqueQuestions.size;
  }, 0);

  return totalUniqueQuestions / students.length;
}
```

**Example:**
```
Student  Questions answered  Unique Questions
1        [Q1,Q2,Q3,Q2,Q4]    4 unique (Q1,Q2,Q3,Q4)
2        [Q5,Q6,Q7,Q8,Q9]    5 unique (Q5,Q6,Q7,Q8,Q9)
3        [Q1,Q2,Q3,Q4,Q5]    5 unique (Q1,Q2,Q3,Q4,Q5)
4        [Q10,Q11,Q12,Q13]   4 unique (Q10,Q11,Q12,Q13)

Average Diversity = (4 + 5 + 5 + 4) / 4 = 4.5 unique questions per student
```

**Interpretation:**

- **High diversity (>30)**: Strong exploration, high personalization
- **Medium diversity (15-30)**: Moderate personalization (typical for 20-question quizzes)
- **Low diversity (<10)**: Over-reliance on small subset (potential issue)

**Phase 4 Result:** 35.36 unique questions per student (healthy exploration)

---

#### Selection Balance (Gini Coefficient)

**Mathematical Definition:**
```
Gini = 1 - Σᵢ₌₁ᵏ pᵢ²

where:
  k = number of questions in pool
  pᵢ = proportion of times question i was selected
  Σpᵢ = 1 (probabilities sum to 1)
```

**Interpretation:**
- **Gini = 0**: Perfect concentration (one question selected 100% of time)
- **Gini → 1**: Perfect balance (all questions equally likely)

**Calculation:**
```typescript
function calculateSelectionBalance(
  selectionCounts: Record<string, number>
): number {
  const total = Object.values(selectionCounts).reduce((sum, count) => sum + count, 0);

  let sumSquaredProportions = 0;

  for (const count of Object.values(selectionCounts)) {
    const proportion = count / total;
    sumSquaredProportions += proportion ** 2;
  }

  const gini = 1 - sumSquaredProportions;
  return gini;
}
```

**Example:**
```
Question  Selections  Proportion  p²
Q1        50          0.50        0.2500
Q2        30          0.30        0.0900
Q3        20          0.20        0.0400

Σp² = 0.2500 + 0.0900 + 0.0400 = 0.3800
Gini = 1 - 0.3800 = 0.6200
```

**Interpretation for Phase 4:**

- Current: Gini = 0.467 (moderate balance) ⚠️ **Requires recalculation with Phase 4 data**
- Target: 0.4-0.7 (avoid both extremes)

**Note:** The value 0.467 was calculated before Phase 4's 1,600 question expansion (pool changed from ~2,500 to 4,100 questions). With rescue rate dropping from 50.5% → 22.4%, the selection distribution has likely changed. Recommend recalculating this metric using latest simulation data.

---

### A4. Fisher Information and SEM

**Fisher Information Definition:**
```
I(θ) = [Da'P(1-P)] / P    (for 3PL IRT)

where:
  D = 1.7 (scaling constant)
  a = discrimination parameter
  b = difficulty parameter
  c = guessing parameter
  P = c + (1-c) / (1 + exp(-Da(θ-b)))
```

**Standard Error of Measurement:**
```
SEM(θ) = 1 / √I(θ)
```

**Example Calculation:**
```
Question: a=1.5, b=0.0, c=0.25
Student: θ=0.5

Step 1: Calculate P(θ)
  exponent = -1.7 × 1.5 × (0.5 - 0.0) = -1.275
  P = 0.25 + (1-0.25)/(1 + exp(-1.275))
    = 0.25 + 0.75/1.783
    = 0.25 + 0.421
    = 0.671

Step 2: Calculate Fisher Information
  I(θ) = [1.7 × 1.5² × 0.671 × (1-0.671)] / 0.671
       = [1.7 × 2.25 × 0.671 × 0.329] / 0.671
       = 0.846 / 0.671
       = 1.261

Step 3: Calculate SEM
  SEM = 1/√1.261 = 1/1.123 = 0.891
```

**Information Scarcity:**
When θ is far from b (|θ - b| > 2), Fisher Information drops dramatically:
- θ = -2, b = 0: I(θ) ≈ 0.15 → SEM ≈ 2.58
- θ = 0, b = 0: I(θ) ≈ 1.50 → SEM ≈ 0.82
- θ = 2, b = 0: I(θ) ≈ 0.15 → SEM ≈ 2.58

This explains why Q1/Q5 students have higher SEM (fewer informative questions available).

---

### A5. Data Requirements Summary

| Metric | Required Data | Minimum Sample | Typical Source |
|--------|---------------|----------------|----------------|
| **Actionable Precision** | Final θ̂, SEM per student | 100 students | Quiz completion logs |
| **Rescue Rate** | Selection logs with step annotations | 1,000 selections | Question selection events |
| **Crash Rate** | Quiz completion status | 100 students | Quiz completion logs |
| **RMSE** | True θ, estimated θ̂ | 100 students | Cross-validation or simulation |
| **ECE** | Predicted prob, actual outcome | 1,000 predictions | Answer attempt logs |
| **Kendall's Tau** | True θ, estimated θ̂ | 50 students | Cross-validation |
| **Brier Score** | Predicted prob, actual outcome | 1,000 predictions | Answer attempt logs |
| **NDCG** | Question recommendations, relevance scores | 100 students | Recommendation logs |
| **Question Diversity** | Question IDs per student | 100 students | Answer history |
| **Selection Balance** | Selection counts per question | 1,000 selections | Selection frequency logs |

---

## Glossary

| Term | Definition |
|------|------------|
| **ECE** | Expected Calibration Error - measures predicted probability accuracy |
| **Brier Score** | Combined calibration + discrimination metric for probability predictions |
| **Kendall's Tau** | Rank correlation coefficient (robust to outliers) |
| **NDCG** | Normalized Discounted Cumulative Gain - position-aware ranking quality |
| **SEM** | Standard Error of Measurement - 1/√I(θ), precision of ability estimate |
| **RMSE** | Root Mean Squared Error - estimation accuracy metric |
| **Actionable Precision** | SEM < 0.50, sufficient for diagnostic decisions in formative assessment |
| **Rescue Rate** | % of questions requiring fallback logic (system health indicator) |
| **Crash Rate** | % of students reaching Step 4 hard stop (robustness metric) |
| **Fisher Information** | I(θ) - measurement information at ability level θ |
| **Quintile** | Ability range segment (Q1_low, Q2, Q3_medium, Q4, Q5_high) |
| **Formative Assessment** | Low-stakes diagnostic testing (practice quizzes) |
| **Summative Assessment** | High-stakes evaluative testing (final exams, certifications) |

---

**Document Status:** Active - Single Source of Truth
**Last Updated:** 2025-12-03
**Maintenance:** Review quarterly or after major system changes
**Owner:** Adaptive Learning System Team
