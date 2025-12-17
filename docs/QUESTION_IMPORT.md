# Question Import System

Complete guide for importing questions from master question banks into course-specific collections with deep copying and course scoping.

## Overview

The Question Import system allows instructors to:
- **Copy questions** from master question banks or other courses
- **Deep copy** ensures changes don't affect the source
- **Course scoping** ensures adaptive engine only selects questions from the current course
- **Topic management** automatically creates or reuses topics in the target course
- **Tag management** handles course-scoped tags
- **Calibration options** reset or preserve IRT parameters

## Why Question Import?

### Problem
With multi-course support, each course is isolated. New courses start empty. Manually recreating questions for each course is inefficient.

### Solution
Import questions from a "Master Question Bank" or existing courses with:
1. **Deep Copy**: Each import creates independent copies
2. **Course Scoping**: Questions are tied to specific courses
3. **Flexible Selection**: Import all questions or filter by topics

## Architecture

### Components

1. **Import Utility** (`src/lib/question-import.ts`)
   - Core import logic with deep copy
   - Topic and tag management
   - Calibration data handling

2. **API Endpoint** (`src/app/api/courses/[courseId]/import-questions/route.ts`)
   - Authorization (instructors only)
   - List importable courses and topics
   - Execute imports

3. **Adaptive Engine Updates**
   - `question-pool-manager.ts`: Added `courseId` filtering
   - `engine-enhanced.ts`: Passes `courseId` from quiz to pool manager

4. **UI Component** (`src/components/admin/ImportQuestionsDialog.tsx`)
   - Multi-step wizard for importing
   - Course and topic selection
   - Progress and result display

## Usage Guide

### API Usage

#### 1. List Available Source Courses

```typescript
GET /api/courses/{courseId}/import-questions?action=list-sources

Response:
{
  "success": true,
  "courses": [
    {
      "id": "course-123",
      "title": "Master Question Bank",
      "description": "...",
      "instructor": { "name": "...", "email": "..." },
      "_count": { "questions": 500, "cells": 15 }
    }
  ]
}
```

#### 2. List Topics from Source Course

```typescript
GET /api/courses/{courseId}/import-questions?action=list-topics&sourceCourseId=course-123

Response:
{
  "success": true,
  "topics": [
    {
      "id": "topic-456",
      "name": "Machine Learning",
      "difficulty_b": 0.5,
      "discrimination_a": 1.2,
      "_count": { "questions": 50 }
    }
  ]
}
```

#### 3. Preview Questions (Optional)

```typescript
GET /api/courses/{courseId}/import-questions?action=preview&sourceCourseId=course-123&topicIds=topic-456,topic-789

Response:
{
  "success": true,
  "count": 75,
  "questions": [
    {
      "id": "q-1",
      "text": "Question text...",
      "bloomTaxonomy": "Apply",
      "difficulty_b": 0.3,
      "cell": { "id": "topic-456", "name": "Machine Learning" },
      "_count": { "answerOptions": 4, "tags": 2 }
    }
  ]
}
```

#### 4. Import Questions

```typescript
POST /api/courses/{courseId}/import-questions

Body:
{
  "sourceCourseId": "course-123",
  "topicIds": ["topic-456", "topic-789"],  // Optional: filter by topics
  "questionIds": null,                      // Optional: specific questions
  "includeInactive": false,                 // Include inactive questions?
  "resetCalibration": true                  // Reset IRT parameters?
}

Response:
{
  "success": true,
  "message": "Successfully imported 75 question(s)",
  "imported": 75,
  "failed": 0,
  "topicsCreated": 2,
  "errors": [],
  "questionMapping": {
    "old-q-id-1": "new-q-id-1",
    ...
  },
  "topicMapping": {
    "old-topic-id-1": "new-topic-id-1",
    ...
  }
}
```

### Using the Import Utility Directly

```typescript
import { importQuestions } from '@/lib/question-import';

const result = await importQuestions({
  sourceCourseId: 'master-bank-id',
  targetCourseId: 'my-course-id',
  topicIds: ['topic-1', 'topic-2'],  // Optional
  resetCalibration: true,
  includeInactive: false,
});

if (result.success) {
  console.log(`Imported ${result.imported} questions`);
  console.log(`Created ${result.topicsCreated} new topics`);
} else {
  console.error(`Import failed: ${result.errors.join(', ')}`);
}
```

### Using the UI Component

