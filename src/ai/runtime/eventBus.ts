/**
 * Noska Intelligence — Workspace Event Bus
 *
 * Publishes workspace mutations (page created/updated/trashed, task
 * completed, title changed) to subscribed trigger engines. App.tsx's
 * updatePage pipeline publishes; the TriggerService subscribes.
 *
 * Events carry provenance (which execution caused them) so loop protection
 * can prevent automation feedback loops.
 */

import type { WorkspaceEvent } from "./types";

type EventListener = (event: WorkspaceEvent) => void;

const listeners = new Set<EventListener>();
const recentEvents: WorkspaceEvent[] = [];
const MAX_RECENT = 100;

export function publishWorkspaceEvent(event: Omit<WorkspaceEvent, "at"> & { at?: string }): void {
  const full: WorkspaceEvent = { ...event, at: event.at || new Date().toISOString() };
  recentEvents.unshift(full);
  if (recentEvents.length > MAX_RECENT) recentEvents.pop();
  for (const listener of listeners) {
    try {
      listener(full);
    } catch (err) {
      console.warn("[noska-runtime] event listener failed", err);
    }
  }
}

export function subscribeWorkspaceEvents(listener: EventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRecentEvents(): readonly WorkspaceEvent[] {
  return recentEvents;
}
