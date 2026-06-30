// ═══════════════════════════════════════════════════════════════
// BlockModel — Universal Block Primitive
// Every entity in the system is a Block. A page is a block with
// type='page' that renders its content on a new screen.
//
// Two independent relationships:
//   content[]  → render tree (ordered child block IDs)
//   parentId   → permission chain (single upward pointer)
// ═══════════════════════════════════════════════════════════════

export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

// ── Fractional indexing ──────────────────────────────────────
// Generates a position string between `before` and `after`.
// Example: insertBetween('a0', 'a1') → 'a05'
export function insertBetween(before, after) {
  if (!before && !after) return 'a0';
  if (!before) return after[0] + '0' + after.slice(1);
  if (!after) return before + '0';
  let i = 0;
  while (i < before.length && i < after.length && before[i] === after[i]) i++;
  if (i < before.length && i < after.length) {
    const b = before.charCodeAt(i), a = after.charCodeAt(i);
    const mid = Math.floor((b + a) / 2);
    if (mid === b) return before.slice(0, i + 1) + String.fromCharCode(mid) + before.slice(i + 1) + '0';
    return before.slice(0, i) + String.fromCharCode(mid);
  }
  return before + '0';
}

// ── Block factory ─────────────────────────────────────────────
// Every block shares the same shape — only `type` differs.
export function createBlock(type, props = {}) {
  return {
    id: uid(),
    type,
    parentId: props.parentId || null,
    content: props.content || [],
    position: props.position || 'a0',
    properties: props.properties || {},
    createdTime: now(),
    lastEditedTime: now(),
    createdBy: props.createdBy || null,
    lastEditedBy: props.lastEditedBy || null,
    isDeleted: props.isDeleted || false,
    permissionOverride: props.permissionOverride || null,
  };
}

// ── Block type definitions ────────────────────────────────────
// Each type's default properties and compatible transforms.
export const BLOCK_TYPES = {
  page:          { label: 'Page',          icon: '📄', props: { title: '', icon: '📄', cover: null } },
  paragraph:     { label: 'Text',          icon: 'Aa', props: { richText: [] } },
  heading_1:     { label: 'Heading 1',     icon: 'H1', props: { richText: [] } },
  heading_2:     { label: 'Heading 2',     icon: 'H2', props: { richText: [] } },
  heading_3:     { label: 'Heading 3',     icon: 'H3', props: { richText: [] } },
  heading_4:     { label: 'Heading 4',     icon: 'H4', props: { richText: [] } },
  bulleted_list_item: { label: 'Bulleted list', icon: '•', props: { richText: [] } },
  numbered_list_item: { label: 'Numbered list', icon: '1.', props: { richText: [] } },
  to_do:         { label: 'To-do',         icon: '☐', props: { richText: [], checked: false } },
  toggle:        { label: 'Toggle',        icon: '▶', props: { richText: [] } },
  callout:       { label: 'Callout',       icon: '💡', props: { richText: [], icon: '💡', tone: 'info' } },
  quote:         { label: 'Quote',         icon: '"', props: { richText: [] } },
  divider:       { label: 'Divider',       icon: '—', props: {} },
  image:         { label: 'Image',         icon: '🖼', props: { url: '', caption: '' } },
  database:      { label: 'Database',      icon: '🗄', props: { view: 'table', properties: [], rows: [] } },
  code:          { label: 'Code',          icon: '</>', props: { richText: [], language: 'plain' } },
  link_to_page:  { label: 'Link to page',  icon: '🔗', props: { targetPageId: '', title: '', icon: '🔗' } },
  synced_block:  { label: 'Synced block',  icon: '🔄', props: { sourceBlockId: '' } },
  template_button: { label: 'Template button', icon: '🧩', props: { templateBlocks: [] } },
  mention:       { label: 'Mention',       icon: '@', props: { targetPageId: '', title: '' } },
  breadcrumb:    { label: 'Breadcrumb',    icon: '↑', props: { pageIds: [] } },
  column_list:   { label: 'Columns',       icon: '▮▮', props: {} },
  column:        { label: 'Column',        icon: '▮', props: {} },
  columns:       { label: 'Columns',       icon: '▮▮', props: {} },
  table:         { label: 'Table',         icon: '⊞', props: { table: [['Name','Status','Owner'],['Draft','Doing','Me']] } },
  video:         { label: 'Video',         icon: '🎬', props: { url: '', caption: '' } },
  audio:         { label: 'Audio',         icon: '🎵', props: { url: '', caption: '' } },
  file:          { label: 'File',          icon: '📎', props: { url: '', name: '' } },
  bookmark:      { label: 'Bookmark',      icon: '🔖', props: { url: '', title: '', description: '' } },
  table_of_contents: { label: 'Table of contents', icon: '📑', props: { pageIds: [] } },
  tabs:          { label: 'Tabs',          icon: '📂', props: { tabs: [] } },
  form:          { label: 'Form',          icon: '📋', props: { formConfig: { fields: [], submitButtonText: 'Submit', anonymous: false, showResults: false }, submissions: [] } },
};

