# URL Structure - Course-Based Routing

Complete reference for the multi-course URL structure using path-based routing.

## Overview

All course-specific routes follow the pattern `/courses/[courseId]/*` to ensure:
- **Clear course context** in the URL
- **Course-scoped authorization** at the route level
- **RESTful** and **intuitive** navigation
- **SEO-friendly** URLs

## URL Patterns

### Public Routes

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Home page | No |
| `/auth/signin` | Sign in page | No |
| `/auth/signup` | Sign up page | No |
| `/403` | Forbidden error page | No |

### Course Discovery

| Route | Description | Auth Required | Role |
|-------|-------------|---------------|------|
| `/courses` | List all user's courses | Yes | Any |
| `/courses/join` | Join course with join code | Yes | Student |

### Course Routes (Course-Scoped)

All routes under `/courses/[courseId]/*` require:
- ✅ User authentication
- ✅ Course enrollment or instructor ownership
- ✅ Automatic authorization via `requireCourseAccess()`

#### Student Routes

| Route | Description | Role | Implementation |
|-------|-------------|------|----------------|
| `/courses/[courseId]` | Course overview page | Student, Instructor, Admin | ✅ [page.tsx](../src/app/courses/[courseId]/page.tsx) |
| `/courses/[courseId]/dashboard` | Student dashboard | Student, Instructor, Admin | ✅ [dashboard/page.tsx](../src/app/courses/[courseId]/dashboard/page.tsx) |
| `/courses/[courseId]/topics` | Browse topics & progress | Student, Instructor, Admin | ✅ [topics/page.tsx](../src/app/courses/[courseId]/topics/page.tsx) |
| `/courses/[courseId]/quiz/start` | Start new quiz | Student, Instructor, Admin | ✅ [quiz/start/page.tsx](../src/app/courses/[courseId]/quiz/start/page.tsx) |
| `/courses/[courseId]/progress` | View progress/analytics | Student, Instructor, Admin | 🔲 Not implemented |
| `/courses/[courseId]/history` | Quiz history | Student, Instructor, Admin | 🔲 Not implemented |

#### Instructor Routes

| Route | Description | Role | Implementation |
|-------|-------------|------|----------------|
| `/courses/[courseId]/manage` | Course management hub | Instructor, Admin | 🔲 Not implemented |
| `/courses/[courseId]/questions` | Manage questions | Instructor, Admin | 🔲 Not implemented |
| `/courses/[courseId]/questions/new` | Create question | Instructor, Admin | 🔲 Not implemented |
| `/courses/[courseId]/questions/[id]/edit` | Edit question | Instructor, Admin | 🔲 Not implemented |
| `/courses/[courseId]/questions/import` | Import questions | Instructor, Admin | 🔲 Not implemented |
| `/courses/[courseId]/topics/manage` | Manage topics | Instructor, Admin | 🔲 Not implemented |
| `/courses/[courseId]/students` | View enrolled students | Instructor, Admin | 🔲 Not implemented |
| `/courses/[courseId]/analytics` | Course analytics | Instructor, Admin | 🔲 Not implemented |
| `/courses/[courseId]/settings` | Course settings | Instructor, Admin | 🔲 Not implemented |

### Quiz Routes (Non-Course Specific)

These routes handle active quizzes and results:

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/quiz/[quizId]` | Active quiz session | Yes |
| `/quiz/results/[quizId]` | Quiz results | Yes |

**Note:** Quiz routes don't include `courseId` in URL, but quizzes are internally linked to courses via `quiz.courseId`

### API Routes

#### Course APIs

| Route | Method | Description | Auth |
|-------|--------|-------------|------|
| `/api/courses/[courseId]/auth-check` | GET | Check course access | Yes |
| `/api/courses/[courseId]/import-questions` | GET | List importable courses/topics | Instructor |
| `/api/courses/[courseId]/import-questions` | POST | Import questions | Instructor |
| `/api/courses/[courseId]/questions` | GET | List course questions | Instructor |
| `/api/courses/[courseId]/questions` | POST | Create question | Instructor |
| `/api/courses/[courseId]/questions/[id]` | GET | Get question | Instructor |
| `/api/courses/[courseId]/questions/[id]` | PATCH | Update question | Instructor |
| `/api/courses/[courseId]/questions/[id]` | DELETE | Delete question | Instructor |

#### Quiz APIs

| Route | Method | Description |
|-------|--------|-------------|
| `/api/quiz/start` | POST | Start new quiz (with courseId) - ✅ Implemented |
| `/api/quiz/[quizId]/submit` | POST | Submit answer |
| `/api/quiz/[quizId]/complete` | POST | Complete quiz |

---

## Route Hierarchy

```
/
├── courses/
│   ├── (list all courses)
│   ├── join (join with code)
│   │
│   └── [courseId]/
│       ├── (overview)
│       ├── dashboard/
│       ├── topics/
│       │
│       ├── quiz/
│       │   └── start/
│       │
│       ├── progress/
│       ├── history/
│       │
│       ├── manage/ (instructor only)
│       ├── questions/ (instructor only)
│       │   ├── new
│       │   ├── import
│       │   └── [id]/
│       │       └── edit
│       │
│       ├── topics/manage (instructor only)
│       ├── students/ (instructor only)
│       ├── analytics/ (instructor only)
│       └── settings/ (instructor only)
│
├── quiz/
│   ├── [quizId]/ (active session)
│   └── results/[quizId]/
│
└── api/
    ├── courses/[courseId]/...
    └── quiz/...
