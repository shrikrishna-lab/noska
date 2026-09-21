import { supabase, getAuthUserId } from '../../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

type Client = Pick<SupabaseClient, 'from'>;

export interface WorkspaceRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  icon?: string;
  color?: string;
}

export class WorkspaceLimitError extends Error {
  code: string;
  upgradeRequired: boolean;
  constructor(message: string, code = 'WORKSPACE_LIMIT_REACHED') {
    super(message || 'Workspace limit reached for your plan.');
    this.name = 'WorkspaceLimitError';
    this.code = code;
    this.upgradeRequired = true;
  }
}

export interface CreateWorkspaceOptions {
  icon?: string | null;
  color?: string | null;
  client?: Client;
}

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const WORKSPACES_CACHE_KEY = 'noska_workspaces_cache';

function getLocalWorkspaces(): WorkspaceRow[] {
  try {
    const raw = localStorage.getItem(WORKSPACES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((r) => r && typeof r.id === 'string' && typeof r.name === 'string') : [];
  } catch {
    return [];
  }
}

function saveLocalWorkspaces(rows: WorkspaceRow[]): void {
  try {
    localStorage.setItem(WORKSPACES_CACHE_KEY, JSON.stringify(rows));
  } catch {}
}

export function isLimitError(error: unknown): boolean {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  return message.includes('WORKSPACE_LIMIT_REACHED') || code === 'LIMIT_EXCEEDED';
}

export async function listWorkspaces(client: Client = supabase): Promise<WorkspaceRow[]> {
  const localRows = getLocalWorkspaces();
  try {
    const userId = await getAuthUserId();
    if (userId) {
      const { data, error } = await client.from('workspaces')
        .select('id,name,owner_id,icon,color,created_at')
        .order('created_at', { ascending: true });
      if (!error && data) {
        const remoteRows = (data as WorkspaceRow[]).filter(row => row && isUuid(row.id));
        // Merge remote and local rows, preferring server icon & color when set.
        const map = new Map<string, WorkspaceRow>();
        localRows.forEach(r => map.set(r.id, r));
        remoteRows.forEach(r => {
          const existing = map.get(r.id);
          map.set(r.id, { ...r, icon: r.icon ?? existing?.icon, color: r.color ?? existing?.color });
        });
        const merged = Array.from(map.values()).sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        saveLocalWorkspaces(merged);
        return merged;
      }
    }
  } catch {
    // Graceful fallback to local cache
  }

  // Fallback: If local cache is empty, check if there is an active workspace name to initialize default
  if (localRows.length === 0) {
    try {
      const defaultName = localStorage.getItem("workspaceName") || "My Workspace";
      const defaultId = localStorage.getItem("activeWorkspaceId") || "00000000-0000-0000-0000-000000000001";
      const initial: WorkspaceRow = {
        id: defaultId,
        name: defaultName,
        owner_id: "local_user",
        created_at: new Date().toISOString()
      };
      saveLocalWorkspaces([initial]);
      return [initial];
    } catch {
      return [];
    }
  }

  return localRows;
}

export async function createWorkspaceRow(
  name: string,
  options?: { icon?: string; color?: string },
  client: Client = supabase
): Promise<WorkspaceRow> {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) throw new Error('Workspace name is required.');
  
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const localRow: WorkspaceRow = {
    id: newId,
    name: trimmed,
    owner_id: 'local_user',
    created_at: new Date().toISOString(),
    icon: options?.icon,
    color: options?.color,
  };

  try {
    const userId = await getAuthUserId();
    if (userId) {
      localRow.owner_id = userId;
      const { data, error } = await client.from('workspaces')
        .insert({ name: trimmed, owner_id: userId, icon: options?.icon ?? null, color: options?.color ?? null })
        .select('id,name,owner_id,icon,color,created_at')
        .single();
      if (error) {
        if (isLimitError(error)) throw new WorkspaceLimitError(error.message);
        // Supabase error: continue with local row to not block user
      } else if (data) {
        localRow.id = data.id;
        localRow.created_at = data.created_at;
        localRow.icon = (data as WorkspaceRow).icon ?? localRow.icon;
        localRow.color = (data as WorkspaceRow).color ?? localRow.color;
      }
    }
  } catch (err) {
    if (err instanceof WorkspaceLimitError) throw err;
    // Otherwise continue and save locally
  }

  // Save to local cache so it immediately shows up in workspace switcher
  const current = getLocalWorkspaces().filter(r => r.id !== localRow.id);
  current.push(localRow);
  saveLocalWorkspaces(current);

  return localRow;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  created_at?: string | null;
  user_name?: string | null;
  username?: string | null;
}

export async function listWorkspaceMembers(workspaceId: string, client: Client = supabase): Promise<WorkspaceMember[]> {
  if (!isUuid(workspaceId)) throw new Error('Invalid workspace.');
  const { data: members, error } = await client.from('workspace_members')
    .select('workspace_id,user_id,created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (members || []) as WorkspaceMember[];
  try {
    const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    if (ids.length) {
      const { data: profiles } = await client.from('user_profiles')
        .select('user_id,user_name,username')
        .in('user_id', ids);
      const byId = new Map(((profiles || []) as Array<{ user_id: string; user_name?: string | null; username?: string | null }>).map(p => [p.user_id, p]));
      for (const row of rows) {
        const profile = byId.get(row.user_id);
        if (profile) {
          row.user_name = profile.user_name ?? null;
          row.username = profile.username ?? null;
        }
      }
    }
  } catch {
    // Names are a convenience; membership itself is authoritative.
  }
  return rows;
}

export async function inviteWorkspaceMember(workspaceId: string, userId: string, client: Client = supabase): Promise<void> {
  if (!isUuid(workspaceId)) throw new Error('Invalid workspace.');
  const target = userId.trim();
  if (!target) throw new Error('Member is required.');
  const me = await getAuthUserId();
  if (!me) throw new Error('Sign in to invite members.');
  if (target === me) throw new Error('You already belong to this workspace.');
  const { error } = await client.from('workspace_members')
    .upsert({ workspace_id: workspaceId, user_id: target }, { onConflict: 'workspace_id,user_id' });
  if (error) throw error;
}

export async function removeWorkspaceMember(workspaceId: string, userId: string, client: Client = supabase): Promise<void> {
  if (!isUuid(workspaceId)) throw new Error('Invalid workspace.');
  const { error } = await client.from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function renameWorkspace(id: string, name: string, client: Client = supabase): Promise<void> {
  if (!isUuid(id)) throw new Error('Invalid workspace.');
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) throw new Error('Workspace name is required.');

  // Update local cache
  const current = getLocalWorkspaces();
  const target = current.find(r => r.id === id);
  if (target) {
    target.name = trimmed;
    saveLocalWorkspaces(current);
  }

  // Try updating in Supabase
  const { error } = await client.from('workspaces').update({ name: trimmed }).eq('id', id);
  if (error) throw error;
}

