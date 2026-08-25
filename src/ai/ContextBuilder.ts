import { buildUserProfileContext } from './userProfile.js';
import type { Page } from '../lib/supabaseService';
import type { MemoryEntry, MemoryCache } from './memory';

// Options accepted by buildContext — inferred from every destructured
// default below, which is the closest thing this file had to a documented
// contract before.
interface BuildContextOptions {
  includeCurrentPage?: boolean;
  includeRecentPages?: boolean;
  includeConnections?: boolean;
  includeTags?: boolean;
  includeMemory?: boolean;
  includeUserProfile?: boolean;
  tokenBudget?: number;
  selectedBlocks?: { text?: string }[] | null;
  /** Pages open in other split panes — makes "the other pane" meaningful */
  openPanePages?: Page[] | null;
}

function estimateTokens(text: string) {
  return Math.ceil((text || "").length / 4);
}

function truncateToTokens(text: string, maxTokens: number) {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n...(truncated)";
}

function extractPageText(page: Page | null | undefined) {
  if (!page?.blocks) return "";
  return (page.blocks as Array<Record<string, any>>)
    .filter(b => b.text && b.type !== "database" && b.type !== "divider")
    .map(b => {
      const prefix = b.type === "h1" ? "# " :
                     b.type === "h2" ? "## " :
                     b.type === "h3" ? "### " :
                     b.type === "bullet" ? "- " :
                     b.type === "todo" ? `- [${b.checked ? "x" : " "}] ` :
                     b.type === "quote" ? "> " :
                     b.type === "callout" ? `> ${b.meta?.icon || "💡"} ` : "";
      return prefix + b.text;
    })
    .join("\n");
}

function pageSummary(page: Page | null | undefined, maxLines = 5) {
  if (!page) return "";
  const text = extractPageText(page);
  const lines = text.split("\n").filter(Boolean).slice(0, maxLines);
  return `${page.icon || "📄"} ${page.title}\n${lines.join("\n")}`;
}

function findParent(page: Page | null | undefined, allPages: Page[]) {
  if (!page?.parentId) return null;
  return allPages.find(p => p.id === page.parentId) || null;
}

function findChildren(page: Page | null | undefined, allPages: Page[]) {
  if (!page?.id) return [];
  return allPages.filter(p => p.parentId === page.id && !p.trashed).slice(0, 10);
}

function findBacklinks(page: Page | null | undefined, allPages: Page[]) {
  if (!page?.title) return [];
  const titleLower = page.title.toLowerCase();
  return allPages.filter(p => {
    if (p.id === page.id || p.trashed) return false;
    const text = extractPageText(p).toLowerCase();
    return text.includes(titleLower);
  }).slice(0, 8);
}

function findRelatedByTags(page: Page | null | undefined, allPages: Page[]) {
  if (!page?.tags?.length) return [];
  return allPages
    .filter(p => p.id !== page.id && !p.trashed && (p.tags as unknown[])?.some(t => (page.tags as unknown[]).includes(t)))
    .slice(0, 5);
}

function buildBreadcrumb(page: Page | null | undefined, allPages: Page[]) {
  const crumbs: string[] = [];
  let current = page;
  for (let i = 0; i < 10; i++) {
    if (!current?.parentId) break;
    const parent = allPages.find(p => p.id === current!.parentId);
    if (!parent) break;
    crumbs.unshift(parent.title);
    current = parent;
  }
  return crumbs;
}

function buildPageProperties(page: Page | null | undefined) {
  if (!page) return "";
  const props: string[] = [];
  if (page.icon) props.push(`Icon: ${page.icon}`);
  if ((page.tags as unknown[])?.length) props.push(`Tags: ${(page.tags as unknown[]).join(", ")}`);
  if (page.favorite) props.push("Favorited: yes");
  if (page.createdAt) props.push(`Created: ${new Date(page.createdAt).toLocaleDateString()}`);
  if (page.updatedAt) props.push(`Updated: ${new Date(page.updatedAt).toLocaleDateString()}`);
  if (page.parentId) props.push(`Has parent: yes`);
  return props.length ? props.join(" | ") : "";
}

