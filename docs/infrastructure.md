# Infrastructure

## Overview

| Service | Purpose | Plan/Config |
|---------|---------|-------------|
| **Vercel** | SPA hosting + rewrites | Pro/Hobby plan |
| **Supabase** | Database + Edge Functions + Realtime | Pro plan |
| **Clerk** | User authentication + SSO | Pro plan |
| **Resend** | Transactional email + campaigns | Pro plan |
| **PostHog** | Product analytics + events | Cloud (free tier) |
| **Sentry** | Error tracking + performance | Pro plan |
| **Trigger.dev** | Background job processing | Pro plan |
| **Cloudflare** | DNS (recommended) | Free tier |

## Vercel (Hosting)

**Project URL:** `https://noska.me` (production), preview deployments per branch

### Build Configuration (`vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

The build process:
1. `vite build` — builds the main SPA to `dist/`
2. `cd admin && npm ci && npm run build` — builds admin SPA to `admin/dist/`
3. `fs.cpSync('admin/dist', 'dist/control', {recursive: true})` — copies admin build into `dist/control/`

### Rewrites

| Source | Destination | Purpose |
|--------|-------------|---------|
| `/control` | `/control/index.html` | Admin SPA root |
| `/control/(.*)` | `/control/index.html` | Admin SPA deep links |
| `/(.*)` | `/index.html` | Main SPA (must be last) |

### CSP Headers

Content Security Policy is set in `vercel.json` with strict allowlists:

