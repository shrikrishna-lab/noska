// Explicit shape for the `blocks` JSON column on `pages` (types/supabase.ts
// types it as plain `Json` since Postgres has no schema for JSONB
// columns). Inferred from the actual runtime shape produced by
// src/utils/helpers.js `blockFor()` / `textToBlocks()` — NOT from the more
// aspirational nested-`properties`-only shape sketched in
// src/utils/blockModel.js's `createBlock()`. In practice, blocks store
// most content directly on top-level fields (`text`, `database`, `table`,
// `columns`, `tabs`, etc.) alongside a `properties` bag, and that's the
// shape the editor components actually read/write.
//
// This file intentionally does NOT attempt a fully discriminated union
// keyed on `type` for every one of the ~40 block types in
// blockModel.js's BLOCK_TYPES — most of them (headings, lists, callouts,
// quotes, toggles, code, etc.) only ever touch `text`/`properties.richText`
// and have no other distinguishing fields in the current code. Modeling
// each as its own tag would suggest structure that doesn't exist yet.
// Instead: a shared BaseBlock with the common/generic fields, plus
// distinct interfaces (still tagged by `type`) for the handful of block
// types that do carry meaningfully different top-level fields (database,
// table, columns, tabs, form, synced block, breadcrumb/table-of-contents).
// `Block` is the union of those; call sites that need exhaustive
// type-narrowing on `.type` should switch on it explicitly rather than
// relying on structural inference alone.

/** A single rich-text run, e.g. `{ text: "hello" }`. Formatting marks
 * beyond plain text weren't found as a settled shape in current code
 * (RichTextRun consumers mostly just read `.text`), so this is left
 * intentionally minimal rather than guessing at bold/italic/etc. fields. */
export interface RichTextRun {
  text: string;
  [key: string]: unknown;
}

/** Fields common to every block, regardless of type. */
export interface BaseBlock {
  id: string;
  type: string;
  text?: string;
  parentId?: string | null;
  content?: string[];
  position?: string;
  properties?: Record<string, unknown>;
  createdTime?: string;
  lastEditedTime?: string;
  createdBy?: string | null;
  lastEditedBy?: string | null;
  isDeleted?: boolean;
  permissionOverride?: BlockPermissionOverride | null;
  /** Present on blocks created via the synced-block flow
   * (src/utils/helpers.js blockFor, type 'synced-block') — links mirrored
   * copies of the same block across pages. */
  syncedGroupId?: string;
  [key: string]: unknown;
}

export interface BlockPermissionOverride {
  type: "grant" | "public" | "workspace";
  level: string;
  users?: string[];
}

/** Database block — see src/modules/database/types/database.js for the
 * authoritative JSDoc this was translated from; that file remains the
 * source of truth for the nested database schema shape. */
export interface DatabasePropertyDefinition {
  id: string;
  name: string;
  type:
    | "text" | "number" | "checkbox" | "date" | "select" | "multi-select"
    | "status" | "priority" | "person" | "relation" | "rollup" | "formula"
    | "url" | "email" | "phone" | "files" | "created-time" | "updated-time"
    | "created-by" | "updated-by" | "ai-summary" | "ai-tags"
    | "estimated-time" | "risk-score";
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
  computed?: boolean;
  defaultValue?: unknown;
}

export interface DatabaseViewDefinition {
  id: string;
  type: "table" | "board" | "calendar" | "timeline" | "gallery" | "list" | "graph" | "mind-map";
  name: string;
  sort?: string;
  sortAsc?: boolean;
  filter?: string;
  filterGroup?: unknown;
  filters?: { operator: "and" | "or"; conditions: Array<{ columnId: string; condition: string; value?: string }> };
  sorts?: Array<{ columnId: string; direction: "ascending" | "descending" }>;
  groupBy?: string;
  hiddenProperties?: string[];
  columnWidths?: Record<string, number>;
  layout?: Record<string, unknown>;
}

