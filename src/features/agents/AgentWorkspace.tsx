import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Settings, Play, Plus, MessageCircle, FileText, Zap, Clock, ChevronRight, Globe, Shield, BookOpen, Trash2, Copy, ToggleLeft, ToggleRight, History, Loader2, BrainCircuit, Sparkles, type LucideIcon } from "lucide-react";
import { uid } from "../../utils/helpers";
import {
  saveAgentTrigger,
  fetchAgentRunLogs,
  saveAgentRunLog,
  type Page,
} from "../../lib/supabaseService";
import {
  fetchAgentsUnified, saveAgentFromRow, setAgentStatus, removeAgent,
  findBestTargetPage, type AgentRowLike,
} from "./agentStore";
import { agentRuntime, subscribeRuns, type ToolContextLike } from "../../ai/runtime";
import type { RunRecord } from "../../ai/runtime";
import { computeHealth } from "../../ai/runtime/agentOps";
import RunsExplorer from "../../components/ai/RunsExplorer";
import MemoryManager from "./MemoryManager";
import BackgroundExecutionSettings from "./BackgroundExecutionSettings";
import TemplateLibrary from "./TemplateLibrary";

// The unified store is the single source of truth — DB when reachable,
// offline mirror otherwise. Legacy row shape kept for this view's UI.
type AgentRow = AgentRowLike;
type RunLogRow = { id: string; status: string | null; started_at: string | null; finished_at: string | null; steps_taken: number | null; triggered_by: string | null };

