import { notificationStore } from '../notifications/api';
import { isArchived, isUnread } from '../notifications/types';
import type { CollabNotification } from './types';
export async function sendNotification(_userId: string, _type: string, _title: string, _body?: string, _pageId?: string, _commentId?: string, _fromUserId?: string, _fromUserName?: string): Promise<void> {
  await notificationStore.refresh();
}
export async function getNotifications(userId: string, unreadOnly = false): Promise<CollabNotification[]> {
  if (notificationStore.getSnapshot().userId !== userId) return [];
  await notificationStore.refresh();
  return notificationStore.getSnapshot().notifications.filter(n => !isArchived(n) && (!unreadOnly || isUnread(n))).map(n => ({ id: n.id, user_id: n.user_id, type: n.type, title: n.title, body: n.body || '', page_id: n.page_id || undefined, read: !isUnread(n), created_at: n.created_at }));
}
export async function getUnreadCount(userId: string) {
  if (notificationStore.getSnapshot().userId !== userId) return 0;
  await notificationStore.refreshCount();
  return notificationStore.getSnapshot().unreadCount;
}
export const markAsRead = (id: string) => notificationStore.markRead(id);
export const markAllAsRead = (userId: string) => notificationStore.getSnapshot().userId === userId ? notificationStore.markAllRead() : Promise.resolve(false);
export const deleteNotification = (id: string) => notificationStore.dismiss(id);
export function formatNotification(n: CollabNotification): string { return n.title; }
