# Course Authorization System

Complete guide for implementing course-scoped authorization in the Adaptive Quiz System.

## Overview

The course authorization system provides secure, role-based access control for multi-course functionality. It ensures:
- **Instructors** can only manage their own courses
- **Students** can only access courses they're enrolled in
- **Admins** have unrestricted access to all courses

## Architecture

### Components

1. **Authorization Utilities** (`src/lib/course-authorization.ts`)
   - Core authorization logic with Prisma database access
   - Server-side only (cannot be used in client components)

2. **Next.js Middleware** (`src/middleware.ts`)
   - Authentication check for `/courses/[courseId]/*` routes
   - Runs on Edge Runtime (limited capabilities)

3. **Client Guards** (`src/components/course/CourseAuthGuard.tsx`)
   - Client-side authorization components
   - HOC for wrapping components with authorization

4. **API Routes** (`src/app/api/courses/[courseId]/auth-check/route.ts`)
   - RESTful endpoint for client-side authorization checks

5. **Server Actions** (`src/app/actions/course-enrollment.ts`)
   - Server actions for course enrollment via join codes

## Usage Guide

### 1. Server Components (Recommended)

Use `requireCourseAccess()` in server components for the most secure authorization:

```typescript
// src/app/courses/[courseId]/page.tsx
import { requireCourseAccess } from '@/lib/course-authorization';

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  // This will redirect to 403 if user is not authorized
  const authResult = await requireCourseAccess(params.courseId);

  // Access user's role
  const isInstructor = authResult.role === 'INSTRUCTOR' || authResult.role === 'ADMIN';

  // Render course content
  return <div>Course: {authResult.course?.title}</div>;
}
```

**Require specific role:**

```typescript
// Only allow instructors and admins
const authResult = await requireCourseAccess(params.courseId, 'INSTRUCTOR');
```

### 2. API Routes

Use `checkCourseAccess()` in API routes:

```typescript
// src/app/api/courses/[courseId]/questions/route.ts
import { auth } from '@/auth';
import { checkCourseAccess, canManageCourse } from '@/lib/course-authorization';

export async function POST(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user can manage course content (instructor/admin only)
  const canManage = await canManageCourse(session.user.id, params.courseId);
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Create question...
}
```

### 3. Client Components

Use `CourseAuthGuard` component for client-side authorization:

```typescript
// src/app/courses/[courseId]/client-component.tsx
'use client';

import { CourseAuthGuard } from '@/components/course/CourseAuthGuard';

export function CourseClientComponent({ courseId }: { courseId: string }) {
  return (
    <CourseAuthGuard courseId={courseId}>
      {/* Content only visible to authorized users */}
      <div>Course content here</div>
    </CourseAuthGuard>
  );
}
```

**Require instructor access:**

```typescript
<CourseAuthGuard courseId={courseId} requiredRole="INSTRUCTOR">
  <InstructorOnlyContent />
</CourseAuthGuard>
```

**Using the HOC:**

```typescript
'use client';

import { withCourseAuth } from '@/components/course/CourseAuthGuard';

function InstructorDashboard({ courseId }: { courseId: string }) {
  return <div>Instructor Dashboard</div>;
}

export default withCourseAuth(InstructorDashboard, 'INSTRUCTOR');
```

### 4. Student Enrollment with Join Codes

Use the server action for enrollment:

```typescript
'use client';

import { enrollInCourse } from '@/app/actions/course-enrollment';
import { useState } from 'react';

export function JoinCourseForm() {
  const [joinCode, setJoinCode] = useState('');
  const [result, setResult] = useState<string>('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const enrollmentResult = await enrollInCourse(joinCode);

    if (enrollmentResult.success) {
      setResult(`Success! ${enrollmentResult.message}`);
      // Redirect to course page
      window.location.href = `/courses/${enrollmentResult.courseId}`;
    } else {
      setResult(`Error: ${enrollmentResult.error}`);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
        placeholder="Enter 6-character code"
        maxLength={6}
      />
      <button type="submit">Join Course</button>
      {result && <p>{result}</p>}
    </form>
  );
}
```

## Authorization Utilities Reference

### `checkCourseAccess(userId: string, courseId: string)`

Checks if a user has access to a course.

**Returns:** `CourseAuthResult`
```typescript
{
  authorized: boolean;
  role?: 'INSTRUCTOR' | 'STUDENT' | 'ADMIN';
  enrollment?: { id: string; role: string; enrolledAt: Date };
  course?: { id: string; title: string; instructorId: string };
}
```

**Authorization Logic:**
1. Admins → Automatic access to all courses
2. Course instructor → INSTRUCTOR role
3. Enrolled user → Role from enrollment (INSTRUCTOR or STUDENT)
4. Otherwise → Not authorized

### `requireCourseAccess(courseId: string, requiredRole?: 'INSTRUCTOR' | 'ADMIN')`

Server component helper that checks authorization and redirects if unauthorized.

