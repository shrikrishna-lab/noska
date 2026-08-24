import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plug, KeyRound, Search, FileText, ListTodo, BrainCircuit,
  Database, Bot, Zap, ShieldCheck, RefreshCw, Terminal, CheckCircle2,
  AlertTriangle, Copy, Check, ChevronDown, ChevronUp, ArrowLeft,
} from 'lucide-react';

/* ─── Noska MCP v4 documentation page (/docs/mcp) ─── */

const TOOL_GROUPS: Array<{
  id: string;
  icon: typeof Search;
  title: string;
  scope: string;
  tools: Array<{ name: string; desc: string; risk?: 'GREEN' | 'YELLOW' | 'RED' }>;
}> = [
  {
    id: 'content', icon: FileText, title: 'Content · Pages', scope: 'pages:*',
    tools: [
      { name: 'search', desc: 'Natural-language search across pages, block text, tasks and study cards.' },
      { name: 'fetch', desc: 'Read any page as markdown. Accepts UUID or Noska URL. format=blocks gives raw native blocks.' },
      { name: 'create-pages', desc: 'Create one or more pages from markdown, optionally nested under a parent.', risk: 'YELLOW' },
      { name: 'update-page', desc: 'Rename, append markdown blocks, set icon/tags, or archive.', risk: 'YELLOW' },
      { name: 'archive-page', desc: 'Move a page to trash (reversible).', risk: 'RED' },
      { name: 'restore-page', desc: 'Restore an archived page.', risk: 'YELLOW' },
      { name: 'duplicate-page', desc: 'Full-fidelity copy including blocks.', risk: 'YELLOW' },
      { name: 'move-page', desc: 'Re-parent within your hierarchy. Cycle-safe.', risk: 'YELLOW' },
      { name: 'list-pages', desc: 'Compact listing, filterable by trash/parent.' },
      { name: 'list-child-pages', desc: 'Direct children of a page.' },
      { name: 'get-parent-page', desc: 'Parent of a page (null at root).' },
      { name: 'get-page-tree', desc: 'Entire workspace hierarchy as a nested tree.' },
    ],
  },
  {
    id: 'commands', icon: Terminal, title: 'Native Slash Commands', scope: 'pages:read/write',
    tools: [
      { name: 'list-commands', desc: 'The real Noska slash-command registry — every native block primitive.' },
      { name: 'search-commands', desc: 'Find commands, e.g. "todo" → /todo.' },
      { name: 'get-command', desc: 'Inspect stored block type + defaults for one command.' },
      { name: 'execute-command', desc: 'Run /todo, /h1, /callout, /code … against a page — inserts the same block typing in-app would.', risk: 'YELLOW' },
    ],
  },
  {
    id: 'tasks', icon: ListTodo, title: 'Tasks', scope: 'tasks:*',
    tools: [
      { name: 'list-tasks', desc: 'Todos across pages; filter by done/page.' },
      { name: 'create-task', desc: 'Add a todo item to any page.', risk: 'YELLOW' },
      { name: 'update-task', desc: 'Rename and/or check/uncheck.', risk: 'YELLOW' },
      { name: 'complete-task', desc: 'Mark complete — verified against persisted state.', risk: 'YELLOW' },
      { name: 'reopen-task', desc: 'Reopen a completed task.', risk: 'YELLOW' },
      { name: 'bulk-update-tasks', desc: 'Update many tasks atomically-reported.', risk: 'RED' },
    ],
  },
  {
    id: 'learning', icon: BrainCircuit, title: 'Learning · Spaced Repetition', scope: 'reviews:*',
    tools: [
      { name: 'list-reviews', desc: 'Study cards; due=true → today\'s queue.' },
      { name: 'add-study-card', desc: 'Schedule existing block(s) as SM-2 cards due immediately — batch supported.', risk: 'YELLOW' },
      { name: 'reschedule-review', desc: 'Move a card\'s next review (ISO time or +N days).', risk: 'YELLOW' },
      { name: 'get-study-progress', desc: 'Analytics: totals, due, overdue, retention %, mastery %, weakest topics.' },
      { name: 'create-study-plan', desc: 'Workflow: pick N content blocks → schedule cards → create tomorrow\'s review task → verify every step.', risk: 'YELLOW' },
    ],
  },
  {
    id: 'databases', icon: Database, title: 'Databases & Views', scope: 'databases:*',
    tools: [
      { name: 'list-databases', desc: 'Every database block across pages, with row/property counts.' },
      { name: 'get-database', desc: 'Properties, views and rows of one database.' },
      { name: 'query-database', desc: 'Rows with equality filters, sorting, pagination.' },
      { name: 'create-row', desc: 'Insert a row (verified).', risk: 'YELLOW' },
      { name: 'update-row', desc: 'Update name/props of a row.', risk: 'YELLOW' },
      { name: 'create-view', desc: 'Add table/board/list/calendar/gallery view config.', risk: 'YELLOW' },
    ],
  },
  {
    id: 'agents', icon: Bot, title: 'Agents', scope: 'pages:*',
    tools: [
      { name: 'list-agents', desc: 'Your real Noska agents.' },
      { name: 'get-agent', desc: 'Instructions, model, status.' },
      { name: 'create-agent', desc: 'e.g. "Study Guardian" with instructions/model/status/triggers.', risk: 'YELLOW' },
      { name: 'update-agent', desc: 'Rename, edit instructions, enable/disable.', risk: 'YELLOW' },
      { name: 'archive-agent', desc: 'Soft-archive (pause).', risk: 'RED' },
      { name: 'run-agent', desc: 'Returns UNSUPPORTED_CAPABILITY — execution lives in the Noska app runtime; never simulated.' },
    ],
  },
  {
    id: 'automations', icon: Zap, title: 'Automations', scope: 'pages:*',
    tools: [
      { name: 'list-automations', desc: 'Automations shared with the Automations UI.' },
      { name: 'create-automation', desc: 'Schedules like "weekly mon 08:00" + steps + conditions.', risk: 'YELLOW' },
      { name: 'update-automation', desc: 'Rename, reschedule, enable/disable.', risk: 'YELLOW' },
      { name: 'archive-automation', desc: 'Pause an automation.', risk: 'RED' },
      { name: 'run-automation', desc: 'Same honest boundary as run-agent.' },
    ],
  },
  {
    id: 'context', icon: Search, title: 'Context · System', scope: 'search:read',
    tools: [
      { name: 'get-workspace-context', desc: 'AI-oriented snapshot: pages, open tasks, due reviews, agents, automations, available commands.' },
      { name: 'get-current-context', desc: 'Everything about ONE page: parent, children, open tasks, study cards.' },
      { name: 'verify', desc: 'Re-read persisted state and compare expected fields — passed/failed per check.' },
    ],
  },
];

