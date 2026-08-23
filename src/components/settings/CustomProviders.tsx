import React, { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Server, Loader2 } from "lucide-react";
import { aiManager } from "../../ai/AIManager";
import { getProviderList } from "../../ai/providers";

interface ModelRow { id: string; name?: string }

/**
 * Custom Providers (#2) — users can register ANY OpenAI-compatible endpoint
 * with their own model IDs; registered providers appear everywhere built-ins
 * do (AI panel, agent runs, automations) and can be set active.
 */
export default function CustomProviders({ onToast }: { onToast?: (m: string) => void }) {
  const [, force] = useState(0);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ id?: string; name: string; baseUrl: string; apiKey: string; models: ModelRow[]; defaultModel: string }>(
    { name: "", baseUrl: "", apiKey: "", models: [{ id: "" }], defaultModel: "" },
  );

  const customs = Object.values((aiManager.getConfig().customProviders as Record<string, { id: string; name: string; baseUrl: string; models: ModelRow[]; defaultModel?: string }>) || {});
  const config = aiManager.getConfig();
  const list = getProviderList();

  const startNew = () => {
    setForm({ name: "", baseUrl: "", apiKey: "", models: [{ id: "" }], defaultModel: "" });
    setEditingId("new");
  };
  const startEdit = (p: { id: string; name: string; baseUrl: string; models: ModelRow[]; defaultModel?: string }) => {
    setForm({
      id: p.id,
      name: p.name,
      baseUrl: p.baseUrl,
      models: p.models.length ? [...p.models] : [{ id: "" }],
      defaultModel: p.defaultModel || "",
      apiKey: (aiManager.getConfig().providers as Record<string, { apiKey?: string }>)?.[p.id]?.apiKey || "",
    });
    setEditingId(p.id);
  };

  const save = () => {
    setSaving(true);
    try {
      const id = aiManager.setCustomProvider({
        id: form.id,
        name: form.name,
        baseUrl: form.baseUrl,
        models: form.models,
        defaultModel: form.defaultModel,
      });
      if (form.apiKey.trim()) {
        aiManager.setProviderConfig(id, { apiKey: form.apiKey.trim(), enabled: true });
      }
      onToast?.(`${form.name} saved`);
      setEditingId(null);
      force((n) => n + 1);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Couldn't save provider");
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string, name: string) => {
    aiManager.removeCustomProvider(id);
    onToast?.(`${name} removed`);
    force((n) => n + 1);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Server size={15} className="text-[var(--accent)]" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[var(--text)]">Custom providers</h3>
          <p className="text-[10px] text-[var(--muted)]">Connect any OpenAI-compatible API — your own gateway, vLLM, Azure proxy, anything.</p>
        </div>
        {editingId !== "new" && (
          <button onClick={startNew} className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-[var(--accent)]/90 transition">
            <Plus size={11} /> Add
          </button>
        )}
      </div>

      {/* Existing customs */}
      {customs.map((p) => (
        <div key={p.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${config.activeProvider === p.id ? "bg-[var(--success)]" : "bg-[var(--border)]"}`} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--text)] truncate">{p.name}</p>
            <p className="text-[9px] text-[var(--muted)] truncate font-mono">{p.baseUrl} · {p.models.map(m => m.id).join(", ")}</p>
          </div>
          {config.activeProvider === p.id ? (
            <span className="text-[9px] font-bold uppercase text-[var(--success)]">Active</span>
          ) : (
            <button
              onClick={() => { aiManager.setActiveProvider(p.id, p.defaultModel || p.models[0]?.id); force(n => n + 1); onToast?.(`${p.name} is now active`); }}
              className="text-[9px] font-semibold text-[var(--accent)] hover:underline"
            >Set active</button>
          )}
          <button onClick={() => startEdit(p)} className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)]"><Pencil size={11} /></button>
          <button onClick={() => remove(p.id, p.name)} className="p-1 rounded text-[var(--muted)] hover:text-[var(--danger)]"><Trash2 size={11} /></button>
        </div>
      ))}

      {/* Editor */}
      {editingId === "new" || (editingId && editingId !== null && form.id === editingId && customs.some(c => c.id === editingId)) ? (
        <div className="space-y-2 rounded-lg border border-[var(--accent)]/25 bg-[var(--bg)] p-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name (e.g. My Gateway)" className="rounded-md bg-[var(--surface)] border border-[var(--border)] px-2 py-1.5 text-xs outline-none" />
            <input value={form.baseUrl} onChange={(e) => setForm(f => ({ ...f, baseUrl: e.target.value }))} placeholder="Base URL (…/v1)" className="rounded-md bg-[var(--surface)] border border-[var(--border)] px-2 py-1.5 text-xs font-mono outline-none" />
          </div>
          <input value={form.apiKey} onChange={(e) => setForm(f => ({ ...f, apiKey: e.target.value }))} type="password" placeholder="API key" className="w-full rounded-md bg-[var(--surface)] border border-[var(--border)] px-2 py-1.5 text-xs font-mono outline-none" />

          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">Models</p>
            <div className="space-y-1">
              {form.models.map((m, i) => (
                <div key={i} className="flex gap-1.5">
                  <input value={m.id} onChange={(e) => setForm(f => ({ ...f, models: f.models.map((x, j) => j === i ? { ...x, id: e.target.value } : x) }))} placeholder="model-id (sent to the API)" className="flex-1 rounded bg-[var(--surface)] border border-[var(--border)] px-2 py-1 text-[11px] font-mono outline-none" />
                  <input value={m.name || ""} onChange={(e) => setForm(f => ({ ...f, models: f.models.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder="Label" className="w-28 rounded bg-[var(--surface)] border border-[var(--border)] px-2 py-1 text-[11px] outline-none" />
                  {form.defaultModel === m.id || (!form.defaultModel && i === 0) ? (
                    <span className="self-center text-[8px] font-bold text-[var(--success)] uppercase">default</span>
                  ) : (
                    <button title="Make default" onClick={() => setForm(f => ({ ...f, defaultModel: m.id }))}><Check size={12} className="text-[var(--muted)] hover:text-[var(--success)]" /></button>
                  )}
                  <button onClick={() => setForm(f => ({ ...f, models: f.models.filter((_, j) => j !== i) }))} className="text-[var(--muted)] hover:text-[var(--danger)]"><X size={12} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setForm(f => ({ ...f, models: [...f.models, { id: "" }] }))} className="mt-1 flex items-center gap-1 text-[9px] text-[var(--muted)] hover:text-[var(--text)]"><Plus size={9} /> Add model</button>
          </div>

          <div className="flex gap-1.5 pt-0.5">
            <button onClick={save} disabled={saving} className="flex items-center gap-1 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50">
              {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Save provider
            </button>
            <button onClick={() => setEditingId(null)} className="text-[10px] text-[var(--muted)] hover:text-[var(--text)]">Cancel</button>
          </div>
          <p className="text-[9px] text-[var(--muted)] leading-relaxed">
            Endpoint must be OpenAI-compatible: <code className="font-mono">{"{baseUrl}"}/chat/completions</code> with a Bearer key.
          </p>
        </div>
      ) : null}
    </div>
  );
}
