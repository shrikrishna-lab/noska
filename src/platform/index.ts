// Noska platform detection — the single source of truth for "where am I
// running". Every platform branch in the app resolves through this module
// (src/lib/desktop/platform.ts re-exports the desktop helpers from here so
// the 20+ existing call sites keep working unchanged).
//
// Targets:
//   web      — any browser, including a phone browser (marketing + product)
//   desktop  — Tauri shell on Windows / macOS / Linux
//   mobile   — Tauri shell on iOS / Android (the native Noska app)
//
// The Tauri shell injects __TAURI_INTERNALS__ into the webview; nothing
// else may be assumed. Without that marker every check degrades to "web",
// so SSR/dev/test environments are always safe.

export type NoskaPlatform = "web" | "windows" | "macos" | "linux" | "ios" | "android";
export type NoskaSurface = "web" | "desktop" | "mobile";

function hasTauriIpc(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function userAgent(): string {
  return typeof navigator !== "undefined" ? navigator.userAgent : "";
}

function isIosUserAgent(): boolean {
  const ua = userAgent();
  // iPadOS 13+ masquerades as desktop Safari ("Macintosh") — maxTouchPoints
  // is the only reliable tell in a WKWebView.
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1)
  );
}

function isAndroidUserAgent(): boolean {
  return /Android/.test(userAgent());
}

/** Running inside any native Tauri shell (desktop OR mobile). */
export function isNativeApp(): boolean {
  return hasTauriIpc();
}

/**
 * Running in the native mobile app (iOS/Android Tauri shell).
 * A phone BROWSER is not "mobile" for app purposes — it renders the
 * marketing/public web experience, which is a deliberate product boundary.
 */
export function isMobile(): boolean {
  return hasTauriIpc() && (isIosUserAgent() || isAndroidUserAgent());
}

/** True for both native shells (desktop + mobile); false for plain web. */
export function isDesktop(): boolean {
  return hasTauriIpc();
}

export function isWeb(): boolean {
  return !hasTauriIpc();
}

export function getPlatform(): NoskaPlatform {
  if (!hasTauriIpc()) return "web";
  if (isAndroidUserAgent()) return "android";
  if (isIosUserAgent()) return "ios";
  const ua = userAgent();
  if (/Win/i.test(ua)) return "windows";
  if (/Mac/i.test(ua)) return "macos";
  if (/Linux|X11/i.test(ua)) return "linux";
  return "web";
}

export function getSurface(): NoskaSurface {
  const platform = getPlatform();
  if (platform === "ios" || platform === "android") return "mobile";
  return hasTauriIpc() ? "desktop" : "web";
}

/* ── Cross-platform capability adapters ──────────────────────────────────
 * Platform-specific behaviour funnels through these helpers instead of
 * scattering surface checks across the codebase. Native paths use the
 * Tauri plugins (dynamically imported so the web bundle stays lean);
 * web paths fall back to browser APIs. */

/** Native OS share sheet (mobile) with a web-share fallback. Returns false
 * when no share mechanism exists (caller can fall back to copy-to-clipboard). */
export async function shareContent(data: { title?: string; text?: string; url?: string }): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share(data);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Light tactile feedback. Android supports it in WebView; iOS is a no-op. */
export function hapticFeedback(style: "light" | "medium" | "heavy" = "light"): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      const ms = style === "light" ? 10 : style === "medium" ? 20 : 35;
      navigator.vibrate(ms);
    }
  } catch {
    // ignore — haptics are best-effort
  }
}
