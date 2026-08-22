import { blockFor } from "../../utils/helpers";
import type { Page } from "../../lib/supabaseService";
import { createReviewState } from "../../features/spaced/scheduler";
// Aliased to avoid colliding with this file's own local usage patterns
// (same pattern as the DatabaseBlock component/type collision resolved
// in earlier Phase-4 batches).
import type { Block, DatabaseBlock as DatabaseBlockData, DatabaseViewDefinition } from "../../../types/blocks";

// ── Command Definition ─────────────────────────────────────────
// Each command: { id, title, aliases, icon, category, description,
//                 shortcut, available(ctx), execute(ctx), preview(ctx) }

// Context passed to every command's available()/execute() — this is the
// union of every `ctx.<field>` access grepped across every command
// definition in this file (basic/media/database/advanced/layout/inline/
// embeds/pageActions). Every field is optional because different call
// sites (SlashCommandMenu, PageOptionsMenu, CommandPalette) each supply
// only the subset of handlers relevant to their context — no single call
// site provides all of them.
export interface CommandContext {
  block?: any;
  page?: Page | null;
  text?: string;
  onAdd?: (type: string, text: string) => void;
  onAnalytics?: () => void;
  onCreateSubpage?: (blockId: string, text: string) => string | null | undefined;
  onDatePicker?: () => void;
  onDelete?: () => void;
  onDuplicatePage?: () => void;
  onEmojiPicker?: () => void;
  onExport?: () => void;
  onHistory?: () => void;
  onImport?: () => void;
  onMoveTo?: () => void;
  onNavigate?: (pageId: string) => void;
  onPagePatch?: (patch: Record<string, unknown>) => void;
  onPatch?: (patch: any) => void;
  onPresent?: () => void;
  onToast?: (message: string) => void;
  onToggleSuggest?: () => void;
  // Declared with an optional pageId param to match the one real caller
  // below (`ctx.onTrash?.(ctx.page.id)`) — the param was previously
  // missing from this declaration (a type-only bug, not a runtime one;
  // JS never checked call-site arity), only surfaced now that a real
  // typed caller (CommandPalette.tsx forwarding Editor.tsx's
  // `onTrashPage: (pageId: string) => void`) is checked against it.
  onTrash?: (pageId?: string) => void;
  onWiki?: () => void;
  setCustomizeOpen?: (open: boolean) => void;
  [key: string]: unknown;
}

/** Preview shown in the slash-command menu — either a plain description
 * string (legacy shape, normalized at read time by normalizePreview) or
 * an object with an optional illustration image. */
export type CommandPreview = string | { description: string; image?: string };

export interface Command {
  id: string;
  title: string;
  aliases?: string[];
  icon: string;
  category: string;
  description?: string;
  shortcut?: string;
  toggle?: boolean;
  preview?: CommandPreview;
  available?: (ctx: CommandContext) => boolean;
  execute: (ctx: CommandContext) => void;
}

/** Command as returned by getCommand/getAllCommands/getFilteredCommands —
 * always has a normalized `{ description, image? }` preview object,
 * regardless of what shape it was registered with. */
export type NormalizedCommand = Omit<Command, "preview"> & {
  preview: { description: string; image?: string };
};

let _commands = new Map<string, Command>();
let _listeners = new Set<(id: string, cmd: Command) => void>();

// ── Preview Normalization Shim ─────────────────────────────────
// Converts old `preview: "string"` to `preview: { description, image? }`
// at read time, so all consumers see a consistent shape.
function normalizePreview(cmd: Command): NormalizedCommand;
function normalizePreview(cmd: undefined): undefined;
function normalizePreview(cmd: Command | undefined): NormalizedCommand | undefined {
  if (!cmd) return undefined;
  const raw = cmd.preview;
  if (typeof raw === "string") {
    return { ...cmd, preview: { description: raw } };
  }
  if (raw && typeof raw === "object" && typeof raw.description === "string") {
    return cmd as NormalizedCommand; // Already correct shape
  }
  // Fallback: no preview field or unexpected type
  return { ...cmd, preview: { description: cmd.description || "" } };
}

export function registerCommand(cmd: Command) {
  _commands.set(cmd.id, cmd);
  _listeners.forEach((fn) => fn(cmd.id, cmd));
  return cmd;
}

export function getCommand(id: string): NormalizedCommand | undefined {
  return normalizePreview(_commands.get(id));
}

export function getAllCommands(): NormalizedCommand[] {
  return Array.from(_commands.values()).map((c) => normalizePreview(c));
}

export function getFilteredCommands(query: string, ctx: CommandContext = {}): NormalizedCommand[] {
  const q = (query || "").toLowerCase();
  return Array.from(_commands.values())
    .filter((c) => {
      if (c.available && !c.available(ctx)) return false;
      if (!q) return true;
      const match = c.title.toLowerCase().includes(q) ||
        (c.aliases || []).some((a) => a.toLowerCase().includes(q)) ||
        (c.description || "").toLowerCase().includes(q);
      return match;
    })
    .sort((a, b) => {
      // Prioritize title match over alias match
      const aTitle = a.title.toLowerCase().startsWith(q) ? 0 : 1;
      const bTitle = b.title.toLowerCase().startsWith(q) ? 0 : 1;
      return aTitle - bTitle;
    })
    .map((c) => normalizePreview(c));
}

export function getCommandsByCategory(category: string): NormalizedCommand[] {
  return getAllCommands().filter((c) => c.category === category);
}

