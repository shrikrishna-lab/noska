import { useCallback, useEffect, useState } from "react";
import { supabaseAnon, isSupabaseConfigured } from "@/lib/supabase";
import { isDesktop } from "@/lib/desktop/platform";

export interface InfoCard {
  id: string;
  title: string;
  body: string;
  icon: string;
  accent: string;
  platform: string;
  dismissible: boolean;
  action_url: string | null;
  action_label: string | null;
  starts_at: string;
  ends_at: string | null;
}

const DISMISS_KEY = "noska_info_cards_dismissed";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";

interface DismissMap {
  [cardId: string]: string; // ISO date until which the card stays hidden
}

function readDismissed(): DismissMap {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "{}") as DismissMap;
  } catch {
    return {};
  }
}

function pruneDismissed(map: DismissMap): DismissMap {
  const now = Date.now();
  const next: DismissMap = {};
  for (const [id, until] of Object.entries(map)) {
    // Keep entries that still suppress (open-ended ones are kept until the
    // card itself disappears from the payload, then pruned on next pass).
    if (!until || new Date(until).getTime() > now) next[id] = until;
  }
  return next;
}

export function useInfoCards() {
  const [cards, setCards] = useState<InfoCard[]>([]);
  const [dismissed, setDismissed] = useState<DismissMap>(() => pruneDismissed(readDismissed()));

  const platform = isDesktop() ? "desktop" : "web";

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    const load = async () => {
      // Primary: public edge function (short shared cache). Fallback: direct
      // anon read through RLS in case the function is unavailable.
      let rows: InfoCard[] | null = null;
      try {
        const r = await fetch(
          `${SUPABASE_URL}/functions/v1/info-cards?platform=${platform}`,
        );
        if (r.ok) {
          const data = (await r.json()) as { cards: InfoCard[] };
          rows = data.cards ?? [];
        }
      } catch { /* fall through to direct read */ }

      if (rows === null) {
        try {
          // info_cards isn't in the generated Database types yet; use an
          // untyped query builder. RLS restricts rows to active cards inside
          // their display window, so the filters here are belt-and-braces.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const from = (supabaseAnon as unknown as { from: (t: string) => any }).from("info_cards");
          const { data, error } = await from
            .select("id, title, body, icon, accent, platform, dismissible, action_url, action_label, starts_at, ends_at")
            .eq("is_active", true)
            .lte("starts_at", new Date().toISOString())
            .or(`platform.eq.${platform},platform.eq.both`)
            .or("ends_at.is.null,ends_at.gt." + new Date().toISOString())
            .order("starts_at", { ascending: false })
            .limit(5);
          if (!error) rows = (data ?? []) as InfoCard[];
        } catch { /* leave empty */ }
      }

      if (!cancelled && rows) {
        setCards(rows);
        setDismissed((prev) => {
          const next = pruneDismissed(prev);
          // Drop entries for cards that no longer exist in the payload.
          const live = new Set(rows!.map((c) => c.id));
          const cleaned: DismissMap = {};
          for (const [id, until] of Object.entries(next)) {
            if (live.has(id)) cleaned[id] = until;
          }
          localStorage.setItem(DISMISS_KEY, JSON.stringify(cleaned));
          return cleaned;
        });
      }
    };

    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [platform]);

  const dismiss = useCallback((cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    // Non-dismissible cards never reach here. Dismissal persists for the
    // card's remaining display window (open-ended cards get a 30-day window).
    setDismissed((prev) => {
      const card = cards.find((c) => c.id === cardId);
      const until = card?.ends_at ?? new Date(Date.now() + 30 * 86400000).toISOString();
      const next = { ...prev, [cardId]: until };
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
      return next;
    });
  }, [cards]);

  const visible = cards.filter((c) => !dismissed[c.id]).slice(0, 3);
  return { cards: visible, dismiss };
}
