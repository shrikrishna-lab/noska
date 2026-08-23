import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, MessageSquare, Pin, Archive, ArchiveRestore,
  MoreHorizontal, Trash2, Copy, Users, Check, X, Edit3, Sparkles
} from 'lucide-react';
import type { AIChat } from '../../lib/supabaseService';

interface ChatSidebarProps {
  chats: AIChat[];
  activeChatId?: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename?: (id: string, name: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filter?: string;
  onFilterChange?: (filter: string) => void;
}

function timeGroup(dateStr?: string | null): string {
  if (!dateStr) return 'Recent';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Recent';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday.getTime() - 86400000);
  const startWeek = new Date(startToday.getTime() - 7 * 86400000);

  if (d >= startToday) return 'Today';
  if (d >= startYesterday) return 'Yesterday';
  if (d >= startWeek) return 'This Week';
  return 'Earlier';
}

function ChatItem({
  chat,
  active,
  onSelect,
  onRename,
  onArchive,
  onDelete,
  onDuplicate
}: {
  chat: AIChat;
  active: boolean;
  onSelect: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState(chat.name || 'Conversation');

  const handleRename = () => {
    if (name.trim() && name !== chat.name) {
      onRename?.(chat.id, name.trim());
    }
    setRenaming(false);
  };

  return (
    <div className="relative group px-2 py-0.5">
      <motion.div
        layout
        onClick={() => onSelect(chat.id)}
        className={`flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer text-left transition-all duration-150 ${
          active
            ? 'bg-[var(--accent)]/15 border border-[var(--accent)]/30 shadow-xs'
            : 'hover:bg-[var(--surface-2)] border border-transparent'
        }`}
      >
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
            active ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-3)] text-[var(--muted)]'
          }`}
        >
          {chat.pinned ? <Pin size={11} className="text-[var(--accent)]" /> : <MessageSquare size={11} />}
        </div>

        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setRenaming(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-[var(--surface-3)] rounded px-1.5 py-0.5 text-xs text-[var(--text)] outline-none border border-[var(--accent)]"
            />
          ) : (
            <>
              <div className="text-xs font-medium text-[var(--text)] truncate">
                {chat.name || 'New conversation'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[var(--muted)]">
                {chat.pageTitle && (
                  <span className="truncate max-w-[90px] text-[var(--text-secondary)]">
                    {chat.pageTitle}
                  </span>
                )}
                {chat.messages && (
                  <span>· {chat.messages.length} msg{chat.messages.length > 1 ? 's' : ''}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Hover action menu button */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]"
          >
            <MoreHorizontal size={12} />
          </button>
        </div>
      </motion.div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 2 }}
            className="absolute right-3 top-full z-50 mt-1 w-36 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1 shadow-lg backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setRenaming(true);
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg text-left"
            >
              <Edit3 size={12} /> Rename
            </button>
            <button
              type="button"
              onClick={() => {
                onDuplicate?.(chat.id);
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg text-left"
            >
              <Copy size={12} /> Duplicate
            </button>
            <button
              type="button"
              onClick={() => {
                onArchive?.(chat.id);
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg text-left"
            >
              {chat.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
              {chat.archived ? 'Unarchive' : 'Archive'}
            </button>
            <div className="my-1 border-t border-[var(--border)]" />
            <button
              type="button"
              onClick={() => {
                onDelete?.(chat.id);
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-lg text-left"
            >
              <Trash2 size={12} /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChatSidebar({
  chats = [],
  activeChatId,
  onSelect,
  onNew,
  onRename,
  onArchive,
  onDelete,
  onDuplicate,
  searchQuery = "",
  onSearchChange,
  filter = "all",
  onFilterChange
}: ChatSidebarProps) {
  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      if (filter === 'pinned' && !c.pinned) return false;
      if (filter === 'archived' && !c.archived) return false;
      if (filter === 'all' && c.archived) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = (c.name || '').toLowerCase().includes(query);
        const matchPage = (c.pageTitle || '').toLowerCase().includes(query);
        if (!matchTitle && !matchPage) return false;
      }
      return true;
    });
  }, [chats, filter, searchQuery]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, AIChat[]> = {};
    for (const chat of filteredChats) {
      const g = timeGroup(chat.updatedAt || chat.createdAt);
      if (!groups[g]) groups[g] = [];
      groups[g].push(chat);
    }
    return groups;
  }, [filteredChats]);

  return (
    <div className="flex flex-col h-full bg-[var(--sidebar)] select-none">
      {/* Header with New Chat */}
      <div className="p-3 border-b border-[var(--border)] flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          Chats
        </span>
        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-all font-medium text-xs shadow-xs"
        >
          <Plus size={13} />
          New Chat
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-2.5 space-y-2 border-b border-[var(--border)]">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)]/50 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'pinned', label: 'Pinned' },
            { id: 'archived', label: 'Archived' }
          ].map((tab) => {
            const count = tab.id === 'pinned'
              ? chats.filter(c => c.pinned).length
              : tab.id === 'archived'
                ? chats.filter(c => c.archived).length
                : chats.filter(c => !c.archived).length;
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFilterChange?.(tab.id)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors ${
                  active
                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                    : 'text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
                }`}
              >
                {tab.label} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
            <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] mb-2">
              <MessageSquare size={14} />
            </div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">No conversations</p>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">Start a new chat to begin</p>
          </div>
        ) : (
          Object.entries(grouped).map(([groupTitle, groupChats]) => (
            <div key={groupTitle} className="mb-3">
              <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">
                {groupTitle}
              </div>
              {groupChats.map((c) => (
                <ChatItem
                  key={c.id}
                  chat={c}
                  active={c.id === activeChatId}
                  onSelect={onSelect}
                  onRename={onRename}
                  onArchive={onArchive}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
