import { uid, textToBlocks, now, plainText } from '../utils/helpers';
import { setMemory, getMemory } from './memory.js';
import { saveUserPreference, saveUserFact } from './userProfile.js';
import { getBacklinks, getOutgoingLinks } from '../utils/pageLinks';

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
    description: "Rename the current page",
    params: {
      title: { type: "string", desc: "New page title", required: true }
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
    description: "Set tags on the current page",
    params: {
      tags: { type: "string", desc: "Comma-separated tags", required: true }
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
  }
];

function validateParams(name, params) {
  const def = DEFINITIONS.find(d => d.name === name);
  if (!def) throw new Error(`Unknown tool: "${name}"`);
  for (const [key, spec] of Object.entries(def.params)) {
    if (spec.required && (params[key] === undefined || params[key] === null || params[key] === '')) {
      throw new Error(`Missing required parameter "${key}" for tool "${name}"`);
    }
  }
}

export function getToolInstructions() {
  const lines = [
    "---",
    "## Available Tools",
    "You have tools to modify the workspace. ALWAYS use them instead of describing actions.",
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
    "2. The tool block will be automatically removed from what the user sees — you do NOT need to hide it yourself",
    "3. Write the tool block FIRST, then your summary text",
    "4. Never describe what you would do — just do it with the tool",
    "5. If no tool exists for the request, say so honestly",
    "",
    "### Content Tips (make pages beautiful)",
    "- Use headings (# ## ###) for structure",
    "- Add emojis in content text for visual appeal 🎨 ✨ 🚀",
    "- Use callout blocks for important notes: > 💡 Tip text here",
    "- Use dividers (---) to separate sections",
    "- Mix bullet lists (-), numbered lists (1. 2.), and todos (- [ ])",
    "- Use code blocks (```) for technical content",
    "- Add toggles (<details>) for collapsible sections",
    "",
    "### Tool Reference",
    "Use this format: <<TOOL:tool_name>>{\"param\":\"value\"}<</TOOL>>",
    "",
    "Example: <<TOOL:append_blocks>>{\"content\":\"## 🚀 AI Content\\n\\n- Feature one\\n- Feature two\\n- [ ] Task pending\\n\\n> 💡 Pro tip here\\n\\n---\\n\\n### More details\\n\\nFinal paragraph.\",\"page_id\":\"current\"}<</TOOL>>",
    "Example: <<TOOL:set_page_icon>>{\"icon\":\"🚀\"}<</TOOL>>",
    "Example: <<TOOL:create_page>>{\"title\":\"Meeting Notes\",\"icon\":\"📝\",\"content\":\"# Notes\\n\\n- [ ] Follow up\"}<</TOOL>>",
    "Example: <<TOOL:rename_page>>{\"title\":\"New Title\"}<</TOOL>>",
    "Example: <<TOOL:search_pages>>{\"query\":\"AI\"}<</TOOL>>",
    "",
  ];
  for (const def of DEFINITIONS) {
    const params = Object.entries(def.params)
      .map(([key, spec]) => `\`${key}\`${spec.required ? " (required)" : ""}: ${spec.desc}`)
      .join(", ");
    lines.push(`- **${def.name}**: ${def.description} ${params ? `— ${params}` : ""}`);
  }
  const capabilities = getCapabilities();
  lines.push("");
  lines.push("### Capability Status");
  for (const cap of capabilities) {
    lines.push(`- ${cap.status} **${cap.name}**: ${cap.description}`);
  }
  lines.push("---");
  return lines.join("\n");
}

