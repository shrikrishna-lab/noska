import React, { useState } from "react";
import { PROPERTY_TYPES } from "../../database/types/database";

/**
 * Property renderer registry.
 * Each entry: { id, render: (value, onChange, options) => JSX, format: (value) => string }
 */

const REGISTRY = {};

export function registerPropertyType(typeId, config) {
  REGISTRY[typeId] = { ...config, id: typeId };
}

export function getPropertyRenderer(typeId) {
  return REGISTRY[typeId];
}

export function getPropertyValue(typeId, value, options) {
  const entry = REGISTRY[typeId];
  if (entry?.format) return entry.format(value, options);
  return String(value ?? "");
}

// --- Individual property renderers ---

registerPropertyType('text', {
  render: ({ value, onChange }) => (
    <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none" />
  ),
  format: (v) => String(v ?? ""),
});

registerPropertyType('number', {
  render: ({ value, onChange }) => (
    <input type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none" />
  ),
  format: (v) => String(v ?? "0"),
});

registerPropertyType('checkbox', {
  render: ({ value, onChange }) => (
    <input type="checkbox" checked={value === true || value === 'true'} onChange={(e) => onChange(e.target.checked)} className="accent-[var(--accent)] cursor-pointer" />
  ),
  format: (v) => v ? '☑' : '☐',
});

registerPropertyType('date', {
  render: ({ value, onChange }) => (
    <input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none cursor-pointer" />
  ),
  format: (v) => v ? new Date(v).toLocaleDateString() : "",
});

