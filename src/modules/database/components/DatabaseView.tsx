import React, { lazy, Suspense } from "react";
import type { DatabaseRow, PropertyDefinition, ViewDefinition } from "../types/database";

const TableView    = lazy(() => import("./views/TableView"));
const BoardView    = lazy(() => import("./views/BoardView"));
const CalendarView = lazy(() => import("./views/CalendarView"));
const ListView     = lazy(() => import("./views/ListView"));
const GalleryView  = lazy(() => import("./views/GalleryView"));
const TimelineView = lazy(() => import("./views/TimelineView"));
const FeedView     = lazy(() => import("./views/FeedView"));
const DashboardView = lazy(() => import("./views/DashboardView"));
const GraphView    = lazy(() => import("./views/GraphView"));

// Common props shared by every per-view-type component (TableView also
// accepts a couple of extra props — onDeleteRow/onDuplicateRow/onPatchView —
// which are passed through via the `...props` spread below regardless of
// which view is active; each individual view component simply ignores props
// it doesn't destructure, matching the original JS's untyped spread).
export interface DatabaseViewSharedProps {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  onPatchRow: (rowId: string, patch: Partial<DatabaseRow>) => void;
  onAddRow: () => void;
  activeView: ViewDefinition;
  onRowClick?: (rowId: string) => void;
  // TableView-specific, passed through for every view via the spread —
  // see the note above.
  onDeleteRow?: (rowId: string) => void;
  onDuplicateRow?: (rowId: string | string[]) => void;
  onPatchView?: (patch: Partial<ViewDefinition>) => void;
}

// `type` here is intentionally the broader ViewDefinition["type"] rather
// than a `keyof typeof VIEW_MAP` restriction — the fallback branch below
// exists specifically to handle view types with no renderer yet (e.g.
// "mind-map"), same as the original JS's `VIEW_MAP[type]` lookup that can
// return undefined.
export interface DatabaseViewProps extends DatabaseViewSharedProps {
  type: ViewDefinition["type"] | string;
}

const VIEW_MAP: Record<string, React.ComponentType<DatabaseViewSharedProps>> = {
  table: TableView,
  board: BoardView,
  calendar: CalendarView,
  list: ListView,
  gallery: GalleryView,
  timeline: TimelineView,
  feed: FeedView,
  dashboard: DashboardView,
  graph: GraphView,
};

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-[var(--muted)]">
      Loading view...
    </div>
  );
}

export default function DatabaseView({ type, onRowClick, ...props }: DatabaseViewProps) {
  const ViewComponent = VIEW_MAP[type];
  if (!ViewComponent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-16 text-sm text-[var(--muted)]">
        <span className="text-3xl mb-2">
          {type === 'mind-map' ? '🧠' : '📋'}
        </span>
        <span className="capitalize">{type} view coming soon</span>
      </div>
    );
  }
  return (
    <Suspense fallback={<ViewFallback />}>
      {/* Cast: `props` here is `Omit<DatabaseViewProps, "type" | "onRowClick">`
          via the rest-spread above, which TS can't structurally narrow back
          to DatabaseViewSharedProps (minus type/onRowClick) on its own —
          this mirrors the original JS's untyped `{...props}` spread exactly,
          just made explicit for the type checker. */}
      <ViewComponent {...(props as DatabaseViewSharedProps)} onRowClick={onRowClick} />
    </Suspense>
  );
}
