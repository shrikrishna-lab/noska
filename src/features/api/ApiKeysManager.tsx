import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { listApiKeys, createApiKey, revokeApiKey, rotateApiKey, deleteApiKey, type ApiKeyRecord } from "../../lib/apiKeys";
import { SCOPES } from "./apiContract";

const EXPIRY_OPTIONS = [
  { label: "No expiration", days: null },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
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
  const [newScopes, setNewScopes] = useState<string[]>(["pages:read"]);
  const [newExpiry, setNewExpiry] = useState<number | null>(30);
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
      const { record, rawKey } = await createApiKey(userId, { name: newName, scopes: newScopes, expiresInDays: newExpiry });
      setKeys((prev) => [record, ...prev]);
      setRevealedKey({ raw: rawKey, name: record.name });
      setNewName("");
      setNewScopes(["pages:read"]);
      onToast?.("API key created — copy it now, it won't be shown again.");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Failed to create key.");
    } finally {
      setCreating(false);
    }
  };

  const toggleScope = (scope: string) =>
    setNewScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));

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
    <div className="space-y-5">
      {/* Create form */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus size={14} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--text)]">Create a key</span>
        </div>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Key name — e.g. “My script”, “Zapier”"
          className="mb-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
        />
        <div className="mb-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Scopes</div>
          <div className="flex flex-wrap gap-1.5">
            {SCOPES.map((s) => {
              const active = newScopes.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleScope(s.id)}
                  title={s.description}
                  className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
                    active
                      ? "border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--text)]"
                      : "border-[var(--border)] text-[var(--secondary)] hover:bg-[var(--hover)]"
                  }`}
                >
                  {s.id}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <select
            value={newExpiry ?? ""}
            onChange={(e) => setNewExpiry(e.target.value === "" ? null : Number(e.target.value))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.label} value={o.days ?? ""}>
                Expires: {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={creating || !userId}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <KeyRound size={13} />
            {creating ? "Creating…" : "Generate key"}
          </button>
        </div>
      </div>

      {/* Key list */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-xs text-[var(--muted)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4 text-center">
          <span className="text-xs text-[var(--danger)]">{loadError}</span>
          <button onClick={refresh} className="rounded-md border border-[var(--border)] px-3 py-1 text-[11px] text-[var(--text)] hover:bg-[var(--hover)]">
            Retry
          </button>
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
          <KeyRound size={20} className="mx-auto mb-2 text-[var(--muted)]" />
          <p className="text-xs font-medium text-[var(--secondary)]">No API keys yet</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">Generate one above to start using the Noska API.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => {
            const expired = k.expires_at && new Date(k.expires_at).getTime() < Date.now();
            const status: "active" | "revoked" | "expired" = k.revoked_at ? "revoked" : expired ? "expired" : "active";
            return (
              <motion.div
                key={k.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--text)]">{k.name}</span>
                      <StatusBadge status={status} />
                    </div>
                    <code className="mt-0.5 block font-mono text-[11px] text-[var(--secondary)]">{k.prefix}…</code>
                  </div>
                  <div className="flex items-center gap-1">
                    {status === "active" && (
                      <>
                        <IconBtn title="Rotate — replace with a new secret" disabled={busyId === k.id} onClick={() => doRotate(k)}>
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
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[var(--muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={10} /> Created {timeAgo(k.created_at)}
                  </span>
                  <span>Last used {timeAgo(k.last_used_at)}</span>
                  {k.expires_at && <span>{status === "expired" ? "Expired" : "Expires"} {new Date(k.expires_at).toLocaleDateString()}</span>}
                  <span className="flex flex-wrap gap-1">
                    {(Array.isArray(k.scopes) ? k.scopes : []).map((s) => (
                      <code key={s} className="rounded bg-[var(--hover)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--secondary)]">{s}</code>
                    ))}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* One-time reveal modal */}
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
              className="w-[460px] max-w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] p-5 shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center gap-2 text-[var(--warning)]">
                <AlertTriangle size={16} />
                <h3 className="text-sm font-semibold text-[var(--text)]">Copy your key now</h3>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-[var(--secondary)]">
                This is the only time <span className="font-medium text-[var(--text)]">“{revealedKey.name}”</span> can be viewed.
                Noska stores only a SHA-256 hash — losing it means generating a new key.
              </p>
              <div className="mb-4 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text)]">
                  {revealedKey.raw}
                </code>
                <button
                  onClick={copyRaw}
                  className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                  {copiedRaw ? <Check size={13} /> : <Copy size={13} />}
                  {copiedRaw ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                onClick={() => setRevealedKey(null)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)]"
              >
                I've stored it safely
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm revoke/delete */}
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
              className="w-[380px] max-w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] p-5 shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center gap-2 text-[var(--danger)]">
                {confirmAction.kind === "revoke" ? <ShieldCheck size={16} /> : <Trash2 size={16} />}
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  {confirmAction.kind === "revoke" ? "Revoke this key?" : "Delete this key record?"}
                </h3>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-[var(--secondary)]">
                {confirmAction.kind === "revoke"
                  ? `Any script using “${confirmAction.key.name}” will stop working immediately. This cannot be undone.`
                  : `Removes the record for “${confirmAction.key.name}” from your history.`}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => (confirmAction.kind === "revoke" ? doRevoke(confirmAction.key) : doDelete(confirmAction.key))}
                  disabled={busyId === confirmAction.key.id}
                  className="rounded-lg bg-[var(--danger)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {confirmAction.kind === "revoke" ? "Revoke key" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Small pieces ─── */

function StatusBadge({ status }: { status: "active" | "revoked" | "expired" }) {
  const styles = {
    active: "bg-[var(--success)]/10 text-[var(--success)]",
    revoked: "bg-[var(--danger)]/10 text-[var(--danger)]",
    expired: "bg-[var(--warning)]/10 text-[var(--warning)]",
  }[status];
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${styles}`}>{status}</span>
  );
}

function IconBtn({ children, title, onClick, danger, disabled }: {
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
      className={`grid h-7 w-7 place-items-center rounded-md border border-transparent text-[var(--secondary)] transition-colors hover:bg-[var(--hover)] ${
        danger ? "hover:text-[var(--danger)]" : "hover:text-[var(--text)]"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}
