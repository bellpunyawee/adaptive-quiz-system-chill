# Formative vs Summative Assessment
## Why Context Matters for Adaptive Learning Metrics

**Date:** 2025-12-03
**Purpose:** Explain why different assessment contexts require different success metrics

---

## Assessment Taxonomy

Educational assessments fall into two primary categories with fundamentally different purposes:

### Formative Assessment (Assessment FOR Learning)
**Purpose:** Diagnose current state, guide learning

**Examples:**
- Practice quizzes
- Homework assignments
- Self-assessment tools
- Diagnostic pre-tests
- Low-stakes progress checks

**Key Characteristics:**
- **Low stakes** - doesn't affect final grade/certification
- **Frequent** - ongoing throughout learning process
- **Diagnostic** - identifies gaps and strengths
- **Actionable** - results inform next steps
- **Private** - students don't compare with peers
- **Adaptive** - questions tailored to individual level

**Student Mindset:** "What should I practice next?"

---

### Summative Assessment (Assessment OF Learning)
**Purpose:** Rank, certify, or make high-stakes decisions

**Examples:**
- Final exams
- Certification tests (SAT, GRE, licensing exams)
- Placement tests
- Standardized tests
- Grade-determining assessments

**Key Characteristics:**
- **High stakes** - affects grades, admission, certification
- **Infrequent** - end of unit/course/program
- **Evaluative** - measures achievement against standard
- **Comparative** - results compared across students
- **Public** - scores shared, ranked, or reported
- **Standardized** - same questions/conditions for fairness

**Student Mindset:** "How do I rank compared to others?"

---

## Why Different Contexts Need Different Metrics

### Formative Assessment Metrics

**Goal:** Actionable Precision
> "Can we confidently diagnose the student's state to recommend next steps?"

**Success Criteria:**
1. **Actionable Precision Rate** - % students achieving SEM < 0.50
   - 95% CI of ±0.98 logits = sufficient to categorize "needs help" vs "proficient"
   - Good enough for "what topic to practice next" decisions

2. **Rescue Rate** - % questions requiring rescue logic
   - Measures system health (content ecosystem adequacy)
   - Low rate (<30%) = healthy, high rate (>40%) = content starvation

3. **Crash Rate** - % students hitting hard stop
   - Measures robustness (can system handle all ability ranges?)
   - Target: <1% crashes

**Why Fairness Gap Doesn't Matter:**
- Students don't compare scores with peers
- Perfect statistical precision not required for diagnostic decisions
- Extremes (very low/high ability) naturally have wider CIs
- Optimizing for relative equality can degrade outcomes for average students

**Example Use Case:**
```
Student A: θ = -0.8, SEM = 0.45
Diagnosis: "Struggling with algebra fundamentals"
Action: Recommend "Basic Equations" practice module
Precision: Good enough (95% confident θ is in [-1.78, 0.18] range)
```

Student A doesn't need to know their exact θ to 0.001 precision. They need to know **what to practice next**.

---

### Summative Assessment Metrics

**Goal:** Fair Ranking
> "Can we confidently rank students against each other with equal precision?"

**Success Criteria:**
1. **Fairness Gap** - Max SEM difference across ability quintiles
   - Ensures equal measurement precision for all students
   - Critical for fair comparison (Student A's score as precise as Student B's)

2. **Test Information Function** - Information level across θ range
   - High, uniform information ensures reliable rankings
   - Flat TIF across ability range = equally precise for all

3. **Measurement Precision** - Overall SEM targets
   - Typically SEM < 0.30 or better
   - Higher precision needed for high-stakes decisions

**Why Fairness Gap DOES Matter:**
- Students' scores are compared against each other
- Rankings affect admissions, scholarships, job offers
- Legal/ethical requirement for equal treatment
- Public perception of fairness matters

**Example Use Case:**
```
Student A: θ = -0.8, SEM = 0.25 (percentile: 21st)
Student B: θ = -0.6, SEM = 0.25 (percentile: 27th)
Decision: Student B admitted, Student A rejected
Fairness: Equal precision (SEM) ensures fair comparison
```

Both students need equally precise scores because the ranking determines high-stakes outcomes.

---

## Our System: Practice Quizzes (Formative)

