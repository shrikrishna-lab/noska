import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, useInView,
} from 'framer-motion';
import { ArrowUpRight, Check, Menu, Zap } from 'lucide-react';
import SEOHead from '../../components/SEOHead';
import { FaqAccordion } from './components/FaqAccordion';
import { WindowsIcon, AppleIcon, LinuxIcon } from './components/PlatformIcons';
import './Download.css';

type OsKey = 'windows' | 'macos' | 'linux';

const FALLBACK_VERSION = '1.0.0';
const RELEASES_URL = 'https://github.com/shrikrishna-lab/noska-desktop-releases/releases';
const LATEST_MANIFEST = 'https://github.com/shrikrishna-lab/noska-desktop-releases/releases/latest/download/latest.json';
const GH_RELEASE_API = 'https://api.github.com/repos/shrikrishna-lab/noska-desktop-releases/releases/latest';

interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

/** Fetches real installer assets (name, bytes, URL) from the latest GitHub release. */
function useReleaseAssets(onVersion?: (v: string) => void): ReleaseAsset[] | null {
  const [assets, setAssets] = useState<ReleaseAsset[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(GH_RELEASE_API, { headers: { accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        if (Array.isArray(d?.assets)) setAssets(d.assets as ReleaseAsset[]);
        const v = d?.tag_name ? String(d.tag_name).replace(/^desktop-v|^v/, '') : null;
        if (v && typeof onVersion === 'function') onVersion(v);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return assets;
}

function pickAsset(
  assets: ReleaseAsset[] | null,
  match: (name: string) => boolean,
): ReleaseAsset | null {
  if (!assets) return null;
  return assets.find((a) => match(a.name.toLowerCase())) ?? null;
}

function fmtSize(bytes?: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const EASE: [number, number, number, number] = [0.05, 0.72, 0.43, 0.98];

const OS_META: Record<OsKey, {
  name: string;
  file: string;
  size: string;
  requirement: string;
  alts: string[];
}> = {
  windows: {
    name: 'Windows', file: 'Noska-Setup.exe', size: '~35 MB',
    requirement: 'Windows 10 or later · 64-bit',
    alts: ['MSI installer', 'Portable .zip'],
  },
  macos: {
    name: 'macOS', file: 'Noska.dmg', size: '~30 MB',
    requirement: 'macOS 10.15 Catalina or later',
    alts: ['Intel build', 'Update archive'],
  },
  linux: {
    name: 'Linux', file: 'Noska.AppImage', size: '~33 MB',
    requirement: 'Ubuntu 20.04+ · Fedora 36+ · Arch',
    alts: ['.deb package', '.rpm package'],
  },
};

const WINDOWS_FORMATS = [
  { key: 'exe', label: 'Setup .exe', hint: 'Windows 10, 11 (64-bit) — recommended', file: 'Noska-Setup.exe', size: '~120 MB' },
  { key: 'msi', label: 'MSI', hint: 'Enterprise & IT MSI installer', file: 'Noska-Setup.msi', size: '~125 MB' },
  { key: 'zip', label: 'Portable', hint: 'Portable archive — no installation', file: 'Noska-win-x64.zip', size: '~115 MB' },
] as const;

const MAC_ARCHES = [
  { key: 'silicon', label: 'Apple Silicon', hint: 'M1 · M2 · M3 · M4' },
  { key: 'intel', label: 'Intel', hint: 'Intel-based Macs' },
] as const;

const LINUX_FORMATS = [
  { key: 'appimage', label: 'AppImage', hint: 'Runs anywhere — no install', file: 'Noska.AppImage' },
  { key: 'deb', label: '.deb', hint: 'Ubuntu · Debian · Mint', file: 'noska.deb' },
  { key: 'rpm', label: '.rpm', hint: 'Fedora · RHEL · openSUSE', file: 'noska.rpm' },
] as const;

const MARQUEE_WORDS = [
  'Windows', 'macOS', 'Linux', 'offline', 'auto-updates', 'noska:// links', 'native speed', 'one account',
];

const FORMAT_WORDS = ['.exe', '.msi', '.dmg', '.AppImage', '.deb', '.rpm', 'SHA-256 signed', 'auto-update'];

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

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1100;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref}>{n}{suffix}</span>;
}

function GlowCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <div ref={ref} className={className} onMouseMove={onMouseMove}>
      {children}
    </div>
  );
}

export default function Download() {
  const detected = useMemo(detectOs, []);
  const [heroOs, setHeroOs] = useState<OsKey>(detected);
  const [winFormat, setWinFormat] = useState<(typeof WINDOWS_FORMATS)[number]['key']>('exe');
  const [macArch, setMacArch] = useState<(typeof MAC_ARCHES)[number]['key']>('silicon');
  const [linuxFormat, setLinuxFormat] = useState<(typeof LINUX_FORMATS)[number]['key']>('appimage');
  const [version, setVersion] = useState(FALLBACK_VERSION);
  const setVersionCb = useCallback((v: string) => setVersion(v), []);
  const assets = useReleaseAssets(setVersionCb);
  const [pendingNote, setPendingNote] = useState<OsKey | null>(null);

  // Real installer assets from the latest GitHub release (fall back to
  // placeholders while the first release is not published yet).
  const winExeAsset = pickAsset(assets, (n) => n.endsWith('x64-setup.exe'));
  const winMsiAsset = pickAsset(assets, (n) => n.endsWith('.msi'));
  const macArmAsset = pickAsset(assets, (n) => n.endsWith('aarch64.dmg'));
  const macIntelAsset = pickAsset(assets, (n) => n.endsWith('x64.dmg') && !n.includes('aarch64'));
  const appImageAsset = pickAsset(assets, (n) => n.endsWith('.appimage'));
  const debAsset = pickAsset(assets, (n) => n.endsWith('_amd64.deb'));
  const rpmAsset = pickAsset(assets, (n) => n.endsWith('_x86_64.rpm'));

  const macAsset = macArch === 'silicon' ? macArmAsset : macIntelAsset;
  const linuxAsset =
    linuxFormat === 'deb' ? debAsset : linuxFormat === 'rpm' ? rpmAsset : appImageAsset;

  const sceneRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ['start start', 'end start'] });
  const paperY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const matY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const sceneOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.25]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const stickerX = useTransform(sx, [-1, 1], [-14, 14]);
  const stickerY = useTransform(sy, [-1, 1], [-10, 10]);
  const paperTiltX = useTransform(sy, [-1, 1], [1.4, -1.4]);
  const paperTiltY = useTransform(sx, [-1, 1], [-2, 2]);

  useEffect(() => {
    let alive = true;
    fetch(LATEST_MANIFEST, { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.version && typeof data.version === 'string') setVersion(data.version);
      })
      .catch(() => { });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [mx, my]);

  useEffect(() => {
    if (!pendingNote) return;
    const t = setTimeout(() => setPendingNote(null), 2600);
    return () => clearTimeout(t);
  }, [pendingNote]);

  const heroDl = OS_META[heroOs];
  const winPick = WINDOWS_FORMATS.find((f) => f.key === winFormat) ?? WINDOWS_FORMATS[0];
  const linuxPick = LINUX_FORMATS.find((f) => f.key === linuxFormat) ?? LINUX_FORMATS[0];

  const placeholderClick = (os: OsKey) => (e: React.MouseEvent) => {
    e.preventDefault();
    setPendingNote(os);
  };

  return (
    <div className="dlp">
      <SEOHead path="/download" />
      <motion.div className="dlp-progress" style={{ scaleX: scrollYProgress }} aria-hidden />

      {/* ── Sticky mat scene + hero ─────────────────────── */}
      <section className="dlp-scene-wrap" ref={sceneRef}>
        <motion.div className="dlp-scene" style={{ opacity: sceneOpacity }} aria-hidden>
          <div className="dlp-desk" />
          <motion.div className="dlp-mat" style={{ y: matY }}>
            <span className="dlp-mat-grid" />
            <span className="dlp-mat-ruler top" />
            <span className="dlp-mat-ruler left" />
          </motion.div>

          <div className="dlp-sticker st-win">
            <motion.span className="dlp-stick-in" style={{ x: stickerY, y: stickerX }}>
              <WindowsIcon size={34} />
            </motion.span>
          </div>
          <div className="dlp-sticker st-mac">
            <motion.span className="dlp-stick-in" style={{ x: stickerX, y: stickerY }}>
              <AppleIcon size={34} />
            </motion.span>
          </div>
          <div className="dlp-sticker st-linux">
            <motion.span className="dlp-stick-in" style={{ x: stickerY, y: stickerX }}>
              <LinuxIcon size={30} />
            </motion.span>
          </div>
          <div className="dlp-sticker st-zap">
            <motion.span className="dlp-stick-in" style={{ x: stickerX, y: stickerY }}>
              <Zap size={26} />
            </motion.span>
          </div>
        </motion.div>

        <motion.div
          className="dlp-hero-content dlp-paper"
          style={{ y: paperY, rotateX: paperTiltX, rotateY: paperTiltY }}
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <span className="dlp-shadow-leaf leaf-a" />
          <span className="dlp-shadow-leaf leaf-b" />
          <span className="dlp-note n-one">ship it <i>everywhere</i></span>
          <span className="dlp-note n-two">syncs w/ web ✓</span>

          <div className="dlp-hero-paper">
            <p className="dlp-mono-label">
              <span className="dlp-pulse" /> Noska Desktop · v{version}
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
          </div>

          <div className="dlp-hero-switcher">
            <div className="dlp-seg hero-seg" role="tablist" aria-label="Choose platform">
              {(Object.keys(OS_META) as OsKey[]).map((os) => (
                <button
                  key={os}
                  role="tab"
                  aria-selected={heroOs === os}
                  className={heroOs === os ? 'on' : ''}
                  onClick={() => setHeroOs(os)}
                >
                  <OsSticker os={os} size={14} />
                  {OS_META[os].name}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.a
                key={heroOs}
                href="#get"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="dlp-pill-btn big hero-cta"
              >
                <OsSticker os={heroOs} size={16} />
                {heroDl.name === 'Linux' ? `Download ${linuxPick.file}` : `Download ${heroDl.file}`}
                <span className="dlp-cta-size">
                  {fmtSize(
                    (heroOs === 'windows' ? winExeAsset : heroOs === 'macos' ? macAsset : linuxAsset)?.size,
                  ) ?? heroDl.size}
                </span>
              </motion.a>
            </AnimatePresence>

            <p className="dlp-hero-req">{heroDl.requirement}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
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

      {/* ── Giant marquee + formats strip ───────────────── */}
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
        <div className="dlp-marquee mono reverse" aria-hidden>
          <div className="dlp-marquee-track">
            {[0, 1].map((copy) => (
              <div className="dlp-marquee-group mono" key={copy}>
                {FORMAT_WORDS.map((w, i) => (
                  <span key={`${copy}-${i}`}>{w}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────── */}
      <section className="dlp-stats">
        <div className="dlp-stats-row">
          <div className="dlp-stat"><strong><CountUp to={3} /></strong><span>platforms</span></div>
          <div className="dlp-stat"><strong><CountUp to={6} /></strong><span>package formats</span></div>
          <div className="dlp-stat"><strong>&lt;<CountUp to={60} />s</strong><span>to first page</span></div>
          <div className="dlp-stat"><strong><CountUp to={100} />%</strong><span>same account as web</span></div>
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
          <GlowCard className={`dlp-card ${detected === 'windows' ? 'is-yours' : ''}`}>
            {detected === 'windows' && <span className="dlp-yours">your device</span>}
            <header>
              <span className="dlp-card-glyph"><WindowsIcon size={30} /></span>
              <div>
                <h3>Windows</h3>
                <p>{OS_META.windows.requirement}</p>
              </div>
            </header>

            <div className="dlp-seg" role="tablist" aria-label="Windows package format">
              {WINDOWS_FORMATS.map((f) => (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={winFormat === f.key}
                  className={winFormat === f.key ? 'on' : ''}
                  onClick={() => setWinFormat(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="dlp-seg-hint">{winPick.hint}</p>

            <a
              href={winFormat === 'msi' ? (winMsiAsset?.browser_download_url ?? '#') : (winExeAsset?.browser_download_url ?? '#')}
              className="dlp-pill-btn"
              onClick={winExeAsset || winMsiAsset ? undefined : placeholderClick('windows')}
            >
              <OsSticker os="windows" size={16} />
              Download {winPick.file}
              {fmtSize((winFormat === 'msi' ? winMsiAsset : winExeAsset)?.size) && (
                <span className="dlp-cta-size">{fmtSize((winFormat === 'msi' ? winMsiAsset : winExeAsset)?.size)}</span>
              )}
            </a>
            <AnimatePresence>
              {pendingNote === 'windows' && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="dlp-pending-note"
                >
                  Direct links land with v{version} — <a href={RELEASES_URL} target="_blank" rel="noreferrer">GitHub Releases</a> meanwhile.
                </motion.p>
              )}
            </AnimatePresence>
            <ul className="dlp-meta">
              <li><span>Version</span><strong>v{version}</strong></li>
              <li><span>Size</span><strong>{fmtSize((winFormat === 'msi' ? winMsiAsset : winExeAsset)?.size) ?? winPick.size}</strong></li>
              <li><span>Arch</span><strong>x64</strong></li>
            </ul>
            <div className="dlp-alts">
              {WINDOWS_FORMATS.filter((f) => f.key !== winFormat).map((f) => (
                <a key={f.key} href="#" onClick={(e) => { e.preventDefault(); setWinFormat(f.key); }}>
                  {f.label} {f.key === 'zip' ? '.zip' : 'installer'}
                </a>
              ))}
            </div>
          </GlowCard>

          <GlowCard className={`dlp-card ${detected === 'macos' ? 'is-yours' : ''}`}>
            {detected === 'macos' && <span className="dlp-yours">your device</span>}
            <header>
              <span className="dlp-card-glyph mac"><AppleIcon size={30} /></span>
              <div>
                <h3>macOS</h3>
                <p>{OS_META.macos.requirement}</p>
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

            <a
              href={macAsset?.browser_download_url ?? '#'}
              className="dlp-pill-btn dark"
              onClick={macAsset ? undefined : placeholderClick('macos')}
            >
              <OsSticker os="macos" size={16} />
              Download {OS_META.macos.file}
              {fmtSize(macAsset?.size) && <span className="dlp-cta-size">{fmtSize(macAsset?.size)}</span>}
            </a>
            <AnimatePresence>
              {pendingNote === 'macos' && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="dlp-pending-note"
                >
                  Direct links land with v{version} — <a href={RELEASES_URL} target="_blank" rel="noreferrer">GitHub Releases</a> meanwhile.
                </motion.p>
              )}
            </AnimatePresence>
            <ul className="dlp-meta">
              <li><span>Version</span><strong>v{version}</strong></li>
              <li><span>Size</span><strong>{fmtSize(macAsset?.size) ?? OS_META.macos.size}</strong></li>
              <li><span>Chip</span><strong>{macArch === 'silicon' ? 'Apple Silicon' : 'Intel x64'}</strong></li>
            </ul>
          </GlowCard>

          <GlowCard className={`dlp-card ${detected === 'linux' ? 'is-yours' : ''}`}>
            {detected === 'linux' && <span className="dlp-yours">your device</span>}
            <header>
              <span className="dlp-card-glyph linux"><LinuxIcon size={28} /></span>
              <div>
                <h3>Linux</h3>
                <p>{OS_META.linux.requirement}</p>
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
            <p className="dlp-seg-hint">{linuxPick.hint}</p>

            <a
              href={linuxAsset?.browser_download_url ?? '#'}
              className="dlp-pill-btn"
              onClick={linuxAsset ? undefined : placeholderClick('linux')}
            >
              <OsSticker os="linux" size={16} />
              Download {linuxPick.file}
              {fmtSize(linuxAsset?.size) && <span className="dlp-cta-size">{fmtSize(linuxAsset?.size)}</span>}
            </a>
            <AnimatePresence>
              {pendingNote === 'linux' && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="dlp-pending-note"
                >
                  Direct links land with v{version} — <a href={RELEASES_URL} target="_blank" rel="noreferrer">GitHub Releases</a> meanwhile.
                </motion.p>
              )}
            </AnimatePresence>
            <ul className="dlp-meta">
              <li><span>Version</span><strong>v{version}</strong></li>
              <li><span>Size</span><strong>{fmtSize(linuxAsset?.size) ?? OS_META.linux.size}</strong></li>
              <li><span>Arch</span><strong>x86_64</strong></li>
            </ul>
            <div className="dlp-alts">
              <a href={RELEASES_URL} target="_blank" rel="noreferrer">
                SHA-256 checksums <ArrowUpRight size={11} />
              </a>
            </div>
          </GlowCard>
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

      {/* ── Final CTA ───────────────────────────────────── */}
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
