import { fetchAIMemory, saveAIMemory, saveAIMemoryEntry, deleteAIMemory } from '../lib/supabaseService';

// A memory entry always carries the bookkeeping fields set in
// setMemory/setMemoryBatch below (_category/_importance/_updated), plus
// whatever value shape the caller originally passed in (text/content, or
// arbitrary other fields — see setMemoryBatch/setMemory's object spread).
export interface MemoryEntry {
  _category?: string;
  _importance?: number;
  _updated?: number;
  text?: string;
  content?: string;
  [key: string]: unknown;
}

export type MemoryCache = Record<string, MemoryEntry>;

interface SetMemoryOptions {
  category?: string;
  importance?: number;
  ttlHours?: number | null;
}

interface MemoryBatchEntry {
  key: string;
  value: unknown;
  category?: string;
  importance?: number;
  ttlHours?: number | null;
}

const STORAGE_KEY = "noska_ai_memory";
let cache: MemoryCache | null = null;
let loadPromise: Promise<MemoryCache> | null = null;

function getDefaultMemory(): MemoryCache {
  return {};
}

async function loadFromStorage(): Promise<MemoryCache> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { console.warn("memory: failed to load from localStorage"); }
  return getDefaultMemory();
}

function saveToStorage(data: MemoryCache) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { console.warn("memory: failed to save to localStorage"); }
}

export async function initializeMemory(): Promise<MemoryCache> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Try loading from Supabase first, fall back to localStorage
    let data: MemoryCache | null = null;
    try {
      data = (await fetchAIMemory()) as MemoryCache;
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

export function getMemory(): MemoryCache {
  return cache || getDefaultMemory();
}

export function getMemoryValue(key: string): MemoryEntry | null {
  return cache?.[key] ?? null;
}

export function getMemoryByCategory(category: string) {
  if (!cache) return [];
  const results: { key: string; value: MemoryEntry }[] = [];
  for (const [key, value] of Object.entries(cache)) {
    if (value._category === category || key.startsWith(category + ':')) {
      results.push({ key, value });
    }
  }
  return results;
}

export async function setMemory(key: string, value: unknown, options: SetMemoryOptions = {}) {
  const { category = "general", importance = 0.5, ttlHours = null } = options;

  if (!cache) cache = {};
  const entry: MemoryEntry = {
    ...(typeof value === "object" && value !== null ? value : { text: value }),
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

export async function setMemoryBatch(entries: MemoryBatchEntry[]) {
  if (!cache) cache = {};
  const dbEntries: { key: string; value: unknown; category: string; importance: number; ttlHours?: number | null }[] = [];
  for (const { key, value, category, importance, ttlHours } of entries) {
    const entry: MemoryEntry = {
      ...(typeof value === "object" && value !== null ? value : { text: value }),
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

export async function forgetMemory(key: string) {
  if (cache) delete cache[key];
  saveToStorage(cache || {});
  try {
    await deleteAIMemory(key);
  } catch (e) { console.warn("memory: forget failed", e); }
}

export async function clearMemory() {
  // FIX: Save all keys BEFORE clearing cache — the old code set cache={}
  // then iterated Object.keys(cache) which was already empty, so Supabase
  // records were never actually deleted.
  const keysToDelete = Object.keys(cache || {});
  cache = {};
  saveToStorage({});
  try {
    for (const key of keysToDelete) {
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

  const sections: string[] = [];
  for (const [key, value] of entries) {
    const text = value.text || value.content || JSON.stringify(value);
    if (text && text.length < 500) {
      sections.push(`- ${key}: ${text}`);
    }
  }

  if (sections.length === 0) return "";
  return `## AI Memory\n${sections.join("\n")}`;
}

export async function saveUserFact(fact: string) {
  const key = `fact:${fact.toLowerCase().slice(0, 40).replace(/\s+/g, '_')}`;
  await setMemory(key, { text: fact }, { category: "fact", importance: 0.7 });
}

export async function saveUserPreference(key: string, value: unknown) {
  await setMemory(`pref:${key}`, value, { category: "preference", importance: 0.9, ttlHours: null });
}

export async function getPreference(key: string) {
  const val = getMemoryValue(`pref:${key}`);
  return val?.text ?? val ?? null;
}
