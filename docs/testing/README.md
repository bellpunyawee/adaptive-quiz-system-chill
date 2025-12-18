# Testing Documentation

Comprehensive testing resources for the Adaptive Quiz System.

---

## 📋 Testing Resources

### [Test Accounts](TEST_ACCOUNTS.md)

**Purpose**: Pre-configured accounts for testing different roles

**What's included**:
- Student account credentials
- Instructor account credentials
- Admin account credentials
- All passwords: `password123`

**Test accounts**:
- `student@test.com` - Student role
- `instructor@test.com` - Instructor role
- `admin@test.com` - Admin role (full access)

**When to use**: You need to test role-based features

---

### [Testing Guide](TESTING_GUIDE.md)

**Purpose**: Comprehensive test suite for all features

**What's included**:
- 8 test suites with 20+ test cases
- Role-based testing scenarios
- Database verification steps
- Expected behaviors and results

**Test coverage**:
1. **Navigation UI** - Role-based button visibility
2. **Authorization** - Access control for each role
3. **Instructor Workflows** - Course creation, student enrollment
4. **Cross-Panel Navigation** - Switching between panels
5. **Edge Cases** - Invalid codes, duplicates, errors
6. **Responsive Design** - Desktop, tablet, mobile
7. **Database Verification** - Data integrity checks
8. **Performance** - Load times, console errors

**When to use**: Before deployment or after major changes

---

## 🧪 Quick Testing Workflows

### Test Navigation System (5 minutes)

```bash
# 1. Start the app
npm run dev

# 2. Test as Student
# Login: student@test.com / password123
# Verify: Only "Join Course" button visible
# Try: Access /instructor (should redirect)
# Try: Access /admin (should redirect)

# 3. Test as Instructor
# Login: instructor@test.com / password123
# Verify: "Join Course" + "Instructor" buttons visible
# Try: Access /instructor (should work)
# Try: Access /admin (should redirect)

# 4. Test as Admin
# Login: admin@test.com / password123
# Verify: All three buttons visible
# Try: Access both /instructor and /admin (should work)
```

### Test Student Reports (10 minutes)

```bash
# 1. Create test data (as instructor)
# Login: instructor@test.com / password123
# Create a course → Note the join code

# 2. Enroll student
# Logout → Login as student@test.com
# Join course with the code

# 3. Take a quiz (as student)
# Complete at least one quiz in the course

# 4. View reports (as instructor)
# Login: instructor@test.com / password123
# Go to: Instructor → Course → View Students → Reports & Export
# Verify: Student appears with quiz statistics
# Test: Export CSV and JSON files
```

### Test Authorization (3 minutes)

```bash
# For each role (student, instructor, admin):
# 1. Login with credentials
# 2. Try accessing these URLs directly:
#    - /dashboard (all should access)
#    - /instructor (instructor + admin only)
#    - /admin (admin only)
#    - /courses/join (all should access)
# 3. Verify redirects work correctly
```

---

## 🔬 Database Testing

### Verify User Roles

```bash
# Check user roles in database
npx tsx scripts/check-users.ts

# Expected output:
# Email: student@test.com, Role: user
# Email: instructor@test.com, Role: instructor
# Email: admin@test.com, Role: admin
```

### View Database Content

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# Check:
# - User table (verify roles)
# - Course table (verify instructorId)
# - Enrollment table (verify student enrollments)
# - Quiz table (verify quiz data)
# - UserAnswer table (verify answer logs)
```

---

## 📊 Test Coverage Checklist

### Core Features
- [ ] User authentication (login/logout)
- [ ] Role-based access control
- [ ] Course creation (instructor)
- [ ] Course enrollment (student with join code)
- [ ] Quiz taking (student)
- [ ] Student reports (instructor)
- [ ] Export functionality (CSV/JSON)

### Navigation
- [ ] Dashboard displays correctly for all roles
- [ ] Button visibility based on role
- [ ] Cross-panel navigation (admin/instructor)
- [ ] Sign out from all panels

### Authorization
- [ ] Students cannot access instructor panel
- [ ] Students cannot access admin panel
- [ ] Instructors cannot access admin panel
- [ ] Admins can access all panels
- [ ] Course ownership verified (instructors see only their courses)

### Data Integrity
- [ ] User roles stored correctly in database
- [ ] Courses linked to correct instructor
- [ ] Enrollments prevent duplicates
- [ ] Quiz answers logged properly
- [ ] Statistics calculated accurately

### Edge Cases
- [ ] Invalid join codes handled
- [ ] Duplicate enrollments prevented
- [ ] Empty quiz lists handled
- [ ] No students scenario (reports page)
- [ ] Browser popup blockers (exports)

---

## 🚀 Automated Testing

### Run All Tests

```bash
# Run all automated tests
npm test

# Run specific test suites
npm test -- --grep "navigation"
npm test -- --grep "authorization"
npm test -- --grep "student-reports"
```

### Run Publication Pipeline Tests

```bash
# Full research validation suite (2-4 hours)
./scripts/testing/test-publication-pipeline.sh

# Phase-specific tests
npx tsx scripts/testing/monte-carlo-phase3.ts
npx tsx scripts/testing/cross-validation.ts
npx tsx scripts/testing/baseline-models.ts
```

---

## 🐛 Bug Reporting Template

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

**Environment**:
- Browser: [Chrome/Firefox/Safari + version]
- Account: [student/instructor/admin]
- Console Errors: [Copy any errors]
```

---

## 📈 Success Criteria

All tests pass when:
- ✅ All role-based buttons display correctly
- ✅ No unauthorized access possible
- ✅ Instructors can create and manage courses
- ✅ Students can join courses with codes
- ✅ All panels load without errors
- ✅ Cross-panel navigation works smoothly
- ✅ No console errors or warnings
- ✅ Responsive on all screen sizes
- ✅ Exports download successfully
- ✅ Data integrity maintained

---

## 🔗 Related Documentation

- [Getting Started Guide](../getting-started/QUICK_START.md) - Initial setup
- [Student Reports Feature](../features/STUDENT_REPORTS_FEATURE.md) - Feature details
- [Navigation Improvements](../features/NAVIGATION_IMPROVEMENTS.md) - Navigation system
- [User Guide](../USER_GUIDE.md) - Complete documentation

---

**Last Updated**: December 17, 2025
**Estimated Testing Time**: 30-45 minutes for full manual suite
