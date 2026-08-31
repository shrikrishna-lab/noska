import { supabase } from '../../lib/supabase';
import type { CollabNotification } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromNotifications = () => (supabase.from('collab_notifications' as any));

export async function sendNotification(userId: string, type: string, title: string, body?: string, pageId?: string, commentId?: string, fromUserId?: string, fromUserName?: string): Promise<void> {
  if (userId === fromUserId) return;

  const { error } = await fromNotifications()
    .insert({
      user_id: userId,
      type,
      title,
      body: body || null,
      page_id: pageId || null,
      comment_id: commentId || null,
      from_user_id: fromUserId || null,
      from_user_name: fromUserName || null,
    });

  if (error) console.warn('sendNotification error:', error);
}

export async function getNotifications(userId: string, unreadOnly = false): Promise<CollabNotification[]> {
  let query = fromNotifications()
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as CollabNotification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await fromNotifications()
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error || count === null) return 0;
  return count;
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  const { error } = await fromNotifications()
    .update({ read: true })
    .eq('id', notificationId);

  return !error;
}

export async function markAllAsRead(userId: string): Promise<boolean> {
  const { error } = await fromNotifications()
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  return !error;
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  const { error } = await fromNotifications()
    .delete()
    .eq('id', notificationId);

  return !error;
}

export function formatNotification(n: CollabNotification): string {
  const from = n.from_user_name || 'Someone';
  switch (n.type) {
    case 'comment': return `${from} commented on "${n.title}"`;
    case 'mention': return `${from} mentioned you in "${n.title}"`;
    case 'reply': return `${from} replied to your comment`;
    case 'invite': return `${from} invited you to collaborate on "${n.title}"`;
    case 'edit': return `${from} edited "${n.title}"`;
    case 'resolve': return `${from} resolved a comment on "${n.title}"`;
    case 'permission': return `${from} changed your permissions on "${n.title}"`;
    default: return n.title;
  }
}