export function onCommandRegister(fn: (id: string, cmd: Command) => void) {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

// ── Commands grouped by category ────────────────────────────────
// Each command's execute() receives the context and returns void.
// Side effects (state changes) happen via the context methods.

// ── Basic Blocks ────────────────────────────────────────────────
const basic = [
  {
    id: "text", title: "Text", aliases: ["paragraph", "p"],
    icon: "Type", category: "Basic blocks",
    description: "Plain text block — the default block type",
    preview: { description: "A simple text block for writing content", image: "/previews/text.svg" },
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "text", ctx.text)); }
  },
  {
    id: "h1", title: "Heading 1", aliases: ["#"],
    icon: "Heading1", category: "Basic blocks",
    description: "Large section heading",
    shortcut: "#",
    preview: "Big heading — use for page titles and sections",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "h1", ctx.text)); }
  },
  {
    id: "h2", title: "Heading 2", aliases: ["##"],
    icon: "Heading2", category: "Basic blocks",
    description: "Medium section heading",
    shortcut: "##",
    preview: "Medium heading — use for subsections",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "h2", ctx.text)); }
  },
  {
    id: "h3", title: "Heading 3", aliases: ["###"],
    icon: "Heading3", category: "Basic blocks",
    description: "Small section heading",
    shortcut: "###",
    preview: "Small heading — use for sub-subsections",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "h3", ctx.text)); }
  },
  {
    id: "h4", title: "Heading 4", aliases: ["####"],
    icon: "Heading4", category: "Basic blocks",
    description: "Smallest heading",
    shortcut: "####",
    preview: "Tiny heading — use for detailed organization",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "h4", ctx.text)); }
  },
  {
    id: "bullet", title: "Bulleted list", aliases: ["-", "*", "+", "ul"],
    icon: "List", category: "Basic blocks",
    description: "Unordered list item",
    shortcut: "-",
    preview: "A bullet point — use for unordered lists",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "bullet", ctx.text)); }
  },
  {
    id: "number", title: "Numbered list", aliases: ["1.", "ol"],
    icon: "ListChecks", category: "Basic blocks",
    description: "Ordered list item",
    shortcut: "1.",
    preview: "A numbered item — use for ordered lists",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "number", ctx.text)); }
  },
  {
    id: "todo", title: "To-do list", aliases: ["[]", "checkbox"],
    icon: "CheckSquare", category: "Basic blocks",
    description: "Checkable task item",
    shortcut: "[]",
    preview: "A checkbox — track tasks and todos",
    execute(ctx) { ctx.onPatch({ ...blockForTree(ctx.block, "todo", ctx.text), checked: false }); }
  },
  {
    id: "toggle", title: "Toggle list", aliases: [">", "details"],
    icon: "ChevronRight", category: "Basic blocks",
    description: "Collapsible block with nested children",
    shortcut: ">",
    preview: { description: "A collapsible section — hide/show nested blocks", image: "/previews/toggle.svg" },
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "toggle", ctx.text)); }
  },
  {
    id: "page", title: "Page", aliases: ["subpage"],
    icon: "FileText", category: "Basic blocks",
    description: "Create a new subpage and link to it",
    preview: "Creates a new subpage and links it as a block",
    execute(ctx) {
      const newId = ctx.onCreateSubpage?.(ctx.block.id, ctx.text);
      if (newId) ctx.onNavigate?.(newId);
    }
  },
  {
    id: "callout", title: "Callout", aliases: ["info", "note"],
    icon: "MessageSquare", category: "Basic blocks",
    description: "Highlighted information box",
    preview: { description: "An info box — highlight important content", image: "/previews/callout.svg" },
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "callout", ctx.text)); }
  },
  {
    id: "quote", title: "Quote", aliases: ['"', "blockquote"],
    icon: "Quote", category: "Basic blocks",
    description: "Block quote",
    shortcut: '"',
    preview: "A block quote — use for citations",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "quote", ctx.text)); }
  },
  {
    id: "divider", title: "Divider", aliases: ["---", "***", "hr", "separator"],
    icon: "Clipboard", category: "Basic blocks",
    description: "Horizontal separator line",
    shortcut: "---",
    preview: "A horizontal line — separate sections visually",
    execute(ctx) {
      ctx.onDelete();
      ctx.onAdd("divider", "");
    }
  },
  {
    id: "link-to-page", title: "Link to page", aliases: ["pagelink", "wiki"],
    icon: "Link", category: "Basic blocks",
    description: "Select a page to link to",
    preview: "Link to another page — pick from your workspace",
    execute(ctx) {
      ctx.onPatch({
        type: "link-to-page", text: ctx.text || "",
        targetPageId: null, isLinkShortcut: true,
        parentId: ctx.block.parentId || null,
        content: ctx.block.content || []
      });
    }
  },
  {
    id: "simple-table", title: "Simple Table", aliases: ["table", "grid"],
    icon: "Table", category: "Basic blocks",
    description: "Simple text grid table",
    preview: "A basic text grid, starting as an empty 3×2 table (no sample data). Type in any cell, resize columns, and add rows/columns as needed.",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "table", ctx.text)); }
  },
  {
    id: "template-button", title: "Template button", aliases: ["template", "clone"],
    icon: "CopyPlus", category: "Advanced blocks",
    description: "A button that clones a predefined set of blocks",
    preview: "Add a template button — clicking it inserts predefined blocks",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "template_button", ctx.text)); }
  },
  {
    id: "block-equation", title: "Block equation", aliases: ["math", "equation", "display-math", "latex-block"],
    icon: "Edit3", category: "Advanced blocks",
    description: "Centered math block — renders LaTeX with KaTeX",
    preview: "Add a centered math equation — type LaTeX and see it rendered",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "block-equation", ctx.text)); }
  },
];

