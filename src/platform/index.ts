// Noska platform detection — the single source of truth for "where am I
// running". Every platform branch in the app resolves through this module
// (src/lib/desktop/platform.ts re-exports the desktop helpers from here so
// the 20+ existing call sites keep working unchanged).
//
// Targets:
//   web      — any browser on desktop
//   desktop  — Tauri shell on Windows / macOS / Linux
//   mobile   — Tauri shell on iOS / Android or mobile runtime (the native Noska app)
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
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1)
  );
}

function isAndroidUserAgent(): boolean {
  return /Android/i.test(userAgent());
}

/** Running inside any native Tauri shell (desktop OR mobile). */
export function isNativeApp(): boolean {
  return hasTauriIpc();
}

/**
 * Running in the native mobile app (iOS/Android Tauri shell or mobile runtime).
 */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  const ua = userAgent();
  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return (hasTauriIpc() && (isIosUserAgent() || isAndroidUserAgent())) || isMobileUa;
}

/** True for native desktop shells (Windows / macOS / Linux); false for mobile & web. */
export function isDesktop(): boolean {
  return hasTauriIpc() && !isMobile();
}

export function isWeb(): boolean {
  return !hasTauriIpc() && !isMobile();
}

export function getPlatform(): NoskaPlatform {
  if (isAndroidUserAgent()) return "android";
  if (isIosUserAgent()) return "ios";
  if (!hasTauriIpc()) return "web";
  const ua = userAgent();
  if (/Win/i.test(ua)) return "windows";
  if (/Mac/i.test(ua)) return "macos";
  if (/Linux|X11/i.test(ua)) return "linux";
  return "web";
}

export function getSurface(): NoskaSurface {
  const platform = getPlatform();
  if (platform === "ios" || platform === "android" || isMobile()) return "mobile";
  if (hasTauriIpc()) return "desktop";
  return "web";
}

export function isApplePlatform(): boolean {
  const p = getPlatform();
  return p === "macos" || p === "ios";
}

export function isWindowsPlatform(): boolean {
  return getPlatform() === "windows";
}

export function isLinuxPlatform(): boolean {
  return getPlatform() === "linux";
}

export function isAndroidPlatform(): boolean {
  return getPlatform() === "android";
}

export function isIosPlatform(): boolean {
  return getPlatform() === "ios";
}

export function hapticFeedback(style: "light" | "medium" | "heavy" | "selection" = "light"): void {
  if (!isMobile() || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const durations: Record<typeof style, number> = {
    light: 10,
    medium: 20,
    heavy: 35,
    selection: 5,
  };
  try {
    navigator.vibrate(durations[style]);
  } catch {
    // silently ignore if vibration is disabled/unsupported
  }
}
