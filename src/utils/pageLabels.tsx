import React from "react";
import PageIcon from "../components/PageIcon";

/**
 * Page label/icon helpers shared by AIPanel and the right-hand panel.
 *
 * These lived inside AIPanel.tsx. Moving them here is what lets PageContextPicker
 * be a shared component instead of a ~180-line copy — importing them back from
 * AIPanel would have been circular.
 *
 * `getSafePageTitle` guards two real cases: a blank title, and a `data:` URI
 * that was once stored in the title field and would otherwise render as a
 * giant broken string in every page list.
 */
export function getSafePageIcon(icon?: string | null) {
  return <PageIcon icon={icon} size={14} fallback={<span className="text-xs leading-none">📄</span>} />;
}

export function getSafePageTitle(title?: string | null) {
  if (!title || title.startsWith("data:") || !title.trim()) return "Untitled";
  return title;
}