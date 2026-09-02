# Desktop Browser-First Authentication (`noska://auth/callback`)

The desktop app signs users in through the **system browser**, ChatGPT-desktop
style. The webview never runs OAuth (Clerk rejects the custom app origin) and
the user never sees, copies, or enters any code.

```
Noska Desktop                System browser                 Noska backend
     │                            │                              │
     │ start(code_challenge) ────────────────────────────────────►│  transaction (pending, 10 min)
     │                            │                              │
     │ open /desktop-auth         │                              │
     │ ──────────────────────────►│                              │
     │                            │ Google / Apple / GitHub /    │
     │                            │ email+password (Clerk)       │
     │                            │                              │
     │                            │ attach(transaction_id, JWT)─►│  transaction (attached)
     │                            │                              │
     │ ◄───── noska://auth/callback?tx=…&state=… ─────              │  (one-time artifact, no tokens)
     │                            │                              │
     │ consume(tx, code_verifier) ───────────────────────────────►│  PKCE S256 check → mint session
     │ ◄──── session ─────────────────────────────────────────────│  transaction (consumed)
     │                            │                              │
     ├─ existing account → restore workspace                     │
     └─ new account        → onboarding wizard                   │
```

## Components

| Piece | File(s) |
|---|---|
| Desktop auth screen (idle / waiting / success / resumable / errors) | `src/components/auth/DesktopAuthScreen.tsx` |
| Desktop transaction manager (PKCE, polling, deep-link handling) | `src/lib/desktop/browserAuth.ts` |
| PKCE S256 helpers | `src/lib/desktop/pkce.ts` |
| Deep-link routing (`noska://auth/*` never reaches the router) | `src/lib/desktop/DesktopBridge.tsx` |
| Web sign-in + completion page | `src/pages/DesktopAuthPage.tsx` (`/desktop-auth`) |
| Edge function actions `start`/`attach`/`consume`/`cancel` | `supabase/functions/desktop-auth/index.ts` |
| One-time transaction storage | `supabase/migrations/20260902000001_desktop_auth_handoff.sql` |

## Security properties

- **PKCE (S256)**: the `code_verifier` is generated on the desktop and never
  leaves it. `consume` requires it, so a leaked transaction id alone is
  worthless.
- **No tokens in URLs**: the deep link carries only the transaction id and a
  CSRF `state` token, both single-purpose; the desktop rejects state/tx
  mismatches and any callback when no matching local transaction exists.
- **One-time, short-lived**: transactions expire after 10 minutes, are
  single-use (status `pending → attached → consumed`), and are rate-limited
  (`attempts >= 10` → expired; max 100 open transactions).
- **Server-side identity**: `attach` GoTrue-verifies the browser's Clerk JWT
  and cross-checks the user against the Clerk Backend API — the desktop never
  trusts URL parameters as proof of sign-in.
- **Refresh hardening**: sessions created via `consume` receive a random
  `refresh_secret` that must be presented on every `refresh`; the legacy
  sid-only refresh path no longer applies to them.

## Reliability

- The desktop also **polls `consume` every 3s** while waiting, so sign-in
  completes even if the OS fails to route `noska://` (unregistered scheme,
  browser hardening). Duplicate callbacks are ignored after success.
- An unfinished transaction persists in `localStorage["noska_auth_transaction"]`
  and the next launch shows **"Continue signing in?"**; expiry is re-checked.
- Single-instance: a second launch focuses the existing window and forwards
  `noska://` argv (Rust `single-instance` plugin); the deep-link plugin
  `register_all()` self-heals scheme registration (macOS has no installer hook).
- The **pairing-code screen remains** as a manual fallback (link at the bottom
  of the login screen and on the failure state).

## Post-auth routing

The session flows into the existing app state machine in `App.tsx`
(`auth → onboarding | workspace`), decided by `user_profiles.onboarding_complete`
— never by client claims from the browser. Desktop logout now clears the local
session and any pending transaction (`desktopSignOut()` + `clearBrowserAuthState()`).

## Deployment checklist

1. Apply `supabase/migrations/20260902000001_desktop_auth_handoff.sql`.
2. Redeploy the `desktop-auth` edge function (`verify_jwt` stays disabled).
3. Deploy the web app (serves `/desktop-auth`).
4. Rebuild the desktop app (Rust change in `src-tauri/src/lib.rs`).
5. Optional: set `VITE_NOSKA_WEB_ORIGIN` for non-production web hosts
   (defaults to `https://www.noska.me`).
