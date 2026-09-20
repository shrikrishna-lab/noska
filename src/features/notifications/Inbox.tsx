import React, { useMemo, useState } from 'react';
import { Archive, Bell, CheckCheck, ChevronDown, ChevronRight, RotateCw } from 'lucide-react';
import { useNotificationPlatform } from './Provider';
import { isArchived, isUnread, type NotificationRecord } from './types';
import { requestNotificationOpen } from './navigation';
export function NotificationInbox({ compact = false }: { compact?: boolean }) {
  const platform = useNotificationPlatform();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('date');
  const [oldest, setOldest] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (setter: typeof setSelected, id: string) => setter(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const rows = useMemo(() => platform.notifications.filter(n => {
    if (filter === 'archived' ? !isArchived(n) : isArchived(n)) return false;
    if (filter === 'unread' && !isUnread(n)) return false;
    if (filter === 'mentions' && n.type !== 'mention' && n.category !== 'mention') return false;
    if (filter === 'invites' && n.category !== 'invite') return false;
    if (filter === 'tasks' && n.category !== 'task' && n.entity_type !== 'task') return false;
    if (filter === 'reminders' && n.category !== 'reminder' && n.type !== 'reminder' && n.type !== 'reminder.due') return false;
    if (filter === 'workspace' && !['workspace', 'invite', 'broadcast', 'system'].includes(n.category) && n.entity_type !== 'workspace') return false;
    return `${n.title} ${n.body || n.message || ''}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => (oldest ? 1 : -1) * (a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))), [platform.notifications, filter, search, oldest]);
  const groups = useMemo(() => {
    const result = new Map<string, NotificationRecord[]>();
    rows.forEach(n => {
      const key = groupBy === 'page' ? n.page_id || 'Workspace updates' : groupBy === 'category' ? n.category : new Date(n.created_at).toLocaleDateString(undefined, { dateStyle: 'long' });
      result.set(key, [...(result.get(key) || []), n]);
    });
    return [...result];
  }, [rows, groupBy]);
  const markSelected = async (read?: boolean, archived?: boolean) => {
    const ids = rows.filter(n => selected.has(n.id)).map(n => n.id);
    if (await platform.mark({ ids, read, archived })) setSelected(new Set());
  };
  return <section aria-label="Inbox" className={`text-[var(--text)] ${compact ? 'p-3' : 'mx-auto max-w-4xl p-6 md:p-10'}`}>
    <header className="mb-5 flex items-center justify-between gap-3">
      <div><h1 className="flex items-center gap-2 text-xl font-semibold"><Bell size={21} />Inbox</h1><p className="mt-1 text-xs text-[var(--muted)]" role="status">{platform.countReady ? `${platform.unreadCount} unread` : 'Syncing unread count'}{!platform.connected && ' · Reconnecting'}</p></div>
      <div className="flex gap-2"><button aria-label="Refresh notifications" onClick={() => void platform.refresh()} className="rounded p-2 hover:bg-[var(--hover)]"><RotateCw size={16} /></button><button disabled={platform.pending || !platform.unreadCount} onClick={() => void platform.markAllRead()} className="rounded px-2 text-xs hover:bg-[var(--hover)] disabled:opacity-40"><CheckCheck size={16} className="inline mr-1" />Mark all read</button></div>
    </header>
    <nav aria-label="Notification filters" className="flex flex-wrap gap-1 border-b border-[var(--border)] pb-2">{['all', 'unread', 'mentions', 'invites', 'tasks', 'reminders', 'workspace', 'archived'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setSelected(new Set()); }} className={`rounded px-3 py-1.5 text-xs capitalize ${filter === value ? 'bg-[var(--hover)] font-semibold' : 'text-[var(--muted)]'}`}>{value}</button>)}</nav>
    <div className="my-3 flex flex-wrap gap-2 text-xs"><input aria-label="Search notifications" placeholder="Search loaded notifications…" value={search} onChange={e => setSearch(e.target.value)} className="min-w-32 flex-1 rounded border border-[var(--border)] bg-transparent px-3 py-2" /><select aria-label="Group notifications" value={groupBy} onChange={e => setGroupBy(e.target.value)} className="rounded bg-[var(--surface)] p-2"><option value="date">By date</option><option value="page">By page</option><option value="category">By category</option></select><button onClick={() => setOldest(!oldest)} className="rounded px-2 hover:bg-[var(--hover)]">{oldest ? 'Oldest first' : 'Newest first'}</button></div>
    {rows.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-3 text-xs"><label className="flex gap-2"><input type="checkbox" aria-label="Select loaded notifications" checked={rows.every(n => selected.has(n.id))} onChange={e => setSelected(new Set(e.target.checked ? rows.map(n => n.id) : []))} />Select loaded</label><button disabled={!selected.size || platform.pending} onClick={() => void markSelected(true)} className="disabled:opacity-40">Read</button><button disabled={!selected.size || platform.pending} onClick={() => void markSelected(false)} className="disabled:opacity-40">Unread</button><button disabled={!selected.size || platform.pending} onClick={() => void markSelected(undefined, filter !== 'archived')} className="disabled:opacity-40">{filter === 'archived' ? 'Restore' : 'Archive'}</button></div>}
    {platform.error && <div role="alert" className="my-3 rounded border border-red-500/30 p-3 text-sm">{platform.error} <button className="underline" onClick={() => void platform.refresh()}>Retry</button></div>}
    {platform.loading && <p role="status" className="py-12 text-center text-sm">Loading notifications…</p>}
    {!platform.loading && !platform.error && !rows.length && <div className="py-14 text-center"><Archive className="mx-auto mb-3 text-[var(--muted)]" size={30} /><h2 className="font-medium">{search || filter !== 'all' ? 'No matching notifications' : 'You’re all caught up'}</h2><p className="mt-2 text-sm text-[var(--muted)]">{platform.hasMore ? 'Load older notifications to continue browsing.' : 'New mentions and workspace updates will appear here.'}</p></div>}
    {groups.map(([group, items]) => <section key={group} aria-label={group} className="mb-5"><h2 className="mb-1 truncate py-2 text-xs font-medium text-[var(--muted)]">{group}</h2><ul className="divide-y divide-[var(--border)]">{items.map(n => <li key={n.id} data-notification-row tabIndex={0} className={`group rounded p-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${isUnread(n) ? 'bg-[var(--hover)]' : ''}`} onKeyDown={e => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const all = [...e.currentTarget.closest('[aria-label="Inbox"]')!.querySelectorAll<HTMLElement>('[data-notification-row]')]; all[all.indexOf(e.currentTarget) + (e.key === 'ArrowDown' ? 1 : -1)]?.focus(); }
      if (e.key === 'Enter') requestNotificationOpen(n.id);
      if (e.key === ' ') { e.preventDefault(); toggle(setSelected, n.id); }
      if (e.key === 'r') void platform.mark({ ids: [n.id], read: isUnread(n) });
      if (e.key === 'e') void platform.mark({ ids: [n.id], archived: !isArchived(n) });
    }}><div className="flex items-start gap-3"><input type="checkbox" aria-label={`Select ${n.title}`} checked={selected.has(n.id)} onChange={() => toggle(setSelected, n.id)} className="mt-1" /><button aria-label={`Expand ${n.title}`} aria-expanded={expanded.has(n.id)} onClick={() => toggle(setExpanded, n.id)}>{expanded.has(n.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button><div className="min-w-0 flex-1"><button onClick={() => requestNotificationOpen(n.id)} className={`text-left text-sm ${isUnread(n) ? 'font-semibold' : ''}`}>{n.title}</button><p className={`mt-1 whitespace-pre-wrap text-xs text-[var(--muted)] ${expanded.has(n.id) ? '' : 'line-clamp-2'}`}>{n.body || n.message}</p><time dateTime={n.created_at} title={new Date(n.created_at).toLocaleString()} className="mt-2 block text-[10px] text-[var(--muted)]">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {n.category}{n.priority === 'urgent' ? ' · Urgent' : ''}</time></div></div><div className="mt-2 flex justify-end gap-3 text-xs text-[var(--muted)]"><button disabled={platform.pending} onClick={() => void platform.mark({ ids: [n.id], read: isUnread(n) })}>{isUnread(n) ? 'Mark read' : 'Mark unread'}</button><button disabled={platform.pending} onClick={() => void platform.mark({ ids: [n.id], archived: !isArchived(n) })}>{isArchived(n) ? 'Restore' : 'Archive'}</button></div></li>)}</ul></section>)}
    {platform.hasMore && !platform.loading && <button disabled={platform.loadingMore} onClick={() => void platform.loadMore()} className="w-full rounded border border-[var(--border)] p-2 text-sm">{platform.loadingMore ? 'Loading…' : 'Load older notifications'}</button>}
    {!compact && <p className="mt-5 text-xs text-[var(--muted)]">Keyboard: ↑↓ move · Enter open · Space select · R read/unread · E archive/restore. Bulk selection applies to loaded results.</p>}
  </section>;
}
