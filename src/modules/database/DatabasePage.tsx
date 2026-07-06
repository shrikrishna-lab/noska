import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Settings2, Search, Plus, Filter, ArrowUpDown, X, Sparkles, ChevronDown, Eye, EyeOff, Maximize2, Minimize2, Zap, ChevronUp } from "lucide-react";
import DatabaseView from "./components/DatabaseView";
import { useDatabase } from "./hooks/useDatabase";
import { getActiveView, createView } from "./services/viewService";
import { PROPERTY_TYPES, CATEGORIES } from "./services/propertyService";
import { VIEW_TYPES } from "./types/database";
import { addProperty as addPropDef } from "./services/propertyService";
import { operatorsForType } from "./utils/filterEngine";
import PeekPanel from "../page/peek/PeekPanel";
import { generateAISummary, generateAITags } from "./services/aiService";
import type { DatabaseSchema, DatabaseRow, ViewDefinition, FilterConfig, SortConfig } from "./types/database";

// NOTE: `Check` and `GripVertical` were imported from lucide-react in the
// original JS but never referenced anywhere in the component body — dead
// imports. Omitted here (unlike a dead *prop*, an unused named import from
// a third-party icon library has no runtime-observable effect either way,
// and TypeScript would otherwise flag it as declared-but-unused once
// `noUnusedLocals` is eventually turned on project-wide).
//
// `getActiveView`/`createView` (viewService)/`addPropDef` (propertyService)/
// `generateAISummary`/`generateAITags` (aiService) are all imported here but
// never called anywhere in this file either — grepped to confirm, all five
// are genuinely dead imports in the original JS (this page's own
// `ops.getActiveView()` — from the `useDatabase` hook, not the raw
// `viewService` import — is what's actually used; the AI summary/tags
// functions have no call site in this component despite being imported).
// Preserved as-is per the "document don't fix" rule for pre-existing dead
// code that isn't a broken behavior, just unused surface area.

export interface DatabasePageProps {
  // `database`/`onPatch` are typed loosely at this public boundary rather
  // than against this module's own DatabaseSchema (types/database.ts).
  // DatabasePage's one real external caller, src/components/DatabaseBlock.tsx
  // (outside this module, out of scope for this conversion), passes the
  // canonical types/blocks.ts DatabaseSchema — which is almost identical to
  // this module's own local DatabaseSchema but differs in two narrow, already
  // -documented ways (see types/database.ts's module-header comment):
  // ViewDefinition.type there is missing "feed"/"dashboard"/"map", and
  // columnWidths is `number` instead of `Record<string, number>`. Per the
  // migration instructions, this module's own types are converted faithfully
  // rather than force-unified with the canonical ones, so the real
  // discrepancy is bridged here at the one boundary where the two type
  // systems meet — a single documented cast below into this module's own
  // strictly-typed `db`, rather than either an undocumented `any` or
  // reshaping this module's own DatabaseSchema to match the canonical one.
  // `unknown` (not `Record<string, unknown>`): the canonical DatabaseSchema
  // interface (types/blocks.ts) has no index signature, so a real caller's
  // object wouldn't structurally satisfy Record<string, unknown> either —
  // `unknown` is the only type both the canonical schema and this module's
  // own local schema can flow through without a forced (and misleading)
  // structural claim. Narrowed via an explicit, documented cast at the one
  // read site immediately below.
  database?: unknown;
  onPatch: (patch: unknown) => void;
  onOpenRow?: (rowId: string) => void;
  pageId?: string;
  apiKey?: string;
  aiProvider?: string;
  onToast?: (message: string) => void;
  title?: string;
  icon?: string;
}

