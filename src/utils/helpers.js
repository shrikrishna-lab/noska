import {
  uid, now, createBlock, BLOCK_TYPES, getBlock, getChildren, getAncestors,
  getDescendants, getRootPages, addChild, insertChildAt, removeChild,
  moveBlock, duplicateSubtree, softDelete, restore, turnInto,
  getBlockTitle, setBlockTitle, makeEmptyDatabase, insertBetween,
  getPagePermission, resolvePermission
} from './blockModel.js';
import katex from 'katex';

export { uid, now, createBlock, getBlock, getChildren, getAncestors,
  getDescendants, getRootPages, addChild, insertChildAt, removeChild,
  moveBlock, duplicateSubtree, softDelete, restore, turnInto,
  getBlockTitle, setBlockTitle, makeEmptyDatabase, insertBetween,
  getPagePermission, resolvePermission };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id) { return UUID_RE.test(id); }

export function migrateLegacyIds(loadedPages, loadedChats) {
  const idMap = {};
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

export const emojis = ["📝", "📌", "💡", "✅", "🧠", "🚀", "📚", "🎯", "🗓️", "🔖"];

// Rotating default background tints for column layouts. Named tokens (not raw
// hex) so ColumnsBlock can map them to light/dark-correct CSS values and the
// color picker can highlight the active one. Matches the "2 columns" preview
// (green + blue) then extends with more palette colors for 3/4/5 columns.
export const COLUMN_TINTS = ["green", "blue", "orange", "purple", "yellow"];

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function plainText(page) {
  const allBlocks = typeof window !== 'undefined' ? window.__blocks || [] : [];
  const list = page.content ? getChildren(allBlocks, page.id) : (page.blocks || []);
  return list.map(b => {
    if (b.type === 'database') {
      const props = b.properties || {};
      const db = props.view === 'table' ? props : { rows: [] };
      return `${getBlockTitle(b)} ${(db.rows || []).map(r => Object.values(r).join(' ')).join(' ')}`;
    }
    return getBlockTitle(b) || '';
  }).join('\n');
}

export function blockFor(type, text = '') {
  const TYPE_TO_PROPS = {
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
  const propsType = TYPE_TO_PROPS[type] || type;
  const typeDef = BLOCK_TYPES[propsType];
  if (!typeDef) {
    const block = createBlock(type);
    block.text = text;
    return block;
  }
  const props = { ...typeDef.props };
  if (type === 'page') props.title = text;
  else if (type === 'todo') { props.richText = [{ text }]; props.checked = false; }
  else if (type === 'callout') { props.richText = [{ text }]; props.icon = '💡'; props.tone = 'info'; }
  else if (type === 'table') { props.table = [['','',''],['','','']]; }
  else if (type === '2-columns' || type === '3-columns' || type === '4-columns' || type === '5-columns') {
    const n = parseInt(type, 10) || 2;
    props.columns = Array.from({ length: n }, () => ['']);
    props.columnColors = Array.from({ length: n }, (_, i) => COLUMN_TINTS[i % COLUMN_TINTS.length]);
  }
  else if (type === 'database') Object.assign(props, makeEmptyDatabase());
  else if (type === 'image') props.url = text;
  else if (type === 'code') { props.richText = [{ text }]; props.language = 'plain'; }
  else if (type === 'divider') {}
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
    block.columns = props.columns;
    block.columnColors = props.columnColors;
  }
  if (type === 'database' || type === 'database-inline' || type === 'database-full') block.database = props;
  if (type === 'tabs') { block.tabs = props.tabs; block.activeTabIdx = 0; }
  if (type === 'button') block.templateBlocks = props.templateBlocks || [];
  if (type === 'form') block.formConfig = props.formConfig;
  if (type === 'synced-block') block.syncedGroupId = crypto.randomUUID();
  if (type === 'breadcrumb' || type === 'table-of-contents') block.pageIds = props.pageIds || [];
  block.text = text;
  if (type === 'table') block.table = props.table;
  return block;
}

export const todayLabel = () => {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `@Today ${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

function parseTableLines(lines, start) {
  if (!lines[start].trim().startsWith('|')) return null;
  let end = start;
  while (end < lines.length && lines[end].trim().startsWith('|')) end++;
  if (end - start < 2) return null;
  const separator = lines[start + 1];
  if (!/^\|[-| :]+\|$/.test(separator.trim())) return null;
  const header = lines[start].trim().split('|').filter(s => s.trim()).map(s => s.trim());
  const rows = [];
  for (let r = start + 2; r < end; r++) {
    const cells = lines[r].trim().split('|').filter(s => s.trim()).map(s => s.trim());
    if (cells.length > 0) rows.push(cells);
  }
  return { block: blockFor('table', ''), endIndex: end, header, rows };
}

export function textToBlocks(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks = [];
  let inCodeBlock = false;
  let codeBuffer = [];
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
      const block = blockFor('table', '');
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
    if (line.match(/^- \[x\] /i)) { const b = blockFor('todo', line.replace(/^- \[x\] /i, '')); b.properties.checked = true; blocks.push(b); continue; }
    if (line.startsWith('- ')) { blocks.push(blockFor('bullet', line.replace('- ', ''))); continue; }
    if (line.match(/^\d+\. /)) { blocks.push(blockFor('number', line.replace(/^\d+\. /, ''))); continue; }
    if (line.startsWith('> ') && line.length > 2) {
      const rest = line.replace('> ', '');
      const emojiMatch = rest.match(/^(\p{Emoji}|[\u2600-\u27BF\u2B50])\s*/u);
      if (emojiMatch) {
        const b = blockFor('callout', rest.replace(emojiMatch[0], ''));
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

export function renderInlineMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`(.+?)`/g, '<code class="inline-code">$1</code>')
    .replace(/\$\$(.+?)\$\$/g, (_, eq) => {
      try {
        return katex.renderToString(eq, { throwOnError: false, displayMode: false });
      } catch {
        return `<span class="inline-equation">${eq}</span>`;
      }
    });
  const colorNames = ["red","blue","green","orange","purple","pink","brown","gray","yellow","teal","indigo","coral","rose","lime","mint","sky","lavender","peach","charcoal"];
  colorNames.forEach(c => {
    html = html.replace(new RegExp(`@@${c}:([^@]+)@@`, 'g'), `<span style="color:var(--clr-${c})">$1</span>`);
    html = html.replace(new RegExp(`@@bg-${c}:([^@]+)@@`, 'g'), `<span style="background:var(--clr-bg-${c});padding:0 3px;border-radius:3px">$1</span>`);
  });
  return html;
}
