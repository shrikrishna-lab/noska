import { describe, it, expect } from "vitest";
import {
  computeBlockedCards,
  evaluateWorkflowRules,
  getChecklistProgress
} from "../templates/canvasWorkflowEngine";
import { OFFICIAL_TEMPLATES, getOfficialTemplateById } from "../templates/officialTemplates";
import { CanvasElementData, Connector } from "../canvasStore";
import { WorkflowRule } from "../templates/templateTypes";

describe("Noska Workflow Automation Engine", () => {
  it("detects blocked cards with incoming blocks connectors", () => {
    const connectors: Connector[] = [
      { id: "c1", from: "el_1", to: "el_2", type: "blocks" },
      { id: "c2", from: "el_1", to: "el_3", type: "leads_to" }
    ];

    const blocked = computeBlockedCards(connectors);
    expect(blocked.has("el_2")).toBe(true);
    expect(blocked.has("el_3")).toBe(false);
  });

  it("evaluates workflow rules on card moves and dependency blocks", () => {
    const elements: Record<string, CanvasElementData> = {
      "frame_actions": {
        id: "frame_action_items",
        kind: "frame",
        x: 0,
        y: 0,
        w: 300,
        h: 500,
        rotation: 0,
        text: "Action Items",
        color: "blue"
      },
      "card_1": {
        id: "card_1",
        kind: "sticky",
        x: 20,
        y: 50,
        w: 240,
        h: 140,
        rotation: 0,
        text: "Fix auth token expiration",
        color: "blue"
      }
    };

    const rules: WorkflowRule[] = [
      {
        id: "r1",
        name: "Stamp Action Items",
        trigger: "card_moved_to_section",
        condition: { sectionId: "action_items" },
        action: { type: "update_status", badgeText: "Action Item", badgeColor: "#3b82f6" }
      }
    ];

    const result = evaluateWorkflowRules(elements, [], rules);
    expect(result.triggeredNotifications.length).toBeGreaterThan(0);
    expect(result.triggeredNotifications[0].message).toContain("Applied workflow rule");
  });

  it("calculates checklist completion progress accurately", () => {
    const checklist = [
      { id: "1", label: "Step 1", completed: true },
      { id: "2", label: "Step 2", completed: true },
      { id: "3", label: "Step 3", completed: false },
      { id: "4", label: "Step 4", completed: false }
    ];

    const { completed, total, percent } = getChecklistProgress(checklist);
    expect(completed).toBe(2);
    expect(total).toBe(4);
    expect(percent).toBe(50);
  });

  it("official templates carry rich automation rules and curated collections", () => {
    const retro = getOfficialTemplateById("sprint_retro")!;
    expect(retro.workflowRules).toBeDefined();
    expect(retro.workflowRules?.length).toBeGreaterThan(0);
    expect(retro.curatedCollection).toBe("engineering_agile");
    expect(retro.checklist?.length).toBeGreaterThan(0);
  });
});
