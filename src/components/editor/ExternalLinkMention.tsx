/**
 * External Link Mention Component
 *
 * Renders a compact inline badge with provider icon, status indicator,
 * resource title/identifier, and click-to-open action.
 */

import React, { useEffect, useState } from "react";
import { ExternalLink, GitPullRequest, AlertCircle, GitCommit, Tag, FileCode, FolderGit2 } from "lucide-react";
import { ResourceCache } from "../../lib/connections/resourceCache";
import { ExternalUrlResolver } from "../../lib/connections/urlResolver";
import type { NormalizedResource } from "../../lib/connections/types";
import { openExternal } from "../../lib/desktop/links";

export interface ExternalLinkMentionProps {
  url: string;
  displayHint?: string;
  fallbackText?: string;
}

export default function ExternalLinkMention({
  url,
  displayHint,
  fallbackText,
}: ExternalLinkMentionProps) {
  const [resource, setResource] = useState<NormalizedResource | undefined>(
    ResourceCache.getCached(url)?.resource
  );

  useEffect(() => {
    let mounted = true;
    void ResourceCache.resolve(url).then((res) => {
      if (mounted && res.resource) setResource(res.resource);
    });
    return () => {
      mounted = false;
    };
  }, [url]);

  const match = ExternalUrlResolver.detectUrl(url);
  const title = resource?.title || displayHint || match?.displayHint || fallbackText || url;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    void openExternal(resource?.canonicalUrl || url);
  };

  const getIcon = () => {
    if (resource?.resourceType === "pull_request") return <GitPullRequest size={12} className="text-purple-500" />;
    if (resource?.resourceType === "issue") return <AlertCircle size={12} className="text-emerald-500" />;
    if (resource?.resourceType === "commit") return <GitCommit size={12} className="text-blue-500" />;
    if (resource?.resourceType === "release") return <Tag size={12} className="text-emerald-600" />;
    if (resource?.resourceType === "file") return <FileCode size={12} className="text-amber-500" />;
    return <ExternalLink size={12} className="text-[var(--muted)]" />;
  };

  return (
    <span
      onClick={handleClick}
      title={url}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--hover)] hover:bg-[var(--accent)]/15 text-[var(--text)] border border-[var(--border)]/70 text-xs font-medium transition cursor-pointer select-none align-middle mx-1 group"
    >
      <span className="shrink-0">{getIcon()}</span>
      <span className="truncate max-w-[200px]">{title}</span>
      {resource?.status && (
        <span
          style={{ color: resource.status.color, backgroundColor: resource.status.bg }}
          className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold uppercase tracking-wider shrink-0"
        >
          {resource.status.label}
        </span>
      )}
    </span>
  );
}
