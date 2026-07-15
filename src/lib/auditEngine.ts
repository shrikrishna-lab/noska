import { supabase } from "./supabase";
import type { Json, Tables, TablesInsert } from "../../types/supabase";
import type { AuditAction, PageRole } from "../../types/enums";

export interface AuditLogEvent {
  pageId: string;
  blockId?: string | null;
  userId: string;
  userName: string;
  action: AuditAction;
  blockType?: string | null;
  contentBefore?: unknown;
  contentAfter?: unknown;
  detail?: string | null;
  aiProvider?: string | null;
  aiModel?: string | null;
  aiPromptTokens?: number;
  aiCompletionTokens?: number;
  aiLatencyMs?: number;
  aiToolCalls?: unknown;
  aiCost?: number;
  aiUndoRef?: string | null;
}

export interface AuditQueryOptions {
  limit?: number;
  offset?: number;
  action?: AuditAction;
  userId?: string;
  since?: string;
  blockId?: string;
  search?: string;
}

export interface AuditSummary {
  total: number;
  byAction: Record<string, number>;
  byUser: Record<string, number>;
  aiCount: number;
  last24h: number;
}

type PagePermissionRow = Tables<"page_permissions">;

const ROLE_DEFAULTS: Record<
  PageRole,
  Pick<
    PagePermissionRow,
    "can_view" | "can_edit" | "can_comment" | "can_share" | "can_delete" | "can_audit" | "can_manage_collaborators" | "can_export" | "can_use_ai"
  >
> = {
  owner: { can_view: true, can_edit: true, can_comment: true, can_share: true, can_delete: true, can_audit: true, can_manage_collaborators: true, can_export: true, can_use_ai: true },
  admin: { can_view: true, can_edit: true, can_comment: true, can_share: true, can_delete: true, can_audit: true, can_manage_collaborators: true, can_export: true, can_use_ai: true },
  editor: { can_view: true, can_edit: true, can_comment: true, can_share: false, can_delete: false, can_audit: false, can_manage_collaborators: false, can_export: true, can_use_ai: true },
  commenter: { can_view: true, can_edit: false, can_comment: true, can_share: false, can_delete: false, can_audit: false, can_manage_collaborators: false, can_export: false, can_use_ai: false },
  viewer: { can_view: true, can_edit: false, can_comment: false, can_share: false, can_delete: false, can_audit: false, can_manage_collaborators: false, can_export: false, can_use_ai: false },
};

class AuditEngine {
  private cache = new Map<string, Tables<"audit_events">[]>();
  private pending: TablesInsert<"audit_events">[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  async log(event: AuditLogEvent): Promise<void> {
    const entry: TablesInsert<"audit_events"> = {
      page_id: event.pageId,
      block_id: event.blockId || null,
      user_id: event.userId,
      user_name: event.userName,
      action: event.action,
      block_type: event.blockType || null,
      // content_before/content_after are Json snapshots of arbitrary block
      // content at the time of the audit event; no fixed shape exists to
      // derive since any block type can be logged here. JSON.stringify/parse
      // round-trip already strips non-JSON values, so this is a safe
      // unknown-mediated cast to the Json column type, same pattern as the
      // ai_memory/ai_chats/pages casts in supabaseService.ts.
      content_before: event.contentBefore ? (JSON.parse(JSON.stringify(event.contentBefore)) as unknown as Json) : null,
      content_after: event.contentAfter ? (JSON.parse(JSON.stringify(event.contentAfter)) as unknown as Json) : null,
      detail: event.detail || null,
      ai_provider: event.aiProvider || null,
      ai_model: event.aiModel || null,
      ai_prompt_tokens: event.aiPromptTokens || 0,
      ai_completion_tokens: event.aiCompletionTokens || 0,
      ai_latency_ms: event.aiLatencyMs || 0,
      // ai_tool_calls is a Json column holding whatever tool-call payload
      // the AI provider returned; shape varies by provider/tool, so same
      // unknown-mediated Json cast as above.
      ai_tool_calls: event.aiToolCalls ? (JSON.parse(JSON.stringify(event.aiToolCalls)) as unknown as Json) : null,
      ai_cost: event.aiCost || 0,
      ai_undo_ref: event.aiUndoRef || null,
    };

    this.pending.push(entry);
    this._scheduleFlush();

    if (this.cache.has(event.pageId)) {
      this.cache.get(event.pageId)!.unshift(entry as Tables<"audit_events">);
    }
  }

  private _scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(async () => {
      this.flushTimer = null;
      await this._flushNow();
    }, 2000);
  }

  async _flushNow(): Promise<void> {
    const batch = this.pending.splice(0, this.pending.length);
    if (batch.length === 0) return;
    try {
      const { error } = await supabase.rpc("batch_insert_audit_events", { p_events: batch as never });
      if (error) console.warn("Audit flush error:", error);
    } catch (e) {
      console.warn("Audit flush failed:", e);
    }
  }

  async getPageAudit(pageId: string, options: AuditQueryOptions = {}): Promise<Tables<"audit_events">[]> {
    const cacheKey = `page:${pageId}`;
    try {
      const { data, error } = await supabase.rpc("get_page_audit_events", {
        p_page_id: pageId,
        p_block_id: options.blockId || null,
        p_action: options.action || null,
        p_user_id: options.userId || null,
        p_since: options.since || null,
        p_search: options.search || null,
        p_limit: options.limit || 50,
        p_offset: options.offset || 0,
      });
      if (error) throw error;
      const events = (data as unknown as Tables<"audit_events">[]) || [];
      this.cache.set(cacheKey, events);
      return events;
    } catch (e) {
      console.warn("Audit query failed:", e);
      return this.cache.get(cacheKey) || [];
    }
  }

