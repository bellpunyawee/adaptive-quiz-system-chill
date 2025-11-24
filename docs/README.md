# Adaptive Quiz System - Documentation

Complete documentation for the Bayesian-optimized adaptive quiz system with contextual bandit personalization.

**Last Updated**: November 22, 2025

---

## 🚀 Quick Start

| For... | Start Here |
|--------|------------|
| **Users & Developers** | [USER_GUIDE.md](USER_GUIDE.md) - Complete setup and usage guide |
| **Administrators** | [QUICK_START_ADMIN.md](QUICK_START_ADMIN.md) - Admin setup and security |
| **Environment Setup** | [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) - Database and configuration |

---

## 📚 Core Documentation

### System Architecture

| Document | Description |
|----------|-------------|
| **[CONTEXTUAL_BANDIT_GUIDE.md](CONTEXTUAL_BANDIT_GUIDE.md)** | Contextual bandit system with LinUCB + IRT hybrid |
| **[HYBRID_OPTIMIZATION_RESULTS.md](HYBRID_OPTIMIZATION_RESULTS.md)** | Bayesian optimization results and validation |
| **[PERSONALIZATION_METRICS_GUIDE.md](PERSONALIZATION_METRICS_GUIDE.md)** | Question diversity, student overlap, selection concentration |
| **[3PL_COMPLETE_GUIDE.md](3PL_COMPLETE_GUIDE.md)** | 3PL IRT model technical reference |

### Testing & Evaluation

| Document | Description |
|----------|-------------|
| **[SIMULATION_EVALUATION_GUIDE.md](SIMULATION_EVALUATION_GUIDE.md)** | Monte Carlo simulation, metrics, workflows |
| **[PERSONALIZED_FEEDBACK.md](PERSONALIZED_FEEDBACK.md)** | LLM-powered feedback system |

### Setup & Configuration

| Document | Description |
|----------|-------------|
| **[USER_GUIDE.md](USER_GUIDE.md)** | Complete user guide with testing workflows |
| **[ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)** | Database setup, environment variables |
| **[ADMIN_SECURITY_SETUP.md](ADMIN_SECURITY_SETUP.md)** | Admin access and security configuration |

---

## 🎯 System Overview

### Hybrid Adaptive Engine

**Components**:
1. **LinUCB Contextual Bandit** - Personalized question selection using 15D context
2. **3PL IRT Model** - Psychometric foundation for ability estimation
3. **Bayesian-Optimized Weight Evolution** - Data-driven parameter tuning

**Performance** (vs baseline IRT):
- ✅ **+2.45% correlation** (better ranking quality)
- ✅ **+13.88% question diversity** (more exploration)
- ✅ **-8.49% selection concentration** (better coverage)

See [HYBRID_OPTIMIZATION_RESULTS.md](HYBRID_OPTIMIZATION_RESULTS.md) for full details.

### Weight Evolution (Optimized Parameters)

| Phase | Questions | LinUCB Weight | Strategy |
|-------|-----------|---------------|----------|
| **Phase 1** | Q0-7 | 40.3% → 70.8% | Conservative start, fast ramp-up |
| **Phase 2** | Q7-26 | 70.8% → 87.1% | Gradual learning phase |
| **Phase 3** | Q26+ | 87.1% → 97.0% | Sigma-adaptive, high confidence |

---

## 📊 Key Features

### 1. Contextual Bandit Personalization
- **LinUCB algorithm** with Upper Confidence Bound
- **15-dimensional context vector** (user ability, question features, interaction patterns)
- **Exploration-exploitation balance** with adaptive α parameter

### 2. Psychometric Foundation
- **3PL IRT model** (discrimination, difficulty, guessing)
- **Fisher information maximization** for efficient ability estimation
- **Adaptive question selection** based on current ability estimate

### 3. Bayesian-Optimized Parameters
- **38-iteration optimization** with Gaussian Process
- **Empirically validated** phase boundaries (Q7, Q26)
- **+1.97% objective improvement** over heuristic parameters

### 4. Personalization Metrics
- **Question Diversity**: Average unique questions per student
- **Student Overlap**: Jaccard similarity (lower = more personalized)
- **Selection Concentration**: Coefficient of variation (higher = more concentrated)

