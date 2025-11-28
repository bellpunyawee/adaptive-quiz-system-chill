# Tag Management Guide

## Overview

The adaptive quiz system uses a **simplified tagging approach** to reduce instructor workload while maintaining effective question categorization.

## Question Categorization System

### 1. Baseline Tag
**Purpose:** Mark questions eligible for baseline assessment
- **Tag Name:** `baseline`
- **Category:** Assessment Type
- **Usage:** Apply this tag to questions that should be included in the baseline assessment quiz
- **How to Apply:** Use the "Mark as Baseline" button in the question management interface for bulk tagging

### 2. Bloom's Taxonomy (Question Field)
**Purpose:** Classify cognitive complexity of questions
- **Storage:** Stored as `bloomTaxonomy` field on each Question (not as a tag)
- **Levels:**
  - Remember
  - Understand
  - Apply
  - Analyze
  - Evaluate
  - Create
- **How to Set:** Select the Bloom taxonomy level when creating or editing a question

### 3. Topics (Cell System)
**Purpose:** Organize questions by subject area
- **Storage:** Each question belongs to one `Cell` (topic)
- **Examples:** "Level of measurement", "Confidence Interval", "Hypothesis Testing"
- **How to Manage:** Topics are created through the database seeding process

## Why This Simplified Approach?

### Previous System Issues
The old system had multiple tag categories that created unnecessary work for instructors:
- ❌ Difficulty Level tags (beginner-friendly, advanced, tricky) - redundant with IRT difficulty parameter
- ❌ Content Type tags (conceptual, practical, debugging) - too granular
- ❌ Multiple Assessment Type tags (diagnostic, summative) - baseline is sufficient

### Benefits of Simplified System
- ✅ **Less instructor work:** Only one essential tag to manage (baseline)
- ✅ **Clear purpose:** Bloom taxonomy for pedagogy, baseline tag for assessment selection
- ✅ **No redundancy:** IRT parameters handle difficulty automatically
- ✅ **Easier bulk operations:** Quick "Mark as Baseline" button for multiple questions

## Instructor Workflow

### Creating a New Question
1. Fill in question text, explanation, and answer options
2. **Select topic** from dropdown (e.g., "Hypothesis Testing")
3. **Choose Bloom taxonomy level** from dropdown (e.g., "Apply")
4. Upload optional image if needed
5. **Apply baseline tag** if question should be in baseline assessment
6. Save question

### Bulk Tagging Baseline Questions
1. Go to Question Management page
2. Use filters to find appropriate questions
3. Select multiple questions using checkboxes
4. Click **"Mark as Baseline"** button
5. Selected questions are tagged for baseline assessment

### Creating Baseline Assessment Quiz
1. Navigate to Question Management
2. Click **"Create Baseline Quiz"** button
3. Select a learner from dropdown
4. System validates:
   - Learner hasn't completed baseline yet
   - Sufficient baseline-tagged questions exist
5. Quiz is created and assigned to learner

## Tag vs Field vs Topic

| Feature | Storage Type | Purpose | Example Values |
|---------|-------------|---------|----------------|
| **Baseline** | Tag | Mark questions for baseline assessment | `baseline` |
| **Bloom Taxonomy** | Question Field | Classify cognitive level | Remember, Understand, Apply |
| **Topics** | Cell (Related Model) | Group by subject area | "Level of measurement", "Hypothesis Testing" |

## API Reference

### Get All Tags
```
GET /api/admin/tags
```
Returns all available tags (currently just baseline and any custom tags)

### Get Baseline Statistics
```
GET /api/quiz/baseline/stats
```
Returns:
- Number of baseline-tagged questions
- Topics with baseline questions
- Expected quiz length

## Future Considerations

If additional tags are needed for specific use cases, create them as **custom tags** with clear descriptions. However, always ask:
1. Does this serve a unique purpose not covered by Bloom taxonomy, topics, or IRT parameters?
2. Will instructors actually use this consistently?
3. Does the benefit justify the extra work?

---

**Last Updated:** 2025-01-27
**Related Files:**
- `scripts/development/seed-default-tags.ts` - Default tag definitions
- `src/app/admin/tags/page.tsx` - Tag management interface
- `src/components/admin/TagSelector.tsx` - Tag selection component
