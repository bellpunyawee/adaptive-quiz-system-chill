# Adaptive Quiz System - User Guide

**Version**: 2.0 (3PL Implementation)
**Last Updated**: 2025-11-12

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Testing Guide](#testing-guide)
3. [Simulation & Analysis](#simulation--analysis)
4. [Admin Guide](#admin-guide)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start

### For Developers

#### 1. Setup
```bash
# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

#### 2. Create Admin Account
```bash
npx tsx src/scripts/create-admin.ts
```
**Default credentials**:
- Email: `admin@example.com`
- Password: `Admin123!`

#### 3. Run Tests
```bash
# All tests
npm test

# Specific test suite
npm test irt-3pl
npm test 3pl-integration
```

---

## Testing Guide

### Unit Tests

#### Run All Adaptive Engine Tests
```bash
npm test src/lib/adaptive-engine
```

**Test Suites**:
- `irt-3pl.test.ts` - 3PL core functions (35 tests)
- `3pl-integration.test.ts` - Integration tests (10 tests)
- `engine.test.ts` - Question selection (35 tests)
- `enhanced-features.test.ts` - Advanced features (29 tests)
- `stopping-criteria.test.ts` - Convergence logic (19 tests)
- `sympson-hetter.test.ts` - Exposure control (17 tests)
- `warm-up-strategy.test.ts` - Initial questions (13 tests)

**Total**: 158 tests ✅

### Quick Test Commands

```bash
# Fast check (build + basic tests)
npm run build && npm test -- --testPathPattern=3pl

# Full test suite
npm test

# Watch mode for development
npm test -- --watch
```

---

## Simulation & Analysis

### Generate Synthetic Data

#### 1. Generate Responses
```bash
# Generate 100 responses per question
npx tsx src/scripts/generate-synthetic-responses.ts generate 100

# Or specify custom number
npx tsx src/scripts/generate-synthetic-responses.ts generate 50
```

**What it does**:
- Creates synthetic users with N(0, 1) ability distribution
- Generates realistic responses using 3PL model
- Stores in database for calibration

#### 2. Calibrate Questions
```bash
# Calibrate all questions with ≥30 responses
npx tsx src/scripts/calibrate-3pl-questions.ts calibrate

# Dry run (preview only)
npx tsx src/scripts/calibrate-3pl-questions.ts dry-run
```

**Output**:
- Updated 3PL parameters (a, b, c)
- Calibration date and sample size
- Quality metrics

### Performance Evaluation

#### Monte Carlo Simulation
```bash
# Syntax: npx tsx monte-carlo-simulation.ts [runs] [students] [maxQuestions]
npx tsx src/scripts/monte-carlo-simulation.ts 10 50 25
```

**Metrics Reported**:
- **RMSE** - Estimation accuracy
- **Correlation** - Validity
- **Test-Retest** - Reliability
- **Conditional SEM** - Precision by ability level
- **System Stability** - Variability across runs

#### Adaptive Learning Metrics
```bash
# Syntax: npx tsx adaptive-learning-metrics.ts [students] [maxQuestions]
npx tsx src/scripts/adaptive-learning-metrics.ts 100 25
```

**Metrics Reported**:
- **Precision** - Question selection quality (TP / TP+FP)
- **Learning Gain** - Ability improvement (Δθ)
- **System Effectiveness** - Overall score /100

### Expand Question Pool

```bash
# Generate 500 questions with Gaussian distribution
npx tsx src/scripts/expand-question-pool.ts 500

# Dry run to preview distribution
npx tsx src/scripts/expand-question-pool.ts 500 --dry-run
```

**Distribution**: N(0, 1.2) - Natural coverage of ability range

---

## Admin Guide

### Admin Dashboard Access

1. **Create Admin Account** (if not exists)
   ```bash
   npx tsx src/scripts/create-admin.ts
   ```

2. **Login**
   - Navigate to `/login`
   - Email: `admin@example.com`
   - Password: `Admin123!`

3. **Admin Features**
   - User management
   - Question bank editing
   - Performance analytics
   - System configuration

### Security Best Practices

#### Change Default Password
```bash
# Login to app, go to Settings → Change Password
# Or use database directly:
npx tsx src/scripts/update-admin-password.ts
```

#### Environment Variables
```bash
# .env.local
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="<generate-unique-secret>"
NEXTAUTH_URL="http://localhost:3000"
```

**Generate secret**:
```bash
openssl rand -base64 32
```

---

## Troubleshooting

### Common Issues

#### Issue: Tests failing after migration
**Solution**:
```bash
# Regenerate Prisma client
npx prisma generate

# Run migrations
npx prisma db push

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Issue: "Cannot find module" errors
**Solution**:
```bash
# Check TypeScript paths are correct
npx tsc --noEmit

# Rebuild
npm run build
```

#### Issue: Database locked
**Solution**:
```bash
# Stop all running processes
# Then:
rm prisma/dev.db
npx prisma db push
```

#### Issue: Synthetic data generation slow
**Tip**: Run in background
```bash
# Start in background
npx tsx src/scripts/generate-synthetic-responses.ts generate 100 &

# Check progress
tail -f <output-file>
```

### Performance Issues

#### Database Performance
```bash
# Vacuum database
sqlite3 prisma/dev.db "VACUUM;"

# Analyze query performance
sqlite3 prisma/dev.db "EXPLAIN QUERY PLAN <your-query>;"
```

#### Large Datasets
For >1000 questions or >100,000 responses:
- Consider PostgreSQL migration
- Add database indexes
- Implement caching

---

## Quick Reference

### Key Commands

```bash
# Development
npm run dev                                    # Start dev server
npm run build                                  # Build for production
npm test                                       # Run tests

# Database
npx prisma studio                              # Open database GUI
npx prisma db push                             # Apply schema changes
npx prisma generate                            # Generate client

# Scripts
npx tsx src/scripts/create-admin.ts            # Create admin
npx tsx src/scripts/generate-synthetic-responses.ts generate 100
npx tsx src/scripts/calibrate-3pl-questions.ts calibrate
npx tsx src/scripts/monte-carlo-simulation.ts 10 50 25
npx tsx src/scripts/adaptive-learning-metrics.ts 100 25
npx tsx src/scripts/expand-question-pool.ts 500
```

### Important Files

```
📁 Project Structure
├── src/
│   ├── app/                    # Next.js pages
│   ├── lib/
│   │   ├── adaptive-engine/    # Core IRT algorithms
│   │   │   ├── irt-3pl.ts              # 3PL functions
│   │   │   ├── irt-estimator-enhanced.ts # Ability estimation
│   │   │   └── engine-enhanced.ts      # Question selection
│   │   └── db.ts               # Database client
│   └── scripts/                # CLI tools
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── dev.db                  # SQLite database
└── docs/                       # Documentation
    ├── 3PL_COMPLETE_GUIDE.md   # Technical guide
    └── USER_GUIDE.md           # This file
```

---

## Getting Help

### Resources
- **3PL Technical Guide**: `docs/3PL_COMPLETE_GUIDE.md`
- **Performance Report**: `PERFORMANCE_IMPROVEMENT_SUMMARY.md`
- **Test Examples**: `src/lib/adaptive-engine/__tests__/`

### Support
For issues or questions:
1. Check this guide
2. Review test cases for examples
3. Check documentation in code comments

---

**Last Updated**: 2025-11-12
