import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.110.8";

export type NotificationEventType = "comment.created" | "invite.created" | "reminder.due" | "admin.sent" | "automation.run.updated" | "agent.run.updated" | "integration.updated";
export type NotificationTypeCode = "MENTION" | "COMMENT_REPLY" | "COMMENT_REACTION" | "PAGE_INVITE" | "PAGE_UPDATE" | "TASK_ASSIGNED" | "TASK_DUE" | "TASK_OVERDUE" | "REMINDER" | "DATABASE_UPDATE" | "AUTOMATION" | "AI_TASK" | "AI_COMPLETED" | "INTEGRATION" | "CONNECTOR_ERROR" | "MCP_EVENT" | "SECURITY" | "SYSTEM";
export interface NotificationEvent { type: NotificationEventType; source_id: string }
export interface NotificationRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  page_id: string | null;
  actor_id: string | null;
  type: string;
  type_code: NotificationTypeCode;
  category: string;
  title: string;
  body: string;
  priority: "low" | "normal" | "high" | "urgent";
  priority_code: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  grouping_key: string | null;
  deduplication_key: string;
  is_read: boolean;
  is_archived: boolean;
  read_at: string | null;
  archived_at: string | null;
  action_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
export interface NotificationBroadcast {
  record: NotificationRecord;
  old_record: Pick<NotificationRecord, "id" | "is_read" | "is_archived"> | null;
  operation: "INSERT" | "UPDATE";
}
type NotificationDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      create_notification_event: {
        Args: { p_event: { type: NotificationEventType; source_id: string } };
        Returns: { ids: string[] };
      };
      notification_agent_message: {
        Args: { p_run_id: string; p_owner_id: string; p_title: string; p_body: string; p_key: string; p_action_url?: string | null };
        Returns: { ids: string[] };
      };
    };
  };
};
export class NotificationEventService {
  private readonly client: SupabaseClient<NotificationDatabase>;
  constructor(url: string, serviceRoleKey: string) {
    if (!url || !serviceRoleKey) throw new Error("Notification service configuration missing");
    this.client = createClient<NotificationDatabase>(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  async create(event: NotificationEvent): Promise<{ ids: string[] }> {
    const { data, error } = await this.client.rpc("create_notification_event", { p_event: event });
    if (error) throw new Error(`Notification event failed: ${error.code}`);
    return data;
  }
  async emitRunUpdate(ownerId: string, run: { id: string; title: string; body: string; key: string; actionUrl?: string }): Promise<{ ids: string[] }> {
    const { data, error } = await this.client.rpc("notification_agent_message", {
      p_run_id: run.id, p_owner_id: ownerId, p_title: run.title, p_body: run.body, p_key: run.key,
      p_action_url: run.actionUrl ?? null,
    });
    if (error) throw new Error(`Notification event failed: ${error.code}`);
    return data;
  }
}
