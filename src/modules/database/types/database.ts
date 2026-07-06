// Local database-module types. These pre-date and overlap with (but are NOT
// identical to) types/blocks.ts's DatabaseSchema/DatabaseViewDefinition/
// DatabasePropertyDefinition/DatabaseRow interfaces. Per migration-plan
// instructions, this module's own types are converted faithfully as-is
// (matching the module's actual runtime shapes), not force-unified with the
// canonical types/blocks.ts definitions. Real discrepancies found while
// converting, documented as quirks (not "fixed" by picking a side):
//
// - ViewDefinition.type here is missing "feed"/"dashboard"/"map", which
//   types/blocks.ts's DatabaseViewDefinition.type already includes (added
//   there in an earlier Phase 4 bug fix). This module's own DatabaseView.tsx
//   VIEW_MAP does render feed/dashboard views at runtime (see VIEW_TYPES
//   below, which also doesn't list feed/dashboard/map — matches this
//   module's own ViewDefinition, just incomplete relative to the canonical
//   type elsewhere). Preserved as-is: widening this module's local type to
//   match types/blocks.ts is a product decision (do these two type
//   definitions get unified?) out of scope for a type-only migration pass.
// - ViewDefinition.columnWidths is typed here as `number` (singular), but
//   grepped across the whole module: no code ever reads or writes
//   `view.columnWidths` — it's a documented-but-dead field on this type.
//   types/blocks.ts's DatabaseViewDefinition.columnWidths is
//   `Record<string, number>` (a real per-property map), which is what this
//   field's doc comment ("map of property id to width") actually describes older intent-wise.
//   Left as `number` here (faithful conversion of the existing JSDoc), not
//   corrected — no runtime evidence either way since it's unused.
// - PropertyDefinition.type's operator/type lists mostly match
//   DatabasePropertyDefinition in types/blocks.ts, but FilterCondition's
//   `operator` union here includes "between" (types/blocks.ts's
//   DatabaseViewDefinition.filters.conditions has no such union at all —
//   condition strings are just `string` there). Grepped filterEngine.ts's
//   evaluateCondition: "between" has no case and silently falls through to
//   the `default: return true` branch — i.e. selecting "between" as an
//   operator anywhere would silently match every row. This looks like a
//   pre-existing dead/unimplemented operator, not a migration bug. Kept in
//   the union (faithful conversion) since some future UI might still offer
//   it, but flagged here as a real, preserved behavior quirk.

export type PropertyType =
  | "text" | "number" | "checkbox" | "date" | "select" | "multi-select"
  | "status" | "priority" | "person" | "relation" | "rollup" | "formula"
  | "url" | "email" | "phone" | "files" | "created-time" | "updated-time"
  | "created-by" | "updated-by" | "ai-summary" | "ai-tags"
  | "estimated-time" | "risk-score";

export interface PropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  /** select/multi-select/status/priority options */
  options?: string[];
  formula?: { expression?: string };
  rollup?: {
    relationPropertyId?: string;
    targetPropertyId?: string;
    function?: "count" | "sum" | "avg" | "min" | "max" | "percent";
  };
  relation?: {
    databaseId?: string;
    type?: "one-to-one" | "one-to-many" | "many-to-many";
  };
  /** auto-set by system */
  computed?: boolean;
  defaultValue?: unknown;
}

/** See module-header comment above — "between" is a documented dead
 * operator (evaluateCondition in filterEngine.ts has no case for it and
 * silently matches everything via its default branch), preserved as-is. */
export type FilterOperator =
  | "contains" | "not-contains" | "equals" | "not-equals" | "starts-with"
  | "ends-with" | "is-empty" | "is-not-empty" | "greater-than" | "less-than"
  | "between" | "before" | "after" | "is" | "is-before" | "is-after"
  | "is-checked" | "is-unchecked";

export interface FilterCondition {
  property: string;
  operator: FilterOperator;
  value: string;
}

/** Spec-style flat filters */
export interface FilterConfig {
  operator: "and" | "or";
  conditions: Array<{ columnId: string; condition: string; value?: string }>;
}

/** Spec-style sort entry */
export interface SortConfig {
  columnId: string;
  direction: "ascending" | "descending";
}

export interface FilterGroup {
  op: "and" | "or";
  conditions: FilterCondition[];
  groups: FilterGroup[];
}

/** NOTE (preserved quirk, see module-header comment): missing "feed" |
 * "dashboard" | "map" compared to types/blocks.ts's DatabaseViewDefinition
 * — this module's own DatabaseView.tsx VIEW_MAP does dispatch to
 * FeedView/DashboardView at runtime for those view-type strings, so this
 * local type under-describes real usage. Not corrected here per the
 * faithful-conversion instruction (unifying with types/blocks.ts is a
 * product decision, not a type-migration fix). */
