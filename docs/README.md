# Adaptive Quiz System - Documentation

Complete documentation for the Bayesian-optimized adaptive quiz system with contextual bandit personalization and operational reliability validation.

**Last Updated**: December 3, 2025
**Status**: ✅ Production Ready - Research Validated (14/14 targets met)

---

## 🚀 Quick Start

| For... | Start Here |
|--------|------------|
| **Students & Users** | [USER_GUIDE.md](USER_GUIDE.md) - Complete setup and usage guide |
| **Instructors & Admins** | [QUICK_START_ADMIN.md](QUICK_START_ADMIN.md) - Admin setup and quiz bank guidance |
| **Researchers** | [PUBLICATION_PIPELINE.md](PUBLICATION_PIPELINE.md) ⭐ - Reproduce research results |
| **Environment Setup** | [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) - Database and configuration |

⭐ = New validation documentation (Dec 2025)

---

## 📚 Core Documentation

### Research & Publication ⭐ NEW

| Document | Description |
|----------|-------------|
| **[PUBLICATION_PIPELINE.md](PUBLICATION_PIPELINE.md)** ⭐ | Complete 2-4 hour reproduction guide for peer review |
| **[METRICS_REFERENCE.md](METRICS_REFERENCE.md)** ⭐ | Complete metrics dictionary with mathematical formulations |
| **[OPERATIONAL_RELIABILITY.md](OPERATIONAL_RELIABILITY.md)** ⭐ | Design philosophy: operational reliability vs fairness gap |
| **[FORMATIVE_VS_SUMMATIVE.md](FORMATIVE_VS_SUMMATIVE.md)** ⭐ | Context-appropriate metrics for assessment types |
| **[VALIDATION_REPORT.md](VALIDATION_REPORT.md)** | Final validation results (14/14 targets met) |
| **[archive/PHASE3_VALIDATION_REPORT.md](archive/PHASE3_VALIDATION_REPORT.md)** | Phase 3 baseline for comparison |

### System Architecture

| Document | Description |
|----------|-------------|
| **[CONTEXTUAL_BANDIT_GUIDE.md](CONTEXTUAL_BANDIT_GUIDE.md)** | Contextual bandit system with LinUCB + IRT hybrid |
| **[3PL_COMPLETE_GUIDE.md](3PL_COMPLETE_GUIDE.md)** | 3PL IRT model technical reference with calibration guide |
| **[CONVERGENCE_CONFIG_GUIDE.md](CONVERGENCE_CONFIG_GUIDE.md)** | Stopping criteria and SEM threshold configuration |
| **[PERSONALIZATION_METRICS_GUIDE.md](PERSONALIZATION_METRICS_GUIDE.md)** | Question diversity, student overlap, selection metrics |

### Instructor & Admin Guides

| Document | Description |
|----------|-------------|
| **[QUIZ_BANK_BEST_PRACTICES.md](QUIZ_BANK_BEST_PRACTICES.md)** ⭐ | Creating custom quiz banks with optimal distribution |
| **[QUICK_START_ADMIN.md](QUICK_START_ADMIN.md)** | Admin setup and security configuration |
| **[ADMIN_SECURITY_SETUP.md](ADMIN_SECURITY_SETUP.md)** | Advanced security and access control |
| **[SKIP_QUESTION_FEATURE.md](SKIP_QUESTION_FEATURE.md)** | Skip question functionality and limitations |

### Testing & Evaluation

| Document | Description |
|----------|-------------|
| **[SIMULATION_EVALUATION_GUIDE.md](SIMULATION_EVALUATION_GUIDE.md)** | Monte Carlo simulation methodology and workflows |
| **[PERSONALIZED_FEEDBACK.md](PERSONALIZED_FEEDBACK.md)** | LLM-powered feedback system (Gemini 2.5 Flash) |

---

## 🎯 System Overview

### Phase 4: Operational Reliability (December 2025)

