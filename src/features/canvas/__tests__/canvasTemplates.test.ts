import { describe, it, expect, beforeEach } from "vitest";
import { OFFICIAL_TEMPLATES, getOfficialTemplateById } from "../templates/officialTemplates";
import { generateCanvasFromTemplate } from "../templates/templateGenerator";
import {
  generateSmartBoardName,
  loadMyTemplates,
  saveToMyTemplates,
  deleteMyTemplate,
  loadMarketplaceTemplates,
  sanitizeBoardForPublishing,
  publishToMarketplace
} from "../templates/templateStore";
import { CanvasBoardMeta, CanvasData } from "../canvasStore";

const mockStorage: Record<string, string> = {};

if (typeof globalThis.localStorage === "undefined") {
  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  };
}

describe("Noska Template System — 3-Part Architecture", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  describe("Part 1: Official Pre-Built Templates Library", () => {
    it("contains all 11 official templates across Team & Personal categories", () => {
      expect(OFFICIAL_TEMPLATES.length).toBeGreaterThanOrEqual(11);

      const teamTemplates = OFFICIAL_TEMPLATES.filter(t => t.category === "team");
      const personalTemplates = OFFICIAL_TEMPLATES.filter(t => t.category === "personal");

      expect(teamTemplates.length).toBe(7);
      expect(personalTemplates.length).toBe(4);
    });

    it("has valid sections, starter cards, and default name patterns for every template", () => {
      OFFICIAL_TEMPLATES.forEach(tmpl => {
        expect(tmpl.id).toBeTruthy();
        expect(tmpl.name).toBeTruthy();
        expect(tmpl.sections.length).toBeGreaterThanOrEqual(3);
        expect(tmpl.starterCards.length).toBeGreaterThanOrEqual(3);
        expect(tmpl.defaultNamePattern).toBeTruthy();
      });
    });

    it("finds template by ID cleanly", () => {
      const retro = getOfficialTemplateById("sprint_retro");
      expect(retro).toBeDefined();
      expect(retro?.name).toBe("Sprint Retrospective");
    });
  });

  describe("Part 2: Apply-Time Customization Flow & Smart Autofill", () => {
    it("generates smart board names with project and date context", () => {
      const roadmap = getOfficialTemplateById("product_roadmap")!;
      const name = generateSmartBoardName(roadmap, [], "Core Platform");
      expect(name).toContain("Product Roadmap");
      expect(name).toContain("Core Platform");
    });

    it("auto-increments recurring templates correctly", () => {
      const retro = getOfficialTemplateById("sprint_retro")!;
      const existingBoards: CanvasBoardMeta[] = [
        { id: "b1", name: "Sprint Retro #1 — App", icon: "🎨", createdAt: "", updatedAt: "", template: "sprint_retro" },
        { id: "b2", name: "Sprint Retro #2 — App", icon: "🎨", createdAt: "", updatedAt: "", template: "sprint_retro" }
      ];

      const nextName = generateSmartBoardName(retro, existingBoards, "App");
      expect(nextName).toContain("#3");
    });

    it("adjusts generated starter cards based on Team Scale (small vs large)", () => {
      const retro = getOfficialTemplateById("sprint_retro")!;

      const smallResult = generateCanvasFromTemplate(retro, { scale: "small" });
      const largeResult = generateCanvasFromTemplate(retro, { scale: "large" });

      const smallCardCount = Object.values(smallResult.data.elements).filter(e => e.kind === "sticky").length;
      const largeCardCount = Object.values(largeResult.data.elements).filter(e => e.kind === "sticky").length;

      expect(smallCardCount).toBeLessThan(largeCardCount);
    });

    it("filters sections based on user enabled/disabled checkboxes", () => {
      const retro = getOfficialTemplateById("sprint_retro")!;
      // Only enable 2 columns
      const result = generateCanvasFromTemplate(retro, {
        enabledSections: ["went_well", "action_items"]
      });

      const frameCount = Object.values(result.data.elements).filter(e => e.kind === "frame").length;
      expect(frameCount).toBe(2);
    });

    it("persists custom templates into My Templates", () => {
      const retro = getOfficialTemplateById("sprint_retro")!;
      const custom = saveToMyTemplates({
        ...retro,
        name: "Custom Engineering Retro"
      });

      const list = loadMyTemplates();
      expect(list.length).toBe(1);
      expect(list[0].name).toBe("Custom Engineering Retro");

      deleteMyTemplate(custom.id);
      expect(loadMyTemplates().length).toBe(0);
    });
  });

  describe("Part 3: Template Marketplace (Community Publishing & Discovery)", () => {
    it("loads verified community starter templates", () => {
      const marketplace = loadMarketplaceTemplates();
      expect(marketplace.length).toBeGreaterThanOrEqual(2);
      expect(marketplace.some(t => t.id === "community_design_system")).toBe(true);
    });

    it("sanitizes private board data before publishing", () => {
      const mockBoard: CanvasData = {
        version: 2,
        elements: {
          "f1": { id: "f1", kind: "frame", x: 0, y: 0, w: 300, h: 500, rotation: 0, text: "Architecture Review", color: "purple" },
          "s1": { id: "s1", kind: "sticky", x: 20, y: 80, w: 200, h: 150, rotation: 0, text: "Internal API Key: SECRET_12345", color: "purple" }
        },
        connectors: [],
        blockMeta: {}
      };

      const sanitized = sanitizeBoardForPublishing(mockBoard, {
        name: "Cloud Architecture Review",
        description: "Template for security audits",
        category: "team",
        tags: ["Security", "Cloud"],
        authorName: "Security Lead"
      });

      expect(sanitized.name).toBe("Cloud Architecture Review");
      expect(sanitized.isCommunity).toBe(true);
      expect(sanitized.sections.length).toBe(1);
      expect(sanitized.sections[0].name).toBe("Architecture Review");
    });

    it("publishes to marketplace and retrieves from marketplace feed", () => {
      const mockBoard: CanvasData = {
        version: 2,
        elements: {},
        connectors: [],
        blockMeta: {}
      };

      const template = sanitizeBoardForPublishing(mockBoard, {
        name: "Published Workflow",
        description: "Test workflow",
        category: "team",
        tags: ["Test"],
        authorName: "Community Author"
      });

      publishToMarketplace(template);

      const marketplace = loadMarketplaceTemplates();
      expect(marketplace.some(t => t.name === "Published Workflow")).toBe(true);
    });
  });
});
