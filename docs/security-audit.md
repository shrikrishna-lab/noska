# Security Audit Report

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
| `send-email` | false | Admin token via body | ✅ Admin token validated against DB |
| `clerk-webhook` | false | Svix signature | ✅ Signs verified with Svix |
| `waitlist-signup` | false | None | ⚠ Public endpoint — rate limiting recommended |
| `webhook-receiver` | false | None | ⚠ Public endpoint — relies on webhook secrecy |
| `resend-webhook` | false | HMAC-SHA256 | ✅ Signature verified |

## 3. Webhook Signatures

| Webhook | Verification | Status |
|---------|-------------|--------|
| Clerk webhook | Svix (HMAC-SHA256 via `npm:svix`) | ✅ |
| Resend webhook | HMAC-SHA256 (custom) | ✅ |
| Internal webhook receiver | Raw secret in header | ⚠ Sends raw secret — should use HMAC |

## 4. Admin RPC System

| Aspect | Status | Notes |
|--------|--------|-------|
| Session token required | ✅ | All admin RPCs require `p_session_token` |
| Table whitelist | ✅ | `allowed_tables` array restricts which tables can be accessed |
| Column validation | ✅ | Validate columns match allowed list |
| Role-based access | ✅ | `p_min_role` parameter enforces minimum role |
| Audit logging | ✅ | All mutations logged to `admin_audit_log` |
| Rate limiting | ✅ | Login attempts limited to 5 per 15 minutes |

## 5. Secrets Management

| Secret | Location | Status |
|--------|----------|--------|
| Clerk Secret Key | `.env` (git-tracked) | ❌ **Committed to repo** — move to Vercel env vars only |
| Supabase Service Role Key | Not in `.env` | ⚠ Must be set in Supabase Edge Function secrets |
| Resend API Key | `platform_settings` DB | ✅ Stored in DB, encrypted at rest |
| Resend Webhook Secret | Not set | ⚠ Not yet configured |
| Sentry Auth Token | Not set | ⚠ Not yet configured |
| Trigger.dev API Key | Not set | ⚠ Not yet configured |

## 6. Headers & CSP

| Header | Status |
|--------|--------|
| Content-Security-Policy | ✅ Comprehensive in `vercel.json` and `index.html` |
| X-Content-Type-Options | ✅ `nosniff` |
| X-Frame-Options | ✅ `DENY` |
| Referrer-Policy | ✅ `strict-origin-when-cross-origin` |
| Permissions-Policy | ✅ Comprehensive |

## 7. Rate Limiting

| Endpoint | Limit | Status |
|----------|-------|--------|
| Admin login | 5 attempts / 15 min | ✅ |
| Email sending | None | ❌ Need to implement — max 1 broadcast/min, 10 test emails/hr/admin |
| Waitlist signup | None | ⚠ Should add rate limiting |
| Edge functions | None | ⚠ Supabase handles at infrastructure level |

## 8. CORS

| Aspect | Status |
|--------|--------|
| Vercel rewrites | ✅ SPA routes handled correctly |
| Edge functions | ⚠ CORS headers not explicitly set in all functions |

## 9. Critical Issues

1. **🔴** `CLERK_SECRET_KEY` committed in `.env` — revoke and rotate immediately
2. **🔴** `send-email` edge function passes `admin_token` in body — migrate to `Authorization: Bearer` header
3. **🟡** No rate limiting on email sending
4. **🟡** Webhook receiver sends raw secret in header instead of HMAC
5. **🟡** No CSP `frame-src` for admin.html (missing `accounts.noska.me`)
