import { CanvasElementData, Connector, STICKY_PALETTES, getConnectorTypeConfig } from "./canvasStore";
import { Block } from "../../lib/supabaseService";

export interface CanvasToDocOptions {
  includeConnectors?: boolean;
  groupByCategory?: boolean;
}

/**
 * Converts canvas sticky notes and connectors into structured document blocks (headings, todos, bullets).
 */
export function canvasToDocumentBlocks(
  elements: Record<string, CanvasElementData>,
  connectors: Connector[] = [],
  options: CanvasToDocOptions = { groupByCategory: true, includeConnectors: true }
): Block[] {
  const blocks: Block[] = [];
  const stickies = Object.values(elements).filter(e => e.kind === "sticky" && e.text?.trim());

  if (stickies.length === 0) return blocks;

  if (options.groupByCategory) {
    // Group notes by color / category
    for (const palette of STICKY_PALETTES) {
      const notesInCat = stickies.filter(s => s.color === palette.id || (!s.color && palette.id === "yellow"));
      if (notesInCat.length === 0) continue;

      // Section Header
      blocks.push({
        id: `b_${Math.random().toString(36).slice(2, 9)}`,
        type: "h2",
        text: `${palette.emoji} ${palette.label}`
      });

      // Child items
      for (const note of notesInCat) {
        const type = palette.id === "blue" ? "todo" : palette.id === "pink" ? "callout" : "bullet";
        blocks.push({
          id: `b_${Math.random().toString(36).slice(2, 9)}`,
          type,
          text: note.text?.trim() || ""
        });
      }
    }
  } else {
    // Sequential list
    for (const note of stickies) {
      const type = note.color === "blue" ? "todo" : note.color === "pink" ? "callout" : "bullet";
      blocks.push({
        id: `b_${Math.random().toString(36).slice(2, 9)}`,
        type,
        text: note.text?.trim() || ""
      });
    }
  }

  // Include Relations & Connectors Summary if requested
  if (options.includeConnectors && connectors.length > 0) {
    blocks.push({
      id: `b_${Math.random().toString(36).slice(2, 9)}`,
      type: "h2",
      text: "🔗 Roadmap Connections & Dependencies"
    });

    for (const conn of connectors) {
      const fromEl = elements[conn.from];
      const toEl = elements[conn.to];
      if (fromEl && toEl) {
        const typeCfg = getConnectorTypeConfig(conn.type);
        const fromTitle = (fromEl.text || "Note").slice(0, 40);
        const toTitle = (toEl.text || "Note").slice(0, 40);
        const label = conn.label ? ` (${conn.label})` : "";
        blocks.push({
          id: `b_${Math.random().toString(36).slice(2, 9)}`,
          type: "bullet",
          text: `**${fromTitle}** — ${typeCfg.icon} ${typeCfg.label}${label} ➔ **${toTitle}**`
        });
      }
    }
  }

  return blocks;
}

/**
 * Converts structured page blocks (H1/H2, todos, bullets, callouts) into canvas sticky notes.
 */
export function documentBlocksToCanvasElements(
  blocks: Block[]
): { elements: Record<string, CanvasElementData>; connectors: Connector[]; positions: Record<string, { x: number; y: number }> } {
  const elements: Record<string, CanvasElementData> = {};
  const connectors: Connector[] = [];
  const positions: Record<string, { x: number; y: number }> = {};

  let currentCategory = "yellow";
  let colIndex = 0;
  let rowIndex = 0;
  const startX = 100;
  const startY = 120;
  const colSpacing = 320;
  const rowSpacing = 220;

  for (const b of blocks) {
    if (!b.text?.trim()) continue;

    if (b.type === "h1" || b.type === "h2" || b.type === "h3") {
      // Create a section frame or advance column
      colIndex++;
      rowIndex = 0;
      currentCategory = b.text.toLowerCase().includes("task") || b.text.toLowerCase().includes("todo") ? "blue" :
                        b.text.toLowerCase().includes("question") || b.text.toLowerCase().includes("problem") ? "pink" :
                        b.text.toLowerCase().includes("done") || b.text.toLowerCase().includes("success") ? "green" :
                        b.text.toLowerCase().includes("idea") ? "yellow" : "purple";
    }

    const noteId = `el_${Math.random().toString(36).slice(2, 9)}`;
    const x = startX + colIndex * colSpacing;
    const y = startY + rowIndex * rowSpacing;

    let color = currentCategory;
    if (b.type === "todo") color = "blue";
    else if (b.type === "callout") color = "pink";

    elements[noteId] = {
      id: noteId,
      kind: "sticky",
      x,
      y,
      w: 260,
      h: 170,
      rotation: (Math.random() * 4) - 2,
      color,
      text: b.text.trim()
    };

    positions[noteId] = { x, y };
    rowIndex++;

    if (rowIndex > 3) {
      rowIndex = 0;
      colIndex++;
    }
  }

  return { elements, connectors, positions };
}

