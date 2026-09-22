import JSZip from "jszip";
import { blockFor, uid } from "../../utils/helpers";
import type { Block } from "../../../types/blocks";
import type { ImportedPageDraft, ParsedImport } from "./importTypes";

/* ─── shared helpers ─── */

/** Bounded-parallel map: preserves order, never runs more than `limit`
 *  tasks at once. Used for ZIP entry reads and Notion child fetches so big
 *  imports go fast without spiking memory or tripping rate limits. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workerCount = Math.max(1, Math.min(Math.max(1, limit), Math.max(1, items.length)));
  const workers = new Array(workerCount).fill(null).map(async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/** De-duplicate page titles ("Notes", "Notes (2)", "Notes (3)") so ZIP /
 *  multi-file imports never produce indistinguishable pages. */
export function ensureUniqueTitles(pages: ImportedPageDraft[]): ImportedPageDraft[] {
  const counts = new Map<string, number>();
  return pages.map((p) => {
    const base = (p.title || "").trim() || "Untitled";
    const n = counts.get(base) || 0;
    counts.set(base, n + 1);
    if (n === 0) return base === p.title ? p : { ...p, title: base };
    return { ...p, title: `${base} (${n + 1})` };
  });
}

function cleanTitle(name: string, fallback = "Untitled"): string {
  const t = String(name || "").trim();
  return t || fallback;
}

/** Notion export file names look like "My Page 1a2b3c4d5e6f....md".
 *  Strip the trailing 32-hex-char id so the page title stays clean. */
export function notionTitleFromFilename(path: string): string {
  const base = path.split("/").pop() || path;
  const noExt = base.replace(/\.(md|markdown|csv|html?)$/i, "");
  const noId = noExt.replace(/\s+[0-9a-f]{32}$/i, "").replace(/\s+[0-9a-f-]{36}$/i, "");
  return cleanTitle(noId.replace(/_/g, " "));
}

function fileStem(name: string): string {
  const base = (name || "").split(/[/\\]/).pop() || "Untitled";
  return cleanTitle(base.replace(/\.[^.]+$/, ""));
}

/* ─── markdown → blocks (superset of textToBlocks: todos, code langs, tables) ─── */

export function markdownToBlocks(md: string): Block[] {
  if (!md) return [];
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let inCode = false;
  let codeLang = "plain";
  let codeBuf: string[] = [];

  const pushCode = () => {
    const b: any = blockFor("code", codeBuf.join("\n").replace(/\n$/, ""));
    if (codeLang && codeLang !== "```") b.language = codeLang;
    blocks.push(b);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (inCode) {
        pushCode();
        codeBuf = [];
        inCode = false;
      } else {
        inCode = true;
        codeLang = fence[1] || "plain";
        codeBuf = [];
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }
    // markdown table
    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\|[-| :]+\|$/.test(lines[i + 1].trim())) {
      let end = i + 1;
      while (end < lines.length && lines[end].trim(). startsWith("|")) end++;
      const header = lines[i].trim().split("|").filter((s) => s.trim()).map((s) => s.trim());
      const rows: string[][] = [];
      for (let r = i + 2; r < end; r++) {
        const cells = lines[r].trim().split("|").filter((s) => s.trim()).map((s) => s.trim());
        if (cells.length) rows.push(cells);
      }
      const b: any = blockFor("table", "");
      b.table = [header, ...rows];
      blocks.push(b);
      i = end - 1;
      continue;
    }
    if (!line.trim()) continue;
    if (/^---+$/.test(line.trim())) {
      blocks.push(blockFor("divider"));
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(blockFor("h3", line.slice(4)));
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(blockFor("h2", line.slice(3)));
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(blockFor("h1", line.slice(2)));
      continue;
    }
    if (/^-\s+\[ \]\s+/.test(line)) {
      blocks.push(blockFor("todo", line.replace(/^-\s+\[ \]\s+/, "")));
      continue;
    }
    if (/^-\s+\[x\]\s+/i.test(line)) {
      const b: any = blockFor("todo", line.replace(/^-\s+\[x\]\s+/i, ""));
      b.checked = true;
      if (b.properties) b.properties.checked = true;
      blocks.push(b);
      continue;
    }
    if (/^-\s+/.test(line)) {
      blocks.push(blockFor("bullet", line.replace(/^-\s+/, "")));
      continue;
    }
    if (/^\*\s+/.test(line)) {
      blocks.push(blockFor("bullet", line.replace(/^\*\s+/, "")));
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      blocks.push(blockFor("number", line.replace(/^\d+\.\s+/, "")));
      continue;
    }
    if (line.startsWith("> ")) {
      const rest = line.slice(2);
      const emoji = rest.match(/^(\p{Emoji}|[\u2600-\u27BF\u2B50])\s*/u);
      if (emoji) {
        const b: any = blockFor("callout", rest.slice(emoji[0].length));
        if (b.properties) b.properties.icon = emoji[1];
        blocks.push(b);
      } else {
        blocks.push(blockFor("quote", rest));
      }
      continue;
    }
    // Notion-style image / file embeds on their own line
    const imgMd = line.trim().match(/^!\[.*?\]\((.+?)\)$/);
    if (imgMd) {
      blocks.push(blockFor("image", imgMd[1]));
      continue;
    }
    blocks.push(blockFor("text", line));
  }
  if (inCode && codeBuf.length) pushCode();
  return blocks;
}

