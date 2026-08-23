import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Check, Menu, Zap } from 'lucide-react';
import SEOHead from '../../components/SEOHead';
import { FaqAccordion } from './components/FaqAccordion';
import { WindowsIcon, AppleIcon, LinuxIcon } from './components/PlatformIcons';
import './Download.css';

type OsKey = 'windows' | 'macos' | 'linux';

const APP_VERSION = '1.0.0';
const RELEASES_URL = 'https://github.com/shrikrishna-lab/noska/releases';

const EASE: [number, number, number, number] = [0.05, 0.72, 0.43, 0.98];

const DOWNLOADS: Record<OsKey, {
  name: string;
  file: string;
  size: string;
  requirement: string;
  alts: string[];
}> = {
  windows: {
    name: 'Windows',
    file: 'Noska-Setup.exe',
    size: '~120 MB',
    requirement: 'Windows 10 or later · 64-bit',
    alts: ['MSI installer', 'Portable .zip'],
  },
  macos: {
    name: 'macOS',
    file: 'Noska.dmg',
    size: '~140 MB',
    requirement: 'macOS 10.15 Catalina or later',
    alts: ['Intel build', 'Update archive'],
  },
  linux: {
    name: 'Linux',
    file: 'Noska.AppImage',
    size: '~130 MB',
    requirement: 'Ubuntu 20.04+ · Fedora 36+ · Arch',
    alts: ['.deb package', '.rpm package'],
  },
};

const MAC_ARCHES = [
  { key: 'silicon', label: 'Apple Silicon', hint: 'M1 · M2 · M3 · M4' },
  { key: 'intel', label: 'Intel', hint: 'Intel-based Macs' },
] as const;

const LINUX_FORMATS = [
  { key: 'appimage', label: 'AppImage', hint: 'Runs anywhere — no install' },
  { key: 'deb', label: '.deb', hint: 'Ubuntu · Debian · Mint' },
  { key: 'rpm', label: '.rpm', hint: 'Fedora · RHEL · openSUSE' },
] as const;

const MARQUEE_WORDS = [
  'Windows', 'macOS', 'Linux', 'offline', 'auto-updates', 'noska:// links',
  'native speed', 'one account',
];

const FEATURES = [
  { glyph: '⌁', title: 'Offline-ready', desc: 'Pages and drafts stay usable with no connection. Everything syncs the moment you are back.' },
  { glyph: '⟳', title: 'Signed auto-updates', desc: 'Updates install quietly in the background — cryptographically signed, or they never land.' },
  { glyph: '↗', title: 'noska:// deep links', desc: 'Open any page straight in the app from your browser, email or Slack.' },
  { glyph: '⚡', title: 'Native speed', desc: 'Its own window, global shortcuts, GPU rendering. No tab juggling.' },
];

const STEPS = [
  { title: 'Pick your platform', desc: 'We highlight the right build for your device — Windows, macOS or Linux.' },
  { title: 'Install like any app', desc: 'Run the installer or open the AppImage. Under a minute and it is in your dock.' },
  { title: 'Sign in & go', desc: 'Same account as Noska Web. Workspaces, pages and AI agents appear instantly.' },
];

const FAQS = [
  { q: 'Is the desktop app free?', a: 'Yes — free to download and use on all three platforms, including the Free plan. Paid plans only add team features and higher limits.' },
  { q: 'Does it work exactly like Noska Web?', a: 'It is the same Noska: same editor, same pages, same account. The desktop shell adds offline support, deep links, global shortcuts and native menus on top.' },
  { q: 'How do updates work?', a: 'Noska checks in the background and installs updates automatically. Every update is cryptographically signed — a bad signature never installs.' },
  { q: 'Which macOS build should I get?', a: 'Mac from 2020 or later (any M-series chip) → Apple Silicon. Older Intel Macs → Intel build. Check via Apple menu → About This Mac.' },
  { q: 'What Linux formats are available?', a: 'AppImage runs anywhere without installing. The .deb suits Ubuntu, Debian and Mint; the .rpm suits Fedora, RHEL and openSUSE.' },
];

function detectOs(): OsKey {
  if (typeof navigator === 'undefined') return 'windows';
  const ua = navigator.userAgent;
  if (/Mac|iPhone|iPad/i.test(ua)) return 'macos';
  if (/Linux|X11/i.test(ua) && !/Android/i.test(ua)) return 'linux';
  return 'windows';
}

function OsSticker({ os, size = 30 }: { os: OsKey; size?: number }) {
  if (os === 'macos') return <AppleIcon size={size} />;
  if (os === 'linux') return <LinuxIcon size={size} />;
  return <WindowsIcon size={size} />;
}

