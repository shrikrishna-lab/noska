import type { DatabaseRow, FilterCondition, FilterGroup, FilterConfig } from "../types/database";

export interface OperatorOption {
  id: string;
  label: string;
}

/**
 * Returns the set of allowed operators for a given property type.
 */
export function operatorsForType(propertyType: string): OperatorOption[] {
  switch (propertyType) {
    case 'select':
    case 'status':
    case 'priority':
      return [
        { id: 'equals', label: 'Is' },
        { id: 'not-equals', label: 'Is not' },
        { id: 'is-empty', label: 'Is empty' },
        { id: 'is-not-empty', label: 'Is not empty' },
      ];
    case 'checkbox':
      return [
        { id: 'is-checked', label: 'Is checked' },
        { id: 'is-unchecked', label: 'Is unchecked' },
      ];
    case 'date':
      return [
        { id: 'is', label: 'Is' },
        { id: 'is-before', label: 'Is before' },
        { id: 'is-after', label: 'Is after' },
        { id: 'is-empty', label: 'Is empty' },
        { id: 'is-not-empty', label: 'Is not empty' },
      ];
    case 'number':
      return [
        { id: 'equals', label: 'Equals' },
        { id: 'greater-than', label: 'Greater than' },
        { id: 'less-than', label: 'Less than' },
        { id: 'is-empty', label: 'Is empty' },
        { id: 'is-not-empty', label: 'Is not empty' },
      ];
    case 'multi-select':
      return [
        { id: 'contains', label: 'Contains' },
        { id: 'not-contains', label: 'Does not contain' },
        { id: 'is-empty', label: 'Is empty' },
        { id: 'is-not-empty', label: 'Is not empty' },
      ];
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
    default:
      return [
        { id: 'contains', label: 'Contains' },
        { id: 'not-contains', label: 'Does not contain' },
        { id: 'equals', label: 'Equals' },
        { id: 'not-equals', label: 'Not equal' },
        { id: 'starts-with', label: 'Starts with' },
        { id: 'ends-with', label: 'Ends with' },
        { id: 'is-empty', label: 'Is empty' },
        { id: 'is-not-empty', label: 'Is not empty' },
      ];
  }
}

/**
 * Evaluates a single condition against a row.
 */
function evaluateCondition(row: DatabaseRow, condition: FilterCondition): boolean {
  const cell = row[condition.property];
  const val = condition.value;

  switch (condition.operator) {
    case 'contains':
      return String(cell ?? '').toLowerCase().includes(String(val ?? '').toLowerCase());
    case 'not-contains':
      return !String(cell ?? '').toLowerCase().includes(String(val ?? '').toLowerCase());
    case 'equals':
      return String(cell ?? '').toLowerCase() === String(val ?? '').toLowerCase();
    case 'not-equals':
      return String(cell ?? '').toLowerCase() !== String(val ?? '').toLowerCase();
    case 'starts-with':
      return String(cell ?? '').toLowerCase().startsWith(String(val ?? '').toLowerCase());
    case 'ends-with':
      return String(cell ?? '').toLowerCase().endsWith(String(val ?? '').toLowerCase());
    case 'is-empty':
      return cell === undefined || cell === null || String(cell).trim() === '';
    case 'is-not-empty':
      return cell !== undefined && cell !== null && String(cell).trim() !== '';
    case 'greater-than':
      if (cell === null || cell === undefined) return false;
      return Number(cell) > Number(val);
    case 'less-than':
      if (cell === null || cell === undefined) return false;
      return Number(cell) < Number(val);
    case 'is-checked':
      return cell === true || cell === 'true';
    case 'is-unchecked':
      return cell !== true && cell !== 'true';
    case 'is':
      if (cell === null || cell === undefined) return false;
      return String(cell) === String(val);
    case 'is-before':
      if (cell === null || cell === undefined) return false;
      // Cast: `cell` is `unknown` (DatabaseRow's index signature) but the
      // null/undefined check just above narrows out the only two values
      // the Date constructor can't accept as a first arg without throwing
      // or producing Invalid Date differently than the original JS's
      // untyped `new Date(cell)` did — matches the exact runtime behavior
      // (Date() coerces any other value via its own rules either way).
      return new Date(cell as string).getTime() < new Date(val).getTime();
    case 'is-after':
      if (cell === null || cell === undefined) return false;
      return new Date(cell as string).getTime() > new Date(val).getTime();
    default:
      // Includes "between"/"before"/"after" — see types/database.ts's
      // module-header comment: these are documented-but-unimplemented
      // operators, preserved as a pre-existing quirk (silently matches
      // every row via this default branch), not fixed here.
      return true;
  }
}

/**
 * Evaluates a filter group (recursive) against a row.
 */
export function evaluateFilterGroup(row: DatabaseRow, group: FilterGroup | null | undefined): boolean {
  if (!group) return true;
  const { op = 'and', conditions = [], groups = [] } = group;
  const conditionResults = conditions.map(c => evaluateCondition(row, c));
  const groupResults = groups.map(g => evaluateFilterGroup(row, g));

  if (op === 'and') {
    return conditionResults.every(Boolean) && groupResults.every(Boolean);
  }
  return conditionResults.some(Boolean) || groupResults.some(Boolean);
}

/**
 * Evaluates a flat filters config (spec-style) against a row.
 */
export function evaluateFilters(row: DatabaseRow, filters: FilterConfig | null | undefined): boolean {
  if (!filters || !filters.conditions || filters.conditions.length === 0) return true;
  const op = filters.operator || 'and';
  const results = filters.conditions.map(c =>
    evaluateCondition(row, {
      property: c.columnId,
      // Cast: FilterConfig.conditions[].condition is a loose `string` (see
      // types/database.ts FilterConfig — spec-style conditions aren't
      // constrained to the FilterOperator union at the type level), but
      // evaluateCondition's switch is written against FilterOperator and
      // falls through safely to `default: return true` for any value not
      // in the union — matches original JS behavior exactly.
      operator: c.condition as FilterCondition["operator"],
      value: c.value ?? '',
    })
  );
  return op === 'and' ? results.every(Boolean) : results.some(Boolean);
}

/**
 * Filters rows by a text search string (matches all property values).
 */
export function textSearch(rows: DatabaseRow[], query: string): DatabaseRow[] {
  if (!query.trim()) return rows;
  const q = query.toLowerCase();
  return rows.filter(r =>
    Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q))
  );
}
