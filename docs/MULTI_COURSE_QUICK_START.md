# Multi-Course System - Quick Start Guide

Quick reference for working with the multi-course adaptive quiz system.

## Table of Contents
1. [Course Authorization](#course-authorization)
2. [Question Import](#question-import)
3. [Adaptive Engine (Course-Scoped)](#adaptive-engine)
4. [Common Tasks](#common-tasks)

---

## Course Authorization

### Protecting a Route

**Server Component (Recommended):**
```typescript
import { requireCourseAccess } from '@/lib/course-authorization';

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  // Redirects to 403 if unauthorized
  const auth = await requireCourseAccess(params.courseId);

  const isInstructor = auth.role === 'INSTRUCTOR' || auth.role === 'ADMIN';

  return <div>Course: {auth.course?.title}</div>;
}
```

**API Route:**
```typescript
import { canManageCourse } from '@/lib/course-authorization';

export async function POST(req: Request, { params }: { params: { courseId: string } }) {
  const session = await auth();

  const canManage = await canManageCourse(session.user.id, params.courseId);
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Create/update content...
}
```

**Client Component:**
```typescript
'use client';
import { CourseAuthGuard } from '@/components/course/CourseAuthGuard';

export function CourseContent({ courseId }: { courseId: string }) {
  return (
    <CourseAuthGuard courseId={courseId} requiredRole="INSTRUCTOR">
      <InstructorOnlyContent />
    </CourseAuthGuard>
  );
}
```

### Student Enrollment

```typescript
'use client';
import { enrollInCourse } from '@/app/actions/course-enrollment';

async function handleJoin(joinCode: string) {
  const result = await enrollInCourse(joinCode);

  if (result.success) {
    router.push(`/courses/${result.courseId}`);
  }
}
```

---

## Question Import

### Import All Questions from Master Bank

**Using API:**
```typescript
const response = await fetch(`/api/courses/${courseId}/import-questions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sourceCourseId: 'master-bank-id',
    resetCalibration: true,
  }),
});

const result = await response.json();
console.log(`Imported ${result.imported} questions`);
```

**Using Utility:**
```typescript
import { importQuestions } from '@/lib/question-import';

const result = await importQuestions({
  sourceCourseId: 'master-bank-id',
  targetCourseId: 'new-course-id',
  resetCalibration: true,
});
```

### Import Specific Topics

```typescript
const result = await importQuestions({
  sourceCourseId: 'programming-101',
  targetCourseId: 'advanced-course',
  topicIds: ['algorithms', 'data-structures'],
  resetCalibration: true,
});
```

### Using the UI Component

```tsx
import { ImportQuestionsDialog } from '@/components/admin/ImportQuestionsDialog';

<ImportQuestionsDialog
  courseId={courseId}
  onClose={() => setShowImport(false)}
  onSuccess={(imported) => {
    console.log(`Imported ${imported} questions`);
  }}
/>
```

---

## Adaptive Engine

### Course Scoping is Automatic

When a quiz is created with a `courseId`, the adaptive engine automatically scopes all question selection to that course.

**No code changes needed in most cases!**

The engine:
1. Gets `courseId` from the quiz
2. Passes it to question pool manager
3. Filters all queries by `courseId`

### Starting a Course-Scoped Quiz

```typescript
// Create quiz with courseId
const quiz = await prisma.quiz.create({
  data: {
    userId: user.id,
    courseId: courseId, // ✅ Important!
    maxQuestions: 10,
    quizType: 'regular',
  },
});

// Engine will automatically scope to this course's questions
const question = await selectNextQuestionForUser(user.id, quiz.id);
```

### Verifying Course Scoping

```typescript
// Check quiz's course
const quiz = await prisma.quiz.findUnique({
  where: { id: quizId },
  select: { courseId: true, course: { select: { title: true } } },
});

console.log(`Quiz is scoped to: ${quiz.course?.title}`);

// Count available questions in course
const questionCount = await prisma.question.count({
  where: {
    courseId: quiz.courseId,
    isActive: true,
  },
});

console.log(`${questionCount} questions available in this course`);
```

---

## Common Tasks

### 1. Create a New Course

```typescript
import { generateJoinCode } from '@/lib/utils'; // You'll need to implement this

