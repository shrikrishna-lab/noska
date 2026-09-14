/**
 * Noska Widget Platform — Data, View, and Query Engine Types.
 * Enables reusable query pipelines over workspace data, databases, and connected providers.
 */

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_or_equal"
  | "less_or_equal"
  | "between"
  | "is_empty"
  | "is_not_empty"
  | "is_checked"
  | "is_not_checked";

export type DynamicVariable =
  | "@me"
  | "@today"
  | "@tomorrow"
  | "@yesterday"
  | "@this_week"
  | "@next_week"
  | "@last_7_days"
  | "@last_30_days"
  | "@current_project"
  | "@current_workspace";

export interface FilterCondition {
  id?: string;
  field: string;
  operator: FilterOperator;
  value?: unknown;
  secondaryValue?: unknown; // For "between" operator
  isDynamic?: boolean;
}

export interface FilterGroup {
  id?: string;
  conjunction?: "AND" | "OR";
  logic?: "and" | "or";
  conditions?: FilterCondition[];
  filters?: FilterCondition[];
}

export interface SortClause {
  field: string;
  direction: "asc" | "desc";
}

export interface GroupClause {
  field: string;
  subGroupField?: string;
  collapsedGroups?: string[];
}

export type AggregationFunction =
  | "count"
  | "count_empty"
  | "count_non_empty"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "percent_empty"
  | "percent_non_empty"
  | "percent_checked";

export interface AggregationClause {
  field: string;
  function: AggregationFunction;
  label?: string;
  as?: string;
}


export type ViewVisualizationType =
  | "metric"
  | "progress"
  | "list"
  | "table"
  | "board"
  | "calendar"
  | "timeline"
  | "chart_bar"
  | "chart_line"
  | "chart_area"
  | "chart_donut"
  | "chart_gauge"
  | "activity";

export interface WidgetDataView {
  id: string;
  name: string;
  dataSourceId: string;
  visualization?: ViewVisualizationType;
  filterGroups?: FilterGroup[];
  sorts?: SortClause[];
  group?: GroupClause;
  aggregations?: AggregationClause[];
  searchQuery?: string;
  limit?: number;
  pagination?: {
    page: number;
    pageSize: number;
  };
  displayProperties?: {
    visibleFields?: string[];
    density?: "compact" | "normal" | "comfortable";
    showHeaders?: boolean;
    chartColors?: string[];
    accentColor?: string;
  };
}

export interface GlobalDashboardFilterState {
  projectId?: string | null;
  assigneeId?: string | null;
  timeframe?: "all" | "today" | "this_week" | "last_30_days" | null;
  status?: string | null;
  searchQuery?: string;
}

export interface QueryResult<T = Record<string, unknown>> {
  items: T[];
  records: T[];
  totalCount: number;
  filteredCount: number;
  groups?: {
    key: string;
    label: string;
    items: T[];
    records: T[];
    aggregations?: Record<string, number | string>;
  }[];
  aggregations?: Record<string, number | string>;
}