function buildTagsOverview(allPages: Page[]) {
  const tagCounts: Record<string, number> = {};
  for (const p of allPages) {
    if (p.trashed) continue;
    for (const tag of ((p.tags as string[]) || [])) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const entries = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "";
  return entries.map(([tag, count]) => `${tag} (${count})`).join(", ");
}

/** Distinct lowercase words used for cheap relevance scoring. */
function keywordsOf(text: string): Set<string> {
  return new Set(
    String(text || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3)
  );
}

/**
 * Rank candidate pages by keyword overlap with a focus text (current page
 * title/tags/selection) before recency — so "recent pages" surfaces the
 * pages that actually matter to this request (#20 relevance over recency).
 */
function rankByRelevance(candidates: Page[], focusText: string, limit: number): Page[] {
  if (!focusText) {
    return [...candidates]
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
      .slice(0, limit);
  }
  const focus = keywordsOf(focusText);
  const scored = candidates.map((p) => {
    const pageWords = keywordsOf(`${p.title} ${((p.tags as string[]) || []).join(" ")}`);
    let overlap = 0;
    for (const w of pageWords) if (focus.has(w)) overlap += 1;
    // Recency as a tiebreaker (hours since update, smaller is better)
    const ageHours = p.updatedAt ? (Date.now() - new Date(p.updatedAt).getTime()) / 3.6e6 : 1e9;
    return { p, score: overlap * 100 - Math.min(ageHours / 24, 30) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.p);
}

export function buildContext({
  page,
  pages = [],
  options = {},
  memory = null,
  userProfile = null
}: {
  page?: Page | null;
  pages?: Page[];
  options?: BuildContextOptions;
  memory?: MemoryCache | null;
  userProfile?: string | null;
}) {
  const {
    includeCurrentPage = true,
    includeRecentPages = true,
    includeConnections = true,
    includeTags = true,
    includeMemory = true,
    includeUserProfile = true,
    tokenBudget = 4096,
    selectedBlocks = null,
    openPanePages = null
  } = options;

  const sections = [];

  // Split-pane awareness (#22): pages open in other panes are prime
  // referents for "compare these" / "the other pane" requests.
  if (openPanePages && openPanePages.length > 0) {
    const paneSummaries = openPanePages
      .filter((p) => p && p.id !== page?.id)
      .slice(0, 3)
      .map((p) => truncateToTokens(pageSummary(p, 4), 220));
    if (paneSummaries.length > 0) {
      sections.push(`## Open in Split Panes (user can see these right now)\n${paneSummaries.join("\n\n")}`);
    }
  }

  if (includeCurrentPage && page) {
    const parts = [];

    // Breadcrumb
    const breadcrumb = buildBreadcrumb(page, pages);
    if (breadcrumb.length > 0) {
      parts.push(`Breadcrumb: ${breadcrumb.join(" → ")} → **${page.title}**`);
    }

    // Properties
    const props = buildPageProperties(page);
    if (props) parts.push(props);

    // Content
    const pageText = extractPageText(page);
    const contentBudget = selectedBlocks ? Math.floor(tokenBudget * 0.3) : Math.floor(tokenBudget * 0.45);
    const content = truncateToTokens(pageText, contentBudget);
    if (content) parts.push(content);

    // Selected blocks (highest priority signal)
    if (selectedBlocks?.length > 0) {
      const selectedText = selectedBlocks
        .map(b => b.text || "")
        .filter(Boolean)
        .join("\n");
      if (selectedText) {
        const selSection = `**Selected blocks:**\n${selectedText}`;
        parts.push(truncateToTokens(selSection, Math.floor(tokenBudget * 0.15)));
      }
    }

    const section = `## Current Page: ${page.icon || "📄"} ${page.title}\n${parts.join("\n\n")}`;
    sections.push(section);
  }

  // Parent page
  if (includeConnections && page && pages.length > 0) {
    const parent = findParent(page, pages);
    if (parent) {
      sections.push(`## Parent Page\n${pageSummary(parent, 3)}`);
    }

    // Children pages
    const children = findChildren(page, pages);
    if (children.length > 0) {
      const childList = children.map(c =>
        `${c.icon || "📄"} **${c.title}**${c.tags?.length ? ` [${c.tags.join(", ")}]` : ""}`
      ).join("\n");
      sections.push(`## Child Pages (${children.length})\n${childList}`);
    }
  }

  // Connected pages: backlinks + related by tags
  if (includeConnections && page && pages.length > 0) {
    const backlinks = findBacklinks(page, pages);
    const related = findRelatedByTags(page, pages);
    const connected = [...new Map([...backlinks, ...related].map(p => [p.id, p])).values()].slice(0, 6);

    if (connected.length > 0) {
      const connectionBudget = Math.floor(tokenBudget * 0.2);
      const perPage = Math.max(Math.floor(connectionBudget / connected.length), 100);
      const summaries = connected.map(p => truncateToTokens(pageSummary(p, 3), perPage));
      const label = backlinks.length > 0 && related.length > 0
        ? "Backlinks & Related"
        : backlinks.length > 0 ? "Backlinks" : "Related by Tags";
      const section = `## ${label}\n${summaries.join("\n\n")}`;
      sections.push(section);
    }
  }

  // Recent pages — relevance-ranked against the current page/selection
  if (includeRecentPages && pages.length > 0) {
    const focusText = [page?.title, ((page?.tags as string[]) || []).join(" "), selectedBlocks?.map((b) => b.text || "").join(" ")]
      .filter(Boolean)
      .join(" ");
    const candidates = pages.filter((p) => !p.trashed && p.id !== page?.id);
    const recent = rankByRelevance(candidates, focusText, 5);

    if (recent.length > 0) {
      const recentBudget = Math.floor(tokenBudget * 0.1);
      const perPage = Math.max(Math.floor(recentBudget / recent.length), 50);
      const summaries = recent.map(p => truncateToTokens(pageSummary(p, 2), perPage));
      const section = `## Recent Pages\n${summaries.join("\n\n")}`;
      sections.push(section);
    }
  }

  // Workspace tags
  if (includeTags && pages.length > 0) {
    const overview = buildTagsOverview(pages);
    if (overview) {
      const activeCount = pages.filter(p => !p.trashed).length;
      const favoriteCount = pages.filter(p => p.favorite).length;
      sections.push(`## Workspace\n${activeCount} pages, ${favoriteCount} favorites\n\nTags: ${overview}`);
    }
  }

  // User Profile
  if (includeUserProfile && userProfile) {
    const profileText = typeof userProfile === "string" ? userProfile : buildUserProfileContext?.();
    if (profileText && profileText.length > 10) {
      sections.push(profileText);
    }
  }

  // AI Memory
  if (includeMemory && memory && Object.keys(memory).length > 0) {
    const memoryBudget = Math.floor(tokenBudget * 0.08);
    const entries = Object.entries(memory)
      .filter(([_, val]) => val._category !== "ephemeral")
      .sort((a, b) => (b[1]._importance || 0) - (a[1]._importance || 0))
      .slice(0, 6) as [string, MemoryEntry][];
    if (entries.length > 0) {
      const lines = entries.map(([key, val]) => {
        const text = val.text || val.content || JSON.stringify(val).slice(0, 120);
        return `- ${key}: ${text}`;
      });
      const section = `## AI Memory\n${lines.join("\n")}`;
      sections.push(truncateToTokens(section, memoryBudget));
    }
  }

  return sections.join("\n\n---\n\n");
}

export function buildMinimalContext(page: Page | null | undefined) {
  if (!page) return "";
  const text = extractPageText(page);
  return `Page: ${page.icon || "📄"} ${page.title}\n\n${text}`;
}

export function buildWorkspaceContext(pages: Page[], tokenBudget = 4096) {
  const active = pages.filter(p => !p.trashed);
  const perPage = Math.floor(tokenBudget / Math.max(active.length, 1));
  const summaries = active.map(p => truncateToTokens(pageSummary(p, 3), perPage));
  return `## Workspace Overview (${active.length} pages)\n\n${summaries.join("\n\n")}`;
}

export { extractPageText, pageSummary, estimateTokens };
