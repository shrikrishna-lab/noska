import type { NotificationBroadcast, NotificationCursor, NotificationMark, NotificationRecord } from './types';
import { isArchived, isUnread, validRecord } from './types';

export interface NotificationTransport {
  list(userId: string, cursor: NotificationCursor | null): Promise<NotificationRecord[]>;
  count(): Promise<number>;
  mark(change: NotificationMark): Promise<void>;
  subscribe(userId: string, receive: (event: NotificationBroadcast) => void, status: (online: boolean) => void): () => void;
}
export interface NotificationSnapshot {
  userId: string | null;
  notifications: NotificationRecord[];
  unreadCount: number;
  countReady: boolean;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  pending: boolean;
  connected: boolean;
  error: string | null;
}
const empty = (): NotificationSnapshot => ({ userId: null, notifications: [], unreadCount: 0, countReady: false, loading: false, loadingMore: false, hasMore: true, pending: false, connected: false, error: null });
export function mergeNotifications(current: NotificationRecord[], incoming: NotificationRecord[]) {
  const byId = new Map(current.map(n => [n.id, n]));
  for (const row of incoming) {
    const previous = byId.get(row.id);
    if (!previous || Date.parse(row.updated_at || row.created_at) >= Date.parse(previous.updated_at || previous.created_at)) byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
}
export class NotificationStore {
  private state = empty();
  private listeners = new Set<() => void>();
  private deliveryListeners = new Set<(row: NotificationRecord) => void>();
  private generation = 0;
  private revision = 0;
  private cursor: NotificationCursor | null = null;
  private stopChannel?: () => void;
  private refreshPromise?: Promise<void>;
  private countPromise?: Promise<void>;
  private countQueued = false;
  private seen = new Set<string>();
  private tombstones = new Set<string>();
  constructor(private transport: NotificationTransport, private pageSize = 40) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  onDelivery = (listener: (row: NotificationRecord) => void) => { this.deliveryListeners.add(listener); return () => { this.deliveryListeners.delete(listener); }; };
  private update(patch: Partial<NotificationSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  setUser(userId: string | null) {
    if (userId === this.state.userId) return;
    this.generation++;
    this.stopChannel?.();
    this.stopChannel = undefined;
    this.cursor = null;
    this.refreshPromise = undefined;
    this.countPromise = undefined;
    this.countQueued = false;
    this.seen.clear();
    this.tombstones.clear();
    this.state = empty();
    this.update({ userId, loading: Boolean(userId) });
    if (!userId) return;
    const generation = this.generation;
    this.stopChannel = this.transport.subscribe(userId, event => {
      if (generation === this.generation) this.receive(event);
    }, connected => {
      if (generation !== this.generation) return;
      this.update({ connected });
      if (connected) void this.refresh();
    });
    void this.refresh();
  }
  private receive(event: NotificationBroadcast) {
    const userId = this.state.userId;
    if (!userId || !['INSERT', 'UPDATE', 'DELETE'].includes(event.operation)) return;
    if (event.operation === 'DELETE') {
      if (event.old_record?.user_id !== userId || !event.old_record.id) return;
      this.tombstones.add(event.old_record.id);
      this.update({ notifications: this.state.notifications.filter(n => n.id !== event.old_record.id) });
    } else {
      if (!validRecord(event.record, userId)) return;
      const row = event.record;
      this.tombstones.delete(row.id);
      const fresh = event.operation === 'INSERT' && !this.seen.has(row.id);
      this.seen.add(row.id);
      this.update({ notifications: mergeNotifications(this.state.notifications, [row]) });
      if (fresh && isUnread(row)) this.deliveryListeners.forEach(listener => listener(row));
    }
    this.revision++;
    void this.refreshCount();
  }
  refreshCount = (): Promise<void> => {
    if (!this.state.userId) return Promise.resolve();
    this.countQueued = true;
    if (this.countPromise) return this.countPromise;
    const generation = this.generation;
    const work = (async () => {
      while (this.countQueued && generation === this.generation) {
        this.countQueued = false;
        const revision = this.revision;
        try {
          const count = await this.transport.count();
          if (generation !== this.generation) return;
          if (revision !== this.revision || this.state.pending) { this.countQueued = !this.state.pending; continue; }
          this.update({ unreadCount: count, countReady: true });
        } catch {
          if (generation === this.generation) this.update({ error: 'Unable to sync unread count. Retry when connected.' });
        }
      }
    })();
    this.countPromise = work;
    void work.finally(() => { if (this.countPromise === work) this.countPromise = undefined; });
    return work;
  };
  refresh = (): Promise<void> => {
    if (!this.state.userId) return Promise.resolve();
    if (this.refreshPromise) return this.refreshPromise;
    const generation = this.generation;
    const userId = this.state.userId;
    const revision = this.revision;
    this.update({ loading: this.state.notifications.length === 0, error: null });
    const work = (async () => {
      try {
        const rows = await this.transport.list(userId, null);
        if (generation !== this.generation) return;
        const valid = rows.filter(row => validRecord(row, userId) && !this.tombstones.has(row.id));
        valid.forEach(row => this.seen.add(row.id));
        const incoming = revision === this.revision && !this.state.pending ? valid : valid.filter(row => !this.state.notifications.some(n => n.id === row.id));
        this.update({ notifications: mergeNotifications(this.state.notifications, incoming) });
        if (!this.cursor) {
          const last = rows.at(-1);
          this.cursor = last ? { created_at: last.created_at, id: last.id } : null;
          this.update({ hasMore: rows.length === this.pageSize });
        }
        await this.refreshCount();
      } catch {
        if (generation === this.generation) this.update({ error: 'Unable to load notifications. Your changes have not been lost.' });
      } finally {
        if (generation === this.generation) this.update({ loading: false });
      }
    })();
    this.refreshPromise = work;
    void work.finally(() => { if (this.refreshPromise === work) this.refreshPromise = undefined; });
    return work;
  };
  loadMore = async () => {
    if (!this.state.userId || this.state.loading || this.state.loadingMore || !this.state.hasMore) return;
    const generation = this.generation;
    const userId = this.state.userId;
    const revision = this.revision;
    this.update({ loadingMore: true, error: null });
    try {
      const rows = await this.transport.list(userId, this.cursor);
      if (generation !== this.generation) return;
      const valid = rows.filter(row => validRecord(row, userId) && !this.tombstones.has(row.id));
      valid.forEach(row => this.seen.add(row.id));
      const incoming = revision === this.revision && !this.state.pending ? valid : valid.filter(row => !this.state.notifications.some(n => n.id === row.id));
      this.update({ notifications: mergeNotifications(this.state.notifications, incoming), hasMore: rows.length === this.pageSize });
      const last = rows.at(-1);
      if (last) this.cursor = { created_at: last.created_at, id: last.id };
    } catch {
      if (generation === this.generation) this.update({ error: 'Unable to load older notifications. Please retry.' });
    } finally {
      if (generation === this.generation) this.update({ loadingMore: false });
    }
  };
  mark = async (change: NotificationMark): Promise<boolean> => {
    if (!this.state.userId || this.state.pending || (!change.all && !change.ids?.length)) return false;
    const generation = this.generation;
    this.revision++;
    const previous = this.state;
    const affected = new Map<string, { before: NotificationRecord; after: NotificationRecord }>();
    const now = new Date().toISOString();
    const notifications = previous.notifications.map(before => {
      if (!change.all && !change.ids?.includes(before.id)) return before;
      const read_at = change.read === undefined ? before.read_at : change.read ? now : null;
      const archived_at = change.archived === undefined ? before.archived_at : change.archived ? now : null;
      const after: NotificationRecord = { ...before, read_at, archived_at, status: archived_at ? 'archived' : read_at ? 'read' : 'unread' };
      affected.set(before.id, { before, after });
      return after;
    });
    let count = previous.unreadCount;
    affected.forEach(({ before, after }) => { count += Number(isUnread(after)) - Number(isUnread(before)); });
    if (change.all && (change.read === true || change.archived === true)) count = 0;
    this.update({ notifications, unreadCount: Math.max(0, count), pending: true, error: null });
    let ok = false;
    try {
      await this.transport.mark(change);
      ok = true;
    } catch {
      if (generation === this.generation) this.update({
        notifications: this.state.notifications.map(row => {
          const pair = affected.get(row.id);
          return pair && row === pair.after ? pair.before : row;
        }),
        unreadCount: previous.unreadCount,
        error: 'Change could not be saved. Previous state restored. Please retry.',
      });
    } finally {
      if (generation === this.generation) {
        this.revision++;
        this.update({ pending: false });
        await this.refreshCount();
      }
    }
    return ok && generation === this.generation;
  };
  markRead = (id: string) => this.mark({ ids: [id], read: true });
  markAllRead = () => this.mark({ all: true, read: true });
  dismiss = (id: string) => this.mark({ ids: [id], archived: true });
  clearAll = () => this.mark({ all: true, archived: true });
}
