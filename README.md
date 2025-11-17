# Adaptive Quiz System

An intelligent, adaptive learning platform powered by **3PL Item Response Theory (IRT)** with comprehensive performance analytics and research-grade psychometric capabilities.

---

## 🎯 Key Features

- **3PL IRT Model** - Accounts for guessing in multiple-choice questions
- **Adaptive Question Selection** - KLI-based algorithm with UCB exploration
- **Sympson-Hetter Exposure Control** - Prevents question over-exposure
- **Real-time Ability Estimation** - MLE and EAP methods
- **AI-Powered Personalized Feedback** ✨NEW - LLM-based insights using Gemini 2.5 Flash
- **Comprehensive Testing** - 158 tests, all passing ✅
- **Performance Analytics** - Monte Carlo simulation and learning metrics

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

**Optimization Applied**:
- ✅ Decaying exploration parameter (1.2 → 0.8)
- ✅ Wider warm-up difficulty range (±1.2)
- ✅ Moderate exposure penalty (0.25)

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

# Setup database
npx prisma generate
npx prisma db push

# (Optional) Configure Gemini API for AI feedback
# Get API key from: https://aistudio.google.com/apikey
# Add to .env: GEMINI_API_KEY="your-api-key-here"

# Create admin account
npx tsx src/scripts/create-admin.ts

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

**Default Admin Credentials**:
- Email: `admin@example.com`
- Password: `Admin123!`

**AI Feedback** (Optional):
- See [Personalized Feedback Guide](docs/PERSONALIZED_FEEDBACK.md) for setup

---

## 📚 Documentation

### Main Guides
- **[User Guide](docs/USER_GUIDE.md)** - Complete guide for setup, testing, and usage
- **[3PL Technical Guide](docs/3PL_COMPLETE_GUIDE.md)** - Deep dive into 3PL IRT implementation
- **[Simulation & Evaluation Guide](docs/SIMULATION_EVALUATION_GUIDE.md)** - Metrics, workflows, limitations, and best practices
- **[Performance Report](PERFORMANCE_IMPROVEMENT_SUMMARY.md)** - Comprehensive performance analysis
- **[Personalized Feedback Guide](docs/PERSONALIZED_FEEDBACK.md)** ✨NEW - AI-powered feedback setup and usage

### Quick Links
- [Testing Guide](docs/USER_GUIDE.md#testing-guide)
- [Simulation & Metrics](docs/SIMULATION_EVALUATION_GUIDE.md)
- [Admin Setup](docs/QUICK_START_ADMIN.md)
- [AI Feedback Setup](docs/PERSONALIZED_FEEDBACK.md#setup-instructions)
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

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (Prisma ORM)
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Testing**: Jest + React Testing Library
- **IRT Model**: 3PL (Three-Parameter Logistic)

---

## 📁 Project Structure

```
adaptive-quiz-system/
├── src/
│   ├── app/                    # Next.js app directory
│   ├── lib/
│   │   ├── adaptive-engine/    # Core IRT algorithms
│   │   │   ├── irt-3pl.ts              # 3PL functions
│   │   │   ├── irt-estimator-enhanced.ts
│   │   │   └── engine-enhanced.ts
│   │   └── db.ts               # Database client
│   └── scripts/                # CLI tools & simulations
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── dev.db                  # SQLite database
├── docs/                       # Documentation
│   ├── USER_GUIDE.md
│   ├── 3PL_COMPLETE_GUIDE.md
│   ├── archive/                # Historical docs
│   └── sprints/                # Sprint plans
└── PERFORMANCE_IMPROVEMENT_SUMMARY.md
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

### Adaptive Algorithm

1. **Warm-up Phase** - 3 questions to establish baseline
2. **Adaptive Phase** - Select questions using KLI + UCB
3. **Exposure Control** - Sympson-Hetter algorithm
4. **Stopping Criteria** - SEM < 0.5 or 25 questions max

---

## 🧬 Features

### Implemented ✅

- [x] 3PL IRT model with backward compatibility (2PL)
- [x] MLE and EAP ability estimation
- [x] KLI-based question selection
- [x] UCB exploration strategy
- [x] Sympson-Hetter exposure control
- [x] Synthetic data generation
- [x] Automated 3PL calibration
- [x] Question pool expansion (550 questions)
- [x] Monte Carlo simulation
- [x] Adaptive learning metrics
- [x] Comprehensive test coverage (158 tests)

### Planned 🔮

- [ ] Real-time calibration with production data
- [ ] Advanced analytics dashboard
- [ ] Multi-domain support
- [ ] Learning path recommendations
- [ ] A/B testing framework

---

## 📊 Performance Improvements

### Before vs After (3PL + 550 Questions)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| RMSE | 0.713 | 0.524 | **-26.5%** ✅ |
| Correlation | 0.839 | 0.881 | **+5.0%** ✅ |
| Reliability | 0.474 | 0.744 | **+57.0%** ✅ |
| Questions | 25.0 | 14.7 | **-41%** ✅ |

See [PERFORMANCE_IMPROVEMENT_SUMMARY.md](PERFORMANCE_IMPROVEMENT_SUMMARY.md) for details.

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

## Further Reading

- **Documentation**: [docs/README.md](docs/README.md)
- **User Guide**: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
- **Technical Guide**: [docs/3PL_COMPLETE_GUIDE.md](docs/3PL_COMPLETE_GUIDE.md)

---

**Version**: 2.0 (3PL Implementation + Optimized + Personalized Feedback)
**Last Updated**: 2025-11-12
**Status**: ✅ Testing Ready (Soon Production)
