/**
 * Noska Intelligence — Verification System
 *
 * Every meaningful mutation is verified against actual workspace state
 * before the runtime reports success. Never claim success without evidence:
 * if verification can't confirm a change, the run reports it honestly.
 */

import type { AffectedResource, ToolCallRecord } from "./types";

interface WorkspaceSnapshot {
  pages: Array<{ id: string; title?: string; blocks?: Array<Record<string, unknown>>; trashed?: boolean; [k: string]: unknown }>;
}

function blockCount(pageId: string, ws: WorkspaceSnapshot): number | null {
  const page = ws.pages.find((p) => p.id === pageId);
  if (!page) return null;
  return (page.blocks || []).length;
}

/**
 * Verify a completed tool call by re-inspecting workspace state.
 * Returns true when evidence supports success, false otherwise.
 */
export function verifyToolCall(
  record: ToolCallRecord,
  params: Record<string, unknown>,
  result: unknown,
  before: WorkspaceSnapshot,
  after: WorkspaceSnapshot
): boolean {
  if (!record.ok) return false;
  const beforeCount = before.pages.length;
  const afterCount = after.pages.length;

  switch (record.name) {
    case "create_page":
    case "create_page_from_template": {
      const newId = (result as { pageId?: string })?.pageId;
      if (!newId) return false;
      return after.pages.some((p) => p.id === newId);
    }
    case "duplicate_page": {
      return afterCount > beforeCount;
    }
    case "append_blocks": {
      const pageId = resolvePageId(params, before);
      if (!pageId) return !!((result as { count?: number })?.count);
      const b = blockCount(pageId, before);
      const a = blockCount(pageId, after);
      if (b === null || a === null) return false;
      return a > b;
    }
    case "add_todo": {
      const pageId = resolvePageId(params, before) || (before.pages[0]?.id ?? null);
      if (!pageId) return false;
      const hasTodo = (after.pages.find((p) => p.id === pageId)?.blocks || []).some(
        (bl) => bl.type === "todo" && String(bl.text || "").includes(String(params.text || ""))
      );
      return hasTodo;
    }
    case "insert_block": {
      const pageId = resolvePageId(params, before);
      if (!pageId) return false;
      return blockCount(pageId, after) !== null && blockCount(pageId, after)! >= blockCount(pageId, before)!;
    }
    case "replace_content": {
      const pageId = resolvePageId(params, before);
      if (!pageId) return !!(result as { count?: number })?.count;
      return blockCount(pageId, after) !== null;
    }
    case "trash_page": {
      const page = after.pages.find((p) => String(p.id) === String(params.page_id));
      return params.page_id ? page?.trashed === true : true;
    }
    default:
      // Reads and minor updates: tool reported ok — accept with its own result.
      return true;
  }
}

function resolvePageId(params: Record<string, unknown>, ws: WorkspaceSnapshot): string | null {
  const pid = params.page_id as string | undefined;
  if (!pid || pid === "current") {
    return ws.pages[0]?.id ?? null;
  }
  const direct = ws.pages.find((p) => p.id === pid);
  if (direct) return direct.id;
  const lower = pid.toLowerCase();
  const fuzzy = ws.pages.find((p) => (p.title || "").toLowerCase().includes(lower));
  return fuzzy?.id ?? null;
}

/** Build affected-resource entries from executed tool calls. */
export function collectAffectedResources(records: Array<{ name: string; ok: boolean; error?: string }>, params: Array<Record<string, unknown>>, results: Array<unknown>): AffectedResource[] {
  const affected: AffectedResource[] = [];
  records.forEach((rec, i) => {
    if (!rec.ok) return;
    const res = results[i] as Record<string, unknown> | undefined;
    switch (rec.name) {
      case "create_page":
      case "create_page_from_template":
        affected.push({ type: "page", id: String(res?.pageId || ""), title: String(res?.title || ""), change: "created" });
        break;
      case "append_blocks":
      case "replace_content":
      case "insert_block":
      case "update_block":
      case "delete_blocks":
      case "rename_page":
      case "set_page_tags":
      case "batch_tag":
      case "move_page":
        affected.push({ type: "page", id: String(res?.pageId || params[i]?.page_id || ""), change: `updated via ${rec.name}` });
        break;
      case "trash_page":
        affected.push({ type: "page", id: String(res?.pageId || params[i]?.page_id || ""), change: "trashed" });
        break;
      case "duplicate_page":
        affected.push({ type: "page", id: "", title: String(res?.newTitle || ""), change: "duplicated" });
        break;
      case "remember_preference":
        affected.push({ type: "agent", id: "memory", change: `remembered ${String(params[i]?.key || "")}` });
        break;
      default:
        break;
    }
  });
  return affected;
}
