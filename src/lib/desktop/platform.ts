// Desktop vs Web detection for Noska. The Tauri shell injects
// __TAURI_INTERNALS__ into the webview; nothing else may be assumed.

export type DesktopPlatform = "windows" | "macos" | "linux" | "unknown";

export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isWeb(): boolean {
  return !isDesktop();
}

export function getDesktopPlatform(): DesktopPlatform {
  if (!isDesktop()) return "unknown";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Win/i.test(ua)) return "windows";
  if (/Mac/i.test(ua)) return "macos";
  if (/Linux|X11/i.test(ua)) return "linux";
  return "unknown";
}
