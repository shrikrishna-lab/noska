import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { realtimeCollab } from '../../lib/realtimeCollab';

function getStatusIcon(status: string) {
  switch (status) {
    case 'editing': return '✏️';
    case 'typing': return '⌨️';
    case 'idle': return '💤';
    default: return '👁️';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'editing': return 'Editing';
    case 'typing': return 'Typing';
    case 'idle': return 'Idle';
    default: return 'Viewing';
  }
}

interface CollabPresenceBarProps {
  users?: any[];
  ownStatus?: string;
  pageId?: string | null;
  onStatusChange?: (status: string) => void;
  onOpenExternal?: () => void;
  className?: string;
}

export default function CollabPresenceBar({
  users = [],
  ownStatus = 'viewing',
  pageId,
  onStatusChange,
  onOpenExternal,
  className = ''
}: CollabPresenceBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const allUsers = users || [];
  const othersOnline = allUsers.length > 0;
  const activeCount = allUsers.filter(u => u.status !== 'idle').length + 1;

  // Live typing indicator: peers' `typing` broadcasts show in the capsule
  // for a couple of seconds after their last keystroke event.
  useEffect(() => {
    if (!pageId) return;
    const unsub = realtimeCollab.on('typing', ({ pageId: pid, userId, userName }) => {
      if (pid !== pageId || !userId || userId === realtimeCollab.getUser().userId) return;
      const name = (userName as string) || 'Someone';
      setTypingNames(prev => (prev.includes(name) ? prev : [...prev, name]));
      const existing = typingTimers.current.get(userId);
      if (existing) clearTimeout(existing);
      typingTimers.current.set(userId, setTimeout(() => {
        setTypingNames(prev => prev.filter(n => n !== name));
        typingTimers.current.delete(userId);
      }, 2500));
    });
    return () => {
      unsub();
      typingTimers.current.forEach(t => clearTimeout(t));
      typingTimers.current.clear();
    };
  }, [pageId]);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  return (
    <div className={`relative flex items-center gap-1.5 ${className}`}>
      {/* Apple Liquid Glass Presence Capsule */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker((prev) => !prev);
        }}
        className={`group flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-medium tracking-tight select-none cursor-pointer transition-all duration-200 backdrop-blur-xl border ${
          showPicker
            ? 'bg-white/20 dark:bg-white/15 border-white/30 text-[var(--text)] shadow-sm'
            : 'bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] border-black/[0.06] dark:border-white/15 text-[var(--text-secondary)] hover:text-[var(--text)]'
        } shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]`}
        title="Collaboration presence & status"
      >
        {/* Solo: muted "Collab" pill. Others present: avatar stack + count. */}
        {othersOnline ? (
          <>
            <div className="flex items-center -space-x-1 shrink-0">
              {allUsers.slice(0, 3).map((u, i) => (
                <span
                  key={u.userId || u.id || `user-${i}`}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] border border-white/40 shadow-xs relative"
                  style={{ backgroundColor: (u.userColor || '#0066FF') + '33', borderColor: u.userColor || '#0066FF' }}
                >
                  {u.userAvatar || '👤'}
                </span>
              ))}
              {allUsers.length > 3 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold border border-white/40 bg-black/10 dark:bg-white/10 text-[var(--text-secondary)]">
                  +{allUsers.length - 3}
                </span>
              )}
            </div>

            {/* Online Count, or typing indicator when someone is typing */}
            {typingNames.length > 0 ? (
              <span className="leading-none text-[var(--accent)]">
                {typingNames.length === 1 ? `${typingNames[0]} is typing` : `${typingNames.length} typing`}
                <span className="animate-pulse">…</span>
              </span>
            ) : (
              <span className="leading-none">{activeCount} online</span>
            )}

            {/* Glowing Presence Dot */}
            <span className="relative flex h-1.5 w-1.5 ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
          </>
        ) : (
          <>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${typingNames.length > 0 ? 'bg-emerald-500' : 'bg-[var(--text-muted)]/40'}`} />
            <span className="leading-none">
              {typingNames.length > 0 ? (
                <>
                  {typingNames.length === 1 ? `${typingNames[0]} is typing` : `${typingNames.length} typing`}
                  <span className="animate-pulse">…</span>
                </>
              ) : (
                'Collab'
              )}
            </span>
          </>
        )}
      </button>

      {/* External / Popout Action Button if provided */}
      {onOpenExternal && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenExternal();
          }}
          title="Open in new window / tab"
          className="h-6 w-6 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] border border-black/[0.06] dark:border-white/15 transition-all duration-150 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]"
        >
          <ExternalLink size={12} strokeWidth={2} />
        </button>
      )}

      {/* Apple Liquid Glass Status Picker Dropdown */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.94, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 4 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl p-1.5 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-white/20 bg-[#1e2028]/95 dark:bg-[#14161f]/95 z-[9999] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] font-semibold text-white/50 uppercase tracking-wider">
              Your Presence
            </div>

            <div className="space-y-0.5">
              {(['viewing', 'editing', 'idle'] as const).map((status) => {
                const active = ownStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => {
                      onStatusChange?.(status);
                      setShowPicker(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[11.5px] font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-white/80 hover:text-white hover:bg-white/[0.1] border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{getStatusIcon(status)}</span>
                      <span>{getStatusLabel(status)}</span>
                    </span>
                    {active && <Check size={12} strokeWidth={2.5} className="text-blue-400" />}
                  </button>
                );
              })}
            </div>

            {allUsers.length > 0 && (
              <>
                <div className="h-[1px] bg-white/[0.1] my-1" />
                <div className="px-2 py-1 text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                  Active in Document
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto px-1">
                  {allUsers.map((u, i) => (
                    <div key={u.userId || u.id || `user-${i}`} className="flex items-center gap-2 px-1.5 py-1 rounded-lg text-[11px] text-white/80">
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] border"
                        style={{ backgroundColor: (u.userColor || '#0066FF') + '33', borderColor: u.userColor || '#0066FF' }}
                      >
                        {u.userAvatar || '👤'}
                      </span>
                      <span className="truncate flex-1 text-white/90">{u.userName || 'Guest'}</span>
                      <span className="text-[10px] text-white/50">{getStatusLabel(u.status)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
