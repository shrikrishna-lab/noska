# Architecture Overview

## Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript | Main SPA (Vite) |
| Admin Panel | React 19 + TypeScript | Separate SPA at `/control` (Vite) |
| Bundler | Vite | Dev server, build, HMR |
| Routing | React Router 7 | Client-side routing |
| Auth (Users) | Clerk | OAuth (Google, Microsoft), email/password |
| Auth (Admin) | Custom (bcrypt + session tokens) | `admin_users` table, SECURITY DEFINER RPCs |
| Database | Supabase Postgres | All persistent data, RLS, Realtime |
| Edge Functions | Supabase Edge Functions (Deno) | Serverless backend logic |
| Email | Resend | Transactional + campaign emails |
| Background Jobs | Trigger.dev | Cron-based async tasks |
| Analytics | PostHog | Product analytics, events |
| Error Tracking | Sentry | Error monitoring, performance traces |

## Frontend Architecture

The main app is a **Vite SPA** at the project root (`src/`). It uses:
- **Clerk React** (`@clerk/react`) for authentication — `ClerkProvider` wraps the entire app, providing `useAuth`, `useUser`, `useClerk` hooks.
- **React Router 7** (`react-router-dom`) for routing — routes are defined in `src/main.tsx`:
  - Marketing pages (`/`, `/pricing`, `/blog/*`, etc.) → `MarketingLayout`
  - SSO callback (`/sso-callback`) → `AuthenticateWithRedirectCallback`
  - Admin redirect (`/control`) → `ControlCenter` (redirects to the admin SPA)
  - Auth, onboarding, workspace (`/login`, `/onboarding`, `/:workspaceSlug`, `/:workspaceSlug/:pageId`) → `App`
- **Supabase client** (`@supabase/supabase-js`) — for authenticated data queries, anon-key based with RLS
- **PostHog** (`posthog-js`) — initialized in `src/lib/posthog.ts`, captures page views, signups, etc.
- **Sentry** (`@sentry/react`) — initialized in `src/lib/sentry.ts`, with tracing and replays
- **Tailwind CSS v4** — utility-first styling with PostCSS
- **Framer Motion** — page transitions and animations

The `App` component in `src/App.tsx` manages the full application state:
- Auth flow state machine: `loading` → `auth` → `onboarding` → `workspace`
- Page tree management with undo/redo history (max 24 entries)
- Real-time collaboration via `realtimeCollab` (`src/lib/realtimeCollab.ts`)
- Audit logging via `auditEngine` (`src/lib/auditEngine.ts`)
- Auto-save to both Supabase and localStorage

## Admin Panel

The admin panel is a **separate Vite SPA** in `admin/` that builds to `admin/dist/` and is copied to `dist/control/` during the build step (`npm run build`).

Key characteristics:
- **No Clerk** — uses a custom auth system with `admin_users` table and bcrypt password hashing
- **Authorization via session tokens** — stored in `sessionStorage`, passed to SECURITY DEFINER Postgres RPCs
- **Vite config** uses `base: "/control/"` so all asset paths are prefixed
- **Vercel rewrite** in `vercel.json`: `/control` and `/control/*` → `/control/index.html`
- **React Query** (`@tanstack/react-query`) for server state management
- **Radix UI primitives** + Tailwind CSS for the component library
- **Recharts** for analytics dashboards

### Admin Auth Flow

1. First visit: `check_admin_exists()` RPC determines if setup is needed
2. No admin → `setup_first_admin()` creates the initial `super_admin`
3. Login → `admin_login()` verifies bcrypt password, creates session, returns raw token
4. Session validation → `validate_admin_session()` checks token hash + expiry
5. Logout → `admin_logout()` lifts (invalidates) the session

### Admin RBAC Roles

| Role | Rank | Permissions |
|------|------|-------------|
| `super_admin` | 5 | Full access, can manage admins, impersonate |
| `admin` | 4 | Manage billing, feature flags, users |
| `developer` | 3 | View audit logs, technical operations |
| `support` | 2 | View users, support tickets, basic queries |
| `marketing` | 1 | Email campaigns, content management |

## Edge Functions

Five Supabase Edge Functions in `supabase/functions/`:

| Function | Purpose | Events |
|----------|---------|--------|
| `send-email` | Sends emails via Resend (single, campaign, broadcast, invite) | Called from admin panel |
| `clerk-webhook` | Syncs Clerk user events to `user_profiles` | `user.created`, `user.updated`, `user.deleted`, `waitlistEntry.*` |
| `waitlist-signup` | Registers waitlist entries in Clerk + Supabase | Called from landing page |
| `resend-webhook` | Receives Resend delivery events into `email_events` | `email.sent`, `email.delivered`, `email.opened`, etc. |
| `webhook-receiver` | Generic webhook relay to configured endpoints | Configurable via `webhook_endpoints` table |

## Database

Supabase Postgres with multiple schemas (all `public`):

### Core Tables
- `pages` — documents with JSONB blocks, nesting via `parent_id`, encryption support
- `ai_chats` — AI conversation history with messages as JSONB
- `ai_memory` — persistent key-value AI memory with TTL
- `workspace_settings` — key-value workspace configuration

### Collaboration Tables
- `collaboration_sessions` — real-time presence per page
- `block_locks` — per-block edit locks with 30s TTL
- `audit_events` — full edit history with AI metadata
- `page_versions` — snapshot-based version history
- `page_permissions` — granular per-page access control

### Admin Tables
- `admin_users` — admin accounts with bcrypt password hashes
- `admin_sessions` — session tokens (SHA-512 hashed) with expiry
- `admin_login_attempts` — rate limiting (5 attempts per 15 minutes)
- `admin_audit_log` — audit trail of admin actions

