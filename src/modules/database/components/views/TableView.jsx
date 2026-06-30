import React, { useState, useCallback } from "react";
import { Plus, GripVertical, Trash2, Copy, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";

/** @param {{ rows: import("../../types/database").DatabaseRow[], properties: import("../../types/database").PropertyDefinition[], onPatchRow, onDeleteRow, onDuplicateRow, onAddRow, activeView: import("../../types/database").ViewDefinition, onPatchView }} p */
export default function TableView({ rows, properties, onPatchRow, onDeleteRow, onDuplicateRow, onAddRow, activeView, onPatchView, onRowClick }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingCell, setEditingCell] = useState(null);
  const [columnWidths, setColumnWidths] = useState({});

  const sortDir = activeView.sortAsc === false ? 'desc' : 'asc';

  const handleSort = (propId) => {
    if (activeView.sort === propId) {
      onPatchView({ sortAsc: activeView.sortAsc === false });
    } else {
      onPatchView({ sort: propId, sortAsc: true });
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(rows.map(r => r.id)));
  };

  const hiddenSet = new Set(activeView.hiddenProperties || []);
  const visibleProps = properties.filter(p => !hiddenSet.has(p.id));

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
            <th className="w-8 px-2 py-2 text-left">
              <input
                type="checkbox"
                checked={selectedIds.size === rows.length && rows.length > 0}
                onChange={toggleSelectAll}
                className="cursor-pointer accent-[var(--accent)]"
              />
            </th>
            {visibleProps.map(prop => (
              <th
                key={prop.id}
                className="relative px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)] cursor-pointer select-none hover:bg-[var(--hover)] group"
                onClick={() => handleSort(prop.id)}
              >
                <div className="flex items-center gap-1">
                  <span>{prop.name}</span>
                  {activeView.sort === prop.id && (
                    sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 group-hover:opacity-100 bg-[var(--border)] hover:bg-[var(--accent)]"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startX = e.clientX;
                    const startW = columnWidths[prop.id] || 150;
                    const onMove = (ev) => {
                      const w = Math.max(60, startW + ev.clientX - startX);
                      setColumnWidths(p => ({ ...p, [prop.id]: w }));
                    };
                    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                  }}
                />
              </th>
            ))}
            <th className="w-10 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.id}
              className={`border-b border-[var(--border)] transition hover:bg-[var(--hover)]/50 ${selectedIds.has(row.id) ? 'bg-[var(--accent)]/5' : ''} cursor-pointer`}
              onClick={() => onRowClick?.(row.id)}
            >
              <td className="px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={selectedIds.has(row.id)}
                  onChange={() => toggleSelect(row.id)}
                  className="cursor-pointer accent-[var(--accent)]"
                />
              </td>
              {visibleProps.map(prop => (
                <td key={prop.id} className="px-3 py-1.5 max-w-[220px] truncate">
                  <CellRenderer
                    row={row}
                    prop={prop}
                    editing={editingCell?.rowId === row.id && editingCell?.propId === prop.id}
                    onStartEdit={() => setEditingCell({ rowId: row.id, propId: prop.id })}
                    onCommit={(val) => {
                      onPatchRow(row.id, { [prop.id]: val });
                      setEditingCell(null);
                    }}
                    onCancel={() => setEditingCell(null)}
                  />
                </td>
              ))}
              <td className="px-2 py-1.5">
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => onDuplicateRow(row.id)} className="grid h-6 w-6 place-items-center rounded hover:bg-[var(--hover)] text-[var(--muted)] cursor-pointer" title="Duplicate"><Copy size={12} /></button>
                  <button onClick={() => onDeleteRow(row.id)} className="grid h-6 w-6 place-items-center rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400 cursor-pointer" title="Delete"><Trash2 size={12} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--border)]">
        <button onClick={onAddRow} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)] transition cursor-pointer">
          <Plus size={13} />
          <span>New</span>
        </button>
        {selectedIds.size > 1 && (
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span>{selectedIds.size} selected</span>
            <button onClick={() => { onDuplicateRow([...selectedIds]); setSelectedIds(new Set()); }} className="text-[var(--accent)] hover:underline cursor-pointer">Duplicate</button>
            <button onClick={() => { [...selectedIds].forEach(id => onDeleteRow(id)); setSelectedIds(new Set()); }} className="text-red-400 hover:underline cursor-pointer">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CellRenderer({ row, prop, editing, onStartEdit, onCommit, onCancel }) {
  const val = row[prop.id];

  switch (prop.type) {
    case 'checkbox': {
      const checked = val === true || val === 'true';
      return (
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCommit(e.target.checked)}
          className="accent-[var(--accent)] cursor-pointer"
        />
      );
    }
    case 'select':
    case 'status':
    case 'priority':
      return <SelectCell value={val} options={prop.options || []} onChange={onCommit} />;
    case 'multi-select':
      return <MultiSelectCell value={val} onChange={onCommit} />;
    case 'date':
      return <input type="date" value={val || ''} onChange={(e) => onCommit(e.target.value)} className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none cursor-pointer" />;
    case 'number':
      return editing ? (
        <input type="number" defaultValue={val} autoFocus onBlur={(e) => onCommit(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onCommit(e.target.value); if (e.key === 'Escape') onCancel(); }} className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none" />
      ) : (
        <span onClick={onStartEdit} className="cursor-text">{val ?? ''}</span>
      );
    case 'url':
      return (
        <a href={val} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline truncate block" onClick={(e) => { if (!val) e.preventDefault(); }}>
          {val || ''}
        </a>
      );
    case 'email':
      return (
        <a href={`mailto:${val}`} className="text-[var(--accent)] hover:underline truncate block">{val || ''}</a>
      );
    default:
      return editing ? (
        <input type="text" defaultValue={val} autoFocus onBlur={(e) => onCommit(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onCommit(e.target.value); if (e.key === 'Escape') onCancel(); }} className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none" />
      ) : (
        <span onClick={onStartEdit} className="cursor-text truncate block">{val || ''}</span>
      );
  }
}

function SelectCell({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs hover:bg-[var(--hover)] cursor-pointer">
        {value || <span className="text-[var(--muted)]">—</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-20 mt-1 min-w-[120px] rounded-lg border border-[var(--border)] bg-[var(--elevated)] py-1 shadow-lg">
            {options.map(opt => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`w-full px-2.5 py-1 text-left text-xs hover:bg-[var(--hover)] ${value === opt ? 'text-[var(--accent)] font-medium' : 'text-[var(--text)]'}`}>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MultiSelectCell({ value, onChange }) {
  const tags = Array.isArray(value) ? value : (value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : []);
  return (
    <div className="flex flex-wrap gap-0.5">
      {tags.map(t => (
        <span key={t} className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--secondary)]">{t}</span>
      ))}
    </div>
  );
}