const RISK_STYLES: Record<string, string> = {
  GREEN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  YELLOW: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  RED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="overflow-x-auto rounded-xl border border-slate-700 bg-[#0d1428] p-4 font-mono text-[12px] leading-relaxed text-[#e6ebff]">
        {children}
      </pre>
      <button
        onClick={() => { navigator.clipboard?.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-white/20"
      >
        {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function Section({ id, title, kicker, children }: { id: string; title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[var(--border)] pt-10 first:border-t-0 first:pt-0">
      {kicker && <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--accent)]">{kicker}</div>}
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-[var(--text)]">{title}</h2>
      <div className="space-y-4 text-sm leading-relaxed text-[var(--secondary)]">{children}</div>
    </section>
  );
}

export default function McpDocs() {
  const [openGroup, setOpenGroup] = useState<string>('content');

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{
        // Marketing shell doesn't define the workspace palette — pin a LIGHT
        // palette locally (matches the rest of the docs site) so every var()
        // below resolves, regardless of route context.
        '--text': '#0f172a',
        '--secondary': '#475569',
        '--muted': '#94a3b8',
        '--surface': '#f8fafc',
        '--panel': '#ffffff',
        '--hover': 'rgba(15,23,42,0.04)',
        '--border': '#e2e8f0',
        '--border-strong': '#cbd5e1',
        '--accent': '#8a744f',
        '--noska-blue': '#8a744f',
        '--noska-blue-soft': 'rgba(227,207,179,0.18)',
      } as React.CSSProperties}
    >
      {/* Hero */}
      <header className="border-b border-[var(--border)] bg-gradient-to-b from-[#faf9f6] to-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <Link to="/docs" className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--secondary)] hover:text-[var(--text)]">
            <ArrowLeft size={13} /> All documentation
          </Link>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--accent)]">
            <Plug size={12} /> Model Context Protocol
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Noska MCP</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--secondary)]">
            Connect Claude Desktop, Cursor, ChatGPT-compatible clients or custom agents directly to your
            Noska workspace. <strong className="text-[var(--text)]">47 tools · 9 capability groups</strong> — search,
            read and write pages as markdown, run slash commands, manage tasks, databases, spaced-repetition
            learning, agents and automations. Permission-aware, verified, idempotent.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            {[['v4.0', 'current'], ['streamable HTTP', 'transport'], ['JSON-RPC 2.0', 'protocol'], ['SHA-256 keys', 'auth']].map(([a, b]) => (
              <span key={a} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
                <strong>{a}</strong> <span className="text-[var(--muted)]">{b}</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-14 px-6 py-14">

        <Section id="quickstart" kicker="5 minutes" title="Quick start">
          <p><strong className="text-[var(--text)]">1.</strong> Create an API key with the scopes you need — in-app: <em>Settings → Developer</em>, or API Console → API Keys. Keys are shown once; Noska stores only SHA-256 hashes.</p>
          <p><strong className="text-[var(--text)]">2.</strong> Deploy the server (or point at an existing instance):</p>
          <Code>{`supabase functions deploy mcp --no-verify-jwt
# endpoint: https://<project>.supabase.co/functions/v1/mcp`}</Code>
          <p><strong className="text-[var(--text)]">3.</strong> Add it to your client:</p>
          <Code>{`{
  "mcpServers": {
    "noska": {
      "url": "https://<project>.supabase.co/functions/v1/mcp",
      "headers": { "Authorization": "Bearer nsk_yourkey" }
    }
  }
}`}</Code>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="text-[var(--text)]">Claude Desktop:</strong> paste into <code className="rounded bg-[var(--surface)] px-1">claude_desktop_config.json</code> and restart.</li>
            <li><strong className="text-[var(--text)]">Cursor:</strong> Settings → MCP → Add server → same URL + header.</li>
            <li><strong className="text-[var(--text)]">Any other client:</strong> anything that speaks JSON-RPC 2.0 over streamable HTTP works — <code className="rounded bg-[var(--surface)] px-1">initialize</code>, then <code className="rounded bg-[var(--surface)] px-1">tools/list</code>, then <code className="rounded bg-[var(--surface)] px-1">tools/call</code>.</li>
          </ul>
          <p>Then just ask: <em>"Search my Noska for Raft, fetch that page and turn its paragraphs into study cards."</em></p>
        </Section>

        <Section id="setup-guide" kicker="Step by step" title="Setup guide">
          <div className="space-y-8">
            {/* STEP 1 */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)]/15 text-[11px] font-bold text-[#8a744f]">1</span>
                Create your API key
              </h4>
              <ol className="ml-9 list-decimal space-y-1.5 text-[13px]">
                <li>Open Noska → <strong className="text-[var(--text)]">Settings → Developer</strong> (or <strong className="text-[var(--text)]">API Console → API Keys</strong>).</li>
                <li>Enter a key name — e.g. <code className="rounded bg-[var(--surface)] px-1">Claude Desktop</code>.</li>
                <li>Pick scopes. Recommended starter set: <code className="rounded bg-[var(--surface)] px-1">pages:read</code> <code className="rounded bg-[var(--surface)] px-1">pages:write</code> <code className="rounded bg-[var(--surface)] px-1">tasks:read</code> <code className="rounded bg-[var(--surface)] px-1">tasks:write</code> <code className="rounded bg-[var(--surface)] px-1">search:read</code>. Add <code className="rounded bg-[var(--surface)] px-1">reviews:*</code> if you want study-card control.</li>
                <li>Choose an expiry (30–90 days recommended) and click <strong className="text-[var(--text)]">Generate key</strong>.</li>
                <li><strong className="text-[var(--text)]">Copy it immediately</strong> — it's shown once and can't be recovered.</li>
              </ol>
            </div>

            {/* STEP 2 */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)]/15 text-[11px] font-bold text-[#8a744f]">2</span>
                Deploy the MCP server
              </h4>
              <p className="mb-2 ml-9 text-[13px]">From the repo root (requires Supabase CLI + a linked project):</p>
              <div className="ml-9"><Code>{`# one-time
supabase link --project-ref <your-project-ref>

# deploy the MCP endpoint
supabase functions deploy mcp --no-verify-jwt

# deploy the REST API (optional, powers the API Console)
supabase functions deploy api-v1 --no-verify-jwt

# apply the key tables if not yet applied
supabase db push`}</Code></div>
              <p className="ml-9 mt-2 text-[12px] text-[var(--muted)]">
                Your endpoint becomes <code className="rounded bg-[var(--surface)] px-1">https://&lt;project-ref&gt;.supabase.co/functions/v1/mcp</code>.
                <code className="ml-1 rounded bg-[var(--surface)] px-1">--no-verify-jwt</code> is required because MCP authenticates with Noska keys, not Supabase JWTs.
              </p>
            </div>

            {/* STEP 3 — CLAUDE */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)]/15 text-[11px] font-bold text-[#8a744f]">3</span>
                Connect Claude Desktop
              </h4>
              <div className="ml-9 space-y-2 text-[13px]">
                <p>Open the config file (create it if missing):</p>
                <Code>{`Windows:  %APPDATA%\\Claude\\claude_desktop_config.json
macOS:    ~/Library/Application Support/Claude/claude_desktop_config.json
Linux:    ~/.config/Claude/claude_desktop_config.json`}</Code>
                <Code>{`{
  "mcpServers": {
    "noska": {
      "url": "https://<project-ref>.supabase.co/functions/v1/mcp",
      "headers": {
        "Authorization": "Bearer nsk_YOUR_KEY_HERE"
      }
    }
  }
}`}</Code>
                <p>Save, restart Claude Desktop, then click the <strong className="text-[var(--text)]">tools</strong> (hammer) icon — you should see Noska's tools listed. Try: <em>"Search my Noska for today's tasks."</em></p>
              </div>
            </div>

            {/* STEP 4 — CURSOR */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)]/15 text-[11px] font-bold text-[#8a744f]">4</span>
                Connect Cursor
              </h4>
              <div className="ml-9 space-y-2 text-[13px]">
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Cursor Settings → <strong className="text-[var(--text)]">MCP</strong> → <strong className="text-[var(--text)]">Add new global MCP server</strong>.</li>
                  <li>Create <code className="rounded bg-[var(--surface)] px-1">~/.cursor/mcp.json</code> with the same block as above (the <code className="rounded bg-[var(--surface)] px-1">"mcpServers"</code> object).</li>
                  <li>Reload Cursor. The Noska tools appear under MCP tools; enable the ones you want the agent to use.</li>
                </ol>
              </div>
            </div>

            {/* STEP 5 — VERIFY */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)]/15 text-[11px] font-bold text-[#8a744f]">5</span>
                Verify the connection
              </h4>
              <div className="ml-9"><Code>{`curl -X POST "https://<project-ref>.supabase.co/functions/v1/mcp" \\
  -H "Authorization: Bearer nsk_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# expect: { "result": { "tools": [ … 47 tools … ] } }`}</Code></div>
              <p className="ml-9 mt-2 text-[12px] text-[var(--muted)]">401 → key problem · 200 with tools → you're live.</p>
            </div>
          </div>
        </Section>

        <Section id="authentication" kicker="Security" title="Authentication & scopes">
          <p>Every JSON-RPC method — including <code className="rounded bg-[var(--surface)] px-1">tools/list</code> — requires a valid key.
          Invalid, revoked or expired keys get <strong className="text-[var(--text)]">401</strong> on all methods.</p>
          <Code>{`Authorization: Bearer nsk_…`}</Code>
          <p>Keys carry fine-grained scopes enforced per tool:</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {['pages:read','pages:write','tasks:read','tasks:write','reviews:read','reviews:write','search:read','databases:read'].map((s) => (
              <code key={s} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-center font-mono text-[11px]">{s}</code>
            ))}
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <p className="text-[13px]">All queries are scoped to the key owner at the server level. Cross-workspace access is structurally impossible — IDs belonging to another user resolve to <code>NOT_FOUND</code>, never data.</p>
          </div>
        </Section>

        <Section id="workflow" kicker="How the AI uses it" title="The core workflow">
          <p>Noska's MCP mirrors how a person uses the app — the AI chains calls naturally:</p>
          <Code>{`You:   "Find my Raft notes, make 3 study cards from them,
        and add a task to review them tomorrow."

AI:    search("raft")              → finds Distributed Systems (+ url)
       fetch(id_or_url=<url>)      → page as markdown
       add-study-card(block_ids)   → SM-2 cards scheduled ✓ verified
       create-task(text, page)     → "Review Raft cards" due tomorrow ✓

Every write returns { id, url, … } so each step can reference the last.`}</Code>
          <p>The same pattern powers bigger asks — <em>"Build my exam-prep page under Semester 5"</em> becomes <code className="rounded bg-[var(--surface)] px-1">create-pages</code> (nested, markdown) followed by <code className="rounded bg-[var(--surface)] px-1">execute-command</code> callouts and task creation.</p>
        </Section>

        <Section id="tools" kicker="Reference" title="All 47 tools by group">
          <p className="!mb-4">Risk badges map to the confirmation gate: <span className={`mx-1 rounded border px-1.5 py-0.5 text-[10px] ${RISK_STYLES.GREEN}`}>GREEN</span> runs freely · <span className={`mx-1 rounded border px-1.5 py-0.5 text-[10px] ${RISK_STYLES.YELLOW}`}>YELLOW</span> writes (verified) · <span className={`mx-1 rounded border px-1.5 py-0.5 text-[10px] ${RISK_STYLES.RED}`}>RED</span> destructive — refuses until you re-call with <code className="rounded bg-[var(--surface)] px-1">confirm:true</code>.</p>
          <div className="space-y-2">
            {TOOL_GROUPS.map((g) => {
              const Icon = g.icon;
              const open = openGroup === g.id || undefined;
              return (
                <div key={g.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                  <button
                    onClick={() => setOpenGroup(open ? '' : g.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--hover)]"
                  >
                    <Icon size={16} className="shrink-0 text-[var(--accent)]" />
                    <span className="flex-1 text-sm font-semibold text-[var(--text)]">{g.title}</span>
                    <span className="hidden font-mono text-[10px] text-[var(--muted)] sm:block">{g.scope}</span>
                    <span className="rounded-md bg-[var(--hover)] px-2 py-0.5 text-[10px] font-bold text-[var(--secondary)]">{g.tools.length}</span>
                    {openGroup === g.id ? <ChevronUp size={15} className="text-[var(--muted)]" /> : <ChevronDown size={15} className="text-[var(--muted)]" />}
                  </button>
                  {(openGroup === g.id) && (
                    <div className="border-t border-[var(--border)] px-4 py-3">
                      <table className="w-full text-left text-[12px]">
                        <tbody>
                          {g.tools.map((t) => (
                            <tr key={t.name} className="border-b border-[var(--border)]/40 last:border-0">
                              <td className="py-2 pr-3 align-top">
                                <code className="font-mono font-semibold text-[#8a744f]">{t.name}</code>
                                {t.risk && <span className={`ml-2 rounded border px-1 py-px align-middle text-[9px] font-bold ${RISK_STYLES[t.risk]}`}>{t.risk}</span>}
                              </td>
                              <td className="py-2 text-[var(--secondary)]">{t.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        <Section id="markdown" kicker="Content contract" title="Markdown in, markdown out">
          <p>Pages travel as markdown so any model can read and write them. Creation maps onto <strong className="text-[var(--text)]">real native blocks</strong> — nothing is faked:</p>
          <Code>{`# Heading 1          →  heading_1
## Heading 2         →  heading_2
- bullet             →  bulleted_list_item
1. numbered          →  numbered_list_item
- [ ] todo           →  to_do  (checked: false)
- [x] done           →  to_do  (checked: true)
> quote              →  quote
\`\`\`js … \`\`\`          →  code  (language preserved)
---                  →  divider`}</Code>
          <p><code className="rounded bg-[var(--surface)] px-1">fetch(format:"markdown")</code> round-trips structure back out; <code className="rounded bg-[var(--surface)] px-1">format:"markdown+metadata"</code> adds parent/children/tags/open-task/study-card counts; <code className="rounded bg-[var(--surface)] px-1">format:"blocks"</code> exposes the raw native block array.</p>
        </Section>

        <Section id="trust" kicker="Reliability" title="Verification, confirmations & idempotency">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <ShieldCheck size={16} className="mb-2 text-emerald-400" />
              <h4 className="mb-1 text-sm font-semibold text-[var(--text)]">Verified writes</h4>
              <p className="text-[12px] leading-relaxed">Mutations are re-read from the database before reporting success. A failed verification surfaces as <code>verified:false</code> — never silent success.</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <CheckCircle2 size={16} className="mb-2 text-amber-400" />
              <h4 className="mb-1 text-sm font-semibold text-[var(--text)]">Confirmation gate</h4>
              <p className="text-[12px] leading-relaxed">RED-risk tools refuse without <code>confirm:true</code>, returning <code>awaiting_confirmation</code>. The AI must loop back through the human.</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <RefreshCw size={16} className="mb-2 text-[var(--accent)]" />
              <h4 className="mb-1 text-sm font-semibold text-[var(--text)]">Idempotency</h4>
              <p className="text-[12px] leading-relaxed">Pass <code>idempotency_key</code> on mutations/workflows: retries replay the original result (<code>idempotency_replayed:true</code>) instead of duplicating.</p>
            </div>
          </div>
          <p className="pt-1">Errors are structured and stable: <code>AUTH_REQUIRED</code> · <code>FORBIDDEN</code> · <code>NOT_FOUND</code> · <code>INVALID_ID</code> · <code>VALIDATION_ERROR</code> · <code>UNSUPPORTED_CAPABILITY</code>. Capabilities that don't exist in Noska yet (agent/automation execution happens in-app) return <code>UNSUPPORTED_CAPABILITY</code> rather than simulated success.</p>
        </Section>

        <Section id="local-dev" kicker="Development" title="Local development stack">
          <p>The function runs anywhere Deno runs — handy for testing against a mock backend without touching production:</p>
          <Code>{`# terminal 1 — fake Supabase REST (in-memory workspace)
node mock-supabase.mjs                       # :51999

# terminal 2 — the real MCP function
SUPABASE_URL=http://127.0.0.1:51999 \\
SUPABASE_SERVICE_ROLE_KEY=local \\
SITE_URL=http://127.0.0.1:5173 \\
deno run -A --no-check supabase/functions/mcp/index.ts   # :8000

# smoke test
curl -X POST http://127.0.0.1:8000/ \\
  -H "Authorization: Bearer nsk_…" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}</Code>
        </Section>

        <Section id="troubleshooting" kicker="Help" title="Troubleshooting">
          <div className="space-y-3">
            {[
              ["401 AUTH_REQUIRED on everything", "Key missing/expired/revoked, or header malformed. Regenerate in Settings → Developer and update the client header."],
              ["403 FORBIDDEN insufficient_scope", "The tool needs a scope your key doesn't have. Create a new key with that scope — scopes can't be edited after creation."],
              ["awaiting_confirmation", "You called a RED-risk tool. Re-send with confirm:true after user approval."],
              ["NOT_FOUND for an ID that exists", "IDs only resolve inside the key owner's workspace — cross-user access intentionally returns NOT_FOUND."],
              ["UNSUPPORTED_CAPABILITY on run-agent", "Agent/automation execution happens inside the Noska app runtime. Trigger from the Agents/Automations UI."],
              ["Client shows no tools", "Ensure --no-verify-jwt was used at deploy (API-key auth, not Supabase JWTs), and the URL ends at /functions/v1/mcp."],
            ].map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-[var(--text)]">{q}</summary>
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--secondary)]">{a}</p>
              </details>
            ))}
          </div>
        </Section>

        <Section id="changelog" kicker="History" title="Changelog">
          <div className="space-y-3">
            {[
              ['v4.0', 'Capability registry (47 tools / 9 groups): native slash commands, page organization (move/duplicate/tree), database views+queries, agent & automation CRUD, context snapshots, create-study-plan workflow, standalone verify, RED confirmation gate, idempotency.'],
              ['v2.0', 'Notion-style behavior: fetch-by-URL returning markdown, multi-page markdown creation, URL-or-ID resolution everywhere. Security fix: tools/list now authenticated.'],
              ['v1.0', 'Initial 8 CRUD tools over pages/tasks/reviews.'],
            ].map(([v, d]) => (
              <div key={v} className="flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <code className="shrink-0 font-mono text-xs font-bold text-[var(--accent)]">{v}</code>
                <p className="text-[12px] leading-relaxed text-[var(--secondary)]">{d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <div className="rounded-2xl border border-[var(--accent)]/25 bg-gradient-to-br from-[var(--accent)]/[0.08] to-transparent p-8 text-center">
          <KeyRound size={22} className="mx-auto mb-3 text-[var(--accent)]" />
          <h3 className="text-lg font-bold text-[var(--text)]">Ready to connect?</h3>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-[var(--secondary)]">
            Generate a scoped key and give your AI the keys to your second brain.
          </p>
          <Link to="/login" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2E333C] px-6 py-2.5 text-sm font-semibold text-[#EDEBE5] transition-opacity hover:opacity-90">
            Open Noska → Settings → Developer <Plug size={14} />
          </Link>
        </div>
      </main>
    </div>
  );
}
