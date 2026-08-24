import React, { useRef, useCallback } from "react";
import type { LayoutNode, SplitLayoutNode } from "./SplitEngine";
import { countLeaves } from "./SplitEngine";
import { useTabs } from "../../contexts/TabContext";
import PaneContainer from "./PaneContainer";
import type { Page } from "../../lib/supabaseService";

interface SplitWorkspaceRendererProps {
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
}

export default function SplitWorkspaceRenderer(props: SplitWorkspaceRendererProps) {
  const { layout, resizeSplitNode } = useTabs();
  const totalPanes = countLeaves(layout);

  return (
    <div className="flex-1 flex overflow-hidden w-full h-full min-w-0 min-h-0 relative">
      <RenderNode
        node={layout}
        totalPanes={totalPanes}
        onResize={resizeSplitNode}
        paneProps={props}
      />
    </div>
  );
}

interface RenderNodeProps {
  node: LayoutNode;
  totalPanes: number;
  onResize: (splitNodeId: string, sizes: number[]) => void;
  paneProps: SplitWorkspaceRendererProps;
}

function RenderNode({ node, totalPanes, onResize, paneProps }: RenderNodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (node.type === "leaf") {
    return (
      <PaneContainer
        key={node.paneId}
        paneId={node.paneId}
        totalPanes={totalPanes}
        {...paneProps}
      />
    );
  }

  const isHorizontal = node.orientation === "horizontal";
  const sizes = node.sizes && node.sizes.length === node.children.length
    ? node.sizes
    : node.children.map(() => 100 / node.children.length);

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex w-full h-full min-w-0 min-h-0 overflow-hidden ${
        isHorizontal ? "flex-col md:flex-row" : "flex-col"
      }`}
    >
      {node.children.map((child, index) => {
        const sizePct = sizes[index] ?? 50;

        return (
          <React.Fragment key={child.id || index}>
            <div
              className="flex min-w-0 min-h-0 overflow-hidden"
              style={{
                flex: `${sizePct} 1 0%`,
                minWidth: isHorizontal ? "200px" : "100%",
                minHeight: isHorizontal ? "100%" : "120px"
              }}
            >
              <RenderNode
                node={child}
                totalPanes={totalPanes}
                onResize={onResize}
                paneProps={paneProps}
              />
            </div>

            {/* Resizable Divider between siblings */}
            {index < node.children.length - 1 && (
              <DraggableDivider
                orientation={node.orientation}
                containerRef={containerRef}
                leftIndex={index}
                rightIndex={index + 1}
                currentSizes={sizes}
                onSizesChange={(newSizes) => onResize(node.id, newSizes)}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

interface DraggableDividerProps {
  orientation: "horizontal" | "vertical";
  containerRef: React.RefObject<HTMLDivElement | null>;
  leftIndex: number;
  rightIndex: number;
  currentSizes: number[];
  onSizesChange: (newSizes: number[]) => void;
}

function DraggableDivider({
  orientation,
  containerRef,
  leftIndex,
  rightIndex,
  currentSizes,
  onSizesChange
}: DraggableDividerProps) {
  const isHorizontal = orientation === "horizontal";

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const totalDimension = isHorizontal ? containerRect.width : containerRect.height;
      const startPos = isHorizontal ? e.clientX : e.clientY;

      const leftStartSize = currentSizes[leftIndex] ?? 50;
      const rightStartSize = currentSizes[rightIndex] ?? 50;
      const combinedSize = leftStartSize + rightStartSize;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const currentPos = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
        const deltaPx = currentPos - startPos;
        const deltaPercent = (deltaPx / totalDimension) * 100;

        // Apply constraints (min 15%, max 85% of combined size)
        const minSize = 15;
        let newLeftSize = Math.max(minSize, Math.min(combinedSize - minSize, leftStartSize + deltaPercent));
        let newRightSize = combinedSize - newLeftSize;

        const nextSizes = [...currentSizes];
        nextSizes[leftIndex] = Math.round(newLeftSize * 10) / 10;
        nextSizes[rightIndex] = Math.round(newRightSize * 10) / 10;

        onSizesChange(nextSizes);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [containerRef, isHorizontal, currentSizes, leftIndex, rightIndex, onSizesChange]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const combined = (currentSizes[leftIndex] ?? 50) + (currentSizes[rightIndex] ?? 50);
      const half = combined / 2;
      const nextSizes = [...currentSizes];
      nextSizes[leftIndex] = half;
      nextSizes[rightIndex] = half;
      onSizesChange(nextSizes);
    },
    [currentSizes, leftIndex, rightIndex, onSizesChange]
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className={`group/divider relative z-20 shrink-0 select-none flex items-center justify-center transition-colors duration-150 ${
        isHorizontal
          ? "w-[6px] h-full cursor-col-resize hover:bg-[var(--accent)]/30 active:bg-[var(--accent)]/50 -mx-[3px]"
          : "h-[6px] w-full cursor-row-resize hover:bg-[var(--accent)]/30 active:bg-[var(--accent)]/50 -my-[3px]"
      }`}
      title="Drag to resize split (Double click to reset)"
    >
      <div
        className={`${
          isHorizontal
            ? "w-[1px] h-full bg-[var(--border)] group-hover/divider:bg-[var(--accent)] group-active/divider:bg-[var(--accent)]"
            : "h-[1px] w-full bg-[var(--border)] group-hover/divider:bg-[var(--accent)] group-active/divider:bg-[var(--accent)]"
        } transition-colors`}
      />
    </div>
  );
}
