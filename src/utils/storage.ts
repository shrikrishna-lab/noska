import { savePages, saveAIChats } from "../lib/supabaseService";
import { EgressMonitor } from "../lib/egressMonitor";

// Baseline sync state maps to track exact content signatures
const syncedPagesMap = new Map<string, string>();
const dirtyPagesMap = new Map<string, any>();
let isSavingPages = false;
let pageSyncTimer: ReturnType<typeof setTimeout> | null = null;
let pageRetryCount = 0;

const syncedChatsMap = new Map<string, string>();
const dirtyChatsMap = new Map<string, any>();
let isSavingChats = false;
let chatSyncTimer: ReturnType<typeof setTimeout> | null = null;
let chatRetryCount = 0;

function getUserId(): string | null {
  try {
    return localStorage.getItem("noska_user_id");
  } catch {
    return null;
  }
}

/**
 * Initialize baseline for pages/chats so remote-loaded data on startup
 * is not immediately marked dirty.
 */
export function initStorageSyncBaseline(pages?: any[], chats?: any[]) {
  if (Array.isArray(pages)) {
    for (const p of pages) {
      if (p?.id) {
        syncedPagesMap.set(p.id, JSON.stringify(p));
        dirtyPagesMap.delete(p.id);
      }
    }
  }
  if (Array.isArray(chats)) {
    for (const c of chats) {
      if (c?.id) {
        syncedChatsMap.set(c.id, JSON.stringify(c));
        dirtyChatsMap.delete(c.id);
      }
    }
  }
}

async function performPagesSync(userId: string) {
  if (isSavingPages || dirtyPagesMap.size === 0) return;

  const batch = Array.from(dirtyPagesMap.values());
  const batchSignatures = new Map<string, string>();
  for (const p of batch) {
    batchSignatures.set(p.id, JSON.stringify(p));
  }

  isSavingPages = true;
  EgressMonitor.logEvent("dirty_sync", "pages", { count: batch.length, pageIds: batch.map((p) => p.id) });

  try {
    await savePages(batch, userId);

    // Mark saved pages clean if not modified during in-flight save
    for (const p of batch) {
      const currentDirty = dirtyPagesMap.get(p.id);
      if (currentDirty && JSON.stringify(currentDirty) === batchSignatures.get(p.id)) {
        dirtyPagesMap.delete(p.id);
        syncedPagesMap.set(p.id, batchSignatures.get(p.id)!);
      }
    }
    pageRetryCount = 0;
  } catch (err) {
    console.warn("[storage] Supabase pages save failed, will retry:", err);
    pageRetryCount = Math.min(pageRetryCount + 1, 5);
    const backoff = Math.min(1000 * Math.pow(2, pageRetryCount), 10000);
    if (pageSyncTimer) clearTimeout(pageSyncTimer);
    pageSyncTimer = setTimeout(() => {
      void performPagesSync(userId);
    }, backoff);
  } finally {
    isSavingPages = false;
    // If more edits occurred during save, trigger next batch
    if (dirtyPagesMap.size > 0 && !pageSyncTimer) {
      schedulePagesSync(userId, 400);
    }
  }
}

function schedulePagesSync(userId: string, delay = 800) {
  if (pageSyncTimer) clearTimeout(pageSyncTimer);
  pageSyncTimer = setTimeout(() => {
    pageSyncTimer = null;
    void performPagesSync(userId);
  }, delay);
}

async function performChatsSync(userId: string) {
  if (isSavingChats || dirtyChatsMap.size === 0) return;

  const batch = Array.from(dirtyChatsMap.values());
  const batchSignatures = new Map<string, string>();
  for (const c of batch) {
    batchSignatures.set(c.id, JSON.stringify(c));
  }

  isSavingChats = true;
  EgressMonitor.logEvent("dirty_sync", "ai_chats", { count: batch.length, chatIds: batch.map((c) => c.id) });

  try {
    await saveAIChats(batch, userId);

    for (const c of batch) {
      const currentDirty = dirtyChatsMap.get(c.id);
      if (currentDirty && JSON.stringify(currentDirty) === batchSignatures.get(c.id)) {
        dirtyChatsMap.delete(c.id);
        syncedChatsMap.set(c.id, batchSignatures.get(c.id)!);
      }
    }
    chatRetryCount = 0;
  } catch (err) {
    console.warn("[storage] Supabase chats save failed, will retry:", err);
    chatRetryCount = Math.min(chatRetryCount + 1, 5);
    const backoff = Math.min(1000 * Math.pow(2, chatRetryCount), 10000);
    if (chatSyncTimer) clearTimeout(chatSyncTimer);
    chatSyncTimer = setTimeout(() => {
      void performChatsSync(userId);
    }, backoff);
  } finally {
    isSavingChats = false;
    if (dirtyChatsMap.size > 0 && !chatSyncTimer) {
      scheduleChatsSync(userId, 400);
    }
  }
}

function scheduleChatsSync(userId: string, delay = 800) {
  if (chatSyncTimer) clearTimeout(chatSyncTimer);
  chatSyncTimer = setTimeout(() => {
    chatSyncTimer = null;
    void performChatsSync(userId);
  }, delay);
}

export async function flushStorageSync() {
  if (pageSyncTimer) {
    clearTimeout(pageSyncTimer);
    pageSyncTimer = null;
  }
  if (chatSyncTimer) {
    clearTimeout(chatSyncTimer);
    chatSyncTimer = null;
  }

  const userId = getUserId();
  if (!userId) return;

  const promises: Promise<void>[] = [];
  if (dirtyPagesMap.size > 0) {
    promises.push(performPagesSync(userId));
  }
  if (dirtyChatsMap.size > 0) {
    promises.push(performChatsSync(userId));
  }

  await Promise.allSettled(promises);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    void flushStorageSync();
  });
}

export function storageApi() {
  const fallback = {
    async get(key: string) {
      return { value: localStorage.getItem(key) };
    },
    async set(key: string, value: string) {
      localStorage.setItem(key, value);

      const userId = getUserId();
      if (!userId) return { ok: true };

      if (key === "pages") {
        try {
          const pages = JSON.parse(value);
          if (Array.isArray(pages)) {
            let hasDirty = false;
            for (const p of pages) {
              if (!p?.id) continue;
              const sig = JSON.stringify(p);
              if (syncedPagesMap.get(p.id) !== sig) {
                dirtyPagesMap.set(p.id, p);
                hasDirty = true;
              }
            }
            if (hasDirty) {
              schedulePagesSync(userId);
            }
          }
        } catch (e) {
          console.warn("storage: failed to parse and sync dirty pages", e);
        }
      }

      if (key === "aiChats") {
        // AI chats are stored 100% locally on device / browser cache (instant, offline-first, private)
        try {
          localStorage.setItem("noska_ai_chats", value);
        } catch {}
      }

      return { ok: true };
    },
  };
  return (window as unknown as { storage?: typeof fallback }).storage || fallback;
}
