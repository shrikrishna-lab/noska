import {
  DailyPageRecord,
  DailyTaskItem,
  DailyStreakRecord,
  DailyAssetItem,
  TeamMemberCheckIn,
  DailySettings,
  YesterdayRecap,
  DailyMode,
  DailyMood,
  DailyPromptItem
} from './types';
import { PERSONAL_PROMPTS, TEAM_PROMPTS, getIllustrationForMood, CURATED_ILLUSTRATIONS } from './promptPool';

const STORAGE_KEYS = {
  PAGES: 'noska_daily_pages_v1',
  TASKS: 'noska_daily_tasks_v1',
  STREAKS: 'noska_daily_streaks_v1',
  ASSETS: 'noska_daily_assets_v1',
  CHECKINS: 'noska_daily_team_checkins_v1',
  SETTINGS: 'noska_daily_settings_v1',
  PROMPT_HISTORY: 'noska_daily_prompt_history_v1',
};

// Simple event-based pub/sub for daily store updates
type StoreListener = () => void;
const listeners = new Set<StoreListener>();

export function subscribeDailyStore(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyStoreChange() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.error('Error notifying daily store listener:', e);
    }
  });
}

export function formatDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDayKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getRelativeDayKey(dayKey: string, offsetDays: number): string {
  const date = parseDayKey(dayKey);
  date.setDate(date.getDate() + offsetDays);
  return formatDayKey(date);
}

export function getWeekDays(referenceDayKey: string): { dayKey: string; dayName: string; dayNumber: number; isCurrent: boolean }[] {
  const refDate = parseDayKey(referenceDayKey);
  const currentDayOfWeek = (refDate.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() - currentDayOfWeek);

  const days: { dayKey: string; dayName: string; dayNumber: number; isCurrent: boolean }[] = [];
  const names = ['Mon', 'Tues', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayKey = formatDayKey(d);
    days.push({
      dayKey,
      dayName: names[i],
      dayNumber: d.getDate(),
      isCurrent: dayKey === referenceDayKey,
    });
  }

  return days;
}

// ─── Settings Storage ───
export function getDailySettings(): DailySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading daily settings:', e);
  }
  return {
    gracePeriodEnabled: true,
    gracePeriodDays: 1, // today + next morning
    qualifyingActivity: 'flexible',
    defaultMode: 'personal',
    showNextMorningRecap: true,
    dismissedRecapDates: [],
  };
}

export function saveDailySettings(patch: Partial<DailySettings>): DailySettings {
  const current = getDailySettings();
  const updated = { ...current, ...patch };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  notifyStoreChange();
  return updated;
}

// ─── Prompt Engine & History ───
export function getPromptForDay(mode: DailyMode, dateKey: string, userId: string = 'default'): DailyPromptItem {
  const pool = mode === 'personal' ? PERSONAL_PROMPTS : TEAM_PROMPTS;
  
  let history: Record<string, string[]> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROMPT_HISTORY);
    if (raw) history = JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading prompt history:', e);
  }

  const userKey = `${mode}_${userId}`;
  const usedPromptIds = history[userKey] || [];

  // Filter pool to avoid repeats in short window (e.g. 7 entries)
  const available = pool.filter(p => !usedPromptIds.slice(-5).includes(p.id));
  const candidatePool = available.length > 0 ? available : pool;

  // Stable daily pseudo-random choice
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % candidatePool.length;
  }
  const selected = candidatePool[Math.abs(hash) % candidatePool.length];

  // Record history
  if (!usedPromptIds.includes(selected.id)) {
    history[userKey] = [...usedPromptIds, selected.id].slice(-15);
    localStorage.setItem(STORAGE_KEYS.PROMPT_HISTORY, JSON.stringify(history));
  }

  return selected;
}

export function getRandomDifferentPrompt(mode: DailyMode, currentPromptId: string): DailyPromptItem {
  const pool = mode === 'personal' ? PERSONAL_PROMPTS : TEAM_PROMPTS;
  const filtered = pool.filter(p => p.id !== currentPromptId);
  const randomChoice = filtered[Math.floor(Math.random() * filtered.length)] || pool[0];
  return randomChoice;
}

// ─── Daily Pages Storage ───
export function getAllDailyPages(): DailyPageRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAGES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading daily pages:', e);
  }
  return [];
}

