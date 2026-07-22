import { savePages, saveAIChats, saveSetting } from "../lib/supabaseService";

let syncQueue = [];
let syncTimer = null;

function scheduleSync(fn) {
  syncQueue.push(fn);
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    const batch = syncQueue.slice();
    syncQueue = [];
    syncTimer = null;
    for (const job of batch) {
      try { await job(); } catch (e) { console.warn("Supabase sync failed:", e); }
    }
  }, 800);
}

async function flushSync() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  const batch = syncQueue.slice();
  syncQueue = [];
  for (const job of batch) {
    try { await job(); } catch (e) { console.warn("Supabase sync failed:", e); }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => { flushSync(); });
}

function getUserId(): string | null {
  try { return localStorage.getItem("noska_user_id"); } catch { return null; }
}

export function storageApi() {
  const fallback = {
    async get(key) {
      return { value: localStorage.getItem(key) };
    },
    async set(key, value) {
      localStorage.setItem(key, value);

      const userId = getUserId();
      if (!userId) return { ok: true };

      if (key === "pages") {
        try {
          const pages = JSON.parse(value);
          scheduleSync(() => savePages(pages, userId));
        } catch (e) { console.warn("storage: failed to sync pages", e); }
      }

      if (key === "aiChats") {
        try {
          const chats = JSON.parse(value);
          scheduleSync(() => saveAIChats(chats, userId));
        } catch (e) { console.warn("storage: failed to sync chats", e); }
      }

      if (key === "workspaceName") {
        try {
          const name = JSON.parse(value);
          scheduleSync(() => saveSetting("workspaceName", name));
        } catch (e) { console.warn("storage: failed to sync workspaceName", e); }
      }

      if (key === "theme") {
        try {
          const theme = JSON.parse(value);
          scheduleSync(() => saveSetting("theme", theme));
        } catch (e) { console.warn("storage: failed to sync theme", e); }
      }

      return { ok: true };
    }
  };
  return (window as unknown as { storage?: typeof fallback }).storage || fallback;
}