```tsx
import { ImportQuestionsDialog } from '@/components/admin/ImportQuestionsDialog';

function CourseManagementPage() {
  const [showImport, setShowImport] = useState(false);

  return (
    <>
      <button onClick={() => setShowImport(true)}>
        Import Questions
      </button>

      {showImport && (
        <ImportQuestionsDialog
          courseId={courseId}
          onClose={() => setShowImport(false)}
          onSuccess={(imported) => {
            console.log(`Imported ${imported} questions`);
            // Refresh question list
          }}
        />
      )}
    </>
  );
}
```

## Import Behavior

### Deep Copy

Every import creates **completely independent copies**:

**What is copied:**
- ✅ Question text
- ✅ Explanation
- ✅ All answer options (with correct/incorrect flags)
- ✅ Bloom's Taxonomy level
- ✅ Images (URL references)
- ✅ Dataset files (URL references)
- ✅ Tags (creates or links to existing course-scoped tags)

**What is NOT copied (always reset):**
- ❌ Exposure count (starts at 0)
- ❌ Last used timestamp
- ❌ Response count (starts at 0)

**What depends on `resetCalibration` flag:**
- ⚙️ IRT difficulty (`difficulty_b`)
- ⚙️ IRT discrimination (`discrimination_a`)
- ⚙️ IRT guessing parameter (`guessing_c`)

If `resetCalibration = true` (recommended):
- `difficulty_b` → 0.0
- `discrimination_a` → 1.0
- `guessing_c` → 0.0

If `resetCalibration = false`:
- Preserves original IRT values from source

### Topic Management

**Existing Topic (same name):**
- Reuses existing topic in target course
- Does NOT overwrite difficulty/discrimination

**New Topic:**
- Creates new topic in target course
- Copies difficulty/discrimination from source topic

**Example:**
```
Source Course:
  - Machine Learning (difficulty: 0.5, discrimination: 1.2)
  - Python Basics (difficulty: -0.3, discrimination: 0.9)

Target Course (empty):
  [Import runs]

Target Course (after import):
  - Machine Learning (difficulty: 0.5, discrimination: 1.2) [NEW]
  - Python Basics (difficulty: -0.3, discrimination: 0.9) [NEW]

Target Course (already has "Machine Learning"):
  - Machine Learning (keeps existing parameters) [REUSED]
  - Python Basics (difficulty: -0.3, discrimination: 0.9) [NEW]
```

### Tag Management

Tags are **course-scoped**:
- Same tag name can exist in multiple courses
- Import creates or reuses tags in target course
- Tag connections (QuestionTag) are recreated for new questions

### Course Scoping Enforcement

#### In Question Pool Manager
```typescript
const questions = await prisma.question.findMany({
  where: {
    cellId: topicId,
    courseId: courseId,  // ✅ CRITICAL: Course filter
    isActive: true,
  }
});
```

#### In Adaptive Engine
```typescript
const availableQuestions = await questionPoolManager.getAvailableQuestions({
  cellId: targetCell.cellId,
  userId,
  quizId,
  courseId,  // ✅ Passed from quiz.courseId
  excludeQuestionIds: [],
  quizType,
});
```

This ensures:
- Students only see questions from their enrolled courses
- No cross-course question leakage
- Calibration data stays course-specific

## Security & Authorization

### API Authorization Checks

```typescript
// Check if user can manage target course
const canManage = await canManageCourse(session.user.id, params.courseId);
if (!canManage) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**Who can import:**
- ✅ Course instructor
- ✅ System admins
- ❌ Students
- ❌ Instructors of other courses

**What they can import from:**
- ✅ Any active course with questions
- ✅ Master question banks
- ❌ Inactive courses (unless explicitly requested)

## Performance Considerations

### Batch Import Performance

**Small imports (< 100 questions):**
- Complete in < 5 seconds
- No special handling needed

**Medium imports (100-500 questions):**
- Complete in 10-30 seconds
- UI shows progress spinner

**Large imports (> 500 questions):**
- May take 1-2 minutes
- Consider background job for > 1000 questions

### Optimization Tips

1. **Import by topics** instead of all questions at once
2. **Use `resetCalibration: true`** to skip copying calibration history
3. **Filter inactive questions** with `includeInactive: false`

## Common Workflows

### 1. Setting Up a New Course

```typescript
// Step 1: Create course
const course = await prisma.course.create({
  data: {
    title: "Data Structures CS101",
    instructorId: userId,
    joinCode: generateJoinCode(),
  }
});

// Step 2: Import from master bank
const result = await importQuestions({
  sourceCourseId: MASTER_BANK_ID,
  targetCourseId: course.id,
  resetCalibration: true,
});

// Step 3: Ready for students
console.log(`Course ready with ${result.imported} questions`);
```

### 2. Sharing Questions Between Instructors

```typescript
// Instructor A shares questions with Instructor B
const result = await importQuestions({
  sourceCourseId: instructorA_courseId,
  targetCourseId: instructorB_courseId,
  topicIds: ['advanced-topics-only'],
  resetCalibration: true,
});

