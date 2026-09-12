import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { realtimeCollab } from '../../lib/realtimeCollab';
import { Lock, Radio, Users } from 'lucide-react';

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
  /** True when the page is strictly private (owner only, not public, no invited collaborators). */
  isPrivate?: boolean;
  onToast?: (msg: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  editor: "can edit",
  commenter: "can comment",
  viewer: "view only",
  admin: "can manage",
  owner: "owner",
};

const SPRING_PILL = {
  type: "spring" as const,
  stiffness: 460,
  damping: 30,
  mass: 0.8,
};

export default function WorkspaceJoinBar({
  onOpenSettings,
  pageId,
  sharedRole,
  isPageShared,
  isPrivate,
  onToast,
}: WorkspaceJoinBarProps) {
  const [joined, setJoined] = useState(realtimeCollab.isJoined());
  const [peersOnline, setPeersOnline] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [shockwaveKey, setShockwaveKey] = useState(0);

  useEffect(() => {
    const unsub1 = realtimeCollab.on('workspace:join', () => setJoined(true));
    const unsub2 = realtimeCollab.on('workspace:leave', () => setJoined(false));

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
    if (isPrivate) {
      setShakeKey(prev => prev + 1);
      console.warn(`[Collab] Realtime collaboration is disabled because page "${pageId || 'current'}" is Private.`);
      onToast?.("This page is Private. Change visibility to Public to collaborate with others.");
      return;
    }

    setShockwaveKey(prev => prev + 1);
    if (joined) {
      realtimeCollab.leaveWorkspace();
      setJoined(false);
    } else {
      realtimeCollab.joinWorkspace();
      setJoined(true);
    }
  };

  const isInvitee = !!sharedRole;
  const roleLabel = ROLE_LABELS[sharedRole || ''] || 'shared';
  const liveLabel = peersOnline > 0
    ? `${peersOnline} online`
    : isPageShared
      ? (isInvitee ? `you can ${ROLE_LABELS[sharedRole || ''] || 'view'}` : 'shared')
      : null;

  const tooltip = isPrivate
    ? "This page is Private (not Public). Click to see options to enable collaboration."
    : isInvitee
      ? `Shared with you — ${roleLabel}. ${joined ? 'You appear online to collaborators.' : 'Click to appear online.'}`
      : isPageShared
        ? `${peersOnline > 0 ? `${peersOnline} collaborator${peersOnline > 1 ? 's' : ''} on this page. ` : 'This page is shared — collaborators can join. '}Click to ${joined ? 'leave' : 'join'} realtime collaboration.`
        : joined
          ? "Collab Active · Click to disconnect"
          : "Click to connect live collaboration";

  const statusKey = isPrivate
    ? "private"
    : isInvitee
      ? `invitee-${joined}-${peersOnline}`
      : `owner-${joined}-${peersOnline}-${isPageShared}`;

  return (
    <motion.button
      layout
      transition={SPRING_PILL}
      onClick={handleToggle}
      whileHover={{ scale: 1.03, y: -0.5 }}
      whileTap={{ scale: 0.94 }}
      animate={
        isPrivate && shakeKey > 0
          ? { x: [0, -5, 5, -4, 4, -2, 2, 0] }
          : { x: 0 }
      }
      className={`group relative overflow-hidden flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs shadow-2xs select-none cursor-pointer transition-colors duration-200 ${
        isPrivate
          ? "border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] text-slate-400 dark:text-slate-500 hover:border-black/15 dark:hover:border-white/15 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
          : isInvitee
            ? "bg-blue-500/[0.06] dark:bg-blue-400/[0.09] border-blue-500/20 dark:border-blue-400/25 text-blue-700 dark:text-blue-300 hover:bg-blue-500/[0.12] dark:hover:bg-blue-400/[0.15] shadow-[0_2px_10px_-2px_rgba(59,130,246,0.15)]"
            : joined
              ? "bg-emerald-500/[0.07] dark:bg-emerald-400/[0.09] border-emerald-500/25 dark:border-emerald-400/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/[0.12] dark:hover:bg-emerald-400/[0.14] shadow-[0_2px_12px_-2px_rgba(16,185,129,0.2)]"
              : "bg-black/[0.025] dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
      }`}
      title={tooltip}
    >
      {/* Shockwave expanding ring on toggle */}
      <AnimatePresence>
        {shockwaveKey > 0 && (
          <motion.span
            key={`shockwave-${shockwaveKey}`}
            initial={{ scale: 0.3, opacity: 0.8 }}
            animate={{ scale: 2.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute inset-0 rounded-full pointer-events-none ${
              joined ? "bg-emerald-400/30" : "bg-slate-400/20"
            }`}
          />
        )}
      </AnimatePresence>

      {/* Signal Status Indicator */}
      <div className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
        {isPrivate ? (
          <motion.div
            key="lock-icon"
            initial={{ scale: 0.7, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 0.8, rotate: 0 }}
            transition={SPRING_PILL}
          >
            <Lock size={11} className="text-slate-400 dark:text-slate-500" />
          </motion.div>
        ) : joined || (isInvitee && peersOnline > 0) ? (
          <>
            {/* Smooth Breathing Aura */}
            <motion.span
              animate={{
                scale: [1, 1.8, 2.3],
                opacity: [0.65, 0.3, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className={`absolute inline-flex h-full w-full rounded-full ${
                isInvitee ? "bg-blue-500" : "bg-emerald-500"
              }`}
            />
            {/* Core glowing dot */}
            <motion.span
              layoutId="collab-dot-core"
              transition={SPRING_PILL}
              className={`relative inline-flex rounded-full h-2 w-2 shadow-xs ${
                isInvitee
                  ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                  : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
              }`}
            />
          </>
        ) : (
          <motion.span
            layoutId="collab-dot-core"
            transition={SPRING_PILL}
            className="relative inline-flex rounded-full h-2 w-2 bg-slate-400 dark:bg-slate-500 opacity-60"
          />
        )}
      </div>

      {/* Dynamic Animated Label Morph */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={statusKey}
          initial={{ opacity: 0, y: -7, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 7, filter: "blur(2px)" }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className="font-medium text-[11.5px] tracking-tight whitespace-nowrap flex items-center gap-1.5"
        >
          {isPrivate ? (
            <span>Collab · Private</span>
          ) : isInvitee ? (
            <>
              <span>Shared</span>
              {liveLabel && (
                <span className="font-normal opacity-75 text-[10.5px]">· {liveLabel}</span>
              )}
            </>
          ) : peersOnline > 0 ? (
            <>
              <Users size={11} className="opacity-75 shrink-0" />
              <span>Collab · {peersOnline} online</span>
            </>
          ) : isPageShared && joined ? (
            <>
              <Radio size={11} className="opacity-75 shrink-0 animate-pulse" />
              <span>Collab · live</span>
            </>
          ) : joined ? (
            <span>Collab · on</span>
          ) : (
            <span>Collab</span>
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
