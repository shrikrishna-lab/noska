// MobileWorkspaceApp — the native-feeling mobile shell for the Noska
// workspace. Presentation only: ALL state and mutations come from App.tsx
// through MobileAppController, so web, desktop and mobile share one business
// layer (one workspace, one sync, one AI).
//
// Surfaces: compact header, bottom navigation (Home · Search · Create ·
// Inbox · Profile), touch-first screens, bottom sheets, safe-area + visual
// viewport (keyboard) insets, offline/sync status.

import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home as HomeIcon,
  Search as SearchIcon,
  Plus,
  Inbox as InboxIcon,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Trash2,
  LogOut,
  Sparkles,
  MoreVertical,
  WifiOff,
  Share2,
  Copy,
  Pencil,
  FolderPlus,
  Layers,
  Sun,
  Moon,
  Monitor,
  Bell,
  Settings as SettingsIcon,
  X,
  Check,
} from "lucide-react";

import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useUI } from "../../contexts/UIContext";
import { useAI } from "../../contexts/AIContext";
import { Toast } from "../../components/ui";
import { TrashModal, ShareModal } from "../../components/Modals";
import ProfileModal from "../../components/ProfileModal";
import ClaimUsernameModal from "../../components/auth/ClaimUsernameModal";
import SplitWorkspaceRenderer from "../../features/split/SplitWorkspaceRenderer";
import { plainText, slugifyWorkspaceName, timeAgo, uid } from "../../utils/helpers";
import { hasPendingSyncWrites } from "../../utils/storage";
import { ensureNotificationPermission } from "../../lib/desktop/notify";
import { openExternal } from "../../lib/desktop/links";
import { hapticFeedback } from "../index";
import { useMobileController } from "./MobileAppController";
import { MobileFloatingNavbar, type MobileTab } from "./MobileFloatingNavbar";
import "./mobile.css";

const AIPanel = lazy(() => import("../../components/AIPanel"));

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function PageRow({ page, onOpen, showTime = true, starred }: {
  page: { id: string; title?: string; icon?: string | null; updatedAt?: string };
  onOpen: (id: string) => void;
  showTime?: boolean;
  starred?: boolean;
}) {
  return (
    <button type="button" className="mobile-page-row" onClick={() => { hapticFeedback("light"); onOpen(page.id); }}>
      <span className="mobile-page-row__icon" aria-hidden>{page.icon || "📝"}</span>
      <span className="mobile-page-row__body">
        <span className="mobile-page-row__title">{page.title || "Untitled"}</span>
        {showTime && page.updatedAt && (
          <span className="mobile-page-row__meta">Edited {timeAgo(page.updatedAt)}</span>
        )}
      </span>
      {starred && <Star size={15} className="mobile-page-row__star" fill="currentColor" />}
    </button>
  );
}

/* ── Home ──────────────────────────────────────────────────────────────── */

