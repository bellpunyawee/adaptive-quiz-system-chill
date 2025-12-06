# Admin Security Foundation - Setup Guide

**Date**: 2025-11-05

---

## Overview

This document outlines the security foundation for the admin tracking & monitoring system. Sprint 1 implements role-based access control (RBAC) to protect admin routes and API endpoints.

---

## Changes Implemented

### 1. Database Schema

**File**: [prisma/schema.prisma](prisma/schema.prisma)

Added `role` field to `User` model:

```prisma
model User {
  // ... existing fields

  // Role-based access control
  role  String  @default("user")  // "user" | "admin"

  // ... rest of model
}
```

**Migration Status**: ✅ Completed with `npx prisma db push`

---

### 2. NextAuth Configuration

**Files Modified**:
- [src/auth.ts](src/auth.ts) - Updated callbacks to include role in session
- [src/types/next-auth.d.ts](src/types/next-auth.d.ts) - TypeScript definitions for role

**Key Changes**:

1. **JWT Callback** - Store role in JWT token:
```typescript
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    token.role = user.role;
  }
  return token;
}
```

2. **Session Callback** - Include role in session:
```typescript
session({ session, token }) {
  if (token.sub && session.user) {
    session.user.id = token.sub;
    session.user.role = token.role as string;
  }
  return session;
}
```

3. **Authorize Method** - Return role from user record:
```typescript
return {
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
};
```

---

### 3. Admin Authentication Helpers

**File**: [src/lib/admin-auth.ts](src/lib/admin-auth.ts) (NEW)

Three helper functions for admin access control:

1. **`isAdmin()`** - Check if current user is admin
2. **`requireAdmin()`** - Middleware for API routes (returns error response if not admin)
3. **`getAdminSession()`** - Get session with admin check (throws error if not admin)

**Usage Examples**:

```typescript
// In API routes
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  // Admin-only logic here
}

// In server components
import { isAdmin } from '@/lib/admin-auth';

export default async function AdminPage() {
  const hasAccess = await isAdmin();
  if (!hasAccess) redirect('/dashboard');

  // Admin UI here
}
```

---

### 4. Secured Admin API Endpoints

**File**: [src/app/api/admin/maintenance/route.ts](src/app/api/admin/maintenance/route.ts)

Protected both GET and POST endpoints:

```typescript
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdmin();
  if (authError) return authError;

  // Admin-only maintenance jobs
}

export async function GET() {
  // Check admin authentication
  const authError = await requireAdmin();
  if (authError) return authError;

  // Admin-only health report
}
```

**Protected Endpoints**:
- ✅ `POST /api/admin/maintenance` - Run maintenance jobs
- ✅ `GET /api/admin/maintenance` - Get health report

---

## Promoting Users to Admin

### Method 1: Using the Script (Recommended)

**File**: [scripts/promote-admin.ts](scripts/promote-admin.ts) (NEW)

```bash
# Promote a user by email
npx tsx scripts/promote-admin.ts user@example.com
```

The script will:
1. Find the user by email
2. Check if already admin
3. Update role to 'admin'
4. Confirm the change

### Method 2: Direct Database Update

Using Prisma Studio:

```bash
npx prisma studio
```

Then navigate to User model and change `role` field from `"user"` to `"admin"`.

### Method 3: SQL Query (SQLite)

```bash
# Open database
sqlite3 prisma/dev.db

# Find user
SELECT id, email, role FROM User WHERE email = 'user@example.com';

# Promote to admin
UPDATE User SET role = 'admin' WHERE email = 'user@example.com';

# Verify
SELECT id, email, role FROM User WHERE email = 'user@example.com';
```

---

## Security Features

### Authentication Checks

All admin endpoints now:
- ✅ Verify user is signed in (401 if not)
- ✅ Verify user has admin role (403 if not)
- ✅ Return clear error messages

### Error Responses

**401 Unauthorized** - Not signed in:
```json
{
  "error": "Unauthorized. Please sign in."
}
```

**403 Forbidden** - Not admin:
```json
{
  "error": "Forbidden. Admin access required."
}
```

---

## Testing the Implementation

### 1. Test Admin API Protection

**Without Admin Role** (should return 403):
```bash
curl -X GET http://localhost:3000/api/admin/maintenance
```

**With Admin Role** (should return health report):
```bash
# After promoting your user to admin
curl -X GET http://localhost:3000/api/admin/maintenance
```

### 2. Test Admin Promotion Script

```bash
# Find your user email (from database or login screen)
npx tsx scripts/promote-admin.ts your-email@example.com

# Output should show:
# ✅ User successfully promoted to admin!
```

### 3. Verify Session Includes Role

In any server component:
```typescript
import { auth } from '@/auth';

const session = await auth();
console.log(session?.user?.role); // Should log "admin" or "user"
```

---

## File Structure

```
adaptive-quiz-system/
├── prisma/
│   └── schema.prisma (MODIFIED - added role field)
├── src/
│   ├── auth.ts (MODIFIED - added role to session/JWT)
│   ├── types/
│   │   └── next-auth.d.ts (NEW - TypeScript definitions)
│   ├── lib/
│   │   └── admin-auth.ts (NEW - admin helper functions)
│   └── app/
│       └── api/
│           └── admin/
│               └── maintenance/
│                   └── route.ts (MODIFIED - secured endpoints)
├── scripts/
│   └── promote-admin.ts (NEW - promote user script)
└── ADMIN_SECURITY_SETUP.md (THIS FILE)
```

---

## Next Steps (Future Sprints)

After Sprint 1 security foundation, the next phases will include:

**Sprint 2: Core Admin Dashboard**
- Admin layout with navigation
- System health overview
- Real-time activity feed
- User stats summary

**Sprint 3: Quiz Response Logging**
- Detailed quiz response table
- Filters and search
- Export functionality (CSV, JSON)
- Question-level analytics

**Sprint 4: Student Engagement Analytics**
- Engagement metrics and charts
- Retention analysis
- Performance distribution
- Topic popularity tracking

---

## Important Notes

1. **First Admin Setup**: You must manually promote at least one user to admin using the script or database update.

2. **Role Values**: Only two valid role values:
   - `"user"` (default for all new users)
   - `"admin"` (manually assigned)

3. **Session Updates**: After changing a user's role, they must sign out and sign back in for the session to update.

4. **Security Best Practices**:
   - Never commit admin credentials to version control
   - Limit admin access to trusted personnel only
   - Review admin action logs regularly
   - Consider adding audit logging for admin actions

5. **Database Migration**: The role field defaults to "user" for existing users, so they remain regular users after the migration.

---

## Troubleshooting

### Issue: "User not found"
**Solution**: Verify the email address is correct and the user exists in the database.

### Issue: "Still getting 403 after promotion"
**Solution**: User must sign out and sign back in to refresh their session.

### Issue: "Cannot read property 'role' of undefined"
**Solution**: Ensure the user is signed in and the session callback is correctly configured in [src/auth.ts](src/auth.ts).

### Issue: "Prisma Client Error"
**Solution**: Run `npx prisma generate` to regenerate the Prisma Client after schema changes.