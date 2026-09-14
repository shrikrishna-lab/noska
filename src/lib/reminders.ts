/**
 * Shared Inbox reminder store.
 *
 * Single source of truth for `noska_inbox_reminders` so the Inbox UI, the
 * AI agent (create_reminder tool), and future schedulers all read and write
 * the same list. Writes broadcast a window event so a mounted Inbox picks up
 * agent-created reminders live.
 */

export const REMINDER_STORAGE_KEY = "noska_inbox_reminders";
export const REMINDERS_CHANGED_EVENT = "noska:reminders-changed";

export interface InboxReminder {
  id: string;
  text: string;
  /** Optional due date (ISO string or human-readable; displayed as-is). */
  date?: string;
  priority?: "high" | "medium" | "low";
  dismissed?: boolean;
  pageId?: string;
  pageTitle?: string;
  createdAt?: string;
}

export function loadReminders(): InboxReminder[] {
  try {
    const data = localStorage.getItem(REMINDER_STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReminders(reminders: InboxReminder[]): void {
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminders));
  } catch { /* storage full/unavailable */ }
  notifyRemindersChanged();
}

function notifyRemindersChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REMINDERS_CHANGED_EVENT));
  }
}

/** Subscribe to external reminder changes (storage event + in-app event). */
export function subscribeReminders(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === REMINDER_STORAGE_KEY) callback();
  };
  window.addEventListener(REMINDERS_CHANGED_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(REMINDERS_CHANGED_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function addReminder(input: {
  text: string;
  date?: string;
  priority?: "high" | "medium" | "low";
  pageId?: string;
  pageTitle?: string;
}): InboxReminder {
  const reminder: InboxReminder = {
    id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    text: input.text.trim(),
    date: input.date || undefined,
    priority: input.priority || "medium",
    dismissed: false,
    pageId: input.pageId,
    pageTitle: input.pageTitle,
    createdAt: new Date().toISOString(),
  };
  const list = loadReminders();
  list.unshift(reminder);
  saveReminders(list);
  return reminder;
}
