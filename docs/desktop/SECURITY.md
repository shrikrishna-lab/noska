# Noska Desktop — Tauri Security Audit

Scope: the native surface added by `src-tauri/` and `src/lib/desktop/`.
Everything outside that (Supabase RLS, Clerk, edge functions, agent runtime)
is unchanged from the web deployment.

## 1. Capabilities (least privilege)

`src-tauri/capabilities/default.json` grants ONLY:

| Permission | Why | Risk |
|---|---|---|
| `core:default` | Events, window metadata, path helpers needed by any Tauri app | Low — no window mutation beyond defaults |
| `notification:default` | Agent/automation completion notifications | Low |
| `deep-link:default` | Receiving `noska://` opens | Validated in TS before routing |
| `updater:default` + `process:allow-restart` | Signed auto-update install + relaunch | Updates verified against committed pubkey; endpoints pinned to GitHub Releases |
| `opener:allow-open-url` scoped to `https://*` | Opening docs/integration links in the real browser | http:, file:, and shell execution are NOT granted |

Deliberately **not** granted: `fs:*`, `shell:*`, `http:*`, `dialog:*`,
clipboard-manager, global-shortcut, os, process:allow-exit. The webview's own
`navigator.clipboard` covers copy/paste without granting a native clipboard
plugin.

## 2. IPC commands

There are **zero custom Rust commands** (`#[tauri::command]`). The entire
native attack surface is the five plugins above. No arbitrary shell, no
filesystem bridge, no "run anything" escape hatch exists for agents, MCP
tools or automations.

## 3. CSP

- Single source of truth: the meta CSP in `index.html` (same policy as web).
- Desktop-only additions are inert on web: `ipc:` / `http://ipc.localhost`
  (Tauri IPC transport) in connect-src, `asset:` / `http://asset.localhost`
  in img-src.
- `app.security.csp` is `null` in tauri.conf.json so Tauri does not inject a
  second CSP — two CSPs intersect and silently break features. If you tighten
  the index.html CSP, desktop and web tighten together.
- Known debt (pre-existing): `script-src 'unsafe-eval' 'unsafe-inline'`
  exists for dev-mode compatibility. Removing it is a web+desktop follow-up;
  do it behind testing of Clerk/Sentry/posthog bundles.

## 4. Deep links

- Scheme allowlist: exactly `workspace|page|agent|automation`.
- IDs must match `^[A-Za-z0-9_-]{1,128}$`; params filtered to
  `^[\w .@:%-]{1,256}$`. Unit-tested in `src/lib/desktop/__tests__/deepLink.test.ts`.
- Non-routable entities are parked in memory only (never localStorage) via
  `setPendingDeepLink` and consumed once by the app shell.
- Never route raw deep-link strings; always go through `parseDeepLink`.

## 5. Secrets

- Only public-by-design values reach the bundle: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` (RLS-scoped), `VITE_CLERK_PUBLISHABLE_KEY`,
  PostHog key, Sentry DSN.
- Service-role keys, Resend, Trigger.dev secrets, webhook signing secrets and
  admin credentials stay in edge functions/Vercel env — none exist in
  `src-tauri/` config or Rust source.
- Updater private key: `.tauri/` (gitignored) locally, GitHub secret in CI.
  Public key committed in tauri.conf.json is safe by design.
- Clerk session tokens live in the webview origin storage managed by Clerk JS;
  Supabase receives them per-request via the existing `accessToken` callback
  (`src/lib/supabase.ts`). No tokens are copied into Rust or new stores.

## 6. Navigation & external content

- All external URLs go through `openExternal()` (`links.ts`): https/http only,
  opens the OS browser. In-app `<a target="_blank">` links should be migrated
  to it over time.
- OAuth/social login runs inside the webview through Clerk's existing flow;
  `/sso-callback` handles returns. A future custom-scheme OAuth return would
  use `noska://sso-callback` and MUST extend `parseDeepLink`'s allowlist
  explicitly (do not widen it implicitly).

## 7. Agents / MCP / automations

The desktop app is a client of the cloud runtime — identical trust boundary as
web. Native capabilities are NOT exposed to the agent/tool layer: an agent
cannot invoke Tauri APIs unless product code explicitly wires it AND the
capability is added after review. Keep it that way.

## Review checklist when touching src-tauri/

1. New permission added? Justify here + narrowest scope possible.
2. New Rust command? Validate every input server-side-equivalently; consider
   whether the frontend already has a safer path.
3. New plugin? Check its default permissions and deny dangerous ones.
4. Config change? Re-run `npx tauri build` and diff the generated capability
   schemas under `src-tauri/gen/schemas/` (gitignored) for surprises.
