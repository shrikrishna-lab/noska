import { isPageEntity } from "../../utils/pageTreeOps";

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

export function flattenTreeFromContent(content, allBlocks, collapsedPages, depth = 0) {
  const result = [];
  for (const childId of content || []) {
    const block = allBlocks.find(b => b.id === childId);
    if (!isPageEntity(block)) continue;
    const hasChildren = block.content?.some(childId =>
      isPageEntity(allBlocks.find(b => b.id === childId))
    ) ?? false;
    result.push({ ...block, _depth: depth, _hasChildren: hasChildren });
    if (!collapsedPages.has(block.id) && block.content) {
      const children = flattenTreeFromContent(block.content, allBlocks, collapsedPages, depth + 1);
      result.push(...children);
    }
  }
  return result;
}

export function getDescendantIdsFromContent(pageId, allBlocks) {
  const ids = [];
  const page = allBlocks.find(b => b.id === pageId);
  if (!page?.content) return ids;
  for (const childId of page.content) {
    const child = allBlocks.find(b => b.id === childId);
    if (isPageEntity(child)) {
      ids.push(childId, ...getDescendantIdsFromContent(childId, allBlocks));
    }
  }
  return ids;
}

export function smartDepthOpacity(depth) {
  const levels = { 0: 1, 1: 0.7, 2: 0.45, 3: 0.25 };
  return levels[depth] ?? 0.15;
}
