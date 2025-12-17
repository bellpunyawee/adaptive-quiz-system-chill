# Quiz Start API - Course-Scoped Quiz Creation

Complete reference for the `/api/quiz/start` endpoint that creates course-scoped quizzes.

## Overview

The Quiz Start API is the primary endpoint for creating new quiz sessions within a course context. It handles:

- **Course-scoped quiz creation** with automatic authorization
- **Baseline assessment management** with duplicate prevention
- **Topic selection validation** (system or manual)
- **Mastery reset** for baseline quizzes
- **Quiz configuration** with exploration parameters and timers

## Endpoint

```
POST /api/quiz/start
```

**Status**: ✅ Implemented
**File**: `src/app/api/quiz/start/route.ts`
**Authentication**: Required
**Authorization**: Course access required

---

## Request Format

### Headers

```http
Content-Type: application/json
Cookie: authjs.session-token=<session-token>
```

### Body Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `courseId` | string | Yes | - | Course ID for quiz scoping |
| `userId` | string | Yes | - | User ID (must match session) |
| `maxQuestions` | number | Yes | - | Number of questions (min: 1) |
| `quizType` | string | No | "regular" | Quiz type: "baseline" or "regular" |
| `topicSelection` | string | No | "system" | Topic selection mode: "system" or "manual" |
| `selectedCells` | string[] | Conditional | null | Required if topicSelection="manual" |
| `explorationParam` | number | No | 0.5 | Exploration parameter (0-1) |
| `timerMinutes` | number | No | null | Quiz timer in minutes (null = no timer) |

### Request Example

```typescript
const response = await fetch('/api/quiz/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    courseId: 'course-123',
    userId: 'user-456',
    maxQuestions: 10,
    quizType: 'regular',
    topicSelection: 'system',
    explorationParam: 0.5,
    timerMinutes: 30,
  }),
});
```

### Manual Topic Selection Example

```typescript
const response = await fetch('/api/quiz/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    courseId: 'course-123',
    userId: 'user-456',
    maxQuestions: 15,
    quizType: 'regular',
    topicSelection: 'manual',
    selectedCells: ['topic-1', 'topic-2', 'topic-3'],
    explorationParam: 0.3,
  }),
});
```

---

## Response Format

### Success Response (200)

```typescript
{
  quizId: string;      // Unique quiz identifier
  quizType: string;    // "baseline" | "regular"
  courseId: string;    // Course ID (for verification)
  message: string;     // Success message
}
```

**Example**:

```json
{
  "quizId": "quiz-789",
  "quizType": "regular",
  "courseId": "course-123",
  "message": "Quiz started successfully"
}
```

### Error Responses

#### 400 - Bad Request

**Missing courseId**:
```json
{
  "error": "courseId is required"
}
```

**Invalid maxQuestions**:
```json
{
  "error": "maxQuestions must be at least 1"
}
```

**No topics selected (manual mode)**:
```json
{
  "error": "At least one topic must be selected for manual mode"
}
```

**Invalid topics**:
```json
{
  "error": "Some selected topics do not belong to this course"
}
```

**Baseline already completed**:
```json
{
  "error": "Baseline assessment already completed for this course",
  "baselineQuizId": "quiz-existing"
}
```

#### 401 - Unauthorized

```json
{
  "error": "Unauthorized"
}
```

#### 403 - Forbidden

```json
{
  "error": "Forbidden - You do not have access to this course"
}
```

#### 500 - Internal Server Error

```json
{
  "error": "Failed to start quiz",
  "details": "Error message"
}
```

---

## Implementation Details

### 1. Authentication Check

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

- Uses NextAuth session
- Verifies user is logged in
- Returns 401 if not authenticated

### 2. Course Authorization

```typescript
const authResult = await checkCourseAccess(session.user.id, courseId);
if (!authResult.authorized) {
  return NextResponse.json(
    { error: 'Forbidden - You do not have access to this course' },
    { status: 403 }
  );
}
```

- Verifies user is enrolled in course or is instructor/admin
- Uses `checkCourseAccess` from `@/lib/course-authorization`
- Returns 403 if not authorized

### 3. Topic Validation (Manual Mode)

