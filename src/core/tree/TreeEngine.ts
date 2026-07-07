import { isPageEntity } from "../../utils/pageTreeOps";
import type { Page } from "../../lib/supabaseService";

/** A tree-flattened page item — `flattenTreeFromContent`'s output augments
 * a real `Page` with two session-only bookkeeping fields consumed by
 * PageTree.tsx (`_depth` for indentation, `_hasChildren` for the chevron). */
export interface FlattenedPage extends Page {
  _depth: number;
  _hasChildren: boolean;
}

export function getAncestorPath(pageId: string, allPages: Page[]): Page[] {
  const byId = new Map(allPages.map(p => [p.id, p]));
  const path: Page[] = [];
  let cursor = byId.get(pageId);
  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return path;
}

export function flattenTreeFromContent(
  content: string[] | undefined,
  allBlocks: Page[],
  collapsedPages: Set<string>,
  depth = 0
): FlattenedPage[] {
  const result: FlattenedPage[] = [];
  for (const childId of content || []) {
    const block = allBlocks.find(b => b.id === childId);
    if (!isPageEntity(block)) continue;
    // `isPageEntity` returns a plain boolean, not a type predicate, so TS
    // can't narrow `block` from `Page | undefined` on its own — but the
    // `continue` above guarantees block is defined here (isPageEntity(undefined)
    // is always false per its own implementation in pageTreeOps.ts).
    const definiteBlock = block as Page;
    const hasChildren = definiteBlock.content?.some(cid =>
      isPageEntity(allBlocks.find(b => b.id === cid))
    ) ?? false;
    result.push({ ...definiteBlock, _depth: depth, _hasChildren: hasChildren });
    if (!collapsedPages.has(definiteBlock.id) && definiteBlock.content) {
      const children = flattenTreeFromContent(definiteBlock.content, allBlocks, collapsedPages, depth + 1);
      result.push(...children);
    }
  }
  return result;
}

export function getDescendantIdsFromContent(pageId: string, allBlocks: Page[]): string[] {
  const ids: string[] = [];
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

export function smartDepthOpacity(depth: number): number {
  const levels: Record<number, number> = { 0: 1, 1: 0.7, 2: 0.45, 3: 0.25 };
  return levels[depth] ?? 0.15;
}
