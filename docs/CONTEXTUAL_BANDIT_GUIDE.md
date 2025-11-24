# Contextual Bandit System - Complete Guide

## Overview

The adaptive quiz system uses a **hybrid contextual bandit** approach that combines:
- **LinUCB** (personalized machine learning) - 50-90% weight
- **IRT-UCB** (item response theory) - 10-50% weight

The system automatically adjusts weights based on confidence, starting cautious (50% LinUCB) and becoming more personalized (90% LinUCB) as it learns.

---

## Quick Start

### Running Simulations

```bash
# Development (50 students, fast)
npx tsx scripts/testing/monte-carlo-contextual-bandit.ts development Balanced

# Testing (100 students, thorough)
npx tsx scripts/testing/monte-carlo-contextual-bandit.ts testing Balanced

# Production (500 students, publication-ready)
npx tsx scripts/testing/monte-carlo-contextual-bandit.ts production Balanced
```

### Available Scenarios

| Scenario | Mean | SD | Description |
|----------|------|----|-----------|
| **Balanced** | 0.0 | 1.0 | Normal distribution (recommended) |
| **Challenging** | 1.5 | 0.8 | High-ability students |
| **Mixed Bimodal** | 0.5 | 1.5 | Wide ability range |

**Recommendation**: Use **Balanced** for standard testing.

---

## Configuration Options

### Simulation Configs

```typescript
development: {
  students: 50,
  questions: 25,
  runs: 5
}

testing: {
  students: 100,
  questions: 50,
  runs: 10
}

production: {
  students: 500,
  questions: 60,
  runs: 20
}
```

### What Gets Tested

The simulation compares three modes:

1. **IRT-Only**: Pure IRT-UCB baseline (no personalization)
2. **Hybrid**: Adaptive blend of LinUCB + IRT-UCB ✅ **Recommended**
3. **LinUCB-Only**: Pure contextual bandit

---

## Understanding Results

### Key Metrics

#### 1. RMSE (Root Mean Square Error)
**Lower is better**

```
RMSE: 0.728  ✅ Excellent (< 0.8)
RMSE: 0.900  ⚠️  Acceptable (0.8-1.0)
RMSE: 1.200  ❌ Poor (> 1.0)
```

**What it measures**: Average error in ability estimates
**Target**: < 0.8 for production

#### 2. Correlation
**Higher is better**

```
Correlation: 0.82  ✅ Excellent (> 0.8)
Correlation: 0.70  ⚠️  Acceptable (0.6-0.8)
Correlation: 0.50  ❌ Poor (< 0.6)
```

**What it measures**: How well we rank students
**Target**: > 0.8 for production

#### 3. Regret
**Lower is better**

```
Regret: 10.0   ✅ Excellent (< 20)
Regret: 50.0   ⚠️  Acceptable (20-100)
Regret: 200.0  ❌ Poor (> 100)
```

**What it measures**: How far from optimal question selection
**Theoretical bound**: O(d√(T log T)) ≈ 235 for our setup
**Target**: < 20 shows near-optimal learning

#### 4. Weight Evolution
**Expected pattern**:

```
Q4:   54.5%  ✅ (50-60% - cautious start)
Q9:   62.0%  ✅ (60-65% - building confidence)
Q14:  71.0%  ✅ (70-75% - rapid learning)
Q19:  81.0%  ✅ (80-85% - high confidence)
Q24+: 85.7%  ✅ (85-90% - full personalization)
```

**⚠️ Important: Adaptive Behavior After Q20**

After question 20, weights can **increase or decrease** based on LinUCB's confidence (sigma):

- **If student answers predictably** → σ↓ → weight increases (87% → 89%)
- **If student answers unpredictably** → σ↑ → weight decreases (89% → 87%)

This is **intentional and beneficial**:
- ✅ **Self-correcting**: If CB becomes uncertain, it defers more to IRT
- ✅ **Adaptive**: Responds to changing student behavior
- ✅ **Robust**: Prevents over-reliance on uncertain predictions

**Example**:
```
Q20: 85.2% (σ=0.4, predictable responses)
Q21: 84.8% (σ=0.5, unexpected answer) ← DROPS
Q22: 86.1% (σ=0.3, back to predictable) ← RECOVERS
Q23: 87.4% (σ=0.2, very consistent) ← CONTINUES UP
```

In practice, most students answer predictably, so drops are rare and small.

---

## Current Performance (Production)

### Hybrid vs IRT-Only Comparison

| Metric | IRT-Only | Hybrid | Status |
|--------|----------|--------|--------|
| **RMSE** | 0.749 | **0.728** | ✅ **+2.8% better** |
| **Correlation** | 0.775 | **0.824** | ✅ **+6.3% better** |
| **MAE** | 0.587 | **0.565** | ✅ **+3.7% better** |
| **Regret** | N/A | 14.0 | ✅ Excellent |
| **Weight Evolution** | N/A | 54%→86% | ✅ Perfect |

**Winner**: 🏆 **Hybrid Mode** (recommended for production)

---

## How It Works

### 1. Context Features (15 dimensions)

The system uses 15 features to personalize question selection:

#### User Features (6D)
- Estimated ability (θ)
- Uncertainty (SEM)
- Confidence level
- Response count
- Recent accuracy
- Session progress

#### Question Features (5D)
- Difficulty
- Discrimination
- Guessing parameter
- Exposure rate
- Historical correctness

#### Interaction Features (4D)
- Difficulty match
- Ability gap
- Confidence-difficulty alignment
- **Topic weakness match** ⭐ (most important)

### 2. Reward Function

**Optimized for RMSE**:

```
reward = 0.6 × error_reduction     (How much closer to true ability?)
       + 0.2 × correctness         (Student engagement)
       + 0.2 × SEM_reduction       (Confidence improvement)
```

