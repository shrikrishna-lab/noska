/**
 * Noska Help Desk — dashboard (signed-in user) data layer.
 *
 * All access goes through the `support_*` RPCs (tables are rpc-only for
 * anon/authenticated roles). Ownership is enforced server-side from the
 * Clerk/GoTrue JWT (`sub` + verified `email` claim).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

export type SupportTicketStatus = "open" | "in_progress" | "pending" | "resolved" | "closed";
export type SupportTicketPriority = "low" | "medium" | "high" | "urgent";
export type SupportTicketCategory =
  | "bug" | "feature" | "billing" | "integration" | "enterprise"
  | "technical" | "account" | "other";

export interface SupportTicket {
  id: string;
  ticket_number: string | null;
  subject: string;
  description: string | null;
  user_name: string;
  email: string;
  category: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assigned_to: string | null;
  replies: number;
  last_update: string;
  created_at: string;
  platform: string | null;
  /** Set for admins — ISO timestamp of the newest admin reply (or null). */
  last_admin_reply_at: string | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: "admin" | "user";
  sender_name: string;
  message: string;
  created_at: string;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  email: string;
  name?: string;
  platform?: string;
}

const FRIENDLY_ERRORS: Record<string, string> = {
  SUBJECT_TOO_SHORT: "Please give your ticket a subject (at least 4 characters).",
  SUBJECT_TOO_LONG: "Subject is too long — keep it under 200 characters.",
  DESCRIPTION_TOO_SHORT: "Please describe the issue in a bit more detail (at least 10 characters).",
  DESCRIPTION_TOO_LONG: "Description is too long — keep it under 8,000 characters.",
  INVALID_EMAIL: "That email address doesn't look valid.",
  NAME_TOO_LONG: "Name is too long.",
  MESSAGE_EMPTY: "Please write a message first.",
  MESSAGE_TOO_LONG: "Message is too long — keep it under 4,000 characters.",
  TICKET_CLOSED: "This ticket is closed. Please open a new ticket if you still need help.",
  NOT_FOUND: "Ticket not found. It may have been deleted.",
  INVALID_TICKET_NUMBER: "Check the ticket number format — it looks like NSK-123456.",
  NOT_AUTHENTICATED: "You're signed out. Please sign in to view your tickets.",
  RATE_LIMITED: "You've created a lot of tickets recently. Please wait a bit before opening another.",
};

export const NETWORK_ERROR_MESSAGE =
  "Couldn't reach the support backend. Check your connection and try again.";

/** True for transport-level failures (offline, DNS, blocked host, timeouts). */
export function isNetworkError(err: unknown): boolean {
  if (err == null) return false;
  const name = err instanceof Error ? err.name : "";
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
  return (
    name === "AbortError" ||
    name === "NetworkError" ||
    /failed to fetch|networkerror|load failed|network request failed|fetch failed|timed out/i.test(msg)
  );
}

/** Retry transient network failures with exponential backoff + jitter. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseMs = 800,
  timeoutMs = 20000
): Promise<T> {
  let last: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (e) {
      last = e;
      if (!isNetworkError(e) || i === attempts - 1) throw e;
      const delay = baseMs * 2 ** i + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw last;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error("Request timed out"), { name: "AbortError" }));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Map raw RPC/PostgREST errors to user-facing messages (exported for tests). */
export function toFriendlySupportError(err: unknown): Error {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err ?? "");
  for (const [code, friendly] of Object.entries(FRIENDLY_ERRORS)) {
    if (raw.includes(code)) return new Error(friendly);
  }
  if (isNetworkError(err)) return new Error(NETWORK_ERROR_MESSAGE);
  return new Error(raw || "Something went wrong. Please try again.");
}

function toFriendlyError(err: unknown): Error {
  return toFriendlySupportError(err);
}

function rpcClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Support backend is not configured in this build.");
  }
  return supabase;
}

