import { supabase } from "./supabase";
import type { Block, LineageEntry } from "../../types/blocks";
export type { Block, LineageEntry };
import type {
  AgentAccessLevel,
  AgentResourceType,
  AgentStatus,
  AgentTriggerType,
  AgentType,
  ChatType,
  MarketplaceTemplateStatus,
  MarketplaceTemplateType,
  PayoutStatus,
  TemplateAdditionStatus,
} from "../../types/enums";
import type { Tables, TablesInsert, TablesUpdate, Json } from "../../types/supabase";

// Refuse any owner-scoped write that lacks an authenticated user id. Under the
// owner-scoped RLS model a null/empty owner would either fail the WITH CHECK
// policy or (pre-migration) create an unusable orphaned row. Fail fast instead.
// Spec: .kiro/specs/auth-rls-security-migration (Requirements 1.3, 6.2, 6.4)
function requireOwner(userId: string | null | undefined): string {
  if (!userId) {
    throw new Error("[supabase] refusing write without an authenticated user");
  }
  return userId;
}

// ============ PAGES ============
// RLS-adjacent: `pages` is owner-scoped (user_id) row-level security.

/** App-facing Page shape — the camelCase object every call site outside
 * this file actually works with. Distinct from `Tables<'pages'>` (the raw
 * snake_case DB row) because mapPageFromDb/mapPageToDb translate between
 * the two; this is the shape on the *app* side of that boundary. */
export interface Page {
  id: string;
  title: string;
  icon: string;
  // Optional for the same reason as the group below (App.tsx constructs
  // many pages without ever setting `cover`) — every real consumer
  // (Editor.tsx, PagePeek.tsx, CustomizePanel.jsx, ReadingMode.jsx) reads
  // it with `||`/`??`/truthy checks and falls back to a default gradient.
  cover?: string | null;
  parentId: string | null;
  favorite: boolean;
  trashed: boolean;
  tags: unknown[];
  // These 7 fields are always present (defaulted via `|| false`/etc.) on
  // pages that round-trip through mapPageFromDb, but App.tsx constructs
  // many ad-hoc page objects directly (new/duplicated/templated pages)
  // that omit them, relying on every real consumer's `page.x || false`/
  // `?.` fallback (confirmed via grep — PageTree.jsx, Sidebar.jsx,
  // Editor.tsx, StackedColumn.tsx, WorkspaceViews.jsx, etc. all read
  // these defensively, never assuming presence). Marked optional to
  // match how they're actually used, rather than forcing every page
  // literal across the app to redundantly spell out `false`/`undefined`
  // for fields whose absence already means the same thing at every call
  // site.
  hiddenFromRecents?: boolean;
  offline?: boolean;
  isEncrypted?: boolean;
  encryptedBlocks?: string | null | undefined;
  iv?: string | null | undefined;
  salt?: string | null | undefined;
  isLocked?: boolean;
  blocks: Block[];
  lineage: LineageEntry[];
  updatedAt?: string | null;
  createdAt?: string | null;
  /** Ordered list of child page ids — NOT a `pages` table column (grepped
   * types/supabase.ts's `pages` Row/Insert/Update: no `content` field
   * exists there). This is a purely client-side, session-computed field:
   * src/utils/pageTreeOps.ts's `normalizePages()` rebuilds it from each
   * page's `parentId` (plus optional order hints) every time pages are
   * loaded (src/App.jsx, on every fetch), and mapPageToDb below never
   * sends it to the DB. Optional because a freshly-fetched `Page` (via
   * `mapPageFromDb`) won't have it until `normalizePages()` runs. */
  content?: string[];

  /** The following fields are all real, actively-read/written page
   * customization/state fields (confirmed via grep across
   * src/components/Editor.tsx, CustomizePanel.jsx, PageOptionsMenu.jsx,
   * CoverContextMenu.tsx, SelectionAIBar.jsx, CommandRegistry.ts) — but,
   * same as `content` above, NONE of them are `pages` table columns
   * (confirmed against types/supabase.ts) and `mapPageToDb` above never
   * sends them to the DB. `App.jsx`'s `updatePage()` merges `patch`
   * fields directly onto the in-memory `Page` object
   * (`{ ...p, ...patch }`) with no schema check, so any of these
   * survive only in local/session state and are lost on reload unless
   * a future migration adds real columns for them. Documenting the full
   * real set here (rather than leaving each consumer to keep re-casting
   * around a missing field) is not a behavior change — it's the same
   * gap `content` had, just for page-styling/comment/wiki fields instead
   * of tree structure. */
  fontStyle?: "default" | "serif" | "mono";
  fullWidth?: boolean;
  smallText?: boolean;
  pageBg?: string | null;
  coverHeight?: number;
  coverPosition?: string;
  iconSize?: number;
  iconPadding?: number;
  iconOffsetX?: number;
  iconOffsetY?: number;
  iconRotation?: number;
  iconAlign?: "overlap" | "left" | "center" | "right" | "float-left" | "free" | string;
  iconBg?: "card" | "glass" | "transparent" | "circle" | "glow" | string;
  iconBorderRadius?: number;
  titleSize?: number;
  titleWeight?: "normal" | "semibold" | "bold" | "extrabold" | string;
  titleFont?: "default" | "serif" | "mono" | "display" | string;
  titleAlign?: "left" | "center" | "right" | string;
  titleColor?: string;
  titleTracking?: "tighter" | "tight" | "normal" | "wide" | string;
  titleOffsetX?: number;
  titleOffsetY?: number;
  titleRotation?: number;

  /** Reading Mode's saved text-selection highlights and bookmark flag
   * (src/features/reading/ReadingMode.jsx, confirmed via its App.tsx call
   * site's onPagePatch). Same non-persisted-field pattern as the group
   * above — not a `pages` table column, set only through
   * `updatePage()`'s in-memory `{ ...p, ...patch }` merge, lost on
   * reload unless a future migration adds real columns. */
  highlights?: string[];
  bookmarked?: boolean;
  coverSize?: "small" | "standard" | "wide" | "full";
  coverParallax?: boolean;
  coverBlur?: number;
  coverOverlay?: boolean;
  coverBrightness?: number;
  /** Distinct from the RLS-relevant `page_permissions` table — this is a
   * simple client-side "view"/"edit" toggle read by
   * `getPagePermission()`/`resolvePermission()` (blockModel.ts) and
   * written by CustomizePanel.jsx/PageOptionsMenu.jsx/CommandRegistry.ts's
   * "read-only" toggle command. */
  permission?: "view" | "edit";
  lastEditedBy?: string;
  lastEditedAt?: string;
  /** Page-anchored comment threads — distinct from any DB table; see
   * src/components/comments/CommentThread.tsx for the real shape
   * produced/consumed (id/blockId/pageId/text/userId/userName/
   * createdAt/updatedAt/resolvedAt/resolvedBy). Kept as a loose record
   * array here rather than importing that component's inline shape,
   * since no dedicated Comment type exists anywhere in the codebase yet. */
  comments?: Array<Record<string, unknown>>;
  /** The full-page database feature (distinct from a `database`-type
   * *block* — see DatabaseBlock in types/blocks.ts) that
   * `handleWikiConversion()` in Editor.tsx and VersionHistoryPanel's
   * "restore database view" both read/write directly on the page. Kept
   * as `DatabaseSchema` (types/blocks.ts) since it's the exact same
   * shape. */
  database?: import("../../types/blocks").DatabaseSchema;
  wikiEnabled?: boolean;
  wikiTags?: unknown[];
  wikiOwner?: string;
  wikiStatus?: string;
  wikiVerification?: string;

