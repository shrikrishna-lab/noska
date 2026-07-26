const pending = new Map<string, AbortController>();

export function fetchWithDedup(key: string, fetcher: (signal: AbortSignal) => Promise<unknown>, options?: { dedupMs?: number }): Promise<unknown> {
  const existing = pending.get(key);
  if (existing) {
    existing.abort();
    pending.delete(key);
  }

  const controller = new AbortController();
  pending.set(key, controller);

  const dedupMs = options?.dedupMs ?? 300;

  const timeout = setTimeout(() => {
    if (pending.get(key) === controller) pending.delete(key);
  }, dedupMs);

  return fetcher(controller.signal).finally(() => {
    clearTimeout(timeout);
    if (pending.get(key) === controller) pending.delete(key);
  });
}

export function abortKey(key: string) {
  const controller = pending.get(key);
  if (controller) {
    controller.abort();
    pending.delete(key);
  }
}

export function abortAll() {
  pending.forEach((c) => c.abort());
  pending.clear();
}
