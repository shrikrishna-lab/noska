import { blockFor } from "../../utils/helpers";

// ── Command Definition ─────────────────────────────────────────
// Each command: { id, title, aliases, icon, category, description,
//                 shortcut, available(ctx), execute(ctx), preview(ctx) }

// ── Context passed to every command ─────────────────────────────
// { page, pages, block, blocks, onPatch, onAdd, onDelete, onNavigate,
//   onDuplicate, onBlocks, onPagePatch, onTrash, onToast, onAskAI,
//   onCreateSubpage, onSetOpenSlashBlockId, setSlashOpen }

let _commands = new Map();
let _listeners = new Set();

export function registerCommand(cmd) {
  _commands.set(cmd.id, cmd);
  _listeners.forEach((fn) => fn(cmd.id, cmd));
  return cmd;
}

export function getCommand(id) {
  return _commands.get(id);
}

export function getAllCommands() {
  return Array.from(_commands.values());
}

export function getFilteredCommands(query, ctx = {}) {
  const q = (query || "").toLowerCase();
  return getAllCommands()
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
    });
}

export function getCommandsByCategory(category) {
  return getAllCommands().filter((c) => c.category === category);
}

export function onCommandRegister(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
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
    preview: "A simple text block for writing content",
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
    preview: "A collapsible section — hide/show nested blocks",
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
    preview: "An info box — highlight important content",
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
];

// ── Media ───────────────────────────────────────────────────────
const media = [
  {
    id: "image", title: "Image", aliases: ["img", "photo", "picture"],
    icon: "Image", category: "Media",
    description: "Upload or embed an image",
    preview: "Add an image — upload from device or paste a URL",
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
    preview: "Add a code block — choose language for highlighting",
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
    preview: "Add a database table — rows and columns like a spreadsheet",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "table", ctx.text)); }
  },
  {
    id: "board-view", title: "Board view", aliases: ["kanban", "board"],
    icon: "Layout", category: "Database",
    description: "Kanban-style board view",
    preview: "Add a Kanban board — organize by status or category",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "board", ctx.text)); }
  },
  {
    id: "gallery-view", title: "Gallery view", aliases: ["grid", "cards"],
    icon: "ImageIcon", category: "Database",
    description: "Card/image gallery view",
    preview: "Add a gallery — show items as image cards",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "gallery", ctx.text)); }
  },
  {
    id: "list-view", title: "List view", aliases: ["simple-list"],
    icon: "List", category: "Database",
    description: "Simple list view",
    preview: "Add a list view — compact text rows",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "list", ctx.text)); }
  },
  {
    id: "calendar-view", title: "Calendar view", aliases: ["calendar", "schedule"],
    icon: "Calendar", category: "Database",
    description: "Calendar/date-based view",
    preview: "Add a calendar — view items by date",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "calendar", ctx.text)); }
  },
  {
    id: "timeline-view", title: "Timeline view", aliases: ["gantt", "roadmap"],
    icon: "Clock", category: "Database",
    description: "Timeline/Gantt chart view",
    preview: "Add a timeline — visualize project schedules",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "timeline", ctx.text)); }
  },
  {
    id: "dashboard-view", title: "Dashboard view", aliases: ["dashboard"],
    icon: "LayoutDashboard", category: "Database",
    description: "Dashboard with widgets",
    preview: "Add a dashboard — combine multiple views",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "dashboard", ctx.text)); }
  },
  {
    id: "map-view", title: "Map view", aliases: ["map", "geography"],
    icon: "MapPin", category: "Database",
    description: "Geographic map view",
    preview: "Add a map — pin items by location",
    execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "map", ctx.text)); }
  },
  {
    id: "form", title: "Form", aliases: ["survey"],
    icon: "FormInput", category: "Database",
    description: "Fillable form",
    preview: "Add a form — collect structured data",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "form", ctx.text)); }
  },
  {
    id: "database-inline", title: "Database – Inline", aliases: ["db-inline"],
    icon: "Database", category: "Database",
    description: "Inline database in the page",
    preview: "Add an inline database — all views available",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "database-inline", ctx.text)); }
  },
  {
    id: "database-full", title: "Database – Full page", aliases: ["db-full"],
    icon: "Database", category: "Database",
    description: "Full-page database",
    preview: "Add a full-page database — opens as its own page",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "database-full", ctx.text)); }
  },
];

