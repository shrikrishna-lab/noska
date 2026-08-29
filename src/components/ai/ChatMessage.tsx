import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Copy, Upload, Pencil, Check, RotateCcw, ArrowDownToLine,
  Replace, Sparkles, ChevronDown, ThumbsUp,
  ThumbsDown, Star, GitBranch
} from 'lucide-react';
import { renderAIMarkdown } from '../../utils/aiMarkdownRenderer';

function UserActions({
  text,
  onCopy,
  onInsert,
  onStartEdit,
  onRetry,
}: {
  text: string;
  onCopy?: (t: string) => void;
  onInsert?: (t: string) => void;
  onStartEdit?: () => void;
  onRetry?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      onCopy?.(text);
    } catch {
      onCopy?.(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-1.5 mt-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      {/* 1. Copy Icon */}
      <button
        type="button"
        onClick={handleCopy}
        className="p-1 rounded-md text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
        title="Copy prompt"
      >
        {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
      </button>

      {/* 2. Upload / Insert into document */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onInsert?.(text);
        }}
        className="p-1 rounded-md text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
        title="Insert into document"
      >
        <Upload size={13} />
      </button>

      {/* 3. Edit prompt (in-place editor) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onStartEdit?.();
        }}
        className="p-1 rounded-md text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
        title="Edit prompt"
      >
        <Pencil size={13} />
      </button>

      {/* 4. Retry / Re-run prompt */}
      {onRetry && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="p-1 rounded-md text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          title="Retry prompt"
        >
          <RotateCcw size={13} />
        </button>
      )}
    </div>
  );
}

function AiMessageActions({
  text,
  reactions = [],
  onCopy,
  onInsertBelow,
  onReplace,
  onBranch,
  onRetry,
  onReaction,
}: {
  text: string;
  reactions?: string[];
  onCopy?: (t: string) => void;
  onInsertBelow?: (t: string) => void;
  onReplace?: (t: string) => void;
  onBranch?: () => void;
  onRetry?: () => void;
  onReaction?: (reaction: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      onCopy?.(text);
    } catch {
      onCopy?.(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isLiked = reactions.includes('up') || reactions.includes('👍');
  const isDisliked = reactions.includes('down') || reactions.includes('👎');
  const isStarred = reactions.includes('star') || reactions.includes('⭐');

  return (
    <div className="flex items-center gap-0.5 mt-2.5 pt-1.5 border-t border-black/5 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[#706c64] dark:text-[#a09c94]">
      {/* 1. Copy */}
      <button
        type="button"
        onClick={handleCopy}
        className="p-1.5 rounded-lg hover:text-[#1c1b18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
        title="Copy response"
      >
        {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
      </button>

      {/* 2. Insert below into page */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onInsertBelow?.(text);
        }}
        className="p-1.5 rounded-lg hover:text-[#1c1b18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
        title="Insert into document"
      >
        <ArrowDownToLine size={13} />
      </button>

      {/* 3. Replace page */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReplace?.(text);
        }}
        className="p-1.5 rounded-lg hover:text-[#1c1b18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
        title="Replace document with AI draft"
      >
        <Replace size={13} />
      </button>

      {/* 4. Branch chat */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onBranch?.();
        }}
        className="p-1.5 rounded-lg hover:text-[#1c1b18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
        title="Branch into new conversation"
      >
        <GitBranch size={13} />
      </button>

      {/* 5. Regenerate */}
      {onRetry && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="p-1.5 rounded-lg hover:text-[#1c1b18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          title="Regenerate response"
        >
          <RotateCcw size={13} />
        </button>
      )}

      {/* Subtle Divider */}
      <div className="w-[1px] h-3 bg-black/10 dark:bg-white/10 mx-1 shrink-0" />

      {/* 6. Thumbs Up */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReaction?.('👍');
        }}
        className={`p-1.5 rounded-lg transition cursor-pointer ${
          isLiked
            ? 'text-purple-600 dark:text-purple-400 bg-purple-500/10'
            : 'hover:text-[#1c1b18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
        }`}
        title="Good response"
      >
        <ThumbsUp size={13} className={isLiked ? 'fill-current' : ''} />
      </button>

      {/* 7. Thumbs Down */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReaction?.('👎');
        }}
        className={`p-1.5 rounded-lg transition cursor-pointer ${
          isDisliked
            ? 'text-red-500 bg-red-500/10'
            : 'hover:text-[#1c1b18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
        }`}
        title="Bad response"
      >
        <ThumbsDown size={13} className={isDisliked ? 'fill-current' : ''} />
      </button>

      {/* 8. Star */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReaction?.('⭐');
        }}
        className={`p-1.5 rounded-lg transition cursor-pointer ${
          isStarred
            ? 'text-amber-500 bg-amber-500/10'
            : 'hover:text-[#1c1b18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
        }`}
        title="Star response"
      >
        <Star size={13} className={isStarred ? 'fill-current' : ''} />
      </button>
    </div>
  );
}

