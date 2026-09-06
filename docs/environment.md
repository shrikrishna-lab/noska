# Environment Variables Reference

## Variable Table

| Variable | Required | Used By | Description |
|----------|----------|---------|-------------|
| `VITE_SUPABASE_URL` | **Yes** | Main SPA, Admin SPA | Supabase project URL (e.g. `https://yxgtmzksnyarlivgxujf.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Main SPA, Admin SPA | Supabase anon/publishable key — safe for client-side use |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Edge Functions, Trigger.dev | Supabase service role key — **NEVER expose to browser** |
| `VITE_CLERK_PUBLISHABLE_KEY` | **Yes** | Main SPA | Clerk publishable key from Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Conditional | Edge Functions, Trigger.dev | Required for `waitlist-signup` and `sync-clerk-users` |
| `CLERK_WEBHOOK_SECRET` | Conditional | `clerk-webhook` Edge Function | Required if using Clerk webhook sync |
| `RESEND_API_KEY` | Conditional | `send-email` Edge Function, `email-queue`, `retry-emails` | Can also be set via admin panel settings |
| `RESEND_WEBHOOK_SECRET` | Conditional | `resend-webhook` Edge Function | Required if using Resend webhook tracking |
| `FROM_EMAIL` | Conditional | `send-email` Edge Function | Verified sender in Resend; falls back to `onboarding@resend.dev` |
| `VITE_POSTHOG_KEY` | Optional | Main SPA | PostHog project API key; analytics disabled if absent |
| `VITE_POSTHOG_HOST` | Optional | Main SPA | Self-hosted PostHog URL; defaults to `https://app.posthog.com` |
| `VITE_SENTRY_DSN` | Optional | Main SPA | Sentry DSN; error tracking disabled if absent |
| `SENTRY_AUTH_TOKEN` | Optional | Build (Vite) | Sentry auth token for source map uploads |
| `SENTRY_ORG` | Optional | Build (Vite) | Sentry organization slug |
| `SENTRY_PROJECT` | Optional | Build (Vite) | Sentry project slug |
| `VITE_APP_VERSION` | Optional | Main SPA | Semver string used as Sentry release tag |
| `PUBLIC_SITE_URL` | Optional | `approve-waitlist`, `send-email` (send_invite) | Public app origin used to build invite links; defaults to `https://www.noska.me` |
| `TRIGGER_API_KEY` | **Yes** | Trigger.dev | API key from Trigger.dev Dashboard |
| `TRIGGER_API_URL` | Optional | Trigger.dev | Custom Trigger.dev API URL; defaults to `https://api.trigger.dev` |
| `VITE_ADMIN_DEMO` | Optional | Admin SPA | Set to `true` for local dev with mock data (skips Supabase auth) |
| `VITE_TEST_MODE` | Optional | Main SPA (dev only) | Set to `true` to skip auth in dev — **NEVER enable in production** |
| `VERCEL_OIDC_TOKEN` | Conditional | Local (Vercel CLI) | Auto-created by `vercel link` for local CLI auth |

## Where Variables Are Used

### Vite Client (Main SPA)

Variables prefixed with `VITE_` are exposed to browser code via `import.meta.env`:

```typescript
// src/lib/supabase.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// src/lib/posthog.ts
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com";

// src/lib/sentry.ts
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
```

### Vite Client (Admin SPA)

The admin SPA is a separate Vite build with its own `.env`:

```typescript
// admin/src/lib/supabase.ts
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

The admin SPA does NOT use Clerk, Sentry, or PostHog directly.

### Edge Functions (Supabase Deno)

Edge functions read variables via `Deno.env.get()`. They do NOT use `VITE_` prefix:

```typescript
// supabase/functions/send-email/index.ts
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const fromEmail = Deno.env.get("FROM_EMAIL") ?? "";

// supabase/functions/clerk-webhook/index.ts
const secret = Deno.env.get("CLERK_WEBHOOK_SECRET");
```

**Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected by Supabase for edge functions. Do not set them manually.

### Trigger.dev Jobs

Trigger.dev jobs read variables via `process.env`:

```typescript
// trigger/client.ts
export const client = new TriggerClient({
  id: "noska",
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL,
});

// trigger/jobs/email-queue.ts
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### Build (Vite Config)

The root `vite.config.js` uses build-time env vars:

```javascript
// vite.config.js
sentryVitePlugin({
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
}),
build: {
  sourcemap: process.env.SENTRY_AUTH_TOKEN ? true : false,
}
```

## Setting Variables

### Local Development

Create a `.env` file in the project root:

```bash
# Supabase
VITE_SUPABASE_URL=https://yxgtmzksnyarlivgxujf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx...

# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxx...
CLERK_SECRET_KEY=sk_live_xxxx...
CLERK_WEBHOOK_SECRET=whsec_xxxx...

# Resend
RESEND_API_KEY=re_xxxx...
FROM_EMAIL=hello@noska.me
RESEND_WEBHOOK_SECRET=rewh_xxxx...

# Optional
VITE_POSTHOG_KEY=phc_xxxx...
VITE_SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io
VITE_APP_VERSION=1.0.0
TRIGGER_API_KEY=tr_xxxx...
VITE_ADMIN_DEMO=true   # for local admin dev
```

Create `admin/.env` (for admin SPA):

```bash
VITE_SUPABASE_URL=https://yxgtmzksnyarlivgxujf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxx...
VITE_ADMIN_DEMO=true
```

### Vercel Production

Set environment variables in Vercel Dashboard → Project Settings → Environment Variables.

**Scope each variable correctly:**

| Scope | Variables |
|-------|-----------|
| **Preview** | All `VITE_*` vars, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, etc. |
| **Production** | All variables |
| **Development** (local CLI) | Same as Preview |

**Do NOT set in Vercel:**
- `VERCEL_OIDC_TOKEN` — auto-managed by Vercel CLI
- `VITE_ADMIN_DEMO` — never in production (skip auth bypass)
- `VITE_TEST_MODE` — never in production (guard throws error if combined with production Supabase URL)

### Supabase Edge Function Secrets

Set via Supabase CLI:

```bash
supabase secrets set RESEND_API_KEY=re_xxxx
supabase secrets set FROM_EMAIL=hello@noska.me
supabase secrets set CLERK_SECRET_KEY=sk_live_xxxx
supabase secrets set CLERK_WEBHOOK_SECRET=whsec_xxxx
supabase secrets set RESEND_WEBHOOK_SECRET=rewh_xxxx
```

View current secrets:

```bash
supabase secrets list
```

### Trigger.dev

Set in Trigger.dev Dashboard → Environments → Variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `CLERK_SECRET_KEY`
- `TRIGGER_API_URL` (optional)

## Security Notes

1. **`VITE_` prefix** — Variables exposed to the browser. Never put secrets here. The anon key is safe because it's scoped by RLS.
2. **`SUPABASE_SERVICE_ROLE_KEY`** — Full database access. Never set it as `VITE_*`. Only used in Edge Functions and Trigger.dev (server-side).
3. **`CLERK_SECRET_KEY`** — Full Clerk API access. Same rule: server-side only.
4. **`VITE_TEST_MODE`** — Has a runtime guard: if set to `true` against the production Supabase project URL, the app throws a startup error. Only use against a staging/development Supabase project.
5. **`RESEND_API_KEY`** — Can also be stored in the `platform_settings` table (accessible via admin panel), providing a dynamic alternative to the env var.
