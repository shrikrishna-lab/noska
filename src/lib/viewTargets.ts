/**
 * Canonical registry of Noska app views that agents (AI panel, voice agent,
 * automations) may navigate to. Single source of truth so the `open_view`
 * tool, intent rules, voice agent commands, and the deterministic navigation
 * fast-path all agree on names.
 */

export interface ViewTarget {
  id: string;
  label: string;
  aliases: string[];
}

/** ids match the appView values handled by WorkspaceViews/Sidebar. */
export const VIEW_TARGETS: ViewTarget[] = [
  { id: "home", label: "Home", aliases: ["home", "dashboard", "start"] },
  { id: "inbox", label: "Inbox", aliases: ["inbox", "notification center", "notifications"] },
  { id: "calendar", label: "Calendar", aliases: ["calendar", "schedule", "agenda"] },
  { id: "tasks", label: "My Tasks", aliases: ["tasks", "task", "my tasks", "todo", "todos", "to-dos", "to do list", "my todos"] },
  { id: "chats", label: "Chats", aliases: ["chats", "chat", "messages"] },
  { id: "meetings", label: "Meetings", aliases: ["meetings", "meeting"] },
  { id: "meetingNote", label: "Meeting Notes", aliases: ["meeting notes", "meeting note"] },
  { id: "library", label: "Library", aliases: ["library"] },
  { id: "shared", label: "Shared", aliases: ["shared", "shared with me"] },
  { id: "daily", label: "Today", aliases: ["daily", "today", "journal", "diary", "daily notes"] },
  { id: "commandCenter", label: "Command Center", aliases: ["command center", "commandcenter", "control center"] },
  { id: "agents", label: "Agents", aliases: ["agents", "agent"] },
  { id: "automations", label: "Automations", aliases: ["automations", "automation", "workflows", "workflow"] },
  { id: "marketplace", label: "Marketplace", aliases: ["marketplace"] },
  { id: "creator", label: "Creator Dashboard", aliases: ["creator", "creator dashboard"] },
  { id: "canvas", label: "Canvas", aliases: ["canvas", "whiteboard"] },
  { id: "graph", label: "Graph", aliases: ["graph", "graph view", "knowledge graph"] },
  { id: "companyHome", label: "Company Workspace", aliases: ["company", "company workspace", "company home", "teamspace"] },
  // Trash/settings open modals rather than app views; App's openView action maps them.
  { id: "trash", label: "Trash", aliases: ["trash", "bin", "recycle bin", "deleted pages"] },
  { id: "settings", label: "Settings", aliases: ["settings", "preferences"] },
];

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const LOOKUP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const t of VIEW_TARGETS) {
    const keys = [t.id, t.label, ...t.aliases];
    for (const key of keys) {
      const n = normalize(key);
      if (n && !map.has(n)) map.set(n, t.id);
    }
  }
  return map;
})();

/** Display label for a view id (falls back to the id itself). */
export function viewLabel(viewId: string): string {
  return VIEW_TARGETS.find((t) => t.id === viewId)?.label || viewId;
}

/**
 * Resolve a free-text view name ("my tasks", "the calendar") to a view id.
 * Tolerant: exact alias match first, then a contained-alias match (longest
 * alias wins) so model-emitted params like "the inbox view" still resolve.
 */
export function resolveViewTarget(query: string): string | null {
  const q = normalize(query || "");
  if (!q) return null;
  const exact = LOOKUP.get(q);
  if (exact) return exact;
  let best: { id: string; len: number } | null = null;
  for (const [alias, id] of LOOKUP) {
    if (alias.length > 2 && q.includes(alias) && (!best || alias.length > best.len)) {
      best = { id, len: alias.length };
    }
  }
  return best?.id ?? null;
}

/**
 * Strict resolution: only an exact alias match. Used by the deterministic
 * fast-path so multi-word requests like "open shared with the team" never
 * hijack navigation on a contained word.
 */
export function resolveViewExact(query: string): string | null {
  return LOOKUP.get(normalize(query || "")) || null;
}

export interface FastNavigation {
  kind: "view" | "page";
  view?: string;
  pageId?: string;
  pageTitle?: string;
}

