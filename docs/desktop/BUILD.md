# Noska Desktop — Development Guide

Noska ships as **one React + TypeScript application** (`src/`) with two shells:

| Target | Shell | Command |
|---|---|---|
| Web | Vite → Vercel | `npm run dev` / `npm run build` |
| Desktop | Tauri 2 (Rust shell around the same Vite app) | `npm run tauri:dev` / `npm run tauri:build` |

Tauri provides ONLY the native layer: window, tray, notifications, deep links,
single-instance, auto-update, signed installers. All Noska logic (Supabase,
Clerk, agent runtime, MCP, automations, Trigger.dev) stays exactly where it is.

## Desktop startup routing

Marketing routes (`/`, `/pricing`, `/blog`, …) are runtime-aware: on desktop
they render `<App />` instead of `MarketingLayout`
(`MarketingShell` in `src/main.tsx`). The desktop app therefore always boots
into Noska's own flow — loading splash → auth check → `/login` or the last
workspace/page — and never intentionally shows the public marketing site.
Web behavior is unchanged. Logout lands on `/login` (existing
`afterSignOutUrl`), and tray "Open Noska" resolves through the same flow.

## Desktop authentication — REQUIRED one-time Clerk setup

Noska uses **production Clerk keys (`pk_live_`) locked to `noska.me`**, so
login inside the packaged desktop shell (origin `http://tauri.localhost`,
scheme `tauri://localhost`) is rejected with HTTP 400 until the Clerk
instance allowlists those origins. Until this is done the desktop app shows
the loading splash indefinitely after boot (no crash, no marketing).

Fix (instance owner, ~2 minutes, reversible):

```bash
# Using your sk_live key (server-side only; never ship it in the app):
curl -X POST https://api.clerk.com/v1/instance/update_instance \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"allowed_origins":["http://tauri.localhost","tauri://localhost"]}'
```

or via Dashboard → Instance Settings → allowed origins. Known constraints
(upstream, clerk/javascript#4725): OAuth/social redirects may need
`allowedRedirectProtocols={["noska:", "tauri:"]}` on `ClerkProvider`, and
cookie persistence on custom protocol origins is weakest on macOS WKWebView.
Verify by launching the installed app after the change.

## Prerequisites

1. Node 18+ (repo tested on Node 26) and npm.
2. Rust toolchain — required because Tauri compiles a native binary:
   ```bash
   winget install Rustlang.Rustup        # Windows (also needs MSVC Build Tools + WebView2, preinstalled on Win 10/11)
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   # macOS/Linux
   ```
3. Linux only — WebKitGTK and friends:
   ```bash
   sudo apt-get install libwebkit2gtk-4.1-dev build-essential curl wget file \
     libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
   ```

## Commands

```bash
npm run dev          # web-only dev server (unchanged)
npm run tauri:dev    # desktop dev window driven by the Vite dev server
npm run build        # web production build incl. admin panel (unchanged)
npm run build:renderer # vite build only (used internally by tauri build)
npm run tauri:build  # produce installers for the current OS into src-tauri/target/release/bundle/
```

`.env` values are read at build time exactly as they are for web. Only
`VITE_*` variables are embedded; server secrets are never part of the desktop
bundle (see SECURITY-AUDIT.md).

## What's wired natively

- **Window**: 1280×800 default, min 940×600; size/position remembered across launches (`window-state` plugin).
- **Tray**: Open Noska · New Page · New Task · Open AI · Quit. Menu clicks emit `tray://action`; the frontend routes them in `src/lib/desktop/DesktopBridge.tsx`.
- **Notifications**: `src/lib/desktop/notify.ts` (`sendAppNotification`). Linux requires a freedesktop notification daemon.
- **Deep links**: `noska://workspace/<id>`, `noska://page/<id>`, `noska://agent/<id>`, `noska://automation/<id>`. Parsed + validated in `src/lib/desktop/deepLink.ts`; unknown entities/ids are dropped. Scheme is registered by the NSIS/MSI/dmg installers automatically.
- **Single instance**: launching again focuses the running window and forwards any `noska://` argv.
- **Auto-updates**: see RELEASES.md. Dev builds intentionally never check.

## Testing deep links locally

After running an installed build once (or `tauri dev`, which registers the scheme):

```powershell
Start-Process "noska://page/test-page-1"      # Windows
open "noska://page/test-page-1"               # macOS
xdg-open "noska://page/test-page-1"           # Linux
```

## Platform conventions

Keyboard shortcuts keep their existing web behavior inside the webview;
`Ctrl/Cmd` follows each platform's browser conventions automatically since the
same handlers run. When adding native shortcuts, branch on
`getDesktopPlatform()` from `src/lib/desktop/platform.ts`.

## File map

```
src-tauri/
├── Cargo.toml            Rust manifest (release profile tuned for size)
├── build.rs              Tauri build hook
├── tauri.conf.json       Window, bundle, capabilities, updater, deep-link config
├── capabilities/default.json  Least-privilege permission grant (see SECURITY-AUDIT.md)
├── icons/                Generated from public/logo.png (npx tauri icon)
└── src/
    ├── main.rs           Entry point
    └── lib.rs            Tray, single-instance, deep-link forwarding

src/lib/desktop/
├── platform.ts           isDesktop() / isWeb() / getDesktopPlatform()
├── deepLink.ts           noska:// parser + validator (unit-tested)
├── DesktopBridge.tsx     Native-event → router bridge (mounted in main.tsx, null-rendering)
├── notify.ts             Notifications with web fallback
├── updater.ts            Signed auto-update check/install
└── links.ts              openExternal() — https-only, opens real browser
```
