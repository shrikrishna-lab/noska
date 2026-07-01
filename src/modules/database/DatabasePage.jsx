import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Settings2, Search, Plus, Filter, ArrowUpDown, X, Sparkles, Check, ChevronDown, GripVertical, Eye, EyeOff } from "lucide-react";
import DatabaseView from "./components/DatabaseView";
import { useDatabase } from "./hooks/useDatabase";
import { getActiveView, createView } from "./services/viewService";
import { PROPERTY_TYPES, CATEGORIES } from "./services/propertyService";
import { addProperty as addPropDef } from "./services/propertyService";
import { operatorsForType } from "./utils/filterEngine";
import PeekPanel from "../page/peek/PeekPanel";
import { generateAISummary, generateAITags } from "./services/aiService";

export default function DatabasePage({ database, onPatch, onOpenRow, pageId, apiKey, aiProvider }) {
  const db = {
    properties: [],
    views: [],
    rows: [],
    activeViewId: '',
    ...(database || {}),
  };
  if (!db.views) db.views = [];
  if (!db.activeViewId) db.activeViewId = '';

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [propertyDraft, setPropertyDraft] = useState("");
  const [peekRowId, setPeekRowId] = useState(null);
  const [createViewOpen, setCreateViewOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewType, setNewViewType] = useState("table");

  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const createRef = useRef(null);

  // Close popovers on outside click
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSort(false);
      if (createRef.current && !createRef.current.contains(e.target)) setCreateViewOpen(false);
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

  const handleRowClick = useCallback((rowId) => {
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
    const filters = activeView.filters || { operator: 'and', conditions: [] };
    ops.patchView({
      filters: {
        ...filters,
        conditions: [...filters.conditions, { columnId: firstProp?.id || 'name', condition: defaultOp, value: '' }],
      },
    });
  };

  const updateFilterCondition = (idx, patch) => {
    const filters = activeView.filters || { operator: 'and', conditions: [] };
    const next = [...filters.conditions];
    next[idx] = { ...next[idx], ...patch };
    ops.patchView({ filters: { ...filters, conditions: next } });
  };

  const removeFilterCondition = (idx) => {
    const filters = activeView.filters || { operator: 'and', conditions: [] };
    const next = filters.conditions.filter((_, i) => i !== idx);
    ops.patchView({ filters: next.length > 0 ? { ...filters, conditions: next } : null });
  };

  const toggleFilterOp = () => {
    const filters = activeView.filters || { operator: 'and', conditions: [] };
    ops.patchView({ filters: { ...filters, operator: filters.operator === 'and' ? 'or' : 'and' } });
  };

  // --- Sort helpers ---
  const activeSorts = activeView?.sorts || [];
  const hasSorts = activeSorts.length > 0 && activeSorts[0]?.columnId;

  const addSortKey = () => {
    const firstProp = db.properties[0];
    const sorts = [...(activeView.sorts || [])];
    sorts.push({ columnId: firstProp?.id || 'name', direction: 'ascending' });
    ops.patchView({ sorts });
  };

  const updateSort = (idx, patch) => {
    const sorts = [...(activeView.sorts || [])];
    sorts[idx] = { ...sorts[idx], ...patch };
    ops.patchView({ sorts });
  };

  const removeSort = (idx) => {
    let sorts = [...(activeView.sorts || [])];
    sorts = sorts.filter((_, i) => i !== idx);
    ops.patchView({ sorts });
  };

  const moveSort = (idx, dir) => {
    const sorts = [...(activeView.sorts || [])];
    const target = idx + dir;
    if (target < 0 || target >= sorts.length) return;
    [sorts[idx], sorts[target]] = [sorts[target], sorts[idx]];
    ops.patchView({ sorts });
  };

  // --- View tab helpers ---
  const switchView = (viewId) => {
    ops.patchView({}); // no-op to trigger re-render; we set activeViewId directly
    onPatch({ ...db, activeViewId: viewId });
  };

  const viewTypeNames = { table: 'Table', board: 'Board', gallery: 'Gallery', list: 'List' };

  const handleCreateView = () => {
    const name = newViewName.trim() || (viewTypeNames[newViewType] || 'View');
    ops.addNamedView(newViewType, name);
    setCreateViewOpen(false);
    setNewViewName("");
  };

  // --- Column visibility helpers ---
  const hiddenSet = new Set(activeView?.hiddenProperties || []);
  const toggleHidden = (propId) => {
    const next = new Set(hiddenSet);
    if (next.has(propId)) next.delete(propId); else next.add(propId);
    ops.patchView({ hiddenProperties: [...next] });
  };

  // Convert filter conditions to display pills
  const filterPills = useMemo(() => {
    if (!hasFilters) return [];
    return activeFilters.map((c, i) => {
      const prop = db.properties.find(p => p.id === c.columnId);
      return { label: `${prop?.name || c.columnId}: ${c.value || c.condition}`, idx: i };
    });
  }, [activeFilters, db.properties]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden relative">
      {/* View tabs + toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-1">
          {db.views.map(view => (
            <button
              key={view.id}
              onClick={() => switchView(view.id)}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                activeView?.id === view.id
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
              }`}
            >
              {view.name}
            </button>
          ))}
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
                  {['table', 'board', 'gallery', 'list'].map(t => (
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
                      const opsForType = operatorsForType(propType);
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
                if (name) { ops.addProperty(name, e.target.value); setPropertyDraft(""); }
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
                    onClick={() => ops.addProperty(k.charAt(0).toUpperCase() + k.slice(1), k)}
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

      {/* Main view */}
      <div className="p-1">
        <DatabaseView
          type={activeView?.type || 'table'}
          rows={filteredRows}
          properties={db.properties}
          onPatchRow={ops.patchRow}
          onDeleteRow={ops.removeRow}
          onDuplicateRow={(id) => ops.duplicateRows([id])}
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
          onOpenFull={(id) => { onOpenRow?.(id); setPeekRowId(null); }}
        />
      )}
    </div>
  );
}
