import React, { useState, useMemo } from "react";
import {
  X,
  BookOpen,
  PanelRightOpen,
  ChevronLeft,
  GripVertical,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "../../components/Editor";
import PageInspector from "../../components/PageInspector";
import PagePeek from "../../components/editor/PagePeek";
import { timeAgo, plainText } from "../../utils/helpers";
import { UnlockPagePrompt } from "../encryption/Encryption";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import { auditEngine } from "../../lib/auditEngine";

export default function StackedColumn({
  page,
  pages,
  renameFocusId,
  onRenameFocusDone,
  onPagePatch,
  onBlockPatch,
  onAddBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onBlocks,
  onAskAI,
  onFocusBlock,
  onClose,
  isResizable,
  isActive,
  onSelect,
  onReadingModePage,
  onUnlockPage,
  onDeletePage,
  onToast,
  onVoiceCapture,
  ghostWriterEnabled,
  apiKey,
  aiProvider,
  nvidiaKey,
  onUpdatePage,
  onCreateSubpage,
  onTrashPage,
  isFirst,
}) {
  const [width, setWidth] = useState(480);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const pageText = plainText(page);

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = width;
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setWidth(Math.max(360, Math.min(1000, startWidth + deltaX)));
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      className={`relative flex h-full flex-col bg-[var(--bg)] border-r border-[var(--border)] transition-shadow ${
        isActive ? "ring-1 ring-inset ring-[var(--accent)] z-10 shadow-lg" : "shadow-sm"
      } ${isResizable ? "shrink-0" : "flex-1 min-w-[360px]"}`}
      style={isResizable ? { width: `${width}px` } : { flex: "1 1 0%", minWidth: "360px" }}
      onMouseDown={(e) => {
        if (e.target.closest('button, a, input, select, textarea, [role="button"], [contenteditable]')) return;
        onSelect?.(page.id, { altKey: e.altKey });
      }}
    >
      {/* Minimal Column Tab — like Notion's stacked tabs */}
      <div
        className="flex h-8 shrink-0 items-center border-b border-[var(--border)] px-2 bg-[var(--sidebar)] select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-xs shrink-0">{page.icon || "📄"}</span>
          <PagePeek page={page} pages={pages} onNavigate={onSelect}>
            <span className="truncate text-xs font-medium text-[var(--text)]">
              {page.title || "Untitled"}
            </span>
          </PagePeek>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRightPanelOpen(!rightPanelOpen);
            }}
            className={`grid h-5 w-5 place-items-center rounded hover:bg-[var(--hover)] hover:text-[var(--text)] transition ${
              rightPanelOpen ? "text-[var(--text)] bg-[var(--hover)]" : "text-[var(--muted)]"
            }`}
            title="Toggle Smart Navigator"
          >
            <PanelRightOpen size={11} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReadingModePage?.(page);
            }}
            className="grid h-5 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition"
            title="Reading Mode"
          >
            <BookOpen size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="grid h-5 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition"
            title="Close"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex relative bg-[var(--bg)]">
        {/* Editor Area */}
        <div className="flex-1 overflow-hidden flex flex-col relative min-w-0">
          {page.isEncrypted && page.isLocked ? (
            <UnlockPagePrompt
              pageTitle={page.title}
              onUnlock={async (passphrase) => {
                if (onUnlockPage) {
                  await onUnlockPage(page.id, passphrase);
                }
              }}
              onDecryptRemove={() => {
                if (onDeletePage) {
                  onDeletePage(page.id);
                }
              }}
              onToast={onToast}
            />
          ) : (
            <Editor
              page={page}
              pages={pages}
              renameFocusId={renameFocusId}
              onRenameFocusDone={onRenameFocusDone}
              onPagePatch={onPagePatch}
              onBlockPatch={onBlockPatch}
              onAddBlock={onAddBlock}
              onDeleteBlock={onDeleteBlock}
              onDuplicateBlock={onDuplicateBlock}
              onMoveBlock={onMoveBlock}
              onBlocks={onBlocks}
              onAskAI={onAskAI}
              onFocusBlock={onFocusBlock}
              onVoiceCapture={onVoiceCapture}
              ghostWriterEnabled={ghostWriterEnabled}
              apiKey={apiKey}
              aiProvider={aiProvider}
              nvidiaKey={nvidiaKey}
              onToast={onToast}
              onUpdatePage={onUpdatePage}
              onScrollPercent={setScrollPercent}
              onNavigate={onSelect}
              onCreateSubpage={onCreateSubpage}
              onTrashPage={onTrashPage}
            />
          )}
        </div>

        {/* Slide-out Right Smart Panel */}
        <AnimatePresence>
          {rightPanelOpen && !page.isLocked && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 245, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={SPRING_PRESETS.soft}
              className="h-full border-l border-[var(--border)] bg-[var(--sidebar)] flex flex-col min-w-0 overflow-hidden text-xs shrink-0 select-none"
            >
              <PageInspector
                page={page}
                pages={pages}
                pageId={page.id}
                activeId={page.id}
                onPatchPage={onPagePatch}
                onSelect={onSelect}
                onAskAI={onAskAI}
                onRestoreVersion={(versionId) => {
                  auditEngine.restoreVersion(page.id, versionId).then(result => {
                    if (result) {
                      onPagePatch({ title: result.title, blocks: result.blocks });
                      onToast?.('Version restored');
                    }
                  });
                }}
                onToast={onToast}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Column Status Bar */}
      {!page.isLocked && <ColumnStatusBar page={page} text={pageText} />}

      {/* Drag Resize Handle */}
      {isResizable && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[var(--accent)] active:bg-[var(--accent)] z-20 group transition-colors duration-150 flex items-center justify-center"
        >
          <div className="w-[1px] h-10 bg-transparent group-hover:bg-[var(--border)]" />
        </div>
      )}
    </div>
  );
}

function ColumnStatusBar({ page, text }) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 220));
  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-[var(--border)] px-3 text-[10px] text-[var(--muted)] bg-[var(--bg)]">
      <span>{words} words · {mins} min read</span>
      <span>Edited {timeAgo(page.updatedAt)}</span>
    </footer>
  );
}