registerPropertyType('select', {
  render: ({ value, onChange, options }) => {
    const [open, setOpen] = useState(false);
    const opts = options || [];
    return (
      <div className="relative">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs hover:bg-[var(--hover)] cursor-pointer">
          {value || <span className="text-[var(--muted)]">—</span>}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute top-full left-0 z-20 mt-1 min-w-[120px] rounded-lg border border-[var(--border)] bg-[var(--elevated)] py-1 shadow-lg">
              {opts.map(opt => (
                <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`w-full px-2.5 py-1 text-left text-xs hover:bg-[var(--hover)] ${value === opt ? 'text-[var(--accent)] font-medium' : 'text-[var(--text)]'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  },
  format: (v) => String(v ?? ""),
});

registerPropertyType('multi-select', {
  render: ({ value, onChange, options }) => {
    const tags = Array.isArray(value) ? value : (value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : []);
    const [input, setInput] = useState("");
    const addTag = (t) => { if (t && !tags.includes(t)) { onChange([...tags, t]); setInput(""); } };
    const removeTag = (t) => onChange(tags.filter(x => x !== t));
    return (
      <div className="flex flex-wrap gap-0.5 items-center">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-0.5 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--secondary)]">
            {t}
            <button onClick={() => removeTag(t)} className="hover:text-red-400 cursor-pointer">&times;</button>
          </span>
        ))}
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { addTag(input.trim()); } if (e.key === ',' && input.trim()) { addTag(input.trim().replace(/,/g, '')); } }} placeholder="+" className="w-12 bg-transparent text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]" />
      </div>
    );
  },
  format: (v) => Array.isArray(v) ? v.join(', ') : String(v ?? ""),
});

registerPropertyType('status', {
  render: ({ value, onChange, options }) => {
    const opts = options || ['Not started', 'In progress', 'Done', 'Blocked'];
    const colors = { 'Not started': 'bg-gray-500/20 text-gray-400', 'In progress': 'bg-blue-500/20 text-blue-400', 'Done': 'bg-green-500/20 text-green-400', 'Blocked': 'bg-red-500/20 text-red-400' };
    return (
      <PropertySelect value={value} options={opts} onChange={onChange} colorMap={colors} />
    );
  },
  format: (v) => String(v ?? ""),
});

registerPropertyType('priority', {
  render: ({ value, onChange, options }) => {
    const opts = options || ['None', 'Low', 'Medium', 'High', 'Urgent'];
    const colors = { 'None': 'bg-gray-500/20 text-gray-400', 'Low': 'bg-blue-500/20 text-blue-400', 'Medium': 'bg-amber-500/20 text-amber-400', 'High': 'bg-orange-500/20 text-orange-400', 'Urgent': 'bg-red-500/20 text-red-400' };
    return (
      <PropertySelect value={value} options={opts} onChange={onChange} colorMap={colors} />
    );
  },
  format: (v) => String(v ?? ""),
});

registerPropertyType('url', {
  render: ({ value, onChange }) => (
    <input type="url" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https://..." className="w-full bg-transparent text-[13px] text-[var(--accent)] outline-none placeholder:text-[var(--muted)]" />
  ),
  format: (v) => String(v ?? ""),
});

registerPropertyType('email', {
  render: ({ value, onChange }) => (
    <input type="email" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="name@example.com" className="w-full bg-transparent text-[13px] text-[var(--accent)] outline-none placeholder:text-[var(--muted)]" />
  ),
  format: (v) => String(v ?? ""),
});

registerPropertyType('phone', {
  render: ({ value, onChange }) => (
    <input type="tel" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="+1 234 567 890" className="w-full bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]" />
  ),
  format: (v) => String(v ?? ""),
});

registerPropertyType('files', {
  render: ({ value }) => (
    <span className="text-[11px] text-[var(--muted)]">{value ? `📎 ${value}` : '—'}</span>
  ),
  format: (v) => String(v ?? ""),
});

// Auto types
['created-time', 'updated-time'].forEach(type => {
  registerPropertyType(type, {
    render: ({ value }) => (
      <span className="text-[11px] text-[var(--muted)]">{value ? new Date(value).toLocaleString() : '—'}</span>
    ),
    format: (v) => v ? new Date(v).toLocaleString() : "",
  });
});

['created-by', 'updated-by'].forEach(type => {
  registerPropertyType(type, {
    render: ({ value }) => (
      <span className="text-[11px] text-[var(--muted)]">{value || '—'}</span>
    ),
    format: (v) => String(v ?? ""),
  });
});

registerPropertyType('relation', {
  render: () => <span className="text-[11px] text-[var(--muted)] italic">Relation</span>,
  format: (v) => String(v ?? ""),
});

registerPropertyType('rollup', {
  render: () => <span className="text-[11px] text-[var(--muted)] italic">Rollup</span>,
  format: (v) => String(v ?? ""),
});

registerPropertyType('formula', {
  render: () => <span className="text-[11px] text-[var(--muted)] italic">Formula</span>,
  format: (v) => String(v ?? ""),
});

registerPropertyType('person', {
  render: ({ value }) => (
    <span className="text-[11px] text-[var(--text)]">{value || '—'}</span>
  ),
  format: (v) => String(v ?? ""),
});

registerPropertyType('ai-summary', {
  render: ({ value }) => (
    <span className="text-[11px] italic text-[var(--muted)]">{value || '(AI summary pending)'}</span>
  ),
  format: (v) => String(v ?? ""),
});

registerPropertyType('ai-tags', {
  render: ({ value }) => {
    const tags = Array.isArray(value) ? value : (value ? String(value).split(',').filter(Boolean) : []);
    return (
      <div className="flex flex-wrap gap-0.5">
        {tags.length === 0 && <span className="text-[11px] italic text-[var(--muted)]">(AI tags pending)</span>}
        {tags.map(t => <span key={t} className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-400">{t}</span>)}
      </div>
    );
  },
  format: (v) => Array.isArray(v) ? v.join(', ') : String(v ?? ""),
});

registerPropertyType('estimated-time', {
  render: ({ value }) => (
    <span className="text-[11px] text-[var(--text)]">{value ? `${value}h` : '—'}</span>
  ),
  format: (v) => v ? `${v}h` : "",
});

registerPropertyType('risk-score', {
  render: ({ value }) => {
    const score = Number(value) || 0;
    const color = score < 3 ? 'text-green-400' : score < 7 ? 'text-amber-400' : 'text-red-400';
    return <span className={`text-[11px] font-medium ${color}`}>{score.toFixed(1)}</span>;
  },
  format: (v) => String(Number(v || 0).toFixed(1)),
});

// --- Shared helper ---
function PropertySelect({ value, options, onChange, colorMap }) {
  const [open, setOpen] = useState(false);
  const color = colorMap?.[value] || 'bg-[var(--surface-2)] text-[var(--secondary)]';
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${color} hover:opacity-80 cursor-pointer`}>
        {value || <span className="text-[var(--muted)]">—</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-20 mt-1 min-w-[130px] rounded-lg border border-[var(--border)] bg-[var(--elevated)] py-1 shadow-lg">
            {options.map(opt => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`w-full px-2.5 py-1 text-left text-xs hover:bg-[var(--hover)] ${value === opt ? 'font-medium' : ''}`}>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function renderProperty(prop, value, onChange, options) {
  const entry = REGISTRY[prop.type];
  if (!entry) return <span className="text-[11px] text-[var(--muted)]">{String(value ?? "")}</span>;
  return entry.render({ value, onChange, options: options || prop.options, prop });
}

export function formatProperty(prop, value) {
  const entry = REGISTRY[prop.type];
  if (!entry) return String(value ?? "");
  return entry.format(value, prop.options);
}
