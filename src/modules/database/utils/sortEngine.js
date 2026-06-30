/**
 * Sorts rows by a property and direction.
 * @param {import("../types/database").DatabaseRow[]} rows
 * @param {string} sortProp - property id
 * @param {boolean} [asc=true]
 * @returns {import("../types/database").DatabaseRow[]}
 */
export function sortRows(rows, sortProp, asc = true) {
  const sorted = [...rows].sort((a, b) => {
    const va = String(a[sortProp] ?? '');
    const vb = String(b[sortProp] ?? '');
    const na = Number(va);
    const nb = Number(vb);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return va.localeCompare(vb);
  });
  return asc ? sorted : sorted.reverse();
}