// ── Media ───────────────────────────────────────────────────────
const media = [
  {
    id: "image", title: "Image", aliases: ["img", "photo", "picture"],
    icon: "Image", category: "Media",
    description: "Upload or embed an image",
    preview: { description: "Add an image — upload from device or paste a URL", image: "/previews/image.svg" },
    execute(ctx) {
      const patch = blockForTree(ctx.block, "image", ctx.text);
      patch.text = "";
      ctx.onPatch(patch);
    }
  },
  {
    id: "video", title: "Video", aliases: ["vid"],
    icon: "Video", category: "Media",
    description: "Upload or embed a video (YouTube, Vimeo, etc.)",
    preview: "Add a video — upload or paste a URL (YouTube, Vimeo…)",
    execute(ctx) {
      const patch = blockForTree(ctx.block, "video", ctx.text);
      patch.text = "";
      ctx.onPatch(patch);
    }
  },
  {
    id: "audio", title: "Audio", aliases: ["sound", "music"],
    icon: "Music", category: "Media",
    description: "Upload or embed an audio file",
    preview: "Add audio — upload a sound file or paste a URL",
    execute(ctx) {
      const patch = blockForTree(ctx.block, "audio", ctx.text);
      patch.text = "";
      ctx.onPatch(patch);
    }
  },
  {
    id: "code", title: "Code", aliases: ["pre", "snippet"],
    icon: "Code", category: "Media",
    description: "Code block with syntax highlighting",
    preview: { description: "Add a code block — choose language for highlighting", image: "/previews/code.svg" },
    execute(ctx) {
      ctx.onPatch(blockForTree(ctx.block, "code", ctx.text));
    }
  },
  {
    id: "file", title: "File", aliases: ["attachment", "download"],
    icon: "File", category: "Media",
    description: "Upload a file with download button",
    preview: "Upload a file — add a downloadable attachment",
    execute(ctx) {
      const patch = blockForTree(ctx.block, "file", ctx.text);
      patch.text = "";
      ctx.onPatch(patch);
    }
  },
  {
    id: "bookmark", title: "Web bookmark", aliases: ["link", "url"],
    icon: "Globe", category: "Media",
    description: "Rich link preview with metadata",
    preview: "Add a rich link preview — shows title, description, favicon",
    execute(ctx) {
      const patch = blockForTree(ctx.block, "bookmark", ctx.text);
      patch.text = "";
      ctx.onPatch(patch);
    }
  },
];

// ── Database ────────────────────────────────────────────────────
const database = [
  {
    id: "table-view", title: "Table view", aliases: ["db-table", "spreadsheet"],
    icon: "Table", category: "Database",
    description: "Spreadsheet-style database table",
    preview: { description: "Spreadsheet-style rows and columns. Starts with one Name column — add your own properties (text, select, date, number…), switch to Board/Calendar/Gallery anytime.", image: "/previews/table-view.svg" },
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "table", ctx.text)); }
  },
  {
    id: "board-view", title: "Board view", aliases: ["kanban", "board"],
    icon: "Layout", category: "Database",
    description: "Kanban-style board view",
    preview: { description: "Kanban board grouped by a Select/Status property. Add one to create columns, then drag cards between them. Same data as the table view.", image: "/previews/board-view.svg" },
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "board", ctx.text)); }
  },
  {
    id: "gallery-view", title: "Gallery view", aliases: ["grid", "cards"],
    icon: "ImageIcon", category: "Database",
    description: "Card/image gallery view",
    preview: "Cards with a cover image or icon. Best for visual collections — add rows, then pick which properties show on each card.",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "gallery", ctx.text)); }
  },
  {
    id: "list-view", title: "List view", aliases: ["simple-list"],
    icon: "List", category: "Database",
    description: "Simple list view",
    preview: "Compact one-line rows with inline property tags. Same data as the table — switch views anytime without losing content.",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "list", ctx.text)); }
  },
  {
    id: "calendar-view", title: "Calendar view", aliases: ["calendar", "schedule"],
    icon: "Calendar", category: "Database",
    description: "Calendar/date-based view",
    preview: "Places rows on a calendar by a Date property. Add a Date property to position entries; click a day to add an entry.",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "calendar", ctx.text)); }
  },
  {
    id: "timeline-view", title: "Timeline view", aliases: ["gantt", "roadmap"],
    icon: "Clock", category: "Database",
    description: "Timeline/Gantt chart view",
    preview: "Horizontal Gantt-style bars across a date range. Needs start/end Date properties to plot durations for planning.",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "timeline", ctx.text)); }
  },
  {
    id: "dashboard-view", title: "Dashboard view", aliases: ["dashboard"],
    icon: "LayoutDashboard", category: "Database",
    description: "Dashboard with widgets",
    preview: "Live summary widgets over this database — total count, breakdowns by each Select property, and completion % per checkbox. Updates automatically as rows change.",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "dashboard", ctx.text)); }
  },
  {
    id: "map-view", title: "Map view", aliases: ["map", "geography"],
    icon: "MapPin", category: "Database",
    description: "Geographic map view",
    preview: "Plots rows on a map by a location/address property. Add a text address or coordinates property to pin entries. (Renderer in progress.)",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "map", ctx.text)); }
  },
  {
    id: "form", title: "Form", aliases: ["survey"],
    icon: "FormInput", category: "Database",
    description: "Fillable form",
    preview: "A fillable form that writes submissions into a database. Starts with one field — add fields, mark required, and share to collect responses.",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "form", ctx.text)); }
  },
  {
    id: "database-inline", title: "Database – Inline", aliases: ["db-inline"],
    icon: "Database", category: "Database",
    description: "Inline database in the page",
    preview: "An empty database embedded in this page. Starts with one Name column and no rows — add properties and switch between Table/Board/List/Gallery views inline.",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "database-inline", ctx.text)); }
  },
  {
    id: "database-full", title: "Database – Full page", aliases: ["db-full"],
    icon: "Database", category: "Database",
    description: "Full-page database",
    preview: "A database with a page-like full-width frame and title header. Starts empty with one Name column — build your schema and add rows. (Standalone-page navigation is planned.)",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "database-full", ctx.text)); }
  },
  {
    id: "bar-chart-v", title: "Vertical bar chart", aliases: ["bar", "vertical-bar", "column-chart"],
    icon: "BarChart3", category: "Database",
    description: "Vertical bar chart visualization",
    preview: "Vertical bars comparing values across categories. Opens with editable sample data — set your own labels, values, and colors, or connect a database property.",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "bar-chart-v", ctx.text)); }
  },
  {
    id: "bar-chart-h", title: "Horizontal bar chart", aliases: ["horizontal-bar", "hbar"],
    icon: "BarChart3", category: "Database",
    description: "Horizontal bar chart visualization",
    preview: "Horizontal bars, ideal for ranking long labels. Opens with editable sample data — customize labels, values, and colors, or bind to a data source.",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "bar-chart-h", ctx.text)); }
  },
  {
    id: "line-chart", title: "Line chart", aliases: ["line", "trend"],
    icon: "LineChart", category: "Database",
    description: "Line chart visualization",
    preview: "A trend line over ordered points. Opens with editable sample data — enter your own series or connect a database of dated values.",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "line-chart", ctx.text)); }
  },
  {
    id: "donut-chart", title: "Donut chart", aliases: ["donut", "pie", "ring"],
    icon: "PieChart", category: "Database",
    description: "Donut chart visualization",
    preview: "Proportional segments showing parts of a whole. Opens with editable sample data — set slice labels/values or connect a data source.",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "donut-chart", ctx.text)); }
  },
  {
    id: "number-chart", title: "Number chart", aliases: ["number", "metric", "kpi"],
    icon: "Hash", category: "Database",
    description: "Number chart visualization",
    preview: "A single big KPI number with a label. Opens editable — type your metric, or connect a database property to aggregate it live.",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "number-chart", ctx.text)); }
  },
  {
    id: "feed-view", title: "Feed view", aliases: ["feed", "rss"],
    icon: "Activity", category: "Database",
    description: "RSS-style feed view",
    preview: "A vertical stream of entries, newest first. Same database as other views — add rows and switch view types anytime.",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "feed", ctx.text)); }
  },
  {
    id: "linked-view", title: "Linked view of data source", aliases: ["linked", "source", "linked-db"],
    icon: "Link", category: "Database",
    description: "View referencing another database",
    preview: "Shows an existing database from elsewhere in your workspace. Pick the source, then filter/sort it independently without copying the data.",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "linked-view", ctx.text)); }
  },
];

