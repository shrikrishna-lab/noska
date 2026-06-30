import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import {
  Users,
  X,
  Link2,
  Copy,
  Check,
  MessageCircle,
  Send,
  UserPlus,
  Wifi,
  WifiOff,
} from "lucide-react";
import { uid, now } from "../../utils/helpers";

/* ─── Real current user ─── */

function getCurrentUser() {
  const u = window.realtimeCollab?.getUser?.();
  return {
    id: u?.userId || 'local',
    name: u?.userName || 'You',
    avatar: u?.userAvatar || '👤',
    color: '#7c3aed'
  };
}

/* ─── Comment thread ─── */

function CommentThread({ comments, onAdd, onClose }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 5 }}
      transition={SPRING_PRESETS.stiff}
      className="w-72 rounded-xl border border-[var(--border-strong)] bg-[var(--elevated)] p-3 shadow-2xl"
    >
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle size={13} className="text-[var(--accent)]" />
        <span className="text-xs font-semibold text-[var(--text)]">Comments</span>
        <button onClick={onClose} className="ml-auto text-[var(--muted)] hover:text-[var(--text)]">
          <X size={12} />
        </button>
      </div>
      <div className="max-h-40 overflow-y-auto space-y-2 mb-2 scrollbar-thin">
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg bg-[var(--surface)] px-2.5 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs">{c.avatar || "👤"}</span>
              <span className="text-[10px] font-medium text-[var(--text)]">{c.author}</span>
              <span className="text-[9px] text-[var(--muted)] ml-auto">{c.time || "now"}</span>
            </div>
            <p className="text-xs text-[var(--secondary)] leading-4">{c.text}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-xs text-[var(--muted)] py-2 text-center">No comments yet</p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 rounded-lg bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent)] text-white disabled:opacity-40"
        >
          <Send size={11} />
        </button>
      </form>
    </motion.div>
  );
}

/* ─── main component ─── */

export default function CoThinking({
  page,
  onBlockPatch,
  onClose,
  onToast
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const [sessionActive, setSessionActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeCollaborators, setActiveCollaborators] = useState([]);
  const [commentBlockId, setCommentBlockId] = useState(null);

  const sessionLink = useMemo(() => {
    return `noska://session/${uid()}`;
  }, []);

  const startSession = () => {
    setSessionActive(true);
    const me = getCurrentUser();
    setActiveCollaborators([me]);
    onToast?.("Session started — share the link for others to join");
  };

  const endSession = () => {
    setSessionActive(false);
    setActiveCollaborators([]);
    onToast?.("Session ended");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(sessionLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onToast?.("Session link copied");
    } catch {
      onToast?.("Failed to copy");
    }
  };

  const addComment = (blockId, text) => {
    const block = page.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const me = getCurrentUser();
    const comment = {
      id: uid(),
      author: me.name,
      avatar: me.avatar,
      text,
      time: "now",
      timestamp: now()
    };
    const comments = [...(block.comments || []), comment];
    onBlockPatch(blockId, { comments });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-6"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="w-[600px] max-w-full max-h-[calc(100vh-48px)] flex flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <Users size={18} className="text-[var(--accent)]" />
          <h2 className="flex-1 font-semibold text-[var(--text)]">Co-thinking</h2>
          {sessionActive && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-1.5 text-xs text-emerald-400"
            >
              <Wifi size={12} />
              Live
            </motion.div>
          )}
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={16} />
          </button>
        </div>

        {!sessionActive ? (
          /* Session setup */
          <div className="p-6 space-y-5">
            <div className="text-center py-4">
              <motion.div
                className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[var(--accent)]/10"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Users size={28} className="text-[var(--accent)]" />
              </motion.div>
              <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Start a Co-thinking Session</h3>
              <p className="text-sm text-[var(--secondary)] max-w-sm mx-auto">
                Collaborate in real-time with others. Share the session link and see cursors, comments, and edits live.
              </p>
            </div>

            {/* Session link */}
            <div className="flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2">
              <Link2 size={14} className="shrink-0 text-[var(--muted)]" />
              <span className="flex-1 truncate text-xs text-[var(--secondary)] font-mono">{sessionLink}</span>
              <button
                onClick={copyLink}
                className="shrink-0 grid h-6 w-6 place-items-center rounded text-[var(--muted)] hover:text-[var(--text)]"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>

            <motion.button
              onClick={startSession}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm"
            >
              <UserPlus size={15} />
              Start Session
            </motion.button>
          </div>
        ) : (
          /* Active session */
          <div className="flex-1 flex flex-col">
            {/* Collaborators bar */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-2">
              <div className="flex -space-x-2">
                {activeCollaborators.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--bg)] text-xs"
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  >
                    {c.avatar}
                  </motion.div>
                ))}
              </div>
              <span className="text-xs text-[var(--muted)]">
                {activeCollaborators.length} online
              </span>
              <div className="flex-1" />
              <motion.button
                onClick={endSession}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
              >
                <WifiOff size={12} />
                End Session
              </motion.button>
            </div>

            {/* Editor with cursors */}
            <div className="relative flex-1 overflow-y-auto p-5 scrollbar-thin" style={{ minHeight: 300 }}>

              {/* Block list with comment indicators */}
              <div className="space-y-1">
                {page?.blocks?.map((block) => (
                  <div key={block.id} className="group relative flex items-start gap-2 rounded-lg px-3 py-2 hover:bg-[var(--surface)]">
                    <div className="flex-1 text-sm text-[var(--text)] leading-6">
                      {block.type === "h1" && <span className="text-lg font-bold">{block.text}</span>}
                      {block.type === "h2" && <span className="text-base font-semibold">{block.text}</span>}
                      {block.type === "h3" && <span className="text-sm font-semibold">{block.text}</span>}
                      {block.type === "bullet" && <span>• {block.text}</span>}
                      {block.type === "todo" && <span>{block.checked ? "☑" : "☐"} {block.text}</span>}
                      {!["h1","h2","h3","bullet","todo"].includes(block.type) && <span>{block.text || "(empty)"}</span>}
                    </div>
                    {/* Comment indicator */}
                    <button
                      onClick={() => setCommentBlockId(commentBlockId === block.id ? null : block.id)}
                      className={`shrink-0 grid h-6 w-6 place-items-center rounded text-xs transition-opacity ${
                        block.comments?.length
                          ? "opacity-100 text-[var(--accent)]"
                          : "opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      <MessageCircle size={13} />
                      {block.comments?.length > 0 && (
                        <span className="absolute -top-1 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-[var(--accent)] text-[8px] text-white">
                          {block.comments.length}
                        </span>
                      )}
                    </button>

                    {/* Comment thread popover */}
                    <AnimatePresence>
                      {commentBlockId === block.id && (
                        <div className="absolute right-0 top-full z-20 mt-1">
                          <CommentThread
                            comments={block.comments || []}
                            onAdd={(text) => addComment(block.id, text)}
                            onClose={() => setCommentBlockId(null)}
                          />
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
