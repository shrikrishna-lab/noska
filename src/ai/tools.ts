import { uid, textToBlocks, now, plainText, blockFor, makeEmptyDatabase } from '../utils/helpers';
import type { Block } from '../../types/blocks';
import { setMemory, getMemory, type MemoryEntry } from './memory.js';
import { saveUserPreference, saveUserFact } from './userProfile.js';
import { getBacklinks, getOutgoingLinks } from '../utils/pageLinks';
import * as StudyCardsNS from '../features/study/studyCards';
import type { GeneratedCard } from '../features/study/studyCards';
import {
  refreshIntegrationTools,
  getIntegrationToolDefinitions,
  getIntegrationTool,
  getIntegrationSummary,
  executeIntegrationTool,
  validateIntegrationToolParams,
} from './integrationTools';
import { resolveViewTarget, VIEW_TARGETS } from '../lib/viewTargets';
import { categoryForTool } from './runtime/permissions';

const TOOL_SOURCE = '<<TOOL:(\\w+)>>([\\s\\S]*?)<</TOOL>>';
const TOOL_PATTERN = new RegExp(TOOL_SOURCE, 'g');

const DEFINITIONS = [
  {
    name: "create_page",
    description: "Create a new page in the workspace",
    params: {
      title: { type: "string", desc: "Page title", required: true },
      icon: { type: "string", desc: "Emoji icon (e.g. 📝, 🚀, 💡)", required: false },
      content: { type: "string", desc: "Markdown content for the page", required: false },
      tags: { type: "string", desc: "Comma-separated tags", required: false }
    }
  },
  {
    name: "rename_page",
    description: "Rename the current page or a specified page",
    params: {
      title: { type: "string", desc: "New page title", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "append_blocks",
    description: "Append blocks to a page using markdown. Supports headings, bullets, todos, quotes, text.",
    params: {
      content: { type: "string", desc: "Markdown content to append", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "add_todo",
    description: "Add a todo/task item to a page",
    params: {
      text: { type: "string", desc: "Todo text", required: true },
      page_id: { type: "string", desc: "Page ID (defaults to current page)", required: false }
    }
  },
  {
    name: "search_pages",
    description: "Search pages by title, tags, or content keywords",
    params: {
      query: { type: "string", desc: "Search query", required: true }
    }
  },
  {
    name: "get_page_content",
    description: "Get the full content of a page by ID or title keyword",
    params: {
      page_id: { type: "string", desc: "Page ID", required: false },
      title: { type: "string", desc: "Partial title to search by", required: false }
    }
  },
  {
    name: "list_pages",
    description: "List all non-trashed pages with their IDs, titles, and icons",
    params: {}
  },
  {
    name: "set_page_tags",
    description: "Set tags on the current page or a specified page",
    params: {
      tags: { type: "string", desc: "Comma-separated tags", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "replace_content",
    description: "Replace the entire content of a page with new markdown content",
    params: {
      content: { type: "string", desc: "Markdown content to replace with", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "insert_block",
    description: "Insert a block at a specific position in the page. Use 0 for beginning, -1 for end.",
    params: {
      text: { type: "string", desc: "Block text content", required: true },
      type: { type: "string", desc: "Block type: text, h1, h2, h3, bullet, number, todo, quote", required: false },
      index: { type: "number", desc: "Position to insert (0 = start, -1 = end)", required: false },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "delete_blocks",
    description: "Delete one or more blocks from a page by their text content or indices",
    params: {
      indices: { type: "string", desc: "Comma-separated block indices to delete (e.g. '0,2,4')", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "update_block",
    description: "Update the text of a specific block by its index",
    params: {
      index: { type: "number", desc: "Block index to update", required: true },
      text: { type: "string", desc: "New text content", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "undo_action",
    description: "Undo the last AI action on the current page",
    params: {}
  },
  {
    name: "get_page_hierarchy",
    description: "Get the parent, children, and backlinks of the current or specified page",
    params: {
      page_id: { type: "string", desc: "Page ID (defaults to current page)", required: false }
    }
  },
  {
    name: "get_workspace_stats",
    description: "Get workspace statistics: page count, favorites count, all tags with counts",
    params: {}
  },
  {
    name: "favorite_page",
    description: "Toggle favorite status on a page for quick access",
    params: {
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false },
      favorite: { type: "boolean", desc: "true to favorite, false to unfavorite", required: false }
    }
  },
  {
    name: "trash_page",
    description: "Move a page to trash",
    params: {
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "restore_page",
    description: "Restore a trashed page back to the workspace",
    params: {
      page_id: { type: "string", desc: "Page ID or title", required: true }
    }
  },
  {
    name: "duplicate_page",
    description: "Create a copy of a page with all its content and tags",
    params: {
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false },
      title: { type: "string", desc: "Title for the duplicate (defaults to 'Copy of ...')", required: false }
    }
  },
  {
    name: "list_trashed_pages",
    description: "List all pages currently in trash",
    params: {}
  },
  {
    name: "batch_tag",
    description: "Add or remove tags on multiple pages at once",
    params: {
      tags: { type: "string", desc: "Comma-separated tags to apply", required: true },
      page_ids: { type: "string", desc: "Comma-separated page IDs or title keywords", required: true },
      mode: { type: "string", desc: "'add' to add tags, 'remove' to remove, 'set' to replace all", required: false }
    }
  },
  {
    name: "get_page_lineage",
    description: "Get the edit history and change log for a page",
    params: {
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "create_page_from_template",
    description: "Create a page using a structured template with predefined sections",
    params: {
      title: { type: "string", desc: "Page title", required: true },
      icon: { type: "string", desc: "Emoji icon", required: false },
      template: { type: "string", desc: "Template type: meeting, project, weekly, habit, notes, journal", required: true },
      tags: { type: "string", desc: "Comma-separated tags", required: false }
    }
  },
  {
    name: "remember_preference",
    description: "Save something you learned about the user (their style, likes, dislikes, preferences, habits)",
    params: {
      key: { type: "string", desc: "Label for this info (e.g. 'writing_style', 'likes', 'dislikes')", required: true },
      value: { type: "string", desc: "What you learned about the user", required: true }
    }
  },
  {
    name: "get_user_profile",
    description: "Retrieve everything the AI knows about the user's preferences, style, and history",
    params: {}
  },
  {
    name: "set_page_icon",
    description: "Set the emoji icon for a page",
    params: {
      icon: { type: "string", desc: "Emoji icon (e.g. 🚀, 💡, 📝, 🌟, 🎨)", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "set_page_cover",
    description: "Set the cover gradient/color for a page",
    params: {
      cover: { type: "string", desc: "Cover identifier or gradient", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "move_page",
    description: "Move a page under a different parent to organize hierarchy",
    params: {
      page_id: { type: "string", desc: "Page ID or title to move", required: false },
      parent_id: { type: "string", desc: "Target parent page ID or title (null for root)", required: false }
    }
  },
  {
    name: "capabilities",
    description: "List all available capabilities with connection status: ✓ connected, ⚠ partial, ✕ unavailable",
    params: {}
  },
  {
    name: "analyze_page",
    description: "Analyze a page for quality, completeness, structure, and suggest improvements. Use this before making editing suggestions.",
    params: {
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "send_notification",
    description: "Send an in-app notification to the current user (appears in their notifications inbox).",
    params: {
      title: { type: "string", desc: "Short notification title", required: true },
      message: { type: "string", desc: "Notification body text", required: true },
      action_url: { type: "string", desc: "Optional in-app link, e.g. a page path", required: false }
    }
  },
  {
    name: "create_flashcards",
    description: "Create real spaced-repetition study cards on a page. Each card is reviewable in Noska's Spaced Repetition view. ALWAYS use this instead of writing Q/A text manually.",
    params: {
      page_id: { type: "string", desc: "Page ID or title to attach cards to (required)", required: true },
      cards: { type: "string", desc: "JSON array of cards: [{\"front\":\"question\",\"answer\":\"answer\"}]", required: true },
      heading: { type: "string", desc: "Section heading (default 'Study Cards')", required: false }
    }
  },
  {
    name: "open_view",
    description: "Navigate the user to an app view. Use whenever the user asks to open, show, or go to a section of the app (e.g. 'open my inbox').",
    params: {
      view: { type: "string", desc: "View name: inbox, calendar, home, tasks, chats, meetings, meeting notes, library, shared, daily/journal, trash, graph, canvas, command center, agents, automations, marketplace, creator, company, settings", required: true }
    }
  },
  {
    name: "open_page",
    description: "Open an existing page in the editor by ID or title keyword. Use when the user asks to open a specific page/note.",
    params: {
      page_id: { type: "string", desc: "Page ID or title keyword", required: true }
    }
  },
  {
    name: "create_reminder",
    description: "Create a reminder in the user's Inbox. Use for 'remind me to…' requests. Compute the due date from the current date/time given in your context when the user says things like 'tomorrow at 9'.",
    params: {
      text: { type: "string", desc: "What to remind the user about", required: true },
      date: { type: "string", desc: "Due date as ISO 8601 (e.g. 2026-09-15T09:00:00) or empty for no due date", required: false },
      priority: { type: "string", desc: "'high', 'medium', or 'low' (default medium)", required: false }
    }
  },
  {
    name: "daily_briefing",
    description: "Gather a workspace briefing: page counts, open todos, recently edited pages, and pending Inbox reminders. Use for 'catch me up' / 'brief me' requests.",
    params: {}
  },
  {
    name: "web_search",
    description: "Search the public web for current information. Use when the answer needs facts beyond the workspace (news, docs, prices, recent events). Requires the user's web-search key to be configured.",
    params: {
      query: { type: "string", desc: "Search query", required: true },
      max_results: { type: "number", desc: "Number of results 1-10 (default 5)", required: false }
    }
  },
  {
    name: "ask_user",
    description: "Ask the user a clarifying question mid-task and pause for their answer. Use ONLY when genuinely ambiguous (e.g. two pages match a name) — never for trivial choices.",
    params: {
      question: { type: "string", desc: "The question to ask the user", required: true }
    }
  },
  {
    name: "call_subagent",
    description: "Delegate a subtask to a specialist subagent (e.g. 'researcher', 'coder', 'writer', 'analyst', 'organizer') to execute focused work, gather data, write code, or perform analysis, and return the synthesized result.",
    params: {
      agent: { type: "string", desc: "Specialist subagent: 'researcher', 'coder', 'writer', 'analyst', 'organizer'", required: true },
      task: { type: "string", desc: "Specific subtask or objective to delegate to this subagent", required: true },
      context: { type: "string", desc: "Optional focused context or data for the subagent", required: false }
    }
  },
  {
    name: "create_subagent",
    description: "Create and register a new specialized workspace subagent with custom instructions and persona.",
    params: {
      name: { type: "string", desc: "Name of the new subagent (e.g. 'SEO Specialist', 'Database Architect')", required: true },
      description: { type: "string", desc: "Role and capabilities description", required: true },
      instructions: { type: "string", desc: "System prompt instructions for this subagent", required: true },
      icon: { type: "string", desc: "Emoji icon for the subagent", required: false }
    }
  },
  {
    name: "execute_slash_command",
    description: "Execute any Noska / slash command (/h1, /h2, /h3, /todo, /bullet, /number, /toggle, /callout, /quote, /table, /divider, /code, /mermaid, /tabs, /database, /columns, /image, /video, /audio, /file, /bookmark, /chart, /interactive) to insert a rich block into a page.",
    params: {
      command: { type: "string", desc: "Slash command or block type (e.g. 'h1', 'todo', 'callout', 'code', 'table', 'mermaid', 'tabs', 'columns', 'chart', 'database', 'quote', 'divider', 'toggle', 'image', 'video')", required: true },
      text: { type: "string", desc: "Content, label, or URL for the block", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false },
      index: { type: "number", desc: "Position in page (0 = beginning, -1 = end)", required: false }
    }
  },
  {
    name: "image_generate",
    description: "Generate an image with the user's currently selected image-capable model and insert the durable result into a page.",
    params: {
      prompt: { type: "string", desc: "Detailed image prompt", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false },
      size: { type: "string", desc: "Optional image size such as 1024x1024", required: false },
      quality: { type: "string", desc: "Optional provider quality setting", required: false },
      caption: { type: "string", desc: "Optional caption for the inserted image", required: false }
    }
  },
  {
    name: "create_database",
    description: "Create an interactive database view on a page (table, board, gallery, list, calendar, timeline) with columns and initial records.",
    params: {
      title: { type: "string", desc: "Database title (e.g. 'Projects', 'Roadmap', 'Sprint Tasks')", required: true },
      view: { type: "string", desc: "View type: 'table', 'board', 'gallery', 'list', 'calendar', 'timeline'", required: false },
      columns: { type: "string", desc: "Comma-separated column headers (e.g. 'Task, Status, Priority, Due Date')", required: false },
      rows: { type: "string", desc: "JSON array of row objects or pipe-separated lines", required: false },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "create_chart",
    description: "Create a visual data chart (bar, line, donut, number, or mermaid diagram) on a page.",
    params: {
      chart_type: { type: "string", desc: "Chart type: 'bar-chart-v', 'bar-chart-h', 'line-chart', 'donut-chart', 'number-chart', or 'mermaid'", required: true },
      title: { type: "string", desc: "Chart title or caption", required: true },
      data: { type: "string", desc: "Chart data (JSON format or Mermaid syntax for diagrams)", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "create_columns",
    description: "Create a responsive multi-column layout (2, 3, 4, or 5 columns) with separate content per column.",
    params: {
      count: { type: "number", desc: "Number of columns (2, 3, 4, or 5)", required: true },
      columns_content: { type: "string", desc: "JSON array of text content per column (e.g. [\"Left col text\", \"Right col text\"])", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "create_tabs",
    description: "Create a multi-tabbed block container on a page with organized tab titles and tab body content.",
    params: {
      tabs: { type: "string", desc: "JSON array of tab objects: [{\"label\": \"Tab 1\", \"content\": \"...\"}, {\"label\": \"Tab 2\", \"content\": \"...\"}]", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "create_interactive",
    description: "Create a sandboxed interactive HTML/JS/CSS widget (calculator, timer, progress tracker, game, form). ONLY use when the content genuinely requires an interactive app — for plain written content prefer append_blocks / create_database / create_chart / create_columns / create_tabs.",
    params: {
      title: { type: "string", desc: "Widget title or purpose", required: true },
      code: { type: "string", desc: "Self-contained HTML/JS/CSS code or template content", required: true },
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false }
    }
  },
  {
    name: "export_page",
    description: "Export the full contents of a workspace page to formatted Markdown, HTML, or plain text.",
    params: {
      page_id: { type: "string", desc: "Page ID or title (defaults to current page)", required: false },
      format: { type: "string", desc: "Export format: 'markdown', 'html', or 'text'", required: false }
    }
  },
  {
    name: "list_agents",
    description: "List all persistent workspace agents with their status, schedule/triggers, permissions, and configuration.",
    params: {
      status: { type: "string", desc: "Filter by status: 'active', 'paused', or 'all' (default 'all')", required: false }
    }
  },
  {
    name: "manage_agent",
    description: "Create, configure, update, activate, pause, or delete a persistent workspace agent. Fully real data stored in Supabase/workspace store.",
    params: {
      action: { type: "string", desc: "Action to perform: 'create', 'update', 'delete', 'get', 'pause', 'activate'", required: true },
      id: { type: "string", desc: "Agent ID (required for update, delete, get, pause, activate)", required: false },
      name: { type: "string", desc: "Agent name (required for create)", required: false },
      description: { type: "string", desc: "Agent description / role", required: false },
      instructions: { type: "string", desc: "System prompt instructions for this agent", required: false },
      icon: { type: "string", desc: "Emoji icon (e.g. 🤖, 🕵️, 📈)", required: false },
      trigger: { type: "string", desc: "Trigger JSON or type: 'manual', 'schedule', 'daily', 'hourly', 'page_created', 'page_updated', 'task_completed'", required: false },
      model_class: { type: "string", desc: "Model class: 'fast', 'default', or 'reasoning'", required: false },
      permissions: { type: "string", desc: "JSON object overriding permission levels for read, create, update, delete, memory, agents, automations", required: false },
      memory_mode: { type: "string", desc: "Memory mode: 'off', 'run', or 'persistent'", required: false },
      max_runs_per_hour: { type: "number", desc: "Rate limit per hour (default 12)", required: false }
    }
  },
  {
    name: "list_automations",
    description: "List all workspace automations and scheduled workflows with their triggers, conditions, step counts, health, and run statistics.",
    params: {
      status: { type: "string", desc: "Filter by status: 'active', 'paused', or 'all' (default 'all')", required: false }
    }
  },
  {
    name: "manage_automation",
    description: "Create, update, toggle, delete, inspect, or test trigger a workspace automation workflow. Stored with 100% real persistent data.",
    params: {
      action: { type: "string", desc: "Action to perform: 'create', 'update', 'delete', 'get', 'pause', 'activate', 'trigger'", required: true },
      id: { type: "string", desc: "Automation ID (required for update, delete, get, pause, activate, trigger)", required: false },
      name: { type: "string", desc: "Automation name (required for create)", required: false },
      description: { type: "string", desc: "Automation description", required: false },
      icon: { type: "string", desc: "Emoji icon (e.g. ⚡, 🔄, ⏰)", required: false },
      trigger: { type: "string", desc: "Trigger JSON or type: 'manual', 'schedule', 'daily', 'hourly', 'page_created', 'page_updated', 'task_completed'", required: false },
      steps: { type: "string", desc: "JSON array of steps: [{\"label\": \"Step 1\", \"kind\": \"ai_step\", \"instruction\": \"...\"}] or tool steps", required: false },
      timezone: { type: "string", desc: "Timezone identifier (e.g. 'America/New_York', 'UTC')", required: false }
    }
  },
  {
    name: "monitor_runs",
    description: "Monitor, inspect, and query execution history of agents, automations, and copilot runs in the workspace (durations, statuses, step logs, affected resources).",
    params: {
      source_id: { type: "string", desc: "Filter by agent or automation ID", required: false },
      source_kind: { type: "string", desc: "Filter by kind: 'agent', 'automation', or 'copilot'", required: false },
      status: { type: "string", desc: "Filter by status: 'completed', 'failed', 'running', 'queued', 'paused'", required: false },
      limit: { type: "number", desc: "Max runs to return (default 20, max 100)", required: false }
    }
  }
];

function validateParams(name, params) {
  const integ = getIntegrationTool(name);
  if (integ) {
    validateIntegrationToolParams(name, params);
    return;
  }
  const def = DEFINITIONS.find(d => d.name === name);
  if (!def) throw new Error(`Unknown tool: "${name}"`);
  for (const [key, spec] of Object.entries(def.params)) {
    if (spec.required && (params[key] === undefined || params[key] === null || params[key] === '')) {
      throw new Error(`Missing required parameter "${key}" for tool "${name}"`);
    }
  }
}

export const AVAILABLE_TOOLS_TAXONOMY = [
  {
    category: "📄 Workspace & Pages",
    items: [
      { name: "Page management", description: "Create, rename, edit, organize pages", tools: ["create_page", "rename_page", "move_page"] },
      { name: "Page templates", description: "Meeting, project, weekly, habit, notes, and journal", tools: ["create_page_from_template"] },
      { name: "Content editing", description: "Add or replace Markdown blocks, headings, lists, tasks, callouts, and code", tools: ["append_blocks", "replace_content", "insert_block", "delete_blocks", "update_block", "add_todo"] },
      { name: "Slash commands", description: "Execute any native / slash command (/h1, /todo, /callout, /quote, /table, /code, /mermaid, /tabs, /columns, /database, /chart, /interactive, etc.)", tools: ["execute_slash_command"] },
      { name: "Database views", description: "Create interactive tables, boards, galleries, lists, calendars, and timelines with columns and records", tools: ["create_database"] },
      { name: "Charts & Visualizations", description: "Insert bar, line, donut, number charts, and Mermaid diagrams", tools: ["create_chart"] },
      { name: "Layouts & Containers", description: "Insert responsive 2-5 column layouts and multi-tabbed containers", tools: ["create_columns", "create_tabs"] },
      { name: "Interactive widgets", description: "Embed sandboxed interactive HTML/JS widgets (calculators, forms, timers) — only when the request genuinely needs an interactive app", tools: ["create_interactive"] },
      { name: "Image generation", description: "Generate an image with the selected image-capable model and insert it into a page", tools: ["image_generate"] },
      { name: "Page discovery", description: "Search, list, open, and inspect pages", tools: ["search_pages", "list_pages", "get_page_content", "open_page"] },
      { name: "Hierarchy", description: "Create parent/child relationships and view backlinks", tools: ["get_page_hierarchy", "move_page"] },
      { name: "Organization", description: "Add, remove, and replace tags; manage favorites", tools: ["set_page_tags", "batch_tag", "favorite_page", "get_workspace_stats"] },
      { name: "Page actions", description: "Duplicate, trash, restore, view edit history, and export pages", tools: ["duplicate_page", "trash_page", "restore_page", "list_trashed_pages", "get_page_lineage", "export_page", "undo_action"] },
      { name: "Page analysis", description: "Assess structure, completeness, quality, and improvements", tools: ["analyze_page"] },
      { name: "Page styling", description: "Set emoji icons and cover colors", tools: ["set_page_icon", "set_page_cover"] },
      { name: "Study cards", description: "Create flashcards for spaced repetition", tools: ["create_flashcards"] },
      { name: "Inbox reminders", description: "Schedule reminders and priorities", tools: ["create_reminder"] },
    ],
  },
  {
    category: "👁️ Navigation",
    items: [
      { name: "Open app views", description: "Open app views such as Home, Tasks, Inbox, Calendar, Library, Meetings, Chats, Journal, Graph, Canvas, Agents, Automations, Marketplace, Settings, and more", tools: ["open_view"] },
      { name: "Open workspace page", description: "Open a specific workspace page", tools: ["open_page"] },
    ],
  },
  {
    category: "🤖 AI & Agents",
    items: [
      { name: "Delegation", description: "Assign focused work to specialist subagents", tools: ["call_subagent"] },
      { name: "Custom subagents", description: "Create specialist agents with custom roles and instructions", tools: ["create_subagent"] },
      { name: "Agent management", description: "List, create, configure, schedule, pause, and manage persistent agents", tools: ["list_agents", "manage_agent"] },
      { name: "Automations & Workflows", description: "List, create, schedule, toggle, and trigger automation workflows", tools: ["list_automations", "manage_automation"] },
      { name: "Execution Monitoring", description: "Monitor execution runs, logs, durations, and health across agents and automations", tools: ["monitor_runs"] },
      { name: "Daily briefing", description: "Summarize recent activity, open tasks, and reminders", tools: ["daily_briefing"] },
      { name: "Personalization", description: "Save and retrieve writing preferences and learned habits", tools: ["remember_preference", "get_user_profile"] },
      { name: "Notifications", description: "Send an in-app notification", tools: ["send_notification"] },
    ],
  },
  {
    category: "🌐 Integrations & Information",
    items: [
      { name: "Web search", description: "Available only after configuring a supported web-search key", tools: ["web_search"] },
      { name: "Capabilities check", description: "Display connected, partial, and unavailable tools", tools: ["capabilities"] },
    ],
  },
];

export const CURRENTLY_UNAVAILABLE = [
  "Direct file generation",
  "File uploads",
  "Email and calendar access",
  "External integrations such as Slack, GitHub, Gmail, and Notion",
  "Full real-time collaboration",
  "Complete audit trails",
];

export function getAvailableToolsMarkdown(): string {
  return [
    "## 🛠️ Available Tools",
    "",
    "### 📄 Workspace & Pages",
    "- **Page management**: Create, rename, edit, organize pages",
    "- **Page templates**: Meeting, project, weekly, habit, notes, and journal",
    "- **Content editing**: Add or replace Markdown blocks, headings, lists, tasks, callouts, and code",
    "- **Slash commands**: Execute any native / slash command (/h1, /todo, /callout, /quote, /table, /code, /mermaid, /tabs, /columns, /database, /chart, etc.)",
    "- **Database views**: Create interactive tables, boards, galleries, lists, calendars, and timelines",
    "- **Charts & Visualizations**: Insert bar, line, donut, number charts, and Mermaid diagrams",
    "- **Layouts & Containers**: Insert responsive 2-5 column layouts and multi-tabbed containers",
    "- **Interactive widgets**: Embed sandboxed interactive HTML/JS blocks",
    "- **Image generation**: Generate and insert images when the selected model supports image output",
    "- **Page discovery**: Search, list, open, and inspect pages",
    "- **Hierarchy**: Create parent/child relationships and view backlinks",
    "- **Organization**: Add, remove, and replace tags; manage favorites",
    "- **Page actions**: Duplicate, trash, restore, view edit history, and export pages",
    "- **Page analysis**: Assess structure, completeness, quality, and improvements",
    "- **Page styling**: Set emoji icons and cover colors",
    "- **Study cards**: Create flashcards for spaced repetition",
    "- **Inbox reminders**: Schedule reminders and priorities",
    "",
    "### 👁️ Navigation",
    "- Open app views such as Home, Tasks, Inbox, Calendar, Library, Meetings, Chats, Journal, Graph, Canvas, Agents, Automations, Marketplace, Settings, and more",
    "- Open a specific workspace page",
    "",
    "### 🤖 AI & Agents",
    "- **Delegation**: Assign focused work to specialist subagents",
    "- **Custom subagents**: Create specialist agents with custom roles and instructions",
    "- **Agent management**: List, create, configure, schedule, pause, and manage persistent agents",
    "- **Automations & Workflows**: List, create, schedule, toggle, and trigger automation workflows",
    "- **Execution Monitoring**: Monitor execution runs, logs, durations, and health across agents and automations",
    "- **Daily briefing**: Summarize recent activity, open tasks, and reminders",
    "- **Personalization**: Save and retrieve writing preferences and learned habits",
    "- **Notifications**: Send an in-app notification",
    "",
    "### 🌐 Integrations & Information",
    "- **Web search**: Available only after configuring a supported web-search key",
    "- **Capabilities check**: Display connected, partial, and unavailable tools",
    "",
    "### ⚠️ Currently Unavailable",
    "- Direct file generation",
    "- File uploads",
    "- Email and calendar access",
    "- External integrations such as Slack, GitHub, Gmail, and Notion",
    "- Full real-time collaboration",
    "- Complete audit trails",
  ].join("\n");
}

export function getToolInstructions(options: { compact?: boolean; imageGeneration?: boolean } = {}) {
  const imageGenerationAvailable = options.imageGeneration !== false;
  const lines = [
    "---",
    "## 🛠️ Available Tools",
    "You have tools to modify and navigate the workspace. ALWAYS use them instead of describing actions.",
    "",
    "### 📄 Workspace & Pages",
    "- **Page management**: Create, rename, edit, organize pages (`create_page`, `rename_page`, `move_page`)",
    "- **Page templates**: Meeting, project, weekly, habit, notes, and journal (`create_page_from_template`)",
    "- **Content editing**: Add or replace Markdown blocks, headings, lists, tasks, callouts, and code (`append_blocks`, `replace_content`, `insert_block`, `delete_blocks`, `update_block`, `add_todo`)",
    "- **Slash commands**: Execute any native / slash command (/h1, /todo, /callout, /quote, /table, /code, /mermaid, /tabs, /columns, /database, /chart, etc.) (`execute_slash_command`)",
    "- **Database views**: Create interactive tables, boards, galleries, lists, calendars, and timelines (`create_database`)",
    "- **Charts & Visualizations**: Insert bar, line, donut, number charts, and Mermaid diagrams (`create_chart`)",
    "- **Layouts & Containers**: Insert responsive 2-5 column layouts and multi-tabbed containers (`create_columns`, `create_tabs`)",
    "- **Interactive widgets**: Embed sandboxed interactive HTML/JS blocks — reserved for genuinely interactive apps/widgets, not regular content (`create_interactive`)",
    ...(imageGenerationAvailable ? ["- **Image generation**: Generate an image with the selected image-capable model and insert it into a page (`image_generate`)"] : []),
    "- **Page discovery**: Search, list, open, and inspect pages (`search_pages`, `list_pages`, `get_page_content`, `open_page`)",
    "- **Hierarchy**: Create parent/child relationships and view backlinks (`get_page_hierarchy`, `move_page`)",
    "- **Organization**: Add, remove, and replace tags; manage favorites (`set_page_tags`, `batch_tag`, `favorite_page`, `get_workspace_stats`)",
    "- **Page actions**: Duplicate, trash, restore, view edit history, and export pages (`duplicate_page`, `trash_page`, `restore_page`, `list_trashed_pages`, `get_page_lineage`, `export_page`, `undo_action`)",
    "- **Page analysis**: Assess structure, completeness, quality, and improvements (`analyze_page`)",
    "- **Page styling**: Set emoji icons and cover colors (`set_page_icon`, `set_page_cover`)",
    "- **Study cards**: Create flashcards for spaced repetition (`create_flashcards`)",
    "- **Inbox reminders**: Schedule reminders and priorities (`create_reminder`)",
    "",
    "### 🧩 Choosing the Right Block (CRITICAL)",
    "Always pick the block type that best fits the content — never default to one block type for everything.",
    "- Plain text, headings, lists, todos, quotes, callouts, code → `append_blocks`, `insert_block`, `update_block`, or `execute_slash_command`",
    "- Structured records (tasks, customers, inventory, CRM) → `create_database`",
    "- Data visualization (trends, comparisons, metrics) → `create_chart`",
    "- Side-by-side content or grouped sections → `create_columns`, `create_tabs`",
    "- Rich interactive app/widget (calculator, timer, tracker, game, form) → `create_interactive` ONLY when the content genuinely requires interactivity",
    "For mixed content, combine block tools (e.g. text via `append_blocks` + visuals via `create_chart`) instead of forcing everything into one interactive widget.",
    "",
    "### 👁️ Navigation",
    "- **Open app views**: Open app views such as Home, Tasks, Inbox, Calendar, Library, Meetings, Chats, Journal, Graph, Canvas, Agents, Automations, Marketplace, Settings, and more (`open_view`)",
    "- **Open workspace page**: Open a specific workspace page (`open_page`)",
    "",
    "### 🤖 AI & Agents",
    "- **Delegation**: Assign focused work to specialist subagents (`call_subagent`)",
    "- **Custom subagents**: Create specialist agents with custom roles and instructions (`create_subagent`)",
    "- **Agent management**: List, create, configure, schedule, pause, and manage persistent agents (`list_agents`, `manage_agent`)",
    "- **Automations & Workflows**: List, create, schedule, toggle, and trigger automation workflows (`list_automations`, `manage_automation`)",
    "- **Execution Monitoring**: Monitor execution runs, logs, durations, and health across agents and automations (`monitor_runs`)",
    "- **Daily briefing**: Summarize recent activity, open tasks, and reminders (`daily_briefing`)",
    "- **Personalization**: Save and retrieve writing preferences and learned habits (`remember_preference`, `get_user_profile`)",
    "- **Notifications**: Send an in-app notification (`send_notification`)",
    "",
    "### 🌐 Integrations & Information",
    "- **Web search**: Available only after configuring a supported web-search key (`web_search`)",
    "- **Capabilities check**: Display connected, partial, and unavailable tools (`capabilities`)",
    "",
    "### ⚠️ Currently Unavailable",
    "- Direct file generation",
    "- File uploads",
    "- Email and calendar access",
    "- External integrations such as Slack, GitHub, Gmail, and Notion",
    "- Full real-time collaboration",
    "- Complete audit trails",
    "",
    "### TOOL FORMAT (MUST USE EXACTLY)",
    "Write the tool block directly in your response like this:",
    "",
    '<<TOOL:append_blocks>>{"content":"## New Section\\n\\nBody text here"}<</TOOL>>',
    "",
    "Then add a 1-2 sentence summary after the tool block.",
    "",
    "### RULES",
    "1. When asked to create, write, edit, rename, add, search, or organize — ALWAYS use the matching tool immediately",
    "2. When the user asks to open/show/go to a part of the app or a page — use open_view / open_page so it actually happens",
    "3. The tool block will be automatically removed from what the user sees — you do NOT need to hide it yourself",
    "4. Write the tool block FIRST, then your summary text",
    "5. Never describe what you would do — just do it with the tool",
    "6. Choose the best-fitting block type for each piece of content — do NOT wrap regular content in interactive widgets; use `create_interactive` only for genuinely interactive apps",
    "7. If no tool exists for the request, say so honestly",
    "",
  ];
  if (!options.compact) {
    lines.push(
      "### Content Tips (make pages beautiful)",
      "- Use headings (# ## ###) for structure",
      "- Add emojis in content text for visual appeal 🎨 ✨ 🚀",
      "- Use callout blocks for important notes: > 💡 Tip text here",
      "- Use dividers (---) to separate sections",
      "- Mix bullet lists (-), numbered lists (1. 2.), and todos (- [ ])",
      "- Use code blocks (```) for technical content",
      "- Add toggles (<details>) for collapsible sections",
      "",
    );
  }
  lines.push("### Tool Reference", 'Use this format: <<TOOL:tool_name>>{"param":"value"}<</TOOL>>', "");
  if (!options.compact) {
    lines.push(
      "Example: <<TOOL:append_blocks>>{\"content\":\"## 🚀 AI Content\\n\\n- Feature one\\n- Feature two\\n- [ ] Task pending\\n\\n> 💡 Pro tip here\\n\\n---\\n\\n### More details\\n\\nFinal paragraph.\",\"page_id\":\"current\"}<</TOOL>>",
      `Example: <<TOOL:set_page_icon>>{\"icon\":\"🚀\"}<</TOOL>>`,
      `Example: <<TOOL:create_page>>{"title":"Meeting Notes","icon":"📝","content":"# Notes\\n\\n- [ ] Follow up"}<</TOOL>>`,
      `Example: <<TOOL:rename_page>>{\"title\":\"New Title\"}<</TOOL>>`,
      `Example: <<TOOL:search_pages>>{\"query\":\"AI\"}<</TOOL>>`,
      "",
    );
  }
  for (const def of DEFINITIONS) {
    if (def.name === "image_generate" && !imageGenerationAvailable) continue;
    const params = Object.entries(def.params)
      .map(([key, spec]) => `\`${key}\`${spec.required ? " (required)" : ""}: ${spec.desc}`)
      .join(", ");
    lines.push(`- **${def.name}**: ${def.description} ${params ? `— ${params}` : ""}`);
  }
  // Connected external platforms (MCP integrations). Refresh is throttled
  // and fire-and-forget: freshly connected tools appear on the next round.
  void refreshIntegrationTools();
  const integrationDefs = getIntegrationToolDefinitions();
  if (integrationDefs.length > 0) {
    lines.push(
      "",
      "### Connected Platform Tools",
      "The user has connected external platforms (via Noska Integrations). Use these tools when the request touches those platforms — they execute for real against the connected account.",
      "",
    );
    for (const def of integrationDefs) {
      const params = Object.entries(def.params)
        .map(([key, spec]) => `\`${key}\`${spec.required ? " (required)" : ""}: ${spec.desc}`)
        .join(", ");
      lines.push(`- **${def.name}**: ${def.description} ${params ? `— ${params}` : ""}`);
    }
  }
  if (!options.compact) {
    const capabilities = getCapabilities(imageGenerationAvailable);
    lines.push("", "### Capability Status");
    for (const cap of capabilities) {
      lines.push(`- ${cap.status} **${cap.name}**: ${cap.description}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

export function getCapabilities(imageGeneration = true) {
  const integrations = getIntegrationSummary();
  const connectedSlugs = new Set(getIntegrationToolDefinitions().map(d => d.connectorSlug));
  const integrationStatus = integrations.connectedConnectors > 0 ? "✓" : "✕";
  const integrationDesc = integrations.connectedConnectors > 0
    ? `Connected platforms via MCP/API: ${integrations.connectedConnectors} connection${integrations.connectedConnectors === 1 ? "" : "s"}, ${integrations.toolCount} external tool${integrations.toolCount === 1 ? "" : "s"}`
    : "Connect Notion, GitHub, Slack, Gmail, Calendar or any MCP server in Settings → Integrations";
  let webSearchStatus: "✓" | "✕" = "✕";
  let webSearchDesc = "Search the public web from chat — add a free Tavily key in Settings → Noska AI → Web Search";
  try {
    // Lazy import avoids a static cycle through the lib layer; sync probe is cheap.
    const key = typeof localStorage !== "undefined" ? localStorage.getItem("noska_tavily_key") : null;
    if (key?.trim() || (import.meta.env.VITE_TAVILY_API_KEY as string | undefined)?.trim()) {
      webSearchStatus = "✓";
      webSearchDesc = "Search the public web from chat (Tavily)";
    }
  } catch { /* ignore */ }
  return [
    { name: "Page Management", description: "Create, rename, organize pages", status: "✓" },
    { name: "Page Templates", description: "Create pages from pre-built templates (meeting, project, weekly, habit, journal, notes)", status: "✓" },
    { name: "Rich Content Editing", description: "Headings, bullets, numbers, todos, quotes, code blocks, dividers, callouts, toggles", status: "✓" },
    { name: "Search & Discovery", description: "Search pages, list all pages, get page content", status: "✓" },
    { name: "Page Hierarchy", description: "Move pages, navigate parent/children/backlinks", status: "✓" },
    { name: "Tag System & Favorites", description: "Add/remove/set tags, manage favorites, workspace stats", status: "✓" },
    { name: "Page Actions & Lineage", description: "Duplicate, trash, restore, and view edit history", status: "✓" },
    { name: "Page Analysis", description: "Analyze pages for quality, structure, completeness, and suggest improvements", status: "✓" },
    { name: "Page Styling", description: "Set emoji icons and cover colors", status: "✓" },
    { name: "Study Cards", description: "Create flashcards for spaced repetition", status: "✓" },
    { name: "Inbox Reminders", description: "Schedule reminders and priorities", status: "✓" },
    { name: "App Navigation", description: "Open views (Home, Tasks, Inbox, Calendar, Library, Meetings, Chats, Journal, Graph, Canvas, Agents, Automations, Marketplace, Settings…) and pages on request", status: "✓" },
    { name: "Specialist Delegation", description: "Assign focused work to specialist subagents (researcher, coder, writer, analyst, organizer)", status: "✓" },
    { name: "Custom Subagents", description: "Create specialist agents with custom roles and instructions", status: "✓" },
    { name: "Agent Management & Scheduling", description: "Create, configure, schedule, and pause persistent workspace agents", status: "✓" },
    { name: "Automations & Workflows", description: "Create, schedule, toggle, and trigger automation workflows", status: "✓" },
    { name: "Run Monitoring & Observability", description: "Monitor execution traces, durations, step records, and statuses across all runs", status: "✓" },
    { name: "Daily Briefing", description: "Summarize recent activity, open tasks, and reminders", status: "✓" },
    { name: "User Personalization", description: "Save and retrieve writing preferences and learned habits", status: "✓" },
    { name: "In-App Notifications", description: "Send an in-app notification", status: "✓" },
    { name: "Web Search", description: webSearchDesc, status: webSearchStatus },
    { name: "Capabilities Check", description: "Display connected, partial, and unavailable tools", status: "✓" },
    { name: "External Integrations", description: integrationDesc, status: integrationStatus },
    { name: "Image generation", description: imageGeneration ? "Generate images with the selected image-capable model" : "Select an image-capable model to enable image generation", status: imageGeneration ? "✓" : "✕" },
    { name: "File Uploads", description: "Direct file uploads into chat", status: "✕" },
    { name: "Email and calendar access", description: "Direct native mailbox/calendar access", status: (connectedSlugs.has("gmail") && connectedSlugs.has("google-calendar")) ? "✓" : "✕" },
    { name: "External integrations (Slack, GitHub, Gmail, Notion)", description: integrationDesc, status: integrationStatus },
    { name: "Full real-time collaboration", description: "Multi-user live cursor co-authoring", status: "⚠" },
    { name: "Complete audit trails", description: "Full immutable enterprise audit logging", status: "⚠" }
  ];
}

/**
 * Repair common model-JSON mistakes so tool calls survive imperfect output:
 * raw control characters inside strings, trailing commas, smart quotes,
 * and truncated (unbalanced) JSON from max-token cutoffs.
 */
function repairToolJSON(raw) {
  let s = String(raw).trim();
  // Smart quotes → straight quotes (safe: apostrophes inside text stay intact)
  s = s.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'");
  // Escape raw control characters that would break JSON parsing
  s = s.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  // Remove trailing commas before closing braces/brackets
  s = s.replace(/,\s*([}\]])/g, '$1');
  // Balance truncated JSON: track string state and open brackets, then close them
  const stack = [];
  let inString = false, escape = false;
  for (const ch of s) {
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
    } else {
      if (ch === '"') inString = true;
      else if (ch === '{' || ch === '[') stack.push(ch);
      else if (ch === '}' || ch === ']') stack.pop();
    }
  }
  if (inString) s += '"';
  while (stack.length > 0) s += stack.pop() === '{' ? '}' : ']';
  return s;
}

function tryParseToolJSON(raw) {
  try {
    return JSON.parse(raw);
  } catch { /* fall through to repair */ }
  try {
    return JSON.parse(repairToolJSON(raw));
  } catch { /* fall through to quote rewrite */ }
  // Last resort: single-quoted strings/keys → double-quoted
  try {
    return JSON.parse(repairToolJSON(raw).replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"'));
  } catch {
    return null;
  }
}

/** Canonical names of every registered tool, for tolerant matching. */
const TOOL_NAME_SET = new Set(DEFINITIONS.map(d => d.name));

/**
 * Resolve a tool name to its canonical form — models frequently emit case,
 * spacing, or hyphen/underscore variants of the registered names.
 */
function resolveToolName(name) {
  if (TOOL_NAME_SET.has(name)) return name;
  const lower = String(name).toLowerCase();
  const exact = DEFINITIONS.find(d => d.name.toLowerCase() === lower);
  if (exact) return exact.name;
  const squash = v => v.toLowerCase().replace(/[\s_-]/g, "");
  const loose = DEFINITIONS.find(d => squash(d.name) === squash(String(name)));
  return loose ? loose.name : name;
}

export function parseToolCalls(text) {
  const calls = [];
  let match;
  const regex = new RegExp(TOOL_PATTERN.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    const params = tryParseToolJSON(match[2].trim()) || {};
    calls.push({ name: resolveToolName(match[1]), params, raw: match[0] });
  }
  return calls;
}

/**
 * Validate and execute a single tool call against a tool context.
 * Exported for the shared agent runtime (which applies its own permission
 * gate before calling this). Throws on unknown tools or missing params.
 * Network-dependent tools get ONE bounded retry on transient errors —
 * a dropped connection shouldn't fail an otherwise-correct run.
 */
const RETRYABLE_TOOLS = new Set(["send_notification", "web_search"]);

function isTransientToolError(err: unknown): boolean {
  const msg = String((err as Error)?.message || "");
  return /failed to fetch|networkerror|network error|\btimeout\b|timed out|\b502\b|\b503\b|\b504\b|bad gateway|service unavailable|econn/i.test(msg);
}

export async function runTool(name, params, context) {
  const canonical = resolveToolName(name);
  validateParams(canonical, params);
  try {
    return await executeTool(canonical, params, context);
  } catch (err) {
    const retryable = RETRYABLE_TOOLS.has(canonical) || Boolean(getIntegrationTool(canonical));
    if (retryable && isTransientToolError(err)) {
      await new Promise((r) => setTimeout(r, 600));
      return await executeTool(canonical, params, context);
    }
    throw err;
  }
}

export function stripToolCalls(text) {
  return text.replace(new RegExp(TOOL_SOURCE, 'g'), '').trim();
}

export function hasToolCalls(text) {
  return new RegExp(TOOL_SOURCE, 'g').test(text);
}

/** Calls emitted together in one response are independent — execute them in
 * parallel; result order matches call order. */
export async function executeAllToolCalls(text, context) {
  const calls = parseToolCalls(text);
  const blocked = calls.find((call) => categoryForTool(call.name) !== "read");
  if (blocked) {
    throw new Error(`Tool "${blocked.name}" requires the governed AgentRuntime executor`);
  }
  const results = await Promise.all(calls.map(async (call) => {
    try {
      validateParams(call.name, call.params);
      const result = await executeTool(call.name, call.params, context);
      return { name: call.name, ok: true, result, params: call.params };
    } catch (err) {
      return { name: call.name, ok: false, error: err.message, params: call.params };
    }
  }));
  return results;
}

function findPageByIdOrTitle(pageId, pages, currentPage) {
  if (!pageId || pageId === "current") return currentPage;
  let target = pages.find(p => p.id === pageId);
  if (!target) {
    target = pages.find(p => !p.trashed && p.title.toLowerCase().includes(pageId.toLowerCase()));
  }
  return target;
}

function parseTriggerSpec(raw?: string): any {
  if (!raw) return { type: "manual" };
  const trimmed = String(raw).trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.type === "string") return parsed;
    } catch { /* fall back to keyword parsing */ }
  }
  const lower = trimmed.toLowerCase();
  if (lower === "daily" || lower === "every_day" || lower === "day") {
    return { type: "schedule", schedule: { kind: "every_day", hour: 9, minute: 0 } };
  }
  if (lower === "hourly" || lower === "interval") {
    return { type: "schedule", schedule: { kind: "interval", intervalMinutes: 60 } };
  }
  if (lower === "weekly") {
    return { type: "schedule", schedule: { kind: "weekly", dayOfWeek: 1, hour: 9, minute: 0 } };
  }
  if (lower === "monthly") {
    return { type: "schedule", schedule: { kind: "monthly", dayOfMonth: 1, hour: 9, minute: 0 } };
  }
  if (["page_created", "page_updated", "task_completed", "title_changed", "page_trashed"].includes(lower)) {
    return { type: lower };
  }
  return { type: "manual" };
}

async function executeTool(name, params, context) {
  if (name === "send_notification") return executeSendNotification(params, context);
  if (name === "create_flashcards") return executeCreateFlashcards(params, context);
  // Connected external platforms (MCP integrations) — executed through
  // the connector gateway; they need no workspace context.
  if (getIntegrationTool(name)) return executeIntegrationTool(name, params);
  const { currentPage, pages, actions } = context;

  switch (name) {
    case "open_view": {
      const view = resolveViewTarget(String(params.view || params.name || ""));
      if (!view) {
        const valid = VIEW_TARGETS.map(t => t.id).join(", ");
        throw new Error(`Unknown view "${params.view}". Valid views: ${valid}`);
      }
      actions.openView(view);
      return { opened: view };
    }

    case "open_page": {
      const target = findPageByIdOrTitle(String(params.page_id || params.title || ""), pages, currentPage);
      if (!target) throw new Error(`Page not found: "${params.page_id}"`);
      actions.openPage(target.id);
      return { opened: target.id, title: target.title };
    }

    case "create_reminder": {
      const { addReminder } = await import('../lib/reminders');
      const reminder = addReminder({
        text: String(params.text || ""),
        date: params.date ? String(params.date) : undefined,
        priority: params.priority === "high" || params.priority === "low" ? params.priority : "medium",
      });
      return { created: true, id: reminder.id, text: reminder.text, date: reminder.date };
    }

    case "daily_briefing": {
      const active = (pages || []).filter(p => !p.trashed);
      const byUpdated = [...active].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      const openTodos = active.reduce(
        (sum, p) => sum + (p.blocks || []).filter(b => b.type === "todo" && !b.checked).length, 0
      );
      const { loadReminders } = await import('../lib/reminders');
      const pendingReminders = loadReminders().filter(r => !r.dismissed);
      const today = new Date().toISOString().slice(0, 10);
      return {
        date: today,
        workspace: { pages: active.length, favorites: active.filter(p => p.favorite).length },
        todos: { open: openTodos },
        recentlyEdited: byUpdated.slice(0, 5).map(p => ({ title: p.title, icon: p.icon, updatedAt: p.updatedAt })),
        reminders: {
          pending: pendingReminders.length,
          dueToday: pendingReminders.filter(r => (r.date || "").slice(0, 10) === today).map(r => r.text),
          next: pendingReminders.slice(0, 5).map(r => ({ text: r.text, date: r.date }))
        }
      };
    }

    case "web_search": {
      const { webSearch } = await import('../lib/webSearch');
      const results = await webSearch(String(params.query || ""), Number(params.max_results) || 5);
      return { query: params.query, count: results.length, results };
    }

    case "ask_user": {
      throw new Error("ask_user is handled by the agent runtime — it cannot run as a plain tool.");
    }

    case "create_page": {
      const id = actions.createPage(params.title, params.icon || "📝", params.content, params.tags);
      return { pageId: id, title: params.title };
    }

    case "rename_page": {
      const targetPage = params.page_id ? findPageByIdOrTitle(params.page_id, pages, currentPage) : currentPage;
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { title: params.title });
      } else {
        actions.renamePage(params.title);
      }
      return { title: params.title, pageId: targetPage.id };
    }

    case "append_blocks": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const content = params.content || params.text || "";
      const blocks = textToBlocks(content);
      if (blocks.length === 0) throw new Error("No content to append");
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { blocks: [...targetPage.blocks, ...blocks] });
      } else {
        actions.appendBlocks(blocks);
      }
      return { count: blocks.length, blocks: blocks.map(b => ({ type: b.type, text: b.text })) };
    }

    case "add_todo": {
      const block = blockFor("todo", params.text);
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { blocks: [...targetPage.blocks, block] });
      } else {
        actions.appendBlocks([block]);
      }
      return { text: params.text, blockId: block.id, page: targetPage.title };
    }

    case "search_pages": {
      // Tokenized, ranked search: title matches weigh most, then tags, then
      // body text. Exact title hits rank above partial ones so the best
      // candidate is first instead of insertion order.
      const terms = String(params.query || "").toLowerCase().split(/\s+/).filter(Boolean);
      const results = pages
        .filter(p => !p.trashed)
        .map(p => {
          const title = (p.title || "").toLowerCase();
          const tags = (p.tags || []).map(t => String(t).toLowerCase());
          const body = (p.blocks || []).map(b => b.text || "").join("\n").toLowerCase();
          let score = 0;
          for (const term of terms) {
            if (title === term) score += 10;
            else if (title.includes(term)) score += 5;
            if (tags.some(t => t.includes(term))) score += 3;
            if (body.includes(term)) score += 1;
          }
          return { page: p, score };
        })
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(r => ({ id: r.page.id, title: r.page.title, icon: r.page.icon, tags: r.page.tags }));
      return { count: results.length, results };
    }

    case "get_page_content": {
      const target = params.page_id
        ? pages.find(p => p.id === params.page_id)
        : params.title
          ? pages.find(p => !p.trashed && p.title.toLowerCase().includes(params.title.toLowerCase()))
          : currentPage;
      if (!target) throw new Error("Page not found");
      const text = target.blocks.map(b => b.text || '').filter(Boolean).join('\n');
      return {
        id: target.id, title: target.title, icon: target.icon,
        tags: target.tags, content: text, blockCount: target.blocks.length
      };
    }

    case "list_pages": {
      const list = pages.filter(p => !p.trashed).map(p => ({
        id: p.id, title: p.title, icon: p.icon, tags: p.tags
      }));
      return { count: list.length, pages: list };
    }

    case "set_page_tags": {
      const targetPage = params.page_id ? findPageByIdOrTitle(params.page_id, pages, currentPage) : currentPage;
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const tags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { tags });
      } else {
        actions.setPageTags(tags);
      }
      return { tags, page: targetPage.title };
    }

    case "replace_content": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const content = params.content || params.text || "";
      const blocks = textToBlocks(content);
      if (blocks.length === 0) throw new Error("No content provided");
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { blocks });
      } else {
        actions.replaceBlocks(blocks);
      }
      return { count: blocks.length, blocks: blocks.map(b => ({ type: b.type, text: b.text })) };
    }

    case "insert_block": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const type = params.type ? String(params.type).replace(/^\//, '').trim() : "text";
      const block = blockFor(type, params.text || "");
      const index = params.index !== undefined && params.index >= 0 ? params.index : targetPage.blocks.length;
      if (targetPage.id !== currentPage?.id) {
        const blocks = [...targetPage.blocks];
        blocks.splice(index, 0, block);
        actions.updateAnyPage(targetPage.id, { blocks });
      } else {
        actions.insertBlock(index, block);
      }
      return { index, block };
    }

    case "delete_blocks": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const indices = params.indices.split(',').map(i => parseInt(i.trim())).filter(i => !isNaN(i));
      const deleted = indices.map(i => targetPage.blocks[i]).filter(Boolean);
      const remaining = targetPage.blocks.filter((_, i) => !indices.includes(i));
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { blocks: remaining });
      } else {
        actions.replaceBlocks(remaining);
      }
      return { deleted: deleted.length, remaining: remaining.length };
    }

    case "update_block": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const index = parseInt(params.index);
      if (isNaN(index) || index < 0 || index >= targetPage.blocks.length) {
        throw new Error(`Invalid block index: ${params.index}`);
      }
      if (targetPage.id !== currentPage?.id) {
        const blocks = [...targetPage.blocks];
        blocks[index] = { ...blocks[index], text: params.text };
        actions.updateAnyPage(targetPage.id, { blocks });
      } else {
        actions.updateBlockById(targetPage.blocks[index].id, { text: params.text });
      }
      return { index, text: params.text };
    }

    case "undo_action": {
      if (actions.undo) {
        actions.undo();
        return { undone: true };
      }
      throw new Error("Undo is not available");
    }

    case "get_page_hierarchy": {
      const target = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!target) throw new Error("Page not found");
      const parent = target.parentId ? pages.find(p => p.id === target.parentId) : null;
      const children = pages.filter(p => p.parentId === target.id && !p.trashed);
      const mentionsThis = pages
        .filter(p => p.id !== target.id && !p.trashed)
        .map(p => ({ id: p.id, title: p.title }))
        .slice(0, 10);
      return {
        page: { id: target.id, title: target.title, icon: target.icon },
        parent: parent ? { id: parent.id, title: parent.title, icon: parent.icon } : null,
        children: children.map(c => ({ id: c.id, title: c.title, icon: c.icon })),
        backlinks: mentionsThis
      };
    }

    case "get_workspace_stats": {
      const active = pages.filter(p => !p.trashed);
      const tagCounts: Record<string, number> = {};
      for (const p of active) {
        for (const tag of (p.tags || [])) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
      return {
        totalPages: active.length,
        favorites: active.filter(p => p.favorite).length,
        trashed: pages.filter(p => p.trashed).length,
        totalBlocks: active.reduce((sum, p) => sum + (p.blocks?.length || 0), 0),
        tags: Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([tag, count]) => ({ tag, count }))
      };
    }

    case "capabilities": {
      const { aiManager } = await import("./AIManager");
      const imageGeneration = aiManager.supportsImageGeneration();
      return {
        formatted: getAvailableToolsMarkdown(),
        taxonomy: AVAILABLE_TOOLS_TAXONOMY,
        capabilities: getCapabilities(imageGeneration),
        unavailable: CURRENTLY_UNAVAILABLE,
      };
    }

    case "set_page_icon": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { icon: params.icon });
      } else {
        actions.updateAnyPage(currentPage.id, { icon: params.icon });
      }
      return { icon: params.icon, page: targetPage.title };
    }

    case "set_page_cover": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { cover: params.cover });
      } else {
        actions.updateAnyPage(currentPage.id, { cover: params.cover });
      }
      return { cover: params.cover, page: targetPage.title };
    }

    case "move_page": {
      const targetPage = params.page_id
        ? findPageByIdOrTitle(params.page_id, pages, currentPage)
        : currentPage;
      if (!targetPage) throw new Error("Page not found");
      let newParentId = null;
      if (params.parent_id && params.parent_id !== "null" && params.parent_id !== "root") {
        const parent = findPageByIdOrTitle(params.parent_id, pages, null);
        if (!parent) throw new Error(`Parent page not found: "${params.parent_id}"`);
        newParentId = parent.id;
      }
      actions.updateAnyPage(targetPage.id, { parentId: newParentId });
      return {
        page: targetPage.title,
        parent: newParentId ? (pages.find(p => p.id === newParentId)?.title || params.parent_id) : "root"
      };
    }

    case "favorite_page": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const newFav = params.favorite !== undefined ? params.favorite : !targetPage.favorite;
      actions.updateAnyPage(targetPage.id, { favorite: newFav });
      return { page: targetPage.title, favorite: newFav };
    }

    case "trash_page": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      actions.updateAnyPage(targetPage.id, { trashed: true });
      return { page: targetPage.title, trashed: true };
    }

    case "restore_page": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id}"`);
      actions.updateAnyPage(targetPage.id, { trashed: false });
      return { page: targetPage.title, restored: true };
    }

    case "duplicate_page": {
      const source = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!source) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const newTitle = params.title || `Copy of ${source.title}`;
      const newId = actions.createPage(newTitle, source.icon || "📄", "", (source.tags || []).join(","));
      const duplicatedBlocks = (source.blocks || []).map(b => ({ ...b, id: uid() }));
      actions.updateAnyPage(newId, { blocks: duplicatedBlocks });
      return { newTitle, sourceTitle: source.title, blockCount: duplicatedBlocks.length };
    }

    case "list_trashed_pages": {
      const trashed = pages.filter(p => p.trashed).map(p => ({
        id: p.id, title: p.title, icon: p.icon, tags: p.tags, updatedAt: p.updatedAt
      }));
      return { count: trashed.length, pages: trashed };
    }

    case "batch_tag": {
      const ids = params.page_ids.split(",").map(s => s.trim()).filter(Boolean);
      const tagList = params.tags.split(",").map(t => t.trim()).filter(Boolean);
      const mode = params.mode || "add";
      const affected = [];
      for (const idOrTitle of ids) {
        const target = findPageByIdOrTitle(idOrTitle, pages, currentPage);
        if (!target || target.trashed) continue;
        let newTags;
        if (mode === "add") newTags = [...new Set([...(target.tags || []), ...tagList])];
        else if (mode === "remove") newTags = (target.tags || []).filter(t => !tagList.includes(t));
        else newTags = tagList;
        actions.updateAnyPage(target.id, { tags: newTags });
        affected.push(target.title);
      }
      return { mode, tags: tagList, pages: affected, count: affected.length };
    }

    case "get_page_lineage": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      return {
        page: targetPage.title,
        icon: targetPage.icon,
        created: targetPage.createdAt,
        updated: targetPage.updatedAt,
        history: (targetPage.lineage || []).slice(-20).map(e => ({
          action: e.action, timestamp: e.timestamp, detail: e.detail
        }))
      };
    }

    case "create_page_from_template": {
      const templates = {
        meeting: {
          icon: "📋",
          content: `## 📅 Meeting: ${params.title}\n\n> 📍 ${new Date().toLocaleDateString()}\n\n### Attendees\n- \n\n### Agenda\n1. \n2. \n3. \n\n### Notes\n\n### Action Items\n- [ ] \n- [ ] \n\n### Follow-ups\n`
        },
        project: {
          icon: "🚀",
          content: `## 🚀 Project: ${params.title}\n\n### Overview\n\n### Goals\n- [ ] \n- [ ] \n\n### Timeline\n- **Phase 1**: \n- **Phase 2**: \n- **Phase 3**: \n\n### Resources\n\n### Risks\n`
        },
        weekly: {
          icon: "📅",
          content: `## 📅 Week of ${new Date().toLocaleDateString()}\n\n### ✅ Wins\n- \n- \n\n### 🚧 Challenges\n- \n- \n\n### 🎯 Next Week\n- [ ] \n- [ ] \n- [ ] \n\n### 💡 Ideas\n`
        },
        habit: {
          icon: "✅",
          content: `## ✅ Habit Tracker: ${params.title}\n\n| Habit | Mon | Tue | Wed | Thu | Fri | Sat | Sun |\n|-------|-----|-----|-----|-----|-----|-----|-----|\n|       | ☐   | ☐   | ☐   | ☐   | ☐   | ☐   | ☐   |\n|       | ☐   | ☐   | ☐   | ☐   | ☐   | ☐   | ☐   |\n\n### Notes\n`
        },
        journal: {
          icon: "📓",
          content: `## 📓 ${new Date().toLocaleDateString()}\n\n### How I'm feeling\n\n### What happened today\n\n### What I learned\n\n### Grateful for\n- \n- \n\n### Tomorrow's focus\n- [ ] \n`
        },
        notes: {
          icon: "📝",
          content: `## 📝 ${params.title}\n\n### Summary\n\n### Key Points\n- \n- \n- \n\n### Details\n\n### References\n`
        }
      };
      const tmpl = templates[params.template] || templates.notes;
      const pageId = actions.createPage(
        params.title,
        params.icon || tmpl.icon,
        tmpl.content,
        params.tags
      );
      return { pageId, title: params.title, template: params.template };
    }

    case "remember_preference": {
      await saveUserPreference(params.key, params.value);
      return { remembered: params.key, value: params.value };
    }

    case "get_user_profile": {
      const mem = getMemory() || {};
      const prefs: Record<string, string> = {};
      const facts: string[] = [];
      for (const [key, val] of Object.entries(mem) as [string, MemoryEntry][]) {
        if (key.startsWith("pref:") || val._category === "preference") {
          prefs[key.replace("pref:", "")] = val.text || val.content || JSON.stringify(val);
        }
        if (val._category === "user_profile") {
          prefs[key.replace("user:", "")] = val.text || val.content || JSON.stringify(val);
        }
        if (key.startsWith("fact:") || val._category === "fact") {
          facts.push(val.text || val.content || JSON.stringify(val));
        }
      }
      return { preferences: prefs, facts: facts.slice(0, 20) };
    }

    case "analyze_page": {
      const target = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!target) throw new Error(`Page not found: "${params.page_id || 'current'}"`);
      const text = plainText(target);
      const blocks = target.blocks || [];
      const words = text.split(/\s+/).filter(Boolean).length;
      const chars = text.length;
      const headings = blocks.filter(b => /^h[123]$/.test(b.type)).length;
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
      const readingTime = Math.max(1, Math.ceil(words / 220));
      const backlinks = getBacklinks ? getBacklinks(target.id, pages) : [];
      const outgoing = getOutgoingLinks ? getOutgoingLinks(target.id, pages) : [];
      const todos = blocks.filter(b => b.type === 'todo');
      const checkedRatio = todos.length > 0 ? `${todos.filter(b => b.checked).length}/${todos.length}` : '0/0';
      const suggestions = [];
      if (!target.title || target.title === 'Untitled') suggestions.push('Give the page a descriptive title');
      if (words < 50) suggestions.push('Add more content (currently only ' + words + ' words)');
      if (words > 200 && headings < 2) suggestions.push('Add headings to structure this long page');
      if ((target.tags || []).length === 0) suggestions.push('Add tags to improve discoverability');
      if (backlinks.length === 0) suggestions.push('Link this page from other pages to build connections');
      if (outgoing.length === 0) suggestions.push('Add [[links]] to related pages');
      if (target.blocks && target.blocks.length > 0 && !text.trim()) suggestions.push('Page has blocks but no text content');
      return {
        title: target.title,
        icon: target.icon,
        stats: {
          words, chars, blocks: blocks.length,
          headings, paragraphs, readingTime,
          images: blocks.filter(b => b.type === 'image').length,
          codeBlocks: blocks.filter(b => b.type === 'code').length,
          tables: blocks.filter(b => b.type === 'table').length,
          todos: todos.length, checkedRatio,
        },
        connections: {
          backlinks: backlinks.length,
          outgoing: outgoing.length,
          children: pages.filter(p => p.parentId === target.id).length,
          parent: target.parentId ? 'Yes' : 'No (root)',
        },
        tags: target.tags || [],
        status: target.status || 'draft',
        priority: target.priority || 'medium',
        suggestions
      };
    }

    case "call_subagent": {
      const targetAgentId = params.agent?.toLowerCase()?.trim() || "assistant";
      const task = params.task || "";
      const extraContext = params.context ? `\n\nContext:\n${params.context}` : "";
      
      const subagentPrompt = `You are a specialized subagent (${targetAgentId}) assigned a focused objective by the primary coordinator.\n\nObjective: ${task}${extraContext}\n\nExecute this objective thoroughly and return clear, structured data and findings so the primary agent can synthesize the final output.`;

      const { aiManager } = await import("./AIManager");
      const result = await aiManager.send({
        agent: targetAgentId,
        prompt: subagentPrompt,
        page: currentPage,
        pages: pages,
      });

      return {
        subagent: targetAgentId,
        task,
        status: "completed",
        output: result
      };
    }

    case "create_subagent": {
      const name = params.name?.trim() || "Subagent";
      const description = params.description?.trim() || "Custom Workspace Subagent";
      const instructions = params.instructions?.trim() || "";
      const icon = params.icon || "🤖";
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_");

      const { registerCustomAgent } = await import("./agents");
      registerCustomAgent({
        id,
        name,
        description,
        icon,
        system: instructions,
      });

      return {
        id,
        name,
        description,
        icon,
        status: "registered"
      };
    }

    case "execute_slash_command": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const cmd = String(params.command || "").replace(/^\//, "").trim().toLowerCase();
      const text = String(params.text || "");
      let block: any;
      if (cmd === "database" || cmd === "table-view" || cmd === "board-view") {
        const view = cmd === "board-view" ? "board" : "table";
        const emptyDb = makeEmptyDatabase();
        const viewId = `v-${uid().slice(0, 6)}`;
        const pageTodos = (targetPage.blocks || []).filter(b => b.type === "todo" && b.text);
        const rows = pageTodos.length > 0
          ? pageTodos.map(todo => ({
              id: uid(),
              name: todo.text,
              status: todo.checked ? "Done" : "To Do",
              priority: "Medium"
            }))
          : text
            ? [{ id: uid(), name: text, status: "To Do", priority: "Medium" }]
            : [];
        block = {
          id: uid(),
          type: "database",
          text: text || targetPage.title || "Database",
          database: {
            ...emptyDb,
            title: text || targetPage.title || "Database",
            view,
            views: [{ id: viewId, name: view.charAt(0).toUpperCase() + view.slice(1), type: view }],
            activeViewId: viewId,
            properties: [
              { id: "name", name: "Name", type: "text" },
              { id: "status", name: "Status", type: "status" },
              { id: "priority", name: "Priority", type: "text" }
            ],
            rows,
          }
        };
      } else if (cmd === "mermaid") {
        let mmdCode = text.trim();
        if (!mmdCode || (!mmdCode.includes("-->") && !mmdCode.includes("graph") && !mmdCode.includes("flowchart"))) {
          const subpages = pages.filter(p => p.parentId === targetPage.id && !p.trashed);
          mmdCode = `graph TD\n  root["${targetPage.icon || "📄"} ${targetPage.title}"]\n`;
          if (subpages.length > 0) {
            subpages.forEach((sp, idx) => {
              mmdCode += `  root --> p${idx}["${sp.icon || "📄"} ${sp.title}"]\n`;
            });
          } else {
            const siblingPages = pages.filter(p => !p.trashed && p.id !== targetPage.id).slice(0, 4);
            siblingPages.forEach((sp, idx) => {
              mmdCode += `  root -.-> s${idx}["${sp.icon || "📄"} ${sp.title}"]\n`;
            });
          }
        }
        block = {
          id: uid(),
          type: "mermaid",
          text: mmdCode,
          properties: { title: "Page Structure Diagram" }
        };
      } else if (cmd === "chart" || cmd.includes("chart")) {
        const chartType = ["bar-chart-v", "bar-chart-h", "line-chart", "donut-chart", "number-chart"].includes(cmd) ? cmd : "bar-chart-v";
        const todos = (targetPage.blocks || []).filter(b => b.type === "todo");
        const doneTodos = todos.filter(b => b.checked).length;
        const pendingTodos = todos.filter(b => !b.checked).length;
        let series: Array<{ label: string; value: number; color?: string }> = [];
        if (todos.length > 0) {
          series = [
            { label: "Completed Tasks", value: doneTodos, color: "#22c55e" },
            { label: "Pending Tasks", value: pendingTodos, color: "#f59e0b" }
          ];
        } else {
          const blockCounts: Record<string, number> = {};
          (targetPage.blocks || []).forEach(b => {
            blockCounts[b.type] = (blockCounts[b.type] || 0) + 1;
          });
          series = Object.entries(blockCounts).slice(0, 5).map(([t, count], idx) => {
            const PALETTE = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"];
            return { label: t.toUpperCase(), value: count, color: PALETTE[idx % PALETTE.length] };
          });
          if (series.length === 0) {
            series = [{ label: "Pages in Workspace", value: pages.filter(p => !p.trashed).length, color: "#3b82f6" }];
          }
        }
        const chartTitle = text || `${targetPage.title} Metrics`;
        block = {
          id: uid(),
          type: chartType,
          text: chartTitle,
          chart: { title: chartTitle, unit: "", series },
          properties: { title: chartTitle }
        };
      } else if (cmd === "tabs") {
        const labels = text ? text.split(",").map(t => t.trim()).filter(Boolean) : ["Overview", "Details"];
        block = {
          id: uid(),
          type: "tabs",
          text: "Tabs",
          tabs: labels,
          activeTabIdx: 0,
          ...Object.fromEntries(labels.map((_, i) => [`tabContent_${i}`, ""]))
        };
      } else if (cmd.includes("column")) {
        const count = parseInt(cmd, 10) || 2;
        block = blockFor(`${count}-columns`, text);
        const cols = Array.from({ length: count }, (_, i) => [i === 0 && text ? text : ""]);
        block.columns = cols;
        block.columnColors = Array.from({ length: count }, (_, i) => ["green", "blue", "orange", "purple", "yellow"][i % 5]);
      } else if (cmd === "interactive") {
        const code = text.trim() || `<div style='padding: 20px; font-family: system-ui, sans-serif;'><h3>${targetPage.title}</h3><div id='interactive-root'></div></div>`;
        block = {
          id: uid(),
          type: "interactive",
          text: text ? "Interactive Sandbox" : `${targetPage.title} Interactive`,
          html: code,
          css: "",
          javascript: "",
          height: 320,
        };
      } else {
        block = blockFor(cmd, text);
      }

      const index = params.index !== undefined && params.index >= 0 ? Number(params.index) : targetPage.blocks.length;
      if (targetPage.id !== currentPage?.id) {
        const blocks = [...targetPage.blocks];
        blocks.splice(index, 0, block);
        actions.updateAnyPage(targetPage.id, { blocks });
      } else {
        actions.insertBlock(index, block);
      }
      return { command: `/${cmd}`, blockType: block.type, index, text };
    }

    case "image_generate": {
      const { aiManager } = await import("./AIManager");
      const { uploadImage } = await import("../lib/supabaseService");
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const generated = await aiManager.generateImage({
        prompt: String(params.prompt || ""),
        size: params.size ? String(params.size) : undefined,
        quality: params.quality ? String(params.quality) : undefined,
      });
      const imageResponse = await fetch(generated.dataUrl);
      if (!imageResponse.ok) throw new Error("Generated image could not be read");
      const blob = await imageResponse.blob();
      const extension = generated.mimeType.includes("png") ? "png" : generated.mimeType.includes("webp") ? "webp" : "jpg";
      const file = new File([blob], `ai-image-${Date.now()}.${extension}`, { type: generated.mimeType });
      const storageUrl = await uploadImage(file, String(targetPage.userId || targetPage.workspaceId || "ai"));
      const imageBlock = {
        ...blockFor("image", storageUrl),
        text: storageUrl,
        properties: {
          ...(blockFor("image", storageUrl).properties || {}),
          url: storageUrl,
          ...(params.caption ? { caption: String(params.caption) } : {}),
        },
      } as Block;
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { blocks: [...(targetPage.blocks || []), imageBlock] });
      } else {
        actions.appendBlocks([imageBlock]);
      }
      return {
        pageId: targetPage.id,
        blockId: imageBlock.id,
        imageUrl: storageUrl,
        provider: generated.provider,
        model: generated.model,
        revisedPrompt: generated.revisedPrompt,
      };
    }

    case "create_database": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const view = String(params.view || "table").toLowerCase();
      const rawCols = params.columns
        ? String(params.columns).split(",").map(c => c.trim()).filter(Boolean)
        : ["Name", "Status", "Priority"];
      const columns = rawCols.map(name => {
        const isName = name.toLowerCase() === "name" || name.toLowerCase() === "title";
        return {
          id: isName ? "name" : uid(),
          name,
          type: name.toLowerCase() === "status" ? "status" : name.toLowerCase().includes("date") ? "date" : name.toLowerCase().includes("select") ? "select" : "text"
        };
      });

      let rows: Array<Record<string, unknown>> = [];
      if (params.rows) {
        try {
          const parsed = JSON.parse(params.rows);
          if (Array.isArray(parsed)) {
            rows = parsed.map((item: Record<string, unknown>) => {
              const rowObj: Record<string, unknown> = { id: item.id || uid() };
              columns.forEach((col, idx) => {
                const val = item[col.name] ?? item[col.id] ?? item[rawCols[idx]] ?? "";
                rowObj[col.id] = val;
                rowObj[col.name] = val;
                if (col.id === "name" || idx === 0) rowObj.name = val;
              });
              return rowObj;
            });
          }
        } catch {
          rows = String(params.rows).split("\n").filter(Boolean).map(line => {
            const cells = line.split("|").map(c => c.trim()).filter(Boolean);
            const rowObj: Record<string, unknown> = { id: uid() };
            columns.forEach((col, i) => {
              const val = cells[i] || "";
              rowObj[col.id] = val;
              rowObj[col.name] = val;
              if (col.id === "name" || i === 0) rowObj.name = val;
            });
            return rowObj;
          });
        }
      } else {
        const pageTodos = (targetPage.blocks || []).filter(b => b.type === "todo" && b.text);
        if (pageTodos.length > 0) {
          rows = pageTodos.map(todo => ({
            id: uid(),
            name: todo.text,
            [columns[0]?.id || "name"]: todo.text,
            Status: todo.checked ? "Done" : "To Do",
            Priority: "Medium"
          }));
        } else {
          rows = [];
        }
      }

      const viewId = `v-${uid().slice(0, 6)}`;
      const emptyDb = makeEmptyDatabase();
      const validView = ["board", "gallery", "list", "calendar", "timeline", "table"].includes(view) ? view : "table";
      const dbBlock = {
        id: uid(),
        type: "database",
        text: params.title || targetPage.title || "Database",
        database: {
          ...emptyDb,
          title: params.title || targetPage.title || "Database",
          view: validView,
          views: [{ id: viewId, name: validView.charAt(0).toUpperCase() + validView.slice(1), type: validView }],
          activeViewId: viewId,
          properties: columns,
          rows,
        }
      };

      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { blocks: [...targetPage.blocks, dbBlock] });
      } else {
        actions.appendBlocks([dbBlock]);
      }
      return { created: true, title: params.title || targetPage.title || "Database", view: validView, columnCount: columns.length, rowCount: rows.length };
    }

    case "create_chart": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const chartType = String(params.chart_type || "bar-chart-v").toLowerCase();
      let block: any;
      if (chartType === "mermaid") {
        let mmdData = String(params.data || "").trim();
        if (!mmdData) {
          const subpages = pages.filter(p => p.parentId === targetPage.id && !p.trashed);
          mmdData = `graph TD\n  root["${targetPage.icon || "📄"} ${targetPage.title}"]\n`;
          if (subpages.length > 0) {
            subpages.forEach((sp, idx) => {
              mmdData += `  root --> p${idx}["${sp.icon || "📄"} ${sp.title}"]\n`;
            });
          } else {
            const related = pages.filter(p => !p.trashed && p.id !== targetPage.id).slice(0, 4);
            related.forEach((sp, idx) => {
              mmdData += `  root -.-> s${idx}["${sp.icon || "📄"} ${sp.title}"]\n`;
            });
          }
        }
        block = {
          id: uid(),
          type: "mermaid",
          text: mmdData,
          properties: { title: params.title || "Architecture Flow" }
        };
      } else {
        let series: Array<{ label: string; value: number; color?: string }> = [];
        if (params.data) {
          try {
            const parsed = JSON.parse(params.data);
            if (Array.isArray(parsed)) {
              series = parsed.map((item: any) => ({
                label: String(item.label || item.name || item.x || "Item"),
                value: Number(item.value ?? item.y ?? item.val ?? 0),
                color: item.color
              }));
            }
          } catch {
            series = String(params.data).split(/[,|\n]/).map(part => {
              const [k, v] = part.split(":").map(s => s.trim());
              return { label: k || "Item", value: Number(v) || 0 };
            }).filter(s => s.label && !isNaN(s.value));
          }
        }
        if (series.length === 0) {
          const pageTodos = (targetPage.blocks || []).filter(b => b.type === "todo");
          if (pageTodos.length > 0) {
            const done = pageTodos.filter(b => b.checked).length;
            const open = pageTodos.filter(b => !b.checked).length;
            series = [
              { label: "Completed", value: done, color: "#22c55e" },
              { label: "Pending", value: open, color: "#f59e0b" }
            ];
          } else {
            const typeCounts: Record<string, number> = {};
            (targetPage.blocks || []).forEach(b => {
              typeCounts[b.type] = (typeCounts[b.type] || 0) + 1;
            });
            series = Object.entries(typeCounts).slice(0, 5).map(([t, count], idx) => {
              const PALETTE = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"];
              return { label: t.toUpperCase(), value: count, color: PALETTE[idx % PALETTE.length] };
            });
            if (series.length === 0) {
              const activePages = pages.filter(p => !p.trashed);
              series = [
                { label: "Total Pages", value: activePages.length, color: "#3b82f6" },
                { label: "Favorites", value: activePages.filter(p => p.favorite).length, color: "#eab308" }
              ];
            }
          }
        }
        const PALETTE = ["var(--accent)", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#ef4444"];
        const coloredSeries = series.map((s, idx) => ({ ...s, color: s.color || PALETTE[idx % PALETTE.length] }));

        const chartTitle = params.title || `${targetPage.title} Analytics`;
        block = {
          id: uid(),
          type: chartType,
          text: chartTitle,
          chart: {
            title: chartTitle,
            unit: "",
            series: coloredSeries
          },
          properties: {
            title: chartTitle,
            data: params.data,
          }
        };
      }
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { blocks: [...targetPage.blocks, block] });
      } else {
        actions.appendBlocks([block]);
      }
      return { created: true, type: chartType, title: params.title || `${targetPage.title} Analytics` };
    }

    case "create_columns": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const count = Math.min(5, Math.max(2, Number(params.count) || 2));
      let cols: string[] = [];
      if (params.columns_content) {
        try {
          const parsed = JSON.parse(params.columns_content);
          if (Array.isArray(parsed)) cols = parsed.map(c => String(c));
        } catch {
          cols = String(params.columns_content).split("||").map(c => c.trim());
        }
      }
      while (cols.length < count) cols.push("");
      const block = blockFor(`${count}-columns`);
      const colors = Array.from({ length: count }, (_, i) => ["green", "blue", "orange", "purple", "yellow"][i % 5]);
      (block as any).columns = cols.map(c => [c]);
      (block as any).columnColors = colors;
      (block as any).properties = {
        columns: cols.map(c => [c]),
        columnColors: colors
      };
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { blocks: [...targetPage.blocks, block] });
      } else {
        actions.appendBlocks([block]);
      }
      return { count, columns: cols };
    }

    case "create_tabs": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      let tabList: Array<{ label: string; content: string }> = [];
      if (params.tabs) {
        try {
          const parsed = JSON.parse(params.tabs);
          if (Array.isArray(parsed)) {
            tabList = parsed.map((item: any) => ({
              label: String(item.label || item.title || "Tab"),
              content: String(item.content || "")
            }));
          }
        } catch {
          tabList = String(params.tabs).split(",").map(t => ({ label: t.trim(), content: "" })).filter(t => t.label);
        }
      }
      if (tabList.length === 0) {
        tabList = [{ label: "Tab 1", content: "" }, { label: "Tab 2", content: "" }];
      }
      const tabLabels = tabList.map(t => t.label);
      const block: Record<string, unknown> = {
        id: uid(),
        type: "tabs",
        text: "Tabs",
        tabs: tabLabels,
        activeTabIdx: 0,
        properties: {
          tabs: tabList.map(t => ({ id: uid(), label: t.label, content: t.content }))
        }
      };
      tabList.forEach((t, i) => {
        block[`tabContent_${i}`] = t.content;
      });
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { blocks: [...targetPage.blocks, block as unknown as Block] });
      } else {
        actions.appendBlocks([block as unknown as Block]);
      }
      return { tabCount: tabList.length, tabs: tabLabels };
    }

    case "create_interactive": {
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const code = String(params.code || "").trim();
      if (!code) {
        throw new Error("HTML code is required to create an interactive component. Provide valid HTML/CSS/JavaScript markup.");
      }
      const block = {
        id: uid(),
        type: "interactive",
        text: params.title || "Interactive Component",
        html: code,
        css: params.css || "",
        javascript: params.javascript || "",
        height: 380,
        properties: {
          title: params.title || "Interactive Component",
          code,
        }
      };
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { blocks: [...targetPage.blocks, block as unknown as Block] });
      } else {
        actions.appendBlocks([block as unknown as Block]);
      }
      return { created: true, title: params.title || "Interactive Component" };
    }

    case "export_page": {
      const target = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!target) throw new Error(`Page not found: "${params.page_id || "current"}"`);
      const format = String(params.format || "markdown").toLowerCase();
      const lines = target.blocks.map(b => b.text || "").filter(Boolean);
      let output = "";
      if (format === "html") {
        output = `<h1>${target.icon ? `${target.icon} ` : ""}${target.title}</h1>\n` +
          target.blocks.map(b => `<div data-type="${b.type}">${b.text || ""}</div>`).join("\n");
      } else {
        output = `# ${target.icon ? `${target.icon} ` : ""}${target.title}\n\n` + lines.join("\n\n");
      }
      return { pageId: target.id, title: target.title, format, length: output.length, content: output };
    }

    case "list_agents": {
      const { fetchAgents } = await import("../features/agents/agentStore");
      const agents = await fetchAgents();
      const statusFilter = params.status ? String(params.status).toLowerCase().trim() : "all";
      const filtered = statusFilter === "all" ? agents : agents.filter(a => a.status === statusFilter);
      return {
        count: filtered.length,
        agents: filtered.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          status: a.status,
          modelClass: a.modelClass,
          trigger: a.trigger,
          memoryMode: a.memoryMode,
          maxRunsPerHour: a.maxRunsPerHour,
          updatedAt: a.updatedAt,
        }))
      };
    }

    case "manage_agent": {
      const { fetchAgents, saveAgent, deleteAgentById, blankAgent } = await import("../features/agents/agentStore");
      const { listRuns } = await import("./runtime/runStore");
      const { defaultPermissions } = await import("./runtime/types");
      const action = String(params.action || "").toLowerCase().trim();
      const id = params.id ? String(params.id).trim() : undefined;
      const agents = await fetchAgents();

      if (action === "get") {
        if (!id) throw new Error("Agent id is required for 'get' action");
        const found = agents.find(a => a.id === id || a.name.toLowerCase() === id.toLowerCase());
        if (!found) throw new Error(`Agent not found: "${id}"`);
        return { agent: found };
      }

      if (action === "create") {
        const name = String(params.name || "").trim();
        if (!name) throw new Error("Agent name is required to create an agent");
        let parsedPermissions: any = undefined;
        if (params.permissions) {
          try { parsedPermissions = typeof params.permissions === "string" ? JSON.parse(params.permissions) : params.permissions; } catch {}
        }
        const trigger = parseTriggerSpec(params.trigger);
        const newAgent = blankAgent({
          name,
          description: params.description ? String(params.description).trim() : "",
          instructions: params.instructions ? String(params.instructions).trim() : "",
          icon: params.icon || "🤖",
          status: "active",
          modelClass: (["fast", "default", "reasoning"].includes(String(params.model_class)) ? params.model_class : "default") as any,
          trigger,
          permissions: parsedPermissions ? { ...defaultPermissions(), ...parsedPermissions } : defaultPermissions(),
          memoryMode: (["off", "run", "persistent"].includes(String(params.memory_mode)) ? params.memory_mode : "persistent") as any,
          maxRunsPerHour: typeof params.max_runs_per_hour === "number" ? params.max_runs_per_hour : 12,
        });
        const saved = await saveAgent(newAgent);
        return { created: true, id: saved.id, name: saved.name, status: saved.status, trigger: saved.trigger };
      }

      if (action === "update" || action === "pause" || action === "activate") {
        if (!id) throw new Error(`Agent id is required for '${action}' action`);
        const found = agents.find(a => a.id === id || a.name.toLowerCase() === id.toLowerCase());
        if (!found) throw new Error(`Agent not found: "${id}"`);

        // Check active executions to respect isolation and non-interruption
        const activeRuns = listRuns(50).filter(r => r.sourceId === found.id && r.status === "running");
        if (activeRuns.length > 0 && action === "pause") {
          throw new Error(`Cannot pause agent "${found.name}": it has an active execution in progress. Wait for it to complete to avoid interrupting other agents.`);
        }

        let newStatus = found.status;
        if (action === "pause") newStatus = "paused";
        if (action === "activate") newStatus = "active";

        let parsedPermissions = found.permissions;
        if (params.permissions) {
          try {
            const p = typeof params.permissions === "string" ? JSON.parse(params.permissions) : params.permissions;
            parsedPermissions = { ...found.permissions, ...p };
          } catch {}
        }

        const updated = await saveAgent({
          ...found,
          name: params.name ? String(params.name).trim() : found.name,
          description: params.description !== undefined ? String(params.description).trim() : found.description,
          instructions: params.instructions !== undefined ? String(params.instructions).trim() : found.instructions,
          icon: params.icon || found.icon,
          status: newStatus,
          trigger: params.trigger ? parseTriggerSpec(params.trigger) : found.trigger,
          modelClass: params.model_class && ["fast", "default", "reasoning"].includes(params.model_class) ? params.model_class as any : found.modelClass,
          permissions: parsedPermissions,
          memoryMode: params.memory_mode && ["off", "run", "persistent"].includes(params.memory_mode) ? params.memory_mode as any : found.memoryMode,
          maxRunsPerHour: typeof params.max_runs_per_hour === "number" ? params.max_runs_per_hour : found.maxRunsPerHour,
        });
        return { updated: true, id: updated.id, name: updated.name, status: updated.status, trigger: updated.trigger };
      }

      if (action === "delete") {
        if (!id) throw new Error("Agent id is required for 'delete' action");
        const found = agents.find(a => a.id === id || a.name.toLowerCase() === id.toLowerCase());
        if (!found) throw new Error(`Agent not found: "${id}"`);
        const activeRuns = listRuns(50).filter(r => r.sourceId === found.id && r.status === "running");
        if (activeRuns.length > 0) {
          throw new Error(`Cannot delete agent "${found.name}": it has an active execution in progress. Wait for it to complete.`);
        }
        await deleteAgentById(found.id);
        return { deleted: true, id: found.id, name: found.name };
      }

      throw new Error(`Unknown action "${action}" for manage_agent. Valid actions: 'create', 'update', 'delete', 'get', 'pause', 'activate'`);
    }

    case "list_automations": {
      const { fetchAutomations } = await import("../features/automations/automationStore");
      const list = await fetchAutomations();
      const statusFilter = params.status ? String(params.status).toLowerCase().trim() : "all";
      const filtered = statusFilter === "all" ? list : list.filter(a => a.status === statusFilter);
      return {
        count: filtered.length,
        automations: filtered.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          status: a.status,
          trigger: a.trigger,
          stepCount: a.steps.length,
          health: a.health,
          runCount: a.runCount,
          lastRunAt: a.lastRunAt,
          nextRunAt: a.nextRunAt,
          timezone: a.timezone,
        }))
      };
    }

    case "manage_automation": {
      const { fetchAutomations, saveAutomation, deleteAutomationById, blankAutomation, noteAutomationRan } = await import("../features/automations/automationStore");
      const { listRuns } = await import("./runtime/runStore");
      const action = String(params.action || "").toLowerCase().trim();
      const id = params.id ? String(params.id).trim() : undefined;
      const automations = await fetchAutomations();

      if (action === "get") {
        if (!id) throw new Error("Automation id is required for 'get' action");
        const found = automations.find(a => a.id === id || a.name.toLowerCase() === id.toLowerCase());
        if (!found) throw new Error(`Automation not found: "${id}"`);
        return { automation: found };
      }

      if (action === "create") {
        const name = String(params.name || "").trim();
        if (!name) throw new Error("Automation name is required to create an automation");
        let steps: any[] = [];
        if (params.steps) {
          try {
            steps = typeof params.steps === "string" ? JSON.parse(params.steps) : params.steps;
          } catch {
            steps = String(params.steps).split("\n").filter(Boolean).map((line) => ({
              id: uid(),
              label: line.trim(),
              kind: "ai_step",
              instruction: line.trim()
            }));
          }
        }
        const trigger = parseTriggerSpec(params.trigger);
        const newAuto = blankAutomation({
          name,
          description: params.description ? String(params.description).trim() : "",
          icon: params.icon || "⚡",
          status: "active",
          trigger,
          steps,
          timezone: params.timezone ? String(params.timezone).trim() : (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"),
        });
        const saved = await saveAutomation(newAuto);
        return { created: true, id: saved.id, name: saved.name, status: saved.status, trigger: saved.trigger, stepCount: saved.steps.length };
      }

      if (action === "update" || action === "pause" || action === "activate") {
        if (!id) throw new Error(`Automation id is required for '${action}' action`);
        const found = automations.find(a => a.id === id || a.name.toLowerCase() === id.toLowerCase());
        if (!found) throw new Error(`Automation not found: "${id}"`);

        const activeRuns = listRuns(50).filter(r => r.sourceId === found.id && r.status === "running");
        if (activeRuns.length > 0 && action === "pause") {
          throw new Error(`Cannot pause automation "${found.name}": it has an active execution run in progress. Wait for completion.`);
        }

        let newStatus = found.status;
        if (action === "pause") newStatus = "paused";
        if (action === "activate") newStatus = "active";

        let steps = found.steps;
        if (params.steps) {
          try {
            steps = typeof params.steps === "string" ? JSON.parse(params.steps) : params.steps;
          } catch {
            steps = String(params.steps).split("\n").filter(Boolean).map((line) => ({
              id: uid(),
              label: line.trim(),
              kind: "ai_step",
              instruction: line.trim()
            }));
          }
        }

        const updated = await saveAutomation({
          ...found,
          name: params.name ? String(params.name).trim() : found.name,
          description: params.description !== undefined ? String(params.description).trim() : found.description,
          icon: params.icon || found.icon,
          status: newStatus,
          trigger: params.trigger ? parseTriggerSpec(params.trigger) : found.trigger,
          steps,
          timezone: params.timezone ? String(params.timezone).trim() : found.timezone,
        });
        return { updated: true, id: updated.id, name: updated.name, status: updated.status, trigger: updated.trigger, stepCount: updated.steps.length };
      }

      if (action === "delete") {
        if (!id) throw new Error("Automation id is required for 'delete' action");
        const found = automations.find(a => a.id === id || a.name.toLowerCase() === id.toLowerCase());
        if (!found) throw new Error(`Automation not found: "${id}"`);
        const activeRuns = listRuns(50).filter(r => r.sourceId === found.id && r.status === "running");
        if (activeRuns.length > 0) {
          throw new Error(`Cannot delete automation "${found.name}": an execution is currently running.`);
        }
        await deleteAutomationById(found.id);
        return { deleted: true, id: found.id, name: found.name };
      }

      if (action === "trigger") {
        if (!id) throw new Error("Automation id is required for 'trigger' action");
        const found = automations.find(a => a.id === id || a.name.toLowerCase() === id.toLowerCase());
        if (!found) throw new Error(`Automation not found: "${id}"`);
        await noteAutomationRan(found.id);
        return { triggered: true, id: found.id, name: found.name, timestamp: new Date().toISOString() };
      }

      throw new Error(`Unknown action "${action}" for manage_automation. Valid actions: 'create', 'update', 'delete', 'get', 'pause', 'activate', 'trigger'`);
    }

    case "monitor_runs": {
      const { listRuns } = await import("./runtime/runStore");
      const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
      let runs = listRuns(limit);
      if (params.source_id) {
        runs = runs.filter(r => r.sourceId === params.source_id);
      }
      if (params.source_kind) {
        runs = runs.filter(r => r.sourceKind === params.source_kind);
      }
      if (params.status) {
        runs = runs.filter(r => r.status === params.status);
      }
      return {
        count: runs.length,
        runs: runs.map(r => ({
          id: r.id,
          sourceId: r.sourceId,
          sourceKind: r.sourceKind,
          trigger: r.trigger,
          status: r.status,
          durationMs: r.durationMs,
          startedAt: r.startedAt,
          finishedAt: r.finishedAt,
          stepCount: r.steps?.length || 0,
          errors: r.errors || [],
          affectedResources: r.affectedResources || [],
        }))
      };
    }

    default:
      throw new Error(`Unknown tool: "${name}"`);
  }
}