- **script-src:** Clerk (`*.clerk.accounts.dev`), Vercel Live, Fontshare
- **style-src:** Google Fonts, Clerk, Fontshare
- **connect-src:** Supabase (`.supabase.co` wss://), Clerk, Microsoft login, Pusher
- **frame-src:** Clerk, Microsoft login
- **img-src:** Self, data:, blob:, Clerk (`img.clerk.com`), any HTTPS
- **media-src:** CloudFront CDN for uploaded assets

Additional security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Static Asset Caching

`/assets/(.*)` → `Cache-Control: public, max-age=31536000, immutable` (1 year)

## Supabase

**Project URL:** `https://yxgtmzksnyarlivgxujf.supabase.co` (production)

### Services Used

| Service | Usage |
|---------|-------|
| **Postgres Database** | All persistent storage (pages, users, admin data, email, content) |
| **Edge Functions** | Serverless Deno functions for webhooks and email |
| **Realtime** | WebSocket-based collaboration (presence, block locks, audit) |
| **Row Level Security** | Data access control for anon-key queries |
| **Extensions** | `pgcrypto` (UUID, bcrypt), `pg_graphql` (future), Realtime |

### Edge Functions

| Function | Route | Runtime | Dependencies |
|----------|-------|---------|--------------|
| `send-email` | `/functions/v1/send-email` | Deno | `@supabase/supabase-js` |
| `clerk-webhook` | `/functions/v1/clerk-webhook` | Deno | `@supabase/supabase-js`, `svix` (npm) |
| `waitlist-signup` | `/functions/v1/waitlist-signup` | Deno | `@supabase/supabase-js` |
| `resend-webhook` | `/functions/v1/resend-webhook` | Deno | `@supabase/supabase-js`, `node:crypto` |
| `webhook-receiver` | `/functions/v1/webhook-receiver` | Deno | `@supabase/supabase-js` |

All functions use the **service role key** for database access (bypasses RLS).

### Realtime Publication

Tables in the `supabase_realtime` publication:
- `collaboration_sessions`
- `block_locks`
- `audit_events`
- `page_versions`
- `page_permissions`
- `user_profiles`

## Clerk

**Dashboard:** https://dashboard.clerk.com

### Configuration

| Setting | Value |
|---------|-------|
| Publishable Key | `VITE_CLERK_PUBLISHABLE_KEY` (env var) |
| Secret Key | `CLERK_SECRET_KEY` (env var) |
| Webhook Endpoint | `https://yxgtmzksnyarlivgxujf.supabase.co/functions/v1/clerk-webhook` |
| Sign-in Methods | Google OAuth, Microsoft OAuth, Email + Password |
| Redirect URLs | `/sso-callback`, `/login` |

### Webhooks

Subscribed events:
- `user.created` → upsert `user_profiles`
- `user.updated` → upsert `user_profiles`
- `user.deleted` → delete `user_profiles`
- `waitlistEntry.created` → upsert `waitlist_entries`
- `waitlistEntry.updated` → update `waitlist_entries`

Signature verification via Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`).

## Resend

**Dashboard:** https://resend.com

- **Domain:** `noska.me` (verified sending domain)
- **API Key:** Set via env var `RESEND_API_KEY` or admin panel settings
- **Webhook:** `https://yxgtmzksnyarlivgxujf.supabase.co/functions/v1/resend-webhook`
  - Events tracked: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`
  - Signature verification via HMAC-SHA256

## PostHog

**Dashboard:** https://app.posthog.com (or self-hosted)

- **API Key:** `VITE_POSTHOG_KEY` (client-side)
- **Events:** `page_view`, `signup_started`, `signup_completed`, `login`, `logout`, `waitlist_joined`, `workspace_created`, `note_created`, `ai_generation`, etc.
- **Person profiles:** `identified_only` mode
- **Dev behavior:** Auto opt-out in dev mode
- **Self-hosted option:** Configure via `VITE_POSTHOG_HOST`

## Sentry

**Dashboard:** https://sentry.io

- **DSN:** `VITE_SENTRY_DSN` (client-side)
- **Source maps:** Uploaded during Vercel build via `@sentry/vite-plugin`
- **Integrations:** Browser tracing, session replays
- **Sampling:** 10% traces in production, 0% in dev
- **Releases:** Tagged with `VITE_APP_VERSION` as `noska@<version>`

## Trigger.dev

**Dashboard:** https://trigger.dev

### Jobs

| Job ID | Cron | Description |
|--------|------|-------------|
| `email-queue` | `* * * * *` (every minute) | Process pending email queue |
| `retry-emails` | `*/30 * * * *` (every 30 min) | Retry failed email sends |
| `daily-cleanup` | `0 3 * * *` (daily 3 AM) | Clean expired sessions + stale waitlist entries |
| `sync-clerk-users` | `0 5 * * *` (daily 5 AM) | Bulk sync Clerk users to Supabase |
| `weekly-analytics` | `0 8 * * 1` (weekly Mon 8 AM) | Generate weekly analytics summary |
| `database-backup` | `0 4 * * 0` (weekly Sun 4 AM) | Placeholder — not yet implemented |

### Client Configuration

```typescript
// trigger/client.ts
export const client = new TriggerClient({
  id: "noska",
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL,  // optional
});
```

## DNS (Cloudflare Recommended)

### Records

| Type | Name | Value |
|------|------|-------|
| CNAME | `@` | `cname.vercel-dns.com` |
| CNAME | `www` | `cname.vercel-dns.com` |

Vercel automatically provisions SSL certificates. For custom domains, configure the domain in Vercel project settings → Domains.

## Architecture Diagram

```
                         Internet
                            │
                      ┌─────┴─────┐
                      │ Cloudflare │
                      │    DNS     │
                      └─────┬─────┘
                            │
                    ┌───────┴───────┐
                    │    Vercel     │
                    │  (noska.me)   │
                    │               │
              ┌─────┴─────┐   ┌────┴────────┐
              │ Main SPA  │   │ Admin SPA   │
              │ /index.html│   │ /control/   │
              │ React     │   │ React       │
              │ Clerk     │   │ Custom Auth │
              │ PostHog   │   │ Recharts    │
              │ Sentry    │   │ Radix UI    │
              └─────┬─────┘   └────┬────────┘
                    │              │
        ┌───────────┴──────────────┴──────────────┐
        │            Supabase                      │
        │  ┌────────────────────────────────────┐  │
        │  │  Edge Functions:                   │  │
        │  │  ├─ clerk-webhook ←── Clerk        │  │
        │  │  ├─ send-email ────→ Resend        │  │
        │  │  ├─ resend-webhook ←── Resend      │  │
        │  │  ├─ waitlist-signup                │  │
        │  │  └─ webhook-receiver               │  │
        │  │                                    │  │
        │  │  PostgreSQL (20+ tables)           │  │
        │  │  ├─ user_profiles ←── Clerk sync   │  │
        │  │  ├─ admin_users (custom auth)      │  │
        │  │  ├─ pages / ai_chats              │  │
        │  │  ├─ email_campaigns / email_queue  │  │
        │  │  └─ audit_events                  │  │
        │  │                                    │  │
        │  │  Realtime (WebSocket)              │  │
        │  │  └─ collaboration_sessions         │  │
        │  └────────────────────────────────────┘  │
        └────────────────┬─────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │          Third-Party            │
        │  ┌──────────┐ ┌──────────────┐  │
        │  │  Resend  │ │   Clerk      │  │
        │  │  Email   │ │   Auth       │  │
        │  └────┬─────┘ └──────┬───────┘  │
        │       │              │           │
        │  ┌────┴─────┐ ┌─────┴───────┐   │
        │  │ PostHog  │ │   Sentry    │   │
        │  │Analytics │ │ Error Track │   │
        │  └──────────┘ └─────────────┘   │
        │                                 │
        │  ┌──────────────────────────┐   │
        │  │     Trigger.dev          │   │
        │  │  ┌────────────────────┐  │   │
        │  │  │ email-queue (1min) │  │   │
        │  │  │ retry-emails (30m) │  │   │
        │  │  │ daily-cleanup (3a) │  │   │
        │  │  │ sync-clerk (5a)    │  │   │
        │  │  │ weekly-analytics   │  │   │
        │  │  │ db-backup (Sun 4a) │  │   │
        │  │  └────────────────────┘  │   │
        │  └──────────────────────────┘   │
        └─────────────────────────────────┘
```
