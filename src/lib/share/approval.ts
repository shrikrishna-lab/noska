// ── Approval gate ──────────────────────────────────────────────────────────
/**
 * Publishing gate for a page that needs sign-off.
 *
 * Deliberately separate from the role ladder: a reviewer keeps whatever role
 * they already have and is listed on the page instead. Co-owner therefore does
 * NOT imply "can approve" — a page manager approving their own change would
 * defeat the gate.
 *
 * All state transitions go through Postgres RPCs:
 *   - `page_approval_info`      state, reviewer list, my own response
 *   - `set_page_reviewers`      owner nominates reviewers
 *   - `request_page_approval`   owner opens the request
 *   - `cancel_page_approval`    owner withdraws it
 *   - `approve_page`            reviewer approves or rejects
 */
import { supabase } from "../supabase";

function messageOf(error: unknown): string {
  const e = error as { message?: string; details?: string; hint?: string } | null;
  return e?.message || e?.details || e?.hint || "Something went wrong.";
}
export type ApprovalState = "draft" | "pending_approval" | "approved" | "rejected";

export interface PageReviewer {
  user_id: string;
  user_name: string | null;
  status: "pending" | "approved" | "rejected";
  responded_at: string | null;
  note: string | null;
  /** False once the reviewer has lost access and can no longer sign off. */
  can_respond: boolean;
}

export interface PageApprovalInfo {
  approval_state: ApprovalState;
  requested_at: string | null;
  requested_by: string | null;
  my_review: { status: "pending" | "approved" | "rejected"; responded_at: string | null; note: string | null } | null;
  reviewers: PageReviewer[];
}

export async function fetchPageApproval(pageId: string): Promise<PageApprovalInfo | null> {
  const { data, error } = await (supabase.rpc as any)("page_approval_info", { p_page: pageId });
  if (error) throw new Error(messageOf(error));
  return (data as PageApprovalInfo) ?? null;
}

/**
 * Owner only. Replaces the reviewer list. Entries that can no longer read the
 * page are dropped server-side, and emptying the list resets a pending request
 * so the owner is never stranded waiting on a quorum that cannot be met.
 */
export async function setPageReviewers(
  pageId: string,
  reviewers: Array<{ userId: string; userName?: string | null }>,
): Promise<void> {
  const { error } = await (supabase.rpc as any)("set_page_reviewers", {
    p_page: pageId,
    p_user_ids: reviewers.map((r) => r.userId),
    p_user_names: reviewers.map((r) => r.userName ?? null),
  });
  if (error) throw new Error(messageOf(error));
}

export async function requestPageApproval(pageId: string): Promise<void> {
  const { error } = await (supabase.rpc as any)("request_page_approval", { p_page: pageId });
  if (error) throw new Error(messageOf(error));
}

export async function cancelPageApproval(pageId: string): Promise<void> {
  const { error } = await (supabase.rpc as any)("cancel_page_approval", { p_page: pageId });
  if (error) throw new Error(messageOf(error));
}

/** Reviewer only, and only while a request is open. */
export async function respondToApproval(
  pageId: string,
  decision: "approved" | "rejected",
  note?: string | null,
): Promise<void> {
  const { error } = await (supabase.rpc as any)("approve_page", {
    p_page: pageId,
    p_decision: decision,
    p_note: note ?? null,
  });
  if (error) throw new Error(messageOf(error));
}