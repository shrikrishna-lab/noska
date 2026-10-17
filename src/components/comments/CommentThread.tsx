import React, { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  SmilePlus,
  AtSign,
  Check,
  Trash2,
  X,
  MessageCircle
} from "lucide-react";
import { uid } from "../../utils/helpers";
import { PageIcon } from "../PageIcon";
import { realtimeCollab } from "../../lib/realtimeCollab";
import { usePresenceUsers } from "../../features/collab/hooks";
import { useTypingIndicator } from "../../features/collab/performance";
import { UserAvatar, isValidImageUrl } from "../UserAvatar";

export interface CommentItem {
  id: string;
  blockId: string;
  pageId: string;
  text: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  verified?: boolean;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  [key: string]: unknown;
}

export interface CommentThreadProps {
  comments?: Array<CommentItem | Record<string, unknown> | any>;
  blockId: string;
  pageId: string;
  onAddComment?: (comment: any) => void;
  onResolveComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onClose?: () => void;
  pages?: any[];
  onNavigate?: (pageId: string, options?: any) => void;
  /**
   * View-only thread. Existing comments stay readable (the `page_comment_read`
   * policy lets anyone with page access see them) but the composer is gone,
   * because the `page_comment_insert` policy refuses the write for a viewer.
   * Showing the box anyway invited a guaranteed failure.
   */
  readOnly?: boolean;
}

const QUICK_EMOJIS = ["🔥", "❤️", "👍", "👏", "🚀", "💡", "😂", "💯"];

