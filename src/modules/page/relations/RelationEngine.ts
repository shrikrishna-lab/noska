/**
 * Relation engine for page-to-page links.
 * Supports one-to-one, one-to-many, many-to-many.
 */

export type RelationType = "one-to-one" | "one-to-many" | "many-to-many";

export interface Relation {
  id: string;
  sourcePageId: string;
  targetPageId: string;
  /** which property defines this relation */
  propertyId: string;
  type: RelationType;
  sourceTitle?: string;
  targetTitle?: string;
}

let relationStore: Relation[] = [];

export function addRelation(sourceId: string, targetId: string, propertyId: string, type: RelationType = "many-to-many"): void {
  const id = `${sourceId}->${targetId}--${propertyId}`;
  if (relationStore.some(r => r.id === id)) return;
  relationStore.push({ id, sourcePageId: sourceId, targetPageId: targetId, propertyId, type });
}

export function removeRelation(sourceId: string, targetId: string, propertyId: string): void {
  const id = `${sourceId}->${targetId}--${propertyId}`;
  relationStore = relationStore.filter(r => r.id !== id);
}

export function getRelationsForPage(pageId: string): Relation[] {
  return relationStore.filter(r => r.sourcePageId === pageId || r.targetPageId === pageId);
}

export function getLinkedPages(pageId: string): string[] {
  const rels = getRelationsForPage(pageId);
  return rels.map(r => r.sourcePageId === pageId ? r.targetPageId : r.sourcePageId);
}

export function clearRelations(): void {
  relationStore = [];
}
