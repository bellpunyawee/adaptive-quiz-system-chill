# Testing Guide - Instructor System & Clean Navigation

**Date**: December 17, 2025
**Purpose**: Comprehensive testing instructions for the instructor system and new navigation UI

---

## Prerequisites

### 1. Start the Development Server
```bash
npm run dev
```
Server should be running on `http://localhost:3000`

### 2. Test Accounts Available

| Role | Email | Password |
|------|-------|----------|
| Student | `student@test.com` | `password123` |
| Instructor | `instructor@test.com` | `password123` |
| Admin | `admin@test.com` | `password123` |

---

## Test Suite 1: Navigation UI & Layout

### Test 1.1: Student Dashboard Navigation
**Login**: `student@test.com` / `password123`

**Expected Behavior**:
1. Dashboard loads successfully
2. Top bar shows:
   - Left: `Home > Dashboard | [Join Course]`
   - Right: `[How It Works] [Sign Out]`
3. NO "Instructor" button visible
4. NO "Admin" button visible
5. Clean, minimal layout (no large cards)

**Visual Check**:
- [ ] Breadcrumb displays correctly
- [ ] "Join Course" button has UserPlus icon
- [ ] Buttons are properly aligned
- [ ] Adequate spacing between elements

---

### Test 1.2: Instructor Dashboard Navigation
**Login**: `instructor@test.com` / `password123`

**Expected Behavior**:
1. Dashboard loads successfully
2. Top bar shows:
   - Left: `Home > Dashboard | [Join Course] [Instructor]`
   - Right: `[How It Works] [Sign Out]`
3. "Instructor" button IS visible
4. NO "Admin" button visible

**Functional Check**:
- [ ] Click "Instructor" button → navigates to `/instructor`
- [ ] Instructor panel loads with sidebar
- [ ] Can return to dashboard via "Student Dashboard" in sidebar

---

### Test 1.3: Admin Dashboard Navigation
**Login**: `admin@test.com` / `password123`

**Expected Behavior**:
1. Dashboard loads successfully
2. Top bar shows:
   - Left: `Home > Dashboard | [Join Course] [Instructor] [Admin]`
   - Right: `[How It Works] [Sign Out]`
3. ALL three buttons visible: Join Course, Instructor, Admin

**Functional Check**:
- [ ] Click "Admin" button → navigates to `/admin`
- [ ] Click "Instructor" button → navigates to `/instructor`
- [ ] Both panels load correctly
- [ ] Can switch between panels using sidebar links

---

## Test Suite 2: Authorization & Permissions

### Test 2.1: Student Access Restrictions
**Login**: `student@test.com` / `password123`

**Manual URL Tests**:
1. Navigate to `http://localhost:3000/instructor`
   - [ ] **Expected**: Redirects to `/dashboard`
   - [ ] **NOT**: Shows instructor panel

2. Navigate to `http://localhost:3000/admin`
   - [ ] **Expected**: Redirects to `/dashboard`
   - [ ] **NOT**: Shows admin panel

**Result**: ✅ Students CANNOT access instructor or admin panels

---

### Test 2.2: Instructor Access Restrictions
**Login**: `instructor@test.com` / `password123`

**Manual URL Tests**:
1. Navigate to `http://localhost:3000/instructor`
   - [ ] **Expected**: Loads instructor panel successfully
   - [ ] Sidebar shows navigation options

2. Navigate to `http://localhost:3000/admin`
   - [ ] **Expected**: Redirects to `/dashboard`
   - [ ] **NOT**: Shows admin panel

**Result**: ✅ Instructors CAN access instructor panel but NOT admin panel

---

### Test 2.3: Admin Full Access
**Login**: `admin@test.com` / `password123`

**Manual URL Tests**:
1. Navigate to `http://localhost:3000/instructor`
   - [ ] **Expected**: Loads instructor panel
   - [ ] Shows admin badge in sidebar footer

2. Navigate to `http://localhost:3000/admin`
   - [ ] **Expected**: Loads admin panel
   - [ ] Sidebar shows "Quick Access" section

**Result**: ✅ Admins CAN access ALL panels

---

## Test Suite 3: Instructor Workflows