export const BLOCK_TYPE_LIST = Object.keys(BLOCK_TYPES);

// ── Tree navigation ───────────────────────────────────────────
export function getBlock(blocks, id) {
  return blocks.find(b => b.id === id) || null;
}

export function getChildren(blocks, parentId) {
  const parent = getBlock(blocks, parentId);
  if (!parent) return [];
  return parent.content
    .map(id => getBlock(blocks, id))
    .filter(Boolean)
    .sort((a, b) => (a.position || '').localeCompare(b.position || ''));
}

export function getAncestors(blocks, blockId) {
  const result = [];
  let current = getBlock(blocks, blockId);
  while (current && current.parentId) {
    const parent = getBlock(blocks, current.parentId);
    if (parent) result.unshift(parent);
    current = parent;
  }
  return result;
}

export function getDescendants(blocks, blockId) {
  const result = [];
  const stack = [blockId];
  while (stack.length) {
    const id = stack.pop();
    const block = getBlock(blocks, id);
    if (block && block.content) {
      for (const childId of block.content) {
        result.push(childId);
        stack.push(childId);
      }
    }
  }
  return result;
}

export function getRootPages(blocks) {
  return blocks
    .filter(b => b.type === 'page' && !b.parentId && !b.isDeleted)
    .sort((a, b) => (a.position || '').localeCompare(b.position || ''));
}

// ── Tree mutations (immutable) ────────────────────────────────
export function addChild(blocks, parentId, childBlock, position) {
  const parent = getBlock(blocks, parentId);
  if (!parent) return blocks;
  const siblings = getChildren(blocks, parentId);
  const pos = position || insertBetween(
    siblings.length > 0 ? siblings[siblings.length - 1].position : null,
    null
  );
  const newBlock = { ...childBlock, parentId, position: pos };
  const newContent = [...parent.content, newBlock.id];
  return blocks.map(b =>
    b.id === parentId ? { ...b, content: newContent } :
    b.id === newBlock.id ? newBlock : b
  );
}

export function insertChildAt(blocks, parentId, childBlock, beforeId) {
  const parent = getBlock(blocks, parentId);
  if (!parent) return blocks;
  const siblings = getChildren(blocks, parentId);
  const idx = beforeId ? siblings.findIndex(s => s.id === beforeId) : siblings.length;
  const before = idx > 0 ? siblings[idx - 1].position : null;
  const after = idx < siblings.length ? siblings[idx].position : null;
  const pos = insertBetween(before, after);
  const newBlock = { ...childBlock, parentId, position: pos };
  const newContent = [...parent.content];
  const insertIdx = beforeId ? newContent.indexOf(beforeId) : newContent.length;
  if (insertIdx >= 0) newContent.splice(insertIdx, 0, newBlock.id);
  else newContent.push(newBlock.id);
  return blocks.map(b =>
    b.id === parentId ? { ...b, content: newContent } :
    b.id === childBlock.id ? newBlock : b
  );
}

export function removeChild(blocks, parentId, childId) {
  const parent = getBlock(blocks, parentId);
  if (!parent) return blocks;
  return blocks.map(b =>
    b.id === parentId ? { ...b, content: b.content.filter(id => id !== childId) } : b
  );
}

export function moveBlock(blocks, blockId, newParentId, beforeId) {
  const block = getBlock(blocks, blockId);
  if (!block) return blocks;
  let result = blocks;
  if (block.parentId) result = removeChild(result, block.parentId, blockId);
  const newParent = getBlock(result, newParentId);
  if (!newParent) return result;
  const siblings = getChildren(result, newParentId);
  const idx = beforeId ? siblings.findIndex(s => s.id === beforeId) : siblings.length;
  const before = idx > 0 ? siblings[idx - 1].position : null;
  const after = idx < siblings.length ? siblings[idx].position : null;
  const pos = insertBetween(before, after);
  const newContent = [...newParent.content];
  const insertIdx = beforeId ? newContent.indexOf(beforeId) : newContent.length;
  if (insertIdx >= 0) newContent.splice(insertIdx, 0, blockId);
  else newContent.push(blockId);
  return result.map(b =>
    b.id === newParentId ? { ...b, content: newContent } :
    b.id === blockId ? { ...b, parentId: newParentId, position: pos } : b
  );
}

