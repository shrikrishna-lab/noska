# Noska Mobile (iOS + Android)

Noska is **one product with different interfaces for different contexts**:

```
PUBLIC WEB (noska.me)              NOSKA PRODUCT
Marketing / SEO / Discovery   →    Web + Desktop + Mobile
                                   Same account · same workspace · same content
                                   same AI · same backend · same sync
```

The mobile app is the **actual Noska workspace** — never a packaged marketing
site. Marketing routes are unreachable inside the native app
(`MarketingShell` hands every marketing URL to the product).

---

## 1. Architecture

```
src/
  platform/
    index.ts                  ← single source of truth: isWeb / isDesktop /
                                isMobile / isNativeApp, getPlatform(),
                                getSurface(), share + haptics adapters
    mobile/                   ← the mobile platform implementation
      MobileAppController.tsx ← typed hand-off from App.tsx → mobile UI
      MobileWorkspaceApp.tsx  ← the shell (header, bottom nav, screens, sheets)
      MobileAuthScreen.tsx    ← sign-in (system-browser handoff)
      MobileBridge.tsx        ← noska:// deep links → /app/... routes
      MobileLinkRedirect.tsx  ← web fallback for universal/app links
      mobile.css              ← safe areas, touch targets, sheets, nav
    widgets/                  ← (separate feature, platform-agnostic)
  lib/desktop/                ← pre-existing native adapters, now shared by
                                desktop AND mobile (browserAuth, pairing,
                                deepLink, notify, links, platform)
```

**Business logic is 100% shared.** `App.tsx` owns all workspace state and
mutations (pages, blocks, undo, invites, sync, AI). On mobile it renders the
mobile shell instead of the desktop sidebar layout and passes everything down
through `MobileAppController`. There is no second frontend codebase.

Platform checks resolve through `src/platform/index.ts` — never scatter
`userAgent` checks through the codebase.

### Route separation

| Surface | Routes |
|---|---|
| Marketing (web only) | `/`, `/pricing`, `/blog`, `/docs`, … |
| Product (all platforms) | `/dashboard`, `/:workspaceSlug/:pageId` |
| Product (mobile shell) | `/app/home`, `/app/search`, `/app/inbox`, `/app/profile`, `/app/page/:pageId` |
| Web fallback for app links | `/link/workspace/:id`, `/link/page/:pageId`, … |

---

## 2. Startup flow

```
Launch → initialize → check session (native handoff session in
        localStorage["noska_desktop_session"], refreshed via GoTrue)
   ├─ no session → Welcome/Sign-in (system-browser handoff)
   │                 → onboarding (first run) → workspace
   └─ valid session → load workspace → last page / Home
```

- Signed-in users never see login again; workspace loads directly.
- Clerk cannot run inside the mobile webview (origin allow-list), so mobile
  auth reuses the desktop **browser handoff**: the app opens
  `noska.me/desktop-auth?tx=…&state=…` in the system browser; the browser
  returns via `noska://auth/callback?tx=…&state=…` (one-time artifact, no
  tokens in URLs); the app exchanges it with its PKCE verifier. A polling
  fallback covers the case where the OS fails to route the link.
- Workspace selection: Noska currently has one workspace per user; the home
  header + profile screen surface it. Multi-workspace switching hooks in at
  the same place when the backend supports it.

## 3. Navigation (mobile)

Bottom navigation: **Home · Search · ➕ Create · Inbox · Profile**.
Everything else is sheets and context menus:

- **Create sheet** — new page / tasks tracker / projects / meeting notes /
  docs / brainstorm / goals / Ask AI.
- **Page screen** — compact header (back · title · favorite · actions) over
  the real editor (`SplitWorkspaceRenderer`), plus a thumb toolbar
  (insert block · undo · redo · AI · dismiss keyboard) that rides above the
  keyboard via `--mobile-kb` (visualViewport).
- **Inbox** — invites (accept/decline), shared pages, recent activity.
- **Profile** — profile edit, workspace rename, trash, appearance
  (light/dark/system), notifications, AI settings, integrations, sign out.

