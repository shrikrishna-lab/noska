/**
 * External Link Preview Block Component
 *
 * Implements Notion-style external resource cards with:
 * - 11 distinct states (initial, loading, success, auth_required, access_denied, etc.)
 * - In-place "Connect to GitHub to update" action
 * - Multi-account selector dropdown
 * - Live refresh button & "View original" external link
 * - Rich metadata badges (PR #, comments, commits, status pill, author avatar)
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ExternalLink,
  RefreshCw,
  GitPullRequest,
  GitCommit,
  Tag,
  FileCode,
  FolderGit2,
  AlertCircle,
  Lock,
  CheckCircle2,
  Clock,
  MessageSquare,
  GitFork,
  MoreHorizontal,
  ChevronDown,
  Trash2,
  AtSign,
  Link as LinkIcon,
  Loader2,
  User,
  ShieldAlert,
} from "lucide-react";
import { ResourceCache } from "../../lib/connections/resourceCache";
import { ConnectionsService } from "../../lib/connections/connectionsService";
import { ExternalUrlResolver } from "../../lib/connections/urlResolver";
import { IntegrationRegistry } from "../../lib/connections/registry";
import type { NormalizedResource, ResourceResolutionState, ResolveResourceResult } from "../../lib/connections/types";
import { openExternal } from "../../lib/desktop/links";

export interface ExternalLinkPreviewBlockProps {
  block: {
    id: string;
    type: string;
    url?: string;
    properties?: {
      url?: string;
      accountId?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  onPatch?: (patch: Record<string, unknown>) => void;
  onDelete?: () => void;
  onTurnInto?: (type: string, data?: Record<string, unknown>) => void;
}

export default function ExternalLinkPreview({
  block,
  onPatch,
  onDelete,
  onTurnInto,
}: ExternalLinkPreviewBlockProps) {
  const rawUrl = block.properties?.url || block.url || (block.text as string) || "";
  const selectedAccountId = block.properties?.accountId;

  const matchResult = useMemo(() => ExternalUrlResolver.detectUrl(rawUrl), [rawUrl]);
  const provider = matchResult?.provider ?? (rawUrl.includes("github") ? IntegrationRegistry.get("github") : undefined);

  const [resState, setResState] = useState<ResourceResolutionState>("initial");
  const [resource, setResource] = useState<NormalizedResource | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [accessibleAccounts, setAccessibleAccounts] = useState<Array<{ id: string; label: string; username: string }>>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const loadResource = useCallback(
    async (force = false, accountId?: string) => {
      if (!rawUrl) {
        setResState("malformed_url");
        return;
      }
      setIsRefreshing(true);
      try {
        const result = await ResourceCache.resolve(rawUrl, { force, accountId: accountId || selectedAccountId });
        setResState(result.state);
        setResource(result.resource);
        setErrorMessage(result.errorMessage);
        setAccessibleAccounts(result.accessibleAccounts ?? []);
      } catch (err) {
        setResState("provider_unavailable");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load resource");
      } finally {
        setIsRefreshing(false);
      }
    },
    [rawUrl, selectedAccountId]
  );

  useEffect(() => {
    // Initial sync read from cache for zero latency
    const cached = ResourceCache.getCached(rawUrl, selectedAccountId);
    if (cached) {
      setResState(cached.state);
      setResource(cached.resource);
      setErrorMessage(cached.errorMessage);
      setAccessibleAccounts(cached.accessibleAccounts ?? []);
    }

    void loadResource(false, selectedAccountId);

    // Subscribe to cache updates
    const unsubscribe = ResourceCache.subscribe(rawUrl, (updated) => {
      setResState(updated.state);
      setResource(updated.resource);
      setErrorMessage(updated.errorMessage);
      setAccessibleAccounts(updated.accessibleAccounts ?? []);
    }, selectedAccountId);

    return unsubscribe;
  }, [rawUrl, selectedAccountId, loadResource]);

  const handleConnect = async () => {
    if (provider) {
      try {
        await ConnectionsService.startOAuthConnect(provider.id);
        // Refresh after trigger
        setTimeout(() => void loadResource(true), 4000);
      } catch (err) {
        console.error("Connect failed:", err);
      }
    }
  };

  const handleSwitchAccount = async (accId: string) => {
    setShowAccountDropdown(false);
    onPatch?.({
      properties: {
        ...(block.properties || {}),
        accountId: accId,
      },
    });
    void loadResource(true, accId);
  };

  const handleOpenOriginal = () => {
    const targetUrl = resource?.canonicalUrl || rawUrl;
    if (targetUrl) {
      void openExternal(targetUrl);
    }
  };

  const getResourceIcon = () => {
    if (!resource) return <ExternalLink size={16} className="text-[var(--muted)]" />;
    switch (resource.resourceType) {
      case "pull_request":
        return <GitPullRequest size={16} className="text-purple-500" />;
      case "issue":
        return <AlertCircle size={16} className="text-emerald-500" />;
      case "commit":
        return <GitCommit size={16} className="text-blue-500" />;
      case "release":
        return <Tag size={16} className="text-emerald-600" />;
      case "file":
        return <FileCode size={16} className="text-amber-500" />;
      case "repository":
        return <FolderGit2 size={16} className="text-zinc-400" />;
      default:
        return <ExternalLink size={16} className="text-[var(--muted)]" />;
    }
  };

  // ── Render 11 explicit states ──────────────────────────────

  // 1. Loading / Initial State
  if (resState === "loading" || (resState === "initial" && !resource)) {
    return (
      <div className="my-2 select-none rounded-xl border border-[var(--border)] bg-[var(--elevated)]/60 p-3.5 shadow-sm font-sans animate-pulse">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[var(--muted)]/20" />
            <div className="h-3.5 w-24 rounded bg-[var(--muted)]/20" />
          </div>
          <Loader2 size={14} className="animate-spin text-[var(--muted)]" />
        </div>
        <div className="h-4 w-3/4 rounded bg-[var(--muted)]/20 mb-2" />
        <div className="h-3 w-1/2 rounded bg-[var(--muted)]/15" />
      </div>
    );
  }

  // 2. Authentication Required State
  if (resState === "auth_required") {
    return (
      <div className="my-2 select-none rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-4 shadow-sm font-sans transition">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Lock size={15} />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-xs text-[var(--text)] flex items-center gap-1.5">
                <span>{provider?.name || "GitHub"}</span>
                <span className="text-[10px] text-[var(--muted)]">• Link Preview</span>
              </div>
              <div className="text-xs text-[var(--secondary)] truncate">
                Connect your {provider?.name || "GitHub"} account to update this preview.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleConnect}
              className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-sm"
            >
              Connect
            </button>
            <button
              type="button"
              onClick={handleOpenOriginal}
              className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
              title="Open original URL"
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Access Denied State (Private resource not accessible by current account)
  if (resState === "access_denied") {
    return (
      <div className="my-2 select-none rounded-xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10 p-4 shadow-sm font-sans">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert size={15} />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-xs text-[var(--text)]">Access denied</div>
              <div className="text-xs text-[var(--secondary)] mt-0.5">
                {errorMessage || `You are connected to ${provider?.name || "GitHub"}, but this account cannot access this repository.`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleConnect}
              className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--elevated)] text-[var(--text)] text-xs font-medium hover:bg-[var(--hover)] transition cursor-pointer"
            >
              Connect another account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Resource Not Found / Malformed / Unavailable Errors
  if (resState === "not_found" || resState === "malformed_url" || resState === "provider_unavailable" || !resource) {
    return (
      <div className="my-2 select-none rounded-xl border border-[var(--border)] bg-[var(--elevated)]/40 p-3.5 shadow-sm font-sans text-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle size={15} className="text-[var(--muted)] shrink-0" />
            <div className="min-w-0 truncate">
              <span className="font-medium text-[var(--text)] mr-1.5">{provider?.name || "External Link"}:</span>
              <span className="text-[var(--secondary)] truncate">{errorMessage || "Unable to display preview."}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void loadResource(true)}
              className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
              title="Retry"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={handleOpenOriginal}
              className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
              title="Open URL"
            >
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Success State — Rich Native Notion-Grade Card
  const prNum = resource.metadata?.number as number | undefined;
  const commentsCount = resource.metadata?.comments as number | undefined;
  const additions = resource.metadata?.additions as number | undefined;
  const deletions = resource.metadata?.deletions as number | undefined;

  return (
    <div className="my-2.5 rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow-sm hover:border-[var(--border)]/80 hover:shadow transition group font-sans text-xs overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-[var(--border)]/50 bg-[var(--bg)]/40 text-[11px] text-[var(--muted)]">
        <div className="flex items-center gap-2 min-w-0">
          {getResourceIcon()}
          <span className="font-medium text-[var(--text)]">{resource.providerName}</span>
          <span className="text-[var(--border)]">•</span>
          <span className="truncate text-[var(--secondary)]">{resource.source.name}</span>
          {resource.status && (
            <span
              style={{ color: resource.status.color, backgroundColor: resource.status.bg }}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0"
            >
              {resource.status.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Multi-Account Selector if user has multiple accounts */}
          {accessibleAccounts.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAccountDropdown((v) => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
              >
                <User size={11} />
                <span>Account</span>
                <ChevronDown size={10} />
              </button>
              {showAccountDropdown && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-medium text-[var(--muted)] border-b border-[var(--border)]/50">
                    Switch account
                  </div>
                  {accessibleAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSwitchAccount(acc.id)}
                      className="w-full text-left px-2 py-1.5 rounded text-[11px] hover:bg-[var(--hover)] text-[var(--text)] truncate transition cursor-pointer"
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => void loadResource(true)}
            className="p-1.5 rounded-md hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
            title="Refresh preview"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={handleOpenOriginal}
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
            title="Open in GitHub"
          >
            <span>Open</span>
            <ExternalLink size={11} />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={handleOpenOriginal}
              className="text-left font-semibold text-sm text-[var(--text)] hover:text-[var(--accent)] hover:underline transition line-clamp-2 cursor-pointer leading-snug"
            >
              {prNum !== undefined ? `#${prNum} ` : ""}
              {resource.title}
            </button>

            {resource.description && (
              <p className="text-[11px] text-[var(--muted)] mt-1 line-clamp-2 leading-relaxed">
                {resource.description}
              </p>
            )}
          </div>
        </div>

        {/* Footer Badges & Metadata */}
        <div className="mt-3 pt-2.5 border-t border-[var(--border)]/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
          <div className="flex items-center gap-3">
            {resource.author && (
              <div className="flex items-center gap-1.5">
                {resource.author.avatarUrl ? (
                  <img
                    src={resource.author.avatarUrl}
                    alt={resource.author.name}
                    className="w-4 h-4 rounded-full"
                  />
                ) : (
                  <User size={12} />
                )}
                <span className="text-[var(--secondary)] font-medium">{resource.author.username || resource.author.name}</span>
              </div>
            )}

            {commentsCount !== undefined && commentsCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare size={12} />
                <span>{commentsCount} comments</span>
              </div>
            )}

            {(additions !== undefined || deletions !== undefined) && (
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                {additions !== undefined && <span className="text-emerald-500 font-medium">+{additions}</span>}
                {deletions !== undefined && <span className="text-rose-500 font-medium">-{deletions}</span>}
              </div>
            )}
          </div>

          {resource.timestamps.createdAt && (
            <div className="flex items-center gap-1 text-[10px]">
              <Clock size={11} />
              <span>{new Date(resource.timestamps.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
