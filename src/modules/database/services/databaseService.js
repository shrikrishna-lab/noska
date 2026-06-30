import { uid } from "../../../utils/helpers";

/**
 * @typedef {import("../types/database").DatabaseSchema} DatabaseSchema
 * @typedef {import("../types/database").DatabaseRow} DatabaseRow
 * @typedef {import("../types/database").PropertyDefinition} PropertyDefinition
 */

/** @returns {DatabaseSchema} */
export function createEmptyDatabase() {
  return {
    properties: [
      { id: 'name', name: 'Name', type: 'text' },
      { id: 'status', name: 'Status', type: 'select', options: ['Backlog', 'Next', 'Doing', 'Done'] },
      { id: 'date', name: 'Date', type: 'date' },
      { id: 'priority', name: 'Priority', type: 'select', options: ['None', 'Low', 'Medium', 'High', 'Urgent'] },
      { id: 'done', name: 'Done', type: 'checkbox' },
    ],
    views: [
      { id: 'default-table', type: 'table', name: 'Table', sort: 'name', sortAsc: true, filterGroup: null },
      { id: 'default-board', type: 'board', name: 'Board', sort: 'name', sortAsc: true, groupBy: 'status', filterGroup: null },
    ],
    rows: [],
    activeViewId: 'default-table',
  };
}

/** @param {DatabaseSchema} db @returns {DatabaseRow} */
export function createEmptyRow(db) {
  const row = {
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

/** @param {PropertyDefinition} prop */
function getDefaultValue(prop) {
  switch (prop.type) {
    case 'checkbox':
    case 'done': return false;
    case 'number': return 0;
    case 'date': return '';
    case 'select': return (prop.options && prop.options[0]) || '';
    case 'multi-select': return [];
    case 'created-time': return new Date().toISOString();
    case 'updated-time': return new Date().toISOString();
    case 'created-by': return 'You';
    case 'updated-by': return 'You';
    default: return '';
  }
}

/** @param {DatabaseSchema} db @param {Partial<DatabaseRow>} partialRow @returns {DatabaseSchema} */
export function addRow(db, partialRow = {}) {
  const row = { ...createEmptyRow(db), ...partialRow, id: partialRow.id || uid() };
  return { ...db, rows: [...db.rows, row] };
}

/** @param {DatabaseSchema} db @param {string} rowId @returns {DatabaseSchema} */
export function removeRow(db, rowId) {
  return { ...db, rows: db.rows.filter(r => r.id !== rowId) };
}

/** @param {DatabaseSchema} db @param {string} rowId @param {Object} patch @returns {DatabaseSchema} */
export function patchRow(db, rowId, patch) {
  return {
    ...db,
    rows: db.rows.map(r => r.id === rowId ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r),
  };
}

/** @param {DatabaseSchema} db @param {string[]} rowIds @returns {DatabaseSchema} */
export function duplicateRows(db, rowIds) {
  const newRows = rowIds.map(id => {
    const source = db.rows.find(r => r.id === id);
    if (!source) return null;
    return { ...source, id: uid(), name: source.name + ' (copy)' };
  }).filter(Boolean);
  return { ...db, rows: [...db.rows, ...newRows] };
}

/** @param {DatabaseSchema} db @param {string} propId @returns {DatabaseSchema} */
export function removeProperty(db, propId) {
  if (propId === 'name') return db;
  return {
    ...db,
    properties: db.properties.filter(p => p.id !== propId),
    rows: db.rows.map(r => { const { [propId]: _, ...rest } = r; return rest; }),
    views: db.views.map(v => ({
      ...v,
      hiddenProperties: v.hiddenProperties?.filter(h => h !== propId),
      groupBy: v.groupBy === propId ? undefined : v.groupBy,
    })),
  };
}
