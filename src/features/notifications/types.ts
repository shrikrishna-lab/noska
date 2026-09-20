export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';
export type NotificationCategory = 'task' | 'mention' | 'comment' | 'ai' | 'automation' | 'invite' | 'broadcast' | 'system' | string;
export interface NotificationRecord {
  id: string;
  user_id: string;
  title: string;
  message?: string | null;
  body?: string | null;
  type: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  priority?: string;
  deduplication_key?: string | null;
  status: 'unread' | 'read' | 'archived';
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  page_id?: string | null;
  block_id?: string | null;
  comment_id?: string | null;
  action_url?: string | null;
  actor_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  grouping_key?: string | null;
  is_read?: boolean;
  is_archived?: boolean;
  metadata: Record<string, unknown>;
}
export interface NotificationCursor { created_at: string; id: string }
export interface NotificationMark { ids?: string[]; read?: boolean; archived?: boolean; all?: boolean }
export interface NotificationBroadcast {
  record?: NotificationRecord;
  old_record?: Partial<NotificationRecord>;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
}
export type PageNotificationMode = 'all' | 'mentions' | 'muted';
export interface NotificationPreferences {
  user_id: string;
  timezone: string;
  enabled: boolean;
  in_app_enabled: boolean;
  desktop_enabled: boolean;
  desktop_preview: boolean;
  desktop_sound: boolean;
  desktop_when_focused: boolean;
  quiet_hours_enabled: boolean;
  category_settings: Record<string, boolean>;
  push_enabled: boolean;
  email_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}
export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const isUnread = (n: NotificationRecord) => !n.read_at && !n.archived_at && n.status === 'unread';
export const isArchived = (n: NotificationRecord) => Boolean(n.archived_at) || n.status === 'archived';
export function validRecord(value: unknown, userId: string): value is NotificationRecord {
  if (!value || typeof value !== 'object') return false;
  const n = value as NotificationRecord;
  return isUuid(n.id) && n.user_id === userId && typeof n.title === 'string' && typeof n.created_at === 'string' && Number.isFinite(Date.parse(n.created_at)) && ['unread', 'read', 'archived'].includes(n.status);
}
