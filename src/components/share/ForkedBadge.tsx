/**
 * Marks a page as a fork.
 *
 * `fork_page` stamps the root of the copy with a `forked` lineage entry, which
 * is the only durable record that this page came from somebody else's shared
 * page rather than being created from scratch. Without a visible marker the
 * copy is indistinguishable from a page the user wrote themselves — people
 * could not tell which documents were their own work.
 *
 * Shown in the sidebar tree and in the page header. Intentionally quiet: a
 * small monochrome glyph that only reaches full contrast on hover/focus, so it
 * annotates rather than competes with the page title.
 */
import React from "react";
import { GitFork } from "lucide-react";
import type { LineageEntry } from "../../../types/blocks";

/** True when the page's lineage records that it was created by forking. */
export function isForkedPage(
  lineage: LineageEntry[] | null | undefined,
): boolean {
  if (!Array.isArray(lineage)) return false;
  return lineage.some((entry) => entry?.action === "forked");
}

/** When the page was forked, for the tooltip. Null when it wasn't. */
export function forkedAt(
  lineage: LineageEntry[] | null | undefined,
): string | null {
  if (!Array.isArray(lineage)) return null;
  const entry = lineage.find((e) => e?.action === "forked");
  return entry?.timestamp ?? null;
}

function describe(timestamp: string | null): string {
  if (!timestamp) return "Forked — this is your own copy";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Forked — this is your own copy";
  return `Forked ${date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} — your own copy, not linked to the original`;
}

interface ForkedBadgeProps {
  lineage: LineageEntry[] | null | undefined;
  size?: number;
  className?: string;
  /** `plain` keeps it at full opacity (used in the page header). */
  emphasis?: "muted" | "plain";
}

export function ForkedBadge({
  lineage,
  size = 10,
  className = "",
  emphasis = "muted",
}: ForkedBadgeProps) {
  if (!isForkedPage(lineage)) return null;
  const at = forkedAt(lineage);
  return (
    <span
      title={describe(at)}
      aria-label={describe(at)}
      role="img"
      className={[
        "inline-flex shrink-0 items-center",
        emphasis === "muted"
          ? "text-neutral-400 opacity-70 transition-opacity duration-150 group-hover:opacity-100"
          : "text-[var(--text-secondary)]",
        className,
      ].join(" ")}
    >
      <GitFork size={size} aria-hidden="true" />
    </span>
  );
}

export default ForkedBadge;