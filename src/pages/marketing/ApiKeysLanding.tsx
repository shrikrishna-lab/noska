import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, EyeOff, KeyRound, ScanLine, ArrowRight,
} from 'lucide-react';
import { Reveal, Stagger, staggerItem } from './components/Reveal';
import { HoldToConfirm } from './components/HoldToConfirm';
import { SCOPES } from '../../features/api/apiContract';
import './ApiKeysLanding.css';

/* Group the REAL scope contract into readable bands */
const BANDS = [
  { name: 'Content', match: ['pages:', 'databases:', 'tasks:', 'reviews:', 'search:'], note: 'Pages · blocks · tasks · review cards · search' },
  { name: 'Platform', match: ['workspaces:', 'templates:', 'dashboards:', 'events:'], note: 'Workspaces · templates · dashboards · event bus' },
  { name: 'Intelligence', match: ['agents:', 'automations:'], note: 'Agents & automations — read, write, and run separately' },
  { name: 'Delivery', match: ['webhooks:', 'connections:'], note: 'Outbound webhooks & connected accounts' },
];

const KEY_A = ['pages:read', 'tasks:write'];
const KEY_B = SCOPES.map((s) => s.id);

const ENDPOINTS = [
  { m: 'GET', p: '/pages', s: 'pages:read' },
  { m: 'POST', p: '/pages', s: 'pages:write' },
  { m: 'POST', p: '/tasks', s: 'tasks:write' },
  { m: 'GET', p: '/events', s: 'events:read' },
  { m: 'POST', p: '/agents/:id/runs', s: 'agents:run' },
  { m: 'POST', p: '/webhooks', s: 'webhooks:manage' },
];

const SNIPPETS = {
  curl: `curl -X POST "$API/tasks" \\
  -H "Authorization: Bearer nsk_live_…" \\
  -H "Idempotency-Key: daily-standup-42" \\
  -H "Content-Type: application/json" \\
  -d '{ "page_id": "…", "text": "Ship V5",
        "priority": "high", "dueAt": "2026-09-01T09:00:00Z" }'`,
  js: `import { Noska } from "@noska/sdk";

const noska = new Noska({ apiKey: process.env.NOSKA_API_KEY, baseUrl: API });

await noska.tasks.create(
  { page_id, text: "Ship V5", priority: "high" },
  "daily-standup-42",           // idempotency key
);`,
  py: `import requests

r = requests.post(f"{API}/tasks",
    headers={"Authorization": f"Bearer {KEY}",
             "Idempotency-Key": "daily-standup-42"},
    json={"page_id": PAGE_ID, "text": "Ship V5",
          "priority": "high"})
print(r.status_code, r.json())`,
};