  /** Trash lifecycle fields — same non-persisted pattern as the groups
   * above (confirmed absent from `pages` table in types/supabase.ts).
   * `trashPageSubtree()` (src/App.tsx) sets `trashedAt` + `purgeAfter`
   * (now + 30 days) when a page is trashed; `purgeExpiredTrash()` reads
   * `purgeAfter || deleteAfter` to decide what to hard-delete on load.
   * `deleteAfter` is read but NEVER written anywhere in the current
   * codebase (grepped) — likely a renamed-but-not-fully-migrated field
   * name from an earlier version of the trash feature. Kept as a
   * documented dead fallback rather than removed, since removing a
   * read path is a behavior change outside this migration's scope. */
  trashedAt?: string;
  purgeAfter?: string;
  deleteAfter?: string;

  /** Set only on pages returned by `fetchSharedPages` — marks this as a
   * page shared TO the current user (they're not its owner). Never sent
   * to the DB (not a `pages` column) and never present on a normal
   * owned page. Read by App.tsx to keep shared pages out of the owner-
   * scoped `pages` array / auto-save pipeline, and by the UI to show a
   * "Shared with you" indicator and gate owner-only actions. */
  sharedRole?: "editor" | "commenter" | "viewer";
}

/** Loose partial input accepted by savePage/savePages/mapPageToDb — pages
 * are frequently constructed/patched with only a subset of Page's fields
 * (see src/App.jsx updatePage()), so this intentionally doesn't require
 * every field the way `Page` does. */
export type PageInput = Partial<Page> & { id: string };

export async function fetchPages(userId?: string | null): Promise<Page[]> {
  let query = supabase.from("pages").select("*");
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapPageFromDb);
}

export async function savePage(page: PageInput, userId: string): Promise<void> {
  requireOwner(userId);
  const dbPage = { ...mapPageToDb(page), user_id: userId };
  const { error } = await supabase
    .from("pages")
    .upsert(dbPage, { onConflict: "id" });
  if (error) throw error;
}

export async function savePages(pages: PageInput[], userId: string): Promise<void> {
  requireOwner(userId);
  if (!pages.length) return;
  const dbPages = pages
    .map((p) => ({ ...mapPageToDb(p), user_id: userId }))
    .sort((a, b) => (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0));
  const { error } = await supabase
    .from("pages")
    .upsert(dbPages, { onConflict: "id" });
  if (error) throw error;
}

/** Updates a shared page's content WITHOUT ever touching `user_id` —
 * unlike `savePage`/`savePages` (which always set `user_id: userId` on
 * upsert), this is a plain field-level UPDATE so an editor with a
 * `page_permissions` grant can edit a page's content without silently
 * reassigning its ownership to themselves. RLS enforces the actual
 * write permission (`pages_update_own_or_editor` — see migration
 * rls_page_permissions_and_shared_pages): this will fail server-side if
 * `editorUserId` doesn't actually have a `can_edit` grant on this page. */
export async function updateSharedPage(pageId: string, patch: PageInput, editorUserId: string): Promise<void> {
  requireOwner(editorUserId);
  const dbPatch = mapPageToDb(patch) as Partial<TablesInsert<"pages">>;
  delete dbPatch.id;
  const { error } = await supabase
    .from("pages")
    .update(dbPatch)
    .eq("id", pageId);
  if (error) throw error;
}

export async function deletePage(id: string): Promise<void> {
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw error;
}

// ============ WORKSPACE SETTINGS ============
// RLS-adjacent: workspace_settings currently has no owner column in the
// generated schema (types/supabase.ts) — flagging this explicitly since
// it means these rows are not user-scoped the way `pages` is.

export async function fetchSettings(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from("workspace_settings").select("*");
  if (error) throw error;
  const map: Record<string, unknown> = {};
  for (const row of data || []) {
    map[row.key] = row.value;
  }
  return map;
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from("workspace_settings")
    .upsert({ key, value } as TablesInsert<"workspace_settings">, { onConflict: "key" });
  if (error) throw error;
}

// ============ AI CHATS ============

/** App-facing AI chat shape, mirroring the ai_chats table via camelCase
 * field names (see fetchAIChats/saveAIChat mappers below). */
export interface AIChat {
  id: string;
  name: string;
  messages: unknown[];
  pinned: boolean;
  archived: boolean;
  chatType: ChatType;
  pageId: string | null;
  pageTitle: string | null;
  collaborators: unknown[];
  createdAt: string | null;
  updatedAt: string | null;
}

export type AIChatInput = Partial<AIChat> & { id: string; title?: string };

