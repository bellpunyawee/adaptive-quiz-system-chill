# Scripts Directory

Utility scripts for development, testing, and optimization of the adaptive quiz system.

---

## 📁 Directory Structure

```
scripts/
├── development/        # Development utilities
├── testing/           # Testing and evaluation scripts
├── optimization/      # Parameter optimization
└── archive/          # Historical one-time scripts
```

---

## 🛠️ Development Scripts

**Location**: `scripts/development/`

| Script | Purpose | Usage |
|--------|---------|-------|
| **calibrate-3pl-questions.ts** | Calibrate IRT parameters from response data | `npx tsx scripts/development/calibrate-3pl-questions.ts` |
| **simulate-adaptive-quiz.ts** | Simulate adaptive quiz performance | `npx tsx scripts/development/simulate-adaptive-quiz.ts [students] [questions]` |
| **generate-synthetic-responses.ts** | Generate test data for development | `npx tsx scripts/development/generate-synthetic-responses.ts generate [count]` |
| **generate-predictive-analytics-questions.ts** | Create predictive analytics question pool | `npx tsx scripts/development/generate-predictive-analytics-questions.ts` |

---

## 🧪 Testing Scripts

**Location**: `scripts/testing/`

| Script | Purpose | Usage |
|--------|---------|-------|
| **monte-carlo-contextual-bandit.ts** | Full Monte Carlo evaluation | `npx tsx scripts/testing/monte-carlo-contextual-bandit.ts <config> <scenario>` |
| **analyze-personalization.ts** | Analyze personalization metrics | `npx tsx scripts/testing/analyze-personalization.ts` |
| **visualize-cb-results.ts** | Visualize results (TypeScript) | `npx tsx scripts/testing/visualize-cb-results.ts` |
| **visualize-cb-graphs.py** | Visualize results (Python) | `python scripts/testing/visualize-cb-graphs.py` |

### Monte Carlo Configurations

**Configs**: `testing` (100 students, 50 Q), `thorough` (500 students, 50 Q), `production` (1000 students, 50 Q)

**Scenarios**: `Balanced` (μ=0, σ=1), `Hard` (μ=0.5, σ=0.8), `Easy` (μ=-0.5, σ=0.8)

**Example**:
```bash
# Quick test
npx tsx scripts/testing/monte-carlo-contextual-bandit.ts testing Balanced

# Production evaluation
npx tsx scripts/testing/monte-carlo-contextual-bandit.ts production Balanced
```

---

## ⚙️ Optimization Scripts

**Location**: `scripts/optimization/`

### Python Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| **bayesian_optimize_weights.py** | Bayesian optimization for hybrid weights | `python scripts/optimization/bayesian_optimize_weights.py [--n-iter N]` |
| **evaluate_config.py** | Evaluate specific parameter config | `python scripts/optimization/evaluate_config.py <params>` |
| **compare_results.py** | Compare before/after optimization | `python scripts/optimization/compare_results.py` |

### Dependencies

Install Python dependencies:
```bash
pip install -r scripts/optimization/requirements.txt
```

Required packages:
- `scikit-optimize` - Bayesian optimization
- `numpy` - Numerical computing
- `pandas` - Data analysis
- `matplotlib` - Visualization
- `scipy` - Scientific computing

### Optimization Workflow

```bash
# 1. Install dependencies
pip install -r scripts/optimization/requirements.txt

# 2. Run optimization (150 iterations, ~2-3 hours)
python scripts/optimization/bayesian_optimize_weights.py --n-iter 150 --n-initial 25

# 3. Compare results
python scripts/optimization/compare_results.py

# 4. Results saved to scripts/optimization/results/
```

**Output Files**:
- `optimization_results_TIMESTAMP.json` - Full results
- `convergence_TIMESTAMP.png` - Convergence plot
- `optimization_log.txt` - Console output

---

## 📦 Archive

**Location**: `scripts/archive/`

One-time scripts that have been executed and are kept for historical reference:

