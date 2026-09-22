import { blockFor } from "../../utils/helpers";
import type { Block } from "../../../types/blocks";
import type { ImportedPageDraft } from "./importTypes";
import { ensureUniqueTitles, mapWithConcurrency } from "./parsers";

const NOTION_VERSION = "2022-06-28";
const TOKEN_KEY = "noska_notion_token";

export function getSavedNotionToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function saveNotionToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

/** Accept a raw id ("1a2b..."), a dashed UUID, or a full notion.so URL. */
export function extractNotionId(input: string): string | null {
  const t = (input || "").trim();
  if (!t) return null;
  // URL form: .../<title>-<32hex> or .../<32hex>
  const urlMatch = t.match(/([0-9a-f]{32})(?:[?#]|$)/i) || t.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (urlMatch) return urlMatch[1].replace(/-/g, "");
  const compact = t.replace(/-/g, "");
  if (/^[0-9a-f]{32}$/i.test(compact)) return compact;
  return null;
}

function notionHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Notion throttles aggressively (~3 req/s). Retry 429s (honoring
 *  Retry-After) and transient 5xx so big imports survive throttling
 *  instead of failing halfway through. */
async function notionFetch(url: string, token: string, init?: RequestInit, tries = 4): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < tries; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { ...init, headers: notionHeaders(token) });
    } catch (e) {
      lastError = e;
      if (attempt < tries - 1) await sleep(500 * (attempt + 1));
      continue;
    }
    if (res.status === 429 && attempt < tries - 1) {
      const waitMs = Math.min(Number(res.headers.get("Retry-After") || "1") * 1000, 8000);
      await sleep(waitMs);
      continue;
    }
    if (res.status >= 500 && attempt < tries - 1) {
      await sleep(600 * (attempt + 1));
      continue;
    }
    return res;
  }
  throw lastError instanceof Error ? lastError : new Error("Notion request failed");
}

function richTextToPlain(rich: any[]): string {
  if (!Array.isArray(rich)) return "";
  return rich.map((r) => (typeof r?.plain_text === "string" ? r.plain_text : "")).join("");
}

function notionBlockToNoska(nb: any): Block[] {
  const type = nb?.type;
  const out: Block[] = [];
  const push = (b: Block) => {
    out.push(b);
  };
  switch (type) {
    case "heading_1":
      push(blockFor("h1", richTextToPlain(nb.heading_1?.rich_text)));
      break;
    case "heading_2":
      push(blockFor("h2", richTextToPlain(nb.heading_2?.rich_text)));
      break;
    case "heading_3":
      push(blockFor("h3", richTextToPlain(nb.heading_3?.rich_text)));
      break;
    case "paragraph": {
      const t = richTextToPlain(nb.paragraph?.rich_text);
      push(blockFor("text", t));
      break;
    }
    case "bulleted_list_item":
      push(blockFor("bullet", richTextToPlain(nb.bulleted_list_item?.rich_text)));
      break;
    case "numbered_list_item":
      push(blockFor("number", richTextToPlain(nb.numbered_list_item?.rich_text)));
      break;
    case "to_do": {
      const b: any = blockFor("todo", richTextToPlain(nb.to_do?.rich_text));
      if (nb.to_do?.checked) {
        b.checked = true;
        if (b.properties) b.properties.checked = true;
      }
      push(b);
      break;
    }
    case "quote":
      push(blockFor("quote", richTextToPlain(nb.quote?.rich_text)));
      break;
    case "callout": {
      const b: any = blockFor("callout", richTextToPlain(nb.callout?.rich_text));
      const icon = nb.callout?.icon?.emoji;
      if (icon && b.properties) b.properties.icon = icon;
      push(b);
      break;
    }
    case "code": {
      const b: any = blockFor("code", richTextToPlain(nb.code?.rich_text));
      if (nb.code?.language) b.language = nb.code.language;
      push(b);
      break;
    }
    case "divider":
      push(blockFor("divider"));
      break;
    case "table": {
      // Notion tables need per-row fetches; represent as a placeholder the user can expand.
      push(blockFor("callout", `Table (${nb.table?.table_width || "?"} columns) — rows import as separate blocks below.`));
      break;
    }
    case "table_row": {
      const cells: string[] = (nb.table_row?.cells || []).map((c: any) => richTextToPlain(c));
      const b: any = blockFor("text", cells.join("  |  "));
      push(b);
      break;
    }
    case "image": {
      const src = nb.image?.file?.url || nb.image?.external?.url || "";
      if (src) push(blockFor("image", src));
      break;
    }
    case "bookmark":
    case "embed": {
      const url = nb[type]?.url || "";
      if (url) push(blockFor("embed", url));
      break;
    }
    case "toggleable_heading_1":
      push(blockFor("h1", richTextToPlain(nb.toggleable_heading_1?.rich_text)));
      break;
    case "toggleable_heading_2":
      push(blockFor("h2", richTextToPlain(nb.toggleable_heading_2?.rich_text)));
      break;
    case "toggleable_heading_3":
      push(blockFor("h3", richTextToPlain(nb.toggleable_heading_3?.rich_text)));
      break;
    default: {
      // Best-effort: any block type with a rich_text array under its own key.
      const inner = nb?.[type];
      const t = inner && typeof inner === "object" ? richTextToPlain(inner.rich_text) : "";
      if (t) push(blockFor("text", t));
      break;
    }
  }
  return out;
}

