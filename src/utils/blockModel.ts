// ═══════════════════════════════════════════════════════════════
// BlockModel — Universal Block Primitive
// Every entity in the system is a Block. A page is a block with
// type='page' that renders its content on a new screen.
//
// Two independent relationships:
//   content[]  → render tree (ordered child block IDs)
//   parentId   → permission chain (single upward pointer)
// ═══════════════════════════════════════════════════════════════

/** Generic tree-node shape every function in this file actually operates
 * on. This is deliberately NOT the real `Block` union from
 * types/blocks.ts — that union describes the richer, helpers.js-authored
 * runtime shape (see that file's header comment). Every function here
 * only ever touches id/parentId/content/position/properties/isDeleted/
 * permissionOverride, so a minimal structural shape is more honest than
 * importing `Block` and letting extra fields silently pass through
 * unchecked. `createBlock()`'s return satisfies this shape exactly. */
export interface TreeBlock {
  id: string;
  type: string;
  parentId: string | null;
  content: string[];
  position: string;
  properties: Record<string, unknown>;
  createdTime: string;
  lastEditedTime: string;
  createdBy: string | null;
  lastEditedBy: string | null;
  isDeleted: boolean;
  permissionOverride: PermissionOverride | null;
  // Every real block also carries top-level fields beyond this base shape
  // (text, database, table, columns, ...) added by helpers.js's
  // blockFor() — irrelevant to this file's tree/factory operations, so
  // covered by an index signature rather than duplicating types/blocks.ts.
  [key: string]: unknown;
}

export interface PermissionOverride {
  type: "grant" | "public" | "workspace";
  level: string;
  users?: string[];
}

export const uid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
export const now = (): string => new Date().toISOString();