export function duplicateSubtree(blocks, rootId) {
  const origBlock = getBlock(blocks, rootId);
  if (!origBlock) return blocks;
  const idMap = {};
  const oldIds = [rootId, ...getDescendants(blocks, rootId)];
  const newBlocks = [];
  for (const oldId of oldIds) {
    const newId = uid();
    idMap[oldId] = newId;
  }
  for (const oldId of oldIds) {
    const orig = getBlock(blocks, oldId);
    if (!orig) continue;
    const copy = JSON.parse(JSON.stringify(orig));
    copy.id = idMap[oldId];
    copy.content = (orig.content || []).map(cid => idMap[cid] || cid);
    copy.createdTime = now();
    copy.lastEditedTime = now();
    newBlocks.push(copy);
  }
  return [...blocks, ...newBlocks];
}

export function softDelete(blocks, blockId) {
  const descIds = getDescendants(blocks, blockId);
  const allIds = [blockId, ...descIds];
  return blocks.map(b => allIds.includes(b.id) ? { ...b, isDeleted: true } : b);
}

export function restore(blocks, blockId) {
  const descIds = getDescendants(blocks, blockId);
  const allIds = [blockId, ...descIds];
  return blocks.map(b => allIds.includes(b.id) ? { ...b, isDeleted: false } : b);
}

// ── Permission resolution ─────────────────────────────────────
export function resolvePermission(blocks, blockId, userId) {
  const inheritMap = {};
  let current = getBlock(blocks, blockId);
  while (current) {
    if (current.permissionOverride) {
      const override = current.permissionOverride;
      if (override.type === 'grant' && override.users?.includes(userId)) return override.level;
      if (override.type === 'public') return override.level;
      if (override.type === 'workspace') return 'view';
    }
    inheritMap[current.id] = true;
    if (!current.parentId) break;
    current = getBlock(blocks, current.parentId);
  }
  return null;
}

export function getEffectivePermission(blocks, blockId) {
  let current = getBlock(blocks, blockId);
  while (current) {
    if (current.permissionOverride) return { blockId: current.id, permission: current.permissionOverride };
    if (!current.parentId) break;
    current = getBlock(blocks, current.parentId);
  }
  return null;
}

// Walk parentId chain to determine if a page is read-only.
// Returns 'edit' or 'view'.
export function getPagePermission(page, pages) {
  if (!page) return 'edit';
  if (page.permission === 'view') return 'view';
  if (page.parentId) {
    const parent = pages.find(p => p.id === page.parentId);
    if (parent) return getPagePermission(parent, pages);
  }
  return 'edit';
}

// ── Block type transformation ─────────────────────────────────
export function turnInto(block, newType) {
  const typeDef = BLOCK_TYPES[newType];
  if (!typeDef) return block;
  const compatibleProps = {};
  const oldProps = block.properties || {};
  const newDefaults = typeDef.props;
  for (const key of Object.keys(newDefaults)) {
    compatibleProps[key] = oldProps[key] !== undefined ? oldProps[key] : newDefaults[key];
  }
  for (const key of ['richText', 'title']) {
    if (oldProps[key] !== undefined) compatibleProps[key] = oldProps[key];
  }
  compatibleProps.checked = newType === 'to_do' ? (oldProps.checked || false) : undefined;
  return { ...block, type: newType, properties: compatibleProps };
}

// ── Block title helper ────────────────────────────────────────
export function getBlockTitle(block) {
  if (!block) return '';
  if (block.type === 'page') return block.properties?.title || '';
  const richText = block.properties?.richText || [];
  return richText.map(r => r.text || '').join('');
}

export function setBlockTitle(block, title) {
  if (block.type === 'page') return { ...block, properties: { ...block.properties, title } };
  return { ...block, properties: { ...block.properties, richText: [{ text: title }] } };
}

// ── Utils ─────────────────────────────────────────────────────
export function makeEmptyDatabase() {
  return {
    view: 'table',
    groupBy: 'status',
    filter: '',
    sort: 'name',
    properties: [
      { id: 'name', name: 'Name', type: 'text' },
      { id: 'status', name: 'Status', type: 'select' },
      { id: 'date', name: 'Date', type: 'date' },
      { id: 'priority', name: 'Priority', type: 'select' },
      { id: 'done', name: 'Done', type: 'checkbox' },
      { id: 'notes', name: 'Notes', type: 'text' }
    ],
    rows: []
  };
}
