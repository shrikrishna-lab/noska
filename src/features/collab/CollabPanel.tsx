import React, { useState, useEffect } from 'react';
import { useDocumentPermissions, useCollabSession, useComments, useVersions, useNotifications, usePresenceUsers } from './hooks';
import { formatAction } from './activity';
import { searchUsersByUsername, type UserSearchResult } from '../../lib/supabaseService';
import type { CollabActivityEntry, CollabRole, CollabSession, DocumentPermission } from './types';

interface CollabPanelProps {
  pageId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  className?: string;
  notificationCommentId?: string;
  /** Locked (over-limit) workspace: invites, comments, and access changes
   * are disabled; lists and presence stay visible (read-only). */
  locked?: boolean;
}

type Tab = 'people' | 'comments' | 'versions' | 'activity' | 'notifications';

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function statusIcon(status: string): string {
  switch (status) {
    case 'editing': return '✏️';
    case 'typing': return '⌨️';
    case 'idle': return '💤';
    default: return '👁️';
  }
}

export function CollabPanel({ pageId, userId, userName, userAvatar, className,
notificationCommentId, locked = false }: CollabPanelProps) {
  const [tab, setTab] = useState<Tab>('people');
  useEffect(() => {
    if (notificationCommentId) setTab('comments');
  }, [notificationCommentId]);

  const perms = useDocumentPermissions(pageId, userId);
  const session = useCollabSession(pageId, userId);
  const comments = useComments(pageId);
  const versions = useVersions(pageId);
  const notifs = useNotifications(userId);
  const liveUsers = usePresenceUsers(pageId);

  // Merge realtime presence (instant) with DB sessions (works even if a
  // peer's broadcast is flaky). Realtime wins for status/avatar/color; DB-only
  // rows are kept so nobody disappears mid-session.
  const mergedSessions: CollabSession[] = (() => {
    const byId = new Map<string, CollabSession>();
    for (const s of session.sessions) byId.set(s.user_id, s);
    for (const u of liveUsers) {
      const existing = byId.get(u.userId);
      byId.set(u.userId, {
        id: existing?.id || `presence:${u.userId}`,
        page_id: pageId,
        user_id: u.userId,
        user_name: u.userName || existing?.user_name || 'Anonymous',
        user_avatar: u.userAvatar || existing?.user_avatar || '👤',
        user_color: u.userColor || existing?.user_color || '#7c3aed',
        status: u.status || existing?.status || 'viewing',
        current_block_id: u.currentBlockId || undefined,
        last_activity: new Date(u.onlineAt || Date.now()).toISOString(),
        started_at: existing?.started_at || new Date(u.onlineAt || Date.now()).toISOString(),
        updated_at: existing?.updated_at || new Date().toISOString(),
      });
    }
    return Array.from(byId.values()).sort((a, b) => {
      if (a.user_id === userId) return -1;
      if (b.user_id === userId) return 1;
      return (a.started_at || '').localeCompare(b.started_at || '');
    });
  })();

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'people', label: 'People', badge: session.count },
    { key: 'comments', label: 'Comments', badge: comments.comments.filter(c => !c.resolved).length || undefined },
    { key: 'versions', label: 'Versions' },
    { key: 'activity', label: 'Activity' },
    { key: 'notifications', label: 'Alerts', badge: notifs.unreadCount || undefined },
  ];

  return (
    <div className={`flex flex-col h-full bg-[var(--bg)] border-l border-[var(--border)] ${className || ''}`} style={{ width: 320 }}>
      <div className="flex border-b border-[var(--border)]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 px-1 text-xs font-medium transition-colors relative ${
              tab === t.key ? 'text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                {t.badge}
              </span>
            )}
            {tab === t.key && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--accent)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {locked && (
          <div className="mx-3 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
            Workspace locked — collaboration is read-only. Upgrade your plan to invite, comment, or manage access.
          </div>
        )}
        {tab === 'people' && (
          <PeopleTab
            sessions={mergedSessions}
            otherUsers={mergedSessions.filter(s => s.user_id !== userId)}
            permission={perms.permission}
            allPermissions={perms.allPermissions}
            isOwner={perms.isOwner}
            userId={userId}
            userName={userName}
            onGrant={locked ? async () => {} : perms.grant}
            onRevoke={locked ? async () => {} : perms.revoke}
            locked={locked}
          />
        )}
        {tab === 'comments' && (
          <CommentsTab
            comments={comments.comments}
            loading={comments.loading}
            userId={userId}
            userName={userName}
            userAvatar={userAvatar}
            onAdd={locked ? async () => null : comments.add}
            onResolve={locked ? async () => false : comments.resolve}
            onUnresolve={locked ? async () => false : comments.unresolve}
            onDelete={locked ? async () => false : comments.remove}
            canComment={!locked && perms.canComment}
          />
        )}
        {tab === 'versions' && (
          <VersionsTab
            versions={versions.versions}
            loading={versions.loading}
          />
        )}
        {tab === 'activity' && <ActivityTab pageId={pageId} />}
        {tab === 'notifications' && (
          <NotificationsTab
            notifications={notifs.notifications}
            onMarkRead={notifs.markRead}
            onMarkAllRead={notifs.markAllRead}
          />
        )}
      </div>
    </div>
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ResolvedInviteUser {
  userId: string;
  userName: string;
  username?: string;
}

