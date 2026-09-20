import { notificationClient } from './api';
import { isUuid } from './types';
export async function resolveNotificationIdentity(): Promise<string> {
  const existing = await notificationClient.from('notification_preferences').select('user_id').maybeSingle();
  if (existing.error) throw new Error('Notification identity could not be loaded.');
  if (isUuid(existing.data?.user_id)) return existing.data.user_id;
  const created = await notificationClient.from('notification_preferences').insert({}).select('user_id').single();
  if (!created.error && isUuid(created.data?.user_id)) return created.data.user_id;
  if (created.error?.code === '23505') {
    const retry = await notificationClient.from('notification_preferences').select('user_id').single();
    if (!retry.error && isUuid(retry.data?.user_id)) return retry.data.user_id;
  }
  throw new Error('Notifications are unavailable until your account identity is linked by the server.');
}