export async function fetchAIChats(userId?: string | null): Promise<AIChat[]> {
  let query = supabase.from("ai_chats").select("*");
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((c) => ({
    id: c.id,
    name: c.name || "New chat",
    messages: (c.messages as unknown[]) || [],
    pinned: c.pinned || false,
    archived: c.archived || false,
    chatType: (c.chat_type as ChatType) || "private",
    pageId: c.page_id || null,
    pageTitle: c.page_title || null,
    collaborators: (c.collaborators as unknown[]) || [],
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
}

export async function saveAIChat(chat: AIChatInput, userId: string): Promise<void> {
  requireOwner(userId);
  const { error } = await supabase
    .from("ai_chats")
    .upsert(
      {
        id: chat.id,
        name: chat.name || chat.title || "New chat",
        messages: (chat.messages || []) as unknown as Json,
        pinned: chat.pinned || false,
        archived: chat.archived || false,
        chat_type: chat.chatType || "private",
        page_id: chat.pageId || null,
        page_title: chat.pageTitle || null,
        collaborators: (chat.collaborators || []) as unknown as Json,
        user_id: userId,
      } as TablesInsert<"ai_chats">,
      { onConflict: "id" }
    );
  if (error) throw error;
}

export async function saveAIChats(chats: AIChatInput[], userId: string): Promise<void> {
  requireOwner(userId);
  if (!chats.length) return;
  const dbChats = chats.map(
    (c): TablesInsert<"ai_chats"> => ({
      id: c.id,
      name: c.name || c.title || "New chat",
      messages: (c.messages || []) as unknown as Json,
      pinned: c.pinned || false,
      archived: c.archived || false,
      chat_type: c.chatType || "private",
      page_id: c.pageId || null,
      page_title: c.pageTitle || null,
      collaborators: (c.collaborators || []) as unknown as Json,
      user_id: userId,
    })
  );
  const { error } = await supabase.from("ai_chats").upsert(dbChats, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteAIChat(id: string, userId: string): Promise<void> {
  requireOwner(userId);
  const { error } = await supabase.from("ai_chats").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

// ============ USER AI USAGE STATS ============

export interface UserAIUsageStats {
  userId: string;
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  favoriteModel: string;
  modelDistribution: Record<string, number>;
  hourlyDistribution: Record<string, number>;
  dailyActivity: Record<string, number>;
  totalCost: number;
  avgLatencyMs: number;
  lastActiveAt?: string | null;
}

export async function fetchUserAIStats(userId: string): Promise<UserAIUsageStats | null> {
  if (!userId) return null;
  const client = supabase as any;
  const { data, error } = await client
    .from("user_ai_usage_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error && error.code !== "42P01") return null;
  if (!data) return null;

  return {
    userId: data.user_id,
    totalSessions: data.total_sessions || 0,
    totalMessages: data.total_messages || 0,
    totalTokens: Number(data.total_tokens || 0),
    promptTokens: Number(data.prompt_tokens || 0),
    completionTokens: Number(data.completion_tokens || 0),
    activeDays: data.active_days || 1,
    currentStreak: data.current_streak || 1,
    longestStreak: data.longest_streak || 1,
    favoriteModel: data.favorite_model || "llama-3.3-70b-versatile",
    modelDistribution: (data.model_distribution as Record<string, number>) || {},
    hourlyDistribution: (data.hourly_distribution as Record<string, number>) || {},
    dailyActivity: (data.daily_activity as Record<string, number>) || {},
    totalCost: Number(data.total_cost || 0),
    avgLatencyMs: data.avg_latency_ms || 0,
    lastActiveAt: data.last_active_at,
  };
}

export async function recordUserAIUsage(
  userId: string,
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    model?: string;
    cost?: number;
    latencyMs?: number;
  }
): Promise<void> {
  if (!userId) return;
  try {
    const existing = await fetchUserAIStats(userId);
    const pTokens = usage.promptTokens || 0;
    const cTokens = usage.completionTokens || 0;
    const model = usage.model || "llama-3.3-70b-versatile";
    const cost = usage.cost || 0;
    const latencyMs = usage.latencyMs || 0;

    const modelDist = { ...(existing?.modelDistribution || {}) };
    modelDist[model] = (modelDist[model] || 0) + 1;

    const now = new Date();
    const hourKey = String(now.getHours());
    const dayKey = now.toISOString().split("T")[0];

    const hourDist = { ...(existing?.hourlyDistribution || {}) };
    hourDist[hourKey] = (hourDist[hourKey] || 0) + 1;

    const dayDist = { ...(existing?.dailyActivity || {}) };
    dayDist[dayKey] = (dayDist[dayKey] || 0) + 1;

    const totalMsgs = (existing?.totalMessages || 0) + 1;
    const totalToks = (existing?.totalTokens || 0) + pTokens + cTokens;
    const prevTotalCost = existing?.totalCost || 0;
    const prevAvgLatency = existing?.avgLatencyMs || 0;
    const newTotalCost = prevTotalCost + cost;
    const newAvgLatency = totalMsgs > 0
      ? Math.round(((prevAvgLatency * (totalMsgs - 1)) + latencyMs) / totalMsgs)
      : latencyMs;

    const client = supabase as any;
    await client.from("user_ai_usage_stats").upsert({
      user_id: userId,
      total_messages: totalMsgs,
      total_tokens: totalToks,
      prompt_tokens: (existing?.promptTokens || 0) + pTokens,
      completion_tokens: (existing?.completionTokens || 0) + cTokens,
      total_cost: newTotalCost,
      avg_latency_ms: newAvgLatency,
      favorite_model: Object.entries(modelDist).sort((a, b) => b[1] - a[1])[0]?.[0] || model,
      model_distribution: modelDist,
      hourly_distribution: hourDist,
      daily_activity: dayDist,
      last_active_at: now.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: "user_id" });
  } catch (err) {
    console.warn("supabaseService: recordUserAIUsage failed silently", err);
  }
}

/** Fetches ALL users' AI usage stats for the leaderboard.
 *  The user_ai_usage_stats RLS policy allows any authenticated user to read
 *  all rows, so this works from the client side without admin RPCs. */
export interface LeaderboardEntry {
  userId: string;
  totalTokens: number;
  totalMessages: number;
  totalSessions: number;
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  favoriteModel: string;
  totalCost: number;
  avgLatencyMs: number;
  lastActiveAt: string | null;
}

export async function fetchAllUsersAIStats(limit = 20): Promise<LeaderboardEntry[]> {
  const client = supabase as any;
  const { data, error } = await client
    .from("user_ai_usage_stats")
    .select("user_id, total_tokens, total_messages, total_sessions, current_streak, longest_streak, active_days, favorite_model, total_cost, avg_latency_ms, last_active_at")
    .order("total_tokens", { ascending: false })
    .order("user_id", { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data || []).map((row: any) => ({
    userId: row.user_id,
    totalTokens: Number(row.total_tokens || 0),
    totalMessages: row.total_messages || 0,
    totalSessions: row.total_sessions || 0,
    currentStreak: row.current_streak || 0,
    longestStreak: row.longest_streak || 0,
    activeDays: row.active_days || 0,
    favoriteModel: row.favorite_model || "—",
    totalCost: Number(row.total_cost || 0),
    avgLatencyMs: row.avg_latency_ms || 0,
    lastActiveAt: row.last_active_at || null,
  }));
}

// ============ AI MEMORY ============

export interface AIMemoryEntry {
  key: string;
  value: unknown;
  category?: string;
  importance?: number;
  ttlHours?: number | null;
}

export async function fetchAIMemory(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("ai_memory")
    .select("*")
    .order("importance", { ascending: false });
  if (error) {
    if (error.code === "42P01") return {};
    throw error;
  }
  const map: Record<string, unknown> = {};
  for (const row of data || []) {
    map[row.key] = row.value;
  }
  return map;
}

export async function saveAIMemoryEntry(
  key: string,
  value: unknown,
  category = "general",
  importance = 0.5,
  ttlHours: number | null = null
): Promise<void> {
  const entry: TablesInsert<"ai_memory"> = {
    key,
    // ai_memory.value is a Json column holding an arbitrary caller-supplied
    // payload; no fixed shape exists to derive, so it's normalized to an
    // object and cast through `unknown` (consistent with the Json casts
    // used for ai_chats.messages/collaborators below).
    value: (typeof value === "object" && value !== null ? value : { text: value }) as unknown as Json,
    category,
    importance,
    expires_at: ttlHours ? new Date(Date.now() + ttlHours * 3600000).toISOString() : null,
  };
  const { error } = await supabase.from("ai_memory").upsert(entry, { onConflict: "key" });
  if (error && error.code !== "42P01") throw error;
}

export async function saveAIMemory(entries: AIMemoryEntry[]): Promise<void> {
  if (!entries.length) return;
  const dbRows: TablesInsert<"ai_memory">[] = entries.map((e) => ({
    key: e.key,
    // Same rationale as saveAIMemoryEntry above: arbitrary Json payload,
    // no fixed shape to derive from callers.
    value: (typeof e.value === "object" && e.value !== null ? e.value : { text: e.value }) as unknown as Json,
    category: e.category || "general",
    importance: e.importance ?? 0.5,
    expires_at: e.ttlHours ? new Date(Date.now() + e.ttlHours * 3600000).toISOString() : null,
  }));
  const { error } = await supabase.from("ai_memory").upsert(dbRows, { onConflict: "key" });
  if (error && error.code !== "42P01") throw error;
}

export async function deleteAIMemory(key: string): Promise<void> {
  const { error } = await supabase.from("ai_memory").delete().eq("key", key);
  if (error && error.code !== "42P01") throw error;
}

export async function clearExpiredMemory(): Promise<void> {
  const { error } = await supabase
    .from("ai_memory")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .not("expires_at", "is", null);
  if (error && error.code !== "42P01") throw error;
}

// ============ USER PROFILES ============
// RLS-adjacent: owner-scoped by user_id, mirrors the `pages` policy model.

export interface UserProfileInput {
  userId: string;
  userName?: string;
  email?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  onboardingComplete?: boolean;
  useCase?: string | null;
  workspaceName?: string | null;
  preferences?: Record<string, unknown>;
  /** Unique handle chosen during onboarding (see setUsername/isUsernameAvailable
   * below) — omitted here (rather than defaulted) so callers that don't know
   * the existing value (e.g. App.tsx's per-login upsert) don't accidentally
   * clear a previously-set username. */
  username?: string | null;
  /** Location details captured on the web side (profile/onboarding) and used
   * by the admin panel for city/state/area/country-wise email targeting. */
  country?: string | null;
  state?: string | null;
  city?: string | null;
  area?: string | null;
  postalCode?: string | null;
  ipAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Matches the DB-level CHECK constraint on user_profiles.username exactly
 * (see migration `add_username_to_user_profiles`): 3-20 chars, lowercase
 * letters/digits/underscore, must start with a letter. Validated
 * client-side first for immediate UX feedback; the DB constraint is the
 * real enforcement boundary. */
const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsernameFormat(raw: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(raw));
}

/** Return a few deterministic alternatives when a requested handle is taken. */
export async function suggestAvailableUsernames(
  input: string,
  excludeUserId?: string,
  limit = 3,
): Promise<string[]> {
  const base = normalizeUsername(input).replace(/[^a-z0-9_]/g, "").replace(/^([^a-z])/, "u$1").slice(0, 16) || "noska_user";
  const candidates = Array.from(new Set([
    `${base}_1`, `${base}_2`, `${base}_2026`, `${base}_app`, `${base}_noska`,
  ])).filter(isValidUsernameFormat);
  const available: string[] = [];
  for (const candidate of candidates) {
    if (available.length >= limit) break;
    if (await isUsernameAvailable(candidate, excludeUserId)) available.push(candidate);
  }
  return available;
}

/** Checks whether `username` is free to claim (case-insensitive, matching
 * the DB's `lower(username)` unique index). Returns `false` for
 * invalid-format input without hitting the network.
 *
 * `excludeUserId` — pass the current user's id when re-checking their own
 * existing username (e.g. replaying onboarding, or re-focusing the field
 * without changing it): without this, a user's own row would always make
 * their current username look "taken" to themselves. */
export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (!USERNAME_PATTERN.test(normalized)) return false;
  let query = supabase
    .from("user_profiles")
    .select("user_id")
    .ilike("username", normalized);
  if (excludeUserId) query = query.neq("user_id", excludeUserId);
  const { data, error } = await query.maybeSingle();
  if (error && error.code !== "42P01") throw error;
  return !data;
}

/** Sets/changes a user's username. Re-validates format and re-checks
 * availability server-side (not just trusting a prior client-side check)
 * to close the race window between an availability check and this write —
 * the DB's unique index is the final backstop if a race still slips through. */
export async function setUsername(userId: string, username: string): Promise<Tables<"user_profiles"> | null> {
  requireOwner(userId);
  const normalized = normalizeUsername(username);
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new Error("Username must be 3-20 characters: lowercase letters, numbers, or underscores, starting with a letter.");
  }
  // Exclude the caller's own row — re-saving your current username is a
  // no-op, not a collision (UI checks pass the same exclusion).
  const available = await isUsernameAvailable(normalized, userId);
  if (!available) {
    throw new Error("That username is already taken.");
  }
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ username: normalized } as Tables<"user_profiles">)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) {
    // Unique-violation race: another request claimed the same username
    // between our availability check and this write.
    if (error.code === "23505") throw new Error("That username is already taken.");
    throw error;
  }
  return data;
}

/** Resolves a `@username` to the user's id/display name for the Share
 * modal's "invite by username" flow. Returns `null` if no such username
 * exists — callers surface this as "user not found" rather than throwing,
 * since an unrecognized username is expected user input, not an error. */
export async function findUserByUsername(username: string): Promise<{ userId: string; userName: string; username: string } | null> {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, user_name, username")
    .ilike("username", normalized)
    .maybeSingle();
  if (error && error.code !== "42P01") throw error;
  if (!data || !data.username) return null;
  return { userId: data.user_id, userName: data.user_name, username: data.username };
}

export async function fetchUserProfile(userId: string): Promise<Tables<"user_profiles"> | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error && error.code !== "42P01") return null;
  return data || null;
}