export default function ApiKeysLanding() {
  const [revealed, setRevealed] = useState(false);
  const [sealed, setSealed] = useState(false);   // shown once → blurred forever
  const [whichKey, setWhichKey] = useState('A');
  const [tab, setTab] = useState('curl');
  const [copied, setCopied] = useState(false);

  /* The brand truth, played honestly: reveal lasts ~4s, then seals forever. */
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setSealed(true), 4000);
    return () => clearTimeout(t);
  }, [revealed]);

  const activeScopes = whichKey === 'A' ? KEY_A : KEY_B;
  const allowed = useMemo(() => new Set(activeScopes), [activeScopes]);

  const copySnip = async () => {
    try { await navigator.clipboard.writeText(SNIPPETS[tab]); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
  };

  return (
    <div className="api-page">
      {/* ══ Hero ══ */}
      <section className="api-hero">
        <div className="api-wrap">
          <Reveal><span className="api-eyebrow"><KeyRound size={13} /> NOSKA DEVELOPER PLATFORM</span></Reveal>
          <Reveal delay={0.08} blur>
            <h1>
              Keys that mean<br /><em>exactly</em> what they say.
            </h1>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="api-sub">
              Scoped, hashed, revocable. A Noska key is a promise about what it can touch —
              enforced on every request, not documented in passing.
            </p>
          </Reveal>

          {/* Key card — shown once */}
          <Reveal delay={0.22} y={44}>
            <div className="api-keycard">
              <div className="api-keycard-top">
                <span className="api-keycard-chip" aria-hidden />
                <span className="api-keycard-label">NOSKA LIVE KEY</span>
                {!sealed && !revealed && (
                  <button className="api-reveal" onClick={() => setRevealed(true)}>
                    <ScanLine size={13} /> Reveal once
                  </button>
                )}
                {revealed && !sealed && (
                  <span className="api-seal-in"><motion.span layout className="api-dot" />sealing in 4s…</span>
                )}
                {sealed && (
                  <span className="api-sealed"><EyeOff size={13} /> sealed</span>
                )}
              </div>
              <div className={`api-secret ${sealed || !revealed ? 'blurred' : ''}`} data-sealed={sealed || undefined}>
                nsk_live_9fj20dk3Lq8xZtR41mWpQ7vBnY6cHsA2
              </div>
              <div className="api-keycard-foot">
                <AnimatePresence mode="wait">
                  <motion.span key={sealed ? 'sealed' : revealed ? 'live' : 'idle'}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {!revealed && 'Tap “Reveal once”. Watch what happens next.'}
                    {revealed && !sealed && 'nsk_ keys are SHA-256 hashed server-side.'}
                    {sealed && 'This is why our docs never say “find it later”.'}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Giant ghost numeral backdrop */}
        <span className="api-ghost" aria-hidden>01</span>
      </section>

      {/* ═─ Stat band ─═ */}
      <section className="api-stats">
        <div className="api-wrap api-stat-row">
          {[['60', 'req / min / key'], ['24 h', 'idempotency replay'], ['SHA-256', 'stored hashed'], ['100%', 'audit logged']].map(([v, k]) => (
            <Reveal key={k} className="api-stat"><b>{v}</b><span>{k}</span></Reveal>
          ))}
        </div>
      </section>

      {/* ══ 01 · Scopes ══ */}
      <section className="api-section">
        <div className="api-wrap">
          <Reveal><span className="api-numeral">01</span></Reveal>
          <Reveal delay={0.05}><h2>Scopes are the sentence.</h2></Reveal>
          <Reveal delay={0.1}>
            <p className="api-lede">
              Read is not write. Write is not run. Every endpoint declares its scope;
              every request is checked against yours before anything executes.
            </p>
          </Reveal>

          <Stagger className="api-bands">
            {BANDS.map((b) => (
              <motion.div key={b.name} className="api-band" variants={staggerItem}>
                <header><b>{b.name}</b><span>{b.note}</span></header>
                <ul>
                  {SCOPES.filter((s) => b.match.some((m) => s.id.startsWith(m))).map((s) => (
                    <li key={s.id}>
                      <code>{s.id}</code>
                      <em>{s.description}</em>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ══ 02 · Least privilege, live ══ */}
      <section className="api-section api-tint">
        <div className="api-wrap api-split">
          <div>
            <Reveal><span className="api-numeral">02</span></Reveal>
            <Reveal delay={0.05}><h2>Least privilege,<br />demonstrated.</h2></Reveal>
            <Reveal delay={0.1}>
              <p className="api-lede">
                Flip between two real key configurations. Same endpoints. Different verdicts —
                decided by scopes, not by mood.
              </p>
            </Reveal>
            <div className="api-keytoggle" role="tablist">
              <button role="tab" aria-selected={whichKey === 'A'} className={`api-kbtn ${whichKey === 'A' ? 'on' : ''}`} onClick={() => setWhichKey('A')}>
                Key A <code>{KEY_A.join(' · ')}</code>
              </button>
              <button role="tab" aria-selected={whichKey === 'B'} className={`api-kbtn ${whichKey === 'B' ? 'on' : ''}`} onClick={() => setWhichKey('B')}>
                Key B <code>all scopes</code>
              </button>
            </div>
          </div>

          <Reveal delay={0.15}>
            <div className="api-verdicts">
              {ENDPOINTS.map((e) => {
                const ok = allowed.has(e.s);
                return (
                  <div key={e.p + e.m} className={`api-verdict ${ok ? 'ok' : 'no'}`}>
                    <span className="api-vmethod">{e.m}</span>
                    <span className="api-vpath">{e.p}</span>
                    <span className="api-vscope">{e.s}</span>
                    <span className="api-vres">{ok ? '200' : '403'}</span>
                  </div>
                );
              })}
              <AnimatePresence mode="wait">
                <motion.p key={whichKey} className="api-verdict-note"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {whichKey === 'A'
                    ? 'Key A does its job perfectly — inside its lane.'
                    : 'Broader key, broader blast radius. Grant deliberately.'}
                </motion.p>
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ 03 · First request ══ */}
      <section className="api-section">
        <div className="api-wrap api-split">
          <div>
            <Reveal><span className="api-numeral">03</span></Reveal>
            <Reveal delay={0.05}><h2>Your first request,<br />three dialects.</h2></Reveal>
            <Reveal delay={0.1}>
              <p className="api-lede">
                Idempotency keys make retries safe; rich task metadata rides along in the same body;
                the response envelope never surprises you.
              </p>
            </Reveal>
            <Reveal delay={0.14}>
              <Link to="/docs" className="api-btn">Read the API reference <ArrowRight size={15} /></Link>
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <div className="api-codebox">
              <div className="api-codetabs">
                {['curl', 'js', 'py'].map((t) => (
                  <button key={t} className={`api-ctab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
                    {t === 'js' ? 'javascript' : t === 'py' ? 'python' : 'curl'}
                  </button>
                ))}
                <button className="api-copy" onClick={copySnip}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'copied' : 'copy'}</button>
              </div>
              <pre>{SNIPPETS[tab]}</pre>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ 04 · Rotate ══ */}
      <section className="api-section api-tint api-last">
        <div className="api-wrap api-split">
          <div>
            <Reveal><span className="api-numeral">04</span></Reveal>
            <Reveal delay={0.05}><h2>Rotate like you<br />mean it.</h2></Reveal>
            <Reveal delay={0.1}>
              <p className="api-lede">
                Expiry dates, instant revocation, and a rotation ceremony that treats secrets
                with the paranoia they deserve.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <div className="api-rotate">
              <HoldToConfirm
                label="Hold to rotate secret"
                doneLabel="rotated"
                duration={1200}
                accent="#17161B"
                className="api-rotate-btn"
                onComplete={() => { }}
              />
              <ol>
                <li>New secret generated &amp; shown <b>once</b></li>
                <li>Old signatures die instantly</li>
                <li>Event written to the audit log</li>
              </ol>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="api-cta">
        <Reveal blur>
          <h2>Create your first key.</h2>
          <p>Settings → Developer → API Keys. Shown once. Scoped forever. Fresh keys come with a one-click Claude MCP config — and the Connect AI Clients panel copies ready-made setups for ChatGPT, Cursor, VS Code and agents.</p>
          <div className="api-cta-row">
            <Link to="/docs" className="api-btn solid">Open the docs <ArrowRight size={15} /></Link>
            <Link to="/mcp" className="api-btn ghost">Or let Claude do it → MCP</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}