export function getCapabilities() {
  return [
    { name: "Page Management", description: "Create, rename, organize pages", status: "✓" },
    { name: "Rich Content Editing", description: "Headings, bullets, numbers, todos, quotes, code blocks, dividers, callouts, toggles", status: "✓" },
    { name: "Emoji & Icons", description: "Set page icons, use emojis in content", status: "✓" },
    { name: "Favorites", description: "Mark/unmark pages as favorites", status: "✓" },
    { name: "Trash Management", description: "Trash, restore, and list trashed pages", status: "✓" },
    { name: "Duplicate Pages", description: "Copy pages with all content and tags", status: "✓" },
    { name: "Search & Discovery", description: "Search pages, list all pages, get page content", status: "✓" },
    { name: "Batch Tagging", description: "Add/remove/set tags on multiple pages at once", status: "✓" },
    { name: "Tag System", description: "Set and manage page tags", status: "✓" },
    { name: "Todo Management", description: "Add and manage todo items", status: "✓" },
    { name: "Page Hierarchy", description: "Move pages, navigate parent/children/backlinks", status: "✓" },
    { name: "Page Templates", description: "Create pages from pre-built templates (meeting, project, weekly, habit, journal, notes)", status: "✓" },
    { name: "Page Analysis", description: "Analyze pages for quality, structure, completeness, and suggest improvements", status: "✓" },
    { name: "Page History", description: "View page edit lineage and change log", status: "✓" },
    { name: "Page Styling", description: "Set page covers, icons, and organize sections", status: "✓" },
    { name: "User Learning", description: "Remembers your style, preferences, likes, dislikes, and adapts over time", status: "✓" },
    { name: "Workspace Stats", description: "Page counts, tag distribution, favorites", status: "✓" },
    { name: "Undo Support", description: "Undo the last AI action", status: "✓" },
    { name: "Real-time Collaboration", description: "Multi-user editing with presence", status: "⚠" },
    { name: "Audit Trail", description: "Action history and change tracking", status: "⚠" },
    { name: "External Search", description: "Web search and external data access", status: "✕" },
    { name: "File Uploads", description: "Upload and process files", status: "✕" },
    { name: "Email Integration", description: "Send or read emails from workspace", status: "✕" },
    { name: "Calendar Integration", description: "Access calendar events", status: "✕" }
  ];
}

function tryParseToolJSON(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const fixed = raw
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    try {
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

export function parseToolCalls(text) {
  const calls = [];
  let match;
  const regex = new RegExp(TOOL_PATTERN.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    const params = tryParseToolJSON(match[2].trim()) || {};
    calls.push({ name: match[1], params, raw: match[0] });
  }
  return calls;
}

export function stripToolCalls(text) {
  return text.replace(new RegExp(TOOL_SOURCE, 'g'), '').trim();
}

export function hasToolCalls(text) {
  return new RegExp(TOOL_SOURCE, 'g').test(text);
}

export async function executeAllToolCalls(text, context) {
  const calls = parseToolCalls(text);
  const results = [];
  for (const call of calls) {
    try {
      validateParams(call.name, call.params);
      const result = await executeTool(call.name, call.params, context);
      results.push({ name: call.name, ok: true, result, params: call.params });
    } catch (err) {
      results.push({ name: call.name, ok: false, error: err.message, params: call.params });
    }
  }
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

async function executeTool(name, params, context) {
  const { currentPage, pages, actions } = context;

  switch (name) {
    case "create_page": {
      const id = actions.createPage(params.title, params.icon || "📝", params.content, params.tags);
      return { pageId: id, title: params.title };
    }

    case "rename_page": {
      actions.renamePage(params.title);
      return { title: params.title };
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
      const block = { id: uid(), type: "todo", text: params.text, checked: false };
      const targetPage = findPageByIdOrTitle(params.page_id, pages, currentPage);
      if (!targetPage) throw new Error(`Page not found: "${params.page_id}"`);
      if (targetPage.id !== currentPage?.id) {
        actions.updateAnyPage(targetPage.id, { blocks: [...targetPage.blocks, block] });
      } else {
        actions.appendBlocks([block]);
      }
      return { text: params.text };
    }

    case "search_pages": {
      const q = params.query.toLowerCase();
      const matches = pages
        .filter(p => !p.trashed && (
          p.title.toLowerCase().includes(q) ||
          p.tags?.some(t => t.toLowerCase().includes(q)) ||
          (p.blocks || []).some(b => (b.text || '').toLowerCase().includes(q))
        ))
        .map(p => ({ id: p.id, title: p.title, icon: p.icon, tags: p.tags }));
      return { count: matches.length, results: matches };
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
      const tags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
      actions.setPageTags(tags);
      return { tags };
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
      const block = { id: uid(), type: params.type || "text", text: params.text };
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
      const tagCounts = {};
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
      return { capabilities: getCapabilities() };
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
      const prefs = {};
      const facts = [];
      for (const [key, val] of Object.entries(mem)) {
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

    default:
      throw new Error(`Unknown tool: "${name}"`);
  }
}

export { DEFINITIONS as TOOL_DEFINITIONS };
