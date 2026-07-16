# Deployment Guide

## Prerequisites

- **Node.js** v18+ (v20 recommended)
- **npm** v9+
- **Vercel CLI** (`npm i -g vercel`)
- **Supabase CLI** (`npm i -g supabase`) — for local development and migrations
- **Git** — for version control and Vercel auto-deploy

## Local Setup

```bash
# 1. Clone the repository
git clone <repo-url> noska
cd noska

# 2. Copy environment files
cp .env.example .env
cp admin/.env.example admin/.env

# 3. Install dependencies
npm install
cd admin && npm install && cd ..

# 4. Start dev servers (main SPA on :5173, admin on :5174)
npm run dev

# In a separate terminal:
cd admin && npm run dev
```

## Environment Variables

See [environment.md](./environment.md) for the complete reference.

**Critical variables to set for deployment:**

| Variable | Where to Set | Notes |
|----------|-------------|-------|
| `VITE_SUPABASE_URL` | Vercel + `.env` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel + `.env` | Anon/publishable key from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + `.env` | Server-side only — **never expose to client** |
| `VITE_CLERK_PUBLISHABLE_KEY` | Vercel + `.env` | From Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Vercel + `.env` | From Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Vercel + `.env` | From Clerk Dashboard → Webhooks |
| `RESEND_API_KEY` | Vercel + `.env` | From Resend Dashboard |
| `FROM_EMAIL` | Vercel + `.env` | Verified sending domain in Resend |
| `TRIGGER_API_KEY` | Vercel + `.env` | From Trigger.dev Dashboard |

## Build Command

The build command runs automatically in Vercel:

```bash
npm run build
```

This executes:
1. `vite build` — builds the main SPA to `dist/`
2. `cd admin && npm ci && npm run build` — builds admin SPA to `admin/dist/`
3. `node -e "fs.cpSync('admin/dist','dist/control',{recursive:true})"` — merges admin build into main output

**Important:** The admin SPA `package.json` dependencies are NOT included in the root `package-lock.json`. The build script runs `npm ci` in the `admin/` directory separately. Make sure both `package.json` files keep their respective dependencies in sync.

## Vercel Deployment

### Option 1: Git Integration (Recommended)

1. Push your repository to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Connect your git repository
4. **Framework preset:** Vite (auto-detected)
5. **Root directory:** `./` (project root)
6. **Build command:** `npm run build` (auto-detected from `vercel.json`)
7. **Output directory:** `dist` (auto-detected from `vercel.json`)
8. **Environment variables:** Add all required env vars in Vercel Project Settings → Environment Variables
9. Deploy!

### Option 2: Vercel CLI

```bash
# Login to Vercel
vercel login

# Link project (first time)
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
# ... repeat for all env vars
```

### Preview Deployments

Each push to a branch creates a preview deployment with a unique URL. Environment variables must be set separately for preview environments in Vercel settings, or they inherit from production.

## Supabase Migrations

### Running Migrations

Migrations are in `supabase/migrations/` and are applied in filename order.

```bash
# Link to your Supabase project
supabase link --project-ref yxgtmzksnyarlivgxujf

# Apply all pending migrations
supabase db push

# Or apply a specific migration
supabase db push --file 20250716000000_admin_check_exists.sql

# Check migration status
supabase migration list
```

### Migration Order

Migrations are applied in alphanumeric order by filename. The current set:

1. `20250101000001_create_tables.sql` — Core tables (pages, workspace_settings, ai_chats)
2. `20250101000002_create_ai_memory.sql` — AI memory table
3. `20250101000003_extend_chats.sql` — AI chat extensions
4. `20250601000000_collaboration_core.sql` — Realtime collaboration tables
5. `20250602000000_enable_realtime.sql` — Enable Realtime publications
6. `20250628000000_fix_collab_migration.sql` — Fixes for collaboration
7. `20250715000000_security_hardening.sql` — Admin security, audit logging
8. `20250715000001_enterprise_hardening.sql` — Rate limiting, enterprise security
9. `20250715000002_audit_rpc_grants.sql` — Audit RPC grants, password policy
10. `20250715000003_enable_realtime_user_profiles.sql` — Realtime for user_profiles
11. `20250716000000_admin_check_exists.sql` — Admin setup RPCs
12. `20250716000001_content_tables.sql` — Content management tables
13. `20250717000000_admin_broadcasts.sql` — Broadcast notifications

