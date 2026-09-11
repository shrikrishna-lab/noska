import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  RotateCw,
  Ban,
  Trash2,
  Clock3,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Lock,
  ChevronDown,
  Layers,
  Terminal,
  Code2,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  X,
  Zap,
} from "lucide-react";
import { listApiKeys, createApiKey, revokeApiKey, rotateApiKey, deleteApiKey, type ApiKeyRecord } from "../../lib/apiKeys";
import { SCOPES, apiBase } from "./apiContract";
import { cn } from "../../lib/utils";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "https://yxgtmzksnyarlivgxujf.supabase.co").replace(/\/$/, "");
const API_ENDPOINT = apiBase(SUPABASE_URL);

const EXPIRY_OPTIONS = [
  { label: "No expiration", days: null },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
];

const PRESETS: { id: string; label: string; scopes: string[] }[] = [
  {
    id: "full",
    label: "⚡ Full Access",
    scopes: SCOPES.map((s) => s.id),
  },
  {
    id: "read_only",
    label: "👁️ Read-Only",
    scopes: SCOPES.filter((s) => s.id.includes(":read")).map((s) => s.id),
  },
  {
    id: "agents",
    label: "🤖 Agents & Tasks",
    scopes: ["agents:read", "agents:write", "agents:run", "tasks:read", "tasks:write", "pages:read"],
  },
  {
    id: "pages_db",
    label: "📄 Pages & DB",
    scopes: ["pages:read", "pages:write", "databases:read", "databases:write", "search:read"],
  },
];

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ApiKeysManager({ userId, onToast }: { userId?: string | null; onToast?: (msg: string) => void }) {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>(["pages:read", "pages:write"]);
  const [newExpiry, setNewExpiry] = useState<number | null>(30);
  const [newReadOnly, setNewReadOnly] = useState(false);
  const [newAllowedTools, setNewAllowedTools] = useState("");
  const [revealedKey, setRevealedKey] = useState<{ raw: string; name: string } | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [selectedSnippetLang, setSelectedSnippetLang] = useState<"curl" | "js" | "python">("curl");
  const [confirmAction, setConfirmAction] = useState<{ kind: "revoke" | "delete"; key: ApiKeyRecord } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setLoadError("Sign in to manage API keys.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      setKeys(await listApiKeys(userId));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!userId || creating) return;
    if (newScopes.length === 0) {
      onToast?.("Select at least one scope.");
      return;
    }
    setCreating(true);
    try {
      const { record, rawKey } = await createApiKey(userId, {
        name: newName || "Default API Key",
        scopes: newScopes,
        expiresInDays: newExpiry,
        readOnly: newReadOnly,
        allowedTools: newAllowedTools.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setKeys((prev) => [record, ...prev]);
      setRevealedKey({ raw: rawKey, name: record.name });
      setNewName("");
      setNewScopes(["pages:read", "pages:write"]);
      setNewReadOnly(false);
      setNewAllowedTools("");
      setShowCreateForm(false);
      onToast?.("API key created — copy it now, it won't be shown again.");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Failed to create key.");
    } finally {
      setCreating(false);
    }
  };

  const toggleScope = (scope: string) =>
    setNewScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));

  const applyPreset = (scopes: string[]) => {
    setNewScopes(scopes);
  };

  const copyRaw = async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey.raw).catch(() => {});
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const copyEndpoint = async () => {
    await navigator.clipboard.writeText(API_ENDPOINT).catch(() => {});
    setCopiedEndpoint(true);
    onToast?.("Endpoint URL copied to clipboard");
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const sampleKey = keys.find((k) => !k.revoked_at)?.prefix ? `${keys.find((k) => !k.revoked_at)?.prefix}...` : "YOUR_API_KEY";

  const codeSnippets = useMemo(() => {
    return {
      curl: `curl -X GET "${API_ENDPOINT}/pages" \\\n  -H "Authorization: Bearer ${sampleKey}" \\\n  -H "Content-Type: application/json"`,
      js: `const res = await fetch("${API_ENDPOINT}/pages", {\n  headers: {\n    "Authorization": "Bearer ${sampleKey}",\n    "Content-Type": "application/json"\n  }\n});\nconst pages = await res.json();\nconsole.log(pages);`,
      python: `import requests\n\nheaders = {\n    "Authorization": "Bearer ${sampleKey}",\n    "Content-Type": "application/json"\n}\nresponse = requests.get("${API_ENDPOINT}/pages", headers=headers)\nprint(response.json())`,
    };
  }, [sampleKey]);

  const copySnippet = async () => {
    const text = codeSnippets[selectedSnippetLang];
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopiedSnippet(true);
    onToast?.("Code snippet copied to clipboard");
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const doRevoke = async (record: ApiKeyRecord) => {
    setBusyId(record.id);
    try {
      await revokeApiKey(record.id);
      setKeys((prev) => prev.map((k) => (k.id === record.id ? { ...k, revoked_at: new Date().toISOString() } : k)));
      onToast?.(`"${record.name}" revoked.`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Failed to revoke key.");
    } finally {
      setBusyId(null);
      setConfirmAction(null);
    }
  };

  const doRotate = async (record: ApiKeyRecord) => {
    if (!userId) return;
    setBusyId(record.id);
    try {
      const { record: fresh, rawKey } = await rotateApiKey(userId, record);
      setKeys((prev) => [
        fresh,
        ...prev.map((k) => (k.id === record.id ? { ...k, revoked_at: new Date().toISOString() } : k)),
      ]);
      setRevealedKey({ raw: rawKey, name: fresh.name });
      onToast?.("Rotated — old key revoked, copy the new one now.");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Rotation failed.");
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async (record: ApiKeyRecord) => {
    setBusyId(record.id);
    try {
      await deleteApiKey(record.id);
      setKeys((prev) => prev.filter((k) => k.id !== record.id));
      onToast?.("Key record deleted.");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Failed to delete key.");
    } finally {
      setBusyId(null);
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-6 font-sans text-xs max-w-2xl pb-12">
      {/* ── Top Status Strip & Endpoint Bar ──────────────────── */}
      <div className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Code2 size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1c1b18] dark:text-white">Noska REST API v1</span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/80 dark:border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Gateway
                </span>
              </div>
              <p className="text-[11px] text-[#706c64] dark:text-white/60 mt-0.5">
                Full programmatic access to pages, databases, tasks, AI agents, and automations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1c1b18] dark:bg-white text-white dark:text-[#1c1b18] text-xs font-semibold hover:bg-black dark:hover:bg-white/90 shadow-xs transition active:scale-[0.98] cursor-pointer"
          >
            {showCreateForm ? <X size={13} /> : <Plus size={13} />}
            <span>{showCreateForm ? "Close Form" : "New API Key"}</span>
          </button>
        </div>

        {/* Base Endpoint Pill */}
        <div className="flex items-center justify-between rounded-xl bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[10px] font-bold text-[#8c887f] dark:text-white/50 uppercase tracking-wider shrink-0">
              Base URL:
            </span>
            <code className="font-mono text-[11px] text-[#1c1b18] dark:text-white truncate select-all">
              {API_ENDPOINT}
            </code>
          </div>
          <button
            type="button"
            onClick={copyEndpoint}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#706c64] hover:text-[#1c1b18] dark:text-white/60 dark:hover:text-white transition cursor-pointer shrink-0 ml-2"
            title="Copy Base URL"
          >
            {copiedEndpoint ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            <span>{copiedEndpoint ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* ── Create API Key Form (Collapsible) ───────────────── */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] p-5 border border-[#e8e4db] dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-white dark:bg-white/10 border border-[#e8e4db] dark:border-white/10 flex items-center justify-center text-[#1c1b18] dark:text-white shadow-xs">
                    <KeyRound size={14} className="text-[#a8824b]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1c1b18] dark:text-white">Create New API Key</span>
                    <p className="text-[11px] text-[#706c64] dark:text-white/60">Generate a secure bearer token with granular scopes.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-[#8c887f] hover:text-[#1c1b18] dark:text-white/40 dark:hover:text-white transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Key Name Input */}
              <div>
                <label className="block text-[10px] font-semibold text-[#706c64] dark:text-white/60 mb-1">
                  Key Name / Description
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. “Production Agent Runner”, “CI/CD Deployment”, “Zapier Sync”"
                  className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-white dark:bg-[#14161f] px-3.5 py-2 text-xs text-[#1c1b18] dark:text-white placeholder-[#a09c94] focus:outline-none focus:border-[#1c1b18] dark:focus:border-white/40 transition font-medium"
                />
              </div>

              {/* Scopes Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-semibold text-[#706c64] dark:text-white/60">
                    Permissions & Scopes
                  </label>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-white/10 text-[#1c1b18] dark:text-white border border-[#e8e4db] dark:border-white/10">
                    {newScopes.length} of {SCOPES.length} selected
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                  {PRESETS.map((p) => {
                    const isMatch = p.scopes.length === newScopes.length && p.scopes.every((s) => newScopes.includes(s));
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.scopes)}
                        className={cn(
                          "whitespace-nowrap px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer border shrink-0",
                          isMatch
                            ? "bg-[#1c1b18] text-white border-black shadow-xs dark:bg-white dark:text-[#1c1b18]"
                            : "bg-white dark:bg-white/5 text-[#706c64] dark:text-white/70 hover:bg-[#ede8df] hover:text-[#1c1b18] border-[#e8e4db] dark:border-white/10"
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setNewScopes([])}
                    className="whitespace-nowrap px-2.5 py-1 rounded-xl text-xs font-medium text-[#8c887f] hover:text-rose-600 transition cursor-pointer shrink-0"
                  >
                    Clear All
                  </button>
                </div>

                {/* Categorized Scope Tags Grid */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#14161f] border border-[#e8e4db] dark:border-white/10 space-y-3 shadow-xs">
                  {/* Pages & Content */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8c887f] dark:text-white/50 mb-1.5">
                      Pages & Knowledge
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SCOPES.filter((s) => s.id.startsWith("pages:") || s.id.startsWith("templates:") || s.id.startsWith("search:")).map((s) => {
                        const active = newScopes.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleScope(s.id)}
                            title={s.description}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[10.5px] transition cursor-pointer select-none",
                              active
                                ? "bg-blue-600 dark:bg-sky-500 text-white font-bold border-transparent shadow-xs"
                                : "bg-[#f8f6f0] dark:bg-white/5 text-[#555] dark:text-white/70 hover:bg-[#ede8df] hover:text-[#1c1b18] border-[#e8e4db] dark:border-white/10"
                            )}
                          >
                            {active && <Check size={11} className="stroke-[3]" />}
                            <span>{s.id}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Databases & Workspaces */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8c887f] dark:text-white/50 mb-1.5">
                      Databases & Workspaces
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SCOPES.filter((s) => s.id.startsWith("databases:") || s.id.startsWith("workspaces:") || s.id.startsWith("dashboards:")).map((s) => {
                        const active = newScopes.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleScope(s.id)}
                            title={s.description}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[10.5px] transition cursor-pointer select-none",
                              active
                                ? "bg-emerald-600 dark:bg-emerald-500 text-white font-bold border-transparent shadow-xs"
                                : "bg-[#f8f6f0] dark:bg-white/5 text-[#555] dark:text-white/70 hover:bg-[#ede8df] hover:text-[#1c1b18] border-[#e8e4db] dark:border-white/10"
                            )}
                          >
                            {active && <Check size={11} className="stroke-[3]" />}
                            <span>{s.id}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tasks & Spaced Learning */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8c887f] dark:text-white/50 mb-1.5">
                      Tasks & Spaced Learning
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SCOPES.filter((s) => s.id.startsWith("tasks:") || s.id.startsWith("reviews:")).map((s) => {
                        const active = newScopes.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleScope(s.id)}
                            title={s.description}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[10.5px] transition cursor-pointer select-none",
                              active
                                ? "bg-purple-600 dark:bg-purple-500 text-white font-bold border-transparent shadow-xs"
                                : "bg-[#f8f6f0] dark:bg-white/5 text-[#555] dark:text-white/70 hover:bg-[#ede8df] hover:text-[#1c1b18] border-[#e8e4db] dark:border-white/10"
                            )}
                          >
                            {active && <Check size={11} className="stroke-[3]" />}
                            <span>{s.id}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Agents & Automations */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8c887f] dark:text-white/50 mb-1.5">
                      Agents, Automations & Webhooks
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SCOPES.filter((s) => s.id.startsWith("agents:") || s.id.startsWith("automations:") || s.id.startsWith("webhooks:") || s.id.startsWith("connections:") || s.id.startsWith("events:")).map((s) => {
                        const active = newScopes.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleScope(s.id)}
                            title={s.description}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[10.5px] transition cursor-pointer select-none",
                              active
                                ? "bg-amber-600 dark:bg-amber-500 text-white font-bold border-transparent shadow-xs"
                                : "bg-[#f8f6f0] dark:bg-white/5 text-[#555] dark:text-white/70 hover:bg-[#ede8df] hover:text-[#1c1b18] border-[#e8e4db] dark:border-white/10"
                            )}
                          >
                            {active && <Check size={11} className="stroke-[3]" />}
                            <span>{s.id}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Read-Only Mode & Expiration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#e8e4db] dark:border-white/10">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#14161f] border border-[#e8e4db] dark:border-white/10">
                  <div>
                    <div className="text-xs font-bold text-[#1c1b18] dark:text-white">Read-Only Mode</div>
                    <div className="text-[10px] text-[#706c64] dark:text-white/60">
                      Blocks POST, PATCH, and DELETE.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewReadOnly(!newReadOnly)}
                    className={cn(
                      "w-10 h-5.5 rounded-full transition-colors relative cursor-pointer p-0.5 shrink-0",
                      newReadOnly ? "bg-[#1c1b18] dark:bg-sky-400" : "bg-[#ede8df] dark:bg-white/15"
                    )}
                  >
                    <motion.div
                      animate={{ x: newReadOnly ? 18 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="w-4.5 h-4.5 rounded-full bg-white shadow-xs"
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#14161f] border border-[#e8e4db] dark:border-white/10">
                  <div className="flex items-center gap-1.5">
                    <Clock3 size={13} className="text-[#8c887f] dark:text-white/50" />
                    <span className="text-xs font-bold text-[#1c1b18] dark:text-white">Expiration</span>
                  </div>
                  <select
                    value={newExpiry ?? ""}
                    onChange={(e) => setNewExpiry(e.target.value === "" ? null : Number(e.target.value))}
                    className="rounded-lg border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-[#181b24] px-2.5 py-1 text-xs font-semibold text-[#1c1b18] dark:text-white focus:outline-none cursor-pointer"
                  >
                    {EXPIRY_OPTIONS.map((o) => (
                      <option key={o.label} value={o.days ?? ""}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-xl px-3.5 py-2 text-xs font-semibold text-[#706c64] hover:text-[#1c1b18] dark:text-white/60 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !userId}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1c1b18] hover:bg-black text-white text-xs font-bold shadow-xs transition active:scale-[0.98] disabled:opacity-50 cursor-pointer dark:bg-white dark:text-[#1c1b18] dark:hover:bg-white/90"
                >
                  <KeyRound size={13} />
                  <span>{creating ? "Generating…" : "Generate Key"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active API Keys List ────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-[#8c887f] dark:text-white/50 uppercase tracking-wider">
            Active Keys ({keys.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-xs text-[#706c64]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1c1b18] dark:border-white border-t-transparent" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-4 text-center">
            <span className="text-xs text-rose-700 dark:text-rose-400">{loadError}</span>
            <button
              onClick={refresh}
              className="rounded-xl border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e8e4db] dark:border-white/10 p-8 text-center bg-[#f8f6f0]/50 dark:bg-white/[0.02] space-y-2">
            <KeyRound size={22} className="mx-auto text-[#a8824b] opacity-80" />
            <p className="text-xs font-bold text-[#1c1b18] dark:text-white">No active API keys</p>
            <p className="text-[11px] text-[#706c64] dark:text-white/60">
              Generate a key above to authenticate custom scripts and integrations.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {keys.map((k) => {
              const expired = k.expires_at && new Date(k.expires_at).getTime() < Date.now();
              const status: "active" | "revoked" | "expired" = k.revoked_at ? "revoked" : expired ? "expired" : "active";
              return (
                <div
                  key={k.id}
                  className="rounded-2xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-[#181b24] p-4 shadow-sm transition hover:border-[#d6d0c4] dark:hover:border-white/20"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-[#1c1b18] dark:text-white">{k.name}</span>
                        <StatusBadge status={status} />
                      </div>
                      <code className="mt-0.5 block font-mono text-[11px] text-[#706c64] dark:text-white/60">{k.prefix}…</code>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {status === "active" && (
                        <>
                          <button
                            type="button"
                            title="Rotate key"
                            disabled={busyId === k.id}
                            onClick={() => doRotate(k)}
                            className="p-1.5 rounded-lg bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 text-[#706c64] hover:text-[#1c1b18] dark:text-white/70 dark:hover:text-white hover:bg-[#ede8df] transition cursor-pointer shadow-xs"
                          >
                            <RotateCw size={12} className={busyId === k.id ? "animate-spin" : ""} />
                          </button>
                          <button
                            type="button"
                            title="Revoke key"
                            disabled={busyId === k.id}
                            onClick={() => setConfirmAction({ kind: "revoke", key: k })}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 text-rose-600 hover:bg-rose-100 transition cursor-pointer shadow-xs"
                          >
                            <Ban size={12} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        title="Delete record"
                        disabled={busyId === k.id}
                        onClick={() => setConfirmAction({ kind: "delete", key: k })}
                        className="p-1.5 rounded-lg bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 text-[#706c64] hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shadow-xs"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Metadata and scope tags */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-[#706c64] dark:text-white/60 border-t border-[#e8e4db] dark:border-white/10 pt-2.5">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={11} /> Created {timeAgo(k.created_at)}
                    </span>
                    <span>Last used: {timeAgo(k.last_used_at)}</span>
                    {k.expires_at && (
                      <span className={status === "expired" ? "text-amber-600 font-semibold" : ""}>
                        {status === "expired" ? "Expired" : "Expires"} {new Date(k.expires_at).toLocaleDateString()}
                      </span>
                    )}

                    <div className="flex flex-wrap gap-1 ml-auto">
                      {(Array.isArray(k.scopes) ? k.scopes : []).slice(0, 4).map((s) => (
                        <code key={s} className="rounded-md bg-white dark:bg-white/10 border border-[#e8e4db] dark:border-white/10 px-1.5 py-0.5 font-mono text-[9.5px] text-[#4a4742] dark:text-white/80">
                          {s}
                        </code>
                      ))}
                      {(Array.isArray(k.scopes) ? k.scopes : []).length > 4 && (
                        <span className="text-[9.5px] text-[#8c887f] font-mono self-center">
                          +{k.scopes.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quickstart Code Snippet Box ──────────────────────── */}
      <div className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-[#a8824b]" />
            <span className="text-xs font-bold text-[#1c1b18] dark:text-white">Quickstart Example</span>
          </div>

          <div className="flex items-center gap-1 bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 p-0.5 rounded-xl text-[11px]">
            {(["curl", "js", "python"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedSnippetLang(lang)}
                className={`px-2.5 py-0.5 rounded-lg font-semibold capitalize transition cursor-pointer ${
                  selectedSnippetLang === lang
                    ? "bg-[#1c1b18] text-white dark:bg-white dark:text-[#1c1b18] shadow-xs"
                    : "text-[#706c64] dark:text-white/60 hover:text-[#1c1b18]"
                }`}
              >
                {lang === "js" ? "JavaScript" : lang === "curl" ? "cURL" : "Python"}
              </button>
            ))}
          </div>
        </div>

        <div className="relative rounded-xl bg-[#1c1b18] p-3.5 text-white font-mono text-[11px] leading-relaxed overflow-x-auto shadow-inner">
          <button
            type="button"
            onClick={copySnippet}
            className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[10px] font-semibold text-white/80 hover:text-white transition cursor-pointer"
          >
            {copiedSnippet ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            <span>{copiedSnippet ? "Copied" : "Copy"}</span>
          </button>
          <pre className="pr-16">{codeSnippets[selectedSnippetLang]}</pre>
        </div>
      </div>

      {/* ── Diagnostics & Runtime Tools ────────────────────── */}
      <div className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 size={14} className="text-[#a8824b]" />
            <span className="text-xs font-bold text-[#1c1b18] dark:text-white">Runtime & Diagnostics</span>
          </div>
        </div>

        <div className="divide-y divide-[#e8e4db] dark:divide-white/10">
          <div className="py-3 first:pt-0 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#1c1b18] dark:text-white">Developer Mode</div>
              <div className="text-[11px] text-[#706c64] dark:text-white/60 mt-0.5">Enables verbose console logging and trace inspection.</div>
            </div>
            <input
              type="checkbox"
              defaultChecked={process.env.NODE_ENV === "development"}
              className="h-4 w-4 rounded accent-[#1c1b18] cursor-pointer"
            />
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#1c1b18] dark:text-white">System Diagnostics</div>
              <div className="text-[11px] text-[#706c64] dark:text-white/60 mt-0.5">Export a JSON diagnostic report of active adapters and runtime environment.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const report = {
                  timestamp: new Date().toISOString(),
                  userAgent: navigator.userAgent,
                  apiEndpoint: API_ENDPOINT,
                  speechSupported: typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
                };
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `noska-diagnostics-${Date.now()}.json`;
                a.click();
                onToast?.("Diagnostics exported successfully");
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-[#ede8df] text-[#1c1b18] dark:text-white text-xs font-semibold transition cursor-pointer border border-[#e8e4db] dark:border-white/10 shadow-xs"
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* ── One-Time Key Reveal Modal ────────────────────────── */}
      <AnimatePresence>
        {revealedKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-6 backdrop-blur-[4px]"
            onMouseDown={() => setRevealedKey(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              transition={SPRING_PRESETS.soft}
              className="w-[460px] max-w-full rounded-3xl border border-white/20 bg-[#1c1b18] p-6 shadow-2xl text-white select-none space-y-4"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle size={18} />
                <h3 className="text-sm font-bold text-white">Save Your API Key Now</h3>
              </div>
              <p className="text-xs leading-relaxed text-white/70">
                This key is only revealed once. If lost, you'll need to generate a new key.
              </p>

              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl border border-white/15 bg-black/60 px-3.5 py-2.5 font-mono text-xs text-white select-all">
                  {revealedKey.raw}
                </code>
                <button
                  type="button"
                  onClick={copyRaw}
                  className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-white/90 text-black px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                >
                  {copiedRaw ? <Check size={13} className="text-emerald-600 stroke-[3]" /> : <Copy size={13} />}
                  <span>{copiedRaw ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setRevealedKey(null)}
                className="w-full rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-semibold text-white transition cursor-pointer"
              >
                I have saved this key securely
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirm Revoke / Delete Modal ────────────────────── */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-6 backdrop-blur-[4px]"
            onMouseDown={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              transition={SPRING_PRESETS.soft}
              className="w-[380px] max-w-full rounded-3xl border border-[#e8e4db] dark:border-white/15 bg-white dark:bg-[#181b24] p-6 shadow-2xl space-y-3 font-sans"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-rose-600">
                {confirmAction.kind === "revoke" ? <ShieldCheck size={17} /> : <Trash2 size={17} />}
                <h3 className="text-sm font-bold text-[#1c1b18] dark:text-white">
                  {confirmAction.kind === "revoke" ? "Revoke API key?" : "Delete key record?"}
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-[#706c64] dark:text-white/70">
                {confirmAction.kind === "revoke"
                  ? `Integrations using “${confirmAction.key.name}” will stop working immediately.`
                  : `Removes the history record for “${confirmAction.key.name}”.`}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="rounded-xl border border-[#e8e4db] dark:border-white/10 px-3.5 py-1.5 text-xs font-semibold text-[#706c64] dark:text-white/80 hover:bg-[#ede8df] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => (confirmAction.kind === "revoke" ? doRevoke(confirmAction.key) : doDelete(confirmAction.key))}
                  disabled={busyId === confirmAction.key.id}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-1.5 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
                >
                  {confirmAction.kind === "revoke" ? "Revoke Key" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "revoked" | "expired" }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    revoked: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
    expired: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  }[status];

  return (
    <span className={cn("rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", styles)}>
      {status}
    </span>
  );
}
