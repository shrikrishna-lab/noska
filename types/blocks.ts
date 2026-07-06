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
 * plain 2D array of cell strings, first row treated as the header.
 * `colWidths` (per-column pixel widths, e.g. "120px") is written only by
 * src/components/editor/SimpleTable.jsx's column-resize handler — not
 * seeded by helpers.js/blockModel.js, so it's absent until the user drags
 * a column border at least once. Confirmed via grep: no other file reads
 * or writes it. */
export interface TableBlock extends BaseBlock {
  type: "table";
  table: string[][];
  colWidths?: string[];
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
 * '3-columns' | '4-columns' | '5-columns', ...). Each column is a plain
 * array of newline-joined text lines, NOT rich-text runs — confirmed
 * against helpers.js's seed (`Array.from({ length: n }, () => [''])`, a
 * one-element array containing an empty string) and
 * src/components/editor/ColumnsBlock.jsx's actual read/write
 * (`col.join("\n")` to render the textarea value, `value.split("\n")` to
 * write it back). An earlier version of this file incorrectly typed this
 * as `RichTextRun[][]`, which doesn't match either the seed shape or how
 * the only real consumer reads/writes it. The column CSS tint is a named
 * token from COLUMN_TINTS.
 *
 * NOTE: `type` is the four `-columns` variants, NOT the literal string
 * "columns" — `helpers.js`'s TYPE_TO_PROPS maps all four to the lookup key
 * 'columns' only to find shared defaults in blockModel.js's BLOCK_TYPES;
 * `createBlock(type, ...)` still stores the original `type` argument
 * verbatim, so `block.type` is always one of the four real values.
 * Confirmed against src/components/editor/renderBlockEditor.jsx's dispatch
 * (`block.type === "columns" || block.type.endsWith("-columns")` — the
 * `=== "columns"` half never actually matches anything at runtime). */
export interface ColumnsBlock extends BaseBlock {
  type: "2-columns" | "3-columns" | "4-columns" | "5-columns";
  columns: string[][];
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

/** Button/template block — TWO distinct commands both produce this shape:
 * the "button" command (src/core/commands/CommandRegistry.ts,
 * blockForTree(ctx.block, "button", ...)) makes a plain action button with
 * `block.type === "button"`; the "template-button" command
 * (blockForTree(ctx.block, "template_button", ...)) makes a button that
 * clones a predefined block set with `block.type === "template_button"`.
 * Both are real, distinct runtime type values — renderBlockEditor.jsx's
 * dispatch explicitly handles both
 * (`block.type === "button" || block.type === "template_button"`) and both
 * read the same `templateBlocks` field. */
export interface TemplateButtonBlock extends BaseBlock {
  type: "button" | "template_button";
  templateBlocks: Block[];
}

/** Breadcrumb / table-of-contents blocks both store a flat list of
 * referenced page ids (src/utils/helpers.js blockFor).
 *
 * NOTE: the table-of-contents type string uses a HYPHEN
 * ("table-of-contents"), not an underscore — confirmed against
 * helpers.js's blockFor (`type === 'table-of-contents'`),
 * BlockRegistry.tsx, CommandRegistry.ts, and
 * renderBlockEditor.jsx's dispatch. An earlier version of this file
 * incorrectly had "table_of_contents" (underscore), which never matches
 * any real block. */
export interface PageListBlock extends BaseBlock {
  type: "breadcrumb" | "table-of-contents";
  pageIds: string[];
}

/** Mention block — produced identically by two commands ("mention-person"
 * and "mention-person"'s sibling "mention-page" in
 * src/core/commands/CommandRegistry.ts), both via
 * `ctx.onPatch({ type: "mention", mentionPageId: null, isInlineMention:
 * true, ... })`. The command ids differ but the runtime `block.type` is
 * always the single string "mention" — confirmed against
 * src/components/editor/renderBlockEditor.jsx's dispatch
 * (`block.type === "mention"`, reading `block.mentionPageId`). Previously
 * absorbed silently by GenericBlock's index signature with no
 * documentation; called out explicitly now since it has real
 * distinguishing fields. */
export interface MentionBlock extends BaseBlock {
  type: "mention";
  mentionPageId: string | null;
  isInlineMention?: boolean;
}

/** Chart block — src/components/editor/ChartBlock.jsx reads/writes
 * `block.chart = { title, series: [{ label, value, color }], unit }`,
 * falling back to sample data keyed by `block.type` when `block.chart` is
 * absent (first insert). Covers all five chart command ids
 * (bar-chart-v, bar-chart-h, line-chart, donut-chart, number-chart) —
 * renderBlockEditor.jsx dispatches all of them with a single
 * `block.type.includes("chart")` check rather than listing each type. */
export interface ChartSeriesPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartBlockData extends BaseBlock {
  type: "bar-chart-v" | "bar-chart-h" | "line-chart" | "donut-chart" | "number-chart";
  chart?: {
    title?: string;
    series: ChartSeriesPoint[];
    unit?: string;
  };
}

/** Image block — src/components/editor/ImageBlock.jsx reads/writes
 * `caption` (below-image text input), `imageSize` (one of the four
 * ALIGNMENT_OPTIONS ids driving max-width), `imageAlign` (horizontal
 * alignment of the image within its container), and `imageWidth` (an
 * explicit pixel width set only after a manual drag-resize, overriding
 * the size-preset max-width). Confirmed via grep: these four fields are
 * exclusive to ImageBlock.jsx — no other block type reads them. */
export interface ImageBlockData extends BaseBlock {
  type: "image";
  caption?: string;
  imageSize?: "small" | "medium" | "large" | "full";
  imageAlign?: "left" | "center" | "right";
  imageWidth?: number;
}

/** Linked-view block — src/components/editor/LinkedViewBlock.jsx.
 * References (does not copy) an existing database block elsewhere in the
 * workspace: `sourcePageId`/`sourceBlockId` identify that database until
 * picked, both fields are simply absent (the component treats a missing
 * `sourceBlockId` as "show the picker UI"). Created via the "linked-view"
 * slash command (src/core/commands/CommandRegistry.ts), which seeds no
 * initial fields beyond the base block — confirmed via grep, no other
 * file reads/writes these two fields. */
export interface LinkedViewBlockData extends BaseBlock {
  type: "linked-view";
  sourcePageId?: string | null;
  sourceBlockId?: string | null;
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
  | MentionBlock
  | ChartBlockData
  | ImageBlockData
  | LinkedViewBlockData
  | GenericBlock;

/** The `pages.lineage` JSON column — an append-only history of actions
 * taken on a page, distinct from (and unrelated to) the `audit_events`
 * table. See types/enums.ts LineageAction for the action literals. */
export interface LineageEntry {
  action: import("./enums").LineageAction;
  timestamp: string;
  detail?: string;
}
