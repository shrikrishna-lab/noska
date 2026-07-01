import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Eye, EyeOff, Lock, Plus, Trash2, GripVertical, ChevronDown, Table2 } from "lucide-react";
import { uid } from "../utils/helpers";

export default function FormsBlock({ block, onPatch, isLocked }) {
  const config = block.formConfig || {
    fields: [],
    submitButtonText: "Submit",
    anonymous: false,
    showResults: false
  };
  const submissions = block.submissions || [];
  const [formData, setFormData] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState(false);

  const fieldTypes = ["text", "textarea", "email", "number", "select", "checkbox", "date"];

  const addField = () => {
    const fields = [...(config.fields || []), { id: uid(), type: "text", label: "New field", required: false, options: [], visibleWhen: null }];
    onPatch({ formConfig: { ...config, fields } });
  };

  const updateField = (id, patch) => {
    const fields = (config.fields || []).map(f => f.id === id ? { ...f, ...patch } : f);
    onPatch({ formConfig: { ...config, fields } });
  };

  const removeField = (id) => {
    const fields = (config.fields || []).filter(f => f.id !== id);
    onPatch({ formConfig: { ...config, fields } });
  };

  const isFieldVisible = (field) => {
    if (!field.visibleWhen) return true;
    return formData[field.visibleWhen.fieldId] === field.visibleWhen.value;
  };

  const validate = () => {
    const newErrors = {};
    for (const f of config.fields) {
      if (!isFieldVisible(f)) continue;
      if (f.required && !formData[f.id]?.trim()) {
        newErrors[f.id] = `${f.label} is required`;
      }
      if (f.type === "email" && formData[f.id] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData[f.id])) {
        newErrors[f.id] = "Invalid email";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const submission = {
      id: uid(),
      data: { ...formData },
      createdAt: new Date().toISOString(),
      userId: config.anonymous ? null : "local",
      userName: config.anonymous ? "Anonymous" : "You"
    };
    onPatch({ submissions: [...submissions, submission], formConfig: { ...config, showResults: true } });
    setFormData({});
    setSubmitted(true);
    setErrors({});
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Edit Form</span>
            <button
              onClick={() => setEditing(false)}
              className="rounded px-2 py-0.5 text-[10px] text-[var(--accent)] hover:bg-[var(--hover)] cursor-pointer"
            >
              Done
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[10px] text-[var(--muted)] cursor-pointer">
              <input type="checkbox" checked={config.anonymous} onChange={(e) => onPatch({ formConfig: { ...config, anonymous: e.target.checked } })} className="accent-[var(--accent)]" />
              Anonymous
            </label>
            <label className="flex items-center gap-1 text-[10px] text-[var(--muted)] cursor-pointer">
              <input type="checkbox" checked={config.showResults} onChange={(e) => onPatch({ formConfig: { ...config, showResults: e.target.checked } })} className="accent-[var(--accent)]" />
              Show results
            </label>
          </div>
        </div>
        {(config.fields || []).map((f, idx) => (
          <div key={f.id} className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2">
            <GripVertical size={14} className="mt-1.5 text-[var(--muted)] shrink-0" />
            <div className="flex-1 space-y-1.5">
              <input
                value={f.label}
                onChange={(e) => updateField(f.id, { label: e.target.value })}
                className="w-full bg-transparent text-xs font-medium outline-none"
                placeholder="Field label"
              />
              <div className="flex items-center gap-1.5">
                <select
                  value={f.type}
                  onChange={(e) => updateField(f.id, { type: e.target.value, options: e.target.value === "select" ? ["Option 1", "Option 2"] : [] })}
                  className="bg-transparent text-[10px] text-[var(--secondary)] outline-none border border-[var(--border)] rounded px-1 py-0.5"
                >
                  {fieldTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <label className="flex items-center gap-1 text-[10px] text-[var(--muted)] cursor-pointer">
                  <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} className="accent-[var(--accent)]" />
                  Required
                </label>
              </div>
              {f.type === "select" && (
                <div className="flex flex-wrap gap-1">
                  {(f.options || []).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-0.5 rounded bg-[var(--hover)] px-1.5 py-0.5">
                      <input
                        value={opt}
                        onChange={(e) => {
                          const opts = [...(f.options || [])];
                          opts[oi] = e.target.value;
                          updateField(f.id, { options: opts });
                        }}
                        className="w-16 bg-transparent text-[10px] outline-none"
                      />
                      <button onClick={() => updateField(f.id, { options: (f.options || []).filter((_, i) => i !== oi) })} className="text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => updateField(f.id, { options: [...(f.options || []), `Option ${(f.options || []).length + 1}`] })}
                    className="rounded px-1.5 py-0.5 text-[10px] text-[var(--accent)] hover:bg-[var(--hover)] cursor-pointer"
                  >
                    + Add option
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
                <span>Show when:</span>
                <select
                  value={f.visibleWhen?.fieldId || ""}
                  onChange={(e) => updateField(f.id, { visibleWhen: e.target.value ? { fieldId: e.target.value, value: formData[e.target.value] || "" } : null })}
                  className="bg-transparent outline-none border border-[var(--border)] rounded px-1 py-0.5"
                >
                  <option value="">Always</option>
                  {(config.fields || []).filter(x => x.id !== f.id).map(x => (
                    <option key={x.id} value={x.id}>{x.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={() => removeField(f.id)} className="mt-1 text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button onClick={addField} className="flex items-center gap-1 text-xs text-[var(--accent)] hover:opacity-80 cursor-pointer">
          <Plus size={13} /> Add field
        </button>
      </div>
    );
  }

  if (submitted && config.showResults) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--success)] flex items-center gap-1">
              <Send size={12} /> Submission received
            </span>
            <span className="text-[10px] text-[var(--muted)]">({submissions.length + 1} total)</span>
          </div>
          {!isLocked && (
            <div className="flex items-center gap-2">
              <button onClick={() => setSubmitted(false)} className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer">Submit another</button>
              <button onClick={() => setEditing(true)} className="text-[10px] text-[var(--secondary)] hover:underline cursor-pointer">Edit form</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
      {/* Form header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {config.anonymous ? <Lock size={12} className="inline mr-1" /> : null}
            Form
          </span>
          <span className="text-[10px] text-[var(--muted)]">{submissions.length} responses</span>
        </div>
        <div className="flex items-center gap-1">
          {!isLocked && (
            <button onClick={() => setEditing(!editing)} className="rounded px-2 py-0.5 text-[10px] text-[var(--secondary)] hover:bg-[var(--hover)] cursor-pointer">
              {editing ? "Preview" : "Edit"}
            </button>
          )}
          {config.showResults && submissions.length > 0 && (
            <button
              onClick={() => {
                const csv = [config.fields.map(f => f.label).join(","), ...submissions.map(s => config.fields.map(f => JSON.stringify(s.data[f.id] ?? "")).join(","))].join("\n");
                navigator.clipboard.writeText(csv);
              }}
              className="rounded px-2 py-0.5 text-[10px] text-[var(--muted)] hover:bg-[var(--hover)] cursor-pointer"
              title="Copy as CSV"
            >
              <Table2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-2.5">
        {(config.fields || []).filter(isFieldVisible).map(f => (
          <div key={f.id} className="space-y-1">
            <label className="flex items-center gap-1 text-[11px] font-medium text-[var(--secondary)]">
              {f.label}
              {f.required && <span className="text-[var(--danger)]">*</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea
                value={formData[f.id] || ""}
                onChange={(e) => { setFormData({ ...formData, [f.id]: e.target.value }); setErrors({ ...errors, [f.id]: null }); }}
                className={`w-full rounded border ${errors[f.id] ? "border-[var(--danger)]" : "border-[var(--border-strong)]"} bg-[var(--bg)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)] resize-none`}
                rows={3}
                placeholder={`Enter ${f.label.toLowerCase()}...`}
              />
            ) : f.type === "select" ? (
              <select
                value={formData[f.id] || ""}
                onChange={(e) => { setFormData({ ...formData, [f.id]: e.target.value }); setErrors({ ...errors, [f.id]: null }); }}
                className={`w-full rounded border ${errors[f.id] ? "border-[var(--danger)]" : "border-[var(--border-strong)]"} bg-[var(--bg)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]`}
              >
                <option value="">Select...</option>
                {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "checkbox" ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData[f.id]}
                  onChange={(e) => { setFormData({ ...formData, [f.id]: e.target.checked }); setErrors({ ...errors, [f.id]: null }); }}
                  className="accent-[var(--accent)]"
                />
                <span className="text-xs text-[var(--secondary)]">{f.label}</span>
              </label>
            ) : (
              <input
                type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                value={formData[f.id] || ""}
                onChange={(e) => { setFormData({ ...formData, [f.id]: e.target.value }); setErrors({ ...errors, [f.id]: null }); }}
                className={`w-full rounded border ${errors[f.id] ? "border-[var(--danger)]" : "border-[var(--border-strong)]"} bg-[var(--bg)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]`}
                placeholder={`Enter ${f.label.toLowerCase()}...`}
              />
            )}
            {errors[f.id] && <p className="text-[10px] text-[var(--danger)]">{errors[f.id]}</p>}
          </div>
        ))}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isLocked}
        className="w-full rounded bg-[var(--accent)] py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center gap-1.5"
      >
        <Send size={13} />
        {config.submitButtonText || "Submit"}
      </button>

      {/* Results */}
      {config.showResults && submissions.length > 0 && (
        <div className="border-t border-[var(--border)] pt-3 mt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Eye size={12} className="text-[var(--muted)]" />
            <span className="text-[10px] font-semibold text-[var(--muted)]">Responses ({submissions.length})</span>
          </div>
          <div className="overflow-x-auto scrollbar-thin max-h-[200px] overflow-y-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-[var(--hover)]">
                  {(config.fields || []).map(f => (
                    <th key={f.id} className="px-2 py-1 text-left font-medium text-[var(--secondary)] border border-[var(--border)]">{f.label}</th>
                  ))}
                  <th className="px-2 py-1 text-left font-medium text-[var(--secondary)] border border-[var(--border)]">Date</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id} className="hover:bg-[var(--hover)]/50">
                    {(config.fields || []).map(f => (
                      <td key={f.id} className="px-2 py-1 border border-[var(--border)] text-[var(--text)] max-w-[120px] truncate">
                        {f.type === "checkbox" ? (s.data[f.id] ? "✓" : "—") : s.data[f.id] || "—"}
                      </td>
                    ))}
                    <td className="px-2 py-1 border border-[var(--border)] text-[var(--muted)] whitespace-nowrap">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
