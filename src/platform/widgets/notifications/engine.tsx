import React from 'react';
import { useNotificationPlatform } from '../../../features/notifications/Provider';
import { isArchived, isUnread, type NotificationRecord } from '../../../features/notifications/types';
import type { WidgetRuntimeContext } from '../types';
export type { NotificationCategory, NotificationSeverity } from '../../../features/notifications/types';
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  category: NotificationRecord['category'];
  severity: NotificationRecord['severity'];
  at: string;
  read: boolean;
  pageId?: string;
  blockId?: string;
  isTest?: boolean;
  source?: 'server';
}
export function NotificationProvider({ children }: { children: React.ReactNode; ctx: WidgetRuntimeContext }) {
  return <>{children}</>;
}
export function useNotifications() {
  const platform = useNotificationPlatform();
  const notifications: AppNotification[] = platform.notifications.filter(n => !isArchived(n)).map(n => ({
    id: n.id, title: n.title, body: n.body || n.message || '', category: n.category, severity: n.severity,
    at: n.created_at, read: !isUnread(n), pageId: n.page_id || undefined,
    blockId: n.block_id || (typeof n.metadata?.block_id === 'string' ? n.metadata.block_id : undefined),
    isTest: n.metadata?.is_test === true, source: 'server',
  }));
  return { ...platform, notifications, push: async (_n: Omit<AppNotification, 'at' | 'read'>, _opts?: { native?: boolean }) => { await platform.refresh(); } };
}
