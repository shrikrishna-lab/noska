import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, Terminal, ArrowRight, ShieldAlert, Zap,
} from 'lucide-react';
import { Reveal, Stagger, staggerItem } from './components/Reveal';
import { HoldToConfirm } from './components/HoldToConfirm';
import { CursorFollower } from './components/CursorFollower';
import './McpLanding.css';

/* ─── Real V5 tool catalog (group · count) ─── */
const TOOL_GROUPS = [
  { g: 'content', n: 12, tools: ['search', 'fetch', 'create-pages', 'update-page', 'archive-page', 'restore-page', 'duplicate-page', 'move-page', 'list-pages', 'list-child-pages', 'get-parent-page', 'get-page-tree'] },
  { g: 'commands', n: 4, tools: ['list-commands', 'search-commands', 'get-command', 'execute-command'] },
  { g: 'tasks', n: 7, tools: ['list-tasks', 'create-task', 'update-task', 'complete-task', 'reopen-task', 'bulk-update-tasks', 'update-task-metadata'] },
  { g: 'learning', n: 5, tools: ['list-reviews', 'add-study-card', 'reschedule-review', 'get-study-progress', 'create-study-plan'] },
  { g: 'databases', n: 6, tools: ['list-databases', 'get-database', 'query-database', 'create-row', 'update-row', 'create-view'] },
  { g: 'workspace', n: 6, tools: ['list-workspaces', 'get-workspace', 'create-workspace', 'update-workspace', 'archive-workspace', 'switch-workspace'] },
  { g: 'templates', n: 6, tools: ['list-templates', 'get-template', 'create-template', 'create-from-template', 'update-template', 'archive-template'] },
  { g: 'dashboards', n: 5, tools: ['list-dashboards', 'get-dashboard', 'create-dashboard', 'update-dashboard', 'archive-dashboard'] },
  { g: 'agents', n: 10, tools: ['list-agents', 'get-agent', 'create-agent', 'update-agent', 'archive-agent', 'run-agent', 'inspect-agent-run', 'cancel-agent-run', 'retry-agent-run', 'list-agent-runs'] },
  { g: 'automations', n: 10, tools: ['list-automations', 'create-automation', 'update-automation', 'archive-automation', 'run-automation', 'inspect-automation-run', 'cancel-automation-run', 'retry-automation-run', 'list-automation-runs'] },
  { g: 'webhooks', n: 7, tools: ['list-webhooks', 'create-webhook', 'update-webhook', 'delete-webhook', 'rotate-webhook-secret', 'test-webhook', 'list-webhook-deliveries'] },
  { g: 'events', n: 3, tools: ['list-events', 'list-connected-accounts', 'disconnect-connected-account'] },
];
const TOTAL_TOOLS = TOOL_GROUPS.reduce((a, t) => a + t.n, 0);

const CLIENTS = [
  { id: 'claude-desktop', name: 'Claude Desktop',
    cfg: `{
  "mcpServers": {
    "noska": {
      "url": "https://<ref>.supabase.co/functions/v1/mcp",
      "headers": { "Authorization": "Bearer nsk_your_key" }
    }
  }
}` },
  { id: 'claude-code', name: 'Claude Code',
    cfg: `claude mcp add --transport http noska \\
  https://<ref>.supabase.co/functions/v1/mcp \\
  --header "Authorization: Bearer nsk_your_key"` },
  { id: 'cursor', name: 'Cursor',
    cfg: `{
  "mcpServers": {
    "noska": {
      "url": "https://<ref>.supabase.co/functions/v1/mcp",
      "headers": { "Authorization": "Bearer nsk_your_key" }
    }
  }
}` },
];

/* Scripted session — what Claude actually speaks to Noska */
const SESSION = [
  { dir: 'in', body: '{ "method": "initialize" }' },
  { dir: 'out', body: '{ "serverInfo": { "name": "noska", "version": "5.0.0" } }' },
  { dir: 'in', body: '{ "method": "tools/list" }' },
  { dir: 'out', body: `{ "tools": [ … ${TOTAL_TOOLS} capability tools ] }` },
  { dir: 'in', body: '{ "method": "tools/call", "params": { "name": "run-agent", … } }' },
  { dir: 'out', body: '{ "runId": "…", "status": "running" }' },
  { dir: 'out', body: '{ "verified": true }' },
];

