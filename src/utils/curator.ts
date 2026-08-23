/* ─── Workspace curator ───
 *
 * Deterministic knowledge-hygiene checks over the live page set —
 * duplicates, orphans, stale and empty pages. No AI, no fake findings:
 * every issue is derivable from the data itself. Powers the
 * "Workspace Health" panel.
 */

import { getBacklinks, getOutgoingLinks } from "./pageLinks";
import type { Page } from "../lib/supabaseService";

export type CuratorIssueKind = "duplicate" | "orphan" | "stale" | "empty";

export interface CuratorIssue {
  kind: CuratorIssueKind;
  pageIds: string[];
  label: string;
  detail: string;
}

const STALE_DAYS = 90;

export function curateWorkspace(pages: Page[], nowMs: number = Date.now()): CuratorIssue[] {
  const issues: CuratorIssue[] = [];
  const live = pages.filter((p) => !p.trashed);

  // Duplicates — identical normalized titles.
  const byTitle = new Map<string, Page[]>();
  for (const p of live) {
    const key = (p.title || "").trim().toLowerCase();
    if (!key) continue;
    byTitle.set(key, [...(byTitle.get(key) ?? []), p]);
  }
  for (const [, group] of byTitle) {
    if (group.length > 1) {
      issues.push({
        kind: "duplicate",
        pageIds: group.map((p) => p.id),
        label: `Duplicate title: “${group[0].title || "Untitled"}”`,
        detail: `${group.length} pages share this title — merge or rename to keep search clean.`,
      });
    }
  }

  // Orphans — no parent, no tags, no links in either direction.
  for (const p of live) {
    const hasParent = Boolean(p.parentId);
    const hasTags = Array.isArray(p.tags) && p.tags.length > 0;
    if (hasParent || hasTags) continue;
    const backlinks = getBacklinks(p.id, pages);
    const outgoing = getOutgoingLinks(p.id, pages);
    if (backlinks.length === 0 && outgoing.length === 0 && live.length > 3) {
      issues.push({
        kind: "orphan",
        pageIds: [p.id],
        label: `Orphan: “${p.title || "Untitled"}”`,
        detail: "Not linked to anything and linked from nowhere. Tag it, link it, or archive it.",
      });
    }
  }

  // Stale — untouched for 90+ days but not favorited.
  for (const p of live) {
    if (p.favorite) continue;
    const updated = new Date(p.updatedAt as string).getTime();
    if (!updated) continue;
    if (nowMs - updated > STALE_DAYS * 86_400_000) {
      issues.push({
        kind: "stale",
        pageIds: [p.id],
        label: `Stale: “${p.title || "Untitled"}”`,
        detail: `Untouched for ${Math.floor((nowMs - updated) / 86_400_000)} days.`,
      });
    }
  }

  // Empty — nothing written yet.
  for (const p of live) {
    if ((p.blocks?.length ?? 0) > 0) continue;
    issues.push({
      kind: "empty",
      pageIds: [p.id],
      label: `Empty: “${p.title || "Untitled"}”`,
      detail: "Created but never written.",
    });
  }

  return issues;
}