### 5. LLM-Powered Feedback
- **Context-aware explanations** for wrong answers
- **Personalized learning tips** based on user performance
- **Engagement tracking** with reaction system

---

## 🔬 Technical References

### Research Foundations

| Topic | Reference |
|-------|-----------|
| **LinUCB Algorithm** | Li et al. (2010) - Contextual-bandit approach to personalized news article recommendation |
| **3PL IRT Model** | Birnbaum (1968) - Three-parameter logistic model |
| **Fisher Information** | Lord (1980) - Applications of item response theory to practical testing problems |
| **Bayesian Optimization** | Mockus (1989) - Gaussian Process for global optimization |

See [RESEARCH_FRAMEWORKS_ANALYSIS.md](RESEARCH_FRAMEWORKS_ANALYSIS.md) for detailed analysis.

### Implementation Details

| Component | File | Description |
|-----------|------|-------------|
| **Hybrid Scoring** | `src/lib/contextual-bandit/hybrid.ts` | LinUCB + IRT combination |
| **LinUCB Model** | `src/lib/contextual-bandit/algorithms/linucb.ts` | Contextual bandit implementation |
| **3PL IRT** | `src/lib/adaptive-engine/irt-3pl.ts` | Item response theory |
| **Context Builder** | `src/lib/contextual-bandit/context-builder.ts` | 15D context vector |

---

## 📈 Performance Metrics

### Accuracy Metrics

| Metric | Hybrid | IRT-Only | LinUCB-Only |
|--------|--------|----------|-------------|
| **RMSE** | 0.771 | 0.764 | 0.957 |
| **Correlation** | 0.834 | 0.814 | 0.736 |
| **MAE** | 0.615 | 0.619 | 0.757 |

### Personalization Metrics

| Metric | Hybrid | IRT-Only | LinUCB-Only |
|--------|--------|----------|-------------|
| **Question Diversity** | 35.36 | 10.80 | 29.80 |
| **Student Overlap** | 0.271 | 0.255 | 0.240 |
| **Selection Concentration** | 0.467 | 1.528 | 0.585 |

---

## 🛠️ Development Scripts

### Active Scripts (`scripts/development/`)

| Script | Purpose | Usage |
|--------|---------|-------|
| **calibrate-3pl-questions.ts** | Calibrate IRT parameters | `npx tsx scripts/development/calibrate-3pl-questions.ts` |
| **simulate-adaptive-quiz.ts** | Test adaptive engine | `npx tsx scripts/development/simulate-adaptive-quiz.ts` |
| **generate-synthetic-responses.ts** | Generate test data | `npx tsx scripts/development/generate-synthetic-responses.ts` |
| **generate-predictive-analytics-questions.ts** | Create question pool | `npx tsx scripts/development/generate-predictive-analytics-questions.ts` |

### Testing Scripts (`scripts/testing/`)

| Script | Purpose | Usage |
|--------|---------|-------|
| **monte-carlo-contextual-bandit.ts** | Full system evaluation | `npx tsx scripts/testing/monte-carlo-contextual-bandit.ts testing Balanced` |
| **analyze-personalization.ts** | Personalization analysis | `npx tsx scripts/testing/analyze-personalization.ts` |

### Optimization Scripts (`scripts/optimization/`)

| Script | Purpose | Usage |
|--------|---------|-------|
| **bayesian_optimize_weights.py** | Optimize hybrid parameters | `python scripts/optimization/bayesian_optimize_weights.py` |
| **evaluate_config.py** | Evaluate parameter config | `python scripts/optimization/evaluate_config.py` |
| **compare_results.py** | Compare before/after | `python scripts/optimization/compare_results.py` |

---

## 📁 Documentation Structure