/** Open a new ticket. Returns the server-generated reference number. */
export async function createSupportTicket(
  input: CreateTicketInput
): Promise<{ id: string; ticket_number: string }> {
  const client = rpcClient();
  // Single attempt: this is a write — auto-retrying could file the ticket
  // twice when only the response was lost. Reads retry; writes surface the
  // error so the user can consciously retry.
  const call = () =>
    client.rpc(
      "support_create_ticket" as never,
      {
        p_subject: input.subject.trim(),
        p_description: input.description.trim(),
        p_category: input.category,
        p_priority: input.priority,
        p_email: input.email.trim(),
        p_name: input.name?.trim() || null,
        p_platform: input.platform || (typeof navigator !== "undefined" ? navigator.platform || "web" : "web"),
        p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      } as never
    );
  const { data, error } = await Promise.resolve(call()).catch((e: unknown) => {
    throw toFriendlyError(e);
  });
  if (error) throw toFriendlyError(error);
  const row = data as { id: string; ticket_number: string };
  if (!row?.id) throw new Error("Ticket creation returned no data. Please try again.");
  return row;
}

/** Anonymous ticket tracking (marketing page): exact number+email match. */
export async function lookupSupportTicket(
  client: any,
  ticketNumber: string,
  email: string
): Promise<{ ticket: SupportTicket; messages: SupportMessage[] }> {
  const { data, error } = await withRetry(async () =>
    client.rpc(
      "support_lookup_ticket" as never,
      { p_ticket_number: ticketNumber, p_email: email } as never
    )
  ).catch((e: unknown) => {
    throw toFriendlyError(e);
  });
  if (error) throw toFriendlyError(error);
  return data as { ticket: SupportTicket; messages: SupportMessage[] };
}

/**
 * Best-effort confirmation email after ticket creation. Never throws —
 * delivery must not block or fake the success UI.
 */
export async function requestTicketConfirmEmail(
  client: any,
  ticketNumber: string,
  email: string
): Promise<void> {
  try {
    await client.functions.invoke("support-notify", {
      body: { ticket_number: ticketNumber, email },
    });
  } catch {
    /* offline or edge hiccup — the ticket itself is already saved */
  }
}

/** Cheap single-integer open count for the More-menu badge (60s poll). */
export async function fetchOpenSupportTicketCount(): Promise<number> {
  const client = rpcClient();
  const { data, error } = await Promise.resolve(client.rpc("support_open_count" as never)).catch((e: unknown) => {
    throw toFriendlyError(e);
  });
  if (error) throw toFriendlyError(error);
  return typeof data === "number" ? data : 0;
}

/** Tickets owned by the signed-in caller (JWT sub, plus verified-email match). */
export async function fetchMySupportTickets(): Promise<SupportTicket[]> {
  const client = rpcClient();
  const { data, error } = await Promise.resolve(client.rpc("support_my_tickets" as never)).catch((e: unknown) => {
    throw toFriendlyError(e);
  });
  if (error) throw toFriendlyError(error);
  return (data ?? []) as SupportTicket[];
}

/** Full message thread for one owned ticket (safe to retry — read-only). */
export async function fetchSupportMessages(ticketId: string): Promise<SupportMessage[]> {
  const client = rpcClient();
  const { data, error } = await withRetry(async () =>
    client.rpc(
      "support_ticket_messages" as never,
      { p_ticket_id: ticketId } as never
    )
  ).catch((e: unknown) => {
    throw toFriendlyError(e);
  });
  if (error) throw toFriendlyError(error);
  return (data ?? []) as SupportMessage[];
}

/** Reply to an owned ticket (reopens resolved tickets automatically). */
export async function replyToSupportTicket(
  ticketId: string,
  message: string
): Promise<SupportMessage> {
  const client = rpcClient();
  const { data, error } = await Promise.resolve(client.rpc(
    "support_reply" as never,
    { p_ticket_id: ticketId, p_message: message } as never
  )).catch((e: unknown) => {
    throw toFriendlyError(e);
  });
  if (error) throw toFriendlyError(error);
  return data as SupportMessage;
}

