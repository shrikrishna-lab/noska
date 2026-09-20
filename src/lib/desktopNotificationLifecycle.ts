import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isDesktop, getDesktopPlatform } from "./desktop/platform";

export type DesktopPreferences = {
  closeToTray: boolean;
  autostart: boolean;
  launchMinimized: boolean;
  notificationsPaused: boolean;
};

export type DesktopPreferencesPatch = Partial<DesktopPreferences>;
export type DesktopLifecycleAction = "open" | "new-page" | "search" | "inbox" | "settings";

export const DESKTOP_PREFERENCES_EVENT = "noska:desktop-preferences-changed";
export const DESKTOP_ACTION_EVENT = "noska:desktop-action";
export const DESKTOP_LIFECYCLE_ERROR_EVENT = "noska:desktop-lifecycle-error";
export const DESKTOP_UNREAD_COUNT_EVENT = "noska:notification-unread-count";

export type DesktopUnreadState = { count: number; userId: string | null };

let unreadQueue: Promise<void> = Promise.resolve();
let unreadRevision = 0;

function forwardUnreadState(value: unknown) {
  const detail = value as Partial<DesktopUnreadState> | null;
  const validUser = typeof detail?.userId === "string" && detail.userId.length > 0
    && detail.userId.length <= 128 && !/[\s\x00-\x1f\x7f]/.test(detail.userId);
  const validCount = typeof detail?.count === "number" && Number.isSafeInteger(detail.count) && detail.count >= 0;
  const state: DesktopUnreadState = validUser && validCount
    ? { userId: detail.userId!, count: Math.min(detail.count!, 9999) }
    : { userId: null, count: 0 };
  const revision = ++unreadRevision;
  unreadQueue = unreadQueue.then(async () => {
    if (revision !== unreadRevision) return;
    await invoke("set_desktop_unread_count", state);
  }).catch((error) => {
    if (revision === unreadRevision) {
      dispatch(DESKTOP_LIFECYCLE_ERROR_EVENT, { message: error instanceof Error ? error.message : String(error) });
    }
  });
}

export const DESKTOP_NATIVE_EVENTS = {
  preferences: "desktop://preferences-changed",
  action: "desktop://action",
  error: "desktop://error",
} as const;

export function getDesktopNotificationCapabilities() {
  const available = isDesktop();
  return {
    available,
    platform: getDesktopPlatform(),
    nativeNotifications: available,
    notificationClickCallbacks: false,
    notificationActions: false,
    notificationDeliveryConfirmation: false,
    autostart: available,
    launchMinimized: available,
    closeToTray: available,
  } as const;
}

export async function getDesktopPreferences(): Promise<DesktopPreferences | null> {
  if (!isDesktop()) return null;
  return invoke<DesktopPreferences>("get_desktop_preferences");
}

export async function updateDesktopPreferences(patch: DesktopPreferencesPatch): Promise<DesktopPreferences | null> {
  if (!isDesktop()) return null;
  return invoke<DesktopPreferences>("update_desktop_preferences", { patch });
}

export async function showDesktopMain(): Promise<void> {
  if (!isDesktop()) return;
  await invoke("show_desktop_main");
}

function dispatch<T>(name: string, detail: T) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function isAction(value: unknown): value is DesktopLifecycleAction {
  return typeof value === "string" && ["open", "new-page", "search", "inbox", "settings"].includes(value);
}

type LifecycleSession = {
  subscribers: number;
  disposed: boolean;
  unlisteners: Array<() => void>;
  removeUnreadListener: () => void;
};

let session: LifecycleSession | null = null;

export function initializeDesktopNotificationLifecycle(): () => void {
  if (!isDesktop()) return () => {};
  if (!session) {
    const onUnread = (event: Event) => forwardUnreadState((event as CustomEvent<unknown>).detail);
    window.addEventListener(DESKTOP_UNREAD_COUNT_EVENT, onUnread);
    const current: LifecycleSession = {
      subscribers: 0, disposed: false, unlisteners: [],
      removeUnreadListener: () => window.removeEventListener(DESKTOP_UNREAD_COUNT_EVENT, onUnread),
    };
    session = current;
    forwardUnreadState(null);
    void (async () => {
      try {
        if (current.disposed) return;
        let preferenceRevision = 0;
        const register = async <T>(name: string, handler: (payload: T) => void) => {
          const unlisten = await listen<T>(name, (event) => {
            if (!current.disposed) handler(event.payload);
          });
          if (current.disposed) unlisten();
          else current.unlisteners.push(unlisten);
        };
        await register<DesktopPreferences>(DESKTOP_NATIVE_EVENTS.preferences, (preferences) => {
          preferenceRevision += 1;
          dispatch(DESKTOP_PREFERENCES_EVENT, preferences);
        });
        if (current.disposed) return;
        await register<unknown>(DESKTOP_NATIVE_EVENTS.action, (action) => {
          if (isAction(action)) dispatch(DESKTOP_ACTION_EVENT, action);
        });
        if (current.disposed) return;
        await register<string>(DESKTOP_NATIVE_EVENTS.error, (message) => {
          dispatch(DESKTOP_LIFECYCLE_ERROR_EVENT, { message });
        });
        if (current.disposed) return;
        const revision = preferenceRevision;
        const preferences = await getDesktopPreferences();
        if (!current.disposed && preferences && revision === preferenceRevision) {
          dispatch(DESKTOP_PREFERENCES_EVENT, preferences);
        }
      } catch (error) {
        current.unlisteners.splice(0).forEach((unlisten) => unlisten());
        if (!current.disposed) {
          dispatch(DESKTOP_LIFECYCLE_ERROR_EVENT, {
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();
  }
  const current = session;
  current.subscribers += 1;
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    current.subscribers -= 1;
    if (current.subscribers === 0) {
      current.disposed = true;
      current.removeUnreadListener();
      forwardUnreadState(null);
      current.unlisteners.splice(0).forEach((unlisten) => unlisten());
      if (session === current) session = null;
    }
  };
}
