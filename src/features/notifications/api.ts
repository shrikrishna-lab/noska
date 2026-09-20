import type { SupabaseClient } from '@supabase/supabase-js';
import { currentAccessToken, supabase } from '../../lib/supabase';
import { NotificationStore, type NotificationTransport } from './store';
import { isUuid, type NotificationRecord } from './types';

export const notificationClient: SupabaseClient = supabase;
export const notificationTransport: NotificationTransport = {
  async list(userId, cursor) {
    if (!isUuid(userId)) throw new Error('Sign in to view notifications.');
    let query = notificationClient.from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(40);
    if (cursor) {
      if (!isUuid(cursor.id) || !Number.isFinite(Date.parse(cursor.created_at))) throw new Error('Invalid notification cursor.');
      const timestamp = new Date(cursor.created_at).toISOString();
      query = query.or(`created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lt.${cursor.id})`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as NotificationRecord[];
  },
  async count() {
    const { data, error } = await notificationClient.rpc('notification_unread_count');
    if (error) throw error;
    const count = Number(data);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid unread count.');
    return count;
  },
  async mark(change) {
    if (change.ids?.some(id => !isUuid(id))) throw new Error('Invalid notification.');
    const { error } = await notificationClient.rpc('notification_mark', {
      p_ids: change.ids || [], p_read: change.read ?? null,
      p_archived: change.archived ?? null, p_all: change.all ?? false,
    });
    if (error) throw error;
  },
  subscribe(userId, receive, status) {
    let stopped = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const authenticate = async () => {
      const token = await currentAccessToken();
      if (stopped) return false;
      if (!token) throw new Error('Authentication required.');
      await supabase.realtime.setAuth(token);
      return !stopped;
    };
    void authenticate().then(ready => {
      if (!ready) return;
      channel = supabase.channel(`notifications:user:${userId}`, { config: { private: true } })
        .on('broadcast', { event: 'notification' }, ({ payload }) => { if (!stopped) receive(payload); })
        .subscribe(value => { if (!stopped) status(value === 'SUBSCRIBED'); });
    }).catch(() => { if (!stopped) status(false); });
    const timer = setInterval(() => { void authenticate().catch(() => { if (!stopped) status(false); }); }, 50_000);
    return () => { stopped = true; clearInterval(timer); if (channel) void supabase.removeChannel(channel); };
  },
};
export const notificationStore = new NotificationStore(notificationTransport);

export async function requestFeatureNotificationRefresh(): Promise<void> {
  await notificationStore.refresh();
}
