# Personalization Metrics Guide

## Overview

The Monte Carlo simulation tracks three key metrics to measure how well each mode personalizes question selection for individual students.

---

## Metrics Explained

### 1. Question Diversity
**Average number of unique questions shown per student**

```
Development (50 students):
  IRT-Only:     9.1   ← Focuses on small set
  Hybrid:       20.9  ← Explores 2x more
  LinUCB-Only:  20.1  ← Explores 2x more

Production (1000 students):
  IRT-Only:     10.1  ← Focuses on small set
  Hybrid:       31.8  ← Explores 3x more!
  LinUCB-Only:  30.1  ← Explores 3x more!
```

**Interpretation**:
- **Higher = More exploration**: Contextual bandit explores many questions to learn patterns
- **Lower = Focused**: IRT concentrates on high-information questions

**Why it matters**: CB needs to explore to discover topic-specific patterns. More diversity leads to better personalization once patterns are learned.

---

### 2. Student Overlap (Jaccard Similarity)
**Average similarity between question sets shown to different students (0-1 scale)**

```
Production Results:
  IRT-Only:     0.261 (26% overlap)
  Hybrid:       0.248 (25% overlap)
  LinUCB-Only:  0.236 (24% overlap) ← Most personalized!
```

**Calculation**:
```
For each student pair:
  Jaccard Similarity = |Questions_A ∩ Questions_B| / |Questions_A ∪ Questions_B|

Final metric = Average across all student pairs
```

**Interpretation**:
- **0.0 = Perfect personalization**: Every student gets completely unique questions
- **1.0 = No personalization**: All students get identical questions
- **0.2-0.3 = Good personalization**: Students share ~25% of questions

**Why it matters**: This directly measures personalization. Lower values mean each student gets a more customized experience.

---

### 3. Selection Concentration (Coefficient of Variation)
**How concentrated question selections are across the pool**

```
Production Results:
  IRT-Only:     1.441 ← Highly concentrated
  Hybrid:       0.489 ← More distributed
  LinUCB-Only:  0.530 ← More distributed
```

**Calculation**:
```
CV = σ / μ

Where:
  σ = Standard deviation of question selection counts
  μ = Mean selection count

Higher CV = More variance = Some questions very popular, others rarely used
```

**Interpretation**:
- **High CV (1.0-2.0)**: Questions heavily concentrated on "popular" set
  - Example: Q5 shown 200 times, Q17 shown 5 times
- **Low CV (0.3-0.7)**: Questions distributed more evenly
  - Example: Most questions shown 80-120 times

**Why it matters**:
- **IRT focuses** on high-information questions (high CV)
- **CB distributes** to learn different patterns (low CV)
- Lower CV doesn't mean better - it's a trade-off between focused efficiency (IRT) and exploratory learning (CB)

---

## Expected Patterns

### Small Sample (50 students)
```
Question Diversity:       9-10 (IRT) vs 20-21 (CB)
Student Overlap:          0.21 (IRT) vs 0.21 (CB)  ← Similar
Selection Concentration:  1.7 (IRT) vs 0.8 (CB)
```
**Insight**: With few students, personalization differences are minimal.

### Medium Sample (100 students)
```
Question Diversity:       10-11 (IRT) vs 25-27 (CB)
Student Overlap:          0.24 (IRT) vs 0.22 (CB)  ← CB starting to personalize
Selection Concentration:  1.6 (IRT) vs 0.7 (CB)
```
**Insight**: CB begins showing personalization benefits.

### Large Sample (500-1000 students)
```
Question Diversity:       10-12 (IRT) vs 30-35 (CB)
Student Overlap:          0.26 (IRT) vs 0.24 (CB)  ← CB clearly better
Selection Concentration:  1.4 (IRT) vs 0.5 (CB)
```
**Insight**: CB personalization fully emerges with sufficient data.

---

## What Each Mode Does