async function fetchAllBlocks(token: string, blockId: string): Promise<{ blocks: any[]; truncated: boolean }> {
  const all: any[] = [];
  let truncated = false;
  let cursor: string | undefined;
  // 20 pages × 100 = 2000 blocks max per subtree; beyond that we warn
  // instead of silently dropping (callers surface `truncated`).
  for (let i = 0; i < 20; i++) {
    const url = new URL(`https://api.notion.com/v1/blocks/${blockId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);
    const res = await notionFetch(url.toString(), token);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Notion API ${res.status}: ${body.slice(0, 200) || res.statusText}`);
    }
    const data = await res.json();
    all.push(...(data.results || []));
    if (!data.has_more) break;
    cursor = data.next_cursor;
    if (!cursor) break;
    if (i === 19) truncated = true;
  }
  // Nested children (toggles, nested lists) fetch in parallel — the old
  // sequential walk made deep pages take minutes.
  await mapWithConcurrency(
    all.filter((b) => b?.has_children),
    4,
    async (b) => {
      try {
        const kids = await fetchAllBlocks(token, b.id);
        (b as any).__noskaChildren = kids.blocks;
        if (kids.truncated) truncated = true;
      } catch {
        /* a single failed subtree shouldn't kill the whole import */
      }
    }
  );
  return { blocks: all, truncated };
}

/**
 * Flatten fetched Notion blocks into Noska blocks. Groups a `table`'s
 * fetched `table_row` children into one real table block (first row =
 * header, matching the markdown importer), and turns `child_page` /
 * `child_database` references into visible placeholders instead of
 * silently dropping them — the returned `subpages` count lets callers
 * explain how to bring those in (import by URL).
 */
export function flattenNotionBlocks(list: any[]): { blocks: Block[]; subpages: number } {
  const out: Block[] = [];
  let subpages = 0;
  const walk = (nodes: any[]) => {
    for (const nb of nodes) {
      if (!nb || typeof nb !== "object") continue;
      if (nb.type === "table") {
        const rows: string[][] = ((nb as any).__noskaChildren || [])
          .filter((k: any) => k?.type === "table_row")
          .map((k: any) => (k.table_row?.cells || []).map((c: any) => richTextToPlain(c)));
        if (rows.length) {
          const b: any = blockFor("table", "");
          b.table = rows;
          out.push(b);
          continue;
        }
      }
      if (nb.type === "child_page") {
        subpages++;
        out.push(blockFor("callout", `Subpage "${nb.child_page?.title || "Untitled"}" isn't included — import it by URL to bring it in too.`));
        continue;
      }
      if (nb.type === "child_database") {
        subpages++;
        out.push(blockFor("callout", `Database "${nb.child_database?.title || "Untitled"}" isn't included — import it by URL to bring it in too.`));
        continue;
      }
      out.push(...notionBlockToNoska(nb));
      const kids = (nb as any).__noskaChildren;
      if (Array.isArray(kids) && kids.length) walk(kids);
    }
  };
  walk(list);
  return { blocks: out, subpages };
}

function pageTitleFromMeta(meta: any, fallback: string): string {
  try {
    const props = meta?.properties || {};
    for (const v of Object.values(props) as any[]) {
      if (v?.type === "title" && Array.isArray(v.title)) {
        const t = v.title.map((r: any) => r?.plain_text || "").join("").trim();
        if (t) return t;
      }
    }
    if (typeof meta?.properties?.title?.title?.[0]?.plain_text === "string") {
      const t = meta.properties.title.title.map((r: any) => r.plain_text).join("").trim();
      if (t) return t;
    }
  } catch {}
  return fallback;
}

