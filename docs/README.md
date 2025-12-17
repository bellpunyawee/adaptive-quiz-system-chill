# Adaptive Quiz System - Documentation

Complete documentation for the multi-course adaptive quiz system with Bayesian optimization, contextual bandit personalization, and operational reliability validation.

**Last Updated**: December 17, 2025
**Version**: 2.0 - Multi-Course Platform
**Status**: ✅ Production Ready - Research Validated (14/14 targets met)

---

## 🚀 Quick Start

| For... | Start Here |
|--------|------------|
| **Getting Started** | [MULTI_COURSE_QUICK_START.md](MULTI_COURSE_QUICK_START.md) - Complete setup guide for multi-course platform |
| **Students & Users** | [USER_GUIDE.md](USER_GUIDE.md) - Student interface and quiz-taking guide |
| **Instructors & Course Managers** | [COURSE_AUTHORIZATION.md](COURSE_AUTHORIZATION.md) - Course management and access control |
| **Administrators** | [QUICK_START_ADMIN.md](QUICK_START_ADMIN.md) - Admin setup and system configuration |
| **Researchers** | [PUBLICATION_PIPELINE.md](PUBLICATION_PIPELINE.md) ⭐ - Reproduce research results |

⭐ = Research-validated documentation (Dec 2025)

---

## 📚 Documentation Index

### Getting Started

| Document | Description | Audience |
|----------|-------------|----------|
| **[MULTI_COURSE_QUICK_START.md](MULTI_COURSE_QUICK_START.md)** | Multi-course platform setup and configuration | Admins, Instructors |
| **[ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)** | Database setup, environment variables, deployment | Developers, DevOps |
| **[URL_STRUCTURE.md](URL_STRUCTURE.md)** | URL patterns for multi-course navigation | Developers |

### Course Management

| Document | Description | Audience |
|----------|-------------|----------|
| **[COURSE_AUTHORIZATION.md](COURSE_AUTHORIZATION.md)** | Course access control, role management, multi-course workflows | Instructors, Admins |
| **[QUESTION_IMPORT.md](QUESTION_IMPORT.md)** | Import questions between courses, bulk operations | Instructors |
| **[QUIZ_START_API.md](QUIZ_START_API.md)** | Quiz configuration options, formative vs summative | Instructors |
| **[QUIZ_BANK_BEST_PRACTICES.md](QUIZ_BANK_BEST_PRACTICES.md)** ⭐ | Creating effective quiz banks with optimal question distribution | Instructors |

### Research & Validation

| Document | Description | Audience |
|----------|-------------|----------|
| **[PUBLICATION_PIPELINE.md](PUBLICATION_PIPELINE.md)** ⭐ | Complete 2-4 hour reproduction guide for peer review | Researchers |
| **[METRICS_REFERENCE.md](METRICS_REFERENCE.md)** ⭐ | Complete metrics dictionary with mathematical formulations | Researchers |
| **[OPERATIONAL_RELIABILITY.md](OPERATIONAL_RELIABILITY.md)** ⭐ | Design philosophy: operational reliability vs fairness gap | Researchers |
| **[FORMATIVE_VS_SUMMATIVE.md](FORMATIVE_VS_SUMMATIVE.md)** ⭐ | Context-appropriate metrics for assessment types | Researchers |
| **[VALIDATION_REPORT.md](VALIDATION_REPORT.md)** | Final validation results (14/14 targets met) | Researchers |

### System Architecture

| Document | Description | Audience |
|----------|-------------|----------|
| **[CONTEXTUAL_BANDIT_GUIDE.md](CONTEXTUAL_BANDIT_GUIDE.md)** | Contextual bandit system with LinUCB + IRT hybrid | Developers, Researchers |
| **[3PL_COMPLETE_GUIDE.md](3PL_COMPLETE_GUIDE.md)** | 3PL IRT model technical reference with calibration guide | Researchers |
| **[CONVERGENCE_CONFIG_GUIDE.md](CONVERGENCE_CONFIG_GUIDE.md)** | Stopping criteria and SEM threshold configuration | Developers |
| **[PERSONALIZATION_METRICS_GUIDE.md](PERSONALIZATION_METRICS_GUIDE.md)** | Question diversity, student overlap, selection metrics | Researchers |

### Features & Functionality

| Document | Description | Audience |
|----------|-------------|----------|
| **[SKIP_QUESTION_FEATURE.md](SKIP_QUESTION_FEATURE.md)** | Skip question functionality and limitations | Users, Instructors |
| **[PERSONALIZED_FEEDBACK.md](PERSONALIZED_FEEDBACK.md)** | LLM-powered feedback system (Gemini 2.5 Flash) | Developers |
| **[TAG_MANAGEMENT_GUIDE.md](TAG_MANAGEMENT_GUIDE.md)** | Course-scoped tag system for question organization | Instructors |

### Testing & Evaluation

| Document | Description | Audience |
|----------|-------------|----------|
| **[SIMULATION_EVALUATION_GUIDE.md](SIMULATION_EVALUATION_GUIDE.md)** | Monte Carlo simulation methodology and workflows | Researchers |

### Security & Administration