**Important:** The `rls/` directory contains gated RLS migration scripts that are NOT applied automatically. See `rls/README.md` for the run order and safety gates.

## Edge Function Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy a specific function
supabase functions deploy send-email
supabase functions deploy clerk-webhook
supabase functions deploy waitlist-signup
supabase functions deploy resend-webhook
supabase functions deploy webhook-receiver

# Set environment variables for functions
supabase secrets set RESEND_API_KEY=re_xxxx
supabase secrets set CLERK_WEBHOOK_SECRET=whsec_xxxx
supabase secrets set CLERK_SECRET_KEY=sk_xxxx
supabase secrets set RESEND_WEBHOOK_SECRET=rewh_xxxx
supabase secrets set FROM_EMAIL=hello@noska.me
```

**Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected by Supabase for edge functions. Do not set them manually.

### Function URLs

- `https://yxgtmzksnyarlivgxujf.supabase.co/functions/v1/send-email`
- `https://yxgtmzksnyarlivgxujf.supabase.co/functions/v1/clerk-webhook`
- `https://yxgtmzksnyarlivgxujf.supabase.co/functions/v1/waitlist-signup`
- `https://yxgtmzksnyarlivgxujf.supabase.co/functions/v1/resend-webhook`
- `https://yxgtmzksnyarlivgxujf.supabase.co/functions/v1/webhook-receiver`

## Clerk Webhook Setup

1. Go to Clerk Dashboard → Webhooks
2. Add Endpoint: `https://yxgtmzksnyarlivgxujf.supabase.co/functions/v1/clerk-webhook`
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`, `waitlistEntry.created`, `waitlistEntry.updated`
4. Copy the signing secret → set as `CLERK_WEBHOOK_SECRET`

## Resend Webhook Setup

1. Go to Resend Dashboard → Webhooks
2. Add Endpoint: `https://yxgtmzksnyarlivgxujf.supabase.co/functions/v1/resend-webhook`
3. Select events: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`
4. Copy the signing secret → set as `RESEND_WEBHOOK_SECRET`

## Trigger.dev Deployment

```bash
# Deploy trigger jobs
cd trigger
npx trigger.dev deploy

# Or use CI/CD with the trigger.dev CLI
npx trigger.dev deploy --env production
```

Trigger.dev jobs are defined in `trigger/jobs/` and registered in `trigger/index.ts`.

## Post-Deployment Checklist

### 1. Verify SPA Loading
- [ ] Visit `https://noska.me` — should load marketing page
- [ ] Visit `https://noska.me/login` — should show Clerk sign-in
- [ ] Visit `https://noska.me/control` — should show admin login/setup

### 2. Verify Authentication
- [ ] Sign in with Google OAuth — should redirect and establish session
- [ ] Sign in with email/password — should create user profile
- [ ] Check `user_profiles` table — new rows should appear
- [ ] Admin login works with correct credentials

### 3. Verify Webhooks
- [ ] Trigger a Clerk user event → check `user_profiles` is synced
- [ ] Send a test email → check `email_events` is populated

### 4. Verify Edge Functions
- [ ] Send a test email via `send-email` function
- [ ] Verify email is delivered to recipient

### 5. Verify Admin Panel
- [ ] Login to `/control`
- [ ] Navigate between all admin sections
- [ ] Test CRUD operations on test data

### 6. Verify Build Output
- [ ] Check `dist/` contains both the main app and `dist/control/`
- [ ] Verify CSP headers are applied (check `curl -I https://noska.me`)

### 7. Verify Background Jobs
- [ ] Check Trigger.dev dashboard — jobs should appear and run on schedule
- [ ] Check job logs for errors

### 8. Monitoring
- [ ] Check Sentry dashboard for any new errors
- [ ] Check PostHog for event capture
- [ ] Check Supabase logs for any database errors

## Rollback

### Vercel
- Use Vercel dashboard to promote a previous deployment
- Or run: `vercel rollback <deployment-id>`

### Supabase Migrations
- There is no automatic rollback. To revert:
  1. Write a new migration that reverses the changes
  2. Apply it with `supabase db push`
  3. OR restore from a Supabase database backup (Project Settings → Database → Backups)
