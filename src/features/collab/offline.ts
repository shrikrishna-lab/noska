import { supabase } from '../../lib/supabase';
import type { Block } from '../../../types/blocks';

interface PendingMutation {
  id: string;
  pageId: string;
  userId: string;
  type: 'block_update' | 'block_insert' | 'block_delete' | 'block_move' | 'page_update';
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

interface ConflictResolution {
  local: PendingMutation;
  remote: Record<string, unknown>;
  resolution: 'local_wins' | 'remote_wins' | 'merged';
  merged?: Record<string, unknown>;
}

const QUEUE_KEY = 'noska_offline_queue';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

class OfflineManager {
  private queue: PendingMutation[] = [];
  private isOnline = navigator.onLine;
  private isSyncing = false;
  private listeners: Set<(online: boolean) => void> = new Set();
  private syncListeners: Set<(count: number) => void> = new Set();
  private conflictLog: ConflictResolution[] = [];

  constructor() {
    this.loadQueue();
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private loadQueue(): void {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      this.queue = raw ? JSON.parse(raw) : [];
    } catch {
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch { /* quota exceeded — silently drop oldest */ }
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.listeners.forEach(cb => cb(true));
    this.syncQueue();
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.listeners.forEach(cb => cb(false));
  }

  onStatusChange(cb: (online: boolean) => void): () => void {
    this.listeners.add(cb);
    cb(this.isOnline);
    return () => this.listeners.delete(cb);
  }

  onSyncCountChange(cb: (count: number) => void): () => void {
    this.syncListeners.add(cb);
    cb(this.queue.length);
    return () => this.syncListeners.delete(cb);
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  isOffline(): boolean {
    return !this.isOnline;
  }

  enqueue(mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'retryCount'>): void {
    const entry: PendingMutation = {
      ...mutation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };
    this.queue.push(entry);
    this.saveQueue();
    this.syncListeners.forEach(cb => cb(this.queue.length));

    if (this.isOnline) {
      this.syncQueue();
    }
  }

  async syncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.queue.length === 0) return;
    this.isSyncing = true;

    const toProcess = [...this.queue];
    const remaining: PendingMutation[] = [];

    for (const mutation of toProcess) {
      try {
        await this.applyMutation(mutation);
        this.syncListeners.forEach(cb => cb(remaining.length));
      } catch (err) {
        mutation.retryCount++;
        if (mutation.retryCount < MAX_RETRIES) {
          remaining.push(mutation);
          setTimeout(() => this.syncQueue(), RETRY_DELAY_MS * mutation.retryCount);
        } else {
          console.warn('OfflineManager: dropping mutation after max retries', mutation);
        }
      }
    }

    this.queue = remaining;
    this.saveQueue();
    this.syncListeners.forEach(cb => cb(this.queue.length));
    this.isSyncing = false;
  }

  private async applyMutation(mutation: PendingMutation): Promise<void> {
    switch (mutation.type) {
      case 'block_update': {
        const { pageId, blockId, data } = mutation.payload as { pageId: string; blockId: string; data: Record<string, unknown> };
        await supabase.rpc('update_block_in_page' as any, {
          p_page_id: pageId,
          p_block_id: blockId,
          p_updates: data,
        } as any);
        break;
      }
      case 'block_insert': {
        const { pageId, block, index } = mutation.payload as { pageId: string; block: Block; index?: number };
        await supabase.rpc('insert_block_in_page' as any, {
          p_page_id: pageId,
          p_block: block,
          p_index: index ?? -1,
        } as any);
        break;
      }
      case 'block_delete': {
        const { pageId, blockId } = mutation.payload as { pageId: string; blockId: string };
        await supabase.rpc('delete_block_in_page' as any, {
          p_page_id: pageId,
          p_block_id: blockId,
        } as any);
        break;
      }
      case 'block_move': {
        const { pageId, blockId, newIndex } = mutation.payload as { pageId: string; blockId: string; newIndex: number };
        await supabase.rpc('move_block_in_page' as any, {
          p_page_id: pageId,
          p_block_id: blockId,
          p_new_index: newIndex,
        } as any);
        break;
      }
      case 'page_update': {
        const { pageId, updates } = mutation.payload as { pageId: string; updates: Record<string, unknown> };
        await supabase.from('pages').update(updates as any).eq('id', pageId);
        break;
      }
    }
  }

  getConflictLog(): ConflictResolution[] {
    return [...this.conflictLog];
  }

  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    this.syncListeners.forEach(cb => cb(0));
  }
}

export const offlineManager = new OfflineManager();

// ─── Block Locking ──────────────────────────────────────────

