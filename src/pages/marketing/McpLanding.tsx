import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, Terminal, ArrowRight, ShieldAlert, Zap,
} from 'lucide-react';
import { Reveal, Stagger, staggerItem, WordReveal } from './components/Reveal';
import { Counter } from './components/Counter';
import { McpAtmosphere, ScrollProgress, ScrollCue } from './components/McpAtmosphere';
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

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "https://yxgtmzksnyarlivgxujf.supabase.co").replace(/\/$/, "");
const MCP_ENDPOINT = `${SUPABASE_URL}/functions/v1/mcp`;

const b64url = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const CLIENT_META = [
  { id: "claude-desktop", name: "Claude Desktop" },
  { id: "claude-code", name: "Claude Code" },
  { id: "cursor", name: "Cursor" },
  { id: "vscode", name: "VS Code" },
  { id: "chatgpt", name: "ChatGPT & agents" },
  { id: "universal", name: "Any client" },
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
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [withKeyInUrl, setWithKeyInUrl] = useState(false);

  const hasKey = keyInput.startsWith('nsk_') && keyInput.length > 10;
  const personalizedLink = useMemo(() => {
    if (hasKey && withKeyInUrl) return `${MCP_ENDPOINT}?key=${encodeURIComponent(keyInput)}`;
    return MCP_ENDPOINT;
  }, [hasKey, withKeyInUrl, keyInput]);

  const activeClient = useMemo(() => {
    const url = personalizedLink;
    const header = hasKey && !withKeyInUrl
      ? `"Authorization": "Bearer ${keyInput}"`
      : null;
    const jsonCfg = header
      ? JSON.stringify({ mcpServers: { noska: { url, headers: { Authorization: `Bearer ${keyInput}` } } } }, null, 2)
      : JSON.stringify({ mcpServers: { noska: { url } } }, null, 2);

    const meta = {
      'claude-desktop': {
        name: 'Claude Desktop',
        steps: [
          'Open Claude Desktop → Settings → Developer → Edit Config',
          'Paste this into claude_desktop_config.json and restart Claude',
        ],
        copy: jsonCfg,
      },
      'claude-code': {
        name: 'Claude Code',
        steps: [
          'Run this in any terminal — Claude Code registers Noska instantly',
          header ? 'Headers travel with the command; nothing is stored by us' : 'Add your key as a header for full access (recommended)',
        ],
        copy: `claude mcp add --transport http noska ${url}` + (header ? ` \\\n  --header ${JSON.stringify('Authorization: Bearer ' + keyInput)}` : ''),
      },
      cursor: {
        name: 'Cursor',
        steps: [
          'Click the one-click button below, or paste this into .cursor/mcp.json',
          header ? 'Your key rides in the Authorization header' : 'Add your key for full access (recommended)',
        ],
        copy: jsonCfg,
        deeplink: `cursor://anysphere.cursor-deeplink/mcp/install?name=Noska&config=${b64url(jsonCfg)}`,
      },
      vscode: {
        name: 'VS Code',
        steps: [
          'VS Code 1.101+ — click the one-click button, or add this to mcp.json',
          'Works in VS Code, Insiders and VS Code-based forks',
        ],
        copy: JSON.stringify({ name: 'noska', type: 'http', url, ...(header ? { headers: { Authorization: `Bearer ${keyInput}` } } : {}) }, null, 2),
        deeplink: `vscode:mcp/install?${b64url(JSON.stringify({ name: 'noska', type: 'http', url, ...(header ? { headers: { Authorization: `Bearer ${keyInput}` } } : {}) }))}`,
      },
      chatgpt: {
        name: 'ChatGPT & agents',
        steps: [
          'ChatGPT → Settings → Connectors → Create → Add custom connector',
          'Paste the one-link URL (key included) — header-less clients need it',
          'Any agent runtime that speaks HTTP can use the same link',
        ],
        copy: hasKey && withKeyInUrl ? url : `${url}?key=YOUR_NSK_KEY`,
      },
      universal: {
        name: 'Any client',
        steps: [
          'Stdio-only client? mcp-remote bridges it to our HTTP endpoint',
          'Or speak raw JSON-RPC 2.0 over HTTP — that is the whole protocol',
        ],
        copy: `npx -y mcp-remote ${url}` + (header ? ` --header "Authorization: Bearer ${keyInput}"` : ''),
      },
    };
    return meta[client] ?? meta['claude-desktop'];
  }, [client, personalizedLink, hasKey, withKeyInUrl, keyInput]);

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
  };
  const copyLink = () => copyText(personalizedLink);
  return (
    <div className="mcp-page">
      <McpAtmosphere />
      <ScrollProgress />
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
                      accent="#E0AC3F"
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
                <b>{k === 'tools' ? <Counter value={TOTAL_TOOLS} /> : k === 'capability groups' ? <Counter value={9} suffix="+" /> : v}</b><span>{k}</span>
              </motion.div>
            ))}
          </Stagger>
        </div>
        <ScrollCue />
      </section>

      {/* ══ Connect — one link, any client ══ */}
      <section className="mcp-clients" id="connect">
        <div className="mcp-wrap">
          <Reveal><span className="mcp-kicker">// connect</span></Reveal>
          <WordReveal className="mcp-h2line" text="One link. Any client." />

          {/* Step 1 — your key personalizes everything below */}
          <Reveal delay={0.06}>
            <div className="mcp-keybox">
              <div className="mcp-keybox-head">
                <span className="mcp-stepnum">01</span>
                <div>
                  <b>Paste a key to personalize</b>
                  <span>Stays in this tab — nothing is sent anywhere until you connect a client.</span>
                </div>
                <Link to="/docs" className="mcp-mini-link">Create a key →</Link>
              </div>
              <div className="mcp-keyrow">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="mcp-keyinput"
                  placeholder="nsk_…"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value.trim())}
                  spellCheck={false}
                  autoComplete="off"
                />
                <button className="mcp-ghostbtn" onClick={() => setShowKey((s) => !s)}>
                  {showKey ? 'hide' : 'show'}
                </button>
                {keyInput && (
                  <button className="mcp-ghostbtn danger" onClick={() => setKeyInput('')}>clear</button>
                )}
              </div>
              <label className="mcp-urltoggle">
                <input type="checkbox" checked={withKeyInUrl} onChange={(e) => setWithKeyInUrl(e.target.checked)} />
                <span>Put the key in the link itself <code>?key=…</code> — needed for ChatGPT connectors &amp; header-less agents.</span>
              </label>
            </div>
          </Reveal>

          {/* Step 2 — the link */}
          <Reveal delay={0.08}>
            <div className="mcp-linkbox">
              <div className="mcp-linkbox-head">
                <span className="mcp-stepnum">02</span>
                <b>{keyInput ? 'Your endpoint' : 'The endpoint'}</b>
                {keyInput && withKeyInUrl && <span className="mcp-pill-gold">one-link mode</span>}
              </div>
              <div className="mcp-linkrow">
                <code className="mcp-linkval">{personalizedLink}</code>
                <button className="mcp-copybtn gold" onClick={copyLink}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'copied' : 'copy link'}
                </button>
              </div>
              <p className="mcp-linkhint">
                JSON-RPC 2.0 · streamable HTTP · every request owner-scoped to this key.
              </p>
            </div>
          </Reveal>

          {/* Step 3 — per-client install */}
          <Reveal delay={0.1}>
            <div className="mcp-clients-head">
              <span className="mcp-stepnum">03</span>
              <b>Pick your client</b>
            </div>
            <div className="mcp-tabs" role="tablist">
              {CLIENT_META.map((cl) => (
                <button key={cl.id} role="tab" aria-selected={client === cl.id}
                  className={`mcp-tab ${client === cl.id ? 'on' : ''}`}
                  onClick={() => setClient(cl.id)}>{cl.name}</button>
              ))}
            </div>
          </Reveal>

          <AnimatePresence mode="wait">
            <motion.div key={client + (keyInput ? '1' : '0')}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}>
              <div className="mcp-cfg">
                <button className="mcp-copybtn" onClick={() => copyText(activeClient.copy)}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'copied' : 'copy'}
                </button>
                {activeClient.steps.map((st, i) => (
                  <div className="mcp-cfg-step" key={i}>
                    <span className="mcp-cfg-stepnum">{i + 1}</span>
                    <p>{st}</p>
                  </div>
                ))}
                <pre>{activeClient.copy}</pre>
              </div>
              {activeClient.deeplink && (
                <a className="mcp-deeplink" href={activeClient.deeplink}>
                  <Zap size={15} /> One-click install in {activeClient.name}
                </a>
              )}
            </motion.div>
          </AnimatePresence>

          <Reveal>
            <p className="mcp-note">
              Security: prefer the Authorization header where the client supports it.
              The <code>?key=…</code> link variant is for header-less clients — treat it like a
              password (it can be revoked anytime in Settings → Developer).
            </p>
          </Reveal>
        </div>
      </section>
      {/* ══ Tool catalog ══ */}
      <section className="mcp-tools">
        <div className="mcp-wrap">
          <Reveal><span className="mcp-kicker">// tools/list</span></Reveal>
          <WordReveal className="mcp-h2line" text="Every capability, one protocol." />
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
            <WordReveal className="mcp-h2line" text="Destructive is a state machine." />
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