export default function AgentWorkspace({ pages, currentUserId, onToast, toolContext }: {
  pages: Page[];
  currentUserId?: string | null;
  onToast?: (message: string) => void;
  /** Real page actions from App — required for tools to execute edits. */
  toolContext?: { currentPage?: Page; pages?: Page[]; actions: Record<string, (...args: never[]) => unknown> };
}) {
  const [tab, setTab] = useState('personal');
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const refresh = useCallback(async () => {
    // Works signed-in OR offline (mirror) — no more dead list without Supabase.
    setLoading(true);
    setLoadError(null);
    try {
      setAgents(await fetchAgentsUnified());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load agents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getContext = useCallback((): ToolContextLike => ({
    currentPage: (toolContext?.currentPage ?? undefined) as ToolContextLike["currentPage"],
    pages: ((toolContext?.pages?.length ? toolContext.pages : pages) ?? []) as never,
    actions: (toolContext?.actions ?? {}) as ToolContextLike["actions"],
  }), [pages, toolContext]);

  /** Manual run — goes through the shared Noska Intelligence runtime
   * (permissions, planning, verification) and logs to agent_run_logs. */
  const runAgent = useCallback(async (agent: AgentRow) => {
    onToast?.(`Running “${agent.name}”…`);
    let logId = uid();
    try {
      await saveAgentRunLog({ id: logId, agentId: agent.id, status: 'running', startedAt: new Date().toISOString() });
    } catch { /* log write is best-effort */ }
    // Notion-like default target: score pages against the agent's purpose so
    // tools that need a page just work without the agent having to ask.
    const target = findBestTargetPage(pages as never, {
      name: agent.name,
      description: agent.description,
      instructions: agent.instructions,
      contextScope: [],
    });
    try {
      const run = await agentRuntime.execute({
        goal: agent.instructions || agent.description || `Carry out your role as ${agent.name}.`,
        sourceId: `agent-${agent.id}`,
        sourceKind: "agent",
        trigger: "manual",
        modelClassOverride: agent.model === "fast" ? "fast" : agent.model === "quality" ? "reasoning" : undefined,
        maxSteps: 6,
        getContext,
        instructions: target
          ? `Default target page: "${target.title}" (page_id: ${target.id}). When a tool needs a page and none is specified, operate on this one.`
          : undefined,
      });
      try {
        await saveAgentRunLog({
          id: logId,
          agentId: agent.id,
          status: run.status,
          stepsTaken: run.steps?.length ?? 0,
          finishedAt: new Date().toISOString(),
          resourcesRead: [],
          resourcesWritten: [],
        });
      } catch { /* best-effort */ }
      onToast?.(run.status === "completed"
        ? `“${agent.name}” finished${run.summary ? `: ${run.summary.slice(0, 80)}` : ""}`
        : `“${agent.name}” ${run.status}`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Agent run failed.");
    }
  }, [getContext, onToast, pages]);

  return (
    <div className="flex h-full bg-[var(--bg)]">
      {/* Sidebar */}
      <div className="w-52 border-r border-[var(--border)] shrink-0 flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2"><Bot size={16} className="text-[var(--accent)]" /> Agents</h2>
        </div>
        <div className="flex-1 p-2 space-y-1">
          <TabButton icon={User} label="Personal Agent" active={tab === 'personal'} onClick={() => setTab('personal')} />
          <TabButton icon={Bot} label="Custom Agents" active={tab === 'custom'} onClick={() => setTab('custom')} count={agents.length} />
          <TabButton icon={History} label="Runs" active={tab === 'runs'} onClick={() => setTab('runs')} />
          <TabButton icon={BrainCircuit} label="Memory" active={tab === 'memory'} onClick={() => setTab('memory')} />
          <TabButton icon={Sparkles} label="Library" active={tab === 'library'} onClick={() => setTab('library')} />
          <TabButton icon={Globe} label="Agent Directory" active={tab === 'directory'} onClick={() => setTab('directory')} />
          <TabButton icon={Settings} label="Agent Settings" active={tab === 'settings'} onClick={() => setTab('settings')} />
        </div>
        <div className="p-3 border-t border-[var(--border)]">
          <button onClick={() => setShowBuilder(true)} className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent)]/90 transition"><Plus size={13} /> New Agent</button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          {showBuilder ? (
            <AgentBuilder
              onSave={async (draft) => {
                try {
                  const saved = await saveAgentFromRow({
                    id: uid(),
                    name: draft.name || "Untitled agent",
                    description: draft.description,
                    icon: draft.icon,
                    instructions: draft.instructions,
                    model: draft.model,
                    status: "active",
                  });
                  // Legacy trigger rows are DB-backed and best-effort; the
                  // unified store keeps the schedule/trigger in agent config.
                  for (const t of draft.triggers || []) {
                    try {
                      await saveAgentTrigger({ id: uid(), agentId: saved.id, type: mapTriggerType(t.type), config: safeConfig(t.config) });
                    } catch { /* offline — config jsonb still carries it */ }
                  }
                  setAgents((prev) => [saved, ...prev]);
                  setShowBuilder(false);
                  onToast?.("Agent created");
                } catch (e) {
                  onToast?.(e instanceof Error ? e.message : "Failed to save agent.");
                }
              }}
              onCancel={() => setShowBuilder(false)}
              pages={pages}
            />
          ) : tab === 'personal' ? (
            <PersonalAgentView pages={pages} onToast={onToast} />
          ) : tab === 'custom' ? (
            <CustomAgentsView
              agents={agents}
              loading={loading}
              loadError={loadError}
              onRetry={refresh}
              onToast={onToast}
              onNew={() => setShowBuilder(true)}
              onToggle={async (a) => {
                const nextStatus = a.status === 'active' ? 'paused' : 'active';
                setAgents((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: nextStatus } : x)));
                const ok = await setAgentStatus(a.id, nextStatus as "active" | "paused");
                if (!ok) {
                  setAgents((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: a.status } : x)));
                  onToast?.("Failed to update agent.");
                }
              }}
              onDelete={async (a) => {
                const snapshot = agents;
                setAgents((prev) => prev.filter((x) => x.id !== a.id));
                try {
                  await removeAgent(a.id);
                  onToast?.("Agent deleted");
                } catch (e) {
                  setAgents(snapshot);
                  onToast?.(e instanceof Error ? e.message : "Failed to delete agent.");
                }
              }}
              onDuplicateAgent={(a) => setShowBuilder(false) /* handled via copy below */}
              onCopy={async (a) => {
                try {
                  const copy = await saveAgentFromRow({
                    name: `${a.name} (copy)`,
                    description: a.description,
                    icon: a.icon,
                    instructions: a.instructions,
                    model: a.model,
                    status: "paused",
                  });
                  setAgents((prev) => [copy, ...prev]);
                  onToast?.("Agent duplicated");
                } catch (e) {
                  onToast?.(e instanceof Error ? e.message : "Failed to duplicate agent.");
                }
              }}
              onRun={runAgent}
            />
          ) : tab === 'runs' ? (
            <div className="p-6 max-w-3xl">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Runs</h2>
              <p className="text-[10px] text-[var(--muted)] mb-4">Every execution — here or on Noska's servers — with full traces, retries and approvals.</p>
              <RunsExplorer sourceKind="agent" agents={agents.map((a) => ({ id: a.id, name: a.name, icon: a.icon || "🤖" }))} onToast={onToast} />
            </div>
          ) : tab === 'memory' ? (
            <div className="p-6 max-w-3xl">
              <MemoryManager agents={agents.map((a) => ({ id: a.id, name: a.name, icon: a.icon || "🤖" }))} onToast={onToast} />
            </div>
          ) : tab === 'library' ? (
            <div className="p-6">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Agent Library</h2>
              <p className="text-[10px] text-[var(--muted)] mb-4">Purpose-built workers — review exactly what each one can and cannot do before installing.</p>
              <TemplateLibrary onInstalled={() => void refresh()} onToast={onToast} />
            </div>
          ) : tab === 'directory' ? (
            <AgentDirectoryView
              installed={agents.map((a) => a.name)}
              onInstall={async (t) => {
                try {
                  const saved = await saveAgentFromRow({
                    name: t.name,
                    description: t.description,
                    icon: t.icon,
                    model: t.model,
                    status: "paused",
                  });
                  setAgents((prev) => [saved, ...prev]);
                  onToast?.(`${t.name} installed — activate it in Custom Agents`);
                } catch (e) {
                  onToast?.(e instanceof Error ? e.message : "Install failed.");
                }
              }}
            />
          ) : (
            <AgentSettingsView onToast={onToast} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function mapTriggerType(uiType: string): Parameters<typeof saveAgentTrigger>[0]["type"] {
  const allowed: Array<Parameters<typeof saveAgentTrigger>[0]["type"]> = [
    "mention", "reaction", "property_change", "schedule", "new_email", "calendar_event",
  ];
  return (allowed.includes(uiType as never) ? uiType : "mention") as Parameters<typeof saveAgentTrigger>[0]["type"];
}

function safeConfig(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

interface TabButtonProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

function TabButton({ icon: Icon, label, active, onClick, count }: TabButtonProps) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition ${active ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--secondary)] hover:bg-[var(--hover)]'}`}>
      <Icon size={14} /> {label} {count !== undefined && <span className="ml-auto text-[10px] text-[var(--muted)]">{count}</span>}
    </button>
  );
}

