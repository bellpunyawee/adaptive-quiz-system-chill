# Quiz Bank Best Practices for Instructors

**Purpose:** Guide for instructors creating custom quiz banks for optimal system performance
**Last Updated:** December 3, 2025
**Audience:** Course instructors, content creators, educational administrators

---

## Quick Summary

**Minimum Requirements:**
- ✅ **100+ total questions** (200+ recommended)
- ✅ **20+ questions per topic**
- ✅ **Follow baseline distribution** (12%-20%-36%-20%-12% across difficulty levels)
- ✅ **Monitor rescue rate** (keep <30%)

**Key Insight:** The system adapts to YOUR student population, but needs sufficient question diversity to avoid content gaps.

---

## Table of Contents

1. [Understanding Question Pool Quality](#understanding-question-pool-quality)
2. [Baseline Distribution Guidelines](#baseline-distribution-guidelines)
3. [Context-Specific Adjustments](#context-specific-adjustments)
4. [Minimum Pool Requirements](#minimum-pool-requirements)
5. [Monitoring Pool Health](#monitoring-pool-health)
6. [IRT Parameter Guidance](#irt-parameter-guidance)
7. [Common Issues and Solutions](#common-issues-and-solutions)

---

## Understanding Question Pool Quality

### Why Pool Composition Matters

The adaptive system selects questions based on:
1. **Student ability (θ)** - Estimated from previous responses
2. **Question difficulty (b)** - Where the question measures best
3. **Question discrimination (a)** - How well it distinguishes skill levels

**Problem:** If your pool lacks questions at a certain difficulty level, students at that level will:
- See inappropriate questions (too easy or too hard)
- Take longer to converge (more questions needed)
- Trigger "rescue logic" frequently (system health degrades)

**Solution:** Maintain balanced distribution across all difficulty levels.

---

## Baseline Distribution Guidelines

### Formative Assessment (Default - Recommended for Most Courses)

Target a **normal distribution** centered at difficulty `b = 0`:

| Difficulty Range | `b` Parameter | Target % | Purpose |
|------------------|---------------|----------|---------|
| **Very Easy** | b < -1.5 | **12%** | Supports struggling students (lowest 20% of class) |
| **Easy** | -1.5 ≤ b < -0.5 | **20%** | Below-average learners |
| **Medium** | -0.5 ≤ b < 0.5 | **36%** | Average students (largest group) |
| **Hard** | 0.5 ≤ b < 1.5 | **20%** | Above-average learners |
| **Very Hard** | b ≥ 1.5 | **12%** | Top performers (highest 20% of class) |

**Total:** 100% (symmetric bell curve)

**Why this distribution?**
- Assumes student abilities follow normal distribution (typical in most classes)
- Provides adequate coverage for all ability levels
- Balances precision (enough questions) with efficiency (not redundant)

---

### Difficulty Classification Reference

**How to set difficulty (`b` parameter) when creating questions:**

| Difficulty Label | `b` Range | Example Characteristics |
|------------------|-----------|-------------------------|
| **Very Easy** | -2.0 to -1.5 | Basic recall, fundamental concepts, little confusion |
| **Easy** | -1.5 to -0.5 | Simple application, straightforward problem-solving |
| **Medium** | -0.5 to 0.5 | Moderate complexity, requires understanding |
| **Hard** | 0.5 to 1.5 | Multi-step reasoning, nuanced concepts |
| **Very Hard** | 1.5 to 2.5 | Complex synthesis, advanced problem-solving |

**Note:** If you're unsure of exact difficulty values, start with rough estimates:
- Very Easy: `b = -2.0`
- Easy: `b = -1.0`
- Medium: `b = 0.0`
- Hard: `b = 1.0`
- Very Hard: `b = 2.0`

The system will **recalibrate** after collecting sufficient student responses (50+ per question).

---

## Context-Specific Adjustments

### Remedial/Developmental Course

**Student population:** Below-average ability (mean θ = -0.8)

**Recommended distribution:**

| Difficulty | Target % | Notes |
|------------|----------|-------|
| Very Easy | **25%** | Increased support for strugglers |
| Easy | **30%** | Build confidence with achievable challenges |
| Medium | **25%** | Stretch goals |
| Hard | **15%** | Aspirational content |
| Very Hard | **5%** | For exceptional students |

**Rationale:** Shift distribution left (easier) to match student population.

---

### Honors/Advanced Course

**Student population:** Above-average ability (mean θ = 0.8)

**Recommended distribution:**

| Difficulty | Target % | Notes |
|------------|----------|-------|
| Very Easy | **5%** | Warm-up questions only |
| Easy | **15%** | Foundation review |
| Medium | **25%** | Baseline competency |
| Hard | **30%** | Primary challenge level |
| Very Hard | **25%** | Advanced problem-solving |

**Rationale:** Shift distribution right (harder) to match student population.

---

### Diagnostic/Placement Test

**Purpose:** Measure wide range of abilities (e.g., placement exam)

**Recommended distribution:**

| Difficulty | Target % | Notes |
|------------|----------|-------|
| Very Easy | **20%** | Uniform distribution |
| Easy | **20%** | Maximize information |
| Medium | **20%** | At all ability levels |
| Hard | **20%** | Equal precision |
| Very Hard | **20%** | For all students |

**Rationale:** Uniform distribution maximizes Fisher information across all θ.

---

## Minimum Pool Requirements

### Absolute Minimums (System Will Function)

- **Total questions:** 100 minimum
- **Per topic:** 20 minimum
- **Per difficulty cell (per topic):** 3 minimum

**Warning:** Below these minimums, expect:
- High rescue rate (>40%)
- Longer quizzes (25+ questions)
- Reduced personalization

---

### Recommended Targets (Optimal Performance)

- **Total questions:** 200-500 recommended
- **Per topic:** 40-100 recommended
- **Per difficulty cell (per topic):** 5-10 recommended

**Benefits:**
- Low rescue rate (<20%)
- Shorter quizzes (15-20 questions)
- High personalization
- Robust against over-exposure

---

### Example Pool Structure

**Course:** Introductory Algebra (5 topics)

| Topic | Very Easy | Easy | Medium | Hard | Very Hard | Total |
|-------|-----------|------|--------|------|-----------|-------|
| Linear Equations | 5 | 8 | 14 | 8 | 5 | 40 |
| Quadratic Equations | 5 | 8 | 14 | 8 | 5 | 40 |
| Polynomials | 5 | 8 | 14 | 8 | 5 | 40 |
| Rational Expressions | 5 | 8 | 14 | 8 | 5 | 40 |
| Systems of Equations | 5 | 8 | 14 | 8 | 5 | 40 |
| **Total** | **25** | **40** | **70** | **40** | **25** | **200** |
| **Percentage** | **12.5%** | **20%** | **35%** | **20%** | **12.5%** | **100%** |

**Result:** Well-balanced pool meeting all recommendations.

---

## Monitoring Pool Health

### Primary Health Metric: Rescue Rate

**Definition:** Percentage of questions requiring fallback selection logic (system couldn't find appropriate first-choice question).

**Health Thresholds:**

| Rescue Rate | Status | Action Required |
|-------------|--------|-----------------|
| **<20%** | 🟢 **Excellent** | No action needed |
| **20-30%** | 🟢 **Healthy** | Monitor trends |
| **30-40%** | 🟡 **Warning** | Identify gaps, add questions soon |
| **>40%** | 🔴 **Critical** | Add questions immediately in over-rescued difficulty ranges |

---

### How to Check Pool Health

#### Option 1: Admin Dashboard (Recommended)

1. Log in as admin
2. Navigate to: **Admin → Analytics → Operational Health**
3. Check **System Health (Rescue Rate)**
4. Review **Rescue Cascade Distribution** (which difficulty levels are struggling)

---

#### Option 2: Run Pool Analysis Script

```bash
npx tsx scripts/testing/analyze-question-pool.ts
```

**Output:**
```
QUESTION POOL ANALYSIS
────────────────────────────────────────────────────────────────────────────────

Distribution by Difficulty:
  Very Easy (b < -1.5):    58 questions (12.5%) ✓ Target: 12%
  Easy (-1.5 ≤ b < -0.5):  92 questions (19.8%) ✓ Target: 20%
  Medium (-0.5 ≤ b < 0.5): 165 questions (35.5%) ✓ Target: 36%
  Hard (0.5 ≤ b < 1.5):    98 questions (21.1%) ✓ Target: 20%
  Very Hard (b ≥ 1.5):     52 questions (11.2%) ⚠️ Target: 12%

Gaps Identified:
  ⚠️ Very Hard: 3 questions below target (need 4 more)

Quality Metrics:
  ✓ High discrimination (a ≥ 1.2): 245 questions (52.7%)
  ✓ Average discrimination: 1.34
  ✓ Total questions: 465
```

---

#### Option 3: API Health Check

```bash
curl http://localhost:3000/api/admin/maintenance
```

**Response:**
```json
{
  "status": "healthy",
  "totalQuestions": 465,
  "activeQuestions": 458,
  "retiredQuestions": 7,
  "overExposedQuestions": 12,
  "needsRecalibration": 3,
  "recommendations": [
    "Add 4 more Very Hard questions",
    "3 questions need IRT recalibration (>100 responses)"
  ]
}
```

---

### Secondary Metrics

#### Operational Health Targets

| Metric | Target | What It Means |
|--------|--------|---------------|
| **Actionable Precision Rate** | >90% | % students achieving SEM < 0.50 (reliable assessment) |
| **Crash Rate** | <1% | % students running out of questions (system failure) |
| **Efficiency** | <25 questions | Average quiz length to convergence |

**How to check:** Admin Dashboard → Operational Health

---

## IRT Parameter Guidance

### Understanding IRT Parameters

#### Difficulty (`b`)
- **Range:** -3.0 to +3.0 (typical)
- **Interpretation:** Ability level (θ) at which question has 50% probability of correct answer
- **Example:** `b = 1.0` means students with θ = 1.0 have 50% chance of answering correctly

#### Discrimination (`a`)
- **Range:** 0.4 to 2.5 (typical)
- **Interpretation:** How well the question distinguishes between high/low ability students
- **Quality thresholds:**
  - `a < 0.4`: Poor (retire question)
  - `a = 0.8`: Acceptable
  - `a = 1.2`: Good
  - `a > 2.0`: Excellent

#### Guessing (`c`)
- **Range:** 0.0 to 0.35 (typical)
- **Interpretation:** Probability of guessing correctly (floor for low-ability students)
- **Guidelines:**
  - Multiple choice (4 options): `c ≈ 0.25`
  - Multiple choice (5 options): `c ≈ 0.20`
  - True/False: `c ≈ 0.50`
  - Open-ended: `c = 0.00`

---

### Initial Parameter Estimates

**When uploading new questions WITHOUT prior data:**

Use these default estimates:

| Question Type | `a` (discrimination) | `b` (difficulty) | `c` (guessing) |
|---------------|----------------------|------------------|----------------|
| **Easy multiple choice** | 1.0 | -1.0 | 0.25 |
| **Medium multiple choice** | 1.0 | 0.0 | 0.25 |
| **Hard multiple choice** | 1.0 | 1.0 | 0.25 |
| **Open-ended** | 1.0 | (estimate) | 0.00 |

**Note:** The system will recalibrate after collecting 50+ responses per question.

---

### IRT Calibration Process

**After students answer questions:**

1. **Collect responses:** Need 50+ responses per question for reliable calibration
2. **Run calibration:**
   ```bash
   POST /api/admin/maintenance
   Body: {"job": "recalibrate"}
   ```
3. **Review results:** Check if parameters changed significantly
4. **Retire poor questions:** If `a < 0.4` after 100+ responses, consider retiring

**Automatic retirement criteria:**
- Discrimination too low: `a < 0.4`
- Difficulty extreme: `|b| > 3.5`
- Correct rate too low: <15%
- Correct rate too high: >95%

---

## Common Issues and Solutions

### Issue 1: High Rescue Rate (>40%)

**Symptoms:**
- Students seeing inappropriate difficulty questions
- Long quiz times (25+ questions)
- Complaints about "random" question selection

**Diagnosis:**
```bash
npx tsx scripts/testing/analyze-question-pool.ts
```

Look for distribution gaps (any cell <10% when target is >12%).

**Solution:**
1. Identify which difficulty ranges are underrepresented
2. Create 5-10 new questions in those ranges
3. Upload via: **Admin → Questions → Bulk Upload**
4. Monitor rescue rate after 20-30 student sessions

---

### Issue 2: Students Running Out of Questions (Crash Rate >1%)

**Symptoms:**
- Quiz ends abruptly
- "No suitable questions found" errors

**Diagnosis:**
Check per-topic pool sizes:
```bash
# Count questions per topic per difficulty
SELECT topic,
       COUNT(CASE WHEN difficulty_b < -1.5 THEN 1 END) as very_easy,
       COUNT(CASE WHEN difficulty_b >= -1.5 AND difficulty_b < -0.5 THEN 1 END) as easy,
       COUNT(CASE WHEN difficulty_b >= -0.5 AND difficulty_b < 0.5 THEN 1 END) as medium,
       COUNT(CASE WHEN difficulty_b >= 0.5 AND difficulty_b < 1.5 THEN 1 END) as hard,
       COUNT(CASE WHEN difficulty_b >= 1.5 THEN 1 END) as very_hard
FROM questions
GROUP BY topic;
```

**Solution:**
1. Ensure minimum 20 questions per topic
2. Ensure minimum 3 questions per difficulty cell per topic
3. Add questions to depleted cells

---

### Issue 3: Over-Exposure (Same Questions Repeated)

**Symptoms:**
- Students report seeing same questions
- Low question diversity metric

**Diagnosis:**
```bash
GET /api/admin/maintenance
```

Check `overExposedQuestions` count.

**Solution:**
1. Increase pool size (need 2-3× more questions than typical quiz length)
2. Enable exposure control (already on by default)
3. Review exposure settings in `question-pool-manager.ts`:
   ```typescript
   maxExposure: 10  // Max times question shown
   exposureDecayDays: 30  // Reset exposure after 30 days
   ```

---

### Issue 4: Poor Calibration (Questions Don't Fit Model)

**Symptoms:**
- High RMSE (>0.50)
- Poor calibration (ECE >0.10)
- Students at similar ability getting very different question difficulty

**Diagnosis:**
```bash
npx tsx scripts/testing/cross-validation.ts
```

Check RMSE and ECE values.

**Solution:**
1. Review question quality:
   - Are questions clear and unambiguous?
   - Do they measure intended skill?
   - Are answer keys correct?
2. Run recalibration after 50+ responses:
   ```bash
   POST /api/admin/maintenance
   Body: {"job": "recalibrate"}
   ```
3. Retire poorly performing questions (`a < 0.4` after 100+ responses)

---

## Quick Reference: Distribution Targets

### Summary Table

| Context | Very Easy | Easy | Medium | Hard | Very Hard |
|---------|-----------|------|--------|------|-----------|
| **Formative (Default)** | 12% | 20% | 36% | 20% | 12% |
| **Remedial Course** | 25% | 30% | 25% | 15% | 5% |
| **Honors Course** | 5% | 15% | 25% | 30% | 25% |
| **Diagnostic Test** | 20% | 20% | 20% | 20% | 20% |

**Difficulty Ranges:**
- Very Easy: `b < -1.5`
- Easy: `-1.5 ≤ b < -0.5`
- Medium: `-0.5 ≤ b < 0.5`
- Hard: `0.5 ≤ b < 1.5`
- Very Hard: `b ≥ 1.5`

---

## Additional Resources

### Related Documentation

- **[3PL IRT Technical Guide](3PL_COMPLETE_GUIDE.md)** - Deep dive into IRT parameters
- **[Metrics Reference](METRICS_REFERENCE.md)** - All metrics explained
- **[Operational Reliability](OPERATIONAL_RELIABILITY.md)** - Design philosophy
- **[Convergence Config](CONVERGENCE_CONFIG_GUIDE.md)** - Advanced SEM tuning

### Tools & Scripts

- **Pool Analysis:** `npx tsx scripts/testing/analyze-question-pool.ts`
- **Health Check:** `GET /api/admin/maintenance`
- **Recalibration:** `POST /api/admin/maintenance {"job": "recalibrate"}`
- **Bulk Upload:** Admin Dashboard → Questions → Bulk Upload

### Support

**Questions?** Contact system administrators or create GitHub issue with:
- Current pool size and distribution
- Rescue rate and crash rate metrics
- Sample questions demonstrating the issue

---

**Last Updated:** December 3, 2025
**Version:** 1.0
**Status:** ✅ Production Ready
