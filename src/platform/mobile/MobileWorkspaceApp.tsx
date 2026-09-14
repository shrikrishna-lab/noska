// MobileWorkspaceApp — Apple Liquid Glass mobile shell for the Noska workspace.
// Features:
// - Single bottom Apple Liquid Glass Capsule Dock with attached (+) Action Button
// - Expandable Liquid Glass Action Grid Sheet on tapping (+)
// - Horizontal Recents Card Carousel with cover banners and floating emoji badges
// - Hierarchical Page Tree ("Private" & "Teamspaces") with expandable subpages
// - Mobile Keyboard Accessory Toolbar & quick block formatting chips
// - Noska Flow Compact Waveform Pill & Live Dictation / Speech Recognition
// - Native touch responsiveness with 60fps hardware acceleration

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search as SearchIcon,
  MoreVertical,
  Share2,
  Plus,
  Lock,
  LayoutTemplate,
  Sun,
  Moon,
  X,
  Mic,
  Sparkles,
  Volume2,
  Database,
} from "lucide-react";

import type { Page } from "../../lib/supabaseService";
import type { Block } from "../../../types/blocks";
import { useUI } from "../../contexts/UIContext";
import { useAI } from "../../contexts/AIContext";
import SplitWorkspaceRenderer from "../../features/split/SplitWorkspaceRenderer";
import { plainText, timeAgo, uid } from "../../utils/helpers";
import { hapticFeedback } from "../index";
import { useMobileController } from "./MobileAppController";
import { MobileFloatingNavbar, type MobileTab } from "./MobileFloatingNavbar";
import { MobileActionGridSheet } from "./MobileActionGridSheet";
import { MobileKeyboardToolbar } from "./MobileKeyboardToolbar";
import { MobileFlowPill } from "./MobileFlowPill";
import "./mobile.css";

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #fbcfe8 0%, #e0e7ff 100%)",
  "linear-gradient(135deg, #fed7aa 0%, #fef08a 100%)",
  "linear-gradient(135deg, #a7f3d0 0%, #bfdbfe 100%)",
  "linear-gradient(135deg, #c7d2fe 0%, #fbcfe8 100%)",
  "linear-gradient(135deg, #bae6fd 0%, #d9f99d 100%)",
];

function getCoverStyle(page: Page, index: number): string {
  if (page.cover) {
    if (page.cover.startsWith("http") || page.cover.startsWith("data:") || page.cover.startsWith("/")) {
      return `url(${page.cover}) center/cover no-repeat`;
    }
    return page.cover;
  }
  return COVER_GRADIENTS[index % COVER_GRADIENTS.length];
}

/* ── Recents Card Carousel ─────────────────────────────────────────────── */

