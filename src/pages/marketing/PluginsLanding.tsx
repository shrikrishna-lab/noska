import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, ShieldCheck, Lock, RotateCcw, Puzzle,
  GitBranch, Calendar, Mail, MessageSquare, Hash, CircleDashed, Check,
} from 'lucide-react';
import { Reveal, Stagger, staggerItem } from './components/Reveal';
import { TiltCard } from './components/TiltCard';
import { HoldToConfirm } from './components/HoldToConfirm';
import { CursorFollower } from './components/CursorFollower';
import './PluginsLanding.css';

/* ─── Honest registry state: only what V5 actually ships ─── */
const PLUGINS = [
  { id: 'github', name: 'GitHub', icon: GitBranch, tint: 'sage', state: 'design-partner',
    blurb: 'Issues, pull requests & repositories — mirrored into tasks.',
    perms: ['github.repositories.read', 'github.issues.read', 'github.issues.write'] },
  { id: 'gcal', name: 'Google Calendar', icon: Calendar, tint: 'blue', state: 'coming-soon',
    blurb: 'Deadlines become review tasks before they become surprises.',
    perms: ['calendar.events.read'] },
  { id: 'gmail', name: 'Gmail', icon: Mail, tint: 'red', state: 'coming-soon',
    blurb: 'Surface commitment emails; draft replies in your voice.',
    perms: ['gmail.read', 'gmail.drafts.write'] },
  { id: 'slack', name: 'Slack', icon: Hash, tint: 'purple', state: 'coming-soon',
    blurb: 'Mentions become tasks. Channels stay searchable.',
    perms: ['slack.channels.read', 'slack.messages.search'] },
  { id: 'discord', name: 'Discord', icon: MessageSquare, tint: 'orange', state: 'coming-soon',
    blurb: 'Community signals, captured where work happens.',
    perms: ['discord.channels.read'] },
  { id: 'linear', name: 'Linear', icon: CircleDashed, tint: 'charcoal', state: 'coming-soon',
    blurb: 'Issue sync for teams who plan in cycles.',
    perms: ['linear.issues.read', 'linear.projects.read'] },
];

const MARQUEE_A = ['issues', 'pull requests', 'calendar events', 'messages', 'deadlines', 'channels', 'repositories'];
const MARQUEE_B = ['declare permissions', 'you approve', 'revoke anytime', 'audited runs', 'no silent access'];

const LIFECYCLE = [
  { id: 'installed', title: 'Installed', body: 'The manifest is verified against the registry. Nothing runs yet.' },
  { id: 'enabled', title: 'Enabled', body: 'You granted exact permissions. Every action passes Noska\u2019s permission gate \u2014 the same gate agents use.' },
  { id: 'disabled', title: 'Disabled', body: 'Execution stops instantly. Grants are kept so re-enabling is one click.' },
  { id: 'revoked', title: 'Revoked', body: 'Grants wiped. Tokens destroyed server-side. The run log stays \u2014 accountability outlives access.' },
];

