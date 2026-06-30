import React, { useState, useMemo, useCallback } from "react";
import { Settings2, Search, Plus, Filter, ArrowUpDown, X, Sparkles, Check } from "lucide-react";
import DatabaseView from "./components/DatabaseView";
import { useDatabase } from "./hooks/useDatabase";
import { getActiveView, createView } from "./services/viewService";
import { PROPERTY_TYPES, CATEGORIES } from "./services/propertyService";
import { addProperty as addPropDef } from "./services/propertyService";
import PeekPanel from "../page/peek/PeekPanel";
import { generateAISummary, generateAITags } from "./services/aiService";

const FILTER_OPERATORS = [
  { id: 'contains', label: 'Contains' },
  { id: 'equals', label: 'Equals' },
  { id: 'not-equals', label: 'Not equal' },
  { id: 'starts-with', label: 'Starts with' },
  { id: 'ends-with', label: 'Ends with' },
  { id: 'is-empty', label: 'Is empty' },
  { id: 'is-not-empty', label: 'Is not empty' },
  { id: 'greater-than', label: 'Greater than' },
  { id: 'less-than', label: 'Less than' },
  { id: 'before', label: 'Before' },
  { id: 'after', label: 'After' },
];

export default function DatabasePage({ database, onPatch, onOpenRow, pageId, apiKey, aiProvider }) {
  const db = database || { properties: [], views: [], rows: [], activeViewId: '' };

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [propertyDraft, setPropertyDraft] = useState("");
  const [peekRowId, setPeekRowId] = useState(null);

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

  const handleViewChange = useCallback((type) => ops.ensureView(type), [ops]);

  const handleRowClick = useCallback((rowId) => {
    setPeekRowId(rowId);
  }, []);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-1">
          {['table', 'board', 'calendar', 'timeline', 'gallery', 'list', 'graph'].map(type => (
            <button
              key={type}
              onClick={() => handleViewChange(type)}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition cursor-pointer capitalize ${
                activeView?.type === type ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
              }`}
            >
              {type}
            </button>
          ))}
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
          {apiKey && (
            <button
              onClick={async () => {
                const aiApi = { query: async (prompt) => { const { runAI } = await import("../../utils/ai"); return runAI(prompt, { apiKey, provider: aiProvider }); } };
                for (const row of db.rows.slice(0, 5)) {
                  const summary = await generateAISummary(row, aiApi);
                  if (summary) ops.patchRow(row.id, { 'ai-summary': summary });
                }
              }}
              className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--accent)] cursor-pointer"
              title="Generate AI summaries"
            >
              <Sparkles size={13} />
            </button>
          )}
          <button onClick={() => setShowFilter(!showFilter)} className={`grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer ${showFilter ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : ''}`} title="Filter"><Filter size={13} /></button>
          <button onClick={() => setShowSort(!showSort)} className={`grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer ${showSort ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : ''}`} title="Sort"><ArrowUpDown size={13} /></button>
          <button onClick={() => setShowProperties(!showProperties)} className={`grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] cursor-pointer ${showProperties ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : ''}`} title="Properties"><Settings2 size={13} /></button>
        </div>
      </div>

      {showFilter && (
        <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)]">Filter</span>
            <button
              onClick={() => {
                const group = activeView?.filterGroup || { op: 'and', conditions: [], groups: [] };
                ops.patchView({ filterGroup: { ...group, conditions: [...group.conditions, { property: db.properties[0]?.id || 'name', operator: 'contains', value: '' }] } });
              }}
              className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
            >
              + Add condition
            </button>
          </div>
          {activeView?.filterGroup?.conditions?.length > 0 ? (
            <div className="space-y-1.5">
              {activeView.filterGroup.conditions.map((cond, ci) => (
                <div key={ci} className="flex items-center gap-1.5 text-[11px]">
                  {ci === 0 && (
                    <span className="text-[9px] font-bold uppercase text-[var(--muted)] w-6 shrink-0">{activeView.filterGroup.op}</span>
                  )}
                  {ci > 0 && (
                    <button
                      onClick={() => ops.patchView({ filterGroup: { ...activeView.filterGroup, op: activeView.filterGroup.op === 'and' ? 'or' : 'and' } })}
                      className="text-[9px] font-bold uppercase text-[var(--accent)] hover:underline w-6 shrink-0 cursor-pointer"
                    >
                      {activeView.filterGroup.op}
                    </button>
                  )}
                  <select
                    value={cond.property}
                    onChange={(e) => {
                      const next = [...activeView.filterGroup.conditions];
                      next[ci] = { ...next[ci], property: e.target.value };
                      ops.patchView({ filterGroup: { ...activeView.filterGroup, conditions: next } });
                    }}
                    className="rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--text)] outline-none max-w-[110px]"
                  >
                    {db.properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    value={cond.operator}
                    onChange={(e) => {
                      const next = [...activeView.filterGroup.conditions];
                      next[ci] = { ...next[ci], operator: e.target.value };
                      ops.patchView({ filterGroup: { ...activeView.filterGroup, conditions: next } });
                    }}
                    className="rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--text)] outline-none max-w-[100px]"
                  >
                    {FILTER_OPERATORS.map(op => (
                      <option key={op.id} value={op.id}>{op.label}</option>
                    ))}
                  </select>
                  {cond.operator !== 'is-empty' && cond.operator !== 'is-not-empty' && (
                    <input
                      value={cond.value}
                      onChange={(e) => {
                        const next = [...activeView.filterGroup.conditions];
                        next[ci] = { ...next[ci], value: e.target.value };
                        ops.patchView({ filterGroup: { ...activeView.filterGroup, conditions: next } });
                      }}
                      placeholder="Value"
                      className="flex-1 rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] min-w-[80px]"
                    />
                  )}
                  <button
                    onClick={() => {
                      const next = activeView.filterGroup.conditions.filter((_, i) => i !== ci);
                      ops.patchView({ filterGroup: next.length > 0 ? { ...activeView.filterGroup, conditions: next } : null });
                    }}
                    className="grid h-6 w-6 place-items-center rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400 cursor-pointer shrink-0"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-[var(--muted)] italic">No filters — click + Add condition to start</div>
          )}
        </div>
      )}

      {showSort && (
        <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)]">Sort</div>
          <div className="flex items-center gap-2">
            <select
              value={activeView?.sort || ''}
              onChange={(e) => ops.patchView({ sort: e.target.value || null })}
              className="rounded border border-[var(--border)] bg-transparent px-2 py-1 text-[11px] text-[var(--text)] outline-none"
            >
              <option value="">None</option>
              {db.properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {activeView?.sort && (
              <button
                onClick={() => ops.patchView({ sortAsc: activeView.sortAsc !== false ? false : true })}
                className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] cursor-pointer transition ${
                  activeView.sortAsc !== false ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--secondary)] hover:bg-[var(--hover)]'
                }`}
              >
                <ArrowUpDown size={11} />
                {activeView.sortAsc !== false ? 'Asc' : 'Desc'}
              </button>
            )}
          </div>
        </div>
      )}

      {showProperties && (
        <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)]">Properties</div>
          <div className="space-y-1">
            {db.properties.map(prop => (
              <div key={prop.id} className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--hover)] group">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--muted)]">{PROPERTY_TYPES[prop.type]?.icon || 'Aa'}</span>
                  <span>{prop.name}</span>
                  <span className="text-[9px] text-[var(--muted)] uppercase">{prop.type}</span>
                </div>
                <button
                  onClick={() => prop.id !== 'name' && ops.removeProperty(prop.id)}
                  disabled={prop.id === 'name'}
                  className="grid h-5 w-5 place-items-center rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400 disabled:opacity-0 cursor-pointer"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
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
