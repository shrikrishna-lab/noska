import React, { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Trash2, Star, Eye, Loader2, Search, Eraser } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface MemoryRow {
  id: string;
  agent_id: string | null;
  page_id: string | null;
  scope: string;
  content: string;
  summary: string | null;
  importance: number;
  confidence: number;
  keywords: string[];
  status: string;
  expires_at: string | null;
  access_count: number;
  updated_at: string;
}

const IMPORTANCE_LABELS = ["", "Low", "Medium", "High", "Critical"];
const IMPORTANCE_TONES = ["", "text-[var(--muted)]", "text-[var(--secondary)]", "text-[var(--warning)]", "text-[var(--danger)]"];

/**
 * Memory Manager (#30/#31) — inspect, edit, delete, expire, and bulk-forget
 * scoped agent memories. Backed by the durable agent_memories table (RLS
 * owner-scoped); nothing lives only in localStorage.
 */
export default function MemoryManager({ agents, onToast }: {
  agents: Array<{ id: string; name: string; icon: string }>;
  onToast?: (m: string) => void;
}) {
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeFilter, setScopeFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      // agent_memories isn't in the generated types yet — access loosely.
      const base = supabase as unknown as { from: (t: string) => any };
      let q = base.from("agent_memories").select("*").neq("status", "forgotten");
      if (agentFilter !== "all") q = q.or(`agent_id.eq.${agentFilter},agent_id.is.null`);
      const { data } = await q.order("updated_at", { ascending: false }).limit(100);
      setMemories((data ?? []) as unknown as MemoryRow[]);
    } catch { /* pre-migration */ }
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [agentFilter]);

  const filtered = useMemo(() => {
    return memories.filter((m) => {
      if (scopeFilter !== "all" && m.scope !== scopeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!(m.content.toLowerCase().includes(q) || (m.summary || "").toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [memories, scopeFilter, search]);

  const patch = async (id: string, fields: Partial<MemoryRow>) => {
    setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, ...fields } : m)));
    try {
      const base = supabase as unknown as { from: (t: string) => any };
      await base.from("agent_memories").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id);
    } catch { onToast?.("Update failed"); }
  };

  const forget = async (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    const base = supabase as unknown as { from: (t: string) => any };
    await base.from("agent_memories").update({ status: "forgotten" }).eq("id", id);
    onToast?.("Forgotten");
  };

  /** "Forget everything about this project/agent" — scoped, never global. */
  const forgetAllForAgent = async (agentId: string) => {
    setMemories((prev) => prev.filter((m) => m.agent_id !== agentId));
    const base = supabase as unknown as { from: (t: string) => any };
    await base.from("agent_memories").update({ status: "forgotten" }).eq("agent_id", agentId).eq("status", "active");
    onToast?.(`Forgot all memories for ${agents.find((a) => a.id === agentId)?.name || "agent"}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <BrainCircuit size={14} className="text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">Agent Memory</h3>
          <span className="text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded">{filtered.length} memories</span>
        </div>
        <div className="flex items-center gap-1.5">
          {agents.length > 0 && (
            <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--text)] outline-none">
              <option value="all">All agents</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
          )}
          <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--text)] outline-none">
            <option value="all">All scopes</option>
            <option value="agent">Agent</option>
            <option value="page">Page</option>
            <option value="workspace">Workspace</option>
            <option value="user">User</option>
          </select>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1">
            <Search size={9} className="text-[var(--muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="bg-transparent text-[10px] outline-none w-20" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 justify-center"><Loader2 size={14} className="animate-spin text-[var(--muted)]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-[var(--border)] rounded-xl">
          <BrainCircuit size={24} className="mx-auto text-[var(--muted)] mb-2" />
          <p className="text-xs text-[var(--muted)]">No memories yet.</p>
          <p className="text-[10px] text-[var(--muted)] mt-0.5">Agents remember facts and preferences during runs — you control what stays.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((m) => {
            const stale = m.status === "stale";
            const expired = m.expires_at && new Date(m.expires_at).getTime() < Date.now();
            return (
              <div key={m.id} className={`rounded-xl border p-3 ${stale || expired ? "border-[var(--border)] opacity-55" : "border-[var(--border)]"} bg-[var(--surface)]`}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]`}>{m.scope}</span>
                      <span className={`text-[9px] font-semibold ${IMPORTANCE_TONES[m.importance]}`}>{IMPORTANCE_LABELS[m.importance]}</span>
                      {(stale || expired) && <span className="text-[8px] font-bold uppercase text-[var(--muted)]">{expired ? "expired" : "superseded"}</span>}
                      <span className="text-[8px] text-[var(--muted)]">conf {Math.round(Number(m.confidence) * 100)}%</span>
                    </div>
                    {editingId === m.id ? (
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full mt-1 rounded-md bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-[11px] outline-none resize-none"
                      />
                    ) : (
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed break-words">{m.content}</p>
                    )}
                    <p className="text-[8px] text-[var(--muted)] mt-1">
                      {new Date(m.updated_at).toLocaleDateString()} · accessed {m.access_count}× · keywords: {(m.keywords || []).slice(0, 4).join(", ") || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {editingId === m.id ? (
                      <>
                        <button onClick={() => { void patch(m.id, { content: editText }); setEditingId(null); onToast?.("Memory updated"); }} className="rounded px-1.5 py-1 text-[9px] font-semibold bg-[var(--accent)] text-white">Save</button>
                        <button onClick={() => setEditingId(null)} className="rounded px-1.5 py-1 text-[9px] text-[var(--muted)]">Cancel</button>
                      </>
                    ) : (
                      <>
                        <IconBtn title="Edit" onClick={() => { setEditingId(m.id); setEditText(m.content); }}><Eye size={11} /></IconBtn>
                        <IconBtn title="Mark important" onClick={() => void patch(m.id, { importance: 4 })}><Star size={11} /></IconBtn>
                        <IconBtn title="Forget" danger onClick={() => void forget(m.id)}><Trash2 size={11} /></IconBtn>
                      </>
                    )}
                  </div>
                </div>
                {/* Expiration control */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <label className="text-[8px] text-[var(--muted)]">Expires:</label>
                  <input
                    type="date"
                    value={m.expires_at ? m.expires_at.slice(0, 10) : ""}
                    onChange={(e) => void patch(m.id, { expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 text-[9px] text-[var(--text)] outline-none"
                  />
                  {!m.expires_at && (
                    <button onClick={() => void patch(m.id, { expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString() })} className="text-[8px] text-[var(--muted)] hover:text-[var(--text)]">+7 days</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scoped forget-all */}
      {agentFilter !== "all" && filtered.length > 0 && (
        <button
          onClick={() => void forgetAllForAgent(agentFilter)}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-[var(--danger)]/25 text-[var(--danger)] hover:bg-[var(--danger)]/8 px-3 py-1.5 text-[10px] font-semibold transition"
        >
          <Eraser size={11} /> Forget everything for {agents.find((a) => a.id === agentFilter)?.name}
        </button>
      )}
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick} className={`p-1.5 rounded text-[var(--muted)] hover:bg-[var(--hover)] transition ${danger ? "hover:text-[var(--danger)]" : "hover:text-[var(--text)]"}`}>
      {children}
    </button>
  );
}
