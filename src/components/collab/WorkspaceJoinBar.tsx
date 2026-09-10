import React, { useState, useEffect } from 'react';
import { realtimeCollab } from '../../lib/realtimeCollab';

interface WorkspaceJoinBarProps {
  onOpenSettings?: () => void;
  /** Current page — presence count is scoped to it when provided. */
  pageId?: string | null;
  /** Set when the current page is shared TO this user (they're an invitee,
   * not the owner) — the pill then describes their access level. */
  sharedRole?: string | null;
  /** True when the current page has collaborators or is public — the
   * owner-side "this page is open for collab" signal. */
  isPageShared?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  editor: "can edit",
  commenter: "can comment",
  viewer: "view only",
  admin: "can manage",
  owner: "owner",
};

export default function WorkspaceJoinBar({
  onOpenSettings,
  pageId,
  sharedRole,
  isPageShared
}: WorkspaceJoinBarProps) {
  const [joined, setJoined] = useState(realtimeCollab.isJoined());
  // Others currently online on THIS page (not the whole workspace).
  const [peersOnline, setPeersOnline] = useState(0);

  useEffect(() => {
    const unsub1 = realtimeCollab.on('workspace:join', () => setJoined(true));
    const unsub2 = realtimeCollab.on('workspace:leave', () => setJoined(false));

    // Scoped count: reset when the page changes, then track peers on it.
    setPeersOnline(0);
    const unsub3 = realtimeCollab.on('presence:sync', ({ pageId: pid, users }) => {
      if (pageId && pid !== pageId) return;
      if (users) setPeersOnline(users.length);
    });
    const unsub4 = realtimeCollab.on('presence:join', ({ pageId: pid }) => {
      if (pageId && pid !== pageId) return;
      setPeersOnline(prev => prev + 1);
    });
    const unsub5 = realtimeCollab.on('presence:leave', ({ pageId: pid }) => {
      if (pageId && pid !== pageId) return;
      setPeersOnline(prev => Math.max(0, prev - 1));
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [pageId]);

  const handleToggle = () => {
    if (joined) {
      realtimeCollab.leaveWorkspace();
      setJoined(false);
    } else {
      realtimeCollab.joinWorkspace();
      setJoined(true);
    }
  };

  // ── Pill state ──────────────────────────────────────────────────────────
  // Invitee (page shared with you): blue pill describing your access.
  // Owner (page is shared/public): green pill + live peer count.
  // Private page: neutral "Collab" join toggle.
  const isInvitee = !!sharedRole;
  const roleLabel = ROLE_LABELS[sharedRole || ''] || 'shared';
  const liveLabel = peersOnline > 0
    ? `${peersOnline} online`
    : isPageShared
      ? (isInvitee ? `you can ${ROLE_LABELS[sharedRole || ''] || 'view'}` : 'shared')
      : null;

  const tooltip = isInvitee
    ? `Shared with you — ${roleLabel}. ${joined ? 'You appear online to collaborators.' : 'Click to appear online.'}`
    : isPageShared
      ? `${peersOnline > 0 ? `${peersOnline} collaborator${peersOnline > 1 ? 's' : ''} on this page. ` : 'This page is shared — collaborators can join. '}Click to ${joined ? 'leave' : 'join'} realtime collaboration.`
      : joined
        ? "Collab Active · Click to leave"
        : "Click to join realtime collaboration";

  return (
    <button
      onClick={handleToggle}
      className={`group flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs shadow-2xs transition-all duration-150 cursor-pointer select-none active:scale-95 ${
        isInvitee
          ? "bg-blue-500/[0.06] dark:bg-blue-400/[0.08] border-blue-500/20 dark:border-blue-400/25 text-blue-700 dark:text-blue-300 hover:bg-blue-500/[0.1] dark:hover:bg-blue-400/[0.14]"
          : joined
            ? "bg-black/[0.03] dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.08] text-slate-700 dark:text-slate-200 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
            : "bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.06] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/[0.05]"
      }`}
      title={tooltip}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {(joined || (isInvitee && peersOnline > 0)) && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isInvitee ? "bg-blue-400" : "bg-emerald-400"}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${
          isInvitee
            ? (joined ? "bg-blue-500" : "bg-blue-400/50")
            : joined
              ? "bg-emerald-500"
              : peersOnline > 0
                ? "bg-emerald-400"
                : "bg-slate-400"
        }`} />
      </span>

      <span className="font-medium text-[11px] tracking-tight">
        {isInvitee ? (
          <>Shared{liveLabel ? <span className="font-normal opacity-70"> · {liveLabel}</span> : null}</>
        ) : peersOnline > 0 ? (
          <>Collab · {peersOnline} online</>
        ) : isPageShared && joined ? (
          <>Collab · shared</>
        ) : (
          "Collab"
        )}
      </span>
    </button>
  );
}
