import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Heart,
  Copy,
  Share2,
  RefreshCw,
  MapPin,
  Check,
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  ArrowRight,
  X,
  SlidersHorizontal,
  Lock,
  Headphones,
  Compass,
  CheckCircle2,
  Calendar,
  RotateCw,
  Flame,
  Shield,
  ShieldCheck,
  ChevronDown,
  Camera
} from 'lucide-react';
import {
  DailyPageRecord,
  DailyTaskItem,
  DailyStreakRecord,
  DailyAssetItem,
  DailyMood,
  YesterdayRecap
} from '../types';
import {
  MOOD_OPTIONS,
  CURATED_ILLUSTRATIONS,
  getIllustrationForMood,
  IllustrationPreset
} from '../promptPool';
import {
  updateDailyPage,
  getTasksForPage,
  addDailyTask,
  toggleDailyTask,
  deleteDailyTask,
  carryForwardTask,
  getAssetsForPage,
  addAssetItem,
  deleteAssetItem,
  getStreak,
  getRandomDifferentPrompt,
  getYesterdayRecap,
  dismissYesterdayRecap,
  isDayReadOnly,
  getRelativeDayKey,
  getWeekDays,
  parseDayKey,
  formatDayKey
} from '../dailyStorage';

interface JournalBookViewProps {
  currentDayKey: string;
  dailyPage: DailyPageRecord;
  onSelectDate: (dayKey: string) => void;
  onToast: (msg: string) => void;
}

