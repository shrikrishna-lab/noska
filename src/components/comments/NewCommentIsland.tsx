import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, CornerDownRight } from "lucide-react";
import { UserAvatar } from "../UserAvatar";

/**
 * Live, collab-only surface for new comments. Deliberately NOT a notification:
 * nothing is persisted for it and it only exists while the page is open. When
 * a collaborator comments, a Dynamic-Island-style pill drops from the top of
 * the viewport; hovering (or clicking) expands it into a small preview list.
 * Opening a comment jumps to its block and opens the real thread popover.
 */
export interface NewCommentInfo {
  id: string;
  userName: string;
  userAvatar?: string;
  text: string;
  /** Storage value: a block id, "__title__", or "" for page-level comments. */
  blockId: string;
}

/** The subset of a `page_comments` row the island needs to classify arrivals. */
export interface CommentRowForIsland {
  id: string;
  page_id?: string;
  user_id?: string | null;
  user_name?: string | null;
  user_avatar?: string | null;
  content?: string | null;
  block_id?: string | null;
  resolved?: boolean | null;
}

/**
 * Pure arrival classifier: given the freshly loaded rows and the ids already
 * seen for this page, returns the genuinely new, unresolved comments written
 * by someone else. Seeding `seen` with the first load means history never
 * replays as "new" when a page opens.
 */
export function pickUnseenComments(
  rows: CommentRowForIsland[],
  seen: Set<string>,
  myUserId: string | null | undefined,
  pageId: string,
): NewCommentInfo[] {
  const isMine = (userId?: string | null) =>
    myUserId ? userId === myUserId : !userId || userId === "local";
  return rows
    .filter(
      (r) =>
        r.id &&
        r.page_id === pageId &&
        !r.resolved &&
        !seen.has(r.id) &&
        !isMine(r.user_id),
    )
    .map((r) => ({
      id: r.id,
      userName: r.user_name || "Someone",
      userAvatar: r.user_avatar || undefined,
      text: (r.content || "").trim(),
      blockId: r.block_id || "",
    }));
}

interface NewCommentIslandProps {
  /** Queue of unseen comments, oldest first (realtime row order). */
  comments: NewCommentInfo[];
  onOpen: (comment: NewCommentInfo) => void;
  onDismiss: () => void;
}

const IDLE_DISMISS_MS = 9000;

export default function NewCommentIsland({ comments, onOpen, onDismiss }: NewCommentIslandProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;

  const latest = comments[comments.length - 1];
  const previewRows = [...comments].reverse().slice(0, 3);

  // The dismiss callback is held in a ref so parent re-renders can't restart
  // the idle clock — only real state changes (arrivals, hover, pin) do.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  // Idle auto-dismiss: the island is an ambient hint, not a modal. It closes
  // on its own unless the user CLICKED it — hovering only restarts the clock
  // (so a drive-by mouse-over doesn't keep it alive), while a click/pin keeps
  // it up until dismissed or a comment is opened. New arrivals restart it too.
  useEffect(() => {
    if (pinned) return;
    const timeout = setTimeout(() => onDismissRef.current(), IDLE_DISMISS_MS);
    return () => clearTimeout(timeout);
  }, [pinned, comments.length, latest?.id, hovered]);

  // Escape collapses/dismisses while the island is expanded. Captured so the
  // keypress doesn't also close whatever else listens for Escape.
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setPinned(false);
      onDismissRef.current();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [expanded]);

  if (!latest) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[200]">
      <motion.div
        layout
        initial={{ opacity: 0, y: -28, scale: 0.82 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.86, transition: { duration: 0.16 } }}
        transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.7 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ borderRadius: expanded ? 26 : 999 }}
        className="bg-neutral-950/95 dark:bg-black/90 text-white backdrop-blur-xl border border-white/[0.08] shadow-[0_18px_50px_-10px_rgba(0,0,0,0.55),0_4px_14px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden select-none"
      >
        {expanded ? (
          <div className="w-[300px]">
            <div className="flex items-center justify-between pl-3.5 pr-1.5 pt-2 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                {comments.length === 1 ? "New comment" : `${comments.length} new comments`}
              </span>
              <button
                onClick={() => { setPinned(false); onDismiss(); }}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-90"
                aria-label="Dismiss new comments"
              >
                <X size={13} strokeWidth={2.4} />
              </button>
            </div>

            <div className="px-1.5 pb-1 flex flex-col gap-0.5">
              {previewRows.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpen(c)}
                  className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-[18px] hover:bg-white/[0.08] active:bg-white/[0.12] text-left transition-colors cursor-pointer group/row"
                >
                  <UserAvatar name={c.userName} avatar={c.userAvatar} size={26} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12px] font-semibold text-white/90 truncate leading-tight">
                      {c.userName}
                    </span>
                    <span className="block text-[11.5px] text-white/55 line-clamp-2 leading-snug mt-0.5 break-words">
                      {c.text || "Commented on this page"}
                    </span>
                  </span>
                  <CornerDownRight
                    size={12}
                    className="text-white/25 group-hover/row:text-white/60 mt-1 shrink-0 transition-colors"
                  />
                </button>
              ))}
            </div>

            <div className="px-3.5 pb-2 pt-0.5 text-[10px] text-white/30 font-medium">
              Click a comment to open it on the page
            </div>
          </div>
        ) : (
          <button
            onClick={() => setPinned(true)}
            className="flex items-center gap-2 pl-1 pr-3.5 h-9 cursor-pointer active:scale-[0.98] transition-transform"
            aria-label={`${comments.length} new comment${comments.length === 1 ? "" : "s"}`}
          >
            <UserAvatar name={latest.userName} avatar={latest.userAvatar} size={26} />
            <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
            </span>
            <span className="text-[12px] font-semibold text-white whitespace-nowrap">
              {comments.length === 1 ? "New comment" : "New comments"}
            </span>
            {comments.length > 1 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-white/12 text-white/85 text-[10px] font-bold grid place-items-center">
                {comments.length}
              </span>
            )}
          </button>
        )}
      </motion.div>
    </div>
  );
}
