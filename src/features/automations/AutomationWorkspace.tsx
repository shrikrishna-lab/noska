import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Plus, Clock, ChevronRight, Trash2, ToggleLeft, ToggleRight,
  Activity, Play, Loader2, Copy, ShieldCheck, Sparkles, Wand2, XCircle,
  ArrowUp, ArrowDown,
  type LucideIcon,
} from "lucide-react";
import { uid } from "../../utils/blockModel";
import {
  fetchAutomations, saveAutomation, deleteAutomationById, blankAutomation,
  AUTOMATION_TEMPLATES, type NoskaAutomation, type AutomationStep,
} from "./automationStore";
import {
  describeTrigger, parseSchedule, agentRuntime, subscribeRuns,
  proposeAutomation, respondToApproval, subscribeApprovals,
  evaluatePermission,
} from "../../ai/runtime";
import type { RunRecord, ApprovalRequest, Condition } from "../../ai/runtime";
import { refreshDefinitions, launchAutomationManually } from "../../intelligence/triggerService";
import RunsExplorer from "../../components/ai/RunsExplorer";

interface AutomationWorkspaceProps {
  onToast?: (message: string) => void;
}

type Tab = "mine" | "templates" | "runs";

export default function AutomationWorkspace({ onToast }: AutomationWorkspaceProps) {
  const [tab, setTab] = useState<Tab>("mine");
  const [automations, setAutomations] = useState<NoskaAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NoskaAutomation | "new" | "nl" | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);

  useEffect(() => {
    void (async () => {
      setAutomations(await fetchAutomations());
      setLoading(false);
    })();
  }, []);

  useEffect(() => subscribeRuns(setRuns), []);
  useEffect(() => subscribeApprovals(setApprovals), []);

  const handleSave = useCallback(async (a: NoskaAutomation) => {
    const saved = await saveAutomation(a);
    setAutomations(prev => {
      const idx = prev.findIndex(x => x.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    await refreshDefinitions();
    setEditing(null);
    onToast?.(`Automation "${saved.name}" saved`);
  }, [onToast]);

  return (
    <div className="flex h-full bg-[var(--bg)]">
      <div className="w-52 border-r border-[var(--border)] shrink-0 flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2"><Zap size={15} className="text-[var(--warning)]" /> Automations</h2>
        </div>
        <div className="flex-1 p-2 space-y-1">
          <TabButton icon={Zap} label="My Automations" active={tab === "mine"} onClick={() => { setTab("mine"); setEditing(null); }} count={automations.length} />
          <TabButton icon={Copy} label="Templates" active={tab === "templates"} onClick={() => { setTab("templates"); setEditing(null); }} />
          <TabButton icon={Activity} label="Runs" active={tab === "runs"} onClick={() => { setTab("runs"); setEditing(null); }} count={runs.filter(r => r.sourceKind === "automation").length || undefined} />
        </div>
        <div className="p-3 border-t border-[var(--border)] space-y-1.5">
          <button onClick={() => setEditing("nl")} className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent)]/90 transition"><Wand2 size={12} /> Describe it</button>
          <button onClick={() => setEditing("new")} className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--secondary)] hover:bg-[var(--hover)] transition"><Plus size={12} /> Build manually</button>
        </div>
      </div>

      {approvals.length > 0 && (
        <ApprovalSidebar approvals={approvals} onResolved={() => onToast?.("Decision recorded")} />
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          {editing === "nl" ? (
            <NaturalLanguageBuilder key="nl" onSave={handleSave} onCancel={() => setEditing(null)} />
          ) : editing ? (
            <AutomationEditor
              key={editing === "new" ? "new" : editing.id}
              initial={editing === "new" ? blankAutomation() : editing}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          ) : tab === "mine" ? (
            <MyAutomationsView automations={automations} loading={loading}
              latestRuns={Object.fromEntries(runs.filter(r => r.sourceKind === "automation").map(r => [r.sourceId, r]))}
              onNew={() => setEditing("new")} onEdit={(a) => setEditing(a)} onToggle={async (a) => {
              const updated = { ...a, status: a.status === "active" ? ("paused" as const) : ("active" as const) };
              setAutomations(prev => prev.map(x => x.id === a.id ? updated : x));
              await saveAutomation(updated);
              await refreshDefinitions();
              onToast?.(updated.status === "active" ? `${updated.name} activated` : `${updated.name} paused`);
            }} onDelete={async (id) => {
              setAutomations(prev => prev.filter(x => x.id !== id));
              await deleteAutomationById(id);
              await refreshDefinitions();
              onToast?.("Automation deleted");
            }} onRun={async (a) => {
              if (agentRuntime.isActive(a.id)) { onToast?.("Already running"); return; }
              onToast?.(`Running ${a.name}…`);
              await launchAutomationManually(a);
              onToast?.(`${a.name} finished — see Runs`);
            }} />
          ) : tab === "templates" ? (
            <TemplatesView onUse={(t) => setEditing(t.build())} />
          ) : (
            <div className="p-6 max-w-3xl">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Runs</h2>
              <p className="text-[10px] text-[var(--muted)] mb-4">Server-side and manual executions with full traces. Live updates stream in automatically.</p>
              <RunsExplorer sourceKind="automation" automations={automations.map((a) => ({ id: a.id, name: a.name, icon: a.icon }))} onToast={onToast} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TabButton({ icon: Icon, label, active, onClick, count }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition ${active ? "bg-[var(--warning)]/10 text-[var(--warning)]" : "text-[var(--secondary)] hover:bg-[var(--hover)]"}`}>
      <Icon size={14} /> {label} {count !== undefined && <span className="ml-auto text-[10px] text-[var(--muted)]">{count}</span>}
    </button>
  );
}

// ─── My Automations ────────────────────────────────────────────────────────

function MyAutomationsView({ automations, loading, latestRuns, onNew, onEdit, onToggle, onDelete, onRun }: {
  automations: NoskaAutomation[];
  loading: boolean;
  latestRuns: Record<string, RunRecord>;
  onNew: () => void;
  onEdit: (a: NoskaAutomation) => void;
  onToggle: (a: NoskaAutomation) => void;
  onDelete: (id: string) => void;
  onRun: (a: NoskaAutomation) => void;
}) {
  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">My Automations ({automations.length})</h2>
          <p className="text-[10px] text-[var(--muted)] mt-0.5">Deterministic rules that run on events or schedules.</p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center"><Loader2 size={16} className="animate-spin text-[var(--muted)]" /><span className="text-xs text-[var(--muted)]">Loading…</span></div>
      ) : automations.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl">
          <Zap size={32} className="mx-auto text-[var(--muted)] mb-2" />
          <p className="text-xs text-[var(--muted)] mb-3">No automations yet.</p>
          <p className="text-[10px] text-[var(--muted)]">Try &quot;When a task is completed, summarize it&quot; in Noska AI</p>
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map(a => (
            <motion.div key={a.id} layout className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-[var(--text)]">{a.name}</h4>
                    {a.status === "active"
                      ? <span className="flex items-center gap-1 text-[9px] font-medium text-[var(--success)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />Active</span>
                      : <span className="flex items-center gap-1 text-[9px] font-medium text-[var(--muted)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]" />Paused</span>}
                  </div>
                  <p className="text-[11px] text-[var(--muted)] truncate mt-0.5">{a.description || "No description"}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded"><Clock size={8} />{describeTrigger(a.trigger)}</span>
                    {a.conditions && a.conditions.conditions.length > 0 && (
                      <span className="text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded">{a.conditions.op.toUpperCase()} · {a.conditions.conditions.length} condition{a.conditions.conditions.length !== 1 ? "s" : ""}</span>
                    )}
                    <span className="text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded">{a.steps.length} step{a.steps.length !== 1 ? "s" : ""}</span>
                    <LastRunChip run={latestRuns[a.id]} />
                    <HealthBadge health={a.health} streak={a.failureStreak} />
                    {a.nextRunAt && a.status === "active" && (
                      <span className="text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded">next: {new Date(a.nextRunAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button title="Run now" onClick={() => onRun(a)} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"><Play size={12} /></button>
                  <button title="Edit" onClick={() => onEdit(a)} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"><ChevronRight size={13} /></button>
                  <button title="Delete" onClick={() => onDelete(a.id)} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--hover)]"><Trash2 size={12} /></button>
                  <button onClick={() => onToggle(a)} className={`p-1.5 rounded ${a.status === "active" ? "text-[var(--success)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}>
                    {a.status === "active" ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Natural language builder ──────────────────────────────────────────────

function NaturalLanguageBuilder({ onSave, onCancel }: { onSave: (a: NoskaAutomation) => void; onCancel: () => void }) {
  const [description, setDescription] = useState("");
  const [proposal, setProposal] = useState<Awaited<ReturnType<typeof proposeAutomation>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setEditingDraft] = useState<NoskaAutomation | null>(null);

  const generate = useCallback(async () => {
    if (!description.trim()) return;
    setBusy(true);
    try {
      const p = await proposeAutomation(description);
      // Convert proposal into an editable automation
      const automation = blankAutomation({
        name: p.name,
        description: p.description,
        icon: p.icon,
        trigger: p.trigger,
        conditions: p.conditions ?? null,
        permissions: p.permissions,
        steps: p.actions.map(a => ({ id: uid(), label: a.label, kind: a.kind, instruction: a.instruction, toolName: a.toolName, toolParams: a.toolParams })),
      });
      setProposal(p);
      setEditingDraft(automation);
    } finally {
      setBusy(false);
    }
  }, [description]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onCancel} className="text-[var(--muted)] hover:text-[var(--text)] rotate-180"><ChevronRight size={16} /></button>
        <h2 className="text-lg font-semibold text-[var(--text)]">Describe your automation</h2>
      </div>
      <p className="text-[11px] text-[var(--muted)] mb-4 ml-7">Tell Noska what should happen and when. You review everything before it&apos;s created.</p>

      {!draft ? (
        <>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            autoFocus
            placeholder={'e.g. "When a task becomes completed, summarize the work and add the summary to a completion report."'}
            className="w-full rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--text)] outline-none resize-none focus:border-[var(--accent)]/40"
          />
          <div className="flex flex-wrap gap-1.5 mt-2 mb-4">
            {[
              "When a task is completed, summarize it and log to a report page",
              "Every day at 9am, check for overdue tasks and create a recovery plan",
              "Every Friday at 4pm, write a weekly progress report",
            ].map(example => (
              <button key={example} onClick={() => setDescription(example)} className="rounded-md border border-[var(--border)] px-2 py-1 text-[9px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition">{example}</button>
            ))}
          </div>
          <button
            onClick={generate}
            disabled={!description.trim() || busy}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent)]/90 disabled:opacity-40 transition"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Draft automation
          </button>
        </>
      ) : (
        <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/[0.04] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text)]">Automation Ready · {proposal ? describeTrigger(proposal.trigger) : ""}</span>
          </div>
          <div className="space-y-1.5 mb-3">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted)]">WHEN</div>
            <div className="rounded-md bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)]">{describeTrigger(draft.trigger)}</div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted)] pt-1">DO</div>
            {draft.steps.map((s, i) => (
              <div key={s.id} className="flex items-start gap-2 rounded-md bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1.5">
                <span className="text-[9px] font-bold text-[var(--muted)] mt-0.5">{i + 1}.</span>
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--text)] font-medium">{s.label}</p>
                  {s.instruction && <p className="text-[9px] text-[var(--muted)] line-clamp-2">{s.instruction}</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => draft && onSave({ ...draft, status: "active" })}
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent)]/90 transition"
            >
              Create Automation
            </button>
            <button
              onClick={() => draft && onSave({ ...draft, status: "paused" })}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)] transition"
            >
              Create paused
            </button>
            <button onClick={() => { setEditingDraft(null); setProposal(null); }} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">Redo</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Health indicator (#21) ────────────────────────────────────────────────