  async getAIEvents(pageId: string, limit = 50): Promise<Tables<"audit_events">[]> {
    try {
      const { data } = await supabase.rpc("get_ai_audit_events", { p_page_id: pageId, p_limit: limit });
      return (data as unknown as Tables<"audit_events">[]) || [];
    } catch (e) {
      console.warn("auditEngine: getAIEvents failed", e);
      return [];
    }
  }

  async getBlockHistory(blockId: string, limit = 20): Promise<Tables<"audit_events">[]> {
    try {
      const { data } = await supabase.rpc("get_page_audit_events", {
        p_page_id: null as never,
        p_block_id: blockId,
        p_limit: limit,
      });
      return (data as unknown as Tables<"audit_events">[]) || [];
    } catch (e) {
      console.warn("auditEngine: getBlockHistory failed", e);
      return [];
    }
  }

  async getAuditSummary(pageId: string): Promise<AuditSummary> {
    try {
      const { data, error } = await supabase.rpc("get_audit_summary", { p_page_id: pageId });
      if (error) throw error;
      const summary = data as unknown as Record<string, unknown> | null;
      if (!summary) return { total: 0, byAction: {}, byUser: {}, aiCount: 0, last24h: 0 };
      return {
        total: (summary.total as number) || 0,
        byAction: (summary.byAction as Record<string, number>) || {},
        byUser: {},
        aiCount: (summary.aiCount as number) || 0,
        last24h: (summary.last24h as number) || 0,
      };
    } catch (e) {
      console.warn("auditEngine: getAuditSummary failed", e);
      return { total: 0, byAction: {}, byUser: {}, aiCount: 0, last24h: 0 };
    }
  }

  async restoreBlock(_blockId: string, targetEventId: string): Promise<unknown | null> {
    try {
      const { data } = await supabase.rpc("get_audit_event", { p_event_id: targetEventId });
      const event = data as unknown as Tables<"audit_events"> | null;
      if (!event || !event.content_after) return null;
      return event.content_after;
    } catch (e) {
      console.warn("auditEngine: restoreBlock failed", e);
      return null;
    }
  }

  async getPageVersions(pageId: string): Promise<Tables<"page_versions">[]> {
    try {
      const { data } = await supabase
        .from("page_versions")
        .select("*")
        .eq("page_id", pageId)
        .order("version_number", { ascending: false })
        .limit(50);
      return data || [];
    } catch (e) {
      console.warn("auditEngine: getPageVersions failed", e);
      return [];
    }
  }

  async saveVersion(
    pageId: string,
    title: string,
    blocks: unknown,
    userId: string,
    userName: string,
    description?: string
  ): Promise<number | null> {
    try {
      const { data: maxVer } = await supabase
        .from("page_versions")
        .select("version_number")
        .eq("page_id", pageId)
        .order("version_number", { ascending: false })
        .limit(1);
      const versionNumber = (maxVer?.[0]?.version_number || 0) + 1;

      const { error } = await supabase.from("page_versions").insert({
        page_id: pageId,
        version_number: versionNumber,
        title,
        blocks: blocks as never,
        page_snapshot: { blocks, title } as never,
        user_id: userId,
        user_name: userName,
        description: description || `Version ${versionNumber}`,
      });
      if (error) throw error;
      return versionNumber;
    } catch (e) {
      console.warn("Save version failed:", e);
      return null;
    }
  }

  async restoreVersion(
    _pageId: string,
    versionId: string
  ): Promise<{ blocks: unknown; title: string | null; pageSnapshot: unknown } | null> {
    try {
      const { data: version } = await supabase.from("page_versions").select("*").eq("id", versionId).single();
      if (!version) return null;
      return { blocks: version.blocks, title: version.title, pageSnapshot: version.page_snapshot };
    } catch (e) {
      console.warn("auditEngine: restoreVersion failed", e);
      return null;
    }
  }

  async getPermissions(pageId: string): Promise<PagePermissionRow[]> {
    try {
      const { data } = await supabase.from("page_permissions").select("*").eq("page_id", pageId);
      return data || [];
    } catch (e) {
      console.warn("auditEngine: getPermissions failed", e);
      return [];
    }
  }

  async setPermission(
    pageId: string,
    userId: string,
    userName: string,
    role: PageRole,
    options: Partial<PagePermissionRow> = {}
  ): Promise<void> {
    try {
      const perms = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.editor;

      const { error } = await supabase.from("page_permissions").upsert(
        {
          page_id: pageId,
          user_id: userId,
          user_name: userName,
          role,
          ...perms,
          ...options,
        } as TablesInsert<"page_permissions">,
        { onConflict: "page_id,user_id" }
      );
      if (error) throw error;

      await this.log({
        pageId,
        userId,
        userName,
        action: "permission_change",
        detail: `Set role "${role}" for ${userName}`,
      });
    } catch (e) {
      console.warn("Set permission failed:", e);
    }
  }

  async removePermission(pageId: string, userId: string): Promise<void> {
    try {
      await supabase.from("page_permissions").delete().eq("page_id", pageId).eq("user_id", userId);
    } catch (e) {
      console.warn("auditEngine: removePermission failed", e);
    }
  }
}

const auditInstance = new AuditEngine();

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    auditInstance._flushNow();
  });
}

export const auditEngine = auditInstance;
