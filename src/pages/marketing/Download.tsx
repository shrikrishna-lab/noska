import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, useInView,
} from 'framer-motion';
import { ArrowUpRight, Bell, Check, Menu, Smartphone, Zap } from 'lucide-react';
import SEOHead from '../../components/SEOHead';
import { FaqAccordion } from './components/FaqAccordion';
import { WindowsIcon, AppleIcon, LinuxIcon } from './components/PlatformIcons';
import packageJson from '../../../package.json';
import './Download.css';

type OsKey = 'windows' | 'macos' | 'linux';

const CURRENT_VERSION = packageJson.version || '1.0.11';
const RELEASES_URL = 'https://github.com/shrikrishna-lab/noska-desktop-releases/releases';
const LATEST_MANIFEST = 'https://github.com/shrikrishna-lab/noska-desktop-releases/releases/latest/download/latest.json';
const GH_RELEASE_API = 'https://api.github.com/repos/shrikrishna-lab/noska-desktop-releases/releases/latest';

interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

function fmtSize(bytes?: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDirectReleaseUrl(filename: string, v: string): string {
  return `https://github.com/shrikrishna-lab/noska-desktop-releases/releases/download/desktop-v${v}/${filename}`;
}

function pickAsset(
  assets: ReleaseAsset[] | null,
  match: (name: string) => boolean,
): ReleaseAsset | null {
  if (!assets || assets.length === 0) return null;
  return assets.find((a) => match(a.name.toLowerCase())) ?? null;
}

/** Fetches real installer assets (name, bytes, URL) from GitHub release and latest.json */
function useReleaseAssets(onVersion?: (v: string) => void): {
  assets: ReleaseAsset[] | null;
  version: string;
  manifestUrls: Record<string, string>;
} {
  const [assets, setAssets] = useState<ReleaseAsset[] | null>(null);
  const [version, setVersion] = useState<string>(CURRENT_VERSION);
  const [manifestUrls, setManifestUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;

    // 1. Direct GitHub latest.json manifest check (zero rate-limits, instant live version & URLs)
    fetch(LATEST_MANIFEST, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        if (data.version && typeof data.version === 'string') {
          const v = data.version.replace(/^desktop-v|^v/, '').trim();
          setVersion(v);
          onVersion?.(v);
        }
        if (data.platforms && typeof data.platforms === 'object') {
          const urls: Record<string, string> = {};
          Object.entries(data.platforms).forEach(([key, val]: [string, any]) => {
            if (val?.url) urls[key] = val.url;
          });
          setManifestUrls(urls);
        }
      })
      .catch(() => {});

    // 2. GitHub REST API for full asset list with byte sizes
    fetch(GH_RELEASE_API, {
      headers: { accept: 'application/vnd.github+json' },
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        if (Array.isArray(d.assets)) {
          setAssets(d.assets as ReleaseAsset[]);
        }
        const v = d.tag_name ? String(d.tag_name).replace(/^desktop-v|^v/, '').trim() : null;
        if (v) {
          setVersion(v);
          onVersion?.(v);
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [onVersion]);

  return { assets, version, manifestUrls };
}

const EASE: [number, number, number, number] = [0.05, 0.72, 0.43, 0.98];

const OS_META: Record<OsKey, {
  name: string;
  requirement: string;
}> = {
  windows: {
    name: 'Windows',
    requirement: 'Windows 10, 11 · 64-bit',
  },
  macos: {
    name: 'macOS',
    requirement: 'macOS 10.15 Catalina or later',
  },
  linux: {
    name: 'Linux',
    requirement: 'Ubuntu 20.04+ · Debian · Fedora · Arch',
  },
};

const WINDOWS_FORMATS = [
  { key: 'exe', label: 'Setup .exe', hint: 'Windows 10, 11 (64-bit) — recommended', defaultFile: 'Noska_{v}_x64-setup.exe', fallbackSize: '11.0 MB' },
  { key: 'msi', label: 'MSI', hint: 'Enterprise & IT MSI installer', defaultFile: 'Noska_{v}_x64_en-US.msi', fallbackSize: '11.9 MB' },
] as const;

const MAC_ARCHES = [
  { key: 'universal', label: 'Universal DMG', hint: 'Apple Silicon (M1·M2·M3·M4) & Intel Macs' },
  { key: 'archive', label: 'Update Archive', hint: 'Direct portable app archive (.tar.gz)' },
] as const;

const LINUX_FORMATS = [
  { key: 'appimage', label: 'AppImage', hint: 'Runs anywhere — no install', defaultFile: 'Noska_{v}_amd64.AppImage', fallbackSize: '84.2 MB' },
  { key: 'deb', label: '.deb', hint: 'Ubuntu · Debian · Mint', defaultFile: 'Noska_{v}_amd64.deb', fallbackSize: '12.5 MB' },
  { key: 'rpm', label: '.rpm', hint: 'Fedora · RHEL · openSUSE', defaultFile: 'Noska-{v}-1.x86_64.rpm', fallbackSize: '12.5 MB' },
] as const;

const MARQUEE_WORDS = [
  'Windows', 'macOS', 'Linux', 'iOS', 'Android', 'offline', 'auto-updates', 'noska:// links', 'native speed', 'one account',
];

const FORMAT_WORDS = ['.exe', '.msi', '.dmg', '.apk', '.AppImage', '.deb', '.rpm', 'TestFlight', 'SHA-256 signed', 'auto-update'];

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
  { q: 'Is there a mobile app?', a: 'Yes — Noska for iOS and Android is in final beta with the same workspace, editor and AI as the desktop app. Drop your email in the mobile section above and you will get the TestFlight or beta APK link the moment it is your turn.' },
  { q: 'Does it work exactly like Noska Web?', a: 'It is the same Noska: same editor, same pages, same account. The desktop shell adds offline support, deep links, global shortcuts and native menus on top.' },
  { q: 'How do updates work?', a: 'Noska checks in the background and installs updates automatically. Every update is cryptographically signed — a bad signature never installs.' },
  { q: 'Which macOS build should I get?', a: 'The macOS download is a Universal build that runs natively on both Apple Silicon (M1/M2/M3/M4) and Intel Macs.' },
  { q: 'What Linux formats are available?', a: 'AppImage runs anywhere without installing. The .deb suits Ubuntu, Debian and Mint; the .rpm suits Fedora, RHEL and openSUSE.' },
];

function detectOs(): OsKey {
  if (typeof navigator === 'undefined') return 'windows';
  const ua = navigator.userAgent;
  if (/Mac|iPhone|iPad/i.test(ua)) return 'macos';
  if (/Linux|X11/i.test(ua) && !/Android/i.test(ua)) return 'linux';
  return 'windows';
}

type MobileOsKey = 'ios' | 'android';

/** Detects an actual phone/tablet for the mobile section ("your device").
 *  Desktop-class UAs (including iPad-as-Mac) resolve via maxTouchPoints. */
function detectMobileOs(): MobileOsKey | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return null;
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
  const [macArch, setMacArch] = useState<(typeof MAC_ARCHES)[number]['key']>('universal');
  const [linuxFormat, setLinuxFormat] = useState<(typeof LINUX_FORMATS)[number]['key']>('appimage');
  const [liveVersion, setLiveVersion] = useState<string>(CURRENT_VERSION);
  const mobileOs = useMemo(detectMobileOs, []);

  // "Notify me" — reuses the public waitlist-signup edge function so mobile
  // interest lands in the same list the launch funnel uses.
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyState, setNotifyState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [notifyError, setNotifyError] = useState('');

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = notifyEmail.trim().toLowerCase();
    if (!email) return;
    setNotifyState('sending');
    setNotifyError('');
    try {
      const BASE = import.meta.env.VITE_SUPABASE_URL;
      const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${BASE}/functions/v1/waitlist-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // "Already registered" still counts as success for a notify box.
        if ((err as { error?: string }).error?.toLowerCase().includes('already')) {
          setNotifyState('done');
          return;
        }
        setNotifyError((err as { error?: string }).error || `HTTP ${res.status}`);
        setNotifyState('error');
        return;
      }
      setNotifyState('done');
    } catch (err) {
      setNotifyError(err instanceof Error ? err.message : 'Something went wrong');
      setNotifyState('error');
    }
  };

  const handleVersion = useCallback((v: string) => setLiveVersion(v), []);
  const { assets, version, manifestUrls } = useReleaseAssets(handleVersion);
  const v = liveVersion || version || CURRENT_VERSION;

  // Real installer assets from GitHub Releases (with fallback generation to ensure downloads ALWAYS work)
  const winExeAsset = pickAsset(assets, (n) => n.endsWith('.exe') && !n.endsWith('.sig'));
  const winMsiAsset = pickAsset(assets, (n) => n.endsWith('.msi') && !n.endsWith('.sig'));
  const macDmgAsset = pickAsset(assets, (n) => n.endsWith('.dmg') && !n.endsWith('.sig'));
  const macTarAsset = pickAsset(assets, (n) => (n.endsWith('.tar.gz') || n.endsWith('.app.tar.gz')) && !n.endsWith('.sig'));
  const appImageAsset = pickAsset(assets, (n) => n.endsWith('.appimage') && !n.endsWith('.sig'));
  const debAsset = pickAsset(assets, (n) => n.endsWith('.deb') && !n.endsWith('.sig'));
  const rpmAsset = pickAsset(assets, (n) => n.endsWith('.rpm') && !n.endsWith('.sig'));

  // Windows selected format details
  const winPick = WINDOWS_FORMATS.find((f) => f.key === winFormat) ?? WINDOWS_FORMATS[0];
  const winPickAsset = winFormat === 'msi' ? winMsiAsset : winExeAsset;
  const winFileName = winPickAsset?.name ?? (winFormat === 'msi' ? `Noska_${v}_x64_en-US.msi` : `Noska_${v}_x64-setup.exe`);
  const winFileSize = fmtSize(winPickAsset?.size) ?? (winFormat === 'msi' ? '11.9 MB' : '11.0 MB');
  const winDownloadUrl =
    winPickAsset?.browser_download_url ??
    (winFormat === 'msi'
      ? manifestUrls['windows-x86_64-msi'] ?? getDirectReleaseUrl(`Noska_${v}_x64_en-US.msi`, v)
      : manifestUrls['windows-x86_64-nsis'] ?? getDirectReleaseUrl(`Noska_${v}_x64-setup.exe`, v));

  // macOS selected format details
  const macPickAsset = macArch === 'archive' ? macTarAsset : macDmgAsset;
  const macFileName = macPickAsset?.name ?? (macArch === 'archive' ? `Noska_universal.app.tar.gz` : `Noska_${v}_universal.dmg`);
  const macFileSize = fmtSize(macPickAsset?.size) ?? (macArch === 'archive' ? '23.9 MB' : '24.1 MB');
  const macDownloadUrl =
    macPickAsset?.browser_download_url ??
    (macArch === 'archive'
      ? manifestUrls['darwin-aarch64'] ?? getDirectReleaseUrl(`Noska_universal.app.tar.gz`, v)
      : getDirectReleaseUrl(`Noska_${v}_universal.dmg`, v));

  // Linux selected format details
  const linuxPick = LINUX_FORMATS.find((f) => f.key === linuxFormat) ?? LINUX_FORMATS[0];
  const linuxPickAsset = linuxFormat === 'deb' ? debAsset : linuxFormat === 'rpm' ? rpmAsset : appImageAsset;
  const linuxFileName =
    linuxPickAsset?.name ??
    (linuxFormat === 'deb'
      ? `Noska_${v}_amd64.deb`
      : linuxFormat === 'rpm'
      ? `Noska-${v}-1.x86_64.rpm`
      : `Noska_${v}_amd64.AppImage`);
  const linuxFileSize =
    fmtSize(linuxPickAsset?.size) ??
    (linuxFormat === 'deb' ? '12.5 MB' : linuxFormat === 'rpm' ? '12.5 MB' : '84.2 MB');
  const linuxDownloadUrl =
    linuxPickAsset?.browser_download_url ??
    (linuxFormat === 'deb'
      ? manifestUrls['linux-x86_64-deb'] ?? getDirectReleaseUrl(`Noska_${v}_amd64.deb`, v)
      : linuxFormat === 'rpm'
      ? manifestUrls['linux-x86_64-rpm'] ?? getDirectReleaseUrl(`Noska-${v}-1.x86_64.rpm`, v)
      : manifestUrls['linux-x86_64-appimage'] ?? getDirectReleaseUrl(`Noska_${v}_amd64.AppImage`, v));

  // Hero selected OS download info
  const heroDownloadInfo = useMemo(() => {
    if (heroOs === 'windows') {
      return {
        fileName: winFileName,
        fileSize: winFileSize,
        url: winDownloadUrl,
      };
    }
    if (heroOs === 'macos') {
      return {
        fileName: macFileName,
        fileSize: macFileSize,
        url: macDownloadUrl,
      };
    }
    return {
      fileName: linuxFileName,
      fileSize: linuxFileSize,
      url: linuxDownloadUrl,
    };
  }, [heroOs, winFileName, winFileSize, winDownloadUrl, macFileName, macFileSize, macDownloadUrl, linuxFileName, linuxFileSize, linuxDownloadUrl]);

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
    const onMove = (e: MouseEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [mx, my]);

  const heroDl = OS_META[heroOs];

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
              <span className="dlp-pulse" /> Noska Desktop · v{v}
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
              Windows, macOS and Linux, with iOS and Android right behind
              them. Same account as the web.
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
                href={heroDownloadInfo.url}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="dlp-pill-btn big hero-cta"
              >
                <OsSticker os={heroOs} size={16} />
                Download {heroDownloadInfo.fileName}
                <span className="dlp-cta-size">
                  {heroDownloadInfo.fileSize}
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
          <div className="dlp-stat"><strong><CountUp to={5} /></strong><span>platforms</span></div>
          <div className="dlp-stat"><strong><CountUp to={8} /></strong><span>package formats</span></div>
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
          <p className="dlp-mono-label center">Pick your machine</p>
          <h2 className="dlp-h2">
            Download for <em className="dlp-script green">your machine</em>
          </h2>
        </motion.div>

        <div className="dlp-cards">
          {/* Windows Card */}
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
              href={winDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="dlp-pill-btn"
            >
              <OsSticker os="windows" size={16} />
              Download {winFileName}
              <span className="dlp-cta-size">{winFileSize}</span>
            </a>

            <ul className="dlp-meta">
              <li><span>Version</span><strong>v{v}</strong></li>
              <li><span>Size</span><strong>{winFileSize}</strong></li>
              <li><span>File</span><strong className="truncate max-w-[170px]" title={winFileName}>{winFileName}</strong></li>
              <li><span>Arch</span><strong>x64</strong></li>
            </ul>

            <div className="dlp-alts">
              {WINDOWS_FORMATS.filter((f) => f.key !== winFormat).map((f) => (
                <a key={f.key} href="#" onClick={(e) => { e.preventDefault(); setWinFormat(f.key); }}>
                  {f.label}
                </a>
              ))}
            </div>
          </GlowCard>

          {/* macOS Card */}
          <GlowCard className={`dlp-card ${detected === 'macos' ? 'is-yours' : ''}`}>
            {detected === 'macos' && <span className="dlp-yours">your device</span>}
            <header>
              <span className="dlp-card-glyph mac"><AppleIcon size={30} /></span>
              <div>
                <h3>macOS</h3>
                <p>{OS_META.macos.requirement}</p>
              </div>
            </header>

            <div className="dlp-seg" role="tablist" aria-label="Mac format">
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
              href={macDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="dlp-pill-btn dark"
            >
              <OsSticker os="macos" size={16} />
              Download {macFileName}
              <span className="dlp-cta-size">{macFileSize}</span>
            </a>

            <ul className="dlp-meta">
              <li><span>Version</span><strong>v{v}</strong></li>
              <li><span>Size</span><strong>{macFileSize}</strong></li>
              <li><span>File</span><strong className="truncate max-w-[170px]" title={macFileName}>{macFileName}</strong></li>
              <li><span>Chip</span><strong>Universal (Apple Silicon & Intel)</strong></li>
            </ul>
          </GlowCard>

          {/* Linux Card */}
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
              href={linuxDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="dlp-pill-btn"
            >
              <OsSticker os="linux" size={16} />
              Download {linuxFileName}
              <span className="dlp-cta-size">{linuxFileSize}</span>
            </a>

            <ul className="dlp-meta">
              <li><span>Version</span><strong>v{v}</strong></li>
              <li><span>Size</span><strong>{linuxFileSize}</strong></li>
              <li><span>File</span><strong className="truncate max-w-[170px]" title={linuxFileName}>{linuxFileName}</strong></li>
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

      {/* ── Mobile (iOS + Android) ──────────────────────── */}
      <section className="dlp-get" id="mobile">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: EASE }}
          className="dlp-get-head"
        >
          <p className="dlp-mono-label center">Also in your pocket</p>
          <h2 className="dlp-h2">
            Noska mobile, <em className="dlp-script green">almost here</em>
          </h2>
          <p className="dlp-mobile-sub">
            The real workspace — pages, tasks, AI — rebuilt for thumbs with
            bottom navigation, offline edits and push notifications. Same
            account, same sync as everything else.
          </p>
        </motion.div>

        <div className="dlp-cards two">
          {/* iOS Card */}
          <GlowCard className={`dlp-card ${mobileOs === 'ios' ? 'is-yours' : ''}`}>
            {mobileOs === 'ios' && <span className="dlp-yours">your device</span>}
            <header>
              <span className="dlp-card-glyph mac"><AppleIcon size={30} /></span>
              <div>
                <h3>iOS</h3>
                <p>iPhone &amp; iPad · iOS 14 or later</p>
              </div>
            </header>

            <span className="dlp-soon-pill">TestFlight · coming soon</span>

            <ul className="dlp-mobile-list">
              <li><Check size={13} /> Same workspace as desktop &amp; web</li>
              <li><Check size={13} /> Offline edits with verified sync</li>
              <li><Check size={13} /> noska:// links open straight into a page</li>
            </ul>
          </GlowCard>

          {/* Android Card */}
          <GlowCard className={`dlp-card ${mobileOs === 'android' ? 'is-yours' : ''}`}>
            {mobileOs === 'android' && <span className="dlp-yours">your device</span>}
            <header>
              <span className="dlp-card-glyph linux"><Smartphone size={28} /></span>
              <div>
                <h3>Android</h3>
                <p>Android 7.0 (Nougat) or later</p>
              </div>
            </header>

            <span className="dlp-soon-pill green">Beta APK · testing now</span>

            <ul className="dlp-mobile-list">
              <li><Check size={13} /> Google Play &amp; direct APK at launch</li>
              <li><Check size={13} /> Push notifications for invites &amp; mentions</li>
              <li><Check size={13} /> Bottom-nav UI built for thumbs, not shrunk</li>
            </ul>
          </GlowCard>
        </div>

        <div className="dlp-notify">
          {notifyState === 'done' ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="dlp-notify-done"
            >
              <Check size={15} /> You're on the list — we'll email you when mobile ships.
            </motion.p>
          ) : (
            <form className="dlp-notify-form" onSubmit={handleNotifySubmit}>
              <input
                type="email"
                required
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="you@company.com"
                aria-label="Email for the mobile launch"
                autoComplete="email"
              />
              <button type="submit" className="dlp-pill-btn dark" disabled={notifyState === 'sending'}>
                <Bell size={15} />
                {notifyState === 'sending' ? 'Adding you…' : 'Notify me at launch'}
              </button>
            </form>
          )}
          {notifyState === 'error' && (
            <p className="dlp-notify-err">
              {notifyError} — or join via the <Link to="/launch">launch page</Link>.
            </p>
          )}
        </div>
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
