import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useWorkspace } from "./WorkspaceContext";
import {
  type SplitDirection,
  type SplitOrientation,
  type WorkspacePane,
  type LayoutNode,
  type SplitEngineState,
  createInitialState,
  splitPaneTree,
  closePaneTree,
  updateSplitNodeSizes,
  prunePageFromPanes,
  generateId,
  getAllPaneIds
} from "../features/split/SplitEngine";

export type { SplitDirection, SplitOrientation, WorkspacePane, LayoutNode, SplitEngineState };

export interface WorkspaceTab {
  id: string;
  type: "page" | "view";
  targetId: string; // page UUID or view key (e.g., 'marketplace', 'calendar', 'home', 'tasks')
  pinned?: boolean;
}

export const VIEW_META: Record<string, { icon: string; title: string }> = {
  home: { icon: "🏠", title: "Home" },
  calendar: { icon: "📅", title: "Calendar" },
  inbox: { icon: "📥", title: "Inbox" },
  library: { icon: "⊞", title: "Library" },
  tasks: { icon: "✓", title: "My Tasks" },
  marketplace: { icon: "🏪", title: "Marketplace" },
  creator: { icon: "🎨", title: "Creator Studio" },
  agents: { icon: "🤖", title: "Personal Agent" },
  chats: { icon: "💬", title: "Chats" },
  meetings: { icon: "📹", title: "Meetings" },
  meetingNote: { icon: "🎙️", title: "AI Meeting Capture" },
  shared: { icon: "👥", title: "Shared" },
  teamspace: { icon: "🏢", title: "Teamspace" }
};

interface TabContextValue {
  // Multi-pane Split Engine state & methods
  panes: Record<string, WorkspacePane>;
  layout: LayoutNode;
  activePaneId: string;
  setActivePaneId: (paneId: string) => void;
  splitPage: (options: { pageId: string; sourcePaneId?: string; direction?: SplitDirection; type?: "page" | "view" }) => void;
  closePane: (paneId: string) => void;
  resizeSplitNode: (splitNodeId: string, sizes: number[]) => void;
  navigatePane: (paneId: string, type: "page" | "view", targetId: string, options?: { inNewTab?: boolean; makeActive?: boolean }) => void;
  closePaneTab: (paneId: string, tabId: string) => void;
  setPaneActiveTab: (paneId: string, tabId: string) => void;

  // Active-pane convenience / Backward compatibility
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  activeTab: WorkspaceTab | null;
  openTab: (type: "page" | "view", targetId: string, options?: { inNewTab?: boolean; makeActive?: boolean }) => string;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeTabsToRight: (tabId: string) => void;
  togglePinTab: (tabId: string) => void;
  reorderTabs: (newTabs: WorkspaceTab[]) => void;
  duplicateTab: (tabId: string) => void;
}

const TabContext = createContext<TabContextValue | null>(null);

