import { supabase, getAuthUserId } from '../../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface WorkspaceRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
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

type Client = Pick<SupabaseClient, 'from'>;

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export function isLimitError(error: unknown): boolean {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  return message.includes('WORKSPACE_LIMIT_REACHED') || code === 'LIMIT_EXCEEDED';
}

export async function listWorkspaces(client: Client = supabase): Promise<WorkspaceRow[]> {
  const userId = await getAuthUserId();
  if (!userId) return [];
  const { data, error } = await client.from('workspaces')
    .select('id,name,owner_id,created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data || []) as WorkspaceRow[]).filter(row => row && isUuid(row.id));
}

export async function createWorkspaceRow(name: string, client: Client = supabase): Promise<WorkspaceRow> {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) throw new Error('Workspace name is required.');
  const userId = await getAuthUserId();
  if (!userId) throw new Error('Sign in to create a workspace.');
  const { data, error } = await client.from('workspaces')
    .insert({ name: trimmed, owner_id: userId })
    .select('id,name,owner_id,created_at')
    .single();
  if (error) {
    if (isLimitError(error)) throw new WorkspaceLimitError(error.message);
    throw error;
  }
  return data as WorkspaceRow;
}

export async function renameWorkspace(id: string, name: string, client: Client = supabase): Promise<void> {
  if (!isUuid(id)) throw new Error('Invalid workspace.');
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) throw new Error('Workspace name is required.');
  const { error } = await client.from('workspaces').update({ name: trimmed }).eq('id', id);
  if (error) throw error;
}