**Usage:**
```typescript
// Basic access check
const auth = await requireCourseAccess(courseId);

// Require instructor role
const auth = await requireCourseAccess(courseId, 'INSTRUCTOR');

// Require admin role
const auth = await requireCourseAccess(courseId, 'ADMIN');
```

### `getUserCourses(userId: string)`

Get all courses a user has access to with their role.

**Returns:** Array of courses with `userRole` property

### `canManageCourse(userId: string, courseId: string)`

Check if user can manage course content (create/edit questions, topics).

**Returns:** `boolean` (true for instructors and admins only)

### `enrollWithJoinCode(userId: string, joinCode: string)`

Enroll a user in a course using a join code.

**Returns:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
  courseId?: string;
}
```

## URL Structure

All course-scoped routes should follow this pattern:

```
/courses/[courseId]/              # Course overview
/courses/[courseId]/topics        # Course topics
/courses/[courseId]/questions     # Question management (instructors)
/courses/[courseId]/students      # Student list (instructors)
/courses/[courseId]/quiz/start    # Start quiz
/courses/[courseId]/progress      # Student progress
/courses/[courseId]/settings      # Course settings (instructors)
```

## Security Best Practices

### 1. Always Verify in Server Components

```typescript
// ✅ GOOD - Server component with authorization
export default async function CoursePage({ params }) {
  await requireCourseAccess(params.courseId);
  // ...
}
```

```typescript
// ❌ BAD - Client component without server verification
'use client';
export default function CoursePage({ params }) {
  // Client-side checks can be bypassed!
  return <div>Course content</div>;
}
```

### 2. Add courseId Filter to All Queries

```typescript
// ✅ GOOD - Course-scoped query
const questions = await prisma.question.findMany({
  where: {
    courseId: params.courseId,
    isActive: true,
  },
});
```

```typescript
// ❌ BAD - Missing courseId filter (data leak!)
const questions = await prisma.question.findMany({
  where: { isActive: true },
});
```

### 3. Validate Input Parameters

```typescript
// ✅ GOOD - Validate courseId
if (!params.courseId || typeof params.courseId !== 'string') {
  notFound();
}
```

### 4. Use Server Actions for Mutations

```typescript
// ✅ GOOD - Server action with authorization
'use server';
export async function deleteQuestion(courseId: string, questionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const canManage = await canManageCourse(session.user.id, courseId);
  if (!canManage) throw new Error('Forbidden');

  // Delete question...
}
```

## Error Handling

The system provides specific error pages:

- **401 Unauthorized** → Redirect to `/auth/signin?callbackUrl=/courses/[courseId]`
- **403 Forbidden** → Redirect to `/403?reason=course_access_denied`

Custom 403 reasons:
- `course_access_denied` - User not enrolled in course
- `instructor_access_required` - Page requires instructor role
- `admin_access_required` - Page requires admin role
- `auth_check_failed` - Authorization check error

## Testing Authorization

### Test Cases

1. **Instructor Access**
   - ✅ Instructor can access their own courses
   - ❌ Instructor cannot access other instructors' courses
   - ✅ Instructor can manage content in their courses

2. **Student Access**
   - ✅ Student can access enrolled courses
   - ❌ Student cannot access non-enrolled courses
   - ❌ Student cannot manage course content

3. **Admin Access**
   - ✅ Admin can access all courses
   - ✅ Admin can manage all course content

4. **Enrollment**
   - ✅ Valid join code enrolls student
   - ❌ Invalid join code returns error
   - ❌ Duplicate enrollment returns error

## Migration Checklist

When adding course authorization to existing routes:

- [ ] Add `await requireCourseAccess(params.courseId)` to server component
- [ ] Add `courseId` filter to all Prisma queries
- [ ] Update API routes with `checkCourseAccess()` or `canManageCourse()`
- [ ] Wrap client components with `CourseAuthGuard` if needed
- [ ] Test with instructor, student, and non-enrolled user accounts
- [ ] Verify 403 redirects work correctly

## Example: Complete Protected Route

```typescript
// src/app/courses/[courseId]/questions/page.tsx
import { requireCourseAccess } from '@/lib/course-authorization';
import prisma from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function QuestionsPage({ params }: { params: { courseId: string } }) {
  // 1. Require instructor/admin access
  const authResult = await requireCourseAccess(params.courseId, 'INSTRUCTOR');

  // 2. Fetch course-scoped data
  const questions = await prisma.question.findMany({
    where: {
      courseId: params.courseId, // Critical: filter by courseId
      isActive: true,
    },
    include: {
      cell: true,
      answerOptions: true,
    },
  });

  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
  });

  if (!course) {
    notFound();
  }

  // 3. Render with authorization context
  return (
    <div>
      <h1>Manage Questions - {course.title}</h1>
      <p>You are viewing this as: {authResult.role}</p>
      {/* Question management UI */}
    </div>
  );
}
```

## Support

For questions or issues with the authorization system, refer to:
- [Prisma Schema](../prisma/schema.prisma) - Course and Enrollment models
- [Authorization Utils](../src/lib/course-authorization.ts) - Core logic
- [Example Page](../src/app/courses/[courseId]/page.tsx) - Usage example
