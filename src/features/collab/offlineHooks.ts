import { useState, useCallback, useEffect } from 'react';
import { offlineManager, acquireBlockLock, releaseBlockLock, startLockRefresh, stopLockRefresh, detectConflict, resolveConflict, recordBlockVersion, isBlockLocked } from './offline';
import type { Block } from '../../../types/blocks';

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(offlineManager.getPendingCount());

  useEffect(() => {
    const unsubStatus = offlineManager.onStatusChange(setIsOnline);
    const unsubSync = offlineManager.onSyncCountChange(setPendingCount);
    return () => { unsubStatus(); unsubSync(); };
  }, []);

  return { isOnline, pendingCount, isSyncing: pendingCount > 0 };
}

export function useBlockLock(pageId: string | null, blockId: string | null, userId: string | null, userName: string, userColor: string) {
  const [locked, setLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [myLock, setMyLock] = useState(false);

  useEffect(() => {
    if (!pageId || !blockId || !userId) return;

    let mounted = true;

    const check = async () => {
      const lock = await isBlockLocked(pageId, blockId, userId);
      if (!mounted) return;

      if (lock) {
        setLocked(true);
        setLockedBy(lock.user_name);
      } else {
        setLocked(false);
        setLockedBy(null);
      }
    };

    check();
    const interval = setInterval(check, 5_000);

    return () => { mounted = false; clearInterval(interval); };
  }, [pageId, blockId, userId]);

  const acquire = useCallback(async () => {
    if (!pageId || !blockId || !userId) return false;
    const lock = await acquireBlockLock(pageId, blockId, userId, userName, userColor);
    if (lock) {
      setMyLock(true);
      setLocked(true);
      setLockedBy(userName);
      startLockRefresh(pageId, blockId, userId);
      return true;
    }
    return false;
  }, [pageId, blockId, userId, userName, userColor]);

  const release = useCallback(async () => {
    if (!pageId || !blockId || !userId) return;
    await releaseBlockLock(pageId, blockId, userId);
    setMyLock(false);
    setLocked(false);
    setLockedBy(null);
    stopLockRefresh();
  }, [pageId, blockId, userId]);

  return { locked, lockedBy, myLock, acquire, release };
}

export function useConflictResolver(pageId: string | null, userId: string | null) {
  const resolve = useCallback((
    local: Block,
    remote: Block,
    strategy: 'local' | 'remote' | 'merge' = 'local'
  ): Block => {
    if (!pageId || !userId) return local;

    const hasConflict = detectConflict(pageId, local.id, 0, userId);
    if (hasConflict) {
      return resolveConflict(local, remote, strategy);
    }

    return local;
  }, [pageId, userId]);

  const recordVersion = useCallback((block: Block) => {
    if (!pageId || !userId) return;
    recordBlockVersion(pageId, block, userId);
  }, [pageId, userId]);

  return { resolve, recordVersion };
}

export function useOfflineQueue() {
  const [count, setCount] = useState(offlineManager.getPendingCount());

  useEffect(() => {
    return offlineManager.onSyncCountChange(setCount);
  }, []);

  const enqueue = useCallback((mutation: Parameters<typeof offlineManager.enqueue>[0]) => {
    offlineManager.enqueue(mutation);
  }, []);

  const flush = useCallback(() => {
    offlineManager.syncQueue();
  }, []);

  const clear = useCallback(() => {
    offlineManager.clearQueue();
  }, []);

  return { count, enqueue, flush, clear, hasPending: count > 0 };
}
