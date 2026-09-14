import React from "react";
import { ChevronRight, Network } from "lucide-react";

interface GraphBreadcrumbProps {
  activeNodeClusterName?: string;
  totalNodesCount: number;
}

export default function GraphBreadcrumb({ activeNodeClusterName, totalNodesCount }: GraphBreadcrumbProps) {
  const nodeLabel = totalNodesCount === 1 ? "1 node" : `${totalNodesCount} nodes`;

  return (
    <div className="flex items-center gap-2 h-10 px-3 rounded-full bg-white/90 dark:bg-[#181920]/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.08)] text-xs font-semibold text-slate-800 dark:text-slate-100 select-none">
      <div className="w-5.5 h-5.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
        <Network size={12.5} strokeWidth={2.4} />
      </div>
      <span className="text-slate-500 dark:text-slate-400 font-medium">Workspace</span>
      <ChevronRight size={11} className="text-slate-400 opacity-60" />
      <span className="text-slate-800 dark:text-slate-200 font-semibold">Knowledge Graph</span>
      {activeNodeClusterName && (
        <>
          <ChevronRight size={11} className="text-slate-400 opacity-60" />
          <span className="text-blue-600 dark:text-blue-400 font-semibold max-w-[120px] truncate">
            {activeNodeClusterName}
          </span>
        </>
      )}
      <div className="h-3 w-px bg-black/10 dark:bg-white/10 mx-0.5" />
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 dark:bg-blue-400/15 text-blue-700 dark:text-blue-300 border border-blue-500/20">
        {nodeLabel}
      </span>
    </div>
  );
}
