# Adaptive Quiz System

Intelligent adaptive learning platform with **Bayesian-optimized Contextual Bandit** + **3PL IRT** for personalized question selection and AI-powered feedback.

**Status**: ✅ Production Ready | **Version**: 3.0 (Nov 2025) | **Tests**: 158 passing

---

## 🎯 What It Does

Delivers personalized adaptive quizzes that:

- **Select optimal questions** using LinUCB contextual bandit + IRT hybrid
- **Estimate ability** in real-time with 3PL Item Response Theory
- **Provide AI feedback** with Google Gemini for wrong answers
- **Adapt learning paths** based on 15D context vectors per student

**Result**: Students reach mastery faster with better accuracy and higher engagement.

---

## ⚡ Quick Start

```bash
# Install
npm install
npx prisma generate && npx prisma db push

# Configure
cp .env.example .env.local
# Add: DATABASE_URL, AUTH_SECRET, GEMINI_API_KEY

# Run
npm run dev
# Visit http://localhost:3000
```

**Admin Setup**: See [docs/QUICK_START_ADMIN.md](docs/QUICK_START_ADMIN.md)

**Full Guide**: See [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

---

## 🚀 Key Features

### Bayesian-Optimized Hybrid System

- **LinUCB Contextual Bandit** - Learns personalized question patterns
- **3PL IRT Foundation** - Proven psychometric approach
- **Optimized Weight Evolution** - Data-driven parameter tuning (38 iterations)

**Performance vs Baseline IRT**:

- ✅ **+2.45% correlation** (better ranking quality)
- ✅ **+13.88% question diversity** (more exploration)
- ✅ **-8.49% selection concentration** (better coverage)
- ✅ **+1.97% objective improvement** overall

### Weight Evolution (Optimized Parameters)

| Phase | Questions | LinUCB Weight | Strategy |
|-------|-----------|---------------|----------|
| Phase 1 | Q0-7 | 40.3% → 70.8% | Conservative start, fast ramp-up |
| Phase 2 | Q7-26 | 70.8% → 87.1% | Gradual learning phase |
| Phase 3 | Q26+ | 87.1% → 97.0% | Sigma-adaptive, high confidence |

### Additional Features

- **AI-Powered Feedback** - Gemini 2.5 Flash with personalized explanations
- **Exposure Control** - Sympson-Hetter prevents over-use
- **Real-time Analytics** - Personalization metrics and monitoring
- **A/B Testing Ready** - Feature flags for gradual rollout

---

## 📊 System Performance

### Accuracy Metrics (Latest Testing)

| Metric | Hybrid | IRT-Only | LinUCB-Only |
|--------|--------|----------|-------------|
| **RMSE** (↓) | 0.771 | 0.764 | 0.957 |
| **Correlation** (↑) | **0.834** | 0.814 | 0.736 |
| **MAE** (↓) | 0.615 | 0.619 | 0.757 |

### Personalization Metrics

| Metric | Hybrid | IRT-Only | Interpretation |
|--------|--------|----------|----------------|
| **Question Diversity** | **35.36** | 10.80 | More exploration ✅ |
| **Student Overlap** | 0.271 | 0.255 | Personalization level |
| **Selection Concentration** | **0.467** | 1.528 | Better distribution ✅ |

**Recommendation**: Deploy with monitoring ([full results](docs/HYBRID_OPTIMIZATION_RESULTS.md))

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Database**: SQLite + Prisma ORM (+ MongoDB)
- **Authentication**: NextAuth.js v5
- **AI**: Gemini 2.5 Flash (Dependable)
- **Key Algorithms**: LinUCB (contextual bandit), 3-PL IRT, Bayesian optimization

---

## 📚 Documentation

| For... | See... |
|--------|--------|
| **Getting Started** | [docs/USER_GUIDE.md](docs/USER_GUIDE.md) |
| **Environment Setup** | [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md) |
| **Contextual Bandit** | [docs/CONTEXTUAL_BANDIT_GUIDE.md](docs/CONTEXTUAL_BANDIT_GUIDE.md) |
| **Optimization Results** | [docs/HYBRID_OPTIMIZATION_RESULTS.md](docs/HYBRID_OPTIMIZATION_RESULTS.md) |
| **3PL IRT Technical** | [docs/3PL_COMPLETE_GUIDE.md](docs/3PL_COMPLETE_GUIDE.md) |
| **Testing & Evaluation** | [docs/SIMULATION_EVALUATION_GUIDE.md](docs/SIMULATION_EVALUATION_GUIDE.md) |
| **All Documentation** | [docs/README.md](docs/README.md) |

---

## Running Tests & Evaluation

### Test Suite

```bash
npm test                # All 158 tests
npm run build          # Production build check
```

### Monte Carlo Simulation

```bash
# Quick test (100 students, 50 questions)
npx tsx scripts/testing/monte-carlo-contextual-bandit.ts testing Balanced

# Production eval (1000 students)
npx tsx scripts/testing/monte-carlo-contextual-bandit.ts production Balanced
```

### Bayesian Optimization (Advanced)

```bash
# Install Python dependencies
pip install -r scripts/optimization/requirements.txt

# Run optimization (150 iterations, ~2-3 hours)
python scripts/optimization/bayesian_optimize_weights.py --n-iter 150

# Compare results
python scripts/optimization/compare_results.py
```

See [scripts/README.md](scripts/README.md) for all available scripts.

---

## HOW IT WORKS

### 1. Contextual Bandit (LinUCB)

Learns from 15D context vectors:

- **User features**: ability, response patterns, session progress
- **Question features**: difficulty, discrimination, topic
- **Interaction features**: IRT probability, topic weakness match

**Algorithm**: Upper Confidence Bound with linear regression

```
UCB(x) = x^T θ̂ + α√(x^T A^(-1) x)
```

### 2. 3PL IRT Model

Accounts for guessing in multiple-choice:

```
P(θ) = c + (1-c) / (1 + exp(-a(θ-b)))
```

- `a` = discrimination (0.8-2.2)
- `b` = difficulty (-2.0 to +2.0)
- `c` = guessing (0.15-0.30)

### 3. Hybrid Scoring

Combines LinUCB with IRT using Bayesian-optimized weights:

```
Score = w_linucb × UCB_linucb + w_irt × UCB_irt
```

Weights evolve from 40% → 97% LinUCB as confidence grows.

---

##  Recent Updates

### November 22, 2025 - Bayesian Optimization

- ✅ 38-iteration Gaussian Process optimization
- ✅ Empirically validated phase boundaries (Q7, Q26)
- ✅ +1.97% objective function improvement
- ✅ Updated default parameters in production code
- ✅ Comprehensive validation and documentation

### November 2025 - Contextual Bandit

- ✅ LinUCB algorithm (~3,000 lines)
- ✅ 15D context vectors
- ✅ Hybrid LinUCB + IRT scoring
- ✅ Multi-objective rewards (correctness + info + speed)
- ✅ A/B testing framework

### Earlier - Foundation

- ✅ 3PL IRT implementation
- ✅ 550-question pool with Gaussian distribution
- ✅ AI-powered personalized feedback (Gemini)
- ✅ Comprehensive testing (158 tests)

---

## 📁 Project Structure

```
adaptive-quiz-system/
├── src/
│   ├── app/                      # Next.js 15 app router
│   ├── lib/
│   │   ├── contextual-bandit/   # LinUCB implementation
│   │   │   ├── hybrid.ts        # ★ Optimized parameters
│   │   │   ├── algorithms/      # LinUCB, Sherman-Morrison
│   │   │   ├── features/        # 15D context vectors
│   │   │   └── monitoring.ts    # Analytics
│   │   └── adaptive-engine/     # 3PL IRT core
│   │       ├── irt-3pl.ts
│   │       └── engine-enhanced.ts
├── scripts/
│   ├── development/             # Dev utilities
│   ├── testing/                 # Evaluation scripts
│   └── optimization/            # Bayesian optimization (Python)
├── docs/                        # Comprehensive documentation
└── prisma/                      # Database schema
```

---

## Configuration

### Basic Setup (.env.local)

```bash
# Required
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="<from https://aistudio.google.com/apikey>"

# Contextual Bandit (optional)
CONTEXTUAL_BANDIT_ENABLED=false      # Enable/disable
CONTEXTUAL_BANDIT_MODE=hybrid        # hybrid | linucb | irt-only
CONTEXTUAL_BANDIT_TRAFFIC=0          # 0-100 (% of users)
```

See [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md) for complete guide.

---

## For Team Members

### Quick Reference

- **Set up locally** → [docs/USER_GUIDE.md](docs/USER_GUIDE.md#quick-start)
- **Understand the system** → [docs/CONTEXTUAL_BANDIT_GUIDE.md](docs/CONTEXTUAL_BANDIT_GUIDE.md)
- **Run tests** → `npm test` + [docs/SIMULATION_EVALUATION_GUIDE.md](docs/SIMULATION_EVALUATION_GUIDE.md)
- **See optimization results** → [docs/HYBRID_OPTIMIZATION_RESULTS.md](docs/HYBRID_OPTIMIZATION_RESULTS.md)
- **Use scripts** → [scripts/README.md](scripts/README.md)
- **Deploy to production** → [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md)
- **Report issues** → Create GitHub issue with reproduction steps

### Key Files to Know

- `src/lib/contextual-bandit/hybrid.ts` - **Core algorithm** (Bayesian-optimized)
- `docs/HYBRID_OPTIMIZATION_RESULTS.md` - **Latest results** (Nov 22)
- `scripts/optimization/` - **Bayesian optimization** scripts
- `docs/README.md` - **Documentation index**

---

<!-- ## 📈 What's Next

### Short-term

- [ ] A/B testing framework for production validation
- [ ] Real-time dashboard for monitoring
- [ ] Scenario-specific optimization (Easy, Hard, Balanced)

### Medium-term

- [ ] Student-adaptive parameters (personalized evolution)
- [ ] Multi-objective optimization with constraints
- [ ] Advanced engagement analytics

### Long-term

- [ ] Deep learning for context embedding
- [ ] Federated learning for privacy-preserving personalization
- [ ] Multi-domain support

--- -->

## 📖 Research & References

**Key Papers**:
- Will be updated soon
<!-- - Li et al. (2010) - LinUCB for Contextual Bandits
- Birnbaum (1968) - 3PL IRT Model
- Lord (1980) - Fisher Information in Testing
- Mockus (1989) - Bayesian Optimization with Gaussian Process -->

**Implementation**:

- ~15,000 lines of TypeScript
- ~1,000 lines of Python (optimization)
- 158 passing tests
- 38 optimization iterations (Bayesian)
- 13 comprehensive documentation files

---

## 📝 License

CHILL NUS

---

**Last Updated**: November 22, 2025

**Status**: ✅ Production Ready with Bayesian-Optimized Parameters

**Contact**: See repository maintainers

---

**Quick Links**: [Docs](docs/README.md) | [Setup](docs/USER_GUIDE.md) | [Optimization](docs/HYBRID_OPTIMIZATION_RESULTS.md) | [Scripts](scripts/README.md) | [Issues](https://github.com)