```typescript
if (topicSelection === 'manual') {
  if (!selectedCells || selectedCells.length === 0) {
    return NextResponse.json(
      { error: 'At least one topic must be selected for manual mode' },
      { status: 400 }
    );
  }

  const topicCount = await prisma.cell.count({
    where: {
      id: { in: selectedCells },
      courseId,
    },
  });

  if (topicCount !== selectedCells.length) {
    return NextResponse.json(
      { error: 'Some selected topics do not belong to this course' },
      { status: 400 }
    );
  }
}
```

- Ensures at least one topic is selected
- Verifies all selected topics belong to the course
- Prevents cross-course topic selection

### 4. Baseline Quiz Management

```typescript
if (quizType === 'baseline') {
  // Check for existing baseline
  const existingBaseline = await prisma.quiz.findFirst({
    where: {
      userId: session.user.id,
      courseId,
      quizType: 'baseline',
      status: 'completed',
    },
  });

  if (existingBaseline) {
    return NextResponse.json(
      {
        error: 'Baseline assessment already completed for this course',
        baselineQuizId: existingBaseline.id,
      },
      { status: 400 }
    );
  }

  // Reset course-specific mastery
  const courseTopics = await prisma.cell.findMany({
    where: { courseId },
    select: { id: true },
  });
  const courseTopicIds = courseTopics.map((t) => t.id);

  await prisma.userCellMastery.updateMany({
    where: {
      userId: session.user.id,
      cellId: { in: courseTopicIds },
    },
    data: {
      selection_count: 0,
      mastery_status: 0,
    },
  });
}
```

- Prevents duplicate baseline quizzes per course
- Resets mastery for all topics in the course
- Ensures clean baseline assessment

### 5. Quiz Creation

```typescript
const quiz = await prisma.quiz.create({
  data: {
    userId: session.user.id,
    courseId, // ✅ CRITICAL: Course scoping
    status: 'in-progress',
    quizType: quizType || 'regular',
    maxQuestions,
    explorationParam,
    timerMinutes,
    topicSelection: topicSelection || 'system',
    selectedCells:
      topicSelection === 'manual' && selectedCells
        ? JSON.stringify(selectedCells)
        : null,
    startedAt: new Date(),
  },
});
```

- Creates quiz record in database
- Associates with course and user
- Stores configuration for adaptive engine
- Returns quiz ID for navigation

---

## Usage Examples

### Example 1: Start Regular Quiz (System Topic Selection)

```typescript
async function startRegularQuiz(courseId: string) {
  const response = await fetch('/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courseId,
      userId: session.user.id,
      maxQuestions: 10,
      quizType: 'regular',
      topicSelection: 'system',
      explorationParam: 0.5,
    }),
  });

  const data = await response.json();

  if (response.ok) {
    router.push(`/quiz/${data.quizId}`);
  } else {
    setError(data.error);
  }
}
```

### Example 2: Start Baseline Assessment

```typescript
async function startBaselineAssessment(courseId: string) {
  const response = await fetch('/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courseId,
      userId: session.user.id,
      maxQuestions: 30,
      quizType: 'baseline',
      topicSelection: 'system',
      explorationParam: 0.5,
      timerMinutes: null, // No timer for baseline
    }),
  });

  const data = await response.json();

  if (response.ok) {
    router.push(`/quiz/${data.quizId}`);
  } else {
    if (data.baselineQuizId) {
      // Baseline already completed
      router.push(`/quiz/results/${data.baselineQuizId}`);
    } else {
      setError(data.error);
    }
  }
}
```

### Example 3: Start Topic-Specific Practice

```typescript
async function startTopicPractice(courseId: string, topicIds: string[]) {
  const response = await fetch('/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courseId,
      userId: session.user.id,
      maxQuestions: 20,
      quizType: 'regular',
      topicSelection: 'manual',
      selectedCells: topicIds,
      explorationParam: 0.3, // More exploitation for practice
    }),
  });

  const data = await response.json();

  if (response.ok) {
    router.push(`/quiz/${data.quizId}`);
  } else {
    setError(data.error);
  }
}
```

---

## Security Features