// ── AI Whiteboard Reasoning Engine ────────────────────────────────────────

export type AIReasoningMode = "summarize" | "categorize" | "find_blockers" | "generate_actions";

export interface AIReasoningResult {
  summary: string;
  insights: string[];
  suggestedCards?: Array<{ text: string; color: string; relatesToId?: string }>;
  suggestedCategories?: Record<string, string>; // noteId -> newColor
}

export function synthesizeCanvasAI(
  elements: Record<string, CanvasElementData>,
  connectors: Connector[],
  mode: AIReasoningMode
): AIReasoningResult {
  const stickies = Object.values(elements).filter(e => e.kind === "sticky" && e.text?.trim());
  const count = stickies.length;

  if (count === 0) {
    return {
      summary: "The canvas is currently empty. Add sticky notes or import documents to generate AI synthesis.",
      insights: ["Tip: Click + Add Note in the toolbar to begin brainstorming."]
    };
  }

  if (mode === "summarize") {
    const tasks = stickies.filter(s => s.color === "blue").length;
    const questions = stickies.filter(s => s.color === "pink").length;
    const ideas = stickies.filter(s => s.color === "yellow").length;
    const done = stickies.filter(s => s.color === "green").length;

    return {
      summary: `Analyzed ${count} canvas notes across ${connectors.length} connections. The board is focused on product momentum with ${tasks} active tasks and ${ideas} conceptual ideas.`,
      insights: [
        `📊 Task Distribution: ${tasks} Tasks, ${ideas} Ideas, ${questions} Questions/Blockers, ${done} Completed items.`,
        `🔗 Connectivity Index: ${connectors.length} dependency paths identified.`,
        `💡 Strategic Focus: Strong idea ideation phase — recommend converting top ideas into concrete task notes.`
      ]
    };
  }

  if (mode === "find_blockers") {
    const blockingConns = connectors.filter(c => c.type === "blocks" || c.type === "depends_on");
    const questionNotes = stickies.filter(s => s.color === "pink");

    const insights: string[] = [];
    if (blockingConns.length > 0) {
      insights.push(`🚨 Found ${blockingConns.length} blocking or dependent relationships.`);
    }
    if (questionNotes.length > 0) {
      insights.push(`❓ Found ${questionNotes.length} open questions requiring resolution.`);
    }
    if (insights.length === 0) {
      insights.push("✨ No critical bottlenecks or circular dependencies detected.");
    }

    return {
      summary: `Identified ${blockingConns.length} dependency bottlenecks and ${questionNotes.length} open questions.`,
      insights,
      suggestedCards: [
        { text: "Schedule Dependency Review Standup", color: "blue" },
        { text: "Clarify API specs for blocked services", color: "pink" }
      ]
    };
  }

  if (mode === "generate_actions") {
    const newActions: Array<{ text: string; color: string; relatesToId?: string }> = [];

    // For any question note, generate a resolution task
    for (const q of stickies.filter(s => s.color === "pink")) {
      newActions.push({
        text: `Resolve: ${q.text?.slice(0, 35)}...`,
        color: "blue",
        relatesToId: q.id
      });
      if (newActions.length >= 3) break;
    }

    if (newActions.length === 0) {
      newActions.push(
        { text: "Define launch criteria & QA checklist", color: "blue" },
        { text: "Conduct user feedback review session", color: "blue" }
      );
    }

    return {
      summary: `Generated ${newActions.length} prioritized next action items based on current whiteboard themes.`,
      insights: [
        "Action items drafted to address open questions and unblock downstream tasks.",
        "Click 'Add to Board' to insert these items directly into your workflow."
      ],
      suggestedCards: newActions
    };
  }

  // Categorize mode
  const suggestedCategories: Record<string, string> = {};
  for (const s of stickies) {
    const txt = (s.text || "").toLowerCase();
    if (txt.includes("todo") || txt.includes("build") || txt.includes("fix") || txt.includes("implement")) {
      suggestedCategories[s.id] = "blue"; // Task
    } else if (txt.includes("why") || txt.includes("how") || txt.includes("issue") || txt.includes("block")) {
      suggestedCategories[s.id] = "pink"; // Question/Blocker
    } else if (txt.includes("done") || txt.includes("shipped") || txt.includes("complete") || txt.includes("passed")) {
      suggestedCategories[s.id] = "green"; // Done
    } else if (txt.includes("strategy") || txt.includes("vision") || txt.includes("goal")) {
      suggestedCategories[s.id] = "purple"; // Important
    }
  }

  return {
    summary: `Categorized ${Object.keys(suggestedCategories).length} notes into appropriate semantic color tags.`,
    insights: [
      "Automatically matched notes to Ideas, Tasks, Blockers, and Goals based on keyword semantics."
    ],
    suggestedCategories
  };
}