/** Fields a user can edit from their own Profile view (self-service,
 * distinct from admin RPC writes). Only provided fields are updated. */
export interface UserProfilePatch {
  userName?: string;
  avatarUrl?: string | null;
  bio?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  area?: string | null;
  postalCode?: string | null;
}

/** Self-service profile update from the web app — patches only the fields
 * the caller passes, leaving onboarding/workspace/username state untouched.
 * RLS scopes writes to the owner's own row (user_profiles owner policies). */
export async function updateUserProfile(
  userId: string,
  patch: UserProfilePatch
): Promise<Tables<"user_profiles"> | null> {
  requireOwner(userId);
  const update: TablesUpdate<"user_profiles"> = { updated_at: new Date().toISOString() };
  if (patch.userName !== undefined) update.user_name = patch.userName;
  if (patch.avatarUrl !== undefined) update.avatar_url = patch.avatarUrl;
  if (patch.bio !== undefined) update.bio = patch.bio;
  if (patch.country !== undefined) update.country = patch.country;
  if (patch.state !== undefined) update.state = patch.state;
  if (patch.city !== undefined) update.city = patch.city;
  if (patch.area !== undefined) update.area = patch.area;
  if (patch.postalCode !== undefined) update.postal_code = patch.postalCode;
  const { data, error } = await supabase
    .from("user_profiles")
    .update(update)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error && error.code !== "42P01") throw error;
  return data || null;
}