// ── Fractional indexing ──────────────────────────────────────
// Generates a position string between `before` and `after`.
// Example: insertBetween('a0', 'a1') → 'a05'
export function insertBetween(before: string | null | undefined, after: string | null | undefined): string {
  if (!before && !after) return 'a0';
  if (!before) return after![0] + '0' + after!.slice(1);
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

/** Loose partial input accepted by createBlock — callers (helpers.js's
 * blockFor, mainly) only ever supply a subset of these fields. */
export interface CreateBlockProps {
  parentId?: string | null;
  content?: string[];
  position?: string;
  properties?: Record<string, unknown>;
  createdBy?: string | null;
  lastEditedBy?: string | null;
  isDeleted?: boolean;
  permissionOverride?: PermissionOverride | null;
}

// ── Block factory ─────────────────────────────────────────────
// Every block shares the same shape — only `type` differs.
export function createBlock(type: string, props: CreateBlockProps = {}): TreeBlock {
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

interface BlockTypeDef {
  label: string;
  icon: string;
  // Heterogeneous by design — every block type's default properties bag
  // has a completely different shape (richText vs. table vs. formConfig
  // etc.), same rationale as BaseBlock.properties in types/blocks.ts.
  // Forcing a narrower type here would just mean casting it away at every
  // one of the ~40 entries below for no real safety gain.
  props: Record<string, unknown>;
}

// ── Block type definitions ────────────────────────────────────
// Each type's default properties and compatible transforms.
export const BLOCK_TYPES: Record<string, BlockTypeDef> = {
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
  'toggle-h1':   { label: 'Toggle heading 1', icon: '▶', props: { richText: [] } },
  'toggle-h2':   { label: 'Toggle heading 2', icon: '▶', props: { richText: [] } },
  'toggle-h3':   { label: 'Toggle heading 3', icon: '▶', props: { richText: [] } },
  'ai-block':    { label: 'AI block',      icon: '🤖', props: { richText: [] } },
  mermaid:       { label: 'Mermaid',        icon: '📊', props: { richText: [] } },
  'ai-meeting':  { label: 'AI meeting',     icon: '🎙', props: { richText: [] } },
  'inline-equation': { label: 'Inline equation', icon: '∑', props: { richText: [] } },
  'block-equation': { label: 'Block equation', icon: '∑', props: { richText: [] } },
};

export const BLOCK_TYPE_LIST = Object.keys(BLOCK_TYPES);

// ── Tree navigation ───────────────────────────────────────────
export function getBlock(blocks: TreeBlock[], id: string | null | undefined): TreeBlock | null {
  return blocks.find(b => b.id === id) || null;
}

export function getChildren(blocks: TreeBlock[], parentId: string): TreeBlock[] {
  const parent = getBlock(blocks, parentId);
  if (!parent) return [];
  return parent.content
    .map(id => getBlock(blocks, id))
    .filter((b): b is TreeBlock => b !== null)
    .sort((a, b) => (a.position || '').localeCompare(b.position || ''));
}

export function getAncestors(blocks: TreeBlock[], blockId: string): TreeBlock[] {
  const result: TreeBlock[] = [];
  let current = getBlock(blocks, blockId);
  while (current && current.parentId) {
    const parent = getBlock(blocks, current.parentId);
    if (parent) result.unshift(parent);
    current = parent;
  }
  return result;
}

export function getDescendants(blocks: TreeBlock[], blockId: string): string[] {
  const result: string[] = [];
  const stack: string[] = [blockId];
  while (stack.length) {
    const id = stack.pop()!;
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

// Not called anywhere in the current codebase (grepped) — kept typed as
// part of this module's public re-export surface (helpers.js re-exports
// it) rather than removed, since removing exports is out of scope for a
// type-only migration pass.
export function getRootPages(blocks: TreeBlock[]): TreeBlock[] {
  return blocks
    .filter(b => b.type === 'page' && !b.parentId && !b.isDeleted)
    .sort((a, b) => (a.position || '').localeCompare(b.position || ''));
}

// ── Tree mutations (immutable) ────────────────────────────────
// Not called anywhere in the current codebase (grepped, same as
// getRootPages above) — typed for the same reason.
export function addChild(blocks: TreeBlock[], parentId: string, childBlock: TreeBlock, position?: string): TreeBlock[] {
  const parent = getBlock(blocks, parentId);
  if (!parent) return blocks;
  const siblings = getChildren(blocks, parentId);
  const pos = position || insertBetween(
    siblings.length > 0 ? siblings[siblings.length - 1].position : null,
    null
  );
  const newBlock: TreeBlock = { ...childBlock, parentId, position: pos };
  const newContent = [...parent.content, newBlock.id];
  return blocks.map(b =>
    b.id === parentId ? { ...b, content: newContent } :
    b.id === newBlock.id ? newBlock : b
  );
}

export function insertChildAt(blocks: TreeBlock[], parentId: string, childBlock: TreeBlock, beforeId?: string | null): TreeBlock[] {
  const parent = getBlock(blocks, parentId);
  if (!parent) return blocks;
  const siblings = getChildren(blocks, parentId);
  const idx = beforeId ? siblings.findIndex(s => s.id === beforeId) : siblings.length;
  const before = idx > 0 ? siblings[idx - 1].position : null;
  const after = idx < siblings.length ? siblings[idx].position : null;
  const pos = insertBetween(before, after);
  const newBlock: TreeBlock = { ...childBlock, parentId, position: pos };
  const newContent = [...parent.content];
  const insertIdx = beforeId ? newContent.indexOf(beforeId) : newContent.length;
  if (insertIdx >= 0) newContent.splice(insertIdx, 0, newBlock.id);
  else newContent.push(newBlock.id);
  return blocks.map(b =>
    b.id === parentId ? { ...b, content: newContent } :
    b.id === childBlock.id ? newBlock : b
  );
}

export function removeChild(blocks: TreeBlock[], parentId: string, childId: string): TreeBlock[] {
  const parent = getBlock(blocks, parentId);
  if (!parent) return blocks;
  return blocks.map(b =>
    b.id === parentId ? { ...b, content: b.content.filter(id => id !== childId) } : b
  );
}

export function moveBlock(blocks: TreeBlock[], blockId: string, newParentId: string, beforeId?: string | null): TreeBlock[] {
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

export function duplicateSubtree(blocks: TreeBlock[], rootId: string): TreeBlock[] {
  const origBlock = getBlock(blocks, rootId);
  if (!origBlock) return blocks;
  const idMap: Record<string, string> = {};
  const oldIds = [rootId, ...getDescendants(blocks, rootId)];
  const newBlocks: TreeBlock[] = [];
  for (const oldId of oldIds) {
    const newId = uid();
    idMap[oldId] = newId;
  }
  for (const oldId of oldIds) {
    const orig = getBlock(blocks, oldId);
    if (!orig) continue;
    const copy: TreeBlock = JSON.parse(JSON.stringify(orig));
    copy.id = idMap[oldId];
    copy.content = (orig.content || []).map(cid => idMap[cid] || cid);
    copy.createdTime = now();
    copy.lastEditedTime = now();
    newBlocks.push(copy);
  }
  return [...blocks, ...newBlocks];
}

export function softDelete(blocks: TreeBlock[], blockId: string): TreeBlock[] {
  const descIds = getDescendants(blocks, blockId);
  const allIds = [blockId, ...descIds];
  return blocks.map(b => allIds.includes(b.id) ? { ...b, isDeleted: true } : b);
}

export function restore(blocks: TreeBlock[], blockId: string): TreeBlock[] {
  const descIds = getDescendants(blocks, blockId);
  const allIds = [blockId, ...descIds];
  return blocks.map(b => allIds.includes(b.id) ? { ...b, isDeleted: false } : b);
}

// ── Permission resolution ─────────────────────────────────────
// Not called anywhere in the current codebase (grepped) — typed for the
// same reason as getRootPages/addChild/etc. above.
export function resolvePermission(blocks: TreeBlock[], blockId: string, userId: string | null | undefined): string | null {
  let current = getBlock(blocks, blockId);
  while (current) {
    if (current.permissionOverride) {
      const override = current.permissionOverride;
      if (override.type === 'grant' && userId && override.users?.includes(userId)) return override.level;
      if (override.type === 'public') return override.level;
      if (override.type === 'workspace') return 'view';
    }
    if (!current.parentId) break;
    current = getBlock(blocks, current.parentId);
  }
  return null;
}

export interface EffectivePermission {
  blockId: string;
  permission: PermissionOverride;
}

// Not called anywhere in the current codebase (grepped) — typed for the
// same reason as the functions above.
export function getEffectivePermission(blocks: TreeBlock[], blockId: string): EffectivePermission | null {
  let current = getBlock(blocks, blockId);
  while (current) {
    if (current.permissionOverride) return { blockId: current.id, permission: current.permissionOverride };
    if (!current.parentId) break;
    current = getBlock(blocks, current.parentId);
  }
  return null;
}

/** Loose shape for the `page`/`pages` params below — this file predates
 * (and is more permissive than) the real `Page` interface in
 * src/lib/supabaseService.ts. Only `id`/`parentId`/`permission` are ever
 * read here, so a minimal structural shape (rather than importing `Page`
 * and creating a cross-layer dependency from this low-level utils file
 * into the data layer) keeps this function usable with either a real
 * `Page` or a bare block-shaped object, matching how it's actually called
 * (`getPagePermission(page, pages)` in src/components/Editor.jsx passes
 * real `Page` objects, which satisfy this structurally). */
interface PermissionCheckable {
  id: string;
  parentId?: string | null;
  permission?: string;
}

// Walk parentId chain to determine if a page is read-only.
// Returns 'edit' or 'view'.
export function getPagePermission(page: PermissionCheckable | null | undefined, pages: PermissionCheckable[]): "edit" | "view" {
  if (!page) return 'edit';
  if (page.permission === 'view') return 'view';
  if (page.parentId) {
    const parent = pages.find(p => p.id === page.parentId);
    if (parent) return getPagePermission(parent, pages);
  }
  return 'edit';
}

// ── Block type transformation ─────────────────────────────────
export function turnInto(block: TreeBlock, newType: string): TreeBlock {
  const typeDef = BLOCK_TYPES[newType];
  if (!typeDef) return block;
  const compatibleProps: Record<string, unknown> = {};
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

/** Loose shape for the block param below — this predates types/blocks.ts
 * and only ever reads `type`/`properties`, same rationale as
 * PermissionCheckable above. */
interface TitleReadable {
  type: string;
  properties?: { title?: string; richText?: Array<{ text?: string }> };
}

// ── Block title helper ────────────────────────────────────────
export function getBlockTitle(block: TitleReadable | null | undefined): string {
  if (!block) return '';
  if (block.type === 'page') return block.properties?.title || '';
  const richText = block.properties?.richText || [];
  return richText.map(r => r.text || '').join('');
}

export function setBlockTitle<T extends TitleReadable>(block: T, title: string): T {
  if (block.type === 'page') return { ...block, properties: { ...block.properties, title } };
  return { ...block, properties: { ...block.properties, richText: [{ text: title }] } };
}

/** Return shape of makeEmptyDatabase() — matches the `DatabaseSchema`
 * interface in types/blocks.ts field-for-field (this is in fact the sole
 * runtime producer of that shape), but re-declared locally rather than
 * imported to avoid this low-level utils file depending on the
 * block-shape type module for a single return-type annotation. Callers
 * that need the real `DatabaseSchema` type (e.g. DatabaseBlock.tsx)
 * already cast this call site's result — see that file's comment. */
export interface EmptyDatabase {
  view: string;
  groupBy: string;
  filter: string;
  sort: string;
  properties: Array<{ id: string; name: string; type: string }>;
  rows: unknown[];
  views: Array<{ id: string; name: string; type: string }>;
  activeViewId: string;
}

// ── Utils ─────────────────────────────────────────────────────
export function makeEmptyDatabase(): EmptyDatabase {
  // Minimal empty structure: a single "Name" title column and zero rows.
  // No pre-seeded sample columns/rows — the user builds their own schema.
  // Additional properties (Status, Date, etc.) are added on demand via the UI.
  return {
    view: 'table',
    groupBy: 'status',
    filter: '',
    sort: 'name',
    properties: [
      { id: 'name', name: 'Name', type: 'text' }
    ],
    rows: [],
    views: [{ id: 'v-default', name: 'Table', type: 'table' }],
    activeViewId: 'v-default'
  };
}