export default function Download() {
  const detected = useMemo(detectOs, []);
  const [macArch, setMacArch] = useState<(typeof MAC_ARCHES)[number]['key']>('silicon');
  const [linuxFormat, setLinuxFormat] = useState<(typeof LINUX_FORMATS)[number]['key']>('appimage');

  const detectedDl = DOWNLOADS[detected];

  return (
    <div className="dlp">
      <SEOHead path="/download" />

      {/* ── Sticky mat scene + hero ─────────────────────── */}
      <section className="dlp-scene-wrap">
        <div className="dlp-scene" aria-hidden>
          <div className="dlp-desk" />
          <div className="dlp-mat">
            <span className="dlp-mat-grid" />
            <span className="dlp-mat-ruler top" />
            <span className="dlp-mat-ruler left" />
          </div>
          <div className="dlp-paper">
            <span className="dlp-shadow-leaf leaf-a" />
            <span className="dlp-shadow-leaf leaf-b" />
          </div>

          <span className="dlp-sticker st-win"><WindowsIcon size={34} /></span>
          <span className="dlp-sticker st-mac"><AppleIcon size={34} /></span>
          <span className="dlp-sticker st-linux"><LinuxIcon size={30} /></span>
          <span className="dlp-sticker st-zap"><Zap size={26} /></span>

          <span className="dlp-note n-one">ship it <i>friday</i></span>
          <span className="dlp-note n-two">syncs w/ web ✓</span>
          <span className="dlp-note n-three">no installer bloat</span>
        </div>

        <div className="dlp-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="dlp-hero-paper"
          >
            <p className="dlp-mono-label">
              <span className="dlp-pulse" /> Noska Desktop · v{APP_VERSION}
            </p>
            <h1 className="dlp-display">
              One workspace.
              <br />
              Every desk.
              <br />
              <em className="dlp-script">zero tabs</em>
            </h1>
            <p className="dlp-hero-sub">
              The full Noska — pages, tasks, AI agents — installed native on
              Windows, macOS and Linux. Same account as the web.
            </p>
          </motion.div>

          <motion.a
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
            href="#get"
            className="dlp-scroll-pill"
          >
            <span className="dlp-pulse dark" /> Scroll
          </motion.a>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.25 }}
          className="dlp-dock"
        >
          <span className="dlp-dock-logo">
            <img src="/logo.png?v=2" alt="" />
          </span>
          <a href="#get" className="dlp-dock-cta">
            Download Noska — free
          </a>
          <Link to="/login" className="dlp-dock-web" aria-label="Open web app">
            <Menu size={16} />
          </Link>
        </motion.div>
      </section>

      {/* ── Giant overflow words ────────────────────────── */}
      <section className="dlp-giant">
        <div className="dlp-marquee" aria-hidden>
          <div className="dlp-marquee-track">
            {[0, 1].map((copy) => (
              <div className="dlp-marquee-group" key={copy}>
                {MARQUEE_WORDS.map((w, i) => (
                  <span key={`${copy}-${i}`} className={i % 2 ? 'alt' : ''}>
                    {w}<i>·</i>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Download cards ──────────────────────────────── */}
      <section className="dlp-get" id="get">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: EASE }}
          className="dlp-get-head"
        >
          <p className="dlp-mono-label center">Pick your poison</p>
          <h2 className="dlp-h2">
            Download for <em className="dlp-script green">your machine</em>
          </h2>
        </motion.div>

        <div className="dlp-cards">
          {/* Windows */}
          <motion.article
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.9, ease: EASE }}
            className={`dlp-card ${detected === 'windows' ? 'is-yours' : ''}`}
          >
            {detected === 'windows' && <span className="dlp-yours">your device</span>}
            <header>
              <span className="dlp-card-glyph"><WindowsIcon size={30} /></span>
              <div>
                <h3>Windows</h3>
                <p>{DOWNLOADS.windows.requirement}</p>
              </div>
            </header>
            <a href="#" className="dlp-pill-btn" onClick={(e) => e.preventDefault()}>
              <OsSticker os="windows" size={16} />
              Download {DOWNLOADS.windows.file}
            </a>
            <ul className="dlp-meta">
              <li><span>Version</span><strong>v{APP_VERSION}</strong></li>
              <li><span>Size</span><strong>{DOWNLOADS.windows.size}</strong></li>
              <li><span>Arch</span><strong>x64</strong></li>
            </ul>
            <div className="dlp-alts">
              {DOWNLOADS.windows.alts.map((a) => (
                <a key={a} href="#" onClick={(e) => e.preventDefault()}>{a}</a>
              ))}
            </div>
          </motion.article>

          {/* macOS */}
          <motion.article
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.08 }}
            className={`dlp-card ${detected === 'macos' ? 'is-yours' : ''}`}
          >
            {detected === 'macos' && <span className="dlp-yours">your device</span>}
            <header>
              <span className="dlp-card-glyph mac"><AppleIcon size={30} /></span>
              <div>
                <h3>macOS</h3>
                <p>{DOWNLOADS.macos.requirement}</p>
              </div>
            </header>

            <div className="dlp-seg" role="tablist" aria-label="Mac chip">
              {MAC_ARCHES.map((a) => (
                <button
                  key={a.key}
                  role="tab"
                  aria-selected={macArch === a.key}
                  className={macArch === a.key ? 'on' : ''}
                  onClick={() => setMacArch(a.key)}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <p className="dlp-seg-hint">{MAC_ARCHES.find((a) => a.key === macArch)?.hint}</p>

            <a href="#" className="dlp-pill-btn dark" onClick={(e) => e.preventDefault()}>
              <OsSticker os="macos" size={16} />
              Download {DOWNLOADS.macos.file}
            </a>
            <ul className="dlp-meta">
              <li><span>Version</span><strong>v{APP_VERSION}</strong></li>
              <li><span>Size</span><strong>{DOWNLOADS.macos.size}</strong></li>
              <li><span>Chip</span><strong>{macArch === 'silicon' ? 'Apple Silicon' : 'Intel x64'}</strong></li>
            </ul>
          </motion.article>

          {/* Linux */}
          <motion.article
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.16 }}
            className={`dlp-card ${detected === 'linux' ? 'is-yours' : ''}`}
          >
            {detected === 'linux' && <span className="dlp-yours">your device</span>}
            <header>
              <span className="dlp-card-glyph linux"><LinuxIcon size={28} /></span>
              <div>
                <h3>Linux</h3>
                <p>{DOWNLOADS.linux.requirement}</p>
              </div>
            </header>

            <div className="dlp-seg" role="tablist" aria-label="Package format">
              {LINUX_FORMATS.map((f) => (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={linuxFormat === f.key}
                  className={linuxFormat === f.key ? 'on' : ''}
                  onClick={() => setLinuxFormat(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="dlp-seg-hint">{LINUX_FORMATS.find((f) => f.key === linuxFormat)?.hint}</p>

            <a href="#" className="dlp-pill-btn" onClick={(e) => e.preventDefault()}>
              <OsSticker os="linux" size={16} />
              {linuxFormat === 'appimage' && 'Download AppImage'}
              {linuxFormat === 'deb' && 'Download .deb'}
              {linuxFormat === 'rpm' && 'Download .rpm'}
            </a>
            <ul className="dlp-meta">
              <li><span>Version</span><strong>v{APP_VERSION}</strong></li>
              <li><span>Size</span><strong>{DOWNLOADS.linux.size}</strong></li>
              <li><span>Arch</span><strong>x86_64</strong></li>
            </ul>
            <div className="dlp-alts">
              <a href={RELEASES_URL} target="_blank" rel="noreferrer">
                SHA-256 checksums <ArrowUpRight size={11} />
              </a>
            </div>
          </motion.article>
        </div>

        <p className="dlp-all-releases">
          Betas and older builds live on{' '}
          <a href={RELEASES_URL} target="_blank" rel="noreferrer">GitHub Releases <ArrowUpRight size={12} /></a>
        </p>
      </section>

      {/* ── Why desktop ─────────────────────────────────── */}
      <section className="dlp-why">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: EASE }}
          className="dlp-get-head"
        >
          <p className="dlp-mono-label center">Why bother installing</p>
          <h2 className="dlp-h2">
            The web is great. <em className="dlp-script green">this is better</em>
          </h2>
        </motion.div>

        <div className="dlp-features">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.8, ease: EASE, delay: i * 0.07 }}
              className="dlp-feature"
            >
              <span className="dlp-feature-glyph">{f.glyph}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Steps ───────────────────────────────────────── */}
      <section className="dlp-steps-sec">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: EASE }}
          className="dlp-get-head"
        >
          <p className="dlp-mono-label center">Three steps</p>
          <h2 className="dlp-h2">Up and running <em className="dlp-script green">in a minute</em></h2>
        </motion.div>

        <ol className="dlp-steps">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.8, ease: EASE, delay: i * 0.09 }}
            >
              <span className="dlp-step-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
              {i < STEPS.length - 1 && <span className="dlp-step-dash" aria-hidden />}
            </motion.li>
          ))}
        </ol>
      </section>

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section className="dlp-faq-sec">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: EASE }}
          className="dlp-get-head"
        >
          <p className="dlp-mono-label center">Good questions</p>
          <h2 className="dlp-h2">Before you <em className="dlp-script green">ask</em></h2>
        </motion.div>
        <FaqAccordion items={FAQS} className="dlp-faq" defaultOpenIndex={0} />
      </section>

      {/* ── Bottom CTA ──────────────────────────────────── */}
      <section className="dlp-final">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: EASE }}
          className="dlp-final-inner"
        >
          <h2 className="dlp-display small">
            No time to install?
            <br />
            <em className="dlp-script">just open the web</em>
          </h2>
          <Link to="/login" className="dlp-pill-btn big light">
            Open Noska Web <ArrowUpRight size={16} />
          </Link>
          <p className="dlp-final-note">
            <Check size={13} /> Desktop and web stay in sync in real time
          </p>
        </motion.div>
      </section>
    </div>
  );
}
