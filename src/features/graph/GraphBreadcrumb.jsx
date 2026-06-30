import React from "react";
import { ChevronRight, Network } from "lucide-react";

export default function GraphBreadcrumb({ activeNodeClusterName, totalNodesCount }) {
  return (
    <div className="absolute top-4 left-4 z-20 pointer-events-none select-none flex flex-col gap-2">
      <div className="flex items-center gap-1.5 rounded-xl bg-[var(--elevated)]/80 backdrop-blur-md border border-[var(--border-strong)] px-3 py-1.5 shadow-lg text-[11px] font-medium text-[var(--secondary)]">
        <Network size={13} className="text-[var(--accent)]" />
        <span className="hover:text-[var(--text)] transition-colors cursor-pointer">Workspace</span>
        <ChevronRight size={10} className="text-[var(--muted)]" />
        <span className="hover:text-[var(--text)] transition-colors cursor-pointer">Knowledge Graph</span>
        {activeNodeClusterName && (
          <>
            <ChevronRight size={10} className="text-[var(--muted)]" />
            <span className="text-[var(--text)] font-semibold">{activeNodeClusterName}</span>
          </>
        )}
        <span className="ml-2 text-[9px] bg-[var(--active)] px-1.5 py-0.5 rounded-full text-[var(--secondary)] select-none">
          {totalNodesCount} nodes
        </span>
      </div>
    </div>
  );
}
