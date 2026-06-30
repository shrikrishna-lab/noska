import React, { useState, useMemo, useCallback } from "react";
import { Settings2, Search, Plus, Filter, ArrowUpDown, X, Sparkles } from "lucide-react";
import DatabaseView from "./components/DatabaseView";
import { useDatabase } from "./hooks/useDatabase";
import { getActiveView, createView } from "./services/viewService";
import { PROPERTY_TYPES, CATEGORIES } from "./services/propertyService";
import { addProperty as addPropDef } from "./services/propertyService";
import PeekPanel from "../page/peek/PeekPanel";
import { generateAISummary, generateAITags } from "./services/aiService";

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
