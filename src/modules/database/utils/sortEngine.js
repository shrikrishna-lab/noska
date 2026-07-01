/**
 * Compares two values for sort ordering.
 */
function compareValues(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return String(a ?? '').localeCompare(String(b ?? ''));
}

/**
 * Sorts rows by a single property and direction.
 * @param {import("../types/database").DatabaseRow[]} rows
 * @param {string} sortProp - property id
 * @param {boolean} [asc=true]
 * @returns {import("../types/database").DatabaseRow[]}
 */
export function sortRows(rows, sortProp, asc = true) {
  const sorted = [...rows].sort((a, b) => {
    return compareValues(a[sortProp], b[sortProp]);
  });
  return asc ? sorted : sorted.reverse();
}

/**
 * Sorts rows by an array of sort keys (multi-column sort).
 * Later entries break ties from earlier entries.
 * @param {import("../types/database").DatabaseRow[]} rows
 * @param {Array<{ columnId: string, direction: "ascending"|"descending" }>} sorts
 * @returns {import("../types/database").DatabaseRow[]}
 */
export function sortRowsByMultiple(rows, sorts) {
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
