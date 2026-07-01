import React, { useState, useRef, useCallback } from "react";

export default function SimpleTable({ block, onPatch, isLocked }) {
  const table = block.table || [[""]];
  const colWidths = block.colWidths || [];
  const [resizing, setResizing] = useState(null);
  const tableRef = useRef(null);

  const setCell = (r, c, value) =>
    onPatch({
      table: table.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row))
    });

  const handleColResizeStart = useCallback((colIdx) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(colIdx);
    const startX = e.clientX;
    const startW = tableRef.current?.querySelectorAll("colgroup col")[colIdx]?.offsetWidth || 120;

    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      const newW = Math.max(40, Math.min(600, startW + delta));
      const cols = tableRef.current?.querySelectorAll("colgroup col");
      if (cols && cols[colIdx]) cols[colIdx].style.width = `${newW}px`;
    };

    const onUp = () => {
      setResizing(null);
      const cols = tableRef.current?.querySelectorAll("colgroup col");
      const widths = Array.from(cols || []).map(col => col.style.width || `${col.offsetWidth}px`);
      onPatch({ colWidths: widths });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [onPatch]);

  return (
    <div className="overflow-auto rounded border border-[var(--border)] scrollbar-thin" ref={tableRef}>
      <table className="w-full border-collapse text-sm">
        <colgroup>
          {table[0].map((_, c) => (
            <col key={c} style={{ width: colWidths[c] || undefined }} />
          ))}
        </colgroup>
        <tbody>
          {table.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className={`relative border border-[var(--border)] ${r === 0 ? "bg-[var(--panel)] font-semibold" : ""}`}>
                  <input
                    value={cell}
                    readOnly={isLocked}
                    onChange={(e) => setCell(r, c, e.target.value)}
                    className="w-full bg-transparent px-2 py-2 outline-none"
                  />
                  {!isLocked && c < row.length - 1 && (
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--accent)]/40 transition z-10"
                      style={{ transform: "translateX(50%)" }}
                      onMouseDown={handleColResizeStart(c)}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!isLocked && (
        <div className="flex gap-1 p-1">
          <button
            className="rounded px-2 py-1 text-xs hover:bg-[var(--hover)] cursor-pointer"
            onClick={() => onPatch({ table: [...table, Array(table[0].length).fill("")] })}
          >
            Add row
          </button>
          <button
            className="rounded px-2 py-1 text-xs hover:bg-[var(--hover)] cursor-pointer"
            onClick={() => onPatch({ table: table.map((row) => [...row, ""]) })}
          >
            Add column
          </button>
        </div>
      )}
    </div>
  );
}
