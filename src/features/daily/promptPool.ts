import { DailyPromptItem, DailyMood, MoodOption } from './types';

export const MOOD_OPTIONS: MoodOption[] = [
  { id: 'sunny', label: 'Bright & Hopeful', icon: '☀️', weatherName: 'Clear Sky', color: '#F59E0B', accentBg: 'rgba(245, 158, 11, 0.12)' },
  { id: 'calm', label: 'Calm & Peaceful', icon: '🌿', weatherName: 'Gentle Breeze', color: '#10B981', accentBg: 'rgba(16, 185, 129, 0.12)' },
  { id: 'cozy', label: 'Cozy & Grounded', icon: '☕', weatherName: 'Warm Hearth', color: '#D97706', accentBg: 'rgba(217, 119, 6, 0.12)' },
  { id: 'energetic', label: 'Energized & Focused', icon: '⚡', weatherName: 'Crisp Morning', color: '#3B82F6', accentBg: 'rgba(59, 130, 246, 0.12)' },
  { id: 'grateful', label: 'Deeply Grateful', icon: '✨', weatherName: 'Golden Hour', color: '#EC4899', accentBg: 'rgba(236, 72, 153, 0.12)' },
  { id: 'creative', label: 'Creative Spark', icon: '🎨', weatherName: 'Inspiring Mist', color: '#8B5CF6', accentBg: 'rgba(139, 92, 246, 0.12)' },
  { id: 'cloudy', label: 'Reflective & Quiet', icon: '☁️', weatherName: 'Soft Clouds', color: '#6B7280', accentBg: 'rgba(107, 114, 128, 0.12)' },
  { id: 'rainy', label: 'Pensive & Healing', icon: '🌧️', weatherName: 'Gentle Rain', color: '#0284C7', accentBg: 'rgba(2, 132, 199, 0.12)' },
  { id: 'snowy', label: 'Still & Meditative', icon: '❄️', weatherName: 'Quiet Snowfall', color: '#6366F1', accentBg: 'rgba(99, 102, 241, 0.12)' },
  { id: 'windy', label: 'Restless & Seeking', icon: '🍃', weatherName: 'Brisk Wind', color: '#14B8A6', accentBg: 'rgba(20, 184, 166, 0.12)' },
  { id: 'tired', label: 'Rest & Recovery', icon: '🌙', weatherName: 'Starlit Evening', color: '#64748B', accentBg: 'rgba(100, 116, 139, 0.12)' },
];

export const PERSONAL_PROMPTS: DailyPromptItem[] = [
  {
    id: 'pers_1',
    category: 'reflection',
    subtitle: 'Savor the Moment',
    text: 'I slow down to hear the flowers bloom and feel the gentle touch of the breeze.',
    timeLabel: '10:00 PM'
  },
  {
    id: 'pers_2',
    category: 'reflection',
    subtitle: 'Gratitude Anchor',
    text: 'What is one tiny detail or unexpected kindness that made today genuinely lighter?',
    timeLabel: '08:30 AM'
  },
  {
    id: 'pers_3',
    category: 'reflection',
    subtitle: 'Honest Check-in',
    text: 'What feeling is lingering just beneath the surface right now, and what does it need from you?',
    timeLabel: '07:15 PM'
  },
  {
    id: 'pers_4',
    category: 'reflection',
    subtitle: 'Mindful Growth',
    text: 'What is one belief or assumption you gently let go of recently to make room for something better?',
    timeLabel: '09:00 AM'
  },
  {
    id: 'pers_5',
    category: 'reflection',
    subtitle: 'Inner Sanctuary',
    text: 'Describe a moment in your day where you felt most completely yourself and at ease.',
    timeLabel: '10:30 PM'
  },
  {
    id: 'pers_6',
    category: 'reflection',
    subtitle: 'Courage & Intention',
    text: 'If you could give today’s self one gentle piece of encouragement without judgment, what would it be?',
    timeLabel: '08:00 AM'
  },
  {
    id: 'pers_7',
    category: 'reflection',
    subtitle: 'Joyful Sparks',
    text: 'What made you smile, pause, or lose track of time today?',
    timeLabel: '06:45 PM'
  },
  {
    id: 'pers_8',
    category: 'reflection',
    subtitle: 'Evening Clarity',
    text: 'What was your favorite decision today, and how did it protect your energy or peace?',
    timeLabel: '09:45 PM'
  },
  {
    id: 'pers_9',
    category: 'reflection',
    subtitle: 'Quiet Wisdom',
    text: 'What is something simple you learned about the world or the people around you today?',
    timeLabel: '02:00 PM'
  },
  {
    id: 'pers_10',
    category: 'reflection',
    subtitle: 'Tomorrow’s Horizon',
    text: 'What single intention or feeling do you want to carry into tomorrow morning?',
    timeLabel: '11:00 PM'
  }
];

