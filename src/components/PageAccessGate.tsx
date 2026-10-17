"use client";

import React, { useEffect, useState } from "react";
import PageIcon from "./PageIcon";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  Lock,
  ShieldCheck,
  GitFork,
  Clock,
  Check,
  X,
  Loader2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import {
  getPageAccessInfo,
  requestPageAccess,
  cancelPageAccessRequest,
  forkPage,
  type PageAccessInfo,
  type ShareRole,
} from "../lib/share/access";

interface PageAccessGateProps {
  /** The page id taken from the URL, owned by somebody else. */
  pageId: string;
  /** Current user's id, used to decide whether a fork is even possible. */
  currentUserId?: string | null;
  /** Workspace the fork should land in. Empty means the personal scope. */
  workspaceId?: string | null;
  onGranted: (pageId: string) => void;
  onClose?: () => void;
}

const ROLE_COPY: Record<ShareRole, string> = {
  "co-owner": "Can manage",
  editor: "Can edit",
  commenter: "Can comment",
  viewer: "Can view",
};

const ROLE_HINT: Record<ShareRole, string> = {
  "co-owner": "Edit, share and manage collaborators",
  editor: "Edit together in real time",
  commenter: "Comment and suggest",
  viewer: "Read only",
};

/** All four roles are requestable; the owner decides what is actually granted. */
const REQUESTABLE_ROLES: ShareRole[] = ["co-owner", "editor", "commenter", "viewer"];

/**
 * Short labels for the segmented control. The full "Can edit / Can comment /
 * Can view" wording cannot fit three across this card without clipping, and a
 * native segmented control reads better abbreviated anyway — the sentence
 * underneath already spells out what each one means.
 */
const ROLE_SHORT: Record<ShareRole, string> = {
  "co-owner": "Manage",
  editor: "Edit",
  commenter: "Comment",
  viewer: "View",
};

/**
 * Spring used for every entrance and state change in this sheet. One shared
 * curve means nothing in the card moves at its own tempo — the pieces feel
 * like one object rather than several independently animated widgets.
 */
const SPRING = { type: "spring", stiffness: 420, damping: 32, mass: 0.7 } as const;
const SPRING_SOFT = { type: "spring", stiffness: 320, damping: 30, mass: 0.8 } as const;

/**
 * What somebody sees when they open a link to a page that is not theirs.
 *
 * Restricted pages offer exactly one route in: ask the owner. Approving that
 * request grants a `page_permissions` row, which is what makes the two of them
 * collaborators on the same document. Forkable pages instead hand over an
 * independent copy — no shared state, no collaboration, and later edits on
 * either side stay on that side.
 */
