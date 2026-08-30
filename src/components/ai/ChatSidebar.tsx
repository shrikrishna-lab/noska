import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, MessageSquare, Pin, Archive, ArchiveRestore,
  MoreHorizontal, Trash2, Copy, Edit3, Sparkles, ChevronDown,
  ChevronRight, FileText, Bot, Sliders, Layers, Terminal,
  Code2, Check, X, Settings2, Share2, Folder, FolderPlus,
  HardDrive
} from 'lucide-react';
import type { AIChat, Page } from '../../lib/supabaseService';
import AIAnalyticsDashboard from './AIAnalyticsDashboard';

interface ChatSidebarProps {
  chats: AIChat[];
  activeChatId?: string | null;
  pages?: Page[];
  activePageId?: string;
  currentAgentName?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSelectPage?: (page: Page) => void;
  onNewPage?: () => void;
  onOpenKeyModal?: () => void;
  onOpenAgentMenu?: () => void;
  onRename?: (id: string, name: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filter?: string;
  onFilterChange?: (filter: string) => void;
  workspaceName?: string;
  userName?: string;
  userAvatar?: string | null;
  userEmail?: string | null;
  userId?: string | null;
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
  pages = [],
  onSelect,
  onRename,
  onArchive,
  onDelete,
  onDuplicate,
  onTogglePin,
  onMoveToPage
}: {
  chat: AIChat;
  active: boolean;
  pages?: Page[];
  onSelect: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onMoveToPage?: (chatId: string, pageId: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'project'>('main');
  const [openUpward, setOpenUpward] = useState(false);
  const [name, setName] = useState(chat.name || 'Conversation');

  const handleRename = () => {
    if (name.trim() && name !== chat.name) {
      onRename?.(chat.id, name.trim());
    }
    setRenaming(false);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setMenuOpen(false);
  };

  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setOpenUpward(spaceBelow < 260);
    setMenuOpen(!menuOpen);
    setMenuView('main');
  };

  return (
    <div className="relative group px-1 py-0.5">
      <div
        onClick={() => onSelect(chat.id)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer text-left transition-all duration-150 select-none ${
          active
            ? 'bg-[var(--accent)]/12 border border-[var(--accent)]/30 text-[var(--text)] font-semibold'
            : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] border border-transparent'
        }`}
      >
        <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-xs ${
          active ? 'text-[var(--accent)] font-bold' : 'text-[var(--muted)]'
        }`}>
          {chat.pinned ? <Pin size={12} className="text-[var(--accent)]" /> : <MessageSquare size={12} />}
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
            <div className="truncate text-xs font-normal">
              {chat.name || 'Conversation'}
            </div>
          )}
        </div>

        {/* Action Menu Trigger */}
        <button
          type="button"
          onClick={handleToggleMenu}
          className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
          title="More options"
        >
          <MoreHorizontal size={13} />
        </button>
      </div>

      {/* Side-by-Side Floating Context Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Transparent backdrop to catch clicks outside */}
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                setMenuView('main');
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: openUpward ? 4 : -2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: openUpward ? 4 : -2 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => e.stopPropagation()}
              className={`absolute right-2 ${openUpward ? 'bottom-0' : 'top-0'} w-48 rounded-2xl border border-[#e8e4db] dark:border-white/10 bg-[#ffffff] dark:bg-[#1e1e22] p-1.5 shadow-2xl backdrop-blur-2xl z-50 text-left space-y-0.5 font-sans`}
            >
              {menuView === 'main' ? (
                <>
                  {/* Share */}
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-[#1c1b18] dark:text-[#ececec] hover:bg-[#ede8df] dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Share2 size={13} className="text-[#706c64] dark:text-[#a09c94]" />
                      <span>Share</span>
                    </div>
                  </button>

                  {/* Rename */}
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(true);
                      setMenuOpen(false);
                    }}
                    className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-[#1c1b18] dark:text-[#ececec] hover:bg-[#ede8df] dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Edit3 size={13} className="text-[#706c64] dark:text-[#a09c94]" />
                      <span>Rename</span>
                    </div>
                    <span className="text-[10px] text-[#a09c94] font-mono">R</span>
                  </button>

                  <div className="my-1 border-t border-[#e8e4db] dark:border-white/10" />

                  {/* Pin Chat */}
                  <button
                    type="button"
                    onClick={() => {
                      onTogglePin?.(chat.id);
                      setMenuOpen(false);
                    }}
                    className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-[#1c1b18] dark:text-[#ececec] hover:bg-[#ede8df] dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Pin size={13} className={chat.pinned ? 'text-purple-600 dark:text-purple-400' : 'text-[#706c64] dark:text-[#a09c94]'} />
                      <span>{chat.pinned ? 'Unpin chat' : 'Pin chat'}</span>
                    </div>
                    <span className="text-[10px] text-[#a09c94] font-mono">P</span>
                  </button>

                  {/* Archive */}
                  <button
                    type="button"
                    onClick={() => {
                      onArchive?.(chat.id);
                      setMenuOpen(false);
                    }}
                    className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-[#1c1b18] dark:text-[#ececec] hover:bg-[#ede8df] dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Archive size={13} className="text-[#706c64] dark:text-[#a09c94]" />
                      <span>{chat.archived ? 'Unarchive' : 'Archive'}</span>
                    </div>
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => {
                      onDelete?.(chat.id);
                      setMenuOpen(false);
                    }}
                    className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-xl transition cursor-pointer font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 size={13} className="text-red-500" />
                      <span>Delete</span>
                    </div>
                    <span className="text-[10px] text-red-400/80 font-mono">D</span>
                  </button>

                  <div className="my-1 border-t border-[#e8e4db] dark:border-white/10" />

                  {/* Move to Project Trigger */}
                  <button
                    type="button"
                    onClick={() => setMenuView('project')}
                    className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-[#1c1b18] dark:text-[#ececec] hover:bg-[#ede8df] dark:hover:bg-white/10 rounded-xl transition cursor-pointer whitespace-nowrap"
                  >
                    <div className="flex items-center gap-2">
                      <Folder size={13} className="text-[#706c64] dark:text-[#a09c94] shrink-0" />
                      <span>Move to project</span>
                    </div>
                    <ChevronRight size={12} className="text-[#a09c94] shrink-0 ml-2" />
                  </button>
                </>
              ) : (
                /* Projects Submenu View */
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-1 py-1 border-b border-[#e8e4db] dark:border-white/10 mb-1">
                    <button
                      type="button"
                      onClick={() => setMenuView('main')}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white transition cursor-pointer"
                    >
                      <ChevronRight size={12} className="rotate-180" />
                      <span>Projects</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setMenuView('main');
                    }}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-[#1c1b18] dark:text-[#ececec] hover:bg-[#ede8df] dark:hover:bg-white/10 rounded-xl transition cursor-pointer font-medium"
                  >
                    <FolderPlus size={13} className="text-purple-600 dark:text-purple-400" />
                    <span>New project</span>
                  </button>

                  <div className="my-1 border-t border-[#e8e4db] dark:border-white/10" />

                  <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-0.5">
                    {pages.length === 0 ? (
                      <div className="px-2 py-2 text-[11px] text-[#a09c94] text-center">
                        No projects found
                      </div>
                    ) : (
                      pages.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onMoveToPage?.(chat.id, p.id);
                            setMenuOpen(false);
                            setMenuView('main');
                          }}
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 rounded-xl transition cursor-pointer truncate"
                        >
                          <Folder size={12} className="shrink-0 text-[#a09c94]" />
                          <span className="truncate">{getSafePageTitle(p.title)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function getSafePageTitle(title?: string | null): string {
  if (!title || typeof title !== 'string') return 'Untitled';
  const t = title.trim();
  if (t.startsWith('data:') || t.startsWith('http://') || t.startsWith('https://') || t.startsWith('<svg') || t.includes('%3Csvg')) {
    return 'Untitled';
  }
  return t || 'Untitled';
}

function renderPageIcon(icon?: string | null) {
  if (!icon) return <span className="text-xs shrink-0">📄</span>;
  if (icon.startsWith('data:') || icon.startsWith('http://') || icon.startsWith('https://')) {
    return <img src={icon} alt="" className="w-3.5 h-3.5 object-contain inline-block rounded-xs shrink-0" />;
  }
  return <span className="text-xs shrink-0">{icon}</span>;
}

export default function ChatSidebar({
  chats = [],
  activeChatId,
  pages = [],
  activePageId,
  currentAgentName = "Assistant",
  onSelect,
  onNew,
  onSelectPage,
  onNewPage,
  onOpenKeyModal,
  onOpenAgentMenu,
  onRename,
  onArchive,
  onDelete,
  onDuplicate,
  onTogglePin,
  searchQuery = "",
  onSearchChange,
  filter = "all",
  onFilterChange,
  workspaceName = "Workspace",
  userName = "Krishna Handibags",
  userAvatar,
  userEmail,
  userId
}: ChatSidebarProps) {
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);

  // Resolve real user identity from Noska profile props
  const realDisplayName = userName || workspaceName || 'Workspace User';
  const realEmail = userEmail || workspaceName || 'Workspace';
  const realImageUrl = userAvatar || null;
  
  const isImageAvatar = typeof realImageUrl === 'string' && (realImageUrl.startsWith('http://') || realImageUrl.startsWith('https://') || realImageUrl.startsWith('data:') || realImageUrl.startsWith('blob:'));
  const isEmojiAvatar = typeof realImageUrl === 'string' && realImageUrl.length > 0 && !isImageAvatar && realImageUrl !== '👤';
  const initials = realDisplayName ? realDisplayName.replace(/^@/, '').slice(0, 2).toUpperCase() : 'WU';

  const pinnedChats = useMemo(() => chats.filter(c => c.pinned && !c.archived), [chats]);

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
    <div className="flex flex-col h-full bg-[#faf9f6] dark:bg-[#141416] border-r border-[#e8e4db] dark:border-white/10 select-none text-[#1c1b18] dark:text-[#ececec] w-full">
      {/* 1. Clean Noska AI Header */}
      <div className="px-3.5 py-3 border-b border-[#e8e4db] dark:border-white/10 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold shrink-0">
            ✦
          </div>
          <span className="text-sm font-bold text-[#1c1b18] dark:text-white tracking-tight">
            Noska AI
          </span>
        </div>
      </div>

      {/* 2. Top Primary Action Buttons */}
      <div className="px-2 pt-2 pb-1 space-y-0.5 shrink-0">
        {/* + New Chat Action */}
        <button
          type="button"
          onClick={onNew}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-[#1c1b18] dark:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Plus size={13} />
            </div>
            <span>New chat</span>
          </div>
          <span className="text-[10px] text-[#a09c94] font-mono group-hover:text-[#706c64]">⌘K</span>
        </button>

        {/* AI Agents Switcher */}
        <button
          type="button"
          onClick={onOpenAgentMenu}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-[#1c1b18] dark:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Bot size={13} />
            </div>
            <span>AI Agents</span>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 dark:bg-purple-400/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 max-w-[110px] truncate">
            {currentAgentName || "Noska AI"}
          </span>
        </button>
      </div>

      <div className="mx-3 my-1.5 h-[1px] bg-[#e8e4db] dark:bg-white/10 shrink-0" />

      {/* 3. Scrollable Middle Lists */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 space-y-3">
        {/* Projects Section */}
        {pages.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <button
                type="button"
                onClick={() => setProjectsOpen(!projectsOpen)}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white transition-colors cursor-pointer"
              >
                <span>Projects</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${projectsOpen ? '' : '-rotate-90'}`} />
              </button>

              <button
                type="button"
                onClick={onNewPage}
                className="p-1 rounded-md text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 transition cursor-pointer"
                title="New project document"
              >
                <Plus size={12} />
              </button>
            </div>

            {projectsOpen && (
              <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin">
                {pages.map((p) => {
                  const safeTitle = getSafePageTitle(p.title);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectPage?.(p)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                        p.id === activePageId
                          ? 'bg-[var(--accent)]/12 text-[var(--text)] font-semibold'
                          : 'text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10'
                      }`}
                    >
                      {renderPageIcon(p.icon)}
                      <span className="truncate">{safeTitle}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pinned Section */}
        {pinnedChats.length > 0 && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setPinnedOpen(!pinnedOpen)}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1">
                <span>Pinned</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${pinnedOpen ? '' : '-rotate-90'}`} />
              </span>
              <span className="text-[10px] font-mono">{pinnedChats.length}</span>
            </button>

            {pinnedOpen && (
              <div className="space-y-0.5">
                {pinnedChats.map((c) => (
                  <ChatItem
                    key={c.id}
                    chat={c}
                    active={c.id === activeChatId}
                    pages={pages}
                    onSelect={onSelect}
                    onRename={onRename}
                    onArchive={onArchive}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onTogglePin={onTogglePin}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chats & Tasks Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1 relative">
            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white transition-colors cursor-pointer"
            >
              <span>Chats and tasks</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${historyOpen ? '' : '-rotate-90'}`} />
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                className={`p-1 rounded-md transition cursor-pointer ${
                  showSearch
                    ? 'text-[var(--accent)] bg-[var(--accent)]/15'
                    : 'text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10'
                }`}
                title="Search conversations"
              >
                <Search size={12} />
              </button>

              {/* Sliders / Filter & Settings Menu Button */}
              <button
                type="button"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`p-1 rounded-md transition cursor-pointer ${
                  showFilterMenu || filter !== 'all'
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-500/15'
                    : 'text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10'
                }`}
                title="Filter and chat settings"
              >
                <Sliders size={12} />
              </button>
            </div>

            {/* Filter & Settings Popover Dropdown */}
            <AnimatePresence>
              {showFilterMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowFilterMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-2 top-full mt-1 w-44 rounded-2xl border border-[#e8e4db] dark:border-white/10 bg-[#ffffff] dark:bg-[#1c1c20] p-1.5 shadow-2xl backdrop-blur-2xl z-50 text-left space-y-0.5"
                  >
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a09c94] font-mono">
                      Filter Views
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange?.('all');
                        setShowFilterMenu(false);
                      }}
                      className={`flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-xl transition cursor-pointer ${
                        filter === 'all'
                          ? 'bg-[var(--accent)]/15 text-[var(--accent)] font-semibold'
                          : 'text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare size={12} />
                        <span>All Chats</span>
                      </div>
                      {filter === 'all' && <Check size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange?.('pinned');
                        setShowFilterMenu(false);
                      }}
                      className={`flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-xl transition cursor-pointer ${
                        filter === 'pinned'
                          ? 'bg-[var(--accent)]/15 text-[var(--accent)] font-semibold'
                          : 'text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Pin size={12} />
                        <span>Pinned Only</span>
                      </div>
                      {filter === 'pinned' && <Check size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onFilterChange?.('archived');
                        setShowFilterMenu(false);
                      }}
                      className={`flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-xl transition cursor-pointer ${
                        filter === 'archived'
                          ? 'bg-[var(--accent)]/15 text-[var(--accent)] font-semibold'
                          : 'text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Archive size={12} />
                        <span>Archived</span>
                      </div>
                      {filter === 'archived' && <Check size={12} />}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Collapsible Search Input */}
          {showSearch && (
            <div className="px-1 py-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#ede8df] dark:bg-[#202024] border border-[#e8e4db] dark:border-white/10 focus-within:border-[var(--accent)] transition-colors">
                <Search size={11} className="text-[#a09c94] shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder="Search history..."
                  className="w-full bg-transparent text-xs text-[var(--text)] border-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-none placeholder:text-[#a09c94] p-0"
                  style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                />
                {searchQuery && (
                  <button onClick={() => onSearchChange?.('')} className="text-[#a09c94] hover:text-[var(--text)] cursor-pointer">
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
          )}

          {historyOpen && (
            <div className="space-y-2.5 pt-0.5">
              {Object.keys(grouped).length === 0 ? (
                <div className="text-center py-6 text-xs text-[#a09c94]">
                  No conversation history
                </div>
              ) : (
                Object.entries(grouped).map(([groupName, groupChats]) => (
                  <div key={groupName} className="space-y-0.5">
                    <div className="px-2.5 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#a09c94] font-mono">
                      {groupName}
                    </div>
                    {groupChats.map((c) => (
                      <ChatItem
                        key={c.id}
                        chat={c}
                        active={c.id === activeChatId}
                        pages={pages}
                        onSelect={onSelect}
                        onRename={onRename}
                        onArchive={onArchive}
                        onDelete={onDelete}
                        onDuplicate={onDuplicate}
                        onTogglePin={onTogglePin}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Local-First Storage Privacy & Cache Notice */}
      <div className="mx-2.5 my-1.5 p-2 rounded-xl bg-purple-500/10 dark:bg-purple-400/10 border border-purple-500/20 dark:border-purple-400/20 text-[11px] text-[#706c64] dark:text-[#a09c94]">
        <div className="flex items-center gap-1.5 font-semibold text-purple-700 dark:text-purple-300 mb-0.5">
          <HardDrive size={12} className="shrink-0" />
          <span>Note: 100% Local Storage</span>
        </div>
        <p className="leading-snug text-[10.5px]">
          Your AI chats and history are saved strictly in your local browser cache & machine. Private, offline-ready, and never stored on remote servers.
        </p>
      </div>

      {/* 5. Bottom Workspace / User Profile Badge */}
      <div className="p-2.5 border-t border-[#e8e4db] dark:border-white/10 shrink-0 bg-[#f4f2ec] dark:bg-[#18181a]">
        <div 
          onClick={() => setDashboardOpen(true)}
          className="flex items-center justify-between p-1.5 rounded-xl hover:bg-[#ede8df] dark:hover:bg-white/10 transition-colors cursor-pointer group"
          title="Open AI Analytics & Usage Dashboard"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Real Profile Image or Avatar Pill */}
            {isImageAvatar ? (
              <img
                src={realImageUrl!}
                alt={realDisplayName}
                className="w-7 h-7 rounded-xl object-cover shrink-0 border border-black/5 dark:border-white/10 shadow-xs"
              />
            ) : isEmojiAvatar ? (
              <div className="w-7 h-7 rounded-xl bg-[#ede8df] dark:bg-white/10 flex items-center justify-center text-sm shrink-0 border border-black/5 dark:border-white/10 shadow-xs">
                {realImageUrl}
              </div>
            ) : (
              <div className="w-7 h-7 rounded-xl bg-[#1c1b18] dark:bg-white text-white dark:text-[#18181a] flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                {initials}
              </div>
            )}
            <div className="min-w-0 text-left">
              <div className="text-xs font-bold text-[#1c1b18] dark:text-white truncate">
                {realDisplayName}
              </div>
              <div className="text-[10.5px] text-[#706c64] dark:text-[#a09c94] truncate">
                {realEmail}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenKeyModal?.();
            }}
            className="p-1 rounded-lg text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white transition cursor-pointer shrink-0"
            title="AI & Workspace Settings"
          >
            <Settings2 size={14} />
          </button>
        </div>
      </div>

      {/* AI Analytics & Usage Dashboard Modal */}
      <AIAnalyticsDashboard
        open={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        chats={chats}
        userName={realDisplayName}
        userAvatar={realImageUrl}
        userEmail={realEmail}
        userId={userId}
      />
    </div>
  );
}
