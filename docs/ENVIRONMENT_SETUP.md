# Environment Configuration Guide

This guide explains how to properly configure environment variables for different deployment scenarios.

---

## Environment Files Overview

| File | Purpose | Tracked in Git | When to Use |
|------|---------|----------------|-------------|
| `.env.example` | Template with all variables | ✅ Yes | Reference, copy to create new envs |
| `.env.local` | Local development | ❌ No | Daily development work |
| `.env.production` | Production deployment | ❌ No | Production servers |
| `.env` | Legacy (deprecated) | ❌ No | Avoid using, use `.env.local` instead |

---

## Quick Setup

### For Development

```bash
# 1. Copy the example file
cp .env.example .env.local

# 2. Edit .env.local with your values
nano .env.local  # or use your preferred editor

# 3. Add your API keys and configure settings
# See "Required Variables" section below

# 4. Start development server
npm run dev
```

### For Production

```bash
# 1. Copy the example file
cp .env.example .env.production

# 2. Edit .env.production with production values
nano .env.production

# 3. IMPORTANT: Use secure secrets (see "Security" section)

# 4. Set NODE_ENV and start
NODE_ENV=production npm start
```

---

## Environment Variables Reference

### Required Variables

#### Database Configuration
```bash
# SQLite database file path
# Development: file:./dev.db
# Production: file:./production.db
DATABASE_URL="file:./dev.db"
```

#### Authentication Secrets
```bash
# Generate secure random strings for production
# Use: openssl rand -base64 32

AUTH_SECRET="your-super-secret-auth-secret-key"
NEXTAUTH_URL="http://localhost:3000"  # Change to your domain in production
NEXTAUTH_SECRET="your-super-secret-nextauth-secret-key"
```

#### Gemini API (for AI-powered feedback)
```bash
# Get your API key from: https://aistudio.google.com/apikey
GEMINI_API_KEY="your-gemini-api-key-here"
```

---

### Optional Variables (Contextual Bandit)

```bash
# Master switch to enable/disable contextual bandit
CONTEXTUAL_BANDIT_ENABLED=false

# Algorithm mode
# Options: hybrid (LinUCB + IRT) | linucb (pure LinUCB) | irt-only (baseline)
CONTEXTUAL_BANDIT_MODE=hybrid

# Traffic allocation (0-100): % of users assigned to contextual bandit
# 0 = shadow mode (logging only, no user impact)
# 20 = 20% A/B test
# 100 = full rollout
CONTEXTUAL_BANDIT_TRAFFIC=0

# Exploration parameter for LinUCB (default: 1.5)
# Higher = more exploration, Lower = more exploitation
CONTEXTUAL_BANDIT_ALPHA=1.5

# Verbose logging for debugging
CONTEXTUAL_BANDIT_VERBOSE=false
```

---

### System Variables

```bash
# Node environment
# Options: development | production | test
NODE_ENV=development

# Production optimizations
NEXT_PUBLIC_ENABLE_SOURCE_MAPS=false  # Disable in production for security

# Logging level
# Options: error | warn | info | debug
LOG_LEVEL=info
```

---

## Configuration by Environment

### Development (`.env.local`)

```bash
# Database
DATABASE_URL="file:./dev.db"

# Auth (less secure for development convenience)
AUTH_SECRET="dev-auth-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-nextauth-secret-change-in-production"

# Gemini API
GEMINI_API_KEY="your-dev-api-key"

# Contextual Bandit (enabled for testing)
CONTEXTUAL_BANDIT_ENABLED=true
CONTEXTUAL_BANDIT_MODE=hybrid
CONTEXTUAL_BANDIT_TRAFFIC=0       # Shadow mode
CONTEXTUAL_BANDIT_VERBOSE=true    # Detailed logs

# System
NODE_ENV=development
LOG_LEVEL=debug
```

### Production (`.env.production`)

```bash
# Database
DATABASE_URL="file:./production.db"

# Auth (SECURE SECRETS REQUIRED)
AUTH_SECRET="<use openssl rand -base64 32>"
NEXTAUTH_URL="https://your-production-domain.com"
NEXTAUTH_SECRET="<use openssl rand -base64 32>"

# Gemini API
GEMINI_API_KEY="<your-production-api-key>"

# Contextual Bandit (start conservative)
CONTEXTUAL_BANDIT_ENABLED=true
CONTEXTUAL_BANDIT_MODE=hybrid
CONTEXTUAL_BANDIT_TRAFFIC=0       # Start with shadow mode
CONTEXTUAL_BANDIT_VERBOSE=false   # Minimal logs

# System
NODE_ENV=production
LOG_LEVEL=info
NEXT_PUBLIC_ENABLE_SOURCE_MAPS=false
```

