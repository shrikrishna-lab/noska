// MobileBridge — the mobile counterpart of DesktopBridge. Bridges native
// events (noska:// deep links from the iOS/Android shell) to the React
// router and to the app shell's mobile navigation (/app/...). Renders
// nothing and is inert everywhere except the native mobile app.
//
// The browser-handoff auth callback (noska://auth/callback) is resolved by
// browserAuth — identical to desktop. Content links route into the product:
//
//   noska://workspace/<id>                      → /app/home
//   noska://workspace/<id>/page/<pageId>        → /app/page/<pageId>
//   noska://workspace/<id>/task|project/<id>    → /app/page/<id>
//   noska://page|task|project/<id>              → /app/page/<id>
//   noska://agent|automation/<id>               → /app/home (desktop-only surfaces)

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isMobile } from "../index";
import { parseDeepLink, type ParsedDeepLink } from "../../lib/desktop/deepLink";
import { handleAuthCallbackUrl } from "../../lib/desktop/browserAuth";

function linkTarget(parsed: ParsedDeepLink): string {
  const childId = parsed.child?.id;
  if (parsed.entity === "workspace" && !childId) return "/app/home";
  if (childId) return `/app/page/${encodeURIComponent(childId)}`;
  if (parsed.entity === "page" || parsed.entity === "task" || parsed.entity === "project") {
    return `/app/page/${encodeURIComponent(parsed.id)}`;
  }
  // agent/automation workspaces are desktop surfaces — land on Home.
  return "/app/home";
}

export default function MobileBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isMobile()) return;
    let disposed = false;
    const unlisteners: Array<() => void> = [];

    const routeLinks = (urls: readonly unknown[] | undefined) => {
      for (const raw of urls ?? []) {
        if (typeof raw !== "string") continue;
        // Auth handoff (noska://auth/callback|cancel) never routes.
        if (handleAuthCallbackUrl(raw)) continue;
        const parsed = parseDeepLink(raw);
        if (!parsed) continue;
        navigate(linkTarget(parsed), { replace: false });
      }
    };

    // Warm-start: the Rust plugin emits while the app is running.
    void (async () => {
      try {
        const { onOpenUrl, getCurrent } = await import("@tauri-apps/plugin-deep-link");
        if (disposed) return;
        // Cold-start: URL(s) the app was LAUNCHED with (delivered before any
        // webview listener could attach).
        try {
          const initial = await getCurrent();
          if (!disposed) routeLinks(initial);
        } catch {
          // No initial URL — a normal launch.
        }
        const unlisten = await onOpenUrl((urls) => {
          if (disposed) return;
          routeLinks(urls);
        });
        if (disposed) unlisten();
        else unlisteners.push(unlisten);
      } catch (e) {
        console.warn("[mobile] deep-link bridge unavailable", e);
      }
    })();

    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [navigate]);

  return null;
}
