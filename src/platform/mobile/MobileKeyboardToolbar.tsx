import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Plus,
  Type,
  Mic,
  Image as ImageIcon,
  Repeat,
  Undo2,
  AtSign,
  Keyboard,
  Table,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  AlertCircle,
  HelpCircle,
  X,
  Search,
} from "lucide-react";
import { hapticFeedback } from "../index";
import { FlowWaveformIcon } from "./MobileFlowPill";

export interface MobileKeyboardToolbarProps {
  onInsertBlock?: (type: string) => void;
  onFormatText?: (format: string) => void;
  onAskAI?: () => void;
  onVoiceNote?: () => void;
  onFlow?: () => void;
  onDismissKeyboard?: () => void;
}

interface BlockOption {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  category: "basic" | "advanced" | "ai";
}

const BLOCK_OPTIONS: BlockOption[] = [
  { id: "text", label: "Text", desc: "Start writing with plain text", icon: Type, category: "basic" },
  { id: "h1", label: "Heading 1", desc: "Large section heading", icon: Heading1, category: "basic" },
  { id: "h2", label: "Heading 2", desc: "Medium section heading", icon: Heading2, category: "basic" },
  { id: "h3", label: "Heading 3", desc: "Small section heading", icon: Heading3, category: "basic" },
  { id: "todo", label: "To-do List", desc: "Track tasks with a checkbox", icon: CheckSquare, category: "basic" },
  { id: "bullet", label: "Bulleted List", desc: "Create a bulleted list", icon: List, category: "basic" },
  { id: "numbered", label: "Numbered List", desc: "Create an ordered list", icon: ListOrdered, category: "basic" },
  { id: "quote", label: "Quote", desc: "Capture a quote or citation", icon: Quote, category: "basic" },
  { id: "divider", label: "Divider", desc: "Visually divide blocks", icon: Minus, category: "basic" },
  { id: "callout", label: "Callout", desc: "Highlight important notes", icon: AlertCircle, category: "advanced" },
  { id: "code", label: "Code Block", desc: "Code with syntax highlighting", icon: Code, category: "advanced" },
  { id: "table", label: "Table", desc: "Add a structured table", icon: Table, category: "advanced" },
  { id: "image", label: "Image", desc: "Upload or embed an image", icon: ImageIcon, category: "advanced" },
  { id: "ai", label: "Ask AI", desc: "Draft, brainstorm, or summarize", icon: Sparkles, category: "ai" },
];

