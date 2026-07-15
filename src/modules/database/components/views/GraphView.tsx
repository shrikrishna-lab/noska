import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Search, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { DatabaseRow, PropertyDefinition } from "../../types/database";

export interface GraphViewProps {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  onAddRow: () => void;
  onRowClick?: (rowId: string) => void;
}

interface GraphNode {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}

export default function GraphView({ rows, onRowClick }: GraphViewProps) {
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => (r.name || '').toLowerCase().includes(q));
  }, [rows, search]);

  const nodes: GraphNode[] = useMemo(() => filtered.map((r, i) => ({
    id: r.id,
    label: r.name || 'Untitled',
    icon: r.icon || '📄',
    x: 150 + (i % 6) * 160,
    y: 80 + Math.floor(i / 6) * 120,
  })), [filtered]);

  const edges: GraphEdge[] = useMemo(() => {
    const result: GraphEdge[] = [];
    for (let i = 1; i < nodes.length; i++) {
      result.push({ from: nodes[i - 1].id, to: nodes[i].id });
    }
    return result;
  }, [nodes]);

  const handleMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    setDragging({ id: nodeId, startX: e.clientX, startY: e.clientY, origX: nodes.find(n => n.id === nodeId)?.x || 0, origY: nodes.find(n => n.id === nodeId)?.y || 0 });
  }, [nodes]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / zoom;
      const el = svgRef.current?.querySelector(`[data-node-id="${dragging.id}"]`);
      if (el) {
        el.setAttribute('transform', `translate(${dragging.origX + dx}, ${dragging.origY + dy})`);
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, zoom]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <div className="relative">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search graph..." className="h-7 w-40 rounded-md border border-[var(--border)] bg-transparent pl-7 pr-2 text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]" />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="grid h-6 w-6 place-items-center rounded hover:bg-[var(--hover)] cursor-pointer"><ZoomOut size={13} /></button>
          <span className="text-[10px] text-[var(--muted)]">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="grid h-6 w-6 place-items-center rounded hover:bg-[var(--hover)] cursor-pointer"><ZoomIn size={13} /></button>
          <button onClick={() => setZoom(1)} className="grid h-6 w-6 place-items-center rounded hover:bg-[var(--hover)] cursor-pointer"><RotateCcw size={13} /></button>
        </div>
      </div>
      <div className="relative overflow-hidden" style={{ height: 400 }}>
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
        >
          {edges.map(edge => {
            const from = nodes.find(n => n.id === edge.from);
            const to = nodes.find(n => n.id === edge.to);
            if (!from || !to) return null;
            return (
              <line key={`${edge.from}-${edge.to}`} x1={from.x + 50} y1={from.y + 22} x2={to.x + 50} y2={to.y + 22} stroke="var(--border)" strokeWidth={1.5} />
            );
          })}
          {nodes.map(node => (
            <g key={node.id} data-node-id={node.id} onClick={() => onRowClick?.(node.id)} onMouseDown={(e) => handleMouseDown(node.id, e)} style={{ cursor: 'grab' }}>
              <rect x={node.x} y={node.y} width={100} height={44} rx={8} fill="var(--surface)" stroke="var(--border)" strokeWidth={1} className="hover:stroke-[var(--accent)] transition" />
              <text x={node.x + 50} y={node.y + 18} textAnchor="middle" fontSize="16">{node.icon}</text>
              <text x={node.x + 50} y={node.y + 34} textAnchor="middle" fontSize="10" fill="var(--text)" className="truncate">{node.label.slice(0, 12)}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
