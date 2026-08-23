# Noska Desktop

Noska ships as **one React + TypeScript application** with two shells:
**Web** (Vite → Vercel) and **Desktop** (Tauri 2 native shell for Windows,
macOS, Linux). Tauri provides only the native layer — window, tray, deep
links, notifications, single-instance, signed auto-updates. All Noska logic
(Supabase, Clerk, AI, Agent Runtime, MCP, automations) stays in the existing
TypeScript/cloud architecture.

```
WEB  (React+TS → Vite → Vercel)      DESKTOP (React+TS → Vite → Tauri 2)
                 └────────────┬──────────────┘
                       Noska Cloud (Supabase · Agent Runtime · Trigger.dev)
```

## Docs

| File | Content |
|---|---|
| [BUILD.md](BUILD.md) | Prerequisites, commands, file map, deep-link testing |
| [RELEASE.md](RELEASE.md) | Tag-driven releases, updater flow, key management |
| [SIGNING-NOTARIZATION.md](SIGNING-NOTARIZATION.md) | Windows/macOS code signing & notarization |
| [SECURITY.md](SECURITY.md) | Capability audit, CSP, threat model, review checklist |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Build/runtime issues per platform |

## Quick start

```bash
npm run dev          # web only (unchanged)
npm run tauri:dev    # desktop dev window
npm run tauri:build  # installers for the current OS
```

## Verified state (v1.0.0)

- Windows: MSI + NSIS exe built, installed, launched on a real machine;
  `noska://` scheme registered; single-instance + deep-link forwarding
  verified; packaged app boots into the Noska loading flow with **zero
  marketing content** (verified via WebView2 remote debugging).
- macOS/Linux: built by CI on native runners (`desktop-v*` tag or manual dispatch).
- Tests: full vitest suite green (250 tests incl. desktop deep-link validation).
- Web build unchanged and verified.
- **Pending instance-owner action**: allowlist `http://tauri.localhost`
  (+ `tauri://localhost`) in the Clerk dashboard so login completes inside the
  desktop shell — see BUILD.md → "Desktop authentication".
