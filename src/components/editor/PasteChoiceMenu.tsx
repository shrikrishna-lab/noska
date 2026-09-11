/**
 * Notion-Style Paste Choice Menu
 *
 * Appears when pasting recognized external URLs into the editor, allowing
 * the user to choose between "Paste as Preview", "Paste as Mention", or "Paste as Link".
 */

import React, { useEffect, useRef, useState } from "react";
import { Layout, AtSign, Link as LinkIcon, ExternalLink } from "lucide-react";
import type { UrlMatchResult } from "../../lib/connections/types";

export type PasteChoiceAction = "preview" | "mention" | "link";

interface PasteChoiceMenuProps {
  url: string;
  matchResult: UrlMatchResult;
  position: { top: number; left: number };
  onSelect: (action: PasteChoiceAction) => void;
  onDismiss: () => void;
}

export default function PasteChoiceMenu({
  url,
  matchResult,
  position,
  onSelect,
  onDismiss,
}: PasteChoiceMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const options: Array<{ action: PasteChoiceAction; label: string; desc: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    {
      action: "preview",
      label: "Preview",
      desc: `Interactive ${matchResult.provider.name} card`,
      icon: Layout,
    },
    {
      action: "mention",
      label: "Mention",
      desc: `Inline ${matchResult.displayHint || matchResult.provider.name} badge`,
      icon: AtSign,
    },
    {
      action: "link",
      label: "Link",
      desc: "Standard URL hyperlink",
      icon: LinkIcon,
    },
  ];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % options.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + options.length) % options.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelect(options[selectedIndex].action);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedIndex, options, onSelect, onDismiss]);

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: Math.max(10, Math.min(window.innerHeight - 220, position.top)),
        left: Math.max(10, Math.min(window.innerWidth - 300, position.left)),
        zIndex: 9999,
      }}
      className="w-64 rounded-xl border border-[var(--border)] bg-[var(--elevated)]/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 font-sans"
    >
      <div className="px-2.5 py-1.5 text-[11px] font-medium text-[var(--muted)] border-b border-[var(--border)]/60 mb-1 flex items-center justify-between">
        <span>Paste {matchResult.provider.name} as:</span>
        <span className="text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] px-1.5 py-0.5 rounded font-mono">
          {matchResult.resourceType}
        </span>
      </div>

      <div className="space-y-0.5">
        {options.map((opt, idx) => {
          const isSelected = idx === selectedIndex;
          const Icon = opt.icon;
          return (
            <button
              key={opt.action}
              type="button"
              onClick={() => onSelect(opt.action)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition cursor-pointer ${
                isSelected
                  ? "bg-[var(--accent)]/15 text-[var(--text)] font-medium"
                  : "text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-[var(--accent)] text-white" : "bg-[var(--bg)] text-[var(--muted)]"
                }`}
              >
                <Icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-xs text-[var(--text)]">{opt.label}</div>
                <div className="text-[10px] text-[var(--muted)] truncate">{opt.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