| Script | Purpose | Status |
|--------|---------|--------|
| **fix-cb-performance.ts** | Fixed CB performance issues | ✅ Executed Nov 2025 |
| **diversify-questions.ts** | Diversified IRT parameters | ✅ Executed Nov 2025 |
| **expand-question-pool.ts** | Expanded question pool 50→550 | ✅ Executed Nov 2025 |

These scripts created backups in `backups/` directory before making changes.

---

## 🔄 Common Workflows

### 1. Initial System Setup

```bash
# Generate question pool
npx tsx scripts/development/generate-predictive-analytics-questions.ts

# Generate synthetic responses
npx tsx scripts/development/generate-synthetic-responses.ts generate 100

# Calibrate questions
npx tsx scripts/development/calibrate-3pl-questions.ts
```

### 2. Testing & Validation

```bash
# Run quick test
npx tsx scripts/testing/monte-carlo-contextual-bandit.ts testing Balanced

# Analyze personalization
npx tsx scripts/testing/analyze-personalization.ts

# Visualize results
python scripts/testing/visualize-cb-graphs.py
```

### 3. Parameter Optimization

```bash
# Install Python dependencies
pip install -r scripts/optimization/requirements.txt

# Run Bayesian optimization
python scripts/optimization/bayesian_optimize_weights.py --n-iter 150

# Compare before/after
python scripts/optimization/compare_results.py
```

### 4. Production Evaluation

```bash
# Full production test (1000 students)
npx tsx scripts/testing/monte-carlo-contextual-bandit.ts production Balanced

# Test different scenarios
npx tsx scripts/testing/monte-carlo-contextual-bandit.ts production Hard
npx tsx scripts/testing/monte-carlo-contextual-bandit.ts production Easy
```

---

## 📊 Understanding Results

### Monte Carlo Output

Results saved to `scripts/testing/results/cb-simulation-*.json`

**Key Metrics**:
- **RMSE**: Ability estimation error (lower = better)
- **Correlation**: Ranking quality (higher = better)
- **Question Diversity**: Exploration level (higher = more varied)
- **Student Overlap**: Personalization (lower = more personalized)
- **Selection Concentration**: Distribution evenness (lower = more distributed)

### Optimization Output

Results saved to `scripts/optimization/results/optimization_results_*.json`

**Key Information**:
- **best_config**: Optimized parameter values
- **best_objective**: Objective function value
- **all_results**: Complete iteration history

---

## 🛡️ Safety Features

### Backups

Scripts that modify the database automatically create backups:
- Location: `backups/`
- Format: `questions-backup-TIMESTAMP.json`
- Restore: Use backup restore script

### Validation

All scripts include validation checks:
- Parameter range validation
- Database integrity checks
- Result sanity checks
- Error handling with rollback

### Environment Variables

Optimization scripts support environment variable overrides:
```bash
set HYBRID_OPTIMIZATION_MODE=true
set HYBRID_INITIAL_WEIGHT=0.5
set HYBRID_PHASE1_END=10
# ... etc
```

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Module not found** | Run `npm install` or `npx prisma generate` |
| **Database locked** | Close Prisma Studio or other DB connections |
| **Python import errors** | Install requirements: `pip install -r requirements.txt` |
| **Encoding errors (Windows)** | Scripts handle UTF-8 automatically |

### Checking Logs

```bash
# Monte Carlo output
cat scripts/testing/results/cb-simulation-*.json | tail -n 1 | python -m json.tool

# Optimization log
tail -n 50 scripts/optimization/results/optimization_log.txt
```

---

## 📚 Related Documentation

- **[User Guide](../docs/USER_GUIDE.md)** - Complete system guide
- **[Optimization Results](../docs/HYBRID_OPTIMIZATION_RESULTS.md)** - Bayesian optimization details
- **[Simulation Guide](../docs/SIMULATION_EVALUATION_GUIDE.md)** - Testing workflows

---

**Last Updated**: November 22, 2025
