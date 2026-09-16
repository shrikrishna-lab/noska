import { useState, useEffect, useCallback } from "react";

const CALENDAR_SYNC_STORAGE_KEY = "noska_calendar_synced_pages";
const CALENDAR_SYNC_EVENT = "noska_calendar_sync_changed";

let memoryStore: string[] = [];

/**
 * Returns the list of page IDs that the user has explicitly added to their Calendar.
 */
export function getCalendarSyncedPageIds(): string[] {
  if (typeof localStorage === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(CALENDAR_SYNC_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Checks if a specific page ID or page object is added to the Calendar.
 */
export function isPageInCalendar(pageOrId: { id: string; inCalendar?: boolean } | string | null | undefined): boolean {
  if (!pageOrId) return false;
  if (typeof pageOrId === "object") {
    if (pageOrId.inCalendar === true) return true;
    return getCalendarSyncedPageIds().includes(pageOrId.id);
  }
  return getCalendarSyncedPageIds().includes(pageOrId);
}

/**
 * Adds a page to the calendar sync list.
 */
export function addPageToCalendar(pageId: string): void {
  if (!pageId) return;
  const current = getCalendarSyncedPageIds();
  if (!current.includes(pageId)) {
    const next = [...current, pageId];
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CALENDAR_SYNC_STORAGE_KEY, JSON.stringify(next));
    } else {
      memoryStore = next;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CALENDAR_SYNC_EVENT, { detail: { pageId, action: "added" } }));
    }
  }
}

/**
 * Removes a page from the calendar sync list.
 */
export function removePageFromCalendar(pageId: string): void {
  if (!pageId) return;
  const current = getCalendarSyncedPageIds();
  if (current.includes(pageId)) {
    const next = current.filter((id) => id !== pageId);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CALENDAR_SYNC_STORAGE_KEY, JSON.stringify(next));
    } else {
      memoryStore = next;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CALENDAR_SYNC_EVENT, { detail: { pageId, action: "removed" } }));
    }
  }
}

/**
 * Toggles whether a page is in the calendar.
 * Returns true if now in calendar, false if removed.
 */
export function togglePageInCalendar(pageId: string): boolean {
  if (!pageId) return false;
  const inCal = isPageInCalendar(pageId);
  if (inCal) {
    removePageFromCalendar(pageId);
    return false;
  } else {
    addPageToCalendar(pageId);
    return true;
  }
}

/**
 * React hook to observe and interact with the synced calendar page IDs in real-time.
 */
export function useCalendarSync() {
  const [syncedIds, setSyncedIds] = useState<string[]>(() => getCalendarSyncedPageIds());

  useEffect(() => {
    const handleSyncChange = () => {
      setSyncedIds(getCalendarSyncedPageIds());
    };

    window.addEventListener(CALENDAR_SYNC_EVENT, handleSyncChange);
    window.addEventListener("storage", handleSyncChange);
    return () => {
      window.removeEventListener(CALENDAR_SYNC_EVENT, handleSyncChange);
      window.removeEventListener("storage", handleSyncChange);
    };
  }, []);

  const toggle = useCallback((pageId: string) => {
    return togglePageInCalendar(pageId);
  }, []);

  const isSynced = useCallback(
    (pageOrId: { id: string; inCalendar?: boolean } | string | null | undefined) => {
      if (!pageOrId) return false;
      if (typeof pageOrId === "object") {
        if (pageOrId.inCalendar === true) return true;
        return syncedIds.includes(pageOrId.id);
      }
      return syncedIds.includes(pageOrId);
    },
    [syncedIds]
  );

  return {
    syncedIds,
    isSynced,
    toggle,
    add: addPageToCalendar,
    remove: removePageFromCalendar,
  };
}

// ── Topbar Calendar Button Visibility Setting (Default: OFF / false) ──
const CALENDAR_TOPBAR_STORAGE_KEY = "noska_calendar_topbar_button_enabled";
const CALENDAR_TOPBAR_SETTING_EVENT = "noska_calendar_topbar_setting_changed";

let memoryTopbarEnabled = false;

/**
 * Returns whether the "Add to My Calendar" icon is enabled in the workspace topbar.
 * By default, this is OFF (false) until turned on in customization.
 */
