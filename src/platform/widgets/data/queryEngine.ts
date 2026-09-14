/**
 * Noska Widget Platform — Universal In-Memory View & Query Engine.
 * Transforms raw datasets into structured, filtered, sorted, grouped, and aggregated views
 * without modifying underlying database records.
 */
import type {
  WidgetDataView,
  FilterCondition,
  FilterGroup,
  QueryResult,
  SortClause,
  GroupClause,
  AggregationClause,
  GlobalDashboardFilterState,
} from "./types";
import { resolveDynamicToken, isDateWithinTimeframe, type EvaluationContext } from "./dynamicTokens";

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  if (!path.includes(".")) return obj[path];

  const parts = path.split(".");
  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

function matchesCondition(
  item: Record<string, unknown>,
  cond: FilterCondition,
  evalCtx: EvaluationContext
): boolean {
  const itemVal = getNestedValue(item, cond.field);
  const isDynamic = cond.isDynamic || (typeof cond.value === "string" && cond.value.startsWith("@"));
  const targetVal = isDynamic ? resolveDynamicToken(cond.value, evalCtx) : cond.value;

  switch (cond.operator) {
    case "equals":
      if (itemVal === undefined || itemVal === null) return targetVal === null || targetVal === undefined || targetVal === "";
      return String(itemVal).toLowerCase() === String(targetVal).toLowerCase();

    case "not_equals":
      if (itemVal === undefined || itemVal === null) return targetVal !== null && targetVal !== undefined && targetVal !== "";
      return String(itemVal).toLowerCase() !== String(targetVal).toLowerCase();

    case "contains":
      if (Array.isArray(itemVal)) {
        return itemVal.some((v) => String(v).toLowerCase().includes(String(targetVal).toLowerCase()));
      }
      return String(itemVal ?? "").toLowerCase().includes(String(targetVal ?? "").toLowerCase());

    case "not_contains":
      if (Array.isArray(itemVal)) {
        return !itemVal.some((v) => String(v).toLowerCase().includes(String(targetVal).toLowerCase()));
      }
      return !String(itemVal ?? "").toLowerCase().includes(String(targetVal ?? "").toLowerCase());

    case "starts_with":
      return String(itemVal ?? "").toLowerCase().startsWith(String(targetVal ?? "").toLowerCase());

    case "ends_with":
      return String(itemVal ?? "").toLowerCase().endsWith(String(targetVal ?? "").toLowerCase());

    case "greater_than":
      return Number(itemVal) > Number(targetVal);

    case "less_than":
      return Number(itemVal) < Number(targetVal);

    case "greater_or_equal":
      return Number(itemVal) >= Number(targetVal);

    case "less_or_equal":
      return Number(itemVal) <= Number(targetVal);

    case "between": {
      const secVal = cond.isDynamic ? resolveDynamicToken(cond.secondaryValue, evalCtx) : cond.secondaryValue;
      const num = Number(itemVal);
      return num >= Number(targetVal) && num <= Number(secVal);
    }

    case "is_empty":
      return itemVal === null || itemVal === undefined || itemVal === "" || (Array.isArray(itemVal) && itemVal.length === 0);

    case "is_not_empty":
      return itemVal !== null && itemVal !== undefined && itemVal !== "" && (!Array.isArray(itemVal) || itemVal.length > 0);

    case "is_checked":
      return itemVal === true || itemVal === 1 || itemVal === "true";

    case "is_not_checked":
      return itemVal === false || itemVal === 0 || itemVal === "false" || itemVal === null || itemVal === undefined;

    default:
      return true;
  }
}

function matchesFilterGroup(
  item: Record<string, unknown>,
  group: FilterGroup,
  evalCtx: EvaluationContext
): boolean {
  const conds = group.conditions || group.filters || [];
  if (!conds || conds.length === 0) return true;

  const isOr = group.conjunction === "OR" || group.logic?.toLowerCase() === "or";

  if (isOr) {
    return conds.some((cond) => matchesCondition(item, cond, evalCtx));
  }
  return conds.every((cond) => matchesCondition(item, cond, evalCtx));
}

function applySorts<T extends Record<string, unknown>>(items: T[], sorts?: SortClause[]): T[] {
  if (!sorts || sorts.length === 0) return items;

  return [...items].sort((a, b) => {
    for (const sort of sorts) {
      const valA = getNestedValue(a, sort.field);
      const valB = getNestedValue(b, sort.field);

      if (valA === valB) continue;
      if (valA === undefined || valA === null) return sort.direction === "asc" ? -1 : 1;
      if (valB === undefined || valB === null) return sort.direction === "asc" ? 1 : -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sort.direction === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      const cmp = strA.localeCompare(strB);
      if (cmp !== 0) {
        return sort.direction === "asc" ? cmp : -cmp;
      }
    }
    return 0;
  });
}