/** Last outcome for this automation from the live run store. */
function LastRunChip({ run }: { run?: RunRecord }) {
  if (!run) return null;
  const meta: Record<string, { color: string }> = {
    completed: { color: "text-[var(--success)]" },
    failed: { color: "text-[var(--danger)]" },
    rejected: { color: "text-[var(--danger)]" },
    awaiting_approval: { color: "text-[var(--warning)]" },
    interrupted: { color: "text-[var(--warning)]" },
  };
  const m = meta[run.status] ?? { color: "text-[var(--muted)]" };
  const ago = run.startedAt ? timeAgoShort(run.startedAt) : "";
  return (
    <span className={`text-[9px] font-semibold bg-[var(--bg)] px-1.5 py-0.5 rounded ${m.color}`} title={`Last run ${run.status}${run.summary ? `: ${run.summary.slice(0, 120)}` : ""}`}>
      last: {run.status.replace("_", " ")}{ago ? ` · ${ago}` : ""}
    </span>
  );
}

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function HealthBadge({ health, streak }: { health: NoskaAutomation["health"]; streak: number }) {
  const meta: Record<string, { label: string; cls: string }> = {
    healthy: { label: "Healthy", cls: "text-[var(--success)] bg-[var(--success)]/10" },
    warning: { label: streak > 0 ? `Warning · ${streak} failed` : "Warning", cls: "text-[var(--warning)] bg-[var(--warning)]/10" },
    failing: { label: `Failing · ${streak}×`, cls: "text-[var(--danger)] bg-[var(--danger)]/10" },
    disabled: { label: "Disabled", cls: "text-[var(--muted)] bg-[var(--bg)]" },
    waiting_approval: { label: "Awaiting approval", cls: "text-[var(--warning)] bg-[var(--warning)]/10" },
  };
  const m = meta[health] ?? meta.healthy;
  return <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${m.cls}`}>{m.label}</span>;
}

// ─── Condition builder ─────────────────────────────────────────────────────

const CONDITION_FIELDS = [
  "event.pageTitle",
  "event.blockText",
  "event.type",
  "event.detail",
  "ai.response",
];

const CONDITION_OPS: Array<{ value: string; label: string }> = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
  { value: "is_empty", label: "is empty" },
  { value: "not_empty", label: "is not empty" },
];

function ConditionEditor({ conditions, onChange }: {
  conditions: NoskaAutomation["conditions"];
  onChange: (c: NoskaAutomation["conditions"]) => void;
}) {
  const list = conditions?.conditions || [];
  const update = (idx: number, patch: Partial<Condition>) => {
    const next = list.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange({ op: conditions?.op || "and", conditions: next });
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={13} className="text-[var(--accent)]" />
        <span className="text-xs font-semibold text-[var(--text)]">Conditions</span>
        <span className="text-[9px] text-[var(--muted)]">optional — run only when these match</span>
      </div>

      {list.length === 0 ? (
        <button
          onClick={() => onChange({ op: "and", conditions: [{ field: "event.pageTitle", op: "contains", value: "" }] })}
          className="flex items-center gap-1 rounded-md border border-dashed border-[var(--border)] px-2.5 py-1.5 text-[10px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition"
        >
          <Plus size={10} /> Add condition
        </button>
      ) : (
        <>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--muted)]">Match</span>
            <div className="flex gap-0.5">
              {(["and", "or"] as const).map(op => (
                <button
                  key={op}
                  onClick={() => onChange({ op, conditions: list })}
                  className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase transition ${((conditions?.op || "and") === op) ? "bg-[var(--accent)]/12 text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--hover)]"}`}
                >
                  {op === "and" ? "ALL (AND)" : "ANY (OR)"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            {list.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 flex-wrap">
                {i > 0 && <span className="text-[8px] font-bold text-[var(--muted)] uppercase">{(conditions?.op || "and") === "and" ? "and" : "or"}</span>}
                <input
                  list="noska-condition-fields"
                  value={c.field}
                  onChange={e => update(i, { field: e.target.value })}
                  placeholder="field"
                  className="w-32 rounded bg-[var(--bg)] border border-[var(--border)] px-1.5 py-1 text-[10px] font-mono text-[var(--text)] outline-none"
                />
                <select value={c.op} onChange={e => update(i, { op: e.target.value as Condition["op"] })} className="rounded bg-[var(--bg)] border border-[var(--border)] px-1 py-1 text-[10px] text-[var(--text)] outline-none">
                  {CONDITION_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {!["is_empty", "not_empty"].includes(c.op) && (
                  <input
                    value={c.value ?? ""}
                    onChange={e => update(i, { value: e.target.value })}
                    placeholder="value"
                    className="flex-1 min-w-[80px] rounded bg-[var(--bg)] border border-[var(--border)] px-1.5 py-1 text-[10px] text-[var(--text)] outline-none"
                  />
                )}
                <button
                  onClick={() => {
                    const next = list.filter((_, j) => j !== i);
                    onChange(next.length > 0 ? { op: conditions?.op || "and", conditions: next } : null);
                  }}
                  className="p-1 text-[var(--muted)] hover:text-[var(--danger)]"
                  title="Remove condition"
                ><Trash2 size={10} /></button>
              </div>
            ))}
          </div>
          <datalist id="noska-condition-fields">
            {CONDITION_FIELDS.map(f => <option key={f} value={f} />)}
          </datalist>
          <button
            onClick={() => onChange({ op: conditions?.op || "and", conditions: [...list, { field: "event.pageTitle", op: "contains", value: "" }] })}
            className="mt-2 flex items-center gap-1 text-[10px] text-[var(--muted)] hover:text-[var(--text)]"
          ><Plus size={9} /> Add another</button>
        </>
      )}
    </div>
  );
}