export default function DatabasePage({ database, onPatch, onOpenRow, onToast, title, icon }: DatabasePageProps) {
  // Cast: bridges the loosely-typed external `database` prop (see
  // DatabasePageProps comment above) into this module's own strictly-typed
  // DatabaseSchema, which every hook/service/util in this module is typed
  // against. Structurally safe for the one real caller: DatabaseBlock.tsx's
  // `db.database` is either `undefined` (empty-database branch, not this
  // spread) or a real DatabaseSchema-shaped object populated via this same
  // module's own `createEmptyDatabase()`/row-and-view services elsewhere in
  // its lifecycle.
  const db: DatabaseSchema = {
    properties: [],
    views: [],
    rows: [],
    activeViewId: '',
    ...(database as Partial<DatabaseSchema> || {}),
  };
  if (!db.views) db.views = [];
  if (!db.activeViewId) db.activeViewId = '';

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [propertyDraft, setPropertyDraft] = useState("");
  const [peekRowId, setPeekRowId] = useState<string | null>(null);
  const [createViewOpen, setCreateViewOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewType, setNewViewType] = useState<ViewDefinition["type"]>("table");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [automationsOpen, setAutomationsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [newDropdownOpen, setNewDropdownOpen] = useState(false);
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const automationsRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const newDropdownRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) setShowFilter(false);
      if (sortRef.current && !sortRef.current.contains(target)) setShowSort(false);
      if (createRef.current && !createRef.current.contains(target)) setCreateViewOpen(false);
      if (automationsRef.current && !automationsRef.current.contains(target)) setAutomationsOpen(false);
      if (aiRef.current && !aiRef.current.contains(target)) setAiOpen(false);
      if (newDropdownRef.current && !newDropdownRef.current.contains(target)) setNewDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const ops = useDatabase(db, onPatch);
  const activeView = ops.getActiveView();
  const filteredRows = ops.getFilteredSortedRows(searchQuery);
  const peekRow = useMemo(() => db.rows.find(r => r.id === peekRowId) || null, [db.rows, peekRowId]);

  const handleAddProperty = useCallback(() => {
    const name = propertyDraft.trim();
    if (!name) return;
    ops.addProperty(name, 'text');
    setPropertyDraft("");
  }, [propertyDraft, ops]);

  const handleRowClick = useCallback((rowId: string) => {
    setPeekRowId(rowId);
  }, []);

  // --- Filter helpers ---
  const activeFilters = activeView?.filters?.conditions || [];
  const hasFilters = activeFilters.length > 0;

  const addFilterCondition = () => {
    const firstProp = db.properties[0];
    const propType = firstProp?.type || 'text';
    const opsList = operatorsForType(propType);
    const defaultOp = opsList[0]?.id || 'contains';
    const filters: FilterConfig = activeView.filters || { operator: 'and', conditions: [] };
    ops.patchView({
      filters: {
        ...filters,
        conditions: [...filters.conditions, { columnId: firstProp?.id || 'name', condition: defaultOp, value: '' }],
      },
    });
  };

  const updateFilterCondition = (idx: number, patch: Partial<FilterConfig["conditions"][number]>) => {
    const filters: FilterConfig = activeView.filters || { operator: 'and', conditions: [] };
    const next = [...filters.conditions];
    next[idx] = { ...next[idx], ...patch };
    ops.patchView({ filters: { ...filters, conditions: next } });
  };

  const removeFilterCondition = (idx: number) => {
    const filters: FilterConfig = activeView.filters || { operator: 'and', conditions: [] };
    const next = filters.conditions.filter((_, i) => i !== idx);
    // Cast: patchView's `patch` param is `Partial<ViewDefinition>`, whose
    // `filters` field is `FilterConfig | undefined` — this call
    // deliberately sets it to `null` (matching the original JS exactly,
    // clearing filters entirely) rather than `undefined`. ViewDefinition
    // elsewhere (databaseService.ts's createEmptyDatabase, viewService.ts's
    // createView) always seeds `filters` as a populated object, never as
    // `null`, so this is the sole place `filters: null` is produced —
    // faithful to the original behavior, not a new state.
    ops.patchView({ filters: (next.length > 0 ? { ...filters, conditions: next } : null) as unknown as FilterConfig });
  };

  const toggleFilterOp = () => {
    const filters: FilterConfig = activeView.filters || { operator: 'and', conditions: [] };
    ops.patchView({ filters: { ...filters, operator: filters.operator === 'and' ? 'or' : 'and' } });
  };

  // --- Sort helpers ---
  const activeSorts = activeView?.sorts || [];
  const hasSorts = activeSorts.length > 0 && !!activeSorts[0]?.columnId;

  const addSortKey = () => {
    const firstProp = db.properties[0];
    const sorts: SortConfig[] = [...(activeView.sorts || [])];
    sorts.push({ columnId: firstProp?.id || 'name', direction: 'ascending' });
    ops.patchView({ sorts });
  };

  const updateSort = (idx: number, patch: Partial<SortConfig>) => {
    const sorts: SortConfig[] = [...(activeView.sorts || [])];
    sorts[idx] = { ...sorts[idx], ...patch };
    ops.patchView({ sorts });
  };

  const removeSort = (idx: number) => {
    let sorts: SortConfig[] = [...(activeView.sorts || [])];
    sorts = sorts.filter((_, i) => i !== idx);
    ops.patchView({ sorts });
  };

  const moveSort = (idx: number, dir: number) => {
    const sorts: SortConfig[] = [...(activeView.sorts || [])];
    const target = idx + dir;
    if (target < 0 || target >= sorts.length) return;
    [sorts[idx], sorts[target]] = [sorts[target], sorts[idx]];
    ops.patchView({ sorts });
  };

  // --- View tab helpers ---
  const switchView = (viewId: string) => {
    ops.patchView({}); // no-op to trigger re-render; we set activeViewId directly
    onPatch({ ...db, activeViewId: viewId });
  };

  const viewTypeNames: Partial<Record<ViewDefinition["type"], string>> = { table: 'Table', board: 'Board', gallery: 'Gallery', list: 'List' };

  const handleCreateView = () => {
    const name = newViewName.trim() || (viewTypeNames[newViewType] || 'View');
    ops.addNamedView(newViewType, name);
    setCreateViewOpen(false);
    setNewViewName("");
  };

  const commitRenameView = (viewId: string) => {
    const name = renameDraft.trim();
    const nextViews = db.views.map(v => v.id === viewId ? { ...v, name: name || v.name } : v);
    onPatch({ views: nextViews });
    setRenamingViewId(null);
    setRenameDraft("");
  };

  const startRenameView = (view: ViewDefinition) => {
    setRenamingViewId(view.id);
    setRenameDraft(view.name);
  };

  const moveView = (viewId: string, dir: number) => {
    const idx = db.views.findIndex(v => v.id === viewId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= db.views.length) return;
    const next = [...db.views];
    [next[idx], next[target]] = [next[target], next[idx]];
    onPatch({ views: next });
  };

  // --- Column visibility helpers ---
  const hiddenSet = new Set(activeView?.hiddenProperties || []);
  const toggleHidden = (propId: string) => {
    const next = new Set(hiddenSet);
    if (next.has(propId)) next.delete(propId); else next.add(propId);
    ops.patchView({ hiddenProperties: [...next] });
  };

  // Convert filter conditions to display pills
  const filterPills = useMemo(() => {
    if (!hasFilters) return [] as Array<{ label: string; idx: number }>;
    return activeFilters.map((c, i) => {
      const prop = db.properties.find(p => p.id === c.columnId);
      return { label: `${prop?.name || c.columnId}: ${c.value || c.condition}`, idx: i };
    });
  }, [activeFilters, db.properties]);

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden relative ${isFullscreen ? "fixed inset-0 z-[200] rounded-none border-0 overflow-auto" : ""}`}>
      {/* Section header row — emoji/icon + bold title above the database */}

      {title && (
        <div className="flex items-center gap-2 px-4 pt-3">
          <span className="text-base leading-none">{icon || "🗄️"}</span>
          <span className="text-sm font-bold text-[var(--text)]">{title}</span>
        </div>
      )}
      {/* View tabs + toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-1">
          {db.views.map(view => {
            const viewIcon = (VIEW_TYPES.find(vt => vt.id === view.type) || {}).icon || '📋';
            const isActive = activeView?.id === view.id;
            const isRenaming = renamingViewId === view.id;
            return (
              <div key={view.id} className="group/view relative flex items-center">
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={e => setRenameDraft(e.target.value)}
                    onBlur={() => commitRenameView(view.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRenameView(view.id);
                      if (e.key === 'Escape') { setRenamingViewId(null); setRenameDraft(""); }
                    }}
                    className="rounded px-2 py-1 text-[11px] font-medium bg-[var(--surface)] border border-[var(--accent)] text-[var(--text)] outline-none w-[120px]"
                  />
                ) : (
                  <button
                    onClick={() => switchView(view.id)}
                    onDoubleClick={(e) => { e.stopPropagation(); startRenameView(view); }}
                    className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
                    }`}
                    title={`${view.name} (double-click to rename)`}
                  >
                    <span className="text-[11px] leading-none">{viewIcon}</span>
                    <span>{view.name}</span>
                  </button>
                )}
                {/* Reorder chevrons on hover */}
                {isActive && !isRenaming && (
                  <div className="absolute -right-5 top-1/2 -translate-y-1/2 flex flex-col opacity-0 group-hover/view:opacity-100 transition">
                    <button onClick={(e) => { e.stopPropagation(); moveView(view.id, -1); }} className="grid h-3 w-3 place-items-center text-[var(--muted)] hover:text-[var(--text)] cursor-pointer" title="Move left">
                      <ChevronUp size={11} className="rotate-[-90deg]" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveView(view.id, 1); }} className="grid h-3 w-3 place-items-center text-[var(--muted)] hover:text-[var(--text)] cursor-pointer" title="Move right">
                      <ChevronDown size={11} className="rotate-[-90deg]" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <div className="relative" ref={createRef}>
            <button
              onClick={() => setCreateViewOpen(!createViewOpen)}
              className="rounded px-2 py-1 text-[11px] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)] transition cursor-pointer"
              title="Create view"
            >
              <Plus size={13} />
            </button>
            {createViewOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-2 shadow-xl">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--secondary)]">Create view</div>
                <input
                  value={newViewName}
                  onChange={e => setNewViewName(e.target.value)}
                  placeholder="View name..."
                  className="w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-[11px] text-[var(--text)] outline-none mb-2 placeholder:text-[var(--muted)]"
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateView(); }}
                />
                <div className="flex gap-1 mb-2 flex-wrap">
                  {(['table', 'board', 'gallery', 'list'] as ViewDefinition["type"][]).map(t => (
                    <button
                      key={t}
                      onClick={() => setNewViewType(t)}
                      className={`flex-1 rounded px-2 py-1 text-[10px] font-medium capitalize cursor-pointer transition ${
                        newViewType === t ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--secondary)] hover:bg-[var(--hover)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCreateView}
                  className="w-full rounded bg-[var(--accent)] px-2 py-1 text-[11px] font-medium text-white hover:opacity-90 transition cursor-pointer"
                >
                  Create
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="h-7 w-32 rounded-md border border-[var(--border)] bg-transparent pl-7 pr-2 text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
          </div>

          {/* Filter button + pill */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-1 h-7 rounded-md px-2 text-[11px] transition cursor-pointer ${
                showFilter || hasFilters
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
              }`}
              title="Filter"
            >
              <Filter size={13} />
              {hasFilters && <span className="text-[10px]">{activeFilters.length}</span>}
            </button>
            {/* Filter popover */}
            {showFilter && (
              <div className="absolute top-full right-0 mt-1 z-50 w-[340px] rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)]">Filter</span>
                  <button
                    onClick={addFilterCondition}
                    className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    + Add condition
                  </button>
                </div>
                {hasFilters ? (
                  <div className="space-y-1.5">
                    {activeFilters.map((cond, ci) => {
                      const prop = db.properties.find(p => p.id === cond.columnId);
                      const propType = prop?.type || 'text';
                      const needsValue = !['is-empty', 'is-not-empty', 'is-checked', 'is-unchecked'].includes(cond.condition);
                      return (
                        <div key={ci} className="flex items-center gap-1.5 text-[11px]">
                          {ci === 0 && (
                            <button
                              onClick={toggleFilterOp}
                              className="text-[9px] font-bold uppercase text-[var(--accent)] hover:underline w-6 shrink-0 cursor-pointer"
                            >
                              {activeView.filters?.operator || 'and'}
                            </button>
                          )}
                          {ci > 0 && (
                            <span className="text-[9px] font-bold uppercase text-[var(--muted)] w-6 shrink-0 text-center">
                              {activeView.filters?.operator || 'and'}
                            </span>
                          )}
                          <select
                            value={cond.columnId}
                            onChange={(e) => {
                              const newProp = db.properties.find(p => p.id === e.target.value);
                              const newOps = operatorsForType(newProp?.type || 'text');
                              updateFilterCondition(ci, { columnId: e.target.value, condition: newOps[0]?.id || 'contains', value: '' });
                            }}
                            className="rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--text)] outline-none max-w-[100px]"
                          >
                            {db.properties.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <select
                            value={cond.condition}
                            onChange={(e) => updateFilterCondition(ci, { condition: e.target.value, value: '' })}
                            className="rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--text)] outline-none max-w-[100px]"
                          >
                            {operatorsForType(propType).map(op => (
                              <option key={op.id} value={op.id}>{op.label}</option>
                            ))}
                          </select>
                          {needsValue && (
                            propType === 'select' || propType === 'status' || propType === 'priority' ? (
                              <select
                                value={cond.value || ''}
                                onChange={(e) => updateFilterCondition(ci, { value: e.target.value })}
                                className="flex-1 rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--text)] outline-none min-w-[80px]"
                              >
                                <option value="">Any</option>
                                {(prop?.options || []).map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : propType === 'checkbox' ? null : (
                              <input
                                value={cond.value || ''}
                                onChange={(e) => updateFilterCondition(ci, { value: e.target.value })}
                                placeholder="Value"
                                className="flex-1 rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] min-w-[70px]"
                              />
                            )
                          )}

                          <button
                            onClick={() => removeFilterCondition(ci)}
                            className="grid h-6 w-6 place-items-center rounded hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer shrink-0"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[10px] text-[var(--muted)] italic">No filters</div>
                )}
              </div>
            )}
          </div>

          {/* Sort button */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setShowSort(!showSort)}
              className={`flex items-center gap-1 h-7 rounded-md px-2 text-[11px] transition cursor-pointer ${
                showSort || hasSorts
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
              }`}
              title="Sort"
            >
              <ArrowUpDown size={13} />
              {hasSorts && <span className="text-[10px]">{activeSorts.length}</span>}
            </button>
            {/* Sort popover */}
            {showSort && (
              <div className="absolute top-full right-0 mt-1 z-50 w-[300px] rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)]">Sort</span>
                  <button onClick={addSortKey} className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer">
                    + Add sort
                  </button>
                </div>
                {hasSorts ? (
                  <div className="space-y-1.5">
                    {activeSorts.map((s, si) => (
                      <div key={si} className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-[9px] text-[var(--muted)] w-4 shrink-0 text-center font-mono">{si + 1}.</span>
                        <select
                          value={s.columnId || ''}
                          onChange={(e) => updateSort(si, { columnId: e.target.value })}
                          className="flex-1 rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--text)] outline-none"
                        >
                          {db.properties.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => updateSort(si, { direction: s.direction === 'ascending' ? 'descending' : 'ascending' })}
                          className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] transition cursor-pointer ${
                            s.direction === 'ascending' ? 'text-[var(--accent)]' : 'text-[var(--secondary)]'
                          }`}
                        >
                          <ArrowUpDown size={10} />
                          {s.direction === 'ascending' ? 'Asc' : 'Desc'}
                        </button>
                        <button
                          onClick={() => moveSort(si, -1)}
                          disabled={si === 0}
                          className="grid h-5 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] disabled:opacity-20 cursor-pointer"
                        >
                          <ChevronDown size={10} className="rotate-180" />
                        </button>
                        <button
                          onClick={() => moveSort(si, 1)}
                          disabled={si === activeSorts.length - 1}
                          className="grid h-5 w-5 place-items-center rounded text-[var(--muted)] hover:bg-[var(--hover)] disabled:opacity-20 cursor-pointer"
                        >
                          <ChevronDown size={10} />
                        </button>
                        <button
                          onClick={() => removeSort(si)}
                          className="grid h-5 w-5 place-items-center rounded hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-[var(--muted)] italic">No sorts</div>
                )}
              </div>
            )}
          </div>

          <button onClick={() => setShowProperties(!showProperties)} className={`grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer ${showProperties ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : ''}`} title="Properties"><Settings2 size={13} /></button>

          {/* Automations (lightning) — stub */}
          <div className="relative" ref={automationsRef}>
            <button
              onClick={() => setAutomationsOpen(!automationsOpen)}
              className={`grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer ${automationsOpen ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : ''}`}
              title="Automations"
            >
              <Zap size={13} />
            </button>
            {automationsOpen && (
              <div className="absolute top-full right-0 mt-1 z-50 w-[200px] rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-3 shadow-xl text-center">
                <Zap size={18} className="mx-auto mb-1.5 text-[var(--accent)]" />
                <div className="text-[11px] font-semibold text-[var(--text)] mb-0.5">Automations</div>
                <div className="text-[10px] text-[var(--muted)]">Coming soon — trigger actions on row changes.</div>
              </div>
            )}
          </div>

          {/* AI (sparkle) — stub */}
          <div className="relative" ref={aiRef}>
            <button
              onClick={() => setAiOpen(!aiOpen)}
              className={`grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer ${aiOpen ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : ''}`}
              title="Ask AI about this data"
            >
              <Sparkles size={13} />
            </button>
            {aiOpen && (
              <div className="absolute top-full right-0 mt-1 z-50 w-[200px] rounded-lg border border-[var(--border)] bg-[var(--elevated)] p-3 shadow-xl text-center">
                <Sparkles size={18} className="mx-auto mb-1.5 text-[var(--accent)]" />
                <div className="text-[11px] font-semibold text-[var(--text)] mb-0.5">Ask AI</div>
                <div className="text-[10px] text-[var(--muted)]">Coming soon — query and summarize this database.</div>
              </div>
            )}
          </div>

          {/* Expand / fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer"
            title={isFullscreen ? "Exit fullscreen" : "Open in fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {/* Split "New" button + dropdown */}
          <div className="relative flex items-stretch ml-1" ref={newDropdownRef}>
            <button
              onClick={() => ops.addRow()}
              className="flex items-center gap-1 rounded-l-md bg-[var(--accent)] px-2.5 h-7 text-[11px] font-semibold text-white hover:opacity-90 transition cursor-pointer"
            >
              <Plus size={13} />
              New
            </button>
            <button
              onClick={() => setNewDropdownOpen(!newDropdownOpen)}
              className="rounded-r-md bg-[var(--accent)] px-1 h-7 text-white hover:opacity-90 transition cursor-pointer border-l border-white/20"
              title="More creation options"
            >
              <ChevronDown size={12} />
            </button>
            {newDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 z-50 min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--elevated)] py-1 shadow-xl">
                <button
                  onClick={() => { ops.addRow(); setNewDropdownOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-[var(--text)] hover:bg-[var(--hover)] cursor-pointer"
                >
                  <Plus size={12} /> New page
                </button>
                <button
                  onClick={() => { onToast?.("New with AI coming soon"); setNewDropdownOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-[var(--text)] hover:bg-[var(--hover)] cursor-pointer"
                >
                  <Sparkles size={12} /> New with AI
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter pills row */}
      {hasFilters && !showFilter && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
          {filterPills.map((pill, i) => (
            <button
              key={i}
              onClick={() => setShowFilter(true)}
              className="flex items-center gap-1 rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] text-[var(--accent)] hover:bg-[var(--accent)]/20 transition cursor-pointer"
            >
              {pill.label}
              <X size={9} onClick={(e) => { e.stopPropagation(); removeFilterCondition(pill.idx); }} />
            </button>
          ))}
        </div>
      )}

      {/* Properties panel */}
      {showProperties && (
        <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)]">
            {activeView?.name || 'View'} — Column visibility
          </div>
          <div className="space-y-0.5 mb-3">
            {db.properties.map(prop => {

              const isHidden = hiddenSet.has(prop.id);
              const canHide = prop.id !== 'name';
              return (
                <div key={prop.id} className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--hover)] group">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => canHide && toggleHidden(prop.id)}
                      disabled={!canHide}
                      className={`grid h-5 w-5 place-items-center rounded cursor-pointer ${
                        isHidden ? 'text-[var(--muted)]' : 'text-[var(--accent)]'
                      } ${!canHide ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[var(--surface)]'}`}
                      title={isHidden ? 'Show column' : 'Hide column'}
                    >
                      {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <span className="text-[var(--muted)]">{PROPERTY_TYPES[prop.type]?.icon || 'Aa'}</span>
                    <span className={isHidden ? 'text-[var(--muted)] line-through' : ''}>{prop.name}</span>
                    <span className="text-[9px] text-[var(--muted)] uppercase">{prop.type}</span>
                  </div>
                  <button
                    onClick={() => prop.id !== 'name' && ops.removeProperty(prop.id)}
                    disabled={prop.id === 'name'}
                    className="grid h-5 w-5 place-items-center rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] disabled:opacity-0 cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={propertyDraft}
              onChange={(e) => setPropertyDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddProperty(); }}
              placeholder="New property name..."
              className="flex-1 rounded border border-[var(--border)] bg-transparent px-2 py-1 text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            <select
              value="text"
              onChange={(e) => {
                const name = propertyDraft.trim();
                // Cast: this <select>'s <option> values are generated
                // exhaustively from `Object.entries(PROPERTY_TYPES)` just
                // below, so `e.target.value` can only ever be one of
                // PROPERTY_TYPES' own keys — every one of which is already
                // a real PropertyType (PROPERTY_TYPES is typed
                // `Record<PropertyType, ...>` in types/database.ts). A raw
                // DOM <select> value is always `string` to the type
                // checker regardless, so this documents that closed set
                // rather than being a genuine unknown-value assertion.
                if (name) { ops.addProperty(name, e.target.value as import("./types/database").PropertyType); setPropertyDraft(""); }
              }}
              className="rounded border border-[var(--border)] bg-transparent px-2 py-1 text-[11px] text-[var(--text)] outline-none"
            >
              {Object.entries(PROPERTY_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="mt-3">
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">{cat.label}</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(PROPERTY_TYPES).filter(([_, v]) => v.category === cat.id).map(([k, v]) => (
                  <button
                    key={k}
                    // Cast: same rationale as the <select> above — `k` here
                    // comes from `Object.entries(PROPERTY_TYPES)`, so it's
                    // always a real PropertyType key; Object.entries widens
                    // string-literal-keyed records to plain `string` keys
                    // by design (TS can't prove exhaustiveness through it).
                    onClick={() => ops.addProperty(k.charAt(0).toUpperCase() + k.slice(1), k as import("./types/database").PropertyType)}
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
                  >
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty / filtered state — Edit filters + New page buttons */}
      {filteredRows.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-10 px-4">
          {hasFilters && (
            <button
              onClick={() => setShowFilter(true)}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
            >
              Edit filters
            </button>
          )}
          <button
            onClick={() => ops.addRow()}
            className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
          >
            <Plus size={13} /> New page
          </button>
        </div>
      )}

      {/* Main view */}
      <div className="p-1">
        <DatabaseView
          type={activeView?.type || 'table'}
          rows={filteredRows}
          properties={db.properties}
          onPatchRow={ops.patchRow}
          onDeleteRow={ops.removeRow}
          onDuplicateRow={(id: string) => ops.duplicateRows([id])}
          onAddRow={() => ops.addRow()}
          activeView={activeView}
          onPatchView={ops.patchView}
          onRowClick={handleRowClick}
        />
      </div>

      {peekRow && (
        <PeekPanel
          row={peekRow}
          database={db}
          properties={db.properties}
          onPatchRow={ops.patchRow}
          onClose={() => setPeekRowId(null)}
          mode="right"
          onOpenFull={(id: string) => { onOpenRow?.(id); setPeekRowId(null); }}
          // PeekPanel.jsx (src/modules/page/**, out of scope for this
          // conversion) destructures `children` but never renders it in
          // its JSX body — a pre-existing dead prop. This call site never
          // passed children either; passing `undefined` explicitly
          // documents that (same dead-prop pattern used throughout this
          // migration for untyped/untouched sibling components) rather
          // than silently omitting a prop that page's inferred type
          // treats as required.
          children={undefined}
        />
      )}
    </div>
  );
}
