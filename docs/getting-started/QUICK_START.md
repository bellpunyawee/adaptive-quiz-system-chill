# Quick Start Guide

**Get started with the instructor system in 5 minutes**

---

## 🚀 Start the Server

```bash
npm run dev
```

Open: `http://localhost:3000`

---

## 🔑 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@test.com` | `password123` |
| **Instructor** | `instructor@test.com` | `password123` |
| **Student** | `student@test.com` | `password123` |

---

## 👨‍🏫 Instructor Quick Start

### 1. Create a Course
```
Login → Click "Instructor" → Click "Create Course"
Fill: Title, Description → Generate Join Code → Create
```

### 2. Add Questions
```
Setup Wizard → "Add Questions" → Create questions with rich text editor
```

### 3. Share with Students
```
Copy join code (e.g., ABC123) → Share with students
```

---

## 👨‍🎓 Student Quick Start

### 1. Join a Course
```
Login → Click "Join Course" → Enter join code → Submit
```

### 2. Take Quiz
```
Dashboard → Start Quiz → Answer questions → Submit
```

---

## 🛡️ Admin Quick Start

### Navigate All Panels
```
Dashboard:
  → Click "Admin" for system management
  → Click "Instructor" for course management
  → Both panels have "Quick Access" to switch views
```

---

## 📍 Navigation Map

```
Student:   [Join Course]
Instructor: [Join Course] [Instructor]
Admin:     [Join Course] [Instructor] [Admin]
```

All in the top bar, next to breadcrumb!

---

## 🔍 Find What You Need

- **Test Accounts**: `TEST_ACCOUNTS.md`
- **Full Testing**: `TESTING_GUIDE.md`
- **Features**: `INSTRUCTOR_SYSTEM_SUMMARY.md`
- **Navigation**: `NAVIGATION_IMPROVEMENTS.md`
- **Complete Overview**: `IMPLEMENTATION_COMPLETE.md`

---

## ⚡ Common Tasks

### Create Instructor Account
```bash
npx tsx scripts/create-instructor-admin.ts
```

### Check User Roles
```bash
npx tsx scripts/check-users.ts
```

### Database UI
```bash
npx prisma studio
```

---

## 🎯 Key Features

✅ Clean navigation (no large cards!)
✅ Role-based access
✅ 6-character join codes
✅ Rich text question editor
✅ Student enrollment tracking
✅ Mobile responsive

---

## 🐛 Need Help?

1. Check `TESTING_GUIDE.md` for common issues
2. Review `IMPLEMENTATION_COMPLETE.md` for architecture
3. See `NAVIGATION_VISUAL.md` for layout diagrams

---

**Ready to test!** 🎉
