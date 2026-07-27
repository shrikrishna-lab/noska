import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { Page, AIChat } from "../lib/supabaseService";
import type { Block } from "../../types/blocks";
import type { Tables } from "../../types/supabase";

interface WorkspaceState {
  pages: Page[];
  sharedPages: Page[];
  activeId: string | null;
  workspaceName: string;
  pendingInvites: Tables<"page_invites">[];
  collapsedPages: Set<string>;
  renameFocusId: string | null;
  appView: string;
  pageMode: string;
  stackedPageIds: string[];
  readingPage: Page | null;
  focusedBlock: Block | null;
  decryptionKeys: Record<string, string>;
  saveState: string;
  query: string;
  needsUsernameClaim: boolean;
  onboardingOpen: boolean;
  history: Page[][];
  future: Page[][];
}

interface WorkspaceActions {
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  setSharedPages: React.Dispatch<React.SetStateAction<Page[]>>;
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
  setWorkspaceName: React.Dispatch<React.SetStateAction<string>>;
  setPendingInvites: React.Dispatch<React.SetStateAction<Tables<"page_invites">[]>>;
  setCollapsedPages: React.Dispatch<React.SetStateAction<Set<string>>>;
  setRenameFocusId: React.Dispatch<React.SetStateAction<string | null>>;
  setAppView: React.Dispatch<React.SetStateAction<string>>;
  setPageMode: React.Dispatch<React.SetStateAction<string>>;
  setStackedPageIds: React.Dispatch<React.SetStateAction<string[]>>;
  setReadingPage: React.Dispatch<React.SetStateAction<Page | null>>;
  setFocusedBlock: React.Dispatch<React.SetStateAction<Block | null>>;
  setDecryptionKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSaveState: React.Dispatch<React.SetStateAction<string>>;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  setNeedsUsernameClaim: React.Dispatch<React.SetStateAction<boolean>>;
  setOnboardingOpen: React.Dispatch<React.SetStateAction<boolean>>;
  commitPages: (next: Page[]) => void;
  togglePageCollapse: (id: string) => void;
  undo: () => void;
  redo: () => void;
}

type WorkspaceContextType = [WorkspaceState, WorkspaceActions];

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [pages, setPages] = useState<Page[]>([]);
  const [sharedPages, setSharedPages] = useState<Page[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [pendingInvites, setPendingInvites] = useState<Tables<"page_invites">[]>([]);
  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(() => new Set());
  const [renameFocusId, setRenameFocusId] = useState<string | null>(null);
  const [appView, setAppView] = useState("page");
  const [pageMode, setPageMode] = useState("doc");
  const [stackedPageIds, setStackedPageIds] = useState<string[]>([]);
  const [readingPage, setReadingPage] = useState<Page | null>(null);
  const [focusedBlock, setFocusedBlock] = useState<Block | null>(null);
  const [decryptionKeys, setDecryptionKeys] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState("Saved");
  const [query, setQuery] = useState("");
  const [needsUsernameClaim, setNeedsUsernameClaim] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [history, setHistory] = useState<Page[][]>([]);
  const [future, setFuture] = useState<Page[][]>([]);

  const persistTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (persistTimeout.current) clearTimeout(persistTimeout.current);
    };
  }, []);

  const persistToLocalStorage = useCallback((next: Page[]) => {
    if (persistTimeout.current) clearTimeout(persistTimeout.current);
    persistTimeout.current = setTimeout(() => {
      try {
        localStorage.setItem("pages", JSON.stringify(next.map(p => {
          if (p.isEncrypted) return { ...p, blocks: [] };
          return p;
        })));
      } catch {}
      persistTimeout.current = undefined;
    }, 500);
  }, []);

  const commitPages = useCallback((next: Page[]) => {
    setHistory((h) => [...h.slice(-24), pages]);
    setFuture([]);
    setPages(next);
    persistToLocalStorage(next);
  }, [pages, persistToLocalStorage]);

  const togglePageCollapse = useCallback((id: string) => {
    setCollapsedPages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const previous = h[h.length - 1];
      setFuture((f) => [pages, ...f]);
      setPages(previous);
      return h.slice(0, -1);
    });
  }, [pages]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setHistory((h) => [...h, pages]);
      setPages(next);
      return f.slice(1);
    });
  }, [pages]);

  const state: WorkspaceState = useMemo(() => ({
    pages, sharedPages, activeId, workspaceName, pendingInvites,
    collapsedPages, renameFocusId, appView, pageMode, stackedPageIds,
    readingPage, focusedBlock, decryptionKeys, saveState, query,
    needsUsernameClaim, onboardingOpen, history, future,
  }), [pages, sharedPages, activeId, workspaceName, pendingInvites,
      collapsedPages, renameFocusId, appView, pageMode, stackedPageIds,
      readingPage, focusedBlock, decryptionKeys, saveState, query,
      needsUsernameClaim, onboardingOpen, history, future]);

  const actions: WorkspaceActions = useMemo(() => ({
    setPages, setSharedPages, setActiveId, setWorkspaceName, setPendingInvites,
    setCollapsedPages, setRenameFocusId, setAppView, setPageMode, setStackedPageIds,
    setReadingPage, setFocusedBlock, setDecryptionKeys, setSaveState, setQuery,
    setNeedsUsernameClaim, setOnboardingOpen, commitPages, togglePageCollapse,
    undo, redo,
  }), [commitPages, togglePageCollapse, undo, redo]);

  return (
    <WorkspaceContext.Provider value={[state, actions]}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceState() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspaceState must be used within WorkspaceProvider");
  return ctx[0];
}

export function useWorkspaceActions() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspaceActions must be used within WorkspaceProvider");
  return ctx[1];
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
