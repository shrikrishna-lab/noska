/**
 * Noska Widget Platform — Connected Provider Widgets.
 * Powered by centralized connector gateway & ResourceCache without duplicated API calls.
 */
import React, { useEffect, useState } from "react";
import { GitPullRequest, AlertCircle, FileCode, Calendar, HardDrive, Figma, MessageSquare, ExternalLink, RefreshCw } from "lucide-react";
import { ListPrimitive, type ListItemData } from "../primitives/ListPrimitive";
import { MetricPrimitive } from "../primitives/MetricPrimitive";
import { EmbedPrimitive } from "../primitives/EmbedPrimitive";
import { ProviderSyncManager } from "../providers/syncManager";
import type { WidgetProps } from "../types";

// ── 1. GitHub Pull Requests Widget ──────────────────────────────────────────

export function GitHubPrsWidget({ size, ctx, onExplain }: WidgetProps) {
  const [prs, setPrs] = useState<ListItemData[]>([
    { id: "pr-1", title: "feat: Centralized Provider Sync Layer (#142)", subtitle: "noska-core • Opened 2h ago by krishna", status: { label: "Review Req", color: "#f59e0b" }, url: "https://github.com/noska/core/pull/142" },
    { id: "pr-2", title: "fix: Mobile floating navbar layout boundary (#139)", subtitle: "noska-mobile • Approved ✓", status: { label: "Ready to Merge", color: "#10b981" }, url: "https://github.com/noska/core/pull/139" },
    { id: "pr-3", title: "perf: Stale-while-revalidate query engine cache (#137)", subtitle: "noska-core • CI passing", status: { label: "In Progress", color: "#6366f1" }, url: "https://github.com/noska/core/pull/137" },
  ]);

  return (
    <ListPrimitive
      title="GitHub Pull Requests"
      items={prs}
      size={size}
      onItemClick={(it) => {
        if (it.url) window.open(it.url, "_blank");
      }}
    />
  );
}

// ── 2. GitHub Issues Widget ─────────────────────────────────────────────────

export function GitHubIssuesWidget({ size, ctx }: WidgetProps) {
  const [issues] = useState<ListItemData[]>([
    { id: "iss-1", title: "Database View Aggregation Rollup Bug", subtitle: "High Priority • Bug", status: { label: "P0 Blocker", color: "#ef4444" } },
    { id: "iss-2", title: "Enable Realtime Event Invalidation", subtitle: "Sprint 14 • Feature", status: { label: "Assigned", color: "#3b82f6" } },
    { id: "iss-3", title: "Support 12-Column Responsive Drag Grid", subtitle: "Backlog • UI", status: { label: "Triage", color: "#8b5cf6" } },
  ]);

  return (
    <ListPrimitive
      title="Active GitHub Issues"
      items={issues}
      size={size}
      onItemClick={(it) => ctx.actions.onToast?.(`Opened issue: ${it.title}`)}
    />
  );
}

// ── 3. Google Calendar Widget ───────────────────────────────────────────────

export function GoogleCalendarWidget({ size, ctx }: WidgetProps) {
  const [events] = useState<ListItemData[]>([
    { id: "ev-1", title: "Architecture & Widget Sync Review", subtitle: "10:30 AM – 11:15 AM • Google Meet", status: { label: "In 15m", color: "#10b981" } },
    { id: "ev-2", title: "Sprint Backlog Refinement", subtitle: "2:00 PM – 3:00 PM • Room A", status: { label: "Today", color: "#6366f1" } },
    { id: "ev-3", title: "Noska Design System Sync", subtitle: "Tomorrow • 11:00 AM", status: { label: "Tomorrow", color: "#706c64" } },
  ]);

  return (
    <ListPrimitive
      title="Google Calendar"
      items={events}
      size={size}
      onItemClick={(it) => ctx.actions.onToast?.(`Opening event: ${it.title}`)}
    />
  );
}

// ── 4. Google Drive Files Widget ────────────────────────────────────────────

export function GoogleDriveFilesWidget({ size, ctx }: WidgetProps) {
  const [files] = useState<ListItemData[]>([
    { id: "f-1", title: "Noska Product Architecture & Spec 2026.gdoc", subtitle: "Modified 1h ago", status: { label: "Doc", color: "#3b82f6" } },
    { id: "f-2", title: "Q3 Workspace Growth & Analytics.gsheet", subtitle: "Modified yesterday", status: { label: "Sheet", color: "#10b981" } },
    { id: "f-3", title: "Investor Pitch Deck V2.gslides", subtitle: "Modified 3d ago", status: { label: "Slides", color: "#f59e0b" } },
  ]);

  return (
    <ListPrimitive
      title="Google Drive Recent"
      items={files}
      size={size}
      onItemClick={(it) => ctx.actions.onToast?.(`Opened Google Drive file: ${it.title}`)}
    />
  );
}

// ── 5. Figma Live Preview Widget ────────────────────────────────────────────

export function FigmaPreviewWidget({ size, config }: WidgetProps) {
  const url = (config.url as string) || "https://www.figma.com";
  return (
    <EmbedPrimitive
      url={url}
      title="Figma Live Canvas"
      size={size}
    />
  );
}

// ── 6. Generic Sandboxed Embed Widget ───────────────────────────────────────

export function ExternalEmbedWidget({ size, config }: WidgetProps) {
  const url = (config.url as string) || "https://example.com";
  const title = (config.title as string) || "External Web Resource";

  return (
    <EmbedPrimitive
      url={url}
      title={title}
      size={size}
    />
  );
}
