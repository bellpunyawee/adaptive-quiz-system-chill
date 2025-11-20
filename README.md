# Adaptive Quiz System

An intelligent, adaptive learning platform powered by **3PL Item Response Theory (IRT)** with **Contextual Bandit** personalization, comprehensive performance analytics, and AI-powered feedback.

---

## 🎯 Key Features

### Core Capabilities
- **3PL IRT Model** - Accounts for guessing in multiple-choice questions
- **Contextual Bandit** ✨**NEW** - LinUCB algorithm for personalized question selection
- **Adaptive Question Selection** - Hybrid LinUCB + IRT with UCB exploration
- **Sympson-Hetter Exposure Control** - Prevents question over-exposure
- **Real-time Ability Estimation** - MLE and EAP methods
- **AI-Powered Personalized Feedback** - LLM-based insights using Gemini 2.5 Flash

### Quality & Performance
- **Comprehensive Testing** - 158 tests, all passing ✅
- **Performance Analytics** - Monte Carlo simulation and learning metrics
- **Production-Ready** - Optimized for deployment

---

## 📊 System Performance

**Current Status**: Production-Ready (65.2/100) - Optimized Nov 2025

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Accuracy (RMSE)** | 0.641 | <0.70 | ✅ Good |
| **Validity (Correlation)** | 0.851 | >0.85 | ✅ Excellent |
| **Reliability (IRT)** | 0.527 | >0.40 | ✅ Good |
| **Test-Retest** | 0.863 | >0.80 | ✅ Excellent |
| **Precision** | 64.0% | >60% | ✅ Good |
| **Optimal Questions** | 34.6% | >30% | ✅ Good |
| **Questions/Student** | 23.8 avg | <30 | ✅ Efficient |

**Optimizations Applied**:
- ✅ Decaying exploration parameter (1.2 → 0.8)
- ✅ Wider warm-up difficulty range (±1.2)
- ✅ Moderate exposure penalty (0.25)
- ✅ Contextual bandit ready for deployment

**Suitable For**: Production deployment, formative assessment, adaptive practice, diagnostic testing

![Optimization Results](optimization_comparison_graphs.png)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repository-url>
cd adaptive-quiz-system

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local and add your API keys (see docs/ENVIRONMENT_SETUP.md)

# Setup database
npx prisma generate
npx prisma db push

# Create admin account
npx tsx src/scripts/create-admin.ts

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

**Default Admin Credentials**:
- Email: `admin@example.com`
- Password: `Admin123!`

---

## ⚙️ Configuration

### Environment Setup

See **[docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md)** for complete configuration guide.

**Quick setup:**
```bash
# Copy template
cp .env.example .env.local

# Required variables:
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="<from https://aistudio.google.com/apikey>"

# Optional - Contextual Bandit (NEW!)
CONTEXTUAL_BANDIT_ENABLED=false      # Set to true to enable
CONTEXTUAL_BANDIT_MODE=hybrid        # hybrid | linucb | irt-only
CONTEXTUAL_BANDIT_TRAFFIC=0          # 0-100 (% of users)
```

### Contextual Bandit (Advanced Feature)

The system includes a **Contextual Bandit** for personalized question selection:

- **Disabled by default** - Enable via environment variables
- **Shadow mode available** - Log decisions without affecting users (`TRAFFIC=0`)
- **A/B testing ready** - Gradually rollout to percentage of users
- **Hybrid approach** - Combines LinUCB with proven IRT methods

📖 **Full Guide**: [docs/CONTEXTUAL_BANDIT.md](docs/CONTEXTUAL_BANDIT.md)

---

## 📚 Documentation

### Main Guides
- **[User Guide](docs/USER_GUIDE.md)** - Complete setup, testing, and usage
- **[Environment Setup](docs/ENVIRONMENT_SETUP.md)** - Configuration guide
- **[Contextual Bandit Guide](docs/CONTEXTUAL_BANDIT.md)** ✨**NEW** - Personalized selection system
- **[3PL Technical Guide](docs/3PL_COMPLETE_GUIDE.md)** - Deep dive into 3PL IRT
- **[Simulation & Evaluation](docs/SIMULATION_EVALUATION_GUIDE.md)** - Metrics and workflows
- **[Personalized Feedback](docs/PERSONALIZED_FEEDBACK.md)** - AI-powered feedback setup

