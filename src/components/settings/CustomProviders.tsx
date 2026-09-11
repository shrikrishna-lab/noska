import React, { useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Server, Loader2, Sparkles, Globe, KeyRound } from "lucide-react";
import { aiManager } from "../../ai/AIManager";
import { getProviderList } from "../../ai/providers";

interface ModelRow {
  id: string;
  name?: string;
}

export default function CustomProviders({ onToast }: { onToast?: (m: string) => void }) {
  const [, force] = useState(0);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    id?: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    models: ModelRow[];
    defaultModel: string;
  }>({ name: "", baseUrl: "", apiKey: "", models: [{ id: "" }], defaultModel: "" });

  const customs = Object.values(
    (aiManager.getConfig().customProviders as Record<
      string,
      { id: string; name: string; baseUrl: string; models: ModelRow[]; defaultModel?: string }
    >) || {}
  );
  const config = aiManager.getConfig();

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
    if (!form.name.trim() || !form.baseUrl.trim()) {
      onToast?.("Provider name and base URL are required.");
      return;
    }
    setSaving(true);
    try {
      const id = aiManager.setCustomProvider({
        id: form.id,
        name: form.name.trim(),
        baseUrl: form.baseUrl.trim(),
        models: form.models.filter((m) => m.id.trim().length > 0),
        defaultModel: form.defaultModel || form.models[0]?.id || "",
      });
      if (form.apiKey.trim()) {
        aiManager.setProviderConfig(id, { apiKey: form.apiKey.trim(), enabled: true });
      }
      onToast?.(`Custom provider "${form.name}" saved.`);
      setEditingId(null);
      force((n) => n + 1);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Couldn't save custom provider");
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string, name: string) => {
    aiManager.removeCustomProvider(id);
    onToast?.(`Provider "${name}" removed.`);
    force((n) => n + 1);
  };

  return (
    <div className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] p-5 sm:p-6 border border-[#e8e4db] dark:border-white/10 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ede8df] dark:bg-white/10 text-[#1c1b18] dark:text-white">
            <Server size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#1c1b18] dark:text-white">Custom Endpoints</span>
              <span className="rounded-full bg-white dark:bg-white/10 border border-[#e8e4db] dark:border-white/10 px-2 py-0.5 text-[10px] font-semibold text-[#706c64] dark:text-white/70">
                BYO Gateway
              </span>
            </div>
            <p className="text-xs text-[#706c64] dark:text-white/60 mt-0.5">
              Connect any OpenAI-compatible gateway (vLLM, LiteLLM, Azure proxy, LocalAI).
            </p>
          </div>
        </div>

        {editingId !== "new" && (
          <button
            type="button"
            onClick={startNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c1b18] hover:bg-black text-white dark:bg-white dark:text-[#1c1b18] text-xs font-semibold transition cursor-pointer shadow-xs shrink-0"
          >
            <Plus size={13} />
            <span>Add Endpoint</span>
          </button>
        )}
      </div>

      {/* Existing custom providers */}
      {customs.length > 0 && (
        <div className="space-y-2 pt-1">
          {customs.map((p) => {
            const isActive = config.activeProvider === p.id;
            return (
              <div
                key={p.id}
                className="rounded-xl border border-[#e8e4db] dark:border-white/10 bg-white dark:bg-white/5 p-3.5 flex items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-emerald-500" : "bg-[#b0aca3]"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1c1b18] dark:text-white truncate">{p.name}</span>
                      {isActive && (
                        <span className="rounded-md bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#706c64] dark:text-white/60 font-mono truncate mt-0.5">
                      {p.baseUrl} · {p.models.map((m) => m.id).join(", ") || "default model"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => {
                        aiManager.setActiveProvider(p.id, p.defaultModel || p.models[0]?.id);
                        force((n) => n + 1);
                        onToast?.(`Switched to "${p.name}"`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] text-[11px] font-semibold transition cursor-pointer"
                    >
                      Select
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="p-1.5 rounded-lg text-[#706c64] hover:text-[#1c1b18] hover:bg-[#ede8df] transition cursor-pointer"
                    title="Edit provider"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p.id, p.name)}
                    className="p-1.5 rounded-lg text-[#706c64] hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete provider"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Editor Form */}
      {(editingId === "new" || (editingId && form.id === editingId)) && (
        <div className="rounded-xl border border-[#e8e4db] dark:border-white/15 bg-white dark:bg-white/5 p-4 space-y-3 pt-3 shadow-xs">
          <div className="flex items-center justify-between pb-1 border-b border-[#e8e4db] dark:border-white/10">
            <span className="text-xs font-bold text-[#1c1b18] dark:text-white">
              {editingId === "new" ? "New Custom OpenAI Endpoint" : `Edit ${form.name}`}
            </span>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="text-[#706c64] hover:text-[#1c1b18] p-1 rounded-md cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-[#706c64] mb-1">Provider Label</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. My Private vLLM"
                className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 px-3 py-1.5 text-xs text-[#1c1b18] dark:text-white outline-none focus:border-[#1c1b18] font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#706c64] mb-1">Base Endpoint URL</label>
              <input
                value={form.baseUrl}
                onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://api.gateway.internal/v1"
                className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 px-3 py-1.5 text-xs font-mono text-[#1c1b18] dark:text-white outline-none focus:border-[#1c1b18]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#706c64] mb-1">Bearer API Key (optional)</label>
            <input
              value={form.apiKey}
              onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
              type="password"
              placeholder="sk-... or token"
              className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 px-3 py-1.5 text-xs font-mono text-[#1c1b18] dark:text-white outline-none focus:border-[#1c1b18]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#706c64]">Available Models</span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, models: [...f.models, { id: "" }] }))}
                className="flex items-center gap-1 text-[10px] font-semibold text-[#a8824b] hover:underline cursor-pointer"
              >
                <Plus size={11} /> Add model ID
              </button>
            </div>
            <div className="space-y-1.5">
              {form.models.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={m.id}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        models: f.models.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)),
                      }))
                    }
                    placeholder="model-id (e.g. meta-llama/Llama-3-70b)"
                    className="flex-1 rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 px-3 py-1.5 text-xs font-mono text-[#1c1b18] dark:text-white outline-none focus:border-[#1c1b18]"
                  />
                  <input
                    value={m.name || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        models: f.models.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                      }))
                    }
                    placeholder="Display Name"
                    className="w-32 rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 px-3 py-1.5 text-xs text-[#1c1b18] dark:text-white outline-none focus:border-[#1c1b18]"
                  />
                  {form.defaultModel === m.id || (!form.defaultModel && i === 0) ? (
                    <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                      Default
                    </span>
                  ) : (
                    <button
                      type="button"
                      title="Set as default model"
                      onClick={() => setForm((f) => ({ ...f, defaultModel: m.id }))}
                      className="p-1.5 rounded-lg text-[#706c64] hover:text-emerald-600 hover:bg-[#ede8df] cursor-pointer"
                    >
                      <Check size={13} />
                    </button>
                  )}
                  {form.models.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, models: f.models.filter((_, j) => j !== i) }))}
                      className="p-1.5 rounded-lg text-[#706c64] hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#e8e4db] dark:border-white/10">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-[#1c1b18] hover:bg-black text-white px-4 py-1.5 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              <span>Save Provider</span>
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="px-3.5 py-1.5 rounded-xl border border-[#e8e4db] hover:bg-[#ede8df] text-xs font-semibold text-[#706c64] transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