const course = await prisma.course.create({
  data: {
    title: 'Introduction to Programming',
    description: 'Learn the basics of programming',
    instructorId: user.id,
    joinCode: generateJoinCode(), // Random 6-char code
    isActive: true,
  },
});

// Auto-enroll instructor
await prisma.enrollment.create({
  data: {
    userId: user.id,
    courseId: course.id,
    role: 'INSTRUCTOR',
  },
});
```

**Join Code Generator:**
```typescript
export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  });
  return code;
}
```

### 2. Query Course-Scoped Data

**Always include courseId filter:**

```typescript
// ✅ GOOD - Course scoped
const questions = await prisma.question.findMany({
  where: {
    courseId: courseId,
    isActive: true,
  },
});

// ✅ GOOD - Course + topic scoped
const questions = await prisma.question.findMany({
  where: {
    courseId: courseId,
    cellId: topicId,
    isActive: true,
  },
});

// ❌ BAD - Missing courseId (data leak!)
const questions = await prisma.question.findMany({
  where: { isActive: true },
});
```

### 3. Get User's Courses

```typescript
import { getUserCourses } from '@/lib/course-authorization';

const courses = await getUserCourses(user.id);

courses.forEach(course => {
  console.log(`${course.title} - Role: ${course.userRole}`);
});
```

### 4. Check Course Access

```typescript
import { checkCourseAccess } from '@/lib/course-authorization';

const authResult = await checkCourseAccess(user.id, courseId);

if (authResult.authorized) {
  console.log(`User has ${authResult.role} access`);
} else {
  console.log('User not authorized');
}
```

### 5. Create Course-Scoped Quiz

```typescript
// Get user's enrolled courses
const enrollments = await prisma.enrollment.findMany({
  where: { userId: user.id },
  include: { course: true },
});

// Let user select a course
const selectedCourse = enrollments[0].course;

// Create quiz for that course
const quiz = await prisma.quiz.create({
  data: {
    userId: user.id,
    courseId: selectedCourse.id, // ✅ Critical
    maxQuestions: 10,
    quizType: 'regular',
    topicSelection: 'system',
  },
});
```

### 6. Import Questions When Creating Course

```typescript
// Step 1: Create course
const course = await prisma.course.create({
  data: {
    title: 'New Course',
    instructorId: user.id,
    joinCode: generateJoinCode(),
  },
});

// Step 2: Enroll instructor
await prisma.enrollment.create({
  data: {
    userId: user.id,
    courseId: course.id,
    role: 'INSTRUCTOR',
  },
});

// Step 3: Import questions from master bank
const importResult = await importQuestions({
  sourceCourseId: MASTER_BANK_ID,
  targetCourseId: course.id,
  resetCalibration: true,
});

console.log(`Course ready with ${importResult.imported} questions`);
```

### 7. Clone a Course (with Questions)

```typescript
async function cloneCourse(sourceCourseId: string, instructorId: string) {
  // Get source course
  const sourceCourse = await prisma.course.findUnique({
    where: { id: sourceCourseId },
  });

  // Create new course
  const newCourse = await prisma.course.create({
    data: {
      title: `${sourceCourse.title} (Copy)`,
      description: sourceCourse.description,
      instructorId: instructorId,
      joinCode: generateJoinCode(),
    },
  });

  // Enroll instructor
  await prisma.enrollment.create({
    data: {
      userId: instructorId,
      courseId: newCourse.id,
      role: 'INSTRUCTOR',
    },
  });

  // Import all questions
  const result = await importQuestions({
    sourceCourseId: sourceCourseId,
    targetCourseId: newCourse.id,
    resetCalibration: true,
  });

  return { course: newCourse, questionsImported: result.imported };
}
```

### 8. Get Course Statistics

```typescript
const stats = await prisma.course.findUnique({
  where: { id: courseId },
  include: {
    _count: {
      select: {
        questions: true,
        cells: true,
        quizzes: true,
        enrollments: true,
        tags: true,
      },
    },
  },
});

