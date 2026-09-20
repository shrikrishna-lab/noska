import { notificationClient } from './api';
import type { NotificationPreferences, PageNotificationMode } from './types';
export function defaultPreferences(userId: string): NotificationPreferences {
  return { user_id: userId, enabled: true, in_app_enabled: true, desktop_enabled: true, desktop_preview: true, desktop_sound: true, desktop_when_focused: false, push_enabled: false, email_enabled: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', quiet_hours_enabled: false, quiet_hours_start: '22:00', quiet_hours_end: '08:00', category_settings: {} };
}
export async function loadPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await notificationClient.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return { ...defaultPreferences(userId), ...data };
}
export async function savePreferences(userId: string, patch: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  if (patch.timezone) new Intl.DateTimeFormat('en', { timeZone: patch.timezone }).format();
  const { data, error } = await notificationClient.from('notification_preferences').upsert({ ...patch, user_id: userId }, { onConflict: 'user_id' }).select('*').single();
  if (error) throw error;
  window.dispatchEvent(new CustomEvent('noska:notification-preferences-changed'));
  return data;
}
export async function loadPagePreference(userId: string, pageId: string): Promise<PageNotificationMode> {
  const { data, error } = await notificationClient.from('notification_page_preferences').select('mode').eq('user_id', userId).eq('page_id', pageId).maybeSingle();
  if (error) throw error;
  return data?.mode || 'all';
}
export async function savePagePreference(userId: string, pageId: string, mode: PageNotificationMode) {
  const { error } = await notificationClient.from('notification_page_preferences').upsert({ user_id: userId, page_id: pageId, mode }, { onConflict: 'user_id,page_id' });
  if (error) throw error;
}