function PeopleTab({ sessions, otherUsers, permission, allPermissions, isOwner, userId, userName, onGrant, onRevoke, locked = false }: {
  sessions: CollabSession[];
  otherUsers: CollabSession[];
  permission: DocumentPermission | null;
  allPermissions: DocumentPermission[];
  isOwner: boolean;
  userId: string;
  userName: string;
  onGrant: (userId: string, userName: string, role: CollabRole, inviterName?: string) => Promise<void>;
  onRevoke: (userId: string) => Promise<void>;
  locked?: boolean;
}) {
  const [inviteQuery, setInviteQuery] = useState('');
  const [resolved, setResolved] = useState<ResolvedInviteUser | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteRole, setInviteRole] = useState<CollabRole>('editor');

  // Debounced typeahead: "@username" (or plain username) searches
  // user_profiles and shows a pick list; a raw page/user UUID is accepted
  // as-is so the old copy-a-user-id flow keeps working.
  useEffect(() => {
    const q = inviteQuery.trim().replace(/^@/, '');
    if (!q) {
      setResolved(null); setNotFound(false); setResolving(false);
      setSuggestions([]); setShowSuggestions(false);
      return;
    }
    if (UUID_RE.test(q)) {
      setResolved({ userId: q, userName: '' }); setNotFound(false); setResolving(false);
      setSuggestions([]); setShowSuggestions(false);
      return;
    }
    setResolving(true);
    setNotFound(false);
    const t = setTimeout(async () => {
      const results = await searchUsersByUsername(q, 6, userId);
      setSuggestions(results);
      setResolving(false);
      setShowSuggestions(true);
      // Also resolve an exact match so the invite button enables even
      // without clicking the list.
      const exact = results.find(r => r.username.toLowerCase() === q.toLowerCase());
      if (exact) {
        setResolved({ userId: exact.userId, userName: exact.userName, username: exact.username });
      } else {
        setResolved(null);
        setNotFound(true);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [inviteQuery, userId]);

  const selectSuggestedUser = (user: UserSearchResult) => {
    setResolved({ userId: user.userId, userName: user.userName, username: user.username });
    setInviteQuery(user.username);
    setNotFound(false);
    setShowSuggestions(false);
  };

  const handleGrant = async () => {
    if (locked || !resolved || inviting) return;
    setInviting(true);
    try {
      await onGrant(resolved.userId, resolved.userName || resolved.username || '', inviteRole, userName);
      setInviteQuery('');
      setResolved(null);
      setNotFound(false);
    } finally {
      setInviting(false);
    }
  };

  const collaborators = allPermissions.filter(p => p.role !== 'owner' && p.user_id !== userId);

  return (
    <div className="p-3 space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Online ({sessions.length})</h3>
        <div className="space-y-1.5">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg bg-[var(--surface)]">
              {s.user_avatar ? (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs border border-white/10"
                  style={{ backgroundColor: (s.user_color || '#7c3aed') + '33' }}
                >
                  {s.user_avatar}
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: s.user_color }}>
                  {s.user_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text)] truncate">{s.user_name}</p>
                <p className="text-[10px] text-[var(--muted)] capitalize">{statusIcon(s.status)} {s.status}</p>
              </div>
              {s.user_id === userId && (
                <span className="text-[10px] text-[var(--muted)] bg-[var(--hover)] px-1.5 py-0.5 rounded">You</span>
              )}
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-[var(--muted)] italic">No one else online</p>
          )}
        </div>
      </div>

      {permission && (
        <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <h4 className="text-xs font-semibold text-[var(--muted)] mb-1.5">Your Access</h4>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text)] capitalize">{permission.role}</span>
            <div className="flex flex-wrap gap-1 ml-auto">
              {permission.can_edit && <span className="text-[10px] bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded">Edit</span>}
              {permission.can_comment && <span className="text-[10px] bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">Comment</span>}
              {permission.can_share && <span className="text-[10px] bg-purple-900/40 text-purple-400 px-1.5 py-0.5 rounded">Share</span>}
            </div>
          </div>
        </div>
      )}

      {isOwner && collaborators.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
            Collaborators ({collaborators.length})
          </h3>
          <div className="space-y-1.5">
            {collaborators.map(c => (
              <div key={c.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg bg-[var(--surface)]">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[var(--accent)]">
                  {(c.user_name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text)] truncate">{c.user_name || c.user_id.slice(0, 8) + '…'}</p>
                  <p className="text-[10px] text-[var(--muted)] capitalize">{c.role}</p>
                </div>
                <button
                  onClick={() => { if (!locked) onRevoke(c.user_id); }}
                  disabled={locked}
                  title={locked ? "Workspace locked — read-only" : "Remove access — the page becomes private to them again"}
                  className="text-[10px] text-[var(--muted)] hover:text-red-400 transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--hover)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOwner && !locked && (
        <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-2">
          <h4 className="text-xs font-semibold text-[var(--muted)]">Invite Collaborator</h4>
          <div className="relative">
            <input
              value={inviteQuery}
              onChange={e => setInviteQuery(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              placeholder="@username or user ID..."
              className="w-full px-2.5 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
            />
            {showSuggestions && (
              <>
                <div className="fixed inset-0 z-30" onMouseDown={() => setShowSuggestions(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-40 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl p-1 max-h-52 overflow-y-auto">
                  {suggestions.length > 0 ? suggestions.map(u => (
                    <button
                      key={u.userId}
                      onClick={() => selectSuggestedUser(u)}
                      className={`w-full flex items-center gap-2 px-1.5 py-1 rounded text-left transition-colors ${
                        resolved?.userId === u.userId ? 'bg-[var(--hover)]' : 'hover:bg-[var(--hover)]'
                      }`}
                    >
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-6 h-6 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-[var(--accent)]">
                          {(u.userName || u.username).charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-[var(--text)]">{u.userName}</span>
                        <span className="block truncate text-[10px] text-[var(--muted)]">@{u.username}</span>
                      </span>
                      {resolved?.userId === u.userId && <span className="text-[10px] text-green-400">✓</span>}
                    </button>
                  )) : (
                    <div className="px-1.5 py-1.5 text-[10px] text-[var(--muted)]">
                      {resolving ? 'Searching…' : 'No users found with that username'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {resolving && !showSuggestions && (
            <p className="text-[10px] text-[var(--muted)]">Searching for @{inviteQuery.trim().replace(/^@/, '')}...</p>
          )}
          {notFound && !showSuggestions && (
            <p className="text-[10px] text-red-400">No user found with that username</p>
          )}
          {resolved && (
            <div className="flex items-center gap-2 p-1.5 rounded bg-[var(--hover)]">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-[var(--accent)]">
                {(resolved.userName || resolved.username || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[var(--text)] truncate">{resolved.userName || 'User'}</p>
                {resolved.username && <p className="text-[10px] text-[var(--muted)]">@{resolved.username}</p>}
              </div>
              <span className="text-[10px] text-green-400 ml-auto">✓ found</span>
            </div>
          )}
          <div className="flex gap-1.5">
            {(['editor', 'commenter', 'viewer'] as CollabRole[]).map(r => (
              <button
                key={r}
                onClick={() => setInviteRole(r)}
                className={`flex-1 py-1 text-[10px] font-medium rounded capitalize transition-colors ${
                  inviteRole === r ? 'bg-[var(--accent)] text-white' : 'bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={handleGrant}
            disabled={!resolved || inviting || locked}
            className="w-full py-1.5 bg-[var(--accent)] hover:opacity-90 text-white text-xs font-medium rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {inviting ? 'Inviting...' : 'Invite & Grant Access'}
          </button>
          <p className="text-[10px] text-[var(--muted)]">
            Inviting makes this page shared — the invitee gets an alert and access to collaborate.
          </p>
        </div>
      )}
    </div>
  );
}

function CommentsTab({ comments, loading, userId, userName, userAvatar, onAdd, onResolve, onUnresolve, onDelete, canComment }: {
  comments: import('./types').PageComment[];
  loading: boolean;
  userId: string;
  userName: string;
  userAvatar?: string;
  onAdd: (userId: string, userName: string, content: string, blockId?: string, userAvatar?: string) => Promise<import('./types').PageComment | null>;
  onResolve: (commentId: string, userId: string) => Promise<boolean>;
  onUnresolve: (commentId: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<boolean>;
  canComment: boolean;
}) {
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  const unresolved = comments.filter(c => !c.resolved);
  const resolved = comments.filter(c => c.resolved);

  const handleSubmit = async () => {
    if (!newComment.trim() || sending) return;
    setSending(true);
    try {
      await onAdd(userId, userName, newComment.trim(), undefined, userAvatar);
      setNewComment('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-3 space-y-3">
      {canComment && (
        <div className="flex gap-2">
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Add a comment... use @ to mention"
            className="flex-1 px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || sending}
            className="px-3 py-1.5 bg-[var(--accent)] hover:opacity-90 text-white text-xs font-medium rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-[var(--muted)] italic text-center py-4">Loading comments...</p>
      ) : (
        <>
          {unresolved.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--muted)] mb-2">Open ({unresolved.length})</h4>
              <div className="space-y-2">
                {unresolved.map(c => (
                  <CommentCard key={c.id} comment={c} userId={userId} onResolve={onResolve} onUnresolve={onUnresolve} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )}
          {resolved.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--muted)] mb-2">Resolved ({resolved.length})</h4>
              <div className="space-y-2 opacity-60">
                {resolved.map(c => (
                  <CommentCard key={c.id} comment={c} userId={userId} onResolve={onResolve} onUnresolve={onUnresolve} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )}
          {comments.length === 0 && (
            <p className="text-xs text-[var(--muted)] italic text-center py-4">No comments yet</p>
          )}
        </>
      )}
    </div>
  );
}

function CommentCard({ comment, userId, onResolve, onUnresolve, onDelete }: {
  comment: import('./types').PageComment;
  userId: string;
  onResolve: (commentId: string, userId: string) => Promise<boolean>;
  onUnresolve: (commentId: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<boolean>;
}) {
  const isOwn = comment.user_id === userId;
  return (
    <div data-comment-id={comment.id} className={`group p-2.5 rounded-lg border ${comment.resolved ? 'bg-[var(--bg)] border-[var(--border)]' : 'bg-[var(--surface)] border-[var(--border)]'}`}>
      <div className="flex items-center gap-2 mb-1">
        {comment.user_avatar ? (
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ backgroundColor: 'var(--hover)' }}>
            {comment.user_avatar}
          </span>
        ) : (
          <div className="w-5 h-5 rounded-full bg-[var(--hover)] flex items-center justify-center text-[9px] font-bold text-[var(--text)]">
            {comment.user_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        <span className="text-xs font-medium text-[var(--text)]">{comment.user_name}</span>
        <span className="text-[10px] text-[var(--muted)] ml-auto" title={new Date(comment.created_at).toLocaleString()}>
          {timeAgo(comment.created_at)}
        </span>
      </div>
      <p className="text-xs text-[var(--secondary)] leading-relaxed break-words">{comment.content}</p>
      <div className="flex items-center gap-2 mt-1.5">
        {!comment.resolved ? (
          <button
            onClick={() => onResolve(comment.id, userId)}
            className="text-[10px] text-[var(--muted)] hover:text-green-400 transition-colors"
          >
            Resolve
          </button>
        ) : (
          <>
            <span className="text-[10px] text-green-400">✓ Resolved</span>
            <button
              onClick={() => onUnresolve(comment.id)}
              className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              Reopen
            </button>
          </>
        )}
        {isOwn && (
          <button
            onClick={() => onDelete(comment.id)}
            className="text-[10px] text-[var(--muted)] hover:text-red-400 transition-colors ml-auto"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function VersionsTab({ versions, loading }: {
  versions: import('./types').VersionSnapshot[];
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-xs text-[var(--muted)] italic text-center py-4">Loading versions...</p>;
  }

  return (
    <div className="p-3 space-y-2">
      {versions.length > 0 ? versions.map(v => (
        <div key={v.id} className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[var(--text)]">{v.title}</span>
            <span className="text-[10px] text-[var(--muted)] ml-auto">v{v.version_number}</span>
          </div>
          <p className="text-[10px] text-[var(--muted)]">{v.user_name} &middot; {timeAgo(v.created_at)}</p>
          {v.description && <p className="text-[10px] text-[var(--muted)] mt-1">{v.description}</p>}
        </div>
      )) : (
        <p className="text-xs text-[var(--muted)] italic text-center py-4">No versions saved yet</p>
      )}
    </div>
  );
}

function ActivityTab({ pageId }: { pageId: string }) {
  const [activities, setActivities] = useState<CollabActivityEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    const load = async () => {
      try {
        const { getActivity } = await import('./activity');
        const data = await getActivity(pageId, 30);
        setActivities(data);
      } catch { /* ignore */ }
      setLoaded(true);
    };
    load();
  }, [pageId]);

  if (!loaded) {
    return <p className="text-xs text-[var(--muted)] italic text-center py-4">Loading activity...</p>;
  }

  return (
    <div className="p-3 space-y-2">
      {activities.length > 0 ? activities.map(a => (
        <div key={a.id} className="flex items-start gap-2 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
          <div>
            <p className="text-xs text-[var(--text-secondary)]">{formatAction(a)}</p>
            <p className="text-[10px] text-[var(--muted)]" title={new Date(a.created_at).toLocaleString()}>{timeAgo(a.created_at)}</p>
          </div>
        </div>
      )) : (
        <p className="text-xs text-[var(--muted)] italic text-center py-4">No activity yet</p>
      )}
    </div>
  );
}

function NotificationsTab({ notifications, onMarkRead, onMarkAllRead }: {
  notifications: import('./types').CollabNotification[];
  onMarkRead: (id: string) => Promise<boolean>;
  onMarkAllRead: () => Promise<boolean>;
}) {
  return (
    <div className="p-3 space-y-2">
      {notifications.length > 0 && (
        <button onClick={onMarkAllRead} className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          Mark all read
        </button>
      )}
      {notifications.length > 0 ? notifications.map(n => (
        <div
          key={n.id}
          onClick={() => !n.read && onMarkRead(n.id)}
          className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
            n.read ? 'bg-[var(--bg)] border-[var(--border)]' : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--hover)]'
          }`}
        >
          <p className="text-xs text-[var(--text)]">{n.title}</p>
          {n.body && <p className="text-[10px] text-[var(--muted)] mt-0.5">{n.body}</p>}
          <p className="text-[10px] text-[var(--muted)] mt-1" title={new Date(n.created_at).toLocaleString()}>{timeAgo(n.created_at)}</p>
        </div>
      )) : (
        <p className="text-xs text-[var(--muted)] italic text-center py-4">No notifications</p>
      )}
    </div>
  );
}