export default function PluginsLanding() {
  const [grants, setGrants] = useState({ read: true, write: false });
  const [installed, setInstalled] = useState(false);
  const [stage, setStage] = useState('enabled');
  const [hot, setHot] = useState(false); // red-shift during hold-to-revoke

  const allGranted = grants.read && grants.write;

  return (
    <div className="pgl-page" data-hot={hot || undefined}>
      <CursorFollower variant="plugins" label="connect" />

      {/* ══ Hero ══ */}
      <section className="pgl-hero">
        <div className="pgl-hero-inner">
          <Reveal><span className="pgl-eyebrow"><Puzzle size={14} /> NOSKA PLUGINS · THE FOUNDRY</span></Reveal>
          <Reveal delay={0.08} blur>
            <h1 className="pgl-title">
              Plug the world<br />
              <em>in.</em>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="pgl-sub">
              External capabilities become native ones. A plugin declares what it wants,
              <strong> you decide what it gets</strong> &mdash; and every action still passes
              the same permission gate as everything else in Noska.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="pgl-hero-ctas">
              <Link to="/docs" className="pgl-btn pgl-btn-solid">Read the docs <ArrowRight size={15} /></Link>
              <a href="#registry" className="pgl-btn pgl-btn-ghost">Browse the registry <ArrowUpRight size={15} /></a>
            </div>
          </Reveal>

          {/* Consent card — you operate it */}
          <Reveal delay={0.3} y={40}>
            <TiltCard className="pgl-consent">
              <div className="pgl-consent-head">
                <span className="pgl-consent-app"><GitBranch size={16} /> GitHub</span>
                <span className="pgl-consent-pub">by noska · v1.0.0 · verified</span>
              </div>
              <p className="pgl-consent-ask">GitHub wants to:</p>
              <div className="pgl-grant-list">
                {[
                  { key: 'read', label: 'Read repositories & issues', perm: 'github.repositories.read' },
                  { key: 'write', label: 'Create issues on your behalf', perm: 'github.issues.write' },
                ].map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    className={`pgl-grant ${grants[g.key] ? 'on' : ''}`}
                    onClick={() => setGrants((s) => ({ ...s, [g.key]: !s[g.key] }))}
                    aria-pressed={grants[g.key]}
                  >
                    <span className="pgl-grant-check">{grants[g.key] ? <Check size={13} /> : null}</span>
                    <span>
                      {g.label}
                      <code>{g.perm}</code>
                    </span>
                  </button>
                ))}
              </div>
              <div className="pgl-consent-foot">
                {!allGranted && (
                  <span className="pgl-consent-note">Grant at least one permission to arm installation.</span>
                )}
                <HoldToConfirm
                  className="pgl-install-btn"
                  label="Hold to install"
                  doneLabel={installed ? 'Installed ✓' : 'Installed'}
                  duration={900}
                  onComplete={() => setInstalled(true)}
                  accent={allGranted ? 'var(--pgl-sage)' : 'var(--pgl-line)'}
                />
              </div>
              <AnimatePresence>
                {installed && (
                  <motion.p
                    className="pgl-consent-done"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    Installed with exactly {Object.values(grants).filter(Boolean).length} grant
                    {Object.values(grants).filter(Boolean).length === 1 ? '' : 's'} — nothing more. That&rsquo;s the whole model.
                  </motion.p>
                )}
              </AnimatePresence>
            </TiltCard>
          </Reveal>
        </div>

        {/* Marquees */}
        <div className="pgl-marquee pgl-marquee-a" aria-hidden>
          <div className="pgl-marquee-track">
            {[...MARQUEE_A, ...MARQUEE_A].map((w, i) => <span key={i}>{w}<i>✦</i></span>)}
          </div>
        </div>
        <div className="pgl-marquee pgl-marquee-b" aria-hidden>
          <div className="pgl-marquee-track pgl-marquee-rev">
            {[...MARQUEE_B, ...MARQUEE_B].map((w, i) => <span key={i}>{w}<i>·</i></span>)}
          </div>
        </div>
      </section>

      {/* ══ Manifest manifesto ══ */}
      <section className="pgl-manifesto">
        <div className="pgl-wrap pgl-split">
          <Reveal blur>
            <h2>
              A plugin is not an<br /><em>MCP server.</em><br />It&rsquo;s a contract.
            </h2>
            <p className="pgl-lede">
              Capabilities, events, commands, automation actions — declared up front,
              versioned like software, enforced like law. If a plugin never asked,
              it never gets.
            </p>
          </Reveal>
          <Stagger className="pgl-principles">
            {[
              { icon: Lock, t: 'No silent access', d: 'Declared ≠ granted. Installation grants exactly the permissions you accepted — defaulting to nothing more than declared.' },
              { icon: ShieldCheck, t: 'Verified registry', d: 'Only manifests with verified status can be installed. Registry writes are service-side, never client-side.' },
              { icon: RotateCcw, t: 'Auditable & revocable', d: 'Every execution writes an auditable plugin_run record. Revocation wipes grants and tokens — the audit trail stays.' },
            ].map((p) => (
              <motion.div key={p.t} className="pgl-principle" variants={staggerItem}>
                <p.icon size={18} strokeWidth={1.8} />
                <div><h3>{p.t}</h3><p>{p.d}</p></div>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ══ Registry bento ══ */}
      <section className="pgl-registry" id="registry">
        <div className="pgl-wrap">
          <Reveal><span className="pgl-kicker">01 — The registry</span></Reveal>
          <Reveal delay={0.06} blur><h2 className="pgl-h2">First-party, by design.</h2></Reveal>
          <Stagger className="pgl-grid">
            {PLUGINS.map((pl) => (
              <motion.article key={pl.id} className={`pgl-card pgl-tint-${pl.tint}`} variants={staggerItem}>
                <header>
                  <span className="pgl-card-icon"><pl.icon size={20} /></span>
                  <span className={`pgl-badge pgl-badge-${pl.state}`}>
                    {pl.state === 'design-partner' ? 'Design partner' : 'Coming soon'}
                  </span>
                </header>
                <h3>{pl.name}</h3>
                <p>{pl.blurb}</p>
                <footer>
                  {pl.perms.map((pm) => <code key={pm}>{pm}</code>)}
                </footer>
              </motion.article>
            ))}
          </Stagger>
          <Reveal>
            <p className="pgl-honesty">
              Only ship what can authenticate safely. That&rsquo;s why some cards say coming&nbsp;soon —
              we don&rsquo;t fake integrations we can&rsquo;t secure yet.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══ Lifecycle ══ */}
      <section className={`pgl-lifecycle ${stage === 'revoked' ? 'is-revoked' : ''}`}>
        <div className="pgl-wrap">
          <Reveal><span className="pgl-kicker">02 — The lifecycle</span></Reveal>
          <Reveal delay={0.06} blur><h2 className="pgl-h2">Access is a dial,<br /><em>not a handshake.</em></h2></Reveal>

          <div className="pgl-stages" role="tablist">
            {LIFECYCLE.map((st) => (
              <button
                key={st.id}
                role="tab"
                aria-selected={stage === st.id}
                className={`pgl-stage ${stage === st.id ? 'active' : ''}`}
                onClick={() => setStage(st.id)}
              >
                {st.title}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={stage}
              className="pgl-stage-body"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
            >
              {LIFECYCLE.find((s) => s.id === stage)?.body}
            </motion.p>
          </AnimatePresence>

          <div className="pgl-revoke-zone">
            <HoldToConfirm
              label="Hold to revoke everything"
              doneLabel="Grants wiped"
              duration={1100}
              accent="#C1694F"
              className="pgl-revoke-btn"
              onComplete={() => { setStage('revoked'); setHot(true); setTimeout(() => setHot(false), 900); }}
            />
            <span className="pgl-revoke-note">
              Consequential actions shouldn&rsquo;t fit inside a mis-click. <b>Hold</b> means certain.
            </span>
          </div>
        </div>
      </section>

      {/* ══ Builders ══ */}
      <section className="pgl-builders">
        <div className="pgl-wrap pgl-split">
          <Reveal blur>
            <h2>Build one.<br /><em>Declare first.</em></h2>
            <p className="pgl-lede">
              A manifest is a few honest lines. Validate it locally, submit to the registry,
              and your capability joins the same permission system everything else obeys.
            </p>
            <Link to="/docs" className="pgl-btn pgl-btn-solid">Manifest spec <ArrowRight size={15} /></Link>
          </Reveal>
          <Reveal delay={0.12}>
            <pre className="pgl-code">{`{
  "id": "github",
  "name": "GitHub",
  "version": "1.0.0",
  "permissions": [
    "github.repositories.read",
    "github.issues.read",
    "github.issues.write"
  ],
  "capabilities": ["issues", "repositories"],
  "events": ["plugin.github.issue.opened"],
  "automationActions": ["task_from_issue"]
}`}</pre>
          </Reveal>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="pgl-cta">
        <Reveal blur>
          <h2>The gate is the product.</h2>
          <p>Agents, automations, plugins — one permission layer. Yours.</p>
          <div className="pgl-hero-ctas center">
            <Link to="/docs/mcp" className="pgl-btn pgl-btn-invert">See MCP <ArrowRight size={15} /></Link>
            <Link to="/api-keys" className="pgl-btn pgl-btn-outline-inv">Developer API</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
