export type SplitDirection = "right" | "left" | "above" | "below";
export type SplitOrientation = "horizontal" | "vertical";

export interface WorkspaceTabItem {
  id: string;
  type: "page" | "view";
  targetId: string;
  pinned?: boolean;
}

export interface WorkspacePane {
  id: string;
  tabs: WorkspaceTabItem[];
  activeTabId: string | null;
}

export interface LeafLayoutNode {
  type: "leaf";
  id: string;
  paneId: string;
}

export interface SplitLayoutNode {
  type: "split";
  id: string;
  orientation: SplitOrientation; // "horizontal" (left|right) or "vertical" (above/below)
  children: LayoutNode[];
  sizes: number[]; // e.g. [50, 50]
}

export type LayoutNode = LeafLayoutNode | SplitLayoutNode;

export interface SplitEngineState {
  panes: Record<string, WorkspacePane>;
  layout: LayoutNode;
  activePaneId: string;
}

export function generateId(prefix: string = "id"): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

export function createInitialState(initialTargetId: string = "initial", type: "page" | "view" = "page"): SplitEngineState {
  const initialPaneId = generateId("pane");
  const initialTabId = generateId("tab");

  const pane: WorkspacePane = {
    id: initialPaneId,
    tabs: [{ id: initialTabId, type, targetId: initialTargetId }],
    activeTabId: initialTabId
  };

  return {
    panes: { [initialPaneId]: pane },
    layout: {
      type: "leaf",
      id: generateId("leaf"),
      paneId: initialPaneId
    },
    activePaneId: initialPaneId
  };
}

/** Recursively finds a leaf node by paneId */
export function findLeafByPaneId(node: LayoutNode, paneId: string): LeafLayoutNode | null {
  if (node.type === "leaf") {
    return node.paneId === paneId ? node : null;
  }
  for (const child of node.children) {
    const found = findLeafByPaneId(child, paneId);
    if (found) return found;
  }
  return null;
}

