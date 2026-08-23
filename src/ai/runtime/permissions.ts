/**
 * Noska Intelligence — Permission Gate
 *
 * Every tool call made anywhere in the intelligence platform (Noska AI,
 * agents, automations) passes through this gate before execution. Tools map
 * to coarse permission categories; each category has a mode:
 *   auto     → execute
 *   approval → pause the run and request human approval
 *   disabled → refuse with an honest error
 */

import type { PermissionCategory, PermissionMode, PermissionSpec } from "./types";
import { defaultPermissions } from "./types";

const TOOL_CATEGORY: Record<string, PermissionCategory> = {
  // Reads
  search_pages: "read",
  get_page_content: "read",
  list_pages: "read",
  list_trashed_pages: "read",
  get_page_hierarchy: "read",
  get_workspace_stats: "read",
  get_page_lineage: "read",
  analyze_page: "read",
  capabilities: "read",
  get_user_profile: "read",
  // Creates
  create_page: "create",
  create_page_from_template: "create",
  duplicate_page: "create",
  append_blocks: "update",
  add_todo: "update",
  insert_block: "update",
  // Updates
  rename_page: "update",
  update_block: "update",
  replace_content: "update",
  set_page_tags: "update",
  batch_tag: "update",
  set_page_icon: "update",
  set_page_cover: "update",
  move_page: "update",
  favorite_page: "update",
  restore_page: "update",
  undo_action: "update",
  // Deletes (and destructive moves)
  delete_blocks: "delete",
  trash_page: "delete",
  // Memory
  remember_preference: "memory",
  // External / cross-cutting
  send_notification: "external",
};

export function categoryForTool(toolName: string): PermissionCategory | null {
  return TOOL_CATEGORY[toolName] ?? null;
}

export interface GateDecision {
  allowed: boolean;
  requiresApproval: boolean;
  category: PermissionCategory | null;
  reason?: string;
}

export function evaluatePermission(toolName: string, permissions: PermissionSpec | undefined): GateDecision {
  const category = categoryForTool(toolName);
  const spec = permissions || defaultPermissions();
  if (!category) {
    // Unknown tool names are refused outright — never silently allowed.
    return { allowed: false, requiresApproval: false, category: null, reason: `Unknown tool "${toolName}"` };
  }
  const mode: PermissionMode = spec[category] ?? defaultPermissions()[category];
  if (mode === "disabled") {
    return { allowed: false, requiresApproval: false, category, reason: `Permission for "${category}" actions is disabled` };
  }
  return { allowed: true, requiresApproval: mode === "approval", category };
}

/** Human-readable permission summary for proposal cards / builder UI. */
export function describePermissions(spec: PermissionSpec): Array<{ category: PermissionCategory; mode: PermissionMode }> {
  const order: PermissionCategory[] = ["read", "create", "update", "delete", "memory", "agents", "automations", "external"];
  return order.map((category) => ({ category, mode: spec[category] }));
}
