/**
 * Server catalog client — availability, rollout and product-level defaults
 * come from the `widget_catalog` table (admin-managed) via the
 * get_widget_catalog() RPC, which already resolves per-user rollout.
 *
 * The catalog is cached for 5 minutes and mirrored to localStorage so the
 * dashboard renders instantly and degrades gracefully offline: on any
 * fetch failure every registry widget is treated as available (client
 * defaults), keeping the dashboard functional.
 */
import { supabase } from "../../lib/supabase";
import type { WidgetCatalogEntry } from "./types";

const CACHE_KEY = "noska:widget-catalog:v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheShape {
  at: number;
  entries: WidgetCatalogEntry[];
}

export async function fetchWidgetCatalog(): Promise<WidgetCatalogEntry[]> {
  // Serve from cache when fresh.
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as CacheShape;
      if (Date.now() - cached.at < CACHE_TTL_MS && Array.isArray(cached.entries)) {
        return cached.entries;
      }
    }
  } catch {
    /* corrupt cache — ignore, refetch */
  }

  const { data, error } = await supabase.rpc("get_widget_catalog");
  if (error || !Array.isArray(data)) {
    // Empty result means the catalog table has no rows — treat as "no
    // server overrides" rather than "nothing available".
    return [];
  }
  const entries = data as unknown as WidgetCatalogEntry[];
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), entries } satisfies CacheShape));
  } catch {
    /* storage full — non-fatal */
  }
  return entries;
}

export function clearWidgetCatalogCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