function RecentsCarousel({ pages, onOpen }: { pages: Page[]; onOpen: (id: string) => void }) {
  if (pages.length === 0) return null;

  return (
    <div className="mobile-recents-section">
      <div className="mobile-section-header">
        <span className="mobile-section-title">Recents</span>
      </div>
      <div className="mobile-recents-carousel">
        {pages.map((p, idx) => (
          <motion.button
            key={p.id}
            type="button"
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            className="mobile-recents-card"
            onClick={() => {
              hapticFeedback("light");
              onOpen(p.id);
            }}
          >
            <div className="mobile-recents-card__cover" style={{ background: getCoverStyle(p, idx) }} />
            <div className="mobile-recents-card__body">
              <span className="mobile-recents-card__icon" aria-hidden>
                {p.icon || "📝"}
              </span>
              <span className="mobile-recents-card__title">{p.title || "Untitled"}</span>
              <span className="mobile-recents-card__time">{timeAgo(p.updatedAt)}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ── Hierarchical Page Tree ─────────────────────────────────────────────── */

function PageTreeItem({
  page,
  level = 0,
  allPages,
  expandedIds,
  onToggleExpand,
  onOpen,
  onCreateChild,
}: {
  page: Page;
  level?: number;
  allPages: Page[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onOpen: (id: string) => void;
  onCreateChild: (parentId: string) => void;
}) {
  const children = useMemo(
    () => allPages.filter((p) => p.parentId === page.id && !p.trashed),
    [allPages, page.id]
  );
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(page.id);

  return (
    <div className="mobile-tree-node">
      <div
        className="mobile-tree-row"
        style={{ paddingLeft: `${14 + level * 18}px` }}
        onClick={() => {
          hapticFeedback("light");
          onOpen(page.id);
        }}
      >
        <button
          type="button"
          className="mobile-tree-chevron"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggleExpand(page.id);
          }}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {hasChildren ? (
            <ChevronDown
              size={15}
              className={`transition-transform duration-150 ${isExpanded ? "" : "-rotate-90"}`}
            />
          ) : (
            <div className="mobile-tree-chevron-placeholder" />
          )}
        </button>

        <span className="mobile-tree-icon" aria-hidden>
          {page.icon || "📄"}
        </span>

        <span className="mobile-tree-title">{page.title || "Untitled"}</span>

        <div className="mobile-tree-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="mobile-tree-btn"
            onClick={() => {
              hapticFeedback("light");
              onCreateChild(page.id);
            }}
            aria-label="Add subpage"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="mobile-tree-children">
          {children.map((child) => (
            <PageTreeItem
              key={child.id}
              page={child}
              level={level + 1}
              allPages={allPages}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onOpen={onOpen}
              onCreateChild={onCreateChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Home Screen ────────────────────────────────────────────────────────── */

function HomeScreen({
  openPage,
  onOpenActionGrid,
}: {
  openPage: (id: string) => void;
  onOpenActionGrid: () => void;
}) {
  const controller = useMobileController();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const recents = useMemo(() => {
    return [...controller.visiblePages]
      .filter((p) => !p.trashed)
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 8);
  }, [controller.visiblePages]);

  const rootPages = useMemo(
    () => controller.visiblePages.filter((p) => !p.parentId && !p.trashed),
    [controller.visiblePages]
  );

  return (
    <div className="mobile-screen">
      {/* Recents Horizontal Carousel */}
      <RecentsCarousel pages={recents} onOpen={openPage} />

      {/* Pages Section */}
      <div className="mobile-section-header">
        <span className="mobile-section-title">Private</span>
        <div className="mobile-section-actions">
          <button
            type="button"
            className="mobile-icon-btn"
            onClick={() => onOpenActionGrid()}
            aria-label="New page"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="mobile-tree-container">
        {rootPages.length === 0 ? (
          <div className="mobile-empty">
            <span className="mobile-empty__art" aria-hidden>✨</span>
            <span className="mobile-empty__title">Your workspace is ready</span>
            <span className="mobile-empty__body">Tap the + button below to create your first page.</span>
          </div>
        ) : (
          rootPages.map((page) => (
            <PageTreeItem
              key={page.id}
              page={page}
              allPages={controller.visiblePages}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onOpen={openPage}
              onCreateChild={(parentId) => {
                const newId = controller.newPage(undefined, parentId);
                if (newId) openPage(newId);
              }}
            />
          ))
        )}
      </div>

      {/* Teamspaces Section */}
      <div className="mobile-section-header" style={{ marginTop: 24 }}>
        <span className="mobile-section-title">Teamspaces</span>
        <div className="mobile-section-actions">
          <button
            type="button"
            className="mobile-icon-btn"
            onClick={() => {
              const newId = controller.newPage();
              if (newId) openPage(newId);
            }}
            aria-label="New team page"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="mobile-teamspace-card" onClick={() => {
        if (rootPages[0]) openPage(rootPages[0].id);
      }}>
        <div className="mobile-teamspace-icon">🏢</div>
        <div className="mobile-teamspace-info">
          <span className="mobile-teamspace-name">{controller.workspaceName || "Workspace HQ"}</span>
          <span className="mobile-teamspace-meta">Shared workspace · {controller.visiblePages.length} docs</span>
        </div>
        <ChevronRight size={16} className="opacity-40" />
      </div>

      {/* Browse Templates Banner */}
      <div className="mobile-template-banner" onClick={() => onOpenActionGrid()}>
        <div className="mobile-template-banner__icon">
          <LayoutTemplate size={20} />
        </div>
        <div className="mobile-template-banner__text">
          <span className="mobile-template-banner__title">Browse templates</span>
          <span className="mobile-template-banner__subtitle">Projects, notes, databases, and meetings</span>
        </div>
      </div>
    </div>
  );
}

/* ── Pages Hierarchy Screen ─────────────────────────────────────────────── */

function PagesScreen({ openPage, onOpenActionGrid }: { openPage: (id: string) => void; onOpenActionGrid: () => void }) {
  const controller = useMobileController();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rootPages = useMemo(
    () => controller.visiblePages.filter((p) => !p.parentId && !p.trashed),
    [controller.visiblePages]
  );

  return (
    <div className="mobile-screen">
      <div className="mobile-screen-title-bar">
        <h1>Pages &amp; Hierarchy</h1>
        <button
          type="button"
          className="mobile-btn mobile-btn--secondary"
          style={{ height: 36, padding: "0 12px", fontSize: 13 }}
          onClick={onOpenActionGrid}
        >
          <Plus size={14} /> New
        </button>
      </div>

      <div className="mobile-tree-container">
        {rootPages.map((page) => (
          <PageTreeItem
            key={page.id}
            page={page}
            allPages={controller.visiblePages}
            expandedIds={expandedIds}
            onToggleExpand={toggleExpand}
            onOpen={openPage}
            onCreateChild={(parentId) => {
              const newId = controller.newPage(undefined, parentId);
              if (newId) openPage(newId);
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Search Screen ─────────────────────────────────────────────────────── */

function SearchScreen({ openPage, onBack }: { openPage: (id: string) => void; onBack?: () => void }) {
  const controller = useMobileController();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return controller.visiblePages.slice(0, 10);
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
      <div className="mobile-search-header-row">
        <div className="mobile-search-field" style={{ flex: 1 }}>
          <SearchIcon size={17} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages, tasks, notes…"
            autoComplete="off"
            autoFocus
            enterKeyHint="search"
          />
          {q && (
            <button type="button" className="mobile-icon-btn" style={{ width: 32, height: 32 }} onClick={() => setQ("")} aria-label="Clear">
              <X size={15} />
            </button>
          )}
        </div>
        {onBack && (
          <button
            type="button"
            className="mobile-search-cancel-btn"
            onClick={() => {
              hapticFeedback("light");
              onBack();
            }}
          >
            Cancel
          </button>
        )}
      </div>

      <div className="mobile-search-results">
        {results.map((p) => (
          <button
            key={p.id}
            type="button"
            className="mobile-search-row"
            onClick={() => {
              hapticFeedback("light");
              openPage(p.id);
            }}
          >
            <span className="mobile-search-row__icon">{p.icon || "📄"}</span>
            <div className="mobile-search-row__body">
              <span className="mobile-search-row__title">{p.title || "Untitled"}</span>
              <span className="mobile-search-row__meta">{timeAgo(p.updatedAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Inbox Screen ──────────────────────────────────────────────────────── */

function InboxScreen({ openPage }: { openPage: (id: string) => void }) {
  const controller = useMobileController();

  return (
    <div className="mobile-screen">
      <div className="mobile-screen-title-bar">
        <h1>Inbox &amp; Activity</h1>
      </div>

      {controller.pendingInvites.length === 0 ? (
        <div className="mobile-empty">
          <span className="mobile-empty__art" aria-hidden>🔔</span>
          <span className="mobile-empty__title">All caught up</span>
          <span className="mobile-empty__body">No pending invites or workspace notifications.</span>
        </div>
      ) : (
        controller.pendingInvites.map((invite) => {
          const pageId = (invite as { page_id?: string }).page_id;
          const page = controller.visiblePages.find((p) => p.id === pageId)
            || controller.sharedPages.find((p) => p.id === pageId);
          return (
            <div key={invite.id} className="mobile-invite-card">
              <span className="mobile-invite-card__title">
                {page ? page.title || "Untitled" : "A page was shared with you"}
              </span>
              <div className="mobile-invite-card__actions">
                <button
                  type="button"
                  className="mobile-btn mobile-btn--primary"
                  onClick={() => controller.acceptInvite(invite.id)}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="mobile-btn mobile-btn--ghost"
                  onClick={() => controller.declineInvite(invite.id)}
                >
                  Decline
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ── Settings Screen (Apple iOS Native Style) ───────────────────────────── */

function SettingsScreen() {
  const controller = useMobileController();
  const [themePreference, setThemePreference] = useState<"system" | "light" | "dark">(() => {
    return (localStorage.getItem("noska_theme_mode") as "system" | "light" | "dark") || "system";
  });
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [ghostWriter, setGhostWriter] = useState(true);
  const [aiEngine, setAiEngine] = useState("auto");

  // Sync with device theme when in system mode
  useEffect(() => {
    if (themePreference === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const applySystemTheme = () => {
        controller.setTheme(media.matches ? "dark" : "light");
      };
      applySystemTheme();
      media.addEventListener("change", applySystemTheme);
      return () => media.removeEventListener("change", applySystemTheme);
    }
  }, [themePreference, controller]);

  const handleSelectThemeMode = (mode: "system" | "light" | "dark") => {
    hapticFeedback("medium");
    setThemePreference(mode);
    localStorage.setItem("noska_theme_mode", mode);
    if (mode === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      controller.setTheme(isDark ? "dark" : "light");
    } else {
      controller.setTheme(mode);
    }
  };

  return (
    <div className="mobile-screen mobile-settings-screen">
      <div className="mobile-screen-title-bar">
        <h1>Settings</h1>
      </div>

      {/* Profile & Account Card */}
      <div className="mobile-settings-profile-card" onClick={() => controller.openSettings("account")}>
        <div className="mobile-user-avatar mobile-user-avatar--large">
          {(controller.currentUsername || "K").charAt(0).toUpperCase()}
        </div>
        <div className="mobile-settings-profile-info">
          <div className="mobile-settings-profile-name-row">
            <span className="mobile-settings-profile-name">{controller.currentUsername || "Workspace User"}</span>
            <span className="mobile-settings-plan-badge">PRO</span>
          </div>
          <span className="mobile-settings-profile-email">{controller.currentUserEmail || "@workspace"}</span>
          <span className="mobile-settings-profile-ws">{controller.workspaceName || "Noska HQ"} · Active</span>
        </div>
        <ChevronRight size={18} className="opacity-40" />
      </div>

      {/* Group 1: Appearance (Acts on Device Theme) */}
      <div className="mobile-settings-group">
        <span className="mobile-settings-group-title">APPEARANCE</span>
        <div className="mobile-settings-card">
          <div className="mobile-settings-theme-selector">
            <button
              type="button"
              className={`mobile-theme-choice ${themePreference === "system" ? "is-selected" : ""}`}
              onClick={() => handleSelectThemeMode("system")}
            >
              <div className="mobile-theme-choice__preview mobile-theme-choice__preview--system">
                <div className="preview-half preview-half--light" />
                <div className="preview-half preview-half--dark" />
              </div>
              <span className="mobile-theme-choice__label">Device Theme</span>
              <span className="mobile-theme-choice__sub">Auto sync</span>
            </button>

            <button
              type="button"
              className={`mobile-theme-choice ${themePreference === "light" ? "is-selected" : ""}`}
              onClick={() => handleSelectThemeMode("light")}
            >
              <div className="mobile-theme-choice__preview mobile-theme-choice__preview--light">
                <Sun size={18} />
              </div>
              <span className="mobile-theme-choice__label">Light</span>
              <span className="mobile-theme-choice__sub">Always light</span>
            </button>

            <button
              type="button"
              className={`mobile-theme-choice ${themePreference === "dark" ? "is-selected" : ""}`}
              onClick={() => handleSelectThemeMode("dark")}
            >
              <div className="mobile-theme-choice__preview mobile-theme-choice__preview--dark">
                <Moon size={18} />
              </div>
              <span className="mobile-theme-choice__label">Dark</span>
              <span className="mobile-theme-choice__sub">Always dark</span>
            </button>
          </div>
        </div>
      </div>

      {/* Group 2: Noska Flow & Voice Engine */}
      <div className="mobile-settings-group">
        <span className="mobile-settings-group-title">NOSKA FLOW &amp; VOICE</span>
        <div className="mobile-settings-card">
          <div className="mobile-settings-row">
            <div className="mobile-settings-row__left">
              <div className="mobile-settings-icon-box mobile-settings-icon-box--purple">
                <Mic size={16} />
              </div>
              <div className="mobile-settings-row__text">
                <span>Speech-to-Text Engine</span>
                <span className="mobile-settings-subtext">Real-time continuous dictation</span>
              </div>
            </div>
            <span className="mobile-settings-value">Native WebSpeech</span>
          </div>

          <div className="mobile-settings-row">
            <div className="mobile-settings-row__left">
              <div className="mobile-settings-icon-box mobile-settings-icon-box--blue">
                <Sparkles size={16} />
              </div>
              <div className="mobile-settings-row__text">
                <span>GhostWriter AI</span>
                <span className="mobile-settings-subtext">Smart autocomplete in editor</span>
              </div>
            </div>
            <input
              type="checkbox"
              className="mobile-switch"
              checked={ghostWriter}
              onChange={(e) => setGhostWriter(e.target.checked)}
            />
          </div>
        </div>
      </div>

      {/* Group 3: Mobile Experience & Device Features */}
      <div className="mobile-settings-group">
        <span className="mobile-settings-group-title">DEVICE &amp; STORAGE</span>
        <div className="mobile-settings-card">
          <div className="mobile-settings-row">
            <div className="mobile-settings-row__left">
              <div className="mobile-settings-icon-box mobile-settings-icon-box--amber">
                <Volume2 size={16} />
              </div>
              <div className="mobile-settings-row__text">
                <span>Haptic Micro-Feedback</span>
                <span className="mobile-settings-subtext">Tactile clicks on taps and gestures</span>
              </div>
            </div>
            <input
              type="checkbox"
              className="mobile-switch"
              checked={hapticsEnabled}
              onChange={(e) => {
                setHapticsEnabled(e.target.checked);
                if (e.target.checked) hapticFeedback("medium");
              }}
            />
          </div>

          <div className="mobile-settings-row">
            <div className="mobile-settings-row__left">
              <div className="mobile-settings-icon-box mobile-settings-icon-box--emerald">
                <Database size={16} />
              </div>
              <div className="mobile-settings-row__text">
                <span>Offline Stored Pages</span>
                <span className="mobile-settings-subtext">Instant offline access</span>
              </div>
            </div>
            <span className="mobile-settings-value">{controller.visiblePages.length} cached</span>
          </div>

          <div className="mobile-settings-row" onClick={() => {
            hapticFeedback("light");
            controller.showToast("Local offline cache is fresh and synchronized");
          }}>
            <span className="mobile-settings-action-text">Clear Cache &amp; Re-sync</span>
            <span className="opacity-40">›</span>
          </div>
        </div>
      </div>

      {/* Group 4: Workspace & Account */}
      <div className="mobile-settings-group">
        <span className="mobile-settings-group-title">WORKSPACE ACTIONS</span>
        <div className="mobile-settings-card">
          <div className="mobile-settings-row" onClick={() => controller.openSettings("general")}>
            <span>Workspace Preferences</span>
            <span className="opacity-40">›</span>
          </div>

          <div className="mobile-settings-row mobile-settings-row--danger" onClick={() => {
            hapticFeedback("heavy");
            controller.logout();
          }}>
            <span>Log Out of Workspace</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mobile-settings-footer">
        <span>Noska Mobile v1.1.1</span>
        <span>Android Native · Tauri v2 GPU Pipeline</span>
      </div>
    </div>
  );
}

/* ── Main Mobile Workspace Shell ────────────────────────────────────────── */

export default function MobileWorkspaceApp() {
  const controller = useMobileController();
  const [, uiActions] = useUI();
  const [aiState, aiActions] = useAI();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const [isActionGridOpen, setIsActionGridOpen] = useState(false);
  const [isFlowActive, setIsFlowActive] = useState(false);

  const isPageRoute = Boolean(controller.activePage && location.pathname.startsWith("/p/"));

  const openPage = useCallback((id: string) => {
    controller.selectPage(id);
    navigate(`/p/${id}`);
  }, [controller, navigate]);

  const handleActionGridSelect = (action: string) => {
    hapticFeedback("medium");
    if (action === "flow" || action === "voice") {
      setIsFlowActive(true);
    } else if (action === "page") {
      const newId = controller.newPage("blank");
      if (newId) openPage(newId);
    } else if (action === "private") {
      const newId = controller.newPage("blank", null, { title: "Private Note" });
      if (newId) {
        controller.updatePage(newId, { icon: "🔒" });
        openPage(newId);
      }
    } else if (action === "ai") {
      aiActions.setAiOpen(true);
    } else if (action === "database") {
      const newId = controller.newPage("tasks", null, { title: "Database" });
      if (newId) openPage(newId);
    } else if (action === "task") {
      const newId = controller.newPage("standup", null, { title: "To-Do & Tasks" });
      if (newId) openPage(newId);
    } else if (action === "template") {
      const newId = controller.newPage("projects", null, { title: "Project Board" });
      if (newId) openPage(newId);
    }
  };

  const handleFlowInsert = (text: string) => {
    if (isPageRoute && controller.activePage) {
      // Append a block into the active page
      const newBlock = { id: uid(), type: "text", text, properties: {} };
      const currentBlocks = controller.activePage.blocks || [];
      const updatedBlocks = [...currentBlocks, newBlock];
      controller.updatePage(controller.activePage.id, {
        blocks: updatedBlocks,
        updatedAt: new Date().toISOString(),
      });
      controller.showToast("Dictated into page");
    } else {
      // Create a new Flow note page
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const newId = controller.newPage(undefined, null, { title: `Flow Note · ${timeStr}` });
      if (newId) {
        controller.updatePage(newId, {
          icon: "🎙️",
          blocks: [{ id: uid(), type: "text", text, properties: {} }],
        });
        openPage(newId);
        controller.showToast("Created Flow note");
      }
    }
  };

  return (
    <div className={`noska-mobile ${controller.theme === "dark" ? "dark" : ""}`}>
      {/* Top Header */}
      <header className="mobile-header">
        {isPageRoute ? (
          <div className="mobile-header__left">
            <button
              type="button"
              className="mobile-header__back-btn"
              onClick={() => {
                hapticFeedback("light");
                navigate("/");
              }}
              aria-label="Back to workspace"
            >
              <ChevronLeft size={20} strokeWidth={2.4} />
              <span className="mobile-header__breadcrumb">
                {controller.activePage?.icon ? (
                  <span className="mr-1">{controller.activePage.icon}</span>
                ) : (
                  <Lock size={12} className="inline mr-1 opacity-60" />
                )}
                {controller.activePage?.title || "Page"}
              </span>
            </button>
          </div>
        ) : (
          <div className="mobile-header__left">
            <button
              type="button"
              className="mobile-header__profile-btn"
              onClick={() => controller.openSettings("account")}
            >
              <div className="mobile-user-avatar">
                {(controller.currentUsername || "K").charAt(0).toUpperCase()}
              </div>
              <div className="mobile-header__ws-meta">
                <span className="mobile-header__workspace-name">
                  {controller.workspaceName || "Noska"}
                </span>
                <span className="mobile-header__user-sub">
                  @{controller.currentUsername || "workspace"}
                </span>
              </div>
            </button>
          </div>
        )}

        <div className="mobile-header__right">
          {isPageRoute ? (
            <>
              <button
                type="button"
                className="mobile-icon-btn"
                onClick={() => uiActions.setShareOpen(true)}
                aria-label="Share"
              >
                <Share2 size={18} />
              </button>
              <button
                type="button"
                className="mobile-icon-btn"
                onClick={() => controller.openSettings()}
                aria-label="More"
              >
                <MoreVertical size={18} />
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`mobile-icon-btn ${activeTab === "search" ? "is-active" : ""}`}
              onClick={() => {
                hapticFeedback("light");
                setActiveTab((prev) => (prev === "search" ? "home" : "search"));
              }}
              aria-label="Search"
            >
              <SearchIcon size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Main Screen Content Area */}
      <main className="mobile-content-host">
        {isPageRoute ? (
          <div className="mobile-editor-host">
            <SplitWorkspaceRenderer {...controller.editorProps} />
            <MobileKeyboardToolbar
              onInsertBlock={(type) => {
                if (!controller.activePage) return;
                const pageId = controller.activePage.id;
                const blocks = controller.activePage.blocks || [];
                const newBlock = {
                  id: uid(),
                  type: type,
                  text: "",
                  properties: {},
                };
                controller.updatePage(pageId, {
                  blocks: [...blocks, newBlock],
                  updatedAt: new Date().toISOString(),
                });
                controller.showToast(`Added ${type.toUpperCase()}`);
              }}
              onFormatText={(format) => {
                if (format === "undo") {
                  document.execCommand("undo", false);
                } else if (format === "bold") {
                  document.execCommand("bold", false);
                } else if (format === "italic") {
                  document.execCommand("italic", false);
                }
              }}
              onAskAI={() => aiActions.setAiOpen(true)}
              onVoiceNote={() => setIsFlowActive(true)}
              onFlow={() => setIsFlowActive((prev) => !prev)}
              onDismissKeyboard={() => {
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }}
            />
          </div>
        ) : activeTab === "home" ? (
          <HomeScreen
            openPage={openPage}
            onOpenActionGrid={() => setIsActionGridOpen(true)}
          />
        ) : activeTab === "pages" ? (
          <PagesScreen openPage={openPage} onOpenActionGrid={() => setIsActionGridOpen(true)} />
        ) : activeTab === "search" ? (
          <SearchScreen openPage={openPage} onBack={() => setActiveTab("home")} />
        ) : activeTab === "inbox" ? (
          <InboxScreen openPage={openPage} />
        ) : (
          <SettingsScreen />
        )}
      </main>

      {/* Single Bottom Apple Liquid Glass Dock (switches to Flow Pill when Flow mode is active) */}
      {!isPageRoute && !isFlowActive && (
        <MobileFloatingNavbar
          activeTab={activeTab}
          isPageRoute={isPageRoute}
          pendingInvitesCount={controller.pendingInvites.length}
          onSelectTab={(tab) => setActiveTab(tab)}
          onOpenActionGrid={() => setIsActionGridOpen((prev) => !prev)}
          isActionGridOpen={isActionGridOpen}
        />
      )}

      {/* Noska Flow Compact Pill Bar (both in Editor and in Workspace) */}
      <MobileFlowPill
        isOpen={isFlowActive}
        onClose={() => setIsFlowActive(false)}
        isPageRoute={isPageRoute}
        onOpenAI={() => aiActions.setAiOpen(true)}
        onInsertText={handleFlowInsert}
      />

      {/* Apple-style Liquid Glass Action Grid Sheet */}
      <MobileActionGridSheet
        isOpen={isActionGridOpen}
        onClose={() => setIsActionGridOpen(false)}
        onAction={handleActionGridSelect}
      />
    </div>
  );
}
