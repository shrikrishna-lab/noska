// Desktop vs Web detection for Noska.
// The canonical implementation now lives in src/platform (it also knows
// about the iOS/Android native shells); this module keeps the historical
// import path stable for the existing call sites.
export { isDesktop, isWeb, isNativeApp } from "../../platform";

export type DesktopPlatform = "windows" | "macos" | "linux" | "unknown";

export function getDesktopPlatform(): DesktopPlatform {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return "unknown";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/iPad|iPhone|iPod/.test(ua)) return "unknown";
  if (/Win/i.test(ua)) return "windows";
  if (/Mac/i.test(ua)) return "macos";
  if (/Linux|X11/i.test(ua)) return "linux";
  return "unknown";
}
