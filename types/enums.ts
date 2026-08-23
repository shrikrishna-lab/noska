// String-literal union types for columns that the generated Supabase types
// (types/supabase.ts) leave as plain `string` because no Postgres enum
// exists for them yet — the schema was written with free-text status/type
// columns. Each union below was inferred by grepping the current .jsx/.js
// code for every literal value actually assigned to or compared against
// the corresponding field. Nothing here was guessed; if a value wasn't
// found in the codebase, it isn't included.
//
// NOTE: these are best-effort based on the literals present in the
// codebase today. Because there's no DB-level CHECK constraint or enum
// backing these columns, the database will accept values outside these
// unions — these types describe application-level intent, not a
// database-enforced guarantee.

/** agents.status — src/features/agents/AgentWorkspace.jsx toggles
 * 'active' <-> 'paused'; installed agents start 'paused'. No other status
 * value appears anywhere in current code. */
export type AgentStatus = "active" | "paused";

/** agents.type — 'custom' is assigned by the agent builder; 'template' is
 * used when an agent is installed from the Agent Directory. */
export type AgentType = "custom" | "template";

/** agent_triggers.type — trigger kinds offered by the agent builder
 * (src/features/agents/AgentWorkspace.tsx). */
export type AgentTriggerType =
  | "mention"
  | "reaction"
  | "property_change"
  | "schedule"
  | "new_email"
  | "calendar_event";

/** agent_access_grants.resource_type — options rendered in the resource
 * type <select> in src/features/agents/AgentWorkspace.jsx. */
export type AgentResourceType = "page" | "database" | "workspace";

/** agent_access_grants.level — options rendered in the access level
 * <select> in src/features/agents/AgentWorkspace.jsx. */
export type AgentAccessLevel = "view" | "full";

/** agent_run_logs.status — the only literal ever assigned in current code
 * (supabaseService.js saveAgentRunLog) is 'running'. However, the table
 * also has `finished_at` and `credits_used` columns, which strongly imply
 * a real lifecycle (e.g. completed/failed/cancelled) that the app just
 * hasn't started writing yet. Locking this to a single-value union would
 * misrepresent it as a closed enum when the evidence is incomplete —
 * left as a documented `string` instead of guessing the other states. */
export type AgentRunStatus = string;

/** ai_chats.chat_type — literals compared against in
 * src/components/ai/ChatSidebar.jsx ('shared', 'collab') plus the
 * "private" default used in supabaseService.js when saving a chat. */
export type ChatType = "private" | "shared" | "collab";

/** creator_profiles.payout_status — default assigned in
 * supabaseService.js (upsertCreatorProfile) is 'not_setup'. No other
 * value is assigned/compared anywhere in current code. */
export type PayoutStatus = "not_setup";

/** marketplace_templates.status — literals compared against in
 * src/features/creator/CreatorDashboard.jsx ('published', 'draft',
 * 'in_review') plus the 'draft' default assigned on publish, and the
 * 'published' default query filter in supabaseService.js
 * (fetchMarketplaceTemplates). */
export type MarketplaceTemplateStatus = "draft" | "in_review" | "published";

/** marketplace_templates.template_type — the only literal ever assigned
 * (supabaseService.js saveMarketplaceTemplate default) is
 * 'page_template'. */
export type MarketplaceTemplateType = "page_template";

/** template_additions.status — 'active' assigned on install
 * (src/features/marketplace/MarketplacePage.jsx, supabaseService.js
 * default) and 'refunded' assigned in requestRefund(). */
export type TemplateAdditionStatus = "active" | "refunded";

/** collaboration_sessions.status / the `status` field broadcast via
 * realtimeCollab.updateStatus — only 'viewing' is assigned anywhere in
 * current code (src/lib/realtimeCollab.js joinPage default track call).
 * usePresence.js's `ownStatus` local state also defaults to 'viewing' but
 * nothing else in the app currently sets a different value. */
export type CollaborationStatus = "viewing";

/** page_permissions.role — the full fixed set of roles the permission
 * defaults table in src/lib/auditEngine.js (setPermission) recognizes.
 * Any role string not in this list falls back to the 'editor' defaults
 * at runtime, so these five are the only roles the app actually models. */
export type PageRole = "owner" | "admin" | "editor" | "commenter" | "viewer";

/** audit_events.action — every literal string passed as `action` to
 * auditEngine.log(...) across the app (src/App.jsx, src/components/AIPanel.jsx,
 * src/lib/auditEngine.js). This is intentionally broader than any single
 * file's usage since audit_events is written from many call sites. */
export type AuditAction =
  | "edit"
  | "ai_edit"
  | "ai_generated"
  | "delete"
  | "rename"
  | "trashed"
  | "permission_change";

/** page.lineage[].action — the separate, page-local lineage history
 * stored inside the `pages` JSON blob (NOT the audit_events table).
 * Values collected from src/App.jsx and
 * src/onboarding/services/onboardingService.js. Kept distinct from
 * AuditAction above since the two are unrelated fields on different
 * records that happen to share a "history event action" shape. */
export type LineageAction =
  | "created"
  | "edited"
  | "moved"
  | "trashed"
  | "restored"
  | "template"
  | "duplicated"
  | "ai-created"
  // "ai_generated" (underscore, distinct from "ai-created" above) is a
  // real second literal — src/App.tsx's updatePage() pushes it when a
  // page's block count increases via a patch (used for both real AI
  // edits and any bulk block-add through the same code path). Found via
  // grep during Phase 4 Tier 2 (App.tsx conversion); missing from the
  // original enum sweep.
  | "ai_generated";
