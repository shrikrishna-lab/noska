import type { Page } from "../../../lib/supabaseService";
import type { Block } from "../../../../types/blocks";
import type {
  PagePreviewModel,
  PageEntityType,
  PreviewType,
  PagePreviewMetadata,
  PagePreviewStats,
  NavigationChildItem,
  NavigationTreeItem
} from "./types";
import { timeAgo } from "../../../utils/helpers";

// In-memory cache for extracted previews
const previewCache = new Map<string, { model: PagePreviewModel; version: string }>();

/**
 * Infer entity type from page title, blocks, properties, tags, or child structures
 */
export function inferPageEntityType(page: Page, children: Page[] = []): PageEntityType {
  const title = (page.title || "").toLowerCase();
  const blocks = page.blocks || [];

  // 1. Folder / Group
  if (children.length > 0 && blocks.length <= 1) {
    return "folder";
  }

  // 2. Database
  const hasDatabase = blocks.some((b) => b.type === "database" || b.type === "table" || b.type === "board" || b.type === "kanban");
  if (hasDatabase || title.includes("database") || title.includes("tracker") || title.includes("roadmap")) {
    return "database";
  }

  // 3. Task
  const hasTodo = blocks.some((b) => b.type === "todo" || b.type === "task" || b.type === "checklist");
  if (title.startsWith("task:") || title.startsWith("todo:") || (hasTodo && blocks.length < 5)) {
    return "task";
  }

  // 4. Project
  if (
    title.includes("project") ||
    title.includes("redesign") ||
    title.includes("initiative") ||
    title.includes("sprint") ||
    (hasTodo && children.length > 0)
  ) {
    return "project";
  }

  // 5. Document
  if (blocks.length >= 3 || title.includes("doc") || title.includes("spec") || title.includes("guide") || title.includes("notes")) {
    return "document";
  }

  return "page";
}

/**
 * Extract meaningful in-page content sections (Headings, Code, Callout, Task, Database, AI, Quote, Toggle, Image) from an active page
 */