const STORAGE_SPLIT_STATE_KEY = "noska_split_engine_state_v1";

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [
    { pages, activeId, appView },
    { setActiveId, setAppView, setStackedPageIds }
  ] = useWorkspace();

  // Initialize split engine state from localStorage or fallback
  const [engineState, setEngineState] = useState<SplitEngineState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SPLIT_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.panes && parsed?.layout && parsed?.activePaneId) {
          return parsed;
        }
      }
    } catch {}

    const initialTargetId = appView && appView !== "page" ? appView : (activeId || "initial");
    const initialType = appView && appView !== "page" ? "view" : "page";
    return createInitialState(initialTargetId, initialType);
  });

  const stateRef = useRef(engineState);
  stateRef.current = engineState;

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SPLIT_STATE_KEY, JSON.stringify(engineState));
    } catch {}
  }, [engineState]);

  // Synchronize active workspace state when external activeId / appView changes
  useEffect(() => {
    const targetType: "page" | "view" = appView === "page" ? "page" : "view";
    const targetId = appView === "page" ? activeId : appView;
    if (!targetId) return;

    setEngineState((prev) => {
      const activePane = prev.panes[prev.activePaneId] || Object.values(prev.panes)[0];
      if (!activePane) return prev;

      const currentActiveTab = activePane.tabs.find((t) => t.id === activePane.activeTabId);
      if (currentActiveTab && currentActiveTab.type === targetType && currentActiveTab.targetId === targetId) {
        return prev;
      }

      // Check if existing tab matches target
      const existing = activePane.tabs.find((t) => t.type === targetType && t.targetId === targetId);
      if (existing) {
        return {
          ...prev,
          panes: {
            ...prev.panes,
            [activePane.id]: {
              ...activePane,
              activeTabId: existing.id
            }
          }
        };
      }

      // If active tab was an initial placeholder, replace it
      if (currentActiveTab && currentActiveTab.targetId === "initial") {
        return {
          ...prev,
          panes: {
            ...prev.panes,
            [activePane.id]: {
              ...activePane,
              tabs: activePane.tabs.map((t) =>
                t.id === currentActiveTab.id ? { ...t, type: targetType, targetId } : t
              )
            }
          }
        };
      }

      // Otherwise update active tab in current active pane
      return {
        ...prev,
        panes: {
          ...prev.panes,
          [activePane.id]: {
            ...activePane,
            tabs: activePane.tabs.map((t) =>
              t.id === activePane.activeTabId ? { ...t, type: targetType, targetId } : t
            )
          }
        }
      };
    });
  }, [appView, activeId]);

  // Synchronize global activeId & appView when activePane changes
  const onNavigatePane = useCallback((type: "page" | "view", targetId: string) => {
    if (type === "page") {
      setAppView("page");
      setActiveId(targetId);
      setStackedPageIds([targetId]);
    } else {
      setAppView(targetId);
    }
  }, [setAppView, setActiveId, setStackedPageIds]);

  const setActivePaneId = useCallback((paneId: string) => {
    setEngineState((prev) => {
      if (prev.activePaneId === paneId || !prev.panes[paneId]) return prev;
      const pane = prev.panes[paneId];
      const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId) || pane.tabs[0];
      if (activeTab) {
        onNavigatePane(activeTab.type, activeTab.targetId);
      }
      return {
        ...prev,
        activePaneId: paneId
      };
    });
  }, [onNavigatePane]);

  const splitPage = useCallback(
    (options: { pageId: string; sourcePaneId?: string; direction?: SplitDirection; type?: "page" | "view" }) => {
      setEngineState((prev) => {
        const nextState = splitPaneTree(prev, {
          targetPageId: options.pageId,
          sourcePaneId: options.sourcePaneId,
          direction: options.direction || "right",
          type: options.type || "page"
        });
        return nextState;
      });
    },
    []
  );

  const closePane = useCallback((paneId: string) => {
    setEngineState((prev) => {
      const nextState = closePaneTree(prev, paneId);
      const activePane = nextState.panes[nextState.activePaneId];
      if (activePane) {
        const activeTab = activePane.tabs.find((t) => t.id === activePane.activeTabId) || activePane.tabs[0];
        if (activeTab) {
          onNavigatePane(activeTab.type, activeTab.targetId);
        }
      }
      return nextState;
    });
  }, [onNavigatePane]);

  const resizeSplitNode = useCallback((splitNodeId: string, sizes: number[]) => {
    setEngineState((prev) => ({
      ...prev,
      layout: updateSplitNodeSizes(prev.layout, splitNodeId, sizes)
    }));
  }, []);

  const navigatePane = useCallback(
    (
      paneId: string,
      type: "page" | "view",
      targetId: string,
      options?: { inNewTab?: boolean; makeActive?: boolean }
    ) => {
      const { inNewTab = false, makeActive = true } = options || {};

      setEngineState((prev) => {
        const pane = prev.panes[paneId];
        if (!pane) return prev;

        let nextTabs = [...pane.tabs];
        let nextActiveTabId = pane.activeTabId;

        if (!inNewTab) {
          const existing = pane.tabs.find((t) => t.type === type && t.targetId === targetId);
          if (existing) {
            nextActiveTabId = existing.id;
          } else {
            // Replace current active tab or append
            if (pane.activeTabId) {
              nextTabs = pane.tabs.map((t) =>
                t.id === pane.activeTabId ? { ...t, type, targetId } : t
              );
            } else {
              const newTabId = generateId("tab");
              nextTabs.push({ id: newTabId, type, targetId });
              nextActiveTabId = newTabId;
            }
          }
        } else {
          const newTabId = generateId("tab");
          nextTabs.push({ id: newTabId, type, targetId });
          if (makeActive) nextActiveTabId = newTabId;
        }

        const nextPanes = {
          ...prev.panes,
          [paneId]: {
            ...pane,
            tabs: nextTabs,
            activeTabId: nextActiveTabId
          }
        };

        if (makeActive && prev.activePaneId === paneId) {
          onNavigatePane(type, targetId);
        }

        return {
          ...prev,
          panes: nextPanes,
          activePaneId: makeActive ? paneId : prev.activePaneId
        };
      });
    },
    [onNavigatePane]
  );

  const setPaneActiveTab = useCallback(
    (paneId: string, tabId: string) => {
      setEngineState((prev) => {
        const pane = prev.panes[paneId];
        if (!pane) return prev;
        const tab = pane.tabs.find((t) => t.id === tabId);
        if (!tab) return prev;

        if (prev.activePaneId === paneId) {
          onNavigatePane(tab.type, tab.targetId);
        }

        return {
          ...prev,
          panes: {
            ...prev.panes,
            [paneId]: {
              ...pane,
              activeTabId: tabId
            }
          }
        };
      });
    },
    [onNavigatePane]
  );

  const closePaneTab = useCallback(
    (paneId: string, tabId: string) => {
      setEngineState((prev) => {
        const pane = prev.panes[paneId];
        if (!pane) return prev;

        const allPaneIds = getAllPaneIds(prev.layout);

        if (pane.tabs.length <= 1) {
          if (allPaneIds.length > 1) {
            // If pane has 1 tab and multiple panes exist, closing tab closes the pane
            const nextState = closePaneTree(prev, paneId);
            const activePane = nextState.panes[nextState.activePaneId];
            if (activePane) {
              const activeTab = activePane.tabs.find((t) => t.id === activePane.activeTabId) || activePane.tabs[0];
              if (activeTab) onNavigatePane(activeTab.type, activeTab.targetId);
            }
            return nextState;
          }

          // If last tab of last pane, fallback to first page or home
          const fallbackTabId = generateId("tab");
          const fallbackTab: WorkspaceTab = {
            id: fallbackTabId,
            type: pages[0] ? "page" : "view",
            targetId: pages[0]?.id || "home"
          };
          onNavigatePane(fallbackTab.type, fallbackTab.targetId);
          return {
            ...prev,
            panes: {
              ...prev.panes,
              [paneId]: {
                ...pane,
                tabs: [fallbackTab],
                activeTabId: fallbackTabId
              }
            }
          };
        }

        const filtered = pane.tabs.filter((t) => t.id !== tabId);
        let nextActiveTabId = pane.activeTabId;

        if (tabId === pane.activeTabId) {
          const index = pane.tabs.findIndex((t) => t.id === tabId);
          const nextIndex = Math.min(index, filtered.length - 1);
          const nextTab = filtered[Math.max(0, nextIndex)];
          nextActiveTabId = nextTab?.id || null;
          if (nextTab && prev.activePaneId === paneId) {
            onNavigatePane(nextTab.type, nextTab.targetId);
          }
        }

        return {
          ...prev,
          panes: {
            ...prev.panes,
            [paneId]: {
              ...pane,
              tabs: filtered,
              activeTabId: nextActiveTabId
            }
          }
        };
      });
    },
    [pages, onNavigatePane]
  );

  // Active pane tabs & convenience methods for active pane
  const activePane = engineState.panes[engineState.activePaneId] || Object.values(engineState.panes)[0];
  const tabs = activePane?.tabs || [];
  const activeTabId = activePane?.activeTabId || tabs[0]?.id || null;
  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) || tabs[0] || null, [tabs, activeTabId]);

  const openTab = useCallback(
    (type: "page" | "view", targetId: string, options?: { inNewTab?: boolean; makeActive?: boolean }) => {
      const activeId = stateRef.current.activePaneId;
      navigatePane(activeId, type, targetId, options);
      return targetId;
    },
    [navigatePane]
  );

  const closeTab = useCallback(
    (tabId: string) => {
      const activeId = stateRef.current.activePaneId;
      closePaneTab(activeId, tabId);
    },
    [closePaneTab]
  );

  const closeOtherTabs = useCallback(
    (tabId: string) => {
      const activeId = stateRef.current.activePaneId;
      setEngineState((prev) => {
        const pane = prev.panes[activeId];
        if (!pane) return prev;
        const kept = pane.tabs.filter((t) => t.id === tabId || t.pinned);
        return {
          ...prev,
          panes: {
            ...prev.panes,
            [activeId]: {
              ...pane,
              tabs: kept.length > 0 ? kept : pane.tabs,
              activeTabId: tabId
            }
          }
        };
      });
    },
    []
  );

  const closeTabsToRight = useCallback(
    (tabId: string) => {
      const activeId = stateRef.current.activePaneId;
      setEngineState((prev) => {
        const pane = prev.panes[activeId];
        if (!pane) return prev;
        const index = pane.tabs.findIndex((t) => t.id === tabId);
        if (index < 0) return prev;
        const filtered = pane.tabs.filter((t, i) => i <= index || t.pinned);
        return {
          ...prev,
          panes: {
            ...prev.panes,
            [activeId]: {
              ...pane,
              tabs: filtered
            }
          }
        };
      });
    },
    []
  );

  const togglePinTab = useCallback(
    (tabId: string) => {
      const activeId = stateRef.current.activePaneId;
      setEngineState((prev) => {
        const pane = prev.panes[activeId];
        if (!pane) return prev;
        return {
          ...prev,
          panes: {
            ...prev.panes,
            [activeId]: {
              ...pane,
              tabs: pane.tabs.map((t) => (t.id === tabId ? { ...t, pinned: !t.pinned } : t))
            }
          }
        };
      });
    },
    []
  );

  const reorderTabs = useCallback(
    (newTabs: WorkspaceTab[]) => {
      const activeId = stateRef.current.activePaneId;
      setEngineState((prev) => {
        const pane = prev.panes[activeId];
        if (!pane) return prev;
        return {
          ...prev,
          panes: {
            ...prev.panes,
            [activeId]: {
              ...pane,
              tabs: newTabs
            }
          }
        };
      });
    },
    []
  );

  const duplicateTab = useCallback(
    (tabId: string) => {
      const activeId = stateRef.current.activePaneId;
      const pane = stateRef.current.panes[activeId];
      const source = pane?.tabs.find((t) => t.id === tabId);
      if (!source) return;
      navigatePane(activeId, source.type, source.targetId, { inNewTab: true, makeActive: true });
    },
    [navigatePane]
  );

  const value = useMemo(
    () => ({
      panes: engineState.panes,
      layout: engineState.layout,
      activePaneId: engineState.activePaneId,
      setActivePaneId,
      splitPage,
      closePane,
      resizeSplitNode,
      navigatePane,
      closePaneTab,
      setPaneActiveTab,

      tabs,
      activeTabId,
      activeTab,
      openTab,
      closeTab,
      closeOtherTabs,
      closeTabsToRight,
      togglePinTab,
      reorderTabs,
      duplicateTab
    }),
    [
      engineState.panes,
      engineState.layout,
      engineState.activePaneId,
      setActivePaneId,
      splitPage,
      closePane,
      resizeSplitNode,
      navigatePane,
      closePaneTab,
      setPaneActiveTab,

      tabs,
      activeTabId,
      activeTab,
      openTab,
      closeTab,
      closeOtherTabs,
      closeTabsToRight,
      togglePinTab,
      reorderTabs,
      duplicateTab
    ]
  );

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

export function useTabs() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("useTabs must be used within a TabProvider");
  }
  return context;
}
