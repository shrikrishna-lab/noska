import React, { useState, useRef, useCallback, useEffect } from "react";
import { X, GripVertical, Expand, Minimize2 } from "lucide-react";

/**
 * PeekPanel displays a page/row without navigating away.
 * Modes: "right" | "bottom" | "floating"
 */
export default function PeekPanel({ row, database, properties, onPatchRow, onClose, mode = "right", onOpenFull, children }) {
  const [panelMode, setPanelMode] = useState(mode);
  const [size, setSize] = useState(mode === "bottom" ? 300 : 420);
  const [tab, setTab] = useState("properties");
  const resizeRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const start = panelMode === "right" ? e.clientX : e.clientY;
    const startSize = size;
    const onMove = (ev) => {
      const delta = panelMode === "right" ? start - ev.clientX : start - ev.clientY;
      setSize(Math.max(200, Math.min(800, startSize + delta)));
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [size, panelMode]);

  const tabs = [
    { id: "properties", label: "Properties" },
    { id: "content", label: "Content" },
    { id: "comments", label: "Comments" },
    { id: "history", label: "History" },
    { id: "ai", label: "AI" },
  ];

  const positionStyles = {
    right: { right: 0, top: 0, bottom: 0, width: size, borderLeft: "1px solid var(--border)" },
    bottom: { left: 0, right: 0, bottom: 0, height: size, borderTop: "1px solid var(--border)" },
    floating: { right: 24, bottom: 24, width: 480, height: 520, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" },
  };

  const resizeHandle = panelMode === "right"
    ? { left: 0, top: 0, bottom: 0, width: 4, cursor: "ew-resize" }
    : { top: 0, left: 0, right: 0, height: 4, cursor: "ns-resize" };

  return (
    <div className="fixed z-[100] flex flex-col bg-[var(--surface)] overflow-hidden" style={positionStyles[panelMode]}>
      <div ref={resizeRef} className="absolute z-10 hover:bg-[var(--accent)]/50 transition" style={resizeHandle} onMouseDown={handleMouseDown} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-base shrink-0">{row?.icon || '📄'}</span>
          <span className="text-sm font-medium text-[var(--text)] truncate">{row?.name || 'Untitled'}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setPanelMode(m => m === "floating" ? "right" : "floating")}
            className="grid h-6 w-6 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer"
            title={panelMode === "floating" ? "Dock" : "Float"}
          >
            {panelMode === "floating" ? <Minimize2 size={13} /> : <Expand size={13} />}
          </button>
          <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)] shrink-0 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded px-2 py-1 text-[10px] font-medium transition cursor-pointer ${
              tab === t.id ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "properties" && (
          <div className="space-y-2">
            {properties.map(prop => (
              <div key={prop.id}>
                <label className="block text-[10px] font-medium text-[var(--secondary)] mb-0.5 uppercase tracking-wider">{prop.name}</label>
                <PropertyField prop={prop} value={row?.[prop.id]} onChange={(val) => onPatchRow?.(row.id, { [prop.id]: val })} />
              </div>
            ))}
          </div>
        )}
        {tab === "content" && (
          <div className="space-y-1">
            {row?.pageBlocks?.map(block => (
              <div key={block.id} className="rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--text)]">
                {block.text || <span className="text-[var(--muted)] italic">Empty block</span>}
              </div>
            ))}
            {(!row?.pageBlocks || row.pageBlocks.length === 0) && (
              <div className="text-xs text-[var(--muted)] italic py-8 text-center">No content</div>
            )}
          </div>
        )}
        {tab === "comments" && (
          <div className="text-xs text-[var(--muted)] italic py-8 text-center">Comments coming soon</div>
        )}
        {tab === "history" && (
          <div className="text-xs text-[var(--muted)] italic py-8 text-center">Version history coming soon</div>
        )}
        {tab === "ai" && (
          <div className="text-xs text-[var(--muted)] italic py-8 text-center">AI features coming soon</div>
        )}
      </div>

      {/* Open full */}
      {onOpenFull && (
        <div className="border-t border-[var(--border)] px-3 py-2 shrink-0">
          <button
            onClick={() => onOpenFull(row?.id)}
            className="w-full rounded-md bg-[var(--accent)]/10 px-3 py-1.5 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20 transition cursor-pointer"
          >
            Open as full page
          </button>
        </div>
      )}
    </div>
  );
}

function PropertyField({ prop, value, onChange }) {
  switch (prop.type) {
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
      return (
        <input type={prop.type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]" />
      );
    case 'number':
      return (
        <input type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]" />
      );
    case 'checkbox':
      return (
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="accent-[var(--accent)] cursor-pointer" />
      );
    case 'date':
      return (
        <input type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]" />
      );
    case 'select':
    case 'status':
    case 'priority':
      return (
        <PeekSelect value={value} options={prop.options || []} onChange={onChange} />
      );
    case 'multi-select':
      return (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(value) ? value : []).map(t => (
            <span key={t} className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--secondary)]">{t}</span>
          ))}
          <input placeholder="+ add" className="w-12 bg-transparent text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)]" />
        </div>
      );
    default:
      return (
        <input type="text" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className="w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]" />
      );
  }
}

function PeekSelect({ value, options, onChange }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)] cursor-pointer">
      <option value="" disabled>Select...</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