function HomeScreen({ openPage, onCreate }: { openPage: (id: string) => void; onCreate: () => void }) {
  const controller = useMobileController();
  const favorites = controller.visiblePages.filter((p) => p.favorite);
  const recents = useMemo(
    () => [...controller.visiblePages]
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 8),
    [controller.visiblePages]
  );
  const rootPages = useMemo(
    () => controller.visiblePages.filter((p) => !p.parentId),
    [controller.visiblePages]
  );
  const databases = useMemo(
    () => controller.visiblePages.filter((p) =>
      (p.blocks || []).some((b) => (b as { type?: string }).type === "database")
    ).slice(0, 4),
    [controller.visiblePages]
  );

  const name = controller.currentUsername || controller.currentUserEmail?.split("@")[0] || "there";

  return (
    <div className="mobile-screen">
      <div className="mobile-greeting">
        <h1>{greeting()}, {name.charAt(0).toUpperCase() + name.slice(1)}</h1>
        <p>{controller.workspaceName} · {controller.visiblePages.length} page{controller.visiblePages.length === 1 ? "" : "s"}</p>
      </div>

      <div className="mobile-quickrow">
        <button type="button" className="mobile-quickcard" onClick={onCreate}>
          <span aria-hidden>📝</span>New page
        </button>
        <button type="button" className="mobile-quickcard" onClick={onCreate}>
          <span aria-hidden>✅</span>Tasks
        </button>
        <button type="button" className="mobile-quickcard" onClick={onCreate}>
          <span aria-hidden>🗓️</span>Meeting
        </button>
        <button
          type="button"
          className="mobile-quickcard"
          onClick={() => {
            const target = controller.activePage?.id || recents[0]?.id;
            if (target) openPage(target);
          }}
        >
          <span aria-hidden>✦</span>Continue
        </button>
      </div>

      {favorites.length > 0 && (
        <>
          <div className="mobile-section-label">Favorites</div>
          {favorites.map((p) => <PageRow key={p.id} page={p} onOpen={openPage} starred showTime={false} />)}
        </>
      )}

      <div className="mobile-section-label">Recent</div>
      {recents.length === 0 ? (
        <div className="mobile-empty">
          <span className="mobile-empty__art" aria-hidden>🌱</span>
          <span className="mobile-empty__title">Your workspace is empty</span>
          <span className="mobile-empty__body">Create your first page with the + button below.</span>
        </div>
      ) : (
        recents.map((p) => <PageRow key={p.id} page={p} onOpen={openPage} />)
      )}

      {rootPages.length > 0 && (
        <>
          <div className="mobile-section-label">Pages</div>
          {rootPages.map((p) => <PageRow key={p.id} page={p} onOpen={openPage} showTime={false} starred={p.favorite} />)}
        </>
      )}

      {databases.length > 0 && (
        <>
          <div className="mobile-section-label">Databases &amp; tasks</div>
          {databases.map((p) => <PageRow key={p.id} page={p} onOpen={openPage} showTime={false} />)}
        </>
      )}
    </div>
  );
}

/* ── Search ────────────────────────────────────────────────────────────── */

function SearchScreen({ openPage }: { openPage: (id: string) => void }) {
  const controller = useMobileController();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return controller.visiblePages.slice(0, 8);
    return controller.visiblePages
      .filter((p) =>
        (p.title || "untitled").toLowerCase().includes(needle) ||
        plainText(p).toLowerCase().includes(needle) ||
        (p.tags || []).some((t) => String(t).toLowerCase().includes(needle))
      )
      .slice(0, 50);
  }, [q, controller.visiblePages]);

  return (
    <div className="mobile-screen">
      <div className="mobile-search-field">
        <SearchIcon size={17} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search pages, docs, tasks…"
          autoComplete="off"
          enterKeyHint="search"
        />
        {q && (
          <button type="button" className="mobile-icon-btn" style={{ width: 32, height: 32 }} onClick={() => setQ("")} aria-label="Clear">
            <X size={15} />
          </button>
        )}
      </div>
      {results.length === 0 && q.trim() ? (
        <div className="mobile-empty">
          <span className="mobile-empty__art" aria-hidden>🔍</span>
          <span className="mobile-empty__title">No matches</span>
          <span className="mobile-empty__body">Nothing in this workspace matches “{q}”.</span>
        </div>
      ) : (
        results.map((p) => <PageRow key={p.id} page={p} onOpen={openPage} />)
      )}
    </div>
  );
}

/* ── Inbox ─────────────────────────────────────────────────────────────── */