// ─── Manual editor ─────────────────────────────────────────────────────────

const TOOL_OPTIONS = ["append_blocks", "add_todo", "create_page", "set_page_tags", "rename_page"];

function AutomationEditor({ initial, onSave, onCancel }: { initial: NoskaAutomation; onSave: (a: NoskaAutomation) => void; onCancel: () => void }) {
  const [form, setForm] = useState<NoskaAutomation>(initial);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onCancel} className="text-[var(--muted)] hover:text-[var(--text)] rotate-180"><ChevronRight size={16} /></button>
        <h2 className="text-lg font-semibold text-[var(--text)]">{initial.name ? `Edit ${initial.name}` : "Build Automation"}</h2>
      </div>

      <div className="space-y-4">
        {/* Visual flow preview */}
        <FlowPreview automation={form} />

        <div className="grid grid-cols-[1fr_72px] gap-4">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Automation name" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/40" />
          <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-lg text-center outline-none" />
        </div>
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this automation accomplish?" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/40" />

        {/* Trigger */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">WHEN (trigger)</label>
            <select value={form.trigger.type} onChange={e => {
              const t = e.target.value as NoskaAutomation["trigger"]["type"];
              setForm(f => ({ ...f, trigger: t === "schedule" ? { type: "schedule", schedule: f.trigger.schedule || { kind: "every_day", hour: 9, minute: 0 } } : { type: t } }));
            }} className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none">
              <option value="manual">Manual only</option>
              <option value="schedule">Schedule</option>
              <option value="page_created">Page created</option>
              <option value="page_updated">Page updated</option>
              <option value="task_completed">Task completed</option>
              <option value="title_changed">Title changed</option>
              <option value="page_trashed">Page trashed</option>
            </select>
          </div>
          {form.trigger.type === "schedule" && (
            <div>
              <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Schedule</label>
              <input
                placeholder='e.g. "every weekday at 8am"'
                onBlur={e => {
                  const s = parseSchedule(e.target.value);
                  if (s) setForm(f => ({ ...f, trigger: { type: "schedule", schedule: s } }));
                }}
                className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/40"
              />
            </div>
          )}
        </div>
        <p className="text-[10px] text-[var(--muted)] -mt-2">{describeTrigger(form.trigger)}</p>

        {/* Conditions (IF) */}
        <ConditionEditor
          conditions={form.conditions}
          onChange={(c) => setForm(f => ({ ...f, conditions: c }))}
        />

        {/* Steps */}
        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">THEN (steps)</label>
          <div className="space-y-1.5">
            {form.steps.map((step, i) => (
              <StepRow
                key={step.id}
                index={i}
                total={form.steps.length}
                step={step}
                onChange={(s) => setForm(f => ({ ...f, steps: f.steps.map(x => x.id === s.id ? s : x) }))}
                onDelete={() => setForm(f => ({ ...f, steps: f.steps.filter(x => x.id !== step.id) }))}
                onMove={(dir) => setForm(f => {
                  const j = i + dir;
                  if (j < 0 || j >= f.steps.length) return f;
                  const next = [...f.steps];
                  [next[i], next[j]] = [next[j], next[i]];
                  return { ...f, steps: next };
                })}
              />
            ))}
          </div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => setForm(f => ({ ...f, steps: [...f.steps, { id: uid(), label: "", kind: "ai_step", instruction: "" }] }))}
              className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition"
            >
              <Sparkles size={9} /> AI step
            </button>
            <button
              onClick={() => setForm(f => ({ ...f, steps: [...f.steps, { id: uid(), label: "", kind: "tool", toolName: "append_blocks", toolParams: { content: "" } }] }))}
              className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition"
            >
              <Zap size={9} /> Tool step
            </button>
            <button
              onClick={() => setForm(f => ({ ...f, steps: [...f.steps, { id: uid(), label: "", kind: "approval", instruction: "" }] }))}
              className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition"
            >
              <ShieldCheck size={9} /> Approval step
            </button>
          </div>
          <p className="text-[9px] text-[var(--muted)] mt-1.5">
            Variables like <code className="bg-[var(--bg)] px-1 rounded">{"{{event.pageTitle}}"}</code> and <code className="bg-[var(--bg)] px-1 rounded">{"{{ai.response}}"}</code> resolve safely from previous steps.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1 pb-2">
          <button
            onClick={() => {
              if (!form.name.trim()) return;
              onSave(form);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent)]/90 transition"
          >
            <Zap size={14} /> Save Automation
          </button>
          <button onClick={onCancel} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">Cancel</button>
        </div>
      </div>
    </motion.div>
  );
}

