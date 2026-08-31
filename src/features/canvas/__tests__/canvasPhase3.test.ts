import { describe, it, expect } from "vitest";
import {
  canvasToDocumentBlocks,
  documentBlocksToCanvasElements,
  synthesizeCanvasAI
} from "../canvasBridge";
import { CanvasElementData, Connector } from "../canvasStore";
import { Block } from "../../../lib/supabaseService";

describe("Phase 3: The Bridge to Work (Document Integration & AI Sync)", () => {
  describe("Canvas to Document Sync", () => {
    it("converts sticky notes into grouped document sections", () => {
      const elements: Record<string, CanvasElementData> = {
        n1: { id: "n1", kind: "sticky", x: 100, y: 100, w: 200, h: 200, rotation: 0, color: "blue", text: "Implement API router" },
        n2: { id: "n2", kind: "sticky", x: 400, y: 100, w: 200, h: 200, rotation: 0, color: "yellow", text: "Interactive playground idea" },
        n3: { id: "n3", kind: "sticky", x: 700, y: 100, w: 200, h: 200, rotation: 0, color: "pink", text: "Why is mobile sync failing?" }
      };
      const connectors: Connector[] = [
        { id: "c1", from: "n1", to: "n2", type: "leads_to", label: "Enables" }
      ];

      const blocks = canvasToDocumentBlocks(elements, connectors, { groupByCategory: true, includeConnectors: true });

      expect(blocks.length).toBeGreaterThanOrEqual(4);
      expect(blocks.some(b => b.type === "todo" && b.text.includes("Implement API router"))).toBe(true);
      expect(blocks.some(b => b.type === "h2" && b.text.includes("Roadmap Connections"))).toBe(true);
    });

    it("returns empty array for empty canvas", () => {
      const blocks = canvasToDocumentBlocks({}, []);
      expect(blocks).toEqual([]);
    });
  });

  describe("Document to Canvas Sync", () => {
    it("converts document headings and todos into colored canvas sticky notes", () => {
      const blocks: Block[] = [
        { id: "b1", type: "h2", text: "Sprint Goals" },
        { id: "b2", type: "todo", text: "Fix authentication cookies" },
        { id: "b3", type: "callout", text: "Requires server restart" }
      ];

      const result = documentBlocksToCanvasElements(blocks);
      const noteValues = Object.values(result.elements);

      expect(noteValues.length).toBe(3);
      // todo should map to blue task sticky
      const todoNote = noteValues.find(n => n.text === "Fix authentication cookies");
      expect(todoNote).toBeDefined();
      expect(todoNote?.color).toBe("blue");

      // callout should map to pink question/alert sticky
      const calloutNote = noteValues.find(n => n.text === "Requires server restart");
      expect(calloutNote).toBeDefined();
      expect(calloutNote?.color).toBe("pink");
    });
  });

  describe("AI Whiteboard Reasoning Engine", () => {
    const sampleElements: Record<string, CanvasElementData> = {
      t1: { id: "t1", kind: "sticky", x: 100, y: 100, w: 200, h: 200, rotation: 0, color: "blue", text: "Build export engine" },
      q1: { id: "q1", kind: "sticky", x: 400, y: 100, w: 200, h: 200, rotation: 0, color: "pink", text: "How to handle large exports?" },
      d1: { id: "d1", kind: "sticky", x: 700, y: 100, w: 200, h: 200, rotation: 0, color: "green", text: "Shipped auth flow" }
    };
    const sampleConnectors: Connector[] = [
      { id: "c1", from: "q1", to: "t1", type: "blocks", label: "Blocking" }
    ];

    it("summarizes canvas momentum and metrics", () => {
      const result = synthesizeCanvasAI(sampleElements, sampleConnectors, "summarize");
      expect(result.summary).toContain("3 canvas notes");
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it("identifies blockers and dependency bottlenecks", () => {
      const result = synthesizeCanvasAI(sampleElements, sampleConnectors, "find_blockers");
      expect(result.summary).toContain("1 dependency bottlenecks");
      expect(result.suggestedCards?.length).toBeGreaterThan(0);
    });

    it("generates next action items for open questions", () => {
      const result = synthesizeCanvasAI(sampleElements, sampleConnectors, "generate_actions");
      expect(result.suggestedCards?.length).toBeGreaterThan(0);
      expect(result.suggestedCards?.[0].color).toBe("blue");
    });

    it("auto-categorizes notes by semantics", () => {
      const uncoloredElements: Record<string, CanvasElementData> = {
        n1: { id: "n1", kind: "sticky", x: 100, y: 100, w: 200, h: 200, rotation: 0, color: "yellow", text: "Implement postgres migration" },
        n2: { id: "n2", kind: "sticky", x: 400, y: 100, w: 200, h: 200, rotation: 0, color: "yellow", text: "Why is memory leaking?" }
      };
      const result = synthesizeCanvasAI(uncoloredElements, [], "categorize");
      expect(result.suggestedCategories?.n1).toBe("blue");
      expect(result.suggestedCategories?.n2).toBe("pink");
    });
  });
});