### Test 3.1: Create Course
**Login**: `instructor@test.com` / `password123`

**Steps**:
1. Click "Instructor" button in dashboard
2. In instructor panel, click "Create Course" in sidebar
3. Fill out form:
   - Title: `Test Course 101`
   - Description: `This is a test course`
   - Join Code: Click "Generate" → note the code (e.g., `ABC123`)
4. Click "Create Course"

**Expected Results**:
- [ ] Redirects to `/instructor/courses/[courseId]/setup`
- [ ] Success message displays
- [ ] Join code is prominently displayed
- [ ] Setup wizard shows 3 steps
- [ ] Step 1 (Add Topics) shows unchecked
- [ ] Step 2 (Add Questions) shows unchecked
- [ ] Step 3 (Share Code) displays join code

**Notes**: Copy the join code for use in Test 3.3

---

### Test 3.2: View Course in Dashboard
**Login**: `instructor@test.com` / `password123`

**Steps**:
1. Navigate to instructor dashboard (`/instructor`)
2. View course list

**Expected Results**:
- [ ] "Test Course 101" appears in list
- [ ] Shows 0 students enrolled
- [ ] Shows 0 questions
- [ ] Join code is visible
- [ ] "View Students" button available

---

### Test 3.3: Student Enrollment
**Login**: `student@test.com` / `password123`

**Steps**:
1. Click "Join Course" button in dashboard
2. Enter the join code from Test 3.1 (e.g., `ABC123`)
3. Click "Join Course"

**Expected Results**:
- [ ] Shows success message
- [ ] Redirects to course page
- [ ] Course title displays correctly
- [ ] No error messages

**Verify**:
1. Logout
2. Login as `instructor@test.com`
3. Go to instructor panel → "Test Course 101" → "View Students"
4. Check student list:
   - [ ] "Test Student" appears in list
   - [ ] Enrollment date shows today
   - [ ] Stats show 0 quizzes taken

---

## Test Suite 4: Cross-Panel Navigation

### Test 4.1: Admin → Instructor → Student
**Login**: `admin@test.com` / `password123`

**Steps**:
1. Start at dashboard
2. Click "Admin" → verify admin panel loads
3. In admin sidebar, click "Instructor Panel" under Quick Access
4. Verify instructor panel loads
5. In instructor sidebar, click "Student Dashboard"
6. Verify dashboard loads

**Expected Results**:
- [ ] All transitions work smoothly
- [ ] No errors in console
- [ ] Proper page titles on each panel
- [ ] Sidebars display correctly

---

### Test 4.2: Instructor → Dashboard → Instructor
**Login**: `instructor@test.com` / `password123`

**Steps**:
1. Click "Instructor" in dashboard
2. In instructor panel, click "Student Dashboard" in sidebar
3. Back at dashboard, click "Instructor" again

**Expected Results**:
- [ ] Returns to instructor panel
- [ ] No loss of state
- [ ] Sidebar remains functional

---

## Test Suite 5: Edge Cases & Error Handling

### Test 5.1: Invalid Join Code
**Login**: `student@test.com` / `password123`

**Steps**:
1. Click "Join Course"
2. Enter invalid code: `INVALID`
3. Submit

**Expected Results**:
- [ ] Shows error message
- [ ] Stays on join page
- [ ] Can try again

---

### Test 5.2: Duplicate Enrollment
**Login**: `student@test.com` / `password123`

**Prerequisite**: Student already enrolled in course

**Steps**:
1. Click "Join Course"
2. Enter same join code again
3. Submit

**Expected Results**:
- [ ] Shows "Already enrolled" message
- [ ] Redirects to course page
- [ ] No duplicate enrollment created

**Verify**:
- Login as instructor
- Check student list → only ONE enrollment for Test Student

---

### Test 5.3: Sign Out from Each Panel
**Test each account**:

**From Dashboard**:
- [ ] Click "Sign Out" → redirects to login

**From Instructor Panel**:
- [ ] Click "Sign Out" in top bar → redirects to login

**From Admin Panel**:
- [ ] Click "Sign Out" in top bar → redirects to login

---

## Test Suite 6: Responsive Design

