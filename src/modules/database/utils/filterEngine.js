/**
 * Evaluates a single condition against a row.
 * @param {Object} row
 * @param {import("../types/database").FilterCondition} condition
 * @returns {boolean}
 */
function evaluateCondition(row, condition) {
  const cell = String(row[condition.property] ?? '');
  const val = condition.value;
  switch (condition.operator) {
    case 'contains': return cell.toLowerCase().includes(val.toLowerCase());
    case 'equals': return cell.toLowerCase() === val.toLowerCase();
    case 'not-equals': return cell.toLowerCase() !== val.toLowerCase();
    case 'starts-with': return cell.toLowerCase().startsWith(val.toLowerCase());
    case 'ends-with': return cell.toLowerCase().endsWith(val.toLowerCase());
    case 'is-empty': return cell.trim() === '';
    case 'is-not-empty': return cell.trim() !== '';
    case 'greater-than': return Number(cell) > Number(val);
    case 'less-than': return Number(cell) < Number(val);
    case 'before': return new Date(cell) < new Date(val);
    case 'after': return new Date(cell) > new Date(val);
    default: return true;
  }
}

/**
 * Recursively evaluates a filter group against a row.
 * @param {Object} row
 * @param {import("../types/database").FilterGroup|null} group
 * @returns {boolean}
 */
export function evaluateFilterGroup(row, group) {
  if (!group) return true;
  const { op, conditions = [], groups = [] } = group;
  const conditionResults = conditions.map(c => evaluateCondition(row, c));
  const groupResults = groups.map(g => evaluateFilterGroup(row, g));

  if (op === 'and') {
    return conditionResults.every(Boolean) && groupResults.every(Boolean);
  }
  return conditionResults.some(Boolean) || groupResults.some(Boolean);
}

/**
 * Filters rows by a text search string (matches name and all property values).
 * @param {import("../types/database").DatabaseRow[]} rows
 * @param {string} query
 * @returns {import("../types/database").DatabaseRow[]}
 */
export function textSearch(rows, query) {
  if (!query.trim()) return rows;
  const q = query.toLowerCase();
  return rows.filter(r =>
    Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q))
  );
}
