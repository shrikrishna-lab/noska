import React, { useEffect, useMemo, useRef, useState, useCallback, lazy, Suspense, useSyncExternalStore } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { isDesktop } from "./lib/desktop/platform";
import { VOICE_SETTINGS_EVENT } from "./lib/desktop/DesktopBridge";
import { globalVoiceController } from "./lib/voice/voice-controller";
import { parseVoiceAgentCommand, scorePageName } from "./lib/voice/agent-commands";
import { blankAgent, saveAgent } from "./features/agents/agentStore";
import { blankAutomation, saveAutomation } from "./features/automations/automationStore";
import { refreshDefinitions } from "./intelligence/triggerService";
import { collectLocalDiagnostics, queueLocalBugReport } from "./lib/diagnostics/localDiagnostics";
import { getDesktopIdentity, subscribePairing, pairingVersion, desktopSignOut } from "./lib/desktop/pairing";
import { clearBrowserAuthState } from "./lib/desktop/browserAuth";
import { handleShortcutEvent } from "./lib/shortcuts";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { UIProvider, useUI } from "./contexts/UIContext";
import { WorkspaceProvider, useWorkspace } from "./contexts/WorkspaceContext";
import { AIProvider, useAI } from "./contexts/AIContext";
import { TabProvider, useTabs } from "./contexts/TabContext";
import { WorkspaceTabBar } from "./components/tabs/WorkspaceTabBar";
import { Confetti, Toast, VoiceFloatingIndicator } from "./components/ui";
import Sidebar from "./components/Sidebar";
import { LineNavigationRail } from "./features/navigation/line-nav";
import Topbar from "./components/Topbar";
import Editor from "./components/Editor";
import { WorkspaceView, NewPageOverlay } from "./components/WorkspaceViews";
import LoadingScreen from "./components/auth/LoadingScreen";
import RingLoader from "./components/auth/RingLoader";
import DesktopSetupAnimation from "./components/desktop/DesktopSetupAnimation";
import AuthPage from "./components/auth/AuthPage";
import ClaimUsernameModal from "./components/auth/ClaimUsernameModal";
import OnboardingPage from "./onboarding/pages/OnboardingPage";
import { starterPageForTemplate } from "./onboarding/services/onboardingService";
import CommandPalette from "./components/CommandPalette";
import { TeamProvider } from "./lib/TeamContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { SettingsModal, TrashModal, ShareModal, HelpModal, CustomDialog } from "./components/Modals";
import ProfileModal from "./components/ProfileModal";
import FocusZoom from "./features/focus/FocusZoom";
import StackedColumn from "./features/stacking/StackedColumn";
import SplitWorkspaceRenderer from "./features/split/SplitWorkspaceRenderer";
import ReadingMode from "./features/reading/ReadingMode";
import { motion, AnimatePresence } from "framer-motion";
import { encryptData, decryptData } from "./features/encryption/Encryption";
import { aiManager } from "./ai/AIManager";
import { initializeMemory } from "./ai/memory";
import { publishWorkspaceEvent } from "./ai/runtime";
import { startTriggerService } from "./intelligence/triggerService";
import { realtimeCollab } from "./lib/realtimeCollab";
(window as any).realtimeCollab = realtimeCollab;
import { auditEngine } from "./lib/auditEngine";

/** Marker the shared agent runtime stamps onto patches it makes, used for
 * automation loop prevention (see src/ai/runtime/AgentRuntime.ts). */
const PROVENANCE_KEY = "__noskaExec";

const AIPanel = lazy(() => import("./components/AIPanel"));
const AIRightPanel = lazy(() => import("./components/AIRightPanel"));
const CanvasView = lazy(() => import("./features/canvas/CanvasView"));
const GraphView = lazy(() => import("./features/graph/GraphView"));
const ExportPanel = lazy(() => import("./features/export/ExportPanel"));
const WebClipper = lazy(() => import("./features/clipper/WebClipper"));
const NoskaVoiceHub = lazy(() => import("./features/voice/NoskaVoiceHub"));
const VoiceAgentPrompt = lazy(() => import("./features/voice/VoiceAgentPrompt"));
const SpacedRepetition = lazy(() => import("./features/spaced/SpacedRepetition"));
const NoteLineage = lazy(() => import("./features/lineage/NoteLineage"));
const CoThinking = lazy(() => import("./features/collab/CoThinking"));
const LockPageModal = lazy(() => import("./features/encryption/Encryption").then(m => ({ default: m.LockPageModal })));
const ApiConsole = lazy(() => import("./features/api/ApiConsole"));

import { useAuth, useUser, useClerk, useSession } from "@clerk/react";
import { supabase, setClerkSessionToken } from "./lib/supabase";
import LoginGate from "./components/auth/LoginGate";
import DesktopAuthScreen from "./components/auth/DesktopAuthScreen";
import { WaitlistGate } from "./components/auth/WaitlistGate";
import { useLaunchSettings } from "./hooks/useLaunchSettings";
import { TEST_MODE } from "./lib/envGuard";
import { capture, identifyUser, resetIdentity } from "./lib/posthog";
import { setSentryUser, captureException } from "./lib/sentry";


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
import { storageApi, initStorageSyncBaseline, flushStorageSyncVerified, discardPendingSyncWrites } from "./utils/storage";
import { subscribeToPages } from "./lib/pagesRealtime";
import {
  normalizePages,
  getPageSubtreeIds,
  ensurePageEntity
} from "./utils/pageTreeOps";
import {
  fetchPages, fetchSettings, fetchAIChats, savePage, saveSetting, fetchUserProfile, upsertUserProfile, setOnboardingComplete,
  detectLocationFromIp,
  fetchPageInvites, acceptPageInvite, declinePageInvite, fetchSharedPages, updateSharedPage as updateSharedPageRemote
} from "./lib/supabaseService";
import type { Page, AIChat } from "./lib/supabaseService";
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

/**
 * DB-first page restore, step 2: merge localStorage into rows already fetched
 * from Supabase. Callers MUST await fetchPages() before invoking this so the
 * DB read is never raced by the local read. Merge rule: for a page present in
 * both, the newer updatedAt wins (covers offline edits not yet flushed);
 * local-only pages (created offline / flush unverified at logout) are
 * appended so they re-sync under the signed-in user.
 */
async function mergeLocalStoragePages(remotePages: Page[]): Promise<Page[]> {
  const store = storageApi();
  try {
    const localPagesRaw = await store.get("pages");
    if (!localPagesRaw?.value) return remotePages;
    const localPages: Page[] = JSON.parse(localPagesRaw.value);
    if (!Array.isArray(localPages)) return remotePages;
    const localMap = new Map(localPages.filter(p => p?.id).map(p => [p.id, p]));
    const merged = remotePages.map(p => {
      const local = localMap.get(p.id);
      return local && new Date(local.updatedAt || 0) > new Date(p.updatedAt || 0) ? local : p;
    });
    for (const [id, local] of localMap) {
      if (!merged.some(p => p.id === id)) {
        merged.push(local);
      }
    }
    return merged;
  } catch (e) {
    console.warn("App: localStorage merge failed", e);
    return remotePages;
  }
}

