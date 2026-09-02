import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Flame,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Edit2,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Copy,
  Share2,
  RefreshCw,
  Heart
} from 'lucide-react';
import {
  DailyPageRecord,
  TeamMemberCheckIn,
  DailyStreakRecord,
  DailyPromptItem
} from '../types';
import {
  getTeamCheckIns,
  getAllTeamCheckIns,
  submitTeamCheckIn,
  getStreak,
  getPromptForDay,
  getRandomDifferentPrompt,
  parseDayKey,
  getRelativeDayKey,
  formatDayKey
} from '../dailyStorage';

interface TeamDailyViewProps {
  currentDayKey: string;
  dailyPage: DailyPageRecord;
  onSelectDate: (dayKey: string) => void;
  onToast: (msg: string) => void;
  currentUserId?: string;
  currentUsername?: string;
  currentUserAvatar?: string;
}

export default function TeamDailyView({
  currentDayKey,
  dailyPage,
  onSelectDate,
  onToast,
  currentUserId = 'user_me',
  currentUsername = 'You',
  currentUserAvatar = '👤'
}: TeamDailyViewProps) {
  const [checkIns, setCheckIns] = useState<TeamMemberCheckIn[]>([]);
  const [allPastCheckIns, setAllPastCheckIns] = useState<TeamMemberCheckIn[]>([]);
  const [streak, setStreak] = useState<DailyStreakRecord>(getStreak('team_default', 'team'));
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [managerViewActive, setManagerViewActive] = useState(false);
  const [searchMember, setSearchMember] = useState('');

  // Check-in Form state
  const [workingOn, setWorkingOn] = useState('');
  const [blockedOn, setBlockedOn] = useState('');
  const [memberMood, setMemberMood] = useState('⚡ Energized');

  // Load data for day
  useEffect(() => {
    const todayList = getTeamCheckIns(currentDayKey);
    setCheckIns(todayList);
    setAllPastCheckIns(getAllTeamCheckIns());
    setStreak(getStreak('team_default', 'team'));

    // Populate existing check-in if user has one
    const myExisting = todayList.find(c => c.userId === currentUserId);
    if (myExisting) {
      setWorkingOn(myExisting.workingOn || '');
      setBlockedOn(myExisting.blockedOn || '');
      setMemberMood(myExisting.mood || '⚡ Energized');
    }
  }, [currentDayKey, currentUserId]);

  const handleSaveCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    submitTeamCheckIn({
      dailyPageId: dailyPage.id,
      date: currentDayKey,
      userId: currentUserId,
      userName: currentUsername || 'You',
      userAvatar: currentUserAvatar || '👤',
      workingOn,
      blockedOn,
      mood: memberMood,
    });

    setCheckIns(getTeamCheckIns(currentDayKey));
    setStreak(getStreak('team_default', 'team'));
    setCheckInModalOpen(false);
    onToast('Check-in shared with the team! 🎉');
  };

  const myCheckIn = checkIns.find(c => c.userId === currentUserId);

  // Manager Scroll-back analysis: identify recurring blockers & quiet members
  const memberActivityMap = new Map<string, { lastSeenDate: string; count: number; blockers: string[] }>();
  allPastCheckIns.forEach(c => {
    const existing = memberActivityMap.get(c.userName) || { lastSeenDate: c.date, count: 0, blockers: [] };
    existing.count++;
    if (c.date > existing.lastSeenDate) existing.lastSeenDate = c.date;
    if (c.blockedOn && c.blockedOn.trim().length > 0) existing.blockers.push(c.blockedOn);
    memberActivityMap.set(c.userName, existing);
  });

  const parsedDate = parseDayKey(currentDayKey);
  const formattedDate = parsedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-2 sm:px-6 space-y-6">
      
      {/* ─── TOP TEAM STREAK & SUMMARY BANNER ─── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-extrabold text-2xl shadow-inner">
            <Flame size={24} className="fill-blue-500 text-blue-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Team Daily Check-in Board
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                {streak.currentCount} Day Flow
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              {streak.currentCount > 0
                ? "Wonderful momentum! The team has checked in consistently."
                : "No pressure — submit a check-in whenever you are ready!"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setManagerViewActive(!managerViewActive)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              managerViewActive
                ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-sm'
                : 'bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <TrendingUp size={13} />
            {managerViewActive ? 'Standard View' : 'Lead Insights'}
          </button>
          <button
            onClick={() => setCheckInModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-500/20"
          >
            <Plus size={14} />
            {myCheckIn ? 'Update My Check-in' : 'Post My Check-in'}
          </button>
        </div>
      </div>

      {/* ─── TEAM PROMPT CARD ─── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1D24] border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              {dailyPage.promptCategory || "Team Focus Prompt"}
            </div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
              {dailyPage.promptText}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-zinc-400">
          <button
            onClick={() => {
              navigator.clipboard.writeText(dailyPage.promptText);
              onToast('Prompt copied to clipboard!');
            }}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition cursor-pointer"
            title="Copy prompt"
          >
            <Copy size={13} />
          </button>
        </div>
      </div>

      {/* ─── MANAGER / LEAD SCROLL-BACK INSIGHTS VIEW ─── */}
      <AnimatePresence>
        {managerViewActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 rounded-3xl bg-amber-500/5 dark:bg-amber-400/5 border border-amber-500/20 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Lead Pulse & Recurring Blockers
                </h3>
              </div>
              <span className="text-[11px] text-amber-700/70 dark:text-amber-300/70">
                Soft overview of team patterns over time
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from(memberActivityMap.entries()).map(([name, data]) => {
                const todayKey = formatDayKey();
                const daysDiff = Math.floor((parseDayKey(todayKey).getTime() - parseDayKey(data.lastSeenDate).getTime()) / (1000 * 3600 * 24));
                const isQuiet = daysDiff >= 3;

                return (
                  <div
                    key={name}
                    className="p-3 rounded-2xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{name}</span>
                      {isQuiet ? (
                        <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                          No update in {daysDiff}d
                        </span>
                      ) : (
                        <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                          Active recently
                        </span>
                      )}
                    </div>
                    {data.blockers.length > 0 ? (
                      <div className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
                        <span className="font-semibold text-red-500">Recent blocker:</span> {data.blockers[data.blockers.length - 1]}
                      </div>
                    ) : (
                      <div className="text-[11px] text-zinc-400 italic">No recent blockers reported.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TEAM MEMBER CHECK-IN CARDS ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Check-ins for {formattedDate} ({checkIns.length})
            </h3>
          </div>
        </div>

        {checkIns.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-zinc-50 dark:bg-[#161920] border border-dashed border-zinc-300 dark:border-zinc-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto text-xl font-bold">
              ☕
            </div>
            <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              No check-ins posted yet today
            </div>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Be the first to share what you are working on or if you have any blockers!
            </p>
            <button
              onClick={() => setCheckInModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus size={14} /> Post First Check-in
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checkIns.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-3xl bg-white dark:bg-[#1E222B] border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between gap-4 group hover:border-blue-500/50 transition-colors"
              >
                {/* Member Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sm font-bold">
                      {item.userAvatar || '👤'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{item.userName}</div>
                      <div className="text-[10px] text-zinc-400">
                        {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {item.mood && (
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      {item.mood}
                    </span>
                  )}
                </div>

                {/* Working On */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Working on
                  </div>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed bg-zinc-50/50 dark:bg-zinc-900/30 p-2.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800">
                    {item.workingOn || 'No specific task noted'}
                  </p>
                </div>

                {/* Blocked On */}
                {item.blockedOn && item.blockedOn.trim().length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle size={12} /> Blocked on
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-300 bg-red-500/10 p-2.5 rounded-2xl border border-red-500/20 leading-relaxed">
                      {item.blockedOn}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODAL: POST / EDIT CHECK-IN ─── */}
      <AnimatePresence>
        {checkInModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-[#1E222B] border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Team Daily Check-in
                    </h3>
                    <p className="text-xs text-zinc-500">
                      All fields are optional and opt-in — share as much or as little as you like.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveCheckIn} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    What are you working on today?
                  </label>
                  <textarea
                    value={workingOn}
                    onChange={(e) => setWorkingOn(e.target.value)}
                    placeholder="Focusing on core architecture, client deliverables, review..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-red-500 mb-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Anything blocking you? (Optional)
                  </label>
                  <input
                    type="text"
                    value={blockedOn}
                    onChange={(e) => setBlockedOn(e.target.value)}
                    placeholder="Waiting on API keys, waiting for PR review, design clarification..."
                    className="w-full px-3 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Today's Mood & Energy
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['⚡ Energized', '🌿 Calm & Steady', '🚀 Deep Flow', '☕ Needs Coffee', '🎨 Creative', '🤝 Open to Sync'].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setMemberMood(m)}
                        className={`px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition ${
                          memberMood === m
                            ? 'bg-blue-500 text-white border-blue-500 font-semibold shadow-xs'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setCheckInModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    Save & Share Check-in
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
