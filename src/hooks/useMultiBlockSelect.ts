import { useState, useCallback, useRef } from "react";

export default function useMultiBlockSelect(blocks) {
  const [selectedBlockIds, setSelectedBlockIds] = useState(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null);
  const containerRef = useRef(null);

  const clearSelection = useCallback(() => {
    setSelectedBlockIds(new Set());
    setLastSelectedIndex(null);
    setSelectionMode(false);
    setSelectionRect(null);
  }, []);

  const toggleBlockSelection = useCallback((blockId, index) => {
    setSelectedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
    setLastSelectedIndex(index);
  }, []);

  const selectRange = useCallback((fromIndex, toIndex) => {
    const filtered = blocks.filter((b) => !b.isDeleted);
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    const ids = new Set();
    for (let i = start; i <= end; i++) {
      if (filtered[i]) ids.add(filtered[i].id);
    }
    setSelectedBlockIds(ids);
  }, [blocks]);

  const selectBlock = useCallback((blockId: string, index: number, options: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean } = {}) => {
    if (options.shiftKey && lastSelectedIndex !== null) {
      selectRange(lastSelectedIndex, index);
    } else if (options.metaKey || options.ctrlKey) {
      toggleBlockSelection(blockId, index);
    } else {
      setSelectedBlockIds(new Set([blockId]));
      setLastSelectedIndex(index);
    }
  }, [lastSelectedIndex, selectRange, toggleBlockSelection]);

  const handlePointerDown = useCallback((e, blockId, index) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      selectBlock(blockId, index, {
        shiftKey: e.shiftKey,
        metaKey: e.metaKey || e.ctrlKey,
      });
      e.preventDefault();
      return true;
    }

    const isInput = e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT";
    if (isInput && !selectedBlockIds.has(blockId)) {
      clearSelection();
    } else if (!isInput) {
      clearSelection();
    }
    return false;
  }, [selectBlock, selectedBlockIds, clearSelection]);

  const handleSelectAll = useCallback(() => {
    const ids = new Set(blocks.filter((b) => !b.isDeleted).map((b) => b.id));
    setSelectedBlockIds(ids);
  }, [blocks]);

  const handleDragSelectStart = useCallback((e) => {
    if (e.target.closest(".noska-block")) return;
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
    setSelectionMode(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setSelectionRect({ x: e.clientX - rect.left, y: e.clientY - rect.top, width: 0, height: 0 });
    }

    const onMove = (ev) => {
      if (!containerRef.current || !rect) return;
      const x = Math.min(ev.clientX - rect.left, rect.width - 10);
      const y = Math.min(ev.clientY - rect.top, rect.height - 10);
      const startX = Math.max(0, e.clientX - rect.left);
      const startY = Math.max(0, e.clientY - rect.top);
      setSelectionRect({
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        width: Math.abs(x - startX),
        height: Math.abs(y - startY),
      });
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      setSelectionMode(false);
      setSelectionRect(null);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, []);

  const hasSelection = selectedBlockIds.size > 0;

  return {
    selectedBlockIds,
    lastSelectedIndex,
    selectionMode,
    selectionRect,
    containerRef,
    clearSelection,
    selectBlock,
    selectRange,
    toggleBlockSelection,
    setSelectedBlockIds,
    handlePointerDown,
    handleSelectAll,
    handleDragSelectStart,
    hasSelection,
  };
}