export interface DatabaseRow {
  id: string;
  name: string;
  icon?: string;
  cover?: string;
  props?: Record<string, unknown>;
  pageBlocks?: Array<{ id: string; type: string; text: string }>;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface DatabaseSchema {
  properties: DatabasePropertyDefinition[];
  views: DatabaseViewDefinition[];
  rows: DatabaseRow[];
  activeViewId: string;
}

export interface DatabaseBlock extends BaseBlock {
  type: "database" | "database-inline" | "database-full";
  database: DatabaseSchema;
}

/** Table block — src/utils/helpers.js blockFor('table', ...) stores a
 * plain 2D array of cell strings, first row treated as the header. */
export interface TableBlock extends BaseBlock {
  type: "table";
  table: string[][];
}

/** Code block — src/utils/helpers.js blockFor('code', ...) sets
 * `props.language = 'plain'` (mirrored onto blockModel.js's BLOCK_TYPES.code
 * default too), and src/components/editor/CodeBlock.jsx reads/writes
 * `block.language` directly (not `block.properties.language`) via the
 * generic onPatch merge-patch. src/components/Editor.jsx's "turn into"
 * slash-command handler for code blocks also writes `language: "plain"`
 * at the top level. Found via grep across every block renderer — no other
 * block type reads a top-level `language` field. */
export interface CodeBlockData extends BaseBlock {
  type: "code";
  language: string;
}

/** N-column layout block — src/utils/helpers.js blockFor('2-columns' |
 * '3-columns' | '4-columns' | '5-columns', ...). Each column is itself an
 * array of rich-text runs (matching the single-paragraph seed value); the
 * column CSS tint is a named token from COLUMN_TINTS. */
export interface ColumnsBlock extends BaseBlock {
  type: "columns";
  columns: RichTextRun[][];
  columnColors: string[];
}

/** Tabs block — src/utils/helpers.js blockFor('tabs', ...). */
export interface TabsBlock extends BaseBlock {
  type: "tabs";
  tabs: Array<{ title: string; content: string[] }>;
  activeTabIdx: number;
}

/** Form block — src/utils/helpers.js blockFor('form', ...). Field/
 * submission shapes are intentionally left as loose records: the form
 * builder (not covered in this migration batch) constructs fields
 * dynamically and no single settled field shape exists yet in the .jsx
 * code beyond `{ id, type, label, required, options, visibleWhen }`. */
export interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options: string[];
  visibleWhen: unknown;
}

export interface FormBlock extends BaseBlock {
  type: "form";
  formConfig: {
    fields: FormField[];
    submitButtonText: string;
    anonymous: boolean;
    showResults: boolean;
  };
  submissions: Array<Record<string, unknown>>;
}

/** Button/template block — src/utils/helpers.js blockFor('button', ...). */
export interface TemplateButtonBlock extends BaseBlock {
  type: "template_button";
  templateBlocks: Block[];
}

/** Breadcrumb / table-of-contents blocks both store a flat list of
 * referenced page ids (src/utils/helpers.js blockFor). */
export interface PageListBlock extends BaseBlock {
  type: "breadcrumb" | "table_of_contents";
  pageIds: string[];
}

/** Anything not covered by a more specific interface above — the large
 * majority of block types (paragraph, headings, lists, to_do, toggle,
 * callout, quote, divider, image, code, link_to_page, mention, video,
 * audio, file, bookmark, ai-block, mermaid, equations, etc.) only ever
 * read/write `text` and `properties.richText`, so they share this shape
 * rather than each getting a synthetic dedicated interface. */
export interface GenericBlock extends BaseBlock {
  type: string;
}

export type Block =
  | DatabaseBlock
  | TableBlock
  | CodeBlockData
  | ColumnsBlock
  | TabsBlock
  | FormBlock
  | TemplateButtonBlock
  | PageListBlock
  | GenericBlock;

/** The `pages.lineage` JSON column — an append-only history of actions
 * taken on a page, distinct from (and unrelated to) the `audit_events`
 * table. See types/enums.ts LineageAction for the action literals. */
export interface LineageEntry {
  action: import("./enums").LineageAction;
  timestamp: string;
  detail?: string;
}
