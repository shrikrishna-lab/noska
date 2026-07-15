import type { DatabaseRow, SortConfig } from "../types/database";

/**
 * Compares two values for sort ordering.
 */
function compareValues(a: unknown, b: unknown): number {
  const na = Number(a);
  const nb = Number(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return String(a ?? '').localeCompare(String(b ?? ''));
}

/**
 * Sorts rows by a single property and direction.
 */
export function sortRows(rows: DatabaseRow[], sortProp: string, asc = true): DatabaseRow[] {
  const sorted = [...rows].sort((a, b) => {
    return compareValues(a[sortProp], b[sortProp]);
  });
  return asc ? sorted : sorted.reverse();
}

/**
 * Sorts rows by an array of sort keys (multi-column sort).
 * Later entries break ties from earlier entries.
 */
export function sortRowsByMultiple(rows: DatabaseRow[], sorts: SortConfig[] | null | undefined): DatabaseRow[] {
  if (!sorts || sorts.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const s of sorts) {
      const asc = s.direction !== 'descending';
      const cmp = compareValues(a[s.columnId], b[s.columnId]);
      if (cmp !== 0) return asc ? cmp : -cmp;
    }
    return 0;
  });
}
