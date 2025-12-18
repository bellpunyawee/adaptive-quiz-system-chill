# Test Accounts for Instructor System

**Created**: December 17, 2025
**Purpose**: Testing multi-role navigation and instructor features

---

## Login Credentials

### 1. Admin Account
```
Email:    admin@test.com
Password: password123
Name:     Test Admin
Role:     admin
```

**Access**:
- ✅ Admin Panel (`/admin`)
- ✅ Instructor Panel (`/instructor`)
- ✅ Student Dashboard (`/dashboard`)
- ✅ All system features

**Use Case**: Testing admin workflows, system management, and cross-panel navigation

---

### 2. Instructor Account
```
Email:    instructor@test.com
Password: password123
Name:     Test Instructor
Role:     instructor
```

**Access**:
- ✅ Instructor Panel (`/instructor`)
- ✅ Student Dashboard (`/dashboard`)
- ❌ Admin Panel (redirects to dashboard)

**Use Case**: Testing instructor workflows, course creation, student management

---

### 3. Student Account
```
Email:    student@test.com
Password: password123
Name:     Test Student
Role:     user
```

**Access**:
- ✅ Student Dashboard (`/dashboard`)
- ❌ Instructor Panel (redirects to dashboard)
- ❌ Admin Panel (redirects to dashboard)

**Use Case**: Testing student workflows, course enrollment, taking quizzes

---

## Testing Workflows

### Test 1: Admin Workflow
1. Login with `admin@test.com` / `password123`
2. Should land on `/dashboard`
3. Verify "Admin & Instructor Access" card is visible
4. Click "Admin Panel" → should navigate to `/admin`
5. In admin sidebar, click "Instructor Panel" under Quick Access
6. Should navigate to `/instructor`
7. In instructor panel, click admin badge → back to `/admin`
8. Click "Student Dashboard" → back to `/dashboard`

### Test 2: Instructor Workflow
1. Login with `instructor@test.com` / `password123`
2. Should land on `/dashboard`
3. Verify "Instructor Access" card is visible (NOT admin access)
4. Click "Instructor Panel" → navigate to `/instructor`
5. Click "Create Course" in sidebar
6. Fill course details, generate join code
7. Create course → lands on setup wizard
8. Verify join code is displayed
9. Click "View Students" → empty list (no enrollments yet)
10. Click "Student Dashboard" in sidebar → back to `/dashboard`

### Test 3: Student Workflow
1. Login with `student@test.com` / `password123`
2. Should land on `/dashboard`
3. Verify NO instructor or admin access cards
4. Verify "Join Course" card is visible
5. Click "Join Course" → navigate to `/courses/join`
6. Enter join code from instructor (e.g., `ABC123`)
7. Submit → enrolled in course
8. Redirected to course page
9. Can now take quizzes for that course

### Test 4: Cross-Role Testing
1. **As Instructor**: Create a course with join code `TEST01`
2. **As Student**: Join course with code `TEST01`
3. **As Instructor**: Navigate to students page → see student enrolled
4. **As Student**: Start a quiz in the enrolled course
5. **As Instructor**: View student progress (future feature)

---

## Expected Navigation Behaviors

### Dashboard Quick Access Cards

| Role       | Instructor Card | Admin Card | Join Course Card |
|------------|----------------|------------|------------------|
| Student    | ❌ Hidden      | ❌ Hidden  | ✅ Visible       |
| Instructor | ✅ Visible     | ❌ Hidden  | ✅ Visible       |
| Admin      | ✅ Visible     | ✅ Visible | ✅ Visible       |

### Panel Access

| Role       | `/dashboard` | `/instructor` | `/admin` |
|------------|-------------|---------------|----------|
| Student    | ✅ Access   | ❌ Redirect   | ❌ Redirect |
| Instructor | ✅ Access   | ✅ Access     | ❌ Redirect |
| Admin      | ✅ Access   | ✅ Access     | ✅ Access   |

### Sidebar Links

