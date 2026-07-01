import React, { lazy, Suspense } from "react";

const TableView    = lazy(() => import("./views/TableView"));
const BoardView    = lazy(() => import("./views/BoardView"));
const CalendarView = lazy(() => import("./views/CalendarView"));
const ListView     = lazy(() => import("./views/ListView"));
const GalleryView  = lazy(() => import("./views/GalleryView"));
const TimelineView = lazy(() => import("./views/TimelineView"));
const FeedView     = lazy(() => import("./views/FeedView"));
const GraphView    = lazy(() => import("./views/GraphView"));

const VIEW_MAP = {
  table: TableView,
  board: BoardView,
  calendar: CalendarView,
  list: ListView,
  gallery: GalleryView,
  timeline: TimelineView,
  feed: FeedView,
  graph: GraphView,
};

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-[var(--muted)]">
      Loading view...
    </div>
  );
}

export default function DatabaseView({ type, onRowClick, ...props }) {
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
      <ViewComponent {...props} onRowClick={onRowClick} />
    </Suspense>
  );
}