export default function JournalBookView({
  currentDayKey,
  dailyPage,
  onSelectDate,
  onToast
}: JournalBookViewProps) {
  const [reflectionText, setReflectionText] = useState(dailyPage.reflectionText || '');
  const [locationTag, setLocationTag] = useState(dailyPage.locationTag || '');
  const [tasks, setTasks] = useState<DailyTaskItem[]>([]);
  const [assets, setAssets] = useState<DailyAssetItem[]>([]);
  const [streak, setStreak] = useState<DailyStreakRecord>(getStreak(dailyPage.ownerId, 'personal'));
  const [newTaskInput, setNewTaskInput] = useState('');
  const [moodPickerOpen, setMoodPickerOpen] = useState(false);
  const [artPickerOpen, setArtPickerOpen] = useState(false);
  const [activeLightboxAsset, setActiveLightboxAsset] = useState<DailyAssetItem | null>(null);
  const [recap, setRecap] = useState<YesterdayRecap | null>(null);
  const [carryForwardOpen, setCarryForwardOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readOnly = isDayReadOnly(currentDayKey);

  // Sync state when day changes
  useEffect(() => {
    setReflectionText(dailyPage.reflectionText || '');
    setLocationTag(dailyPage.locationTag || '');
    setTasks(getTasksForPage(dailyPage.id, currentDayKey));
    setAssets(getAssetsForPage(dailyPage.id));
    setStreak(getStreak(dailyPage.ownerId, 'personal'));
    setRecap(getYesterdayRecap(dailyPage.ownerId));
  }, [dailyPage, currentDayKey]);

  // Debounced reflection save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleReflectionChange = (val: string) => {
    setReflectionText(val);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateDailyPage(dailyPage.id, { reflectionText: val });
      setStreak(getStreak(dailyPage.ownerId, 'personal'));
    }, 500);
  };

  const handleLocationChange = (val: string) => {
    setLocationTag(val);
    updateDailyPage(dailyPage.id, { locationTag: val });
  };

  // Gap 1 & 5: When mood changes, update mood + automatically update illustration & caption
  const handleMoodSelect = (mood: DailyMood) => {
    setMoodPickerOpen(false);
    const matchedArt = getIllustrationForMood(mood);
    updateDailyPage(dailyPage.id, {
      mood,
      coverIllustration: matchedArt.url,
      coverCaption: matchedArt.caption,
      isCustomIllustration: false
    });
    onToast(`Mood updated to ${MOOD_OPTIONS.find(m => m.id === mood)?.label} ✨`);
  };

  const handlePromptLikeToggle = () => {
    const newLiked = !dailyPage.promptLiked;
    updateDailyPage(dailyPage.id, { promptLiked: newLiked });
    onToast(newLiked ? 'Saved prompt to favorites ❤️' : 'Removed from favorites');
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(`"${dailyPage.promptText}" — ${dailyPage.promptCategory}`);
    onToast('Prompt copied to clipboard ✨');
  };

  const handleSharePrompt = () => {
    const text = `✨ Noska Daily Reflection (${currentDayKey})\n\n"${dailyPage.promptText}"\n\n— ${dailyPage.promptCategory}`;
    navigator.clipboard.writeText(text);
    onToast('Reflection quote copied to share! 🚀');
  };

  const handleRollNewPrompt = () => {
    const newPrompt = getRandomDifferentPrompt('personal', dailyPage.promptId);
    updateDailyPage(dailyPage.id, {
      promptId: newPrompt.id,
      promptText: newPrompt.text,
      promptCategory: newPrompt.subtitle || newPrompt.category,
    });
    onToast('New prompt generated! 🎲');
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    const created = addDailyTask(dailyPage.id, currentDayKey, newTaskInput);
    setTasks(prev => [...prev, created]);
    setNewTaskInput('');
    setStreak(getStreak(dailyPage.ownerId, 'personal'));
  };

  const handleToggleTask = (taskId: string, currentStatus: boolean) => {
    toggleDailyTask(taskId, !currentStatus);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !currentStatus } : t));
    setStreak(getStreak(dailyPage.ownerId, 'personal'));
  };

  const handleDeleteTask = (taskId: string) => {
    deleteDailyTask(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setStreak(getStreak(dailyPage.ownerId, 'personal'));
  };

  const handleCarryForwardAll = () => {
    const tomorrowKey = getRelativeDayKey(currentDayKey, 1);
    const tomorrowPage = updateDailyPage(`dp_personal_${tomorrowKey}_${dailyPage.ownerId}`, {}) || dailyPage;
    
    const unfinished = tasks.filter(t => !t.completed && !t.carriedForwardTo);
    unfinished.forEach(t => {
      carryForwardTask(t.id, tomorrowKey, tomorrowPage.id);
    });

    setTasks(getTasksForPage(dailyPage.id, currentDayKey));
    setCarryForwardOpen(false);
    onToast(`Carried forward ${unfinished.length} unfinished tasks to tomorrow! 🚀`);
  };

  // Gap 4: Personal photo upload directly to today's page
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        addAssetItem({
          id: `asset_upload_${Date.now()}`,
          dailyPageId: dailyPage.id,
          date: currentDayKey,
          mode: 'personal',
          type: 'user-upload',
          url: dataUrl,
          caption: file.name.replace(/\.[^/.]+$/, ''),
          uploadedBy: dailyPage.ownerId,
          mood: dailyPage.mood,
          createdAt: Date.now(),
        });
        // Also set as the cover polaroid image if user wants
        updateDailyPage(dailyPage.id, {
          coverIllustration: dataUrl,
          coverCaption: file.name.replace(/\.[^/.]+$/, ''),
          isCustomIllustration: true,
        });
        setAssets(getAssetsForPage(dailyPage.id));
        onToast('Personal photo uploaded and set as daily memory! 📸');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSwapIllustration = (ill: IllustrationPreset) => {
    updateDailyPage(dailyPage.id, {
      coverIllustration: ill.url,
      coverCaption: ill.caption,
      isCustomIllustration: true,
    });
    setArtPickerOpen(false);
    onToast(`Artwork updated: ${ill.title} 🎨`);
  };

  // Date helpers
  const parsedDate = parseDayKey(currentDayKey);
  const dayName = parsedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDayYear = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const weekDays = getWeekDays(currentDayKey);
  const currentMoodOption = MOOD_OPTIONS.find(m => m.id === dailyPage.mood) || MOOD_OPTIONS[0];
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const unfinishedTasksCount = tasks.filter(t => !t.completed).length;
  const completionPercentage = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[1080px] mx-auto py-2">
      
      {/* Next-morning recap banner */}
      {recap && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="w-full mb-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/25 backdrop-blur-md flex items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-sm shadow-inner">
              ✨
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Yesterday's Recap ({recap.date})
              </div>
              <div className="text-[11.5px] text-amber-800/90 dark:text-amber-300/90">
                {recap.summarySnippet ? `You reflected: "${recap.summarySnippet}"` : 'Reflective journaling day'} · Completed {recap.completedTasks}/{recap.totalTasks} action items.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              dismissYesterdayRecap(formatDayKey());
              setRecap(null);
            }}
            className="p-1.5 rounded-xl hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 text-xs cursor-pointer transition"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════
          OUTER TRANSLUCENT COVER MAT (APPLE LIQUID GLASS)
         ══════════════════════════════════════════════════════ */}
      <motion.div
        key={currentDayKey}
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="apple-liquid-glass relative w-full p-2.5 sm:p-4 rounded-[36px] overflow-hidden"
      >
        
        {/* ══════════════════════════════════════════════════════
            INNER OPEN DUAL NOTEBOOK SPREAD
           ══════════════════════════════════════════════════════ */}
        <div className="relative w-full rounded-3xl bg-white/95 dark:bg-[#161920]/95 shadow-[0_12px_36px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-white/60 dark:border-zinc-800/80">

          {/* ════════════════════════════════════════
              LEFT PAGE — WEATHER, ARTWORK, STREAK
             ════════════════════════════════════════ */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between relative bg-[#FCFDFE] dark:bg-[#171A21] border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800/80">
            
            {/* Top Left Header: Active Weather/Mood Selector + Date + Options */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Gap 1 & 5: Interactive Weather/Mood Button */}
                <div className="relative">
                  <button
                    disabled={readOnly}
                    onClick={() => setMoodPickerOpen(!moodPickerOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 dark:border-amber-500/30 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed group shadow-xs"
                    title="Click to change today's weather & mood"
                  >
                    <span className="text-2xl group-hover:scale-115 transition-transform">{currentMoodOption.icon}</span>
                    <ChevronDown size={12} className="text-amber-600 dark:text-amber-400 group-hover:translate-y-0.5 transition-transform" />
                  </button>

                  {/* Mood Selector Dropdown */}
                  <AnimatePresence>
                    {moodPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        className="absolute top-full left-0 mt-2 z-50 w-72 p-3 rounded-2xl bg-white/95 dark:bg-[#1E222B]/95 border border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-xl grid grid-cols-2 gap-1.5"
                      >
                        <div className="col-span-2 text-[10.5px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 py-0.5">
                          Select Mood / Weather
                        </div>
                        {MOOD_OPTIONS.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => handleMoodSelect(m.id)}
                            className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs transition cursor-pointer ${
                              dailyPage.mood === m.id
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-semibold ring-1 ring-blue-500/30'
                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <span className="text-base">{m.icon}</span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{m.label}</div>
                              <div className="text-[9.5px] text-zinc-400 truncate">{m.weatherName}</div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Day of Week & Date */}
                <div className="text-left">
                  <div className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-100 leading-tight">
                    {dayName}
                  </div>
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 font-medium leading-none mt-1">
                    {monthDayYear}
                  </div>
                </div>
              </div>

              {/* Right Settings Pill (3 Sliders) */}
              <button
                disabled={readOnly}
                onClick={() => setArtPickerOpen(true)}
                className="w-9 h-9 rounded-xl bg-zinc-100/80 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition flex items-center justify-center cursor-pointer shadow-xs disabled:opacity-50"
                title="Swap illustration artwork"
              >
                <SlidersHorizontal size={14} />
              </button>
            </div>

            {/* ─── POLAROID ARTWORK CARD ─── */}
            <div className="flex flex-col items-center justify-center my-auto py-3">
              <motion.div
                whileHover={{ scale: 1.015 }}
                transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                onClick={() => {
                  const coverAsset: DailyAssetItem = {
                    id: 'cover',
                    dailyPageId: dailyPage.id,
                    date: currentDayKey,
                    mode: 'personal',
                    type: 'auto-illustration',
                    url: dailyPage.coverIllustration,
                    caption: dailyPage.coverCaption,
                    createdAt: Date.now(),
                  };
                  setActiveLightboxAsset(coverAsset);
                }}
                className="relative p-3 bg-white dark:bg-[#1E222B] rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.07)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)] border border-zinc-200/80 dark:border-zinc-800 cursor-pointer group max-w-[270px] w-full"
              >
                <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={dailyPage.coverIllustration}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25 }}
                      src={dailyPage.coverIllustration}
                      alt={dailyPage.coverCaption || 'Daily Artwork'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="px-3 py-1 rounded-full bg-black/60 text-white text-[10.5px] font-medium backdrop-blur-xs flex items-center gap-1.5">
                      <ImageIcon size={12} /> View Full
                    </span>
                  </div>
                </div>

                {/* English Polaroid Caption */}
                <div className="pt-3 pb-1 text-center">
                  <p className="text-[12.5px] font-medium text-zinc-700 dark:text-zinc-300 leading-snug px-1 truncate">
                    {dailyPage.coverCaption || 'Where in the world is the field full of blooming flowers'}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* ─── BOTTOM SECTION: MINI WEEKLY STRIP + STREAK REWARD + GRACE SHIELD ─── */}
            <div className="space-y-3 pt-2 select-none">
              
              {/* 7-Day Mini Weekly Strip */}
              <div className="flex items-center justify-between gap-1 max-w-[320px] mx-auto w-full">
                {weekDays.map((d) => (
                  <button
                    key={d.dayKey}
                    onClick={() => onSelectDate(d.dayKey)}
                    className="flex flex-col items-center justify-center py-1 transition cursor-pointer min-w-[36px]"
                  >
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                      {d.dayName}
                    </span>
                    <div className={`w-7 h-7 mt-1 rounded-full flex items-center justify-center text-xs font-semibold transition ${
                      d.isCurrent
                        ? 'bg-[#0091FF] text-white font-bold shadow-md shadow-blue-500/30 ring-2 ring-blue-300 dark:ring-blue-500/50'
                        : d.dayKey === formatDayKey()
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}>
                      {d.dayNumber}
                    </div>
                  </button>
                ))}
              </div>

              {/* Gap 2 & 6: Emotional Streak Reward Card with Flame Animation + Grace Shield */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-orange-500/20 dark:border-orange-500/30 backdrop-blur-xs">
                <div className="flex items-center gap-2.5">
                  {/* Glowing Animated Flame */}
                  <div className="relative flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center shadow-md shadow-orange-500/30 animate-pulse">
                      <Flame size={16} className="fill-white" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>{streak.currentCount} Day Streak</span>
                      {streak.currentCount >= 3 && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-300 font-semibold">
                          On Fire 🔥
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {streak.currentCount > 0
                        ? "You're on fire! Keep the momentum lit today!"
                        : "Write a reflection or complete a task to ignite your streak!"}
                    </p>
                  </div>
                </div>

                {/* Gap 6: Grace Shield Status Indicator */}
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white/70 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-[10px] text-zinc-600 dark:text-zinc-300 shadow-2xs"
                  title="Grace Period: Past days are protected and editable during the morning grace window."
                >
                  <ShieldCheck size={12} className="text-emerald-500" />
                  <span className="font-medium hidden sm:inline">Protected</span>
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════
              CENTER SPINE / 3 DUAL BINDER RINGS
             ════════════════════════════════════════ */}
          <div className="hidden md:flex flex-col items-center justify-between w-9 py-12 bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-100 dark:from-[#13151B] dark:via-[#1A1D24] dark:to-[#13151B] border-x border-zinc-200/60 dark:border-zinc-800 z-10 select-none shadow-[inset_0_0_10px_rgba(0,0,0,0.04)]">
            {/* Top Dual Ring */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-zinc-800/40 dark:bg-black shadow-inner" />
                <div className="absolute w-8 h-3 rounded-full bg-gradient-to-b from-zinc-300 via-white to-zinc-400 dark:from-zinc-500 dark:via-zinc-200 dark:to-zinc-600 shadow-md border border-zinc-400/40" />
              </div>
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-zinc-800/40 dark:bg-black shadow-inner" />
                <div className="absolute w-8 h-3 rounded-full bg-gradient-to-b from-zinc-300 via-white to-zinc-400 dark:from-zinc-500 dark:via-zinc-200 dark:to-zinc-600 shadow-md border border-zinc-400/40" />
              </div>
            </div>

            {/* Middle Dual Ring */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-zinc-800/40 dark:bg-black shadow-inner" />
                <div className="absolute w-8 h-3 rounded-full bg-gradient-to-b from-zinc-300 via-white to-zinc-400 dark:from-zinc-500 dark:via-zinc-200 dark:to-zinc-600 shadow-md border border-zinc-400/40" />
              </div>
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-zinc-800/40 dark:bg-black shadow-inner" />
                <div className="absolute w-8 h-3 rounded-full bg-gradient-to-b from-zinc-300 via-white to-zinc-400 dark:from-zinc-500 dark:via-zinc-200 dark:to-zinc-600 shadow-md border border-zinc-400/40" />
              </div>
            </div>

            {/* Bottom Dual Ring */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-zinc-800/40 dark:bg-black shadow-inner" />
                <div className="absolute w-8 h-3 rounded-full bg-gradient-to-b from-zinc-300 via-white to-zinc-400 dark:from-zinc-500 dark:via-zinc-200 dark:to-zinc-600 shadow-md border border-zinc-400/40" />
              </div>
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-zinc-800/40 dark:bg-black shadow-inner" />
                <div className="absolute w-8 h-3 rounded-full bg-gradient-to-b from-zinc-300 via-white to-zinc-400 dark:from-zinc-500 dark:via-zinc-200 dark:to-zinc-600 shadow-md border border-zinc-400/40" />
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════
              RIGHT PAGE — PROMPT, WRITING & STICKY TASKS
             ════════════════════════════════════════ */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between relative bg-[#FCFDFE] dark:bg-[#171A21]">
            
            <div className="space-y-4">
              
              {/* ─── ROTATING PROMPT CARD (FROSTED GLASS EFFECT) ─── */}
              <div className="relative p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#F5F8FA]/90 via-[#F7FAFC]/80 to-[#EDF4F9]/70 dark:from-zinc-800/80 dark:to-zinc-900/80 border border-white/80 dark:border-zinc-700/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-md">
                
                {/* Header: Savor the Moment + Time */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <Headphones size={15} className="text-zinc-500" />
                    <span>{dailyPage.promptCategory || 'Savor the Moment'}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium font-mono">
                    10:00 PM
                  </div>
                </div>

                {/* Prompt Quote Body */}
                <p className="text-[14.5px] sm:text-[15.5px] font-bold text-zinc-800 dark:text-zinc-100 leading-snug my-2.5 text-center px-1">
                  {dailyPage.promptText}
                </p>

                {/* Bottom Minimalist Icons (Copy, Like, Share, Shuffle) */}
                <div className="flex items-center justify-center gap-4 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
                  <button
                    onClick={handleCopyPrompt}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                    title="Copy prompt text"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={handlePromptLikeToggle}
                    className={`p-1.5 transition cursor-pointer ${
                      dailyPage.promptLiked ? 'text-red-500 fill-red-500' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                    title={dailyPage.promptLiked ? 'Liked' : 'Like prompt'}
                  >
                    <Heart size={14} className={dailyPage.promptLiked ? 'fill-current' : ''} />
                  </button>
                  <button
                    onClick={handleSharePrompt}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                    title="Share reflection"
                  >
                    <Share2 size={14} />
                  </button>
                  <button
                    disabled={readOnly}
                    onClick={handleRollNewPrompt}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer disabled:opacity-40"
                    title="Shuffle prompt"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* ─── LINED REFLECTION NOTEBOOK ZONE ─── */}
              <div className="space-y-1">
                {/* Pencil Prompt Guidance Note */}
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic flex items-start gap-1 leading-snug">
                  <span className="shrink-0 not-italic">✍️</span>
                  <span>Use the card's prompt to take a small action, make a decision, affirm a belief, or reflect on an idea, and write it down:</span>
                </div>

                {/* Realistic Notebook Ruled Paper Textarea */}
                <div className="relative pt-1">
                  <textarea
                    disabled={readOnly}
                    value={reflectionText}
                    onChange={(e) => handleReflectionChange(e.target.value)}
                    placeholder="Feel free to journal your current thoughts or anything else you'd like..."
                    rows={5}
                    style={{
                      backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(200, 205, 215, 0.35) 32px)',
                      lineHeight: '32px',
                    }}
                    className="w-full bg-transparent resize-none outline-none text-[13px] sm:text-[13.5px] text-zinc-800 dark:text-zinc-200 font-normal placeholder:text-zinc-300 dark:placeholder:text-zinc-600 placeholder:italic p-1"
                  />
                </div>

                {/* Location Bar with Pin Icon */}
                <div className="flex items-center gap-2 pt-1 text-xs text-zinc-400">
                  <span className="text-zinc-400">◎</span>
                  <input
                    disabled={readOnly}
                    type="text"
                    value={locationTag}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    placeholder="Where are you right now..."
                    className="flex-1 bg-transparent outline-none text-xs text-zinc-600 dark:text-zinc-300 placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* ─── GAP 3: TACTILE STICKY-NOTE STYLE ACTION CHECKLIST CARD ─── */}
              <div className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-[#1E2128]/70 border border-amber-200/50 dark:border-zinc-700/60 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                      Today's Action Plan
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      {completedTasksCount}/{tasks.length} Done ({completionPercentage}%)
                    </span>
                  </div>
                  {unfinishedTasksCount > 0 && !readOnly && (
                    <button
                      onClick={() => setCarryForwardOpen(true)}
                      className="text-[10.5px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      Carry forward to tomorrow? <ArrowRight size={11} />
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {tasks.length > 0 && (
                  <div className="w-full h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                )}

                {/* Tasks list */}
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {tasks.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 italic py-0.5">No tasks yet. Add what you plan to accomplish today!</p>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className="group flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white/90 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/50 text-xs transition hover:border-zinc-300"
                      >
                        <button
                          disabled={readOnly}
                          onClick={() => handleToggleTask(task.id, task.completed)}
                          className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                        >
                          <div className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border transition ${
                            task.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-zinc-400 dark:border-zinc-600 hover:border-emerald-500'
                          }`}>
                            {task.completed && <Check size={10} strokeWidth={3} />}
                          </div>
                          <span className={`text-zinc-800 dark:text-zinc-200 ${task.completed ? 'line-through opacity-50' : ''}`}>
                            {task.text}
                          </span>
                        </button>

                        {!readOnly && (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add task form */}
                {!readOnly && (
                  <form onSubmit={handleAddTask} className="flex items-center gap-2 pt-0.5">
                    <input
                      type="text"
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      placeholder="Add an action item..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs transition"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* ─── GAP 4: ENHANCED GALLERY & UPLOAD ACTIONS ─── */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
              {/* Photo Thumbnails + Upload Trigger */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => setActiveLightboxAsset(asset)}
                    className="w-9 h-9 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0 cursor-pointer group shadow-2xs hover:scale-105 transition-transform relative"
                  >
                    <img src={asset.url} alt={asset.caption || 'Photo'} className="w-full h-full object-cover" />
                  </div>
                ))}
                
                {/* Upload Personal Photo Button */}
                {!readOnly && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 px-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 text-zinc-500 hover:text-blue-500 dark:text-zinc-400 flex items-center gap-1.5 shrink-0 transition cursor-pointer text-xs font-medium bg-zinc-50 dark:bg-zinc-800/40"
                    title="Upload personal photo to today"
                  >
                    <Camera size={13} />
                    <span>Upload</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Search Image / Swap Art Pill */}
              <button
                onClick={() => setArtPickerOpen(true)}
                className="px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:shadow-md transition flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
              >
                <span>Search Image</span>
                <RotateCw size={13} className="text-zinc-500" />
              </button>
            </div>

          </div>
        </div>
      </motion.div>

      {/* ─── MODAL: CARRY FORWARD UNFINISHED TASKS ─── */}
      <AnimatePresence>
        {carryForwardOpen && (
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
              className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#1E222B] border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  🚀
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Carry Forward Tasks to Tomorrow?
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Carry {unfinishedTasksCount} unfinished tasks forward to {getRelativeDayKey(currentDayKey, 1)}.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-700/60 max-h-40 overflow-y-auto space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                {tasks.filter(t => !t.completed).map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>{t.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setCarryForwardOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCarryForwardAll}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-md shadow-blue-500/20"
                >
                  Confirm & Carry Forward
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: ARTWORK SELECTION ─── */}
      <AnimatePresence>
        {artPickerOpen && (
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
              className="w-full max-w-2xl p-6 rounded-3xl bg-white dark:bg-[#1E222B] border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Choose Daily Artwork
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Select a curated aesthetic illustration or upload your personal memory photo.
                  </p>
                </div>
                <button
                  onClick={() => setArtPickerOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Grid of Curated Artworks */}
              <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
                {CURATED_ILLUSTRATIONS.map((ill) => (
                  <div
                    key={ill.id}
                    onClick={() => handleSwapIllustration(ill)}
                    className="group relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 cursor-pointer hover:ring-2 hover:ring-blue-500 transition shadow-sm flex flex-col"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden">
                      <img src={ill.url} alt={ill.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    </div>
                    <div className="p-2.5">
                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">{ill.title}</div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{ill.caption}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: LIGHTBOX ─── */}
      <AnimatePresence>
        {activeLightboxAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveLightboxAsset(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-zinc-800 cursor-default"
            >
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setActiveLightboxAsset(null)}
                  className="p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition cursor-pointer backdrop-blur-xs"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex items-center justify-center p-2 bg-black/40">
                <img
                  src={activeLightboxAsset.url}
                  alt={activeLightboxAsset.caption || 'Lightbox asset'}
                  className="max-h-[75vh] w-auto object-contain rounded-xl"
                />
              </div>

              <div className="p-4 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
                <span>{activeLightboxAsset.caption || 'Daily Image Asset'}</span>
                <span className="font-mono text-zinc-500">{activeLightboxAsset.date}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
