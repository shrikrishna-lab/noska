// Page tree operations — render tree (content[]) + permission tree (parentId)

export function isPageEntity(block) {
  if (!block) return false;
  if (block.type === 'page') return true;
  return block.title !== undefined && Array.isArray(block.blocks) && !block.properties;
}

export function ensurePageEntity(page) {
  if (!page) return page;
  if (page.type === 'page') return page;
  if (page.title !== undefined && Array.isArray(page.blocks)) return { ...page, type: 'page' };
  return page;
}

export function normalizePages(sourcePages, orderHints = new Map()) {
  const pages = sourcePages.map(ensurePageEntity);
  const validIds = new Set(pages.map((p) => p.id));
  const childrenByParent = new Map();

  const normalizedParents = pages.map((page) => {
    const parentId = page.parentId && validIds.has(page.parentId) && page.parentId !== page.id
      ? page.parentId
      : null;
    if (parentId) {
      const siblings = childrenByParent.get(parentId) || [];
      siblings.push(page.id);
      childrenByParent.set(parentId, siblings);
    }
    return { ...page, parentId };
  });

  return normalizedParents.map((page) => {
    const childIds = childrenByParent.get(page.id) || [];
    const ordered = [];
    const addChild = (id) => {
      if (childIds.includes(id) && !ordered.includes(id)) ordered.push(id);
    };
    (orderHints.get(page.id) || []).forEach(addChild);
    (page.content || []).forEach(addChild);
    childIds.forEach(addChild);
    return { ...page, content: ordered };
  });
}

function childBlockIds(blocks, parentId) {
  const ids = new Set(blocks.map((b) => b.id));
  if (!parentId) {
    return blocks
      .filter((b) => !b.parentId || !ids.has(b.parentId))
      .map((b) => b.id);
  }
  const parent = blocks.find((b) => b.id === parentId);
  const explicit = (parent?.content || []).filter((id) => ids.has(id));
  const explicitSet = new Set(explicit);
  const implicit = blocks
    .filter((b) => b.parentId === parentId && !explicitSet.has(b.id))
    .map((b) => b.id);
  return [...explicit, ...implicit];
}

export function flattenBlockIds(blocks, parentId = null, seen = new Set()) {
  const result = [];
  for (const id of childBlockIds(blocks, parentId)) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    result.push(...flattenBlockIds(blocks, id, seen));
  }
  if (parentId === null) {
    for (const block of blocks) {
      if (!seen.has(block.id)) {
        seen.add(block.id);
        result.push(block.id);
      }
    }
  }
  return result;
}

function pageBlockIndex(blocks, flatIds, pageId) {
  const direct = flatIds.indexOf(pageId);
  if (direct >= 0) return direct;
  const linked = blocks.find((b) => b.linkedPageId === pageId);
  return linked ? flatIds.indexOf(linked.id) : -1;
}

export function computeContentInsertIndex(parentPage, afterBlockId) {
  const blocks = parentPage.blocks || [];
  const flatIds = flattenBlockIds(blocks);
  const afterIdx = flatIds.indexOf(afterBlockId);
  const content = parentPage.content || [];
  if (afterIdx < 0) return content.length;

  let insertAt = 0;
  for (const childId of content) {
    const blockIdx = pageBlockIndex(blocks, flatIds, childId);
    if (blockIdx >= 0 && blockIdx <= afterIdx) insertAt++;
  }
  return insertAt;
}

export function getPageSubtreeIds(pageId, sourcePages) {
  const byId = new Map(sourcePages.map((page) => [page.id, page]));
  const result = new Set();

  const visit = (id) => {
    if (!byId.has(id) || result.has(id)) return;
    result.add(id);
    const page = byId.get(id);
    sourcePages.forEach((candidate) => {
      if (candidate.parentId === id) visit(candidate.id);
    });
    (page.content || []).forEach(visit);
  };

  visit(pageId);
  return result;
}

export function getAncestorPath(pageId, allPages) {
  const byId = new Map(allPages.map(p => [p.id, p]));
  const path = [];
  let cursor = byId.get(pageId);
  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : null;
  }
  return path;
}

export function insertBlockAfterTree(blocks, afterId, newBlock) {
  const anchor = blocks.find((block) => block.id === afterId);
  if (!anchor) return [...blocks, newBlock];
  const parentId = anchor.parentId || null;
  const blockToInsert = { ...newBlock, parentId, content: newBlock.content || [] };
  const next = moveArrayItemAfter([...blocks, blockToInsert], blockToInsert.id, afterId);
  if (!parentId) return next;
  return insertChildBlockAfter(next, parentId, blockToInsert.id, afterId);
}

function moveArrayItemAfter(items, itemId, afterId) {
  const next = [...items];
  const from = next.findIndex((block) => block.id === itemId);
  const after = next.findIndex((block) => block.id === afterId);
  if (from < 0 || after < 0 || from === after) return next;
  const [item] = next.splice(from, 1);
  const target = next.findIndex((block) => block.id === afterId);
  next.splice(target + 1, 0, item);
  return next;
}

function insertChildBlockAfter(blocks, parentId, childId, afterId) {
  return blocks.map((block) => {
    if (block.id !== parentId) return block;
    const content = (Array.isArray(block.content) ? block.content : []).filter((id) => id !== childId);
    const afterIndex = content.indexOf(afterId);
    if (afterIndex < 0) content.push(childId);
    else content.splice(afterIndex + 1, 0, childId);
    return { ...block, content };
  });
}

export function insertSubpageInTree(pages, parentPageId, afterBlockId, subpage, pageBlock) {
  const parent = pages.find((p) => p.id === parentPageId);
  if (!parent) return pages;

  const content = [...(parent.content || [])];
  const insertAt = computeContentInsertIndex(parent, afterBlockId);
  content.splice(insertAt, 0, subpage.id);

  const nextBlocks = insertBlockAfterTree(parent.blocks || [], afterBlockId, pageBlock);

  const withSubpage = pages.map((p) => {
    if (p.id === parentPageId) return { ...p, content, blocks: nextBlocks };
    return p;
  });

  return normalizePages([subpage, ...withSubpage]);
}
