import React, { useState, useEffect, useRef, useId } from "react";
import { TextArea } from "../ui";
import type { GenericBlock } from "../../../types/blocks";

/**
 * MermaidBlock — renders an actual Mermaid diagram from the block's text.
 * The library is lazy-loaded so it never bloats the initial bundle.
 * Empty on insert (no fake data); shows a hint + editor until the user types.
 */
type MermaidApi = typeof import("mermaid")["default"];

let _mermaidPromise: Promise<MermaidApi> | null = null;
function loadMermaid(): Promise<MermaidApi> {
  if (!_mermaidPromise) {
    _mermaidPromise = import("mermaid").then((m) => {
      // Preserves the original .jsx's `m.default || m` fallback (some
      // bundler/interop configs expose the module itself rather than a
      // `.default`). The module namespace type doesn't statically include
      // `.initialize` on the fallback branch, hence the cast — behavior
      // unchanged from the original.
      const mermaid = (m.default || m) as MermaidApi;
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
      return mermaid;
    });
  }
  return _mermaidPromise;
}

interface MermaidBlockProps {
  block: GenericBlock;
  onPatch: (patch: Partial<GenericBlock>) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isLocked?: boolean;
  innerRef?: React.Ref<HTMLTextAreaElement>;
}

export default function MermaidBlock({ block, onPatch, onKeyDown, onFocus, onBlur, isLocked, innerRef }: MermaidBlockProps) {
  const [editing, setEditing] = useState(!block.text);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const idBase = useId().replace(/:/g, "");
  const renderSeq = useRef(0);

  useEffect(() => {
    const code = (block.text || "").trim();
    if (!code) { setSvg(""); setError(null); return; }
    let cancelled = false;
    const seq = ++renderSeq.current;
    loadMermaid()
      .then((mermaid) => mermaid.render(`mmd-${idBase}-${seq}`, code))
      .then(({ svg }) => { if (!cancelled && seq === renderSeq.current) { setSvg(svg); setError(null); } })
      .catch((err) => { if (!cancelled && seq === renderSeq.current) { setSvg(""); setError(err?.message || "Invalid diagram syntax"); } });
    return () => { cancelled = true; };
  }, [block.text, idBase]);

  return (
    <div className="my-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Mermaid diagram</span>
        {!isLocked && (
          <button
            onClick={() => setEditing((e) => !e)}
            className={`text-[10px] font-medium px-2 py-0.5 rounded transition cursor-pointer ${
              editing ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
            }`}
          >
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </div>

      {(editing || !block.text) && !isLocked && (
        <div className="p-2 border-b border-[var(--border)]">
          <TextArea
            ref={innerRef}
            value={block.text}
            onChange={(text) => onPatch({ text })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            readOnly={isLocked}
            className="font-mono text-xs"
            placeholder={"graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Do this]\n  B -->|No| D[Do that]"}
          />
        </div>
      )}

      <div className="p-3 flex items-center justify-center min-h-[80px]">
        {svg ? (
          <div className="mermaid-render w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : error ? (
          <div className="text-xs text-[var(--danger)] font-mono text-center px-2">{error}</div>
        ) : (
          <div className="text-xs text-[var(--muted)] italic text-center">
            Type Mermaid syntax above to render a flowchart, sequence, or Gantt diagram.
          </div>
        )}
      </div>
    </div>
  );
}
