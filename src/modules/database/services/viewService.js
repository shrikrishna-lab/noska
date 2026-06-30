import { uid } from "../../../utils/helpers";

/**
 * Creates a new view.
 * @param {import("../types/database").ViewDefinition["type"]} type
 * @param {string} name
 * @returns {import("../types/database").ViewDefinition}
 */
export function createView(type, name) {
  const view = { id: `${type}-${uid().slice(0, 8)}`, type, name, sort: 'name', sortAsc: true, filterGroup: null };
  if (type === 'board') view.groupBy = 'status';
  return view;
}

/**
 * Patches a view in the views array.
 * @param {import("../types/database").ViewDefinition[]} views
 * @param {string} activeViewId
 * @param {Partial<import("../types/database").ViewDefinition>} patch
 * @returns {import("../types/database").ViewDefinition[]}
 */
export function patchView(views, activeViewId, patch) {
  return views.map(v => v.id === activeViewId ? { ...v, ...patch } : v);
}

/**
 * Gets or creates a view by type.
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
 * @param {import("../types/database").ViewDefinition[]} views
 * @param {string} viewId
 * @returns {import("../types/database").ViewDefinition}
 */
export function getActiveView(views, viewId) {
  return views.find(v => v.id === viewId) || views[0] || createView('table', 'Table');
}
