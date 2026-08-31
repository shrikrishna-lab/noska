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
} from "lucide-react";
import { listApiKeys, createApiKey, revokeApiKey, rotateApiKey, deleteApiKey, type ApiKeyRecord } from "../../lib/apiKeys";
import { SCOPES } from "./apiContract";
import { cn } from "../../lib/utils";

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
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>(["pages:read", "pages:write"]);
  const [newExpiry, setNewExpiry] = useState<number | null>(30);
  const [newReadOnly, setNewReadOnly] = useState(false);
  const [newAllowedTools, setNewAllowedTools] = useState("");
  const [revealedKey, setRevealedKey] = useState<{ raw: string; name: string } | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);
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
      onToast?.("Rotated — old key is dead, copy the new one now.");
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
      onToast?.("Key deleted.");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Failed to delete key.");
    } finally {
      setBusyId(null);
      setConfirmAction(null);
    }
  };

  /* ─── Render ─── */

  return (
    <div className="space-y-6 font-sans">
      {/* Create Form Card */}
      <div className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] p-5.5 border border-[#e8e4db] dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#ede8df] dark:bg-white/10 flex items-center justify-center text-[#1c1b18] dark:text-white shadow-xs">
              <KeyRound size={14} className="text-[#a8824b] dark:text-amber-400" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-[#1c1b18] dark:text-white">Create API Key</span>
              <p className="text-[11px] text-[#706c64] dark:text-white/60">Generate a secret bearer token for REST endpoints and scripts.</p>
            </div>
          </div>
        </div>

        {/* Key Name Input */}
        <div>
          <label className="block text-[11px] font-bold text-[#706c64] dark:text-white/70 uppercase tracking-wider mb-1.5">
            Key Name
          </label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. “Zapier Automation”, “Production Backend”, “Data Sync”"
            className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-white/80 dark:bg-[#14161f] px-3.5 py-2.5 text-xs text-[#1c1b18] dark:text-white placeholder-[#8c887f] dark:placeholder-white/40 focus:outline-none focus:border-[#1c1b18]/40 dark:focus:border-white/30 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all shadow-inner"
          />
        </div>

        {/* Scopes Section */}
        <div className="space-y-3 pt-1">
          {/* Scopes Header & Quick Presets Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-[#706c64] dark:text-white/70 uppercase tracking-wider">
                Scopes & Permissions
              </label>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#ede8df] dark:bg-white/10 text-[#1c1b18] dark:text-white/90 border border-[#e0dad0] dark:border-white/5">
                {newScopes.length} of {SCOPES.length} selected
              </span>
            </div>

            {/* Clean Horizontal Single-Line Preset Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {PRESETS.map((p) => {
                const isMatch = p.scopes.length === newScopes.length && p.scopes.every((s) => newScopes.includes(s));
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.scopes)}
                    className={cn(
                      "whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border shrink-0",
                      isMatch
                        ? "bg-[#1c1b18] text-white border-black shadow-xs"
                        : "bg-white/80 dark:bg-white/5 text-[#706c64] dark:text-white/70 hover:bg-[#ede8df] hover:text-[#1c1b18] border-[#e8e4db] dark:border-white/10"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setNewScopes([])}
                className="whitespace-nowrap px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#8c887f] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent transition cursor-pointer shrink-0"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Categorized Scope Groups */}
          <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-[#14161f] border border-[#e8e4db] dark:border-white/10 space-y-3.5 shadow-inner">
            {/* 1. Pages & Content */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8c887f] dark:text-white/50 mb-1.5">
                Pages & Templates
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
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[11px] transition-all cursor-pointer select-none",
                        active
                          ? "bg-blue-600 dark:bg-sky-500 text-white font-bold border-transparent shadow-xs"
                          : "bg-white dark:bg-white/5 text-[#555] dark:text-white/70 hover:bg-[#ede8df] hover:text-[#1c1b18] border-[#e0dad0] dark:border-white/10"
                      )}
                    >
                      {active && <Check size={11} className="stroke-[3]" />}
                      <span>{s.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Databases & Workspaces */}
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
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[11px] transition-all cursor-pointer select-none",
                        active
                          ? "bg-emerald-600 dark:bg-emerald-500 text-white font-bold border-transparent shadow-xs"
                          : "bg-white dark:bg-white/5 text-[#555] dark:text-white/70 hover:bg-[#ede8df] hover:text-[#1c1b18] border-[#e0dad0] dark:border-white/10"
                      )}
                    >
                      {active && <Check size={11} className="stroke-[3]" />}
                      <span>{s.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Tasks & Spaced Repetition */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8c887f] dark:text-white/50 mb-1.5">
                Tasks & Learning
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
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[11px] transition-all cursor-pointer select-none",
                        active
                          ? "bg-purple-600 dark:bg-purple-500 text-white font-bold border-transparent shadow-xs"
                          : "bg-white dark:bg-white/5 text-[#555] dark:text-white/70 hover:bg-[#ede8df] hover:text-[#1c1b18] border-[#e0dad0] dark:border-white/10"
                      )}
                    >
                      {active && <Check size={11} className="stroke-[3]" />}
                      <span>{s.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Agents, Automations & Webhooks */}
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
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[11px] transition-all cursor-pointer select-none",
                        active
                          ? "bg-amber-600 dark:bg-amber-500 text-white font-bold border-transparent shadow-xs"
                          : "bg-white dark:bg-white/5 text-[#555] dark:text-white/70 hover:bg-[#ede8df] hover:text-[#1c1b18] border-[#e0dad0] dark:border-white/10"
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

        {/* Read-Only Mode & Tool Allowlist */}
        <div className="space-y-3 pt-2 border-t border-[#e8e4db] dark:border-white/10">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/70 dark:bg-[#14161f] border border-[#e8e4db] dark:border-white/10">
            <div>
              <div className="text-xs font-bold text-[#1c1b18] dark:text-white">Enforce Read-Only Mode</div>
              <div className="text-[11px] text-[#706c64] dark:text-white/60">
                Safely blocks all mutating HTTP methods (POST, PATCH, DELETE).
              </div>
            </div>

            {/* Apple-style Smooth Toggle */}
            <button
              type="button"
              onClick={() => setNewReadOnly(!newReadOnly)}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 shrink-0",
                newReadOnly ? "bg-[#1c1b18] dark:bg-sky-400" : "bg-[#ede8df] dark:bg-white/15"
              )}
            >
              <motion.div
                animate={{ x: newReadOnly ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-5 h-5 rounded-full bg-white shadow-sm"
              />
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#706c64] dark:text-white/70 uppercase tracking-wider mb-1.5">
              Tool Allowlist (Optional)
            </label>
            <input
              value={newAllowedTools}
              onChange={(e) => setNewAllowedTools(e.target.value)}
              placeholder="e.g. search, fetch, list-tasks (leave empty to allow all scope-permitted tools)"
              className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-white/80 dark:bg-[#14161f] px-3.5 py-2 font-mono text-[11px] text-[#1c1b18] dark:text-white placeholder-[#8c887f] dark:placeholder-white/40 focus:outline-none focus:border-[#1c1b18]/40 dark:focus:border-white/30 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Bottom Bar: Expiration & Action Button */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Clock3 size={13} className="text-[#8c887f] dark:text-white/50 shrink-0" />
            <select
              value={newExpiry ?? ""}
              onChange={(e) => setNewExpiry(e.target.value === "" ? null : Number(e.target.value))}
              className="rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#ede8df] dark:bg-[#14161f] px-3 py-1.5 text-xs font-semibold text-[#1c1b18] dark:text-white focus:outline-none cursor-pointer"
            >
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.label} value={o.days ?? ""}>
                  Expires: {o.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !userId}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1c1b18] hover:bg-black text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <KeyRound size={13} />
            <span>{creating ? "Creating…" : "Generate API Key"}</span>
          </button>
        </div>
      </div>

      {/* Active Keys List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold tracking-tight text-[#1c1b18] dark:text-white">Active API Keys</h2>
          <span className="text-[11px] font-mono text-[#706c64] dark:text-white/60 font-semibold">{keys.length} keys</span>
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
          <div className="rounded-2xl border border-dashed border-[#e8e4db] dark:border-white/10 p-8 text-center bg-[#f8f6f0]/50 dark:bg-white/[0.02]">
            <KeyRound size={22} className="mx-auto mb-2 text-[#a8824b] dark:text-amber-400 opacity-80" />
            <p className="text-xs font-bold text-[#1c1b18] dark:text-white">No active API keys</p>
            <p className="mt-1 text-[11px] text-[#706c64] dark:text-white/60">
              Create an API key above to authenticate custom scripts and integrations.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {keys.map((k) => {
              const expired = k.expires_at && new Date(k.expires_at).getTime() < Date.now();
              const status: "active" | "revoked" | "expired" = k.revoked_at ? "revoked" : expired ? "expired" : "active";
              return (
                <motion.div
                  key={k.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-[#181b24] p-4 shadow-xs transition-all hover:border-[#ded8cc]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-bold tracking-tight text-[#1c1b18] dark:text-white">{k.name}</span>
                        <StatusBadge status={status} />
                      </div>
                      <code className="mt-0.5 block font-mono text-[11px] text-[#706c64] dark:text-white/60">{k.prefix}…</code>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {status === "active" && (
                        <>
                          <IconBtn title="Rotate — generate replacement key" disabled={busyId === k.id} onClick={() => doRotate(k)}>
                            <RotateCw size={13} />
                          </IconBtn>
                          <IconBtn title="Revoke immediately" danger disabled={busyId === k.id} onClick={() => setConfirmAction({ kind: "revoke", key: k })}>
                            <Ban size={13} />
                          </IconBtn>
                        </>
                      )}
                      <IconBtn title="Delete record" danger disabled={busyId === k.id} onClick={() => setConfirmAction({ kind: "delete", key: k })}>
                        <Trash2 size={13} />
                      </IconBtn>
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
                        <code key={s} className="rounded-md bg-[#ede8df] dark:bg-white/10 px-1.5 py-0.5 font-mono text-[9.5px] text-[#4a4742] dark:text-white/80">
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
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* One-Time Key Reveal Modal */}
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
              className="w-[460px] max-w-full rounded-2xl border border-white/20 bg-[#1c1b18] p-5 shadow-2xl text-white select-none"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center gap-2 text-amber-400">
                <AlertTriangle size={17} />
                <h3 className="text-sm font-bold tracking-tight text-white">Save Your API Key Now</h3>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-white/70">
                This is the only time <span className="font-semibold text-white">“{revealedKey.name}”</span> will be revealed.
                Noska only stores the SHA-256 hash. If lost, you must generate a new key.
              </p>

              {/* Secret Key Display Box */}
              <div className="mb-4 flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 font-mono text-xs text-white select-all">
                  {revealedKey.raw}
                </code>
                <button
                  onClick={copyRaw}
                  className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-white/90 text-black px-4 py-2.5 text-xs font-bold transition shadow-sm cursor-pointer shrink-0"
                >
                  {copiedRaw ? <Check size={13} className="text-emerald-600 stroke-[3]" /> : <Copy size={13} />}
                  <span>{copiedRaw ? "Copied!" : "Copy"}</span>
                </button>
              </div>

              <button
                onClick={() => setRevealedKey(null)}
                className="w-full rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-semibold text-white transition cursor-pointer"
              >
                I have securely saved this key
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Revoke / Delete Modal */}
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
              className="w-[380px] max-w-full rounded-2xl border border-[#e8e4db] dark:border-white/15 bg-[#f8f6f0] dark:bg-[#181b24] p-5 shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center gap-2 text-rose-600">
                {confirmAction.kind === "revoke" ? <ShieldCheck size={16} /> : <Trash2 size={16} />}
                <h3 className="text-sm font-bold text-[#1c1b18] dark:text-white">
                  {confirmAction.kind === "revoke" ? "Revoke this API key?" : "Delete this key record?"}
                </h3>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-[#706c64] dark:text-white/70">
                {confirmAction.kind === "revoke"
                  ? `Any integration or script using “${confirmAction.key.name}” will stop working immediately.`
                  : `Removes the record for “${confirmAction.key.name}” from your active history.`}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="rounded-xl border border-[#e8e4db] dark:border-white/10 px-3.5 py-2 text-xs font-semibold text-[#706c64] dark:text-white/80 hover:bg-[#ede8df] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => (confirmAction.kind === "revoke" ? doRevoke(confirmAction.key) : doDelete(confirmAction.key))}
                  disabled={busyId === confirmAction.key.id}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
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

/* ─── Small Pieces ─── */

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

function IconBtn({
  children,
  title,
  onClick,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-lg border border-transparent transition-all cursor-pointer",
        danger
          ? "text-[#706c64] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15"
          : "text-[#706c64] hover:text-[#1c1b18] dark:text-white/60 dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}