**Instructor Sidebar** (`/instructor`):
- Dashboard (instructor home)
- My Courses
- Create Course
- Student Dashboard (back to `/dashboard`)
- Admin badge (admins only) → `/admin`

**Admin Sidebar** (`/admin`):
- Main navigation (Dashboard, Questions, Tags, etc.)
- Quick Access section:
  - Instructor Panel → `/instructor`
  - Student Dashboard → `/dashboard`

---

## Common Test Scenarios

### Scenario 1: Instructor Creates Course & Student Joins
1. Login as instructor
2. Go to instructor panel
3. Create course "CS 101" with join code `CS101`
4. Add questions to course
5. Logout
6. Login as student
7. Click "Join Course"
8. Enter code `CS101`
9. Verify enrollment successful
10. Take quiz in CS 101
11. Logout
12. Login as instructor
13. View students → see student listed
14. View student stats

### Scenario 2: Admin Testing All Interfaces
1. Login as admin
2. From dashboard, click "Admin Panel"
3. Manage system (questions, users, etc.)
4. Click "Instructor Panel" in Quick Access
5. Create a test course
6. Click "Student Dashboard" in Quick Access
7. Click "Join Course"
8. Join the course you just created
9. Verify enrollment works
10. Switch back to instructor panel
11. Verify self-enrollment appears

### Scenario 3: Authorization Testing
1. **Instructor tries to access admin**:
   - Navigate to `/admin` → redirects to `/dashboard`
2. **Student tries to access instructor**:
   - Navigate to `/instructor` → redirects to `/dashboard`
3. **Student tries to access admin**:
   - Navigate to `/admin` → redirects to `/dashboard`
4. **Admin accesses everything**:
   - All URLs work correctly

---

## Troubleshooting

### Issue: Can't login
- **Check**: Email and password are correct
- **Check**: User exists in database (`npx tsx scripts/check-users.ts`)
- **Fix**: Re-run `npx tsx scripts/create-instructor-admin.ts`

### Issue: Instructor card not showing
- **Check**: User role is set to "instructor" or "admin"
- **Check**: Dashboard page fetches user role correctly
- **Fix**: Verify database role field

### Issue: Redirected when accessing panel
- **Check**: User has correct role for that panel
- **Expected**: Students cannot access instructor/admin panels

### Issue: Join code doesn't work
- **Check**: Course exists and is active
- **Check**: Join code is exactly 6 characters (uppercase alphanumeric)
- **Check**: No typos in the code

---

## Database Queries

### Check user roles:
```sql
SELECT email, name, role FROM "User"
WHERE email IN ('admin@test.com', 'instructor@test.com', 'student@test.com');
```

### Change user role:
```sql
UPDATE "User" SET role = 'instructor'
WHERE email = 'someuser@example.com';
```

### List all courses:
```sql
SELECT id, title, joinCode, instructorId FROM "Course";
```

### List enrollments:
```sql
SELECT u.email, c.title, e.enrolledAt
FROM "Enrollment" e
JOIN "User" u ON e.userId = u.id
JOIN "Course" c ON e.courseId = c.id;
```

---

## Quick Commands

```bash
# Create test accounts
npx tsx scripts/create-instructor-admin.ts

# Check all users
npx tsx scripts/check-users.ts

# Start development server
npm run dev

# Open database in Prisma Studio
npx prisma studio
```

---

## Security Notes

⚠️ **IMPORTANT**: These are TEST accounts only!

- Password is simple (`password123`) for testing purposes
- DO NOT use these accounts in production
- Change passwords for any accounts used in production
- Delete test accounts before deployment

---

## Next Steps After Testing

1. ✅ Test all three account types
2. ✅ Verify navigation works correctly
3. ✅ Test instructor course creation
4. ✅ Test student enrollment with join codes
5. ✅ Verify authorization prevents unauthorized access
6. 📝 Document any bugs or issues
7. 🚀 Ready for production with real accounts!

---

**Created by**: Instructor System Implementation
**Last Updated**: December 17, 2025
**Script**: `scripts/create-instructor-admin.ts`
