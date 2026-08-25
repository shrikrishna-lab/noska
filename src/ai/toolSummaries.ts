/**
 * Noska Intelligence — Tool Result Summarization
 *
 * Shared helpers so every surface (AI panel, chat panel, agents UI)
 * presents tool outcomes as honest human actions instead of raw JSON (#14).
 */

/** Destructive actions always require explicit user confirmation (#15). */
export const DESTRUCTIVE_TOOLS = new Set(["trash_page", "delete_blocks"]);

/** Human-readable labels so tool outcomes read like actions, not APIs. */
export const TOOL_LABELS: Record<string, string> = {
  create_page: "Created page",
  rename_page: "Renamed page",
  append_blocks: "Appended content",
  add_todo: "Added task",
  search_pages: "Searched pages",
  get_page_content: "Read page",
  list_pages: "Listed pages",
  set_page_tags: "Set tags",
  replace_content: "Replaced content",
  insert_block: "Inserted block",
  delete_blocks: "Deleted blocks",
  update_block: "Updated block",
  undo_action: "Undid last action",
  get_page_hierarchy: "Read hierarchy",
  get_workspace_stats: "Checked workspace",
  favorite_page: "Updated favorite",
  trash_page: "Moved to trash",
  restore_page: "Restored page",
  duplicate_page: "Duplicated page",
  list_trashed_pages: "Listed trash",
  batch_tag: "Batch-tagged pages",
  get_page_lineage: "Read history",
  create_page_from_template: "Created from template",
  remember_preference: "Remembered preference",
  get_user_profile: "Recalled profile",
  set_page_icon: "Set icon",
  set_page_cover: "Set cover",
  move_page: "Moved page",
  analyze_page: "Analyzed page",
  send_notification: "Sent notification",
  create_flashcards: "Created study cards",
};

/** Compact, honest one-line summary of a tool result (never raw JSON). */
export function describeToolResult(name: string, ok: boolean, result?: unknown, error?: unknown): string {
  const label = TOOL_LABELS[name] || name.replace(/_/g, " ");
  if (!ok) return `✕ ${label} — failed${error ? ` (${String(error).slice(0, 120)})` : ""}`;
  const r = result as Record<string, unknown> | undefined;
  if (!r || typeof r !== "object") return `✓ ${label}`;
  if (typeof r.count === "number") {
    // Surface the most useful identifiers for search/list results
    if ((name === "search_pages" || name === "list_pages") && Array.isArray(r.results || r.pages)) {
      const items = (r.results || r.pages) as Array<{ title?: string }>;
      const titles = items.slice(0, 5).map((p) => p.title).filter(Boolean);
      return `✓ ${label} — ${r.count} match(es)${titles.length ? `: ${titles.join(", ")}` : ""}`;
    }
    return `✓ ${label} — ${r.count}`;
  }
  if (r.title && typeof r.title === "string") return `✓ ${label} — "${r.title}"`;
  if (r.page && typeof r.page === "string") return `✓ ${label} — "${r.page}"`;
  return `✓ ${label}`;
}
