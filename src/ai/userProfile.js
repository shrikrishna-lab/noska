import { setMemory, getMemory, getMemoryByCategory, buildMemoryContext } from './memory.js';

const PROFILE_KEY = "noska_ai_profile";

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveProfile(data) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function mergeProfile(updates) {
  const existing = loadProfile() || {};
  const merged = { ...existing, ...updates, _updated: Date.now() };
  saveProfile(merged);
  return merged;
}

export function getUserProfile() {
  const local = loadProfile();
  const memPrefs = getMemoryByCategory("user_profile");
  const memFacts = getMemoryByCategory("fact");
  const memPrefs2 = getMemoryByCategory("preference");
  return {
    ...(local || {}),
    preferences: memPrefs.map(m => ({ key: m.key, value: m.value.text || m.value })),
    facts: memFacts.map(m => m.value.text || m.value),
    settings: memPrefs2.map(m => ({ key: m.key.replace("pref:", ""), value: m.value.text || m.value }))
  };
}

export function buildUserProfileContext() {
  const profile = getUserProfile();
  if (!profile || Object.keys(profile).length === 0) return "";
  const parts = [];
  if (profile.writingStyle) parts.push(`Writing style: ${profile.writingStyle}`);
  if (profile.tone) parts.push(`Tone preference: ${profile.tone}`);
  if (profile.likes?.length) parts.push('Likes: ' + profile.likes.join(', '));
  if (profile.dislikes?.length) parts.push('Dislikes: ' + profile.dislikes.join(', '));
  if (profile.pros?.length) parts.push('Strengths: ' + profile.pros.join(', '));
  if (profile.cons?.length) parts.push('Areas to improve: ' + profile.cons.join(', '));
  if (profile.habits?.length) parts.push('Habits: ' + profile.habits.join(', '));
  if (profile.goals?.length) parts.push('Goals: ' + profile.goals.join(', '));
  if (profile.interests?.length) parts.push('Interests: ' + profile.interests.join(', '));
  if (profile.facts?.length) {
    const facts = profile.facts.slice(0, 10).map(function(f) { return typeof f === 'string' ? f : f.text || JSON.stringify(f); });
    parts.push('Known facts: ' + facts.join('; '));
  }
  if (profile.settings?.length) {
    const prefs = profile.settings.slice(0, 8).map(function(s) { return s.key + ': ' + (typeof s.value === 'string' ? s.value : JSON.stringify(s.value)); });
    parts.push('Preferences: ' + prefs.join(', '));
  }
  if (parts.length === 0) return "";
  return `## User Profile\n${parts.join("\n")}`;
}

export function learnUserInteraction(text, pageTitle) {
  const signals = [];
  if (/^[A-Z]/.test(text) && text.length > 20) signals.push("formal");
  if (/[!?]{2,}/.test(text)) signals.push("expressive");
  if (/\p{Emoji}/u.test(text)) signals.push("emoji_user");
  if (/^[a-z]/.test(text)) signals.push("casual");
  if (/^#{1,3}\s/.test(text)) signals.push("uses_headings");
  if (/- \[\s?[x ]?\]/.test(text)) signals.push("uses_todos");
  if (text.length < 30) signals.push("concise");
  if (text.length > 200) signals.push("detailed");

  const existing = loadProfile();
  const styleSignals = existing?.styleSignals || [];
  styleSignals.push({ signals, pageTitle, timestamp: Date.now() });
  const recent = styleSignals.slice(-50);

  const dominant = {};
  for (const s of recent) {
    for (const sig of s.signals) {
      dominant[sig] = (dominant[sig] || 0) + 1;
    }
  }
  const sorted = Object.entries(dominant).sort((a, b) => b[1] - a[1]);
  const topSignals = sorted.slice(0, 3).map(s => s[0]);

  const styleMap = {
    formal: "formal and structured",
    casual: "casual and conversational",
    expressive: "expressive with emphasis",
    emoji_user: "uses emojis for visual appeal",
    uses_headings: "organized with headings",
    uses_todos: "task-oriented with checklists",
    concise: "concise and direct",
    detailed: "detailed and thorough"
  };

  const inferredStyle = topSignals.map(s => styleMap[s]).filter(Boolean).join(", ");
  if (inferredStyle) {
    mergeProfile({ writingStyle: inferredStyle, styleSignals: recent });
  }
}

export async function saveUserPreference(key, value) {
  await setMemory(`pref:${key}`, value, { category: "preference", importance: 0.9, ttlHours: null });
}

export async function saveUserFact(fact) {
  const key = `fact:${fact.toLowerCase().slice(0, 40).replace(/\s+/g, '_')}`;
  await setMemory(key, { text: fact }, { category: "fact", importance: 0.7 });
}

export { buildMemoryContext };
