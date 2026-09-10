import { supabase } from '../../lib/supabase';
import { realtimeCollab } from '../../lib/realtimeCollab';
import type { CollabSession } from './types';
import { logActivity } from './activity';

let currentSessionPageId: string | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export async function joinCollabSession(pageId: string, userId: string): Promise<CollabSession | null> {
  if (currentSessionPageId === pageId) return null;

  if (currentSessionPageId) {
    await leaveCollabSession(currentSessionPageId, userId);
  }

  const user = realtimeCollab.getUser();
  const { data, error } = await supabase
    .from('collaboration_sessions')
    .insert({
      page_id: pageId,
      user_id: userId,
      user_name: user.userName,
      user_avatar: user.userAvatar,
      user_color: user.userColor,
      status: 'active',
      last_activity: new Date().toISOString(),
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.warn('joinCollabSession error:', error);
    return null;
  }

  currentSessionPageId = pageId;
  realtimeCollab.joinPage(pageId);
  realtimeCollab.updateStatus(pageId, 'viewing');

  startHeartbeat(pageId, userId);

  logActivity(pageId, userId, user.userName, 'collaborator_joined');

  return data as unknown as CollabSession;
}

export async function leaveCollabSession(pageId: string, userId: string): Promise<void> {
  stopHeartbeat();

  realtimeCollab.leavePage(pageId);

  const user = realtimeCollab.getUser();
  const { error } = await supabase
    .from('collaboration_sessions')
    .delete()
    .eq('page_id', pageId)
    .eq('user_id', userId);

  if (error) console.warn('leaveCollabSession error:', error);

  if (currentSessionPageId === pageId) {
    currentSessionPageId = null;
  }

  logActivity(pageId, userId, user.userName, 'collaborator_left');
}

export async function updateSessionStatus(pageId: string, userId: string, status: string, blockId?: string): Promise<void> {
  realtimeCollab.updateStatus(pageId, status, blockId);

  const { error } = await supabase
    .from('collaboration_sessions')
    .update({
      status,
      current_block_id: blockId || null,
      last_activity: new Date().toISOString(),
    })
    .eq('page_id', pageId)
    .eq('user_id', userId);

  if (error) console.warn('updateSessionStatus error:', error);
}

export async function getActiveSessions(pageId: string): Promise<CollabSession[]> {
  const staleThreshold = new Date(Date.now() - 30_000).toISOString();

  await supabase
    .from('collaboration_sessions')
    .delete()
    .lt('last_activity', staleThreshold)
    .eq('page_id', pageId);

  const { data, error } = await supabase
    .from('collaboration_sessions')
    .select('*')
    .eq('page_id', pageId)
    .gte('last_activity', staleThreshold)
    .order('started_at', { ascending: true });

  if (error || !data) return [];
  return data as unknown as CollabSession[];
}

function startHeartbeat(pageId: string, userId: string): void {
  stopHeartbeat();
  heartbeatInterval = setInterval(async () => {
    const { error } = await supabase
      .from('collaboration_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('page_id', pageId)
      .eq('user_id', userId);

    if (error) console.warn('heartbeat error:', error);
  }, 15_000);
}

function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

export function getCurrentSessionPageId(): string | null {
  return currentSessionPageId;
}