**Status**: ✅ **All 14/14 validation targets met**

**Key Achievements**:
- ✅ **95.2% actionable precision** (target: >90%) - Reliable skill assessments
- ✅ **22.4% rescue rate** (target: <30%) - Healthy question pool
- ✅ **0% crash rate** (target: <1%) - Robust system performance
- ✅ **19.4 questions avg** (target: <25) - Efficient convergence
- ✅ **4,100 total questions** - 2,500 from ASSISTments + 1,600 strategically generated

**Research Validation**:
- Monte Carlo simulation (1,000 synthetic students, 3 independent runs)
- 5-fold cross-validation (gold standard methodology)
- 6 baseline algorithm comparisons
- Statistical significance testing (t-test, Wilcoxon, McNemar's, Bootstrap CI)
- Complete 2-4 hour reproduction pipeline

See [VALIDATION_REPORT.md](VALIDATION_REPORT.md) for full results.

---

### Hybrid Adaptive Engine

**Components**:
1. **LinUCB Contextual Bandit** - Personalized question selection using 15D context
2. **3PL IRT Model** - Psychometric foundation for ability estimation
3. **Bayesian-Optimized Weight Evolution** - Data-driven parameter tuning
4. **Operational Reliability Focus** - Actionable precision, not theoretical fairness

**Performance** (Research-Grade Metrics):
- ✅ **RMSE: 0.401** (target: <0.50) - Ability estimation accuracy
- ✅ **ECE: 0.038** (target: <0.05) - Probability calibration
- ✅ **Kendall's Tau: 0.823** (target: >0.70) - Ranking quality
- ✅ **Brier Score: 0.152** (target: <0.20) - Prediction accuracy
- ✅ **NDCG@10: 0.891** (target: >0.80) - Recommendation quality

---

## 📊 Key Features

### 1. Operational Reliability Metrics ⭐ NEW

**Primary KPIs** (formative assessment context):
- **Actionable Precision Rate**: % students achieving SEM < 0.50 (sufficient for next-topic recommendations)
- **Rescue Rate**: % questions requiring fallback logic (system health indicator)
- **Crash Rate**: % students running out of questions (robustness metric)
- **Efficiency**: Average questions to convergence

**Why these metrics?**
- Context-appropriate for practice quizzes (formative), not high-stakes exams (summative)
- Focus on actionable outcomes (can we guide each student?) vs relative equality (fairness gap)
- See [OPERATIONAL_RELIABILITY.md](OPERATIONAL_RELIABILITY.md) for full rationale

---

### 2. Contextual Bandit Personalization
- **LinUCB algorithm** with Upper Confidence Bound
- **15-dimensional context vector** (user ability, question features, interaction patterns)
- **Exploration-exploitation balance** with adaptive α parameter

### 3. Psychometric Foundation
- **3PL IRT model** (discrimination `a`, difficulty `b`, guessing `c`)
- **Fisher information maximization** for efficient ability estimation
- **Adaptive question selection** based on current ability estimate θ

### 4. Bayesian-Optimized Parameters
- **38-iteration optimization** with Gaussian Process
- **Empirically validated** phase boundaries (Q0-7, Q7-26, Q26+)
- **Weight evolution**: 40% → 97% LinUCB as confidence grows

### 5. Content Pool Quality (Phase 4)
- **4,100 total questions**: 2,500 ASSISTments + 1,600 targeted generation
- **128% more easy questions** (5.7% → 13.0% of pool)
- **288% more hard questions** (4.2% → 16.3% of pool)
- **195% more high-discrimination questions** (18.9% → 55.8% with `a` ≥ 1.2)

### 6. Personalization Metrics
- **Question Diversity**: 35.36 unique questions per student (not percentage)
- **Context Features**: 15-dimensional feature vectors
- **Selection Balance**: Gini coefficient for question exposure distribution

### 7. LLM-Powered Feedback
- **Context-aware explanations** for wrong answers (Gemini 2.5 Flash)
- **Personalized learning tips** based on user performance
- **Engagement tracking** with reaction system

---

## 🔬 Technical References

### Research Foundations

| Topic | Reference |
|-------|-----------|
| **LinUCB Algorithm** | Li et al. (2010) - Contextual-bandit approach to personalized recommendation |
| **3PL IRT Model** | Birnbaum (1968) - Three-parameter logistic model |
| **Fisher Information** | Lord (1980) - Applications of IRT to practical testing problems |
| **Bayesian Optimization** | Mockus (1989) - Gaussian Process for global optimization |
| **ASSISTments Dataset** | 2,500 math questions with pre-calibrated IRT parameters |

See [PUBLICATION_PIPELINE.md](PUBLICATION_PIPELINE.md) for complete reproduction guide.

### Implementation Details

| Component | File | Description |
|-----------|------|-------------|
| **Hybrid Scoring** | `src/lib/contextual-bandit/hybrid.ts` | LinUCB + IRT combination (optimized weights) |
| **LinUCB Model** | `src/lib/contextual-bandit/algorithms/linucb.ts` | Contextual bandit implementation |
| **3PL IRT** | `src/lib/adaptive-engine/irt-3pl.ts` | Item response theory |
| **Stopping Criteria** | `src/lib/adaptive-engine/stopping-criteria.ts` | Convergence logic (quintile-specific SEM) |
| **Context Builder** | `src/lib/contextual-bandit/context-builder.ts` | 15D context vector construction |
| **Research Metrics** | `src/lib/research/metrics.ts` | RMSE, ECE, Kendall's Tau, Brier, NDCG |

---

## 📈 Performance Metrics (Phase 4 Validation)

### Operational Health Metrics ⭐ NEW

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| **Actionable Precision** | 95.2% | >90% | ✅ Pass |
| **Rescue Rate** | 22.4% | <30% | ✅ Pass |
| **Crash Rate** | 0% | <1% | ✅ Pass |
| **Efficiency** | 19.4 questions | <25 | ✅ Pass |

### Research-Grade Accuracy Metrics

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| **RMSE** | 0.401 | <0.50 | ✅ Pass |
| **ECE (Calibration)** | 0.038 | <0.05 | ✅ Pass |
| **Kendall's Tau (Ranking)** | 0.823 | >0.70 | ✅ Pass |
| **Brier Score (Prediction)** | 0.152 | <0.20 | ✅ Pass |
| **NDCG@10 (Recommendation)** | 0.891 | >0.80 | ✅ Pass |

### Personalization Quality

| Metric | Result | Interpretation |
|--------|--------|----------------|
| **Question Diversity** | 35.36 | Avg unique questions per student (healthy exploration) |
| **Context Features** | 15D | User (6) + Question (5) + Interaction (4) features |
| **Selection Balance** | 0.467 | Gini coefficient (moderate balance) ⚠️ Needs Phase 4 recalc |

---

## 🛠️ Development & Testing Scripts

### Publication Pipeline (`scripts/testing/`) ⭐ RECOMMENDED

| Script | Purpose | Runtime |
|--------|---------|---------|
| **test-publication-pipeline.sh/bat** | Full automated pipeline | 2-4 hours |
| **monte-carlo-phase3.ts** ⭐ | Primary simulation (1,000 students) | ~20 min |
| **monte-carlo-contextual-bandit.ts** | Algorithm comparison | ~15 min |
| **cross-validation.ts** | 5-fold cross-validation | ~25 min |
| **baseline-models.ts** | 6 baseline comparisons | ~20 min |
| **fairness-analysis.ts** | Group-level equity analysis | ~10 min |
| **statistical-tests.ts** | Significance testing | ~5 min |
| **generate-publication-report.ts** | Final report generation | ~5 min |
| **visualization.py** | Generate 8 publication figures | ~3 min |

**Usage**:
```bash
# Full automated pipeline (recommended)
./scripts/testing/test-publication-pipeline.sh

# Individual primary simulation
npx tsx scripts/testing/monte-carlo-phase3.ts
```

See [scripts/README.md](../scripts/README.md) for complete guide.

---

### Admin Utilities (`scripts/admin/`)

| Script | Purpose | Usage |
|--------|---------|-------|
| **create-admin.ts** | Create admin account | `npx tsx scripts/admin/create-admin.ts` |
| **verify-admin.ts** | Verify admin credentials | `npx tsx scripts/admin/verify-admin.ts` |
| **migrate-to-enhanced-schema.ts** | Schema migration | `npx tsx scripts/admin/migrate-to-enhanced-schema.ts` |

---

### External Data Integration (`scripts/external-data/`)

| Script | Purpose | Usage |
|--------|---------|-------|
| **import-assistments.ts** | Import 2,500 ASSISTments questions | `npx tsx scripts/external-data/import-assistments.ts` |
| **import-irt-parameters.ts** | Import pre-calibrated IRT params | `npx tsx scripts/external-data/import-irt-parameters.ts` |

---

## 📁 Documentation Structure

```
docs/
├── README.md (this file)                    # Documentation index
│
├── 🚀 Getting Started
│   ├── USER_GUIDE.md                        # Complete user guide
│   ├── QUICK_START_ADMIN.md                 # Admin quick start
│   └── ENVIRONMENT_SETUP.md                 # Setup instructions
│
├── 📊 Research & Publication ⭐ NEW (Dec 2025)
│   ├── PUBLICATION_PIPELINE.md              # 2-4 hour reproduction guide
│   ├── METRICS_REFERENCE.md                 # Complete metrics dictionary
│   ├── OPERATIONAL_RELIABILITY.md           # Design philosophy
│   ├── FORMATIVE_VS_SUMMATIVE.md            # Context-appropriate metrics
│   ├── VALIDATION_REPORT.md                 # Final validation (14/14 targets)
│   └── archive/PHASE3_VALIDATION_REPORT.md  # Phase 3 baseline
│
├── 🎯 Core System
│   ├── CONTEXTUAL_BANDIT_GUIDE.md          # Contextual bandit overview
│   ├── 3PL_COMPLETE_GUIDE.md               # 3PL IRT technical guide
│   ├── CONVERGENCE_CONFIG_GUIDE.md          # Stopping criteria config
│   ├── PERSONALIZATION_METRICS_GUIDE.md     # Metrics explanation
│   └── LEARNER_PREFERENCES_ENGINE_MAPPING.md
│
├── 📚 Instructor Guides ⭐ NEW
│   ├── QUIZ_BANK_BEST_PRACTICES.md         # Creating custom quiz banks
│   └── SKIP_QUESTION_FEATURE.md             # Skip functionality
│
├── 🔬 Testing & Research
│   ├── SIMULATION_EVALUATION_GUIDE.md       # Monte Carlo methodology
│   └── PERSONALIZED_FEEDBACK.md             # LLM feedback system
│
├── 🔒 Admin & Security
│   └── ADMIN_SECURITY_SETUP.md             # Security configuration
│
├── 📂 archive/
│   ├── completed-tasks/                     # Historical sprint reports
│   └── optimization_history/                # Phase 1-3 development docs
│
└── 📂 sprints/                              # Development planning
```

---

## 🎯 Common Tasks

### 1. Reproduce Research Results (Peer Review)

```bash
# Full automated pipeline (2-4 hours)
./scripts/testing/test-publication-pipeline.sh

# Or step-by-step:
npx tsx scripts/external-data/import-assistments.ts
npx tsx scripts/external-data/import-irt-parameters.ts
npx tsx scripts/testing/generate-phase4-questions.ts --execute
npx tsx scripts/testing/monte-carlo-phase3.ts  # Run 3 times
npx tsx scripts/testing/average-phase4-results.ts
npx tsx scripts/testing/cross-validation.ts
npx tsx scripts/testing/baseline-models.ts
npx tsx scripts/testing/statistical-tests.ts
npx tsx scripts/testing/generate-publication-report.ts
python scripts/testing/visualization.py
```

See [PUBLICATION_PIPELINE.md](PUBLICATION_PIPELINE.md) for complete guide.

---

### 2. Create Custom Quiz Bank (Instructors)

**Prerequisites**: Read [QUIZ_BANK_BEST_PRACTICES.md](QUIZ_BANK_BEST_PRACTICES.md) first!

**Recommended Distribution** (formative assessment):
- Very Easy (b < -1.5): 12%
- Easy (-1.5 ≤ b < -0.5): 20%
- Medium (-0.5 ≤ b < 0.5): 36%
- Hard (0.5 ≤ b < 1.5): 20%
- Very Hard (b ≥ 1.5): 12%

**Minimum Requirements**:
- Total: 100+ questions (200+ recommended)
- Per topic: 20+ questions
- Monitor rescue rate (keep <30%)

**Upload Process**:
1. Prepare CSV with columns: `question_text`, `topic_name`, `difficulty_b`, `options_1-4`, `correct_option`
2. Admin Dashboard → Questions → Bulk Upload
3. Run pool analysis: `npx tsx scripts/testing/analyze-question-pool.ts`
4. Monitor rescue rate after deployment

---

### 3. Run System Health Check

```bash
# API health check
curl http://localhost:3000/api/admin/maintenance

# Pool distribution analysis
npx tsx scripts/testing/analyze-question-pool.ts

# View operational metrics
# → Admin Dashboard → Analytics → Operational Health
```

**Health Thresholds**:
- 🟢 Rescue Rate <20%: Excellent
- 🟢 Rescue Rate 20-30%: Healthy
- 🟡 Rescue Rate 30-40%: Warning (add questions soon)
- 🔴 Rescue Rate >40%: Critical (add questions immediately)

---

### 4. Optimize Hybrid Parameters (Advanced)

```bash
# Install Python dependencies
pip install -r scripts/optimization/requirements.txt

# Run Bayesian optimization (38 iterations complete)
# Current status: ✅ Optimized (Nov 2025)
# No further optimization needed unless changing objectives
```

---

## 🔄 System Workflow

### 1. Initial Setup
1. Configure environment ([ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md))
2. Create admin account ([QUICK_START_ADMIN.md](QUICK_START_ADMIN.md))
3. Import or create question pool ([QUIZ_BANK_BEST_PRACTICES.md](QUIZ_BANK_BEST_PRACTICES.md))

### 2. Research Validation (Optional)
1. Run publication pipeline ([PUBLICATION_PIPELINE.md](PUBLICATION_PIPELINE.md))
2. Verify all 14 targets met
3. Generate reports and figures

### 3. Production Deployment
1. Monitor operational health metrics (rescue rate, crash rate, precision)
2. Collect user feedback
3. Recalibrate questions after 50+ responses each
4. Retire poorly performing questions (`a` < 0.4)

### 4. Maintenance
1. Check pool health weekly: `GET /api/admin/maintenance`
2. Add questions if rescue rate >30%
3. Recalibrate quarterly: `POST /api/admin/maintenance {"job": "recalibrate"}`
4. Review engagement metrics monthly

---

## 📚 Additional Resources

### External Documentation
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js v5 Documentation](https://next-auth.js.org)
- [ASSISTments Dataset](https://sites.google.com/site/assistmentsdata/)

### Research Papers (To Be Updated)
- Li et al. (2010) - LinUCB for Contextual Bandits
- Birnbaum (1968) - 3PL IRT Model
- Lord (1980) - Fisher Information in Testing
- Mockus (1989) - Bayesian Optimization

---

## 🆘 Support

### Common Issues

| Issue | Solution |
|-------|----------|
| **High rescue rate (>40%)** | Add questions in underrepresented difficulty ranges. See [QUIZ_BANK_BEST_PRACTICES.md](QUIZ_BANK_BEST_PRACTICES.md#issue-1-high-rescue-rate-40) |
| **Students running out of questions** | Ensure 20+ questions per topic, 3+ per difficulty cell. See [QUIZ_BANK_BEST_PRACTICES.md](QUIZ_BANK_BEST_PRACTICES.md#issue-2-students-running-out-of-questions-crash-rate-1) |
| **Database connection errors** | See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md#database-setup) |
| **Admin access denied** | See [ADMIN_SECURITY_SETUP.md](ADMIN_SECURITY_SETUP.md) |
| **Simulation errors** | Check question pool has sufficient data, verify IRT parameters |
| **Metric calculation errors** | See [METRICS_REFERENCE.md](METRICS_REFERENCE.md) for data requirements |

### Getting Help

1. Check relevant documentation section above
2. Review troubleshooting in [QUIZ_BANK_BEST_PRACTICES.md](QUIZ_BANK_BEST_PRACTICES.md#common-issues-and-solutions)
3. Verify environment configuration
4. Check database schema is up-to-date (`npx prisma db push`)
5. Create GitHub issue with reproduction steps

---

## 📝 Recent Updates

### December 3, 2025 - Phase 4: Operational Reliability ⭐

**What changed:**
- ✅ **Research validation complete** - 14/14 targets met
- ✅ **4,100 question pool** - Added 1,600 strategically generated questions
- ✅ **Publication pipeline** - Complete 2-4 hour reproduction guide
- ✅ **New documentation** - 4 validation guides, 1 instructor guide
- ✅ **Metric pivot** - From "fairness gap" to "operational reliability"
- ✅ **Codebase cleanup** - 70% file reduction (58 → 22 scripts, removed dev utilities)

**New docs:**
- `PUBLICATION_PIPELINE.md` - Research reproduction
- `METRICS_REFERENCE.md` - Complete metrics dictionary
- `OPERATIONAL_RELIABILITY.md` - Design philosophy
- `FORMATIVE_VS_SUMMATIVE.md` - Context-appropriate metrics
- `QUIZ_BANK_BEST_PRACTICES.md` - Instructor guidance

### November 22, 2025 - Bayesian Optimization Complete

**What changed:**
- ✅ **38-iteration optimization** - +1.97% objective improvement
- ✅ **Optimized weight evolution** - 40% → 97% LinUCB (phase-adaptive)
- ✅ **Validated performance** - +2.45% correlation, +13.88% diversity

---

## 🔜 Future Enhancements

### Short-term
- [ ] A/B testing framework for parameter comparison
- [ ] Real-time operational health dashboard
- [ ] Import-time pool validation with warnings

### Medium-term
- [ ] Adaptive baseline distribution (learn from student population)
- [ ] Per-course configuration (remedial, honors, diagnostic presets)
- [ ] Guided recommendations ("Add 5 easy Algebra questions")

### Long-term
- [ ] Deep learning for context embedding
- [ ] Federated learning for privacy-preserving personalization
- [ ] Multi-objective optimization

---

**System Status**: ✅ **Production Ready - Research Validated - Publication Pipeline Ready**

**Version**: 4.0 (Operational Reliability - Research-Validated)

**Last Validation**: December 3, 2025 (14/14 targets met)

**Recommended Action**: Deploy with monitoring ([OPERATIONAL_RELIABILITY.md](OPERATIONAL_RELIABILITY.md))

---

**Quick Links**:
- [Reproduction Guide](PUBLICATION_PIPELINE.md)
- [Metrics Explained](METRICS_REFERENCE.md)
- [Complete Results](VALIDATION_REPORT.md)
- [Quiz Bank Guide](QUIZ_BANK_BEST_PRACTICES.md)
- [All Scripts](../scripts/README.md)
