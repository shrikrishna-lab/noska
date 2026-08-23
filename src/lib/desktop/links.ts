// External-link helper: websites/integrations open in the user's real browser
// on desktop; Noska pages never navigate the webview away.

import { isDesktop } from "./platform";

export async function openExternal(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`openExternal: invalid url "${url}"`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`openExternal: scheme not allowed "${parsed.protocol}"`);
  }
  if (isDesktop()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(parsed.toString());
  } else {
    window.open(parsed.toString(), "_blank", "noopener,noreferrer");
  }
}
