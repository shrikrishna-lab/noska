import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, User, Settings, Play, Pause, Plus, MessageCircle, FileText, Zap, Clock, ChevronRight, Globe, Sliders, Cpu, Shield, BookOpen, Pen, Trash2, Copy, ToggleLeft, ToggleRight, type LucideIcon } from "lucide-react";
import { uid } from "../../utils/helpers";

export default function AgentWorkspace({ pages, onToast, onDuplicate }) {
  const [tab, setTab] = useState('personal');
  const [agents, setAgents] = useState([]);
  const [showBuilder, setShowBuilder] = useState(false);

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
          <TabButton icon={Shield} label="Agent Directory" active={tab === 'directory'} onClick={() => setTab('directory')} />
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
            <AgentBuilder agents={agents} onSave={(a) => { setAgents(prev => [{ ...a, id: uid() }, ...prev]); setShowBuilder(false); onToast?.('Agent created'); }} onCancel={() => setShowBuilder(false)} pages={pages} />
          ) : tab === 'personal' ? (
            <PersonalAgentView pages={pages} onToast={onToast} />
          ) : tab === 'custom' ? (
            <CustomAgentsView agents={agents} onToast={onToast} onNew={() => setShowBuilder(true)} onToggle={(id) => setAgents(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'active' ? 'paused' : 'active' } : a))} onDelete={(id) => { setAgents(prev => prev.filter(a => a.id !== id)); onToast?.('Agent deleted'); }} onDuplicateAgent={(agent) => { const copy = { ...agent, id: uid(), name: `${agent.name} (copy)`, status: 'paused' }; setAgents(prev => [copy, ...prev]); onToast?.('Agent duplicated'); }} />
          ) : tab === 'directory' ? (
            <AgentDirectoryView agents={agents} onToast={onToast} onInstall={(a) => { if (!agents.find(x => x.id === a.id)) { setAgents(prev => [{ ...a, id: uid(), status: 'paused' }, ...prev]); onToast?.('Agent installed'); }}} />
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

function PersonalAgentView({ pages, onToast }) {
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
        <div className="text-4xl">{avatar}</div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">{name}</h2>
          <p className="text-xs text-[var(--muted)]">Your personal AI assistant · {personality} personality</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setPlanMode(!planMode)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition ${planMode ? 'bg-[var(--warning)]/10 border-[var(--warning)]/30 text-[var(--warning)]' : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]'}`}><Shield size={12} /> {planMode ? 'Plan Mode On' : 'Plan Mode Off'}</button>
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

function CustomAgentsView({ agents, onToast, onNew, onToggle, onDelete, onDuplicateAgent }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Custom Agents ({agents.length})</h2>
        <button onClick={onNew} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"><Plus size={12} /> New Agent</button>
      </div>
      {agents.length === 0 ? (
        <div className="text-center py-12">
          <Bot size={32} className="mx-auto text-[var(--muted)] mb-2" />
          <p className="text-xs text-[var(--muted)]">No custom agents yet. Create one to automate your workflows.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map(a => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <span className="text-xl">{a.icon || '🤖'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-[var(--text)]">{a.name}</h4>
                  <span className="text-[9px] text-[var(--muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded">{a.model || 'default'}</span>
                </div>
                <p className="text-[10px] text-[var(--muted)] truncate mt-0.5">{a.description || 'No description'}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onDuplicateAgent(a)} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"><Copy size={11} /></button>
                <button onClick={() => onDelete(a.id)} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--hover)]"><Trash2 size={11} /></button>
                <button onClick={() => onToggle(a.id)} className={`p-1.5 rounded ${a.status === 'active' ? 'text-[var(--success)] hover:text-[var(--success)]/80' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}>{a.status === 'active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentBuilder({ pages, onSave, onCancel }: { pages: unknown; onSave: (a: any) => void; onCancel: () => void; agents?: unknown[] }) {
  const [form, setForm] = useState({
    name: '', description: '', icon: '🤖', instructions: '', model: 'default',
    triggers: [], accessGrants: [], creditCapPerRun: 100, creditCapPerMonth: 10000, type: 'custom'
  });
  const [triggerForm, setTriggerForm] = useState({ type: 'mention', config: '{}' });
  const [accessForm, setAccessForm] = useState({ resourceType: 'page', resourceId: '', level: 'view' });
  const [buildMode, setBuildMode] = useState('blank');

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
          <button key={m.id} onClick={() => setBuildMode(m.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${buildMode === m.id ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30' : 'bg-[var(--surface)] text-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--hover)]'}`}>
            <m.icon size={12} /> {m.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Weekly Report Builder" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Description</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="One sentence for the directory listing" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
        </div>

        {/* Icon + Model */}
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

        {/* Instructions */}
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
              <option value="mention">@Mention</option>
              <option value="reaction">Emoji Reaction</option>
              <option value="property_change">Property Change</option>
              <option value="schedule">Schedule (Cron)</option>
              <option value="new_email">New Email</option>
              <option value="calendar_event">Calendar Event</option>
            </select>
            <button onClick={() => { setForm(f => ({ ...f, triggers: [...f.triggers, { ...triggerForm, config: JSON.parse(triggerForm.config || '{}') }] })); }} className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[10px] font-semibold text-white"><Plus size={10} /></button>
          </div>
        </div>

        {/* Access Grants */}
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

        {/* Credit Caps */}
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
          <button onClick={() => onSave({ ...form })} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent)]/90 transition"><Play size={14} /> Create Agent</button>
          <button onClick={onCancel} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">Cancel</button>
        </div>
      </div>
    </motion.div>
  );
}

function AgentDirectoryView({ agents, onToast, onInstall }) {
  const templates = [
    { id: 'a1', name: 'Lead Enricher', description: 'Automatically enrich new leads with web research and write clean fields back to the database.', icon: '🔍', model: 'default', creator: 'Noska Labs' },
    { id: 'a2', name: 'Report Generator', description: 'Compile weekly reports from data sources, format them, and post to team chat.', icon: '📊', model: 'quality', creator: 'Noska Labs' },
    { id: 'a3', name: 'Meeting Note Taker', description: 'Join meetings, take structured notes, extract action items, and link to relevant pages.', icon: '🎙️', model: 'default', creator: 'Noska Labs' },
    { id: 'a4', name: 'Social Media Scheduler', description: 'Draft, review, and schedule posts across platforms. Track engagement and suggest content.', icon: '📱', model: 'fast', creator: 'Community' },
  ];

  const isInstalled = (id) => agents.some(a => a.name === templates.find(t => t.id === id)?.name);

  return (
    <div className="p-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Agent Directory</h2>
      <p className="text-xs text-[var(--muted)] mb-6">Discover and install pre-built agents for your workspace.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map(t => (
          <div key={t.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text)]">{t.name}</h3>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">by {t.creator}</p>
                <p className="text-xs text-[var(--secondary)] mt-1.5">{t.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  {isInstalled(t.id) ? (
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

function AgentSettingsView({ onToast }) {
  return (
    <div className="p-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Agent Settings</h2>
      <div className="space-y-3 max-w-xl">
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div>
            <h4 className="text-xs font-semibold text-[var(--text)]">Allow Custom Agents</h4>
            <p className="text-[10px] text-[var(--muted)]">Who can create custom agents</p>
          </div>
          <select className="rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2 py-1 text-xs text-[var(--text)] outline-none">
            <option>Everyone</option><option>Admins only</option><option>Specific groups</option>
          </select>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div>
            <h4 className="text-xs font-semibold text-[var(--text)]">Audit Logging</h4>
            <p className="text-[10px] text-[var(--muted)]">Log every agent run for admin review</p>
          </div>
          <input type="checkbox" defaultChecked className="toggle" />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div>
            <h4 className="text-xs font-semibold text-[var(--text)]">Prompt Injection Guard</h4>
            <p className="text-[10px] text-[var(--muted)]">Detect hidden instructions in content agents read</p>
          </div>
          <input type="checkbox" defaultChecked className="toggle" />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div>
            <h4 className="text-xs font-semibold text-[var(--text)]">Live Usage Dashboard</h4>
            <p className="text-[10px] text-[var(--muted)]">Show credit consumption in real-time</p>
          </div>
          <input type="checkbox" defaultChecked className="toggle" />
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
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
