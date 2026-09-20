import { isDesktop, isNativeApp } from '../../lib/desktop/platform';
import { notificationClient } from './api';
import { getDesktopPreferences } from '../../lib/desktopNotificationLifecycle';
import type { NotificationPreferences, NotificationRecord } from './types';
export interface DeliveryCapability { channel: 'desktop' | 'push' | 'email' | 'mobile'; available: boolean; limitation: string }
export const deliveryCapabilities = (): DeliveryCapability[] => [
  { channel: 'desktop', available: isDesktop(), limitation: 'Desktop notifications require Noska to be running, including in the tray.' },
  { channel: 'push', available: !isNativeApp() && typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && Boolean(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY), limitation: 'Requires browser permission and a configured server push worker.' },
  { channel: 'email', available: false, limitation: 'Email delivery is not available yet.' },
  { channel: 'mobile', available: false, limitation: 'Native mobile push is not available yet.' },
];
export async function requestDesktopPermission() {
  if (!isDesktop()) throw new Error('Desktop notifications are available in the desktop app.');
  const plugin = await import('@tauri-apps/plugin-notification');
  return await plugin.isPermissionGranted() || await plugin.requestPermission() === 'granted';
}
export function inQuietHours(p: NotificationPreferences, date = new Date()) {
  if (!p.quiet_hours_enabled) return false;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: p.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const now = `${parts.find(v => v.type === 'hour')?.value}:${parts.find(v => v.type === 'minute')?.value}`;
    const start = p.quiet_hours_start?.slice(0, 5);
    const end = p.quiet_hours_end?.slice(0, 5);
    if (!start || !end) return false;
    return start <= end ? now >= start && now < end : now >= start || now < end;
  } catch { return true; }
}
export async function deliverDesktop(row: NotificationRecord, preferences: NotificationPreferences, stillCurrent: () => boolean) {
  if (!isDesktop() || !preferences.enabled || !preferences.desktop_enabled || inQuietHours(preferences) || (!preferences.desktop_when_focused && !document.hidden)) return;
  const category = preferences.category_settings[row.category];
  if (category === false || preferences.category_settings[row.type] === false) return;
  const plugin = await import('@tauri-apps/plugin-notification');
  if (!await plugin.isPermissionGranted() || !stillCurrent()) return;
  const desktop = await getDesktopPreferences();
  if (!desktop || desktop.notificationsPaused || !stillCurrent()) return;
  plugin.sendNotification({ title: preferences.desktop_preview ? row.title : 'Noska', body: preferences.desktop_preview ? row.body || row.message || '' : 'You have a new notification', extra: { notificationId: row.id }, silent: !preferences.desktop_sound });
}
export function validatePushSubscription(subscription: PushSubscriptionJSON) {
  const endpoint = subscription.endpoint;
  if (!endpoint || endpoint.length > 2048) throw new Error('Invalid push endpoint.');
  const url = new URL(endpoint);
  const allowed = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com', 'wns.windows.com'];
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.port || !allowed.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) throw new Error('Unsupported push provider.');
  if (!/^[A-Za-z0-9_-]{87}=?$/.test(subscription.keys?.p256dh || '') || !/^[A-Za-z0-9_-]{22}(==)?$/.test(subscription.keys?.auth || '')) throw new Error('Invalid push subscription keys.');
  if (subscription.expirationTime && subscription.expirationTime <= Date.now()) throw new Error('Push subscription has expired.');
  return { endpoint, p256dh: subscription.keys!.p256dh, auth: subscription.keys!.auth, expiration_time: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null };
}
export async function enableWebPush(userId: string, stillCurrent: () => boolean) {
  if (!deliveryCapabilities().find(c => c.channel === 'push')?.available) throw new Error('Web push is not configured in this build.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Browser notification permission was not granted.');
  if (!stillCurrent()) throw new Error('Your session changed.');
  const registration = await navigator.serviceWorker.register('/notification-sw.js');
  const ready = await navigator.serviceWorker.ready;
  const encoded = String(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY).replace(/-/g, '+').replace(/_/g, '/');
  const key = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  let subscription = await ready.pushManager.getSubscription();
  const created = !subscription;
  try {
    subscription ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const validated = validatePushSubscription(subscription.toJSON());
    if (!stillCurrent()) throw new Error('Your session changed.');
    const { error } = await notificationClient.from('push_subscriptions').upsert({ ...validated, user_id: userId, disabled_at: null, device_name: 'Web browser' }, { onConflict: 'user_id,endpoint' });
    if (error) throw error;
    registration.active?.postMessage({ type: 'noska:notification-user', userId });
  } catch (error) {
    if (created) await subscription?.unsubscribe();
    throw error;
  }
}
export async function revokeWebPush(userId: string) {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/notification-sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const { error } = await notificationClient.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint);
  if (error) throw error;
  if (!await subscription.unsubscribe()) throw new Error('Browser subscription could not be removed. Retry in browser settings.');
  registration?.active?.postMessage({ type: 'noska:notification-user', userId: null });
}
export async function clearBrowserDelivery() {
  if (!('serviceWorker' in navigator) || isNativeApp()) return;
  const registration = await navigator.serviceWorker.getRegistration('/notification-sw.js');
  registration?.active?.postMessage({ type: 'noska:notification-user', userId: null });
  const subscription = await registration?.pushManager.getSubscription();
  await subscription?.unsubscribe();
  const notices = await registration?.getNotifications();
  notices?.forEach(notice => notice.close());
}