### Context
- **Purpose:** Help students practice programming concepts
- **Stakes:** Zero - doesn't affect grades
- **Frequency:** Unlimited attempts
- **Privacy:** Students don't see others' scores
- **Goal:** Diagnose weak areas, recommend practice topics

### Metric Choice: Operational Reliability

**Primary KPIs:**
1. Actionable Precision Rate > 90%
2. Rescue Rate < 30%
3. Crash Rate < 1%

**NOT Using:**
- Fairness Gap (relative equality) - irrelevant for non-comparative diagnostics

### Why This Makes Sense

**Student User Story:**
> "I want to practice Python. The system gives me questions at my level. After 15-20 questions, it tells me: 'You're struggling with loops - try our Loop Basics module.' I don't care if someone else got measured with SEM=0.30 while mine is SEM=0.45. I just want to know what to practice next."

**System Requirements:**
- Converge fast enough (15-25 questions) to avoid user fatigue
- Provide actionable diagnosis (SEM < 0.50 sufficient)
- Handle all ability levels gracefully (no crashes)
- Maintain healthy question ecosystem (low rescue rate)

**Fairness Requirements:**
- None - students don't compare scores
- No legal/regulatory requirements for equal precision
- Privacy by design - individual diagnostics only

---

## Comparison Table

| Aspect | Formative (Our System) | Summative (e.g., SAT) |
|--------|------------------------|----------------------|
| **Purpose** | Diagnose state | Rank students |
| **Stakes** | Low (practice) | High (affects future) |
| **Comparison** | Individual only | Across all test-takers |
| **Precision Need** | Actionable (SEM < 0.50) | High (SEM < 0.30) |
| **Fairness Need** | Individual adequacy | Equal precision for all |
| **Primary KPI** | Actionable Precision Rate | Fairness Gap |
| **Length** | Adaptive (15-25 items) | Fixed (50-100+ items) |
| **Retakes** | Unlimited | Limited/none |
| **Privacy** | Private | Scores reported/compared |
| **Optimization Goal** | Fast, actionable diagnosis | Precise, fair ranking |

---

## Real-World Examples

### Example 1: Khan Academy (Formative)
**Context:** Free practice platform, millions of users

**Metrics They Care About:**
- % of students getting "recommended next topic" suggestions
- Engagement (do students practice recommended topics?)
- Learning velocity (time to mastery)

**Metrics They DON'T Care About:**
- Whether Student A in California has same SEM as Student B in New York
- Fairness gap across ability quintiles
- Perfect statistical precision

**Why:** Students never compare scores. Platform optimizes for learning outcomes, not measurement equality.

---

### Example 2: SAT/GRE (Summative)
**Context:** High-stakes college admission tests