export function plainTextToBlocks(text: string): Block[] {
  if (!text) return [];
  // Keep paragraph breaks: split on blank lines first, then single lines.
  const paras = text.split(/\n\s*\n/);
  const blocks: Block[] = [];
  for (const para of paras) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (!trimmed.includes("\n")) {
      blocks.push(blockFor("text", trimmed));
    } else {
      // A "notepad" paste with hard line breaks → one block per line.
      for (const line of trimmed.split("\n")) {
        if (line.trim()) blocks.push(blockFor("text", line.trim()));
      }
    }
  }
  return blocks;
}

/* ─── HTML → blocks (Notion HTML export, Google Docs, web clips) ─── */

function htmlText(el: Element): string {
  return (el.textContent || "").trim();
}

export function htmlToBlocks(html: string): Block[] {
  if (!html || !html.trim()) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: Block[] = [];
  const root = doc.body || doc;

  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = (child.textContent || "").trim();
        if (t) blocks.push(blockFor("text", t));
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      switch (tag) {
        case "h1":
          blocks.push(blockFor("h1", htmlText(el)));
          break;
        case "h2":
          blocks.push(blockFor("h2", htmlText(el)));
          break;
        case "h3":
        case "h4":
          blocks.push(blockFor("h3", htmlText(el)));
          break;
        case "blockquote":
          blocks.push(blockFor("quote", htmlText(el)));
          break;
        case "pre": {
          const code = el.querySelector("code");
          const b: any = blockFor("code", (code?.textContent || el.textContent || "").replace(/\n$/, ""));
          const cls = code?.className?.match(/language-(\w+)/);
          if (cls) b.language = cls[1];
          blocks.push(b);
          break;
        }
        case "hr":
          blocks.push(blockFor("divider"));
          break;
        case "ul":
          el.querySelectorAll(":scope > li").forEach((li) => {
            const t = htmlText(li);
            if (!t) return;
            const cb = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
            if (cb) {
              const b: any = blockFor("todo", t);
              if (cb.checked) {
                b.checked = true;
                if (b.properties) b.properties.checked = true;
              }
              blocks.push(b);
            } else {
              blocks.push(blockFor("bullet", t));
            }
          });
          break;
        case "ol":
          el.querySelectorAll(":scope > li").forEach((li) => {
            const t = htmlText(li);
            if (t) blocks.push(blockFor("number", t));
          });
          break;
        case "table": {
          const rows: string[][] = [];
          el.querySelectorAll("tr").forEach((tr) => {
            const cells: string[] = [];
            tr.querySelectorAll("th,td").forEach((c) => cells.push((c.textContent || "").trim()));
            if (cells.length) rows.push(cells);
          });
          if (rows.length) {
            const b: any = blockFor("table", "");
            b.table = rows;
            blocks.push(b);
          }
          break;
        }
        case "img": {
          const src = (el as HTMLImageElement).src || el.getAttribute("src") || "";
          if (src) blocks.push(blockFor("image", src));
          break;
        }
        case "figure": {
          const img = el.querySelector("img");
          if (img?.getAttribute("src")) blocks.push(blockFor("image", img.getAttribute("src")!));
          else if (htmlText(el)) blocks.push(blockFor("text", htmlText(el)));
          break;
        }
        case "li":
          blocks.push(blockFor("bullet", htmlText(el)));
          break;
        case "p":
        case "div":
        case "section":
        case "article": {
          // Leaf text containers → single block; wrappers → recurse.
          const isLeaf = !el.querySelector("p,h1,h2,h3,ul,ol,pre,table,blockquote");
          const t = htmlText(el);
          if (!t) {
            walk(el);
          } else if (isLeaf) {
            blocks.push(blockFor("text", t));
          } else {
            walk(el);
          }
          break;
        }
        default:
          if (el.children.length) walk(el);
          else {
            const t = htmlText(el);
            if (t) blocks.push(blockFor("text", t));
          }
      }
    });
  };

  walk(root);
  return blocks;
}