/**
 * Best-effort client-side location detection used to seed a user's profile
 * location (country/state/city/area + IP) so the admin panel can do
 * city/state/area/country-wise email targeting. Never throws — callers use
 * this purely to enrich profiles; failures are swallowed and return null.
 */
export async function detectLocationFromIp(): Promise<Partial<UserProfileInput> | null> {
  try {
    const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ip?: string;
      success?: boolean;
      country?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      postal?: string;
    };
    if (!data.success) return null;
    return {
      country: data.country || null,
      state: data.region || null,
      city: data.city || null,
      postalCode: data.postal || null,
      ipAddress: data.ip || null,
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
    };
  } catch {
    return null;
  }
}

export async function upsertUserProfile(profile: UserProfileInput): Promise<Tables<"user_profiles"> | null> {
  requireOwner(profile?.userId);
  const payload: TablesInsert<"user_profiles"> = {
    user_id: profile.userId,
    user_name: profile.userName || "Workspace User",
    email: profile.email || null,
    avatar_url: profile.avatarUrl || null,
    bio: profile.bio || null,
    onboarding_complete: profile.onboardingComplete ?? false,
    use_case: profile.useCase || null,
    workspace_name: profile.workspaceName || "My Workspace",
    // `preferences` is a plain settings bag (Record<string, unknown>) on
    // the app side but the generated `Json` type is a stricter recursive
    // union — every value actually stored here is a plain
    // string/number/boolean, so this narrow cast is safe rather than
    // widening the whole payload's type.
    preferences: (profile.preferences || {}) as TablesInsert<"user_profiles">["preferences"],
  };
  // Only include `username` in the upsert when the caller explicitly
  // passed it — omitting the key here (rather than defaulting to
  // `null`/undefined) means a plain re-login upsert never clobbers a
  // username set earlier during onboarding.
  if (profile.username !== undefined) {
    payload.username = profile.username;
  }
  if (profile.country !== undefined) payload.country = profile.country;
  if (profile.state !== undefined) payload.state = profile.state;
  if (profile.city !== undefined) payload.city = profile.city;
  if (profile.area !== undefined) payload.area = profile.area;
  if (profile.postalCode !== undefined) payload.postal_code = profile.postalCode;
  if (profile.ipAddress !== undefined) payload.ip_address = profile.ipAddress;
  if (profile.latitude !== undefined) payload.latitude = profile.latitude;
  if (profile.longitude !== undefined) payload.longitude = profile.longitude;
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setOnboardingComplete(
  userId: string,
  useCase: string | null,
  workspaceName: string | null,
  username?: string | null
): Promise<void> {
  requireOwner(userId);
  const payload: TablesInsert<"user_profiles"> = {
    user_id: userId,
    onboarding_complete: true,
    use_case: useCase || null,
    workspace_name: workspaceName || "My Workspace",
    updated_at: new Date().toISOString(),
  };
  // Same "only include when explicitly provided" rule as upsertUserProfile
  // above — this function is also called by the onboarding-replay path
  // (App.tsx's handleReplayOnboarding), which shouldn't be able to clear
  // an already-set username since UsernameStep isn't shown again there.
  if (username) payload.username = normalizeUsername(username);
  const { error } = await supabase
    .from("user_profiles")
    .upsert(payload, { onConflict: "user_id" });
  if (error) {
    if (error.code === "23505") throw new Error("That username is already taken.");
    throw error;
  }
}

// ============ PAGE INVITES ============
// RLS: inviter/invitee-participant-scoped (see migration
// `create_page_invites` — inviter can read/create; only the invitee can
// accept/decline their own invite; either party can withdraw/delete).
// Distinct from `page_permissions` (a pure grant, no lifecycle) — an
// accepted invite here is what actually creates the page_permissions row
// (see acceptPageInvite below).

export type PageInviteRole = "editor" | "commenter" | "viewer";

export interface SendPageInviteInput {
  pageId: string;
  pageTitle: string;
  inviterUserId: string;
  inviterUsername?: string | null;
  inviteeUsername: string;
  role: PageInviteRole;
}

/** Sends a real invite: resolves the invitee's username to a user id,
 * refuses self-invites, and refuses re-inviting someone who already has
 * a pending invite for this page (DB unique index is the final backstop;
 * this check just gives a clean error message instead of a raw 23505). */
export async function sendPageInvite(input: SendPageInviteInput): Promise<Tables<"page_invites">> {
  requireOwner(input.inviterUserId);
  const invitee = await findUserByUsername(input.inviteeUsername);
  if (!invitee) {
    throw new Error(`No user found with username "${normalizeUsername(input.inviteeUsername)}".`);
  }
  if (invitee.userId === input.inviterUserId) {
    throw new Error("You can't invite yourself.");
  }
  const { data, error } = await supabase
    .from("page_invites")
    .insert({
      page_id: input.pageId,
      page_title: input.pageTitle || "Untitled",
      inviter_user_id: input.inviterUserId,
      inviter_username: input.inviterUsername ? normalizeUsername(input.inviterUsername) : null,
      invitee_user_id: invitee.userId,
      invitee_username: invitee.username,
      role: input.role,
      status: "pending",
    } as TablesInsert<"page_invites">)
    .select()
    .single();
  if (error) {
    if (error.code === "23505") throw new Error(`${invitee.username} already has a pending invite for this page.`);
    throw error;
  }
  return data;
}

/** Invites addressed to `userId` — powers the Inbox's "Invites" section.
 * `status` filter defaults to pending-only (what the Inbox actually needs
 * to show accept/decline actions for); pass `"all"` for a full history. */
export async function fetchPageInvites(userId: string, status: "pending" | "all" = "pending"): Promise<Tables<"page_invites">[]> {
  let query = supabase.from("page_invites").select("*").eq("invitee_user_id", userId);
  if (status === "pending") query = query.eq("status", "pending");
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error && error.code !== "42P01") return [];
  return data || [];
}

/** Invites this user has sent that are still pending — lets the Share
 * modal show "invite already pending" instead of silently re-sending. */
export async function fetchSentPageInvites(userId: string, pageId?: string): Promise<Tables<"page_invites">[]> {
  let query = supabase.from("page_invites").select("*").eq("inviter_user_id", userId).eq("status", "pending");
  if (pageId) query = query.eq("page_id", pageId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error && error.code !== "42P01") return [];
  return data || [];
}

