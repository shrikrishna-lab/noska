import {
  uid, now, createBlock, BLOCK_TYPES, getBlock, getChildren, getAncestors,
  getDescendants, getRootPages, addChild, insertChildAt, removeChild,
  moveBlock, duplicateSubtree, softDelete, restore, turnInto,
  getBlockTitle, setBlockTitle, makeEmptyDatabase, insertBetween,
  getPagePermission, resolvePermission
} from './blockModel';
import type { TreeBlock } from './blockModel';
import type {
  Block, DatabaseBlock, TableBlock, CodeBlockData, ColumnsBlock,
  TabsBlock, FormBlock, TemplateButtonBlock, PageListBlock, GenericBlock,
} from '../../types/blocks';
import type { Page } from '../lib/supabaseService';

export { uid, now, createBlock, getBlock, getChildren, getAncestors,
  getDescendants, getRootPages, addChild, insertChildAt, removeChild,
  moveBlock, duplicateSubtree, softDelete, restore, turnInto,
  getBlockTitle, setBlockTitle, makeEmptyDatabase, insertBetween,
  getPagePermission, resolvePermission };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean { return UUID_RE.test(id); }

/** URL-safe slug for the workspace segment of a page URL, e.g.
 * "/my-workspace/<pageId>". Falls back to "workspace" if the name has no
 * ASCII letters/digits (e.g. purely emoji or non-Latin names) so the route
 * segment is never empty. */
export function slugifyWorkspaceName(name: string | null | undefined): string {
  const slug = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "workspace";
}

/** Loose shapes for migrateLegacyIds' params — this runs once at load
 * time over raw fetched records before they're normalized into the app's
 * real `Page`/chat shapes, so only `id`/`parentId`/`blocks` (each block
 * only needs `id`) are read/written here. */
interface LegacyPage {
  id: string;
  parentId?: string | null;
  blocks?: Array<{ id?: string }>;
}
interface LegacyChat {
  id: string;
}

export function migrateLegacyIds(loadedPages: LegacyPage[], loadedChats: LegacyChat[]): { idMap: Record<string, string> } {
  const idMap: Record<string, string> = {};
  for (const page of loadedPages) {
    if (!isValidUUID(page.id)) {
      const newId = uid();
      idMap[page.id] = newId;
      page.id = newId;
    }
    if (page.blocks) {
      for (const block of page.blocks) {
        if (block.id && !isValidUUID(block.id)) block.id = uid();
      }
    }
  }
  for (const page of loadedPages) {
    if (page.parentId && idMap[page.parentId]) page.parentId = idMap[page.parentId];
  }
  for (const chat of loadedChats) {
    if (!isValidUUID(chat.id)) {
      const newId = uid();
      idMap[chat.id] = newId;
      chat.id = newId;
    }
  }
  return { idMap };
}

export const covers = [
  "linear-gradient(135deg,#0f7b6c,#2dd4bf,#f4d35e)",
  "linear-gradient(135deg,#262626,#737373,#d4d4d4)",
  "linear-gradient(135deg,#7c3aed,#ec4899,#f59e0b)",
  "linear-gradient(135deg,#1d4ed8,#06b6d4,#84cc16)",
  "linear-gradient(135deg,#dc2626,#f97316,#fbbf24)",
  "linear-gradient(135deg,#059669,#34d399,#a7f3d0)",
  "linear-gradient(135deg,#1e40af,#3b82f6,#93c5fd)",
  "linear-gradient(135deg,#7c2d12,#c2410c,#fdba74)",
  "linear-gradient(135deg,#374151,#6b7280,#9ca3af)",
  "linear-gradient(135deg,#831843,#ec4899,#fbcfe8)",
  "linear-gradient(135deg,#0c4a6e,#0ea5e9,#bae6fd)",
  "linear-gradient(135deg,#14532d,#22c55e,#bbf7d0)",
];

import { EMOJI_ICONS } from "../registry/icons/IconRegistry";
export const emojis = EMOJI_ICONS;

// Rotating default background tints for column layouts. Named tokens (not raw
// hex) so ColumnsBlock can map them to light/dark-correct CSS values and the
// color picker can highlight the active one. Matches the "2 columns" preview
// (green + blue) then extends with more palette colors for 3/4/5 columns.
export const COLUMN_TINTS = ["green", "blue", "orange", "purple", "yellow"];