// ── Advanced Blocks ─────────────────────────────────────────────
const advanced = [
  {
    id: "table-of-contents", title: "Table of contents", aliases: ["toc"],
    icon: "BookOpen", category: "Advanced blocks",
    description: "Auto-generated table of contents from headings",
    preview: "Auto-generates a table of contents from all headings on the page",
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
    preview: "Add breadcrumbs — shows the page path from the root",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "breadcrumb", ctx.text)); }
  },
  {
    id: "tabs", title: "Tabs", aliases: ["tab-container"],
    icon: "Layout", category: "Advanced blocks",
    description: "Tabbed container for organizing content",
    preview: "Add tabs — organize content in tabbed sections",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "tabs", ctx.text)); }
  },
  {
    id: "synced-block", title: "Synced block", aliases: ["sync", "reference"],
    icon: "Copy", category: "Advanced blocks",
    description: "Content that syncs across all instances",
    preview: "Add a synced block — editing one updates all copies",
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
    preview: "Render diagrams from Mermaid syntax — flowcharts, sequence diagrams, etc.",
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
    id: "2-columns", title: "2 columns", aliases: ["cols2", "split"],
    icon: "Columns2", category: "Layout",
    description: "Two-column layout",
    preview: "Split into two equal columns — drag blocks between them",
    execute(ctx) { ctx.onDelete(); ctx.onAdd("2-columns", ""); }
  },
  {
    id: "3-columns", title: "3 columns", aliases: ["cols3"],
    icon: "Columns3", category: "Layout",
    description: "Three-column layout",
    preview: "Split into three columns",
    execute(ctx) { ctx.onDelete(); ctx.onAdd("3-columns", ""); }
  },
  {
    id: "4-columns", title: "4 columns", aliases: ["cols4"],
    icon: "Columns3", category: "Layout",
    description: "Four-column layout",
    preview: "Split into four columns",
    execute(ctx) { ctx.onDelete(); ctx.onAdd("4-columns", ""); }
  },
  {
    id: "5-columns", title: "5 columns", aliases: ["cols5"],
    icon: "Columns3", category: "Layout",
    description: "Five-column layout",
    preview: "Split into five columns",
    execute(ctx) { ctx.onDelete(); ctx.onAdd("5-columns", ""); }
  },
];

// ── Inline ──────────────────────────────────────────────────────
const inline = [
  {
    id: "mention-page", title: "Mention a page", aliases: ["@page", "[[", "link"],
    icon: "FileText", category: "Inline",
    description: "Search and link to another page",
    preview: "Mention another page — search by title, click to open",
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
    preview: "Add a date with reminder — pick a date, set notification",
    execute(ctx) { ctx.onPatch({ ...ctx.block, text: ctx.block.text || "/" }); }
  },
  {
    id: "emoji", title: "Emoji", aliases: ["smiley", "icon"],
    icon: "Smile", category: "Inline",
    description: "Insert an emoji",
    preview: "Pick an emoji — search by keyword",
    execute(ctx) { ctx.onPatch({ ...ctx.block, text: ctx.block.text || "/" }); }
  },
  {
    id: "bold", title: "Bold", aliases: ["bold", "strong"],
    icon: "Bold", category: "Inline",
    description: "Bold (Ctrl+B)",
    preview: "Wrap selected text in **bold** markers",
    execute(ctx) { ctx.onPatch({ text: `**${ctx.block.text || ctx.text}**` }); }
  },
  {
    id: "italic", title: "Italic", aliases: ["italic", "em"],
    icon: "Italic", category: "Inline",
    description: "Italic (Ctrl+I)",
    preview: "Wrap selected text in *italic* markers",
    execute(ctx) { ctx.onPatch({ text: `*${ctx.block.text || ctx.text}*` }); }
  },
  {
    id: "underline", title: "Underline", aliases: ["underline", "u"],
    icon: "Underline", category: "Inline",
    description: "Underline (Ctrl+U)",
    preview: "Wrap selected text in <u>underline</u> markers",
    execute(ctx) { ctx.onPatch({ text: `<u>${ctx.block.text || ctx.text}</u>` }); }
  },
  {
    id: "strikethrough", title: "Strikethrough", aliases: ["strikethrough", "strike"],
    icon: "Type", category: "Inline",
    description: "Strikethrough (Ctrl+Shift+S)",
    preview: "Wrap selected text in ~~strikethrough~~ markers",
    execute(ctx) { ctx.onPatch({ text: `~~${ctx.block.text || ctx.text}~~` }); }
  },
  {
    id: "inline-code", title: "Inline code", aliases: ["code", "monospace"],
    icon: "Code", category: "Inline",
    description: "Inline code (Ctrl+`)",
    preview: "Wrap selected text in `code` markers",
    execute(ctx) { ctx.onPatch({ text: `\`${ctx.block.text || ctx.text}\`` }); }
  },
  {
    id: "inline-equation", title: "Inline equation", aliases: ["math", "latex", "katex"],
    icon: "Edit3", category: "Inline",
    description: "KaTeX inline equation",
    preview: "Add a math equation — rendered with KaTeX",
    execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "inline-equation", ctx.text)); }
  },
];

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
    execute(ctx) { ctx.onPagePatch?.({}); }
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
    execute(ctx) { ctx.onPagePatch?.({ presentationMode: true }); }
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
    description: "Customize page appearance",
    preview: "Change the page icon, cover, and font",
    execute(ctx) { ctx.onPagePatch?.({}); }
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
    execute(ctx) { ctx.onToast?.("Suggest edits mode toggled"); }
  },
  {
    id: "translate", title: "Translate", aliases: ["language"],
    icon: "Languages", category: "Page actions",
    description: "Translate page to another language",
    preview: "Translate this page to a different language",
    execute(ctx) { ctx.onToast?.("Translation panel opened"); }
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
    execute(ctx) { ctx.onToast?.("Wiki mode toggled"); }
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
function blockForTree(block, type, text = block.text || "") {
  const next = blockFor(type, text);
  return {
    ...next,
    id: block.id,
    parentId: block.parentId || null,
    content: block.content || [],
    text
  };
}

function blockForDatabaseView(block, viewType, text = block.text || "") {
  const next = blockFor("database", text);
  return {
    ...next,
    id: block.id,
    parentId: block.parentId || null,
    content: block.content || [],
    text,
    properties: { ...next.properties, view: viewType },
  };
}