export interface ViewDefinition {
  id: string;
  type: "table" | "board" | "calendar" | "timeline" | "gallery" | "list" | "graph" | "mind-map";
  name: string;
  /** legacy single sort property */
  sort?: string;
  /** legacy sort direction */
  sortAsc?: boolean;
  /** legacy filter string */
  filter?: string;
  /** legacy nested filter group */
  filterGroup?: FilterGroup | null;
  /** spec-style flat filters (Phase 4) */
  filters?: FilterConfig;
  /** spec-style sort array (Phase 4) */
  sorts?: SortConfig[];
  /** property id for board grouping */
  groupBy?: string;
  hiddenProperties?: string[];
  /** NOTE (preserved quirk, see module-header comment): grepped — nothing
   * in this module reads or writes `columnWidths`; dead field, kept
   * faithful to the original JSDoc type (`number`, not a per-property map)
   * rather than guessing at the never-implemented real shape. */
  columnWidths?: number;
  /** view-specific layout options */
  layout?: Record<string, unknown>;
}

export interface DatabaseRow {
  id: string;
  name: string;
  icon?: string;
  cover?: string;
  /** dynamic property values keyed by property id */
  props?: Record<string, unknown>;
  pageBlocks?: Array<{ id: string; type: string; text: string }>;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  /** Every row also carries its property values as direct top-level keys
   * (e.g. row["status"]), not nested under `props` — confirmed via grep
   * of every view/service file, which all read `row[prop.id]` directly.
   * The `props` field above is declared in the original JSDoc but never
   * actually populated or read anywhere in this module; kept for fidelity
   * to the source JSDoc (same "documented but dead" treatment as
   * ViewDefinition.columnWidths above), while this index signature covers
   * the real per-property top-level keys every consumer actually uses. */
  [key: string]: unknown;
}

export interface DatabaseSchema {
  properties: PropertyDefinition[];
  views: ViewDefinition[];
  rows: DatabaseRow[];
  activeViewId: string;
}

export const PROPERTY_TYPES: Record<PropertyType, { id: PropertyType; label: string; icon: string; category: "basic" | "advanced" | "auto" | "ai" }> = {
  text:        { id: 'text',        label: 'Text',        icon: 'Aa',      category: 'basic' },
  number:      { id: 'number',      label: 'Number',      icon: '#',       category: 'basic' },
  checkbox:    { id: 'checkbox',    label: 'Checkbox',    icon: '☑',       category: 'basic' },
  date:        { id: 'date',        label: 'Date',        icon: '📅',       category: 'basic' },
  select:      { id: 'select',      label: 'Select',      icon: '▼',       category: 'basic' },
  'multi-select': { id: 'multi-select', label: 'Multi Select', icon: '🏷', category: 'basic' },
  status:      { id: 'status',      label: 'Status',      icon: '⚙',       category: 'advanced' },
  priority:    { id: 'priority',    label: 'Priority',    icon: '⚡',       category: 'advanced' },
  person:      { id: 'person',      label: 'Person',      icon: '👤',       category: 'advanced' },
  relation:    { id: 'relation',    label: 'Relation',    icon: '🔗',       category: 'advanced' },
  rollup:      { id: 'rollup',      label: 'Rollup',      icon: '📊',       category: 'advanced' },
  formula:     { id: 'formula',     label: 'Formula',     icon: '𝑓',        category: 'advanced' },
  url:         { id: 'url',         label: 'URL',          icon: '🔗',       category: 'basic' },
  email:       { id: 'email',       label: 'Email',       icon: '✉',       category: 'basic' },
  phone:       { id: 'phone',       label: 'Phone',       icon: '📞',       category: 'basic' },
  files:       { id: 'files',       label: 'Files',       icon: '📎',       category: 'advanced' },
  'created-time': { id: 'created-time', label: 'Created Time', icon: '⏰', category: 'auto' },
  'updated-time': { id: 'updated-time', label: 'Updated Time', icon: '🕐', category: 'auto' },
  'created-by':   { id: 'created-by',   label: 'Created By',   icon: '👤', category: 'auto' },
  'updated-by':   { id: 'updated-by',   label: 'Updated By',   icon: '👥', category: 'auto' },
  'ai-summary':   { id: 'ai-summary',   label: 'AI Summary',   icon: '🤖', category: 'ai' },
  'ai-tags':      { id: 'ai-tags',      label: 'AI Tags',     icon: '🏷', category: 'ai' },
  'estimated-time': { id: 'estimated-time', label: 'Estimated Time', icon: '⏱', category: 'ai' },
  'risk-score':    { id: 'risk-score',   label: 'Risk Score',   icon: '⚠', category: 'ai' },
};

export const DEFAULT_STATUS_OPTIONS = ['Not started', 'In progress', 'Done', 'Blocked'];
export const DEFAULT_PRIORITY_OPTIONS = ['None', 'Low', 'Medium', 'High', 'Urgent'];

export const VIEW_TYPES: Array<{ id: ViewDefinition["type"]; label: string; icon: string }> = [
  { id: 'table',    label: 'Table',    icon: '⊞' },
  { id: 'board',    label: 'Board',    icon: '⊟' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'timeline', label: 'Timeline', icon: '📈' },
  { id: 'gallery',  label: 'Gallery',  icon: '🖼' },
  { id: 'list',     label: 'List',     icon: '☰' },
  { id: 'graph',    label: 'Graph',    icon: '⚹' },
  { id: 'mind-map', label: 'Mind Map', icon: '🧠' },
];
