import type { Block } from '../../../types/blocks';

export type CollabRole = 'owner' | 'admin' | 'editor' | 'commenter' | 'viewer';

export interface DocumentPermission {
  id: string;
  page_id: string;
  user_id: string;
  user_name: string;
  role: CollabRole;
  can_view: boolean;
  can_edit: boolean;
  can_comment: boolean;
  can_share: boolean;
  can_delete: boolean;
  can_audit: boolean;
  can_manage_collaborators: boolean;
  can_export: boolean;
  can_use_ai: boolean;
  created_at: string;
  updated_at: string;
}

export interface PageInvite {
  id: string;
  page_id: string;
  page_title?: string;
  inviter_user_id: string;
  inviter_username?: string;
  invitee_user_id: string;
  invitee_username?: string;
  role: string;
  status: string;
  created_at: string;
  responded_at?: string;
}

export interface AIReviewDiff {
  id: string;
  pageId: string;
  blockId: string;
  originalText: string;
  revisedText: string;
  userId: string;
  createdAt?: string;
  status?: "pending" | "accepted" | "rejected";
  conflictDetected?: boolean;
  conflictDetails?: string;
  addedBlockIds?: string[];
  modifiedBlockIds?: string[];
  deletedBlockIds?: string[];
  proposedBlocks?: Array<{ id: string; text?: string; properties?: any }>;
}

export interface CollabUser {
  userId: string;
  userName: string;
  userAvatar: string;
  userColor: string;
  status: string;
  currentBlockId?: string | null;
  onlineAt: number;
}

export interface CollabSession {
  id: string;
  page_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  user_color: string;
  status: string;
  current_block_id?: string;
  last_activity: string;
  started_at: string;
  updated_at: string;
}

export interface BlockLock {
  id: string;
  page_id: string;
  block_id: string;
  user_id: string;
  user_name: string;
  user_color: string;
  acquired_at: string;
  expires_at: string;
}

export interface PageComment {
  id: string;
  page_id: string;
  block_id?: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  parent_comment_id?: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  mentions: string[];
  reactions: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

export interface CollabNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string;
  page_id?: string;
  comment_id?: string;
  from_user_id?: string;
  from_user_name?: string;
  read: boolean;
  created_at: string;
}

export interface CollabActivityEntry {
  id: string;
  page_id: string;
  user_id: string;
  user_name: string;
  action: string;
  detail?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BlockChange {
  blockId: string;
  type: 'update' | 'insert' | 'delete' | 'move';
  block?: Block;
  previousBlock?: Block;
  userId: string;
  timestamp: number;
}

export interface VersionSnapshot {
  id: string;
  page_id: string;
  version_number: number;
  title: string;
  blocks: Block[];
  page_snapshot: Record<string, unknown>;
  user_id: string;
  user_name: string;
  description: string;
  created_at: string;
}

export interface CursorPosition {
  userId: string;
  userName: string;
  userAvatar: string;
  userColor: string;
  x: number;
  y: number;
  targetBlockId?: string | null;
  timestamp: number;
}

export interface SelectionState {
  userId: string;
  userName: string;
  userColor: string;
  blockId?: string;
  startOffset?: number;
  endOffset?: number;
  text?: string;
  timestamp: number;
}