Android hardware back pops the router history naturally (page → previous
page/tab); in-app back buttons do the same.

## 4. Deep links

```
noska://workspace/{workspaceId}                    → Home
noska://workspace/{workspaceId}/page/{pageId}      → page
noska://workspace/{workspaceId}/task/{taskId}      → page
noska://workspace/{workspaceId}/project/{projectId}→ page
noska://page/{pageId}  ·  noska://task/{id}  ·  noska://project/{id}
noska://agent/{id} · noska://automation/{id}       → Home (desktop surfaces)
noska://auth/callback|cancel                       → sign-in handoff
```

Flow: link opens app (installed) → authenticate if needed → requested content
opens. Not installed → the platform falls back to the web:

- iOS Universal Links point at `https://noska.me/link/...`, served from
  `public/.well-known/apple-app-site-association`.
- Android App Links use `public/.well-known/assetlinks.json`.
- **You must fill in real values**: replace `TEAMID.dev.noska.app` in the
  AASA with your actual Apple Team ID prefix and put your release-key
  SHA-256 fingerprint into `assetlinks.json`.
- `/link/...` routes redirect signed-in users into the product
  (`/_/{pageId}`), never the marketing site.

Scheme registration in the native projects is idempotent and automated:
`npm run mobile:patch` (run after `tauri android/ios init`; CI does it).

## 5. Offline & sync

- All writes go through the existing dirty-queue autosave
  (`src/utils/storage.ts`) — optimistic local state, verified flush to
  Supabase, exponential backoff, unverified-logout recovery.
- Offline: the shell shows a persistent banner and a "Syncing…/Saving…/"
  chip; recent content is cached locally; queued mutations flush on
  reconnect. Unsynced data is never presented as saved (the chip shows
  "Syncing…" until the flush verifies).
- Realtime keeps the session current with other devices
  (`subscribeToPages`), with echo/stale-write guards.

## 6. Building

Prereqs: Node 22, Rust stable. Mobile targets additionally need the Android
SDK + NDK + JDK 17 (Android) or macOS + Xcode (iOS).

```bash
# Android
npm run tauri android init        # generates src-tauri/gen/android
npm run mobile:patch              # registers the noska:// intent-filter
npm run tauri android dev         # run on device/emulator (needs NDK)
npm run tauri android build -- --apk --aab

# iOS (macOS only)
npm run tauri ios init            # generates src-tauri/gen/apple
npm run mobile:patch              # registers the noska:// URL scheme
npm run tauri ios dev
npm run tauri ios build -- --export-method app-store-connect
```

- `npm run build:mobile` → `dist-mobile` (used by the platform tauri configs
  `tauri.android.conf.json` / `tauri.ios.conf.json`).
- Dev server: `npm run dev:mobile` — binds to `TAURI_DEV_HOST` so devices can
  reach it during `tauri android/ios dev`.
- CI: `.github/workflows/build-mobile.yml` builds Android (APK+AAB) and iOS
  (archive/IPA) on `mobile-v*` tags or manual dispatch, generating +
  patching the native projects each run. Tag builds additionally land in a
  **draft pre-release** with the APK/AAB/IPA attached.

### Managing mobile releases from the admin panel

The admin **Releases** page has a **Mobile** tab (next to Desktop):

- **Pipeline status** — workflow on branch, `gen/android` / `gen/apple`
  committed, and whether the `noska://` scheme is registered in the
  committed AndroidManifest.
- **Trigger a mobile build** — tags `mobile-v<version>` (must equal the
  current repo version; desktop releases own version bumps) and starts the
  build. Artifacts arrive in a draft pre-release; publish after review.
  Requires the admin role; the desktop release flow is unaffected.
- **Live runs** — the last mobile workflow runs with links to GitHub.
- **Mobile releases** — draft/published mobile releases with per-asset
  download rows (APK / AAB / IPA + sizes).