export function extractPageContentSections(page: Page): NavigationTreeItem[] {
  if (!page || !page.blocks || page.blocks.length === 0) return [];

  const sections: NavigationTreeItem[] = [];

  page.blocks.forEach((b) => {
    const props = (b.properties as Record<string, unknown> | undefined) || {};
    const text = (b.text || props.text || props.title || "").toString().trim();
    const type = (b.type || "text").toLowerCase();

    // Skip blank text blocks or pure dividers
    if ((type === "text" || type === "paragraph" || type === "p") && !text) return;
    if (type === "divider" || type === "hr" || type === "spacer") return;

    // 1. Headings (H1, H2, H3, H4, Header)
    if (type === "h1" || type === "header" || type === "heading-1") {
      const raw = text.replace(/^[#*-]\s+/, "").trim() || "Heading 1";
      sections.push({
        id: `${page.id}:block:${b.id}`,
        title: raw,
        parentId: page.id,
        type: "heading",
        depth: 1,
        isContentSection: true,
        blockId: b.id,
        commandTag: "/h1",
        snippet: text,
        children: [],
        rawPage: page,
        rawBlock: b,
      });
      return;
    }

    if (type === "h2" || type === "heading-2") {
      const raw = text.replace(/^[#*-]\s+/, "").trim() || "Heading 2";
      sections.push({
        id: `${page.id}:block:${b.id}`,
        title: raw,
        parentId: page.id,
        type: "heading",
        depth: 2,
        isContentSection: true,
        blockId: b.id,
        commandTag: "/h2",
        snippet: text,
        children: [],
        rawPage: page,
        rawBlock: b,
      });
      return;
    }

    if (type === "h3" || type === "heading-3" || type === "h4") {
      const raw = text.replace(/^[#*-]\s+/, "").trim() || "Heading 3";
      sections.push({
        id: `${page.id}:block:${b.id}`,
        title: raw,
        parentId: page.id,
        type: "heading",
        depth: 3,
        isContentSection: true,
        blockId: b.id,
        commandTag: type === "h4" ? "/h4" : "/h3",
        snippet: text,
        children: [],
        rawPage: page,
        rawBlock: b,
      });
      return;
    }

    // 2. Code blocks
    if (type === "code" || type === "codeblock") {
      const lang = (props.language as string) || "code";
      sections.push({
        id: `${page.id}:block:${b.id}`,
        title: `Code (${lang})`,
        parentId: page.id,
        type: "code",
        depth: 2,
        isContentSection: true,
        blockId: b.id,
        commandTag: "/code",
        snippet: text.slice(0, 160) || "// Code snippet",
        children: [],
        rawPage: page,
        rawBlock: b,
      });
      return;
    }

    // 3. Callout blocks
    if (type === "callout" || type === "alert" || type === "note") {
      const icon = (props.icon as string) || "💡";
      sections.push({
        id: `${page.id}:block:${b.id}`,
        title: `${icon} Callout`,
        parentId: page.id,
        type: "callout",
        depth: 2,
        isContentSection: true,
        blockId: b.id,
        commandTag: "/callout",
        snippet: text.slice(0, 140) || "Callout note",
        children: [],
        rawPage: page,
        rawBlock: b,
      });
      return;
    }

    // 4. Tasks / Todos
    if (type === "todo" || type === "task" || type === "checklist") {
      const checked = Boolean(props.checked || b.checked);
      sections.push({
        id: `${page.id}:block:${b.id}`,
        title: `${checked ? "☑" : "☐"} ${text.slice(0, 45) || "Task"}`,
        parentId: page.id,
        type: "task",
        depth: 2,
        isContentSection: true,
        blockId: b.id,
        commandTag: "/todo",
        snippet: text,
        children: [],
        rawPage: page,
        rawBlock: b,
      });
      return;
    }

    // 5. Databases / Tables
    if (type === "table" || type === "database" || type === "board" || type === "kanban") {
      const dbTitle = (props.title as string) || text || "Database View";
      sections.push({
        id: `${page.id}:block:${b.id}`,
        title: `⊞ ${dbTitle}`,
        parentId: page.id,
        type: "database",
        depth: 1,
        isContentSection: true,
        blockId: b.id,
        commandTag: `/${type}`,
        snippet: `Interactive ${type} data view`,
        children: [],
        rawPage: page,
        rawBlock: b,
      });
      return;
    }

    // 6. AI blocks
    if (type === "ai" || type === "prompt" || type === "agent") {
      sections.push({
        id: `${page.id}:block:${b.id}`,
        title: `✦ AI Workspace`,
        parentId: page.id,
        type: "ai",
        depth: 2,
        isContentSection: true,
        blockId: b.id,
        commandTag: "/ai",
        snippet: text.slice(0, 160) || "AI generation prompt",
        children: [],
        rawPage: page,
        rawBlock: b,
      });
      return;
    }

    // 7. Quotes
    if (type === "quote" || type === "blockquote") {
      sections.push({
        id: `${page.id}:block:${b.id}`,
        title: `❝ ${text.slice(0, 40) || "Quote"}`,
        parentId: page.id,
        type: "document",
        depth: 2,
        isContentSection: true,
        blockId: b.id,
        commandTag: "/quote",
        snippet: text,
        children: [],
        rawPage: page,
        rawBlock: b,
      });
      return;
    }

    // 8. Toggles
    if (type === "toggle" || type === "accordion") {
      sections.push({
        id: `${page.id}:block:${b.id}`,
        title: `▾ ${text.slice(0, 40) || "Toggle"}`,
        parentId: page.id,
        type: "folder",
        depth: 2,
        isContentSection: true,
        blockId: b.id,
        commandTag: "/toggle",
        snippet: text,
        children: [],
        rawPage: page,
        rawBlock: b,
      });
      return;
    }

    // 9. In-page Sub-page block
    if (type === "page" || type === "subpage" || type === "link-to-page") {
      const pageTitle = (props.title as string) || text || "Sub-page";
      sections.push({
        id: `${page.id}:block:${b.id}`,
        title: `📄 ${pageTitle}`,
        parentId: page.id,
        type: "page",
        depth: 1,
        isContentSection: true,
        blockId: b.id,
        commandTag: "/page",
        snippet: `Sub-page: ${pageTitle}`,
        children: [],
        rawPage: page,
        rawBlock: b,
      });
      return;
    }

    // 10. Meaningful Text paragraph (if long enough to form a content section)
    if ((type === "text" || type === "paragraph" || type === "p") && text.length > 35) {
      sections.push({
        id: `${page.id}:block:${b.id}`,
        title: text.slice(0, 36) + "...",
        parentId: page.id,
        type: "document",
        depth: 2,
        isContentSection: true,
        blockId: b.id,
        commandTag: "/text",
        snippet: text,
        children: [],
        rawPage: page,
        rawBlock: b,
      });
      return;
    }
  });

  return sections;
}

/**
 * Build a structured NavigationTree strictly focused on the current active page content and its child sub-pages
 */
export function buildNavigationTree(pages: Page[], activeId: string | null = null): NavigationTreeItem[] {
  const validPages = pages.filter((p) => !p.trashed);
  if (validPages.length === 0) return [];

  // Determine current active page
  let activePage = activeId ? validPages.find((p) => p.id === activeId) : null;
  if (!activePage) {
    activePage = validPages[0];
  }

  if (activePage) {
    // Recursive function to build nested sub-page hierarchy
    const buildSubpageTree = (parentId: string, depth: number): NavigationTreeItem[] => {
      const childPages = validPages.filter((p) => p.parentId === parentId);
      return childPages.map((child) => {
        const grandChildren = buildSubpageTree(child.id, depth + 1);
        const childInPageSections = extractPageContentSections(child);
        return {
          id: child.id,
          title: child.title || "Untitled Sub-page",
          parentId: parentId,
          type: inferPageEntityType(child, validPages.filter((p) => p.parentId === child.id)),
          icon: child.icon || undefined,
          route: `/page/${child.id}`,
          depth,
          children: [...childInPageSections, ...grandChildren],
          rawPage: child,
        };
      });
    };

    const inPageSections = extractPageContentSections(activePage);
    const childPageItems = buildSubpageTree(activePage.id, 1);

    // Root item is ONLY the current active document with its sections & child sub-pages
    const parentOfActive = activePage.parentId ? validPages.find((p) => p.id === activePage.parentId) : undefined;
    const activeTreeItem: NavigationTreeItem = {
      id: activePage.id,
      title: activePage.title || "Untitled Document",
      parentId: activePage.parentId || null,
      parentTitle: parentOfActive?.title,
      type: inferPageEntityType(activePage, validPages.filter((p) => p.parentId === activePage.id)),
      icon: activePage.icon || undefined,
      route: `/page/${activePage.id}`,
      depth: 0,
      isParentPage: childPageItems.length > 0,
      children: [...inPageSections, ...childPageItems],
      rawPage: activePage,
    };

    return [activeTreeItem];
  }

  return [];
}

/**
 * Formats any raw block or text into a rich preview line (e.g. bullets, tasks, quotes, code, commands)
 */
export function formatBlockToPreviewLine(b: Block, listIndex?: number): string | null {
  const props = (b.properties as Record<string, unknown> | undefined) || {};
  const text = (b.text || props.text || props.title || props.value || "").toString().trim();
  const type = (b.type || "text").toLowerCase();

  if (type === "divider" || type === "hr" || type === "spacer") return null;

  // 1. Bullets / Lists
  if (type === "bullet" || type === "bulleted-list" || type === "bullet_list" || type === "ul" || type === "list") {
    const clean = text.replace(/^[-*•]\s*/, "");
    return `• ${clean || "List item"}`;
  }

  // 2. Numbered / Ordered Lists
  if (type === "numbered-list" || type === "ordered-list" || type === "numbered_list" || type === "ol") {
    const clean = text.replace(/^\d+[\.\)]\s*/, "");
    const num = listIndex !== undefined ? listIndex + 1 : 1;
    return `${num}. ${clean || "Item"}`;
  }

  // 3. To-Do / Checklists
  if (type === "todo" || type === "task" || type === "checklist") {
    const isChecked = Boolean(props.checked || b.checked || text.startsWith("[x]") || text.startsWith("[X]"));
    const clean = text.replace(/^\[[ xX]\]\s*/, "");
    return `${isChecked ? "☑" : "☐"} ${clean || "Task"}`;
  }

  // 4. Quotes / Blockquotes
  if (type === "quote" || type === "blockquote") {
    const clean = text.replace(/^>\s*/, "");
    return `❝ ${clean || "Quote"}`;
  }

  // 5. Callouts
  if (type === "callout" || type === "alert" || type === "note") {
    const icon = (props.icon as string) || "💡";
    return `${icon} ${text || "Callout"}`;
  }

  // 6. Code blocks
  if (type === "code" || type === "codeblock") {
    const lang = (props.language as string) || "";
    return `⌨ ${lang ? `[${lang}] ` : ""}${text.split("\n")[0] || "Code snippet"}`;
  }

  // 7. Toggles
  if (type === "toggle" || type === "details" || type === "accordion") {
    return `▾ ${text || "Toggle"}`;
  }

  // 8. Table / Database
  if (type === "table" || type === "database" || type === "board" || type === "kanban") {
    const title = (props.title as string) || text || "Database View";
    return `⊞ ${title}`;
  }

  // 9. AI Workspace
  if (type === "ai" || type === "prompt" || type === "agent") {
    return `✦ AI: ${text || "Prompt"}`;
  }

  // 10. Images & Attachments
  if (type === "image") {
    return `🖼 Image${props.caption ? `: ${props.caption}` : ""}`;
  }
  if (type === "file" || type === "attachment" || type === "pdf") {
    return `📎 File: ${props.name || props.title || text || "Attachment"}`;
  }

  // 11. Headings (when inside subsequent content)
  if (type === "h1" || type === "header" || type === "heading-1") {
    return `H1 ${text.replace(/^[#*-]\s+/, "")}`;
  }
  if (type === "h2" || type === "heading-2") {
    return `H2 ${text.replace(/^[#*-]\s+/, "")}`;
  }
  if (type === "h3" || type === "heading-3" || type === "h4") {
    return `H3 ${text.replace(/^[#*-]\s+/, "")}`;
  }

  // 12. Standard Paragraph / Markdown syntax
  if (text.startsWith("- ") || text.startsWith("* ")) {
    return `• ${text.slice(2).trim()}`;
  }
  if (/^\d+\.\s/.test(text)) {
    return text;
  }
  if (text.startsWith("[ ] ")) {
    return `☐ ${text.slice(4).trim()}`;
  }
  if (text.startsWith("[x] ") || text.startsWith("[X] ")) {
    return `☑ ${text.slice(4).trim()}`;
  }
  if (text.startsWith("> ")) {
    return `❝ ${text.slice(2).trim()}`;
  }

  return text || null;
}

/**
 * Deterministically extracts a clean PagePreviewModel from actual page or in-page block
 */
export function generatePagePreview(page: Page, allPages: Page[] = [], block?: Block): PagePreviewModel {
  if (!page) {
    return {
      pageId: "unknown",
      title: "Unknown Page",
      type: "page",
      previewType: "simple",
      fallbackLevel: 5,
    };
  }

  // 1. If inspecting a specific IN-PAGE BLOCK / CONTENT SECTION
  if (block) {
    const props = (block.properties as Record<string, unknown> | undefined) || {};
    const text = (block.text || props.text || props.title || "").toString().trim();
    const type = (block.type || "text").toLowerCase();
    const charCount = text.length;
    const wordCount = text ? text.split(/\s+/).length : 0;

    let previewType: PreviewType = "simple";
    let entityType: PageEntityType = "section";
    let commandTag = `/${type}`;
    let description: string | undefined = text;
    let snippet: string | undefined = text;

    if (type.startsWith("h") || type === "header" || type.startsWith("heading")) {
      previewType = "heading";
      entityType = "heading";
      commandTag = type === "h1" || type === "header" ? "/h1" : type === "h2" ? "/h2" : type === "h3" ? "/h3" : "/h4";

      // Extract subsequent content paragraphs under this heading
      const blockIndex = page.blocks?.findIndex((b) => b.id === block.id) ?? -1;
      if (blockIndex !== -1 && page.blocks) {
        const subsequentLines: string[] = [];
        let listCount = 0;
        for (let i = blockIndex + 1; i < page.blocks.length; i++) {
          const nextB = page.blocks[i];
          const nextType = (nextB.type || "text").toLowerCase();
          // Stop at next heading
          if (nextType.startsWith("h") || nextType === "header" || nextType.startsWith("heading")) {
            break;
          }
          const formatted = formatBlockToPreviewLine(nextB, listCount);
          if (formatted) {
            subsequentLines.push(formatted);
            listCount++;
            if (subsequentLines.length >= 4) break;
          }
        }
        if (subsequentLines.length > 0) {
          description = subsequentLines.join("\n");
          snippet = description;
        } else {
          // No content under heading; do not repeat heading title
          description = undefined;
          snippet = undefined;
        }
      } else {
        description = undefined;
        snippet = undefined;
      }
    } else if (type === "code" || type === "codeblock") {
      previewType = "code";
      entityType = "code";
      commandTag = "/code";
    } else if (type === "callout" || type === "alert" || type === "note") {
      previewType = "callout";
      entityType = "callout";
      commandTag = "/callout";
    } else if (type === "todo" || type === "task" || type === "checklist") {
      previewType = "task";
      entityType = "task";
      commandTag = "/todo";
    } else if (type === "table" || type === "database" || type === "board" || type === "kanban") {
      previewType = "database";
      entityType = "database";
      commandTag = `/${type}`;
    } else if (type === "ai" || type === "prompt" || type === "agent") {
      previewType = "ai";
      entityType = "ai";
      commandTag = "/ai";
    } else if (type === "page" || type === "subpage" || type === "link-to-page") {
      previewType = "rich";
      entityType = "page";
      commandTag = "/page";
    }

    return {
      pageId: page.id,
      blockId: block.id,
      isContentSection: true,
      title: (props.title as string) || text.replace(/^[#*-]\s+/, "").split("\n")[0] || "Section",
      type: entityType,
      previewType,
      commandTag,
      snippet,
      description,
      parentPageId: page.id,
      parentPageTitle: page.title || "Current Document",
      parentPageIcon: page.icon || undefined,
      metadata: {
        lang: (props.language as string) || undefined,
        status: props.checked || block.checked ? "Completed" : undefined,
        lastUpdated: page.title || "Current Page",
      },
      stats: {
        charCount,
        wordCount,
        lineCount: text ? text.split("\n").length : 1,
      },
      fallbackLevel: 1,
    };
  }

  // 2. Normal PAGE PREVIEW
  const blockSnippet = page.blocks?.slice(0, 5).map((b) => (b.text || ((b.properties as Record<string, unknown> | undefined)?.text) || "")).join("|") || "";
  const versionKey = `${page.id}:${page.updatedAt || ""}:${page.blocks?.length || 0}:${page.title}:${blockSnippet}`;
  const cached = previewCache.get(page.id);
  if (cached && cached.version === versionKey) {
    return cached.model;
  }

  const blocks = page.blocks || [];
  const childPages = allPages.filter((p) => p.parentId === page.id && !p.trashed);
  const parentPage = page.parentId ? allPages.find((p) => p.id === page.parentId) : undefined;
  const entityType = inferPageEntityType(page, childPages);

  let firstHeading: string | undefined;
  let firstMeaningfulText: string | undefined;
  let description: string | undefined;
  const contentLines: string[] = [];
  const highlights: string[] = [];

  let taskCount = 0;
  let completedTaskCount = 0;
  let entryCount = 0;
  let totalWords = 0;

  let listIndex = 0;
  for (const b of blocks) {
    const props = (b.properties as Record<string, unknown> | undefined) || {};
    const text = (b.text || props.text || props.title || props.value || "").toString().trim();
    const type = (b.type || "text").toLowerCase();

    if (type === "divider" || type === "hr" || type === "spacer") continue;

    const formatted = formatBlockToPreviewLine(b, listIndex);
    if (formatted) {
      totalWords += formatted.split(/\s+/).length;
      if (contentLines.length < 8) {
        contentLines.push(formatted);
        listIndex++;
      }
    }

    if (type === "h1" || type === "h2" || type === "h3" || type === "header" || type.startsWith("heading")) {
      const cleanHeading = text.replace(/^[#*-]\s+/, "").trim();
      if (cleanHeading && !firstHeading && cleanHeading.toLowerCase() !== (page.title || "").toLowerCase()) {
        firstHeading = cleanHeading;
      }
    }

    if (type === "todo" || type === "task" || type === "checklist") {
      taskCount++;
      if (props.checked || b.checked) completedTaskCount++;
      if (highlights.length < 3 && text) {
        highlights.push(`${props.checked || b.checked ? "☑" : "☐"} ${text}`);
      }
    }

    if (type === "table" || type === "database" || type === "board" || type === "kanban") {
      const rows = Array.isArray(props.rows) ? props.rows.length : Array.isArray(b.rows) ? b.rows.length : 4;
      entryCount += rows;
    }

    if (type === "callout" && text && highlights.length < 3) {
      highlights.push(`💡 ${text}`);
    }

    if ((type === "text" || type === "paragraph" || type === "p" || !type) && text.length > 0) {
      if (!description) {
        description = formatted || text;
      } else if (!firstMeaningfulText && text !== description) {
        firstMeaningfulText = formatted || text;
      }
    }
  }

  if (contentLines.length > 0) {
    // Vertical constraint: max 3-4 lines
    const topLines = contentLines.slice(0, 4);
    let accumulatedWords = 0;
    const boundedLines: string[] = [];

    for (let i = 0; i < topLines.length; i++) {
      const line = topLines[i];
      const words = line.trim().split(/\s+/).filter(Boolean);

      if (accumulatedWords + words.length > 20) {
        const remaining = Math.max(0, 20 - accumulatedWords);
        if (remaining > 0) {
          boundedLines.push(words.slice(0, remaining).join(" ") + "...");
        } else if (boundedLines.length === 0) {
          boundedLines.push(words.slice(0, 20).join(" ") + "...");
        }
        break;
      } else {
        boundedLines.push(line);
        accumulatedWords += words.length;
      }
    }

    if (contentLines.length > 4 && boundedLines.length > 0 && !boundedLines[boundedLines.length - 1].endsWith("...")) {
      boundedLines[boundedLines.length - 1] += "...";
    }

    description = boundedLines.join("\n");
  }

  const childrenItems: NavigationChildItem[] = childPages.map((child) => ({
    id: child.id,
    title: child.title || "Untitled Sub-page",
    type: inferPageEntityType(child),
    icon: child.icon || undefined,
    route: `/page/${child.id}`,
  }));

  const metadata: PagePreviewMetadata = {
    lastUpdated: page.updatedAt ? timeAgo(page.updatedAt) : "Recently updated",
    tags: Array.isArray(page.tags) ? (page.tags as string[]) : undefined,
  };

  if (taskCount > 0) {
    metadata.progress = Math.round((completedTaskCount / taskCount) * 100);
    metadata.status = metadata.progress === 100 ? "Completed" : metadata.progress > 0 ? "In Progress" : "To Do";
  } else if (entityType === "project") {
    metadata.status = "Active";
  }

  const stats: PagePreviewStats = {
    childCount: childPages.length,
    blockCount: blocks.length,
    taskCount: taskCount > 0 ? taskCount : undefined,
    completedTaskCount: completedTaskCount > 0 ? completedTaskCount : undefined,
    entryCount: entryCount > 0 ? entryCount : undefined,
    wordCount: totalWords > 0 ? totalWords : undefined,
  };

  let previewType: PreviewType = "simple";
  let fallbackLevel: 1 | 2 | 3 | 4 | 5 = 5;

  if (entityType === "project" || (childPages.length > 0 && taskCount > 0)) {
    previewType = "rich";
    fallbackLevel = 1;
  } else if (entityType === "database" || entryCount > 0) {
    previewType = "database";
    fallbackLevel = 1;
  } else if (entityType === "task" || taskCount > 0) {
    previewType = "task";
    fallbackLevel = 1;
  } else if (entityType === "document" || blocks.length >= 3) {
    previewType = "document";
    fallbackLevel = description ? 1 : 2;
  } else if (entityType === "folder" || childPages.length > 0) {
    previewType = "folder";
    fallbackLevel = 2;
  } else if (description) {
    previewType = "document";
    fallbackLevel = 3;
  } else if (childPages.length > 0) {
    previewType = "folder";
    fallbackLevel = 4;
  } else {
    previewType = "simple";
    fallbackLevel = 5;
  }

  const model: PagePreviewModel = {
    pageId: page.id,
    title: page.title || "Untitled Page",
    type: entityType,
    previewType,
    icon: page.icon || undefined,
    description: description || firstHeading || firstMeaningfulText,
    firstMeaningfulContent: firstMeaningfulText || firstHeading,
    contentLines: contentLines.length > 0 ? contentLines : undefined,
    metadata,
    highlights: highlights.length > 0 ? highlights : undefined,
    children: childrenItems.length > 0 ? childrenItems : undefined,
    stats,
    updatedAt: page.updatedAt || undefined,
    fallbackLevel,
    isParentPage: childPages.length > 0,
    parentPageId: parentPage?.id,
    parentPageTitle: parentPage?.title || (page.parentId ? "Parent Document" : undefined),
    parentPageIcon: parentPage?.icon,
  };

  previewCache.set(page.id, { model, version: versionKey });

  return model;
}