function FlowPreview({ automation }: { automation: NoskaAutomation }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 p-3 space-y-0">
      <FlowNode icon={<Clock size={10} />} label={describeTrigger(automation.trigger)} tone="trigger" />
      {automation.conditions && automation.conditions.conditions.length > 0 && (
        <FlowNode icon={<ShieldCheck size={10} />} label={`${automation.conditions.conditions.length} condition(s)`} tone="condition" />
      )}
      {automation.steps.map((s, i) => (
        <FlowNode key={s.id} icon={s.kind === "tool" ? <Zap size={10} /> : s.kind === "approval" ? <ShieldCheck size={10} /> : <Sparkles size={10} />} label={`${i + 1}. ${s.label || (s.kind === "tool" ? s.toolName : s.kind === "approval" ? "Approval" : "AI step")}`} tone={s.kind === "tool" ? "tool" : s.kind === "approval" ? "approval" : "ai"} />
      ))}
    </div>
  );
}

function FlowNode({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: "trigger" | "condition" | "ai" | "tool" | "approval" }) {
  const color =
    tone === "trigger" ? "text-[var(--warning)]" :
    tone === "condition" || tone === "approval" ? "text-[var(--accent)]" :
    tone === "tool" ? "text-[var(--success)]" : "text-[var(--accent)]";
  return (
    <div className="flex items-center gap-2">
      <div className={`w-6 h-6 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-[var(--text)] truncate">{label}</p>
      </div>
    </div>
  );
}

function StepRow({ index, total, step, onChange, onDelete, onMove }: {
  index: number;
  total: number;
  step: AutomationStep;
  onChange: (s: AutomationStep) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9px] font-bold text-[var(--muted)]">{index + 1}.</span>
        <select value={step.kind} onChange={e => onChange({ ...step, kind: e.target.value as AutomationStep["kind"] })} className="rounded bg-[var(--bg)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text)] outline-none">
          <option value="ai_step">AI step</option>
          <option value="tool">Tool</option>
          <option value="approval">Approval</option>
        </select>
        {step.kind === "tool" && (
          <select value={step.toolName || "append_blocks"} onChange={e => onChange({ ...step, toolName: e.target.value })} className="rounded bg-[var(--bg)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text)] outline-none">
            {TOOL_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button onClick={() => onMove(-1)} disabled={index === 0} title="Move up" className="p-0.5 text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30"><ArrowUp size={10} /></button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} title="Move down" className="p-0.5 text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30"><ArrowDown size={10} /></button>
          <button onClick={onDelete} title="Delete step" className="p-0.5 text-[var(--muted)] hover:text-[var(--danger)]"><Trash2 size={10} /></button>
        </div>
      </div>
      <input value={step.label} onChange={e => onChange({ ...step, label: e.target.value })} placeholder="Step label (shown in progress)" className="w-full rounded bg-[var(--bg)] border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text)] outline-none mb-1" />
      {step.kind === "ai_step" ? (
        <textarea value={step.instruction || ""} onChange={e => onChange({ ...step, instruction: e.target.value })} rows={2} placeholder="Instruction for the AI…" className="w-full rounded bg-[var(--bg)] border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text)] outline-none resize-none" />
      ) : step.kind === "approval" ? (
        <>
          <textarea value={step.instruction || ""} onChange={e => onChange({ ...step, instruction: e.target.value })} rows={2} placeholder="What the user is approving — the run pauses here until they decide…" className="w-full rounded bg-[var(--bg)] border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text)] outline-none resize-none" />
          <p className="text-[9px] text-[var(--muted)] mt-1">The run pauses and shows an approval prompt. Nothing after this step executes until approved.</p>
        </>
      ) : (
        <textarea
          value={String(step.toolParams?.content ?? "")}
          onChange={e => onChange({ ...step, toolParams: { ...(step.toolParams || {}), content: e.target.value } })}
          rows={2}
          placeholder={"Content (markdown). Supports {{variables}}."}
          className="w-full rounded bg-[var(--bg)] border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text)] outline-none resize-none font-mono"
        />
      )}
    </div>
  );
}

// ─── Templates ─────────────────────────────────────────────────────────────

function TemplatesView({ onUse }: { onUse: (t: (typeof AUTOMATION_TEMPLATES)[number]) => void }) {
  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Automation Templates</h2>
      <p className="text-[10px] text-[var(--muted)] mb-5">Start from a proven workflow, then customize anything.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {AUTOMATION_TEMPLATES.map(t => {
          return (
            <motion.div key={t.key} whileHover={{ y: -2 }} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--text)]">{t.name}</h3>
                  <p className="text-[11px] text-[var(--secondary)] mt-0.5 leading-relaxed">{t.description}</p>
                  <span className="inline-flex items-center gap-1 text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded mt-2"><Clock size={8} />{t.triggerLabel}</span>
                  <button onClick={() => onUse(t)} className="mt-3 block rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[var(--accent)]/90 transition"><Plus size={10} className="inline mr-1" />Use template</button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Approvals sidebar ─────────────────────────────────────────────────────

function ApprovalSidebar({ approvals, onResolved }: { approvals: ApprovalRequest[]; onResolved: () => void }) {
  return (
    <div className="w-60 shrink-0 border-l border-[var(--border)] bg-[var(--warning)]/[0.04] p-3 overflow-y-auto scrollbar-thin hidden md:block">
      <div className="flex items-center gap-1.5 mb-2 text-[10px] font-semibold text-[var(--warning)]">
        <ShieldCheck size={11} /> Pending approvals ({approvals.length})
      </div>
      {approvals.map(apr => (
        <div key={apr.id} className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-2 mb-2">
          <p className="text-[10px] font-semibold text-[var(--text)] truncate">{apr.action}</p>
          <p className="text-[9px] text-[var(--muted)] mt-0.5 line-clamp-2">{apr.reason}</p>
          <div className="flex gap-1 mt-1.5">
            <button
              onClick={() => { respondToApproval(apr.id, true); onResolved(); }}
              className="flex-1 rounded bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/25 px-1.5 py-1 text-[9px] font-semibold"
            >Approve</button>
            <button
              onClick={() => { respondToApproval(apr.id, false); onResolved(); }}
              className="flex-1 rounded bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 px-1.5 py-1 text-[9px] font-semibold"
            >Decline</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Permission helper re-exported for potential admin views. */
export function canAuto(category: "read" | "create" | "update" | "delete"): boolean {
  return evaluatePermission(category === "delete" ? "trash_page" : category === "create" ? "create_page" : category === "update" ? "rename_page" : "search_pages", undefined).allowed;
}