interface BlockLock {
  id: string;
  page_id: string;
  block_id: string;
  user_id: string;
  user_name: string;
  user_color: string;
  acquired_at: string;
  expires_at: string;
}

const LOCK_TTL_MS = 30_000;
let lockInterval: ReturnType<typeof setInterval> | null = null;

export async function acquireBlockLock(pageId: string, blockId: string, userId: string, userName: string, userColor: string): Promise<BlockLock | null> {
  const expiresAt = new Date(Date.now() + LOCK_TTL_MS).toISOString();

  const { data: existing } = await supabase
    .from('block_locks')
    .select('*')
    .eq('page_id', pageId)
    .eq('block_id', blockId)
    .neq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (existing) return null;

  await supabase
    .from('block_locks')
    .delete()
    .eq('page_id', pageId)
    .eq('block_id', blockId)
    .eq('user_id', userId);

  const { data, error } = await supabase
    .from('block_locks')
    .insert({
      page_id: pageId,
      block_id: blockId,
      user_id: userId,
      user_name: userName,
      user_color: userColor,
      acquired_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) return null;
  return data as unknown as BlockLock;
}

export async function releaseBlockLock(pageId: string, blockId: string, userId: string): Promise<void> {
  await supabase
    .from('block_locks')
    .delete()
    .eq('page_id', pageId)
    .eq('block_id', blockId)
    .eq('user_id', userId);
}

export async function refreshBlockLock(pageId: string, blockId: string, userId: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + LOCK_TTL_MS).toISOString();
  const { error } = await supabase
    .from('block_locks')
    .update({ expires_at: expiresAt })
    .eq('page_id', pageId)
    .eq('block_id', blockId)
    .eq('user_id', userId);

  return !error;
}

export async function getBlockLocks(pageId: string): Promise<BlockLock[]> {
  const { data, error } = await supabase
    .from('block_locks')
    .select('*')
    .eq('page_id', pageId)
    .gt('expires_at', new Date().toISOString());

  if (error || !data) return [];
  return data as unknown as BlockLock[];
}

export async function isBlockLocked(pageId: string, blockId: string, excludeUserId?: string): Promise<BlockLock | null> {
  let query = supabase
    .from('block_locks')
    .select('*')
    .eq('page_id', pageId)
    .eq('block_id', blockId)
    .gt('expires_at', new Date().toISOString());

  if (excludeUserId) {
    query = query.neq('user_id', excludeUserId);
  }

  const { data, error } = await query.single();
  if (error || !data) return null;
  return data as unknown as BlockLock;
}

export function startLockRefresh(pageId: string, blockId: string, userId: string): void {
  stopLockRefresh();
  lockInterval = setInterval(() => {
    refreshBlockLock(pageId, blockId, userId);
  }, LOCK_TTL_MS / 3);
}

export function stopLockRefresh(): void {
  if (lockInterval) {
    clearInterval(lockInterval);
    lockInterval = null;
  }
}

// ─── Conflict Resolution ──────────────────────────────────────

interface BlockVersion {
  id: string;
  version: number;
  data: Block;
  userId: string;
  timestamp: number;
}

const blockVersions = new Map<string, BlockVersion[]>();

export function recordBlockVersion(pageId: string, block: Block, userId: string): void {
  const key = `${pageId}:${block.id}`;
  const versions = blockVersions.get(key) || [];
  const maxVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version)) : 0;

  versions.push({
    id: block.id,
    version: maxVersion + 1,
    data: { ...block },
    userId,
    timestamp: Date.now(),
  });

  if (versions.length > 20) versions.splice(0, versions.length - 20);
  blockVersions.set(key, versions);
}

export function detectConflict(pageId: string, blockId: string, incomingVersion: number, incomingUserId: string): boolean {
  const key = `${pageId}:${blockId}`;
  const versions = blockVersions.get(key) || [];
  const latest = versions[versions.length - 1];

  if (!latest) return false;
  if (latest.userId === incomingUserId) return false;
  if (incomingVersion <= latest.version) return true;

  return false;
}

export function resolveConflict(
  local: Block,
  remote: Block,
  strategy: 'local' | 'remote' | 'merge' = 'local'
): Block {
  if (strategy === 'local') return local;
  if (strategy === 'remote') return remote;

  return {
    ...remote,
    text: local.text || remote.text,
    properties: { ...remote.properties, ...local.properties },
    lastEditedTime: new Date().toISOString(),
  };
}

export function getBlockVersionHistory(pageId: string, blockId: string): BlockVersion[] {
  const key = `${pageId}:${blockId}`;
  return blockVersions.get(key) || [];
}
