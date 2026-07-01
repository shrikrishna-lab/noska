import { createEmptyDatabase, addRow, removeRow, patchRow, duplicateRows } from "../services/databaseService";
import { createView, patchView, ensureView, getActiveView, findView, addNamedView, removeView } from "../services/viewService";
import { addProperty, patchProperty, removeProperty as removePropDef } from "../services/propertyService";
import { evaluateFilterGroup, textSearch, evaluateFilters } from "../utils/filterEngine";
import { sortRows, sortRowsByMultiple } from "../utils/sortEngine";

/**
 * Hook-style database operations. Returns an object of bound functions
 * that operate on an immutable database state.
 *
 * @param {import("../types/database").DatabaseSchema} db
 * @param {(patch: Partial<import("../types/database").DatabaseSchema>) => void} onPatch
 */
export function useDatabase(db, onPatch) {
  return {
    addRow: (partialRow) => onPatch(addRow(db, partialRow)),
    removeRow: (rowId) => onPatch(removeRow(db, rowId)),
    patchRow: (rowId, patch) => onPatch(patchRow(db, rowId, patch)),
    duplicateRows: (rowIds) => onPatch(duplicateRows(db, rowIds)),

    addProperty: (name, type) => onPatch({ ...db, properties: addProperty(db.properties, name, type) }),
    patchProperty: (propId, p) => onPatch({ ...db, properties: patchProperty(db.properties, propId, p) }),
    removeProperty: (propId) => onPatch(removePropDef(db, propId)),

    ensureView: (type) => {
      const result = ensureView(db.views, type, db.activeViewId);
      onPatch({ views: result.views, activeViewId: result.activeViewId });
    },
    patchView: (patch) => onPatch({ views: patchView(db.views, db.activeViewId, patch) }),
    addNamedView: (type, name) => {
      const result = addNamedView(db.views, type, name);
      onPatch({ views: result.views, activeViewId: result.newViewId });
    },
    removeView: (viewId) => onPatch({ views: removeView(db.views, viewId) }),

    getActiveView: () => getActiveView(db.views, db.activeViewId),

    /**
     * Returns filtered + sorted rows for the active view.
     * Supports both new spec-style (filters/sorts) and
     * legacy (filterGroup / sort+sortAsc) view properties.
     */
    getFilteredSortedRows: (searchQuery) => {
      const activeView = getActiveView(db.views, db.activeViewId);
      let rows = [...(db.rows || [])];

      // Apply filters — check spec-style filters first, fall back to filterGroup
      const hasSpecFilters = activeView.filters?.conditions?.length > 0;
      if (hasSpecFilters) {
        rows = rows.filter(row => evaluateFilters(row, activeView.filters));
      } else if (activeView.filterGroup) {
        rows = rows.filter(row => evaluateFilterGroup(row, activeView.filterGroup));
      }

      // Apply text search
      if (searchQuery) {
        rows = textSearch(rows, searchQuery);
      }

      // Apply sorts — spec-style sorts array first, fall back to single sort
      const hasSpecSorts = activeView.sorts?.length > 0;
      if (hasSpecSorts) {
        rows = sortRowsByMultiple(rows, activeView.sorts);
      } else if (activeView.sort) {
        rows = sortRows(rows, activeView.sort, activeView.sortAsc !== false);
      }

      return rows;
    },
  };
}
