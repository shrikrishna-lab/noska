import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Smile, AtSign, CheckCircle, Trash2, Edit2, CornerDownRight, X, MessageCircle, Check } from "lucide-react";
import { PageIcon } from "../PageIcon";
import { uid } from "../../utils/helpers";

export default function CommentThread({ comments, blockId, pageId, onAddComment, onResolveComment, onClose, pages, onNavigate }) {
  const [text, setText] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);

  const blockComments = (comments || []).filter(c => c.blockId === blockId);
  const resolved = blockComments.filter(c => c.resolvedAt);
  const active = blockComments.filter(c => !c.resolvedAt);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddComment?.({
      id: uid(),
      blockId,
      pageId,
      text: trimmed,
      userId: "local",
      userName: "You",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null
    });
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "@") {
      setMentionOpen(true);
    }
  };

  const insertMention = (pageTitle) => {
    setText(prev => prev + `@${pageTitle} `);
    setMentionOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -2 }}
      className="w-[300px] rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow-2xl overflow-hidden flex flex-col z-[160]"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-1.5">
          <MessageCircle size={14} className="text-[var(--accent)]" />
          <span className="text-xs font-semibold">Comments</span>
          <span className="text-[10px] text-[var(--muted)]">({active.length})</span>
        </div>
        <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-2">
        {active.length === 0 && resolved.length === 0 && (
          <div className="py-6 text-center text-[11px] text-[var(--muted)]">No comments yet</div>
        )}

        {active.map((c) => (
          <div key={c.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="grid h-5 w-5 place-items-center rounded-full bg-[var(--accent)] text-[9px] font-bold text-white">
                  {(c.userName || "?")[0]}
                </div>
                <span className="text-[11px] font-medium">{c.userName}</span>
                <span className="text-[9px] text-[var(--muted)]">{timeAgo(c.createdAt)}</span>
              </div>
              <button
                onClick={() => onResolveComment?.(c.id)}
                className="text-[var(--muted)] hover:text-[var(--success)] cursor-pointer p-0.5"
                title="Resolve"
              >
                <Check size={12} />
              </button>
            </div>
            <p className="text-[12px] leading-relaxed text-[var(--text)]/80 whitespace-pre-wrap">{renderText(c.text, pages, onNavigate)}</p>
          </div>
        ))}

        {resolved.length > 0 && (
          <>
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-[9px] text-[var(--muted)] font-medium uppercase tracking-wider">{resolved.length} resolved</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>
            {resolved.map((c) => (
              <div key={c.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)]/50 p-2.5 opacity-60">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="grid h-4 w-4 place-items-center rounded-full bg-[var(--muted)] text-[7px] font-bold text-white">
                    {(c.userName || "?")[0]}
                  </div>
                  <span className="text-[10px] text-[var(--muted)]">{c.userName}</span>
                  <Check size={10} className="text-[var(--success)]" />
                </div>
                <p className="text-[11px] text-[var(--muted)] line-through">{c.text}</p>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="border-t border-[var(--border)] p-2 bg-[var(--surface)]">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment... (@ to mention)"
            rows={2}
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 pr-16 text-[12px] outline-none focus:border-[var(--accent)] transition placeholder:text-[var(--muted)]"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <button
              onClick={() => setMentionOpen(!mentionOpen)}
              className="p-1 rounded text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--hover)] cursor-pointer"
              title="Mention page"
            >
              <AtSign size={13} />
            </button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="p-1 rounded text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Send"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
        {mentionOpen && (
          <div className="mt-1 rounded border border-[var(--border)] bg-[var(--elevated)] p-1 max-h-[120px] overflow-y-auto">
            {(pages || []).filter(p => !p.trashed).slice(0, 8).map(p => (
              <button
                key={p.id}
                onClick={() => insertMention(p.title || "Untitled")}
                className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] hover:bg-[var(--hover)] cursor-pointer"
              >
                <span className="flex items-center justify-center">
                  <PageIcon icon={p.icon} size={13} fallback={<span>📄</span>} />
                </span>
                <span className="truncate">{p.title || "Untitled"}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function renderText(text, pages, onNavigate) {
  let html = text.replace(/@(\S+)/g, (match, name) => {
    const page = (pages || []).find(p => p.title === name || `@${p.title}` === match);
    if (page) return `<span class="text-[var(--accent)] cursor-pointer" data-mention="${page.id}">${match}</span>`;
    return `<span class="text-[var(--accent)]">${match}</span>`;
  });
  return <span dangerouslySetInnerHTML={{ __html: html }} onClick={(e) => {
    e.stopPropagation();
    const mention = (e.target as HTMLElement).closest('[data-mention]') as HTMLElement | null;
    if (mention && onNavigate) onNavigate(mention.dataset.mention, { altKey: e.altKey });
  }} />;
}
