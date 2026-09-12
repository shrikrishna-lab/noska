/**
 * Layout persistence — Supabase (`widget_layouts`, owner-scoped RLS) with
 * a localStorage mirror. Reads prefer the server so a layout follows the
 * user across desktop/web installs; writes are optimistic (mirror first,
 * debounced RPC, server wins on next load).
 */
import { supabase } from "../../lib/supabase";
import type { Json } from "../../../types/supabase";
import type { WidgetLayout } from "./types";

const MIRROR_KEY = "noska:widget-layout:v1";
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function readLocalLayout(): WidgetLayout | null {
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.widgets)) return parsed as WidgetLayout;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeLocalLayout(layout: WidgetLayout): void {
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

export async function fetchServerLayout(workspaceId: string): Promise<WidgetLayout | null> {
  const { data, error } = await supabase.rpc("get_widget_layout", { p_workspace_id: workspaceId });
  if (error) return null;
  const parsed = data as unknown;
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as WidgetLayout).widgets)) {
    return parsed as WidgetLayout;
  }
  return null;
}

export function queueSaveLayout(layout: WidgetLayout, workspaceId: string): void {
  writeLocalLayout(layout);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void saveLayoutNow(layout, workspaceId).catch((err) =>
      console.warn("[widgets] layout save failed", err),
    );
  }, 800);
}

export async function saveLayoutNow(layout: WidgetLayout, workspaceId: string): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  writeLocalLayout(layout);
  const { error } = await supabase.rpc("save_widget_layout", {
    p_workspace_id: workspaceId,
    p_layout: layout as unknown as Json,
  });
  if (error) console.warn("[widgets] layout save failed", error.message);
}
