import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Confetti, Toast } from "./components/ui";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Editor from "./components/Editor";
import { WorkspaceView, NewPageOverlay } from "./components/WorkspaceViews";
import LoadingScreen from "./components/auth/LoadingScreen";
import RingLoader from "./components/auth/RingLoader";
import AuthPage from "./components/auth/AuthPage";
import ClaimUsernameModal from "./components/auth/ClaimUsernameModal";
import OnboardingPage from "./onboarding/pages/OnboardingPage";
import { starterPageForTemplate } from "./onboarding/services/onboardingService";
import AIPanel from "./components/AIPanel";
import AIRightPanel from "./components/AIRightPanel";
import CommandPalette from "./components/CommandPalette";
import { SettingsModal, TrashModal, ShareModal, HelpModal, CustomDialog } from "./components/Modals";
import FocusZoom from "./features/focus/FocusZoom";
import StackedColumn from "./features/stacking/StackedColumn";
import ReadingMode from "./features/reading/ReadingMode";
import { motion, AnimatePresence } from "framer-motion";
import CanvasView from "./features/canvas/CanvasView";
import GraphView from "./features/graph/GraphView";

// Phase 3-5 Feature Imports
import ExportPanel from "./features/export/ExportPanel";
import WebClipper from "./features/clipper/WebClipper";
import VoiceCapture from "./features/voice/VoiceCapture";
import SpacedRepetition from "./features/spaced/SpacedRepetition";
import NoteLineage from "./features/lineage/NoteLineage";
import CoThinking from "./features/collab/CoThinking";
import { LockPageModal, encryptData, decryptData } from "./features/encryption/Encryption";
import ApiConsole from "./features/api/ApiConsole";
import { aiManager } from "./ai/AIManager";
import { initializeMemory } from "./ai/memory";
import { realtimeCollab } from "./lib/realtimeCollab";
import { auditEngine } from "./lib/auditEngine";
import { supabase } from "./lib/supabase";
import { TEST_MODE } from "./lib/envGuard";


import {
  uid,
  now,
  covers,
  emojis,
  timeAgo,
  plainText,
  blockFor,
  textToBlocks,
  makeEmptyDatabase,
  migrateLegacyIds,
  slugifyWorkspaceName
} from "./utils/helpers";
import { storageApi } from "./utils/storage";
import {
  normalizePages,
  getPageSubtreeIds,
  ensurePageEntity
} from "./utils/pageTreeOps";
import {
  fetchPages, fetchSettings, fetchAIChats, savePage, saveSetting, fetchUserProfile, upsertUserProfile, setOnboardingComplete,
  fetchPageInvites, acceptPageInvite, declinePageInvite, fetchSharedPages, updateSharedPage as updateSharedPageRemote
} from "./lib/supabaseService";
import type { Page, AIChat } from "./lib/supabaseService";
import type { Tables } from "../types/supabase";
import type { Block, LineageEntry } from "../types/blocks";
import type { OnboardingFormData, OnboardingPagePreview } from "./onboarding/types";

const TRASH_PURGE_DAYS = 30;
const TRASH_PURGE_MS = TRASH_PURGE_DAYS * 24 * 60 * 60 * 1000;

