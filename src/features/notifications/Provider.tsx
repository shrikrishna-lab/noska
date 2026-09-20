import React, { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { notificationStore } from './api';
import { DESKTOP_ACTION_EVENT, initializeDesktopNotificationLifecycle } from '../../lib/desktopNotificationLifecycle';
import { clearBrowserDelivery, deliverDesktop } from './delivery';
import { resolveNotificationIdentity } from './identity';
import { highlightNotificationTarget, parseNotificationTarget, validateNotificationTarget } from './navigation';
import { loadPreferences } from './preferences';
import type { NotificationStore } from './store';
import { isUuid } from './types';
const StoreContext = createContext<NotificationStore>(notificationStore);
const IdentityErrorContext = createContext<string | null>(null);
export function NotificationPlatformProvider({ userId, children, store = notificationStore }: { userId: string | null; children: React.ReactNode; store?: NotificationStore }) {
  const [identityError, setIdentityError] = useState<string | null>(null);
  useEffect(() => initializeDesktopNotificationLifecycle(), []);
  useEffect(() => {
    store.setUser(null);
    setIdentityError(null);
    let active = true;
    let preferences: Awaited<ReturnType<typeof loadPreferences>> | null = null;
    const reload = () => {
      const id = store.getSnapshot().userId;
      if (!id) return;
      void loadPreferences(id).then(value => { if (active) preferences = value; }).catch(() => { preferences = null; });
    };
    const start = async () => {
      if (!userId) return;
      try {
        const id = isUuid(userId) ? userId : await resolveNotificationIdentity();
        if (!active) return;
        store.setUser(id);
        reload();
      } catch {
        if (active) setIdentityError('Notifications could not connect to your account. Retry after signing in.');
      }
    };
    void start();
    const off = store.onDelivery(row => {
      if (preferences) void deliverDesktop(row, preferences, () => active && store.getSnapshot().userId === row.user_id).catch(() => {});
    });
    const refresh = () => { if (!document.hidden) { if (store.getSnapshot().userId) void store.refresh(); else void start(); } };
    const syncTray = () => {
      const state = store.getSnapshot();
      window.dispatchEvent(new CustomEvent('noska:notification-unread-count', { detail: { count: state.unreadCount, userId: state.userId } }));
    };
    const unsubscribe = store.subscribe(syncTray);
    syncTray();
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('noska:notification-preferences-changed', reload);
    return () => {
      active = false;
      off(); unsubscribe();
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('noska:notification-preferences-changed', reload);
      store.setUser(null);
      window.dispatchEvent(new CustomEvent('noska:notification-unread-count', { detail: { count: 0, userId: null } }));
      void clearBrowserDelivery().catch(() => {});
    };
  }, [userId, store]);
  return <StoreContext.Provider value={store}><IdentityErrorContext.Provider value={identityError}>{children}</IdentityErrorContext.Provider></StoreContext.Provider>;
}
export function NotificationNavigationBridge({ onPage, onInbox, onError, onSearch, onSettings }: { onPage: (pageId: string) => void; onInbox: () => void; onError: (message: string) => void; onSearch?: () => void; onSettings?: () => void }) {
  const store = useContext(StoreContext);
  const callbacks = useRef({ onPage, onInbox, onError, onSearch, onSettings });
  callbacks.current = { onPage, onInbox, onError, onSearch, onSettings };
  useEffect(() => {
    let opening = false;
    let active = true;
    let revision = 0;
    let identity = store.getSnapshot().userId;
    let cancelHighlight = () => {};
    const unsubscribe = store.subscribe(() => {
      const next = store.getSnapshot().userId;
      if (identity !== next) {
        identity = next;
        revision += 1;
        opening = false;
        cancelHighlight();
      }
    });
    const desktopAction = (event: Event) => {
      if (!store.getSnapshot().userId) return;
      const action = (event as CustomEvent).detail;
      if (action === 'search') callbacks.current.onSearch?.();
      if (action === 'inbox') callbacks.current.onInbox();
      if (action === 'settings') callbacks.current.onSettings?.();
    };
    const handler = (event: Event) => {
      const id = (event as CustomEvent<{ notificationId?: string }>).detail?.notificationId;
      if (!id || opening) return;
      const row = store.getSnapshot().notifications.find(n => n.id === id);
      if (!row) return;
      const target = parseNotificationTarget(row);
      if (!target) { callbacks.current.onError('This notification has no valid destination.'); return; }
      opening = true;
      cancelHighlight();
      const currentRevision = ++revision;
      const userId = store.getSnapshot().userId;
      const stillCurrent = () => active && revision === currentRevision && store.getSnapshot().userId === userId;
      void (async () => {
        try {
          const validated = await validateNotificationTarget(target, userId || '');
          if (!stillCurrent()) return;
          if (validated.pageId) {
            callbacks.current.onPage(validated.pageId);
            cancelHighlight = highlightNotificationTarget(validated, stillCurrent, () => callbacks.current.onError('The destination could not be displayed.'));
          } else callbacks.current.onInbox();
          if (stillCurrent()) await store.markRead(id);
        } catch (error) {
          if (stillCurrent()) callbacks.current.onError(error instanceof Error ? error.message : 'Destination unavailable.');
        } finally { if (stillCurrent()) opening = false; }
      })();
    };
    window.addEventListener('noska:notification-open', handler);
    window.addEventListener(DESKTOP_ACTION_EVENT, desktopAction);
    return () => {
      active = false;
      cancelHighlight();
      unsubscribe();
      window.removeEventListener('noska:notification-open', handler);
      window.removeEventListener(DESKTOP_ACTION_EVENT, desktopAction);
    };
  }, [store]);
  return null;
}
export function useNotificationPlatform() {
  const store = useContext(StoreContext);
  const identityError = useContext(IdentityErrorContext);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...snapshot, error: identityError || snapshot.error, store, refresh: store.refresh, loadMore: store.loadMore, mark: store.mark, markRead: store.markRead, markAllRead: store.markAllRead, dismiss: store.dismiss, clearAll: store.clearAll };
}
