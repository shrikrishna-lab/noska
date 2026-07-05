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
import { fetchPages, fetchSettings, fetchAIChats, savePage, saveSetting, fetchUserProfile, upsertUserProfile, setOnboardingComplete } from "./lib/supabaseService";

const TRASH_PURGE_DAYS = 30;
const TRASH_PURGE_MS = TRASH_PURGE_DAYS * 24 * 60 * 60 * 1000;

function purgeExpiredTrash(sourcePages, referenceTime = Date.now()) {
  const byId = new Map(sourcePages.map((page) => [page.id, page]));
  const purgeIds = new Set();

  const markSubtree = (id) => {
    if (!byId.has(id) || purgeIds.has(id)) return;
    purgeIds.add(id);
    sourcePages.forEach((candidate) => {
      if (candidate.parentId === id) markSubtree(candidate.id);
    });
    (byId.get(id).content || []).forEach(markSubtree);
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
  const [appFlowState, setAppFlowState] = useState("loading"); // "loading" | "auth" | "onboarding" | "workspace"
  const [pages, setPages] = useState([]);
  const [activeId, setActiveId] = useState(null);
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
  const [newPageDraft, setNewPageDraft] = useState(null);
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
  const [aiChats, setAiChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [confetti, setConfetti] = useState(false);
  const [toast, setToast] = useState("");
  const [renameFocusId, setRenameFocusId] = useState(null);
  const [collapsedPages, setCollapsedPages] = useState(() => new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [clipperOpen, setClipperOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [lineageOpen, setLineageOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [encryptOpen, setEncryptOpen] = useState(false);
  const [apiConsoleOpen, setApiConsoleOpen] = useState(false);
  const [ghostWriterEnabled, setGhostWriterEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("noska_ghost_writer_enabled");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [decryptionKeys, setDecryptionKeys] = useState({});

  const [dialogState, setDialogState] = useState({ open: false, type: "prompt", title: "", placeholder: "", defaultValue: "", resolve: null });

  useEffect(() => {
    window.noskaPrompt = (title, defaultValue = "", placeholder = "") => {
      return new Promise((resolve) => {
        setDialogState({
          open: true,
          type: "prompt",
          title,
          placeholder,
          defaultValue,
          resolve
        });
      });
    };

    window.noskaConfirm = (title) => {
      return new Promise((resolve) => {
        setDialogState({
          open: true,
          type: "confirm",
          title,
          placeholder: "",
          defaultValue: "",
          resolve
        });
      });
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("noska_ghost_writer_enabled", JSON.stringify(ghostWriterEnabled));
  }, [ghostWriterEnabled]);

  const [focusedBlock, setFocusedBlock] = useState(null);
  const [stackedPageIds, setStackedPageIds] = useState([]);
  const [readingPage, setReadingPage] = useState(null);
  const hydrated = useRef(false);

  const activePage = pages.find((p) => p.id === activeId) || pages.find((p) => !p.trashed) || pages[0];
  const visiblePages = pages.filter((p) => !p.trashed);
  const trashPages = pages.filter((p) => p.trashed);
  const pageText = activePage ? plainText(activePage) : "";

  const toolContext = useMemo(() => ({
    currentPage: activePage,
    pages: visiblePages,
    actions: {
      createPage: (title, icon, content, tags) => {
        const id = uid();
        const blocks = content ? textToBlocks(content) : [{ id: uid(), type: "text", text: "" }];
        const page = {
          id, title, icon: icon || "📝", cover: null,
          parentId: null, favorite: false, trashed: false,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          updatedAt: now(), blocks,
          lineage: [{ action: "ai-created", timestamp: now(), detail: `Created by AI: "${title}"` }]
        };
        commitPages([page, ...pages]);
        setActiveId(id);
        setAppView("page");
        setRenameFocusId(id);
        return id;
      },
      renamePage: (title) => updatePage(activePage.id, { title }),
      appendBlocks: (blocks) => {
        auditEngine.log({ pageId: activePage.id, userId: realtimeCollab.getUser()?.userId || 'ai', userName: 'AI', action: 'ai_generated', contentBefore: { blockCount: activePage.blocks.length }, contentAfter: { blockCount: activePage.blocks.length + blocks.length }, detail: `AI appended ${blocks.length} blocks` });
        updatePage(activePage.id, { blocks: [...activePage.blocks, ...blocks] });
      },
      setPageTags: (tags) => updatePage(activePage.id, { tags }),
      updateAnyPage: (id, patch) => updatePage(id, patch),
      replaceBlocks: (blocks) => {
        auditEngine.log({ pageId: activePage.id, userId: realtimeCollab.getUser()?.userId || 'ai', userName: 'AI', action: 'ai_edit', contentBefore: { blocks: activePage.blocks }, contentAfter: { blocks }, detail: 'AI replaced all blocks' });
        updateBlocks(blocks);
      },
      insertBlock: (index, block) => {
        auditEngine.log({ pageId: activePage.id, userId: realtimeCollab.getUser()?.userId || 'ai', userName: 'AI', action: 'ai_edit', blockId: block.id, contentAfter: block, detail: `AI inserted ${block.type} block at position ${index}` });
        const blocks = [...(activePage?.blocks || [])];
        blocks.splice(index, 0, block);
        updateBlocks(blocks);
      },
      deleteBlock: (blockId) => {
        const target = (activePage?.blocks || []).find(b => b.id === blockId);
        if (!target) return;
        auditEngine.log({ pageId: activePage.id, userId: realtimeCollab?.getUser?.()?.userId || 'ai', userName: 'AI', action: 'delete', blockId, contentBefore: target, detail: 'AI deleted block' });
        updateBlocks((activePage?.blocks || []).filter(b => b.id !== blockId));
      },
      updateBlockById: (blockId, patch) => {
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
      let loadedPages = [];
      let loadedSettings = {};
      let loadedChats = [];

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
          const localPages = JSON.parse(localPagesRaw.value);
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
          setWorkspaceName(loadedSettings.workspaceName);
        } else if (pairs[2].value) {
          try {
            const savedName = JSON.parse(pairs[2].value);
            if (savedName !== "Noska") setWorkspaceName(savedName);
          } catch {}
        }

        if (loadedSettings.theme) {
          setTheme(loadedSettings.theme === "system" ? "dark" : loadedSettings.theme);
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

      try {
        const profile = await fetchUserProfile(u.id);
        if (profile?.onboarding_complete) {
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
        setWorkspaceName(loadedSettings.workspaceName);
      }
      if (loadedSettings.theme) {
        setTheme(loadedSettings.theme === "system" ? "dark" : loadedSettings.theme);
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

  // Auth success handler — routes returning users straight to their
  // workspace, and only first-time users (no profile yet, or
  // onboarding_complete === false) to /onboarding.
  const handleAuthSuccess = useCallback(async (userData) => {
    const uname = userData.userName || 'Workspace User';
    realtimeCollab.initUser(userData.userId, uname, userData.avatarUrl || '👤');
    try { localStorage.setItem("noska_user_id", userData.userId); } catch {}

    let existingProfile = null;
    try {
      existingProfile = await fetchUserProfile(userData.userId);
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
  const handleFinalize = useCallback(async (formData) => {
    const result = [];
    if (formData.template) {
      result.push(starterPageForTemplate(formData.template));
    }
    if (result.length === 0) {
      result.push({
        id: uid(), title: "Getting Started", icon: "🚀",
        favorite: false, trashed: false, tags: [], parentId: null,
        lineage: [{ action: "created", timestamp: now(), detail: "Default starter page" }],
        blocks: textToBlocks("# Getting Started\n\nWelcome to Noska!")
      });
    }
    return result;
  }, []);

  // Onboarding complete — set pages directly in state, persist async
  const handleOnboardingComplete = useCallback(async (formData, starterPages) => {
    if (formData.workspaceName) setWorkspaceName(formData.workspaceName);
    const pages = starterPages && starterPages.length > 0 ? starterPages : [{
      id: uid(), title: "Getting Started", icon: "🚀",
      favorite: false, trashed: false, tags: [], parentId: null,
      lineage: [{ action: "created", timestamp: now(), detail: "Fallback starter page" }],
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
        await setOnboardingComplete(userId, useCaseValue, formData.workspaceName);
      } catch (e) {}
    }
    setAppFlowState("workspace");
  }, []);

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

      const safeStringify = (val, fallback = "[]") => {
        try { return JSON.stringify(val); } catch (e) { console.warn("Safe stringify failed:", e.message); return fallback; }
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
    const onKey = (e) => {
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

  const commitPages = (next) => {
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

  const normalizePageTree = (sourcePages, orderHints = new Map()) => normalizePages(sourcePages, orderHints);

  const sortSiblings = (sourcePages, parentId, orderedIds = []) => {
    if (!orderedIds.length) return sourcePages;
    const targetParentId = parentId || null;
    const originalIndex = new Map(sourcePages.map((page, index) => [page.id, index]));
    const order = new Map(orderedIds.map((id, index) => [id, index]));

    return [...sourcePages].sort((a, b) => {
      const aSibling = (a.parentId || null) === targetParentId;
      const bSibling = (b.parentId || null) === targetParentId;
      if (aSibling && !bSibling) return -1;
      if (!aSibling && bSibling) return 1;
      if (!aSibling && !bSibling) return originalIndex.get(a.id) - originalIndex.get(b.id);
      const aOrder = order.has(a.id) ? order.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bOrder = order.has(b.id) ? order.get(b.id) : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  };

  const getPageSubtreeIdsLocal = (pageId, sourcePages = pages) => getPageSubtreeIds(pageId, sourcePages);

  const movePage = (pageId, parentId, orderedSiblingIds = []) => {
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
          { action: "moved", timestamp: movedAt, detail: targetParentId ? "Moved under another page" : "Moved to top level" }
        ]
      };
    });

    const siblingOrder = orderedSiblingIds.includes(pageId) ? orderedSiblingIds : [...orderedSiblingIds, pageId];
    nextPages = sortSiblings(nextPages, targetParentId, siblingOrder);
    const hints = new Map();
    if (targetParentId) hints.set(targetParentId, siblingOrder);
    commitPages(normalizePageTree(nextPages, hints));
  };

  const trashPageSubtree = (pageId) => {
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
              { action: "trashed", timestamp, detail: p.id === pageId ? `Moved page subtree to trash; purges after ${TRASH_PURGE_DAYS} days` : "Moved to trash with parent page" }
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

  const restorePageSubtree = (pageId) => {
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
            { action: "restored", timestamp, detail: p.id === pageId ? "Restored page subtree from trash" : "Restored with parent page" }
          ]
        };
      })
    );

    setActiveId(pageId);
    setAppView("page");
    setStackedPageIds((prev) => prev.includes(pageId) ? prev : [pageId]);
    commitPages(nextPages);
  };

  const deletePageSubtreeForever = (pageId) => {
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

  const setThemeWithTransition = (nextTheme) => {
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

  const handlePageSelect = (pageId, options = {}) => {
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

  const navigateToChildPage = (pageId, options = {}) => {
    setAppView("page");
    setActiveId(pageId);
    setStackedPageIds((prev) => {
      const idx = prev.indexOf(pageId);
      if (idx >= 0) return prev.slice(0, idx + 1);
      if (options.altKey || options.sidePeek) return [...prev, pageId];
      return [...prev.slice(0, -1), pageId];
    });
  };

  const closeStackedColumn = (pageId) => {
    setStackedPageIds((prev) => {
      const next = prev.filter((id) => id !== pageId);
      if (next.length === 0) return prev;
      if (activeId === pageId) setActiveId(next[next.length - 1]);
      return next;
    });
  };

  const updatePage = (id, patch) => {
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
          const nextLineage = [...(p.lineage || [])];
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
          return { ...p, ...patch, lineage: nextLineage, updatedAt: now() };
        }
        return p;
      });
    commitPages(patch.parentId !== undefined || patch.content !== undefined ? normalizePageTree(nextPages) : nextPages);
  };

  const updateBlocks = (blocks) => {
    const prev = pages.find(p => p.id === activePage.id);
    auditEngine.log({
      pageId: activePage.id, userId: realtimeCollab.getUser()?.userId || 'system', userName: realtimeCollab.getUser()?.userName || 'System',
      action: 'edit', blockType: null, contentBefore: { blocks: prev?.blocks }, contentAfter: { blocks }, detail: 'Blocks updated'
    });
    updatePage(activePage.id, { blocks });
  };

  const openAIChat = (chatId = null) => {
    setActiveChatId(chatId);
    setAiOpen(true);
  };

  const startAIChat = () => {
    setActiveChatId(null);
    setAiOpen(true);
  };

  const openRightPanel = (chatId = null) => {
    setActiveChatId(chatId);
    setAiRightOpen(true);
  };

  const updateBlock = (blockId, patch) => {
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

  const addPage = (template = "blank", parentId = null, options = {}) => {
    const templateTitles = {
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
    const templateIcons = {
      tasks: "✅", prd: "✅", projects: "🔎", docs: "📄",
      brainstorm: "💡", goals: "🏁", standup: "🗓️"
    };
    const next = ensurePageEntity({
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
          action: template === "blank" ? "created" : "template",
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

  const buildBlankPage = (parentId = null) => ensurePageEntity({
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
    lineage: [{ action: "created", timestamp: now(), detail: "Page created" }],
    blocks: [{ id: uid(), type: "text", text: "" }]
  });

  const commitNewPageDraft = (draft, patch = {}) => {
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

  const createSubpageAtBlock = (parentPageId, afterBlockId, title = "") => {
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
      lineage: [{ action: "created", timestamp: now(), detail: "Subpage created from editor" }]
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

  function templateBlocks(template) {
    const emptyDb = makeEmptyDatabase();
    switch (template) {
      case "prd": case "tasks":
        return [{ id: uid(), type: "database", text: "Tasks Tracker", database: emptyDb }];
      case "projects":
        return [{ id: uid(), type: "database", text: "Projects", database: { ...emptyDb, view: "board", rows: emptyDb.rows.map((r, i) => ({ ...r, name: ["Website refresh", "Launch plan", "Customer research"][i] || r.name })) } }];
      case "docs":
        return [
          { id: uid(), type: "h2", text: "Document Hub" },
          { id: uid(), type: "database", text: "Documents", database: { ...emptyDb, rows: emptyDb.rows.map((r, i) => ({ ...r, name: ["Project brief", "Meeting recap", "Research notes"][i] || r.name })) } }
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

  const addPageInside = (parentId) => {
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

  const finishNewPage = (action) => {
    const draft = newPageDraft;
    if (!draft) {
      setNewPageOpen(false);
      return;
    }

    const commitAndClose = (patch = {}) => {
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
      commitAndClose({
        title: "Project Tracker",
        icon: "🔎",
        blocks: [{ id: uid(), type: "database", text: "Projects", database: { ...makeEmptyDatabase(), view: "board", rows: makeEmptyDatabase().rows.map((r, i) => ({ ...r, name: ["Website refresh", "Launch plan", "Customer research"][i] || r.name })) } }]
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

  const createFromTemplate = (template) => {
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
          action: "template",
          timestamp: now(),
          detail: `Created from template "${templateTitles[resolved] || resolved}"`
        }
      ],
      blocks:
        resolved === "prd" || resolved === "tasks"
          ? [{ id: uid(), type: "database", text: "Tasks Tracker", database: makeEmptyDatabase() }]
          : resolved === "projects"
            ? [{ id: uid(), type: "database", text: "Projects", database: { ...makeEmptyDatabase(), view: "board", rows: makeEmptyDatabase().rows.map((r, i) => ({ ...r, name: ["Website refresh", "Launch plan", "Customer research"][i] || r.name })) } }]
            : resolved === "standup"
              ? [
                  { id: uid(), type: "h2", text: "Updates" },
                  { id: uid(), type: "bullet", text: "Yesterday" },
                  { id: uid(), type: "bullet", text: "Today" },
                  { id: uid(), type: "bullet", text: "Blockers" },
                  { id: uid(), type: "todo", text: "Send follow-up notes", checked: false }
                ]
              : [{ id: uid(), type: "text", text: "" }]
    });
    commitPages(normalizePageTree([next, ...basePages]));
    setActiveId(next.id);
    setAppView("page");
  };

  const duplicatePage = (pageId) => {
    const original = pages.find((p) => p.id === pageId);
    if (!original) return;
    const idMap = new Map();
    const clonePage = (p) => {
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
            action: "duplicated",
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
    setActiveId(copy.id);
    setAppView("page");
  };

  const showToast = (message) => setToast(message);

  const handleUnlockPage = async (pageId, passphrase) => {
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

  const handleLockPage = async (pageId, passphrase) => {
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

  const handleRemoveEncryption = (pageId) => {
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

  const handleBlockPatchByPage = (pageId, blockId, patch) => {
    // Support both 2-arg (blockId, patch) and 3-arg (pageId, blockId, patch) call patterns
    if (patch === undefined && typeof blockId === 'object') {
      patch = blockId;
      blockId = pageId;
      pageId = null;
    }
    // Find the block being patched
    let patchedBlock = null;
    let patchedPage = null;
    for (const p of pages) {
      const b = p.blocks?.find(b => b.id === blockId);
      if (b) { patchedBlock = b; patchedPage = p; break; }
    }
    if (!pageId) pageId = patchedPage?.id;
    if (!pageId || !patchedBlock) return;
    const syncedGroupId = patchedBlock?.syncedGroupId;
    commitPages(
      pages.map((page) => {
        if (page.id !== pageId && !syncedGroupId) return page;
        if (page.id === pageId) {
          return {
            ...page,
            updatedAt: now(),
            blocks: (page.blocks || []).map((block) =>
              block.id === blockId ? { ...block, ...patch } : block
            )
          };
        }
        // Propagate patch to mirror synced blocks in other pages
        if (syncedGroupId) {
          const hasMirror = (page.blocks || []).some(b => b.syncedGroupId === syncedGroupId);
          if (hasMirror) {
            return {
              ...page,
              updatedAt: now(),
              blocks: (page.blocks || []).map((block) =>
                block.syncedGroupId === syncedGroupId && block.id !== blockId
                  ? { ...block, ...patch }
                  : block
              )
            };
          }
        }
        return page;
      })
    );
  };

  const renamePage = (pageId) => {
    setActiveId(pageId);
    setAppView("page");
    setRenameFocusId(pageId);
  };

  const removeFromRecents = (pageId) => {
    updatePage(pageId, { hiddenFromRecents: true });
    showToast("Removed from Recents");
  };

  const toggleOffline = (pageId) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    updatePage(pageId, { offline: !page.offline });
    showToast(page.offline ? "Removed from offline" : "Available offline");
  };

  const togglePageCollapse = (pageId) => setCollapsedPages((prev) => {
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

  const addBlockAfter = (blockId, type = "text", text = "") => {
    if (!activePage?.blocks) return;
    const index = activePage.blocks.findIndex((b) => b.id === blockId);
    if (index < 0) return;
    const block = blockFor(type, text);
    updateBlocks([...activePage.blocks.slice(0, index + 1), block, ...activePage.blocks.slice(index + 1)]);
  };

  const deleteBlock = (blockId) => {
    if (!activePage?.blocks) return;
    updateBlocks(activePage.blocks.filter((b) => b.id !== blockId));
  };

  const duplicateBlock = (blockId) => {
    if (!activePage?.blocks) return;
    const index = activePage.blocks.findIndex((b) => b.id === blockId);
    if (index < 0) return;
    const copy = JSON.parse(JSON.stringify(activePage.blocks[index]));
    copy.id = uid();
    updateBlocks([...activePage.blocks.slice(0, index + 1), copy, ...activePage.blocks.slice(index + 1)]);
  };

  const moveBlock = (blockId, dir) => {
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
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg)] text-[var(--muted)]">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl">📝</span>
          <span className="text-sm">No pages yet. Create one with Ctrl+N</span>
        </div>
      </div>
    );
  }
  const currentIndex = Math.max(0, visiblePages.findIndex((p) => p.id === activeId));
  const selectByOffset = (offset) => {
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

  const handleOpenSettings = (tab) => {
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
        <OnboardingPage key="onboarding" initialWorkspaceName={workspaceName} onFinalize={handleFinalize} onComplete={handleOnboardingComplete} />
      )}
      {onboardingOpen && (
        <OnboardingPage key="onboarding-overlay" overlay initialWorkspaceName={workspaceName} onFinalize={handleFinalize} onComplete={(data) => { setOnboardingOpen(false); handleOnboardingComplete(data); }} />
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
          <Sidebar
            open={sidebarOpen}
            pages={visiblePages}
            trashCount={trashPages.length}
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
                            const colPage = pages.find((p) => p.id === pId);
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
              <CommandPalette
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
              />
            )}
            {trashOpen && <TrashModal pages={trashPages} onClose={() => setTrashOpen(false)} onRestore={restorePageSubtree} onDelete={deletePageSubtreeForever} />}
            {shareOpen && <ShareModal page={activePage} onClose={() => setShareOpen(false)} onToast={showToast} />}
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
              <CoThinking
                page={activePage}
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