// ── Advanced Blocks ─────────────────────────────────────────────
const advanced = [
  {
    id: "review", title: "Add to review", aliases: ["review", "flashcard", "memorize", "study"],
    icon: "Brain", category: "Advanced blocks",
    description: "Turn this block into a spaced-repetition study card",
    preview: { description: "Adds this block to your review queue — recall it with the Spaced Repetition study session" },
    execute(ctx) {
      // Same helper as the block context menu — behavior cannot diverge.
      ctx.onPatch?.(createReviewState());
      ctx.onToast?.("Added to your review queue");
    }
  },
  {
    id: "table-of-contents", title: "Table of contents", aliases: ["toc"],
    icon: "BookOpen", category: "Advanced blocks",
    description: "Auto-generated table of contents from headings",
    preview: { description: "Auto-generates a table of contents from all headings on the page", image: "/previews/table-of-contents.svg" },
    execute(ctx) {
      ctx.onDelete();
      ctx.onAdd("table-of-contents", "");
    }
  },
  {
    id: "button", title: "Button", aliases: ["action"],
    icon: "Square", category: "Advanced blocks",
    description: "Action button with customizable behavior",
    preview: "Add a button — configure what it does when clicked",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "button", ctx.text)); }
  },
  {
    id: "breadcrumb", title: "Breadcrumb", aliases: ["path"],
    icon: "Route", category: "Advanced blocks",
    description: "Shows page hierarchy path",
    preview: "Shows the real path from your workspace root to this page, auto-built from the page tree. Each crumb is clickable to jump up the hierarchy.",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "breadcrumb", ctx.text)); }
  },
  {
    id: "tabs", title: "Tabs", aliases: ["tab-container"],
    icon: "Layout", category: "Advanced blocks",
    description: "Tabbed sections — each tab holds editable text",
    preview: "Switchable tabbed sections. Each tab holds editable text you can rename; nested blocks per tab aren't supported yet.",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "tabs", ctx.text)); }
  },
  {
    id: "synced-block", title: "Reference block", aliases: ["sync", "reference", "synced"],
    icon: "Copy", category: "Advanced blocks",
    description: "A highlighted reference block for content you want to call out",
    preview: "A distinct bordered block for referenceable content. (Live cross-instance syncing is planned — for now it behaves as a standalone highlighted block.)",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "synced-block", ctx.text)); }
  },
  {
    id: "toggle-h1", title: "Toggle heading 1", aliases: ["#>", "toggle1"],
    icon: "ToggleLeft", category: "Advanced blocks",
    description: "Collapsible H1 with nested blocks",
    preview: "A collapsible H1 heading — click to expand/collapse nested content",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "toggle-h1", ctx.text)); }
  },
  {
    id: "toggle-h2", title: "Toggle heading 2", aliases: ["##>", "toggle2"],
    icon: "ToggleLeft", category: "Advanced blocks",
    description: "Collapsible H2 with nested blocks",
    preview: "A collapsible H2 heading",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "toggle-h2", ctx.text)); }
  },
  {
    id: "toggle-h3", title: "Toggle heading 3", aliases: ["###>", "toggle3"],
    icon: "ToggleLeft", category: "Advanced blocks",
    description: "Collapsible H3 with nested blocks",
    preview: "A collapsible H3 heading",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "toggle-h3", ctx.text)); }
  },
  {
    id: "ai-block", title: "AI Block", aliases: ["ai"],
    icon: "Sparkles", category: "Advanced blocks",
    description: "Generate content with AI",
    preview: "Use AI to generate text, ideas, or summaries inline",
    execute(ctx) {
      ctx.onPatch(blockForTree(ctx.block, "ai-block", ctx.text));
    }
  },
  {
    id: "mermaid", title: "Code – Mermaid", aliases: ["diagram", "chart"],
    icon: "Code", category: "Advanced blocks",
    description: "Mermaid diagram renderer",
    preview: "Renders a live diagram from Mermaid text — flowcharts, sequence, Gantt, and more. Starts empty; type syntax and it renders instantly below.",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "mermaid", ctx.text)); }
  },
  {
    id: "ai-meeting", title: "AI Meeting Notes", aliases: ["meeting", "minutes"],
    icon: "Sparkles", category: "Advanced blocks",
    description: "Generate meeting notes with AI",
    preview: "AI-powered meeting notes — capture and summarize",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "ai-meeting", ctx.text)); }
  },
];