### IRT-Only (Focused Strategy)
- **Question Diversity**: Low (10-12 questions)
  - Focuses on questions with highest Fisher information
  - Same core set for all students with similar abilities
- **Student Overlap**: Medium-High (0.26)
  - Students with similar θ get very similar questions
- **Selection Concentration**: High (1.4)
  - Heavily favors specific "optimal" questions
  - Most effective for quick, focused assessment

### Hybrid (Balanced Strategy)
- **Question Diversity**: High (30-32 questions)
  - Explores to learn patterns, then focuses
  - Adaptive weight evolution (50% → 90% CB)
  - **Note**: Weights can fluctuate after Q20 based on confidence
- **Student Overlap**: Medium (0.25)
  - Moderate personalization
  - Balances exploration and exploitation
- **Selection Concentration**: Low (0.5)
  - Distributes across question pool
  - Best correlation (+12.5% vs IRT)

**Weight Evolution Behavior**:
- Q0-20: Monotonic increase (50% → 85%)
- Q20+: Can increase or decrease based on LinUCB confidence (σ)
  - Predictable student → σ↓ → weight increases
  - Unpredictable student → σ↑ → weight decreases
  - **This is intentional** - defers to IRT when uncertain

### LinUCB-Only (Exploratory Strategy)
- **Question Diversity**: High (28-30 questions)
  - Maximum exploration
  - Discovers topic-specific patterns
- **Student Overlap**: Lowest (0.24)
  - **Most personalized** option
  - Each student gets customized selection
- **Selection Concentration**: Low (0.5)
  - Even distribution across pool
  - Best RMSE in production (+1.1% vs IRT)

---

## Key Takeaways

1. **Question Diversity** shows exploration level
   - IRT: Efficient but limited
   - CB: Explores broadly to learn

2. **Student Overlap** directly measures personalization
   - **Lower is better** for personalized learning
   - CB achieves 8-10% lower overlap than IRT

3. **Selection Concentration** shows question usage patterns
   - High CV (IRT): Focused on "best" questions
   - Low CV (CB): Distributed to learn patterns

4. **Trade-offs**:
   - IRT: Fewer questions, faster convergence, less personalized
   - CB: More questions, better ranking (correlation), more personalized
   - Hybrid: Best balance for production

---

## Recommendations

### Use IRT-Only when:
- Sample size < 100 students
- Need fast convergence (≤15 questions)
- Questions are homogeneous (no topic variation)

### Use Hybrid when:
- Sample size ≥ 500 students ✅ **Recommended**
- Need balance of speed and personalization
- Want adaptive learning (50% → 90% CB weight)
- **Best overall performance** (+12.5% correlation, good RMSE)

### Use LinUCB-Only when:
- Sample size ≥ 1000 students
- Maximum personalization required
- Can afford 30+ questions per student
- **Best RMSE** and **lowest student overlap**

---

## Visualization

Run the visualization script to see these metrics:

```bash
npx tsx scripts/testing/visualize-cb-results.ts
```

Outputs:
- Question diversity comparison
- Student overlap comparison (lower = more personalized)
- Selection concentration (CV) comparison
- Feature importance rankings
- Weight evolution (Hybrid only)

---

## Technical Details

### Jaccard Similarity Formula
```
J(A, B) = |A ∩ B| / |A ∪ B|

Where:
  A = Set of questions shown to student A
  B = Set of questions shown to student B
  ∩ = Intersection (questions both students saw)
  ∪ = Union (all unique questions either student saw)
```

### Coefficient of Variation Formula
```
CV = σ / μ

Where:
  σ = sqrt(Σ(x_i - μ)² / n)
  μ = Σx_i / n
  x_i = Number of times question i was selected
```

### Complexity
- **Question Diversity**: O(N × Q) where N = students, Q = avg questions
- **Student Overlap**: O(N² × Q) - most expensive (pairwise comparisons)
- **Selection Concentration**: O(N × Q) - efficient

---