**Metrics They Care About:**
- Fairness gap (equal precision for all scores)
- Test reliability (Cronbach's alpha > 0.90)
- Measurement precision (SEM < 0.30 across range)
- Score comparability across test forms

**Why:** Scores determine admissions, scholarships, life opportunities. Legal requirement for fairness. Public scrutiny of measurement equality.

---

### Example 3: Medical Licensing Exams (Summative)
**Context:** Certification for practicing medicine

**Metrics They Care About:**
- Pass/fail classification accuracy (minimize false positives)
- Equal difficulty across test forms
- High reliability near cut score
- Defensible in court (fairness documentation)

**Why:** Patient safety at stake. Legal liability. Professional standards. Must prove equal treatment of all candidates.

---

### Example 4: Duolingo (Formative)
**Context:** Language learning app

**Metrics They Care About:**
- Time to complete lesson
- User engagement (return rate)
- Learning efficiency (XP per hour)
- "Placement" into appropriate difficulty level

**Metrics They DON'T Care About:**
- Whether beginner lessons have same SEM as advanced lessons
- Fairness gap across proficiency levels

**Why:** Free practice platform. No high-stakes decisions. Users care about learning progress, not statistical precision.

---

## Common Misconceptions

### Misconception 1: "All tests need equal precision"
**Reality:** Formative assessment needs *sufficient* precision for action, not *perfect* precision for ranking.

**Example:**
- Formative: SEM = 0.50 is fine ("you're around beginner level, try topic X")
- Summative: SEM = 0.50 is poor (can't distinguish 50th from 60th percentile fairly)

---

### Misconception 2: "Fairness gap always matters"
**Reality:** Fairness gap only matters when students are compared against each other.

**Example:**
- Formative: Student A (SEM=0.40) and Student B (SEM=0.30) never interact or compare
- Summative: Student A and Student B compete for same scholarship - equal precision required

---

### Misconception 3: "Higher precision is always better"
**Reality:** Higher precision often requires more questions, causing user fatigue in low-stakes contexts.

**Example:**
- Formative: 20 questions achieving SEM=0.45 → Student completes, gets recommendation
- Formative: 50 questions achieving SEM=0.25 → Student quits halfway due to fatigue

In formative context, SEM=0.45 with completion beats SEM=0.25 with dropout.

---

### Misconception 4: "We should optimize for fairness just in case"
**Reality:** Optimizing for wrong metric can degrade the right metric.

**Example:**
```
Scenario A (Optimize for Actionable Precision):
  Q1: SEM = 0.50, Q2: SEM = 0.35, Q3: SEM = 0.30, Q4: SEM = 0.35, Q5: SEM = 0.50
  Fairness Gap = 0.20 (Q1-Q3)
  Actionable Precision Rate = 100% (all quintiles < 0.50)
  Result: All students get actionable recommendations ✓

Scenario B (Optimize for Fairness Gap):
  Q1: SEM = 0.35, Q2: SEM = 0.35, Q3: SEM = 0.35, Q4: 0.35, Q5: SEM = 0.35
  Fairness Gap = 0.00 (perfect!)
  Actionable Precision Rate = 100% (all quintiles < 0.50)
  BUT: Required 40 questions on average (vs 20 in Scenario A)
  Result: 50% dropout rate due to fatigue ✗
```

Optimizing for fairness increased test length, causing user attrition.

---

## Design Principles by Context

### Formative Assessment Design
1. **Minimize Questions:** Get to actionable diagnosis ASAP
2. **Accept Extremes:** Q1/Q5 can have wider CIs (still actionable)
3. **Optimize for Completion:** Short quiz > perfect precision
4. **System Health:** Monitor rescue rate (content adequacy)
5. **User Experience:** Fast, relevant, actionable

**Configuration:**
```typescript
formativeMode: true,
semThresholds: {
  q1_low: 0.50,      // Accept wider CI at extremes
  q2: 0.35,
  q3_medium: 0.35,
  q4: 0.35,
  q5_high: 0.50,     // Accept wider CI at extremes
},
maxQuestions: 25,    // Keep quiz short
```

---

### Summative Assessment Design
1. **Maximize Precision:** High stakes require tight CIs
2. **Equal Treatment:** Same precision for all ability levels
3. **Optimize for Reliability:** Test length less critical
4. **Legal Defensibility:** Document fairness measures
5. **Standardization:** Fixed length, calibrated items

**Configuration:**
```typescript
formativeMode: false,
semThresholds: {
  q1_low: 0.30,      // Tight, uniform threshold
  q2: 0.30,
  q3_medium: 0.30,
  q4: 0.30,
  q5_high: 0.30,     // No relaxation for extremes
},
maxQuestions: 100,   // Length not a concern (high stakes)
```

---

## When to Switch Contexts

### Formative → Summative
If you add these features, switch to summative metrics:
- **Leaderboards** (students compare scores)
- **Certifications** (quiz results affect credentials)
- **Grading** (quiz scores affect final grade)
- **Public Sharing** (scores published or reported)
- **Competitions** (ranking determines prizes)

**Warning Signs:**
- Legal team asks about "fairness"
- Students complain "their quiz was easier"
- Scores being used for admissions/hiring decisions

---

### Summative → Formative
If you remove these features, switch to formative metrics:
- **Remove grading** (make practice-only)
- **Hide scores** (show diagnostics only)
- **Unlimited retakes** (no penalty for repetition)
- **Private results** (no comparison with peers)

**Opportunity:**
- Reduce test length (faster time to diagnosis)
- Accept wider CIs at extremes (Q1/Q5)
- Focus on user engagement over measurement precision

---

## Validation: How to Know You're Using Right Metrics

### Formative Assessment Validation
Ask these questions:

1. **Do students compare scores?** → No
2. **Are results used for ranking/grading?** → No
3. **Do students want "what to practice next"?** → Yes
4. **Is completion rate important?** → Yes
5. **Are retakes unlimited/encouraged?** → Yes

**If all answers align:** Use Operational Reliability metrics ✓

---

### Summative Assessment Validation
Ask these questions:

1. **Do students compete for limited spots/prizes?** → Yes
2. **Are results reported to third parties?** → Yes
3. **Could legal challenge arise from unfair measurement?** → Yes
4. **Is precision more important than test length?** → Yes
5. **Are retakes limited/prohibited?** → Yes

**If all answers align:** Use Fairness Gap metrics ✓

---

## Our Decision: Formative Mode

### Validation for Our System

| Question | Answer | Justification |
|----------|--------|---------------|
| Do students compare scores? | **No** | Results private, no leaderboard |
| Used for grading? | **No** | Practice only, no grade impact |
| What to practice next? | **Yes** | Recommends weak topic areas |
| Completion rate important? | **Yes** | Need students to finish quiz |
| Unlimited retakes? | **Yes** | Encouraged to practice more |

**Conclusion:** Formative context → Use Operational Reliability ✓

---

### Configuration Applied

```typescript
// convergence-config.ts
export const DEFAULT_CONVERGENCE_CONFIG = {
  enabled: true,
  trafficAllocation: 100,
  formativeMode: true,  // ← FORMATIVE CONTEXT

  semThresholds: {
    q1_low: 0.50,      // Actionable precision, accept extremes
    q2: 0.35,
    q3_medium: 0.35,
    q4: 0.35,
    q5_high: 0.50,     // Actionable precision, accept extremes
  },

  // Primary KPIs (Operational Reliability)
  targets: {
    actionablePrecisionRate: 0.90,  // 90% students with SEM < 0.50
    rescueRate: 0.30,                // <30% questions need rescue
    crashRate: 0.01,                 // <1% students hit hard stop
  },
};
```

---

## Future Considerations

### If We Add Summative Features

**Example:** "Programming Certification Badge"

**Changes Required:**
1. Switch `formativeMode: false`
2. Update SEM thresholds to uniform 0.30
3. Monitor fairness gap (target < 0.15)
4. Increase max questions (50-80 questions)
5. Add legal review of fairness metrics
6. Document measurement equality

**Tradeoffs:**
- Longer quizzes (higher precision)
- Lower completion rates (more user fatigue)
- Higher question pool requirements (need more Q1/Q5 questions)

---

### If We Add Leaderboards

**Risk:** Turns formative (practice) into summative (competitive)

**Mitigation Options:**
1. **Separate modes:** "Practice Mode" (formative) vs "Ranked Mode" (summative)
2. **Opt-in competition:** Leaderboard requires explicit consent
3. **Time-decay rankings:** Recent performance weighted more (encourages practice)

**Recommendation:** Keep practice mode formative, add separate "Challenge Mode" for competition.

---

## Summary Table

| Our System Feature | Assessment Type | Metric Choice | Rationale |
|-------------------|----------------|---------------|-----------|
| **Practice Quizzes** | Formative | Operational Reliability | No comparison, diagnostic use |
| **Private Results** | Formative | Actionable Precision | No fairness perception issue |
| **Unlimited Retakes** | Formative | Low Rescue Rate | Engagement > precision |
| **Topic Recommendations** | Formative | SEM < 0.50 sufficient | Diagnostic decision support |
| **(Future) Certification** | Summative | Fairness Gap | If added, switch to summative |

---

## Key Takeaways

1. **Context drives metrics** - Formative ≠ Summative assessment
2. **Our system is formative** - Practice quizzes, no comparison, diagnostic
3. **Use Operational Reliability** - Actionable precision, rescue rate, crash rate
4. **Don't use Fairness Gap** - Not relevant without student comparison
5. **If context changes** - Adding grading/ranking requires switching to summative metrics
6. **Validation is simple** - Ask 5 questions to determine context

---

## References

- [OPERATIONAL_RELIABILITY.md](./OPERATIONAL_RELIABILITY.md) - Detailed operational metrics explanation
- [VALIDATION_REPORT.md](./VALIDATION_REPORT.md) - Phase 4 validation with new metrics
- [convergence-config.ts](../src/lib/adaptive-engine/convergence-config.ts) - Formative mode implementation

**Document Status:** Active
**Last Updated:** 2025-12-03
**Review Trigger:** If system adds grading, ranking, or competitive features
