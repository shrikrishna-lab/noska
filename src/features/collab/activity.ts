import { supabase } from '../../lib/supabase';
import type { CollabActivityEntry } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromActivity = () => (supabase.from('collab_activity' as any));

export async function logActivity(
  pageId: string,
  userId: string,
  userName: string,
  action: string,
  detail?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await fromActivity()
    .insert({
      page_id: pageId,
      user_id: userId,
      user_name: userName,
      action,
      detail: detail || null,
      metadata: metadata || {},
    });

  if (error) console.warn('logActivity error:', error);
}

export async function getActivity(pageId: string, limit = 50, offset = 0): Promise<CollabActivityEntry[]> {
  const { data, error } = await fromActivity()
    .select('*')
    .eq('page_id', pageId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return [];
  return data as unknown as CollabActivityEntry[];
}

export async function getRecentActivityForUser(userId: string, limit = 20): Promise<CollabActivityEntry[]> {
  const { data, error } = await fromActivity()
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as CollabActivityEntry[];
}

export function formatAction(entry: CollabActivityEntry): string {
  const name = entry.user_name || 'Someone';
  switch (entry.action) {
    case 'page_created': return `${name} created this page`;
    case 'page_shared': return `${name} shared this page`;
    case 'page_edited': return `${name} edited this page`;
    case 'comment_added': return `${name} added a comment`;
    case 'comment_resolved': return `${name} resolved a comment`;
    case 'block_edited': return `${name} edited a block`;
    case 'block_added': return `${name} added a block`;
    case 'block_deleted': return `${name} deleted a block`;
    case 'version_restored': return `${name} restored a version`;
    case 'permission_granted': return `${name} granted access to someone`;
    case 'permission_revoked': return `${name} removed someone's access`;
    case 'collaborator_joined': return `${name} joined as a collaborator`;
    case 'collaborator_left': return `${name} left the collaboration`;
    default: return `${name} did something`;
  }
}