function InboxScreen({ openPage }: { openPage: (id: string) => void }) {
  const controller = useMobileController();

  return (
    <div className="mobile-screen">
      {controller.pendingInvites.length > 0 && (
        <>
          <div className="mobile-section-label">Invites</div>
          {controller.pendingInvites.map((invite) => {
            const pageId = (invite as { page_id?: string }).page_id;
            const page = controller.visiblePages.find((p) => p.id === pageId)
              || controller.sharedPages.find((p) => p.id === pageId);
            return (
              <div key={invite.id} className="mobile-invite-card">
                <span className="mobile-invite-card__title">
                  {page ? page.title || "Untitled" : "A page was shared with you"}
                </span>
                <span className="mobile-invite-card__meta">
                  Role: {(invite as { role?: string }).role || "viewer"}
                </span>
                <div className="mobile-invite-card__actions">
                  <button
                    type="button"
                    className="mobile-btn mobile-btn--primary"
                    style={{ minHeight: 40, fontSize: 13.5, flex: 1 }}
                    onClick={() => { hapticFeedback("medium"); controller.acceptInvite(invite.id); }}
                  >
                    <Check size={15} /> Accept
                  </button>
                  <button
                    type="button"
                    className="mobile-btn mobile-btn--secondary"
                    style={{ minHeight: 40, fontSize: 13.5, flex: 1 }}
                    onClick={() => controller.declineInvite(invite.id)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      <div className="mobile-section-label">Shared with you</div>
      {controller.sharedPages.length === 0 ? (
        <div className="mobile-empty">
          <span className="mobile-empty__art" aria-hidden>📭</span>
          <span className="mobile-empty__title">Nothing shared yet</span>
          <span className="mobile-empty__body">Pages shared to you will show up here.</span>
        </div>
      ) : (
        controller.sharedPages.map((p) => <PageRow key={p.id} page={p} onOpen={openPage} showTime={false} />)
      )}

      <div className="mobile-section-label">Recently edited</div>
      {[...controller.visiblePages]
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
        .slice(0, 5)
        .map((p) => <PageRow key={p.id} page={p} onOpen={openPage} />)}
    </div>
  );
}

/* ── Profile & settings ────────────────────────────────────────────────── */

function ProfileScreen({ onOpenTrash, onEditProfile }: {
  onOpenTrash: () => void;
  onEditProfile: () => void;
}) {
  const controller = useMobileController();
  const [, { setDialogState }] = useUI();
  const av = {
    url: controller.currentUserAvatar || null,
    fallback: (controller.currentUsername || controller.currentUserEmail || "👤").slice(0, 1).toUpperCase(),
  };

  const requestNotifications = async () => {
    const granted = await ensureNotificationPermission();
    controller.showToast(granted ? "Notifications enabled" : "Notifications not permitted");
  };

  const resolveFn = (action: (value: string | boolean | null) => void) =>
    action as unknown as (value: string | boolean | null) => void;

  const confirmLogout = () => {
    setDialogState({
      open: true,
      type: "confirm",
      title: "Sign out of Noska?",
      placeholder: "",
      defaultValue: "",
      resolve: resolveFn((value) => { if (value === true) controller.logout(); }),
    });
  };

  const renameWorkspace = () => {
    setDialogState({
      open: true,
      type: "prompt",
      title: "Workspace name",
      placeholder: "",
      defaultValue: controller.workspaceName,
      resolve: resolveFn((value) => {
        if (typeof value === "string" && value.trim() && value.trim() !== controller.workspaceName) {
          controller.updateWorkspaceName(value.trim());
        }
      }),
    });
  };

  return (
    <div className="mobile-screen">
      <div className="mobile-profile-head">
        <div className="mobile-avatar">{av.url ? <img src={av.url} alt="" /> : av.fallback}</div>
        <span className="name">{controller.currentUsername || "Workspace user"}</span>
        <span className="email">{controller.currentUserEmail || ""}</span>
      </div>

      <div className="mobile-list">
        <button type="button" className="mobile-list-row" onClick={onEditProfile}>
          <UserIcon size={17} className="mobile-list-row__icon" />
          <span className="mobile-list-row__label">Edit profile</span>
          <ChevronRight size={16} className="mobile-list-row__icon" />
        </button>
        <button type="button" className="mobile-list-row" onClick={renameWorkspace}>
          <Layers size={17} className="mobile-list-row__icon" />
          <span className="mobile-list-row__label">Workspace</span>
          <span className="mobile-list-row__value">{controller.workspaceName}</span>
        </button>
        <button type="button" className="mobile-list-row" onClick={onOpenTrash}>
          <Trash2 size={17} className="mobile-list-row__icon" />
          <span className="mobile-list-row__label">Trash</span>
          <span className="mobile-list-row__value">{controller.trashPages.length}</span>
        </button>
        <button type="button" className="mobile-list-row" onClick={() => controller.openSettings()}>
          <SettingsIcon size={17} className="mobile-list-row__icon" />
          <span className="mobile-list-row__label">All settings</span>
          <ChevronRight size={16} className="mobile-list-row__icon" />
        </button>
      </div>

      <div className="mobile-section-label">Appearance</div>
      <div className="mobile-segmented" role="group" aria-label="Theme">
        {([
          ["light", Sun, "Light"],
          ["dark", Moon, "Dark"],
          ["system", Monitor, "Auto"],
        ] as const).map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            className={controller.theme === value ? "is-active" : ""}
            onClick={() => { hapticFeedback("light"); controller.setTheme(value); }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="mobile-section-label">Notifications &amp; AI</div>
      <div className="mobile-list">
        <button type="button" className="mobile-list-row" onClick={() => void requestNotifications()}>
          <Bell size={17} className="mobile-list-row__icon" />
          <span className="mobile-list-row__label">Enable push notifications</span>
          <ChevronRight size={16} className="mobile-list-row__icon" />
        </button>
        <button type="button" className="mobile-list-row" onClick={() => controller.openSettings("Noska AI")}>
          <Sparkles size={17} className="mobile-list-row__icon" />
          <span className="mobile-list-row__label">AI settings</span>
          <ChevronRight size={16} className="mobile-list-row__icon" />
        </button>
        <button type="button" className="mobile-list-row" onClick={() => controller.openSettings("Integrations")}>
          <span className="mobile-list-row__label">Integrations</span>
          <ChevronRight size={16} className="mobile-list-row__icon" />
        </button>
      </div>

      <div className="mobile-section-label">Security</div>
      <div className="mobile-list">
        <button type="button" className="mobile-list-row mobile-list-row--danger" onClick={confirmLogout}>
          <LogOut size={17} className="mobile-list-row__icon" />
          <span className="mobile-list-row__label">Sign out</span>
        </button>
      </div>

      <div className="mobile-list">
        <button type="button" className="mobile-list-row" onClick={() => void openExternal("https://www.noska.me/terms")}>
          <span className="mobile-list-row__label">Terms</span>
        </button>
        <button type="button" className="mobile-list-row" onClick={() => void openExternal("https://www.noska.me/privacy")}>
          <span className="mobile-list-row__label">Privacy</span>
        </button>
      </div>
    </div>
  );
}

/* ── Page (editor) screen ──────────────────────────────────────────────── */

const BLOCK_TYPES: Array<{ type: string; icon: string; label: string }> = [
  { type: "text", icon: "Aa", label: "Text" },
  { type: "h1", icon: "H1", label: "Heading" },
  { type: "h2", icon: "H2", label: "Subheading" },
  { type: "todo", icon: "☑", label: "To-do" },
  { type: "bullet", icon: "•", label: "Bullet" },
  { type: "number", icon: "1.", label: "Numbered" },
  { type: "quote", icon: "❝", label: "Quote" },
  { type: "callout", icon: "!", label: "Callout" },
  { type: "code", icon: "{}", label: "Code" },
  { type: "divider", icon: "—", label: "Divider" },
];

function PageScreen({ openPage, onOpenAI, onShare }: {
  openPage: (id: string) => void;
  onOpenAI: () => void;
  onShare: () => void;
}) {
  const controller = useMobileController();
  const navigate = useNavigate();
  const page = controller.activePage;
  const [{ history, future }, { undo, redo }] = useWorkspace();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [blocksOpen, setBlocksOpen] = useState(false);

  const subpages = useMemo(
    () => (page ? controller.visiblePages.filter((p) => p.parentId === page.id) : []),
    [controller.visiblePages, page]
  );

  const addBlock = useCallback((type: string) => {
    setBlocksOpen(false);
    if (!page) return;
    const blocks = page.blocks || [];
    if (blocks.length === 0) {
      controller.updatePage(page.id, {
        blocks: [{ id: uid(), type, text: "" } as never],
      });
      return;
    }
    const lastId = blocks[blocks.length - 1].id;
    controller.editorProps.onAddBlock?.(page.id, lastId, type, "");
  }, [controller, page]);

  const goBack = () => {
    hapticFeedback("light");
    if (window.history.length > 1) navigate(-1);
    else navigate("/app/home", { replace: true });
  };

  if (!page) {
    return (
      <>
        <div className="mobile-shell__header">
          <button type="button" className="mobile-icon-btn" aria-label="Back" onClick={goBack}>
            <ChevronLeft size={22} />
          </button>
          <div className="mobile-shell__header-title"><span className="mobile-ws-name">Page</span></div>
        </div>
        <div className="mobile-screen mobile-screen--flush" style={{ flex: 1 }}>
          <div className="mobile-empty" style={{ height: "100%" }}>
            <span className="mobile-empty__art" aria-hidden>📄</span>
            <span className="mobile-empty__title">Page not found</span>
            <span className="mobile-empty__body">This page may have been deleted or is still syncing.</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Compact page header */}
      <div className="mobile-shell__header">
        <button type="button" className="mobile-icon-btn" aria-label="Back" onClick={goBack}>
          <ChevronLeft size={22} />
        </button>
        <div className="mobile-shell__header-title">
          <span aria-hidden style={{ fontSize: 17 }}>{page.icon || "📝"}</span>
          <span className="mobile-ws-name">{page.title || "Untitled"}</span>
        </div>
        <button
          type="button"
          className="mobile-icon-btn"
          aria-label="Favorite"
          onClick={() => {
            hapticFeedback("light");
            controller.updatePage(page.id, { favorite: !page.favorite });
          }}
        >
          <Star size={19} fill={page.favorite ? "currentColor" : "none"} color={page.favorite ? "#f59e0b" : undefined} />
        </button>
        <button type="button" className="mobile-icon-btn" aria-label="Page actions" onClick={() => { hapticFeedback("light"); setActionsOpen(true); }}>
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="mobile-page">
        <div className="mobile-page__editor mobile-touch-targets">
          <SplitWorkspaceRenderer {...controller.editorProps} />
        </div>

        {/* Editor toolbar — thumb-reachable, sits above the keyboard via --mobile-kb */}
        <div className="mobile-editor-toolbar">
          <button type="button" className="mobile-icon-btn" aria-label="Insert block" onClick={() => { hapticFeedback("light"); setBlocksOpen(true); }}>
            <Plus size={21} />
          </button>
          <button
            type="button"
            className="mobile-icon-btn"
            aria-label="Undo"
            style={{ opacity: history.length === 0 ? 0.35 : undefined }}
            onClick={() => { hapticFeedback("light"); undo(); }}
          >
            <Pencil size={19} style={{ transform: "rotate(-12deg)" }} />
          </button>
          <button
            type="button"
            className="mobile-icon-btn"
            aria-label="Redo"
            style={{ opacity: future.length === 0 ? 0.35 : undefined }}
            onClick={() => { hapticFeedback("light"); redo(); }}
          >
            <Pencil size={19} style={{ transform: "rotate(12deg) scaleX(-1)" }} />
          </button>
          <button type="button" className="mobile-icon-btn" aria-label="Ask AI" onClick={() => { hapticFeedback("light"); onOpenAI(); }}>
            <Sparkles size={20} />
          </button>
          <button
            type="button"
            className="mobile-icon-btn"
            aria-label="Dismiss keyboard"
            onClick={() => (document.activeElement as HTMLElement | null)?.blur?.()}
          >
            <ChevronLeft size={20} style={{ transform: "rotate(-90deg)" }} />
          </button>
        </div>
      </div>

      {/* Page actions sheet */}
      <AnimatePresence>
        {actionsOpen && (
          <MobileSheet title="Page actions" onClose={() => setActionsOpen(false)}>
            {subpages.length > 0 && (
              <>
                <div className="mobile-section-label" style={{ margin: "2px 2px 6px" }}>Subpages</div>
                {subpages.map((p) => <PageRow key={p.id} page={p} onOpen={openPage} showTime={false} />)}
                <div style={{ height: 12 }} />
              </>
            )}
            <div className="mobile-list" style={{ marginBottom: 0 }}>
              <button type="button" className="mobile-list-row" onClick={() => { setActionsOpen(false); onShare(); }}>
                <Share2 size={17} className="mobile-list-row__icon" />
                <span className="mobile-list-row__label">Share</span>
              </button>
              <button type="button" className="mobile-list-row" onClick={() => { setActionsOpen(false); controller.copyPageLink(page.id); }}>
                <Copy size={17} className="mobile-list-row__icon" />
                <span className="mobile-list-row__label">Copy public link</span>
              </button>
              <button type="button" className="mobile-list-row" onClick={() => { setActionsOpen(false); controller.renameFocus(page.id); }}>
                <Pencil size={17} className="mobile-list-row__icon" />
                <span className="mobile-list-row__label">Rename</span>
              </button>
              <button type="button" className="mobile-list-row" onClick={() => { setActionsOpen(false); controller.addInside(page.id); }}>
                <FolderPlus size={17} className="mobile-list-row__icon" />
                <span className="mobile-list-row__label">Add subpage</span>
              </button>
              <button type="button" className="mobile-list-row" onClick={() => { setActionsOpen(false); controller.toggleOffline(page.id); }}>
                <WifiOff size={17} className="mobile-list-row__icon" />
                <span className="mobile-list-row__label">{page.offline ? "Remove from offline" : "Available offline"}</span>
              </button>
              <button type="button" className="mobile-list-row" onClick={() => { setActionsOpen(false); controller.duplicatePage(page.id); }}>
                <Layers size={17} className="mobile-list-row__icon" />
                <span className="mobile-list-row__label">Duplicate</span>
              </button>
              <button type="button" className="mobile-list-row mobile-list-row--danger" onClick={() => { setActionsOpen(false); controller.trashPage(page.id); }}>
                <Trash2 size={17} className="mobile-list-row__icon" />
                <span className="mobile-list-row__label">Move to trash</span>
              </button>
            </div>
          </MobileSheet>
        )}
      </AnimatePresence>

      {/* Insert-block sheet */}
      <AnimatePresence>
        {blocksOpen && (
          <MobileSheet title="Insert block" onClose={() => setBlocksOpen(false)}>
            <div className="mobile-blockgrid">
              {BLOCK_TYPES.map((b) => (
                <button type="button" key={b.type} className="mobile-create-card" onClick={() => addBlock(b.type)}>
                  <span aria-hidden>{b.icon}</span>
                  {b.label}
                </button>
              ))}
            </div>
          </MobileSheet>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Bottom sheet primitive ────────────────────────────────────────────── */

export function MobileSheet({ title, onClose, children }: {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <motion.div
        className="mobile-sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="mobile-sheet"
        role="dialog"
        aria-modal="true"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        <div className="mobile-sheet__grabber" aria-hidden />
        {title && (
          <div className="mobile-sheet__title">
            {title}
            <button type="button" className="mobile-icon-btn" style={{ width: 36, height: 36 }} onClick={onClose} aria-label="Close">
              <X size={17} />
            </button>
          </div>
        )}
        <div className="mobile-sheet__body">{children}</div>
      </motion.div>
    </>
  );
}

/* ── Create sheet ──────────────────────────────────────────────────────── */

const CREATE_TEMPLATES: Array<{ template: string; icon: string; label: string }> = [
  { template: "blank", icon: "📝", label: "New page" },
  { template: "tasks", icon: "✅", label: "Tasks tracker" },
  { template: "projects", icon: "🔎", label: "Projects" },
  { template: "standup", icon: "🗓️", label: "Meeting notes" },
  { template: "docs", icon: "📄", label: "Document hub" },
  { template: "brainstorm", icon: "💡", label: "Brainstorm" },
  { template: "goals", icon: "🏁", label: "Goals" },
];

function CreateSheet({ onClose, openPage }: { onClose: () => void; openPage: (id: string) => void }) {
  const controller = useMobileController();
  const [, { setAiOpen }] = useAI();

  const create = (template: string) => {
    const id = controller.newPage(template);
    onClose();
    hapticFeedback("medium");
    if (id) openPage(id);
  };

  return (
    <MobileSheet title="Create" onClose={onClose}>
      <div className="mobile-create-grid">
        {CREATE_TEMPLATES.map((t) => (
          <button type="button" key={t.template} className="mobile-create-card" onClick={() => create(t.template)}>
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <button
          type="button"
          className="mobile-create-card"
          onClick={() => { onClose(); setAiOpen(true); }}
        >
          <span aria-hidden>✦</span>
          Ask AI
        </button>
      </div>
    </MobileSheet>
  );
}

/* ── Root shell ────────────────────────────────────────────────────────── */

export default function MobileWorkspaceApp() {
  const controller = useMobileController();
  const location = useLocation();
  const navigate = useNavigate();
  const [{ toast }, { setToast }] = useUI();
  const [{ aiOpen, apiKey, aiProvider, nvidiaKey, aiChats, activeChatId }, { setAiOpen, setAiChats, setActiveChatId }] = useAI();

  const [createOpen, setCreateOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [pendingWrites, setPendingWrites] = useState(() => hasPendingSyncWrites());

  // Platform bootstrap: mobile CSS scope + keyboard (visual viewport) insets.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("noska-mobile");
    const vv = window.visualViewport;
    let cleanup: (() => void) | undefined;
    if (vv) {
      const sync = () => {
        const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        root.style.setProperty("--mobile-kb", `${Math.round(kb)}px`);
      };
      vv.addEventListener("resize", sync);
      vv.addEventListener("scroll", sync);
      sync();
      cleanup = () => {
        vv.removeEventListener("resize", sync);
        vv.removeEventListener("scroll", sync);
        root.style.setProperty("--mobile-kb", "0px");
      };
    }
    return () => {
      root.classList.remove("noska-mobile");
      cleanup?.();
    };
  }, []);

  // Network + unsynced-writes state (offline support surfacing).
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const t = window.setInterval(() => setPendingWrites(hasPendingSyncWrites()), 2500);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.clearInterval(t);
    };
  }, []);

  const path = location.pathname;
  const isPageRoute = path.startsWith("/app/page/");
  const routePageId = isPageRoute ? decodeURIComponent(path.split("/")[3] ?? "") : null;
  const tab: MobileTab = path.startsWith("/app/search")
    ? "search"
    : path.startsWith("/app/inbox")
      ? "inbox"
      : path.startsWith("/app/profile")
        ? "profile"
        : "home";

  const goTab = useCallback((next: MobileTab) => {
    hapticFeedback("light");
    navigate(`/app/${next}`, { replace: true });
  }, [navigate]);

  const openPage = useCallback((pageId: string) => {
    if (!pageId) return;
    controller.selectPage(pageId);
    navigate(`/app/page/${encodeURIComponent(pageId)}`);
  }, [controller, navigate]);

  const syncLabel = !online
    ? "Offline"
    : pendingWrites
      ? "Syncing…"
      : controller.saveState === "Saving..."
        ? "Saving…"
        : null;

  return (
    <div className="mobile-shell" data-testid="mobile-shell">
      {/* Tab-screen header (page screens render their own compact header) */}
      {!isPageRoute && (
        <div className="mobile-shell__header">
          <div className="mobile-shell__header-title">
            <span className="mobile-ws-name">{controller.workspaceName}</span>
            {syncLabel && (
              <span className="mobile-shell__header-sub">
                {online ? <Clock size={11} /> : <WifiOff size={11} />}
                {syncLabel}
              </span>
            )}
          </div>
          <button type="button" className="mobile-icon-btn" aria-label="Open Noska AI" onClick={() => { hapticFeedback("light"); setAiOpen(true); }}>
            <Sparkles size={19} />
          </button>
        </div>
      )}

      {!online && (
        <div className="mobile-offline-banner">
          <WifiOff size={13} />
          Offline — edits are saved locally and will sync when you reconnect.
        </div>
      )}

      {/* Content */}
      <div className="mobile-shell__content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isPageRoute ? `page-${routePageId}` : tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}
          >
            {isPageRoute ? (
              <PageScreen openPage={openPage} onOpenAI={() => setAiOpen(true)} onShare={() => setShareOpen(true)} />
            ) : tab === "search" ? (
              <SearchScreen openPage={openPage} />
            ) : tab === "inbox" ? (
              <InboxScreen openPage={openPage} />
            ) : tab === "profile" ? (
              <ProfileScreen onOpenTrash={() => setTrashOpen(true)} onEditProfile={() => setProfileOpen(true)} />
            ) : (
              <HomeScreen openPage={openPage} onCreate={() => setCreateOpen(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Minimal Hover / Floating Bottom Navigation (Framer Style) */}
      <MobileFloatingNavbar
        activeTab={tab}
        isPageRoute={isPageRoute}
        pendingInvitesCount={controller.pendingInvites.length}
        onSelectTab={goTab}
        onCreate={() => setCreateOpen(true)}
      />

      {/* Overlays */}
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast("")} />}
      </AnimatePresence>
      <AnimatePresence>
        {createOpen && <CreateSheet onClose={() => setCreateOpen(false)} openPage={openPage} />}
      </AnimatePresence>

      <Suspense fallback={null}>
        <AIPanel
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          page={controller.activePage}
          pages={controller.visiblePages}
          apiKey={apiKey}
          aiProvider={aiProvider}
          nvidiaKey={nvidiaKey}
          aiChats={aiChats}
          activeChatId={activeChatId}
          onChatsChange={setAiChats}
          onActiveChat={setActiveChatId}
          onNewChat={() => setActiveChatId(null)}
          onSelectChat={(id) => { setActiveChatId(id); setAiOpen(true); }}
          onDeleteChat={(id) => setAiChats((prev) => prev.filter((c) => c.id !== id))}
          onRenameChat={(id, name) => setAiChats((prev) => prev.map((c) => c.id === id ? { ...c, name } : c))}
          onPagePatch={(patch) => { if (controller.activePage) controller.updatePage(controller.activePage.id, patch); }}
          onInsert={(blocks) => { if (controller.activePage) controller.updatePage(controller.activePage.id, { blocks: [...blocks, ...(controller.activePage.blocks || [])] }); }}
          onAppend={(blocks) => { if (controller.activePage) controller.updatePage(controller.activePage.id, { blocks: [...(controller.activePage.blocks || []), ...blocks] }); }}
          onReplaceText={(text) => { if (controller.activePage) controller.updatePage(controller.activePage.id, { blocks: [{ id: uid(), type: "callout", text, meta: { tone: "tip", icon: "✦" } } as never, ...(controller.activePage.blocks || [])] }); }}
          onSelectPage={(p) => openPage(p.id)}
          onToast={controller.showToast}
          toolContext={controller.toolContext}
          currentUsername={controller.currentUsername}
          currentUserEmail={controller.currentUserEmail}
          currentUserAvatar={controller.currentUserAvatar}
          currentUserId={controller.currentUserId}
        />
      </Suspense>

      {trashOpen && (
        <TrashModal
          pages={controller.trashPages}
          onClose={() => setTrashOpen(false)}
          onRestore={controller.restorePage}
          onDelete={controller.deleteForever}
        />
      )}
      {profileOpen && (
        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          currentUserId={controller.currentUserId}
          currentUsername={controller.currentUsername}
          currentUserEmail={controller.currentUserEmail}
          onToast={controller.showToast}
        />
      )}
      {shareOpen && controller.activePage && (
        <ShareModal
          page={controller.activePage}
          onClose={() => setShareOpen(false)}
          onToast={controller.showToast}
          currentUserId={controller.currentUserId}
          currentUsername={controller.currentUsername}
          workspaceSlug={slugifyWorkspaceName(controller.workspaceName)}
        />
      )}
      {controller.needsUsernameClaim && controller.currentUserId && (
        <ClaimUsernameModal
          userId={controller.currentUserId}
          onDone={(username) => controller.claimUsername(username)}
        />
      )}
    </div>
  );
}
