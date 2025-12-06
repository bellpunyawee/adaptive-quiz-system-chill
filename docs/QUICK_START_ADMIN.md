# Quick Start: Admin Access Setup

This is a **3-minute guide** to set up your first admin user.

---

## Option A: Create a New Admin Account (Recommended)

If you don't have an account yet or want a dedicated admin account:

```bash
npx tsx scripts/create-admin-simple.ts "Admin User" admin@quiz.com YourPassword123
```

**That's it!** You can now sign in with:
- **Email**: `admin@quiz.com`
- **Password**: `YourPassword123`

---

## Option B: Promote an Existing User

### Step 1: Find Your User Email

The email you used to sign up for the quiz system.

**Example**: `john@example.com`

### Step 2: Run the Promotion Script

Open your terminal in the project directory and run:

```bash
npx tsx scripts/promote-admin.ts YOUR_EMAIL_HERE
```

**Example**:
```bash
npx tsx scripts/promote-admin.ts john@example.com
```

**Expected Output**:
```
Looking for user with email: john@example.com
Found user: John Doe (john@example.com)
Current role: user
✅ User successfully promoted to admin!
Updated role: admin
```

---

## Verify Your Admin Account

You can verify admin accounts at any time:

```bash
npx tsx scripts/verify-admin.ts
```

This will show all admin accounts in the system.

---

## Step 3: Sign In (Option B only)

1. **Sign Out** from the application
2. **Sign Back In** with the same email/password

Your session will now include admin privileges!

---

## Step 4: Verify Admin Access

### Option A: Test in Browser

Open your browser's developer console and navigate to:

```
http://localhost:3000/api/admin/maintenance
```

You should see a JSON response with system health data (not a 403 error).

### Option B: Test with curl

```bash
curl http://localhost:3000/api/admin/maintenance
```

**Success Response**:
```json
{
  "success": true,
  "totalQuestions": 150,
  "activeQuestions": 145,
  ...
}
```

**Failure Response** (if not admin):
```json
{
  "error": "Forbidden. Admin access required."
}
```

---

## That's It! 🎉

You now have admin access and can proceed to building the admin dashboard.

---

## Troubleshooting

### "User not found"
- Double-check your email spelling
- Ensure you've created an account in the system first

### "Still getting 403 error"
- Make sure you signed out and signed back in
- Clear your browser cookies if needed
- Check the session includes role: `console.log(session.user.role)`

### "Script not running"
- Install tsx if needed: `npm install -D tsx`
- Ensure you're in the project root directory
- Check that `DATABASE_URL` is set in your `.env` file

---

## Next Steps

With admin access configured, you can now:

1. **Sprint 2**: Build the Core Admin Dashboard UI
2. **Sprint 3**: Add Quiz Response Logging
3. **Sprint 4**: Implement Student Engagement Analytics

See [ADMIN_SECURITY_SETUP.md](ADMIN_SECURITY_SETUP.md) for detailed documentation.

---
