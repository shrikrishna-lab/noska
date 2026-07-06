import React, { useState } from "react";
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { PROPERTY_TYPES } from "../../types/database";
import type { DatabaseRow, PropertyDefinition, ViewDefinition } from "../../types/database";
import { colorForOption } from "../../utils/optionColors";

export interface TableViewProps {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  onPatchRow: (rowId: string, patch: Partial<DatabaseRow>) => void;
  onDeleteRow?: (rowId: string) => void;
  onDuplicateRow?: (rowId: string | string[]) => void;
  onAddRow: () => void;
  activeView: ViewDefinition;
  onPatchView?: (patch: Partial<ViewDefinition>) => void;
  onRowClick?: (rowId: string) => void;
}

export default function TableView({ rows, properties, onPatchRow, onDeleteRow, onDuplicateRow, onAddRow, activeView, onPatchView, onRowClick }: TableViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ rowId: string; propId: string } | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const sortDir = activeView.sortAsc === false ? 'desc' : 'asc';

  const handleSort = (propId: string) => {
    if (activeView.sort === propId) {
      onPatchView?.({ sortAsc: activeView.sortAsc === false });
    } else {
      onPatchView?.({ sort: propId, sortAsc: true });
    }
  };

  const toggleSelect = (id: string) => {
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
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--muted)] font-normal text-[11px] leading-none w-3.5 text-center shrink-0" aria-hidden>
                    {PROPERTY_TYPES[prop.type]?.icon || 'Aa'}
                  </span>
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
                    const onMove = (ev: MouseEvent) => {
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
                  <button onClick={() => onDuplicateRow?.(row.id)} className="grid h-6 w-6 place-items-center rounded hover:bg-[var(--hover)] text-[var(--muted)] cursor-pointer" title="Duplicate"><Copy size={12} /></button>
                  <button onClick={() => onDeleteRow?.(row.id)} className="grid h-6 w-6 place-items-center rounded hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer" title="Delete"><Trash2 size={12} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--border)]">
        <button onClick={onAddRow} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)] transition cursor-pointer">
          <Plus size={13} />
          <span>New page</span>
        </button>
        {selectedIds.size > 1 && (
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span>{selectedIds.size} selected</span>
            <button onClick={() => { onDuplicateRow?.([...selectedIds]); setSelectedIds(new Set()); }} className="text-[var(--accent)] hover:underline cursor-pointer">Duplicate</button>
            <button onClick={() => { [...selectedIds].forEach(id => onDeleteRow?.(id)); setSelectedIds(new Set()); }} className="text-[var(--danger)] hover:underline cursor-pointer">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

interface CellRendererProps {
  row: DatabaseRow;
  prop: PropertyDefinition;
  editing: boolean;
  onStartEdit: () => void;
  onCommit: (value: unknown) => void;
  onCancel: () => void;
}

function CellRenderer({ row, prop, editing, onStartEdit, onCommit, onCancel }: CellRendererProps) {
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
      // Casts through this switch (`val as string`/`val as number`,
      // `e.target as HTMLInputElement`) all narrow `val`/`e.target` — typed
      // `unknown`/`EventTarget` respectively since DatabaseRow's index
      // signature and DOM event typings can't know the per-property-type
      // shape — down to what each specific `prop.type` branch guarantees
      // (select/status/priority values are always strings written by
      // propertyService.ts's option-backed properties; number properties
      // are always numbers per databaseService.ts's getDefaultValue; a
      // text <input>'s onKeyDown target is always the same
      // HTMLInputElement the onBlur handler right next to it already
      // narrows). Matches the original JS's implicit untyped access
      // exactly — no behavior change, just documenting the same
      // per-branch assumption the JSX already relied on.
      return <SelectCell value={val as string} options={prop.options || []} onChange={onCommit} />;
    case 'multi-select':
      // onCommit passed as onChange for parity with the original call site,
      // even though MultiSelectCell never reads it (see the component's
      // own note below — preserved dead prop, not removed).
      return <MultiSelectCell value={val} onChange={onCommit} />;
    case 'date':
      return <input type="date" value={(val as string) || ''} onChange={(e) => onCommit(e.target.value)} className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none cursor-pointer" />;
    case 'number':
      return editing ? (
        <input type="number" defaultValue={val as number} autoFocus onBlur={(e) => onCommit(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onCommit((e.target as HTMLInputElement).value); if (e.key === 'Escape') onCancel(); }} className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none" />
      ) : (
        <span onClick={onStartEdit} className="cursor-text">{(val as number) ?? ''}</span>
      );
    case 'url':
      return (
        <a href={val as string} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline truncate block" onClick={(e) => { if (!val) e.preventDefault(); }}>
          {(val as string) || ''}
        </a>
      );
    case 'email':
      return (
        <a href={`mailto:${val as string}`} className="text-[var(--accent)] hover:underline truncate block">{(val as string) || ''}</a>
      );
    default:
      return editing ? (
        <input type="text" defaultValue={val as string} autoFocus onBlur={(e) => onCommit(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onCommit((e.target as HTMLInputElement).value); if (e.key === 'Escape') onCancel(); }} className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none" />
      ) : (
        <span onClick={onStartEdit} className="cursor-text truncate block">{(val as string) || ''}</span>
      );
  }
}

interface SelectCellProps {
  value: string | undefined;
  options: string[];
  onChange: (value: string) => void;
}

function SelectCell({ value, options, onChange }: SelectCellProps) {
  const [open, setOpen] = useState(false);
  const pill = (v: string) => {
    const c = colorForOption(v);
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium max-w-full truncate"
        style={{ background: c.fill, color: c.text }}>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
        <span className="truncate">{v}</span>
      </span>
    );
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-[var(--hover)] cursor-pointer max-w-full">
        {value ? pill(value) : <span className="text-[var(--muted)]">—</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-20 mt-1 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--elevated)] py-1 shadow-lg">
            {value && (
              <button onClick={() => { onChange(''); setOpen(false); }} className="w-full px-2.5 py-1 text-left text-xs text-[var(--muted)] italic hover:bg-[var(--hover)]">
                Clear
              </button>
            )}
            {options.map(opt => {
              const c = colorForOption(opt);
              return (
                <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} className="flex w-full items-center gap-2 px-2.5 py-1 text-left text-xs hover:bg-[var(--hover)]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.dot }} />
                  <span className={value === opt ? 'font-medium text-[var(--text)]' : 'text-[var(--text)]'}>{opt}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface MultiSelectCellProps {
  value: unknown;
  /** Accepted for parity with the call site but never read in the original
   * JS body either — this cell renders read-only pills with no tag-editing
   * UI wired up yet (the trailing "+ add" input has no onChange handler).
   * Preserved as a documented dead prop rather than invented functionality. */
  onChange?: (value: unknown) => void;
}

function MultiSelectCell({ value }: MultiSelectCellProps) {
  const tags: string[] = Array.isArray(value) ? value : (value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : []);
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(t => {
        const c = colorForOption(t);
        return (
          <span key={t} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: c.fill, color: c.text }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
            {t}
          </span>
        );
      })}
    </div>
  );
}
