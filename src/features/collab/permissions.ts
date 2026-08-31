import { supabase } from '../../lib/supabase';
import type { DocumentPermission, CollabRole, PageInvite } from './types';

const ROLE_HIERARCHY: Record<CollabRole, number> = {
  owner: 100,
  admin: 80,
  editor: 60,
  commenter: 40,
  viewer: 20,
};

const DEFAULT_PERMISSIONS: Record<CollabRole, Pick<DocumentPermission, 'can_view' | 'can_edit' | 'can_comment' | 'can_share' | 'can_delete' | 'can_audit' | 'can_manage_collaborators' | 'can_export' | 'can_use_ai'>> = {
  owner: { can_view: true, can_edit: true, can_comment: true, can_share: true, can_delete: true, can_audit: true, can_manage_collaborators: true, can_export: true, can_use_ai: true },
  admin: { can_view: true, can_edit: true, can_comment: true, can_share: true, can_delete: true, can_audit: true, can_manage_collaborators: true, can_export: true, can_use_ai: true },
  editor: { can_view: true, can_edit: true, can_comment: true, can_share: false, can_delete: false, can_audit: false, can_manage_collaborators: false, can_export: true, can_use_ai: true },
  commenter: { can_view: true, can_edit: false, can_comment: true, can_share: false, can_delete: false, can_audit: false, can_manage_collaborators: false, can_export: false, can_use_ai: false },
  viewer: { can_view: true, can_edit: false, can_comment: false, can_share: false, can_delete: false, can_audit: false, can_manage_collaborators: false, can_export: false, can_use_ai: false },
};

export function getDefaultPermissions(role: CollabRole) {
  return { ...DEFAULT_PERMISSIONS[role] };
}

export function roleLevel(role: CollabRole): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

export function canPerformAction(permission: DocumentPermission | null, action: keyof Pick<DocumentPermission, 'can_view' | 'can_edit' | 'can_comment' | 'can_share' | 'can_delete' | 'can_audit' | 'can_manage_collaborators' | 'can_export' | 'can_use_ai'>): boolean {
  if (!permission) return false;
  return permission[action] === true;
}

export async function getUserPermission(pageId: string, userId: string): Promise<DocumentPermission | null> {
  const { data, error } = await supabase
    .from('page_permissions')
    .select('*')
    .eq('page_id', pageId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as unknown as DocumentPermission;
}

export async function getPagePermissions(pageId: string): Promise<DocumentPermission[]> {
  const { data, error } = await supabase
    .from('page_permissions')
    .select('*')
    .eq('page_id', pageId);

  if (error || !data) return [];
  return data as unknown as DocumentPermission[];
}

export async function grantPermission(pageId: string, userId: string, userName: string, role: CollabRole, grantedBy: string): Promise<DocumentPermission | null> {
  const permissions = getDefaultPermissions(role);
  const { data, error } = await supabase
    .from('page_permissions')
    .upsert({
      page_id: pageId,
      user_id: userId,
      user_name: userName,
      role,
      ...permissions,
    }, { onConflict: 'page_id,user_id' })
    .select()
    .single();

  if (error) {
    console.warn('grantPermission error:', error);
    return null;
  }
  return data as unknown as DocumentPermission;
}

export async function revokePermission(pageId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('page_permissions')
    .delete()
    .eq('page_id', pageId)
    .eq('user_id', userId);

  return !error;
}

export async function updateRole(pageId: string, userId: string, newRole: CollabRole): Promise<boolean> {
  const permissions = getDefaultPermissions(newRole);
  const { error } = await supabase
    .from('page_permissions')
    .update({ role: newRole, ...permissions })
    .eq('page_id', pageId)
    .eq('user_id', userId);

  return !error;
}

export async function sendInvite(pageId: string, pageTitle: string, inviterId: string, inviterName: string, inviteeUserId: string, inviteeUsername: string, role: CollabRole): Promise<PageInvite | null> {
  const { data, error } = await supabase
    .from('page_invites')
    .insert({
      page_id: pageId,
      page_title: pageTitle,
      inviter_user_id: inviterId,
      inviter_username: inviterName,
      invitee_user_id: inviteeUserId,
      invitee_username: inviteeUsername,
      role,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.warn('sendInvite error:', error);
    return null;
  }
  return data as unknown as PageInvite;
}

export async function respondToInvite(inviteId: string, accept: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('page_invites')
    .update({ status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
    .eq('id', inviteId);

  return !error;
}

export async function getPageInvites(pageId: string): Promise<PageInvite[]> {
  const { data, error } = await supabase
    .from('page_invites')
    .select('*')
    .eq('page_id', pageId)
    .eq('status', 'pending');

  if (error || !data) return [];
  return data as unknown as PageInvite[];
}

export async function getUserPendingInvites(userId: string): Promise<PageInvite[]> {
  const { data, error } = await supabase
    .from('page_invites')
    .select('*')
    .eq('invitee_user_id', userId)
    .eq('status', 'pending');

  if (error || !data) return [];
  return data as unknown as PageInvite[];
}
