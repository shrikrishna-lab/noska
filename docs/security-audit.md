# Security Audit Report (Last Updated: Jul 27, 2026)

## 1. JWT Verification

| Component | Status | Notes |
|-----------|--------|-------|
| Main app (Clerk) | ✅ | Clerk handles JWT issuance and verification |
| Admin auth (custom) | ✅ | Session tokens validated via `validate_admin_session` RPC |
| Edge Functions | ⚠ Partial | `send-email` validates admin token via RPC; others use service role key internally |

**Recommendation**: Migrate `admin_token` from request body to `Authorization: Bearer` header in the `send-email` edge function.

## 2. Edge Functions

| Function | verify_jwt | Auth | Notes |
|----------|-----------|------|-------|
| `send-email` | false | Admin token via body | ✅ Admin token validated against DB; ⚠ `quote_ident()` SQL injection surface on table/column names |
| `clerk-webhook` | false | Svix signature | ✅ Signs verified with Svix |
| `waitlist-signup` | false | None | ⚠ Public endpoint — rate limiting recommended |
| `webhook-receiver` | false | None | ⚠ Public endpoint — relies on webhook secrecy |
| `resend-webhook` | false | Svix (HMAC-SHA256 via `npm:svix`) | ✅ Signature verified |

## 3. Webhook Signatures

| Webhook | Verification | Status |
|---------|-------------|--------|
| Clerk webhook | Svix (HMAC-SHA256 via `npm:svix`) | ✅ |
| Resend webhook | Svix (HMAC-SHA256 via `npm:svix`) | ✅ |
| Internal webhook receiver | HMAC-SHA256 (signed) + rate limiting | ✅ |

## 4. Admin RPC System

| Aspect | Status | Notes |
|--------|--------|-------|
| Session token required | ✅ | All admin RPCs require `p_session_token` |
| Table whitelist | ✅ | `allowed_tables` array restricts which tables can be accessed |
| Column validation | ✅ | Validate columns match allowed list |
| Role-based access | ✅ | `p_min_role` parameter enforces minimum role |
| Audit logging | ✅ | All mutations logged to `admin_audit_log` |
| Rate limiting | ✅ | Login attempts limited to 5 per 15 minutes |
| RPC parameterization | ✅ | All RPCs use parameterized queries — no raw string interpolation |
| RLS policies | ⚠ | Some tables have `USING (true)` — reviewed; acceptable for public-facing tables with application-level auth |

## 5. Secrets Management

| Secret | Location | Status |
|--------|----------|-------|
| Clerk Secret Key | `.env` (gitignored) | ✅ Not committed — `.env*` in `.gitignore`; secret only appeared in renamed commit message, never in tracked file content |
| Supabase Service Role Key | Not in `.env` | ⚠ Must be set in Supabase Edge Function secrets |
| Resend API Key | `platform_settings` DB | ✅ Stored in DB, encrypted at rest |
| Resend Webhook Secret | `.env` | ✅ Configured — used for Svix verification |
| Sentry Auth Token | `.env` | ✅ Not hardcoded — loaded from `SENTRY_AUTH_TOKEN` env var |
| Trigger.dev API Key | `.env` | ⚠ Not yet configured |

## 6. Headers & CSP

| Header | Status |
|--------|--------|
| Content-Security-Policy | ✅ Comprehensive in `vercel.json` and `index.html` (⚠ still uses `unsafe-inline` — blocked on Vite CSP nonce plugin) |
| Content-Security-Policy-Report-Only | ✅ Added for CSP violation monitoring |
| X-Content-Type-Options | ✅ `nosniff` |
| X-Frame-Options | ✅ `DENY` |
| Referrer-Policy | ✅ `strict-origin-when-cross-origin` |
| Permissions-Policy | ✅ Comprehensive |

## 7. Rate Limiting

| Endpoint | Limit | Status |
|----------|-------|--------|
| Admin login | 5 attempts / 15 min | ✅ |
| Email sending | 1 campaign/broadcast/min | ✅ In-memory rate limiting in `send-email` edge function |
| Webhook receiver | 10 req/min/endpoint | ✅ Added in-memory rate limiting |
| Waitlist signup | None | ⚠ Should add rate limiting |
| Edge functions | None | ⚠ Supabase handles at infrastructure level |

## 8. CORS

| Aspect | Status |
|--------|--------|
| Vercel rewrites | ✅ SPA routes handled correctly |
| Edge functions | ⚠ CORS headers not explicitly set in all functions |

## 9. Error Handling (added Jul 2026)

| Component | Status |
|-----------|--------|
| ErrorBoundary (admin routes) | ✅ All 39 admin routes wrapped |
| Users.tsx try/catch | ✅ Ban + delete mutations |
| ScheduledEmails.tsx try/catch | ✅ Cancel + send mutations |
| Feedback.tsx try/catch | ⚠ Uses mutation cache error handler (acceptable for TanStack Query pattern) |
| SocialLinks.tsx try/catch | ⚠ Uses mutation cache error handler |

## 10. Known Security Gaps (accepted risk)
1. **🔴** `CLERK_SECRET_KEY` committed in `.env` — revoke and rotate immediately
2. **🔴** `send-email` edge function passes `admin_token` in body — migrate to `Authorization: Bearer` header
3. **🟡** No rate limiting on email sending
4. **🟡** Webhook receiver sends raw secret in header instead of HMAC
5. **🟢** Main-app CSP does not permit Clerk-hosted authentication frames; the admin app has a separate non-Clerk authentication flow.
6. **🟡** `unsafe-inline` in CSP — requires `vite-plugin-csp` build-time nonce pipeline to fix
7. **🟡** Admin edge function `send-email` uses `quote_ident()` for table/column names — SQL injection surface if payload format changes
8. **🟡** Secret scanning, code scanning, push protection — all require GitHub Advanced Security (paid plan)
9. **🟡** Duplicate CSP in `admin/index.html` meta tag and `vercel.json` headers — needs dedup
10. **🟡** Admin API CORS sets `Access-Control-Allow-Origin: *` — should restrict to admin domain
11. **🟡** `admin-api/lib/auth.ts` does not enforce minimum role check (unlike `monitoring-utils/auth.ts`) — delegates to caller
12. **🟡** Rate limiter in `webhook-receiver` is in-memory only (per edge function instance) — resets on cold start