function App() {
  return (
    <ThemeProvider>
      <UIProvider>
        <WorkspaceProvider>
          <TabProvider>
            <AIProvider>
              <AppContent />
            </AIProvider>
          </TabProvider>
        </WorkspaceProvider>
      </UIProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeParams = useParams();
  const [appFlowState, setAppFlowState] = useState<"loading" | "auth" | "onboarding" | "workspace">("loading");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [voiceSettingsRequested, setVoiceSettingsRequested] = useState(false);
  const [voiceAgentPrompt, setVoiceAgentPrompt] = useState<{ providerId: string; providerName: string } | null>(null);
  const [showDesktopSetup, setShowDesktopSetup] = useState(() => {
    if (typeof window === "undefined") return false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("setup") === "1") return true;
    if (isDesktop()) {
      return !localStorage.getItem("noska_setup_completed");
    }
    return false;
  });

  useEffect(() => {
    const handleTriggerSetup = () => setShowDesktopSetup(true);
    window.addEventListener("noska:trigger-setup", handleTriggerSetup);
    return () => window.removeEventListener("noska:trigger-setup", handleTriggerSetup);
  }, []);

  const [
    { pages, sharedPages, activeId, workspaceName, pendingInvites, collapsedPages,
      renameFocusId, appView, pageMode, stackedPageIds, readingPage, focusedBlock,
      decryptionKeys, saveState, query, needsUsernameClaim, onboardingOpen, history, future },
    { setPages, setSharedPages, setActiveId, setWorkspaceName, setPendingInvites,
      setCollapsedPages, setRenameFocusId, setAppView, setPageMode, setStackedPageIds,
      setReadingPage, setFocusedBlock, setDecryptionKeys, setSaveState, setQuery,
      setNeedsUsernameClaim, setOnboardingOpen, commitPages, togglePageCollapse, undo, redo }
  ] = useWorkspace();

  const [
    { sidebarOpen, paletteOpen, settingsOpen, settingsInitialTab, templateOpen,
      newPageOpen, newPageDraft, trashOpen, shareOpen, helpOpen, exportOpen,
      clipperOpen, voiceOpen, reviewOpen, lineageOpen, collabOpen, encryptOpen,
      apiConsoleOpen, confetti, toast, dialogState },
    { setSidebarOpen, setPaletteOpen, setSettingsOpen, setSettingsInitialTab,
      setTemplateOpen, setNewPageOpen, setNewPageDraft, setTrashOpen,
      setShareOpen, setHelpOpen, setExportOpen, setClipperOpen, setVoiceOpen,
      setReviewOpen, setLineageOpen, setCollabOpen, setEncryptOpen,
      setApiConsoleOpen, setConfetti, setToast, setDialogState, showToast }
  ] = useUI();

  const [{ theme, themeFx }, { setTheme, setThemeFx }] = useTheme();

  const { openTab, splitPage, panes: tabPanes } = useTabs();

  // Split-pane awareness (#36): pages currently open in any pane/tab, so the
  // AI can reason about "the page in the other pane" and agents can target
  // exactly what the user is looking at.
  const openPanePages = useMemo(() => {
    const ids = new Set<string>();
    for (const pane of Object.values(tabPanes || {})) {
      for (const t of pane?.tabs || []) {
        if (t.type === "page" && t.targetId) ids.add(t.targetId);
      }
    }
    ids.delete(activeId || "");
    return [...ids]
      .map((id) => pages.find((p) => p.id === id && !p.trashed))
      .filter((p): p is Page => Boolean(p));
  }, [tabPanes, activeId, pages]);

  const [
    { aiOpen, aiRightOpen, apiKey, aiProvider, nvidiaKey, aiChats, activeChatId, ghostWriterEnabled },
    { setAiOpen, setAiRightOpen, setApiKey, setAiProvider, setNvidiaKey,
      setAiChats, setActiveChatId, setGhostWriterEnabled }
  ] = useAI();

  // Clerk auth hooks — replaces Supabase auth session management
  const { isLoaded: clerkLoadedRaw, isSignedIn: clerkSignedIn } = useAuth();
  const { user: clerkUserRaw } = useUser();
  // Desktop browser-pairing identity (phase-2 auth): when the installed app
  // has been linked via noska.me/connect-desktop, it is treated exactly like
  // a Clerk user so every downstream gate works unchanged.
  const desktopAuthVersion = useSyncExternalStore(subscribePairing, pairingVersion);
  const desktopIdentity = useMemo(
    () => (isDesktop() ? getDesktopIdentity() : null),
    [desktopAuthVersion]
  );
  const clerkLoaded = clerkLoadedRaw || !!desktopIdentity;
  const isSignedIn = clerkSignedIn || !!desktopIdentity;
  const clerkUser = desktopIdentity ?? clerkUserRaw;
  const { session } = useSession();
  const clerk = useClerk();

  // Boot watchdog: Clerk's production publishable key only accepts
  // https://*.noska.me origins (server-side 400 otherwise). On localhost
  // or plain-http origins the Clerk client never finishes loading, and
  // without this the app would sit on the spinner below forever with the
  // failure visible only in the devtools console — surface it in-app.
  const [clerkStallSecs, setClerkStallSecs] = useState(0);
  useEffect(() => {
    if (clerkLoadedRaw || isDesktop() || !loading) return;
    const t = setInterval(() => setClerkStallSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [clerkLoadedRaw, loading]);

  // Direct-access magic link: the admin panel generates a URL like
  // `/<route>?ticket=<sign_in_token>` (see admin-api users.ts sign_in_token).
  // Consume the ticket client-side so the link works regardless of the
  // Clerk Account Portal / Cloudflare redirect behaviour.
  const ticketConsumed = useRef(false);
  const [ticketPending, setTicketPending] = useState(false);
  useEffect(() => {
    if (!clerkLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const ticket = params.get("ticket");
    if (!ticket) return;
    // If we're already signed in the ticket is redundant — just drop it.
    if (isSignedIn) {
      params.delete("ticket");
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", next);
      return;
    }
    if (ticketConsumed.current) return;
    ticketConsumed.current = true;
    setTicketPending(true);
    (async () => {
      let signedIn = false;
      try {
        const signInAttempt = await clerk.client.signIn.create({ strategy: "ticket", ticket });
        if (signInAttempt.createdSessionId) {
          await clerk.setActive({ session: signInAttempt.createdSessionId });
          signedIn = true;
        }
      } catch (e) {
        console.warn("App: ticket sign-in failed", e);
      } finally {
        // Always drop the ticket from the URL — it's single-use. If the
        // sign-in failed, send the user to the auth screen.
        params.delete("ticket");
        const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
        window.history.replaceState({}, "", next);
        setTicketPending(false);
        if (!signedIn) setAppFlowState("auth");
      }
    })();
  }, [clerkLoaded, isSignedIn, clerk]);

  // Launch settings — used to decide whether the waitlist gate should apply.
  const { settings: launchSettings, loading: launchSettingsLoading } = useLaunchSettings();
  // Desktop shows only the core surfaces (login/onboarding/workspace) —
  // waitlist and launch-mode gates are web-only marketing funnels.
  const waitlistActive = !isDesktop && !launchSettingsLoading
    && (launchSettings.launch_mode === "waitlist" || launchSettings.login_mode === "waitlist");

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

  const hydrated = useRef(false);
  // Set when logout could NOT verify its page flush reached Supabase: the
  // "pages" localStorage key is then deliberately preserved for recovery on
  // the next login, and the autosave effect must not overwrite it with the
  // post-logout empty state. Cleared once a login restore re-establishes state.
  const preserveLocalPages = useRef(false);
  // Latest committed pages state — handleLogout force-writes this to storage
  // before flushing so edits made inside the autosave debounce window
  // (< 500ms before logout) still reach the dirty queue.
  const pagesSnapshotRef = useRef<Page[]>([]);
  pagesSnapshotRef.current = pages;
  // A deep-link page is an initial navigation request, not a permanent
  // selection lock. This ref prevents the route-sync effect from reapplying
  // the URL page every time pages change (for example when a recent/favorite
  // page is edited or a new page is created).
  const appliedRoutePageRef = useRef<string | null>(null);

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

  const activeOwnedMatch = useMemo(() => pages.find((p) => p.id === activeId && !p.trashed), [pages, activeId]);
  const activeSharedMatch = useMemo(() => !activeOwnedMatch ? sharedPages.find((p) => p.id === activeId) : undefined, [activeOwnedMatch, sharedPages, activeId]);
  const isSharedActivePage = !activeOwnedMatch && !!activeSharedMatch;
  const activePage = useMemo(() =>
    activeOwnedMatch
      || (activeSharedMatch ? withSharedPermission(activeSharedMatch) : undefined)
      || pages.find((p) => !p.trashed),
    [activeOwnedMatch, activeSharedMatch, pages]
  );
  const visiblePages = useMemo(() => pages.filter((p) => !p.trashed), [pages]);
  const trashPages = useMemo(() => pages.filter((p) => p.trashed), [pages]);
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
        auditEngine.log({ pageId: activePage.id, userId: realtimeCollab.getUser()?.userId || 'ai', userName: 'AI', action: 'ai_generated', aiProvider: aiManager.getActiveProviderName(), aiModel: aiManager.getActiveModelName(), contentBefore: { blockCount: activePage.blocks.length }, contentAfter: { blockCount: activePage.blocks.length + blocks.length }, detail: `AI appended ${blocks.length} blocks` });
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

  // ── Intelligence platform wiring: expose the live tool context so agents
  // and automations can execute through the same actions as interactive AI,
  // and start the trigger service (workspace events + schedules) once
  // authenticated. The service is idempotent.
  useEffect(() => {
    (window as unknown as { __noskaToolContext?: () => unknown }).__noskaToolContext = () => ({
      currentPage: toolContext.currentPage,
      pages: toolContext.pages,
      actions: toolContext.actions,
    });
  }, [toolContext]);

  useEffect(() => {
    if (!isSignedIn) return;
    startTriggerService({
      getContext: () => {
        const get = (window as unknown as { __noskaToolContext?: () => unknown }).__noskaToolContext;
        return (get ? get() : { pages: [], actions: {} }) as never;
      },
      onNotify: showToast,
    });
  }, [isSignedIn]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
  }, [dark]);

  useEffect(() => {
    if (isSignedIn && clerkUser) {
      identifyUser(clerkUser.id, {
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || clerkUser.username || undefined,
        created_at: clerkUser.createdAt,
      });
      setSentryUser({
        id: clerkUser.id,
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || clerkUser.username || undefined,
      });
    } else {
      setSentryUser(null);
    }
  }, [isSignedIn, clerkUser]);

  useEffect(() => {
    if (session) {
      // Supabase verifies the Clerk JWT template named `supabase` (issuer,
      // audience, and claims configured for the database/RLS policies).
      // The default Clerk session token is not accepted by Supabase's JWT
      // verifier and causes authenticated reads/writes to fail with 401.
      setClerkSessionToken(() => session.getToken({ template: "supabase" }));
    } else {
      setClerkSessionToken(() => Promise.resolve(null));
    }
  }, [session]);

  useEffect(() => {
    hydrated.current = false;
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

      // 1. Check session FIRST — determines user isolation (Clerk replaces Supabase auth)
      if (!clerkLoaded) return;
      // Clerk may report isSignedIn before useSession has produced the token
      // Supabase needs for RLS. Wait for the session before the first read.
      // Desktop pairing supplies its own Supabase session — no Clerk session.
      if (isSignedIn && !session && !desktopIdentity) return;
      if (!mounted) return;

      const userId = isSignedIn && clerkUser ? clerkUser.id : null;

      // 2. Fetch data from Supabase (filtered by user_id if logged in)
      try {
        const [remotePages, remoteSettings] = await Promise.all([
          // Anonymous visitors only need the auth screen. Avoid querying
          // owner-scoped tables before Clerk has supplied a session token;
          // those requests are expected to be rejected by Supabase RLS and
          // otherwise surface a misleading startup warning in production.
          userId ? fetchPages(userId) : Promise.resolve([]),
          userId ? fetchSettings() : Promise.resolve({})
        ]);
        if (!mounted) return;
        loadedPages = remotePages;
        loadedSettings = remoteSettings;

        // AI chats are stored 100% locally in browser localStorage / cache (private, instant, offline-first)
        try {
          const localSavedChats = localStorage.getItem("noska_ai_chats");
          if (localSavedChats) {
            const parsed = JSON.parse(localSavedChats);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedChats = parsed;
            }
          }
        } catch {}
      } catch (e) {
        console.warn("Supabase load failed", e);
      }

      // 3. Merge localStorage AFTER the awaited Supabase read above — DB-first:
      // remote rows are the base, local edits/pages layer on top (covers
      // offline changes and writes not yet flushed at last logout).
      loadedPages = await mergeLocalStoragePages(loadedPages);
      if (!mounted) return;

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
        initStorageSyncBaseline(loadedPages, loadedChats);
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
      const u = clerkUser;
      if (!u) { setAppFlowState("auth"); return; }
      const uname = u.fullName || u.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Workspace User';
      realtimeCollab.initUser(u.id, uname, u.imageUrl || '👤');
      setWorkspaceName(prev => prev === 'My Workspace' ? `${uname}'s Workspace` : prev);
      setCurrentUserId(u.id);
      try { localStorage.setItem("noska_user_id", u.id); } catch {}
      setCurrentUserEmail(u.primaryEmailAddress?.emailAddress || null);
      loadCollabData(u.id);

      try {
        const profile = await fetchUserProfile(u.id);
        setCurrentUsername(profile?.username ?? null);
        setCurrentUserAvatar(profile?.avatar_url || null);
        const actualAvatar = profile?.avatar_url || u.imageUrl || '👤';
        realtimeCollab.initUser(u.id, profile?.user_name || uname, actualAvatar);
        
        const hasExistingData = Boolean(
          profile?.onboarding_complete || (loadedPages && loadedPages.length > 0)
        );

        if (hasExistingData) {
          // Returning user with no username yet (pre-existing account from
          // before this feature) — gate them with ClaimUsernameModal once
          // they land in the workspace, instead of forcing them back
          // through the full onboarding wizard.
          if (!profile?.onboarding_complete && u.id) {
            setOnboardingComplete(u.id, profile?.use_case || null, profile?.workspace_name || `${uname}'s Workspace`, profile?.username).catch(() => {});
          }
          setNeedsUsernameClaim(!profile?.username);
          // Returning user: set their data
          const normalized = normalizePages(loadedPages.map(p => ({ ...p, content: p.content || [] })));
          // Register the DB/local merged state as the sync baseline so the
          // dirty-tracker doesn't re-upsert everything we just fetched.
          initStorageSyncBaseline(normalized, loadedChats);
          // The merged state now includes any pages preserved by an
          // unverified-sync logout — recovery complete, resume autosave.
          preserveLocalPages.current = false;
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
        if (loadedPages && loadedPages.length > 0) {
          const normalized = normalizePages(loadedPages.map(p => ({ ...p, content: p.content || [] })));
          initStorageSyncBaseline(normalized, loadedChats);
          preserveLocalPages.current = false;
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
          setPages([]);
          setAiChats([]);
          setActiveId(null);
          setStackedPageIds([]);
          setAppFlowState("onboarding");
        }
      }

      try {
        const localWs = localStorage.getItem("workspaceName");
        if (localWs) {
          const parsed = JSON.parse(localWs);
          if (parsed && typeof parsed === "string" && parsed.trim() && parsed !== "Noska") {
            setWorkspaceName(parsed);
          }
        } else if (loadedSettings.workspaceName && loadedSettings.workspaceName !== "Noska") {
          setWorkspaceName(loadedSettings.workspaceName as string);
        }
      } catch {}
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
  }, [clerkLoaded, isSignedIn, clerkUser?.id, session?.id]);

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
      setCurrentUserAvatar(existingProfile?.avatar_url || null);
      const actualAvatar = existingProfile?.avatar_url || userData.avatarUrl || '👤';
      realtimeCollab.initUser(userData.userId, existingProfile?.user_name || uname, actualAvatar);
    } catch (e) {
      console.warn("App: failed to fetch user profile", e);
    }

    try {
      const location = !existingProfile?.country ? await detectLocationFromIp() : null;
      await upsertUserProfile({
        userId: userData.userId,
        userName: uname,
        email: userData.email,
        avatarUrl: userData.avatarUrl,
        // Preserve existing flags — pass them through only when the fetch
        // confirmed them. If the fetch failed (existingProfile === null),
        // upsertUserProfile omits these keys so a true onboarding_complete
        // or custom workspace_name is never downgraded to false/default.
        onboardingComplete: existingProfile?.onboarding_complete ?? undefined,
        useCase: existingProfile?.use_case,
        workspaceName: existingProfile?.workspace_name,
        // Seed location from IP on first login so the admin panel can do
        // city/state/area/country-wise email targeting.
        ...location,
      });
    } catch (e) {
      console.warn("App: failed to save user profile", e);
    }

    let remotePages: Page[] = [];
    try {
      remotePages = await fetchPages(userData.userId);
    } catch (e) {
      console.warn("App: failed to fetch pages for user", e);
    }

    const hasExistingData = Boolean(
      existingProfile?.onboarding_complete || (remotePages && remotePages.length > 0)
    );

    if (hasExistingData) {
      capture("login");
      if (!existingProfile?.onboarding_complete) {
        setOnboardingComplete(userData.userId, existingProfile?.use_case || null, existingProfile?.workspace_name || `${uname}'s Workspace`, existingProfile?.username).catch(() => {});
      }
      // Same pre-existing-account gate as the initial-mount bootstrap
      // above — see its comment for why this can't just be folded into
      // the onboarding wizard for these users.
      setNeedsUsernameClaim(!existingProfile?.username);
      // Returning user signing in mid-session (the initial mount bootstrap
      // already ran before this sign-in completed) — load their data now.
      // DB-first: fetchPages above is awaited BEFORE any localStorage read,
      // so the workspace reflects server state and localStorage only
      // contributes offline edits / unflushed pages from the prior session.
      try {
        const merged = await mergeLocalStoragePages(remotePages);
        const normalized = normalizePages(merged.map(p => ({ ...p, content: p.content || [] })));
        initStorageSyncBaseline(normalized, []);
        // Merged state includes any pages preserved by an unverified-sync
        // logout — recovery complete, resume autosave.
        preserveLocalPages.current = false;
        setPages(normalized);
        // AI chats are stored 100% locally on device / browser cache
        try {
          const localSavedChats = localStorage.getItem("noska_ai_chats");
          if (localSavedChats) {
            const parsed = JSON.parse(localSavedChats);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAiChats(parsed);
            }
          }
        } catch {}
        if (normalized.length > 0) {
          setActiveId(normalized[0].id);
          setStackedPageIds([normalized[0].id]);
        }
      } catch (e) {
        console.warn("App: failed to load returning user's pages", e);
      }
      // Prefer the locally saved workspace name (updated live from
      // Settings) over the profile's onboarding-time workspace_name, so
      // a refresh after renaming doesn't revert to the old default.
      // The bare "My Workspace" default (written by handleLogout) is
      // skipped so a brand-new sign-in still adopts the DB profile name.
      let wsName = null;
      try {
        const localWs = localStorage.getItem("workspaceName");
        if (localWs) {
          const parsed = JSON.parse(localWs);
          if (parsed && typeof parsed === "string" && parsed.trim() && parsed !== "Noska" && parsed !== "My Workspace") {
            wsName = parsed;
          }
        }
      } catch {}
      if (wsName) {
        setWorkspaceName(wsName);
      } else if (existingProfile?.workspace_name) {
        setWorkspaceName(existingProfile.workspace_name);
      }
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

  // Post-OAuth routing — after the OAuth popup completes, isSignedIn
  // becomes true but the main bootstrap effect only runs on [clerkLoaded],
  // so the app would stay stuck on AuthPage's "Connecting..." screen.
  // This effect bridges that gap: once the user is fully signed in and
  // the app is waiting on the auth screen, route them into the workspace
  // or onboarding flow.
  useEffect(() => {
    if (!clerkLoaded) return;
    if (appFlowState !== "auth") return;
    if (!isSignedIn || !clerkUser) return;

    handleAuthSuccess({
      userId: clerkUser.id,
      userName: clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Workspace User',
      email: clerkUser.primaryEmailAddress?.emailAddress,
      avatarUrl: clerkUser.imageUrl,
    });
  }, [clerkLoaded, isSignedIn, clerkUser, appFlowState, handleAuthSuccess]);

  // Supabase Realtime for the `pages` table: keeps an established session
  // current with writes committed by other devices/instances of the same
  // user (multi-device sync, and re-login refetches handled by the
  // DB-first restore paths above). Torn down automatically when
  // currentUserId clears on logout.
  useEffect(() => {
    if (!currentUserId) return;
    return subscribeToPages(currentUserId, {
      onPageUpsert: (page) => {
        initStorageSyncBaseline([page]);
        setPages((prev) => {
          const idx = prev.findIndex((p) => p.id === page.id);
          if (idx >= 0) {
            // Echo guard: skip our own writes back-rolling onto us and stale
            // remote rows — only a strictly newer remote version is applied.
            if (new Date(page.updatedAt || 0) <= new Date(prev[idx].updatedAt || 0)) return prev;
            const next = [...prev];
            next[idx] = page;
            return next;
          }
          // Don't inject brand-new pages before the bootstrap has hydrated
          // (the bootstrap fetch covers that) or while onboarding is deciding
          // starter pages.
          if (!hydrated.current || appFlowState === "onboarding") return prev;
          return [...prev, page];
        });
      },
      onPageDelete: (pageId) => {
        setPages((prev) => (prev.some((p) => p.id === pageId) ? prev.filter((p) => p.id !== pageId) : prev));
      },
    });
  }, [currentUserId, appFlowState]);

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
    capture("signup_completed");
    if (formData.workspaceName) {
      capture("workspace_created");
      setWorkspaceName(formData.workspaceName);
    }
    // See handleFinalize's comment above — `starterPages` is declared as
    // OnboardingPagePreview[] but is really the Page[] built by
    // handleFinalize; cast back to what this function actually needs.
    const realStarterPages = starterPages as unknown as Page[];
    // Real bug, fixed: same missing createdAt/updatedAt gap as
    // handleFinalize's fallback above — this is the last-resort path when
    // starterPages itself is empty.
    const fallbackTimestamp = now();
    const starterPagesList: Page[] = realStarterPages && realStarterPages.length > 0 ? realStarterPages : [{
      id: uid(), title: "Getting Started", icon: "🚀",
      favorite: false, trashed: false, tags: [], parentId: null,
      createdAt: fallbackTimestamp, updatedAt: fallbackTimestamp,
      lineage: [{ action: "created" as const, timestamp: fallbackTimestamp, detail: "Fallback starter page" }],
      blocks: textToBlocks("# Getting Started\n\nWelcome to Noska!")
    }];
    const finalPages = pages.length > 0
      ? [...starterPagesList, ...pages.filter(p => !starterPagesList.some(sp => sp.id === p.id))]
      : starterPagesList;
    setPages(finalPages);
    setActiveId(finalPages[0].id);
    setStackedPageIds([finalPages[0].id]);
    // Identity guard: profile writes MUST use the signed-in Clerk id.
    // realtimeCollab.getUser().userId can still be a stale anon-*/localStorage
    // UUID here (e.g. onboarding raced ahead of auth bootstrap), which would
    // silently create a second user_profiles row under the wrong id — the
    // duplicate-account bug. Fall back to collab id only when truly signed out
    // (TEST_MODE / local-only usage).
    const userId = clerkUser?.id || currentUserId || realtimeCollab?.getUser?.()?.userId;
    if (userId) {
      for (const page of pages) {
        try { await savePage(page, userId); } catch (e) {}
      }
      try {
        const useCaseValue = Array.isArray(formData.useCase) ? formData.useCase.join(",") : formData.useCase;
        await setOnboardingComplete(userId, useCaseValue, formData.workspaceName, formData.username);
        setCurrentUsername(formData.username || currentUsername);

        // Track workspace creation on waitlist entry for admin analytics
        if (clerkUser?.primaryEmailAddress?.emailAddress) {
          try {
            await supabase
              .from("waitlist_entries")
              .update({ workspace_created_at: new Date().toISOString() })
              .eq("email", clerkUser.primaryEmailAddress.emailAddress.toLowerCase())
              .in("status", ["invited", "accepted", "approved"]);
          } catch {
            // Non-critical: don't block onboarding if tracking fails
          }
        }
      } catch (e) {}
    }
    setAppFlowState("workspace");
  }, [currentUsername, currentUserId, clerkUser]);

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

  // Logout handler — flushes pending page writes, verifies the DB sync
  // completed, clears cache/state, redirects to auth
  const handleLogout = useCallback(async () => {
    capture("logout");
    // Flush queued pages/chats writes and VERIFY they reached Supabase before
    // anything kills the auth context: signing out (clerk.signOut /
    // desktopSignOut) invalidates the Supabase access token, so any upsert
    // attempted afterwards fails RLS and the edits are lost.
    const flushUserId = currentUserId || (() => { try { return localStorage.getItem("noska_user_id"); } catch { return null; } })();
    let syncVerified = true;
    if (flushUserId) {
      // Close the autosave debounce race: commit the latest page state into
      // storage (which enqueues dirty pages) before the verified flush.
      // Encrypted pages are skipped so the stored form stays ciphertext.
      try {
        const store = storageApi();
        const existingRaw = await store.get("pages");
        const existing: Page[] = existingRaw?.value ? JSON.parse(existingRaw.value) : [];
        const byId = new Map(existing.filter(p => p?.id).map(p => [p.id, p]));
        for (const p of pagesSnapshotRef.current) {
          if (!p?.id || p.isEncrypted) continue;
          byId.set(p.id, p);
        }
        await store.set("pages", JSON.stringify(Array.from(byId.values())));
      } catch (e) {
        console.warn("[logout] final pages snapshot write failed:", e);
      }
      try {
        syncVerified = await flushStorageSyncVerified();
      } catch (e) {
        console.warn("[logout] flush verification threw:", e);
        syncVerified = false;
      }
    }
    resetIdentity();
    try {
      await clerk.signOut();
    } catch {}
    // Desktop: drop the paired browser-handoff session + any pending
    // sign-in transaction, otherwise the app boots straight back into
    // the (now stale) identity instead of the login screen.
    if (isDesktop()) {
      desktopSignOut();
      clearBrowserAuthState();
    }
    // If the flush couldn't be verified (offline/failed upserts), drop the
    // in-memory dirty queues so writes never leak into another account's
    // session, and KEEP the page keys in localStorage — the next login's
    // DB-first restore merges them back and re-syncs.
    if (!syncVerified) {
      discardPendingSyncWrites();
      preserveLocalPages.current = true;
      console.warn("[logout] pending page writes not verified in DB — local pages preserved for recovery on next login");
    }
    // Clear all user-data localStorage keys
    const keysToClear = [
      "noska_user_id", "noska_workspace_joined", "noska_sidebar_data",
      "noska_share_invites", "noska_ai_profile", "noska_ghost_writer_enabled",
      "noska_api_key", "noska_ai_config", "noska_memory", "noska_user_profile",
      "noska_inbox_reminders", "noska-graph-positions",
      // Page keys are only cleared when every write was verified in the DB;
      // see the syncVerified guard above.
      ...(syncVerified ? ["pages", "activeId", "stackedPageIds"] : []),
      "aiChats", "workspaceName", "sidebarOpen",
      "apiKey", "themeFx", "aiProvider", "nvidiaKey", "appView",
      "activeChatId"
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
  }, [clerk, currentUserId]);

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
        // After an unverified-sync logout, "pages" holds the recovery copy of
        // the user's data — don't clobber it with this post-logout empty state.
        ...(preserveLocalPages.current
          ? []
          : [store.set("pages", safeStringify(serializedPages))]),
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
    if (ticketPending) return;
    if (location.pathname === "/waitlist" || location.pathname === "/banned") return;
    if (appFlowState === "auth") {
      if (location.pathname !== "/login") {
        if (import.meta.env.DEV && location.pathname !== "/" && !location.pathname.startsWith("/login")) {
          sessionStorage.setItem("noska_dev_deep_link", location.pathname);
        }
        navigate("/login", { replace: true });
      }
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
  }, [appFlowState, activeId, workspaceName, location.pathname, ticketPending]);

  // Desktop: skip the decorative startup splash entirely — land straight on
  // pairing (signed out) or let the workspace bootstrap take over.
  useEffect(() => {
    if (isDesktop() && !desktopIdentity && appFlowState === "loading" && !TEST_MODE && !ticketPending) {
      setAppFlowState("auth");
    }
  }, [isDesktop, desktopIdentity, appFlowState, ticketPending]);

  // Desktop paired-session watchdog: the bootstrap's data layer is verified
  // working with paired sessions (all queries 200); if the splash is still up
  // after 6s, force it down so the user lands in their workspace instead of
  // staring at a spinner.
  useEffect(() => {
    if (!isDesktop() || !desktopIdentity || !loading) return;
    const t = setTimeout(() => {
      setLoading(false);
      setAppFlowState((prev) => (prev === "loading" || prev === "auth" ? "workspace" : prev));
    }, 6000);
    return () => clearTimeout(t);
  }, [isDesktop, desktopIdentity, loading]);

  const onKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  onKeyRef.current = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setPaletteOpen(true);
    }
    if (mod && (e.key.toLowerCase() === "p" || e.key.toLowerCase() === "n") && !e.shiftKey) {
      e.preventDefault();
      addPage("blank");
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
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyRef.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const openVoiceSettings = () => { setVoiceSettingsRequested(true); setVoiceOpen(true); };
    window.addEventListener(VOICE_SETTINGS_EVENT, openVoiceSettings);
    return () => window.removeEventListener(VOICE_SETTINGS_EVENT, openVoiceSettings);
  }, [setVoiceOpen]);

  // Centralized shortcut handler (fires for all customizable shortcuts)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleShortcutEvent(e);
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

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

  const setThemeWithTransition = useCallback((nextTheme: string) => {
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
  }, [themeFx, createThemeAnimation, ensureThemeTransitionStyles, setTheme]);

  interface PageSelectOptions {
    altKey?: boolean;
    shiftKey?: boolean;
    sidePeek?: boolean;
    openInNewTab?: boolean;
  }

  const handlePageSelect = useCallback((pageId: string, options: PageSelectOptions = {}) => {
    if (options.openInNewTab) {
      openTab("page", pageId, { inNewTab: true, makeActive: true });
      return;
    }
    if (options.altKey || options.sidePeek) {
      splitPage({ pageId, direction: 'right' });
      setAppView("page");
      setActiveId(pageId);
      setStackedPageIds((prev) => prev.includes(pageId) ? prev : [...prev, pageId]);
      return;
    }
    // Make regular sidebar/favorites/recents navigation update the active tab
    // in the same event as the workspace selection.
    openTab("page", pageId, { inNewTab: false, makeActive: true });
    setAppView("page");
    setStackedPageIds((prev) => {
      if (prev.length <= 1) return [pageId];
      const idx = prev.indexOf(pageId);
      if (idx >= 0) return prev.slice(0, idx + 1);
      return [...prev.slice(0, -1), pageId];
    });
    setActiveId(pageId);
  }, [setAppView, setStackedPageIds, setActiveId, openTab, splitPage]);

  const handleViewSelect = useCallback((view: string, options: PageSelectOptions = {}) => {
    if (options.openInNewTab) {
      openTab("view", view, { inNewTab: true, makeActive: true });
      return;
    }
    if (options.altKey || options.sidePeek) {
      splitPage({ pageId: view, direction: 'right', type: 'view' });
      setAppView(view);
      return;
    }
    openTab("view", view, { inNewTab: false, makeActive: true });
    setAppView(view);
  }, [setAppView, openTab, splitPage]);

  const handleTabNavigate = useCallback((type: "page" | "view", targetId: string) => {
    if (type === "page") {
      setAppView("page");
      setActiveId(targetId);
      setStackedPageIds([targetId]);
    } else {
      setAppView(targetId);
    }
  }, [setAppView, setActiveId, setStackedPageIds]);

  useEffect(() => {
    const routePageId = routeParams.pageId || null;
    if (!routePageId) {
      appliedRoutePageRef.current = null;
      return;
    }
    if (
      appliedRoutePageRef.current !== routePageId &&
      pages.length > 0 &&
      pages.some((p) => p.id === routePageId)
    ) {
      appliedRoutePageRef.current = routePageId;
      setActiveId(routePageId);
      setAppView("page");
      setStackedPageIds((prev) => (prev.includes(routePageId) ? prev : [routePageId]));
    }
  }, [routeParams.pageId, pages, setActiveId, setAppView, setStackedPageIds]);

  const navigateToChildPage = useCallback((pageId: string, options: PageSelectOptions = {}) => {
    if (options.altKey || options.sidePeek) {
      splitPage({ pageId, direction: 'right' });
      setAppView("page");
      setActiveId(pageId);
      setStackedPageIds((prev) => (prev.includes(pageId) ? prev : [...prev, pageId]));
      return;
    }
    setAppView("page");
    openTab("page", pageId, { inNewTab: false, makeActive: true });
    setActiveId(pageId);
    setStackedPageIds((prev) => {
      const idx = prev.indexOf(pageId);
      if (idx >= 0) return prev.slice(0, idx + 1);
      return [...prev.slice(0, -1), pageId];
    });
  }, [setAppView, setActiveId, setStackedPageIds, openTab, splitPage]);

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

  const updatePage = useCallback((id: string, patch: Partial<Page>) => {
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
    const prevPage = pages.find((p) => p.id === id);
    // ── Intelligence event bus prep: runtime-caused patches carry
    // __noskaExec provenance. Extract it, then strip it so it never
    // persists onto the page object or into Supabase.
    const execProvenance = (patch as { __noskaExec?: { executionId: string; sourceId: string } }).__noskaExec;
    if (execProvenance) {
      const { [PROVENANCE_KEY]: _stripped, ...rest } = patch as Record<string, unknown>;
      void _stripped;
      patch = rest as Partial<Page>;
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
              auditEngine.log({ pageId: id, userId: realtimeCollab.getUser()?.userId || 'system', userName: realtimeCollab.getUser()?.userName || 'System', action: 'ai_generated', aiProvider: aiManager.getActiveProviderName(), aiModel: aiManager.getActiveModelName(), contentBefore: { blockCount: p.blocks.length }, contentAfter: { blockCount: patch.blocks.length }, detail: `AI added ${added} blocks` });
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
    // ── Intelligence event bus: publish workspace mutations so agents and
    // automations can react. Provenance (when present) lets the trigger
    // service skip events caused by runtime executions — loop prevention.
    if (prevPage && !prevPage.trashed) {
      publishWorkspaceEvent({
        type: "page_updated",
        pageId: id,
        pageTitle: patch.title || prevPage.title,
        provenance: execProvenance,
        detail: "page updated",
      });
      if (patch.title && patch.title !== prevPage.title) {
        publishWorkspaceEvent({ type: "title_changed", pageId: id, pageTitle: patch.title, provenance: execProvenance });
      }
      if (patch.blocks) {
        for (const block of patch.blocks) {
          const checked = Boolean((block as { properties?: { checked?: boolean } }).properties?.checked);
          const wasChecked = Boolean(
            (prevPage.blocks?.find((b) => b.id === block.id) as { properties?: { checked?: boolean } } | undefined)?.properties?.checked
          );
          if (block.type === "todo" && checked && !wasChecked) {
            publishWorkspaceEvent({
              type: "task_completed",
              pageId: id,
              pageTitle: prevPage.title,
              blockId: block.id,
              blockText: String(block.text || ""),
              provenance: execProvenance,
            });
          }
        }
      }
    }

    commitPages(patch.parentId !== undefined || patch.content !== undefined ? normalizePageTree(nextPages) : nextPages);
  }, [pages, sharedPages, updateSharedPage, trashPageSubtree, restorePageSubtree, closeStackedColumn, auditEngine, realtimeCollab, stampBlockAttribution, now, commitPages, normalizePageTree]);

  const updateBlocks = useCallback((blocks: Block[]) => {
    const prev = pages.find(p => p.id === activePage.id);
    auditEngine.log({
      pageId: activePage.id, userId: realtimeCollab.getUser()?.userId || 'system', userName: realtimeCollab.getUser()?.userName || 'System',
      action: 'edit', blockType: null, contentBefore: { blocks: prev?.blocks }, contentAfter: { blocks }, detail: 'Blocks updated'
    });
    updatePage(activePage.id, { blocks });
  }, [pages, activePage, auditEngine, realtimeCollab, updatePage]);

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

  interface AddPageOptions {
    modal?: boolean;
    title?: string;
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
      title: options.title?.trim() || templateTitles[template] || "Untitled",
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
    if (template === "blank") capture("note_created", { creation_method: "blank" });
    let nextPages = [next, ...pages];
    // Method A & C: If parentId is given, append the new page's id to the parent's content array
    if (parentId) {
      nextPages = nextPages.map(p =>
        p.id === parentId ? { ...p, content: [...(p.content || []), next.id] } : p
      );
    }
    commitPages(normalizePageTree(nextPages));
    setActiveId(next.id);
    setStackedPageIds([next.id]);
    setAppView("page");
    openTab("page", next.id, { inNewTab: true, makeActive: true });
    setRenameFocusId(next.id);
    if (options.modal) {
      setNewPageDraft(next);
      setNewPageOpen(true);
    } else {
      setNewPageOpen(false);
      setNewPageDraft(null);
    }
    return next.id;
  };

  const runVoiceAgentCommand = useCallback((spoken: string) => {
    const command = parseVoiceAgentCommand(spoken);
    if (command.kind === "open-page") {
      const page = pages
        .filter((candidate) => !candidate.trashed)
        .map((candidate) => ({ page: candidate, score: scorePageName(command.query, candidate.title) }))
        .filter(({ score }) => score >= 50)
        .sort((a, b) => b.score - a.score)[0]?.page;
      if (!page) { showToast(`I couldn't find a page named “${command.query}”.`); return; }
      handlePageSelect(page.id);
      showToast(`Opened “${page.title}”`);
      return;
    }
    if (command.kind === "write") {
      const page = pages.find((candidate) => candidate.id === activeId && !candidate.trashed);
      if (!page) { showToast("Open a page first, then say “write …”."); return; }
      const block = blockFor("text", command.text);
      commitPages(pages.map((candidate) => candidate.id === page.id
        ? { ...candidate, blocks: [...(candidate.blocks || []), block], updatedAt: now() }
        : candidate));
      showToast(`Added text to “${page.title}”`);
      return;
    }
    if (command.kind === "create-page") {
      addPage("blank", null, { title: command.title });
      showToast(`Created “${command.title}”`);
      return;
    }
    if (command.kind === "search-pages") {
      setQuery(command.query);
      setPaletteOpen(true);
      showToast(`Searching pages for “${command.query}”`);
      return;
    }
    if (command.kind === "configure-provider") {
      setSettingsInitialTab("Noska AI");
      setSettingsOpen(true);
      setVoiceAgentPrompt({ providerId: command.providerId, providerName: command.providerName });
      return;
    }
    if (command.kind === "open-settings") {
      setSettingsOpen(true);
      return;
    }
    if (command.kind === "open-ai") {
      setAiOpen(true);
      return;
    }
    if (command.kind === "open-agents" || command.kind === "open-automations") {
      const view = command.kind === "open-agents" ? "agents" : "automations";
      setAppView(view);
      openTab("view", view, { inNewTab: true, makeActive: true });
      return;
    }
    if (command.kind === "create-agent") {
      void (async () => {
        try {
          await saveAgent(blankAgent({
            name: command.name,
            description: command.instructions,
            instructions: command.instructions,
            status: "active",
          }));
          await refreshDefinitions();
          showToast(`Agent “${command.name}” is ready`);
          setAppView("agents");
          openTab("view", "agents", { inNewTab: true, makeActive: true });
        } catch {
          showToast("I couldn't create that agent. Check your connection and try again.");
        }
      })();
      return;
    }
    if (command.kind === "create-automation") {
      void (async () => {
        try {
          await saveAutomation(blankAutomation({
            name: command.name,
            description: command.instructions,
            status: "active",
            steps: [{ id: uid(), label: "Run workflow", kind: "ai_step", instruction: command.instructions }],
          }));
          await refreshDefinitions();
          showToast(`Automation “${command.name}” is ready`);
          setAppView("automations");
          openTab("view", "automations", { inNewTab: true, makeActive: true });
        } catch {
          showToast("I couldn't create that automation. Check your connection and try again.");
        }
      })();
      return;
    }
    if (command.kind === "diagnose") {
      const report = collectLocalDiagnostics();
      const largest = report.storage.filter((entry) => !entry.protected).slice(0, 1)[0];
      showToast(`Local health: ${report.ai.recentRequests} AI requests, ${report.ai.errors} errors${largest ? ` · largest cache: ${largest.key}` : ""}`);
      return;
    }
    if (command.kind === "report-bug") {
      queueLocalBugReport(command.description);
      showToast("Bug report queued locally. It contains no keys, tokens, or page content.");
      return;
    }
    // Keep unknown speech visible to the user instead of handing it to a
    // potentially destructive automation. The AI panel can then help plan it.
    setAiOpen(true);
    showToast("I can open, write, create, and search pages. More actions will ask before changing data.");
  }, [activeId, addPage, commitPages, handlePageSelect, openTab, pages, setAiOpen, setAppView, setPaletteOpen, setQuery, setSettingsInitialTab, setSettingsOpen, showToast]);

  useEffect(() => globalVoiceController.onAgentCommand(runVoiceAgentCommand), [runVoiceAgentCommand]);

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
    capture("template_created", { template_type: resolved });
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

  const handleUnlockPage = async (pageId: string, passphrase: string): Promise<boolean> => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return false;
    try {
      const decrypted = await decryptData(page.encryptedBlocks, passphrase, page.iv, page.salt);
      const blocks = JSON.parse(decrypted);
      setPages((prevPages) =>
        prevPages.map((p) =>
          p.id === pageId ? { ...p, blocks, isLocked: false } : p
        )
      );
      setDecryptionKeys((prev) => ({ ...prev, [pageId]: passphrase }));
      return true;
    } catch (err) {
      console.error("Decryption failed", err);
      return false;
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
  const handleBlockPatchByPage = useCallback((pageIdOrBlockId: string, blockIdOrPatch: string | Record<string, unknown>, maybePatch?: Record<string, unknown>) => {
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
  }, [pages, commitPages, now, stampBlockAttribution]);

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

  const handleToggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const handleNewPage = useCallback((template?: string) => addPage(template || "blank"), [addPage]);
  const handleTrashPage = useCallback((id: string) => updatePage(id, { trashed: true }), [updatePage]);
  const handleTabNewPage = useCallback((template?: string) => {
    const newId = addPage(template || "blank");
    if (newId) setRenameFocusId(newId);
  }, [addPage, setRenameFocusId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg)] text-[var(--muted)]">
        <div className="flex flex-col items-center gap-3">
          <RingLoader size={32} />
          <span className="text-sm">Loading Noska...</span>
          {clerkStallSecs >= 25 && !clerkLoadedRaw && !isDesktop() && (
            <span className="max-w-xs text-center text-xs leading-relaxed opacity-80">
              Still loading — the sign-in service isn't responding. Local dev
              must run via https://app.noska.me:5173: the production sign-in
              key rejects localhost and plain-http origins.
            </span>
          )}
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
    <CompanyProvider>
    <TeamProvider>
    <AnimatePresence mode="wait">
      {showDesktopSetup && (
        <DesktopSetupAnimation key="desktop-setup" onComplete={() => setShowDesktopSetup(false)} />
      )}
      {appFlowState === "loading" && !TEST_MODE && !isSignedIn && !isDesktop() && (
        <LoadingScreen key="loader" onComplete={() => { if (!ticketPending) setAppFlowState("auth"); }} />
      )}
      {appFlowState === "loading" && !TEST_MODE && isSignedIn && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#f8fafc] z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />
            <p className="text-xs text-slate-400">Loading your workspace...</p>
          </div>
        </div>
      )}
      {appFlowState === "auth" && (
        <LoginGate>
          {isDesktop() ? (
            !desktopIdentity ? <DesktopAuthScreen key="desktop-auth" /> : null
          ) : (
            <AuthPage key="auth" onAuthSuccess={handleAuthSuccess} />
          )}
        </LoginGate>
      )}
      {(appFlowState === "onboarding" || appFlowState === "workspace") && location.pathname !== "/banned" && (
        <WaitlistGate enabled={waitlistActive}>
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
          <VoiceFloatingIndicator />
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
            onToggle={handleToggleSidebar}
            onSelect={handlePageSelect}
            onNew={handleNewPage}
            onSearch={() => setPaletteOpen(true)}
            onTrash={() => setTrashOpen(true)}
            onSettings={handleOpenSettings}
            onProfile={() => setProfileOpen(true)}
            onAI={openRightPanel}
            onAIFull={startAIChat}
            onHelp={() => setHelpOpen(true)}
            onView={handleViewSelect}
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
            onTrashPage={handleTrashPage}
            collapsedPages={collapsedPages}
            onToggleCollapse={togglePageCollapse}
            onReview={() => setReviewOpen(true)}
            onAPI={() => setApiConsoleOpen(true)}
            theme={theme}
            onThemeChange={setThemeWithTransition}
            appView={appView}
            onShare={() => setShareOpen(true)}
            onToast={showToast}
            onLogout={handleLogout}
            currentUsername={currentUsername}
            currentUserEmail={currentUserEmail}
            currentUserAvatar={currentUserAvatar}
          />
          {!sidebarOpen && (appView === "page" || appView === "chats" || appView === "chat" || appView === "ai" || aiOpen || aiRightOpen) && (
            <LineNavigationRail
              pages={visiblePages}
              activeId={activeId}
              appView={appView}
              sidebarOpen={sidebarOpen}
              onSelectPage={handlePageSelect}
              onSelectView={handleViewSelect}
            />
          )}
          <main className="flex min-w-0 flex-1 flex-col bg-[var(--bg)]">
            <WorkspaceTabBar
              pages={visiblePages}
              sharedPages={sharedPages}
              pendingInvites={pendingInvites}
              aiChats={aiChats}
              onNewPage={handleTabNewPage}
              onCopyLink={copyPageLink}
            />
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
              onVisibilityChange={(visibility) => updatePage(activePage.id, { visibility })}
            />
            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={appView === "page" ? `workspace-editor-${pageMode}` : appView}
                  initial={{ opacity: 0, y: 8, filter: "blur(3px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 flex flex-col min-h-0 overflow-hidden"
                >
                  {appView === "page" ? (
                    pageMode === "canvas" ? (
                      <Suspense fallback={null}><CanvasView
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
                      /></Suspense>
                    ) : pageMode === "graph" ? (
                      <Suspense fallback={null}><GraphView
                        pages={pages}
                        activeId={activeId}
                        onSelect={handlePageSelect}
                      /></Suspense>
                    ) : (
                      <SplitWorkspaceRenderer
                        pages={visiblePages}
                        sharedPages={sharedPages}
                        currentUserId={currentUserId}
                        renameFocusId={renameFocusId}
                        onRenameFocusDone={() => setRenameFocusId(null)}
                        onPagePatch={(pId, patch) => updatePage(pId, patch)}
                        onUpdatePage={updatePage}
                        onAddBlock={(pId, blockId, type, text) => {
                          const p = pages.find((page) => page.id === pId);
                          if (!p?.blocks) return;
                          const index = p.blocks.findIndex((b) => b.id === blockId);
                          if (index < 0) return;
                          const block = blockFor(type, text);
                          updatePage(pId, {
                            blocks: [...p.blocks.slice(0, index + 1), block, ...p.blocks.slice(index + 1)]
                          });
                        }}
                        onDeleteBlock={(pId, blockId) => {
                          const p = pages.find((page) => page.id === pId);
                          if (!p?.blocks) return;
                          updatePage(pId, {
                            blocks: p.blocks.filter((b) => b.id !== blockId)
                          });
                        }}
                        onDuplicateBlock={(pId, blockId) => {
                          const p = pages.find((page) => page.id === pId);
                          if (!p?.blocks) return;
                          const index = p.blocks.findIndex((b) => b.id === blockId);
                          if (index < 0) return;
                          const copy = JSON.parse(JSON.stringify(p.blocks[index]));
                          copy.id = uid();
                          updatePage(pId, {
                            blocks: [...p.blocks.slice(0, index + 1), copy, ...p.blocks.slice(index + 1)]
                          });
                        }}
                        onMoveBlock={(pId, blockId, dir) => {
                          const p = pages.find((page) => page.id === pId);
                          if (!p?.blocks) return;
                          const blocks = [...p.blocks];
                          const i = blocks.findIndex((b) => b.id === blockId);
                          const j = i + dir;
                          if (i < 0 || j < 0 || j >= blocks.length) return;
                          [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
                          updatePage(pId, { blocks });
                        }}
                        onBlocks={(pId, blocks) => updatePage(pId, { blocks })}
                        onAskAI={openRightPanel}
                        onFocusBlock={(block) => setFocusedBlock(block)}
                        onReadingModePage={(p) => setReadingPage(p)}
                        onUnlockPage={handleUnlockPage}
                        onDeletePage={(id) => { commitPages(pages.filter((p) => p.id !== id)); }}
                        onToast={showToast}
                        onVoiceCapture={() => setVoiceOpen(true)}
                        ghostWriterEnabled={ghostWriterEnabled}
                        apiKey={apiKey}
                        aiProvider={aiProvider}
                        nvidiaKey={nvidiaKey}
                        onCreateSubpage={(pId, afterBlockId, title) =>
                          createSubpageAtBlock(pId, afterBlockId, title)
                        }
            onTrashPage={handleTrashPage}
                        onNewPage={(template) => addPage(template)}
                      />
                    )
                  ) : (
                    <WorkspaceView
                      view={appView}
                      pages={visiblePages}
                      currentUserId={currentUserId}
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
                      onView={(view) => setAppView(view)}
                      toolContext={toolContext}
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
          <Suspense fallback={null}><AIPanel
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
            onSelectPage={(p) => setActiveId(p.id)}
            onToast={showToast}
            toolContext={toolContext}
            currentUsername={currentUsername}
            currentUserEmail={currentUserEmail}
            currentUserAvatar={currentUserAvatar}
            currentUserId={currentUserId}
          /></Suspense>
          <Suspense fallback={null}><AIRightPanel
            open={aiRightOpen}
            onClose={() => setAiRightOpen(false)}
            page={activePage}
            pages={visiblePages}
            appView={appView}
            pageMode={pageMode}
            openPanePages={openPanePages}
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
          /></Suspense>
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
                key="app-command-palette"
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
                key="app-settings"
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
                onProfileNameChanged={(name) => {
                  const avatar = realtimeCollab.getUser()?.userAvatar || "👤";
                  realtimeCollab.initUser(currentUserId || "", name, avatar);
                }}
                onProfileAvatarChanged={(avatarUrl) => {
                  setCurrentUserAvatar(avatarUrl);
                  const name = realtimeCollab.getUser()?.userName || "Workspace User";
                  realtimeCollab.initUser(currentUserId || "", name, avatarUrl || "👤");
                }}
                onClose={() => setSettingsOpen(false)}
                ghostWriterEnabled={ghostWriterEnabled}
                setGhostWriterEnabled={setGhostWriterEnabled}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                currentUserEmail={currentUserEmail}
                onUsernameChanged={setCurrentUsername}
              />
            )}
            {profileOpen && (
            <ProfileModal
              key="app-profile"
              open={profileOpen}
              onClose={() => setProfileOpen(false)}
              currentUserId={currentUserId}
              currentUsername={currentUsername}
              currentUserEmail={currentUserEmail}
              onNameChanged={(name) => {
                const avatar = realtimeCollab.getUser()?.userAvatar || "👤";
                realtimeCollab.initUser(currentUserId || "", name, avatar);
              }}
              onAvatarChanged={(avatarUrl) => {
                setCurrentUserAvatar(avatarUrl);
                const name = realtimeCollab.getUser()?.userName || "Workspace User";
                realtimeCollab.initUser(currentUserId || "", name, avatarUrl || "👤");
              }}
              onToast={showToast}
            />
            )}
            {trashOpen && <TrashModal key="app-trash" pages={trashPages} onClose={() => setTrashOpen(false)} onRestore={restorePageSubtree} onDelete={deletePageSubtreeForever} />}
            {shareOpen && (
              <ShareModal
                key="app-share"
                page={activePage}
                onClose={() => setShareOpen(false)}
                onToast={showToast}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                workspaceSlug={slugifyWorkspaceName(workspaceName)}
              />
            )}
            {helpOpen && <HelpModal key="app-help" onClose={() => setHelpOpen(false)} />}
            
            {/* Phase 3-5 Feature Modals */}
            <Suspense fallback={null}>
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
                <NoskaVoiceHub initialShowSettings={voiceSettingsRequested} onClose={() => { setVoiceOpen(false); setVoiceSettingsRequested(false); }} />
              )}
              {voiceAgentPrompt && (
                <VoiceAgentPrompt
                  providerName={voiceAgentPrompt.providerName}
                  onClose={() => setVoiceAgentPrompt(null)}
                  onOpenSettings={() => { setSettingsInitialTab("Noska AI"); setSettingsOpen(true); setVoiceAgentPrompt(null); }}
                  onSave={(key) => {
                    aiManager.setProviderConfig(voiceAgentPrompt.providerId, { apiKey: key, enabled: true });
                    aiManager.setActiveProvider(voiceAgentPrompt.providerId);
                    setAiProvider(voiceAgentPrompt.providerId);
                    setVoiceAgentPrompt(null);
                    showToast(`${voiceAgentPrompt.providerName} is ready`);
                  }}
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
                  currentUserId={currentUserId}
                  onClose={() => setApiConsoleOpen(false)}
                  onToast={showToast}
                />
              )}
            </Suspense>
            {dialogState.open && (
              <CustomDialog
                key="app-dialog"
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
              pages={visiblePages}
              onClose={() => setReadingPage(null)}
              onSelectPage={(id) => {
                const target = pages.find((p) => p.id === id);
                if (target) {
                  setReadingPage(target);
                  setActiveId(id);
                }
              }}
              onPagePatch={(id, patch) => {
                updatePage(id, patch);
                setReadingPage((prev) => prev && prev.id === id ? { ...prev, ...patch } : prev);
              }}
            />
          )}
        </motion.div>
      )}
        </WaitlistGate>
      )}
      {location.pathname === "/banned" && (
        <motion.div
          key="banned"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] z-50"
        >
          <div className="w-full max-w-md text-center p-4">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-950/50">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h1 className="mb-3 text-2xl font-bold text-white">Access Revoked</h1>
            <p className="mb-2 text-zinc-400">
              Your account has been suspended. You no longer have access to this workspace.
            </p>
            <p className="mb-8 text-sm text-zinc-500">
              If you believe this is a mistake, please contact the workspace administrator.
            </p>
            <button
              onClick={() => clerk.signOut()}
              className="rounded-lg bg-zinc-800 px-6 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Sign out
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </TeamProvider>
    </CompanyProvider>
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