// ── Layout ──────────────────────────────────────────────────────
const layout = [
  {
    id: "2-columns", title: "2 columns", aliases: ["2col", "cols2", "split"],
    icon: "Columns2", category: "Layout",
    description: "Two-column layout",
    preview: { description: "Two side-by-side columns, tinted green + blue by default. Both start empty — type in each and recolor per column. Add/remove columns anytime.", image: "/previews/2-columns.svg" },
    execute(ctx) { ctx.onDelete(); ctx.onAdd("2-columns", ""); }
  },
  {
    id: "3-columns", title: "3 columns", aliases: ["3col", "cols3"],
    icon: "Columns3", category: "Layout",
    description: "Three-column layout",
    preview: "Three empty columns (green/blue/orange tints). Type in each, change any column's background color, or add/remove columns after inserting.",
    execute(ctx) { ctx.onDelete(); ctx.onAdd("3-columns", ""); }
  },
  {
    id: "4-columns", title: "4 columns", aliases: ["4col", "cols4"],
    icon: "Columns3", category: "Layout",
    description: "Four-column layout",
    preview: "Four empty columns with rotating palette tints. Each is independently editable and recolorable; add or remove columns as needed.",
    execute(ctx) { ctx.onDelete(); ctx.onAdd("4-columns", ""); }
  },
  {
    id: "5-columns", title: "5 columns", aliases: ["5col", "cols5"],
    icon: "Columns3", category: "Layout",
    description: "Five-column layout",
    preview: "Five empty columns with rotating palette tints. Type into each, recolor per column, and add/remove columns after inserting.",
    execute(ctx) { ctx.onDelete(); ctx.onAdd("5-columns", ""); }
  },
];

// ── Inline ──────────────────────────────────────────────────────
const inline = [
  {
    id: "mention-page", title: "Mention a page", aliases: ["@page", "[[", "link"],
    icon: "FileText", category: "Inline",
    description: "Search and link to another page",
    preview: { description: "Mention another page — search by title, click to open", image: "/previews/mention-page.svg" },
    execute(ctx) {
      ctx.onPatch({
        type: "mention", text: ctx.text ? `@${ctx.text}` : "@",
        mentionPageId: null, isInlineMention: true
      });
    }
  },
  {
    id: "mention-person", title: "Mention a person", aliases: ["@user", "@person"],
    icon: "Users", category: "Inline",
    description: "Mention a workspace member",
    preview: "Mention a person — notify them and link to their profile",
    execute(ctx) {
      ctx.onPatch({
        type: "mention", text: ctx.text ? `@${ctx.text}` : "@",
        mentionPageId: null, isInlineMention: true
      });
    }
  },
  {
    id: "date-reminder", title: "Date or reminder", aliases: ["date", "reminder", "/date"],
    icon: "Clock", category: "Inline",
    description: "Insert a date with optional reminder",
    preview: "Inserts today's date as editable text. Open the date picker to change it or add a reminder.",
    execute(ctx) {
      if (ctx.onDatePicker) { ctx.onDatePicker(); return; }
      // Fallback: insert a real, editable date immediately (no fake placeholder).
      const d = new Date();
      const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
      const base = (ctx.block.text || "").replace(/^\/\w*\s*/, "");
      ctx.onPatch({ text: `${base}@${dateStr}` });
    }
  },
  {
    id: "emoji", title: "Emoji", aliases: ["smiley", "icon"],
    icon: "Smile", category: "Inline",
    description: "Insert an emoji",
    preview: "Opens an emoji picker. Pick one to insert it inline; searchable by keyword.",
    execute(ctx) {
      if (ctx.onEmojiPicker) { ctx.onEmojiPicker(); return; }
      // Fallback: insert a default emoji the user can replace (no fake "/").
      const base = (ctx.block.text || "").replace(/^\/\w*\s*/, "");
      ctx.onPatch({ text: `${base}😀` });
    }
  },
  {
    id: "bold", title: "Bold", aliases: ["bold", "strong"],
    icon: "Bold", category: "Inline", hideFromSlash: true,
    description: "Bold (Ctrl+B)",
    preview: "Select text and use the toolbar (or Ctrl+B) to make it bold",
    execute(ctx) { ctx.onPatch({ text: `**${ctx.block.text || ctx.text}**` }); }
  },
  {
    id: "italic", title: "Italic", aliases: ["italic", "em"],
    icon: "Italic", category: "Inline", hideFromSlash: true,
    description: "Italic (Ctrl+I)",
    preview: "Select text and use the toolbar (or Ctrl+I) to italicize it",
    execute(ctx) { ctx.onPatch({ text: `*${ctx.block.text || ctx.text}*` }); }
  },
  {
    id: "underline", title: "Underline", aliases: ["underline", "u"],
    icon: "Underline", category: "Inline", hideFromSlash: true,
    description: "Underline (Ctrl+U)",
    preview: "Select text and use the toolbar (or Ctrl+U) to underline it",
    execute(ctx) { ctx.onPatch({ text: `<u>${ctx.block.text || ctx.text}</u>` }); }
  },
  {
    id: "strikethrough", title: "Strikethrough", aliases: ["strikethrough", "strike"],
    icon: "Type", category: "Inline", hideFromSlash: true,
    description: "Strikethrough (Ctrl+Shift+S)",
    preview: "Select text and use the toolbar to strike it through",
    execute(ctx) { ctx.onPatch({ text: `~~${ctx.block.text || ctx.text}~~` }); }
  },
  {
    id: "inline-code", title: "Inline code", aliases: ["code", "monospace"],
    icon: "Code", category: "Inline", hideFromSlash: true,
    description: "Inline code (Ctrl+`)",
    preview: "Select text and use the toolbar (or Ctrl+`) to format as code",
    execute(ctx) { ctx.onPatch({ text: `\`${ctx.block.text || ctx.text}\`` }); }
  },
  {
    id: "inline-equation", title: "Inline equation", aliases: ["math", "latex", "katex"],
    icon: "Edit3", category: "Inline",
    description: "KaTeX inline equation",
    preview: "Add a math equation — rendered with KaTeX",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "inline-equation", ctx.text)); }
  },
  {
    id: "color", title: "Color", aliases: ["text color", "font color"],
    icon: "Palette", category: "Inline", hideFromSlash: true,
    description: "Change text color — select text then pick a color from the toolbar",
    preview: "Use the floating toolbar color palette to change selected text color",
    execute(ctx) { ctx.onPatch({ text: ctx.block.text || "" }); }
  },
  {
    id: "highlight", title: "Highlight", aliases: ["bg color", "background"],
    icon: "Highlighter", category: "Inline", hideFromSlash: true,
    description: "Highlight text with background color — pick from the toolbar palette",
    preview: "Use the floating toolbar to highlight selected text with a background color",
    execute(ctx) { ctx.onPatch({ text: ctx.block.text || "" }); }
  },
];

