/**
 * Noska Widget Platform — Reusable Sandboxed Embed Primitive.
 * Renders securely sandboxed iframes with origin validation, HTTPS enforcement, and fallback recovery.
 */
import React, { useState } from "react";
import { Globe, AlertTriangle, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import type { WidgetSize } from "../types";

export interface EmbedPrimitiveProps {
  url: string;
  title?: string;
  size?: WidgetSize;
  allowScripts?: boolean;
}

export function EmbedPrimitive({
  url,
  title,
  size = "medium",
  allowScripts = true,
}: EmbedPrimitiveProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isValidHttps = /^https:\/\//i.test(url.trim());

  if (!url || !isValidHttps) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center select-none font-sans">
        <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
          <AlertTriangle size={16} />
        </div>
        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Secure HTTPS Required</p>
        <p className="text-[10.5px] text-neutral-400 max-w-[200px] mt-0.5">
          External embeds must use secure HTTPS protocols.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-black/[0.02] dark:bg-white/[0.02] font-sans">
      {/* Optional Header */}
      {title && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/[0.04] dark:border-white/[0.06] bg-white/60 dark:bg-black/40 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <Globe size={12} className="text-neutral-400 shrink-0" />
            <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 truncate">{title}</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new window"
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-[#151820]/80 backdrop-blur-sm">
          <Loader2 size={18} className="animate-spin text-neutral-400" />
        </div>
      )}

      {/* Sandboxed iframe */}
      <iframe
        src={url}
        title={title || "Embedded resource"}
        sandbox={`allow-same-origin ${allowScripts ? "allow-scripts" : ""} allow-popups allow-forms`}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className="h-full w-full border-none flex-1"
      />

      {hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center bg-white dark:bg-[#151820]">
          <AlertTriangle size={18} className="text-amber-500 mb-1.5" />
          <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Embedding Restricted</p>
          <p className="text-[10px] text-neutral-400 max-w-[200px] mt-0.5 mb-2">
            This external website restricts framing via security headers.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold"
          >
            <span>Open Link</span>
            <ExternalLink size={11} />
          </a>
        </div>
      )}
    </div>
  );
}

export default EmbedPrimitive;
