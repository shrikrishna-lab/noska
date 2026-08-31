import { CanvasElementData, Connector } from "../canvasStore";
import { WorkflowRule, TemplateChecklistItem } from "./templateTypes";

export interface WorkflowEvaluationResult {
  modifiedElements: Record<string, CanvasElementData>;
  blockedCardIds: Set<string>;
  triggeredNotifications: Array<{ message: string; type: "info" | "warning" | "success" }>;
}

/**
 * Checks for incoming blocking connectors and returns set of card IDs that are currently blocked.
 */
export function computeBlockedCards(connectors: Connector[]): Set<string> {
  const blocked = new Set<string>();
  connectors.forEach(c => {
    if (c.type === "blocks" && c.to) {
      blocked.add(c.to);
    }
  });
  return blocked;
}

/**
 * Evaluates workflow rules when an element changes position or status.
 */
export function evaluateWorkflowRules(
  elements: Record<string, CanvasElementData>,
  connectors: Connector[],
  rules: WorkflowRule[] = []
): WorkflowEvaluationResult {
  const modifiedElements: Record<string, CanvasElementData> = { ...elements };
  const blockedCardIds = computeBlockedCards(connectors);
  const triggeredNotifications: Array<{ message: string; type: "info" | "warning" | "success" }> = [];

  if (rules.length === 0) {
    return { modifiedElements, blockedCardIds, triggeredNotifications };
  }

  const frames = Object.values(elements).filter(e => e.kind === "frame");
  const stickies = Object.values(elements).filter(e => e.kind === "sticky");

  stickies.forEach(sticky => {
    // Determine containing frame/section
    const containingFrame = frames.find(frame => {
      const fx = frame.x;
      const fy = frame.y;
      const fw = frame.w || 300;
      const fh = frame.h || 500;
      const sx = sticky.x + (sticky.w || 240) / 2;
      const sy = sticky.y + (sticky.h || 140) / 2;
      return sx >= fx && sx <= fx + fw && sy >= fy && sy <= fy + fh;
    });

    rules.forEach(rule => {
      if (rule.trigger === "card_moved_to_section" && rule.condition?.sectionId) {
        // If containing frame matches rule condition (either by frame ID or by matching name/color)
        if (containingFrame && containingFrame.id.includes(rule.condition.sectionId)) {
          if (rule.action.type === "update_status" && rule.action.badgeText) {
            // Apply status rule
            if (!sticky.text.includes(`[${rule.action.badgeText}]`)) {
              triggeredNotifications.push({
                message: `Applied workflow rule: ${rule.name}`,
                type: "info"
              });
            }
          }
        }
      }

      if (rule.trigger === "dependency_blocked" && blockedCardIds.has(sticky.id)) {
        if (rule.action.type === "flag_warning") {
          // Flag blocked card
          triggeredNotifications.push({
            message: `Card is blocked by an active dependency`,
            type: "warning"
          });
        }
      }
    });
  });

  return {
    modifiedElements,
    blockedCardIds,
    triggeredNotifications
  };
}

/**
 * Calculates completion percentage of a board checklist.
 */
export function getChecklistProgress(checklist: TemplateChecklistItem[] = []): { completed: number; total: number; percent: number } {
  if (!checklist || checklist.length === 0) return { completed: 0, total: 0, percent: 100 };
  const completed = checklist.filter(c => c.completed).length;
  const total = checklist.length;
  const percent = Math.round((completed / total) * 100);
  return { completed, total, percent };
}
