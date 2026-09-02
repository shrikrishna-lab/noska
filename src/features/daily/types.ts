export type DailyMode = 'personal' | 'team';

export type DailyMood =
  | 'sunny'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'windy'
  | 'cozy'
  | 'energetic'
  | 'calm'
  | 'focused'
  | 'grateful'
  | 'creative'
  | 'tired';

export interface MoodOption {
  id: DailyMood;
  label: string;
  icon: string;
  weatherName: string;
  color: string;
  accentBg: string;
}

export interface DailyPageRecord {
  id: string;
  date: string; // ISO format 'YYYY-MM-DD'
  mode: DailyMode;
  ownerId: string;
  reflectionText: string;
  mood: DailyMood;
  locationTag: string;
  promptId: string;
  promptText: string;
  promptCategory: string;
  promptLiked: boolean;
  coverIllustration: string;
  coverCaption: string;
  isCustomIllustration?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DailyTaskItem {
  id: string;
  dailyPageId: string;
  date: string; // 'YYYY-MM-DD'
  text: string;
  completed: boolean;
  carriedForwardFrom?: string | null;
  carriedForwardTo?: string | null;
  createdAt: number;
  completedAt?: number | null;
}

export interface DailyPromptItem {
  id: string;
  text: string;
  subtitle?: string;
  category: 'reflection' | 'work-status';
  timeLabel?: string;
}

export interface DailyStreakRecord {
  id: string;
  ownerId: string;
  mode: DailyMode;
  currentCount: number;
  longestCount: number;
  lastQualifyingDate: string | null;
  history: Record<string, boolean>; // date -> qualified
}

export interface DailyAssetItem {
  id: string;
  dailyPageId: string;
  date: string; // 'YYYY-MM-DD'
  mode: DailyMode;
  type: 'auto-illustration' | 'user-upload';
  url: string;
  caption?: string;
  uploadedBy?: string;
  mood?: DailyMood;
  createdAt: number;
}

export interface TeamMemberCheckIn {
  id: string;
  dailyPageId: string;
  date: string; // 'YYYY-MM-DD'
  userId: string;
  userName: string;
  userAvatar?: string;
  workingOn: string;
  blockedOn: string;
  mood: string;
  updatedAt: number;
}

export interface DailySettings {
  gracePeriodEnabled: boolean;
  gracePeriodDays: number; // 1 = editable same day + next morning only
  qualifyingActivity: 'flexible' | 'reflection_only' | 'tasks_only';
  defaultMode: DailyMode;
  showNextMorningRecap: boolean;
  dismissedRecapDates: string[];
}

export interface YesterdayRecap {
  date: string;
  hasEntry: boolean;
  summarySnippet: string;
  completedTasks: number;
  totalTasks: number;
  unfinishedTasks: DailyTaskItem[];
  mood?: DailyMood;
}
