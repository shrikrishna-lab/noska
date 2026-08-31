import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeCollab } from '../../lib/realtimeCollab';
import {
  getUserPermission,
  getPagePermissions,
  grantPermission,
  revokePermission,
  updateRole,
  sendInvite,
  canPerformAction,
} from './permissions';
import { joinCollabSession, leaveCollabSession, updateSessionStatus, getActiveSessions } from './session';
import { logActivity } from './activity';
import { createVersion, getVersions, shouldAutoVersion, canCreateVersion } from './versions';
import { getComments, addComment, resolveComment } from './comments';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from './notifications';
import type { DocumentPermission, CollabRole, CollabSession, VersionSnapshot, PageComment, CollabNotification, CollabUser } from './types';
import type { Block } from '../../../types/blocks';

export function useDocumentPermissions(pageId: string | null, userId: string | null) {
  const [permission, setPermission] = useState<DocumentPermission | null>(null);
  const [allPermissions, setAllPermissions] = useState<DocumentPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!pageId || !userId) { setLoading(false); return; }
    const [p, all] = await Promise.all([getUserPermission(pageId, userId), getPagePermissions(pageId)]);
    setPermission(p);
    setAllPermissions(all);
    setLoading(false);
  }, [pageId, userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const grant = useCallback(async (targetUserId: string, targetUserName: string, role: CollabRole) => {
    if (!pageId || !userId) return;
    await grantPermission(pageId, targetUserId, targetUserName, role, userId);
    logActivity(pageId, userId, '', 'permission_granted', `Granted ${role} access`);
    await refresh();
  }, [pageId, userId, refresh]);

  const revoke = useCallback(async (targetUserId: string) => {
    if (!pageId || !userId) return;
    await revokePermission(pageId, targetUserId);
    logActivity(pageId, userId, '', 'permission_revoked', 'Removed access');
    await refresh();
  }, [pageId, userId, refresh]);

  const changeRole = useCallback(async (targetUserId: string, newRole: CollabRole) => {
    if (!pageId || !userId) return;
    await updateRole(pageId, targetUserId, newRole);
    await refresh();
  }, [pageId, userId, refresh]);

  const invite = useCallback(async (inviteeUserId: string, inviteeUsername: string, role: CollabRole, inviterName: string) => {
    if (!pageId || !userId) return null;
    return sendInvite(pageId, '', userId, inviterName, inviteeUserId, inviteeUsername, role);
  }, [pageId, userId]);

  return {
    permission,
    allPermissions,
    loading,
    isOwner: permission?.role === 'owner',
    isAdmin: permission?.role === 'owner' || permission?.role === 'admin',
    canEdit: canPerformAction(permission, 'can_edit'),
    canComment: canPerformAction(permission, 'can_comment'),
    canShare: canPerformAction(permission, 'can_share'),
    canDelete: canPerformAction(permission, 'can_delete'),
    canManageCollaborators: canPerformAction(permission, 'can_manage_collaborators'),
    canExport: canPerformAction(permission, 'can_export'),
    canUseAi: canPerformAction(permission, 'can_use_ai'),
    grant, revoke, changeRole, invite, refresh,
  };
}

export function useCollabSession(pageId: string | null, userId: string | null) {
  const [sessions, setSessions] = useState<CollabSession[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!pageId || !userId) return;

    let mounted = true;
    let pollInterval: ReturnType<typeof setInterval>;

    const join = async () => {
      await joinCollabSession(pageId, userId);
      if (mounted) setIsJoined(true);

      const active = await getActiveSessions(pageId);
      if (mounted) setSessions(active);
    };

    join();

    pollInterval = setInterval(async () => {
      if (!mounted) return;
      const active = await getActiveSessions(pageId);
      if (mounted) {
        setSessions(active);
        setTick(t => t + 1);
      }
    }, 20_000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      leaveCollabSession(pageId, userId);
    };
  }, [pageId, userId]);

  const updateStatus = useCallback(async (status: string, blockId?: string) => {
    if (!pageId || !userId) return;
    await updateSessionStatus(pageId, userId, status, blockId);
  }, [pageId, userId]);

  const otherUsers = sessions.filter(s => s.user_id !== userId);

  return { sessions, otherUsers, isJoined, updateStatus, count: otherUsers.length + 1 };
}