/* ─── CSV → blocks (one table block + heading) ─── */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.length > 1 || row[0].trim() !== "") rows.push(row);
      row = [];
    } else {
      cell += c;
    }
  }
  row.push(cell);
  if (row.length > 1 || row[0].trim() !== "") rows.push(row);
  // Support semicolon-separated exports too.
  if (rows.length && rows.every((r) => r.length === 1 && r[0].includes(";"))) {
    return rows.map((r) => r[0].split(";").map((s) => s.trim()));
  }
  return rows.map((r) => r.map((s) => s.trim()));
}

export function csvToBlocks(csv: string, sourceName = "Table"): Block[] {
  const rows = parseCsv(csv).filter((r) => r.some((c) => c !== ""));
  if (!rows.length) return [];
  const out: Block[] = [blockFor("h2", fileStem(sourceName))];
  const b: any = blockFor("table", "");
  b.table = rows;
  out.push(b);
  return out;
}

/* ─── JSON → pages (Noska backup / generic {title, blocks}) ─── */

export function jsonToPages(jsonText: string, sourceName = "import.json"): ParsedImport {
  const warnings: string[] = [];
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { pages: [], warnings: ["That file isn't valid JSON."] };
  }
  const coerceBlocks = (raw: any): Block[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((b) => b && typeof b === "object")
      .map((b: any) => {
        const type = typeof b.type === "string" ? b.type : "text";
        const text = typeof b.text === "string" ? b.text : "";
        const base: any = blockFor(type, text);
        // Preserve ids when they look sane so relations survive round-trips.
        if (typeof b.id === "string" && b.id) base.id = b.id;
        for (const k of ["checked", "language", "table", "database", "columns", "columnColors", "tabs", "properties", "caption"]) {
          if (b[k] !== undefined) base[k] = b[k];
        }
        return base as Block;
      });
  };

  // Shape 1: Noska single-page export { title, blocks }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && (parsed.blocks || parsed.title)) {
    const blocks = coerceBlocks(parsed.blocks);
    return {
      pages: [{ title: cleanTitle(parsed.title || fileStem(sourceName)), icon: "📝", blocks, sourceFile: sourceName }],
      warnings: blocks.length ? warnings : ["No blocks found in that JSON file."],
    };
  }
  // Shape 2: { pages: [...] }
  const list = Array.isArray(parsed) ? parsed : parsed.pages;
  if (Array.isArray(list)) {
    const pages: ImportedPageDraft[] = [];
    for (const p of list) {
      if (!p || typeof p !== "object") continue;
      const blocks = coerceBlocks(p.blocks);
      if (!blocks.length && !p.title) continue;
      pages.push({
        title: cleanTitle(p.title || fileStem(sourceName)),
        icon: typeof p.icon === "string" ? p.icon : "📝",
        blocks,
        sourceFile: sourceName,
      });
    }
    if (!pages.length) warnings.push("No importable pages found in that JSON file.");
    return { pages, warnings };
  }
  return { pages: [], warnings: ["Unrecognised JSON shape — expected a Noska page ({ title, blocks }) or { pages: [...] }."] };
}