export function getDailyPage(dateKey: string, mode: DailyMode = 'personal', ownerId: string = 'user_default'): DailyPageRecord {
  const all = getAllDailyPages();
  let found = all.find(p => p.date === dateKey && p.mode === mode && p.ownerId === ownerId);

  if (!found) {
    // Auto-create page for this day!
    const prompt = getPromptForDay(mode, dateKey, ownerId);
    const initialMood: DailyMood = 'sunny';
    const illustration = getIllustrationForMood(initialMood);

    found = {
      id: `dp_${mode}_${dateKey}_${ownerId}`,
      date: dateKey,
      mode,
      ownerId,
      reflectionText: '',
      mood: initialMood,
      locationTag: '',
      promptId: prompt.id,
      promptText: prompt.text,
      promptCategory: prompt.subtitle || prompt.category,
      promptLiked: false,
      coverIllustration: illustration.url,
      coverCaption: illustration.caption,
      isCustomIllustration: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    all.push(found);
    localStorage.setItem(STORAGE_KEYS.PAGES, JSON.stringify(all));

    // Also register default asset item
    addAssetItem({
      id: `asset_cover_${found.id}`,
      dailyPageId: found.id,
      date: dateKey,
      mode,
      type: 'auto-illustration',
      url: found.coverIllustration,
      caption: found.coverCaption,
      uploadedBy: ownerId,
      mood: found.mood,
      createdAt: Date.now(),
    });

    notifyStoreChange();
  }

  return found;
}

export function updateDailyPage(pageId: string, patch: Partial<DailyPageRecord>): DailyPageRecord | null {
  const all = getAllDailyPages();
  const index = all.findIndex(p => p.id === pageId);
  if (index < 0) return null;

  const current = all[index];
  const updated: DailyPageRecord = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  };

  // If mood changed and illustration was not customized by user, update illustration automatically
  if (patch.mood && patch.mood !== current.mood && !current.isCustomIllustration && !patch.coverIllustration) {
    const defaultIll = getIllustrationForMood(patch.mood);
    updated.coverIllustration = defaultIll.url;
    updated.coverCaption = defaultIll.caption;
  }

  all[index] = updated;
  localStorage.setItem(STORAGE_KEYS.PAGES, JSON.stringify(all));

  // Recalculate streaks if reflection activity changed
  recalculateStreak(updated.ownerId, updated.mode);

  notifyStoreChange();
  return updated;
}

// ─── Task Checklist Storage ───
export function getTasksForPage(dailyPageId: string, dateKey: string): DailyTaskItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (raw) {
      const all: DailyTaskItem[] = JSON.parse(raw);
      return all.filter(t => t.dailyPageId === dailyPageId || t.date === dateKey);
    }
  } catch (e) {
    console.error('Error reading daily tasks:', e);
  }
  return [];
}

export function getAllTasks(): DailyTaskItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading all tasks:', e);
  }
  return [];
}

export function addDailyTask(dailyPageId: string, dateKey: string, text: string, carriedFromId?: string | null): DailyTaskItem {
  const all = getAllTasks();
  const newTask: DailyTaskItem = {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    dailyPageId,
    date: dateKey,
    text: text.trim(),
    completed: false,
    carriedForwardFrom: carriedFromId || null,
    createdAt: Date.now(),
    completedAt: null,
  };

  all.push(newTask);
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(all));

  // Recalculate streak
  const page = getAllDailyPages().find(p => p.id === dailyPageId);
  if (page) {
    recalculateStreak(page.ownerId, page.mode);
  }

  notifyStoreChange();
  return newTask;
}

export function toggleDailyTask(taskId: string, completed: boolean): void {
  const all = getAllTasks();
  const index = all.findIndex(t => t.id === taskId);
  if (index >= 0) {
    all[index].completed = completed;
    all[index].completedAt = completed ? Date.now() : null;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(all));

    const page = getAllDailyPages().find(p => p.id === all[index].dailyPageId);
    if (page) {
      recalculateStreak(page.ownerId, page.mode);
    }

    notifyStoreChange();
  }
}

export function deleteDailyTask(taskId: string): void {
  let all = getAllTasks();
  all = all.filter(t => t.id !== taskId);
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(all));
  notifyStoreChange();
}

