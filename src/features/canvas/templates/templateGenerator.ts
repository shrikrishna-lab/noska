import { CanvasData, CanvasElementData, Connector, uid } from "../canvasStore";
import { NoskaTemplate, TemplateCustomizationOptions } from "./templateTypes";

export function generateCanvasFromTemplate(
  template: NoskaTemplate,
  options?: Partial<TemplateCustomizationOptions>
): { data: CanvasData; positions: Record<string, { x: number; y: number }> } {
  const elements: Record<string, CanvasElementData> = {};
  const positions: Record<string, { x: number; y: number }> = {};
  const connectors: Connector[] = [];

  const enabledSectionIds = options?.enabledSections && options.enabledSections.length > 0
    ? options.enabledSections
    : template.sections.filter(s => !s.isOptional || s.defaultEnabled).map(s => s.id);

  const activeSections = template.sections.filter(s => enabledSectionIds.includes(s.id));
  const scale = options?.scale || "medium";

  // Map from `sectionId:cardIndex` to newly generated element id for connector binding
  const cardIdMap: Record<string, string> = {};

  const colWidth = 340;
  const colGap = 40;
  const startX = 80;
  const startY = 80;
  const colHeight = 620;

  activeSections.forEach((sec, colIdx) => {
    const frameId = uid("el");
    const frameX = startX + colIdx * (colWidth + colGap);
    const frameY = startY;

    // Create Section Grouping Frame
    elements[frameId] = {
      id: frameId,
      kind: "frame",
      x: frameX,
      y: frameY,
      w: colWidth,
      h: colHeight,
      rotation: 0,
      color: sec.color,
      text: sec.name
    };
    positions[frameId] = { x: frameX, y: frameY };

    // Find and place starter cards for this section
    const sectionCards = template.starterCards.filter(card => {
      if (card.sectionId !== sec.id) return false;
      if (scale === "small") return card.scaleTier === "all" || !card.scaleTier;
      if (scale === "medium") return card.scaleTier !== "large_only";
      return true; // large includes all
    });

    sectionCards.forEach((card, cardIdx) => {
      const stickyId = uid("el");
      const cardX = frameX + 25;
      const cardY = frameY + 70 + cardIdx * 180;
      const rotation = ((cardIdx % 3) - 1) * 0.7; // subtle -0.7 to +0.7 tilt

      elements[stickyId] = {
        id: stickyId,
        kind: "sticky",
        x: cardX,
        y: cardY,
        w: 290,
        h: 160,
        rotation,
        color: card.color || sec.color,
        text: card.text
      };
      positions[stickyId] = { x: cardX, y: cardY };

      cardIdMap[`${sec.id}:${cardIdx}`] = stickyId;
    });
  });

  // Re-link configured connectors between the instantiated cards
  if (template.defaultConnectors) {
    template.defaultConnectors.forEach(conn => {
      const fromId = cardIdMap[`${conn.fromSection}:${conn.fromCardIndex}`];
      const toId = cardIdMap[`${conn.toSection}:${conn.toCardIndex}`];
      if (fromId && toId) {
        connectors.push({
          id: uid("conn"),
          from: fromId,
          to: toId,
          type: conn.type,
          label: conn.label
        });
      }
    });
  }

  return {
    data: {
      version: 2,
      elements,
      connectors,
      blockMeta: {}
    },
    positions
  };
}