const INVITE_ROLE_CAPS: Record<PageInviteRole, { can_view: boolean; can_edit: boolean; can_comment: boolean }> = {
  editor: { can_view: true, can_edit: true, can_comment: true },
  commenter: { can_view: true, can_edit: false, can_comment: true },
  viewer: { can_view: true, can_edit: false, can_comment: false },
};

/** Accepts a pending invite: flips its status, then grants the real
 * `page_permissions` row the rest of the app actually checks (Editor.tsx's
 * getPagePermission, etc.). Both writes use the invite's own
 * `invitee_user_id` as the actor per RLS (the invitee can update their own
 * invite row and insert their own permissions row — see the migration). */
export async function acceptPageInvite(inviteId: string, userId: string): Promise<Tables<"page_invites">> {
  requireOwner(userId);
  const { data: invite, error: fetchError } = await supabase
    .from("page_invites")
    .select("*")
    .eq("id", inviteId)
    .eq("invitee_user_id", userId)
    .single();
  if (fetchError) throw fetchError;
  if (invite.status !== "pending") {
    throw new Error("This invite has already been responded to.");
  }

  const caps = INVITE_ROLE_CAPS[invite.role as PageInviteRole] || INVITE_ROLE_CAPS.editor;
  const { error: grantError } = await supabase
    .from("page_permissions")
    .upsert(
      {
        page_id: invite.page_id,
        user_id: userId,
        user_name: invite.invitee_username,
        role: invite.role,
        ...caps,
      } as TablesInsert<"page_permissions">,
      { onConflict: "page_id,user_id" }
    );
  if (grantError) throw grantError;

  const { data, error } = await supabase
    .from("page_invites")
    .update({ status: "accepted", responded_at: new Date().toISOString() } as Tables<"page_invites">)
    .eq("id", inviteId)
    .eq("invitee_user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function declinePageInvite(inviteId: string, userId: string): Promise<void> {
  requireOwner(userId);
  const { error } = await supabase
    .from("page_invites")
    .update({ status: "declined", responded_at: new Date().toISOString() } as Tables<"page_invites">)
    .eq("id", inviteId)
    .eq("invitee_user_id", userId);
  if (error) throw error;
}

/** Withdraws a pending invite the current user sent (not one addressed
 * to them) — used by the Share modal's per-invite remove button. */
export async function withdrawPageInvite(inviteId: string, inviterUserId: string): Promise<void> {
  requireOwner(inviterUserId);
  const { error } = await supabase
    .from("page_invites")
    .delete()
    .eq("id", inviteId)
    .eq("inviter_user_id", inviterUserId);
  if (error) throw error;
}

/** Pages shared with `userId` — i.e. rows in `page_permissions` granting
 * them access to a page they don't own. Distinct from `fetchPages`
 * (owner-scoped) since shared pages must NOT be swept into the normal
 * pages array (see App.tsx's sharedPages state / the sync-ownership
 * hazard documented there): the auto-save pipeline stamps every page in
 * that array with the current user's id, which would silently steal
 * ownership of a page shared *to* them. */
export async function fetchSharedPages(userId: string): Promise<Page[]> {
  const { data: grants, error: grantError } = await supabase
    .from("page_permissions")
    .select("page_id, role, can_edit, can_comment")
    .eq("user_id", userId);
  if (grantError && grantError.code !== "42P01") return [];
  if (!grants || grants.length === 0) return [];
  const pageIds = grants.map((g) => g.page_id).filter((id): id is string => Boolean(id));
  if (pageIds.length === 0) return [];
  const { data: dbPages, error } = await supabase.from("pages").select("*").in("id", pageIds);
  if (error) throw error;
  const roleByPageId = new Map(grants.map((g) => [g.page_id, g.role]));
  return (dbPages || []).map((db) => ({
    ...mapPageFromDb(db),
    // Client-only marker (not a `pages` column — see mapPageFromDb) so
    // the UI can show a "Shared with you" badge and gate write actions
    // that don't make sense on a shared page (delete, re-share, etc.)
    // without a separate lookup.
    sharedRole: roleByPageId.get(db.id) as PageInviteRole | undefined,
  }));
}

// ============ CREATOR PROFILES ============
// RLS-adjacent: owner-scoped by user_id.

export interface CreatorProfileInput {
  userId: string;
  displayName?: string;
  photoUrl?: string;
  coverUrl?: string;
  bio?: string;
  links?: unknown[];
  payoutAccountId?: string;
  payoutStatus?: PayoutStatus;
}

export async function fetchCreatorProfile(userId: string): Promise<Tables<"creator_profiles"> | null> {
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error && error.code !== "42P01") return null;
  return data || null;
}

export async function fetchCreatorProfileById(id: string): Promise<Tables<"creator_profiles"> | null> {
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error && error.code !== "42P01") return null;
  return data || null;
}

