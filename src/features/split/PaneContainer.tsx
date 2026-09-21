import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Columns,
  X,
  Plus,
  BookOpen,
  PanelRightOpen,
  Pin
} from "lucide-react";
import { useTabs, type WorkspaceTab, VIEW_META } from "../../contexts/TabContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import type { Page } from "../../lib/supabaseService";
import Editor from "../../components/Editor";
import PageInspector from "../../components/PageInspector";
import { useNotificationTarget } from '../notifications/navigation';
import { WorkspaceView } from "../../components/WorkspaceViews";
import { PageIcon } from "../../components/PageIcon";
import PagePickerPopover from "../../components/tabs/PagePickerPopover";
import { UnlockPagePrompt } from "../encryption/Encryption";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import { auditEngine } from "../../lib/auditEngine";

interface PaneContainerProps {
  paneId: string;
  totalPanes: number;
  pages: Page[];
  sharedPages?: Page[];
  currentUserId?: string | null;
  renameFocusId?: string | null;
  onRenameFocusDone?: () => void;
  onPagePatch?: (pageId: string, patch: Record<string, unknown>) => void;
  onUpdatePage?: (pageId: string, patch: Record<string, unknown>) => void;
  onAddBlock?: (pageId: string, blockId: string, type: string, text: string) => void;
  onDeleteBlock?: (pageId: string, blockId: string) => void;
  onDuplicateBlock?: (pageId: string, blockId: string) => void;
  onMoveBlock?: (pageId: string, blockId: string, dir: number) => void;
  onBlocks?: (pageId: string, blocks: any[]) => void;
  onAskAI?: (blockId?: string, text?: string) => void;
  onFocusBlock?: (block: any) => void;
  onReadingModePage?: (page: Page) => void;
  onUnlockPage?: (pageId: string, pass: string) => Promise<boolean>;
  onDeletePage?: (pageId: string) => void;
  onToast?: (msg: string) => void;
  onVoiceCapture?: () => void;
  ghostWriterEnabled?: boolean;
  apiKey?: string;
  aiProvider?: string;
  nvidiaKey?: string;
  onCreateSubpage?: (parentPageId: string, afterBlockId: string, title: string) => string | null | undefined;
  onTrashPage?: (pageId: string) => void;
  onNewPage?: (template?: string) => void;
  locked?: boolean;
}