```

---

## Implementation Examples

### 1. Course Dashboard Page

**File**: `src/app/courses/[courseId]/dashboard/page.tsx`

```typescript
import { requireCourseAccess } from '@/lib/course-authorization';

export default async function CourseDashboardPage({
  params
}: {
  params: { courseId: string }
}) {
  // Automatic authorization - redirects to 403 if unauthorized
  const authResult = await requireCourseAccess(params.courseId);

  // Fetch course-scoped data
  const course = await prisma.course.findUnique({
    where: { id: params.courseId }
  });

  return <div>Dashboard for {course.title}</div>;
}
```

### 2. Quiz Start Page (Course-Scoped)

**File**: `src/app/courses/[courseId]/quiz/start/page.tsx`

```typescript
export default async function QuizStartPage({
  params
}: {
  params: { courseId: string }
}) {
  await requireCourseAccess(params.courseId);

  // Get topics for THIS course
  const topics = await prisma.cell.findMany({
    where: { courseId: params.courseId }
  });

  return <QuizStartForm courseId={params.courseId} topics={topics} />;
}
```

### 3. API Route with Course Scoping

**File**: `src/app/api/courses/[courseId]/questions/route.ts`

```typescript
export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  const session = await auth();
  const canManage = await canManageCourse(session.user.id, params.courseId);

  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get questions for THIS course only
  const questions = await prisma.question.findMany({
    where: {
      courseId: params.courseId, // ✅ Critical
      isActive: true
    }
  });

  return NextResponse.json({ questions });
}
```

### 4. Quiz Start API (Course-Scoped)

**File**: `src/app/api/quiz/start/route.ts` ✅ **Implemented**

**Request Body**:
```typescript
{
  courseId: string;           // Required: Course ID for scoping
  userId: string;             // Required: User ID (from session)
  maxQuestions: number;       // Required: Number of questions (min: 1)
  quizType: string;           // Optional: 'baseline' | 'regular' (default: 'regular')
  topicSelection: string;     // Optional: 'system' | 'manual' (default: 'system')
  selectedCells?: string[];   // Required if topicSelection='manual'
  explorationParam?: number;  // Optional: 0-1 (default: 0.5)
  timerMinutes?: number;      // Optional: Quiz timer in minutes
}
```

**Response** (Success):
```typescript
{
  quizId: string;
  quizType: string;
  courseId: string;
  message: string;
}
```

**Implementation**:
```typescript
export async function POST(req: Request) {
  const session = await auth();
  const body = await req.json();
  const { courseId, maxQuestions, quizType, topicSelection, selectedCells } = body;

  // ✅ Verify user has access to course
  const authResult = await checkCourseAccess(session.user.id, courseId);
  if (!authResult.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ✅ Validate manual topic selection
  if (topicSelection === 'manual') {
    const topicCount = await prisma.cell.count({
      where: { id: { in: selectedCells }, courseId }
    });
    if (topicCount !== selectedCells.length) {
      return NextResponse.json({ error: 'Invalid topics' }, { status: 400 });
    }
  }

  // ✅ For baseline: Reset course-specific mastery
  if (quizType === 'baseline') {
    const courseTopics = await prisma.cell.findMany({
      where: { courseId },
      select: { id: true }
    });
    await prisma.userCellMastery.updateMany({
      where: { userId: session.user.id, cellId: { in: courseTopicIds } },
      data: { selection_count: 0, mastery_status: 0 }
    });
  }

  // ✅ Create course-scoped quiz
  const quiz = await prisma.quiz.create({
    data: {
      userId: session.user.id,
      courseId, // Critical: Course scoping
      maxQuestions,
      quizType: quizType || 'regular',
      topicSelection,
      selectedCells: selectedCells ? JSON.stringify(selectedCells) : null,
      status: 'in-progress',
      startedAt: new Date()
    }
  });

  return NextResponse.json({ quizId: quiz.id, courseId: quiz.courseId });
}
```

**Security Features**:
- ✅ Authentication required (via auth())
- ✅ Course access verification (checkCourseAccess)
- ✅ Topic validation (ensures topics belong to course)
- ✅ Baseline quiz duplication prevention
- ✅ Course-scoped mastery reset for baseline

---

## Navigation Patterns

### Breadcrumb Navigation

```tsx
// Every course page should show breadcrumbs
<nav className="text-sm text-gray-600 mb-4">
  <Link href="/courses">My Courses</Link>
  <span> / </span>
  <Link href={`/courses/${courseId}/dashboard`}>{courseName}</Link>
  <span> / </span>
  <span className="text-gray-900">{currentPage}</span>
</nav>
```

### Main Navigation (Course Context)

```tsx
// Show course-specific navigation when in course routes
<nav>
  <Link href={`/courses/${courseId}/dashboard`}>Dashboard</Link>
  <Link href={`/courses/${courseId}/topics`}>Topics</Link>
  <Link href={`/courses/${courseId}/quiz/start`}>Start Quiz</Link>
  <Link href={`/courses/${courseId}/progress`}>Progress</Link>
  <Link href={`/courses/${courseId}/history`}>History</Link>

  {/* Instructor only */}
  {isInstructor && (
    <>
      <Link href={`/courses/${courseId}/manage`}>Manage</Link>
      <Link href={`/courses/${courseId}/questions`}>Questions</Link>
      <Link href={`/courses/${courseId}/students`}>Students</Link>
    </>
  )}
</nav>
```

---

## Query Parameters

### Quiz Start Page

```
/courses/[courseId]/quiz/start?topic=[topicId]
```

Pre-selects specific topic for practice.

### Questions Page (Instructor)

```
/courses/[courseId]/questions?filter=inactive
/courses/[courseId]/questions?topic=[topicId]
/courses/[courseId]/questions?tag=[tagName]
```

Filters question list.

---

## Redirects & Error Handling

### Unauthorized Access

```typescript
// Automatically handled by requireCourseAccess()
const authResult = await requireCourseAccess(params.courseId);
// → Redirects to /403?reason=course_access_denied if unauthorized
```

### Not Found

```typescript
const course = await prisma.course.findUnique({
  where: { id: params.courseId }
});

if (!course) {
  notFound(); // → Shows 404 page
}
```

### Missing Authentication

```typescript
// Middleware handles this
// → Redirects to /auth/signin?callbackUrl=/courses/[courseId]/...
```

---

## Best Practices

### 1. Always Use Course Context

```tsx
// ✅ GOOD - Course context in URL
<Link href={`/courses/${courseId}/topics`}>Topics</Link>

// ❌ BAD - Missing course context
<Link href="/topics">Topics</Link>
```

### 2. Extract courseId from params

```typescript
// ✅ GOOD - Use params
export default async function Page({ params }: { params: { courseId: string } }) {
  const { courseId } = params;
}

// ❌ BAD - Hardcoded or from query string
const courseId = searchParams.get('courseId');
```

### 3. Course-Scope All Data Queries

```typescript
// ✅ GOOD - Include courseId filter
const questions = await prisma.question.findMany({
  where: {
    courseId: params.courseId,
    isActive: true
  }
});

// ❌ BAD - Missing courseId (data leak!)
const questions = await prisma.question.findMany({
  where: { isActive: true }
});
```

### 4. Consistent Authorization

```typescript
// ✅ GOOD - Every course page checks authorization
await requireCourseAccess(params.courseId);

// ❌ BAD - No authorization check
// Direct access to course data without verification
```

---

## Migration Checklist

When creating a new course route:

- [ ] Create page at `/courses/[courseId]/[page-name]/page.tsx`
- [ ] Add `await requireCourseAccess(params.courseId)` at top of page
- [ ] Extract `courseId` from `params`
- [ ] Filter all queries by `courseId`
- [ ] Add breadcrumb navigation
- [ ] Add role-based content (instructor vs student)
- [ ] Test with different user roles
- [ ] Update navigation menu

---

## URL Patterns Summary

```
Student Flow:
/courses → /courses/[courseId]/dashboard → /courses/[courseId]/quiz/start → /quiz/[quizId]

Instructor Flow:
/courses → /courses/[courseId]/manage → /courses/[courseId]/questions → /courses/[courseId]/questions/new

Course Discovery:
/courses/join → enter join code → /courses/[courseId]/dashboard
```

---

## Related Documentation

- [Course Authorization](./COURSE_AUTHORIZATION.md)
- [Question Import](./QUESTION_IMPORT.md)
- [Multi-Course Quick Start](./MULTI_COURSE_QUICK_START.md)

---

**Status**: ✅ Core routes implemented
**Version**: 1.0.0
**Last Updated**: 2025-12-16
