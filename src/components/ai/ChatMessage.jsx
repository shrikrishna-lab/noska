import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownToLine, Replace, Copy, ArrowUpFromLine } from 'lucide-react';

function ActionBtn({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition"
      title={label}
    >
      <Icon size={9} />
      {label}
    </button>
  );
}

export default function ChatMessage({
  message, index, total, isLastAi,
  onInsertBelow, onReplace, onCopy, onBranch, onReaction
}) {
  const isUser = message.role === 'user';
  const isFirstAi = index === 0 && !isUser;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24, delay: index === total - 1 ? 0.05 : 0 }}
      className={`group relative max-w-[88%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
        isUser
          ? 'ml-auto bg-[var(--accent)] text-white font-medium shadow-sm'
          : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]'
      }`}
    >
      {/* AI icon for AI messages */}
      {!isUser && !isFirstAi && (
        <div className="absolute -left-7 top-2 w-5 h-5 rounded-full bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-center">
          <span className="text-[8px]">✦</span>
        </div>
      )}

      {/* Content */}
      {isUser ? (
        <span className="whitespace-pre-wrap">{message.text}</span>
      ) : (
        <div className="ai-md-container" dangerouslySetInnerHTML={{ __html: message.html || message.text }} />
      )}

      {/* Reactions */}
      {!isUser && !isFirstAi && message.text !== '...' && (
        <div className="mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {['👍', '👎', '⭐'].map(r => (
            <button
              key={r}
              onClick={() => onReaction?.(index, r)}
              className={`grid h-4 w-4 place-items-center rounded text-[10px] transition ${
                message.reactions?.includes(r)
                  ? 'bg-[var(--accent)]/20 scale-110'
                  : 'text-[var(--muted)] hover:bg-[var(--hover)]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {!isUser && !isFirstAi && message.text !== '...' && (
        <div className="mt-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionBtn icon={ArrowDownToLine} label="Insert below" onClick={() => onInsertBelow?.(message.text)} />
          <ActionBtn icon={Replace} label="Replace page" onClick={() => onReplace?.(message.text)} />
          <ActionBtn icon={Copy} label="Copy" onClick={() => onCopy?.(message.text)} />
          <ActionBtn icon={ArrowUpFromLine} label="Branch" onClick={() => onBranch?.(index)} />
        </div>
      )}
    </motion.div>
  );
}