/* ═══ Personal agent (local configuration surface) ═══ */

function PersonalAgentView({ pages, onToast }: { pages: unknown; onToast?: (m: string) => void }) {
  void pages;
  void onToast;
  const [name, setName] = useState('Noska');
  const [avatar, setAvatar] = useState('🤖');
  const [personality, setPersonality] = useState('helpful');
  const [instructions, setInstructions] = useState('I am a helpful AI assistant for the workspace. I help users manage pages, take notes, and stay organized.');
  const [planMode, setPlanMode] = useState(false);
  const [skills, setSkills] = useState([
    { id: 's1', name: 'Summarize Page', prompt: 'Summarize the active page in 3-5 bullet points.' },
    { id: 's2', name: 'Extract Tasks', prompt: 'Find all todo items and tasks across the workspace and list them.' },
  ]);
  const [showSkillEditor, setShowSkillEditor] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', prompt: '' });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <input value={avatar} onChange={(e) => setAvatar(e.target.value.slice(0, 2))} className="w-14 text-4xl bg-transparent outline-none text-center" aria-label="Avatar" />
        <div>
          <input value={name} onChange={(e) => setName(e.target.value)} className="bg-transparent text-lg font-semibold text-[var(--text)] outline-none" aria-label="Agent name" />
          <p className="text-xs text-[var(--muted)]">Your personal AI assistant · {personality} personality</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => { setPlanMode(!planMode); }} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition ${planMode ? 'bg-[var(--warning)]/10 border-[var(--warning)]/30 text-[var(--warning)]' : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]'}`}><Shield size={12} /> {planMode ? 'Plan Mode On' : 'Plan Mode Off'}</button>
        </div>
      </div>

      {/* Instructions */}
      <Section title="Instructions" icon={BookOpen}>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={5} className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none resize-none placeholder:text-[var(--muted)]" placeholder="Describe how your agent should behave..." />
        <p className="text-[10px] text-[var(--muted)] mt-1">This page is read at the start of every session. Add tone, context, and recurring facts.</p>
      </Section>

      {/* Skills */}
      <Section title="Skills" icon={Zap}>
        {skills.map(s => (
          <div key={s.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 mb-2">
            <Zap size={12} className="text-[var(--accent)] shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-[var(--text)]">{s.name}</h4>
              <p className="text-[10px] text-[var(--muted)] truncate">{s.prompt}</p>
            </div>
            <button onClick={() => setSkills(prev => prev.filter(x => x.id !== s.id))} className="text-[var(--muted)] hover:text-[var(--danger)]"><Trash2 size={11} /></button>
          </div>
        ))}
        {showSkillEditor ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
            <input value={newSkill.name} onChange={e => setNewSkill(s => ({ ...s, name: e.target.value }))} placeholder="Skill name" className="w-full rounded bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] outline-none" />
            <textarea value={newSkill.prompt} onChange={e => setNewSkill(s => ({ ...s, prompt: e.target.value }))} placeholder="Prompt the agent runs..." rows={2} className="w-full rounded bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={() => { if (newSkill.name.trim()) { setSkills(prev => [...prev, { id: uid(), ...newSkill }]); setNewSkill({ name: '', prompt: '' }); setShowSkillEditor(false); }}} className="rounded bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold text-white">Save Skill</button>
              <button onClick={() => setShowSkillEditor(false)} className="text-[10px] text-[var(--muted)]">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowSkillEditor(true)} className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--text)] mt-1"><Plus size={11} /> Add Skill</button>
        )}
      </Section>

      {/* Plan mode explanation */}
      {planMode && (
        <div className="rounded-xl border border-[var(--warning)]/20 bg-[var(--warning)]/5 p-3">
          <p className="text-xs text-[var(--warning)] font-medium">Plan Mode Active</p>
          <p className="text-[10px] text-[var(--muted)] mt-0.5">The agent will show a diff/preview of changes for approval before executing.</p>
        </div>
      )}
    </div>
  );
}

