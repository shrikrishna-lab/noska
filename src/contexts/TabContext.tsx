import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useWorkspace } from "./WorkspaceContext";
import type { Page } from "../lib/supabaseService";

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

const STORAGE_TABS_KEY = "noska_workspace_tabs_v2";
const STORAGE_ACTIVE_KEY = "noska_active_tab_id_v2";

function generateTabId(): string {
  return "tab_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
}

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [
    { pages, activeId, appView },
    { setActiveId, setAppView, setStackedPageIds }
  ] = useWorkspace();

  // Navigation handler
  const onNavigate = useCallback((type: "page" | "view", targetId: string) => {
    if (type === "page") {
      setAppView("page");
      setActiveId(targetId);
      setStackedPageIds([targetId]);
    } else {
      setAppView(targetId);
    }
  }, [setAppView, setActiveId, setStackedPageIds]);

  // Initialize tabs from localStorage or fallback
  const [tabs, setTabs] = useState<WorkspaceTab[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TABS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}

    if (appView && appView !== "page") {
      return [{ id: generateTabId(), type: "view", targetId: appView }];
    }
    if (activeId) {
      return [{ id: generateTabId(), type: "page", targetId: activeId }];
    }
    return [{ id: generateTabId(), type: "page", targetId: "initial" }];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_KEY);
      if (saved) return saved;
    } catch {}
    return tabs[0]?.id || null;
  });

  // Live refs so callbacks/effects can read latest values without adding
  // unstable deps (avoids re-running the sync effect on every tab change).
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  // Persist tabs & activeTabId
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TABS_KEY, JSON.stringify(tabs));
    } catch {}
  }, [tabs]);

  useEffect(() => {
    if (activeTabId) {
      try {
        localStorage.setItem(STORAGE_ACTIVE_KEY, activeTabId);
      } catch {}
    }
  }, [activeTabId]);

  // Synchronize when external actions change activeId or appView
  useEffect(() => {
    const targetType: "page" | "view" = appView === "page" ? "page" : "view";
    const targetId = appView === "page" ? activeId : appView;
    if (!targetId) return;

    const currentTabs = tabsRef.current;
    const currentActive = currentTabs.find((t) => t.id === activeTabIdRef.current);
    if (currentActive && currentActive.type === targetType && currentActive.targetId === targetId) {
      return;
    }

    // Check if existing tab matches target
    const existing = currentTabs.find((t) => t.type === targetType && t.targetId === targetId);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    // If active tab was an initial placeholder, replace it
    if (currentActive && currentActive.targetId === "initial") {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === currentActive.id ? { ...t, type: targetType, targetId } : t
        )
      );
      return;
    }

    // Otherwise update current active tab to this new page/view
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabIdRef.current ? { ...t, type: targetType, targetId } : t
      )
    );
  }, [appView, activeId]);

  const openTab = useCallback(
    (type: "page" | "view", targetId: string, options?: { inNewTab?: boolean; makeActive?: boolean }) => {
      const { inNewTab = false, makeActive = true } = options || {};

      const currentTabs = tabsRef.current;

      if (!inNewTab) {
        const existing = currentTabs.find((t) => t.type === type && t.targetId === targetId);
        if (existing) {
          if (makeActive) {
            setActiveTabId(existing.id);
            onNavigate(type, targetId);
          }
          return existing.id;
        }
      }

      const newTab: WorkspaceTab = {
        id: generateTabId(),
        type,
        targetId,
        pinned: false
      };
      setTabs((prev) => [...prev, newTab]);

      if (makeActive) {
        setActiveTabId(newTab.id);
        onNavigate(type, targetId);
      }
      return newTab.id;
    },
    [onNavigate]
  );

  const closeTab = useCallback(
    (tabId: string) => {
      const currentTabs = tabsRef.current;
      const currentActiveId = activeTabIdRef.current;

      if (currentTabs.length <= 1) {
        const firstPageId = pages[0]?.id || "initial";
        const fallbackTab: WorkspaceTab = {
          id: generateTabId(),
          type: pages[0] ? "page" : "view",
          targetId: pages[0] ? firstPageId : "home"
        };
        setTabs([fallbackTab]);
        setActiveTabId(fallbackTab.id);
        onNavigate(fallbackTab.type, fallbackTab.targetId);
        return;
      }

      const index = currentTabs.findIndex((t) => t.id === tabId);
      const filtered = currentTabs.filter((t) => t.id !== tabId);
      setTabs(filtered);

      if (tabId === currentActiveId) {
        const nextIndex = Math.min(index, filtered.length - 1);
        const nextTab = filtered[Math.max(0, nextIndex)];
        if (nextTab) {
          setActiveTabId(nextTab.id);
          onNavigate(nextTab.type, nextTab.targetId);
        }
      }
    },
    [pages, onNavigate]
  );

  const closeOtherTabs = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const kept = prev.filter((t) => t.id === tabId || t.pinned);
        return kept.length > 0 ? kept : prev;
      });
      setActiveTabId(tabId);
      const tab = tabsRef.current.find((t) => t.id === tabId);
      if (tab) {
        onNavigate(tab.type, tab.targetId);
      }
    },
    [onNavigate]
  );

  const closeTabsToRight = useCallback((tabId: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.id === tabId);
      if (index < 0) return prev;
      return prev.filter((t, i) => i <= index || t.pinned);
    });
  }, []);

  const togglePinTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      return prev.map((t) => (t.id === tabId ? { ...t, pinned: !t.pinned } : t));
    });
  }, []);

  const duplicateTab = useCallback(
    (tabId: string) => {
      const source = tabsRef.current.find((t) => t.id === tabId);
      if (!source) return;
      openTab(source.type, source.targetId, { inNewTab: true, makeActive: true });
    },
    [openTab]
  );

  const reorderTabs = useCallback((newTabs: WorkspaceTab[]) => {
    setTabs(newTabs);
  }, []);

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0] || null;
  }, [tabs, activeTabId]);

  const value = useMemo(
    () => ({
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