export function carryForwardTask(taskId: string, targetDateKey: string, targetPageId: string): DailyTaskItem | null {
  const all = getAllTasks();
  const sourceTask = all.find(t => t.id === taskId);
  if (!sourceTask) return null;

  // Mark source as carried forward
  sourceTask.carriedForwardTo = targetDateKey;

  // Create task on target day
  const newTask: DailyTaskItem = {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    dailyPageId: targetPageId,
    date: targetDateKey,
    text: sourceTask.text,
    completed: false,
    carriedForwardFrom: sourceTask.id,
    createdAt: Date.now(),
  };

  all.push(newTask);
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(all));
  notifyStoreChange();
  return newTask;
}

// ─── Streak Engine ───
export function getStreak(ownerId: string = 'user_default', mode: DailyMode = 'personal'): DailyStreakRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STREAKS);
    if (raw) {
      const all: Record<string, DailyStreakRecord> = JSON.parse(raw);
      const key = `${mode}_${ownerId}`;
      if (all[key]) return all[key];
    }
  } catch (e) {
    console.error('Error reading streaks:', e);
  }

  return recalculateStreak(ownerId, mode);
}

export function isDateQualifying(ownerId: string, mode: DailyMode, dayKey: string): boolean {
  if (mode === 'personal') {
    const page = getAllDailyPages().find(p => p.date === dayKey && p.ownerId === ownerId && p.mode === 'personal');
    const tasks = getAllTasks().filter(t => t.date === dayKey);
    const hasReflection = !!(page && page.reflectionText && page.reflectionText.trim().length > 10);
    const hasCompletedTask = tasks.some(t => t.completed);

    const settings = getDailySettings();
    if (settings.qualifyingActivity === 'reflection_only') return hasReflection;
    if (settings.qualifyingActivity === 'tasks_only') return hasCompletedTask;
    return hasReflection || hasCompletedTask;
  } else {
    // Team mode: check-in submitted
    const checkins = getTeamCheckIns(dayKey);
    return checkins.length > 0;
  }
}

export function recalculateStreak(ownerId: string = 'user_default', mode: DailyMode = 'personal'): DailyStreakRecord {
  const todayKey = formatDayKey();
  const history: Record<string, boolean> = {};

  // Check last 90 days backwards
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastQualifyingDate: string | null = null;

  // Build 90-day history map
  const checkDays: string[] = [];
  for (let i = 89; i >= 0; i--) {
    const dKey = getRelativeDayKey(todayKey, -i);
    const qualified = isDateQualifying(ownerId, mode, dKey);
    history[dKey] = qualified;
    checkDays.push(dKey);
  }

  // Calculate longest streak across history
  for (const dKey of checkDays) {
    if (history[dKey]) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      lastQualifyingDate = dKey;
    } else {
      tempStreak = 0;
    }
  }

  // Calculate current active streak backwards from today or yesterday
  const todayQualified = history[todayKey];
  const yesterdayKey = getRelativeDayKey(todayKey, -1);
  const yesterdayQualified = history[yesterdayKey];

  if (todayQualified || yesterdayQualified) {
    let checkDate = todayQualified ? todayKey : yesterdayKey;
    while (history[checkDate]) {
      currentStreak++;
      checkDate = getRelativeDayKey(checkDate, -1);
    }
  } else {
    currentStreak = 0; // Soft reset quietly without guilt
  }

  const streakRecord: DailyStreakRecord = {
    id: `streak_${mode}_${ownerId}`,
    ownerId,
    mode,
    currentCount: currentStreak,
    longestCount: Math.max(longestStreak, currentStreak),
    lastQualifyingDate,
    history,
  };

  try {
    let allStreaks: Record<string, DailyStreakRecord> = {};
    const raw = localStorage.getItem(STORAGE_KEYS.STREAKS);
    if (raw) allStreaks = JSON.parse(raw);
    allStreaks[`${mode}_${ownerId}`] = streakRecord;
    localStorage.setItem(STORAGE_KEYS.STREAKS, JSON.stringify(allStreaks));
  } catch (e) {
    console.error('Error saving streak:', e);
  }

  return streakRecord;
}