export async function importNotionPage(
  token: string,
  pageOrDbId: string
): Promise<{ pages: ImportedPageDraft[]; warnings: string[] }> {
  const warnings: string[] = [];
  const noteTruncation = () => warnings.push("A very long page was cut at ~2000 blocks — import the rest by URL from a subpage.");
  const noteSubpages = (n: number) =>
    warnings.push(
      `${n} subpage${n > 1 ? "s" : ""} referenced but not imported — open each in Notion and import it by URL to bring ${n > 1 ? "them" : "it"} in too.`
    );
  const id = extractNotionId(pageOrDbId);
  if (!id) throw new Error("That doesn't look like a Notion page, database or URL.");
  const dashed = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;

  // Try as a page first.
  let meta: any = null;
  let isDatabase = false;
  const pageRes = await notionFetch(`https://api.notion.com/v1/pages/${dashed}`, token);
  if (pageRes.ok) {
    meta = await pageRes.json();
  } else {
    const dbRes = await notionFetch(`https://api.notion.com/v1/databases/${dashed}`, token);
    if (!dbRes.ok) {
      if (pageRes.status === 401 || dbRes.status === 401) throw new Error("Invalid Notion token — check your integration secret.");
      if (pageRes.status === 404 && dbRes.status === 404)
        throw new Error("Notion couldn't find that page/database. Share it with your integration first (··· → Add connections).");
      throw new Error(`Notion API error (${dbRes.status}). Is the integration connected to that page?`);
    }
    meta = await dbRes.json();
    isDatabase = true;
  }

  if (isDatabase) {
    // Pull rows (first 100), one Noska page per row. Row content fetches
    // run in parallel (bounded) — sequential was minutes for big tables.
    const qRes = await notionFetch(`https://api.notion.com/v1/databases/${dashed}/query`, token, {
      method: "POST",
      body: JSON.stringify({ page_size: 100 }),
    });
    if (!qRes.ok) throw new Error(`Couldn't query that database (${qRes.status}).`);
    const q = await qRes.json();
    const dbTitle = (meta?.title || []).map((r: any) => r?.plain_text || "").join("") || "Notion database";
    if (!(q.results || []).length) {
      return { pages: [{ title: dbTitle, icon: "📊", blocks: [blockFor("callout", "This database has no rows (or none are shared with the integration).")], sourceFile: `notion:${id}` }], warnings };
    }
    const rows = await mapWithConcurrency(q.results || [], 4, async (row: any) => {
      const title = pageTitleFromMeta(row, "Untitled");
      try {
        const fetched = await fetchAllBlocks(token, row.id);
        const flat = flattenNotionBlocks(fetched.blocks);
        if (fetched.truncated) noteTruncation();
        return {
          draft: {
            title,
            icon: "📝",
            blocks: flat.blocks.length ? flat.blocks : [blockFor("text", "")],
            sourceFile: `notion:${row.id}`,
          } as ImportedPageDraft,
          subpages: flat.subpages,
        };
      } catch {
        return {
          draft: { title, icon: "📝", blocks: [blockFor("callout", "Couldn't fetch this row's content — it may not be shared with the integration.")], sourceFile: `notion:${row.id}` } as ImportedPageDraft,
          subpages: 0,
        };
      }
    });
    const totalSubpages = rows.reduce((n, r) => n + r.subpages, 0);
    if (totalSubpages > 0) noteSubpages(totalSubpages);
    // Prefix row pages so they group together; de-dupe repeat row names.
    const pages = ensureUniqueTitles(
      rows.map((r) => ({ ...r.draft, title: `${dbTitle} — ${r.draft.title}`.slice(0, 120) }))
    );
    return { pages, warnings };
  }

  const title = pageTitleFromMeta(meta, "Imported from Notion");
  const fetched = await fetchAllBlocks(token, dashed);
  const flat = flattenNotionBlocks(fetched.blocks);
  if (fetched.truncated) noteTruncation();
  if (flat.subpages > 0) noteSubpages(flat.subpages);
  const blocks = flat.blocks.length ? flat.blocks : [blockFor("text", "")];
  return { pages: [{ title, icon: "📝", blocks, sourceFile: `notion:${id}` }], warnings };
}
