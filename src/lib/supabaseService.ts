import { supabase } from "./supabase";
import type { Json, Tables, TablesInsert } from "../../types/supabase";
import type { Block, LineageEntry } from "../../types/blocks";
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
  cover: string | null;
  parentId: string | null;
  favorite: boolean;
  trashed: boolean;
  tags: unknown[];
  hiddenFromRecents: boolean;
  offline: boolean;
  isEncrypted: boolean;
  encryptedBlocks: string | null | undefined;
  iv: string | null | undefined;
  salt: string | null | undefined;
  isLocked: boolean;
  blocks: Block[];
  lineage: LineageEntry[];
  updatedAt: string | null;
  createdAt: string | null;
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

export async function savePage(page: PageInput, userId: string): Promise<Page> {
  requireOwner(userId);
  const dbPage = { ...mapPageToDb(page), user_id: userId };
  const { data, error } = await supabase
    .from("pages")
    .upsert(dbPage, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return mapPageFromDb(data);
}

export async function savePages(pages: PageInput[], userId: string): Promise<Page[]> {
  requireOwner(userId);
  if (!pages.length) return [];
  const dbPages = pages
    .map((p) => ({ ...mapPageToDb(p), user_id: userId }))
    .sort((a, b) => (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0));
  const { data, error } = await supabase
    .from("pages")
    .upsert(dbPages, { onConflict: "id" })
    .select();
  if (error) throw error;
  return (data || []).map(mapPageFromDb);
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

export async function saveAIChat(chat: AIChatInput, userId: string): Promise<AIChat> {
  requireOwner(userId);
  const { data, error } = await supabase
    .from("ai_chats")
    .upsert(
      {
        id: chat.id,
        name: chat.name || chat.title || "New chat",
        messages: chat.messages || [],
        pinned: chat.pinned || false,
        archived: chat.archived || false,
        chat_type: chat.chatType || "private",
        page_id: chat.pageId || null,
        page_title: chat.pageTitle || null,
        collaborators: chat.collaborators || [],
        user_id: userId,
      } as TablesInsert<"ai_chats">,
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name || "New chat",
    messages: (data.messages as unknown[]) || [],
    pinned: data.pinned || false,
    archived: data.archived || false,
    chatType: (data.chat_type as ChatType) || "private",
    pageId: data.page_id || null,
    pageTitle: data.page_title || null,
    collaborators: (data.collaborators as unknown[]) || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
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

export async function deleteAIChat(id: string): Promise<void> {
  const { error } = await supabase.from("ai_chats").delete().eq("id", id);
  if (error) throw error;
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
  onboardingComplete?: boolean;
  useCase?: string | null;
  workspaceName?: string | null;
  preferences?: Record<string, unknown>;
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

export async function upsertUserProfile(profile: UserProfileInput): Promise<Tables<"user_profiles"> | null> {
  requireOwner(profile?.userId);
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: profile.userId,
        user_name: profile.userName || "Workspace User",
        email: profile.email || null,
        avatar_url: profile.avatarUrl || null,
        onboarding_complete: profile.onboardingComplete ?? false,
        use_case: profile.useCase || null,
        workspace_name: profile.workspaceName || "My Workspace",
        preferences: profile.preferences || {},
      } as TablesInsert<"user_profiles">,
      { onConflict: "user_id" }
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setOnboardingComplete(
  userId: string,
  useCase: string | null,
  workspaceName: string | null
): Promise<void> {
  requireOwner(userId);
  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        onboarding_complete: true,
        use_case: useCase || null,
        workspace_name: workspaceName || "My Workspace",
        updated_at: new Date().toISOString(),
      } as TablesInsert<"user_profiles">,
      { onConflict: "user_id" }
    );
  if (error) throw error;
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
}

export async function fetchMarketplaceTemplates(
  filters: MarketplaceTemplateFilters = {}
): Promise<Tables<"marketplace_templates">[]> {
  let query = supabase.from("marketplace_templates").select("*");
  if (filters.status) query = query.eq("status", filters.status);
  else query = query.eq("status", "published");
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.type) query = query.eq("template_type", filters.type);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);
  const orderCol = filters.orderBy || "add_count";
  const orderDir = filters.orderDir || "desc";
  query = query.order(orderCol, { ascending: orderDir === "asc" });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
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
  return {
    id: db.id,
    title: db.title || "Untitled",
    icon: db.icon || "📝",
    cover: db.cover !== undefined ? db.cover : "linear-gradient(135deg,#0f7b6c,#2dd4bf,#f4d35e)",
    parentId: db.parent_id,
    favorite: db.favorite || false,
    trashed: db.trashed || false,
    tags: (db.tags as unknown[]) || [],
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
  };
}

function mapPageToDb(page: PageInput): TablesInsert<"pages"> {
  return {
    id: page.id,
    title: page.title,
    icon: page.icon,
    cover: page.cover,
    parent_id: page.parentId || null,
    favorite: page.favorite || false,
    trashed: page.trashed || false,
    // tags/blocks/lineage are Json columns on the DB side; the app-facing
    // Page/PageInput shapes (unknown[]/Block[]/LineageEntry[]) are more
    // precise than Json allows structurally, so this is the same
    // unknown-mediated cast used for ai_chats/ai_memory above, just in
    // the app -> DB direction instead of DB -> app.
    tags: (page.tags as unknown as Json) || [],
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