### Email Tables
- `email_campaigns` — campaign metadata and status tracking
- `email_events` — Resend delivery event log
- `email_queue` — pending email queue for async sending

### Content Tables
- `changelog_entries` — product changelog
- `blog_posts` — marketing blog with slugs
- `legal_pages` — privacy, terms, policies

### Security
- All admin operations go through SECURITY DEFINER RPCs (`admin_select`, `admin_insert`, `admin_update`, `admin_delete`)
- Row-level security (RLS) enabled on all tables
- `audit_events` restricted to `service_role` — accessed via SECURITY DEFINER RPCs
- Column validation on `admin_select` to prevent SQL injection

## Realtime (`supabase_realtime` publication)

Tables enabled for real-time subscriptions:
- `collaboration_sessions`
- `block_locks`
- `audit_events`
- `page_versions`
- `page_permissions`
- `user_profiles`

## Component Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Vercel (Hosting)                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  DNS: noska.me / Cloudflare                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │ Main SPA     │  │ Admin SPA    │  │ Trigger.dev Jobs  │   │   │
│  │  │ /index.html  │  │ /control/    │  │ (background)      │   │   │
│  │  │ (Vite +      │  │ (Vite +      │  │ ┌──────────────┐  │   │   │
│  │  │  React)      │  │  React)      │  │ │ email-queue  │  │   │   │
│  │  │              │  │              │  │ │ retry-emails │  │   │   │
│  │  │ Clerk Auth ──┼──┼── (none)     │  │ │ daily-cleanup│  │   │   │
│  │  │              │  │              │  │ │ sync-clerk   │  │   │   │
│  │  └──────┬───────┘  └──────┬───────┘  │ │ weekly-anal  │  │   │   │
│  │         │                 │          │ │ db-backup    │  │   │   │
│  │         │                 │          │ └──────────────┘  │   │   │
│  └─────────┼─────────────────┼──────────┴───────────────────┘   │
│            │                 │                                   │
└────────────┼─────────────────┼───────────────────────────────────┘
             │                 │
    ┌────────┴─────────┐      │
    │    Clerk          │      │
    │  (Auth/User Mgmt) │      │
    │  ┌─────────────┐  │      │
    │  │ Google OAuth  │  │      │
    │  │ Microsoft OAuth│  │      │
    │  │ Email/Password│  │      │
    │  │ Webhooks ─────┼──┼──────┼────────────┐
    │  └─────────────┘  │      │             │
    └────────────────────┘      │             │
                                │             │
    ┌───────────────────────────┴────────┐    │
    │     Supabase (Postgres + Edge Fns)  │    │
    │  ┌──────────────────────────────┐   │    │
    │  │  Edge Functions:             │   │    │
    │  │  ├─ clerk-webhook ◄─────────┼───┼────┘
    │  │  ├─ waitlist-signup          │   │
    │  │  ├─ send-email ◄────────────┼───┼──┐
    │  │  ├─ resend-webhook           │   │  │
    │  │  └─ webhook-receiver         │   │  │
    │  │                              │   │  │
    │  │  PostgreSQL:                 │   │  │
    │  │  ├─ pages                    │   │  │
    │  │  ├─ user_profiles            │   │  │
    │  │  ├─ admin_users              │   │  │
    │  │  ├─ email_campaigns          │   │  │
    │  │  ├─ email_events ◄──────────┼───┼──┘
    │  │  ├─ audit_events             │   │
    │  │  └─ ... (20+ tables)         │   │
    │  └──────────────────────────────┘   │
    └─────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │      Resend (Email)      │
    │  ┌──────────────────┐    │
    │  │ Transactional     │    │
    │  │ Campaigns         │    │
    │  │ Webhooks ────────┼────┘
    │  └──────────────────┘
    └─────────────────────────
```

## Auth Flow

### Main App (Clerk)
1. User visits → `ClerkProvider` loads Clerk JS
2. If signed out → marketing pages or `/login` shown
3. User signs in via Google, Microsoft, or email/password
4. Clerk handles OAuth redirect at `/sso-callback`
5. Clerk session established → `App.tsx` reads `useAuth()` / `useUser()`
6. `clerk-webhook` edge function receives `user.created`/`user.updated` events
7. Webhook upserts `user_profiles` in Supabase
8. App fetches profile via `fetchUserProfile()`, determines onboarding state
9. Returning user → workspace; new user → onboarding wizard

### Admin Panel (Custom)
1. Visit `/control` → redirected to admin SPA
2. `AuthGate` checks `validate_admin_session()` RPC
3. If no session → show `Login` page
4. If no admin exists → show `setupFirstAdmin` flow
5. Login sends `admin_login` RPC with email + password
6. RPC validates bcrypt hash, creates session token, returns raw token
7. Token stored in `sessionStorage`, sent with every admin RPC call
8. `require_admin_role()` checks session validity + minimum role rank

## Security Architecture

- **Admin RPCs** use `SECURITY DEFINER` with explicit `search_path` to prevent search-path injection
- **Column validation** in `admin_select` rejects non-identifier column names
- **Rate limiting** on `admin_login` (5 attempts per 15 minutes per email)
- **Password complexity** enforced in `set_admin_password` (min 8 chars, must contain letters + numbers)
- **Session expiry** — admin sessions have configurable expiry, password change invalidates all sessions
- **Audit logging** on all admin CRUD operations
- **Test mode guard** — `VITE_TEST_MODE=true` + production Supabase URL throws a startup error
- **CSP headers** set in `vercel.json` with strict allowlists for Clerk, Supabase, Resend, etc.