export default function PaneContainer({
  paneId,
  totalPanes,
  pages,
  sharedPages = [],
  currentUserId,
  renameFocusId,
  onRenameFocusDone,
  onPagePatch,
  onUpdatePage,
  onAddBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onBlocks,
  onAskAI,
  onFocusBlock,
  onReadingModePage,
  onUnlockPage,
  onDeletePage,
  onToast,
  onVoiceCapture,
  ghostWriterEnabled,
  apiKey,
  aiProvider,
  nvidiaKey,
  onCreateSubpage,
  onTrashPage,
  onNewPage,
  locked = false
}: PaneContainerProps) {
  const {
    panes,
    activePaneId,
    setActivePaneId,
    splitPage,
    closePane,
    navigatePane,
    closePaneTab,
    setPaneActiveTab
  } = useTabs();

  const pane = panes[paneId];
  const isActivePane = activePaneId === paneId;

  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState<{ top: number; left: number; bottom: number; right: number } | null>(null);

  const activeTab = useMemo(() => {
    if (!pane) return null;
    return pane.tabs.find((t) => t.id === pane.activeTabId) || pane.tabs[0] || null;
  }, [pane]);

  // Resolve current active page or view in this pane
  const activePage = useMemo(() => {
    if (!activeTab || activeTab.type !== "page") return null;
    return pages.find((p) => p.id === activeTab.targetId) || sharedPages.find((p) => p.id === activeTab.targetId) || null;
  }, [activeTab, pages, sharedPages]);

  const notificationTarget = useNotificationTarget(activePage?.id, isActivePane);
  useEffect(() => {
    if (notificationTarget?.commentId) setRightPanelOpen(true);
  }, [notificationTarget]);

  // Latest pages/pages-ref for block patches. Editor sub-components fire
  // block commits from memoized closures that may predate a concurrent
  // metadata patch (e.g. Add-to-review); merging onto the freshest snapshot
  // prevents those late commits from reverting metadata they never saw.
  const latestRef = useRef({ pages, sharedPages });
  latestRef.current = { pages, sharedPages };

  // Handle navigation inside this pane
  const handlePaneNavigate = useCallback(
    (targetPageId: string, options?: { altKey?: boolean; inNewTab?: boolean }) => {
      navigatePane(paneId, "page", targetPageId, { inNewTab: options?.inNewTab, makeActive: true });
    },
    [navigatePane, paneId]
  );

  const handleSplitClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPickerAnchor({
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right
    });
    setPickerOpen(true);
  }, []);

  if (!pane) return null;

  return (
    <div
      data-notification-page={activePage?.id}
      data-notification-active={isActivePane ? 'true' : 'false'}
      onClick={() => {
        if (!isActivePane) setActivePaneId(paneId);
      }}
      className={`relative flex h-full flex-col bg-[var(--bg)] min-w-0 min-h-0 flex-1 overflow-hidden transition-all duration-150 ${
        totalPanes > 1 && isActivePane
          ? "ring-1 ring-inset ring-[var(--accent)]/40 shadow-sm"
          : ""
      }`}
    >
      {/* Pane Header / Tab Strip (Shown when there are multiple panes, or to provide pane-specific controls) */}
      {totalPanes > 1 && (
        <div
          className={`flex h-[32px] shrink-0 items-center justify-between border-b border-[var(--border)] px-2 select-none z-10 transition-colors ${
            isActivePane ? "bg-[var(--surface-2)]" : "bg-[var(--surface-1)] opacity-90"
          }`}
        >
          {/* Tabs within this Pane */}
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
            {pane.tabs.map((tab, idx) => {
              const isTabActive = tab.id === pane.activeTabId;
              let title = "Untitled";
              let icon = "📄";

              if (tab.type === "page") {
                const p = pages.find((page) => page.id === tab.targetId) || sharedPages.find((page) => page.id === tab.targetId);
                title = p?.title?.trim() || "Untitled";
                icon = p?.icon || "📄";
              } else {
                const meta = VIEW_META[tab.targetId] || { icon: "📌", title: tab.targetId };
                title = meta.title;
                icon = meta.icon;
              }

              return (
                <div
                  key={tab.id || `tab-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPaneActiveTab(paneId, tab.id);
                  }}
                  className={`group/panetab flex h-[24px] items-center gap-1.5 rounded-md px-2 text-[11.5px] cursor-pointer transition-all max-w-[160px] min-w-[70px] ${
                    isTabActive
                      ? "bg-[var(--bg)] text-[var(--text)] font-medium shadow-xs border border-[var(--border)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] border border-transparent"
                  }`}
                  title={title}
                >
                  <span className="shrink-0 text-[12px] flex items-center justify-center">
                    {tab.type === "page" ? <PageIcon icon={icon} size={12} fallback={<span>📄</span>} /> : icon}
                  </span>
                  <span className="truncate flex-1 leading-tight">{title}</span>
                  {pane.tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closePaneTab(paneId, tab.id);
                      }}
                      className="grid h-3.5 w-3.5 place-items-center rounded opacity-0 group-hover/panetab:opacity-100 hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
                      title="Close tab"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add Tab to this Pane */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const fallbackPageId = pages[0]?.id || "home";
                navigatePane(paneId, pages[0] ? "page" : "view", fallbackPageId, { inNewTab: true, makeActive: true });
              }}
              className="grid h-5 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer shrink-0"
              title="New tab in this pane"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Right Pane Controls: Split, Reading Mode, Smart Inspector, Close Pane */}
          <div className="flex items-center gap-0.5 shrink-0 ml-2">
            {/* Split this pane */}
            <button
              onClick={handleSplitClick}
              className="grid h-5 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
              title="Split this pane beside"
            >
              <Columns size={11} />
            </button>

            {/* Reading Mode (for page) */}
            {activePage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReadingModePage?.(activePage);
                }}
                className="grid h-5 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
                title="Reading Mode"
              >
                <BookOpen size={11} />
              </button>
            )}

            {/* Smart Inspector toggle */}
            {activePage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRightPanelOpen(!rightPanelOpen);
                }}
                className={`grid h-5 w-5 place-items-center rounded hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer ${
                  rightPanelOpen ? "text-[var(--text)] bg-[var(--hover)]" : "text-[var(--muted)]"
                }`}
                title="Smart Navigator"
              >
                <PanelRightOpen size={11} />
              </button>
            )}

            {/* Close Pane Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closePane(paneId);
              }}
              className="grid h-5 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--danger)] transition cursor-pointer"
              title="Close split pane"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area: Editor or View */}
      <div className="flex-1 overflow-hidden flex relative bg-[var(--bg)] min-w-0 min-h-0">
        {activeTab?.type === "page" ? (
          activePage ? (
            <div className="flex-1 overflow-hidden flex flex-col relative min-w-0">
              {activePage.isEncrypted && activePage.isLocked ? (
                <UnlockPagePrompt
                  pageTitle={activePage.title}
                  onUnlock={async (passphrase) => {
                    if (onUnlockPage) {
                      await onUnlockPage(activePage.id, passphrase);
                    }
                  }}
                  onDecryptRemove={() => {
                    if (onDeletePage) {
                      onDeletePage(activePage.id);
                    }
                  }}
                  onToast={onToast}
                />
              ) : (
                <Editor
                  key={activePage.id}
                  page={activePage}
                  pages={pages}
                  forceReadOnly={locked}
                  renameFocusId={renameFocusId}
                  onRenameFocusDone={onRenameFocusDone}
                  onPagePatch={(patch) => onPagePatch?.(activePage.id, patch)}
                  onBlockPatch={(blockId, patch) => {
                    // Merge onto the LATEST snapshot (see latestRef note).
                    const source = latestRef.current;
                    const basePage =
                      source.pages.find((p) => p.id === activePage?.id) ||
                      source.sharedPages.find((p) => p.id === activePage?.id) ||
                      activePage;
                    if (!basePage?.blocks) return;
                    onUpdatePage?.(basePage.id, {
                      blocks: basePage.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b))
                    });
                  }}
                  onAddBlock={(blockId, type, text) => {
                    onAddBlock?.(activePage.id, blockId, type, text);
                  }}
                  onDeleteBlock={(blockId) => {
                    onDeleteBlock?.(activePage.id, blockId);
                  }}
                  onDuplicateBlock={(blockId) => {
                    onDuplicateBlock?.(activePage.id, blockId);
                  }}
                  onMoveBlock={(blockId, dir) => {
                    onMoveBlock?.(activePage.id, blockId, dir || 0);
                  }}
                  onBlocks={(blocks) => {
                    onBlocks?.(activePage.id, blocks);
                  }}
                  onAskAI={onAskAI}
                  onFocusBlock={onFocusBlock}
                  onVoiceCapture={onVoiceCapture}
                  ghostWriterEnabled={ghostWriterEnabled}
                  apiKey={apiKey}
                  aiProvider={aiProvider}
                  nvidiaKey={nvidiaKey}
                  onToast={onToast}
                  onUpdatePage={onUpdatePage}
                  onNavigate={handlePaneNavigate}
                  onCreateSubpage={(afterBlockId, title) =>
                    onCreateSubpage?.(activePage.id, afterBlockId, title)
                  }
                  onTrashPage={onTrashPage}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--muted)]">
              <span className="text-3xl mb-2">📄</span>
              <p className="text-sm font-medium text-[var(--text)]">Page not found</p>
              <p className="text-xs mt-1">This page may have been deleted or moved.</p>
              <button
                onClick={() => {
                  if (pages[0]) handlePaneNavigate(pages[0].id);
                }}
                className="mt-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--hover)] transition"
              >
                Go to first page
              </button>
            </div>
          )
        ) : (
          <div className="flex-1 overflow-y-auto min-w-0">
            <WorkspaceView
              view={activeTab?.targetId || "home"}
              pages={pages}
              currentUserId={currentUserId}
              onSelect={handlePaneNavigate}
              onNew={(template) => onNewPage?.(template)}
              onAI={() => onAskAI?.()}
              onToast={onToast}
            />
          </div>
        )}

        {/* Slide-out Right Smart Panel */}
        <AnimatePresence>
          {rightPanelOpen && activePage && !activePage.isLocked && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 245, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={SPRING_PRESETS.soft}
              className="h-full border-l border-[var(--border)] bg-[var(--sidebar)] flex flex-col min-w-0 overflow-hidden text-xs shrink-0 select-none z-10"
            >
              <PageInspector
                notificationCommentId={notificationTarget?.commentId}
                page={activePage}
                pages={pages}
                pageId={activePage.id}
                activeId={activePage.id}
                locked={locked}
                onPatchPage={(patch) => onPagePatch?.(activePage.id, patch)}
                onSelect={handlePaneNavigate}
                onAskAI={onAskAI}
                onRestoreVersion={(versionId) => {
                  auditEngine.restoreVersion(activePage.id, versionId).then((result) => {
                    if (result) {
                      onPagePatch?.(activePage.id, { title: result.title, blocks: result.blocks });
                      onToast?.("Version restored");
                    }
                  });
                }}
                onToast={onToast}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pane Split Page Picker Popover */}
      {pickerOpen && activePage && (
        <PagePickerPopover
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          currentPageTitle={activePage.title || "Untitled"}
          currentPageId={activePage.id}
          sourcePaneId={paneId}
          pages={pages}
          openTabs={pane.tabs}
          anchorRect={pickerAnchor}
          onSelectPage={(targetPageId) => {
            splitPage({
              pageId: targetPageId,
              sourcePaneId: paneId,
              direction: "right"
            });
          }}
          onCreateNewPage={() => {
            onNewPage?.("blank");
          }}
        />
      )}
    </div>
  );
}