// ─── "Seen" tracking for unread admin replies ────────────────────────────────

const SEEN_KEY = "noska_support_seen_v1";

function readSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function markTicketSeen(ticketId: string, at: string = new Date().toISOString()): void {
  try {
    const seen = readSeen();
    seen[ticketId] = at;
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* storage unavailable — unread dots just stay on */
  }
}

export function hasUnreadAdminReply(ticket: SupportTicket): boolean {
  if (!ticket.last_admin_reply_at) return false;
  const seenAt = readSeen()[ticket.id];
  if (!seenAt) return true;
  return new Date(ticket.last_admin_reply_at).getTime() > new Date(seenAt).getTime();
}

export function isOpenTicket(t: SupportTicket): boolean {
  return t.status === "open" || t.status === "in_progress" || t.status === "pending";
}

// ─── Last-known cache (offline resilience) ───────────────────────────────────

const LIST_CACHE_KEY = "noska_support_list_v1";

export interface CachedTicketList {
  tickets: SupportTicket[];
  at: number;
}

export function readCachedTickets(): CachedTicketList | null {
  try {
    const raw = localStorage.getItem(LIST_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTicketList;
    if (!Array.isArray(parsed.tickets) || typeof parsed.at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedTickets(tickets: SupportTicket[]): void {
  try {
    localStorage.setItem(LIST_CACHE_KEY, JSON.stringify({ tickets, at: Date.now() }));
  } catch {
    /* storage unavailable — cache just stays empty */
  }
}

// ─── Live ticket list hook (poll + focus refresh; tables are RLS-blocked ────
// ─── for realtime, so polling is the correct transport here) ────────────────

export interface TicketListState {
  tickets: SupportTicket[];
  loading: boolean;
  error: string | null;
  /** True when the browser reports no connectivity. */
  offline: boolean;
  /** Timestamp of the last successful sync (null = never). */
  updatedAt: number | null;
  /** True when showing cached data that failed to refresh. */
  stale: boolean;
  refresh: () => Promise<void>;
}

function browserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function useMySupportTickets(pollMs = 30000): TicketListState {
  const [initial] = useState<CachedTicketList | null>(() => readCachedTickets());
  const [tickets, setTickets] = useState<SupportTicket[]>(initial?.tickets || []);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState<boolean>(() => browserOffline());
  const [updatedAt, setUpdatedAt] = useState<number | null>(initial?.at ?? null);
  const [stale, setStale] = useState(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await withRetry(fetchMySupportTickets);
      if (!mounted.current) return;
      setTickets(rows);
      setError(null);
      setStale(false);
      const at = Date.now();
      setUpdatedAt(at);
      writeCachedTickets(rows);
    } catch (e) {
      if (!mounted.current) return;
      // Keep last-known tickets on transport failure instead of blanking.
      setError(e instanceof Error ? e.message : "Failed to load tickets.");
      setStale(true);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const onFocus = () => void refresh();
    const onOnline = () => { setOffline(false); void refresh(); };
    const onOffline = () => setOffline(true);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const timer = pollMs > 0 ? window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, pollMs) : 0;
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (timer) window.clearInterval(timer);
    };
  }, [refresh, pollMs]);

  return { tickets, loading, error, offline, updatedAt, stale, refresh };
}

/** Open-ticket count for the More-menu badge. Null = unknown (badge hidden). */
export function useOpenSupportTicketCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    const load = async () => {
      try {
        if (!isSupabaseConfigured) { if (alive) setCount(null); return; }
        // Retry once more than default: the badge must survive single blips.
        if (alive) setCount(await withRetry(fetchOpenSupportTicketCount, 4));
      } catch {
        // Keep the last known count on failure — a stale badge beats a
        // disappearing one. Null only when we never succeeded.
      }
    };
    void load();
    const onOnline = () => void load();
    window.addEventListener("online", onOnline);
    timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener("online", onOnline); };
  }, []);

  return count;
}
