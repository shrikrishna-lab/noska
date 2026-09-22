/**
 * Noska Widget Platform — Connected Provider Widgets.
 * Powered by centralized connector gateway & ProviderSyncManager — real
 * data only, no hard-coded fixtures. Denied/error states render the
 * standard permission or error chrome from WidgetFrame.
 */
import React, { useCallback, useEffect, useState } from "react";
import { ListPrimitive, type ListItemData } from "../primitives/ListPrimitive";
import { WidgetError, WidgetLoading, WidgetPermissionRequired } from "../components/WidgetFrame";
import { EmbedPrimitive } from "../primitives/EmbedPrimitive";
import type { WidgetProps } from "../types";
import {
  fetchGitHubPullRequests,
  fetchGitHubIssues,
  fetchCalendarEvents,
  fetchDriveFiles,
  toWidgetState,
  type WidgetDataState,
} from "../providers/gatewayData";

/** Shared async loader for connected list widgets. */
function useConnectedList(fetcher: () => Promise<ListItemData[]>): {
  state: WidgetDataState<ListItemData[]>;
  reload: () => void;
} {
  const [state, setState] = useState<WidgetDataState<ListItemData[]>>({ status: "loading" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetcher()
      .then((items) => {
        if (!cancelled) setState({ status: "ready", items });
      })
      .catch((err) => {
        if (!cancelled) setState(toWidgetState<ListItemData[]>(err));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { state, reload };
}

function ConnectedListBody({
  title,
  state,
  integration,
  reload,
  onItemClick,
}: {
  title: string;
  state: WidgetDataState<ListItemData[]>;
  integration: string;
  reload: () => void;
  onItemClick?: (item: ListItemData) => void;
}) {
  if (state.status === "loading") return <WidgetLoading rows={3} />;
  if (state.status === "denied") return <WidgetPermissionRequired integration={integration} />;
  if (state.status === "error") return <WidgetError message={state.message} onRetry={reload} />;

  return (
    <ListPrimitive
      title={title}
      items={state.items}
      emptyMessage={`No recent ${title.toLowerCase()} — connect ${integration} or refresh.`}
      onItemClick={onItemClick}
    />
  );
}

// ── 1. GitHub Pull Requests Widget ──────────────────────────────────────────

export function GitHubPrsWidget({ size }: WidgetProps) {
  const { state, reload } = useConnectedList(fetchGitHubPullRequests);
  return (
    <ConnectedListBody
      title="GitHub Pull Requests"
      state={state}
      integration="GitHub"
      reload={reload}
      onItemClick={(it) => {
        if (it.url) window.open(it.url, "_blank", "noopener,noreferrer");
      }}
    />
  );
}

// ── 2. GitHub Issues Widget ─────────────────────────────────────────────────

export function GitHubIssuesWidget({ size, ctx }: WidgetProps) {
  const { state, reload } = useConnectedList(fetchGitHubIssues);
  return (
    <ConnectedListBody
      title="Active GitHub Issues"
      state={state}
      integration="GitHub"
      reload={reload}
      onItemClick={(it) => {
        if (it.url) window.open(it.url, "_blank", "noopener,noreferrer");
        else ctx.actions.onToast?.(`Opened issue: ${it.title}`);
      }}
    />
  );
}

// ── 3. Google Calendar Widget ───────────────────────────────────────────────

export function GoogleCalendarWidget({ size, ctx }: WidgetProps) {
  const { state, reload } = useConnectedList(fetchCalendarEvents);
  return (
    <ConnectedListBody
      title="Google Calendar"
      state={state}
      integration="Google Workspace"
      reload={reload}
      onItemClick={(it) => {
        if (it.url) window.open(it.url, "_blank", "noopener,noreferrer");
        else ctx.actions.onToast?.(`Opening event: ${it.title}`);
      }}
    />
  );
}

// ── 4. Google Drive Files Widget ────────────────────────────────────────────

export function GoogleDriveFilesWidget({ size, ctx }: WidgetProps) {
  const { state, reload } = useConnectedList(fetchDriveFiles);
  return (
    <ConnectedListBody
      title="Google Drive Recent"
      state={state}
      integration="Google Workspace"
      reload={reload}
      onItemClick={(it) => {
        if (it.url) window.open(it.url, "_blank", "noopener,noreferrer");
        else ctx.actions.onToast?.(`Opened Google Drive file: ${it.title}`);
      }}
    />
  );
}

// ── 5. Figma Live Preview Widget ────────────────────────────────────────────
// Pure URL embed — no connector backend required (requiredIntegration removed).

export function FigmaPreviewWidget({ size, config }: WidgetProps) {
  const url = (config.url as string) || "https://www.figma.com";
  return <EmbedPrimitive url={url} title="Figma Live Canvas" size={size} />;
}

// ── 6. Generic Sandboxed Embed Widget ───────────────────────────────────────

export function ExternalEmbedWidget({ size, config }: WidgetProps) {
  const url = (config.url as string) || "https://example.com";
  const title = (config.title as string) || "External Web Resource";
  return <EmbedPrimitive url={url} title={title} size={size} />;
}
