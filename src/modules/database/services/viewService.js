import { uid } from "../../../utils/helpers";

/**
 * Creates a new view.
 * @param {import("../types/database").ViewDefinition["type"]} type
 * @param {string} name
 * @returns {import("../types/database").ViewDefinition}
 */
export function createView(type, name) {
  const view = {
    id: `${type}-${uid().slice(0, 8)}`,
    type,
    name,
    sort: 'name',
    sortAsc: true,
    filterGroup: null,
    filters: { operator: 'and', conditions: [] },
    sorts: [{ columnId: 'name', direction: 'ascending' }],
  };
  if (type === 'board') view.groupBy = 'status';
  return view;
}

/**
 * Patches the active view in the views array.
 * @param {import("../types/database").ViewDefinition[]} views
 * @param {string} activeViewId
 * @param {Partial<import("../types/database").ViewDefinition>} patch
 * @returns {import("../types/database").ViewDefinition[]}
 */
export function patchView(views, activeViewId, patch) {
  return views.map(v =>
    v.id === activeViewId ? { ...v, ...patch } : v
  );
}

/**
 * Gets or creates a view by type. Falls back to existing view of same type.
 * @param {import("../types/database").ViewDefinition[]} views
 * @param {import("../types/database").ViewDefinition["type"]} type
 * @param {string} activeViewId
 * @returns {{ views: import("../types/database").ViewDefinition[], activeViewId: string }}
 */
export function ensureView(views, type, activeViewId) {
  const existing = views.find(v => v.type === type);
  if (existing) return { views, activeViewId: existing.id };
  const newView = createView(type, type.charAt(0).toUpperCase() + type.slice(1));
  return { views: [...views, newView], activeViewId: newView.id };
}

/**
 * @param {import("../types/database").ViewDefinition[]} views
 * @param {string} viewId
 * @returns {import("../types/database").ViewDefinition|undefined}
 */
export function findView(views, viewId) {
  return views.find(v => v.id === viewId);
}

/**
 * Gets the active view, falling back to the first view or a default.
 * @param {import("../types/database").ViewDefinition[]} views
 * @param {string} viewId
 * @returns {import("../types/database").ViewDefinition}
 */
export function getActiveView(views, viewId) {
  if (!views || !Array.isArray(views)) return createView('table', 'Table');
  return views.find(v => v.id === viewId) || views[0] || createView('table', 'Table');
}

/**
 * Adds a new named view to the views array.
 * @param {import("../types/database").ViewDefinition[]} views
 * @param {import("../types/database").ViewDefinition["type"]} type
 * @param {string} name
 * @returns {{ views: import("../types/database").ViewDefinition[], newViewId: string }}
 */
export function addNamedView(views, type, name) {
  const newView = createView(type, name);
  return { views: [...views, newView], newViewId: newView.id };
}

/**
 * Removes a view by id. Will not remove the last view.
 * @param {import("../types/database").ViewDefinition[]} views
 * @param {string} viewId
 * @returns {import("../types/database").ViewDefinition[]}
 */
export function removeView(views, viewId) {
  if (views.length <= 1) return views;
  return views.filter(v => v.id !== viewId);
}
