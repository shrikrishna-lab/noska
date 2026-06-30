/**
 * Rollup engine — aggregates values across relation-linked rows.
 * Functions: count, sum, avg, min, max, percent
 */

/**
 * @param {Object[]} relatedRows — rows linked via relation
 * @param {string} targetPropId — property id to aggregate
 * @param {"count"|"sum"|"avg"|"min"|"max"|"percent"} fn
 * @param {Object} [options]
 * @param {boolean} [options.filterDone] — for percent, count rows where {done: true} / all
 * @returns {number|string}
 */
export function computeRollup(relatedRows, targetPropId, fn, options = {}) {
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