export function isCalendarTopbarEnabled(): boolean {
  if (typeof localStorage === "undefined") {
    return memoryTopbarEnabled;
  }
  try {
    const raw = localStorage.getItem(CALENDAR_TOPBAR_STORAGE_KEY);
    return raw === "true"; // default false if null or not "true"
  } catch {
    return false;
  }
}

/**
 * Sets whether the calendar button appears in the workspace topbar.
 */
export function setCalendarTopbarEnabled(enabled: boolean): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(CALENDAR_TOPBAR_STORAGE_KEY, enabled ? "true" : "false");
  } else {
    memoryTopbarEnabled = enabled;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CALENDAR_TOPBAR_SETTING_EVENT, { detail: { enabled } }));
  }
}

/**
 * Toggles the topbar calendar button setting.
 */
export function toggleCalendarTopbarEnabled(): boolean {
  const current = isCalendarTopbarEnabled();
  const next = !current;
  setCalendarTopbarEnabled(next);
  return next;
}

/**
 * React hook to observe and update the topbar calendar button visibility.
 */
export function useCalendarTopbarSetting() {
  const [enabled, setEnabledState] = useState<boolean>(() => isCalendarTopbarEnabled());

  useEffect(() => {
    const handleChange = () => {
      setEnabledState(isCalendarTopbarEnabled());
    };

    window.addEventListener(CALENDAR_TOPBAR_SETTING_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(CALENDAR_TOPBAR_SETTING_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const setEnabled = useCallback((val: boolean) => {
    setCalendarTopbarEnabled(val);
  }, []);

  const toggle = useCallback(() => {
    return toggleCalendarTopbarEnabled();
  }, []);

  return {
    enabled,
    setEnabled,
    toggle,
  };
}

// ── Auto Pages In Calendar Setting (Default: OFF / false) ──
const CALENDAR_AUTO_PAGES_STORAGE_KEY = "noska_calendar_auto_pages_enabled";
const CALENDAR_AUTO_PAGES_SETTING_EVENT = "noska_calendar_auto_pages_setting_changed";

let memoryAutoPagesEnabled = false;

/**
 * Returns whether all created/edited workspace pages automatically show as events in calendar.
 * By default, this is OFF (false).
 */
export function isAutoPagesInCalendarEnabled(): boolean {
  if (typeof localStorage === "undefined") {
    return memoryAutoPagesEnabled;
  }
  try {
    const raw = localStorage.getItem(CALENDAR_AUTO_PAGES_STORAGE_KEY);
    return raw === "true"; // default false if null or not "true"
  } catch {
    return false;
  }
}

/**
 * Sets whether all created/edited workspace pages automatically show in calendar.
 */
export function setAutoPagesInCalendarEnabled(enabled: boolean): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(CALENDAR_AUTO_PAGES_STORAGE_KEY, enabled ? "true" : "false");
  } else {
    memoryAutoPagesEnabled = enabled;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CALENDAR_AUTO_PAGES_SETTING_EVENT, { detail: { enabled } }));
  }
}

/**
 * Toggles whether all created pages appear in calendar.
 */
export function toggleAutoPagesInCalendarEnabled(): boolean {
  const current = isAutoPagesInCalendarEnabled();
  const next = !current;
  setAutoPagesInCalendarEnabled(next);
  return next;
}

/**
 * React hook to observe and update the auto-pages in calendar setting.
 */
export function useAutoPagesInCalendarSetting() {
  const [enabled, setEnabledState] = useState<boolean>(() => isAutoPagesInCalendarEnabled());

  useEffect(() => {
    const handleChange = () => {
      setEnabledState(isAutoPagesInCalendarEnabled());
    };

    window.addEventListener(CALENDAR_AUTO_PAGES_SETTING_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(CALENDAR_AUTO_PAGES_SETTING_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const setEnabled = useCallback((val: boolean) => {
    setAutoPagesInCalendarEnabled(val);
  }, []);

  const toggle = useCallback(() => {
    return toggleAutoPagesInCalendarEnabled();
  }, []);

  return {
    enabled,
    setEnabled,
    toggle,
  };
}