### Test 6.1: Desktop (> 1024px)
**Open browser to full width**

**Expected**:
- [ ] All buttons fit in single row
- [ ] Adequate spacing between elements
- [ ] No text truncation
- [ ] Icons aligned properly

---

### Test 6.2: Tablet (768px - 1024px)
**Resize browser to tablet width**

**Expected**:
- [ ] Buttons may wrap to second row
- [ ] Layout remains functional
- [ ] No horizontal scroll
- [ ] Sign out button accessible

---

### Test 6.3: Mobile (< 768px)
**Resize browser to mobile width**

**Expected**:
- [ ] Sidebar collapses to hamburger menu (instructor/admin)
- [ ] Dashboard buttons stack vertically or wrap
- [ ] All functionality accessible
- [ ] Touch targets adequate (44px minimum)

---

## Test Suite 7: Database Verification

### Test 7.1: Check User Roles
```bash
npx tsx scripts/check-users.ts
```

**Expected Output**:
```
Email: student@test.com
Role: user

Email: instructor@test.com
Role: instructor

Email: admin@test.com
Role: admin
```

---

### Test 7.2: Verify Course Creation
**After creating course in Test 3.1**

```bash
npx prisma studio
```

1. Open `Course` table
2. Find "Test Course 101"
3. Verify:
   - [ ] `instructorId` matches instructor user ID
   - [ ] `joinCode` matches generated code
   - [ ] `isActive` is `true`

---

### Test 7.3: Verify Enrollment
**After student joins in Test 3.3**

```bash
npx prisma studio
```

1. Open `Enrollment` table
2. Find enrollment for Test Student
3. Verify:
   - [ ] `userId` matches student user ID
   - [ ] `courseId` matches Test Course 101 ID
   - [ ] `role` is "STUDENT"
   - [ ] `enrolledAt` shows today's date

---

## Test Suite 8: Performance & Console

### Test 8.1: Console Errors
**During all tests above**

**Check Browser Console**:
- [ ] NO errors during page loads
- [ ] NO warnings about missing keys
- [ ] NO hydration mismatches
- [ ] NO failed API calls

---

### Test 8.2: Network Requests
**Open Network tab in DevTools**

**During navigation**:
- [ ] Only necessary requests made
- [ ] No duplicate requests
- [ ] Fast response times (<500ms for most)
- [ ] Proper status codes (200, 302)

---

## Checklist Summary

### Navigation UI
- [ ] Student sees only "Join Course" button
- [ ] Instructor sees "Join Course" + "Instructor"
- [ ] Admin sees all three buttons
- [ ] Clean, compact layout (no large cards)
- [ ] Proper spacing and alignment

### Authorization
- [ ] Students cannot access instructor/admin panels
- [ ] Instructors can access instructor panel only
- [ ] Admins can access all panels
- [ ] Database-level role checks working

### Instructor Features
- [ ] Can create courses
- [ ] Join codes generated correctly
- [ ] Students can enroll
- [ ] Instructor can view enrolled students
- [ ] Course setup wizard works

### Cross-Panel Navigation
- [ ] Admin can switch between all panels
- [ ] Instructor can access student dashboard
- [ ] Sidebar links work correctly
- [ ] No navigation errors

---

## Bug Reporting Template

If you find issues during testing:

```markdown
**Bug Title**: [Brief description]

**Steps to Reproduce**:
1. Login as [role]
2. Navigate to [page]
3. Click [button]
4. ...

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Screenshots**:
[Attach if relevant]

**Browser**: [Chrome/Firefox/Safari + version]
**Account Used**: [student/instructor/admin]
**Console Errors**: [Copy any errors]
```

---

## Success Criteria

All tests pass when:
- ✅ All role-based buttons display correctly
- ✅ No unauthorized access possible
- ✅ Instructors can create and manage courses
- ✅ Students can join courses with codes
- ✅ All panels load without errors
- ✅ Cross-panel navigation works smoothly
- ✅ No console errors or warnings
- ✅ Responsive on all screen sizes

---

**Testing Status**: Ready to Begin
**Estimated Time**: 30-45 minutes for full suite
**Priority**: High (verify before production)