// ─── Next-Morning Recap Generator ───
export function getYesterdayRecap(ownerId: string = 'user_default'): YesterdayRecap | null {
  const todayKey = formatDayKey();
  const settings = getDailySettings();

  if (!settings.showNextMorningRecap || settings.dismissedRecapDates.includes(todayKey)) {
    return null;
  }

  const yesterdayKey = getRelativeDayKey(todayKey, -1);
  const yesterdayPage = getAllDailyPages().find(p => p.date === yesterdayKey && p.ownerId === ownerId && p.mode === 'personal');
  const yesterdayTasks = getAllTasks().filter(t => t.date === yesterdayKey);

  const completed = yesterdayTasks.filter(t => t.completed).length;
  const total = yesterdayTasks.length;
  const unfinished = yesterdayTasks.filter(t => !t.completed && !t.carriedForwardTo);

  const hasContent = (yesterdayPage && yesterdayPage.reflectionText.trim().length > 0) || total > 0;
  if (!hasContent) return null;

  let snippet = '';
  if (yesterdayPage && yesterdayPage.reflectionText.trim().length > 0) {
    const raw = yesterdayPage.reflectionText.trim().replace(/[#*`]/g, '');
    snippet = raw.length > 50 ? raw.slice(0, 50) + '...' : raw;
  }

  return {
    date: yesterdayKey,
    hasEntry: true,
    summarySnippet: snippet,
    completedTasks: completed,
    totalTasks: total,
    unfinishedTasks: unfinished,
    mood: yesterdayPage?.mood,
  };
}

export function dismissYesterdayRecap(todayKey: string): void {
  const settings = getDailySettings();
  if (!settings.dismissedRecapDates.includes(todayKey)) {
    saveDailySettings({
      dismissedRecapDates: [...settings.dismissedRecapDates, todayKey],
    });
  }
}

// ─── Assets Management ───
export function getAllAssets(): DailyAssetItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSETS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading assets:', e);
  }
  return [];
}

export function getAssetsForPage(dailyPageId: string): DailyAssetItem[] {
  return getAllAssets().filter(a => a.dailyPageId === dailyPageId);
}

export function addAssetItem(asset: DailyAssetItem): DailyAssetItem {
  const all = getAllAssets();
  // Avoid duplicate cover illustration entries
  const existingIdx = all.findIndex(a => a.id === asset.id);
  if (existingIdx >= 0) {
    all[existingIdx] = asset;
  } else {
    all.unshift(asset);
  }
  localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(all));
  notifyStoreChange();
  return asset;
}

export function deleteAssetItem(assetId: string): void {
  let all = getAllAssets();
  all = all.filter(a => a.id !== assetId);
  localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(all));
  notifyStoreChange();
}

// ─── Team Daily Check-ins ───
export function getTeamCheckIns(dateKey: string): TeamMemberCheckIn[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHECKINS);
    if (raw) {
      const all: TeamMemberCheckIn[] = JSON.parse(raw);
      return all.filter(c => c.date === dateKey);
    }
  } catch (e) {
    console.error('Error reading team checkins:', e);
  }
  return [];
}

export function getAllTeamCheckIns(): TeamMemberCheckIn[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHECKINS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading all team checkins:', e);
  }
  return [];
}

export function submitTeamCheckIn(checkIn: Omit<TeamMemberCheckIn, 'id' | 'updatedAt'>): TeamMemberCheckIn {
  const all = getAllTeamCheckIns();
  const existingIdx = all.findIndex(c => c.date === checkIn.date && c.userId === checkIn.userId);

  const fullRecord: TeamMemberCheckIn = {
    ...checkIn,
    id: existingIdx >= 0 ? all[existingIdx].id : `chk_${Date.now()}_${checkIn.userId}`,
    updatedAt: Date.now(),
  };

  if (existingIdx >= 0) {
    all[existingIdx] = fullRecord;
  } else {
    all.push(fullRecord);
  }

  localStorage.setItem(STORAGE_KEYS.CHECKINS, JSON.stringify(all));
  recalculateStreak('team_default', 'team');
  notifyStoreChange();
  return fullRecord;
}

// Grace period validator
export function isDayReadOnly(dayKey: string): boolean {
  const settings = getDailySettings();
  if (!settings.gracePeriodEnabled) return false;

  const today = formatDayKey();
  if (dayKey === today) return false;

  // If editable same day + next morning only (gracePeriodDays = 1)
  const yesterday = getRelativeDayKey(today, -1);
  if (dayKey === yesterday) {
    // Editable next morning before 12:00 PM
    const nowHour = new Date().getHours();
    return nowHour >= 12;
  }

  const dateDiff = (parseDayKey(today).getTime() - parseDayKey(dayKey).getTime()) / (1000 * 3600 * 24);
  return dateDiff > settings.gracePeriodDays;
}