/** Title-match scoring shared with the voice agent (same thresholds). */
function scoreTitleMatch(query: string, title: string): number {
  const target = query.toLowerCase().trim();
  const candidate = title.toLowerCase().trim();
  if (!target || !candidate) return 0;
  if (candidate === target) return 100;
  if (candidate.startsWith(target)) return 85;
  if (candidate.includes(target)) return 70;
  const words = new Set(target.split(/\s+/));
  const overlap = candidate.split(/\s+/).filter((w) => words.has(w)).length;
  return overlap ? Math.round((overlap / words.size) * 60) : 0;
}

const NAV_LEAD = /^(?:please\s+)?(?:open|show|display|go\s*to|switch\s*to|navigate\s*to|take\s*me\s*to|jump\s*to)\s+/i;
const PAGE_NOUN = /^(?:the\s+|my\s+)?(?:page|note|document)\s+(.+?)[.?!]?$/i;
const PAGE_NOUN_TAIL = /^(?:the\s+|my\s+)?(.+?)\s+(?:page|note|document)[.?!]?$/i;
/** Politeness wrappers people actually say: "can you open my inbox". */
const COURTESY_LEAD = /^(?:(?:hey|ok|okay)\s+)?(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+)(?:please\s+)?/i;

/** Strip politeness wrappers so command matching sees the bare request. */
export function stripCourtesyPhrases(text: string): string {
  return text.replace(COURTESY_LEAD, "").trim();
}

/**
 * Deterministic navigation matcher for chat/voice input. Fires ONLY on clean
 * navigation commands ("open inbox", "go to my tasks", "open page X") so real
 * agentic work ("open the calendar and add a meeting") is never hijacked.
 * `pages` enables exact/fuzzy page-title matches for "open page X".
 */
export function matchNavigationCommand(
  text: string,
  pages?: Array<{ id: string; title: string; trashed?: boolean }>
): FastNavigation | null {
  let input = (text || "").trim();
  if (!input || input.length > 60) return null;
  input = stripCourtesyPhrases(input);
  if (!input || !NAV_LEAD.test(input)) return null;
  const rest = input.replace(NAV_LEAD, "").replace(/[.?!]+$/, "").trim();
  if (!rest || /^(?:a |an |the )?(?:new|blank)\b/i.test(rest)) return null;

  const exactView = resolveViewExact(rest);
  if (exactView) return { kind: "view", view: exactView };

  // Explicit page noun before the title ("open page meeting notes")
  const pageMatch = rest.match(PAGE_NOUN);
  if (pageMatch?.[1] && pages) {
    const query = pageMatch[1].trim();
    const best = pages
      .filter((p) => !p.trashed)
      .map((p) => ({ p, score: scoreTitleMatch(query, p.title) }))
      .filter(({ score }) => score >= 70)
      .sort((a, b) => b.score - a.score)[0];
    if (best) return { kind: "page", pageId: best.p.id, pageTitle: best.p.title };
    return null;
  }

  // Page noun after the title ("open the roadmap page") — near-exact only
  const tailMatch = rest.match(PAGE_NOUN_TAIL);
  if (tailMatch?.[1] && pages) {
    const query = tailMatch[1].trim();
    const best = pages
      .filter((p) => !p.trashed)
      .map((p) => ({ p, score: scoreTitleMatch(query, p.title) }))
      .filter(({ score }) => score >= 85)
      .sort((a, b) => b.score - a.score)[0];
    if (best) return { kind: "page", pageId: best.p.id, pageTitle: best.p.title };
    return null;
  }

  // Bare remainder ("open roadmap 2026"): only near-exact title matches
  // (≥ 85) qualify — fuzzy word-overlap is left to the agentic search flow.
  if (pages) {
    const best = pages
      .filter((p) => !p.trashed)
      .map((p) => ({ p, score: scoreTitleMatch(rest, p.title) }))
      .filter(({ score }) => score >= 85)
      .sort((a, b) => b.score - a.score)[0];
    if (best) return { kind: "page", pageId: best.p.id, pageTitle: best.p.title };
  }
  return null;
}