export function timeAgo(iso: string | null | undefined): string {
  // Real bug, fixed: a missing/empty `iso` used to fall through to
  // `new Date(0)` (the Unix epoch), producing a nonsensical "~20640d ago"
  // for any page whose updatedAt was never set — every onboarding starter
  // page hit this on the very first render. Treat a missing timestamp as
  // "just now" instead of pretending it's ~56 years old.
  if (!iso) return "just now";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/** Minimal shape for plainText's `page` param — only `content`/`blocks`
 * are read, structurally satisfied by a real `Page`. */
interface PlainTextSource {
  id: string;
  content?: string[];
  blocks?: Block[];
}

export function plainText(page: PlainTextSource): string {
  // `window.__blocks` is never assigned anywhere in the codebase (grepped) —
  // this branch is dead code today (same pattern as the `window.realtimeCollab`
  // finding from an earlier Phase-3 batch), always falling through to
  // `page.blocks || []` in practice. Left as-is since removing dead
  // branches is out of scope for a type-only migration pass; typed as
  // `TreeBlock[]` (blockModel.ts's generic tree shape) since that's what
  // `getChildren` expects, not `Block[]`.
  const allBlocks: TreeBlock[] = typeof window !== 'undefined' ? ((window as unknown as { __blocks?: TreeBlock[] }).__blocks || []) : [];
  const list: Array<Block | TreeBlock> = page.content ? getChildren(allBlocks, page.id) : (page.blocks || []);
  return list.map(b => {
    if (b.type === 'database') {
      const props = (b as unknown as { properties?: Record<string, unknown> }).properties || {};
      const db = props.view === 'table' ? props : { rows: [] as Array<Record<string, unknown>> };
      const rows = (db as { rows?: Array<Record<string, unknown>> }).rows || [];
      return `${getBlockTitle(b as never)} ${rows.map(r => Object.values(r).join(' ')).join(' ')}`;
    }
    return getBlockTitle(b as never) || '';
  }).join('\n');
}

// Every literal type string blockFor() accepts, mapped to the BLOCK_TYPES
// lookup key used to find shared defaults (see blockModel.ts). Kept as a
// plain object exactly like the original — this is intentionally NOT
// keyed by the Block union's `type` field, since several entries here
// are editor-only shorthand ids (`h1`, `bullet`, `todo`, `text`, ...)
// that get translated into the real stored `type` further down.
const TYPE_TO_PROPS: Record<string, string> = {
  text: 'paragraph', h1: 'heading_1', h2: 'heading_2', h3: 'heading_3', h4: 'heading_4',
  bullet: 'bulleted_list_item', number: 'numbered_list_item',
  todo: 'to_do', toggle: 'toggle',
  page: 'page', callout: 'callout', quote: 'quote', table: 'table',
  divider: 'divider', image: 'image', code: 'code', database: 'database',
  'link-to-page': 'link_to_page', 'synced-block': 'synced_block',
  button: 'template_button', 'table-of-contents': 'table_of_contents',
  '2-columns': 'columns', '3-columns': 'columns', '4-columns': 'columns', '5-columns': 'columns',
  video: 'video', audio: 'audio', file: 'file', bookmark: 'bookmark',
  tabs: 'tabs', form: 'form', mention: 'mention', breadcrumb: 'breadcrumb',
  'toggle-h1': 'toggle-h1', 'toggle-h2': 'toggle-h2', 'toggle-h3': 'toggle-h3',
  'ai-block': 'ai-block', mermaid: 'mermaid', 'ai-meeting': 'ai-meeting',
  'inline-equation': 'inline-equation',
  'block-equation': 'block-equation',
  'embed-generic': 'embed-generic',
  'google-drive': 'embed-generic', tweet: 'embed-generic',
  'github-gist': 'embed-generic', 'google-maps': 'embed-generic',
  figma: 'embed-generic', loom: 'embed-generic', codepen: 'embed-generic', pdf: 'embed-generic',
  'table-view': 'table-view', 'board-view': 'board-view',
  'gallery-view': 'gallery-view', 'list-view': 'list-view',
  'calendar-view': 'calendar-view', 'timeline-view': 'timeline-view',
  'dashboard-view': 'dashboard-view', 'map-view': 'map-view',
  'database-inline': 'database', 'database-full': 'database',
  'bar-chart-v': 'bar-chart-v', 'bar-chart-h': 'bar-chart-h',
  'line-chart': 'line-chart', 'donut-chart': 'donut-chart', 'number-chart': 'number-chart',
};

/** blockFor()'s return is narrowed per-branch below to the exact Block
 * union member each `type` argument actually produces (DatabaseBlock,
 * TableBlock, CodeBlockData, ColumnsBlock, TabsBlock, FormBlock,
 * TemplateButtonBlock, PageListBlock), rather than falling back to a
 * broad `Block`/`any` return for the whole function. This was reachable
 * for every branch here — the function is a single flat if/else-if chain
 * keyed on the same `type` string used for both the lookup and the
 * hoisting below, so each branch's shape is knowable at the call site.
 * The one exception is the final catch-all `else` (any type not matched
 * by an earlier branch, e.g. 'divider', 'video', 'mermaid', 'mention',
 * chart types, embed types, etc.) which returns `GenericBlock` — these
 * ~20+ types all share the exact same shape (only `text`/`properties`),
 * so a single fallback branch, not "give up and go broad", genuinely is
 * the correct per-branch narrowing for all of them collectively. */
export function blockFor(type: string, text: string = ''): Block {
  const propsType = TYPE_TO_PROPS[type] || type;
  const typeDef = BLOCK_TYPES[propsType];
  if (!typeDef) {
    const block = createBlock(type);
    return { ...block, text } as GenericBlock;
  }
  const props: Record<string, any> = { ...typeDef.props };
  if (type === 'page') props.title = text;
  else if (type === 'todo') { props.richText = [{ text }]; props.checked = false; }
  else if (type === 'callout') { props.richText = [{ text }]; props.icon = '💡'; props.tone = 'info'; }
  else if (type === 'table') { props.table = [['','',''],['','','']]; }
  else if (type === '2-columns' || type === '3-columns' || type === '4-columns' || type === '5-columns') {
    const n = parseInt(type, 10) || 2;
    props.columns = Array.from({ length: n }, () => ['']);
    props.columnColors = Array.from({ length: n }, (_, i) => COLUMN_TINTS[i % COLUMN_TINTS.length]);
  }
  // Real bug fix: this branch used to check `type === 'database'` literally,
  // which never matches 'database-inline'/'database-full' (only the mapped
  // `propsType` equals 'database' for those two — see TYPE_TO_PROPS above).
  // Confirmed via grep that no other code path fills in `views`/`activeViewId`
  // for those two variants, so a database-inline/full block previously never
  // got makeEmptyDatabase()'s seeded "Table" view — DatabasePage.jsx silently
  // patched around the gap with its own `db.views = db.views || []` defaults,
  // masking the missing default view rather than surfacing it. Fixed by
  // checking `propsType` (the lookup key) instead of the raw `type` argument.
  else if (propsType === 'database') Object.assign(props, makeEmptyDatabase());
  else if (type === 'image') props.url = text;
  else if (type === 'code') { props.richText = [{ text }]; props.language = 'plain'; }
  else if (type === 'divider') { /* no extra props */ }
  else if (type === 'synced-block') { props.richText = [{ text }]; }
  else if (type === 'button') { props.richText = [{ text }]; props.templateBlocks = []; }
  else if (type === 'video' || type === 'audio') { props.url = text; }
  else if (type === 'file') { props.url = text; props.name = text.split('/').pop() || 'file'; }
  else if (type === 'bookmark') { props.url = text; props.title = text; }
  else if (type === 'breadcrumb') { props.pageIds = []; }
  else if (type === 'table-of-contents') { props.pageIds = []; }
  else if (type === 'tabs') { props.tabs = [{ title: 'Tab 1', content: [] }, { title: 'Tab 2', content: [] }]; }
  else if (type === 'form') { props.formConfig = { fields: [{ id: uid(), type: 'text', label: 'Name', required: true, options: [], visibleWhen: null }], submitButtonText: 'Submit', anonymous: false, showResults: false }; props.submissions = []; }
  else if (type.startsWith('toggle-h') || type === 'ai-block' || type === 'mermaid' || type === 'ai-meeting' || type === 'inline-equation') { props.richText = [{ text }]; }
  else { props.richText = [{ text }]; }
  const block = createBlock(type, { properties: props });

  if (type === '2-columns' || type === '3-columns' || type === '4-columns' || type === '5-columns') {
    return {
      ...block, text,
      columns: props.columns, columnColors: props.columnColors,
    } as ColumnsBlock;
  }
  if (propsType === 'database') {
    return { ...block, text, database: props } as unknown as DatabaseBlock;
  }
  if (type === 'tabs') {
    return { ...block, text, tabs: props.tabs, activeTabIdx: 0 } as unknown as TabsBlock;
  }
  if (type === 'button') {
    return { ...block, text, templateBlocks: props.templateBlocks || [] } as unknown as TemplateButtonBlock;
  }
  if (type === 'form') {
    // Real bug fix: `formConfig` was hoisted to the top-level block field
    // here (block.formConfig = props.formConfig), matching what
    // FormsBlock.tsx reads, but `submissions` (seeded as `[]` two lines
    // above in `props.submissions`) was NEVER hoisted the same way —
    // only left inside `props`, which nothing reads. A freshly-created
    // form block therefore started with `block.submissions` simply
    // absent rather than the intended empty array. Low real-world impact
    // (FormsBlock.tsx already defaults with `block.submissions || []`),
    // but still a genuine inconsistency between what this function seeds
    // and what it actually returns — fixed to hoist both fields
    // consistently.
    return { ...block, text, formConfig: props.formConfig, submissions: props.submissions } as unknown as FormBlock;
  }
  if (type === 'synced-block') {
    return { ...block, text, syncedGroupId: uid() } as GenericBlock;
  }
  if (type === 'breadcrumb' || type === 'table-of-contents') {
    return { ...block, text, pageIds: props.pageIds || [] } as unknown as PageListBlock;
  }
  if (type === 'table') {
    return { ...block, text, table: props.table } as unknown as TableBlock;
  }
  if (type === 'code') {
    return { ...block, text, language: props.language } as unknown as CodeBlockData;
  }
  if (type === 'interactive' || type === 'html') {
    return {
      ...block,
      type: 'interactive',
      text,
      title: text || 'Interactive App',
      html: `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>Interactive App</title>\n</head>\n<body>\n  <div class="card">\n    <h2>✨ Interactive Noska Block</h2>\n    <p>Click "Edit" in the top corner to customize with AI, code, or imported files.</p>\n    <button id="counter-btn" class="btn">Clicked 0 times</button>\n  </div>\n</body>\n</html>`,
      css: `body {\n  font-family: system-ui, -apple-system, sans-serif;\n  background: #0f172a;\n  color: #f8fafc;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  margin: 0;\n  padding: 1rem;\n  box-sizing: border-box;\n}\n.card {\n  background: rgba(30, 41, 59, 0.7);\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  border-radius: 16px;\n  padding: 2rem;\n  max-width: 420px;\n  text-align: center;\n  backdrop-filter: blur(12px);\n  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);\n}\nh2 { margin-top: 0; font-size: 1.35rem; color: #38bdf8; }\np { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }\n.btn {\n  background: linear-gradient(135deg, #0284c7, #2563eb);\n  color: white;\n  border: none;\n  border-radius: 10px;\n  padding: 0.6rem 1.25rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: transform 0.15s ease, opacity 0.15s ease;\n}\n.btn:hover { transform: scale(1.03); opacity: 0.95; }\n.btn:active { transform: scale(0.97); }`,
      javascript: `let count = 0;\nconst btn = document.getElementById('counter-btn');\nif (btn) {\n  btn.addEventListener('click', () => {\n    count++;\n    btn.textContent = \`Clicked \${count} time\${count === 1 ? '' : 's'}\`;\n    console.log('[Interactive] Button count updated:', count);\n  });\n}`,
      height: 380,
      sizingPreset: 'standard',
      themeMode: 'inherit',
      permissions: { allowThemeInheritance: true, allowStorage: true },
      version: 1,
      versions: []
    } as unknown as Block;
  }
  return { ...block, text } as GenericBlock;
}

export const todayLabel = (): string => {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `@Today ${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

interface ParsedTable {
  block: TableBlock;
  endIndex: number;
  header: string[];
  rows: string[][];
}

function parseTableLines(lines: string[], start: number): ParsedTable | null {
  if (!lines[start].trim().startsWith('|')) return null;
  let end = start;
  while (end < lines.length && lines[end].trim().startsWith('|')) end++;
  if (end - start < 2) return null;
  const separator = lines[start + 1];
  if (!/^\|[-| :]+\|$/.test(separator.trim())) return null;
  const header = lines[start].trim().split('|').filter(s => s.trim()).map(s => s.trim());
  const rows: string[][] = [];
  for (let r = start + 2; r < end; r++) {
    const cells = lines[r].trim().split('|').filter(s => s.trim()).map(s => s.trim());
    if (cells.length > 0) rows.push(cells);
  }
  return { block: blockFor('table', '') as TableBlock, endIndex: end, header, rows };
}

export function textToBlocks(text: string | null | undefined): Block[] {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        codeBuffer.push(line.slice(3));
        blocks.push(blockFor('code', codeBuffer.join('\n').trimEnd()));
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBuffer = [];
      }
      continue;
    }
    if (inCodeBlock) { codeBuffer.push(line); continue; }
    const tableResult = parseTableLines(lines, i);
    if (tableResult) {
      const block = blockFor('table', '') as TableBlock;
      block.table = [tableResult.header, ...tableResult.rows];
      blocks.push(block);
      i = tableResult.endIndex - 1;
      continue;
    }
    if (!line.trim()) continue;
    if (line === '---') { blocks.push(blockFor('divider')); continue; }
    if (line.startsWith('### ')) { blocks.push(blockFor('h3', line.replace('### ', ''))); continue; }
    if (line.startsWith('## ')) { blocks.push(blockFor('h2', line.replace('## ', ''))); continue; }
    if (line.startsWith('# ')) { blocks.push(blockFor('h1', line.replace('# ', ''))); continue; }
    if (line.match(/^- \[\x20\] /)) { blocks.push(blockFor('todo', line.replace(/^- \[\x20\] /, ''))); continue; }
    if (line.match(/^- \[x\] /i)) {
      const b = blockFor('todo', line.replace(/^- \[x\] /i, '')) as GenericBlock & { properties: { checked?: boolean } };
      b.properties.checked = true;
      blocks.push(b);
      continue;
    }
    if (line.startsWith('- ')) { blocks.push(blockFor('bullet', line.replace('- ', ''))); continue; }
    if (line.match(/^\d+\. /)) { blocks.push(blockFor('number', line.replace(/^\d+\. /, ''))); continue; }
    if (line.startsWith('> ') && line.length > 2) {
      const rest = line.replace('> ', '');
      const emojiMatch = rest.match(/^(\p{Emoji}|[\u2600-\u27BF\u2B50])\s*/u);
      if (emojiMatch) {
        const b = blockFor('callout', rest.replace(emojiMatch[0], '')) as GenericBlock & { properties: { icon?: string } };
        b.properties.icon = emojiMatch[1];
        blocks.push(b);
      } else {
        blocks.push(blockFor('quote', rest));
      }
      continue;
    }
    if (line.startsWith('<details>')) { blocks.push(blockFor('toggle', line.replace('<details>', '').trim())); continue; }
    if (line.trim()) { blocks.push(blockFor('text', line)); }
  }
  if (inCodeBlock && codeBuffer.length > 0) blocks.push(blockFor('code', codeBuffer.join('\n').trimEnd()));
  return blocks;
}

let _katexLazy: any = null;
let _katexLoadPromise: Promise<void> | null = null;
function ensureKatex(): Promise<void> {
  if (!_katexLoadPromise) {
    _katexLoadPromise = import("katex").then((m) => {
      _katexLazy = m.default;
      import("katex/dist/katex.min.css").catch(() => {});
    });
  }
  return _katexLoadPromise;
}

export function renderInlineMarkdown(text: string | null | undefined): string {
  if (!text) return '';
  if (!_katexLoadPromise) ensureKatex();
  let html = text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`(.+?)`/g, '<code class="inline-code">$1</code>')
    .replace(/\$\$(.+?)\$\$/g, (_, eq) => {
      if (_katexLazy) {
        try {
          return _katexLazy.renderToString(eq, { throwOnError: false, displayMode: false });
        } catch {}
      }
      return `<span class="inline-equation">${eq}</span>`;
    });
  const colorNames = ["red","blue","green","orange","purple","pink","brown","gray","yellow","teal","indigo","coral","rose","lime","mint","sky","lavender","peach","charcoal"];
  colorNames.forEach(c => {
    html = html.replace(new RegExp(`@@${c}:([^@]+)@@`, 'g'), `<span style="color:var(--clr-${c})">$1</span>`);
    html = html.replace(new RegExp(`@@bg-${c}:([^@]+)@@`, 'g'), `<span style="background:var(--clr-bg-${c});padding:0 3px;border-radius:3px">$1</span>`);
  });
  return html;
}