// ─── send_notification / create_flashcards ────────────────────────────────
// Executed here rather than the main switch: notification needs Supabase,
// flashcards reuse the canonical study-card factories from studyCards.ts
// so agent-made cards are identical to AI-generated/manual ones.

async function executeSendNotification(params, context) {
  void context;
  const { supabase, getAuthUserId } = await import('../lib/supabase');
  const userId = await getAuthUserId();
  if (!userId) throw new Error("You must be signed in to send notifications");
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type: 'ai_agent',
    title: String(params.title || 'Notification').slice(0, 120),
    message: String(params.message || '').slice(0, 500),
    category: 'agent',
    source: 'noska-intelligence',
    status: 'unread',
    action_url: params.action_url ? String(params.action_url).slice(0, 300) : null,
  });
  if (error) throw new Error(`Couldn't deliver the notification: ${error.message}`);
  return { delivered: true, title: params.title };
}

/**
 * create_flashcards — builds REAL spaced-repetition study cards
 * (study.answer + review scheduling state) so they render as proper
 * flip-cards, appear in the Spaced Repetition dashboard and count toward
 * Home's due reviews — instead of raw "Q:"-"/A:" text pairs.
 */
async function executeCreateFlashcards(params, context) {
  const { currentPage, pages, actions } = context;
  let cardsRaw = params.cards;
  if (typeof cardsRaw === 'string') {
    try { cardsRaw = JSON.parse(cardsRaw); } catch { throw new Error('cards must be a JSON array of {front, answer}'); }
  }
  if (!Array.isArray(cardsRaw) || cardsRaw.length === 0) throw new Error('cards must be a non-empty array');
  const cards: GeneratedCard[] = (cardsRaw as Array<Record<string, unknown>>)
    .slice(0, 20)
    .map((c) => ({
      type: 'question' as const,
      front: String(c.front ?? c.question ?? '').trim(),
      answer: String(c.answer ?? '').trim(),
    }))
    .filter((c) => c.front && c.answer);
  if (cards.length === 0) throw new Error('no valid cards after parsing');

  // Resolve target page: explicit id/title match, else current page.
  const pid = params.page_id ? String(params.page_id) : '';
  const targetPage =
    (pid && pid !== 'current'
      ? pages.find((p) => p.id === pid && !p.trashed) ||
        pages.find((p) => !p.trashed && p.title && p.title.toLowerCase().includes(pid.toLowerCase()))
      : null) ||
    currentPage ||
    pages.find((p) => !p.trashed);
  if (!targetPage) throw new Error(`Target page not found: "${pid || 'current'}"`);

  const heading = params.heading ? String(params.heading) : 'Study Cards';
  const section = StudyCardsNS.studySectionBlocks(cards);
  if (section[0]) section[0].text = heading;

  if (targetPage.id !== currentPage?.id) {
    actions.updateAnyPage(targetPage.id, { blocks: [...(targetPage.blocks || []), ...section] });
  } else {
    actions.appendBlocks(section);
  }
  return { count: cards.length, page: targetPage.title, fronts: cards.map((c) => c.front.slice(0, 60)) };
}