/* ─── Evernote .enex → pages ─── */

export function enexToPages(enexText: string): ParsedImport {
  const warnings: string[] = [];
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(enexText, "text/xml");
  } catch {
    return { pages: [], warnings: ["Couldn't parse that .enex file."] };
  }
  if (doc.querySelector("parsererror")) {
    return { pages: [], warnings: ["Couldn't parse that .enex file as XML."] };
  }
  const notes = Array.from(doc.querySelectorAll("note"));
  if (!notes.length) return { pages: [], warnings: ["No notes found in that .enex file."] };
  const pages: ImportedPageDraft[] = notes.map((note) => {
    const title = cleanTitle(note.querySelector("title")?.textContent || "Untitled");
    const contentEl = note.querySelector("content");
    let cdata = contentEl?.textContent || "";
    // ENML content is itself XML/HTML — strip the wrapper, keep the body.
    cdata = cdata.replace(/<!DOCTYPE[^>]*>/g, "");
    const blocks = cdata.trim() ? htmlToBlocks(cdata) : [];
    const tags = Array.from(note.querySelectorAll("tag")).map((t) => t.textContent || "").filter(Boolean);
    return { title, icon: "🐘", blocks: blocks.length ? blocks : [blockFor("text", "")], sourceFile: title, tags };
  });
  if (pages.length > 50) warnings.push(`Large export (${pages.length} notes) — importing may take a moment.`);
  return { pages, warnings };
}

/* ─── Notion / generic .zip (markdown + csv export) → pages ─── */

const ZIP_ENTRY_CONCURRENCY = 6;
const ZIP_FILE_CAP = 200;
/** Local (non-http) image/file references in markdown — these point at
 *  sibling files inside the export ZIP and can't resolve after import. */
const LOCAL_FILE_REF_RE = /!\[[^\]]*\]\((?!https?:|data:)([^)]+)\)/g;

export async function zipToPages(zipFile: File): Promise<ParsedImport> {
  const warnings: string[] = [];
  const zip = await JSZip.loadAsync(zipFile);
  const entries = Object.keys(zip.files).filter((p) => {
    const f = zip.files[p];
    if (f.dir) return false;
    if (p.startsWith("__MACOSX/") || p.endsWith(".DS_Store")) return false;
    return /\.(md|markdown|csv|html?|txt)$/i.test(p);
  });
  if (!entries.length) {
    return { pages: [], warnings: ["No .md, .csv, .html or .txt files found in that ZIP. Export from Notion with Markdown & CSV enabled."] };
  }
  // Cap to keep huge workspace exports responsive.
  const capped = entries.slice(0, ZIP_FILE_CAP);
  if (entries.length > capped.length) warnings.push(`Only the first ${ZIP_FILE_CAP} of ${entries.length} files were imported.`);
  // Entry reads run in parallel (bounded) — sequential was the bottleneck
  // on exports with 50+ pages.
  const parsed = await mapWithConcurrency(capped, ZIP_ENTRY_CONCURRENCY, async (path) => {
    try {
      const text = await zip.files[path].async("string");
      if (!text.trim()) return { page: null as ImportedPageDraft | null, warn: null as string | null, hasLocalRefs: false };
      if (/\.csv$/i.test(path)) {
        const blocks = csvToBlocks(text, path);
        return { page: { title: notionTitleFromFilename(path), icon: "📊", blocks, sourceFile: path } as ImportedPageDraft, warn: null, hasLocalRefs: false };
      }
      if (/\.html?$/i.test(path)) {
        const blocks = htmlToBlocks(text);
        if (!blocks.length) return { page: null, warn: null, hasLocalRefs: false };
        return { page: { title: notionTitleFromFilename(path), icon: "📝", blocks, sourceFile: path } as ImportedPageDraft, warn: null, hasLocalRefs: false };
      }
      if (/\.txt$/i.test(path)) {
        return { page: { title: notionTitleFromFilename(path), icon: "📝", blocks: plainTextToBlocks(text), sourceFile: path } as ImportedPageDraft, warn: null, hasLocalRefs: false };
      }
      const blocks = markdownToBlocks(text);
      if (!blocks.length) return { page: null, warn: null, hasLocalRefs: false };
      LOCAL_FILE_REF_RE.lastIndex = 0;
      const hasLocalRefs = LOCAL_FILE_REF_RE.test(text);
      return { page: { title: notionTitleFromFilename(path), icon: "📝", blocks, sourceFile: path } as ImportedPageDraft, warn: null, hasLocalRefs };
    } catch {
      return { page: null, warn: `Skipped ${path} (couldn't read it).`, hasLocalRefs: false };
    }
  });
  const pages: ImportedPageDraft[] = [];
  let pagesWithLocalRefs = 0;
  for (const r of parsed) {
    if (r.warn) warnings.push(r.warn);
    if (r.page) {
      pages.push(r.page);
      if (r.hasLocalRefs) pagesWithLocalRefs++;
    }
  }
  if (pagesWithLocalRefs > 0) {
    warnings.push(
      `${pagesWithLocalRefs} page${pagesWithLocalRefs > 1 ? "s" : ""} reference${pagesWithLocalRefs > 1 ? "" : "s"} embedded images/files — those stay in the original app; all text imported fully.`
    );
  }
  if (!pages.length) warnings.push("Nothing importable found in that ZIP.");
  return { pages, warnings };
}

