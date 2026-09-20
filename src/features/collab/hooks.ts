import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
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
import { createVersion, getVersions, canCreateVersion } from './versions';
import { getComments, addComment, resolveComment, unresolveComment, deleteComment } from './comments';
import { sendNotification } from './notifications';
import { useNotificationPlatform } from '../notifications/Provider';
import { isArchived, isUnread } from '../notifications/types';
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

  const grant = useCallback(async (targetUserId: string, targetUserName: string, role: CollabRole, inviterName?: string) => {
    if (!pageId || !userId) return;
    await grantPermission(pageId, targetUserId, targetUserName, role, userId);
    logActivity(pageId, userId, inviterName || '', 'permission_granted', `Granted ${role} access to ${targetUserName || targetUserId}`);
    // Push an invite alert so the invitee sees it live (realtime
    // subscription on collab_notifications) and in their Alerts tab.
    await sendNotification(
      targetUserId,
      'invite',
      'You were invited to collaborate',
      `${inviterName || 'Someone'} invited you as ${role}. Open the shared page to start collaborating.`,
      pageId,
      undefined,
      userId,
      inviterName,
    );
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
          // Accept both full and legacy short field names from older clients
          userName: ((u.userName as string) || (u.name as string)) || 'Anonymous',
          userAvatar: ((u.userAvatar as string) || (u.avatar as string)) || '',
          userColor: ((u.userColor as string) || (u.color as string)) || '#999',
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
          // Accept both startOffset/endOffset and legacy start/end spellings
          const start = (data.startOffset ?? data.start) as number | undefined;
          const end = (data.endOffset ?? data.end) as number | undefined;
          next.set(data.userId, {
            blockId: data.blockId as string,
            startOffset: start,
            endOffset: end,
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
  const lastIdsRef = useRef<string>('');

  useEffect(() => {
    if (!pageId || !userId || blocks.length === 0) return;

    const blocksJson = JSON.stringify(blocks);
    if (blocksJson === lastBlocksRef.current) return;
    const isFirstLoad = lastBlocksRef.current === '';
    lastBlocksRef.current = blocksJson;
    if (isFirstLoad) return;

    // Structural change (block added/removed/reordered) → version immediately
    // (cooldown still applies). Text-only edits → version at most once per
    // cooldown window so rapid typing doesn't spam snapshots.
    const ids = blocks.map(b => b.id).join(',');
    const structural = ids !== lastIdsRef.current;
    lastIdsRef.current = ids;

    if (canCreateVersion()) {
      createVersion(pageId, userId, userName, blocks, structural ? 'Structural change' : 'Auto-save');
    }
  }, [pageId, userId, userName, blocks]);
}

function useCoalescedRefresh<T>(identity: string | null, load: () => Promise<T>, apply: (data: T) => void, reset: () => void) {
  const current = useRef<object | null>(null);
  const controller = useMemo(() => {
    let active = false;
    let generation = 0;
    let queued = false;
    let pending: Promise<void> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const token = {};
    const isCurrent = () => active && current.current === token;
    const refresh = (): Promise<void> => {
      if (!identity || !isCurrent()) return Promise.resolve();
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      queued = true;
      if (pending) return pending;
      pending = (async () => {
        while (queued && isCurrent()) {
          queued = false;
          try {
            const requestGeneration = generation;
            const data = await load();
            if (isCurrent() && generation === requestGeneration) apply(data);
          } catch (err) {
            if (isCurrent()) console.warn("Collaboration refresh failed:", err);
          }
        }
      })().finally(() => { pending = null; });
      return pending;
    };
    const schedule = () => {
      if (!identity || !isCurrent()) return;
      if (pending) {
        queued = true;
      } else if (timer === null) {
        timer = setTimeout(() => {
          timer = null;
          void refresh();
        }, 100);
      }
    };
    return {
      token,
      refresh,
      schedule,
      start: () => {
        active = true;
        reset();
        void refresh();
      },
      stop: () => {
        active = false;
        generation++;
        queued = false;
        if (timer !== null) clearTimeout(timer);
        timer = null;
      },
    };
  }, [identity, load, apply, reset]);
  current.current = controller.token;
  useEffect(() => {
    controller.start();
    return controller.stop;
  }, [controller]);
  return controller;
}

export function useComments(pageId: string | null) {
  const [comments, setComments] = useState<PageComment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => getComments(pageId!), [pageId]);
  const apply = useCallback((data: PageComment[]) => {
    setComments(data);
    setLoading(false);
  }, []);
  const reset = useCallback(() => {
    setComments([]);
    setLoading(Boolean(pageId));
  }, [pageId]);
  const { refresh, schedule } = useCoalescedRefresh(pageId, load, apply, reset);

  // Live updates: other collaborators' comments/resolve states appear
  // instantly instead of only after a panel remount.
  useEffect(() => {
    if (!pageId) return;
    const channel = supabase
      .channel(`comments:${pageId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'page_comments', filter: `page_id=eq.${pageId}` },
        schedule,
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pageId, schedule]);

  const add = useCallback(async (userId: string, userName: string, content: string, blockId?: string, userAvatar?: string) => {
    if (!pageId) return null;
    const comment = await addComment(pageId, userId, userName, content, blockId, undefined, userAvatar);
    if (comment) await refresh();
    return comment;
  }, [pageId, refresh]);

  const remove = useCallback(async (commentId: string) => {
    const ok = await deleteComment(commentId);
    if (ok) await refresh();
    return ok;
  }, [refresh]);

  const resolve = useCallback(async (commentId: string, userId: string) => {
    const ok = await resolveComment(commentId, userId);
    if (ok) await refresh();
    return ok;
  }, [refresh]);

  const unresolve = useCallback(async (commentId: string) => {
    const ok = await unresolveComment(commentId);
    if (ok) await refresh();
    return ok;
  }, [refresh]);

  return { comments, loading, add, remove, resolve, unresolve, refresh };
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

export function useNotifications(_userId: string | null) {
  const platform = useNotificationPlatform();
  const notifications: CollabNotification[] = platform.notifications.filter(n => !isArchived(n)).map(n => ({
    id: n.id, user_id: n.user_id, type: n.type, title: n.title, body: n.body || n.message || '',
    page_id: n.page_id || undefined, comment_id: n.comment_id || (typeof n.metadata?.comment_id === 'string' ? n.metadata.comment_id : undefined),
    from_user_id: n.actor_id || undefined, from_user_name: typeof n.metadata?.actor_name === 'string' ? n.metadata.actor_name : undefined,
    read: !isUnread(n), created_at: n.created_at,
  }));
  return { ...platform, notifications };
}

/**
 * Whether a page is "public" for collaboration purposes: at least one
 * non-owner permission row exists (someone was invited/granted access).
 * Private pages (no collaborator rows) must not expose presence — no
 * online list, cursors, or typing indicators. Re-checked periodically so
 * revoking the last invite flips the page back to private everywhere.
 */
export function usePageIsShared(pageId: string | null): boolean {
  const [isShared, setIsShared] = useState(false);

  useEffect(() => {
    if (!pageId) { setIsShared(false); return; }
    let mounted = true;

    const check = async () => {
      const rows = await getPagePermissions(pageId);
      if (mounted) setIsShared(rows.some(r => r.role !== 'owner'));
    };
    check();
    const interval = setInterval(check, 60_000);

    return () => { mounted = false; clearInterval(interval); };
  }, [pageId]);

  return isShared;
}
