import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Settings, Play, Plus, MessageCircle, FileText, Zap, Clock, ChevronRight, Globe, Shield, BookOpen, Trash2, Copy, ToggleLeft, ToggleRight, History, Loader2, BrainCircuit, Sparkles, Pencil, type LucideIcon } from "lucide-react";
import { uid } from "../../utils/helpers";
import {
  fetchAgentRunLogs,
  saveAgentRunLog,
  type Page,
} from "../../lib/supabaseService";
import {
  fetchAgents, saveAgent, cloneAgent, blankAgent, setAgentStatus, removeAgent,
  findBestTargetPage, AGENT_TEMPLATES, type NoskaAgent, type MemoryMode, type AgentTemplate,
} from "./agentStore";
import {
  agentRuntime, subscribeRuns, describeTrigger, parseSchedule, proposeAgent,
  type ToolContextLike, type TriggerSpec, type ScheduleSpec, type PermissionSpec, type RunRecord,
} from "../../ai/runtime";
import { computeHealth } from "../../ai/runtime/agentOps";
import RunsExplorer from "../../components/ai/RunsExplorer";
import MemoryManager from "./MemoryManager";
import BackgroundExecutionSettings from "./BackgroundExecutionSettings";
import TemplateLibrary from "./TemplateLibrary";

type RunLogRow = { id: string; status: string | null; started_at: string | null; finished_at: string | null; steps_taken: number | null; triggered_by: string | null };