/* ═══ Custom agents — DB-backed ═══ */

function CustomAgentsView({ agents, loading, loadError, onRetry, onToast, onNew, onToggle, onDelete, onDuplicateAgent, onCopy, onRun }: {
  agents: AgentRow[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  onToast?: (m: string) => void;
  onNew: () => void;
  onToggle: (a: AgentRow) => void;
  onDelete: (a: AgentRow) => void;
  onDuplicateAgent?: (a: AgentRow) => void;
  onCopy: (a: AgentRow) => void;
  onRun: (a: AgentRow) => Promise<void>;
}) {
  void onDuplicateAgent; void onToast;
  const [runningId, setRunningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, RunLogRow[]>>({});

  const loadRuns = async (agentId: string) => {
    if (runs[agentId]) {
      setExpandedId(expandedId === agentId ? null : agentId);
      return;
    }
    try {
      const rows = await fetchAgentRunLogs(agentId);
      setRuns((prev) => ({ ...prev, [agentId]: rows }));
      setExpandedId(agentId);
    } catch {
      setRuns((prev) => ({ ...prev, [agentId]: [] }));
      setExpandedId(agentId);
    }
  };

  const run = async (a: AgentRow) => {
    setRunningId(a.id);
    try {
      await onRun(a);
    } finally {
      setRunningId(null);
      // Refresh history if this card is expanded.
      if (expandedId === a.id) {
        setRuns((prev) => {
          const next = { ...prev };
          delete next[a.id];
          return next;
        });
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Custom Agents ({agents.length})</h2>
        <button onClick={onNew} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"><Plus size={12} /> New Agent</button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={18} className="animate-spin text-[var(--muted)]" /></div>
      ) : loadError ? (
        <div className="max-w-md mx-auto text-center py-8 space-y-2">
          <p className="text-xs text-[var(--danger)]">{loadError}</p>
          <button onClick={onRetry} className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--secondary)] hover:bg-[var(--hover)]">Retry</button>
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12">
          <Bot size={32} className="mx-auto text-[var(--muted)] mb-2" />
          <p className="text-xs text-[var(--muted)]">No custom agents yet. Create one to automate your workflows.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map(a => (
            <div key={a.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{a.icon || '🤖'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-semibold text-[var(--text)] truncate">{a.name}</h4>
                    <span className="text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded shrink-0">{a.model || 'default'}</span>
                    <span className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${a.status === 'active' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--hover)] text-[var(--muted)]'}`}>{a.status || 'paused'}</span>
                    <AgentHealthBadge agentId={a.id} enabled={a.status === 'active'} />
                  </div>
                  <p className="text-[10px] text-[var(--muted)] truncate mt-0.5">{a.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <IconBtn title="Run now" onClick={() => run(a)} disabled={runningId !== null}>
                    {runningId === a.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                  </IconBtn>
                  <IconBtn title="Run history" onClick={() => loadRuns(a.id)}><History size={11} /></IconBtn>
                  <IconBtn title="Duplicate" onClick={() => onCopy(a)}><Copy size={11} /></IconBtn>
                  <IconBtn title="Delete" danger onClick={() => { if (window.confirm(`Delete “${a.name}”? This cannot be undone.`)) onDelete(a); }}><Trash2 size={11} /></IconBtn>
                  <button onClick={() => onToggle(a)} className={`p-1.5 rounded ${a.status === 'active' ? 'text-[var(--success)] hover:text-[var(--success)]/80' : 'text-[var(--muted)] hover:text-[var(--text)]'}`} title={a.status === 'active' ? 'Pause' : 'Activate'}>
                    {a.status === 'active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                </div>
              </div>
              {expandedId === a.id && (
                <div className="mt-2.5 border-t border-[var(--border)] pt-2 space-y-1">
                  {(runs[a.id] ?? []).length === 0 ? (
                    <p className="text-[10px] text-[var(--muted)]">No runs yet — hit ▶ to execute this agent against your workspace.</p>
                  ) : (
                    (runs[a.id] ?? []).slice(0, 5).map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-[10px] text-[var(--secondary)]">
                        <Clock size={9} className="text-[var(--muted)]" />
                        <span>{r.started_at ? new Date(r.started_at).toLocaleString() : "—"}</span>
                        <span className={`font-semibold ${r.status === 'completed' ? 'text-[var(--success)]' : r.status === 'failed' ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>{r.status}</span>
                        {typeof r.steps_taken === "number" && <span>· {r.steps_taken} step{r.steps_taken === 1 ? "" : "s"}</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Real health from unified run history (#5) — both source-id conventions
 * are checked since manual runs and scheduled runs may key differently. */
function AgentHealthBadge({ agentId, enabled }: { agentId: string; enabled: boolean }) {
  const [runs, setRuns] = useState<RunRecord[] | null>(null);
  useEffect(() => subscribeRuns(setRuns), []);
  if (runs === null) return null;
  const relevant = runs.filter((r) => r.sourceKind === "agent" && (r.sourceId === agentId || r.sourceId === `agent-${agentId}`));
  const waiting = relevant[0]?.status === "awaiting_approval";
  const health = computeHealth({
    runs: relevant,
    enabled,
    hasRequiredConfiguration: true, // client runtime needs no extra config
    waitingApproval: waiting,
  });
  const tone =
    health.status === "healthy" ? "text-[var(--success)]" :
    health.status === "failing" ? "text-[var(--danger)]" :
    health.status === "warning" ? "text-[var(--warning)]" : "text-[var(--muted)]";
  const dot =
    health.status === "healthy" ? "bg-[var(--success)]" :
    health.status === "failing" ? "bg-[var(--danger)]" :
    health.status === "warning" ? "bg-[var(--warning)]" : "bg-[var(--muted)]";
  const label =
    health.status === "needs_configuration" ? "Needs setup"
    : health.status.charAt(0).toUpperCase() + health.status.slice(1);
  const reasons = `${label}: ${health.reasons.join(" · ")}`;
  return (
    <span title={reasons} className={`inline-flex items-center gap-1 text-[9px] font-semibold ${tone} shrink-0`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {relevant.length > 0 ? label : null}
      {relevant.length === 0 && <span className="text-[var(--muted)]">New</span>}
    </span>
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
      className={`p-1.5 rounded transition-colors ${danger ? "text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--hover)]" : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"} disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

/* ═══ Builder ═══ */

interface AgentDraft {
  name: string;
  description: string;
  icon: string;
  instructions: string;
  model: string;
  triggers: Array<{ type: string; config: unknown }>;
  accessGrants: Array<{ resourceType: string; resourceId: string; level: string }>;
  creditCapPerRun: number;
  creditCapPerMonth: number;
}

function AgentBuilder({ onSave, onCancel }: { pages: unknown; onSave: (draft: AgentDraft) => void | Promise<void>; onCancel: () => void }) {
  void onCancel;
  const [form, setForm] = useState<AgentDraft>({
    name: '', description: '', icon: '🤖', instructions: '', model: 'default',
    triggers: [], accessGrants: [], creditCapPerRun: 100, creditCapPerMonth: 10000
  });
  const [triggerForm, setTriggerForm] = useState({ type: 'schedule', when: 'daily 20:00' });
  const [accessForm, setAccessForm] = useState({ resourceType: 'page', resourceId: '', level: 'view' });
  const [buildMode, setBuildMode] = useState('blank');
  const [saving, setSaving] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onCancel} className="text-[var(--muted)] hover:text-[var(--text)]"><ChevronRight size={16} /></button>
        <h2 className="text-lg font-semibold text-[var(--text)]">Build Custom Agent</h2>
      </div>

      {/* Build mode selector */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'blank', label: 'Blank', icon: FileText },
          { id: 'chat', label: 'Chat-built', icon: MessageCircle },
          { id: 'template', label: 'From Template', icon: Copy },
        ].map(m => (
          <button key={m.id} onClick={() => setBuildMode(m.id)} disabled={m.id !== 'blank'} title={m.id !== 'blank' ? "Coming soon" : undefined} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition disabled:opacity-40 ${buildMode === m.id ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30' : 'bg-[var(--surface)] text-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--hover)]'}`}>
            <m.icon size={12} /> {m.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Daily Study Agent" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Description</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="One sentence describing what it does" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Icon</label>
            <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🤖" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">AI Model</label>
            <select value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none">
              <option value="default">Default</option>
              <option value="fast">Fast (cheaper)</option>
              <option value="quality">High Quality (slower)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Instructions</label>
          <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} rows={4} placeholder="Describe what this agent does and how it should behave..." className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none resize-none" />
        </div>

        {/* Triggers */}
        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Triggers</label>
          {form.triggers.map((t, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] p-2 mb-1.5">
              <Zap size={11} className="text-[var(--accent)]" />
              <span className="text-xs text-[var(--text)] capitalize">{t.type}</span>
              <span className="text-[10px] text-[var(--muted)]">{JSON.stringify(t.config)}</span>
              <button onClick={() => setForm(f => ({ ...f, triggers: f.triggers.filter((_, j) => j !== i) }))} className="ml-auto text-[var(--muted)] hover:text-[var(--danger)]"><Trash2 size={10} /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <select value={triggerForm.type} onChange={e => setTriggerForm(t => ({ ...t, type: e.target.value }))} className="rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] outline-none">
              <option value="schedule">Schedule</option>
              <option value="mention">@Mention</option>
              <option value="property_change">Property Change</option>
            </select>
            {triggerForm.type === 'schedule' && (
              <select value={triggerForm.when} onChange={e => setTriggerForm(t => ({ ...t, when: e.target.value }))} className="rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] outline-none">
                <option value="daily 08:00">Daily · 08:00</option>
                <option value="daily 13:00">Daily · 13:00</option>
                <option value="daily 20:00">Daily · 20:00</option>
                <option value="weekly mon 09:00">Weekly · Mon 09:00</option>
                <option value="weekly fri 17:00">Weekly · Fri 17:00</option>
              </select>
            )}
            <button onClick={() => { setForm(f => ({ ...f, triggers: [...f.triggers, { type: triggerForm.type, config: triggerForm.type === 'schedule' ? { schedule: triggerForm.when } : {} }] })); }} className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[10px] font-semibold text-white"><Plus size={10} /></button>
          </div>
        </div>

        {/* Access permissions */}
        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Access Permissions</label>
          {form.accessGrants.map((g, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] p-2 mb-1.5">
              <Shield size={11} className="text-[var(--accent)]" />
              <span className="text-xs text-[var(--text)]">{g.resourceType}:{g.resourceId}</span>
              <span className="text-[10px] text-[var(--muted)]">({g.level})</span>
              <button onClick={() => setForm(f => ({ ...f, accessGrants: f.accessGrants.filter((_, j) => j !== i) }))} className="ml-auto text-[var(--muted)] hover:text-[var(--danger)]"><Trash2 size={10} /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <select value={accessForm.resourceType} onChange={e => setAccessForm(a => ({ ...a, resourceType: e.target.value }))} className="rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] outline-none">
              <option value="page">Page</option><option value="database">Database</option><option value="workspace">Workspace</option>
            </select>
            <input value={accessForm.resourceId} onChange={e => setAccessForm(a => ({ ...a, resourceId: e.target.value }))} placeholder="Resource ID" className="rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] outline-none w-24" />
            <select value={accessForm.level} onChange={e => setAccessForm(a => ({ ...a, level: e.target.value }))} className="rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] outline-none">
              <option value="view">View</option><option value="full">Full Access</option>
            </select>
            <button onClick={() => { if (accessForm.resourceId.trim()) { setForm(f => ({ ...f, accessGrants: [...f.accessGrants, { ...accessForm }] })); setAccessForm({ resourceType: 'page', resourceId: '', level: 'view' }); }}} className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[10px] font-semibold text-white"><Plus size={10} /></button>
          </div>
        </div>

        {/* Credit caps */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Credit Cap / Run</label>
            <input value={form.creditCapPerRun} onChange={e => setForm(f => ({ ...f, creditCapPerRun: parseInt(e.target.value) || 100 }))} type="number" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Credit Cap / Month</label>
            <input value={form.creditCapPerMonth} onChange={e => setForm(f => ({ ...f, creditCapPerMonth: parseInt(e.target.value) || 10000 }))} type="number" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={async () => {
              if (!form.name.trim()) return;
              setSaving(true);
              try { await onSave(form); } finally { setSaving(false); }
            }}
            disabled={saving || !form.name.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent)]/90 transition disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Create Agent
          </button>
          <button onClick={onCancel} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">Cancel</button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══ Directory ═══ */

const DIRECTORY_TEMPLATES = [
  { id: 'a1', name: 'Lead Enricher', description: 'Automatically enrich new leads with web research and write clean fields back to the database.', icon: '🔍', model: 'default', creator: 'Noska Labs' },
  { id: 'a2', name: 'Report Generator', description: 'Compile weekly reports from data sources, format them, and post to team chat.', icon: '📊', model: 'quality', creator: 'Noska Labs' },
  { id: 'a3', name: 'Meeting Note Taker', description: 'Join meetings, take structured notes, extract action items, and link to relevant pages.', icon: '🎙️', model: 'default', creator: 'Noska Labs' },
  { id: 'a4', name: 'Social Media Scheduler', description: 'Draft, review, and schedule posts across platforms. Track engagement and suggest content.', icon: '📱', model: 'fast', creator: 'Community' },
];

function AgentDirectoryView({ installed, onInstall }: { installed: string[]; onInstall: (t: typeof DIRECTORY_TEMPLATES[number]) => void }) {
  return (
    <div className="p-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Agent Directory</h2>
      <p className="text-xs text-[var(--muted)] mb-6">Discover and install pre-built agents for your workspace.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DIRECTORY_TEMPLATES.map(t => (
          <div key={t.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text)]">{t.name}</h3>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">by {t.creator}</p>
                <p className="text-xs text-[var(--secondary)] mt-1.5">{t.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  {installed.includes(t.name) ? (
                    <span className="text-[10px] text-[var(--success)] font-medium">Installed</span>
                  ) : (
                    <button onClick={() => onInstall(t)} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[10px] font-semibold text-white"><Plus size={10} /> Install</button>
                  )}
                  <span className="text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded">{t.model}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ Settings ═══ */

function AgentSettingsView({ onToast }: { onToast?: (m: string) => void }) {
  void onToast;
  return (
    <div className="p-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Agent Settings</h2>
      <div className="space-y-3 max-w-xl">
        <BackgroundExecutionSettings onToast={onToast} />
        <SettingRow title="Audit Logging" desc="Log every agent run for review (stored per-agent under Run history)" defaultOn readOnly />
        <SettingRow title="Prompt Injection Guard" desc="Detect hidden instructions in content agents read" defaultOn readOnly />
        <SettingRow title="Confirmation for destructive actions" desc="Deletes and overwrites always require explicit approval before execution" defaultOn readOnly />
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <h4 className="text-xs font-semibold text-[var(--text)] mb-1">How scheduling works</h4>
          <p className="text-[10px] text-[var(--muted)] leading-relaxed">
            Scheduled automations execute on Noska's servers via Trigger.dev — your browser does not
            need to be open. Timezones, missed-run policies, retries and idempotency are handled server-side.
            Without background execution enabled, scheduled runs are recorded as <span className="italic">skipped</span> rather than silently ignored.
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ title, desc, defaultOn, readOnly }: { title: string; desc: string; defaultOn?: boolean; readOnly?: boolean }) {
  const [on, setOn] = useState(Boolean(defaultOn));
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div>
        <h4 className="text-xs font-semibold text-[var(--text)]">{title}</h4>
        <p className="text-[10px] text-[var(--muted)]">{desc}</p>
      </div>
      <input
        type="checkbox"
        checked={on}
        disabled={readOnly}
        onChange={() => setOn(!on)}
        className={`toggle ${readOnly ? "opacity-60" : ""}`}
      />
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-[var(--accent)]" />
        <h3 className="text-xs font-semibold text-[var(--text)]">{title}</h3>
      </div>
      <div className="pl-5">{children}</div>
    </div>
  );
}

// Re-exported for potential external consumers of the directory list.
export { DIRECTORY_TEMPLATES };