- **Deep-link builder** — composes `noska://workspace/<id>/page/<id>` links
  and their `noska.me/link/...` web fallbacks for QA.

Deploy the edge function after changing it:
`supabase functions deploy admin-trigger-release`. Optional env:
`APP_STORE_URL` / `PLAY_STORE_URL` show store buttons on the Mobile tab
once the apps are listed.

### Windows note: symlink limitation

The Tauri CLI packages the Rust `.so` into `jniLibs` with a **symbolic
link**, which Windows blocks without Developer Mode (or admin rights). On
unprivileged machines the `tauri android build` output ends with
`Creation symbolic link is not allowed for this system` — the Rust build
itself has already succeeded at that point. Two options:

1. **Enable Developer Mode** (Settings → System → For developers, or the
   registry key `HKLM\...\AppModelUnlock\AllowDevelopmentWithoutDevLicense`
   with admin rights) — then everything works normally.
2. Without admin, drive Gradle directly (the project files are untouched):

   ```bash
   # after the cargo part has built once (e.g. by the failed CLI run):
   cp src-tauri/target/aarch64-linux-android/debug/libnoska_lib.so \
      src-tauri/gen/android/app/src/main/jniLibs/arm64-v8a/
   cd src-tauri/gen/android
   ./gradlew.bat assembleArm64Debug \
     --init-script "../../scripts/android-skip-rust-build.init.gradle.kts"
   # → app/build/outputs/apk/arm64/debug/app-arm64-debug.apk
   ```

   The init script just no-ops the `rustBuild*` tasks, which would
   otherwise re-invoke the Tauri CLI and hit the same symlink failure.

## 7. Native capabilities (and deliberate non-additions)

| Capability | How |
|---|---|
| Notifications | `tauri-plugin-notification` (all platforms) |
| Deep links | `tauri-plugin-deep-link` (all platforms) |
| Open external links | `tauri-plugin-opener` → system browser |
| Share sheet | Web Share API via `shareContent()` |
| Haptics | `navigator.vibrate` via `hapticFeedback()` (no-op on iOS) |
| Secure-ish session store | Same localStorage session blob as desktop (see below) |
| Updater / tray / single-instance / window-state / local Whisper / text injection | **Desktop-only** (`cfg(desktop)`); mobile stubs return graceful "not supported" so IPC stays uniform |

**Session storage note:** the handoff session is stored in the WebView's
localStorage — the same store the desktop app has shipped for a long time,
persisted by WKWebView/Android WebView for app-scoped data. If you want
Keychain/Keystore-grade storage later, swap the store functions in
`lib/desktop/pairing.ts` for a `tauri-plugin-stronghold`-backed adapter;
everything else stays unchanged.

## 8. Testing matrix

Entry flow: first launch → onboarding → login (browser handoff) → signup →
password recovery (on web) → session restoration (kill + relaunch) →
workspace selection.

Workspace: workspace load, switching focus, page create/edit, documents,
databases (Tasks/Projects templates), search, inbox/invites, AI chat.

Cross-platform sync: Web→Mobile, Mobile→Web, Desktop→Mobile, Mobile→Desktop,
iOS→Android, Android→iOS (create/edit on one, verify on the other within a
few seconds via realtime).

Mobile UX: small + large phones, portrait, keyboard open/closed (editor
toolbar must stay visible above the keyboard), safe areas (notch/gesture
bar), dark/light, offline mode (banner + queued writes), poor network,
deep links (cold + warm start), notification tap, system back navigation,
double-tap zoom (must not zoom — `touch-action: manipulation`).

## 9. Known limitations / follow-ups

- Aggregate views (Calendar, My Tasks, Marketplace, Agents, Automations) are
  desktop panels; mobile covers content (pages/docs/databases/tasks/projects
  as pages), search, inbox, AI and settings. Port views on demand.
- AI provider keys are configured through the reused Settings modal.
- Voice dictation on mobile uses the system speech recognizer
  (`capability_check` reports unavailable → UI falls back automatically).
- Local AI models (Whisper) are desktop-only by design.
