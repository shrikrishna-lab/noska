import { uid } from "../../../utils/helpers";
import type { ViewDefinition } from "../types/database";

/**
 * Creates a new view.
 */
export function createView(type: ViewDefinition["type"], name: string): ViewDefinition {
  const view: ViewDefinition = {
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
 */
export function patchView(views: ViewDefinition[], activeViewId: string, patch: Partial<ViewDefinition>): ViewDefinition[] {
  return views.map(v =>
    v.id === activeViewId ? { ...v, ...patch } : v
  );
}

/**
 * Gets or creates a view by type. Falls back to existing view of same type.
 */
export function ensureView(views: ViewDefinition[], type: ViewDefinition["type"], activeViewId: string): { views: ViewDefinition[]; activeViewId: string } {
  const existing = views.find(v => v.type === type);
  if (existing) return { views, activeViewId: existing.id };
  const newView = createView(type, type.charAt(0).toUpperCase() + type.slice(1));
  return { views: [...views, newView], activeViewId: newView.id };
}

export function findView(views: ViewDefinition[], viewId: string): ViewDefinition | undefined {
  return views.find(v => v.id === viewId);
}

/**
 * Gets the active view, falling back to the first view or a default.
 */
export function getActiveView(views: ViewDefinition[] | null | undefined, viewId: string): ViewDefinition {
  if (!views || !Array.isArray(views)) return createView('table', 'Table');
  return views.find(v => v.id === viewId) || views[0] || createView('table', 'Table');
}

/**
 * Adds a new named view to the views array.
 */
export function addNamedView(views: ViewDefinition[], type: ViewDefinition["type"], name: string): { views: ViewDefinition[]; newViewId: string } {
  const newView = createView(type, name);
  return { views: [...views, newView], newViewId: newView.id };
}

/**
 * Removes a view by id. Will not remove the last view.
 */
export function removeView(views: ViewDefinition[], viewId: string): ViewDefinition[] {
  if (views.length <= 1) return views;
  return views.filter(v => v.id !== viewId);
}