export function usePresenceUsers(pageId: string | null) {
  const [users, setUsers] = useState<CollabUser[]>([]);

  useEffect(() => {
    if (!pageId) return;

    const unsub = realtimeCollab.on('presence:sync', (data) => {
      if (data.pageId === pageId) {
        setUsers(data.users.map((u) => ({
          userId: u.id,
          userName: (u.userName as string) || 'Anonymous',
          userAvatar: (u.userAvatar as string) || '',
          userColor: (u.userColor as string) || '#999',
          status: (u.status as string) || 'viewing',
          currentBlockId: u.currentBlockId as string | null | undefined,
          onlineAt: (u.onlineAt as number) || Date.now(),
        })));
      }
    });

    return unsub;
  }, [pageId]);

  return users;
}

export function useCursors(pageId: string | null) {
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number; userName: string; userColor: string; targetBlockId?: string | null }>>(new Map());
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!pageId) return;

    const unsub = realtimeCollab.on('cursor:move', (data) => {
      if (data.pageId !== pageId) return;

      setCursors(prev => {
        const next = new Map(prev);
        next.set(data.userId, {
          x: data.x,
          y: data.y,
          userName: (data as Record<string, unknown>).userName as string || '',
          userColor: (data as Record<string, unknown>).userColor as string || '#999',
          targetBlockId: data.targetBlockId,
        });
        return next;
      });

      const existing = timeoutRefs.current.get(data.userId);
      if (existing) clearTimeout(existing);
      const timeout = setTimeout(() => {
        setCursors(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
        timeoutRefs.current.delete(data.userId);
      }, 10_000);
      timeoutRefs.current.set(data.userId, timeout);
    });

    const removeUnsub = realtimeCollab.on('cursor:remove', (data) => {
      if (data.pageId !== pageId) return;
      setCursors(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    return () => { unsub(); removeUnsub(); };
  }, [pageId]);

  return cursors;
}

export function useSelections(pageId: string | null) {
  const [selections, setSelections] = useState<Map<string, { blockId?: string; startOffset?: number; endOffset?: number; text?: string; userName: string; userColor: string }>>(new Map());

  useEffect(() => {
    if (!pageId) return;

    const unsub = realtimeCollab.on('selection:change', (data) => {
      if (data.pageId !== pageId) return;
      setSelections(prev => {
        const next = new Map(prev);
        if (!data.blockId) {
          next.delete(data.userId);
        } else {
          next.set(data.userId, {
            blockId: data.blockId as string,
            startOffset: data.startOffset as number | undefined,
            endOffset: data.endOffset as number | undefined,
            text: data.text as string | undefined,
            userName: (data as Record<string, unknown>).userName as string || '',
            userColor: (data as Record<string, unknown>).userColor as string || '#999',
          });
        }
        return next;
      });
    });

    return unsub;
  }, [pageId]);

  return selections;
}

export function useAutoVersion(pageId: string | null, userId: string | null, userName: string, blocks: Block[]) {
  const lastBlocksRef = useRef<string>('');

  useEffect(() => {
    if (!pageId || !userId || blocks.length === 0) return;

    const blocksJson = JSON.stringify(blocks);
    if (blocksJson === lastBlocksRef.current) return;
    lastBlocksRef.current = blocksJson;

    if (shouldAutoVersion([]) && canCreateVersion()) {
      createVersion(pageId, userId, userName, blocks, 'Auto-save');
    }
  }, [pageId, userId, userName, blocks]);
}

export function useComments(pageId: string | null) {
  const [comments, setComments] = useState<PageComment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!pageId) { setLoading(false); return; }
    const data = await getComments(pageId);
    setComments(data);
    setLoading(false);
  }, [pageId]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (userId: string, userName: string, content: string, blockId?: string, userAvatar?: string) => {
    if (!pageId) return null;
    const comment = await addComment(pageId, userId, userName, content, blockId, undefined, userAvatar);
    if (comment) await refresh();
    return comment;
  }, [pageId, refresh]);

  const resolve = useCallback(async (commentId: string, userId: string) => {
    const ok = await resolveComment(commentId, userId);
    if (ok) await refresh();
    return ok;
  }, [refresh]);

  return { comments, loading, add, resolve, refresh };
}

export function useVersions(pageId: string | null) {
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!pageId) { setLoading(false); return; }
    const data = await getVersions(pageId);
    setVersions(data);
    setLoading(false);
  }, [pageId]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (userId: string, userName: string, blocks: Block[], title?: string, description?: string) => {
    if (!pageId) return null;
    return createVersion(pageId, userId, userName, blocks, title, description);
  }, [pageId]);

  return { versions, loading, save, refresh };
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<CollabNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [n, c] = await Promise.all([getNotifications(userId), getUnreadCount(userId)]);
    setNotifications(n);
    setUnreadCount(c);
  }, [userId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    await markAsRead(id);
    await refresh();
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await markAllAsRead(userId);
    await refresh();
  }, [userId, refresh]);

  return { notifications, unreadCount, markRead, markAllRead, refresh };
}
