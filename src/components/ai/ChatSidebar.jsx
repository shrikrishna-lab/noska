import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, MessageSquare, Pin, Archive, ArchiveRestore,
  MoreHorizontal, Trash2, Copy, Users, Check, X, Edit3, ChevronDown, ChevronRight
} from 'lucide-react';

function timeGroup(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday - 86400000);
  const startWeek = new Date(startToday - now.getDay() * 86400000);

  if (d >= startToday) return 'Today';
  if (d >= startYesterday) return 'Yesterday';
  if (d >= startWeek) return 'This Week';
  if (d.getMonth() === now.getMonth()) return 'Earlier this Month';
  return 'Older';
}

const ICONS = {
  pinned: Pin, archived: Archive, shared: Users, collab: Users, default: MessageSquare
};

function ChatCard({ chat, active, onSelect, onRename, onArchive, onDelete, onDuplicate }) {
  const [showMenu, setShowMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(chat.title || chat.name || 'New chat');
  const GroupIcon = ICONS[chat.chatType] || ICONS.default;

  const handleRename = () => {
    if (name.trim() && name !== (chat.title || chat.name)) {
      onRename?.(chat.id, name.trim());
    }
    setRenaming(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ x: 2 }}
      onClick={() => onSelect?.(chat.id)}
      className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition ${
        active ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/20' : 'hover:bg-[var(--hover)] border border-transparent'
      }`}
    >
      {/* Icon */}
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
        chat.chatType === 'shared' ? 'bg-[var(--success)]/10' :
        chat.chatType === 'collab' ? 'bg-[var(--accent-soft)]' :
        chat.pinned ? 'bg-[var(--accent)]/10' : 'bg-[var(--surface-3)]'
      }`}>
        <GroupIcon size={10} className={
          chat.chatType === 'shared' ? 'text-[var(--success)]' :
          chat.chatType === 'collab' ? 'text-[var(--accent-deep)]' :
          chat.pinned ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
        } />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[var(--surface-3)] rounded px-1 py-0.5 text-[11px] text-[var(--text)] outline-none border border-[var(--accent)]/30"
          />
        ) : (
          <>
            <div className="text-[11px] font-medium text-[var(--text)] truncate">{chat.title || chat.name || 'New chat'}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[8px] text-[var(--muted)]">{timeGroup(chat.updatedAt || chat.created_at)}</span>
              {chat.pageTitle && (
                <span className="text-[8px] text-[var(--muted)] truncate max-w-[60px]">· {chat.pageTitle}</span>
              )}
              {chat.pinned && <Pin size={7} className="text-[var(--accent)]" />}
            </div>
          </>
        )}
      </div>

      {/* Hover actions */}
      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); setRenaming(true); setName(chat.title || chat.name || ''); }}
          className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition"
          title="Rename"
        >
          <Edit3 size={9} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate?.(chat.id); }}
          className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition"
          title="Duplicate"
        >
          <Copy size={9} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onArchive?.(chat.id); }}
          className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition"
          title={chat.archived ? 'Restore' : 'Archive'}
        >
          {chat.archived ? <ArchiveRestore size={9} /> : <Archive size={9} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete?.(chat.id); }}
          className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition"
          title="Delete"
        >
          <Trash2 size={9} />
        </button>
      </div>
    </motion.div>
  );
}

function ChatGroup({ label, icon: Icon, chats, activeChatId, onSelect, onRename, onArchive, onDelete, onDuplicate }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!chats || chats.length === 0) return null;

  return (
    <div className="mb-1">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1 px-2 py-1 w-full text-left"
      >
        {Icon && <Icon size={9} className="text-[var(--muted)]" />}
        <span className="text-[9px] font-medium text-[var(--muted)] uppercase tracking-wider">{label}</span>
        <span className="text-[8px] text-[var(--muted)] ml-auto">{chats.length}</span>
        <motion.div
          animate={{ rotate: collapsed ? 0 : 90 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          <ChevronRight size={8} className="text-[var(--muted)]" />
        </motion.div>
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 px-1">
              {chats.map((chat) => (
                <ChatCard
                  key={chat.id}
                  chat={chat}
                  active={chat.id === activeChatId}
                  onSelect={onSelect}
                  onRename={onRename}
                  onArchive={onArchive}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChatSidebar({
  chats = [], activeChatId, onSelect, onNew, onRename, onArchive,
  onDelete, onDuplicate, searchQuery, onSearchChange, filter, onFilterChange
}) {
  const hasArchived = chats.some(c => c.archived);

  const groups = useMemo(() => {
    const filtered = searchQuery
      ? chats.filter(c => (c.title || c.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
      : chats;

    const pinned = filtered.filter(c => c.pinned && !c.archived);
    const shared = filtered.filter(c => c.chatType === 'shared' && !c.pinned && !c.archived);
    const collab = filtered.filter(c => c.chatType === 'collab' && !c.pinned && !c.archived);
    const archived = filtered.filter(c => c.archived);
    const normal = filtered.filter(c => !c.pinned && !c.archived && c.chatType !== 'shared' && c.chatType !== 'collab');

    const grouped = {};
    normal.forEach(c => {
      const g = timeGroup(c.updatedAt || c.created_at);
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(c);
    });

    const sections = [];
    if (pinned.length > 0 && (filter === 'all' || filter === 'pinned')) sections.push({ label: 'Pinned', icon: Pin, chats: pinned });
    if (shared.length > 0 && (filter === 'all' || filter === 'shared')) sections.push({ label: 'Shared', icon: Users, chats: shared });
    if (collab.length > 0 && (filter === 'all' || filter === 'collab')) sections.push({ label: 'Collab', icon: Users, chats: collab });
    if (filter === 'all' || filter === 'recent') {
      ['Today', 'Yesterday', 'This Week', 'Earlier this Month', 'Older'].forEach(g => {
        if (grouped[g]?.length) sections.push({ label: g, chats: grouped[g] });
      });
    }
    if (archived.length > 0 && (filter === 'all' || filter === 'archived')) sections.push({ label: 'Archived', icon: Archive, chats: archived });
    return sections;
  }, [chats, searchQuery, filter]);

  return (
    <div className="flex flex-col h-full bg-[var(--sidebar)]">
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--border)]">
        <span className="text-[11px] font-semibold text-[var(--text)] flex-1">Chats</span>
        <button
          onClick={onNew}
          className="flex items-center gap-1 rounded-md bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] px-1.5 py-0.5 text-[9px] font-medium transition"
        >
          <Plus size={9} />
          New
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5">
        <div className="relative">
          <Search size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chats..."
            className="w-full rounded-md bg-[var(--surface-3)] border border-[var(--border)] py-1 pl-5 pr-1.5 text-[10px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0.5 px-2 pb-1">
        {['all', 'pinned', 'shared', 'archived'].map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition ${
              filter === f ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Chat groups */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-1 pb-2">
        {groups.length > 0 ? (
          groups.map((g, i) => (
            <ChatGroup
              key={g.label + i}
              label={g.label}
              icon={g.icon}
              chats={g.chats}
              activeChatId={activeChatId}
              onSelect={onSelect}
              onRename={onRename}
              onArchive={onArchive}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--muted)]">
            <MessageSquare size={16} className="opacity-30 mb-1" />
            <span className="text-[10px]">No chats found</span>
          </div>
        )}
      </div>
    </div>
  );
}