// ── Color Presets ──────────────────────────────────────────────────
const COLORS = ["default", "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
COLORS.forEach((c) => {
  const colorCommands = [
    {
      id: `color-${c}`, title: `${c.charAt(0).toUpperCase() + c.slice(1)}`, aliases: c === "default" ? ["reset-color"] : [`${c}-text`],
      icon: "Palette", category: "Inline", hideFromSlash: true,
      description: c === "default" ? "Reset block text color to default" : `Set text color to ${c}`,
      execute(ctx) {
        const text = ctx.text || ctx.block.text || "";
        if (c === "default") {
          ctx.onPatch({ text: text.replace(/@@\w[\w-]*:/g, "").replace(/@@/g, "") });
        } else {
          ctx.onPatch({ text: `@@${c}:${text}@@` });
        }
      }
    },
    {
      id: `color-bg-${c}`, title: `${c.charAt(0).toUpperCase() + c.slice(1)} background`, aliases: [`${c}-bg`, `${c}-background`],
      icon: "Highlighter", category: "Inline", hideFromSlash: true,
      description: c === "default" ? "Reset block background to default" : `Set block background to ${c}`,
      execute(ctx) {
        const text = ctx.text || ctx.block.text || "";
        if (c === "default") {
          ctx.onPatch({ text: text.replace(/@@bg-\w+:/g, "").replace(/@@/g, "") });
        } else {
          ctx.onPatch({ text: `@@bg-${c}:${text}@@` });
        }
      }
    }
  ];
  colorCommands.forEach(registerCommand);
});

// ── Embeds ──────────────────────────────────────────────────────
const embeds = [
  { id: "embed-generic", title: "Embed (generic URL)", aliases: ["embed"],
    icon: "Globe", category: "Embeds",
    description: "Embed any URL",
    preview: "Embed any website by URL",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "google-drive", title: "Google Drive", aliases: ["gdrive", "docs"],
    icon: "FolderOpen", category: "Embeds",
    description: "Embed a Google Drive file",
    preview: "Embed files from Google Drive",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "tweet", title: "Tweet / X", aliases: ["twitter", "x"],
    icon: "ExternalLink", category: "Embeds",
    description: "Embed a tweet",
    preview: "Embed a tweet or X post by URL",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "github-gist", title: "GitHub Gist", aliases: ["gist"],
    icon: "GitFork", category: "Embeds",
    description: "Embed a GitHub Gist",
    preview: "Embed code from a GitHub Gist",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "google-maps", title: "Google Maps", aliases: ["maps", "map-embed"],
    icon: "MapPin", category: "Embeds",
    description: "Embed Google Maps location",
    preview: "Embed a Google Maps location or directions",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "figma", title: "Figma", aliases: ["figma-embed"],
    icon: "Pen", category: "Embeds",
    description: "Embed a Figma design",
    preview: "Embed a Figma design file or prototype",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "loom", title: "Loom", aliases: ["loom-video"],
    icon: "VideoIcon", category: "Embeds",
    description: "Embed a Loom video",
    preview: "Embed a Loom screen recording",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "codepen", title: "CodePen", aliases: ["codepen-embed"],
    icon: "Code", category: "Embeds",
    description: "Embed a CodePen",
    preview: "Embed an interactive CodePen example",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "pdf", title: "PDF", aliases: ["pdf-embed"],
    icon: "FileText", category: "Embeds",
    description: "Embed a PDF viewer",
    preview: "Embed a PDF document — view inline",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "abstract", title: "Abstract", aliases: ["abstract"],
    icon: "FilePlus", category: "Embeds",
    description: "Embed an Abstract design file",
    preview: "Embed a design from Abstract",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "invision", title: "Invision", aliases: ["invision"],
    icon: "Eye", category: "Embeds",
    description: "Embed an Invision prototype",
    preview: "Embed a prototype from Invision",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "mixpanel", title: "Mixpanel", aliases: ["mixpanel"],
    icon: "BarChart3", category: "Embeds",
    description: "Embed a Mixpanel report",
    preview: "Embed analytics from Mixpanel",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "framer", title: "Framer", aliases: ["framer"],
    icon: "Monitor", category: "Embeds",
    description: "Embed a Framer prototype",
    preview: "Embed a prototype from Framer",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "whimsical", title: "Whimsical", aliases: ["whimsical"],
    icon: "Pen", category: "Embeds",
    description: "Embed a Whimsical diagram",
    preview: "Embed a diagram from Whimsical",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "miro", title: "Miro", aliases: ["miro"],
    icon: "Grid3X3", category: "Embeds",
    description: "Embed a Miro board",
    preview: "Embed a whiteboard from Miro",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "sketch", title: "Sketch", aliases: ["sketch"],
    icon: "Pen", category: "Embeds",
    description: "Embed a Sketch design",
    preview: "Embed a design from Sketch",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "excalidraw", title: "Excalidraw", aliases: ["excalidraw"],
    icon: "Pen", category: "Embeds",
    description: "Embed an Excalidraw drawing",
    preview: "Embed a drawing from Excalidraw",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "typeform", title: "Typeform", aliases: ["typeform"],
    icon: "FormInput", category: "Embeds",
    description: "Embed a Typeform survey",
    preview: "Embed a form from Typeform",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "replit", title: "Replit", aliases: ["replit"],
    icon: "Code", category: "Embeds",
    description: "Embed a Replit project",
    preview: "Embed a coding environment from Replit",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "hex", title: "Hex", aliases: ["hex"],
    icon: "Hash", category: "Embeds",
    description: "Embed a Hex notebook",
    preview: "Embed a data notebook from Hex",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "deepnote", title: "Deepnote", aliases: ["deepnote"],
    icon: "Database", category: "Embeds",
    description: "Embed a Deepnote notebook",
    preview: "Embed a notebook from Deepnote",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "trello", title: "Trello", aliases: ["trello"],
    icon: "Layout", category: "Embeds",
    description: "Embed a Trello board",
    preview: "Embed a board from Trello",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "dropbox-paper", title: "Dropbox Paper", aliases: ["dropbox-paper", "dropbox"],
    icon: "FolderOpen", category: "Embeds",
    description: "Embed a Dropbox Paper document",
    preview: "Embed a document from Dropbox Paper",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "evernote", title: "Evernote", aliases: ["evernote"],
    icon: "FileText", category: "Embeds",
    description: "Embed an Evernote note",
    preview: "Embed a note from Evernote",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "workflowy", title: "Workflowy", aliases: ["workflowy"],
    icon: "Workflow", category: "Embeds",
    description: "Embed a Workflowy outline",
    preview: "Embed an outline from Workflowy",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "word", title: "Word", aliases: ["word"],
    icon: "FileText", category: "Embeds",
    description: "Embed a Microsoft Word document",
    preview: "Embed a document from Microsoft Word",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "monday", title: "Monday", aliases: ["monday"],
    icon: "LayoutDashboard", category: "Embeds",
    description: "Embed a Monday.com board",
    preview: "Embed a board from Monday.com",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "quip", title: "Quip", aliases: ["quip"],
    icon: "FileText", category: "Embeds",
    description: "Embed a Quip document",
    preview: "Embed a document from Quip",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
  { id: "zip", title: "ZIP", aliases: ["zip", "archive"],
    icon: "FileArchive", category: "Embeds",
    description: "Embed a ZIP archive",
    preview: "Embed a ZIP file for download",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }
  },
];

// ── Page Actions ────────────────────────────────────────────────
const pageActions = [
  {
    id: "copy-link", title: "Copy link", aliases: [],
    icon: "Link2", category: "Page actions",
    description: "Copy page URL to clipboard",
    shortcut: "Ctrl+L",
    available(ctx) { return !!ctx.page; },
    preview: "Copy this page's link to your clipboard",
    execute(ctx) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      ctx.onToast?.("Link copied");
    }
  },
  {
    id: "copy-contents", title: "Copy page contents", aliases: [],
    icon: "Copy", category: "Page actions",
    description: "Copy all page content as text",
    preview: "Copy the full page text content",
    execute(ctx) {
      const text = (ctx.page?.blocks || []).map((b) => b.text).filter(Boolean).join("\n");
      navigator.clipboard.writeText(text).catch(() => {});
      ctx.onToast?.("Page contents copied");
    }
  },
  {
    id: "duplicate", title: "Duplicate", aliases: ["clone"],
    icon: "CopyPlus", category: "Page actions",
    description: "Duplicate this page",
    shortcut: "Ctrl+D",
    available(ctx) { return !!ctx.onPagePatch; },
    preview: "Create an exact copy of this page",
    execute(ctx) { ctx.onDuplicatePage?.(); }
  },
  {
    id: "move-to", title: "Move to", aliases: ["move"],
    icon: "Move", category: "Page actions",
    description: "Move page to another parent",
    shortcut: "Ctrl+Shift+P",
    preview: "Move this page under a different parent in the sidebar",
    execute(ctx) { if (ctx.onMoveTo) ctx.onMoveTo(); else ctx.onToast?.("Open the page ••• menu to move this page"); }
  },
  {
    id: "trash", title: "Move to Trash", aliases: ["delete", "remove"],
    icon: "Trash2", category: "Page actions",
    description: "Move page to trash (can be restored)",
    preview: "Move to trash — you can restore it later",
    execute(ctx) { ctx.onTrash?.(ctx.page.id); }
  },
  {
    id: "present", title: "Present (Beta)", aliases: ["slideshow"],
    icon: "Presentation", category: "Page actions",
    description: "Present page as slideshow",
    shortcut: "Ctrl+Alt+P",
    preview: "Present this page in full-screen slideshow mode",
    execute(ctx) { if (ctx.onPresent) ctx.onPresent(); else ctx.onPagePatch?.({ presentationMode: true }); }
  },
  {
    id: "offline", title: "Available offline", aliases: [],
    icon: "Wifi", category: "Page actions",
    description: "Make page available offline",
    preview: "Cache this page for offline access",
    toggle: true,
    execute(ctx) { ctx.onPagePatch?.({ offline: !ctx.page?.offline }); }
  },
  {
    id: "small-text", title: "Small text", aliases: ["small"],
    icon: "Type", category: "Page actions",
    description: "Use smaller text size",
    toggle: true,
    preview: "Reduce the font size across the page",
    execute(ctx) { ctx.onPagePatch?.({ smallText: !ctx.page?.smallText }); }
  },
  {
    id: "full-width", title: "Full width", aliases: ["wide"],
    icon: "Maximize2", category: "Page actions",
    description: "Use full page width",
    toggle: true,
    preview: "Expand the page to use the full available width",
    execute(ctx) { ctx.onPagePatch?.({ fullWidth: !ctx.page?.fullWidth }); }
  },
  {
    id: "customize", title: "Customize page", aliases: ["theme"],
    icon: "Palette", category: "Page actions",
    description: "Customize page appearance — background, typography, cover, icon, access",
    preview: "Open the customize panel to change page background, typography, cover image, page icon, lock settings, and more",
    execute(ctx) { ctx.setCustomizeOpen?.(true); }
  },
  {
    id: "lock", title: "Lock page", aliases: ["lock-page"],
    icon: "Lock", category: "Page actions",
    description: "Prevent editing on this page",
    toggle: true,
    preview: "Lock the page to prevent accidental edits",
    execute(ctx) { ctx.onPagePatch?.({ isLocked: !ctx.page?.isLocked }); }
  },
  {
    id: "readonly", title: "Read-only", aliases: ["readonly-mode"],
    icon: "Eye", category: "Page actions",
    description: "Set page to read-only",
    toggle: true,
    preview: "Switch to read-only view — comments only",
    execute(ctx) { ctx.onPagePatch?.({ permission: ctx.page?.permission === 'view' ? 'edit' : 'view' }); }
  },
  {
    id: "suggest", title: "Suggest edits", aliases: ["suggestion"],
    icon: "FileEdit", category: "Page actions",
    description: "Suggest edits mode",
    preview: "Edit in suggestion mode — changes are tracked",
    execute(ctx) { if (ctx.onToggleSuggest) ctx.onToggleSuggest(); else ctx.onToast?.("Open the page ••• menu to toggle suggest edits"); }
  },
  {
    id: "translate", title: "Translate", aliases: ["language"],
    icon: "Languages", category: "Page actions",
    description: "Translate page to another language (coming soon)",
    preview: "Translate this page to another language. Requires a translation service — not yet available.",
    execute(ctx) { ctx.onToast?.("Translation isn't available yet"); }
  },
  {
    id: "import", title: "Import", aliases: ["import-file"],
    icon: "Upload", category: "Page actions",
    description: "Import content from file",
    preview: "Import from Markdown, HTML, CSV, or Notion ZIP",
    execute(ctx) { ctx.onImport?.(); }
  },
  {
    id: "export", title: "Export", aliases: ["download"],
    icon: "FileDown", category: "Page actions",
    description: "Export page content",
    preview: "Export as Markdown, PDF, HTML, or CSV",
    execute(ctx) { ctx.onExport?.(); }
  },
  {
    id: "wiki", title: "Turn into wiki", aliases: ["make-wiki"],
    icon: "Globe", category: "Page actions",
    description: "Convert page to wiki format",
    preview: "Convert to a wiki-style page with auto-linking",
    execute(ctx) { if (ctx.onWiki) ctx.onWiki(); else ctx.onToast?.("Open the page ••• menu to convert to a wiki"); }
  },
  {
    id: "analytics", title: "Updates & analytics", aliases: ["stats", "insights"],
    icon: "BarChart3", category: "Page actions",
    description: "View page analytics",
    preview: "View edit history and page insights",
    execute(ctx) { ctx.onAnalytics?.(); }
  },
  {
    id: "history", title: "Version history", aliases: ["versions", "undo-history"],
    icon: "History", category: "Page actions",
    description: "View and restore version history",
    preview: "Browse previous versions and restore them",
    execute(ctx) { ctx.onHistory?.(); }
  },
];