// Instructor B can now edit without affecting Instructor A
```

### 3. Creating Specialized Quizzes

```typescript
// Import only specific topics for a specialized course
const result = await importQuestions({
  sourceCourseId: 'general-programming-course',
  targetCourseId: 'advanced-algorithms-course',
  topicIds: ['sorting', 'graphs', 'dynamic-programming'],
  resetCalibration: true,
});
```

## Troubleshooting

### Issue: "No questions found matching the criteria"

**Causes:**
- Selected topics have no questions
- All questions are inactive
- Source course ID is incorrect

**Solution:**
- Use preview endpoint to check questions exist
- Set `includeInactive: true` if needed
- Verify source course ID

### Issue: Import succeeds but adaptive engine doesn't show questions

**Causes:**
- Quiz not associated with course (missing `courseId`)
- Topics not associated with course
- Questions marked as inactive

**Solution:**
```typescript
// Check quiz has courseId
const quiz = await prisma.quiz.findUnique({
  where: { id: quizId },
  select: { courseId: true }
});

// Check questions have courseId
const questions = await prisma.question.count({
  where: { courseId: courseId, isActive: true }
});
```

### Issue: Duplicate topics created

**Causes:**
- Topic names don't match exactly (case-sensitive)
- Topics have different courseIds

**Solution:**
- Import checks for exact name match per course
- Manually merge duplicate topics if needed:
```typescript
// Update questions to use correct topic
await prisma.question.updateMany({
  where: { cellId: duplicateTopicId },
  data: { cellId: correctTopicId }
});

// Delete duplicate
await prisma.cell.delete({
  where: { id: duplicateTopicId }
});
```

## Testing

### Manual Testing Checklist

- [ ] List available source courses
- [ ] Select source course and view topics
- [ ] Import all questions from one topic
- [ ] Verify questions appear in target course
- [ ] Verify topics created/reused correctly
- [ ] Verify tags created/reused correctly
- [ ] Edit imported question (should not affect source)
- [ ] Start quiz in target course (should show imported questions)
- [ ] Verify course scoping (no cross-course leakage)

### Automated Tests (Example)

```typescript
describe('Question Import', () => {
  it('should deep copy questions', async () => {
    const result = await importQuestions({
      sourceCourseId: sourceCourse.id,
      targetCourseId: targetCourse.id,
    });

    expect(result.success).toBe(true);
    expect(result.imported).toBeGreaterThan(0);

    // Verify questions are independent
    const sourceQuestion = await prisma.question.findFirst({
      where: { courseId: sourceCourse.id }
    });

    const targetQuestion = await prisma.question.findFirst({
      where: { courseId: targetCourse.id }
    });

    expect(sourceQuestion.id).not.toBe(targetQuestion.id);
    expect(targetQuestion.courseId).toBe(targetCourse.id);
  });
});
```

## Best Practices

### For Master Question Banks

1. **Mark as "Master Bank"** in course description
2. **Keep calibrated** - don't reset calibration when importing out
3. **Maintain quality** - regularly review and update questions
4. **Use consistent naming** - topics should match across courses
5. **Tag thoroughly** - tags help filter during import

### For Course-Specific Imports

1. **Always use `resetCalibration: true`** for new courses
2. **Import by topic** for granular control
3. **Preview before importing** large batches
4. **Test quizzes** after importing
5. **Monitor course scoping** - verify no cross-course leakage

### For Instructors Sharing Content

1. **Get permission** before importing from colleague's courses
2. **Customize after import** - make questions your own
3. **Credit sources** in course description if appropriate
4. **Don't import student data** - only questions and content

## API Reference Summary

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/courses/{courseId}/import-questions?action=list-sources` | GET | List importable courses | Instructor |
| `/api/courses/{courseId}/import-questions?action=list-topics&sourceCourseId=X` | GET | List topics from source | Instructor |
| `/api/courses/{courseId}/import-questions?action=preview&sourceCourseId=X` | GET | Preview questions | Instructor |
| `/api/courses/{courseId}/import-questions` | POST | Execute import | Instructor |

## Related Documentation

- [Course Authorization](./COURSE_AUTHORIZATION.md) - Authorization system
- [Adaptive Engine](./ADAPTIVE_ENGINE.md) - How engine selects questions
- [IRT Calibration](./IRT_CALIBRATION.md) - Understanding difficulty parameters

---

**Status**: ✅ Production Ready
**Last Updated**: 2025-12-16