---

## Security Best Practices

### 1. Generate Secure Secrets

**Never use default secrets in production!**

```bash
# Generate secure random strings
openssl rand -base64 32

# Generate multiple for different purposes
openssl rand -base64 32  # For AUTH_SECRET
openssl rand -base64 32  # For NEXTAUTH_SECRET
```

### 2. Protect Environment Files

```bash
# Set proper file permissions (Unix/Linux)
chmod 600 .env.local
chmod 600 .env.production

# Never commit to git
git status  # Should not show .env files
```

### 3. Separate API Keys

Use different API keys for development and production:
- **Development**: Use test/sandbox keys with rate limits
- **Production**: Use production keys with proper quotas

### 4. Environment Variables in CI/CD

For deployment platforms (Vercel, Netlify, etc.):
1. Set environment variables in platform dashboard
2. Don't store production secrets in repository
3. Use platform's secret management

---

## Troubleshooting

### Issue: "Environment variables not loaded"

**Solution:**
```bash
# Make sure file exists
ls -la .env.local

# Restart server after changes
npm run dev
```

### Issue: "Database connection failed"

**Solution:**
```bash
# Check DATABASE_URL is correct
echo $DATABASE_URL

# Regenerate Prisma client
npx prisma generate
npx prisma db push
```

### Issue: "AUTH_SECRET is not set"

**Solution:**
```bash
# Add to .env.local
echo 'AUTH_SECRET="'$(openssl rand -base64 32)'"' >> .env.local
echo 'NEXTAUTH_SECRET="'$(openssl rand -base64 32)'"' >> .env.local
```

### Issue: "Contextual Bandit not working"

**Solution:**
```bash
# Check configuration
cat .env.local | grep CONTEXTUAL_BANDIT

# Should see:
# CONTEXTUAL_BANDIT_ENABLED=true
# CONTEXTUAL_BANDIT_TRAFFIC > 0 (for actual usage, 0 for shadow mode)

# Restart server
npm run dev
```

---

## Environment File Priority

Next.js loads environment files in this order (later overrides earlier):

1. `.env` (all environments)
2. `.env.local` (all environments, gitignored)
3. `.env.development` (development only)
4. `.env.development.local` (development only, gitignored)
5. `.env.production` (production only)
6. `.env.production.local` (production only, gitignored)

**Recommendation:** Use `.env.local` for development and `.env.production` for production. Ignore `.env` entirely (deprecated).

---

## Checklist

### Development Setup
- [ ] Copy `.env.example` to `.env.local`
- [ ] Add `GEMINI_API_KEY` (if using AI feedback)
- [ ] Set `DATABASE_URL="file:./dev.db"`
- [ ] Run `npx prisma db push`
- [ ] Run `npm run dev`
- [ ] Verify app loads at `http://localhost:3000`

### Production Setup
- [ ] Copy `.env.example` to `.env.production`
- [ ] Generate secure `AUTH_SECRET` and `NEXTAUTH_SECRET`
- [ ] Set production `NEXTAUTH_URL`
- [ ] Add production `GEMINI_API_KEY`
- [ ] Set `NODE_ENV=production`
- [ ] Set `LOG_LEVEL=info`
- [ ] Set `CONTEXTUAL_BANDIT_VERBOSE=false`
- [ ] Verify all secrets are secure (not defaults)
- [ ] Test in staging environment first

---

## Quick Reference Card

```bash
# Development
.env.local → Development secrets (gitignored)
npm run dev → Uses .env.local

# Production
.env.production → Production secrets (gitignored)
NODE_ENV=production npm start → Uses .env.production

# Generate secrets
openssl rand -base64 32

# Check loaded variables (be careful, shows secrets!)
npx next info

# Verify Prisma connection
npx prisma db push
```

---

## Additional Resources

- [Next.js Environment Variables Docs](https://nextjs.org/docs/basic-features/environment-variables)
- [Prisma Connection Strings](https://www.prisma.io/docs/reference/database-reference/connection-urls)
- [Contextual Bandit Configuration](./CONTEXTUAL_BANDIT.md#configuration)
- [Gemini API Setup](./PERSONALIZED_FEEDBACK.md#setup-instructions)

---

**Last Updated:** 2025-11-19
