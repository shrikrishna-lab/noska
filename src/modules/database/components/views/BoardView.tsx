import React, { useMemo, useState, useRef, useCallback } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { sortRowsByMultiple } from "../../utils/sortEngine";
import { colorForOption } from "../../utils/optionColors";
import { PageIcon } from "../../../../components/PageIcon";
import type { DatabaseRow, PropertyDefinition, ViewDefinition } from "../../types/database";

export interface BoardViewProps {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  onPatchRow: (rowId: string, patch: Partial<DatabaseRow>) => void;
  onAddRow: () => void;
  activeView: ViewDefinition;
  onRowClick?: (rowId: string) => void;
}

export default function BoardView({ rows, properties, onPatchRow, onAddRow, activeView, onRowClick }: BoardViewProps) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const dragRowRef = useRef<{ rowId: string; sourceCol: string } | null>(null);

  const groupBy = activeView.groupBy || 'status';
  const groupProp = properties.find(p => p.id === groupBy);
  const isSelectType = groupProp?.type === 'select' || groupProp?.type === 'status' || groupProp?.type === 'priority';

  // Apply within-group sorting using view's sorts config
  const sortConfig = (activeView.sorts && activeView.sorts.length > 0) ? activeView.sorts : null;

  const groups = useMemo(() => {
    const map: Record<string, DatabaseRow[]> = {};
    for (const row of rows) {
      const raw = row[groupBy];
      const key = (raw === undefined || raw === null || String(raw).trim() === '') ? '__no_status__' : String(raw);
      if (!map[key]) map[key] = [];
      map[key].push(row);
    }
    // Sort cards within each group
    if (sortConfig) {
      for (const key of Object.keys(map)) {
        map[key] = sortRowsByMultiple(map[key], sortConfig);
      }
    }
    return map;
  }, [rows, groupBy, sortConfig]);

  // Determine column order: first all defined options, then uncategorized
  const definedOptions = groupProp?.options || [];
  const groupKeys = useMemo(() => {
    const keys = definedOptions.filter(o => groups[o]);
    const extra = Object.keys(groups).filter(k => k !== '__no_status__' && !definedOptions.includes(k));
    const hasNoStatus = groups['__no_status__'];
    return [...keys, ...extra, ...(hasNoStatus ? ['__no_status__'] : [])];
  }, [definedOptions, groups]);

  // HTML5 drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, rowId: string, sourceCol: string) => {
    dragRowRef.current = { rowId, sourceCol };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rowId);
    // Add a small delay class for visual feedback
    setTimeout(() => {
      // Cast: React.DragEvent's `target` is typed `EventTarget`, which
      // lacks DOM traversal methods like `.closest()` — same DOM-typing
      // gap documented in earlier migration phases (Element→HTMLElement
      // casts in CommentThread.tsx/PageInspector.tsx). The board card's
      // onDragStart is only ever attached to a real HTMLElement (the card
      // div rendered below), so this narrows to what's already true at
      // runtime.
      (e.target as HTMLElement).closest('.board-card')?.classList.add('opacity-40');
    }, 0);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Same DOM-typing gap as handleDragStart above.
    (e.target as HTMLElement).closest('.board-card')?.classList.remove('opacity-40');
    setDragOverCol(null);
    dragRowRef.current = null;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCol(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetColKey: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const rowId = e.dataTransfer.getData('text/plain');
    if (!rowId) return;

    const targetValue = targetColKey === '__no_status__' ? '' : targetColKey;
    onPatchRow(rowId, { [groupBy]: targetValue });
    dragRowRef.current = null;
  }, [groupBy, onPatchRow]);

  const columnLabel = (key: string) => {
    if (key === '__no_status__') return 'No status';
    return key;
  };

  // Empty-state: no group (select/status) property configured yet.
  // Guides the user to add one instead of showing fake Kanban columns.
  if (!isSelectType) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] py-10 px-6 text-center min-h-[200px]">
        <div className="text-sm font-medium text-[var(--secondary)]">Board needs a grouping property</div>
        <p className="text-xs text-[var(--muted)] max-w-[280px]">
          Add a <span className="font-medium text-[var(--text)]">Select</span> or <span className="font-medium text-[var(--text)]">Status</span> property to organize cards into columns.
        </p>
        <button
          onClick={onAddRow}
          className="mt-1 flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--secondary)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition cursor-pointer"
        >
          <Plus size={13} /> Add a card
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[200px]">
      {groupKeys.map(key => {
        const colRows = groups[key] || [];
        const isOver = dragOverCol === key;
        return (
          <div
            key={key}
            className={`min-w-[240px] max-w-[280px] flex-1 rounded-lg border ${isOver ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--surface-2)]'} transition-colors`}
            onDragOver={(e) => handleDragOver(e, key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, key)}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--secondary)]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: key === '__no_status__' ? 'var(--muted)' : colorForOption(key).dot }} />
                {columnLabel(key)} <span className="ml-0.5 text-[var(--muted)] font-normal normal-case">{colRows.length}</span>
              </span>
            </div>
            <div className="space-y-1.5 p-2 min-h-[60px]">
              {colRows.map(row => {
                // Find up to 3 non-empty, non-name, non-groupBy properties to show as compact preview
                const previewProps = properties.filter(p =>
                  p.id !== 'name' &&
                  p.id !== groupBy &&
                  row[p.id] !== undefined &&
                  row[p.id] !== null &&
                  String(row[p.id]).trim() !== ''
                ).slice(0, 3);

                return (
                  <div
                    key={row.id}
                    className="board-card rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] shadow-sm hover:border-[var(--accent)]/50 transition cursor-pointer"
                    onClick={() => onRowClick?.(row.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, row.id, key)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base shrink-0 flex items-center justify-center">
                        <PageIcon icon={row.icon} size={14} fallback={<span>📄</span>} />
                      </span>
                      <span className="truncate font-medium text-[12px]">{row.name || 'Untitled'}</span>
                    </div>
                    {previewProps.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {previewProps.map(p => {
                          const val = row[p.id];
                          const display = Array.isArray(val) ? val.join(', ') : String(val);
                          return (
                            <span
                              key={p.id}
                              className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] max-w-[120px] truncate"
                              title={`${p.name}: ${display}`}
                            >
                              {display}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                onClick={onAddRow}
                className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--secondary)] transition cursor-pointer"
              >
                <Plus size={13} />
                <span>New</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