```
docs/
├── README.md (this file)                    # Documentation index
├── USER_GUIDE.md                            # Complete user guide
├── ENVIRONMENT_SETUP.md                     # Setup instructions
├── QUICK_START_ADMIN.md                     # Admin quick start
│
├── Core System
│   ├── CONTEXTUAL_BANDIT_GUIDE.md          # Contextual bandit overview
│   ├── HYBRID_OPTIMIZATION_RESULTS.md       # Optimization results
│   ├── PERSONALIZATION_METRICS_GUIDE.md     # Metrics explanation
│   ├── 3PL_COMPLETE_GUIDE.md               # 3PL IRT technical guide
│   └── LEARNER_PREFERENCES_ENGINE_MAPPING.md
│
├── Testing & Research
│   ├── SIMULATION_EVALUATION_GUIDE.md       # Testing workflows
│   ├── RESEARCH_FRAMEWORKS_ANALYSIS.md      # Research foundations
│   └── PERSONALIZED_FEEDBACK.md             # LLM feedback system
│
├── Admin & Security
│   └── ADMIN_SECURITY_SETUP.md             # Security configuration
│
└── archive/                                 # Historical documents
    └── completed-tasks/                     # Completed sprint reports
```

---

## 🎯 Common Tasks

### Run Full System Evaluation
```bash
# Testing config (100 students, 50 questions)
npx tsx scripts/testing/monte-carlo-contextual-bandit.ts testing Balanced

# Production config (1000 students, 50 questions)
npx tsx scripts/testing/monte-carlo-contextual-bandit.ts production Balanced
```

### Optimize Hybrid Parameters
```bash
# Install Python dependencies
pip install -r scripts/optimization/requirements.txt

# Run Bayesian optimization (150 iterations, ~2-3 hours)
python scripts/optimization/bayesian_optimize_weights.py --n-iter 150 --n-initial 25

# Compare results
python scripts/optimization/compare_results.py
```

### Generate Test Data
```bash
# Generate 100 students with synthetic responses
npx tsx scripts/development/generate-synthetic-responses.ts generate 100

# Calibrate question parameters
npx tsx scripts/development/calibrate-3pl-questions.ts
```

---

## 🔄 System Workflow

### 1. Initial Setup
1. Configure environment ([ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md))
2. Create admin account ([QUICK_START_ADMIN.md](QUICK_START_ADMIN.md))
3. Generate question pool ([USER_GUIDE.md](USER_GUIDE.md))

### 2. Testing & Validation
1. Generate synthetic data
2. Run Monte Carlo simulation
3. Analyze personalization metrics
4. Validate performance improvements

### 3. Optimization (Optional)
1. Run Bayesian optimization for parameters
2. Compare before/after performance
3. Deploy optimized configuration

### 4. Production Deployment
1. Monitor key metrics (correlation, RMSE, diversity)
2. Collect user feedback
3. Re-optimize periodically with production data

---

## 📚 Additional Resources

### External Documentation
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)

### Research Papers
- Li et al. (2010) - LinUCB for Contextual Bandits
- Birnbaum (1968) - 3PL IRT Model
- Lord (1980) - Fisher Information in Testing

---

## 🆘 Support

### Common Issues

| Issue | Solution |
|-------|----------|
| Database connection errors | See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md#database-setup) |
| Admin access denied | See [ADMIN_SECURITY_SETUP.md](ADMIN_SECURITY_SETUP.md) |
| Simulation errors | Check question pool has sufficient data |
| Optimization errors | Verify Python dependencies installed |

### Getting Help

1. Check relevant documentation section above
2. Review error messages and stack traces
3. Verify environment configuration
4. Check database schema is up-to-date (`npx prisma db push`)

---

## 🔜 Future Enhancements

### Short-term
- [ ] A/B testing framework for parameter comparison
- [ ] Real-time dashboard for monitoring metrics
- [ ] Scenario-specific optimization (Easy, Hard, Balanced)

### Medium-term
- [ ] Student-adaptive parameters (personalized evolution)
- [ ] Multi-armed bandit for algorithm selection
- [ ] Advanced engagement analytics

### Long-term
- [ ] Deep learning for context embedding
- [ ] Multi-objective optimization
- [ ] Federated learning for privacy-preserving personalization

---

**System Status**: ✅ Production Ready with Bayesian-Optimized Parameters

**Last Optimization**: November 22, 2025 (38 iterations, +1.97% improvement)

**Recommended Action**: Deploy with monitoring (see [HYBRID_OPTIMIZATION_RESULTS.md](HYBRID_OPTIMIZATION_RESULTS.md))