export default function PageAccessGate({
  pageId,
  currentUserId,
  workspaceId,
  onGranted,
  onClose,
}: PageAccessGateProps) {
  const [info, setInfo] = useState<PageAccessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [role, setRole] = useState<ShareRole>("editor");
  const [message, setMessage] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [forking, setForking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const next = await getPageAccessInfo(pageId);
      // Access may have been granted while the gate was on screen (an owner
      // approval, or a fork that has just been taken). Hand straight over to the
      // editor instead of leaving a gate over a page that can now be opened.
      if (next?.hasAccess) {
        onGranted(pageId);
        return;
      }
      setInfo(next);
      setRequested(Boolean(next?.pendingRequestId));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not check access to this page.");
    } finally {
      setLoading(false);
    }
  }, [pageId, onGranted]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setRequested(false);
    setActionError(null);
    (async () => {
      try {
        const next = await getPageAccessInfo(pageId);
        if (cancelled) return;
        if (next?.hasAccess) {
          onGranted(pageId);
          return;
        }
        setInfo(next);
        setRequested(Boolean(next?.pendingRequestId));
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Could not check access to this page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageId, onGranted]);

  const sendRequest = async () => {
    setRequesting(true);
    setActionError(null);
    try {
      await requestPageAccess(pageId, { message, role });
      setRequested(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not send the request.");
    } finally {
      setRequesting(false);
    }
  };

  const withdrawRequest = async () => {
    if (!info?.pendingRequestId) return;
    setRequesting(true);
    setActionError(null);
    try {
      await cancelPageAccessRequest(info.pendingRequestId);
      setRequested(false);
      setInfo((prev) => (prev ? { ...prev, pendingRequestId: null, pendingRole: null, canRequest: true } : prev));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not withdraw the request.");
    } finally {
      setRequesting(false);
    }
  };

  const takeFork = async () => {
    setForking(true);
    setActionError(null);
    try {
      const result = await forkPage(pageId, { workspaceId: workspaceId ?? "" });
      onGranted(result.pageId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not create a copy.");
    } finally {
      setForking(false);
    }
  };

  // While checking, and whenever the link is read-only, the gate is not shown
  // at all — the editor renders the page itself.
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[10020] flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-md"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl border border-black/[0.06] bg-white/70 dark:border-white/10 dark:bg-white/[0.04]">
            <Loader2 className="h-4 w-4 animate-spin text-neutral-500 dark:text-neutral-300" aria-hidden="true" />
          </div>
          <p className="text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400">Checking access…</p>
        </div>
      </motion.div>
    );
  }

  if (loadError || !info || !info.found || info.hasAccess) return null;

  const title = info.title || "This page is private";
  const icon = info.icon || null;

  const subtitle = info.canFork
    ? "You are not a collaborator on this page."
    : info.canViewLink
      ? "Anyone with the link can read this page."
      : info.linkAccess === "fork"
        ? "The owner allows copies of this page."
        : "You do not have access to this page yet.";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      className="fixed inset-0 z-[10020] flex items-center justify-center overflow-y-auto bg-neutral-900/10 px-4 py-8 backdrop-blur-xl dark:bg-black/45"
    >
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={SPRING}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-[440px] overflow-hidden rounded-[28px] border border-black/[0.06] bg-white/92 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_-8px_rgba(0,0,0,0.14),0_40px_80px_-32px_rgba(0,0,0,0.28)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#1a1a1c]/92"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="relative flex flex-col items-center px-7 pb-5 pt-7 text-center">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full text-neutral-400 transition-all duration-150 hover:bg-black/[0.05] hover:text-neutral-900 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/40 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          )}

          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...SPRING_SOFT, delay: 0.04 }}
            className="grid h-[60px] w-[60px] place-items-center rounded-[19px] border border-black/[0.05] bg-gradient-to-b from-[#F6F1E7] to-[#EFE7D8] text-[26px] shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-white/[0.07] dark:from-white/[0.09] dark:to-white/[0.03]"
          >
            {/* This gate is the pre-authentication surface — the icon comes
                straight from the page_access_info RPC and was rendered as a raw
                string, so a page icon of "lucide:CassetteTape" (or a base64
                data URL) was printed verbatim at 26px to anonymous visitors.
                PageIcon parses every shape the column can hold. */}
            {icon ? (
              <PageIcon
                icon={icon}
                size={30}
                fallback={<Lock className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />}
              />
            ) : (
              <Lock className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />
            )}
          </motion.div>

          <motion.h2
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...SPRING_SOFT, delay: 0.07 }}
            className="mt-4 max-w-full truncate text-[17px] font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white"
          >
            {title}
          </motion.h2>

          <motion.p
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...SPRING_SOFT, delay: 0.09 }}
            className="mt-1.5 max-w-[320px] text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400"
          >
            {subtitle}
          </motion.p>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="px-7 pb-7">
          {loadError && (
            <Notice tone="amber" icon={<AlertTriangle size={13} />}>
              {loadError}
            </Notice>
          )}

          {actionError && (
            <Notice tone="rose" icon={<AlertTriangle size={13} />}>
              {actionError}
            </Notice>
          )}

          <AnimatePresence mode="wait" initial={false}>
            {requested ? (
              <motion.div
                key="requested"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={SPRING_SOFT}
                className="rounded-[20px] border border-black/[0.05] bg-[#F7F6F3] p-5 dark:border-white/[0.07] dark:bg-white/[0.035]"
              >
                <div className="flex flex-col items-center text-center">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E3CFB3]/35 text-[#8a6d3b] dark:bg-[#E3CFB3]/15 dark:text-[#E3CFB3]">
                    <Clock size={16} />
                  </span>
                  <h3 className="mt-3 text-[14px] font-semibold text-neutral-900 dark:text-white">Request sent</h3>
                  <p className="mt-1.5 max-w-[300px] text-[12.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                    The owner has been notified. You will get in as soon as they approve — then you will both be
                    editing the same page.
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <PrimaryButton onClick={load} icon={<Check size={14} />}>
                    Check again
                  </PrimaryButton>
                  <SecondaryButton onClick={withdrawRequest} disabled={requesting}>
                    Withdraw request
                  </SecondaryButton>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={SPRING_SOFT}
                className="space-y-3"
              >
                {info.canRequest && (
                  <div className="rounded-[20px] border border-black/[0.05] bg-[#F7F6F3] p-5 dark:border-white/[0.07] dark:bg-white/[0.035]">
                    <div className="flex flex-col items-center text-center">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0066FF]/10 text-[#0066FF] dark:bg-[#4791FF]/15 dark:text-[#4791FF]">
                        <ShieldCheck size={16} />
                      </span>
                      <h3 className="mt-3 text-[14px] font-semibold text-neutral-900 dark:text-white">Request access</h3>
                      <p className="mt-1.5 max-w-[300px] text-[12.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                        The owner decides. If they approve, you collaborate on this page together.
                      </p>
                    </div>

                    {/* Segmented control. The selected pill slides between options
                        with a shared layoutId instead of cross-fading two
                        backgrounds, so the change reads as one object moving. */}
                    <LayoutGroup id="gate-role">
                      {/* Two columns for four roles. Three across clipped "Can
                          comment" at this width, and the short labels below are
                          what a segmented control wants anyway. */}
                      <div
                        className="mt-4 grid grid-cols-2 gap-1.5 rounded-[15px] bg-black/[0.04] p-1.5 dark:bg-white/[0.06]"
                        aria-label="Access level"
                      >
                        {REQUESTABLE_ROLES.map((option) => {
                          const active = role === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setRole(option)}
                              className={[
                                "relative min-w-0 rounded-[11px] px-2 py-2 text-[12px] font-medium",
                                "truncate transition-colors duration-150 outline-none",
                                "focus-visible:ring-2 focus-visible:ring-[#0066FF]/40",
                                active
                                  ? "text-neutral-900 dark:text-white"
                                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200",
                              ].join(" ")}
                            >
                              {active && (
                                <motion.span
                                  layoutId="gate-role-pill"
                                  transition={SPRING}
                                  className="absolute inset-0 rounded-[10px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.10)] dark:bg-[#3a3a3e] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                                />
                              )}
                              <span className="relative z-10">{ROLE_SHORT[option]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </LayoutGroup>

                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p
                        key={role}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="mt-2.5 text-center text-[11.5px] text-neutral-500 dark:text-neutral-400"
                      >
                        {ROLE_HINT[role]}
                      </motion.p>
                    </AnimatePresence>

                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={500}
                      rows={2}
                      placeholder="Add a note for the owner (optional)"
                      className="mt-3.5 w-full resize-none rounded-[13px] border border-black/[0.07] bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-neutral-900 outline-none transition-shadow duration-150 placeholder:text-neutral-400 focus:border-[#0066FF]/60 focus:ring-4 focus:ring-[#0066FF]/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-100 dark:focus:border-[#4791FF]/50 dark:focus:ring-[#4791FF]/10"
                    />

                    <div className="mt-4">
                      <PrimaryButton
                        onClick={sendRequest}
                        disabled={requesting}
                        icon={requesting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      >
                        {requesting ? "Sending…" : "Send request"}
                      </PrimaryButton>
                    </div>
                  </div>
                )}

                {info.canFork && (
                  <motion.button
                    type="button"
                    onClick={takeFork}
                    disabled={forking || !currentUserId}
                    whileHover={forking ? undefined : { y: -1 }}
                    whileTap={forking ? undefined : { scale: 0.985 }}
                    transition={SPRING}
                    className="group/fork flex w-full items-center gap-3.5 rounded-[20px] border border-black/[0.05] bg-[#F7F6F3] p-4 text-left outline-none transition-colors duration-150 hover:bg-[#F1EFEA] focus-visible:ring-4 focus-visible:ring-[#0066FF]/15 disabled:pointer-events-none disabled:opacity-60 dark:border-white/[0.07] dark:bg-white/[0.035] dark:hover:bg-white/[0.06]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[#0066FF]/10 text-[#0066FF] transition-transform duration-200 group-hover/fork:scale-105 dark:bg-[#4791FF]/15 dark:text-[#4791FF]">
                      {forking ? <Loader2 size={15} className="animate-spin" /> : <GitFork size={15} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold text-neutral-900 dark:text-white">
                        Get your own copy
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">
                        Fork it into your workspace. You will not be collaborators — your changes stay on your side.
                      </span>
                    </span>
                  </motion.button>
                )}

                {info.canViewLink && (
                  <div className="flex items-center gap-2.5 rounded-[16px] border border-black/[0.05] bg-[#F7F6F3] px-4 py-3 text-[12.5px] leading-snug text-neutral-500 dark:border-white/[0.07] dark:bg-white/[0.035] dark:text-neutral-400">
                    <Eye size={14} className="shrink-0" />
                    This page is open to anyone with the link. Reload if it does not appear.
                  </div>
                )}

                {!info.canRequest && !info.canFork && !info.canViewLink && (
                  <div className="rounded-[16px] border border-black/[0.05] bg-[#F7F6F3] px-4 py-3.5 text-[12.5px] leading-relaxed text-neutral-500 dark:border-white/[0.07] dark:bg-white/[0.035] dark:text-neutral-400">
                    {info.linkAccess === "fork" ? (
                      <>
                        This page is set to link-fork mode, but the owner has not published it to the web — forking is
                        only offered for published pages. Ask the owner to publish it.
                      </>
                    ) : (
                      "This page is not shared with you. Ask the owner to invite you or open the link access."
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Shared pieces ─────────────────────────────────────────────────────────── */

function PrimaryButton({
  onClick,
  disabled,
  icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.012 }}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      transition={SPRING}
      className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#1c1b18] px-4 py-[11px] text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.16),0_6px_16px_-6px_rgba(0,0,0,0.4)] outline-none transition-[filter,box-shadow] duration-150 hover:brightness-[1.12] focus-visible:ring-4 focus-visible:ring-[#0066FF]/20 disabled:pointer-events-none disabled:opacity-55 dark:bg-white dark:text-neutral-900 dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
    >
      {icon}
      {children}
    </motion.button>
  );
}

function SecondaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-[14px] px-4 py-[10px] text-[12.5px] font-medium text-neutral-500 outline-none transition-colors duration-150 hover:bg-black/[0.04] hover:text-neutral-800 focus-visible:ring-4 focus-visible:ring-[#0066FF]/15 disabled:pointer-events-none disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-neutral-100"
    >
      {children}
    </button>
  );
}

function Notice({
  tone,
  icon,
  children,
}: {
  tone: "amber" | "rose";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles =
    tone === "amber"
      ? "border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200"
      : "border-rose-200/80 bg-rose-50 text-rose-900 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200";
  return (
    <div className={`mb-3 flex items-start gap-2 rounded-[14px] border px-3.5 py-2.5 text-[12px] leading-snug ${styles}`}>
      <span className="mt-[1px] shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