export const MobileKeyboardToolbar: React.FC<MobileKeyboardToolbarProps> = ({
  onInsertBlock,
  onFormatText,
  onAskAI,
  onVoiceNote,
  onFlow,
  onDismissKeyboard,
}) => {
  const [isBlockSheetOpen, setIsBlockSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBlocks = BLOCK_OPTIONS.filter((b) =>
    b.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectBlock = (type: string) => {
    hapticFeedback("medium");
    setIsBlockSheetOpen(false);
    if (type === "ai") {
      onAskAI?.();
    } else {
      onInsertBlock?.(type);
    }
  };

  return (
    <>
      <div className="mobile-keyboard-toolbar-container">
        {/* Quick chips bar */}
        <div className="mobile-keyboard-chips-row">
          <button
            type="button"
            className="mobile-keyboard-chip is-highlight"
            onClick={() => {
              hapticFeedback("medium");
              if (onFlow) onFlow();
              else onVoiceNote?.();
            }}
          >
            <FlowWaveformIcon size={14} />
            <span>Noska Flow</span>
          </button>

          <button
            type="button"
            className="mobile-keyboard-chip"
            onClick={() => {
              hapticFeedback("light");
              onInsertBlock?.("todo");
            }}
          >
            <CheckSquare size={13} strokeWidth={2.2} />
            <span>Task</span>
          </button>

          <button
            type="button"
            className="mobile-keyboard-chip"
            onClick={() => {
              hapticFeedback("light");
              onInsertBlock?.("h2");
            }}
          >
            <Heading2 size={13} strokeWidth={2.2} />
            <span>Heading</span>
          </button>

          <button
            type="button"
            className="mobile-keyboard-chip"
            onClick={() => {
              hapticFeedback("light");
              onInsertBlock?.("bullet");
            }}
          >
            <List size={13} strokeWidth={2.2} />
            <span>Bullet</span>
          </button>

          <button
            type="button"
            className="mobile-keyboard-chip"
            onClick={() => {
              hapticFeedback("light");
              setIsBlockSheetOpen(true);
            }}
          >
            <Plus size={13} strokeWidth={2.2} />
            <span>More Blocks</span>
          </button>
        </div>

        {/* Main icon accessory bar */}
        <div className="mobile-keyboard-accessory-bar">
          <button
            type="button"
            className="mobile-kb-btn mobile-kb-btn--ai"
            onClick={() => {
              hapticFeedback("medium");
              onAskAI?.();
            }}
            aria-label="Ask AI"
          >
            <Sparkles size={18} strokeWidth={2.2} />
          </button>

          <button
            type="button"
            className="mobile-kb-btn"
            onClick={() => {
              hapticFeedback("light");
              setIsBlockSheetOpen(true);
            }}
            aria-label="Add block"
          >
            <Plus size={19} strokeWidth={2.4} />
          </button>

          <button
            type="button"
            className="mobile-kb-btn"
            onClick={() => {
              hapticFeedback("light");
              onFormatText?.("bold");
            }}
            aria-label="Bold text"
          >
            <span style={{ fontWeight: 800, fontSize: 15 }}>B</span>
          </button>

          <button
            type="button"
            className="mobile-kb-btn"
            onClick={() => {
              hapticFeedback("light");
              onFormatText?.("italic");
            }}
            aria-label="Italic text"
          >
            <span style={{ fontStyle: "italic", fontFamily: "serif", fontSize: 16 }}>I</span>
          </button>

          <button
            type="button"
            className="mobile-kb-btn"
            onClick={() => {
              hapticFeedback("light");
              if (onFlow) onFlow();
              else onVoiceNote?.();
            }}
            aria-label="Flow dictation"
          >
            <Mic size={18} strokeWidth={2.2} />
          </button>

          <button
            type="button"
            className="mobile-kb-btn"
            onClick={() => {
              hapticFeedback("light");
              onInsertBlock?.("code");
            }}
            aria-label="Code block"
          >
            <Code size={18} strokeWidth={2} />
          </button>

          <button
            type="button"
            className="mobile-kb-btn"
            onClick={() => {
              hapticFeedback("light");
              onFormatText?.("undo");
            }}
            aria-label="Undo"
          >
            <Undo2 size={18} strokeWidth={2} />
          </button>

          <button
            type="button"
            className="mobile-kb-btn mobile-kb-btn--dismiss"
            onClick={() => {
              hapticFeedback("light");
              onDismissKeyboard?.();
            }}
            aria-label="Dismiss keyboard"
          >
            <Keyboard size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* iOS-Style Full Block Inserter Sheet */}
      <AnimatePresence>
        {isBlockSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mobile-block-sheet-backdrop"
              onClick={() => setIsBlockSheetOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="mobile-block-sheet"
            >
              <div className="mobile-block-sheet__handle" />
              <div className="mobile-block-sheet__header">
                <h3>Insert Block</h3>
                <button
                  type="button"
                  className="mobile-icon-btn"
                  onClick={() => setIsBlockSheetOpen(false)}
                  aria-label="Close"
                  style={{ width: 32, height: 32 }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search input */}
              <div className="mobile-block-search">
                <Search size={16} className="opacity-50" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter blocks…"
                  autoFocus
                />
              </div>

              {/* Block List */}
              <div className="mobile-block-list">
                {filteredBlocks.map((block) => {
                  const Icon = block.icon;
                  return (
                    <button
                      key={block.id}
                      type="button"
                      className="mobile-block-row"
                      onClick={() => handleSelectBlock(block.id)}
                    >
                      <div className="mobile-block-row__icon">
                        <Icon size={20} strokeWidth={2.2} />
                      </div>
                      <div className="mobile-block-row__info">
                        <span className="mobile-block-row__label">{block.label}</span>
                        <span className="mobile-block-row__desc">{block.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

