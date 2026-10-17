/**
 * Link sharing: access requests, approvals and forks.
 *
 * All state transitions go through Postgres RPCs so the rules live in one
 * place next to the data:
 *   - `page_access_info`              what a visitor may do with a link
 *   - `request_page_access`           visitor asks, owner is notified
 *   - `respond_page_access_request`   owner decides; approval writes the
 *                                     `page_permissions` row that makes the
 *                                     two people collaborators
 *   - `fork_page`                     independent copy, no shared state
 */
import { supabase } from "../supabase";

export type LinkAccess = "restricted" | "view" | "fork";
export type AccessRequestStatus = "pending" | "approved" | "declined" | "cancelled";
export type ShareRole = "editor" | "co-owner" | "commenter" | "viewer";

export interface PageAccessInfo {
  found: boolean;
  pageId?: string;
  isOwner: boolean;
  hasAccess: boolean;
  role: string | null;
  linkAccess: LinkAccess;
  visibility: string;
  collaboratorCount: number;
  pendingRequestId: string | null;
  pendingRole: ShareRole | null;
  canRequest: boolean;
  canFork: boolean;
  canViewLink: boolean;
  /** Null while the page is restricted and the visitor has no access. */
  title: string | null;
  icon: string | null;
}

export interface AccessRequest {
  id: string;
  page_id: string;
  requester_user_id: string;
  requester_username: string | null;
  message: string | null;
  role_requested: ShareRole;
  status: AccessRequestStatus;
  created_at: string;
  responded_at: string | null;
}

export interface PageCollaborator {
  user_id: string;
  user_name: string;
  role: string;
  can_edit: boolean;
  can_comment: boolean;
}

export interface ForkResult {
  pageId: string;
  pagesCopied: number;
  truncated: boolean;
  title: string;
}

function messageOf(error: { message?: string; code?: string } | null): string {
  if (!error) return "Something went wrong.";
  return error.message || error.code || "Something went wrong.";
}

export async function getPageAccessInfo(pageId: string): Promise<PageAccessInfo | null> {
  if (!pageId) return null;
  const { data, error } = await (supabase.rpc as any)("page_access_info", { p_page: pageId });
  if (error) throw new Error(messageOf(error));
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    found: row.found === true,
    pageId: (row.page_id as string) ?? pageId,
    isOwner: row.is_owner === true,
    hasAccess: row.has_access === true,
    role: (row.role as string) ?? null,
    linkAccess: ((row.link_access as LinkAccess) ?? "restricted"),
    visibility: (row.visibility as string) ?? "private",
    collaboratorCount: Number(row.collaborator_count ?? 0),
    pendingRequestId: (row.pending_request_id as string) ?? null,
    pendingRole: (row.pending_role as ShareRole) ?? null,
    canRequest: row.can_request === true,
    canFork: row.can_fork === true,
    canViewLink: row.can_view_link === true,
    title: (row.title as string) ?? null,
    icon: (row.icon as string) ?? null,
  };
}

export async function requestPageAccess(
  pageId: string,
  options: { message?: string | null; role?: ShareRole } = {},
): Promise<{ requestId: string }> {
  const { data, error } = await (supabase.rpc as any)("request_page_access", {
    p_page: pageId,
    p_message: options.message?.trim() ? options.message.trim() : null,
    p_role: options.role ?? "editor",
  });
  if (error) throw new Error(messageOf(error));
  const row = (data ?? {}) as Record<string, unknown>;
  return { requestId: String(row.request_id ?? "") };
}

/**
 * Withdraw a pending request. Goes through the RPC because the table's UPDATE
 * policy is owner-only: a requester must not be able to write to their own row,
 * which is exactly how a request would otherwise be self-approved.
 */
export async function cancelPageAccessRequest(requestId: string): Promise<void> {
  if (!requestId) return;
  const { error } = await (supabase.rpc as any)("cancel_page_access_request", { p_request: requestId });
  if (error) throw new Error(messageOf(error));
}

/** Pending requests the current user owns pages for. */
export async function fetchIncomingAccessRequests(pageId?: string): Promise<AccessRequest[]> {
  let query = (supabase.from as any)("page_access_requests")
    .select("id,page_id,requester_user_id,requester_username,message,role_requested,status,created_at,responded_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);
  if (pageId) query = query.eq("page_id", pageId);
  const { data, error } = await query;
  if (error) throw new Error(messageOf(error));
  return (data ?? []) as AccessRequest[];
}

export async function respondToAccessRequest(
  requestId: string,
  approve: boolean,
  role?: ShareRole,
): Promise<{ status: "approved" | "declined"; pageId: string }> {
  const { data, error } = await (supabase.rpc as any)("respond_page_access_request", {
    p_request: requestId,
    p_approve: approve,
    p_role: role ?? null,
  });
  if (error) throw new Error(messageOf(error));
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    status: (row.status as "approved" | "declined") ?? (approve ? "approved" : "declined"),
    pageId: String(row.page_id ?? ""),
  };
}

export async function fetchPageCollaborators(pageId: string): Promise<PageCollaborator[]> {
  const { data, error } = await supabase
    .from("page_permissions")
    .select("user_id,user_name,role,can_edit,can_comment")
    .eq("page_id", pageId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(messageOf(error));
  return (data ?? []) as PageCollaborator[];
}

export async function updateCollaboratorRole(
  pageId: string,
  userId: string,
  role: ShareRole,
): Promise<void> {
  const { error } = await supabase
    .from("page_permissions")
    .update({
      role,
      can_edit: role === "editor",
      can_comment: role === "editor" || role === "commenter",
      can_use_ai: role === "editor",
    })
    .eq("page_id", pageId)
    .eq("user_id", userId);
  if (error) throw new Error(messageOf(error));
}

export async function revokeCollaborator(pageId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("page_permissions")
    .delete()
    .eq("page_id", pageId)
    .eq("user_id", userId);
  if (error) throw new Error(messageOf(error));
}

/** Owner-only by way of the `pages_guard_link_access` trigger. */
export async function setPageLinkAccess(pageId: string, access: LinkAccess): Promise<void> {
  const { error } = await supabase
    .from("pages")
    .update({ link_access: access } as never)
    .eq("id", pageId);
  if (error) throw new Error(messageOf(error));
}

/**
 * Server-side copy into the caller's own pages. Returns the new root page so
 * the caller can navigate straight to it. The copy shares no rows, permissions
 * or sessions with the original, so later edits never propagate.
 */
export async function forkPage(
  pageId: string,
  options: { workspaceId?: string | null; title?: string | null } = {},
): Promise<ForkResult> {
  const { data, error } = await (supabase.rpc as any)("fork_page", {
    p_page: pageId,
    p_workspace_id: options.workspaceId ?? "",
    p_title: options.title?.trim() ? options.title.trim() : null,
  });
  if (error) throw new Error(messageOf(error));
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    pageId: String(row.page_id ?? ""),
    pagesCopied: Number(row.pages_copied ?? 1),
    truncated: row.truncated === true,
    title: String(row.title ?? ""),
  };
}