function parseThinking(text: string) {
  if (!text) return { thought: null, cleanText: text };

  // Strip tool execution tags so raw syntax is never shown in message text
  let sanitized = text
    .replace(/<<TOOL:[\s\S]*?>>[\s\S]*?<<\/TOOL>>/gi, '')
    .replace(/<<TOOL:[\s\S]*?>>/gi, '')
    .replace(/<<\/TOOL>>/gi, '')
    .trim();

  // Match <think>...</think>
  const thinkMatch = sanitized.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    const thought = thinkMatch[1].trim();
    const cleanText = sanitized.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    return { thought, cleanText: cleanText || (thought ? '' : sanitized) };
  }

  // Match [Reasoning Process]... or [Thinking: ...]
  const bracketMatch = sanitized.match(/\[(?:Thinking Process|Reasoning Process|Thinking)\]([\s\S]*?)\[\/(?:Thinking Process|Reasoning Process|Thinking)\]/i);
  if (bracketMatch) {
    const thought = bracketMatch[1].trim();
    const cleanText = sanitized.replace(/\[(?:Thinking Process|Reasoning Process|Thinking)\][\s\S]*?\[\/(?:Thinking Process|Reasoning Process|Thinking)\]/i, '').trim();
    return { thought, cleanText: cleanText || (thought ? '' : sanitized) };
  }

  return { thought: null, cleanText: sanitized };
}

interface ChatMessageProps {
  message: {
    id?: string;
    role: string;
    text: string;
    html?: string;
    reactions?: string[];
    model?: string;
    provider?: string;
    latencyMs?: number;
    status?: 'streaming' | 'completed' | 'cancelled' | 'error';
  };
  index: number;
  total: number;
  isLastAi: boolean;
  isStreaming?: boolean;
  onInsertBelow?: (text: string) => void;
  onReplace?: (text: string) => void;
  onCopy?: (text: string) => void;
  onBranch?: (index: number) => void;
  onReaction?: (index: number, reaction: string) => void;
  onRetry?: () => void;
  onEditAndResend?: (index: number, newText: string) => void;
}

/**
 * Individual chat message component.
 *
 * - In-place prompt editor when editing
 * - CSS-driven entry animation
 * - Action buttons: Copy, Insert, Replace, Branch, Retry, Edit, Reactions
 */
