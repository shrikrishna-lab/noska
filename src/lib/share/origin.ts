/**
 * Shareable page links.
 *
 * `window.location.origin` is wrong for anything shared. In the Tauri shells
 * the app is served from the webview's own origin (`http://tauri.localhost`,
 * `capacitor://localhost`, …), so a link built from it can only ever be opened
 * by that same app instance. Everyone else would get a dead address.
 *
 * Every share surface routes through `buildPageLink` so a link always points at
 * the real web deployment and opens in a normal browser.
 */
import { isNativeApp } from "../../platform";

/** Configured at build time; falls back to the live marketing/web host. */
const CONFIGURED_WEB_ORIGIN = String(import.meta.env?.VITE_NOSKA_WEB_ORIGIN ?? "").trim().replace(/\/+$/, "");
const FALLBACK_WEB_ORIGIN = "https://www.noska.me";

/** Origins that are already the real web app, so sharing them is correct. */
function isPublicWebHost(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return true;
  if (hostname.endsWith(".localhost")) return true;
  if (hostname === "tauri.localhost") return false;
  return /(^|\.)noska\.(me|dev)$/i.test(hostname);
}

/**
 * The origin a shared link should point at.
 *
 * Browser on the real site (or a loopback dev server) keeps its own origin so
 * local previews stay clickable. Native shells, and anything served from a
 * non-public host, resolve to the configured web origin.
 */
export function canonicalWebOrigin(): string {
  if (typeof window === "undefined") return CONFIGURED_WEB_ORIGIN || FALLBACK_WEB_ORIGIN;
  if (isNativeApp()) return CONFIGURED_WEB_ORIGIN || FALLBACK_WEB_ORIGIN;
  if (isPublicWebHost(window.location.hostname)) return window.location.origin;
  return CONFIGURED_WEB_ORIGIN || FALLBACK_WEB_ORIGIN;
}

/** True when a link built here would point somewhere the recipient can open. */
export function isShareableOrigin(): boolean {
  if (typeof window === "undefined") return false;
  return !isNativeApp() && isPublicWebHost(window.location.hostname);
}

/**
 * `/<workspaceSlug>/<pageId>` — the shape `<ProductApp />` routes on.
 * `query` survives the trip so a view mode can be encoded in the link.
 */
export function buildPageLink(workspaceSlug: string, pageId: string, query?: Record<string, string | undefined>): string {
  const slug = String(workspaceSlug || "my-workspace").trim() || "my-workspace";
  const id = String(pageId || "").trim();
  const base = `${canonicalWebOrigin().replace(/\/+$/, "")}/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export type ParsedPageLink = { workspaceSlug: string; pageId: string };

/** Accepts a full share link or a bare `/slug/pageId` path. */
export function parsePageLink(input: string): ParsedPageLink | null {
  const raw = String(input || "").trim();
  if (!raw) return null;
  let pathname = raw;
  try {
    pathname = new URL(raw, "https://placeholder.invalid").pathname;
  } catch {
    return null;
  }
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const pageId = parts[parts.length - 1];
  const workspaceSlug = parts[parts.length - 2];
  if (!pageId || !workspaceSlug) return null;
  return { workspaceSlug: decodeURIComponent(workspaceSlug), pageId: decodeURIComponent(pageId) };
}