export const TEAM_PROMPTS: DailyPromptItem[] = [
  {
    id: 'team_1',
    category: 'work-status',
    subtitle: 'Team Momentum',
    text: 'What is the single most important breakthrough or outcome you are steering toward today?',
    timeLabel: '09:00 AM'
  },
  {
    id: 'team_2',
    category: 'work-status',
    subtitle: 'Gentle Unblocker',
    text: 'What is slowing you down or creating friction today where another team member could lend a hand?',
    timeLabel: '09:30 AM'
  },
  {
    id: 'team_3',
    category: 'work-status',
    subtitle: 'Weekly Wins & Sync',
    text: 'What recent team progress or quiet win deserves a quick spotlight or appreciation?',
    timeLabel: '10:00 AM'
  },
  {
    id: 'team_4',
    category: 'work-status',
    subtitle: 'Clarity & Alignment',
    text: 'What question or dependency is top of mind for your current workstream today?',
    timeLabel: '01:30 PM'
  },
  {
    id: 'team_5',
    category: 'work-status',
    subtitle: 'Team Well-being',
    text: 'How is your bandwidth today, and is there any meeting we can turn into an async update?',
    timeLabel: '11:00 AM'
  }
];

export interface IllustrationPreset {
  id: string;
  url: string;
  caption: string;
  moodTag: DailyMood;
  title: string;
}

export const CURATED_ILLUSTRATIONS: IllustrationPreset[] = [
  {
    id: 'art_field_blooms',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    caption: 'Where in the world is the field full of blooming flowers',
    moodTag: 'sunny',
    title: 'Summer Shore Bloom'
  },
  {
    id: 'art_golden_clouds',
    url: 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?auto=format&fit=crop&w=800&q=80',
    caption: 'Cloud kingdom bathed in gentle afternoon light',
    moodTag: 'calm',
    title: 'Golden Horizon'
  },
  {
    id: 'art_misty_forest',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    caption: 'Quiet paths and cedar mist in the early dawn',
    moodTag: 'cozy',
    title: 'Morning Forest Walk'
  },
  {
    id: 'art_starry_night',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
    caption: 'Still peaks watching over a million quiet stars',
    moodTag: 'tired',
    title: 'Alpine Starlight'
  },
  {
    id: 'art_rainy_window',
    url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=800&q=80',
    caption: 'Raindrops painting melodies across the glass',
    moodTag: 'rainy',
    title: 'Afternoon Rain'
  },
  {
    id: 'art_sunlit_workspace',
    url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80',
    caption: 'Fresh tea, open pages, and clean creative focus',
    moodTag: 'creative',
    title: 'Creative Table'
  },
  {
    id: 'art_snow_meadow',
    url: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=800&q=80',
    caption: 'Soft white snow cloaking the winter valley',
    moodTag: 'snowy',
    title: 'Winter Silence'
  },
  {
    id: 'art_ocean_sunrise',
    url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=800&q=80',
    caption: 'First light breaking gently through tidal waves',
    moodTag: 'grateful',
    title: 'Dawn Over Ocean'
  },
  {
    id: 'art_energetic_peaks',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
    caption: 'Sunlit mountain peaks and vibrant morning energy',
    moodTag: 'energetic',
    title: 'Alpine Summit'
  },
  {
    id: 'art_soft_clouds',
    url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=800&q=80',
    caption: 'Soft velvet clouds floating over quiet valleys',
    moodTag: 'cloudy',
    title: 'Cloud Canopy'
  },
  {
    id: 'art_coastal_wind',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    caption: 'Brisk sea breeze sweeping across golden coastal dunes',
    moodTag: 'windy',
    title: 'Dune Breeze'
  }
];

export function getIllustrationForMood(mood: DailyMood): IllustrationPreset {
  const match = CURATED_ILLUSTRATIONS.find(i => i.moodTag === mood);
  return match || CURATED_ILLUSTRATIONS[0];
}