export async function upsertCreatorProfile(profile: CreatorProfileInput): Promise<Tables<"creator_profiles"> | null> {
  requireOwner(profile?.userId);
  const { data, error } = await supabase
    .from("creator_profiles")
    .upsert(
      {
        user_id: profile.userId,
        display_name: profile.displayName || "Creator",
        photo_url: profile.photoUrl || "",
        cover_url: profile.coverUrl || "",
        bio: profile.bio || "",
        links: profile.links || [],
        payout_account_id: profile.payoutAccountId || "",
        payout_status: profile.payoutStatus || "not_setup",
      } as TablesInsert<"creator_profiles">,
      { onConflict: "user_id" }
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ============ MARKETPLACE TEMPLATES ============

export interface MarketplaceTemplateFilters {
  status?: MarketplaceTemplateStatus;
  category?: string;
  type?: MarketplaceTemplateType;
  ownerId?: string;
  search?: string;
  orderBy?: string;
  orderDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface MarketplaceTemplateInput {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  category?: string;
  language?: string;
  price?: number;
  status?: MarketplaceTemplateStatus;
  screenshots?: unknown[];
  videoUrl?: string;
  sourcePageId?: string | null;
  templateType?: MarketplaceTemplateType;
  accessLocked?: boolean;
  addCount?: number;
  rating?: number;
  ratingCount?: number;
  limit?: number;
  offset?: number;
}

export async function fetchMarketplaceTemplates(
  filters: MarketplaceTemplateFilters = {}
): Promise<Tables<"marketplace_templates">[]> {
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  let query = supabase.from("marketplace_templates").select(
    "id, title, description, category, template_type, price, owner_id, status, add_count, rating, rating_count, tags, icon, cover_image, author_name, created_at, updated_at"
  );
  if (filters.status) query = query.eq("status", filters.status);
  else query = query.eq("status", "published");
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.type) query = query.eq("template_type", filters.type);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);
  const orderCol = filters.orderBy || "add_count";
  const orderDir = filters.orderDir || "desc";
  query = query.order(orderCol, { ascending: orderDir === "asc" }).range(offset, offset + limit - 1);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as Tables<"marketplace_templates">[];
}

export async function fetchTemplateById(id: string): Promise<Tables<"marketplace_templates"> | null> {
  const { data, error } = await supabase
    .from("marketplace_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveMarketplaceTemplate(
  template: MarketplaceTemplateInput
): Promise<Tables<"marketplace_templates">> {
  requireOwner(template?.ownerId);
  const { data, error } = await supabase
    .from("marketplace_templates")
    .upsert(
      {
        id: template.id,
        owner_id: template.ownerId,
        title: template.title,
        description: template.description || "",
        category: template.category || "uncategorized",
        language: template.language || "en",
        price: template.price ?? 0,
        status: template.status || "draft",
        screenshots: template.screenshots || [],
        video_url: template.videoUrl || "",
        source_page_id: template.sourcePageId,
        template_type: template.templateType || "page_template",
        access_locked: template.accessLocked || false,
        add_count: template.addCount || 0,
        rating: template.rating || 0,
        rating_count: template.ratingCount || 0,
      } as TablesInsert<"marketplace_templates">,
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMarketplaceTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("marketplace_templates").delete().eq("id", id);
  if (error) throw error;
}

// ============ TEMPLATE ADDITIONS ============

export interface TemplateAdditionInput {
  id: string;
  templateId: string;
  workspaceId?: string;
  addedByUserId: string;
  pricePaid?: number;
  status?: TemplateAdditionStatus;
  refundEligibleUntil?: string;
}

export async function fetchTemplateAdditions(userId: string): Promise<Tables<"template_additions">[]> {
  const { data, error } = await supabase
    .from("template_additions")
    .select("*")
    .eq("added_by_user_id", userId)
    .order("added_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveTemplateAddition(
  addition: TemplateAdditionInput
): Promise<Tables<"template_additions">> {
  const { data, error } = await supabase
    .from("template_additions")
    .upsert(
      {
        id: addition.id,
        template_id: addition.templateId,
        workspace_id: addition.workspaceId || "",
        added_by_user_id: addition.addedByUserId,
        price_paid: addition.pricePaid ?? 0,
        status: addition.status || "active",
        refund_eligible_until:
          addition.refundEligibleUntil || new Date(Date.now() + 14 * 86400000).toISOString(),
      } as TablesInsert<"template_additions">,
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function requestRefund(
  additionId: string,
  reason?: string
): Promise<Tables<"template_refunds">> {
  const addition = await supabase.from("template_additions").select("*").eq("id", additionId).single();
  if (addition.error) throw addition.error;
  const { data, error } = await supabase
    .from("template_refunds")
    .insert({
      addition_id: additionId,
      template_id: addition.data.template_id,
      requester_user_id: addition.data.added_by_user_id,
      reason: reason || "",
    })
    .select()
    .single();
  if (error) throw error;
  await supabase.from("template_additions").update({ status: "refunded" }).eq("id", additionId);
  return data;
}

// ============ AGENTS ============

export interface AgentFilters {
  ownerId?: string;
  workspaceId?: string;
  type?: AgentType;
}

export interface AgentInput {
  id: string;
  ownerId: string;
  name: string;
  type?: AgentType;
  workspaceId?: string;
  description?: string;
  icon?: string;
  instructions?: string;
  model?: string;
  status?: AgentStatus;
  creditCapPerRun?: number;
  creditCapPerMonth?: number;
}

export async function fetchAgents(filters: AgentFilters = {}): Promise<Tables<"agents">[]> {
  let query = supabase.from("agents").select("*");
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.workspaceId) query = query.eq("workspace_id", filters.workspaceId);
  if (filters.type) query = query.eq("type", filters.type);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAgentById(id: string): Promise<Tables<"agents"> | null> {
  const { data, error } = await supabase.from("agents").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveAgent(agent: AgentInput): Promise<Tables<"agents">> {
  requireOwner(agent?.ownerId);
  const { data, error } = await supabase
    .from("agents")
    .upsert(
      {
        id: agent.id,
        type: agent.type || "custom",
        owner_id: agent.ownerId,
        workspace_id: agent.workspaceId || "",
        name: agent.name,
        description: agent.description || "",
        icon: agent.icon || "🤖",
        instructions: agent.instructions || "",
        model: agent.model || "default",
        status: agent.status || "active",
        credit_cap_per_run: agent.creditCapPerRun ?? 100,
        credit_cap_per_month: agent.creditCapPerMonth ?? 10000,
      } as TablesInsert<"agents">,
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAgent(id: string): Promise<void> {
  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) throw error;
}

// ============ AGENT TRIGGERS ============

export interface AgentTriggerInput {
  id: string;
  agentId: string;
  type: AgentTriggerType;
  config?: Record<string, unknown>;
}

export async function fetchAgentTriggers(agentId: string): Promise<Tables<"agent_triggers">[]> {
  const { data, error } = await supabase.from("agent_triggers").select("*").eq("agent_id", agentId);
  if (error) throw error;
  return data || [];
}

export async function saveAgentTrigger(trigger: AgentTriggerInput): Promise<Tables<"agent_triggers">> {
  const { data, error } = await supabase
    .from("agent_triggers")
    .upsert(
      {
        id: trigger.id,
        agent_id: trigger.agentId,
        type: trigger.type,
        config: trigger.config || {},
      } as TablesInsert<"agent_triggers">,
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAgentTrigger(id: string): Promise<void> {
  const { error } = await supabase.from("agent_triggers").delete().eq("id", id);
  if (error) throw error;
}

// ============ AGENT ACCESS GRANTS ============

export interface AgentAccessGrantInput {
  id: string;
  agentId: string;
  resourceType: AgentResourceType;
  resourceId: string;
  level: AgentAccessLevel;
}

export async function fetchAgentAccessGrants(agentId: string): Promise<Tables<"agent_access_grants">[]> {
  const { data, error } = await supabase.from("agent_access_grants").select("*").eq("agent_id", agentId);
  if (error) throw error;
  return data || [];
}

export async function saveAgentAccessGrant(
  grant: AgentAccessGrantInput
): Promise<Tables<"agent_access_grants">> {
  const { data, error } = await supabase
    .from("agent_access_grants")
    .upsert(
      {
        id: grant.id,
        agent_id: grant.agentId,
        resource_type: grant.resourceType,
        resource_id: grant.resourceId,
        level: grant.level,
      } as TablesInsert<"agent_access_grants">,
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAgentAccessGrant(id: string): Promise<void> {
  const { error } = await supabase.from("agent_access_grants").delete().eq("id", id);
  if (error) throw error;
}

// ============ AGENT RUN LOGS ============

export interface AgentRunLogInput {
  id: string;
  agentId: string;
  triggeredBy?: string;
  startedAt?: string;
  finishedAt?: string | null;
  stepsTaken?: number;
  creditsUsed?: number;
  resourcesRead?: unknown[];
  resourcesWritten?: unknown[];
  status?: string;
}

export async function fetchAgentRunLogs(agentId: string): Promise<Tables<"agent_run_logs">[]> {
  const { data, error } = await supabase
    .from("agent_run_logs")
    .select("*")
    .eq("agent_id", agentId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveAgentRunLog(log: AgentRunLogInput): Promise<Tables<"agent_run_logs">> {
  const { data, error } = await supabase
    .from("agent_run_logs")
    .upsert(
      {
        id: log.id,
        agent_id: log.agentId,
        triggered_by: log.triggeredBy || "",
        started_at: log.startedAt || new Date().toISOString(),
        finished_at: log.finishedAt || null,
        steps_taken: log.stepsTaken || 0,
        credits_used: log.creditsUsed || 0,
        resources_read: log.resourcesRead || [],
        resources_written: log.resourcesWritten || [],
        status: log.status || "running",
      } as TablesInsert<"agent_run_logs">,
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ MAPPERS ============

function mapPageFromDb(db: Tables<"pages">): Page {
  let userTags: unknown[] = [];
  let meta: Record<string, any> = {};

  if (Array.isArray(db.tags)) {
    for (const t of db.tags) {
      if (t && typeof t === "object" && "__pageMeta" in (t as Record<string, unknown>)) {
        meta = ((t as Record<string, unknown>).__pageMeta as Record<string, any>) || {};
      } else {
        userTags.push(t);
      }
    }
  } else if (db.tags && typeof db.tags === "object") {
    meta = ((db.tags as Record<string, unknown>).__pageMeta as Record<string, any>) || ((db.tags as Record<string, unknown>).meta as Record<string, any>) || {};
    userTags = ((db.tags as Record<string, unknown>).list as unknown[]) || [];
  }

  return {
    id: db.id,
    title: db.title || "Untitled",
    icon: db.icon || "📝",
    cover: db.cover !== undefined ? db.cover : "linear-gradient(135deg,#0f7b6c,#2dd4bf,#f4d35e)",
    parentId: db.parent_id,
    favorite: db.favorite || false,
    trashed: db.trashed || false,
    tags: userTags,
    hiddenFromRecents: db.hidden_from_recents || false,
    offline: db.offline || false,
    isEncrypted: db.is_encrypted || false,
    encryptedBlocks: db.encrypted_blocks,
    iv: db.iv,
    salt: db.salt,
    isLocked: db.is_locked || false,
    blocks: (db.blocks as unknown as Block[]) || [],
    lineage: (db.lineage as unknown as LineageEntry[]) || [],
    updatedAt: db.updated_at,
    createdAt: db.created_at,
    // Restored layout and positioning fields
    iconSize: meta.iconSize,
    iconPadding: meta.iconPadding,
    iconOffsetX: meta.iconOffsetX,
    iconOffsetY: meta.iconOffsetY,
    iconRotation: meta.iconRotation,
    iconAlign: meta.iconAlign,
    iconBg: meta.iconBg,
    iconBorderRadius: meta.iconBorderRadius,
    titleSize: meta.titleSize,
    titleWeight: meta.titleWeight,
    titleFont: meta.titleFont,
    titleAlign: meta.titleAlign,
    titleColor: meta.titleColor,
    titleTracking: meta.titleTracking,
    titleOffsetX: meta.titleOffsetX,
    titleOffsetY: meta.titleOffsetY,
    titleRotation: meta.titleRotation,
    coverPosition: meta.coverPosition,
    coverSize: meta.coverSize,
    coverHeight: meta.coverHeight,
    coverParallax: meta.coverParallax,
    coverBlur: meta.coverBlur,
    coverOverlay: meta.coverOverlay,
    coverBrightness: meta.coverBrightness,
    pageBg: meta.pageBg,
    fontStyle: meta.fontStyle,
    smallText: meta.smallText,
    fullWidth: meta.fullWidth,
    highlights: meta.highlights,
    bookmarked: meta.bookmarked,
    comments: meta.comments,
    database: meta.database,
  };
}

function mapPageToDb(page: PageInput): TablesInsert<"pages"> {
  const meta = {
    iconSize: page.iconSize,
    iconPadding: page.iconPadding,
    iconOffsetX: page.iconOffsetX,
    iconOffsetY: page.iconOffsetY,
    iconRotation: page.iconRotation,
    iconAlign: page.iconAlign,
    iconBg: page.iconBg,
    iconBorderRadius: page.iconBorderRadius,
    titleSize: page.titleSize,
    titleWeight: page.titleWeight,
    titleFont: page.titleFont,
    titleAlign: page.titleAlign,
    titleColor: page.titleColor,
    titleTracking: page.titleTracking,
    titleOffsetX: page.titleOffsetX,
    titleOffsetY: page.titleOffsetY,
    titleRotation: page.titleRotation,
    coverPosition: page.coverPosition,
    coverSize: page.coverSize,
    coverHeight: page.coverHeight,
    coverParallax: page.coverParallax,
    coverBlur: page.coverBlur,
    coverOverlay: page.coverOverlay,
    coverBrightness: page.coverBrightness,
    pageBg: page.pageBg,
    fontStyle: page.fontStyle,
    smallText: page.smallText,
    fullWidth: page.fullWidth,
    highlights: page.highlights,
    bookmarked: page.bookmarked,
    comments: page.comments,
    database: page.database,
  };

  const rawTags = Array.isArray(page.tags)
    ? page.tags.filter((t) => typeof t === "string" || (t && typeof t === "object" && !("__pageMeta" in (t as Record<string, unknown>))))
    : [];
  const tagsWithMeta = [...rawTags, { __pageMeta: meta }];

  return {
    id: page.id,
    title: page.title,
    icon: page.icon,
    cover: page.cover,
    parent_id: page.parentId || null,
    favorite: page.favorite || false,
    trashed: page.trashed || false,
    tags: tagsWithMeta as unknown as Json,
    hidden_from_recents: page.hiddenFromRecents || false,
    offline: page.offline || false,
    is_encrypted: page.isEncrypted || false,
    encrypted_blocks: page.encryptedBlocks || null,
    iv: page.iv || null,
    salt: page.salt || null,
    is_locked: page.isLocked || false,
    blocks: (page.blocks as unknown as Json) || [],
    lineage: (page.lineage as unknown as Json) || [],
  };
}

// ============ STORAGE (images, files) ============

const IMAGES_BUCKET = "images";

export async function ensureImagesBucket(): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === IMAGES_BUCKET)) {
    await supabase.storage.createBucket(IMAGES_BUCKET, { public: true });
  }
}

export async function uploadImage(file: File, userId?: string | null): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId || "anonymous"}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage.from(IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const {
    data: { publicUrl },
  } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(data.path);
  return publicUrl;
}