/* ─── single-file dispatcher ─── */

/** Files bigger than this are refused with a friendly message instead of
 *  freezing the tab in the parser. */
const MAX_SINGLE_FILE_BYTES = 25 * 1024 * 1024;

export async function parseImportFile(file: File): Promise<ParsedImport> {
  const name = file.name || "import";
  if (typeof file.size === "number" && file.size > MAX_SINGLE_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(0);
    return { pages: [], warnings: [`${name} is ${mb}MB — too large to import at once. Split the export or import fewer pages.`] };
  }
  const lower = name.toLowerCase();
  if (lower.endsWith(".zip")) return zipToPages(file);
  const text = await file.text();
  if (!text.trim()) return { pages: [], warnings: [`${name} is empty.`] };
  if (lower.endsWith(".json")) return jsonToPages(text, name);
  if (lower.endsWith(".enex")) return enexToPages(text);
  if (lower.endsWith(".csv")) {
    return { pages: [{ title: fileStem(name), icon: "📊", blocks: csvToBlocks(text, name), sourceFile: name }], warnings: [] };
  }
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    const blocks = htmlToBlocks(text);
    return {
      pages: blocks.length ? [{ title: fileStem(name), icon: "🌐", blocks, sourceFile: name }] : [],
      warnings: blocks.length ? [] : [`No text content found in ${name}.`],
    };
  }
  if (lower.endsWith(".txt")) {
    return { pages: [{ title: fileStem(name), icon: "📝", blocks: plainTextToBlocks(text), sourceFile: name }], warnings: [] };
  }
  // .md / .markdown / unknown → markdown
  const blocks = markdownToBlocks(text);
  return {
    pages: blocks.length ? [{ title: fileStem(name), icon: "📝", blocks, sourceFile: name }] : [],
    warnings: blocks.length ? [] : [`No content found in ${name}.`],
  };
}

export function parsePastedText(text: string, format: "markdown" | "text" | "html"): Block[] {
  if (!text.trim()) return [];
  if (format === "html") return htmlToBlocks(text);
  if (format === "text") return plainTextToBlocks(text);
  return markdownToBlocks(text);
}

/** Ensure every imported block has a unique id (exports often reuse ids). */
export function restampIds(blocks: Block[]): Block[] {
  const seen = new Set<string>();
  return blocks.map((b: any) => {
    let id = typeof b.id === "string" && b.id && !seen.has(b.id) ? b.id : uid();
    seen.add(id);
    return { ...b, id };
  });
}
