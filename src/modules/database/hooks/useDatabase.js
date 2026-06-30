import { createEmptyDatabase, addRow, removeRow, patchRow, duplicateRows } from "../services/databaseService";
import { createView, patchView, ensureView, getActiveView, findView } from "../services/viewService";
import { addProperty, patchProperty, removeProperty as removePropDef } from "../services/propertyService";
import { evaluateFilterGroup, textSearch } from "../utils/filterEngine";
import { sortRows } from "../utils/sortEngine";

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

    getActiveView: () => getActiveView(db.views, db.activeViewId),

    getFilteredSortedRows: (searchQuery) => {
      const activeView = getActiveView(db.views, db.activeViewId);
      let rows = [...(db.rows || [])];
      rows = evaluateFilterGroup(rows, activeView.filterGroup);
      rows = textSearch(rows, searchQuery);
      if (activeView.sort) {
        rows = sortRows(rows, activeView.sort, activeView.sortAsc !== false);
      }
      return rows;
    },
  };
}
