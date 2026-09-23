/**
 * Noska Help Desk — dashboard "Support Tickets" view (real Supabase data).
 *
 * List + create + two-way thread with the support team. Unread admin replies
 * are tracked locally; the list polls + refreshes on focus (tables are
 * RLS-blocked for realtime, so polling is the correct transport).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/react";
import {
  LifeBuoy, Plus, Search, RefreshCw, Send, X, Loader2, AlertCircle,
  CheckCircle2, Clock, Inbox, ChevronRight, ShieldCheck,
} from "lucide-react";
import {
  createSupportTicket, fetchSupportMessages, replyToSupportTicket,
  requestTicketConfirmEmail,
  useMySupportTickets, markTicketSeen, hasUnreadAdminReply, isOpenTicket,
  type SupportTicket, type SupportMessage,
} from "./api";
import TicketComposerForm, {
  DEFAULT_COMPOSER_VALUES,
  type TicketComposerValues,
} from "./TicketComposerForm";
import { supabase } from "../../lib/supabase";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  pending: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
  resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  closed: "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/25",
};

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/25",
  medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  urgent: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
};

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${className || ""}`}>
      {children}
    </span>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

type Filter = "all" | "open" | "resolved";

export default function SupportTicketsView({ onToast }: { onToast?: (m: string) => void }) {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
  const displayName = user?.fullName || user?.username || email.split("@")[0] || "there";

  const { tickets, loading, error, offline, updatedAt, stale, refresh } = useMySupportTickets();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) || null,
    [tickets, selectedId]
  );

  useEffect(() => {
    if (selectedId && !tickets.some((t) => t.id === selectedId)) setSelectedId(null);
  }, [tickets, selectedId]);

  const stats = useMemo(() => {
    const open = tickets.filter(isOpenTicket);
    const unread = tickets.filter(hasUnreadAdminReply).length;
    const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
    return { open: open.length, unread, resolved, total: tickets.length };
  }, [tickets]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filter === "open" && !isOpenTicket(t)) return false;
      if (filter === "resolved" && isOpenTicket(t)) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        (t.ticket_number || "").toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [tickets, filter, query]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openTicket = (t: SupportTicket) => {
    setSelectedId(t.id);
    markTicketSeen(t.id);
  };

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <LifeBuoy size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
            Support Tickets
          </h1>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {email ? `Signed in as ${email}` : "Chat directly with the support team"} · replies usually within 4–24h
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          title="Refresh"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 text-neutral-500 transition hover:bg-black/5 dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/10"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
        </button>
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 text-[13px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98] dark:bg-white dark:text-neutral-900"
        >
          <Plus size={15} /> New ticket
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Open", value: stats.open, icon: <Clock size={13} /> },
          { label: "Unread replies", value: stats.unread, icon: <Inbox size={13} /> },
          { label: "Resolved", value: stats.resolved, icon: <CheckCircle2 size={13} /> },
          { label: "Total", value: stats.total, icon: <LifeBuoy size={13} /> },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-2.5 rounded-2xl border border-black/[0.06] bg-white/70 px-3.5 py-2.5 dark:border-white/[0.07] dark:bg-white/[0.03]"
          >
            <span className="text-neutral-400">{s.icon}</span>
            <div>
              <p className="text-base font-bold leading-none text-neutral-900 dark:text-white">{s.value}</p>
              <p className="mt-1 text-[10.5px] font-medium text-neutral-500 dark:text-neutral-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + search */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "open", "resolved"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
              filter === f
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-black/[0.04] text-neutral-600 hover:bg-black/[0.07] dark:bg-white/[0.06] dark:text-neutral-300 dark:hover:bg-white/[0.1]"
            }`}
          >
            {f === "resolved" ? "Resolved" : f === "open" ? "Open" : "All"}
          </button>
        ))}
        <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-[240px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickets…"
            className="h-9 w-full rounded-xl border border-black/10 bg-white/70 pl-9 pr-3 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
          />
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-neutral-400">
          <Loader2 size={22} className="animate-spin" />
          <p className="text-xs font-medium">Loading your tickets…</p>
        </div>
      ) : error && visible.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-8 text-center">
          <AlertCircle size={22} className="text-rose-500" />
          <p className="max-w-sm text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            {offline ? "You're offline. Reconnect to load your tickets." : error}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900"
          >
            Try again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-black/10 p-10 text-center dark:border-white/10">
          <LifeBuoy size={26} className="text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            {tickets.length === 0 ? "No tickets yet" : "Nothing matches"}
          </p>
          <p className="max-w-xs text-xs text-neutral-500 dark:text-neutral-400">
            {tickets.length === 0
              ? "Open your first ticket and the support team will pick it up right here."
              : "Try a different search or filter."}
          </p>
          {tickets.length === 0 && (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="mt-1 flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900"
            >
              <Plus size={14} /> New ticket
            </button>
          )}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {(stale || offline) && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-xs font-medium text-amber-700 lg:col-span-2 dark:text-amber-400">
              <AlertCircle size={14} className="shrink-0" />
              <span className="flex-1">
                {offline
                  ? "You're offline — showing your last synced tickets."
                  : `Couldn't refresh${updatedAt ? ` — showing tickets from ${timeAgo(new Date(updatedAt).toISOString())}` : " — showing cached tickets"}.`}
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1 font-semibold transition hover:bg-amber-500/25"
              >
                <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Retry
              </button>
            </div>
          )}
          {/* List */}
          <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-0.5">
            {visible.map((t) => {
              const active = t.id === selectedId;
              const unread = hasUnreadAdminReply(t);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openTicket(t)}
                  className={`group rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-neutral-900/20 bg-white shadow-sm dark:border-white/20 dark:bg-white/[0.06]"
                      : "border-black/[0.06] bg-white/60 hover:bg-white dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" title="New reply from support" />}
                    <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-neutral-900 dark:text-white">
                      {t.subject}
                    </p>
                    <ChevronRight size={14} className="shrink-0 text-neutral-300 transition group-hover:translate-x-0.5 dark:text-neutral-600" />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Pill className={STATUS_STYLE[t.status] || STATUS_STYLE.open}>
                      {t.status.replace("_", " ")}
                    </Pill>
                    <Pill className={PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.medium}>{t.priority}</Pill>
                    <span className="text-[10.5px] font-medium capitalize text-neutral-400">
                      {(t.ticket_number || t.id.slice(0, 8))} · {t.category} · {timeAgo(t.last_update)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Thread */}
          <div className="min-h-[320px]">
            {selected ? (
              <TicketThread
                key={selected.id}
                ticket={selected}
                offline={offline}
                onToast={onToast}
                onChanged={refresh}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-black/[0.06] bg-white/40 p-8 text-center dark:border-white/[0.06] dark:bg-white/[0.02]">
                <ShieldCheck size={22} className="text-neutral-300 dark:text-neutral-600" />
                <p className="text-[13px] font-semibold text-neutral-600 dark:text-neutral-300">Select a ticket</p>
                <p className="max-w-[240px] text-xs text-neutral-400">Pick a conversation to read replies and respond.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {composerOpen && (
        <NewTicketModal
          defaultEmail={email}
          defaultName={typeof displayName === "string" ? displayName : ""}
          onClose={() => setComposerOpen(false)}
          onCreated={(t) => {
            setComposerOpen(false);
            void refresh().then(() => setSelectedId(t.id));
            onToast?.(`Ticket ${t.ticket_number} created`);
          }}
        />
      )}
    </div>
  );
}

function TicketThread({
  ticket, offline, onToast, onChanged,
}: {
  ticket: SupportTicket;
  offline: boolean;
  onToast?: (m: string) => void;
  onChanged: () => void;
}) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const closed = ticket.status === "closed";

  const load = React.useCallback(async () => {
    try {
      const rows = await fetchSupportMessages(ticket.id);
      setMessages(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, [ticket.id]);

  useEffect(() => {
    setLoading(true);
    void load();
    markTicketSeen(ticket.id);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load, ticket.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending || closed) return;
    setSending(true);
    try {
      const msg = await replyToSupportTicket(ticket.id, text);
      setMessages((prev) => [...prev, msg]);
      setDraft("");
      markTicketSeen(ticket.id);
      onChanged();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Reply failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white/70 dark:border-white/[0.07] dark:bg-white/[0.03]">
      <div className="border-b border-black/[0.06] p-3.5 dark:border-white/[0.07]">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-neutral-900 dark:text-white">
            {ticket.subject}
          </p>
          <Pill className={STATUS_STYLE[ticket.status] || STATUS_STYLE.open}>{ticket.status.replace("_", " ")}</Pill>
        </div>
        <p className="mt-1 text-[11px] text-neutral-400">
          {(ticket.ticket_number || ticket.id.slice(0, 8))} · {ticket.category} · {ticket.priority} priority · opened{" "}
          {new Date(ticket.created_at).toLocaleDateString()}
        </p>
        {ticket.description && (
          <p className="mt-2 rounded-xl bg-black/[0.03] p-2.5 text-xs leading-relaxed text-neutral-600 dark:bg-white/[0.04] dark:text-neutral-300">
            {ticket.description}
          </p>
        )}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3.5">
        {loading ? (
          <div className="flex h-full items-center justify-center text-neutral-400">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-xs text-rose-500">{error}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_type === "user";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                  mine
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-black/[0.05] text-neutral-800 dark:bg-white/[0.07] dark:text-neutral-100"
                }`}>
                  {!mine && (
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-500">
                      {m.sender_name} · Support
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-white/60 dark:text-neutral-500" : "text-neutral-400"}`}>
                    {timeAgo(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-black/[0.06] p-3 dark:border-white/[0.07]">
        {closed ? (
          <p className="rounded-xl bg-neutral-500/10 px-3 py-2.5 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400">
            This ticket is closed. Open a new ticket if you still need help.
          </p>
        ) : offline ? (
          <p className="rounded-xl bg-amber-500/[0.08] px-3 py-2.5 text-center text-xs font-medium text-amber-700 dark:text-amber-400">
            You're offline — reconnect to send replies.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
              }}
              rows={2}
              maxLength={4000}
              placeholder="Write a reply…"
              className="max-h-28 min-h-[44px] flex-1 resize-y rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!draft.trim() || sending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white transition enabled:hover:brightness-110 enabled:active:scale-95 disabled:opacity-40 dark:bg-white dark:text-neutral-900"
              title="Send reply"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NewTicketModal({
  defaultEmail, defaultName, onClose, onCreated,
}: {
  defaultEmail: string;
  defaultName: string;
  onClose: () => void;
  onCreated: (t: { id: string; ticket_number: string }) => void;
}) {
  const [values, setValues] = useState<TicketComposerValues>({
    ...DEFAULT_COMPOSER_VALUES,
    email: defaultEmail,
    name: defaultName,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<TicketComposerValues>) =>
    setValues((v) => ({ ...v, ...p }));

  const submit = async () => {
    if (saving) return;
    if (!values.email.trim() || !values.subject.trim() || !values.description.trim()) {
      setError("Please fill in your email, subject, and description.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const created = await createSupportTicket({
        subject: values.subject,
        description: values.description,
        category: values.category,
        priority: values.priority,
        email: values.email,
        name: values.name,
        platform: "dashboard",
      });
      // Best-effort confirmation email — never blocks the success UI.
      void requestTicketConfirmEmail(supabase, created.ticket_number, values.email.trim());
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[20px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700"
        >
          <X size={16} />
        </button>
        <div className="px-5 py-6 sm:px-8 sm:py-7">
          <TicketComposerForm
            values={values}
            onChange={patch}
            onSubmit={() => void submit()}
            loading={saving}
            error={error}
            showHeader={false}
            envLabel="Dashboard"
          />
        </div>
      </div>
    </div>
  );
}
