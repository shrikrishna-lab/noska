// Native notifications with a web fallback. Used for agent completions,
// automation results, mentions, reminders and attention-requiring errors.

import { isDesktop } from "./platform";

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (isDesktop()) {
      const mod = await import("@tauri-apps/plugin-notification");
      let granted = await mod.isPermissionGranted();
      if (!granted) {
        granted = (await mod.requestPermission()) === "granted";
      }
      return granted;
    }
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      return Notification.permission === "granted";
    }
    return false;
  } catch (err) {
    console.error("[desktop] notification permission failed", err);
    return false;
  }
}

export async function sendAppNotification(title: string, body: string): Promise<void> {
  try {
    if (!(await ensureNotificationPermission())) return;
    if (isDesktop()) {
      const mod = await import("@tauri-apps/plugin-notification");
      mod.sendNotification({ title, body });
    } else if ("Notification" in window) {
      new Notification(title, { body });
    }
  } catch (err) {
    console.error("[desktop] notification failed", err);
  }
}
