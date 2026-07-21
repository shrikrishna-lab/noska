## Global `UNAUTHORIZED` interceptor → auto-redirect to login

### Goal
When any Supabase RPC or Edge Function call returns a session-expired error (`code: "42501"` / `message: "UNAUTHORIZED"`), automatically clear the token, show one styled toast, and flip `AuthGate` to render `<Login />` — without a full page reload.

### Architecture (3 layers, each defensive)

**Layer 1 — `fetch` wrapper at the Supabase client level** (catches *every* call path)
- File: `admin/src/lib/supabase.ts`
- Pass `{ global: { fetch: wrappedFetch } }` to `createClient`. The wrapper calls real `fetch`, then for responses with a PostgREST error body matching `{ code: "42501" }` or HTTP 401 with `UNAUTHORIZED`, fires a `window.dispatchEvent(new CustomEvent("noska:unauthorized"))`.
- Sits below `supabase.rpc()`, `.from().select()`, and `.functions.invoke()` — covers everything regardless of whether the caller throws.

**Layer 2 — lightweight session-expired event handler module** (de-dupe + UX)
- File: `admin/src/lib/session-expired.ts` *(new)*
- Exports `triggerSessionExpired(reason: string)` which:
  1. Checks a module-level `notified` flag (de-dupes a storm of in-flight 42501s so only one toast fires)
  2. Calls `setAdminToken(null)`
  3. Shows one `notify.warning("Session expired", "Please sign in again to continue.")` via the existing `notify.tsx`
  4. Dispatches `window.dispatchEvent(new CustomEvent("noska:session-expired"))` so React can react
- Also exports `useSessionExpiredListener()` — a hook `AuthProvider` uses to subscribe and flip `user` to null.

**Layer 3 — `AuthProvider` reacts to the event** (no full page reload)
- File: `admin/src/lib/auth.tsx`
- Add a `useEffect` inside `AuthProvider` that listens for `noska:session-expired` and calls `setUser(null)` (which causes `AuthGate` to render `<Login />`). Also calls `queryClient.clear()` via a passed-in ref to wipe stale cache entries so expired data doesn't briefly re-render.

**Layer 4 — React Query cache clearing** (defense in depth)
- File: `admin/src/App.tsx`
- Construct `queryClient` with `queryCache` and `mutationCache` that call `triggerSessionExpired` when an error's message/code matches the unauthorized signature. This covers the cases where errors are thrown to RQ and not via the fetch wrapper (e.g. if `fetch` wrapping is bypassed). The `queryClient` is passed into `AuthProvider` via props so its `.clear()` can be invoked on session-expired.

### Detection signature
Treat as "session expired" if **any** of these match:
- PostgREST body: `code === "42501"` AND `message === "UNAUTHORIZED"` (the exact shape returned by `require_admin_role`)
- HTTP status `401` on `/rest/v1/rpc/` or `/functions/v1/` paths
- Excluded: the `admin_login`, `validate_admin_session`, `setup_first_admin`, `admin_logout`, `check_admin_exists` RPCs — these are expected to return 42501 during the login flow itself, so the wrapper must skip them (detected by URL path containing the function name).

### Files changed

| File | Change |
|---|---|
| `admin/src/lib/supabase.ts` | Wrap `fetch` via `{ global: { fetch } }`; on unauthorized signature (excluding auth-flow RPCs) dispatch the event. No change to exports. |
| `admin/src/lib/session-expired.ts` *(new)* | `triggerSessionExpired(reason)` with de-dupe flag + toast + event dispatch. `useSessionExpiredListener(cb)` hook. `resetSessionExpiredFlag()` for use after successful re-login. |
| `admin/src/lib/auth.tsx` | Subscribe to `noska:session-expired` in a `useEffect`; on fire, `setUser(null)` and clear the passed-in `queryClient`. Also reset the de-dupe flag on successful `signIn`/`setupFirstAdmin`. |
| `admin/src/App.tsx` | Build `queryClient` with `queryCache`/`mutationCache` `onError` that detects the 42501 signature and calls `triggerSessionExpired`. Pass `queryClient` into `AuthProvider` as a prop. |

### Why this design

- ✅ **Single source of truth** — the `triggerSessionExpired` function is the only thing that touches token + toast + event.
- ✅ **No full page reload** — `setUser(null)` lets `AuthGate` swap to `<Login />` instantly, preserving the SPA feel.
- ✅ **De-duped** — if 5 queries fail simultaneously with 42501, you see exactly 1 toast and 1 redirect.
- ✅ **Doesn't break login flow** — auth-flow RPCs (`admin_login`, `validate_admin_session`, etc.) are explicitly excluded from the wrapper.
- ✅ **Uses existing infrastructure** — reuses `notify.warning` (from the redesigned toasts) and the existing `setAdminToken(null)` / `AuthGate` machinery.
- ✅ **Defense in depth** — works even if the `fetch` wrapper is somehow bypassed, because the RQ cache callbacks also detect the signature.

### Verification plan after implementation
1. Build passes (`tsc --noEmit` + `vite build`)
2. Manually corrupt the token in DevTools (`sessionStorage.setItem("noska_admin_token", "garbage")`), trigger any RPC, confirm: exactly 1 warning toast appears, then `<Login />` renders — no console errors, no duplicate toasts.
3. Sign back in, confirm the de-dupe flag is reset and normal operations resume.