/** Starburst Scalloped Verified Checkmark Badge */
function VerifiedBadge({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={`${className} text-sky-500 fill-current shrink-0 inline-block`} viewBox="0 0 24 24" aria-label="Verified">
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 10.55.7 11.92.7 13.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238 1.05 1.273 2.42 2.148 4 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-1.05 2.148-2.42 2.148-4zm-12.7 4.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.6-5.6 1.4 1.4-7 7z" />
    </svg>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff) || diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function renderText(text: string, pages?: any[], onNavigate?: any) {
  const parts = text.split(/(@[A-Za-z0-9_.-]+(?:\s[A-Za-z0-9_.-]+)?)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const rawName = part.slice(1).trim();
          const page = (pages || []).find(
            (p: any) => (p.title || "").toLowerCase() === rawName.toLowerCase()
          );
          return (
            <span
              key={i}
              onClick={(e) => {
                if (page && onNavigate) {
                  e.stopPropagation();
                  onNavigate(page.id, { altKey: e.altKey });
                }
              }}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-full bg-sky-50 dark:bg-sky-950/70 border border-sky-400/30 dark:border-sky-500/30 text-sky-600 dark:text-sky-300 font-semibold text-[11.5px] cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-all select-none align-baseline"
            >
              {page ? (
                <PageIcon icon={page.icon} size={11} fallback={<span className="text-[10px]">📄</span>} />
              ) : (
                <AtSign size={10} strokeWidth={2.5} className="shrink-0 opacity-80" />
              )}
              <span>{rawName}</span>
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export default function CommentThread({
  comments = [],
  blockId,
  pageId,
  onAddComment,
  onResolveComment,
  onDeleteComment,
  onClose,
  pages = [],
  onNavigate,
  readOnly = false
}: CommentThreadProps) {
  const [text, setText] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [showEmojiRow, setShowEmojiRow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeMentionIndex]);

  // Real identity of the current user
  const currentUser = realtimeCollab.getUser();
  const currentUserName =
    currentUser?.userName && currentUser.userName !== "Anonymous"
      ? currentUser.userName
      : (localStorage.getItem("noska_user_name") || "You");
  const currentUserAvatar = currentUser?.userAvatar;
  const currentUserColor = currentUser?.userColor || "#f59e0b";

  // Real presence users connected to this page
  const presenceUsers = usePresenceUsers(pageId);

  // "X is typing…" is driven by the realtime `typing` broadcast. The old
  // presence-based lookup never fired because nothing ever tracked a
  // "typing" presence status — the broadcast is what actually flows between
  // collaborators while a comment is being written.
  const notifyTyping = useTypingIndicator(pageId);
  const [typingPeer, setTypingPeer] = useState<{
    userId: string;
    userName: string;
    userAvatar?: string;
    userColor?: string;
  } | null>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const unsub = realtimeCollab.on("typing", (d) => {
      if (d.pageId !== pageId || d.userId === currentUser?.userId) return;
      setTypingPeer({
        userId: d.userId,
        userName: (d.userName as string) || "Someone",
        userAvatar: (d.userAvatar as string) || undefined,
        userColor: (d.userColor as string) || undefined,
      });
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setTypingPeer(null), 2600);
    });
    return () => {
      unsub();
      if (timeout) clearTimeout(timeout);
    };
  }, [pageId, currentUser?.userId]);

  // Focus the composer the moment the thread opens.
  useEffect(() => {
    if (!readOnly) inputRef.current?.focus();
  }, [readOnly]);

  const blockComments = useMemo(() => {
    return (comments || []).filter((c: any) => c.blockId === blockId);
  }, [comments, blockId]);

  const active = useMemo(() => blockComments.filter((c: any) => !c.resolvedAt), [blockComments]);
  const resolved = useMemo(() => blockComments.filter((c: any) => c.resolvedAt), [blockComments]);

  // Real collaborators list (presence users + past commenters + current user)
  const collaborators = useMemo(() => {
    const map = new Map<string, { id: string; name: string; username: string; status: "online" | "offline"; color?: string; avatar?: string }>();

    // Current user
    if (currentUserName && currentUserName !== "Anonymous") {
      map.set(currentUserName.toLowerCase(), {
        id: currentUser?.userId || "self",
        name: currentUserName,
        username: currentUserName.toLowerCase().replace(/\s+/g, ""),
        status: "online",
        color: currentUserColor,
        avatar: currentUserAvatar
      });
    }

    // Active presence users
    presenceUsers.forEach((u) => {
      if (u.userName && u.userName !== "Anonymous") {
        map.set(u.userName.toLowerCase(), {
          id: u.userId,
          name: u.userName,
          username: u.userName.toLowerCase().replace(/\s+/g, ""),
          status: (u as any).status === "editing" || (u as any).status === "viewing" ? "online" : "offline",
          color: u.userColor,
          avatar: u.userAvatar
        });
      }
    });

    // Past commenters on this page
    (comments || []).forEach((c: any) => {
      if (c.userName && !map.has(c.userName.toLowerCase())) {
        map.set(c.userName.toLowerCase(), {
          id: c.userId || c.userName,
          name: c.userName,
          username: c.userName.toLowerCase().replace(/\s+/g, ""),
          status: "offline",
          avatar: c.userAvatar
        });
      }
    });

    return Array.from(map.values());
  }, [presenceUsers, comments, currentUserName, currentUser, currentUserColor, currentUserAvatar]);

  // Autocomplete suggestions for @mention (Real Collaborators + Real Workspace Pages)
  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase().trim();

    const matchedUsers = collaborators
      .filter((u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
      .map((u) => ({
        ...u,
        isPage: false as const
      }));

    const matchedPages = (pages || [])
      .filter((p) => !p.trashed && (p.title || "").toLowerCase().includes(q))
      .slice(0, 6)
      .map((p) => ({
        id: `page_${p.id}`,
        name: p.title || "Untitled",
        username: "page",
        status: "online" as const,
        color: "#3b82f6",
        isPage: true as const,
        icon: p.icon
      }));

    return [...matchedUsers, ...matchedPages];
  }, [mentionQuery, collaborators, pages]);

  // Handle typing inside input and detect @mention trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    if (val.trim()) notifyTyping();

    const cursorPos = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    // Match @ followed by word characters up to the cursor (preceded by start of string or whitespace)
    const lastAtMatch = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);

    if (lastAtMatch && lastAtMatch[1].length < 28) {
      setMentionQuery(lastAtMatch[1]);
      setActiveMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (name: string) => {
    if (mentionQuery === null) return;
    const cursorPos = inputRef.current?.selectionStart ?? text.length;
    const textBeforeCursor = text.slice(0, cursorPos);
    const textAfterCursor = text.slice(cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const nextText = textBeforeCursor.slice(0, lastAtIndex) + `@${name} ` + textAfterCursor;
      setText(nextText);
      setMentionQuery(null);
      setTimeout(() => {
        if (inputRef.current) {
          const nextPos = lastAtIndex + name.length + 2;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 10);
    }
  };

  const triggerMentionAtCursor = () => {
    if (inputRef.current) {
      const val = text;
      const start = inputRef.current.selectionStart ?? val.length;
      const end = inputRef.current.selectionEnd ?? val.length;
      const prefix = start > 0 && val[start - 1] !== " " ? " @" : "@";
      const next = val.slice(0, start) + prefix + val.slice(end);
      setText(next);
      setMentionQuery("");
      setActiveMentionIndex(0);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const nextPos = start + prefix.length;
          inputRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 10);
    } else {
      setText((t) => t + "@");
      setMentionQuery("");
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    onAddComment?.({
      id: uid(),
      blockId,
      pageId,
      text: trimmed,
      userId: currentUser?.userId || "local",
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      verified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null
    });

    setText("");
    setMentionQuery(null);
    setShowEmojiRow(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionQuery !== null && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveMentionIndex((i) => (i + 1) % filteredMentions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveMentionIndex((i) => (i - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = filteredMentions[activeMentionIndex];
        if (selected) insertMention(selected.name);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Escape") {
      onClose?.();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      role="dialog"
      aria-label="Comments"
      initial={{ opacity: 0, scale: 0.96, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12 } }}
      transition={{ type: "spring", stiffness: 480, damping: 32, mass: 0.6 }}
      style={{ transformOrigin: "top left" }}
      className="relative w-[340px] sm:w-[360px] select-none font-sans z-[160]"
    >
      {/* Main Comment Card (Apple Liquid Glass).
          NOTE: no `filter` on this tree — an animated `blur()` on the root
          turned it into a backdrop-root, which broke the card's own
          `backdrop-filter` and let page text show through unblurred. */}
      <div className="rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] bg-white/[0.97] dark:bg-[#1c1c1e]/[0.97] backdrop-blur-2xl backdrop-saturate-150 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.2),0_8px_24px_-4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_28px_65px_-12px_rgba(0,0,0,0.75),0_10px_28px_-4px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[14.5px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              {readOnly ? "Comments" : "Add comment"}
            </span>
            {active.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                {active.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer active:scale-90"
            aria-label="Close"
          >
            <X size={14} strokeWidth={2.4} />
          </button>
        </div>

        {/* Thread Content List */}
        <div className="flex-1 min-h-0 overflow-y-auto max-h-[300px] p-3.5 space-y-3.5 scrollbar-thin">
          {active.length === 0 && resolved.length === 0 && (
            <div className="py-7 flex flex-col items-center justify-center gap-1.5 text-center select-none">
              <div className="w-9 h-9 rounded-full bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center text-neutral-400 mb-0.5">
                <MessageCircle size={16} strokeWidth={2} />
              </div>
              <div className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200">
                No comments yet
              </div>
              <div className="text-[11px] text-neutral-400 max-w-[200px]">
                Leave a comment or mention a page or teammate with @.
              </div>
            </div>
          )}

          {/* Active Thread with continuous vertical connector line */}
          {active.map((c: any, index: number) => {
            const isLast = index === active.length - 1 && !typingPeer;

            return (
              <div key={c.id} className="relative flex items-start gap-3 group/comment">
                {/* Vertical spine thread line */}
                {!isLast && (
                  <div className="absolute left-[13.5px] top-[26px] bottom-[-14px] w-[1.5px] bg-neutral-200 dark:bg-neutral-800 z-0" />
                )}

                {/* Avatar */}
                <div className="relative z-10 shrink-0">
                  <UserAvatar
                    name={c.userName}
                    avatar={c.userAvatar}
                    size={28}
                  />
                </div>

                {/* Comment Body */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {c.userName}
                      </span>
                      {c.verified && <VerifiedBadge />}
                      <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal shrink-0">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>

                    {/* Actions on hover */}
                    <div className="opacity-0 group-hover/comment:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                      {onResolveComment && (
                        <button
                          onClick={() => onResolveComment(c.id)}
                          className="w-5 h-5 rounded-md flex items-center justify-center text-neutral-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                          title="Resolve"
                        >
                          <Check size={11} strokeWidth={2.4} />
                        </button>
                      )}
                      {onDeleteComment && (
                        <button
                          onClick={() => onDeleteComment(c.id)}
                          className="w-5 h-5 rounded-md flex items-center justify-center text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={11} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[12.5px] text-neutral-700 dark:text-neutral-200 leading-relaxed font-normal mt-0.5 whitespace-pre-wrap select-text">
                    {renderText(c.text, pages, onNavigate)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Live typing indicator (realtime broadcast) */}
          {typingPeer && (
            <div className="relative flex items-center gap-3 pt-0.5">
              <div className="relative z-10 shrink-0">
                <UserAvatar
                  name={typingPeer.userName}
                  avatar={typingPeer.userAvatar}
                  color={typingPeer.userColor}
                  size={26}
                />
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-neutral-400 dark:text-neutral-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{typingPeer.userName} is typing...</span>
              </div>
            </div>
          )}

          {/* Resolved Section */}
          {resolved.length > 0 && (
            <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06] space-y-2">
              <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                {resolved.length} resolved
              </div>
              {resolved.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 opacity-50 text-[11px] text-neutral-400">
                  <Check size={11} className="text-emerald-500 shrink-0" />
                  <span className="truncate">{c.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Emoji Reaction Pill Strip */}
        <AnimatePresence>
          {showEmojiRow && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-1.5 border-t border-black/[0.04] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-1.5 overflow-x-auto scrollbar-none"
            >
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setText((prev) => prev + emoji);
                    inputRef.current?.focus();
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm hover:bg-black/5 dark:hover:bg-white/10 hover:scale-115 active:scale-95 transition cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar with User's Real Avatar & Circular Upward Arrow Button.
            Hidden entirely for read-only threads: a viewer can read the
            conversation but the server rejects their writes. */}
        {!readOnly && (
        <div className="relative border-t border-black/[0.06] dark:border-white/[0.08] p-3 flex items-center gap-2.5 shrink-0">
          <UserAvatar
            name={currentUserName}
            avatar={currentUserAvatar}
            color={currentUserColor}
            size={28}
          />

          {/* Seamless Input */}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter your comment"
            className="flex-1 bg-transparent text-[13px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none leading-relaxed"
          />

          {/* Circular Send Button with Upward Arrow */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSubmit}
            disabled={!text.trim()}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
              text.trim()
                ? "bg-sky-500 hover:bg-sky-600 text-white shadow-[0_2px_8px_rgba(14,165,233,0.4)]"
                : "bg-black/[0.06] dark:bg-white/[0.08] text-neutral-400 dark:text-neutral-500 opacity-60 cursor-not-allowed"
            }`}
            title="Send comment (Enter)"
            aria-label="Send"
          >
            <ArrowUp size={14} strokeWidth={2.8} />
          </motion.button>
        </div>
        )}
      </div>

      {/* Floating Bottom Quick Action Toolbar */}
      <div className="flex items-center mt-2.5 px-1">
        {/* Left Floating Pill Toolbar */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#202024]/95 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl">
          {/* Quick Reaction Emoji Icon */}
          <button
            onClick={() => setShowEmojiRow((v) => !v)}
            className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Add reaction"
          >
            <SmilePlus size={16} strokeWidth={2} />
          </button>

          {/* Mention Tag Icon */}
          <button
            onClick={triggerMentionAtCursor}
            className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Mention page or collaborator (@)"
          >
            <AtSign size={15} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Floating @Mention Autocomplete Popover (Real Collaborators + Real Pages) */}
      <AnimatePresence>
        {mentionQuery !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 450, damping: 30, mass: 0.7 }}
            className="absolute left-2 bottom-[68px] w-[285px] rounded-[22px] border border-black/[0.08] dark:border-white/[0.12] bg-white/95 dark:bg-[#1c1c20]/95 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_24px_50px_rgba(0,0,0,0.18),0_8px_20px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_28px_56px_rgba(0,0,0,0.65),0_8px_22px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] p-1.5 z-[170] overflow-hidden flex flex-col"
          >
            {/* Header label */}
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 select-none">
              Mention
            </div>

            {/* Scrollable list */}
            <div className="max-h-[220px] overflow-y-auto scrollbar-thin flex flex-col gap-0.5 pr-0.5">
              {filteredMentions.length === 0 ? (
                <div className="py-4 px-3 text-center text-[12px] text-neutral-400 dark:text-neutral-500 font-medium">
                  No matching people or pages
                </div>
              ) : (
                filteredMentions.map((item: any, idx) => {
                  const isActive = idx === activeMentionIndex;
                  return (
                    <button
                      key={item.id}
                      ref={isActive ? activeItemRef : null}
                      onClick={() => insertMention(item.name)}
                      onMouseEnter={() => setActiveMentionIndex(idx)}
                      className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-[14px] text-left transition-all duration-150 cursor-pointer ${
                        isActive
                          ? "bg-sky-500/12 dark:bg-sky-500/20 text-neutral-900 dark:text-white ring-1 ring-sky-500/30"
                          : "hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <div className="relative shrink-0">
                        {item.isPage ? (
                          <div className="w-7 h-7 rounded-xl bg-sky-500/10 dark:bg-sky-400/15 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                            <PageIcon icon={item.icon} size={14} fallback={<span>📄</span>} />
                          </div>
                        ) : (
                          <UserAvatar
                            name={item.name}
                            avatar={item.avatar}
                            color={item.color}
                            size={28}
                            showStatusDot={true}
                            status={item.status}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold truncate leading-tight">
                          {item.name}
                        </div>
                        <div className="text-[10.5px] truncate leading-tight mt-0.5">
                          {item.isPage ? (
                            <span className="text-sky-600 dark:text-sky-400 font-medium">Workspace document</span>
                          ) : item.status === "online" ? (
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">Active now</span>
                          ) : (
                            <span className="text-neutral-400 dark:text-neutral-500">@{item.username}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Micro keyboard hint footer */}
            <div className="flex items-center justify-between px-2.5 pt-1.5 pb-0.5 border-t border-black/[0.04] dark:border-white/[0.06] text-[10px] text-neutral-400 dark:text-neutral-500 select-none mt-1">
              <span>↑↓ to navigate</span>
              <span>↵ to insert</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