/** Recursively counts total leaf panes */
export function countLeaves(node: LayoutNode): number {
  if (node.type === "leaf") return 1;
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

/** Recursively collects all paneIds in the layout in visual order */
export function getAllPaneIds(node: LayoutNode): string[] {
  if (node.type === "leaf") return [node.paneId];
  return node.children.flatMap(getAllPaneIds);
}

/**
 * Splits a pane in the layout in the given direction.
 * Creates a new pane referencing targetPageId and inserts it into the layout tree.
 */
export function splitPaneTree(
  state: SplitEngineState,
  options: {
    targetPageId: string;
    sourcePaneId?: string;
    direction?: SplitDirection;
    type?: "page" | "view";
  }
): SplitEngineState {
  const { targetPageId, direction = "right", type = "page" } = options;
  const sourcePaneId = options.sourcePaneId || state.activePaneId;

  // 1. Create the new pane
  const newPaneId = generateId("pane");
  const newTabId = generateId("tab");
  const newPane: WorkspacePane = {
    id: newPaneId,
    tabs: [{ id: newTabId, type, targetId: targetPageId }],
    activeTabId: newTabId
  };

  const newLeaf: LeafLayoutNode = {
    type: "leaf",
    id: generateId("leaf"),
    paneId: newPaneId
  };

  const orientation: SplitOrientation = (direction === "right" || direction === "left") ? "horizontal" : "vertical";
  const isTargetFirst = direction === "left" || direction === "above";

  // 2. Insert newLeaf adjacent to sourcePane in layout tree
  function insertAdjacent(node: LayoutNode): LayoutNode {
    if (node.type === "leaf") {
      if (node.paneId === sourcePaneId) {
        // Wrap this leaf with a new split node
        const children = isTargetFirst ? [newLeaf, node] : [node, newLeaf];
        return {
          type: "split",
          id: generateId("split"),
          orientation,
          children,
          sizes: [50, 50]
        };
      }
      return node;
    }

    // Check if any direct child is the matching leaf and orientation matches
    const childIdx = node.children.findIndex((child) => child.type === "leaf" && child.paneId === sourcePaneId);
    if (childIdx >= 0 && node.orientation === orientation) {
      const newChildren = [...node.children];
      const insertAt = isTargetFirst ? childIdx : childIdx + 1;
      newChildren.splice(insertAt, 0, newLeaf);
      // Recalculate equal distribution
      const equalSize = Math.floor(100 / newChildren.length);
      const newSizes = newChildren.map((_, i) => (i === newChildren.length - 1 ? 100 - equalSize * (newChildren.length - 1) : equalSize));
      return {
        ...node,
        children: newChildren,
        sizes: newSizes
      };
    }

    return {
      ...node,
      children: node.children.map(insertAdjacent)
    };
  }

  const updatedLayout = insertAdjacent(state.layout);

  return {
    panes: {
      ...state.panes,
      [newPaneId]: newPane
    },
    layout: updatedLayout,
    activePaneId: newPaneId
  };
}

/**
 * Closes a pane and cleans up the layout tree.
 * If the layout collapses to 1 leaf, simplifies the root.
 */
export function closePaneTree(state: SplitEngineState, paneIdToClose: string): SplitEngineState {
  const allIds = getAllPaneIds(state.layout);
  if (allIds.length <= 1) {
    // Cannot close the only pane, just return state
    return state;
  }

  function removeLeaf(node: LayoutNode): LayoutNode | null {
    if (node.type === "leaf") {
      return node.paneId === paneIdToClose ? null : node;
    }

    const filteredChildren: LayoutNode[] = [];
    node.children.forEach((child) => {
      const remaining = removeLeaf(child);
      if (remaining) filteredChildren.push(remaining);
    });

    if (filteredChildren.length === 0) return null;
    if (filteredChildren.length === 1) return filteredChildren[0];

    // Recalculate equal sizes
    const equalSize = Math.floor(100 / filteredChildren.length);
    const newSizes = filteredChildren.map((_, i) =>
      i === filteredChildren.length - 1 ? 100 - equalSize * (filteredChildren.length - 1) : equalSize
    );

    return {
      ...node,
      children: filteredChildren,
      sizes: newSizes
    };
  }

  const newLayout = removeLeaf(state.layout) || state.layout;
  const remainingPanes = { ...state.panes };
  delete remainingPanes[paneIdToClose];

  // Determine next active pane if closed pane was active
  let nextActivePaneId = state.activePaneId;
  if (state.activePaneId === paneIdToClose) {
    const remainingIds = getAllPaneIds(newLayout);
    nextActivePaneId = remainingIds[0] || "";
  }

  return {
    panes: remainingPanes,
    layout: newLayout,
    activePaneId: nextActivePaneId
  };
}

/**
 * Updates sizes in a split layout node by its ID.
 */
export function updateSplitNodeSizes(layout: LayoutNode, splitNodeId: string, sizes: number[]): LayoutNode {
  if (layout.type === "leaf") return layout;

  if (layout.id === splitNodeId) {
    return {
      ...layout,
      sizes
    };
  }

  return {
    ...layout,
    children: layout.children.map((child) => updateSplitNodeSizes(child, splitNodeId, sizes))
  };
}

/**
 * Prunes a deleted page ID from all panes' tabs.
 */
export function prunePageFromPanes(
  state: SplitEngineState,
  deletedPageId: string,
  fallbackPageId?: string
): SplitEngineState {
  let modified = false;
  const updatedPanes: Record<string, WorkspacePane> = {};

  for (const [paneId, pane] of Object.entries(state.panes)) {
    const filteredTabs = pane.tabs.filter(
      (t) => !(t.type === "page" && t.targetId === deletedPageId)
    );

    if (filteredTabs.length !== pane.tabs.length) {
      modified = true;
      if (filteredTabs.length === 0) {
        // Fallback tab
        const fallbackTabId = generateId("tab");
        updatedPanes[paneId] = {
          ...pane,
          tabs: [
            {
              id: fallbackTabId,
              type: fallbackPageId ? "page" : "view",
              targetId: fallbackPageId || "home"
            }
          ],
          activeTabId: fallbackTabId
        };
      } else {
        const nextActiveTab =
          filteredTabs.find((t) => t.id === pane.activeTabId) || filteredTabs[filteredTabs.length - 1];
        updatedPanes[paneId] = {
          ...pane,
          tabs: filteredTabs,
          activeTabId: nextActiveTab?.id || null
        };
      }
    } else {
      updatedPanes[paneId] = pane;
    }
  }

  return modified ? { ...state, panes: updatedPanes } : state;
}