// ── Export all commands ─────────────────────────────────────────
const ALL_COMMANDS = [
  ...basic, ...media, ...database, ...advanced,
  ...layout, ...inline, ...embeds, ...pageActions
];

export function initRegistry() {
  ALL_COMMANDS.forEach(registerCommand);
}

// Auto-initialize on first import
initRegistry();

// ── Helper: blockForTreeConversion ─────────────────────────────
// `block` stays `any` here — it's `CommandContext.block`, which is `any`
// throughout this whole file (documented at that interface: dozens of
// commands read/write type-specific fields dynamically, same rationale
// as renderBlockEditor.tsx's dispatcher param). But the RETURN value is
// no longer forced broad: now that helpers.ts's `blockFor()` has a real
// per-branch-narrowed return type (Phase 4 Tier 2 sub-loop A), this
// function's return is `Block` — every command call site below spreads
// `blockFor(type, text)`'s real result and only overrides
// id/parentId/content/text, all of which exist on every `Block` member
// via `BaseBlock`.
function blockForTree(block: any, type: string, text: string = block.text || ""): Block {
  const next = blockFor(type, text);
  return {
    ...next,
    id: block.id,
    parentId: block.parentId || null,
    content: block.content || [],
    text
  };
}

function blockForDatabaseView(block: any, viewType: DatabaseViewDefinition["type"], text: string = block.text || "") {
  // blockFor("database", ...) always returns a DatabaseBlock (see
  // helpers.ts's per-branch narrowing) — narrow the broader Block return
  // here since this function specifically only ever calls it with
  // "database".
  const next = blockFor("database", text) as DatabaseBlockData;
  const defaultViews = [...(next.database?.views || [])];
  if (defaultViews.length > 0) defaultViews[0] = { ...defaultViews[0], type: viewType, name: viewType.charAt(0).toUpperCase() + viewType.slice(1) };
  return {
    ...next,
    id: block.id,
    parentId: block.parentId || null,
    content: block.content || [],
    text,
    properties: { ...(next as unknown as { properties?: Record<string, unknown> }).properties, view: viewType },
    database: { ...next.database, view: viewType, views: defaultViews },
  };
}