export { DEFINITIONS as TOOL_DEFINITIONS };

/**
 * Tool definitions as provider-native function schemas (JSON Schema).
 * Used for native function calling — the runtime still parses the
 * <<TOOL:name>> text protocol as a fallback, and native tool_calls are
 * serialized back into that protocol, so both paths converge.
 */
function jsonSchemaType(type: string): string {
  return ["number", "integer", "boolean", "object", "array"].includes(type) ? type : "string";
}

export function getToolSchemas(options: { imageGeneration?: boolean } = {}) {
  const definitions = DEFINITIONS.filter((d) => d.name !== "image_generate" || options.imageGeneration !== false);
  const schemas = definitions.map((d) => ({
    name: d.name,
    description: d.description,
    parameters: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(d.params).map(([key, spec]) => [
          key,
          { type: jsonSchemaType(spec.type), description: spec.desc },
        ])
      ),
      required: Object.entries(d.params).filter(([, spec]) => spec.required).map(([key]) => key),
    },
  }));
  const integrationSchemas = getIntegrationToolDefinitions().map((d) => ({
    name: d.name,
    description: d.description,
    parameters: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(d.params).map(([key, spec]) => [
          key,
          { type: jsonSchemaType(spec.type), description: spec.desc },
        ])
      ),
      required: Object.entries(d.params).filter(([, spec]) => spec.required).map(([key]) => key),
    },
  }));
  return [...schemas, ...integrationSchemas];
}
