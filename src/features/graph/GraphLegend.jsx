import React from "react";
import { Activity } from "lucide-react";

export const CLUSTERS = {
  programming: { name: "Programming", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-500", textClass: "text-blue-400" },
  ai: { name: "Artificial Intelligence", color: "#a855f7", bgClass: "bg-purple-500", borderClass: "border-purple-500", textClass: "text-purple-400" },
  business: { name: "Business", color: "#f97316", bgClass: "bg-orange-500", borderClass: "border-orange-500", textClass: "text-orange-400" },
  study: { name: "Study & Tasks", color: "#22c55e", bgClass: "bg-green-500", borderClass: "border-green-500", textClass: "text-green-400" },
  other: { name: "General Notes", color: "#9ca3af", bgClass: "bg-gray-400", borderClass: "border-gray-400", textClass: "text-gray-400" }
};

export function getPageCluster(page) {
  if (!page || !page.tags) return CLUSTERS.other;
  
  const tagsLower = page.tags.map(t => t.toLowerCase());
  
  if (tagsLower.includes("programming") || tagsLower.includes("code") || tagsLower.includes("dev")) {
    return CLUSTERS.programming;
  }
  if (tagsLower.includes("ai") || tagsLower.includes("artificial intelligence") || tagsLower.includes("neural")) {
    return CLUSTERS.ai;
  }
  if (tagsLower.includes("business") || tagsLower.includes("finance") || tagsLower.includes("marketing")) {
    return CLUSTERS.business;
  }
  if (tagsLower.includes("study") || tagsLower.includes("tasks") || tagsLower.includes("today") || tagsLower.includes("tasks")) {
    return CLUSTERS.study;
  }
  
  return CLUSTERS.other;
}

export default function GraphLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-20 pointer-events-none select-none">
      <div className="rounded-xl bg-[var(--elevated)]/80 backdrop-blur-md border border-[var(--border-strong)] p-3.5 text-[10px] text-[var(--secondary)] flex flex-col gap-2 shadow-lg w-[190px] transition-all">
        <div className="font-bold text-[var(--text)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Activity size={12} className="text-[var(--accent)]" /> Knowledge Clusters
        </div>
        
        {/* Cluster Labels */}
        <div className="flex flex-col gap-1.5 border-b border-[var(--border)] pb-2 mb-1.5">
          {Object.entries(CLUSTERS).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full inline-block`} style={{ backgroundColor: value.color }} />
              <span className="text-[var(--secondary)] font-medium">{value.name}</span>
            </div>
          ))}
        </div>

        {/* Link Types */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-4 h-[2px] bg-[var(--accent)] rounded-full inline-block" />
            <span className="text-[var(--secondary)] font-medium">Hierarchy Link</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-[2px] border-t border-dashed border-[var(--secondary)]/60 inline-block" />
            <span className="text-[var(--muted)] font-medium">Shared Tag Link</span>
          </div>
        </div>
      </div>
    </div>
  );
}
