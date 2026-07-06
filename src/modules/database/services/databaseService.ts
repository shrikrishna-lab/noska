import { uid } from "../../../utils/helpers";
import type { DatabaseSchema, DatabaseRow, PropertyDefinition } from "../types/database";

export function createEmptyDatabase(): DatabaseSchema {
  // Minimal empty schema — one Name column, zero rows, no fake sample options.
  return {
    properties: [
      { id: 'name', name: 'Name', type: 'text' },
    ],
    views: [
      { id: 'default-table', type: 'table', name: 'Table', sort: 'name', sortAsc: true, filterGroup: null, filters: { operator: 'and', conditions: [] }, sorts: [] },
    ],
    rows: [],
    activeViewId: 'default-table',
  };
}

export function createEmptyRow(db: DatabaseSchema): DatabaseRow {
  const row: DatabaseRow = {
    id: uid(),
    name: 'Untitled',
    icon: '📄',
    cover: '',
    pageBlocks: [{ id: uid(), type: 'text', text: '' }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  for (const prop of (db?.properties || [])) {
    row[prop.id] = getDefaultValue(prop);
  }
  return row;
}

function getDefaultValue(prop: PropertyDefinition): unknown {
  // NOTE (preserved quirk): the original JS switch had a `case 'done':`
  // fallthrough alongside 'checkbox' here. 'done' has never been a member
  // of PropertyType (types/database.ts's PropertyType union, unchanged by
  // this migration) — grepped every property-creation call site
  // (propertyService.ts, templates.ts, DatabasePage.tsx) and none ever
  // construct a property with type 'done'. This was already dead/
  // unreachable code before this conversion; TypeScript's literal-union
  // switch now surfaces that explicitly (would be a "this comparison
  // appears unintentional" style redundancy if kept), so it's omitted
  // here rather than force-added back as an unreachable case.
  switch (prop.type) {
    case 'checkbox': return false;
    case 'number': return 0;
    case 'date': return '';
    case 'select': return '';
    case 'multi-select': return [];
    case 'created-time': return new Date().toISOString();
    case 'updated-time': return new Date().toISOString();
    case 'created-by': return 'You';
    case 'updated-by': return 'You';
    default: return '';
  }
}

export function addRow(db: DatabaseSchema, partialRow: Partial<DatabaseRow> = {}): DatabaseSchema {
  const row: DatabaseRow = { ...createEmptyRow(db), ...partialRow, id: partialRow.id || uid() };
  return { ...db, rows: [...db.rows, row] };
}

export function removeRow(db: DatabaseSchema, rowId: string): DatabaseSchema {
  return { ...db, rows: db.rows.filter(r => r.id !== rowId) };
}

export function patchRow(db: DatabaseSchema, rowId: string, patch: Partial<DatabaseRow>): DatabaseSchema {
  return {
    ...db,
    rows: db.rows.map(r => r.id === rowId ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r),
  };
}

export function duplicateRows(db: DatabaseSchema, rowIds: string[]): DatabaseSchema {
  const newRows = rowIds
    .map(id => {
      const source = db.rows.find(r => r.id === id);
      if (!source) return null;
      return { ...source, id: uid(), name: source.name + ' (copy)' };
    })
    .filter((r): r is DatabaseRow => r !== null);
  return { ...db, rows: [...db.rows, ...newRows] };
}

export function removeProperty(db: DatabaseSchema, propId: string): DatabaseSchema {
  if (propId === 'name') return db;
  return {
    ...db,
    properties: db.properties.filter(p => p.id !== propId),
    // Cast: object-rest destructuring to omit one dynamic key (`propId`)
    // from `r` necessarily produces a type without that specific literal
    // key, which TS can't re-widen back to DatabaseRow's index signature on
    // its own — structurally still a DatabaseRow (still has id/name plus
    // whatever other property keys remain), just missing the one now-
    // removed property, matching the original JS's untyped destructure.
    rows: db.rows.map(r => { const { [propId]: _, ...rest } = r; return rest as DatabaseRow; }),
    views: db.views.map(v => ({
      ...v,
      hiddenProperties: v.hiddenProperties?.filter(h => h !== propId),
      groupBy: v.groupBy === propId ? undefined : v.groupBy,
      filters: v.filters ? { ...v.filters, conditions: (v.filters.conditions || []).filter(c => c.columnId !== propId) } : v.filters,
      sorts: (v.sorts || []).filter(s => s.columnId !== propId),
      filterGroup: v.filterGroup ? { ...v.filterGroup, conditions: (v.filterGroup.conditions || []).filter(c => c.property !== propId) } : v.filterGroup,
    })),
  };
}
