import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownToLine, Replace, Copy, ArrowUpFromLine, Sparkles, ChevronDown } from 'lucide-react';

function ActionBtn({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition cursor-pointer"
      title={label}
    >
      <Icon size={9} />
      {label}
    </button>
  );
}

function parseThinking(text: string) {
  if (!text) return { thought: null, cleanText: text };
  
  // Match <think>...</think>
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    const thought = thinkMatch[1].trim();
    const cleanText = text.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    return { thought, cleanText };
  }

  // Match [Reasoning Process]... or [Thinking: ...]
  const bracketMatch = text.match(/\[(?:Thinking Process|Reasoning Process|Thinking)\]([\s\S]*?)\[\/(?:Thinking Process|Reasoning Process|Thinking)\]/i);
  if (bracketMatch) {
    const thought = bracketMatch[1].trim();
    const cleanText = text.replace(/\[(?:Thinking Process|Reasoning Process|Thinking)\][\s\S]*?\[\/(?:Thinking Process|Reasoning Process|Thinking)\]/i, '').trim();
    return { thought, cleanText };
  }

  return { thought: null, cleanText: text };
}

export default function ChatMessage({
  message, index, total, isLastAi,
  onInsertBelow, onReplace, onCopy, onBranch, onReaction
}) {
  const isUser = message.role === 'user';
  const isFirstAi = index === 0 && !isUser;

  const { thought, cleanText } = React.useMemo(() => {
    if (isUser) return { thought: null, cleanText: message.text };
    return parseThinking(message.text || '');
  }, [isUser, message.text]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24, delay: index === total - 1 ? 0.05 : 0 }}
      className={`group relative max-w-[88%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
        isUser
          ? 'ml-auto bg-[var(--accent)] text-white font-medium shadow-sm'
          : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-xs'
      }`}
    >
      {/* AI icon for AI messages */}
      {!isUser && !isFirstAi && (
        <div className="absolute -left-7 top-2 w-5 h-5 rounded-full bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-center">
          <span className="text-[8px]">✦</span>
        </div>
      )}

      {/* Collapsible Chain-of-Thought Reasoning Box (like ChatGPT / Claude 3.7) */}
      {!isUser && thought && (
        <details className="mb-2.5 group/think rounded-xl bg-[#ede8df]/50 dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 overflow-hidden text-xs">
          <summary className="px-3 py-1.5 flex items-center justify-between cursor-pointer font-mono text-[10.5px] text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white select-none transition-colors">
            <span className="flex items-center gap-1.5 font-semibold">
              <Sparkles size={11} className="text-purple-500 animate-pulse" />
              <span>Thought Process</span>
            </span>
            <ChevronDown size={11} className="group-open/think:rotate-180 transition-transform duration-200" />
          </summary>
          <div className="px-3 pb-2.5 pt-1 text-[11px] text-[#706c64] dark:text-[#a09c94] border-t border-[#e8e4db]/60 dark:border-white/5 whitespace-pre-wrap font-sans leading-relaxed">
            {thought}
          </div>
        </details>
      )}

      {/* Content */}
      {isUser ? (
        <span className="whitespace-pre-wrap">{cleanText || message.text}</span>
      ) : (
        <div className="ai-md-container" dangerouslySetInnerHTML={{ __html: message.html || cleanText || message.text }} />
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