| Document | Description | Audience |
|----------|-------------|----------|
| **[ADMIN_SECURITY_SETUP.md](ADMIN_SECURITY_SETUP.md)** | Advanced security and access control | Administrators |

---

## 🎯 System Overview

### Version 2.0: Multi-Course Platform (December 2025)

**Status**: ✅ **Production Ready**

**Major Features**:
- ✅ **Multi-course architecture** with isolated question banks per course
- ✅ **Course-scoped authorization** with role-based access control
- ✅ **Question import/export** between courses
- ✅ **Server-side pagination** for large question banks
- ✅ **Tag management** with course-level scoping
- ✅ **Bloom's taxonomy integration** for cognitive level classification
- ✅ **Dataset attachment support** for data analysis questions

**Research Validation** (Phase 4):
- ✅ **95.2% actionable precision** (target: >90%) - Reliable skill assessments
- ✅ **22.4% rescue rate** (target: <30%) - Healthy question pool
- ✅ **0% crash rate** (target: <1%) - Robust system performance
- ✅ **19.4 questions avg** (target: <25) - Efficient convergence
- ✅ **4,100 total questions** - 2,500 from ASSISTments + 1,600 strategically generated

---

## 🔬 Adaptive Engine

### Hybrid Architecture

**Components**:
1. **LinUCB Contextual Bandit** - Personalized question selection using 15D context
2. **3PL IRT Model** - Psychometric foundation for ability estimation
3. **Bayesian-Optimized Weight Evolution** - Data-driven parameter tuning
4. **Operational Reliability Focus** - Actionable precision over theoretical fairness

**Performance** (Research-Grade Metrics):
- ✅ **RMSE: 0.401** (target: <0.50) - Ability estimation accuracy
- ✅ **ECE: 0.038** (target: <0.05) - Probability calibration
- ✅ **Kendall's Tau: 0.823** (target: >0.70) - Ranking quality
- ✅ **Brier Score: 0.152** (target: <0.20) - Prediction accuracy
- ✅ **NDCG@10: 0.891** (target: >0.80) - Recommendation quality

---

## 📊 Multi-Course Architecture

### Course Isolation

Each course has:
- **Isolated question bank** - Questions belong to specific courses
- **Independent topics (cells)** - Course-specific knowledge structure
- **Course-scoped tags** - Categorization within course context
- **Separate access control** - Role-based permissions per course
- **Independent adaptive engines** - Course-specific calibration

### Data Model

```
Course
├── Questions (with tags, topics, difficulty)
├── Topics/Cells (knowledge areas)
├── Tags (course-scoped categorization)
├── CourseEnrollments (students enrolled)
├── CoursePermissions (instructors/managers)
└── Quizzes (assessment instances)
```

### URL Structure

- `/courses/[courseId]/dashboard` - Course management
- `/courses/[courseId]/questions` - Question bank with pagination
- `/courses/[courseId]/questions/new` - Create new question
- `/courses/[courseId]/questions/[id]/edit` - Edit question
- `/quiz/[quizId]` - Student quiz interface

See [URL_STRUCTURE.md](URL_STRUCTURE.md) for complete reference.

---

## 🛠️ Recent Improvements (December 2025)

### Performance Optimizations
- ✅ Server-side pagination (20/page default, configurable to 10/50/100)
- ✅ Efficient question filtering with Prisma skip/take
- ✅ Optimized tag filtering with course-scoping

### UI/UX Enhancements
- ✅ Clickable tag filter with search functionality
- ✅ Pagination controls (First/Previous/Next/Last)
- ✅ Loading states for async operations
- ✅ Better empty state messaging

### Bug Fixes
- ✅ Fixed middleware Edge Runtime bcrypt conflict
- ✅ Resolved tag filter interaction issues
- ✅ Corrected pagination state management

---

## 📖 Documentation Conventions

### Status Indicators
- ⭐ = Research-validated (peer-review ready)
- ✅ = Production ready
- 🚧 = Work in progress
- 📦 = Archived (historical reference)

### Audience Tags
- **Users** - Students taking quizzes
- **Instructors** - Course managers, question creators
- **Admins** - System administrators
- **Developers** - Software engineers
- **Researchers** - Academic/research users
- **DevOps** - Deployment and operations

---

## 🗂️ Archive

Historical documentation has been moved to `docs/archive/`:
- Sprint completion reports
- Phase validation reports
- Development progress summaries
- Implementation milestones

See [archive/README.md](archive/README.md) for archive index.

---

## 🤝 Contributing to Documentation

When updating documentation:

1. **Update the last modified date** at the top of the document
2. **Add status indicators** (⭐, ✅, 🚧, 📦) where appropriate
3. **Tag the audience** clearly in the description
4. **Link to related documents** for context
5. **Update this README** if adding/removing major documents

---

## 📞 Support

For questions about:
- **Using the system**: See [USER_GUIDE.md](USER_GUIDE.md)
- **Course management**: See [COURSE_AUTHORIZATION.md](COURSE_AUTHORIZATION.md)
- **Technical setup**: See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md)
- **Research methodology**: See [PUBLICATION_PIPELINE.md](PUBLICATION_PIPELINE.md)

---

**Project Repository**: https://github.com/yourusername/adaptive-quiz-system
**License**: MIT
**Maintained by**: Your Institution/Team
