import { describe, it, expect, beforeEach } from "vitest";
import {
  createBoard,
  duplicateBoard,
  deleteBoard,
  loadBoardList,
  CONNECTOR_TYPES,
  getConnectorTypeConfig,
  generateTemplateData,
  autoTidyCanvas,
  autoSuggestConnections,
  BOARD_TEMPLATES
} from "../canvasStore";

const mockStorage: Record<string, string> = {};

if (typeof globalThis.localStorage === "undefined") {
  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  };
}

describe("Phase 2: Canvas Structure & Utility", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  describe("Multi-Board System", () => {
    it("initializes with default Main Canvas", () => {
      const boards = loadBoardList("page-123");
      expect(boards.length).toBe(1);
      expect(boards[0].name).toBe("Main Canvas");
    });

    it("creates a new board with template data", () => {
      const newBoard = createBoard("page-123", "Sprint Retrospective", "sprint_retro");
      expect(newBoard.name).toBe("Sprint Retrospective");
      expect(newBoard.template).toBe("sprint_retro");

      const boards = loadBoardList("page-123");
      expect(boards.length).toBe(2);
      expect(boards.some(b => b.id === newBoard.id)).toBe(true);
    });

    it("duplicates an existing board and its state", () => {
      const original = createBoard("page-123", "Roadmap Q3", "product_roadmap");
      const copy = duplicateBoard("page-123", original.id);
      expect(copy.name).toBe("Roadmap Q3 (Copy)");
      expect(copy.id).not.toBe(original.id);
    });

    it("deletes a board safely", () => {
      const board1 = createBoard("page-123", "Board to delete");
      expect(loadBoardList("page-123").length).toBe(2);
      deleteBoard("page-123", board1.id);
      expect(loadBoardList("page-123").length).toBe(1);
    });
  });

  describe("Typed Connectors", () => {
    it("defines 4 core relationship types", () => {
      expect(CONNECTOR_TYPES.leads_to).toBeDefined();
      expect(CONNECTOR_TYPES.depends_on).toBeDefined();
      expect(CONNECTOR_TYPES.blocks).toBeDefined();
      expect(CONNECTOR_TYPES.related_to).toBeDefined();
    });

    it("retrieves connector type configurations with fallback", () => {
      const leadsTo = getConnectorTypeConfig("leads_to");
      expect(leadsTo.label).toBe("Leads to");
      expect(leadsTo.color).toBe("#059669");

      const fallback = getConnectorTypeConfig("unknown_type");
      expect(fallback.id).toBe("leads_to");
    });
  });

  describe("1-Click Board Templates", () => {
    it("contains sprint_retro, product_roadmap, brainstorm_matrix, okr_tree", () => {
      expect(BOARD_TEMPLATES.sprint_retro).toBeDefined();
      expect(BOARD_TEMPLATES.product_roadmap).toBeDefined();
      expect(BOARD_TEMPLATES.brainstorm_matrix).toBeDefined();
      expect(BOARD_TEMPLATES.okr_tree).toBeDefined();
    });

    it("generates structured elements and connectors for product roadmap", () => {
      const data = generateTemplateData("product_roadmap");
      expect(Object.keys(data.elements).length).toBeGreaterThanOrEqual(4);
      expect(data.connectors.length).toBeGreaterThanOrEqual(2);
      expect(data.connectors[0].type).toBe("leads_to");
    });

    it("generates 3 columns for sprint retro", () => {
      const data = generateTemplateData("sprint_retro");
      const frames = Object.values(data.elements).filter(e => e.kind === "frame");
      expect(frames.length).toBe(3);
    });
  });

  describe("Auto-Tidy Engine (DAG Layout)", () => {
    it("organizes connected nodes in left-to-right topological order", () => {
      const elements: any = {
        n1: { id: "n1", kind: "sticky", x: 500, y: 300, w: 200, h: 200 },
        n2: { id: "n2", kind: "sticky", x: 100, y: 100, w: 200, h: 200 },
        n3: { id: "n3", kind: "sticky", x: 900, y: 600, w: 200, h: 200 },
      };
      // n1 -> n2 -> n3
      const connectors: any = [
        { id: "c1", from: "n1", to: "n2", type: "leads_to" },
        { id: "c2", from: "n2", to: "n3", type: "leads_to" },
      ];

      const { elements: tidied } = autoTidyCanvas(elements, connectors, {});
      // Layer 0: n1, Layer 1: n2, Layer 2: n3
      expect(tidied.n1.x).toBeLessThan(tidied.n2.x);
      expect(tidied.n2.x).toBeLessThan(tidied.n3.x);
    });
  });

  describe("Auto-Suggest Smart Connections", () => {
    it("suggests connecting Question notes to Done or Idea notes", () => {
      const elements: any = {
        q1: { id: "q1", kind: "sticky", color: "pink", text: "How to scale database?" },
        done1: { id: "done1", kind: "sticky", color: "green", text: "Implemented sharding" }
      };
      const suggestions = autoSuggestConnections(elements, []);
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].from).toBe("q1");
      expect(suggestions[0].to).toBe("done1");
      expect(suggestions[0].label).toBe("Resolves");
    });
  });
});
