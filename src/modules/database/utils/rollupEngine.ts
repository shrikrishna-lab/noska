/**
 * Rollup engine — aggregates values across relation-linked rows.
 * Functions: count, sum, avg, min, max, percent
 */

export type RollupFunction = "count" | "sum" | "avg" | "min" | "max" | "percent";

export interface RollupOptions {
  /** for percent, count rows where {done: true} / all */
  filterDone?: boolean;
}

/**
 * @param relatedRows — rows linked via relation
 * @param targetPropId — property id to aggregate
 * @param fn
 */
export function computeRollup(
  relatedRows: Array<Record<string, unknown>> | null | undefined,
  targetPropId: string,
  fn: RollupFunction,
  // `options` is accepted (matching the original signature) but never
  // actually read inside the function body in the original JS either —
  // `options.filterDone` is documented but dead, same pattern as other
  // "documented but dead" fields found elsewhere in this module. Kept as
  // an accepted-but-unused parameter for faithful conversion.
  options: RollupOptions = {}
): number | string {
  if (!relatedRows || relatedRows.length === 0) return fn === "count" ? 0 : "—";

  switch (fn) {
    case "count":
      return relatedRows.length;

    case "sum": {
      const total = relatedRows.reduce((acc, r) => acc + (Number(r[targetPropId]) || 0), 0);
      return total;
    }

    case "avg": {
      const values = relatedRows.map(r => Number(r[targetPropId])).filter(v => !isNaN(v));
      if (values.length === 0) return "—";
      return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    }

    case "min": {
      const values = relatedRows.map(r => Number(r[targetPropId])).filter(v => !isNaN(v));
      if (values.length === 0) return "—";
      return Math.min(...values);
    }

    case "max": {
      const values = relatedRows.map(r => Number(r[targetPropId])).filter(v => !isNaN(v));
      if (values.length === 0) return "—";
      return Math.max(...values);
    }

    case "percent": {
      const done = relatedRows.filter(r => r.done === true || r[targetPropId] === true).length;
      return Math.round((done / relatedRows.length) * 100) + "%";
    }

    default:
      return "—";
  }
}
