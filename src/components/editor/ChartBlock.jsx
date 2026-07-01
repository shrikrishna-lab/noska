import React, { useState, useMemo } from "react";
import { BarChart3, Plus, Trash2, Settings2 } from "lucide-react";

/**
 * ChartBlock — editable, data-driven chart (bar-v, bar-h, line, donut, number).
 * Data lives on block.chart = { title, series: [{ label, value, color }], unit }.
 * Falls back to sensible sample data on first insert so it looks great immediately
 * (matching the slash-menu preview), then the user personalizes it.
 */

const PALETTE = ["var(--accent)", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#ef4444"];

const SAMPLES = {
  "bar-chart-v": { title: "Quarterly revenue", unit: "", series: [
    { label: "Q1", value: 42 }, { label: "Q2", value: 68 }, { label: "Q3", value: 51 }, { label: "Q4", value: 90 },
  ] },
  "bar-chart-h": { title: "Traffic by source", unit: "", series: [
    { label: "Search", value: 78 }, { label: "Direct", value: 55 }, { label: "Social", value: 40 }, { label: "Email", value: 25 },
  ] },
  "line-chart": { title: "Weekly active users", unit: "", series: [
    { label: "Mon", value: 30 }, { label: "Tue", value: 52 }, { label: "Wed", value: 44 },
    { label: "Thu", value: 68 }, { label: "Fri", value: 60 }, { label: "Sat", value: 82 },
  ] },
  "donut-chart": { title: "Task status", unit: "", series: [
    { label: "Done", value: 62 }, { label: "In progress", value: 24 }, { label: "To do", value: 14 },
  ] },
  "number-chart": { title: "Page interactions", unit: "", series: [{ label: "Total", value: 1248 }] },
};

function withColors(series) {
  return series.map((s, i) => ({ ...s, color: s.color || PALETTE[i % PALETTE.length] }));
}

function getChartData(block) {
  if (block.chart && Array.isArray(block.chart.series) && block.chart.series.length) {
    return { ...block.chart, series: withColors(block.chart.series) };
  }
  const sample = SAMPLES[block.type] || SAMPLES["bar-chart-v"];
  return { ...sample, title: block.text || sample.title, series: withColors(sample.series) };
}

export default function ChartBlock({ block, onPatch, isLocked }) {
  const data = useMemo(() => getChartData(block), [block]);
  const [editing, setEditing] = useState(false);
  const max = Math.max(1, ...data.series.map((s) => Number(s.value) || 0));

  const commit = (next) => onPatch({ chart: { title: next.title, unit: next.unit || "", series: next.series }, text: next.title });

  const updateTitle = (title) => commit({ ...data, title });
  const updateRow = (idx, patch) => commit({ ...data, series: data.series.map((s, i) => i === idx ? { ...s, ...patch } : s) });
  const addRow = () => commit({ ...data, series: [...data.series, { label: `Item ${data.series.length + 1}`, value: 20, color: PALETTE[data.series.length % PALETTE.length] }] });
  const removeRow = (idx) => commit({ ...data, series: data.series.filter((_, i) => i !== idx) });

  const kind = block.type;

  return (
    <div className="my-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 size={14} className="text-[var(--accent)] shrink-0" />
          {isLocked ? (
            <span className="text-sm font-semibold text-[var(--text)] truncate">{data.title}</span>
          ) : (
            <input
              value={data.title}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="Chart title"
              className="text-sm font-semibold text-[var(--text)] bg-transparent outline-none focus:border-b focus:border-[var(--accent)] min-w-0 flex-1"
            />
          )}
        </div>
        {!isLocked && (
          <button
            onClick={() => setEditing((e) => !e)}
            title="Edit data"
            className={`shrink-0 p-1.5 rounded-lg transition cursor-pointer ${editing ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"}`}
          >
            <Settings2 size={14} />
          </button>
        )}
      </div>

      {/* Chart canvas */}
      <div className="px-4 pb-4">
        <ChartCanvas kind={kind} data={data} max={max} />
      </div>

      {/* Data editor */}
      {editing && !isLocked && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Data</div>
          <div className="space-y-1.5">
            {data.series.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="color"
                  value={toHex(s.color)}
                  onChange={(e) => updateRow(i, { color: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border border-[var(--border)] bg-transparent p-0"
                  title="Series color"
                />
                <input
                  value={s.label}
                  onChange={(e) => updateRow(i, { label: e.target.value })}
                  placeholder="Label"
                  className="flex-1 min-w-0 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                />
                <input
                  type="number"
                  value={s.value}
                  onChange={(e) => updateRow(i, { value: Number(e.target.value) })}
                  className="w-20 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={() => removeRow(i)}
                  disabled={data.series.length <= 1}
                  className="p-1 rounded text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addRow}
            className="mt-2 flex items-center gap-1 rounded-md border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition cursor-pointer"
          >
            <Plus size={12} /> Add data point
          </button>
        </div>
      )}
    </div>
  );
}

// Normalizes CSS var / hex to a hex value for the native color input.
function toHex(color) {
  if (typeof color === "string" && color.startsWith("#")) return color.length === 4
    ? "#" + color.slice(1).split("").map((c) => c + c).join("")
    : color.slice(0, 7);
  return "#6b7cff"; // fallback for var()-based colors
}

function ChartCanvas({ kind, data, max }) {
  const series = data.series;

  if (kind === "number-chart") {
    const v = series[0]?.value ?? 0;
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="text-4xl font-black text-[var(--accent)] tabular-nums tracking-tight">
          {Number(v).toLocaleString()}{data.unit}
        </div>
        <div className="text-[11px] text-[var(--muted)] uppercase font-semibold tracking-wide mt-1">{series[0]?.label || "Metric"}</div>
      </div>
    );
  }

  if (kind === "bar-chart-v") {
    return (
      <div>
        <div className="flex items-end justify-around gap-2 h-40 pt-2">
          {series.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 group">
              <span className="text-[10px] font-semibold text-[var(--secondary)] tabular-nums opacity-0 group-hover:opacity-100 transition">{s.value}{data.unit}</span>
              <div
                className="w-full max-w-[46px] rounded-t-md transition-all"
                style={{ height: `${(Number(s.value) / max) * 100}%`, background: s.color, minHeight: 4 }}
              />
              <span className="text-[10px] text-[var(--muted)] truncate w-full text-center">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "bar-chart-h") {
    return (
      <div className="flex flex-col gap-2 py-2">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--muted)] w-16 truncate text-right shrink-0">{s.label}</span>
            <div className="flex-1 h-5 rounded-r-md rounded-l-sm bg-[var(--hover)] overflow-hidden">
              <div className="h-full rounded-r-md flex items-center justify-end pr-1.5" style={{ width: `${(Number(s.value) / max) * 100}%`, background: s.color, minWidth: 18 }}>
                <span className="text-[9px] font-bold text-white tabular-nums">{s.value}{data.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "line-chart") {
    return <LineChart series={series} max={max} unit={data.unit} />;
  }

  if (kind === "donut-chart") {
    return <DonutChart series={series} />;
  }

  return null;
}

function LineChart({ series, max, unit }) {
  const W = 320, H = 150, PAD = 20;
  const n = series.length;
  const stepX = n > 1 ? (W - PAD * 2) / (n - 1) : 0;
  const points = series.map((s, i) => ({
    x: PAD + i * stepX,
    y: H - PAD - (Number(s.value) / max) * (H - PAD * 2),
    s,
  }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${points[points.length - 1]?.x || PAD} ${H - PAD} L ${PAD} ${H - PAD} Z`;
  const color = series[0]?.color || "var(--accent)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[0, 0.5, 1].map((g) => (
        <line key={g} x1={PAD} x2={W - PAD} y1={PAD + g * (H - PAD * 2)} y2={PAD + g * (H - PAD * 2)} stroke="var(--border)" strokeWidth="1" />
      ))}
      <path d={area} fill="url(#lc-fill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          <text x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--muted)">{p.s.label}</text>
        </g>
      ))}
    </svg>
  );
}

function DonutChart({ series }) {
  const total = series.reduce((sum, s) => sum + (Number(s.value) || 0), 0) || 1;
  const R = 54, STROKE = 22, C = 2 * Math.PI * R;
  let offset = 0;
  const segments = series.map((s) => {
    const frac = (Number(s.value) || 0) / total;
    const seg = { color: s.color, label: s.label, value: s.value, dash: frac * C, gap: C - frac * C, offset: -offset * C };
    offset += frac;
    return seg;
  });
  const pct = Math.round(((Number(series[0]?.value) || 0) / total) * 100);

  return (
    <div className="flex items-center gap-5 py-2">
      <svg viewBox="0 0 140 140" className="shrink-0" style={{ width: 130, height: 130 }}>
        <g transform="rotate(-90 70 70)">
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--hover)" strokeWidth={STROKE} />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="70" cy="70" r={R} fill="none"
              stroke={seg.color} strokeWidth={STROKE}
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={seg.offset}
              strokeLinecap="butt"
            />
          ))}
        </g>
        <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--text)">{pct}%</text>
        <text x="70" y="82" textAnchor="middle" fontSize="9" fill="var(--muted)">{series[0]?.label}</text>
      </svg>
      <div className="flex flex-col gap-1.5 min-w-0">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-[var(--text)] truncate">{s.label}</span>
            <span className="text-[var(--muted)] tabular-nums ml-auto pl-2">{Math.round(((Number(s.value) || 0) / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
