import React, { useState } from 'react';
import { useDocumentPermissions, useCollabSession, useComments, useVersions, useNotifications } from './hooks';
import { formatAction } from './activity';
import type { CollabActivityEntry, CollabRole, CollabSession } from './types';

interface CollabPanelProps {
  pageId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  className?: string;
}

type Tab = 'people' | 'comments' | 'versions' | 'activity' | 'notifications';

export function CollabPanel({ pageId, userId, userName, userAvatar, className }: CollabPanelProps) {
  const [tab, setTab] = useState<Tab>('people');

  const perms = useDocumentPermissions(pageId, userId);
  const session = useCollabSession(pageId, userId);
  const comments = useComments(pageId);
  const versions = useVersions(pageId);
  const notifs = useNotifications(userId);

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
        {tab === 'people' && (
          <PeopleTab
            sessions={session.sessions}
            otherUsers={session.otherUsers}
            permission={perms.permission}
            isOwner={perms.isOwner}
            userId={userId}
            userName={userName}
            onGrant={perms.grant}
          />
        )}
        {tab === 'comments' && (
          <CommentsTab
            comments={comments.comments}
            loading={comments.loading}
            userId={userId}
            userName={userName}
            userAvatar={userAvatar}
            onAdd={comments.add}
            onResolve={comments.resolve}
            canComment={perms.canComment}
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

function PeopleTab({ sessions, otherUsers, permission, isOwner, userId, userName, onGrant }: {
  sessions: CollabSession[];
  otherUsers: CollabSession[];
  permission: import('./types').DocumentPermission | null;
  isOwner: boolean;
  userId: string;
  userName: string;
  onGrant: (userId: string, userName: string, role: CollabRole) => Promise<void>;
}) {
  const [inviteId, setInviteId] = useState('');
  const [inviteRole, setInviteRole] = useState<CollabRole>('editor');

  return (
    <div className="p-3 space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Online ({sessions.length})</h3>
        <div className="space-y-1.5">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg bg-[var(--surface)]">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: s.user_color }}>
                {s.user_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text)] truncate">{s.user_name}</p>
                <p className="text-[10px] text-[var(--muted)]">{s.status}</p>
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

      {isOwner && (
        <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-2">
          <h4 className="text-xs font-semibold text-[var(--muted)]">Invite Collaborator</h4>
          <input
            value={inviteId}
            onChange={e => setInviteId(e.target.value)}
            placeholder="User ID to invite..."
            className="w-full px-2.5 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
          />
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
            onClick={() => { if (inviteId.trim()) { onGrant(inviteId.trim(), '', inviteRole); setInviteId(''); } }}
            className="w-full py-1.5 bg-[var(--accent)] hover:opacity-90 text-white text-xs font-medium rounded transition-colors"
          >
            Grant Access
          </button>
        </div>
      )}
    </div>
  );
}

function CommentsTab({ comments, loading, userId, userName, userAvatar, onAdd, onResolve, canComment }: {
  comments: import('./types').PageComment[];
  loading: boolean;
  userId: string;
  userName: string;
  userAvatar?: string;
  onAdd: (userId: string, userName: string, content: string, blockId?: string, userAvatar?: string) => Promise<import('./types').PageComment | null>;
  onResolve: (commentId: string, userId: string) => Promise<boolean>;
  canComment: boolean;
}) {
  const [newComment, setNewComment] = useState('');

  const unresolved = comments.filter(c => !c.resolved);
  const resolved = comments.filter(c => c.resolved);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await onAdd(userId, userName, newComment.trim(), undefined, userAvatar);
    setNewComment('');
  };

  return (
    <div className="p-3 space-y-3">
      {canComment && (
        <div className="flex gap-2">
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Add a comment..."
            className="flex-1 px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={handleSubmit}
            className="px-3 py-1.5 bg-[var(--accent)] hover:opacity-90 text-white text-xs font-medium rounded transition-colors"
          >
            Send
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
                  <CommentCard key={c.id} comment={c} userId={userId} onResolve={onResolve} />
                ))}
              </div>
            </div>
          )}
          {resolved.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--muted)] mb-2">Resolved ({resolved.length})</h4>
              <div className="space-y-2 opacity-60">
                {resolved.map(c => (
                  <CommentCard key={c.id} comment={c} userId={userId} onResolve={onResolve} />
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

function CommentCard({ comment, userId, onResolve }: {
  comment: import('./types').PageComment;
  userId: string;
  onResolve: (commentId: string, userId: string) => Promise<boolean>;
}) {
  return (
    <div className={`p-2.5 rounded-lg border ${comment.resolved ? 'bg-[var(--bg)] border-[var(--border)]' : 'bg-[var(--surface)] border-[var(--border)]'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded-full bg-[var(--hover)] flex items-center justify-center text-[9px] font-bold text-[var(--text)]">
          {comment.user_name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <span className="text-xs font-medium text-[var(--text)]">{comment.user_name}</span>
        <span className="text-[10px] text-[var(--muted)] ml-auto">
          {new Date(comment.created_at).toLocaleDateString()}
        </span>
      </div>
      <p className="text-xs text-[var(--secondary)] leading-relaxed">{comment.content}</p>
      {!comment.resolved && (
        <button
          onClick={() => onResolve(comment.id, userId)}
          className="mt-1.5 text-[10px] text-[var(--muted)] hover:text-green-400 transition-colors"
        >
          Resolve
        </button>
      )}
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
          <p className="text-[10px] text-[var(--muted)]">{v.user_name} &middot; {new Date(v.created_at).toLocaleDateString()}</p>
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
            <p className="text-[10px] text-[var(--muted)]">{new Date(a.created_at).toLocaleString()}</p>
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
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
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
          <p className="text-[10px] text-[var(--muted)] mt-1">{new Date(n.created_at).toLocaleString()}</p>
        </div>
      )) : (
        <p className="text-xs text-[var(--muted)] italic text-center py-4">No notifications</p>
      )}
    </div>
  );
}