console.log(`Course Stats:
  Questions: ${stats._count.questions}
  Topics: ${stats._count.cells}
  Quizzes: ${stats._count.quizzes}
  Students: ${stats._count.enrollments}
  Tags: ${stats._count.tags}
`);
```

### 9. Transfer Course Ownership

```typescript
async function transferCourse(courseId: string, newInstructorId: string) {
  // Update course instructor
  await prisma.course.update({
    where: { id: courseId },
    data: { instructorId: newInstructorId },
  });

  // Ensure new instructor is enrolled as INSTRUCTOR
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: newInstructorId,
        courseId: courseId,
      },
    },
    update: { role: 'INSTRUCTOR' },
    create: {
      userId: newInstructorId,
      courseId: courseId,
      role: 'INSTRUCTOR',
    },
  });
}
```

### 10. Archive Course (Soft Delete)

```typescript
// Deactivate course
await prisma.course.update({
  where: { id: courseId },
  data: { isActive: false },
});

// Course is now hidden but data preserved
// Questions remain in database with courseId
```

---

## Migration Checklist

When adding multi-course support to existing features:

### For Routes
- [ ] Add `await requireCourseAccess(params.courseId)` to server components
- [ ] Add `courseId` filter to all database queries
- [ ] Update API routes with `canManageCourse()` check
- [ ] Test with different user roles (instructor, student, admin)

### For Queries
- [ ] Add `where: { courseId: courseId }` to all question queries
- [ ] Add `where: { courseId: courseId }` to all cell (topic) queries
- [ ] Add `where: { courseId: courseId }` to all quiz queries
- [ ] Add `where: { courseId: courseId }` to all tag queries

### For New Features
- [ ] Pass `courseId` parameter from route params
- [ ] Include `courseId` in all create operations
- [ ] Include `courseId` in all update operations
- [ ] Include `courseId` in all queries
- [ ] Test data isolation between courses

---

## Troubleshooting

### "No questions available"
**Cause:** Quiz not associated with course or course has no questions

**Fix:**
```typescript
// Check quiz courseId
const quiz = await prisma.quiz.findUnique({
  where: { id: quizId },
  select: { courseId: true },
});

if (!quiz.courseId) {
  // Update quiz with courseId
  await prisma.quiz.update({
    where: { id: quizId },
    data: { courseId: courseId },
  });
}

// Check question count
const count = await prisma.question.count({
  where: { courseId: courseId, isActive: true },
});

if (count === 0) {
  // Import questions from master bank
}
```

### "Unauthorized" errors
**Cause:** Missing authorization check or user not enrolled

**Fix:**
```typescript
// Check enrollment
const enrollment = await prisma.enrollment.findUnique({
  where: {
    userId_courseId: {
      userId: user.id,
      courseId: courseId,
    },
  },
});

if (!enrollment) {
  // Enroll user
  await prisma.enrollment.create({
    data: {
      userId: user.id,
      courseId: courseId,
      role: 'STUDENT',
    },
  });
}
```

### Cross-course data leakage
**Cause:** Missing `courseId` filter in query

**Fix:** Always include `courseId` in where clause:
```typescript
// ✅ Add courseId filter
const questions = await prisma.question.findMany({
  where: {
    courseId: courseId, // Add this!
    isActive: true,
  },
});
```

---

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| [src/lib/course-authorization.ts](../src/lib/course-authorization.ts) | Authorization utilities |
| [src/lib/question-import.ts](../src/lib/question-import.ts) | Import functionality |
| [src/lib/adaptive-engine/question-pool-manager.ts](../src/lib/adaptive-engine/question-pool-manager.ts) | Question selection (course-scoped) |
| [src/lib/adaptive-engine/engine-enhanced.ts](../src/lib/adaptive-engine/engine-enhanced.ts) | Main adaptive engine |

### Key Functions

```typescript
// Authorization
requireCourseAccess(courseId, requiredRole?)
checkCourseAccess(userId, courseId)
canManageCourse(userId, courseId)
getUserCourses(userId)
enrollWithJoinCode(userId, joinCode)

// Import
importQuestions(options)
getImportableCourses(excludeCourseId?)
getSourceCourseTopics(courseId)
previewImportQuestions(courseId, topicIds?)
```

### Environment Variables

```bash
# Database
DATABASE_URL="file:./dev.db"
```

### Default Course Info

After running migration:
- **ID**: cmj89yjvi0001vxpc2tckm880
- **Title**: Default Course
- **Join Code**: PE8H52
- **Questions**: 6,503
- **Topics**: 15
- **Enrolled**: 500 users

---

**Quick Start Complete!**

For detailed documentation:
- [Course Authorization Guide](./COURSE_AUTHORIZATION.md)
- [Question Import Guide](./QUESTION_IMPORT.md)
