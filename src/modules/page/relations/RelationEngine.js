/**
 * Relation engine for page-to-page links.
 * Supports one-to-one, one-to-many, many-to-many.
 */

let relationStore = [];

/**
 * @typedef {Object} Relation
 * @property {string} id
 * @property {string} sourcePageId
 * @property {string} targetPageId
 * @property {string} propertyId — which property defines this relation
 * @property {"one-to-one"|"one-to-many"|"many-to-many"} type
 * @property {string} [sourceTitle]
 * @property {string} [targetTitle]
 */

export function addRelation(sourceId, targetId, propertyId, type = "many-to-many") {
  const id = `${sourceId}->${targetId}--${propertyId}`;
  if (relationStore.some(r => r.id === id)) return;
  relationStore.push({ id, sourcePageId: sourceId, targetPageId: targetId, propertyId, type });
}

export function removeRelation(sourceId, targetId, propertyId) {
  const id = `${sourceId}->${targetId}--${propertyId}`;
  relationStore = relationStore.filter(r => r.id !== id);
}

export function getRelationsForPage(pageId) {
  return relationStore.filter(r => r.sourcePageId === pageId || r.targetPageId === pageId);
}

export function getLinkedPages(pageId) {
  const rels = getRelationsForPage(pageId);
  return rels.map(r => r.sourcePageId === pageId ? r.targetPageId : r.sourcePageId);
}

export function clearRelations() {
  relationStore = [];
}