### 3. Weight Evolution

**Phase-based adaptation**:

```
Q0-10:  50% → 65%  (Cautious - trust IRT more)
Q10-20: 65% → 85%  (Learning - rapid increase)
Q20+:   85% → 90%  (Confident - full personalization)
```

### 4. Personalization Features

#### Extreme Topic Specialization
- Each student is an **expert** in 2-3 topics (+0.7 to +1.0 boost)
- Each student is **weak** in 2-3 topics (-1.0 to -0.7 penalty)
- Neutral in other topics (-0.2 to +0.2)

#### Question Fatigue
- Repeated questions become easier (memorization effect)
- Discrimination drops 30% on re-exposure
- CB learns to avoid showing same questions

#### Non-Stationary Learning
- Fast learners improve +0.25 over 50 questions
- Medium learners improve +0.10
- Slow learners stay constant
- CB adapts using recent_accuracy feature

---

## Troubleshooting

### Issue: Hybrid Performs Worse Than IRT

**Symptoms**:
```
RMSE:  IRT 0.750, Hybrid 0.900 (-20%)
```

**Causes**:
1. **Insufficient data**: Need at least 100 students
2. **Wrong reward function**: Check if using error-reduction (not SEM-only)
3. **Poor weight evolution**: Should reach 70%+ by Q14

**Solutions**:
- Run production config (500 students)
- Verify reward uses 60% error_reduction
- Check weight evolution (should be 54% → 86%)

### Issue: Weights Stuck at 50%

**Symptoms**:
```
Weight Evolution: 50.0% → 50.5% → 51.0%
```

**Cause**: Using per-question observations instead of student progress

**Solution**: Verify hybrid.ts uses `totalSelections` (student progress), not `questionSelections` (per-question count)

### Issue: High Regret (>50)

**Symptoms**:
```
Hybrid avg regret: 85.3 (too high!)
```

**Cause**: Regret calculation ignoring topic strengths

**Solution**: Ensure `calculateInstantaneousRegret()` considers `topicStrengths` parameter

### Issue: Cold-Start RMSE Always 0.0

**Symptoms**:
```
IRT-Only Cold-Start: 0.000, 0.000, 0.000, 0.000
```

**Cause**: `coldStartRMSE` only tracked for CB modes

**Solution**: Move `coldStartRMSE` outside `contextualBanditData` in return statement

---

## File Structure

```
scripts/testing/
├── monte-carlo-contextual-bandit.ts    # Main simulation
├── analyze-personalization.ts          # Analysis tools
└── results/                            # Output JSON files

src/lib/contextual-bandit/
├── hybrid.ts                           # Hybrid scoring & weights
├── algorithms/
│   └── linucb.ts                       # LinUCB implementation
└── features/
    ├── context-builder.ts              # 15D feature extraction
    ├── user-features.ts                # User state features
    └── question-features.ts            # Question features
```

---

## Advanced Configuration

### Adjusting Regularization

**File**: `scripts/testing/monte-carlo-contextual-bandit.ts`

```typescript
function getAdaptiveRegularization(totalStudents: number): number {
  if (totalStudents <= 50) return 1.0;   // Conservative
  else if (totalStudents <= 100) return 0.5;  // Balanced
  else return 0.3;  // Aggressive (recommended for 500+)
}
```

### Tuning Reward Weights

**File**: `scripts/testing/monte-carlo-contextual-bandit.ts` (line ~742)

```typescript
const reward =
  0.6 * errorReductionReward +    // RMSE optimization
  0.2 * correctnessReward +        // Student engagement
  0.2 * semReductionReward;        // Confidence

// To prioritize student satisfaction:
// 0.4 * errorReduction + 0.4 * correctness + 0.2 * SEM

// To prioritize pure accuracy:
// 0.8 * errorReduction + 0.1 * correctness + 0.1 * SEM
```

### Modifying Weight Evolution

**File**: `src/lib/contextual-bandit/hybrid.ts` (line ~99-114)

```typescript
if (studentProgress < 10) {
  linucbWeight = 0.5 + 0.15 * (studentProgress / 10);  // 50% → 65%
} else if (studentProgress < 20) {
  linucbWeight = 0.65 + 0.2 * ((studentProgress - 10) / 10);  // 65% → 85%
} else {
  linucbWeight = 0.85 + 0.05 * Math.exp(-sigma / 2);  // 85% → 90%
}

// For faster adaptation (more aggressive):
// if (studentProgress < 5) { ... }   // Faster ramp
// if (studentProgress < 10) { ... }  // Reach 85% earlier

// For slower adaptation (more conservative):
// if (studentProgress < 15) { ... }  // Slower ramp
// if (studentProgress < 30) { ... }  // Take longer to reach 85%
```

---

## FAQ

### Q: When should I use Hybrid vs IRT-Only?

**Use Hybrid when**:
- You have diverse student profiles (different topic strengths)
- You want personalization beyond ability estimation
- You have sufficient data (100+ students)

**Use IRT-Only when**:
- You have very few students (< 50)
- Question pool is homogeneous (no topic variation)
- You prioritize simplicity over personalization

### Q: Why does Hybrid ask more questions?

Hybrid explores different topics to learn personalization patterns. This is intentional:
- IRT-Only: ~17 questions to converge
- Hybrid: ~30 questions (more thorough)

The extra questions provide better correlation (+6.3%) and RMSE (+2.8%).

### Q: What's the minimum sample size?

| Students | LinUCB Weight | Expected Performance |
|----------|---------------|---------------------|
| 50 | Max 60% | Not recommended (insufficient data) |
| 100 | Max 75% | Acceptable (competitive with IRT) |
| 500+ | Max 90% | **Recommended** (beats IRT by 3-6%) |

---