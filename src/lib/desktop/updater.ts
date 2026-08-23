// Auto-update plumbing (Tauri updater). Dev builds never touch production
// update infrastructure; release builds check the signed latest.json manifest
// published alongside GitHub releases.

import { isDesktop } from "./platform";

export interface AppUpdate {
  version: string;
  notes?: string;
  install: () => Promise<void>;
}

export async function checkForUpdate(): Promise<AppUpdate | null> {
  if (!isDesktop()) return null;
  if (import.meta.env.DEV) return null;
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) return null;
  return {
    version: update.version,
    notes: update.body,
    install: async () => {
      await update.downloadAndInstall();
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    },
  };
}