function useTypedSession(started) {
  const [lines, setLines] = useState([]);
  const timer = useRef(0);
  useEffect(() => {
    if (!started) return;
    let li = 0, ci = 0, alive = true;
    const step = () => {
      if (!alive) return;
      if (li >= SESSION.length) { timer.current = setTimeout(step, 4200); li = 0; ci = 0; setLines([]); return; }
      const target = SESSION[li].body;
      ci += Math.ceil(target.length / 24);
      if (ci >= target.length) {
        setLines((prev) => [...prev.slice(-8), SESSION[li]]);
        li++; ci = 0;
        timer.current = setTimeout(step, 520);
      } else {
        const partial = SESSION[li];
        setLines((prev) => {
          const next = prev.filter((l) => l !== prev[prev.length - 1] || l.done);
          return [...next.slice(-8), { ...partial, partial: target.slice(0, ci), done: false }];
        });
        timer.current = setTimeout(step, 26);
      }
    };
    timer.current = setTimeout(step, 400);
    return () => { alive = false; clearTimeout(timer.current); };
  }, [started]);
  return lines;
}

export default function McpLanding() {
  const [booted, setBooted] = useState(false);
  const lines = useTypedSession(booted);
  const [client, setClient] = useState('claude-desktop');
  const [copied, setCopied] = useState(false);
  const [riskDemo, setRiskDemo] = useState('idle'); // idle → awaiting → confirmed

  const activeCfg = useMemo(() => CLIENTS.find((c) => c.id === client), [client]);

  const copyCfg = async () => {
    try { await navigator.clipboard.writeText(activeCfg.cfg); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* noop */ }
  };

  return (
    <div className="mcp-page">
      <CursorFollower variant="mcp" />

      {/* ══ Boot gate + hero terminal ══ */}
      <section className="mcp-hero">
        <div className="mcp-wrap">
          <Reveal><span className="mcp-eyebrow"><Terminal size={13} /> NOSKA MCP · v5.0.0 · streamable-http</span></Reveal>
          <Reveal delay={0.08} blur>
            <h1 className="mcp-title">
              Your workspace,<br /><span className="mcp-green">native</span> in every AI client.
            </h1>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mcp-sub">
              One JSON-RPC endpoint. {TOTAL_TOOLS} verified tools. Every mutation checked
              against persisted state before Noska will say it happened.
            </p>
          </Reveal>

          <Reveal delay={0.2} y={44}>
            <div className="mcp-console-frame">
              <div className="mcp-console-bar">
                <span className="mcp-dot r" /><span className="mcp-dot y" /><span className="mcp-dot g" />
                <span className="mcp-console-title">noska — jsonrpc 2.0</span>
                {!booted && <span className="mcp-halted">SESSION HALTED</span>}
              </div>
              <div className="mcp-console-body">
                {!booted ? (
                  <div className="mcp-boot">
                    <p>The session is halted. Nothing runs until you say so.</p>
                    <HoldToConfirm
                      className="mcp-boot-btn"
                      label="Hold to boot"
                      doneLabel="session live"
                      duration={1000}
                      onComplete={() => setBooted(true)}
                      accent="#7CE38B"
                    />
                  </div>
                ) : (
                  <div className="mcp-session" aria-live="polite">
                    {lines.map((l, i) => (
                      <motion.div
                        key={`${i}-${l.body?.slice(0, 12)}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`mcp-line ${l.dir === 'in' ? 'in' : 'out'} ${l.done === false ? 'typing' : ''}`}
                      >
                        <span className="mcp-dir">{l.dir === 'in' ? '← recv' : '→ send'}</span>
                        <code>{l.partial ?? l.body}</code>
                        {l.done !== false && <span className="mcp-ok">ok</span>}
                      </motion.div>
                    ))}
                    <span className="mcp-caret" />
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          <Stagger className="mcp-stats">
            {[
              [`${TOTAL_TOOLS}`, 'tools'],
              ['9+', 'capability groups'],
              ['2025-06-18', 'protocol'],
              ['100%', 'owner-scoped'],
            ].map(([v, k]) => (
              <motion.div key={k} className="mcp-stat" variants={staggerItem}>
                <b>{v}</b><span>{k}</span>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ══ Clients ══ */}
      <section className="mcp-clients">
        <div className="mcp-wrap">
          <Reveal><span className="mcp-kicker">// connect</span></Reveal>
          <Reveal delay={0.05} blur><h2>Two minutes to first light.</h2></Reveal>
          <Reveal delay={0.1}>
            <div className="mcp-tabs" role="tablist">
              {CLIENTS.map((c) => (
                <button key={c.id} role="tab" aria-selected={client === c.id}
                  className={`mcp-tab ${client === c.id ? 'on' : ''}`}
                  onClick={() => setClient(c.id)}>{c.name}</button>
              ))}
            </div>
          </Reveal>
          <AnimatePresence mode="wait">
            <motion.div key={client} className="mcp-cfg"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}>
              <button className="mcp-copy" onClick={copyCfg}>
                {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'copied' : 'copy'}
              </button>
              <pre>{activeCfg.cfg}</pre>
            </motion.div>
          </AnimatePresence>
          <Reveal>
            <p className="mcp-note">
              Keys are created in-app under Settings → Developer. Noska stores only SHA-256 hashes;
              the raw key is shown exactly once.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══ Tool catalog ══ */}
      <section className="mcp-tools">
        <div className="mcp-wrap">
          <Reveal><span className="mcp-kicker">// tools/list</span></Reveal>
          <Reveal delay={0.05} blur><h2>Every capability,<br />one protocol.</h2></Reveal>
          <Stagger className="mcp-groups">
            {TOOL_GROUPS.map((t) => (
              <motion.div key={t.g} className="mcp-group" variants={staggerItem}>
                <header><b>{t.g}</b><span>{t.n}</span></header>
                <div className="mcp-chips">
                  {t.tools.map((tool) => <code key={tool}>{tool}</code>)}
                </div>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ══ Risk gate ══ */}
      <section className="mcp-risk">
        <div className="mcp-wrap mcp-split">
          <div>
            <Reveal><span className="mcp-kicker">// risk gate</span></Reveal>
            <Reveal delay={0.05} blur><h2>Destructive is<br />a state machine.</h2></Reveal>
            <Reveal delay={0.1}>
              <p className="mcp-note big">
                RED-risk capabilities refuse to run on faith. The model gets told to ask again
                with <code>confirm:true</code> — after a human actually agrees.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <div className="mcp-risk-demo">
              <button
                className={`mcp-pill ${riskDemo !== 'idle' ? 'red' : ''}`}
                onClick={() => riskDemo === 'idle' && setRiskDemo('awaiting')}
                disabled={riskDemo !== 'idle'}
              >
                archive-page <ShieldAlert size={13} />
              </button>
              <AnimatePresence mode="wait">
                {riskDemo === 'awaiting' && (
                  <motion.div key="await" className="mcp-await"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Zap size={13} />
                    <span>status: <b>awaiting_confirmation</b> — re-call with confirm:true once approved.</span>
                    <button className="mcp-confirm" onClick={() => setRiskDemo('confirmed')}>confirm:true</button>
                  </motion.div>
                )}
                {riskDemo === 'confirmed' && (
                  <motion.div key="done" className="mcp-done"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {'{ archived: true, verified: true }'}
                    <button className="mcp-reset" onClick={() => setRiskDemo('idle')}>reset</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="mcp-cta">
        <Reveal blur>
          <h2>Stop describing your workspace.<br /><span className="mcp-green">Let them use it.</span></h2>
          <div className="mcp-cta-row">
            <Link to="/docs/mcp" className="mcp-btn-solid">Full MCP docs <ArrowRight size={15} /></Link>
            <Link to="/api-keys" className="mcp-btn-line">Prefer REST? API keys</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}