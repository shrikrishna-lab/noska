import React, { useState } from "react";
import { edgeAnchor, rectCenter, Connector, CONNECTOR_TYPES, getConnectorTypeConfig, ConnectorType } from "./canvasStore";

interface CanvasConnectorsProps {
  connectors: Connector[];
  getRect: (key: string) => { x: number; y: number; w: number; h: number } | null;
  draft?: { fromKey: string; x: number; y: number } | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onUpdateConnector?: (id: string, updates: Partial<Connector>) => void;
  onDeleteConnector?: (id: string) => void;
}

/**
 * CanvasConnectors — draws charming hand-drawn dashed curves with typed arrowheads
 * and interactive relationship badges between sticky notes and canvas shapes.
 */
export default function CanvasConnectors({
  connectors,
  getRect,
  draft,
  selectedId,
  onSelect,
  onUpdateConnector,
  onDeleteConnector,
}: CanvasConnectorsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState("");

  const paths: Array<{
    id: string;
    conn: Connector;
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    mid: { x: number; y: number };
    typeConfig: ReturnType<typeof getConnectorTypeConfig>;
  }> = [];

  for (const conn of connectors) {
    const a = getRect(conn.from);
    const b = getRect(conn.to);
    if (!a || !b) continue;
    const ca = rectCenter(a);
    const cb = rectCenter(b);
    const p1 = edgeAnchor(a, cb);
    const p2 = edgeAnchor(b, ca);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    const curvature = Math.min(60, Math.max(20, dist * 0.18));
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2 - (dx > 0 ? curvature * 0.3 : -curvature * 0.3);

    const typeConfig = getConnectorTypeConfig(conn.type);
    paths.push({
      id: conn.id,
      conn,
      p1,
      p2,
      mid: { x: mx, y: my },
      typeConfig
    });
  }

  let draftPath: { p1: { x: number; y: number }; p2: { x: number; y: number } } | null = null;
  if (draft) {
    const a = getRect(draft.fromKey);
    if (a) {
      const target = { x: draft.x, y: draft.y };
      const p1 = edgeAnchor(a, target);
      draftPath = { p1, p2: target };
    }
  }

  // Smooth roadmap curve with gentle arching
  const handDrawnCurve = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = p2.x - p1.x;
    const dist = Math.hypot(dx, p2.y - p1.y);
    const curvature = Math.min(60, Math.max(20, dist * 0.18));
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2 - (dx > 0 ? curvature * 0.3 : -curvature * 0.3);

    return `M ${p1.x} ${p1.y} Q ${mx} ${my}, ${p2.x} ${p2.y}`;
  };

  return (
    <>
      <svg
        className="absolute inset-0 overflow-visible pointer-events-none z-10"
        style={{ width: 1, height: 1 }}
      >
        <defs>
          {/* Typed Markers for each relationship type */}
          <marker id="cv-arrow-leads-to" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#059669" />
          </marker>
          <marker id="cv-arrow-depends-on" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#d97706" />
          </marker>
          <marker id="cv-arrow-blocks" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e11d48" />
          </marker>
          <marker id="cv-arrow-related-to" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0284c7" />
          </marker>
        </defs>

        {paths.map((p) => {
          const isSel = p.id === selectedId;
          const strokeColor = isSel ? "#f59e0b" : p.conn.color || p.typeConfig.color;

          return (
            <g key={p.id} className="group/conn">
              {/* Generous invisible stroke for effortless selection click */}
              <path
                d={handDrawnCurve(p.p1, p.p2)}
                stroke="transparent"
                strokeWidth={24}
                fill="none"
                style={{ pointerEvents: "stroke", cursor: "pointer" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelect?.(p.id);
                }}
              />

              {/* Glowing halo when selected */}
              {isSel && (
                <path
                  d={handDrawnCurve(p.p1, p.p2)}
                  stroke="rgba(245, 158, 11, 0.35)"
                  strokeWidth={8}
                  fill="none"
                />
              )}

              {/* Soft dashed roadmap curve */}
              <path
                d={handDrawnCurve(p.p1, p.p2)}
                stroke={strokeColor}
                strokeWidth={isSel ? 3.2 : 2.4}
                strokeDasharray={p.conn.type === "blocks" ? "4 4" : "7 6"}
                strokeLinecap="round"
                fill="none"
                markerEnd={`url(#${p.typeConfig.markerId})`}
                className="transition-all duration-150"
              />
            </g>
          );
        })}

        {/* Active drafting connector preview */}
        {draftPath && (
          <path
            d={handDrawnCurve(draftPath.p1, draftPath.p2)}
            stroke="#059669"
            strokeWidth={2.5}
            strokeDasharray="6 5"
            strokeLinecap="round"
            fill="none"
            markerEnd="url(#cv-arrow-leads-to)"
          />
        )}
      </svg>

      {/* Midpoint Interactive Relationship Badges (DOM Elements for rich HTML/popover interactivity) */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {paths.map((p) => {
          const isSel = p.id === selectedId;
          const isEditing = editingId === p.id;
          const labelText = p.conn.label || p.typeConfig.shortLabel;

          return (
            <div
              key={`badge-${p.id}`}
              className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 transition-transform duration-100"
              style={{ left: p.mid.x, top: p.mid.y }}
            >
              {isEditing ? (
                <div
                  className="rounded-2xl border border-black/10 dark:border-white/15 bg-white/95 dark:bg-[#181a22]/95 backdrop-blur-xl p-2.5 shadow-xl flex flex-col gap-2 min-w-[200px]"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-500">
                    <span>Relationship Type</span>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 4 Type Selector Chips */}
                  <div className="grid grid-cols-2 gap-1">
                    {(Object.keys(CONNECTOR_TYPES) as ConnectorType[]).map((tKey) => {
                      const cfg = CONNECTOR_TYPES[tKey];
                      const isCurrent = (p.conn.type || "leads_to") === tKey;
                      return (
                        <button
                          key={tKey}
                          onClick={() => {
                            onUpdateConnector?.(p.id, { type: tKey });
                            setEditingId(null);
                          }}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] font-semibold transition cursor-pointer ${
                            isCurrent
                              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                              : "bg-black/[0.03] dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-black/[0.08]"
                          }`}
                        >
                          <span>{cfg.icon}</span>
                          <span>{cfg.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Inline Text Label Editor */}
                  <div className="flex items-center gap-1 pt-1 border-t border-black/5 dark:border-white/5">
                    <input
                      type="text"
                      autoFocus
                      value={tempLabel}
                      onChange={(e) => setTempLabel(e.target.value)}
                      placeholder="Custom label..."
                      className="w-full text-xs rounded-md bg-black/[0.04] dark:bg-white/[0.06] px-2 py-1 outline-none text-[var(--text)] focus:ring-1 focus:ring-slate-400"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onUpdateConnector?.(p.id, { label: tempLabel.trim() || undefined });
                          setEditingId(null);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        onUpdateConnector?.(p.id, { label: tempLabel.trim() || undefined });
                        setEditingId(null);
                      }}
                      className="px-2 py-1 text-xs rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium cursor-pointer"
                    >
                      Save
                    </button>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => {
                      onDeleteConnector?.(p.id);
                      setEditingId(null);
                    }}
                    className="text-[10px] text-red-500 hover:underline text-left pt-0.5 cursor-pointer"
                  >
                    Remove connection
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.(p.id);
                    setTempLabel(p.conn.label || "");
                    setEditingId(p.id);
                  }}
                  className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-md shadow-xs transition-all duration-150 cursor-pointer ${
                    isSel
                      ? "bg-amber-500 text-white border-amber-600 scale-105 shadow-md"
                      : "bg-white/90 dark:bg-[#1a1d26]/90 border-black/10 dark:border-white/10 hover:bg-white dark:hover:bg-[#202430] hover:scale-105"
                  }`}
                  style={{
                    color: isSel ? "#ffffff" : p.typeConfig.color
                  }}
                >
                  <span className="text-[12px]">{p.typeConfig.icon}</span>
                  <span className="tracking-tight">{labelText}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
