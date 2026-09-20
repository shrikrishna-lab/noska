import { supabase, getAuthUserId } from '../../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export const WORKSPACE_LIMITS = { free: 1, pro: 3 } as const;
export type WorkspacePlan = keyof typeof WORKSPACE_LIMITS;

export interface WorkspaceRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceQuota {
  plan: WorkspacePlan;
  limit: number;
  used: number;
}

export class WorkspaceLimitError extends Error {
  quota: WorkspaceQuota;
  constructor(quota: WorkspaceQuota) {
    super(quota.plan === 'pro'
      ? `Pro workspaces are limited to ${quota.limit}. Delete one to create another.`
      : `Free accounts can create 1 workspace. Upgrade to Pro for up to ${WORKSPACE_LIMITS.pro}.`);
    this.name = 'WorkspaceLimitError';
    this.quota = quota;
  }
}

type Client = Pick<SupabaseClient, 'from' | 'rpc'>;

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export function isLimitError(error: unknown): boolean {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  return message.includes('WORKSPACE_LIMIT_REACHED');
}

export async function fetchWorkspaceQuota(client: Client = supabase): Promise<WorkspaceQuota> {
  const { data, error } = await client.rpc('my_workspace_quota');
  if (error) throw error;
  const quota = data as Partial<WorkspaceQuota> | null;
  const plan: WorkspacePlan = quota?.plan === 'pro' ? 'pro' : 'free';
  const limit = Number(quota?.limit);
  const used = Number(quota?.used);
  return {
    plan,
    limit: Number.isSafeInteger(limit) && limit > 0 ? limit : WORKSPACE_LIMITS[plan],
    used: Number.isSafeInteger(used) && used >= 0 ? used : 0,
  };
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

export async function createWorkspace(name: string, client: Client = supabase): Promise<WorkspaceRow> {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) throw new Error('Workspace name is required.');
  const userId = await getAuthUserId();
  if (!userId) throw new Error('Sign in to create a workspace.');
  const quota = await fetchWorkspaceQuota(client);
  if (quota.used >= quota.limit) throw new WorkspaceLimitError(quota);
  const { data, error } = await client.from('workspaces')
    .insert({ name: trimmed, owner_id: userId })
    .select('id,name,owner_id,created_at')
    .single();
  if (error) {
    if (isLimitError(error)) throw new WorkspaceLimitError(await fetchWorkspaceQuota(client));
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