const ChatMessage = React.memo(function ChatMessage({
  message, index, total, isLastAi, isStreaming,
  onInsertBelow, onReplace, onCopy, onBranch, onReaction, onRetry, onEditAndResend,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isPlaceholder = message.text === '...';
  const isError = message.status === 'error';
  const isCancelled = message.status === 'cancelled';

  const { thought, cleanText } = React.useMemo(() => {
    if (isUser || isPlaceholder) return { thought: null, cleanText: message.text };
    return parseThinking(message.text || '');
  }, [isUser, isPlaceholder, message.text]);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(cleanText || message.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditText(cleanText || message.text);
  }, [cleanText, message.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, [isEditing]);

  const renderedHtml = useMemo(() => {
    if (isUser || isPlaceholder) return '';
    return message.html || renderAIMarkdown(cleanText || message.text || '');
  }, [isUser, isPlaceholder, message.html, cleanText, message.text]);

  // Don't render the "..." placeholder — the ThinkingIndicator handles that
  if (isPlaceholder) return null;

  const showActions = !isUser && !isPlaceholder && message.text !== '...' && !isStreaming;
  const isNew = index >= total - 2;

  const handleSendEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setIsEditing(false);
    onEditAndResend?.(index, trimmed);
  };

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full group`}>
      {/* In-Place Prompt Editor Mode */}
      {isUser && isEditing ? (
        <div className="w-full max-w-[92%] rounded-2xl bg-[#e8dfcf] dark:bg-[#322e28] text-[#1c1b18] dark:text-[#f4f0eb] p-3.5 shadow-md transition-all">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendEdit();
              } else if (e.key === 'Escape') {
                setIsEditing(false);
                setEditText(cleanText || message.text);
              }
            }}
            rows={Math.min(6, Math.max(2, editText.split('\n').length))}
            className="w-full bg-transparent text-[13.5px] text-[#1c1b18] dark:text-[#f4f0eb] outline-none resize-none placeholder-[#1c1b18]/40 dark:placeholder-white/40 leading-relaxed font-sans border-0 focus:outline-none focus:ring-0 focus:border-0 shadow-none ring-0 p-0"
            style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            placeholder="Edit your prompt..."
          />
          <div className="flex items-center justify-end gap-2 mt-2.5 pt-2 border-t border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditText(cleanText || message.text);
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendEdit}
              disabled={!editText.trim()}
              className="px-4 py-1.5 rounded-full bg-[#1c1b18] dark:bg-white text-white dark:text-[#18181a] text-xs font-bold hover:opacity-90 disabled:opacity-40 transition cursor-pointer shadow-xs"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        /* Normal Message Card View */
        <div
          className={`relative max-w-[88%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed contain-content ${
            isNew ? 'noska-message-enter' : ''
          } ${
            isUser
              ? 'bg-[#e8dfcf] dark:bg-[#322e28] text-[#1c1b18] dark:text-[#f4f0eb] font-normal shadow-2xs border border-[#ded4c2] dark:border-[#423d35]'
              : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-xs'
          } ${
            isError ? 'border-red-300 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/20' : ''
          } ${
            isCancelled ? 'opacity-80' : ''
          }`}
        >
          {/* AI icon */}
          {!isUser && index > 0 && (
            <div className="absolute -left-7 top-2 w-5 h-5 rounded-full bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-center">
              <span className="text-[8px]">✦</span>
            </div>
          )}

          {/* Collapsible Chain-of-Thought */}
          {!isUser && thought && (
            <ThinkingBlock thought={thought} />
          )}

          {/* Content */}
          {isUser ? (
            <span className="whitespace-pre-wrap">{cleanText || message.text}</span>
          ) : (
            <div className={`ai-md-container ${isStreaming ? 'noska-response-reveal' : ''}`}>
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
              {/* Streaming cursor */}
              {isStreaming && (
                <span className="inline-block w-[2px] h-[14px] bg-[var(--accent)] ml-0.5 align-middle animate-pulse" />
              )}
            </div>
          )}

          {/* Cancelled indicator */}
          {isCancelled && (
            <div className="mt-2 pt-1.5 border-t border-[var(--border)] flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
              <span>⏹</span> Generation stopped
            </div>
          )}

          {/* Error state */}
          {isError && onRetry && (
            <div className="mt-2 pt-1.5 border-t border-red-200 dark:border-red-800/40 flex items-center gap-2">
              <span className="text-[10px] text-red-500 dark:text-red-400">Unable to generate response</span>
              <button
                onClick={onRetry}
                className="flex items-center gap-1 text-[10px] font-medium text-[var(--accent)] hover:underline cursor-pointer"
              >
                <RotateCcw size={9} /> Retry
              </button>
            </div>
          )}

          {/* Sleek AI Action & Reaction Toolbar */}
          {showActions && (
            <AiMessageActions
              text={cleanText || message.text}
              reactions={message.reactions}
              onCopy={onCopy}
              onInsertBelow={onInsertBelow}
              onReplace={onReplace}
              onBranch={() => onBranch?.(index)}
              onRetry={onRetry}
              onReaction={(reaction) => onReaction?.(index, reaction)}
            />
          )}
        </div>
      )}

      {/* User Message Action Buttons (Copy, Upload/Insert, Edit/Pencil, Retry) */}
      {isUser && !isEditing && (
        <UserActions
          text={cleanText || message.text}
          onCopy={onCopy}
          onInsert={onInsertBelow}
          onStartEdit={() => setIsEditing(true)}
          onRetry={onRetry}
        />
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.message.text === next.message.text &&
    prev.message.html === next.message.html &&
    prev.message.status === next.message.status &&
    prev.isLastAi === next.isLastAi &&
    prev.isStreaming === next.isStreaming &&
    prev.total === next.total &&
    prev.index === next.index
  );
});

/** Collapsible thinking/reasoning block */
function ThinkingBlock({ thought }: { thought: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2.5 rounded-xl bg-[#ede8df]/50 dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-1.5 flex items-center justify-between cursor-pointer font-mono text-[10.5px] text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white select-none transition-colors"
      >
        <span className="flex items-center gap-1.5 font-semibold">
          <Sparkles size={11} className="text-purple-500" />
          <span>Thought Process</span>
        </span>
        <ChevronDown size={11} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-2.5 pt-1 text-[11px] text-[#706c64] dark:text-[#a09c94] border-t border-[#e8e4db]/60 dark:border-white/5 whitespace-pre-wrap font-sans leading-relaxed">
          {thought}
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
