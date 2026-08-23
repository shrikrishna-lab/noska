// DesktopBridge — mounted once inside <BrowserRouter> when running in the
// Tauri shell. Bridges native events (tray menu, noska:// deep links) to the
// React router. Renders nothing and is inert on the web.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { isDesktop } from "./platform";
import {
  DEEP_LINK_EVENT,
  TRAY_ACTION_EVENT,
  parseDeepLink,
  setPendingDeepLink,
} from "./deepLink";

const TRAY_SOURCE_EVENT = "tray://action";
const DEEP_LINK_SOURCE_EVENT = "deep-link://open-url";

export type TrayAction = "open" | "new-page" | "new-task" | "open-ai";

function handleTrayAction(action: string, navigate: (path: string) => void) {
  switch (action) {
    case "open":
      navigate("/dashboard");
      return;
    case "new-page":
    case "new-task":
    case "open-ai":
      // Hand off to the app shell: it decides how to start the flow.
      window.dispatchEvent(new CustomEvent(TRAY_ACTION_EVENT, { detail: action }));
      navigate("/dashboard");
      return;
    default:
      return;
  }
}

function handleDeepLink(raw: string, navigate: (path: string) => void) {
  const parsed = parseDeepLink(raw);
  if (!parsed) return;
  if (parsed.entity === "workspace") {
    navigate(`/${encodeURIComponent(parsed.id)}`);
    return;
  }
  // page/agent/automation ids need a data lookup to build their route; park
  // them for the app shell and announce the intent.
  setPendingDeepLink(parsed);
  window.dispatchEvent(new CustomEvent(DEEP_LINK_EVENT, { detail: parsed }));
}

export default function DesktopBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDesktop()) return;
    let disposed = false;
    const unlisteners: Array<() => void> = [];

    Promise.all([
      listen<string>(TRAY_SOURCE_EVENT, (event) => {
        handleTrayAction(event.payload, navigate);
      }),
      listen<string[]>(DEEP_LINK_SOURCE_EVENT, (event) => {
        for (const raw of event.payload ?? []) {
          handleDeepLink(raw, navigate);
        }
      }),
    ]).then((results) => {
      if (disposed) {
        results.forEach((unlisten) => unlisten());
      } else {
        unlisteners.push(...results);
      }
    });

    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [navigate]);

  return null;
}
