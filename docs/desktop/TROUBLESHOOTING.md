# Noska Desktop — Troubleshooting

## Build issues

### `link.exe not found` / MSVC errors on Windows
Install Visual Studio Build Tools with the C++ workload:
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```
Then open a new terminal so `vcvars`/PATH changes apply.

### Updater signing hangs at "Decrypting updater signing key"
The key password env var is missing. Windows cannot hold empty-string env
vars, so passwordless keys hang waiting for interactive input. Use the
passworded key:
```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content -Raw .tauri\noska.key)
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = (Get-Content -Raw .tauri\password.txt).Trim()
npm run tauri:build
```
CI reads both from GitHub secrets.

### `unknown field icons` in tauri.conf.json
Tauri 2 uses `bundle.icon` (singular).

## Runtime issues

### Deep links do nothing
The scheme is registered by the installer. A raw dev binary (`tauri dev`)
registers it on first run; portable copies never do. Verify:
```powershell
Get-ItemProperty "HKCU:\Software\Classes\noska\shell\open\command"
```

### Second window opens instead of focusing
Single-instance forwarding only works for installed builds where every launch
goes through the same exe path registered with the plugin.

### Notifications missing on Linux
A freedesktop notification daemon must be running (GNOME/KDE provide one).
Permission denial is non-fatal by design (`notify.ts` catches and logs).

### Blank window after update
Clear the WebView2 cache: `%LOCALAPPDATA%\dev.noska.app\EBWebView`. If it
persists, the updater manifest signature didn't match — verify you published
`latest.json` from the SAME tag as the installed version channel.

### Clerk session lost after relaunch
Sessions persist in the WebView2 profile under
`%LOCALAPPDATA%\dev.noska.app\`. Deleting that folder signs you out.

## Platform notes

| Platform | Requirement |
|---|---|
| Windows 10/11 | WebView2 Runtime (preinstalled); MSVC Build Tools to compile |
| macOS 10.15+ | none (WKWebView built in) |
| Linux | libwebkit2gtk-4.1, libayatana-appindicator3 (tray), notification daemon |

## Diagnostics

- App logs go to stdout in dev; in packaged builds check
  `%LOCALAPPDATA%\dev.noska.app\logs\` if present, else run the exe from a
  terminal to capture output.
- Frontend errors surface through Sentry (same DSN as web) and the in-app
  Sentry ErrorBoundary.