### Quick Links
- [Testing Guide](docs/USER_GUIDE.md#testing-guide)
- [Admin Setup](docs/QUICK_START_ADMIN.md)
- [Documentation Index](docs/README.md)

---

## 🧪 Running Tests

```bash
# All tests (158 tests)
npm test

# Specific test suite
npm test irt-3pl                    # 3PL core functions
npm test 3pl-integration            # Integration tests
npm test engine                     # Question selection

# Build check
npm run build
```

---

## 📈 Performance Evaluation

### Generate Synthetic Data
```bash
# Generate 100 responses per question
npx tsx src/scripts/generate-synthetic-responses.ts generate 100

# Calibrate questions with 3PL parameters
npx tsx src/scripts/calibrate-3pl-questions.ts calibrate
```

### Run Simulations
```bash
# Monte Carlo simulation (10 runs, 50 students, 25 questions max)
npx tsx src/scripts/monte-carlo-simulation.ts 10 50 25

# Adaptive learning metrics (100 students, 25 questions max)
npx tsx src/scripts/adaptive-learning-metrics.ts 100 25
```

### Expand Question Pool
```bash
# Generate 500 questions with Gaussian distribution
npx tsx src/scripts/expand-question-pool.ts 500
```

---

## 🏗️ Tech Stack

### Core Technologies
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (Prisma ORM)
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Testing**: Jest + React Testing Library

### Algorithms
- **IRT Model**: 3PL (Three-Parameter Logistic)
- **Selection**: Contextual Bandit (LinUCB) + IRT-UCB Hybrid
- **AI**: Google Gemini 2.5 Flash for personalized feedback

---

## 📁 Project Structure

```
adaptive-quiz-system/
├── src/
│   ├── app/                          # Next.js app directory
│   ├── lib/
│   │   ├── adaptive-engine/          # Core IRT algorithms
│   │   │   ├── irt-3pl.ts            # 3PL functions
│   │   │   ├── irt-estimator-enhanced.ts
│   │   │   ├── engine-enhanced.ts    # Question selection
│   │   │   └── ucb.ts                # UCB algorithm
│   │   ├── contextual-bandit/        # NEW: LinUCB system
│   │   │   ├── features/             # 15D context vectors
│   │   │   ├── algorithms/           # LinUCB + Sherman-Morrison
│   │   │   ├── engine-contextual.ts  # Selection engine
│   │   │   ├── hybrid.ts             # LinUCB + IRT hybrid
│   │   │   └── monitoring.ts         # Analytics
│   │   └── db.ts                     # Database client
│   └── scripts/                      # CLI tools & simulations
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── dev.db                        # SQLite database
├── docs/                             # Documentation
│   ├── CONTEXTUAL_BANDIT.md          # NEW: Contextual bandit guide
│   ├── ENVIRONMENT_SETUP.md          # NEW: Config guide
│   ├── USER_GUIDE.md
│   ├── 3PL_COMPLETE_GUIDE.md
│   └── SIMULATION_EVALUATION_GUIDE.md
├── .env.example                      # Environment template
├── .env.local                        # Development config (gitignored)
└── .env.production                   # Production config (gitignored)
```

---

## 🎓 Key Concepts

### 3PL IRT Model

The Three-Parameter Logistic model accounts for guessing in multiple-choice questions:

```
P(θ) = c + (1 - c) / (1 + exp(-a(θ - b)))

Where:
- θ (theta) = student ability
- a = discrimination (item quality, 0.5-2.5)
- b = difficulty (item location, -3 to +3)
- c = guessing (pseudo-chance level, 0-0.35)
```

### Contextual Bandit (LinUCB)

Personalized question selection using contextual features:

```
UCB(x) = x^T θ̂ + α√(x^T A^(-1) x)
       = Expected Reward + Exploration Bonus

Where:
- x = 15D context vector (user + question + interaction features)
- θ̂ = learned weight vector (personalized)
- α = exploration parameter (default 1.5)
```

### Hybrid Scoring

Combines LinUCB with IRT for best of both worlds:

```
Score = w_linucb × UCB_linucb + w_irt × UCB_irt

Default weights: 70% LinUCB + 30% IRT (adaptive)
```

### Adaptive Algorithm

1. **Warm-up Phase** - 3 questions to establish baseline
2. **Adaptive Phase** - Select questions using hybrid scoring
3. **Exposure Control** - Sympson-Hetter algorithm
4. **Stopping Criteria** - SEM < 0.5 or 25 questions max

---

## 🧬 Features

### Implemented ✅

#### Core System
- [x] 3PL IRT model with backward compatibility (2PL)
- [x] MLE and EAP ability estimation
- [x] KLI-based question selection
- [x] UCB exploration strategy
- [x] Sympson-Hetter exposure control
- [x] Comprehensive test coverage (158 tests)

#### Advanced Features
- [x] **Contextual Bandit (LinUCB)** - Personalized selection
- [x] **Hybrid Scoring** - LinUCB + IRT combination
- [x] **Multi-objective Rewards** - Correctness + info gain + speed
- [x] **A/B Testing Framework** - Hash-based user assignment
- [x] **AI-Powered Feedback** - Gemini 2.5 Flash integration

#### Data & Analytics
- [x] Synthetic data generation
- [x] Automated 3PL calibration
- [x] Question pool expansion (550 questions)
- [x] Monte Carlo simulation
- [x] Adaptive learning metrics
- [x] Feature importance analysis

### Planned 🔮

- [ ] Real-time calibration with production data
- [ ] Advanced analytics dashboard
- [ ] Multi-domain support
- [ ] Learning path recommendations
- [ ] Neural contextual bandits (deep learning)

---

## 📊 Performance Improvements

### Before vs After (3PL + 550 Questions)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| RMSE | 0.713 | 0.524 | **-26.5%** ✅ |
| Correlation | 0.839 | 0.881 | **+5.0%** ✅ |
| Reliability | 0.474 | 0.744 | **+57.0%** ✅ |
| Questions | 25.0 | 14.7 | **-41%** ✅ |

### Contextual Bandit Expected Benefits

- **10-20% reduction** in questions to mastery
- **5-15% improvement** in ability estimate accuracy
- **Better personalization** - Questions adapt to individual patterns
- **Continuous learning** - Models improve over time

See [PERFORMANCE_IMPROVEMENT_SUMMARY.md](PERFORMANCE_IMPROVEMENT_SUMMARY.md) for details.

---

## 🔄 Recent Updates

### Version 2.1 (Nov 2025) - Contextual Bandit
- ✅ LinUCB algorithm implementation (~3,000 lines)
- ✅ 15-dimensional context vectors
- ✅ Hybrid LinUCB + IRT scoring
- ✅ Multi-objective reward system
- ✅ Feature flags & A/B testing
- ✅ Comprehensive monitoring
- ✅ Environment configuration system

### Version 2.0 (Nov 2025) - Optimized
- ✅ 3PL IRT implementation
- ✅ Performance optimization
- ✅ AI-powered personalized feedback
- ✅ 550 question pool
- ✅ Enhanced testing suite

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the CHILL NUS.

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [NextAuth.js](https://next-auth.js.org/)
- [Google Gemini](https://ai.google.dev/)

Academic References:
- Li et al. (2010) - "A Contextual-Bandit Approach to Personalized News Article Recommendation" (LinUCB)
- Embretson & Reise (2000) - "Item Response Theory for Psychologists"
- Wainer et al. (2000) - "Computerized Adaptive Testing: A Primer"

---

## 📖 Further Reading

### Essential Documentation
- **[Quick Start](docs/QUICK_START_ADMIN.md)** - Get started in 5 minutes
- **[Environment Setup](docs/ENVIRONMENT_SETUP.md)** - Configuration guide
- **[User Guide](docs/USER_GUIDE.md)** - Complete system guide
- **[Contextual Bandit](docs/CONTEXTUAL_BANDIT.md)** - Personalization system

### Technical Guides
- **[3PL Technical Guide](docs/3PL_COMPLETE_GUIDE.md)** - IRT implementation
- **[Simulation Guide](docs/SIMULATION_EVALUATION_GUIDE.md)** - Evaluation workflows
- **[Personalized Feedback](docs/PERSONALIZED_FEEDBACK.md)** - AI setup

### Implementation Details
- **[Contextual Bandit Summary](IMPLEMENTATION_SUMMARY.md)** - Quick overview
- **[Environment Files](ENVIRONMENT_FILES_SETUP.md)** - Config structure
- **[Documentation Index](docs/README.md)** - All documentation

---

**Version**: 2.1 (Contextual Bandit + 3PL + AI Feedback)
**Last Updated**: 2025-11-19
**Status**: ✅ Production Ready

**New in this version:**
- 🎯 Contextual Bandit for personalized question selection
- 🔧 Professional environment configuration
- 📊 Enhanced monitoring and analytics
- 🚀 A/B testing framework
