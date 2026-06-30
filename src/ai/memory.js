import { fetchAIMemory, saveAIMemory, saveAIMemoryEntry, deleteAIMemory } from '../lib/supabaseService';

const STORAGE_KEY = "noska_ai_memory";
let cache = null;
let loadPromise = null;

function getDefaultMemory() {
  return {};
}

async function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { console.warn("memory: failed to load from localStorage"); }
  return getDefaultMemory();
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { console.warn("memory: failed to save to localStorage"); }
}

export async function initializeMemory() {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Try loading from Supabase first, fall back to localStorage
    let data = null;
    try {
      data = await fetchAIMemory();
    } catch {
      // Supabase not available, fall through to localStorage
    }

    if (!data || Object.keys(data).length === 0) {
      data = await loadFromStorage();
    }

    cache = data;
    return cache;
  })();

  return loadPromise;
}

export function getMemory() {
  return cache || getDefaultMemory();
}

export function getMemoryValue(key) {
  return cache?.[key] ?? null;
}

export function getMemoryByCategory(category) {
  if (!cache) return [];
  const results = [];
  for (const [key, value] of Object.entries(cache)) {
    if (value._category === category || key.startsWith(category + ':')) {
      results.push({ key, value });
    }
  }
  return results;
}

export async function setMemory(key, value, options = {}) {
  const { category = "general", importance = 0.5, ttlHours = null } = options;

  if (!cache) cache = {};
  const entry = {
    ...(typeof value === "object" ? value : { text: value }),
    _category: category,
    _importance: importance,
    _updated: Date.now()
  };
  cache[key] = entry;
  saveToStorage(cache);

  try {
    await saveAIMemoryEntry(key, entry, category, importance, ttlHours);
  } catch (e) { console.warn("memory: save failed", e); }
}

export async function setMemoryBatch(entries) {
  if (!cache) cache = {};
  const dbEntries = [];
  for (const { key, value, category, importance, ttlHours } of entries) {
    const entry = {
      ...(typeof value === "object" ? value : { text: value }),
      _category: category || "general",
      _importance: importance ?? 0.5,
      _updated: Date.now()
    };
    cache[key] = entry;
    dbEntries.push({ key, value: entry, category: category || "general", importance: importance ?? 0.5, ttlHours });
  }
  saveToStorage(cache);
  try {
    await saveAIMemory(dbEntries);
  } catch (e) { console.warn("memory: batch save failed", e); }
}

export async function forgetMemory(key) {
  if (cache) delete cache[key];
  saveToStorage(cache || {});
  try {
    await deleteAIMemory(key);
  } catch (e) { console.warn("memory: forget failed", e); }
}

export async function clearMemory() {
  cache = {};
  saveToStorage({});
  try {
    const allKeys = Object.keys(cache || {});
    for (const key of allKeys) {
      await deleteAIMemory(key);
    }
  } catch (e) { console.warn("memory: clear failed", e); }
}

export function buildMemoryContext(maxEntries = 10) {
  if (!cache || Object.keys(cache).length === 0) return "";

  const entries = Object.entries(cache)
    .filter(([_, val]) => val._category !== "ephemeral")
    .sort((a, b) => (b[1]._importance || 0) - (a[1]._importance || 0))
    .slice(0, maxEntries);

  if (entries.length === 0) return "";

  const sections = [];
  for (const [key, value] of entries) {
    const text = value.text || value.content || JSON.stringify(value);
    if (text && text.length < 500) {
      sections.push(`- ${key}: ${text}`);
    }
  }

  if (sections.length === 0) return "";
  return `## AI Memory\n${sections.join("\n")}`;
}

export async function saveUserFact(fact) {
  const key = `fact:${fact.toLowerCase().slice(0, 40).replace(/\s+/g, '_')}`;
  await setMemory(key, { text: fact }, { category: "fact", importance: 0.7 });
}

export async function saveUserPreference(key, value) {
  await setMemory(`pref:${key}`, value, { category: "preference", importance: 0.9, ttlHours: null });
}

export async function getPreference(key) {
  const val = getMemoryValue(`pref:${key}`);
  return val?.text ?? val ?? null;
}