function purgeExpiredTrash(sourcePages: Page[], referenceTime: number = Date.now()): Page[] {
  const byId = new Map(sourcePages.map((page) => [page.id, page]));
  const purgeIds = new Set<string>();

  const markSubtree = (id: string) => {
    if (!byId.has(id) || purgeIds.has(id)) return;
    purgeIds.add(id);
    sourcePages.forEach((candidate) => {
      if (candidate.parentId === id) markSubtree(candidate.id);
    });
    (byId.get(id)?.content || []).forEach(markSubtree);
  };

  sourcePages.forEach((page) => {
    if (!page.trashed) return;
    const purgeAt = page.purgeAfter || page.deleteAfter;
    if (purgeAt && new Date(purgeAt).getTime() <= referenceTime) {
      markSubtree(page.id);
    }
  });

  return purgeIds.size ? sourcePages.filter((page) => !purgeIds.has(page.id)) : sourcePages;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeParams = useParams();
  const [appFlowState, setAppFlowState] = useState<"loading" | "auth" | "onboarding" | "workspace">("loading");
  // The signed-in user's id/username — threaded into OnboardingPage so
  // UsernameStep can (a) pre-fill an already-chosen username when
  // replaying onboarding from Settings, and (b) exclude the user's own
  // row from the availability check (see isUsernameAvailable's
  // excludeUserId param in supabaseService.ts).
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  // Real signed-in email (Supabase auth session / user_profiles.email) —
  // shown in the Sidebar's account popover and Settings' Account tab
  // instead of the previous fake multi-account email list.
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  // True only once we've actually checked the profile and confirmed no
  // username is set — starts false so the claim modal never flashes
  // before fetchUserProfile resolves.
  const [needsUsernameClaim, setNeedsUsernameClaim] = useState(false);
  // Pages shared TO the current user (fetchSharedPages) — deliberately
  // kept in a SEPARATE array from `pages`, never merged into it. `pages`
  // is what the auto-save pipeline (utils/storage.ts -> savePages) syncs
  // on every change, stamping every row with the CURRENT user's id — if
  // a shared page ever ended up in that array, the very next auto-save
  // would silently reassign its ownership to whoever's viewing it. See
  // sharedActivePage/handleSharedBlockPatch below for how edits to a
  // shared page are routed to savePage() directly instead.
  const [sharedPages, setSharedPages] = useState<Page[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Tables<"page_invites">[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('My Workspace');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiRightOpen, setAiRightOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState("General");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [newPageDraft, setNewPageDraft] = useState<Page | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [appView, setAppView] = useState("page");
  const [pageMode, setPageMode] = useState("doc"); // "doc" | "canvas" | "graph"
  const [theme, setTheme] = useState("light");
  const [themeFx, setThemeFx] = useState({
    variant: "rectangle",
    start: "bottom-up",
    blur: false,
    gifType: "1",
    gifUrl: "https://media.giphy.com/media/KBbr4hHl9DSahKvInO/giphy.gif?cid=790b76112m5eeeydoe7et0cr3j3ekb1erunxozyshuhxx2vl&ep=v1_stickers_search&rid=giphy.gif&ct=s"
  });
  const [saveState, setSaveState] = useState("Saved");
  const [query, setQuery] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [aiProvider, setAiProvider] = useState("nvidia");
  const [nvidiaKey, setNvidiaKey] = useState("");
  const [aiChats, setAiChats] = useState<AIChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [history, setHistory] = useState<Page[][]>([]);
  const [future, setFuture] = useState<Page[][]>([]);
  const [confetti, setConfetti] = useState(false);
  const [toast, setToast] = useState("");
  const [renameFocusId, setRenameFocusId] = useState<string | null>(null);
  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(() => new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [clipperOpen, setClipperOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [lineageOpen, setLineageOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [encryptOpen, setEncryptOpen] = useState(false);
  const [apiConsoleOpen, setApiConsoleOpen] = useState(false);
  const [ghostWriterEnabled, setGhostWriterEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("noska_ghost_writer_enabled");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [decryptionKeys, setDecryptionKeys] = useState<Record<string, string>>({});

  interface DialogState {
    open: boolean;
    type: "prompt" | "confirm";
    title: string;
    placeholder: string;
    defaultValue: string;
    resolve: ((value: string | boolean | null) => void) | null;
  }
  const [dialogState, setDialogState] = useState<DialogState>({ open: false, type: "prompt", title: "", placeholder: "", defaultValue: "", resolve: null });

  useEffect(() => {
    window.noskaPrompt = (title: string, defaultValue = "", placeholder = "") => {
      return new Promise<string | null>((resolve) => {
        setDialogState({
          open: true,
          type: "prompt",
          title,
          placeholder,
          defaultValue,
          resolve: resolve as (value: string | boolean | null) => void
        });
      });
    };

    window.noskaConfirm = (title: string) => {
      return new Promise<boolean>((resolve) => {
        setDialogState({
          open: true,
          type: "confirm",
          title,
          placeholder: "",
          defaultValue: "",
          resolve: resolve as (value: string | boolean | null) => void
        });
      });
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("noska_ghost_writer_enabled", JSON.stringify(ghostWriterEnabled));
  }, [ghostWriterEnabled]);

  const [focusedBlock, setFocusedBlock] = useState<Block | null>(null);
  const [stackedPageIds, setStackedPageIds] = useState<string[]>([]);
  const [readingPage, setReadingPage] = useState<Page | null>(null);
  const hydrated = useRef(false);

  // Real bug, fixed: this used to match `activeId` against ANY page
  // regardless of trashed status, so trashing the active page (with no
  // sibling to fall back to — trashPageSubtree only reassigns activeId
  // when it finds a non-trashed replacement) left activeId pointed at a
  // now-trashed page. The topbar/editor kept showing it as if nothing
  // happened, and reloading "restored" it — really it was never
  // deactivated, just still sitting in `pages` with `trashed: true`.
  // Every fallback here must exclude trashed pages — including the last
  // one, which used to be a bare `pages[0]` that could itself be trashed
  // if every page in the workspace was. When no non-trashed page exists
  // at all, activePage is correctly undefined, which renders the
  // (now-fixed, recoverable) empty-pages screen instead of a trashed page.
  // Checked in order: (1) an owned, non-trashed page matching activeId,
  // (2) a page shared TO this user matching activeId — this is what makes
  // a shared page's deep link / Inbox "open page" actually resolve, (3)
  // only if NEITHER matches, fall back to the first owned non-trashed
  // page (the original empty-active-id / trashed-active-page recovery
  // behavior, unchanged). `isSharedActivePage` lets the block-patch/
  // updatePage call sites below route edits through updateSharedPage()
  // instead of the normal commitPages() pipeline, which would otherwise
  // silently reassign ownership (see sharedPages' declaration comment).
  // A shared page's own `permission` field (getPagePermission/Editor.tsx's
  // existing "View only" badge/edit-gating) is derived from its grant role
  // here rather than mutated at the source — `permission` is otherwise a
  // distinct, purely client-side "read-only toggle" concept (see its own
  // doc comment in supabaseService.ts) that this shouldn't conflate with.
  // `viewer`/`commenter` grants render read-only; only `editor` allows edits.
  // Factored into a helper (real bug fix, found during live UI QA): the
  // stacked-column `colPage` lookup below used to read straight from
  // `sharedPages` without this mapping, so a viewer/commenter opening a
  // shared page via the stacked column (e.g. Ctrl-click from Inbox/Library)
  // got full edit affordances in the actual Editor.tsx rendering path even
  // though `activePage` correctly showed read-only.
  const withSharedPermission = (p: Page): Page =>
    ({ ...p, permission: p.sharedRole === "editor" ? "edit" as const : "view" as const });

  const activeOwnedMatch = pages.find((p) => p.id === activeId && !p.trashed);
  const activeSharedMatch = !activeOwnedMatch ? sharedPages.find((p) => p.id === activeId) : undefined;
  const isSharedActivePage = !activeOwnedMatch && !!activeSharedMatch;
  const activePage = activeOwnedMatch
    || (activeSharedMatch ? withSharedPermission(activeSharedMatch) : undefined)
    || pages.find((p) => !p.trashed);
  const visiblePages = pages.filter((p) => !p.trashed);
  const trashPages = pages.filter((p) => p.trashed);
  const pageText = activePage ? plainText(activePage) : "";

  const toolContext = useMemo(() => ({
    currentPage: activePage,
    pages: visiblePages,
    actions: {
      createPage: (title: string, icon?: string, content?: string, tags?: string) => {
        const id = uid();
        const blocks = content ? textToBlocks(content) : [{ id: uid(), type: "text", text: "" }];
        const page = {
          id, title, icon: icon || "📝", cover: null,
          parentId: null, favorite: false, trashed: false,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          updatedAt: now(), blocks,
          lineage: [{ action: "ai-created" as const, timestamp: now(), detail: `Created by AI: "${title}"` }]
        } as unknown as Page;
        commitPages([page, ...pages]);
        setActiveId(id);
        setAppView("page");
        setRenameFocusId(id);
        return id;
      },
      renamePage: (title: string) => updatePage(activePage.id, { title }),
      appendBlocks: (blocks: Block[]) => {
        auditEngine.log({ pageId: activePage.id, userId: realtimeCollab.getUser()?.userId || 'ai', userName: 'AI', action: 'ai_generated', contentBefore: { blockCount: activePage.blocks.length }, contentAfter: { blockCount: activePage.blocks.length + blocks.length }, detail: `AI appended ${blocks.length} blocks` });
        updatePage(activePage.id, { blocks: [...activePage.blocks, ...blocks] });
      },
      setPageTags: (tags: unknown[]) => updatePage(activePage.id, { tags }),
      updateAnyPage: (id: string, patch: Partial<Page>) => updatePage(id, patch),
      replaceBlocks: (blocks: Block[]) => {
        auditEngine.log({ pageId: activePage.id, userId: realtimeCollab.getUser()?.userId || 'ai', userName: 'AI', action: 'ai_edit', contentBefore: { blocks: activePage.blocks }, contentAfter: { blocks }, detail: 'AI replaced all blocks' });
        updateBlocks(blocks);
      },
      insertBlock: (index: number, block: Block) => {
        auditEngine.log({ pageId: activePage.id, userId: realtimeCollab.getUser()?.userId || 'ai', userName: 'AI', action: 'ai_edit', blockId: block.id, contentAfter: block, detail: `AI inserted ${block.type} block at position ${index}` });
        const blocks = [...(activePage?.blocks || [])];
        blocks.splice(index, 0, block);
        updateBlocks(blocks);
      },
      deleteBlock: (blockId: string) => {
        const target = (activePage?.blocks || []).find(b => b.id === blockId);
        if (!target) return;
        auditEngine.log({ pageId: activePage.id, userId: realtimeCollab?.getUser?.()?.userId || 'ai', userName: 'AI', action: 'delete', blockId, contentBefore: target, detail: 'AI deleted block' });
        updateBlocks((activePage?.blocks || []).filter(b => b.id !== blockId));
      },
      updateBlockById: (blockId: string, patch: Record<string, unknown>) => {
        const target = (activePage?.blocks || []).find(b => b.id === blockId);
        if (!target) return;
        auditEngine.log({ pageId: activePage.id, userId: realtimeCollab?.getUser?.()?.userId || 'ai', userName: 'AI', action: 'edit', blockId, contentBefore: target, contentAfter: { ...target, ...patch }, detail: 'AI updated block' });
        updateBlock(blockId, patch);
      },
      undo: () => undo(),
      redo: () => redo()
    }
  }), [activePage, visiblePages, pages]);

  const dark = theme === "dark" || (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
  }, [dark]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const store = storageApi();
      let loadedPages: Page[] = [];
      let loadedSettings: Record<string, unknown> = {};
      let loadedChats: AIChat[] = [];

      // ⚠️ TEST MODE: skip all Supabase calls and load exclusively from localStorage.
      // TEST_MODE is forced off against the production project (see envGuard.js).
      if (TEST_MODE) {
        const pairs = await Promise.all(
          ["pages", "activeId", "workspaceName", "theme", "sidebarOpen", "apiKey",
           "themeFx", "aiProvider", "nvidiaKey", "appView", "aiChats", "activeChatId",
           "stackedPageIds"].map((k) => store.get(k))
        );
        if (!mounted) return;

        if (pairs[0].value) {
          try { loadedPages = JSON.parse(pairs[0].value); } catch (e) { console.warn("App: failed to parse pages from storage", e); }
        }
        if (pairs[10].value) {
          try { loadedChats = JSON.parse(pairs[10].value); } catch (e) { console.warn("App: failed to parse chats from storage", e); }
        }

        const { idMap } = migrateLegacyIds(loadedPages, loadedChats);
        if (idMap && Object.keys(idMap).length > 0) {
          if (pairs[1].value) {
            const savedId = JSON.parse(pairs[1].value);
            if (idMap[savedId]) pairs[1].value = JSON.stringify(idMap[savedId]);
          }
          if (pairs[12]?.value) {
            const stack = JSON.parse(pairs[12].value);
            pairs[12].value = JSON.stringify(stack.map((s) => idMap[s] || s));
          }
        }

        loadedPages = purgeExpiredTrash(
          normalizePages(loadedPages.map(p => ({ ...p, content: p.content || [] })))
        );
        setPages(loadedPages);
        setAiChats(loadedChats);

        const firstId = loadedPages[0]?.id;
        if (pairs[1].value) {
          const savedId = JSON.parse(pairs[1].value);
          if (loadedPages.some((p) => p.id === savedId)) {
            setActiveId(savedId);
            setStackedPageIds([savedId]);
          } else if (firstId) {
            setActiveId(firstId);
            setStackedPageIds([firstId]);
          }
        } else if (firstId) {
          setActiveId(firstId);
          setStackedPageIds([firstId]);
        }

        if (pairs[2].value) {
          try {
            const savedName = JSON.parse(pairs[2].value);
            if (savedName !== "Noska") setWorkspaceName(savedName);
          } catch {}
        }
        if (pairs[4].value) setSidebarOpen(JSON.parse(pairs[4].value));
        if (pairs[5].value) setApiKey(JSON.parse(pairs[5].value));
        if (pairs[6].value) setThemeFx(JSON.parse(pairs[6].value));
        if (pairs[7].value) setAiProvider(JSON.parse(pairs[7].value));
        if (pairs[8].value) setNvidiaKey(JSON.parse(pairs[8].value));
        if (pairs[9].value) setAppView(JSON.parse(pairs[9].value));
        if (pairs[11].value) setActiveChatId(JSON.parse(pairs[11].value));

        realtimeCollab.initUser(
          localStorage.getItem("noska_user_id") || uid(),
          "Test Workspace",
          "👤"
        );

        hydrated.current = true;
        setLoading(false);
        initializeMemory().catch(() => {});
        setAppFlowState("workspace");
        return;
      }

      // 1. Check session FIRST — determines user isolation
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      const userId = session?.user?.id || null;

      // 2. Fetch data from Supabase (filtered by user_id if logged in)
      try {
        const [remotePages, remoteSettings, remoteChats] = await Promise.all([
          fetchPages(userId),
          fetchSettings(),
          fetchAIChats(userId)
        ]);
        if (!mounted) return;
        loadedPages = remotePages;
        loadedSettings = remoteSettings;
        loadedChats = remoteChats;
      } catch (e) {
        console.warn("Supabase load failed", e);
      }

      // 3. Always load localStorage pages as fallback/override (covers unsaved changes)
      try {
        const localPagesRaw = await store.get("pages");
        if (!mounted) return;
        if (localPagesRaw?.value) {
          const localPages: Page[] = JSON.parse(localPagesRaw.value);
          const localMap = new Map(localPages.map(p => [p.id, p]));
          // Merge: for any page found in both localStorage and Supabase, prefer the newer one
          loadedPages = loadedPages.map(p => {
            const local = localMap.get(p.id);
            return local && new Date(local.updatedAt || 0) > new Date(p.updatedAt || 0) ? local : p;
          });
          // Add pages from localStorage that don't exist in Supabase
          for (const local of localPages) {
            if (!loadedPages.some(p => p.id === local.id)) {
              loadedPages.push(local);
            }
          }
        }
      } catch (e) { console.warn("App: localStorage merge failed", e); }

      // 4. Final normalization
      if (!userId) {
        const pairs = await Promise.all(
          ["pages", "activeId", "workspaceName", "theme", "sidebarOpen", "apiKey",
           "themeFx", "aiProvider", "nvidiaKey", "appView", "aiChats", "activeChatId",
           "stackedPageIds"].map((k) => store.get(k))
        );
        if (!mounted) return;

        if (loadedPages.length === 0 && pairs[0].value) {
          try { loadedPages = JSON.parse(pairs[0].value); } catch (e) { console.warn("App: failed to parse pages from storage", e); }
        }

        if (loadedChats.length === 0 && pairs[10].value) {
          try { loadedChats = JSON.parse(pairs[10].value); } catch (e) { console.warn("App: failed to parse chats from storage", e); }
        }

        const { idMap } = migrateLegacyIds(loadedPages, loadedChats);

        if (idMap && Object.keys(idMap).length > 0) {
          if (pairs[1].value) {
            const savedId = JSON.parse(pairs[1].value);
            if (idMap[savedId]) pairs[1].value = JSON.stringify(idMap[savedId]);
          }
          if (pairs[12]?.value) {
            const stack = JSON.parse(pairs[12].value);
            pairs[12].value = JSON.stringify(stack.map((s) => idMap[s] || s));
          }
        }

        loadedPages = purgeExpiredTrash(
          normalizePages(loadedPages.map(p => ({ ...p, content: p.content || [] })))
        );
        setPages(loadedPages);
        setAiChats(loadedChats);

        const firstId = loadedPages[0]?.id;

        if (pairs[1].value) {
          const savedId = JSON.parse(pairs[1].value);
          if (loadedPages.some((p) => p.id === savedId)) {
            setActiveId(savedId);
            setStackedPageIds([savedId]);
          } else if (firstId) {
            setActiveId(firstId);
            setStackedPageIds([firstId]);
          }
        } else if (firstId) {
          setActiveId(firstId);
          setStackedPageIds([firstId]);
        }

        if (loadedSettings.workspaceName && loadedSettings.workspaceName !== "Noska") {
          setWorkspaceName(loadedSettings.workspaceName as string);
        } else if (pairs[2].value) {
          try {
            const savedName = JSON.parse(pairs[2].value);
            if (savedName !== "Noska") setWorkspaceName(savedName);
          } catch {}
        }

        if (loadedSettings.theme) {
          setTheme(loadedSettings.theme === "system" ? "dark" : (loadedSettings.theme as string));
        } else if (pairs[3].value) {
          const savedTheme = JSON.parse(pairs[3].value);
          setTheme(savedTheme === "system" ? "dark" : savedTheme);
        }

        if (pairs[4].value) setSidebarOpen(JSON.parse(pairs[4].value));
        if (pairs[5].value) setApiKey(JSON.parse(pairs[5].value));
        if (pairs[6].value) setThemeFx(JSON.parse(pairs[6].value));
        if (pairs[7].value) setAiProvider(JSON.parse(pairs[7].value));
        if (pairs[8].value) setNvidiaKey(JSON.parse(pairs[8].value));
        if (pairs[9].value) setAppView(JSON.parse(pairs[9].value));
        if (pairs[11].value) setActiveChatId(JSON.parse(pairs[11].value));

        realtimeCollab.initUser(
          localStorage.getItem("noska_user_id") || uid(),
          workspaceName || 'My Workspace',
          "👤"
        );

        hydrated.current = true;
        setLoading(false);

        const legacyApiKey = pairs[5].value ? JSON.parse(pairs[5].value) : "";
        const legacyProvider = pairs[7].value ? JSON.parse(pairs[7].value) : "nvidia";
        const legacyNvidiaKey = pairs[8].value ? JSON.parse(pairs[8].value) : "";
        initializeMemory().catch(() => {});

        aiManager.migrateFromLegacy({
          apiKey: legacyApiKey,
          aiProvider: legacyProvider,
          nvidiaKey: legacyNvidiaKey
        });

        if (routeParams.pageId && loadedPages.some((p) => p.id === routeParams.pageId)) {
          setActiveId(routeParams.pageId);
          setStackedPageIds((prev) => prev.includes(routeParams.pageId) ? prev : [routeParams.pageId]);
        }

        // ⚠️ TEST MODE BYPASS — NEVER enable in production builds.
        // When TEST_MODE is on, skip the auth/onboarding flow and jump
        // directly into the workspace so automated end-to-end tests can
        // interact with the editor without Supabase authentication.
        // TEST_MODE is forced off against production by envGuard.js.
        if (TEST_MODE) {
          setAppFlowState("workspace");
        }
        return;
      }

      // 4. Authenticated user: use fetched data (already filtered by user_id)
      const u = session.user;
      const uname = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Workspace User';
      realtimeCollab.initUser(u.id, uname, u.user_metadata?.avatar_url || u.user_metadata?.picture || '👤');
      setWorkspaceName(prev => prev === 'My Workspace' ? `${uname}'s Workspace` : prev);
      setCurrentUserId(u.id);
      setCurrentUserEmail(u.email || null);
      loadCollabData(u.id);

      try {
        const profile = await fetchUserProfile(u.id);
        setCurrentUsername(profile?.username ?? null);
        if (profile?.onboarding_complete) {
          // Returning user with no username yet (pre-existing account from
          // before this feature) — gate them with ClaimUsernameModal once
          // they land in the workspace, instead of forcing them back
          // through the full onboarding wizard.
          setNeedsUsernameClaim(!profile.username);
          // Returning user: set their data
          const normalized = normalizePages(loadedPages.map(p => ({ ...p, content: p.content || [] })));
          setPages(normalized);
          setAiChats(loadedChats);
          if (normalized.length > 0) {
            const deepLinkId = routeParams.pageId && normalized.some((p) => p.id === routeParams.pageId)
              ? routeParams.pageId
              : normalized[0].id;
            setActiveId(deepLinkId);
            setStackedPageIds([deepLinkId]);
          }
          setAppFlowState("workspace");
        } else {
          // New user: clear everything, redirect to onboarding
          setPages([]);
          setAiChats([]);
          setActiveId(null);
          setStackedPageIds([]);
          setAppFlowState("onboarding");
        }
      } catch {
        setPages([]);
        setAiChats([]);
        setActiveId(null);
        setStackedPageIds([]);
        setAppFlowState("onboarding");
      }

      if (loadedSettings.workspaceName && loadedSettings.workspaceName !== "Noska") {
        setWorkspaceName(loadedSettings.workspaceName as string);
      }
      if (loadedSettings.theme) {
        setTheme(loadedSettings.theme === "system" ? "dark" : (loadedSettings.theme as string));
      }

      hydrated.current = true;
      setLoading(false);

      const storedApiKey = localStorage.getItem("apiKey");
      const storedProvider = localStorage.getItem("aiProvider") || "nvidia";
      const storedNvidiaKey = localStorage.getItem("nvidiaKey");
      initializeMemory().catch(() => {});

      aiManager.migrateFromLegacy({
        apiKey: storedApiKey ? JSON.parse(storedApiKey) : "",
        aiProvider: storedProvider,
        nvidiaKey: storedNvidiaKey ? JSON.parse(storedNvidiaKey) : ""
      });

      if (routeParams.pageId && loadedPages.some((p) => p.id === routeParams.pageId)) {
        setActiveId(routeParams.pageId);
        setStackedPageIds((prev) => prev.includes(routeParams.pageId) ? prev : [routeParams.pageId]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  interface AuthUserData {
    userId: string;
    userName?: string;
    email?: string;
    avatarUrl?: string | null;
  }

  // Auth success handler — routes returning users straight to their
  // workspace, and only first-time users (no profile yet, or
  // onboarding_complete === false) to /onboarding.
  const handleAuthSuccess = useCallback(async (userData: AuthUserData) => {
    const uname = userData.userName || 'Workspace User';
    realtimeCollab.initUser(userData.userId, uname, userData.avatarUrl || '👤');
    try { localStorage.setItem("noska_user_id", userData.userId); } catch {}
    setCurrentUserId(userData.userId);
    setCurrentUserEmail(userData.email || null);
    loadCollabData(userData.userId);

    let existingProfile = null;
    try {
      existingProfile = await fetchUserProfile(userData.userId);
      setCurrentUsername(existingProfile?.username ?? null);
    } catch (e) {
      console.warn("App: failed to fetch user profile", e);
    }

    try {
      await upsertUserProfile({
        userId: userData.userId,
        userName: uname,
        email: userData.email,
        avatarUrl: userData.avatarUrl,
        // Preserve an existing onboarding_complete flag — upsertUserProfile
        // otherwise defaults it to false, which would silently re-onboard
        // returning users on every login.
        onboardingComplete: existingProfile?.onboarding_complete ?? false,
        useCase: existingProfile?.use_case,
        workspaceName: existingProfile?.workspace_name
      });
    } catch (e) {
      console.warn("App: failed to save user profile", e);
    }

    if (existingProfile?.onboarding_complete) {
      // Same pre-existing-account gate as the initial-mount bootstrap
      // above — see its comment for why this can't just be folded into
      // the onboarding wizard for these users.
      setNeedsUsernameClaim(!existingProfile.username);
      // Returning user signing in mid-session (the initial mount bootstrap
      // already ran before this sign-in completed) — load their data now.
      try {
        const [remotePages, remoteChats] = await Promise.all([
          fetchPages(userData.userId),
          fetchAIChats(userData.userId)
        ]);
        const normalized = normalizePages(remotePages.map(p => ({ ...p, content: p.content || [] })));
        setPages(normalized);
        setAiChats(remoteChats);
        if (normalized.length > 0) {
          setActiveId(normalized[0].id);
          setStackedPageIds([normalized[0].id]);
        }
      } catch (e) {
        console.warn("App: failed to load returning user's pages", e);
      }
      if (existingProfile.workspace_name) setWorkspaceName(existingProfile.workspace_name);
      setAppFlowState("workspace");
    } else {
      setWorkspaceName(`${uname}'s Workspace`);
      setPages([]);
      setAiChats([]);
      setActiveId(null);
      setStackedPageIds([]);
      setAppFlowState("onboarding");
    }
  }, []);

  // Build starter pages (local state, no DB dependency). The onboarding
  // flow lets the user pick one starter template — build that page, falling
  // back to a default "Getting Started" page if none was picked.
  //
  // NOTE on the return type: `OnboardingProviderProps.onFinalize` (see
  // OnboardingContext.tsx) declares this callback's return as
  // `OnboardingPagePreview[]` ({title, icon} only), but the objects
  // actually produced here (and by starterPageForTemplate) are full
  // page-like objects with id/blocks/lineage/etc. — and
  // handleOnboardingComplete below genuinely relies on those extra
  // fields (it passes `starterPages` straight into `setPages`/`savePage`).
  // This is a pre-existing type/reality mismatch in the onboarding
  // context's declared callback type, not introduced here; documented
  // via a cast rather than "fixed" by narrowing what this function
  // builds, since the real page objects are what the rest of the app
  // needs.
  const handleFinalize = useCallback(async (formData: OnboardingFormData): Promise<OnboardingPagePreview[]> => {
    const result: Page[] = [];
    if (formData.template) {
      result.push(starterPageForTemplate(formData.template) as unknown as Page);
    }
    if (result.length === 0) {
      // Real bug, fixed: this fallback page never set createdAt/updatedAt
      // (same gap as onboardingService.ts's basePage()), so it hit the
      // same "~20640d ago" epoch-fallback display bug in timeAgo().
      const timestamp = now();
      result.push({
        id: uid(), title: "Getting Started", icon: "🚀",
        favorite: false, trashed: false, tags: [], parentId: null,
        createdAt: timestamp, updatedAt: timestamp,
        lineage: [{ action: "created" as const, timestamp, detail: "Default starter page" }],
        blocks: textToBlocks("# Getting Started\n\nWelcome to Noska!")
      });
    }
    return result as unknown as OnboardingPagePreview[];
  }, []);

  // Onboarding complete — set pages directly in state, persist async
  const handleOnboardingComplete = useCallback(async (formData: OnboardingFormData, starterPages: OnboardingPagePreview[]) => {
    if (formData.workspaceName) setWorkspaceName(formData.workspaceName);
    // See handleFinalize's comment above — `starterPages` is declared as
    // OnboardingPagePreview[] but is really the Page[] built by
    // handleFinalize; cast back to what this function actually needs.
    const realStarterPages = starterPages as unknown as Page[];
    // Real bug, fixed: same missing createdAt/updatedAt gap as
    // handleFinalize's fallback above — this is the last-resort path when
    // starterPages itself is empty.
    const fallbackTimestamp = now();
    const pages: Page[] = realStarterPages && realStarterPages.length > 0 ? realStarterPages : [{
      id: uid(), title: "Getting Started", icon: "🚀",
      favorite: false, trashed: false, tags: [], parentId: null,
      createdAt: fallbackTimestamp, updatedAt: fallbackTimestamp,
      lineage: [{ action: "created" as const, timestamp: fallbackTimestamp, detail: "Fallback starter page" }],
      blocks: textToBlocks("# Getting Started\n\nWelcome to Noska!")
    }];
    setPages(pages);
    setActiveId(pages[0].id);
    setStackedPageIds([pages[0].id]);
    const user = realtimeCollab?.getUser?.();
    const userId = user?.userId;
    if (userId) {
      for (const page of pages) {
        try { await savePage(page, userId); } catch (e) {}
      }
      try {
        const useCaseValue = Array.isArray(formData.useCase) ? formData.useCase.join(",") : formData.useCase;
        await setOnboardingComplete(userId, useCaseValue, formData.workspaceName, formData.username);
        setCurrentUsername(formData.username || currentUsername);
      } catch (e) {}
    }
    setAppFlowState("workspace");
  }, [currentUsername]);

  // Accept/decline handlers for the Inbox's real invite cards. Both
  // update local state optimistically then reconcile with the server
  // response/failure — accepting also refreshes `sharedPages` since the
  // newly-granted page needs to actually appear somewhere.
  const handleAcceptInvite = useCallback(async (inviteId: string) => {
    if (!currentUserId) return;
    try {
      await acceptPageInvite(inviteId, currentUserId);
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      const shared = await fetchSharedPages(currentUserId);
      setSharedPages(shared);
      showToast("Invite accepted");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't accept invite");
    }
  }, [currentUserId]);

  const handleDeclineInvite = useCallback(async (inviteId: string) => {
    if (!currentUserId) return;
    try {
      await declinePageInvite(inviteId, currentUserId);
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      showToast("Invite declined");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't decline invite");
    }
  }, [currentUserId]);

  // Replay onboarding from settings
  const handleReplayOnboarding = useCallback(() => {
    setSettingsOpen(false);
    setOnboardingOpen(true);
  }, []);

  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Logout handler — clears cache, resets state, redirects to auth
  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    // Clear all user-data localStorage keys
    const keysToClear = [
      "noska_user_id", "noska_workspace_joined", "noska_sidebar_data",
      "noska_share_invites", "noska_ai_profile", "noska_ghost_writer_enabled",
      "noska_api_key", "noska_ai_config", "noska_memory", "noska_user_profile",
      "noska_inbox_reminders", "noska-graph-positions",
      "pages", "aiChats", "activeId", "workspaceName", "sidebarOpen",
      "apiKey", "themeFx", "aiProvider", "nvidiaKey", "appView",
      "activeChatId", "stackedPageIds"
    ];
    keysToClear.forEach(k => { try {
      // Clear both exact match and any namespaced variants
      localStorage.removeItem(k);
      // Clear canvas position keys (noska-canvas-pos-*)
      if (k === "noska_user_id") {
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("noska-canvas-pos-") || key.startsWith("noska-graph-"))) {
            toRemove.push(key);
          }
        }
        toRemove.forEach(key => localStorage.removeItem(key));
      }
    } catch {} });
    setPages([]);
    setAiChats([]);
    setActiveId(null);
    setStackedPageIds([]);
    setWorkspaceName('My Workspace');
    // Real bug fix: currentUserId/currentUsername/currentUserEmail were
    // never reset here, so the Sidebar's account popover (and Settings'
    // Account tab) kept showing the previous session's identity until a
    // full page reload happened to re-run the bootstrap effect.
    setCurrentUserId(null);
    setCurrentUsername(null);
    setCurrentUserEmail(null);
    realtimeCollab.initUser(`anon-${Math.random().toString(36).slice(2, 11)}`, 'Anonymous', '👤');
    realtimeCollab.leaveWorkspace();
    setAppFlowState("auth");
    setToast("Logged out. See you next time.");
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    setSaveState("Saving...");
    const t = setTimeout(async () => {
      const store = storageApi();
      const serializedPages = await Promise.all(
        pages.map(async (p) => {
          if (p.isEncrypted) {
            const passphrase = decryptionKeys[p.id];
            if (passphrase) {
              try {
                const { encryptedBlocks, iv, salt } = await encryptData(JSON.stringify(p.blocks || []), passphrase);
                return {
                  ...p,
                  blocks: [],
                  isLocked: true,
                  encryptedBlocks,
                  iv,
                  salt
                };
              } catch (e) {
                console.error("Autosave encryption error", e);
              }
            }
            return {
              ...p,
              blocks: [],
              isLocked: true
            };
          }
          return p;
        })
      );

      const safeStringify = (val: unknown, fallback: string = "[]") => {
        try { return JSON.stringify(val); } catch (e) { console.warn("Safe stringify failed:", (e as Error).message); return fallback; }
      };
      await Promise.all([
        store.set("pages", safeStringify(serializedPages)),
        store.set("activeId", safeStringify(activeId, '""')),
        store.set("workspaceName", safeStringify(workspaceName, '""')),
        store.set("theme", safeStringify(theme, '"dark"')),
        store.set("sidebarOpen", safeStringify(sidebarOpen, "true")),
        store.set("apiKey", safeStringify(apiKey, '""')),
        store.set("themeFx", safeStringify(themeFx)),
        store.set("aiProvider", safeStringify(aiProvider, '"nvidia"')),
        store.set("nvidiaKey", safeStringify(nvidiaKey, '""')),
        store.set("appView", safeStringify(appView, '"page"')),
        store.set("aiChats", safeStringify(aiChats)),
        store.set("activeChatId", safeStringify(activeChatId, "null")),
        store.set("stackedPageIds", safeStringify(stackedPageIds))
      ]);
      setSaveState("Saved");
    }, 500);
    return () => clearTimeout(t);
  }, [pages, activeId, workspaceName, theme, sidebarOpen, apiKey, themeFx, aiProvider, nvidiaKey, appView, aiChats, activeChatId, stackedPageIds, decryptionKeys]);

  // Keep the URL in sync with appFlowState: /login while signing in,
  // /onboarding for first-time users, /<workspace-slug>/<pageId> once inside
  // the workspace. Uses replace so these transitions don't spam browser
  // history — back/forward within the workspace is handled by
  // selectByOffset/sidebar navigation, not URL history entries.
  useEffect(() => {
    if (appFlowState === "loading") return;
    if (appFlowState === "auth") {
      if (location.pathname !== "/login") navigate("/login", { replace: true });
      return;
    }
    if (appFlowState === "onboarding") {
      if (location.pathname !== "/onboarding") navigate("/onboarding", { replace: true });
      return;
    }
    if (appFlowState === "workspace") {
      const slug = slugifyWorkspaceName(workspaceName);
      const nextPath = activeId ? `/${slug}/${activeId}` : `/${slug}`;
      if (location.pathname !== nextPath) navigate(nextPath, { replace: true });
    }
  }, [appFlowState, activeId, workspaceName, location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openNewPage();
      }
      if (e.key === "?") setHelpOpen(true);
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicatePage(activePage.id);
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setExportOpen(true);
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setClipperOpen(true);
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        setVoiceOpen(true);
      }
      if (mod && e.key === "\\") {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        selectByOffset(-1);
      }
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        selectByOffset(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const commitPages = (next: Page[]) => {
    setHistory((h) => [...h.slice(-24), pages]);
    setFuture([]);
    setPages(next);
    try {
      localStorage.setItem("pages", JSON.stringify(next.map(p => {
        if (p.isEncrypted) return { ...p, blocks: [] };
        return p;
      })));
    } catch {}
  };

  const normalizePageTree = (sourcePages: Page[], orderHints: Map<string, string[]> = new Map()) => normalizePages(sourcePages, orderHints);

  const sortSiblings = (sourcePages: Page[], parentId: string | null, orderedIds: string[] = []): Page[] => {
    if (!orderedIds.length) return sourcePages;
    const targetParentId = parentId || null;
    const originalIndex = new Map(sourcePages.map((page, index) => [page.id, index]));
    const order = new Map(orderedIds.map((id, index) => [id, index]));

    return [...sourcePages].sort((a, b) => {
      const aSibling = (a.parentId || null) === targetParentId;
      const bSibling = (b.parentId || null) === targetParentId;
      if (aSibling && !bSibling) return -1;
      if (!aSibling && bSibling) return 1;
      if (!aSibling && !bSibling) return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
      const aOrder = order.has(a.id) ? order.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const bOrder = order.has(b.id) ? order.get(b.id)! : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  };

  const getPageSubtreeIdsLocal = (pageId: string, sourcePages: Page[] = pages) => getPageSubtreeIds(pageId, sourcePages);

  const movePage = (pageId: string, parentId: string | null, orderedSiblingIds: string[] = []) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    const targetParentId = parentId || null;
    if (targetParentId && getPageSubtreeIdsLocal(pageId).has(targetParentId)) {
      showToast("Cannot move a page inside itself");
      return;
    }

    const movedAt = now();
    let nextPages = pages.map((p) => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        parentId: targetParentId,
        updatedAt: movedAt,
        lineage: [
          ...(p.lineage || []),
          { action: "moved" as const, timestamp: movedAt, detail: targetParentId ? "Moved under another page" : "Moved to top level" }
        ]
      };
    });

    const siblingOrder = orderedSiblingIds.includes(pageId) ? orderedSiblingIds : [...orderedSiblingIds, pageId];
    nextPages = sortSiblings(nextPages, targetParentId, siblingOrder);
    const hints = new Map<string, string[]>();
    if (targetParentId) hints.set(targetParentId, siblingOrder);
    commitPages(normalizePageTree(nextPages, hints));
  };

  const trashPageSubtree = (pageId: string) => {
    const subtreeIds = getPageSubtreeIdsLocal(pageId);
    if (!subtreeIds.size) return;
    const timestamp = now();
    const purgeAfter = new Date(Date.now() + TRASH_PURGE_MS).toISOString();
    const nextPages = normalizePageTree(
      pages.map((p) => subtreeIds.has(p.id)
        ? {
            ...p,
            trashed: true,
            trashedAt: timestamp,
            purgeAfter,
            updatedAt: timestamp,
            lineage: [
              ...(p.lineage || []),
              { action: "trashed" as const, timestamp, detail: p.id === pageId ? `Moved page subtree to trash; purges after ${TRASH_PURGE_DAYS} days` : "Moved to trash with parent page" }
            ]
          }
        : p
      )
    );

    setStackedPageIds((prev) => prev.filter((id) => !subtreeIds.has(id)));
    if (activeId && subtreeIds.has(activeId)) {
      const nextActive = nextPages.find((p) => !p.trashed && !subtreeIds.has(p.id));
      if (nextActive) setActiveId(nextActive.id);
    }
    auditEngine.log({ pageId, userId: realtimeCollab.getUser()?.userId || 'system', userName: realtimeCollab.getUser()?.userName || 'System', action: 'trashed', detail: 'Moved page subtree to trash' });
    commitPages(nextPages);
  };

  const restorePageSubtree = (pageId: string) => {
    const subtreeIds = getPageSubtreeIdsLocal(pageId);
    if (!subtreeIds.size) return;
    const timestamp = now();
    const byId = new Map(pages.map((p) => [p.id, p]));
    const root = byId.get(pageId);
    const canRestoreRootParent = root?.parentId && byId.has(root.parentId) && !byId.get(root.parentId).trashed;

    const nextPages = normalizePageTree(
      pages.map((p) => {
        if (!subtreeIds.has(p.id)) return p;
        const parent = p.parentId ? byId.get(p.parentId) : null;
        const parentIsRestoring = p.parentId ? subtreeIds.has(p.parentId) : false;
        const parentStillValid = parentIsRestoring || (parent && !parent.trashed);
        return {
          ...p,
          parentId: p.id === pageId && !canRestoreRootParent ? null : (parentStillValid ? p.parentId : null),
          trashed: false,
          trashedAt: undefined,
          purgeAfter: undefined,
          deleteAfter: undefined,
          updatedAt: timestamp,
          lineage: [
            ...(p.lineage || []),
            { action: "restored" as const, timestamp, detail: p.id === pageId ? "Restored page subtree from trash" : "Restored with parent page" }
          ]
        };
      })
    );

    setActiveId(pageId);
    setAppView("page");
    setStackedPageIds((prev) => prev.includes(pageId) ? prev : [pageId]);
    commitPages(nextPages);
  };

  const deletePageSubtreeForever = (pageId: string) => {
    const subtreeIds = getPageSubtreeIdsLocal(pageId);
    if (!subtreeIds.size) return;
    setStackedPageIds((prev) => prev.filter((id) => !subtreeIds.has(id)));
    const nextPages = normalizePageTree(pages.filter((p) => !subtreeIds.has(p.id)));
    if (activeId && subtreeIds.has(activeId)) {
      const nextActive = nextPages.find((p) => !p.trashed);
      if (nextActive) setActiveId(nextActive.id);
    }
    commitPages(nextPages);
  };

  const setThemeWithTransition = (nextTheme: string) => {
    const animation = createThemeAnimation(themeFx.variant, themeFx.start, themeFx.blur, themeFx.gifUrl);
    ensureThemeTransitionStyles(animation.css);
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const nextDark = nextTheme === "dark" || (nextTheme === "system" && prefersDark);
    const switchTheme = () => {
      document.documentElement.classList.toggle("dark", nextDark);
      document.documentElement.classList.toggle("light", !nextDark);
      setTheme(nextTheme);
    };
    if (document.startViewTransition) {
      document.startViewTransition(switchTheme);
    } else {
      switchTheme();
    }
  };

  interface PageSelectOptions {
    altKey?: boolean;
    sidePeek?: boolean;
  }

  const handlePageSelect = (pageId: string, options: PageSelectOptions = {}) => {
    setAppView("page");
    if (options.altKey || options.sidePeek) {
      setStackedPageIds((prev) => prev.includes(pageId) ? prev : [...prev, pageId]);
      setActiveId(pageId);
    } else {
      setStackedPageIds((prev) => {
        if (prev.length <= 1) return [pageId];
        const idx = prev.indexOf(pageId);
        if (idx >= 0) return prev.slice(0, idx + 1);
        return [...prev.slice(0, -1), pageId];
      });
      setActiveId(pageId);
    }
  };

  const navigateToChildPage = (pageId: string, options: PageSelectOptions = {}) => {
    setAppView("page");
    setActiveId(pageId);
    setStackedPageIds((prev) => {
      const idx = prev.indexOf(pageId);
      if (idx >= 0) return prev.slice(0, idx + 1);
      if (options.altKey || options.sidePeek) return [...prev, pageId];
      return [...prev.slice(0, -1), pageId];
    });
  };

  const closeStackedColumn = (pageId: string) => {
    setStackedPageIds((prev) => {
      const next = prev.filter((id) => id !== pageId);
      if (next.length === 0) return prev;
      if (activeId === pageId) setActiveId(next[next.length - 1]);
      return next;
    });
  };

  // Loads both halves of the real sharing feature for the signed-in user:
  // pages actually shared TO them (kept in the separate `sharedPages`
  // array — see its declaration's comment for why), and invites still
  // awaiting their accept/decline (Inbox's "Invites" section). Called
  // from both bootstrap paths (initial mount + handleAuthSuccess) so a
  // user sees pending invites/shared pages whichever path resolves.
  const loadCollabData = useCallback(async (userId: string) => {
    try {
      const [shared, invites] = await Promise.all([
        fetchSharedPages(userId),
        fetchPageInvites(userId, "pending"),
      ]);
      setSharedPages(shared);
      setPendingInvites(invites);
    } catch (e) {
      console.warn("App: failed to load shared pages/invites", e);
    }
  }, []);

  // Stamps real user attribution (replacing the "Krishna Handibag"
  // hardcoded fallback in Editor.tsx/BlockContextMenu.tsx) onto any block
  // that's new or was actually touched in `nextBlocks`, detected via
  // reference inequality against `prevBlocks`. Every real edit path here
  // constructs a NEW object only for the block(s) it actually touches
  // (`{ ...b, ...patch }`) and passes untouched sibling blocks through by
  // the same reference — so `next !== prev` is a reliable "this one
  // changed" signal without needing a deep diff. Shared between
  // updatePage (Editor.tsx's onBlocks path) and handleBlockPatchByPage
  // (CoThinking/SpacedRepetition/CanvasView's single-block patch path) so
  // both real editing entry points stamp consistently.
  const stampBlockAttribution = (prevBlocks: Block[] | undefined, nextBlocks: Block[]): Block[] => {
    const editorName = realtimeCollab.getUser()?.userName || null;
    const stampTime = now();
    const prevById = new Map((prevBlocks || []).map((b) => [b.id, b]));
    return nextBlocks.map((b) => {
      const prevBlock = prevById.get(b.id);
      if (prevBlock === b) return b; // untouched — passed through by reference
      return {
        ...b,
        createdBy: prevBlock ? b.createdBy : (b.createdBy ?? editorName),
        lastEditedBy: editorName,
        lastEditedTime: stampTime,
      };
    });
  };

  // Edits to a page shared TO this user (not owned) must never go through
  // the owner-scoped `pages`/commitPages pipeline — that pipeline's
  // auto-save (utils/storage.ts) stamps every page with the CURRENT
  // user's id on every save, which would silently steal ownership of the
  // shared page. Instead: update `sharedPages` locally (optimistic) and
  // persist via updateSharedPage(), a plain field UPDATE that never
  // touches `user_id`, gated server-side by the `can_edit` RLS check
  // (migration rls_page_permissions_and_shared_pages). Trash/restore/
  // move-parent aren't supported on a shared page (no owner-level
  // actions), so those patches are ignored here rather than routed.
  const updateSharedPage = (id: string, patch: Partial<Page>) => {
    if (patch.trashed !== undefined || patch.parentId !== undefined) return;
    const target = sharedPages.find((p) => p.id === id);
    if (!target || target.sharedRole !== "editor") {
      showToast("You don't have edit access to this page.");
      return;
    }
    const editorId = currentUserId;
    if (!editorId) return;
    const stampedPatch = patch.blocks
      ? { ...patch, blocks: stampBlockAttribution(target.blocks, patch.blocks) }
      : patch;
    setSharedPages((prev) => prev.map((p) => p.id === id ? { ...p, ...stampedPatch, updatedAt: now() } : p));
    updateSharedPageRemote(id, { ...stampedPatch, id }, editorId).catch((e) => {
      showToast(e instanceof Error ? e.message : "Couldn't save changes to shared page.");
    });
  };

  const updatePage = (id: string, patch: Partial<Page>) => {
    // Route to the shared-page pipeline for ANY page id that's shared-not-
    // owned (not just the active page) — a shared page can also be open
    // in a background stacked column (see stackedPageIds.map above).
    if (!pages.some((p) => p.id === id) && sharedPages.some((p) => p.id === id)) {
      updateSharedPage(id, patch);
      return;
    }
    if (patch.trashed === true) {
      trashPageSubtree(id);
      return;
    }
    if (patch.trashed === false) {
      restorePageSubtree(id);
      return;
    }
    if (patch.trashed) {
      closeStackedColumn(id);
      auditEngine.log({ pageId: id, userId: realtimeCollab.getUser()?.userId || 'system', userName: realtimeCollab.getUser()?.userName || 'System', action: 'trashed', detail: 'Moved page to trash' });
    }
    const nextPages = pages.map((p) => {
        if (p.id === id) {
          // Stamp real user attribution on any block that's new or was
          // actually touched by this patch — see stampBlockAttribution's
          // doc comment above for the full rationale. Every real edit
          // path (Editor.tsx's onBlocks/onBlockPatch, StackedColumn,
          // CanvasView, SpacedRepetition, CoThinking) converges on this
          // function, so stamping happens exactly once here rather than
          // needing to be duplicated at every call site.
          if (patch.blocks) {
            patch = { ...patch, blocks: stampBlockAttribution(p.blocks, patch.blocks) };
          }
          // Stamp page-level attribution alongside block-level — read by
          // PageOptionsMenu.tsx/BlockContextMenu.tsx's "Last edited by"
          // footer as the fallback when a specific block has no edits of
          // its own yet.
          const editorNameForPage = realtimeCollab.getUser()?.userName || p.lastEditedBy;
          const nextLineage: LineageEntry[] = [...(p.lineage || [])];
          if (patch.trashed !== undefined) {
            nextLineage.push({
              action: patch.trashed ? "trashed" : "restored",
              timestamp: now(),
              detail: patch.trashed ? "Moved page to trash" : "Restored page from trash"
            });
          } else if (patch.title && patch.title !== p.title) {
            nextLineage.push({
              action: "edited",
              timestamp: now(),
              detail: `Renamed page to "${patch.title}"`
            });
            auditEngine.log({ pageId: id, userId: realtimeCollab.getUser()?.userId || 'system', userName: realtimeCollab.getUser()?.userName || 'System', action: 'rename', contentBefore: { title: p.title }, contentAfter: { title: patch.title }, detail: `Renamed to "${patch.title}"` });
          } else if (patch.blocks && patch.blocks !== p.blocks) {
            const added = patch.blocks.length - p.blocks.length;
            if (added > 0) {
              nextLineage.push({
                action: "ai_generated",
                timestamp: now(),
                detail: `AI added ${added} block${added !== 1 ? 's' : ''}`
              });
              auditEngine.log({ pageId: id, userId: realtimeCollab.getUser()?.userId || 'system', userName: realtimeCollab.getUser()?.userName || 'System', action: 'ai_generated', contentBefore: { blockCount: p.blocks.length }, contentAfter: { blockCount: patch.blocks.length }, detail: `AI added ${added} blocks` });
            } else if (added < 0) {
              nextLineage.push({
                action: "edited",
                timestamp: now(),
                detail: `AI removed ${Math.abs(added)} block${added !== -1 ? 's' : ''}`
              });
              auditEngine.log({ pageId: id, userId: realtimeCollab.getUser()?.userId || 'system', userName: realtimeCollab.getUser()?.userName || 'System', action: 'delete', contentBefore: { blockCount: p.blocks.length }, contentAfter: { blockCount: patch.blocks.length }, detail: `Removed ${Math.abs(added)} blocks` });
            } else {
              nextLineage.push({
                action: "edited",
                timestamp: now(),
                detail: "AI modified page content"
              });
              auditEngine.log({ pageId: id, userId: realtimeCollab.getUser()?.userId || 'system', userName: realtimeCollab.getUser()?.userName || 'System', action: 'edit', detail: 'Modified page content' });
            }
          } else if (patch.icon && patch.icon !== p.icon) {
            auditEngine.log({ pageId: id, userId: realtimeCollab.getUser()?.userId || 'system', userName: realtimeCollab.getUser()?.userName || 'System', action: 'edit', detail: `Changed icon to ${patch.icon}` });
          }
          return { ...p, ...patch, lineage: nextLineage, updatedAt: now(), lastEditedBy: editorNameForPage };
        }
        return p;
      });
    commitPages(patch.parentId !== undefined || patch.content !== undefined ? normalizePageTree(nextPages) : nextPages);
  };

  const updateBlocks = (blocks: Block[]) => {
    const prev = pages.find(p => p.id === activePage.id);
    auditEngine.log({
      pageId: activePage.id, userId: realtimeCollab.getUser()?.userId || 'system', userName: realtimeCollab.getUser()?.userName || 'System',
      action: 'edit', blockType: null, contentBefore: { blocks: prev?.blocks }, contentAfter: { blocks }, detail: 'Blocks updated'
    });
    updatePage(activePage.id, { blocks });
  };

  const openAIChat = (chatId: string | null = null) => {
    setActiveChatId(chatId);
    setAiOpen(true);
  };

  const startAIChat = () => {
    setActiveChatId(null);
    setAiOpen(true);
  };

  const openRightPanel = (chatId: string | null = null) => {
    setActiveChatId(chatId);
    setAiRightOpen(true);
  };

  const updateBlock = (blockId: string, patch: Record<string, unknown>) => {
    if (!activePage?.blocks) return;
    updateBlocks(activePage.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const previous = h[h.length - 1];
      setFuture((f) => [pages, ...f]);
      setPages(previous);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setHistory((h) => [...h, pages]);
      setPages(next);
      return f.slice(1);
    });
  };

  interface AddPageOptions {
    modal?: boolean;
  }

  const addPage = (template: string = "blank", parentId: string | null = null, options: AddPageOptions = {}) => {
    const templateTitles: Record<string, string> = {
      standup: "Meeting Notes",
      prd: "Tasks Tracker",
      tasks: "Tasks Tracker",
      projects: "Projects",
      docs: "Document Hub",
      brainstorm: "Brainstorm Session",
      goals: "Goals Tracker",
      blank: "New page",
      form: "Untitled form"
    };
    const templateIcons: Record<string, string> = {
      tasks: "✅", prd: "✅", projects: "🔎", docs: "📄",
      brainstorm: "💡", goals: "🏁", standup: "🗓️"
    };
    const next: Page = ensurePageEntity({
      id: uid(),
      title: templateTitles[template] || "Untitled",
      icon: templateIcons[template] || "📝",
      cover: null,
      parentId,
      content: [],
      favorite: false,
      trashed: false,
      tags: [],
      updatedAt: now(),
      lineage: [
        {
          action: template === "blank" ? "created" as const : "template" as const,
          timestamp: now(),
          detail: template === "blank" ? "Page created" : `Created from template "${templateTitles[template] || template}"`
        }
      ],
      blocks: templateBlocks(template)
    });
    let nextPages = [next, ...pages];
    // Method A & C: If parentId is given, append the new page's id to the parent's content array
    if (parentId) {
      nextPages = nextPages.map(p =>
        p.id === parentId ? { ...p, content: [...(p.content || []), next.id] } : p
      );
    }
    commitPages(normalizePageTree(nextPages));
    setActiveId(next.id);
    setAppView("page");
    if (options.modal) {
      setNewPageDraft(next);
      setNewPageOpen(true);
    } else {
      setNewPageOpen(false);
      setNewPageDraft(null);
    }
    return next.id;
  };

  const buildBlankPage = (parentId: string | null = null): Page => ensurePageEntity({
    id: uid(),
    title: "Untitled",
    icon: "📝",
    cover: null,
    parentId,
    content: [],
    favorite: false,
    trashed: false,
    tags: [],
    updatedAt: now(),
    lineage: [{ action: "created" as const, timestamp: now(), detail: "Page created" }],
    blocks: [{ id: uid(), type: "text", text: "" }]
  });

  const commitNewPageDraft = (draft: Page, patch: Partial<Page> = {}): Page => {
    const page = ensurePageEntity({ ...draft, ...patch });
    let nextPages = [page, ...pages.filter((p) => p.id !== page.id)];
    if (page.parentId) {
      nextPages = nextPages.map((p) =>
        p.id === page.parentId
          ? { ...p, content: [...(p.content || []).filter((id) => id !== page.id), page.id] }
          : p
      );
    }
    commitPages(normalizePageTree(nextPages));
    setActiveId(page.id);
    setStackedPageIds([page.id]);
    setAppView("page");
    setRenameFocusId(page.id);
    return page;
  };

  const createSubpageAtBlock = (parentPageId: string, afterBlockId: string, title: string = ""): string | null => {
    const parent = pages.find((p) => p.id === parentPageId);
    if (!parent) return null;

    const subpageId = uid();
    const subpage = ensurePageEntity({
      id: subpageId,
      title: title || "Untitled",
      icon: "📄",
      cover: null,
      parentId: parentPageId,
      content: [],
      favorite: false,
      trashed: false,
      tags: [],
      updatedAt: now(),
      blocks: [{ id: uid(), type: "text", text: "" }],
      lineage: [{ action: "created" as const, timestamp: now(), detail: "Subpage created from editor" }]
    });

    const pageBlock = {
      id: subpageId,
      type: "page",
      text: title || "",
      linkedPageId: subpageId,
      parentId: null,
      content: []
    };

    // Replace the text block in-place (no insert+delete — avoids stale closure bug)
    const nextBlocks = (parent.blocks || []).map((b) =>
      b.id === afterBlockId ? pageBlock : b
    );

    const content = [...(parent.content || [])];
    // Ensure subpageId is in parent content
    if (!content.includes(subpageId)) {
      const idx = content.indexOf(afterBlockId);
      if (idx >= 0) content.splice(idx + 1, 0, subpageId);
      else content.push(subpageId);
    }

    commitPages(normalizePageTree([
      subpage,
      ...pages.map((p) =>
        p.id === parentPageId ? { ...p, blocks: nextBlocks, content } : p
      )
    ]));
    setCollapsedPages((prev) => {
      const next = new Set(prev);
      next.delete(parentPageId);
      return next;
    });
    return subpageId;
  };

  function templateBlocks(template: string): Block[] {
    const emptyDb = makeEmptyDatabase();
    // makeEmptyDatabase()'s `rows` is typed `unknown[]` (blockModel.ts —
    // it's always empty at creation, so the element shape is genuinely
    // unknown there); these template builders are the first real place
    // that shapes a row, so cast to a documented minimal row shape here.
    const namedRow = (r: unknown, name: string) => ({ ...(r as Record<string, unknown>), name });
    switch (template) {
      case "prd": case "tasks":
        return [{ id: uid(), type: "database", text: "Tasks Tracker", database: emptyDb } as unknown as Block];
      case "projects":
        return [{ id: uid(), type: "database", text: "Projects", database: { ...emptyDb, view: "board", rows: emptyDb.rows.map((r, i) => namedRow(r, ["Website refresh", "Launch plan", "Customer research"][i] || "")) } } as unknown as Block];
      case "docs":
        return [
          { id: uid(), type: "h2", text: "Document Hub" } as unknown as Block,
          { id: uid(), type: "database", text: "Documents", database: { ...emptyDb, rows: emptyDb.rows.map((r, i) => namedRow(r, ["Project brief", "Meeting recap", "Research notes"][i] || "")) } } as unknown as Block
        ];
      case "brainstorm":
        return [
          { id: uid(), type: "h2", text: "Ideas" },
          { id: uid(), type: "bullet", text: "Big opportunity" },
          { id: uid(), type: "bullet", text: "Crazy idea" },
          { id: uid(), type: "bullet", text: "Next experiment" },
          { id: uid(), type: "database", text: "Brainstorm Session", database: emptyDb }
        ];
      case "goals":
        return [
          { id: uid(), type: "h2", text: "Goals Tracker" },
          { id: uid(), type: "todo", text: "Set first measurable goal", checked: false },
          { id: uid(), type: "todo", text: "Choose owner", checked: false },
          { id: uid(), type: "database", text: "Goals", database: emptyDb }
        ];
      case "standup":
        return [
          { id: uid(), type: "h2", text: "Updates" },
          { id: uid(), type: "bullet", text: "Yesterday" },
          { id: uid(), type: "bullet", text: "Today" },
          { id: uid(), type: "bullet", text: "Blockers" },
          { id: uid(), type: "todo", text: "Send follow-up notes", checked: false }
        ];
      case "form":
        return [
          { id: uid(), type: "h2", text: "Form" },
          { id: uid(), type: "text", text: "Collect responses with a simple form layout." },
          { id: uid(), type: "database", text: "Responses", database: emptyDb }
        ];
      default:
        return [{ id: uid(), type: "text", text: "" }];
    }
  }

  const addPageInside = (parentId: string) => {
    setCollapsedPages((prev) => {
      const next = new Set(prev);
      next.delete(parentId);
      return next;
    });
    const newId = addPage("blank", parentId);
    setRenameFocusId(newId);
  };

  const openNewPage = () => {
    setNewPageDraft(buildBlankPage(null));
    setNewPageOpen(true);
  };

  const finishNewPage = (action: string) => {
    const draft = newPageDraft;
    if (!draft) {
      setNewPageOpen(false);
      return;
    }

    const commitAndClose = (patch: Partial<Page> = {}) => {
      commitNewPageDraft(draft, patch);
      setNewPageDraft(null);
      setNewPageOpen(false);
    };

    if (action === "ai") {
      commitAndClose();
      openRightPanel();
      return;
    }
    if (action === "meeting") {
      commitAndClose({
        title: "Meeting Notes",
        icon: "🗓️",
        blocks: [
          { id: uid(), type: "h2", text: "Updates" },
          { id: uid(), type: "bullet", text: "Yesterday" },
          { id: uid(), type: "bullet", text: "Today" },
          { id: uid(), type: "bullet", text: "Blockers" },
          { id: uid(), type: "todo", text: "Send follow-up notes", checked: false }
        ]
      });
      return;
    }
    if (action === "database") {
      commitAndClose({
        blocks: [{ id: uid(), type: "database", text: "New database", database: makeEmptyDatabase() }]
      });
      return;
    }
    if (action === "canvas") {
      commitAndClose();
      setPageMode("canvas");
      return;
    }
    if (action === "graph") {
      commitAndClose();
      setPageMode("graph");
      return;
    }
    if (action === "project") {
      // makeEmptyDatabase()'s rows are always [] (see templateBlocks'
      // `namedRow` comment above) — this .map() is dead code today, kept
      // as-is (documented, not removed).
      commitAndClose({
        title: "Project Tracker",
        icon: "🔎",
        blocks: [{ id: uid(), type: "database", text: "Projects", database: { ...makeEmptyDatabase(), view: "board", rows: makeEmptyDatabase().rows.map((r, i) => ({ ...(r as Record<string, unknown>), name: ["Website refresh", "Launch plan", "Customer research"][i] || "" })) } } as unknown as Block]
      });
      return;
    }
    if (action === "form") {
      commitAndClose({
        title: "Untitled form",
        blocks: [
          { id: uid(), type: "h2", text: "Form" },
          { id: uid(), type: "text", text: "Collect responses with a simple form layout." },
          { id: uid(), type: "database", text: "Responses", database: makeEmptyDatabase() }
        ]
      });
      return;
    }
    if (action === "templates") {
      setNewPageDraft(null);
      setNewPageOpen(false);
      setTemplateOpen(true);
      return;
    }
    commitAndClose();
  };

  const createFromTemplate = (template: string) => {
    const resolved = template === "database" ? "tasks" : template;
    setTemplateOpen(false);
    setNewPageOpen(false);
    setNewPageDraft(null);
    const basePages = pages;
    const templateTitles = {
      standup: "Meeting Notes",
      prd: "Tasks Tracker",
      tasks: "Tasks Tracker",
      projects: "Projects",
      docs: "Document Hub",
      brainstorm: "Brainstorm Session",
      goals: "Goals Tracker"
    };
    const next = ensurePageEntity({
      id: uid(),
      title: templateTitles[resolved] || "Untitled",
      icon: resolved === "tasks" || resolved === "prd" ? "✅" : resolved === "projects" ? "🔎" : resolved === "docs" ? "📄" : resolved === "brainstorm" ? "💡" : resolved === "goals" ? "🏁" : resolved === "standup" ? "🗓️" : "📝",
      cover: null,
      parentId: null,
      favorite: false,
      trashed: false,
      tags: [],
      updatedAt: now(),
      lineage: [
        {
          action: "template" as const,
          timestamp: now(),
          detail: `Created from template "${templateTitles[resolved] || resolved}"`
        }
      ],
      blocks: (
        resolved === "prd" || resolved === "tasks"
          ? [{ id: uid(), type: "database", text: "Tasks Tracker", database: makeEmptyDatabase() }]
          : resolved === "projects"
            ? [{ id: uid(), type: "database", text: "Projects", database: { ...makeEmptyDatabase(), view: "board", rows: makeEmptyDatabase().rows.map((r, i) => ({ ...(r as Record<string, unknown>), name: ["Website refresh", "Launch plan", "Customer research"][i] || "" })) } }]
            : resolved === "standup"
              ? [
                  { id: uid(), type: "h2", text: "Updates" },
                  { id: uid(), type: "bullet", text: "Yesterday" },
                  { id: uid(), type: "bullet", text: "Today" },
                  { id: uid(), type: "bullet", text: "Blockers" },
                  { id: uid(), type: "todo", text: "Send follow-up notes", checked: false }
                ]
              : [{ id: uid(), type: "text", text: "" }]
      ) as unknown as Block[]
    });
    commitPages(normalizePageTree([next, ...basePages]));
    setActiveId(next.id);
    setAppView("page");
  };

  const duplicatePage = (pageId: string) => {
    const original = pages.find((p) => p.id === pageId);
    if (!original) return;
    const idMap = new Map<string, string>();
    const clonePage = (p: Page): Page => {
      const newId = uid();
      idMap.set(p.id, newId);
      return {
        ...JSON.parse(JSON.stringify(p)),
        id: newId,
        title: p.id === pageId ? `${p.title || "Untitled"} copy` : p.title,
        favorite: false,
        updatedAt: now(),
        content: (p.content || []).map((cid) => idMap.get(cid) || cid),
        parentId: idMap.get(p.parentId) || p.parentId,
        blocks: (p.blocks || []).map((block) => ({ ...block, id: uid() })),
        lineage: [
          ...(p.lineage || []),
          {
            action: "duplicated" as const,
            timestamp: now(),
            detail: p.id === pageId ? `Duplicated from "${p.title || "Untitled"}"` : "Duplicated as subtree"
          }
        ]
      };
    };
    const subtreeIds = getPageSubtreeIdsLocal(pageId);
    const clones = [pageId, ...subtreeIds].map((pid) => {
      const p = pages.find((pp) => pp.id === pid);
      return p ? clonePage(p) : null;
    }).filter(Boolean);
    let nextPages = [...clones, ...pages];
    const newParentId = idMap.get(original.parentId) || original.parentId;
    if (newParentId) {
      nextPages = nextPages.map(p =>
        p.id === newParentId ? { ...p, content: [...(p.content || []), idMap.get(pageId) || clones[0]?.id].filter(Boolean) } : p
      );
    }
    commitPages(normalizePageTree(nextPages));
    // Real bug fix (not a preservable quirk — a ReferenceError, since no
    // variable named `copy` exists in this function's scope; only
    // `clones` does). This has been crashing every real call to
    // duplicatePage() (bound to Ctrl+D) at runtime. The evident intent —
    // confirmed by every other duplicate-page path in this file
    // (finishNewPage/WorkspaceView's onDuplicate) — is to activate the
    // newly duplicated page, i.e. the first clone.
    setActiveId(clones[0]?.id);
    setAppView("page");
  };

  const showToast = (message: string) => setToast(message);

  const handleUnlockPage = async (pageId: string, passphrase: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    try {
      const decrypted = await decryptData(page.encryptedBlocks, passphrase, page.iv, page.salt);
      const blocks = JSON.parse(decrypted);
      setPages((prevPages) =>
        prevPages.map((p) =>
          p.id === pageId ? { ...p, blocks, isLocked: false } : p
        )
      );
      setDecryptionKeys((prev) => ({ ...prev, [pageId]: passphrase }));
    } catch (err) {
      console.error("Decryption failed", err);
      throw err;
    }
  };

  const handleLockPage = async (pageId: string, passphrase: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    try {
      const { encryptedBlocks, iv, salt } = await encryptData(JSON.stringify(page.blocks || []), passphrase);
      setPages((prevPages) =>
        prevPages.map((p) =>
          p.id === pageId
            ? {
                ...p,
                isEncrypted: true,
                isLocked: false,
                encryptedBlocks,
                iv,
                salt
              }
            : p
        )
      );
      setDecryptionKeys((prev) => ({ ...prev, [pageId]: passphrase }));
    } catch (err) {
      console.error("Encryption failed", err);
      throw err;
    }
  };

  const handleRemoveEncryption = (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    setPages((prevPages) =>
      prevPages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              isEncrypted: false,
              isLocked: false,
              encryptedBlocks: undefined,
              iv: undefined,
              salt: undefined
            }
          : p
      )
    );
    setDecryptionKeys((prev) => {
      const next = { ...prev };
      delete next[pageId];
      return next;
    });
    showToast("Encryption removed from page.");
  };

  // Supports two call conventions (documented, not a migration change):
  // 3-arg `(pageId, blockId, patch)` and 2-arg `(blockId, patch)` — the
  // latter used by CoThinking.jsx/SpacedRepetition.tsx, which don't know
  // which page a block belongs to. `pageId`/`blockId`/`patch` are typed
  // loosely (`string | Record<string, unknown> | undefined`) to cover
  // both shapes; the runtime shuffle below narrows them per call.
  const handleBlockPatchByPage = (pageIdOrBlockId: string, blockIdOrPatch: string | Record<string, unknown>, maybePatch?: Record<string, unknown>) => {
    let pageId: string | null = pageIdOrBlockId;
    let blockId: string = blockIdOrPatch as string;
    let patch: Record<string, unknown> | undefined = maybePatch;
    // Support both 2-arg (blockId, patch) and 3-arg (pageId, blockId, patch) call patterns
    if (patch === undefined && typeof blockIdOrPatch === 'object') {
      patch = blockIdOrPatch;
      blockId = pageIdOrBlockId;
      pageId = null;
    }
    // Find the block being patched
    let patchedBlock: Block | null = null;
    let patchedPage: Page | null = null;
    for (const p of pages) {
      const b = p.blocks?.find(b => b.id === blockId);
      if (b) { patchedBlock = b; patchedPage = p; break; }
    }
    if (!pageId) pageId = patchedPage?.id ?? null;
    if (!pageId || !patchedBlock) return;
    const syncedGroupId = (patchedBlock as unknown as { syncedGroupId?: string })?.syncedGroupId;
    commitPages(
      pages.map((page) => {
        if (page.id !== pageId && !syncedGroupId) return page;
        if (page.id === pageId) {
          const patchedBlocks = (page.blocks || []).map((block) =>
            block.id === blockId ? { ...block, ...patch } : block
          );
          return {
            ...page,
            updatedAt: now(),
            blocks: stampBlockAttribution(page.blocks, patchedBlocks)
          };
        }
        // Propagate patch to mirror synced blocks in other pages
        if (syncedGroupId) {
          const hasMirror = (page.blocks || []).some(b => b.syncedGroupId === syncedGroupId);
          if (hasMirror) {
            const mirroredBlocks = (page.blocks || []).map((block) =>
              block.syncedGroupId === syncedGroupId && block.id !== blockId
                ? { ...block, ...patch }
                : block
            );
            return {
              ...page,
              updatedAt: now(),
              blocks: stampBlockAttribution(page.blocks, mirroredBlocks)
            };
          }
        }
        return page;
      })
    );
  };

  const renamePage = (pageId: string) => {
    setActiveId(pageId);
    setAppView("page");
    setRenameFocusId(pageId);
  };

  const removeFromRecents = (pageId: string) => {
    updatePage(pageId, { hiddenFromRecents: true });
    showToast("Removed from Recents");
  };

  const toggleOffline = (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    updatePage(pageId, { offline: !page.offline });
    showToast(page.offline ? "Removed from offline" : "Available offline");
  };

  const togglePageCollapse = (pageId: string) => setCollapsedPages((prev) => {
    const next = new Set(prev);
    if (next.has(pageId)) next.delete(pageId);
    else next.add(pageId);
    return next;
  });

  useEffect(() => {
    if (!activeId) return;
    setCollapsedPages((prev) => {
      let changed = false;
      const next = new Set(prev);
      let cursor = pages.find((p) => p.id === activeId);
      while (cursor?.parentId) {
        if (next.has(cursor.parentId)) { next.delete(cursor.parentId); changed = true; }
        cursor = pages.find((p) => p.id === cursor.parentId);
      }
      return changed ? next : prev;
    });
  }, [activeId, pages]);

  const copyPageLink = async (pageId) => {
    const slug = slugifyWorkspaceName(workspaceName);
    const url = `${window.location.origin}/${slug}/${pageId}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
    } catch {
      showToast("Could not copy link");
    }
  };

  const addBlockAfter = (blockId: string, type: string = "text", text: string = "") => {
    if (!activePage?.blocks) return;
    const index = activePage.blocks.findIndex((b) => b.id === blockId);
    if (index < 0) return;
    const block = blockFor(type, text);
    updateBlocks([...activePage.blocks.slice(0, index + 1), block, ...activePage.blocks.slice(index + 1)]);
  };

  const deleteBlock = (blockId: string) => {
    if (!activePage?.blocks) return;
    updateBlocks(activePage.blocks.filter((b) => b.id !== blockId));
  };

  const duplicateBlock = (blockId: string) => {
    if (!activePage?.blocks) return;
    const index = activePage.blocks.findIndex((b) => b.id === blockId);
    if (index < 0) return;
    const copy = JSON.parse(JSON.stringify(activePage.blocks[index]));
    copy.id = uid();
    updateBlocks([...activePage.blocks.slice(0, index + 1), copy, ...activePage.blocks.slice(index + 1)]);
  };

  const moveBlock = (blockId: string, dir: number) => {
    if (!activePage?.blocks) return;
    const blocks = [...activePage.blocks];
    const i = blocks.findIndex((b) => b.id === blockId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= blocks.length) return;
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    updateBlocks(blocks);
  };

  const blocks = activePage?.blocks || [];
  const allTodosDone = blocks.some((b) => b.type === "todo") && blocks.filter((b) => b.type === "todo").every((b) => b.checked);
  useEffect(() => {
    if (!allTodosDone) return;
    setConfetti(true);
    const t = setTimeout(() => setConfetti(false), 1600);
    return () => clearTimeout(t);
  }, [allTodosDone]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg)] text-[var(--muted)]">
        <div className="flex flex-col items-center gap-3">
          <RingLoader size={32} />
          <span className="text-sm">Loading Noska...</span>
        </div>
      </div>
    );
  }
  if (appFlowState === "workspace" && !activePage) {
    // Real dead-end bug, fixed: `activePage` falls back through
    // `pages.find(!trashed) || pages[0]`, so it's only ever falsy when
    // `pages` is genuinely empty (not merely "all trashed" — a trashed
    // page is still found by id and stays active). An empty `pages` array
    // is reachable in production (e.g. a failed/partial load, or
    // `purgeExpiredTrash` clearing out a page whose 30-day window lapsed
    // while it was still the active page). This branch previously rendered
    // a static message with no sidebar and no buttons; Ctrl+N doesn't
    // reliably reach the app's keydown handler here (some browsers
    // intercept it as "new window" before it bubbles), and even when it
    // did fire, openNewPage()'s NewPageOverlay was mounted further down
    // the tree past this early return, so nothing ever appeared. Since
    // `pages` being empty means `trashPages` is empty too, there's nothing
    // to recover here — the fix is just a working "New page" button.
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg)] text-[var(--muted)]">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl">📝</span>
          <span className="text-sm">No pages yet. Create one to get started.</span>
          <button
            onClick={openNewPage}
            className="mt-1 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90 transition"
          >
            New page
          </button>
        </div>
        {newPageOpen && newPageDraft && (
          <NewPageOverlay
            page={newPageDraft}
            onClose={() => finishNewPage("close")}
            onPagePatch={(patch) => setNewPageDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
            onShare={() => setShareOpen(true)}
            onFavorite={() => setNewPageDraft((prev) => (prev ? { ...prev, favorite: !prev.favorite } : prev))}
            onMore={() => handleOpenSettings("General")}
            onAction={finishNewPage}
            onToast={showToast}
          />
        )}
      </div>
    );
  }
  const currentIndex = Math.max(0, visiblePages.findIndex((p) => p.id === activeId));
  const selectByOffset = (offset: number) => {
    if (!visiblePages.length) return;
    const next = visiblePages[Math.min(Math.max(currentIndex + offset, 0), visiblePages.length - 1)];
    if (next) {
      setActiveId(next.id);
      setAppView("page");
    }
  };
  const viewMeta = {
    home: ["🏠", "Home"],
    calendar: ["📅", "Calendar"],
    inbox: ["📥", "Inbox"],
    library: ["⊞", "Library"],
    tasks: ["✓", "My Tasks"],
    marketplace: ["🏪", "Marketplace"],
    chats: ["#", "Chats"],
    meetings: ["*", "Meetings"],
    meetingNote: ["*", "AI meeting note"],
    shared: ["+", "Shared"],
    teamspace: ["🏠", workspaceName]
  };
  const topPage = appView === "page" ? activePage : { ...activePage, icon: viewMeta[appView]?.[0] || "📌", title: viewMeta[appView]?.[1] || activePage.title };

  const handleOpenSettings = (tab?: string) => {
    setSettingsInitialTab(tab || "General");
    setSettingsOpen(true);
  };

  return (
    <AnimatePresence mode="wait">
      {appFlowState === "loading" && !TEST_MODE && (
        <LoadingScreen key="loader" onComplete={() => setAppFlowState("auth")} />
      )}
      {appFlowState === "auth" && (
        <AuthPage key="auth" onAuthSuccess={handleAuthSuccess} />
      )}
      {appFlowState === "onboarding" && !onboardingOpen && (
        <OnboardingPage
          key="onboarding"
          initialWorkspaceName={workspaceName}
          initialUsername={currentUsername ?? undefined}
          currentUserId={currentUserId ?? undefined}
          onFinalize={handleFinalize}
          onComplete={handleOnboardingComplete}
        />
      )}
      {onboardingOpen && (
        // Real bug fix: this wrapper dropped OnboardingContext's second
        // `pages` (starter pages built from the user's actual template
        // selection via onFinalize) argument, so replaying onboarding
        // from Settings always silently fell back to
        // handleOnboardingComplete's default "Getting Started" page
        // regardless of what the user picked. Every other onComplete
        // binding in this file passes both args straight through.
        <OnboardingPage
          key="onboarding-overlay"
          overlay
          initialWorkspaceName={workspaceName}
          initialUsername={currentUsername ?? undefined}
          currentUserId={currentUserId ?? undefined}
          onFinalize={handleFinalize}
          onComplete={(data, starterPages) => { setOnboardingOpen(false); handleOnboardingComplete(data, starterPages); }}
        />
      )}
      {appFlowState === "workspace" && (
        <motion.div
          key="workspace"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          className="flex h-full w-full overflow-hidden bg-[var(--bg)] text-[var(--text)]"
        >
          {confetti && <Confetti />}
          <AnimatePresence>
            {toast && <Toast message={toast} onDone={() => setToast("")} />}
          </AnimatePresence>
          {needsUsernameClaim && currentUserId && (
            <ClaimUsernameModal
              userId={currentUserId}
              onDone={(username) => { setCurrentUsername(username); setNeedsUsernameClaim(false); }}
            />
          )}
          <Sidebar
            open={sidebarOpen}
            pages={visiblePages}
            trashCount={trashPages.length}
            pendingInvitesCount={pendingInvites.length}
            activeId={activeId}
            workspaceName={workspaceName}
            setWorkspaceName={setWorkspaceName}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onSelect={handlePageSelect}
            onNew={(template) => template === "blank" ? openNewPage() : addPage(template)}
            onSearch={() => setPaletteOpen(true)}
            onTrash={() => setTrashOpen(true)}
            onSettings={handleOpenSettings}
            onAI={openRightPanel}
            onAIFull={startAIChat}
            onHelp={() => setHelpOpen(true)}
            onView={setAppView}
            onPrev={() => selectByOffset(-1)}
            onNext={() => selectByOffset(1)}
            onPatchPage={updatePage}
            onMovePage={movePage}
            onDuplicatePage={duplicatePage}
            onAddInside={addPageInside}
            onRenamePage={renamePage}
            onRemoveFromRecents={removeFromRecents}
            onToggleOffline={toggleOffline}
            onCopyLink={copyPageLink}
            onTrashPage={(id) => updatePage(id, { trashed: true })}
            collapsedPages={collapsedPages}
            onToggleCollapse={togglePageCollapse}
            onReview={() => setReviewOpen(true)}
            onAPI={() => setApiConsoleOpen(true)}
            theme={theme}
            onThemeChange={setThemeWithTransition}
            appView={appView}
            onUndo={undo}
            onRedo={redo}
            canUndo={history.length > 0}
            canRedo={future.length > 0}
            pageMode={pageMode}
            onPageModeChange={setPageMode}
            onExport={() => setExportOpen(true)}
            onShare={() => setShareOpen(true)}
            onToast={showToast}
            onLogout={handleLogout}
            currentUsername={currentUsername}
            currentUserEmail={currentUserEmail}
          />
          <main className="flex min-w-0 flex-1 flex-col bg-[var(--bg)]">
            <Topbar
              page={topPage}
              sidebarOpen={sidebarOpen}
              saveState={saveState}
              onSidebar={() => setSidebarOpen(true)}
              onShare={() => setShareOpen(true)}
              onCopyLink={() => copyPageLink(activePage.id)}
              onAI={openRightPanel}
              onFavorite={() => updatePage(activePage.id, { favorite: !activePage.favorite })}
              onMore={() => handleOpenSettings("General")}
              onQuickActions={() => setPaletteOpen(true)}
              onUndo={undo}
              onRedo={redo}
              canUndo={history.length > 0}
              canRedo={future.length > 0}
              dark={dark}
              onThemeChange={setThemeWithTransition}
              onReadingModeToggle={() => setReadingPage(activePage)}
              pageMode={pageMode}
              onPageModeChange={setPageMode}
              appView={appView}
              onExport={() => setExportOpen(true)}
              onClipper={() => setClipperOpen(true)}
              onLineage={() => setLineageOpen(true)}
              onCollab={() => setCollabOpen(true)}
              onLockPage={() => setEncryptOpen(true)}
              onRemoveEncryption={handleRemoveEncryption}
            />
            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={appView === "page" ? `${appView}-${activeId}-${pageMode}` : appView}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="flex-1 flex flex-col min-h-0 overflow-hidden"
                >
                  {appView === "page" ? (
                    pageMode === "canvas" ? (
                      <CanvasView
                        page={activePage}
                        onBlockPatch={(blockId, patch) => {
                          if (!activePage?.blocks) return;
                          updatePage(activePage.id, {
                            blocks: activePage.blocks.map((b) => b.id === blockId ? { ...b, ...patch } : b)
                          });
                        }}
                        onAddBlock={(blockId, type = "text", text = "") => {
                          if (!activePage?.blocks) return;
                          const index = activePage.blocks.findIndex((b) => b.id === blockId);
                          if (index < 0) return;
                          const block = blockFor(type, text);
                          updatePage(activePage.id, {
                            blocks: [...activePage.blocks.slice(0, index + 1), block, ...activePage.blocks.slice(index + 1)]
                          });
                        }}
                      />
                    ) : pageMode === "graph" ? (
                      <GraphView
                        pages={pages}
                        activeId={activeId}
                        onSelect={handlePageSelect}
                      />
                    ) : (
                      <div className="flex-1 flex overflow-x-auto overflow-y-hidden divide-x divide-[var(--border)]">
                        <AnimatePresence mode="popLayout">
                          {stackedPageIds.map((pId, idx) => {
                            // Falls back to sharedPages the same way activePage
                            // does above — otherwise a shared page pushed into
                            // the stack (e.g. opened via Ctrl-click from the
                            // Inbox/Library) would resolve to nothing and
                            // silently vanish from the column view. Also
                            // applies the same sharedRole->permission mapping
                            // as activePage (real bug, fixed: this used to
                            // read straight from sharedPages with no mapping,
                            // so a viewer/commenter got full edit affordances
                            // in the Editor.tsx rendering path for this code
                            // path specifically).
                            const ownedColPage = pages.find((p) => p.id === pId);
                            const sharedColPage = !ownedColPage ? sharedPages.find((p) => p.id === pId) : undefined;
                            const colPage = ownedColPage || (sharedColPage ? withSharedPermission(sharedColPage) : undefined);
                            if (!colPage) return null;
                            return (
                              <motion.div
                                key={pId}
                                layout
                                initial={{ opacity: 0, x: 40, scale: 0.995 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -35, scale: 0.99 }}
                                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                                className={`h-full flex ${idx === stackedPageIds.length - 1 ? "flex-grow min-w-[400px] flex-1" : "shrink-0"}`}
                              >
                                <StackedColumn
                                  page={colPage}
                                  pages={visiblePages}
                                  isActive={pId === activeId}
                                  isFirst={idx === 0}
                                  onSelect={navigateToChildPage}
                                  onReadingModePage={(p) => setReadingPage(p)}
                                  renameFocusId={renameFocusId}
                                  onRenameFocusDone={() => setRenameFocusId(null)}
                                  onPagePatch={(patch) => updatePage(pId, patch)}
                                  onBlockPatch={(blockId, patch) => {
                                    if (!colPage?.blocks) return;
                                    updatePage(pId, {
                                      blocks: colPage.blocks.map((b) => b.id === blockId ? { ...b, ...patch } : b)
                                    });
                                  }}
                                  onAddBlock={(blockId, type = "text", text = "", customId = null) => {
                                    if (!colPage?.blocks) return;
                                    const index = colPage.blocks.findIndex((b) => b.id === blockId);
                                    if (index < 0) return;
                                    const block = blockFor(type, text);
                                    if (customId) block.id = customId;
                                    updatePage(pId, {
                                      blocks: [...colPage.blocks.slice(0, index + 1), block, ...colPage.blocks.slice(index + 1)]
                                    });
                                  }}
                                  onDeleteBlock={(blockId) => {
                                    if (!colPage?.blocks) return;
                                    updatePage(pId, {
                                      blocks: colPage.blocks.filter((b) => b.id !== blockId)
                                    });
                                  }}
                                  onDuplicateBlock={(blockId) => {
                                    if (!colPage?.blocks) return;
                                    const index = colPage.blocks.findIndex((b) => b.id === blockId);
                                    if (index < 0) return;
                                    const copy = JSON.parse(JSON.stringify(colPage.blocks[index]));
                                    copy.id = uid();
                                    updatePage(pId, {
                                      blocks: [...colPage.blocks.slice(0, index + 1), copy, ...colPage.blocks.slice(index + 1)]
                                    });
                                  }}
                                  onMoveBlock={(blockId, dir) => {
                                    if (!colPage?.blocks) return;
                                    const blocks = [...colPage.blocks];
                                    const i = blocks.findIndex((b) => b.id === blockId);
                                    const j = i + dir;
                                    if (i < 0 || j < 0 || j >= blocks.length) return;
                                    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
                                    updatePage(pId, { blocks });
                                  }}
                                  onBlocks={(blocks) => updatePage(pId, { blocks })}
                                  onAskAI={openRightPanel}
                                  onFocusBlock={(block) => setFocusedBlock(block)}
                                  onClose={() => closeStackedColumn(pId)}
                                  isResizable={idx < stackedPageIds.length - 1}
                                  onUnlockPage={handleUnlockPage}
                                  onDeletePage={(id) => { closeStackedColumn(id); commitPages(pages.filter((p) => p.id !== id)); }}
                                  onToast={showToast}
                                  onVoiceCapture={() => setVoiceOpen(true)}
                                  ghostWriterEnabled={ghostWriterEnabled}
                                  apiKey={apiKey}
                                  aiProvider={aiProvider}
                                  nvidiaKey={nvidiaKey}
                                  onUpdatePage={updatePage}
                                  onCreateSubpage={(afterBlockId, title) =>
                                    createSubpageAtBlock(pId, afterBlockId, title)
                                  }
                                  onTrashPage={(id) => updatePage(id, { trashed: true })}
                                />
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )
                  ) : (
                    <WorkspaceView
                      view={appView}
                      pages={visiblePages}
                      sharedPages={sharedPages}
                      pendingInvites={pendingInvites}
                      onAcceptInvite={handleAcceptInvite}
                      onDeclineInvite={handleDeclineInvite}
                      workspaceName={workspaceName}
                      aiChats={aiChats}
                      onSelect={handlePageSelect}
                      onNew={(template) => template === "blank" ? openNewPage() : addPage(template)}
                      onAI={openRightPanel}
                      onOpenChat={openAIChat}
                      onBlockPatch={handleBlockPatchByPage}
                      onReview={() => setReviewOpen(true)}
                      onToast={showToast}
                      apiKey={apiKey}
                      aiProvider={aiProvider}
                      nvidiaKey={nvidiaKey}
                      onDuplicate={(page) => {
                        const copy = JSON.parse(JSON.stringify(page));
                        copy.id = uid();
                        copy.title = `${page.title || "Untitled"} copy`;
                        copy.favorite = false;
                        copy.updatedAt = now();
                        copy.blocks = (copy.blocks || []).map((b) => ({ ...b, id: uid() }));
                        commitPages([copy, ...pages]);
                        setActiveId(copy.id);
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
          {newPageOpen && newPageDraft && (
            <NewPageOverlay
              page={newPageDraft}
              onClose={() => finishNewPage("close")}
              onPagePatch={(patch) => setNewPageDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
              onShare={() => setShareOpen(true)}
              onFavorite={() => updatePage(activePage.id, { favorite: !activePage.favorite })}
              onMore={() => handleOpenSettings("General")}
              onAction={finishNewPage}
              onToast={showToast}
            />
          )}
          <AIPanel
            open={aiOpen}
            onClose={() => setAiOpen(false)}
            page={activePage}
            pages={visiblePages}
            apiKey={apiKey}
            aiProvider={aiProvider}
            nvidiaKey={nvidiaKey}
            aiChats={aiChats}
            activeChatId={activeChatId}
            onChatsChange={setAiChats}
            onActiveChat={setActiveChatId}
            onNewChat={startAIChat}
            onSelectChat={(id) => { setActiveChatId(id); setAiOpen(true); }}
            onDeleteChat={(id) => setAiChats((prev) => prev.filter((c) => c.id !== id))}
            onRenameChat={(id, name) => setAiChats((prev) => prev.map((c) => c.id === id ? { ...c, name } : c))}
            onPagePatch={(patch) => updatePage(activePage.id, patch)}
            onInsert={(blocks) => updateBlocks([...blocks, ...activePage.blocks])}
            onAppend={(blocks) => updateBlocks([...activePage.blocks, ...blocks])}
            onReplaceText={(text) => updateBlocks([{ id: uid(), type: "callout", text, meta: { tone: "tip", icon: "✦" } }, ...activePage.blocks])}
            onToast={showToast}
            toolContext={toolContext}
          />
          <AIRightPanel
            open={aiRightOpen}
            onClose={() => setAiRightOpen(false)}
            page={activePage}
            pages={visiblePages}
            appView={appView}
            pageMode={pageMode}
            apiKey={apiKey}
            aiProvider={aiProvider}
            nvidiaKey={nvidiaKey}
            aiChats={aiChats}
            activeChatId={activeChatId}
            onChatsChange={setAiChats}
            onActiveChat={setActiveChatId}
            onNewChat={openRightPanel}
            onSelectChat={(id) => { setActiveChatId(id); setAiRightOpen(true); }}
            onDeleteChat={(id) => setAiChats((prev) => prev.filter((c) => c.id !== id))}
            onRenameChat={(id, name) => setAiChats((prev) => prev.map((c) => c.id === id ? { ...c, name } : c))}
            onPagePatch={(patch) => updatePage(activePage.id, patch)}
            onInsert={(blocks) => updateBlocks([...blocks, ...activePage.blocks])}
            onAppend={(blocks) => updateBlocks([...activePage.blocks, ...blocks])}
            onReplaceText={(text) => updateBlocks([{ id: uid(), type: "callout", text, meta: { tone: "tip", icon: "✦" } }, ...activePage.blocks])}
            onToast={showToast}
            toolContext={toolContext}
          />
          <AnimatePresence>
            {paletteOpen && (
              // IMPORTANT — do not "fix" by adding `open={paletteOpen}` here.
              // This call site never passes `open`, so CommandPalette.jsx's
              // own `{open && (...)}` render guard keeps this specific
              // instance invisible even while mounted — which is exactly
              // what currently prevents a second, broken command palette
              // from appearing on top of Editor.tsx's real one.
              // Editor.tsx (rendered inside StackedColumn, mounted for
              // every open page in doc view) renders its OWN CommandPalette
              // instance with a correctly-populated `context` prop, and
              // registers its own separate Ctrl+K listener
              // (`setCommandPaletteOpen`). Both this App.tsx handler and
              // Editor.tsx's handler are plain `window.addEventListener`
              // listeners with no stopPropagation, so a single Ctrl+K press
              // sets BOTH `paletteOpen` (here) and `commandPaletteOpen`
              // (Editor.tsx) to true at once. Today, only Editor.tsx's
              // instance actually becomes visible (this one stays invisible
              // for the missing-`open` reason above) — so despite two
              // parallel, semi-duplicated command-palette implementations
              // existing, the user only ever sees one, working, palette.
              // Passing `open` here would make BOTH visible simultaneously,
              // stacked on top of each other — a regression, not a fix.
              // See CommandPalette.jsx's own note for the deeper `context`
              // prop-shape mismatch on this specific call site, which is
              // the reason this instance would show empty search results
              // even if it were made visible.
              <CommandPalette
                // Deliberately `undefined`, not `paletteOpen` — see the
                // long comment above. This keeps this instance invisible
                // (matching current real behavior) while still
                // type-checking against CommandPalette.jsx's required
                // `open` prop.
                open={undefined}
                pages={visiblePages}
                query={query}
                setQuery={setQuery}
                onClose={() => setPaletteOpen(false)}
                onSelect={handlePageSelect}
                onNew={(template) => template === "blank" ? openNewPage() : addPage(template)}
                onTheme={() => setThemeWithTransition(dark ? "light" : "dark")}
                onTrash={() => setTrashOpen(true)}
                onExport={() => setExportOpen(true)}
                onClipper={() => setClipperOpen(true)}
                onVoice={() => setVoiceOpen(true)}
                onReview={() => setReviewOpen(true)}
                onLineage={() => setLineageOpen(true)}
                onAPI={() => setApiConsoleOpen(true)}
                onSettings={handleOpenSettings}
                onCollab={() => { setPaletteOpen(false); setCollabOpen(true); }}
                onToast={showToast}
              />
            )}
            {settingsOpen && (
              <SettingsModal
                initialTab={settingsInitialTab}
                workspaceName={workspaceName}
                setWorkspaceName={setWorkspaceName}
                theme={theme}
                setTheme={setThemeWithTransition}
                themeFx={themeFx}
                setThemeFx={setThemeFx}
                apiKey={apiKey}
                setApiKey={setApiKey}
                aiProvider={aiProvider}
                setAIProvider={setAiProvider}
                nvidiaKey={nvidiaKey}
                setNvidiaKey={setNvidiaKey}
                onReplayOnboarding={handleReplayOnboarding}
                onLogout={handleLogout}
                onClose={() => setSettingsOpen(false)}
                ghostWriterEnabled={ghostWriterEnabled}
                setGhostWriterEnabled={setGhostWriterEnabled}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                currentUserEmail={currentUserEmail}
                onUsernameChanged={setCurrentUsername}
              />
            )}
            {trashOpen && <TrashModal pages={trashPages} onClose={() => setTrashOpen(false)} onRestore={restorePageSubtree} onDelete={deletePageSubtreeForever} />}
            {shareOpen && (
              <ShareModal
                page={activePage}
                onClose={() => setShareOpen(false)}
                onToast={showToast}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                workspaceSlug={slugifyWorkspaceName(workspaceName)}
              />
            )}
            {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
            
            {/* Phase 3-5 Feature Modals */}
            {exportOpen && (
              <ExportPanel
                page={activePage}
                pages={pages}
                onClose={() => setExportOpen(false)}
                onToast={showToast}
              />
            )}
            {clipperOpen && (
              <WebClipper
                onClose={() => setClipperOpen(false)}
                onAppendBlocks={(blocks) => updateBlocks([...activePage.blocks, ...blocks])}
                apiKey={apiKey}
                aiProvider={aiProvider}
                nvidiaKey={nvidiaKey}
                onToast={showToast}
                pageTitle={activePage?.title}
              />
            )}
            {voiceOpen && (
              <VoiceCapture
                onAppendBlocks={(blocks) => updateBlocks([...activePage.blocks, ...blocks])}
                onClose={() => setVoiceOpen(false)}
                apiKey={apiKey}
                aiProvider={aiProvider}
                nvidiaKey={nvidiaKey}
                onToast={showToast}
              />
            )}
            {reviewOpen && (
              <SpacedRepetition
                pages={pages}
                onBlockPatch={handleBlockPatchByPage}
                onClose={() => setReviewOpen(false)}
                onToast={showToast}
              />
            )}
            {lineageOpen && (
              <NoteLineage
                page={activePage}
                pages={pages}
                onClose={() => setLineageOpen(false)}
              />
            )}
            {collabOpen && (
              // Real gap found here: CoThinking.jsx genuinely calls
              // `onBlockPatch(blockId, patch)` (to attach comments to a
              // block) but this call site never passed it — every
              // comment attempt in CoThinking would throw
              // ("onBlockPatch is not a function"). handleBlockPatchByPage
              // already supports exactly this 2-arg calling convention
              // (see its own comment), so it's the correct handler to
              // wire up here, matching how it's used at every other
              // 2-arg call site (SpacedRepetition, WorkspaceView).
              <CoThinking
                page={activePage}
                onBlockPatch={handleBlockPatchByPage}
                onClose={() => setCollabOpen(false)}
                onToast={showToast}
              />
            )}
            {encryptOpen && (
              <LockPageModal
                pageTitle={activePage.title}
                onLock={async (passphrase) => {
                  await handleLockPage(activePage.id, passphrase);
                }}
                onClose={() => setEncryptOpen(false)}
                onToast={showToast}
              />
            )}
            {apiConsoleOpen && (
              <ApiConsole
                pages={pages}
                activePageId={activeId}
                addPage={addPage}
                updatePage={updatePage}
                onClose={() => setApiConsoleOpen(false)}
                onToast={showToast}
              />
            )}
            {dialogState.open && (
              <CustomDialog
                open={dialogState.open}
                type={dialogState.type}
                title={dialogState.title}
                placeholder={dialogState.placeholder}
                defaultValue={dialogState.defaultValue}
                onClose={() => {
                  dialogState.resolve(null);
                  setDialogState((prev) => ({ ...prev, open: false }));
                }}
                onConfirm={(val) => {
                  dialogState.resolve(val);
                  setDialogState((prev) => ({ ...prev, open: false }));
                }}
              />
            )}
          </AnimatePresence>
          {focusedBlock && (
            <FocusZoom
              block={focusedBlock}
              onClose={() => setFocusedBlock(null)}
              onPatch={(patch) => {
                updateBlock(focusedBlock.id, patch);
                setFocusedBlock((prev) => ({ ...prev, ...patch }));
              }}
            />
          )}
          {readingPage && (
            <ReadingMode
              page={readingPage}
              onClose={() => setReadingPage(null)}
              onPagePatch={(id, patch) => {
                updatePage(id, patch);
                setReadingPage((prev) => prev && prev.id === id ? { ...prev, ...patch } : prev);
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ensureThemeTransitionStyles(css) {
  let style = document.getElementById("theme-transition-styles");
  if (!style) {
    style = document.createElement("style");
    style.id = "theme-transition-styles";
    document.head.appendChild(style);
  }
  style.textContent = css;
}

function createThemeAnimation(variant, start = "center", blur = false, url = "") {
  const blurStart = blur ? "filter: blur(8px);" : "";
  const blurMid = blur ? "50% { filter: blur(4px); }" : "";
  const blurEnd = blur ? "filter: blur(0px);" : "";
  const blurNew = blur ? "filter: blur(2px);" : "";

  if (variant === "gif") {
    return {
      css: `
        ::view-transition-group(root) { animation-timing-function: var(--expo-in); }
        ::view-transition-new(root) {
          mask: url('${url}') center / 0 no-repeat;
          animation: theme-gif-scale 3s;
        }
        ::view-transition-old(root),
        .dark::view-transition-old(root) {
          animation: theme-gif-scale 3s;
        }
        @keyframes theme-gif-scale {
          0% { mask-size: 0; }
          10% { mask-size: 50vmax; }
          90% { mask-size: 50vmax; }
          100% { mask-size: 2000vmax; }
        }
      `
    };
  }

  if (variant === "rectangle") {
    const clip = rectangleClip(start);
    return {
      css: `
        ::view-transition-group(root) {
          animation-duration: 0.7s;
          animation-timing-function: var(--expo-out);
        }
        ::view-transition-new(root) {
          animation-name: theme-rect-reveal;
          ${blurNew}
        }
        ::view-transition-old(root),
        .dark::view-transition-old(root) {
          animation: none;
          z-index: -1;
        }
        @keyframes theme-rect-reveal {
          from { clip-path: ${clip.from}; ${blurStart} }
          ${blurMid}
          to { clip-path: ${clip.to}; ${blurEnd} }
        }
      `
    };
  }

  if (variant === "polygon") {
    const clip = polygonClip(start);
    return {
      css: `
        ::view-transition-group(root) {
          animation-duration: 0.7s;
          animation-timing-function: var(--expo-out);
        }
        ::view-transition-new(root) {
          animation-name: theme-poly-reveal;
          ${blurNew}
        }
        ::view-transition-old(root),
        .dark::view-transition-old(root) {
          animation: none;
          z-index: -1;
        }
        @keyframes theme-poly-reveal {
          from { clip-path: ${clip.from}; ${blurStart} }
          ${blurMid}
          to { clip-path: ${clip.to}; ${blurEnd} }
        }
      `
    };
  }

  const position = circlePosition(start);
  const duration = variant === "circle-blur" ? "1s" : start === "center" ? "0.7s" : "1s";
  const radius = start === "center" ? "100%" : "150%";
  const filter = variant === "circle-blur" ? "filter: blur(2px);" : blurNew;
  return {
    css: `
      ::view-transition-group(root) {
        animation-duration: ${duration};
        animation-timing-function: var(--expo-out);
      }
      ::view-transition-new(root) {
        animation-name: theme-circle-reveal;
        ${filter}
      }
      ::view-transition-old(root),
      .dark::view-transition-old(root) {
        animation: none;
        z-index: -1;
      }
      @keyframes theme-circle-reveal {
        from { clip-path: circle(0% at ${position}); ${variant === "circle-blur" ? "filter: blur(8px);" : blurStart} }
        ${variant === "circle-blur" || blur ? "50% { filter: blur(4px); }" : ""}
        to { clip-path: circle(${radius} at ${position}); filter: blur(0px); }
      }
    `
  };
}

function rectangleClip(start) {
  const options = {
    "bottom-up": { from: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
    "top-down": { from: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
    "left-right": { from: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
    "right-left": { from: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }
  };
  return options[start] || options["bottom-up"];
}

function polygonClip(start) {
  if (start === "top-right") {
    return {
      from: "polygon(150% -71%, 250% 71%, 250% 71%, 150% -71%)",
      to: "polygon(150% -71%, 250% 71%, 50% 171%, -71% 50%)"
    };
  }
  return {
    from: "polygon(50% -71%, -50% 71%, -50% 71%, 50% -71%)",
    to: "polygon(50% -71%, -50% 71%, 50% 171%, 171% 50%)"
  };
}

function circlePosition(start) {
  const positions = {
    "top-left": "0% 0%",
    "top-right": "100% 0%",
    "bottom-left": "0% 100%",
    "bottom-right": "100% 100%",
    "top-center": "50% 0%",
    "bottom-center": "50% 100%",
    center: "50% 50%"
  };
  return positions[start] || "50% 50%";
}

export default App;