function calculateAggregations<T extends Record<string, unknown>>(
  items: T[],
  aggregations?: AggregationClause[]
): Record<string, number | string> {
  if (!aggregations || aggregations.length === 0) return {};

  const results: Record<string, number | string> = {};

  for (const agg of aggregations) {
    const key = agg.as || agg.label || `${agg.function}_${agg.field}`;
    const values = items.map((it) => getNestedValue(it, agg.field));

    switch (agg.function) {
      case "count":
        results[key] = items.length;
        break;

      case "count_empty":
        results[key] = values.filter((v) => v === null || v === undefined || v === "").length;
        break;

      case "count_non_empty":
        results[key] = values.filter((v) => v !== null && v !== undefined && v !== "").length;
        break;

      case "sum": {
        const nums = values.map(Number).filter((n) => !isNaN(n));
        results[key] = nums.reduce((acc, n) => acc + n, 0);
        break;
      }

      case "avg": {
        const nums = values.map(Number).filter((n) => !isNaN(n));
        results[key] = nums.length > 0 ? Number((nums.reduce((acc, n) => acc + n, 0) / nums.length).toFixed(1)) : 0;
        break;
      }

      case "min": {
        const nums = values.map(Number).filter((n) => !isNaN(n));
        results[key] = nums.length > 0 ? Math.min(...nums) : 0;
        break;
      }

      case "max": {
        const nums = values.map(Number).filter((n) => !isNaN(n));
        results[key] = nums.length > 0 ? Math.max(...nums) : 0;
        break;
      }

      case "percent_checked": {
        const checked = values.filter((v) => v === true || v === 1 || v === "true").length;
        results[key] = items.length > 0 ? Math.round((checked / items.length) * 100) : 0;
        break;
      }

      default:
        results[key] = items.length;
    }
  }

  return results;
}

export function executeWidgetQuery<T extends Record<string, unknown>>(
  rawItems: T[],
  view: Partial<WidgetDataView>,
  evalCtx: EvaluationContext = {},
  globalFilters?: GlobalDashboardFilterState
): QueryResult<T> {
  const totalCount = rawItems.length;

  // 1. Filter by Search Query
  let filtered = rawItems;
  const search = (globalFilters?.searchQuery || view.searchQuery || "").trim().toLowerCase();
  if (search) {
    filtered = filtered.filter((item) =>
      Object.values(item).some((val) =>
        String(val ?? "").toLowerCase().includes(search)
      )
    );
  }

  // 2. Apply Global Dashboard Filters (Project, Assignee, Timeframe, Status)
  if (globalFilters) {
    if (globalFilters.projectId) {
      filtered = filtered.filter((it) => {
        const pId = getNestedValue(it, "projectId") || getNestedValue(it, "project_id") || getNestedValue(it, "project");
        return String(pId).toLowerCase() === String(globalFilters.projectId).toLowerCase();
      });
    }

    if (globalFilters.assigneeId) {
      const targetAssignee = globalFilters.assigneeId === "@me" ? evalCtx.currentUserId : globalFilters.assigneeId;
      filtered = filtered.filter((it) => {
        const aId = getNestedValue(it, "assigneeId") || getNestedValue(it, "assignee_id") || getNestedValue(it, "assignee") || getNestedValue(it, "userId") || getNestedValue(it, "user_id");
        return String(aId).toLowerCase() === String(targetAssignee).toLowerCase();
      });
    }

    if (globalFilters.status) {
      filtered = filtered.filter((it) => {
        const statusVal = getNestedValue(it, "status") || getNestedValue(it, "state");
        return String(statusVal).toLowerCase() === String(globalFilters.status).toLowerCase();
      });
    }

    if (globalFilters.timeframe && globalFilters.timeframe !== "all") {
      filtered = filtered.filter((it) => {
        const dateVal = getNestedValue(it, "dueDate") || getNestedValue(it, "due_date") || getNestedValue(it, "updatedAt") || getNestedValue(it, "createdAt") || getNestedValue(it, "date");
        return isDateWithinTimeframe(dateVal as any, globalFilters.timeframe as any, evalCtx.now);
      });
    }
  }

  // 3. Apply View Filter Groups
  if (view.filterGroups && view.filterGroups.length > 0) {
    filtered = filtered.filter((item) =>
      view.filterGroups!.every((group) => matchesFilterGroup(item, group, evalCtx))
    );
  }

  const filteredCount = filtered.length;

  // 4. Apply Sorts
  const sorted = applySorts(filtered, view.sorts);

  // 5. Calculate Global Aggregations
  const globalAggregations = calculateAggregations(sorted, view.aggregations);

  // 6. Apply Grouping (if defined)
  let groupedResult: QueryResult<T>["groups"] = undefined;
  if (view.group && view.group.field) {
    const groupMap = new Map<string, T[]>();
    for (const it of sorted) {
      const rawGroupVal = getNestedValue(it, view.group.field);
      const groupKey = rawGroupVal !== undefined && rawGroupVal !== null ? String(rawGroupVal) : "Unassigned";
      const existing = groupMap.get(groupKey) || [];
      existing.push(it);
      groupMap.set(groupKey, existing);
    }

    groupedResult = Array.from(groupMap.entries()).map(([key, groupItems]) => ({
      key,
      label: key,
      items: groupItems,
      records: groupItems,
      aggregations: calculateAggregations(groupItems, view.aggregations),
    }));
  }

  // 7. Apply Pagination & Limit
  let finalItems = sorted;
  if (view.pagination) {
    const { page, pageSize } = view.pagination;
    const startIndex = (page - 1) * pageSize;
    finalItems = sorted.slice(startIndex, startIndex + pageSize);
  } else if (view.limit && view.limit > 0) {
    finalItems = sorted.slice(0, view.limit);
  }

  return {
    items: finalItems,
    records: finalItems,
    totalCount,
    filteredCount,
    groups: groupedResult,
    aggregations: globalAggregations,
  };
}

