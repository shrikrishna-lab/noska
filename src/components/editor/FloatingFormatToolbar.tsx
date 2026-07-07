import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bold, Italic, Underline, Code, Strikethrough, Eraser, Palette, type LucideIcon } from "lucide-react";

const TEXT_COLORS = [
  { name: "Gray", var: "gray" }, { name: "Brown", var: "brown" }, { name: "Orange", var: "orange" },
  { name: "Yellow", var: "yellow" }, { name: "Green", var: "green" }, { name: "Teal", var: "teal" },
  { name: "Blue", var: "blue" }, { name: "Indigo", var: "indigo" }, { name: "Purple", var: "purple" },
  { name: "Pink", var: "pink" }, { name: "Red", var: "red" }, { name: "Coral", var: "coral" },
  { name: "Rose", var: "rose" }, { name: "Lime", var: "lime" }, { name: "Mint", var: "mint" },
  { name: "Sky", var: "sky" }, { name: "Lavender", var: "lavender" }, { name: "Peach", var: "peach" },
  { name: "Charcoal", var: "charcoal" }
];

interface FormatButton {
  key: string;
  icon: LucideIcon;
  label: string;
}

const FORMAT_BUTTONS: FormatButton[] = [
  { key: "bold", icon: Bold, label: "Bold (Ctrl+B)" },
  { key: "italic", icon: Italic, label: "Italic (Ctrl+I)" },
  { key: "underline", icon: Underline, label: "Underline (Ctrl+U)" },
  { key: "strikethrough", icon: Strikethrough, label: "Strikethrough" },
  { key: "code", icon: Code, label: "Inline code" },
  { key: "color", icon: Palette, label: "Text color / Highlight" },
  { key: "clear", icon: Eraser, label: "Clear formatting" },
];

function getActiveEditable(): Element | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const node = sel.anchorNode;
  if (!node) return null;
  const editable = node.nodeType === 3 ? node.parentElement?.closest("[contentEditable]") : (node as Element).closest?.("[contentEditable]");
  return editable || null;
}

function hasSelection(): boolean {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
  return true;
}

function getSelRect(): DOMRect | null {
  try {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    return sel.getRangeAt(0).getBoundingClientRect();
  } catch { return null; }
}

function applyExecCommand(cmd: string) {
  if (cmd === "bold") document.execCommand("bold", false, null);
  else if (cmd === "italic") document.execCommand("italic", false, null);
  else if (cmd === "underline") document.execCommand("underline", false, null);
  else if (cmd === "strikethrough") document.execCommand("strikeThrough", false, null);
  else if (cmd === "code") {
    const sel = window.getSelection();
    if (sel && sel.toString()) {
      const text = sel.toString();
      document.execCommand("insertHTML", false, "`" + text + "`");
    }
  }
  else if (cmd === "clear") document.execCommand("removeFormat", false, null);
  else if (cmd?.startsWith("color-")) {
    const isBg = cmd.includes("bg-");
    const colorVar = cmd.replace("color-", "").replace("bg-", "");
    // Cast: execCommand's DOM type signature declares its 3rd arg as
    // `string`, but browsers accept (and this pre-existing call always
    // passed) a boolean here — same runtime behavior, just satisfying tsc.
    document.execCommand("styleWithCSS", false, true as unknown as string);
    if (isBg) {
      document.execCommand("backColor", false, `var(--clr-bg-${colorVar})`);
    } else {
      document.execCommand("foreColor", false, `var(--clr-${colorVar})`);
    }
  }
}

interface FloatingFormatToolbarProps {
  blockId: string;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  onFormat: (formatKey: string) => void;
}

export default function FloatingFormatToolbar({ blockId, inputRef, onFormat }: FloatingFormatToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [colorOpen, setColorOpen] = useState(false);
  const [colorTab, setColorTab] = useState("text");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!hasSelection()) { setVisible(false); setColorOpen(false); return; }
      const editable = getActiveEditable();
      if (!editable) { setVisible(false); setColorOpen(false); return; }
      const rect = getSelRect();
      if (!rect) { setVisible(false); return; }
      let top = rect.top - 8;
      let left = rect.left + rect.width / 2 - 80;
      if (top < 80) top = rect.bottom + 4;
      setPos({ top: Math.max(4, top), left: Math.max(8, Math.min(left, window.innerWidth - 200)) });
      setVisible(true);
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node) &&
          colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setVisible(false);
        setColorOpen(false);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible]);

  const handleFormat = (formatKey: string) => {
    if (formatKey === "color") { setColorOpen(v => !v); return; }

    const sel = window.getSelection();
    const hasSel = sel && !sel.isCollapsed && sel.rangeCount > 0;
    let savedRange: Range | null = null;

    if (hasSel) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }

    const editable = getActiveEditable();
    if (editable) {
      applyExecCommand(formatKey);
      editable.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (inputRef?.current) {
      onFormat(formatKey);
    }

    if (savedRange) {
      sel!.removeAllRanges();
      sel!.addRange(savedRange);
    }

    setVisible(false);
  };

  const handleColor = (colorVar: string) => {
    const prefix = colorTab === "bg" ? "bg-" : "";
    const editable = getActiveEditable();
    if (editable) {
      applyExecCommand(`color-${prefix}${colorVar}`);
      editable.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (inputRef?.current) {
      onFormat(`color-${prefix}${colorVar}`);
    }
    setColorOpen(false);
    setVisible(false);
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            ref={toolbarRef}
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[200] flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--elevated)] px-1.5 py-1 shadow-xl"
            style={{ top: pos.top, left: Math.max(8, pos.left) }}
          >
            {FORMAT_BUTTONS.map((btn) => (
              <button
                key={btn.key}
                onClick={() => handleFormat(btn.key)}
                onMouseDown={(e) => e.preventDefault()}
                className="grid h-7 w-7 place-items-center rounded text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
                title={btn.label}
              >
                <btn.icon size={14} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {colorOpen && (
          <motion.div
            ref={colorRef}
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[210] rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-2 shadow-xl"
            style={{ top: pos.top + 32, left: Math.max(8, pos.left) }}
          >
            <div className="flex gap-1 mb-2">
              <button onClick={() => setColorTab("text")} className={`text-xs px-2 py-0.5 rounded ${colorTab === "text" ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:bg-[var(--hover)]"} cursor-pointer`}>Text</button>
              <button onClick={() => setColorTab("bg")} className={`text-xs px-2 py-0.5 rounded ${colorTab === "bg" ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:bg-[var(--hover)]"} cursor-pointer`}>Background</button>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {TEXT_COLORS.map(c => (
                <button
                  key={c.var}
                  onClick={() => handleColor(c.var)}
                  className="w-6 h-6 rounded border border-[var(--border)] hover:scale-110 transition cursor-pointer"
                  style={{ background: `var(--clr-${colorTab === "bg" ? "bg-" : ""}${c.var})` }}
                  title={c.name}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
