import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Users,
  Image as ImageIcon,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Flame,
  Clock,
  Sparkles
} from 'lucide-react';
import { DailyMode, DailyPageRecord } from './types';
import {
  formatDayKey,
  parseDayKey,
  getRelativeDayKey,
  getDailyPage,
  subscribeDailyStore,
  getDailySettings
} from './dailyStorage';
import JournalBookView from './components/JournalBookView';
import TeamDailyView from './components/TeamDailyView';
import DailyAssetsGallery from './components/DailyAssetsGallery';
import DailySettingsModal from './components/DailySettingsModal';

interface DailyWorkspaceProps {
  onToast: (msg: string) => void;
  currentUserId?: string;
  currentUsername?: string;
  currentUserAvatar?: string;
}

export default function DailyWorkspace({
  onToast,
  currentUserId = 'user_default',
  currentUsername = 'You',
  currentUserAvatar = '👤'
}: DailyWorkspaceProps) {
  const settings = getDailySettings();
  const [mode, setMode] = useState<DailyMode>(settings.defaultMode || 'personal');
  const [activeTab, setActiveTab] = useState<'journal' | 'assets'>('journal');
  const [selectedDayKey, setSelectedDayKey] = useState<string>(formatDayKey());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storeVersion, setStoreVersion] = useState(0);

  // Subscribe to storage updates for instant reactivity
  useEffect(() => {
    return subscribeDailyStore(() => {
      setStoreVersion((v) => v + 1);
    });
  }, []);

  const todayKey = formatDayKey();

  // Current page record
  const currentDailyPage = useMemo(() => {
    return getDailyPage(selectedDayKey, mode, currentUserId);
  }, [selectedDayKey, mode, currentUserId, storeVersion]);

  // Calendar Date Rail list (today + past 30 days)
  const calendarRailDays = useMemo(() => {
    const list: { dayKey: string; dayNumber: number; monthName: string; isToday: boolean; isCurrent: boolean }[] = [];
    for (let i = 0; i <= 30; i++) {
      const dKey = getRelativeDayKey(todayKey, -i);
      const d = parseDayKey(dKey);
      list.push({
        dayKey: dKey,
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString('en-US', { month: 'short' }),
        isToday: dKey === todayKey,
        isCurrent: dKey === selectedDayKey,
      });
    }
    return list;
  }, [todayKey, selectedDayKey]);

  return (
    <div className="relative flex h-full w-full bg-[var(--bg)] text-[var(--text)] overflow-hidden">
      {/* ─── Ambient Apple Optical Glass Glow Blobs ─── */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/10 via-cyan-400/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-tl from-amber-500/8 via-orange-400/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ════════════════════════════════════════
          FAR LEFT: VERTICAL CALENDAR DATE RAIL
         ════════════════════════════════════════ */}
      <aside className="apple-liquid-glass w-18 sm:w-22 shrink-0 border-r border-[var(--border)] flex flex-col items-center py-5 px-2 select-none z-10 m-2 rounded-3xl">
        
        {/* Rail Top: Prominent "Today" Card */}
        <button
          onClick={() => {
            setSelectedDayKey(todayKey);
            setActiveTab('journal');
          }}
          className={`w-full py-2.5 px-1 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center border mb-3 group hover:scale-[1.03] active:scale-[0.98] ${
            selectedDayKey === todayKey
              ? 'bg-white dark:bg-[#1E222B] border-blue-400/40 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/25'
              : 'bg-white/60 dark:bg-zinc-800/40 border-[var(--border)] hover:bg-white/80'
          }`}
          title="Jump to Today"
        >
          <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Today</span>
          <span className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight my-0.5">
            {parseDayKey(todayKey).getDate()}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
            {parseDayKey(todayKey).toLocaleDateString('en-US', { month: 'short' })}
          </span>
        </button>

        <div className="w-10 h-px bg-[var(--border)] mb-3 opacity-60" />

        {/* Scrollable vertical list of past dates */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center space-y-2.5 py-1 scrollbar-none">
          {calendarRailDays.slice(1).map((d) => {
            const dateObj = parseDayKey(d.dayKey);
            const weekdayShort = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const isDifferentYear = dateObj.getFullYear() !== new Date().getFullYear();

            return (
              <button
                key={d.dayKey}
                onClick={() => {
                  setSelectedDayKey(d.dayKey);
                  setActiveTab('journal');
                }}
                className={`w-full py-2 rounded-xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center hover:scale-[1.02] active:scale-[0.97] ${
                  d.isCurrent
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30 ring-1 ring-blue-400'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/40 dark:hover:bg-zinc-800/40'
                }`}
              >
                <span className={`text-[10px] font-medium leading-none ${d.isCurrent ? 'text-white/80' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {isDifferentYear ? dateObj.getFullYear() : weekdayShort}
                </span>
                <span className={`text-base font-extrabold leading-tight my-0.5 ${d.isCurrent ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>
                  {d.dayNumber}
                </span>
                <span className={`text-[10px] font-medium leading-none ${d.isCurrent ? 'text-white/80' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {d.monthName}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MAIN CONTENT AREA
         ════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* ─── TOP APP BAR (Apple Liquid Glass Header) ─── */}
        <header className="h-14 border-b border-[var(--border)] bg-[var(--surface-1)]/60 backdrop-blur-2xl px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0 select-none z-20">
          
          {/* Mode Switcher: Personal ↔ Team */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--surface-2)]/70 border border-[var(--border)] backdrop-blur-md">
            <button
              onClick={() => setMode('personal')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                mode === 'personal'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              <BookOpen size={13} />
              <span>Personal</span>
            </button>
            <button
              onClick={() => setMode('team')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                mode === 'team'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              <Users size={13} />
              <span>Team</span>
            </button>
          </div>

          {/* Center Tabs: Journal vs All Assets */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('journal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'journal'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
              }`}
            >
              Daily Page
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'assets'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
              }`}
            >
              <ImageIcon size={13} />
              <span>All Assets</span>
            </button>
          </div>

          {/* Settings & Date Navigation */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-secondary)] font-mono bg-[var(--surface-2)] px-2.5 py-1 rounded-xl border border-[var(--border)]">
              <Calendar size={12} className="text-blue-500" />
              <span>{selectedDayKey}</span>
            </div>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] transition cursor-pointer"
              title="Daily Settings"
            >
              <Settings size={15} />
            </button>
          </div>
        </header>

        {/* ─── SCROLLABLE BODY ─── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center">
          <AnimatePresence mode="wait">
            {activeTab === 'assets' ? (
              <motion.div
                key="assets-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full"
              >
                <DailyAssetsGallery
                  onJumpToDate={(dKey) => {
                    setSelectedDayKey(dKey);
                    setActiveTab('journal');
                  }}
                  onToast={onToast}
                />
              </motion.div>
            ) : mode === 'personal' ? (
              <motion.div
                key={`personal-${selectedDayKey}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <JournalBookView
                  currentDayKey={selectedDayKey}
                  dailyPage={currentDailyPage}
                  onSelectDate={(dKey) => setSelectedDayKey(dKey)}
                  onToast={onToast}
                />
              </motion.div>
            ) : (
              <motion.div
                key={`team-${selectedDayKey}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <TeamDailyView
                  currentDayKey={selectedDayKey}
                  dailyPage={currentDailyPage}
                  onSelectDate={(dKey) => setSelectedDayKey(dKey)}
                  onToast={onToast}
                  currentUserId={currentUserId}
                  currentUsername={currentUsername}
                  currentUserAvatar={currentUserAvatar}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Settings Modal */}
      <DailySettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onToast={onToast}
      />

    </div>
  );
}