### 1. Authentication

- ✅ Required for all requests
- ✅ Session-based via NextAuth
- ✅ User ID validation

### 2. Authorization

- ✅ Course access verification
- ✅ Enrollment or instructor ownership required
- ✅ Admin override support

### 3. Data Validation

- ✅ Required parameter checks
- ✅ Type validation
- ✅ Range validation (maxQuestions >= 1)

### 4. Course Scoping

- ✅ All quizzes tied to courseId
- ✅ Topic validation (must belong to course)
- ✅ Prevents cross-course data leakage

### 5. Business Logic

- ✅ Baseline duplication prevention
- ✅ Manual topic selection validation
- ✅ Mastery reset for baseline quizzes

---

## Integration with Other Components

### QuizStartForm Component

The `QuizStartForm` component ([QuizStartForm.tsx](../src/components/quiz/QuizStartForm.tsx)) uses this API:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  const response = await fetch('/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courseId,
      userId,
      maxQuestions,
      quizType,
      topicSelection,
      selectedCells: topicSelection === 'manual' ? selectedTopics : null,
    }),
  });

  const data = await response.json();

  if (response.ok && data.quizId) {
    router.push(`/quiz/${data.quizId}`);
  } else {
    setError(data.error || 'Failed to start quiz');
    setLoading(false);
  }
};
```

### Adaptive Engine Integration

The created quiz is automatically picked up by the adaptive engine:

1. **Quiz ID** is used to fetch quiz settings
2. **courseId** is passed to question pool manager
3. **topicSelection** determines topic filtering
4. **selectedCells** (if manual) restricts question selection
5. **explorationParam** balances exploration vs exploitation

See [engine-enhanced.ts](../src/lib/adaptive-engine/engine-enhanced.ts) for details.

---

## Testing

### Manual Testing Checklist

- [ ] Start regular quiz with system topic selection
- [ ] Start regular quiz with manual topic selection
- [ ] Start baseline assessment
- [ ] Attempt to start second baseline (should fail)
- [ ] Try to start quiz in unauthorized course (should fail)
- [ ] Try to start quiz without authentication (should fail)
- [ ] Try to select topics from different course (should fail)
- [ ] Verify quiz appears in course dashboard after creation
- [ ] Verify quizId redirects to active quiz page
- [ ] Verify course mastery reset for baseline

### Automated Tests (Example)

```typescript
describe('POST /api/quiz/start', () => {
  it('should create course-scoped quiz', async () => {
    const response = await fetch('/api/quiz/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: testCourse.id,
        userId: testUser.id,
        maxQuestions: 10,
        quizType: 'regular',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.quizId).toBeDefined();
    expect(data.courseId).toBe(testCourse.id);

    // Verify quiz in database
    const quiz = await prisma.quiz.findUnique({
      where: { id: data.quizId },
    });
    expect(quiz?.courseId).toBe(testCourse.id);
    expect(quiz?.userId).toBe(testUser.id);
  });

  it('should prevent duplicate baseline', async () => {
    // Create first baseline
    await fetch('/api/quiz/start', {
      method: 'POST',
      body: JSON.stringify({
        courseId: testCourse.id,
        userId: testUser.id,
        quizType: 'baseline',
        maxQuestions: 30,
      }),
    });

    // Complete baseline
    await completeQuiz(quiz.id);

    // Try to create second baseline
    const response = await fetch('/api/quiz/start', {
      method: 'POST',
      body: JSON.stringify({
        courseId: testCourse.id,
        userId: testUser.id,
        quizType: 'baseline',
        maxQuestions: 30,
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('already completed');
  });
});
```

---

## Related Documentation

- [URL Structure](./URL_STRUCTURE.md) - Complete URL routing reference
- [Course Authorization](./COURSE_AUTHORIZATION.md) - Authorization system
- [Adaptive Engine](./ADAPTIVE_ENGINE.md) - How quizzes use the engine
- [QuizStartForm Component](../src/components/quiz/QuizStartForm.tsx) - UI component

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-16 | 1.0.0 | Initial implementation with course scoping |

---

**Status**: ✅ Production Ready
**Last Updated**: 2025-12-16