export default function AgentWorkspace({ pages, currentUserId, onToast, toolContext }: {
  pages: Page[];
  currentUserId?: string | null;
  onToast?: (message: string) => void;
  /** Real page actions from App — required for tools to execute edits. */
  toolContext?: { currentPage?: Page; pages?: Page[]; actions: Record<string, (...args: never[]) => unknown> };
}) {
  const [tab, setTab] = useState('custom');
  const [agents, setAgents] = useState<NoskaAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** null = closed · "new" = create · NoskaAgent = edit existing */
  const [builder, setBuilder] = useState<"new" | NoskaAgent | null>(null);

  const refresh = useCallback(async () => {
    // Full NoskaAgent objects (trigger, permissions, memory) — not legacy rows.
    setLoading(true);
    setLoadError(null);
    try {
      setAgents(await fetchAgents());
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
   * (permissions, planning, verification, memory) and logs to agent_run_logs. */
  const runAgent = useCallback(async (agent: NoskaAgent) => {
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
      contextScope: agent.contextScope,
    });
    try {
      const run = await agentRuntime.execute({
        goal: agent.instructions || agent.description || `Carry out your role as ${agent.name}.`,
        sourceId: agent.id,
        sourceKind: "agent",
        trigger: "manual",
        permissions: agent.permissions,
        memoryMode: agent.memoryMode,
        modelClassOverride: agent.modelClass === "default" ? undefined : agent.modelClass,
        maxSteps: 6,
        getContext,
        instructions: [
          `You are running as the persistent worker "${agent.name}".${agent.description ? ` Purpose: ${agent.description}.` : ""}`,
          target ? `Default target page: "${target.title}" (page_id: ${target.id}). When a tool needs a page and none is specified, operate on this one.` : "",
        ].filter(Boolean).join(" "),
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
        : `“${agent.name}” ${run.status.replace("_", " ")}`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Agent run failed.");
    }
  }, [getContext, onToast, pages]);

  /** Full-fidelity duplicate: trigger, permissions, memory all copied. */
  const duplicateAgent = useCallback(async (agent: NoskaAgent) => {
    try {
      const copy = await saveAgent(cloneAgent(agent));
      setAgents((prev) => [copy, ...prev]);
      onToast?.(`“${agent.name}” duplicated (paused)`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Failed to duplicate agent.");
    }
  }, [onToast]);

  const handleBuilderSave = useCallback(async (agent: NoskaAgent) => {
    try {
      const saved = await saveAgent(agent);
      setAgents((prev) => {
        const idx = prev.findIndex((a) => a.id === saved.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
        return [saved, ...prev];
      });
      setBuilder(null);
      onToast?.(agent.name ? `Agent “${saved.name}” saved` : "Agent saved");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Failed to save agent.");
    }
  }, [onToast]);

  return (
    <div className="flex h-full bg-[var(--bg)]">
      {/* Sidebar */}
      <div className="w-52 border-r border-[var(--border)] shrink-0 flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2"><Bot size={16} className="text-[var(--accent)]" /> Agents</h2>
        </div>
        <div className="flex-1 p-2 space-y-1">
          <TabButton icon={Bot} label="Custom Agents" active={tab === 'custom'} onClick={() => { setTab('custom'); setBuilder(null); }} count={agents.length} />
          <TabButton icon={History} label="Runs" active={tab === 'runs'} onClick={() => { setTab('runs'); setBuilder(null); }} />
          <TabButton icon={BrainCircuit} label="Memory" active={tab === 'memory'} onClick={() => { setTab('memory'); setBuilder(null); }} />
          <TabButton icon={Sparkles} label="Library" active={tab === 'library'} onClick={() => { setTab('library'); setBuilder(null); }} />
          <TabButton icon={User} label="Personal Agent" active={tab === 'personal'} onClick={() => { setTab('personal'); setBuilder(null); }} />
          <TabButton icon={Globe} label="Agent Directory" active={tab === 'directory'} onClick={() => { setTab('directory'); setBuilder(null); }} />
          <TabButton icon={Settings} label="Agent Settings" active={tab === 'settings'} onClick={() => { setTab('settings'); setBuilder(null); }} />
        </div>
        <div className="p-3 border-t border-[var(--border)]">
          <button onClick={() => setBuilder("new")} className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent)]/90 transition"><Plus size={13} /> New Agent</button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          {builder ? (
            builder === "new" ? (
              <AgentBuilder
                key="new"
                initial={null}
                onSave={handleBuilderSave}
                onCancel={() => setBuilder(null)}
                pages={pages}
              />
            ) : (
              <AgentBuilder
                key={builder.id}
                initial={builder}
                onSave={handleBuilderSave}
                onCancel={() => setBuilder(null)}
                pages={pages}
              />
            )
          ) : tab === 'custom' ? (
            <CustomAgentsView
              agents={agents}
              loading={loading}
              loadError={loadError}
              onRetry={refresh}
              onNew={() => setBuilder("new")}
              onEdit={(a) => setBuilder(a)}
              onToggle={async (a) => {
                const nextStatus = a.status === 'active' ? 'paused' : 'active';
                setAgents((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: nextStatus } : x)));
                const ok = await setAgentStatus(a.id, nextStatus);
                if (!ok) {
                  setAgents((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: a.status } : x)));
                  onToast?.("Failed to update agent.");
                } else {
                  onToast?.(nextStatus === "active" ? `“${a.name}” activated` : `“${a.name}” paused`);
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
              onDuplicate={duplicateAgent}
              onRun={runAgent}
              onViewRuns={() => setTab('runs')}
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
          ) : tab === 'personal' ? (
            <PersonalAgentView pages={pages} onToast={onToast} />
          ) : tab === 'directory' ? (
            <AgentDirectoryView
              installed={agents.map((a) => a.name)}
              onInstall={async (t) => {
                try {
                  const saved = await saveAgent(blankAgent({ name: t.name, description: t.description, icon: t.icon, instructions: t.instructions, status: "paused" }));
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
              <button onClick={() => { if (newSkill.name.trim()) { setSkills(prev => [...prev, { id: uid(), ...newSkill }]); setNewSkill({ name: '', prompt: '' }); setShowSkillEditor(false); } }} className="rounded bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold text-white">Save Skill</button>
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

/* ═══ Custom agents — full-fidelity store ═══ */

function CustomAgentsView({ agents, loading, loadError, onRetry, onNew, onEdit, onToggle, onDelete, onDuplicate, onRun, onViewRuns }: {
  agents: NoskaAgent[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  onNew: () => void;
  onEdit: (a: NoskaAgent) => void;
  onToggle: (a: NoskaAgent) => void;
  onDelete: (a: NoskaAgent) => void;
  onDuplicate: (a: NoskaAgent) => void;
  onRun: (a: NoskaAgent) => Promise<void>;
  onViewRuns: () => void;
}) {
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

  const run = async (a: NoskaAgent) => {
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
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Custom Agents ({agents.length})</h2>
          <p className="text-[10px] text-[var(--muted)] mt-0.5">Persistent workers with their own triggers, permissions and memory.</p>
        </div>
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
        <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl">
          <Bot size={32} className="mx-auto text-[var(--muted)] mb-2" />
          <p className="text-xs text-[var(--muted)] mb-3">No custom agents yet. Create one, or install a template from the Library.</p>
          <button onClick={onNew} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"><Plus size={11} className="inline mr-1" />Create your first agent</button>
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
                    <span className="text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded shrink-0">{a.modelClass || 'default'}</span>
                    <span className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${a.status === 'active' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--hover)] text-[var(--muted)]'}`}>{a.status || 'paused'}</span>
                    <AgentHealthBadge agentId={a.id} enabled={a.status === 'active'} />
                  </div>
                  <p className="text-[10px] text-[var(--muted)] truncate mt-0.5">{a.description || 'No description'}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded"><Clock size={8} />{describeTrigger(a.trigger)}</span>
                    <span className="text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded">
                      {a.memoryMode === "off" ? "No memory" : a.memoryMode === "run" ? "Run memory" : "Persistent memory"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <IconBtn title="Run now" onClick={() => run(a)} disabled={runningId !== null}>
                    {runningId === a.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                  </IconBtn>
                  <IconBtn title="Edit agent" onClick={() => onEdit(a)}><Pencil size={11} /></IconBtn>
                  <IconBtn title="Run history" onClick={() => loadRuns(a.id)}><History size={11} /></IconBtn>
                  <IconBtn title="Duplicate" onClick={() => onDuplicate(a)}><Copy size={11} /></IconBtn>
                  <IconBtn title="Delete" danger onClick={() => { if (window.confirm(`Delete “${a.name}”? This cannot be undone.`)) onDelete(a); }}><Trash2 size={11} /></IconBtn>
                  <button onClick={() => onToggle(a)} className={`p-1.5 rounded ${a.status === 'active' ? 'text-[var(--success)] hover:text-[var(--success)]/80' : 'text-[var(--muted)] hover:text-[var(--text)]'}`} title={a.status === 'active' ? 'Pause' : 'Activate'}>
                    {a.status === 'active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                </div>
              </div>
              {expandedId === a.id && (
                <div className="mt-2.5 border-t border-[var(--border)] pt-2 space-y-1">
                  {(runs[a.id] ?? []).length === 0 ? (
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-[var(--muted)]">No runs yet — hit ▶ to execute this agent against your workspace.</p>
                      <button onClick={onViewRuns} className="text-[10px] text-[var(--accent)] hover:underline">Open full run traces →</button>
                    </div>
                  ) : (
                    <>
                      {(runs[a.id] ?? []).slice(0, 5).map((r) => (
                        <div key={r.id} className="flex items-center gap-2 text-[10px] text-[var(--secondary)]">
                          <Clock size={9} className="text-[var(--muted)]" />
                          <span>{r.started_at ? new Date(r.started_at).toLocaleString() : "—"}</span>
                          <span className={`font-semibold ${r.status === 'completed' ? 'text-[var(--success)]' : r.status === 'failed' ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>{r.status}</span>
                          {typeof r.steps_taken === "number" && <span>· {r.steps_taken} step{r.steps_taken === 1 ? "" : "s"}</span>}
                        </div>
                      ))}
                      <button onClick={onViewRuns} className="text-[10px] text-[var(--accent)] hover:underline">Open full run traces →</button>
                    </>
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
 * are checked since older manual runs may key with an "agent-" prefix. */
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

/* ═══ Builder — create AND edit full agents ═══ */

const TRIGGER_OPTIONS: Array<{ value: TriggerSpec["type"]; label: string }> = [
  { value: "manual", label: "Manual runs" },
  { value: "schedule", label: "Schedule" },
  { value: "page_created", label: "When a page is created" },
  { value: "page_updated", label: "When a page is updated" },
  { value: "task_completed", label: "When a task is completed" },
  { value: "title_changed", label: "When a title changes" },
  { value: "page_trashed", label: "When a page is trashed" },
];

const PERMISSION_CATEGORIES: Array<{ key: keyof PermissionSpec; label: string; hint: string }> = [
  { key: "read", label: "Read", hint: "Search & read pages" },
  { key: "create", label: "Create", hint: "Create new pages" },
  { key: "update", label: "Update", hint: "Edit pages & content" },
  { key: "delete", label: "Delete", hint: "Trash pages" },
  { key: "memory", label: "Memory", hint: "Remember between runs" },
  { key: "agents", label: "Agents", hint: "Delegate to agents" },
  { key: "automations", label: "Automations", hint: "Manage automations" },
  { key: "external", label: "External", hint: "Notifications & outside services" },
];

const MEMORY_MODES: Array<{ value: MemoryMode; label: string; hint: string }> = [
  { value: "off", label: "Off", hint: "No memory at all" },
  { value: "run", label: "This run", hint: "Recalls memory during a run, forgets after" },
  { value: "persistent", label: "Persistent", hint: "Remembers outcomes across every run" },
];

function scheduleFromText(text: string): ScheduleSpec | null {
  return parseSchedule(text);
}

function triggerFromDraft(triggerType: TriggerSpec["type"], schedule: ScheduleSpec | null): TriggerSpec {
  return triggerType === "schedule" && schedule ? { type: "schedule", schedule } : { type: triggerType };
}

function AgentBuilder({ initial, onSave, onCancel, pages }: {
  initial: NoskaAgent | null;
  onSave: (agent: NoskaAgent) => void | Promise<void>;
  onCancel: () => void;
  pages: Page[];
}) {
  const editing = Boolean(initial);
  const [form, setForm] = useState(() => {
    const a = initial;
    return {
      name: a?.name || "",
      description: a?.description || "",
      icon: a?.icon || "🤖",
      instructions: a?.instructions || "",
      modelClass: (a?.modelClass || "default") as NoskaAgent["modelClass"],
      status: (a?.status || "paused") as NoskaAgent["status"],
      triggerType: a?.trigger.type || ("schedule" as TriggerSpec["type"]),
      schedule: a?.trigger.type === "schedule" ? (a.trigger.schedule || null) : null,
      scheduleText: a?.trigger.type === "schedule" && a.trigger.schedule ? describeTrigger(a.trigger) : "every day at 9am",
      permissions: a?.permissions || blankAgent().permissions,
      memoryMode: (a?.memoryMode || "persistent") as MemoryMode,
      contextScope: (a?.contextScope || []).join(", "),
      maxRunsPerHour: a?.maxRunsPerHour ?? 12,
    };
  });
  const [buildMode, setBuildMode] = useState<'blank' | 'chat' | 'template'>('blank');
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const triggerPreview = useMemo(
    () => describeTrigger(triggerFromDraft(form.triggerType, form.schedule)),
    [form.triggerType, form.schedule],
  );

  const applyTemplate = (t: AgentTemplate) => {
    setForm(f => ({
      ...f,
      name: t.name,
      description: t.description,
      icon: t.icon,
      instructions: t.instructions,
      triggerType: t.trigger.type,
      schedule: t.trigger.type === "schedule" ? (t.trigger.schedule || null) : null,
      scheduleText: t.trigger.type === "schedule" ? t.triggerLabel.replace(/^Every /i, "every ") : f.scheduleText,
      permissions: { ...t.permissions },
      memoryMode: t.memoryScopeSuggestion,
      contextScope: t.contextScope.join(", "),
    }));
    setBuildMode('blank');
  };

  const draftFromChat = async () => {
    if (!chatPrompt.trim()) return;
    setChatBusy(true);
    try {
      const p = await proposeAgent(chatPrompt);
      setForm(f => ({
        ...f,
        name: p.name || f.name,
        description: p.description || f.description,
        icon: p.icon || f.icon,
        instructions: p.instructions || f.instructions,
        triggerType: p.trigger?.type || f.triggerType,
        schedule: p.trigger?.type === "schedule" ? (p.trigger.schedule || f.schedule) : f.schedule,
        permissions: p.permissions ? { ...f.permissions, ...p.permissions } : f.permissions,
        contextScope: p.contextScope?.length ? p.contextScope.join(", ") : f.contextScope,
      }));
      setBuildMode('blank');
    } catch { /* AI unavailable — form stays as-is */ }
    finally { setChatBusy(false); }
  };

  const save = async () => {
    if (!form.name.trim()) return;
    // A schedule trigger must carry a parsed schedule before it can save.
    let trigger = triggerFromDraft(form.triggerType, form.schedule);
    if (form.triggerType === "schedule" && !form.schedule) {
      const parsed = scheduleFromText(form.scheduleText);
      if (!parsed) {
        setScheduleError("Set a valid schedule before saving — try \"every day at 9am\".");
        return;
      }
      trigger = { type: "schedule", schedule: parsed };
    }
    setSaving(true);
    try {
      const base = initial || blankAgent({ name: form.name.trim() });
      const saved = await onSave({
        ...base,
        name: form.name.trim(),
        description: form.description.trim(),
        icon: form.icon || "🤖",
        instructions: form.instructions,
        status: form.status,
        modelClass: form.modelClass,
        trigger,
        contextScope: form.contextScope.split(",").map(s => s.trim()).filter(Boolean),
        permissions: form.permissions,
        memoryMode: form.memoryMode,
        maxRunsPerHour: form.maxRunsPerHour,
      });
      void saved;
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onCancel} className="text-[var(--muted)] hover:text-[var(--text)] rotate-180"><ChevronRight size={16} /></button>
        <h2 className="text-lg font-semibold text-[var(--text)]">{editing ? `Edit ${initial?.name || "Agent"}` : "Build Custom Agent"}</h2>
      </div>

      {/* Build mode selector — only for new agents */}
      {!editing && (
        <div className="flex gap-2 mb-6">
          {[
            { id: 'blank' as const, label: 'Blank', icon: FileText },
            { id: 'chat' as const, label: 'Chat-built', icon: MessageCircle },
            { id: 'template' as const, label: 'From Template', icon: Copy },
          ].map(m => (
            <button key={m.id} onClick={() => setBuildMode(m.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${buildMode === m.id ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30' : 'bg-[var(--surface)] text-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--hover)]'}`}>
              <m.icon size={12} /> {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Chat-built: describe the agent, AI drafts the config */}
      {buildMode === 'chat' && (
        <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/[0.04] p-4 mb-5">
          <p className="text-xs font-semibold text-[var(--text)] mb-1.5">Describe your agent</p>
          <textarea
            value={chatPrompt}
            onChange={e => setChatPrompt(e.target.value)}
            rows={3}
            autoFocus
            placeholder={'e.g. "An agent that every weekday morning reviews my project pages, flags overdue tasks, and writes a short standup summary."'}
            className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none resize-none focus:border-[var(--accent)]/40"
          />
          <button
            onClick={draftFromChat}
            disabled={!chatPrompt.trim() || chatBusy}
            className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent)]/90 disabled:opacity-40 transition"
          >
            {chatBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Draft with AI
          </button>
        </div>
      )}

      {/* From Template: pick a proven worker */}
      {buildMode === 'template' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">
          {AGENT_TEMPLATES.map(t => (
            <button key={t.key} onClick={() => applyTemplate(t)} className="text-left rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 hover:border-[var(--accent)]/40 hover:bg-[var(--hover)] transition">
              <div className="flex items-center gap-2">
                <span className="text-lg">{t.icon}</span>
                <span className="text-xs font-semibold text-[var(--text)]">{t.name}</span>
              </div>
              <p className="text-[10px] text-[var(--muted)] mt-1 line-clamp-2">{t.description}</p>
              <span className="inline-flex items-center gap-1 text-[9px] text-[var(--muted)] mt-1.5"><Clock size={8} />{t.triggerLabel}</span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-[72px_1fr] gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Icon</label>
            <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🤖" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-lg text-center outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Daily Study Agent" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Description</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="One sentence describing what it does" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Instructions</label>
          <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} rows={4} placeholder="Describe what this agent does every time it runs, and any rules it must follow..." className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none resize-none" />
        </div>

        {/* Trigger */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={12} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text)]">Trigger</span>
            <span className="text-[9px] text-[var(--muted)] ml-auto">{triggerPreview}</span>
          </div>
          <select
            value={form.triggerType}
            onChange={e => {
              const t = e.target.value as TriggerSpec["type"];
              setForm(f => ({ ...f, triggerType: t, schedule: t === "schedule" ? (f.schedule || scheduleFromText(f.scheduleText)) : f.schedule }));
            }}
            className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text)] outline-none"
          >
            {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {form.triggerType === "schedule" && (
            <div className="mt-2">
              <input
                value={form.scheduleText}
                onChange={e => { setForm(f => ({ ...f, scheduleText: e.target.value })); setScheduleError(null); }}
                onBlur={e => {
                  const s = scheduleFromText(e.target.value);
                  if (s) setForm(f => ({ ...f, schedule: s }));
                  else setScheduleError("Couldn't parse that schedule — try \"every day at 9am\", \"weekdays at 8:30am\", \"every monday\", \"monthly on the 1st\", or \"every 30 minutes\".");
                }}
                placeholder='e.g. "every weekday at 8am"'
                className={`w-full rounded-lg bg-[var(--bg)] border px-2.5 py-1.5 text-xs text-[var(--text)] outline-none ${scheduleError ? "border-[var(--danger)]/50" : "border-[var(--border)]"}`}
              />
              {scheduleError && <p className="text-[9px] text-[var(--danger)] mt-1">{scheduleError}</p>}
              {!scheduleError && form.schedule && <p className="text-[9px] text-[var(--muted)] mt-1">Parsed: {describeTrigger({ type: "schedule", schedule: form.schedule })}</p>}
            </div>
          )}
          {form.triggerType !== "manual" && form.triggerType !== "schedule" && (
            <p className="text-[9px] text-[var(--muted)] mt-1.5">Fires while Noska is open. Scope it from the agent&apos;s Context scope below.</p>
          )}
        </div>

        {/* Permissions */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={12} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text)]">Permissions</span>
            <span className="text-[9px] text-[var(--muted)]">what this agent may do without asking</span>
          </div>
          <div className="space-y-1.5">
            {PERMISSION_CATEGORIES.map(cat => (
              <div key={cat.key} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[var(--text)] font-medium">{cat.label}</p>
                  <p className="text-[9px] text-[var(--muted)]">{cat.hint}</p>
                </div>
                <div className="flex gap-0.5 rounded-lg bg-[var(--bg)] p-0.5">
                  {(["auto", "approval", "disabled"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setForm(f => ({ ...f, permissions: { ...f.permissions, [cat.key]: mode } }))}
                      title={mode === "auto" ? "Always allowed" : mode === "approval" ? "Ask me first" : "Never allowed"}
                      className={`rounded px-2 py-0.5 text-[9px] font-bold transition ${form.permissions[cat.key] === mode
                        ? mode === "auto" ? "bg-[var(--success)]/15 text-[var(--success)]"
                          : mode === "approval" ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                            : "bg-[var(--danger)]/10 text-[var(--danger)]"
                        : "text-[var(--muted)] hover:text-[var(--text)]"}`}
                    >
                      {mode === "auto" ? "Auto" : mode === "approval" ? "Ask" : "Off"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Memory */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit size={12} className="text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text)]">Memory</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MEMORY_MODES.map(m => (
              <button
                key={m.value}
                onClick={() => setForm(f => ({ ...f, memoryMode: m.value }))}
                className={`rounded-lg border p-2 text-left transition ${form.memoryMode === m.value ? "border-[var(--accent)]/40 bg-[var(--accent)]/[0.06]" : "border-[var(--border)] hover:bg-[var(--hover)]"}`}
              >
                <p className={`text-[11px] font-semibold ${form.memoryMode === m.value ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>{m.label}</p>
                <p className="text-[9px] text-[var(--muted)] mt-0.5 leading-snug">{m.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">AI Model</label>
            <select value={form.modelClass} onChange={e => setForm(f => ({ ...f, modelClass: e.target.value as NoskaAgent["modelClass"] }))} className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none">
              <option value="default">Default</option>
              <option value="fast">Fast (cheaper)</option>
              <option value="reasoning">High Quality (slower)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Max runs / hour</label>
            <input
              value={form.maxRunsPerHour}
              onChange={e => setForm(f => ({ ...f, maxRunsPerHour: Math.max(1, parseInt(e.target.value) || 12) }))}
              type="number" min={1} max={60}
              className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Context scope <span className="text-[var(--muted)] font-normal">(comma-separated hints, e.g. &quot;Projects, Tasks&quot;)</span></label>
          <input value={form.contextScope} onChange={e => setForm(f => ({ ...f, contextScope: e.target.value }))} placeholder="Projects, Study notes, CRM pages" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
          <p className="text-[9px] text-[var(--muted)] mt-1">{pages.length} pages in workspace — scope hints help the agent pick the right target pages.</p>
        </div>

        {!editing && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--secondary)]">Create as</span>
            <div className="flex gap-0.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] p-0.5">
              {(["active", "paused"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`rounded px-2.5 py-1 text-[10px] font-bold capitalize transition ${form.status === s ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-[var(--muted)]">{form.status === "active" ? "starts running on its trigger immediately" : "you activate it when ready"}</span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving || !form.name.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent)]/90 transition disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {editing ? "Save Changes" : "Create Agent"}
          </button>
          <button onClick={onCancel} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">Cancel</button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══ Directory ═══ */

const DIRECTORY_TEMPLATES = [
  { id: 'a1', name: 'Lead Enricher', description: 'Automatically enrich new leads with web research and write clean fields back to the database.', icon: '🔍', creator: 'Noska Labs', instructions: 'When triggered: find pages that look like contacts or companies, read their content, and append a research section with relevant public knowledge from workspace context. Flag any missing fields.' },
  { id: 'a2', name: 'Report Generator', description: 'Compile weekly reports from data sources, format them, and post to team chat.', icon: '📊', creator: 'Noska Labs', instructions: 'When triggered: gather recently updated pages and todos, compile a formatted report page with sections for progress, blockers, and next steps. Verify the report page exists before finishing.' },
  { id: 'a3', name: 'Meeting Note Taker', description: 'Take structured notes, extract action items, and link to relevant pages.', icon: '🎙️', creator: 'Noska Labs', instructions: 'When triggered: read the target meeting page, restructure into decisions / discussion / action items with owners, create todo items for each action, and link related pages mentioned in the notes.' },
  { id: 'a4', name: 'Content Auditor', description: 'Review pages for quality, structure and completeness; suggest improvements.', icon: '📱', creator: 'Community', instructions: 'When triggered: pick the least-recently-reviewed page in scope, run analyze_page, and append a concise review section with concrete improvement suggestions. Never rewrite content directly.' },
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
            Scheduled agents run while Noska is open — missed schedules fire once, late but exactly once, the next time you open the workspace.
            Server-side execution (Trigger.dev) can take over for 24/7 schedules; without it, skipped windows are recorded honestly rather than silently ignored.
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
