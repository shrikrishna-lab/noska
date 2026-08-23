import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle2, XCircle, Clock, ShieldCheck, BrainCircuit, Sparkles, Loader2, X } from "lucide-react";
import {
  AGENT_TEMPLATES, TEMPLATE_CATEGORIES, templateToAgent, saveAgent,
  capabilitiesFromPermissions, describeTemplate,
  type AgentTemplate, type TemplateCategory,
} from "./agentStore";
import type { PermissionCategory, PermissionMode } from "../../ai/runtime";
import { refreshDefinitions } from "../../intelligence/triggerService";

/**
 * Agent Library (#7–#11) — categorized template ecosystem with an honest
 * install preview (can/cannot derived from the REAL permission spec) and
 * permission-expansion confirmations (#11). Nothing activates silently.
 */

export default function TemplateLibrary({ onInstalled, onToast }: {
  onInstalled?: () => void;
  onToast?: (m: string) => void;
}) {
  const [category, setCategory] = useState<TemplateCategory | "All">("All");
  const [search, setSearch] = useState("");
  const [installing, setInstalling] = useState<AgentTemplate | null>(null);

  const filtered = useMemo(() => {
    return AGENT_TEMPLATES.filter((t) => {
      if (category !== "All" && t.category !== category) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return t.name.toLowerCase().includes(q)
          || t.description.toLowerCase().includes(q)
          || t.capabilities.some((c) => c.toLowerCase().includes(q));
      }
      return true;
    });
  }, [category, search]);

  return (
    <div className="max-w-4xl">
      {/* Filters */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1">
          <Search size={9} className="text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search capabilities…"
            className="bg-transparent text-[10px] text-[var(--text)] outline-none w-32"
          />
        </div>
        <button
          onClick={() => setCategory("All")}
          className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${category === "All" ? "bg-[var(--accent)]/12 text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--hover)]"}`}
        >All</button>
        {TEMPLATE_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${category === c ? "bg-[var(--accent)]/12 text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--hover)]"}`}
          >{c}</button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((t) => (
          <motion.button
            key={t.key}
            layout
            whileHover={{ y: -2 }}
            onClick={() => setInstalling(t)}
            className="text-left rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--accent)]/30 transition"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">{t.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-[var(--text)]">{t.name}</h3>
                  <span className="text-[8px] uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/8 px-1.5 py-0.5 rounded">{t.category}</span>
                </div>
                <p className="text-[11px] text-[var(--secondary)] mt-0.5 leading-relaxed line-clamp-2">{t.description}</p>
                <p className="text-[9px] text-[var(--muted)] mt-1.5 truncate">Use case: {t.useCase}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded"><Clock size={8} />{t.triggerLabel}</span>
                  <span className="flex items-center gap-1 text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded">{t.capabilities.length} capabilities</span>
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 border border-dashed border-[var(--border)] rounded-xl">
          <Search size={24} className="mx-auto text-[var(--muted)] mb-2" />
          <p className="text-xs text-[var(--muted)]">No templates match. Try a different capability or category.</p>
        </div>
      )}

      {/* Install flow */}
      <AnimatePresence>
        {installing && (
          <InstallPreview template={installing} onClose={() => setInstalling(null)} onDone={() => { setInstalling(null); onInstalled?.(); }} onToast={onToast} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Install preview (#8) ──────────────────────────────────────────────────

function InstallPreview({ template, onClose, onDone, onToast }: {
  template: AgentTemplate;
  onClose: () => void;
  onDone: () => void;
  onToast?: (m: string) => void;
}) {
  const [customizing, setCustomizing] = useState(false);
  const [name, setName] = useState(template.name);
  const [instructions, setInstructions] = useState(template.instructions);
  const [permissions, setPermissions] = useState(template.permissions);
  const [pendingChange, setPendingChange] = useState<{ cat: PermissionCategory; to: PermissionMode } | null>(null);
  const [saving, setSaving] = useState(false);

  const caps = capabilitiesFromPermissions(permissions);
  const descriptor = describeTemplate(template);

  const applyPermissionChange = () => {
    if (!pendingChange) return;
    setPermissions((p) => ({ ...p, [pendingChange.cat]: pendingChange.to }));
    setPendingChange(null);
  };

  const install = async (activate: boolean) => {
    setSaving(true);
    try {
      const agent = templateToAgent({
        ...template,
        name: name.trim() || template.name,
        instructions,
        permissions,
      });
      // "Install Agent" activates; "Paused" installs dormant (#8 never silently active)
      agent.status = activate ? "active" : "paused";
      await saveAgent(agent);
      await refreshDefinitions();
      onToast?.(`${name.trim() || template.name} installed ${activate ? "and activated" : "as paused"}`);
      onDone();
    } catch {
      onToast?.("Install failed — try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto scrollbar-thin rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="text-3xl">{template.icon}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-[var(--text)]">{name || template.name}</h2>
            <p className="text-[11px] text-[var(--muted)]">
              {descriptor.templateId} · v{descriptor.version} · by {descriptor.author}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)]"><X size={14} /></button>
        </div>

        <p className="text-[11px] text-[var(--secondary)] leading-relaxed">{template.description}</p>

        {/* Capabilities */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] mb-1">What it can do</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
            {template.capabilities.map((c) => (
              <span key={c} className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"><Sparkles size={8} className="text-[var(--accent)] shrink-0" /> {c}</span>
            ))}
          </div>
        </div>

        {/* Can / Cannot — derived from REAL permissions (#8) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--success)]/20 bg-[var(--success)]/[0.04] p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--success)] mb-1">It can</p>
            {caps.can.map((c) => (
              <p key={c} className="flex items-start gap-1.5 text-[10px] text-[var(--text-secondary)] leading-relaxed">
                <CheckCircle2 size={9} className="text-[var(--success)] mt-0.5 shrink-0" /> {c}
              </p>
            ))}
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] mb-1">It cannot</p>
            {caps.cannot.map((c) => (
              <p key={c} className="flex items-start gap-1.5 text-[10px] text-[var(--muted)] leading-relaxed">
                <XCircle size={9} className="shrink-0 mt-0.5" /> {c}
              </p>
            ))}
            {caps.cannot.length === 0 && <p className="text-[10px] text-[var(--muted)] italic">Nothing is fully blocked</p>}
          </div>
        </div>

        {/* Trigger + memory */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded"><Clock size={8} />{template.triggerLabel}</span>
          <span className="flex items-center gap-1 text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded"><BrainCircuit size={8} />Memory: {template.memoryScopeSuggestion}</span>
        </div>

        {/* Example output */}
        <details className="group">
          <summary className="cursor-pointer text-[10px] text-[var(--accent)] select-none">Example output & tasks</summary>
          <div className="mt-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] p-2.5 space-y-1">
            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{template.exampleOutput}</p>
            {template.exampleTasks.map((task) => (
              <p key={task} className="text-[9px] text-[var(--muted)]">Try: “{task}”</p>
            ))}
          </div>
        </details>

        {/* Customize toggle */}
        <label className="flex items-center gap-2 text-[10px] text-[var(--secondary)] cursor-pointer">
          <input type="checkbox" checked={customizing} onChange={(e) => setCustomizing(e.target.checked)} />
          Customize before installing
        </label>

        {customizing && (
          <div className="space-y-2.5 rounded-xl border border-[var(--border)] p-3">
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2.5 py-1.5 text-xs outline-none" placeholder="Agent name" />
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2.5 py-1.5 text-[11px] outline-none resize-none" />
            {/* Permission editor — reflects the real runtime model (#10) */}
            <div className="space-y-1">
              {(Object.keys(permissions) as PermissionCategory[]).map((cat) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-secondary)] capitalize flex-1">{cat === "external" ? "Notifications & external" : cat}</span>
                  <div className="flex gap-0.5">
                    {(["auto", "approval", "disabled"] as PermissionMode[]).map((mode) => (
                      <button
                        key={mode}
                        title={mode}
                        onClick={() => {
                          // Expanding permissions requires confirmation (#11)
                          if (permissions[cat] !== mode && mode !== "disabled") {
                            setPendingChange({ cat, to: mode });
                          } else {
                            setPermissions((p) => ({ ...p, [cat]: mode }));
                          }
                        }}
                        className={`w-7 h-5 rounded text-[9px] font-bold transition ${
                          permissions[cat] === mode
                            ? mode === "auto" ? "bg-[var(--success)]/20 text-[var(--success)]" : mode === "approval" ? "bg-[var(--warning)]/20 text-[var(--warning)]" : "bg-[var(--danger)]/15 text-[var(--danger)]"
                            : "opacity-35 hover:opacity-80"
                        }`}
                      >
                        {mode === "auto" ? "🟢" : mode === "approval" ? "🟡" : "🔴"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => void install(true)}
            disabled={saving}
            className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent)]/90 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Install Agent
          </button>
          <button
            onClick={() => void install(false)}
            disabled={saving}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)] transition"
          >Paused</button>
        </div>
      </motion.div>

      {/* Permission expansion confirmation (#11) */}
      <AnimatePresence>
        {pendingChange && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setPendingChange(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 space-y-3"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-[var(--text)]">
                You're giving this agent permission to{" "}
                <span className="text-[var(--warning)]">
                  {pendingChange.cat === "delete" ? "delete content" :
                   pendingChange.cat === "update" ? "edit pages" :
                   pendingChange.cat === "create" ? "create pages" :
                   pendingChange.cat}
                </span>.
              </h3>
              <p className="text-[11px] text-[var(--secondary)] leading-relaxed">
                {pendingChange.to === "auto"
                  ? "This allows it to do this without asking every time."
                  : "It will ask for your approval each time before doing this."}
              </p>
              {pendingChange.cat === "delete" && (
                <p className="text-[11px] text-[var(--danger)] font-medium">
                  This is a destructive permission. Deleted content may not be recoverable.
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setPendingChange(null)} className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium hover:bg-[var(--hover)] transition">Cancel</button>
                <button onClick={applyPermissionChange} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${pendingChange.cat === "delete" ? "bg-[var(--danger)] hover:bg-[var(--danger)]/90" : "bg-[var(--accent)] hover:bg-[var(--accent)]/90"}`}>
                  Allow
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
