import { createEmptyDatabase, addRow, removeRow, patchRow, duplicateRows, removeProperty as removePropFromDb } from "../services/databaseService";
import { createView, patchView, ensureView, getActiveView, findView, addNamedView, removeView } from "../services/viewService";
import { addProperty, patchProperty } from "../services/propertyService";
import { evaluateFilterGroup, textSearch, evaluateFilters } from "../utils/filterEngine";
import { sortRows, sortRowsByMultiple } from "../utils/sortEngine";
import type { DatabaseSchema, DatabaseRow, PropertyType, ViewDefinition } from "../types/database";

/**
 * Hook-style database operations. Returns an object of bound functions
 * that operate on an immutable database state.
 */
export function useDatabase(db: DatabaseSchema, onPatch: (patch: Partial<DatabaseSchema>) => void) {
  return {
    addRow: (partialRow?: Partial<DatabaseRow>) => onPatch(addRow(db, partialRow)),
    removeRow: (rowId: string) => onPatch(removeRow(db, rowId)),
    patchRow: (rowId: string, patch: Partial<DatabaseRow>) => onPatch(patchRow(db, rowId, patch)),
    duplicateRows: (rowIds: string[]) => onPatch(duplicateRows(db, rowIds)),

    addProperty: (name: string, type?: PropertyType) => onPatch({ ...db, properties: addProperty(db.properties, name, type) }),
    patchProperty: (propId: string, p: Record<string, unknown>) => onPatch({ ...db, properties: patchProperty(db.properties, propId, p) }),
    // Real bug fix: the original JS imported `propertyService.removeProperty`
    // aliased as `removePropDef` and called `onPatch(removePropDef(db, propId))`
    // here — but that function's real signature is
    // `(properties: PropertyDefinition[], propId: string) => PropertyDefinition[]`,
    // not `(db, propId) => DatabaseSchema`. Passing the whole `db` object
    // where a properties array was expected would call `.filter()` on a
    // DatabaseSchema object (no such method), throwing a TypeError at
    // runtime — reachable any time a user clicks the "remove property" (X)
    // button in DatabasePage.tsx's properties panel for any non-"name"
    // property. `databaseService.removeProperty(db, propId)` is the
    // correctly-shaped sibling function (same name, different module) that
    // already does exactly what's needed here (filters properties AND
    // scrubs the removed property id out of every row/view), so this now
    // calls that one instead. TypeScript's structural typing surfaced this
    // immediately (TS2559/TS2345) — this was unreachable/uncaught in the
    // original untyped JS.
    removeProperty: (propId: string) => onPatch(removePropFromDb(db, propId)),

    ensureView: (type: ViewDefinition["type"]) => {
      const result = ensureView(db.views, type, db.activeViewId);
      onPatch({ views: result.views, activeViewId: result.activeViewId });
    },
    patchView: (patch: Partial<ViewDefinition>) => onPatch({ views: patchView(db.views, db.activeViewId, patch) }),
    addNamedView: (type: ViewDefinition["type"], name: string) => {
      const result = addNamedView(db.views, type, name);
      onPatch({ views: result.views, activeViewId: result.newViewId });
    },
    removeView: (viewId: string) => onPatch({ views: removeView(db.views, viewId) }),

    getActiveView: () => getActiveView(db.views, db.activeViewId),

    /**
     * Returns filtered + sorted rows for the active view.
     * Supports both new spec-style (filters/sorts) and
     * legacy (filterGroup / sort+sortAsc) view properties.
     */
    getFilteredSortedRows: (searchQuery: string): DatabaseRow[] => {
      const activeView = getActiveView(db.views, db.activeViewId);
      let rows = [...(db.rows || [])];

      // Apply filters — check spec-style filters first, fall back to filterGroup
      const hasSpecFilters = (activeView.filters?.conditions?.length ?? 0) > 0;
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
      const hasSpecSorts = (activeView.sorts?.length ?? 0) > 0;
      if (hasSpecSorts) {
        rows = sortRowsByMultiple(rows, activeView.sorts);
      } else if (activeView.sort) {
        rows = sortRows(rows, activeView.sort, activeView.sortAsc !== false);
      }

      return rows;
    },
  };
}
