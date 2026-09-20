import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Share2,
  Maximize2,
  Lock,
  Database,
  Terminal,
  CloudLightning,
  CheckCircle2,
  RotateCw,
  ArrowRight,
  X,
  Zap,
  ShieldCheck,
  DownloadCloud,
  ChevronRight,
  RefreshCw,
  HardDrive,
  Cpu,
} from "lucide-react";
import { isDesktop } from "@/lib/desktop/platform";
import packageJson from "../../../package.json";

export interface OrbitalModule {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  glowColor: string;
  badge?: string;
  description: string;
  versionPatch: string;
  size: string;
  status: "pending" | "installing" | "ready";
  features: string[];
}

export const NOSKA_MODULES: OrbitalModule[] = [
  {
    id: "ai-ghostwriter",
    title: "AI Ghostwriter & Copilot",
    subtitle: "Predictive text & voice agent",
    category: "Intelligence Engine",
    icon: Sparkles,
    color: "#FF6B6B",
    glowColor: "rgba(255, 107, 107, 0.6)",
    badge: "v2.4",
    description:
      "Ultra-low latency local AI agent runtime with Claude 3.7 & GPT-4o reasoning, inline ghost suggestions, and speech-to-structure voice transcription.",
    versionPatch: "+ Local Whisper Turbo acceleration",
    size: "18.4 MB",
    status: "ready",
    features: [
      "Sub-40ms inline ghostwriting predictions",
      "Local audio canvas waveform visualizer",
      "Dynamic agent prompt execution pipeline",
    ],
  },
  {
    id: "spatial-canvas",
    title: "Infinite Spatial Canvas",
    subtitle: "GPU 2D card physics & zoom",
    category: "Spatial Workspace",
    icon: Maximize2,
    color: "#FFA07A",
    glowColor: "rgba(255, 160, 122, 0.6)",
    badge: "v1.9",
    description:
      "Infinite zoomable 2D workspace with spring-physics card dragging, minimap HUD thumbnail, and automated spatial card arrangements.",
    versionPatch: "+ GPU-accelerated canvas panning",
    size: "12.1 MB",
    status: "ready",
    features: [
      "Smooth 25% → 200% pinch & scroll zoom",
      "Spatial card coordinate caching",
      "Minimap live thumbnail overlay",
    ],
  },
  {
    id: "thought-graph",
    title: "Thought Graph Engine",
    subtitle: "Bi-directional neural network",
    category: "Knowledge Graph",
    icon: Share2,
    color: "#FF8E53",
    glowColor: "rgba(255, 142, 83, 0.6)",
    badge: "v2.0",
    description:
      "Force-directed dynamic neural network mapping inter-page backlinks, tags, and AI conceptual associations in real time.",
    versionPatch: "+ Real-time node repulsion physics",
    size: "9.6 MB",
    status: "ready",
    features: [
      "Interactive SVG force-directed physics",
      "Instant page jump upon node click",
      "Dynamic tag cluster categorization",
    ],
  },
  {
    id: "crypto-vault",
    title: "E2E Cryptographic Vault",
    subtitle: "AES-GCM 256-bit encryption",
    category: "Security & Privacy",
    icon: Lock,
    color: "#FA8072",
    glowColor: "rgba(250, 128, 114, 0.6)",
    badge: "v3.1",
    description:
      "Zero-knowledge client-side encryption using PBKDF2 key derivation and AES-GCM 256-bit ciphertext storage with hardware enclave protection.",
    versionPatch: "+ Hardware key derivation acceleration",
    size: "6.2 MB",
    status: "ready",
    features: [
      "Zero-knowledge local memory decryption",
      "Automated ciphertext autosave pipeline",
      "Visual padlock indicators across trees",
    ],
  },
  {
    id: "sqlite-sync",
    title: "Offline SQLite & Cache",
    subtitle: "Zero-latency local database",
    category: "Core Storage",
    icon: Database,
    color: "#FF7F50",
    glowColor: "rgba(255, 127, 80, 0.6)",
    badge: "v4.0",
    description:
      "High-performance local embedded SQLite database with instant CRDT offline changes, delta sync, and automatic conflict resolution.",
    versionPatch: "+ Delta journal compression",
    size: "14.8 MB",
    status: "ready",
    features: [
      "Instant offline-to-cloud synchronization",
      "Atomic write transactions with WAL",
      "Automatic trash expiration scheduler",
    ],
  },
  {
    id: "native-os",
    title: "Native OS Integrations",
    subtitle: "Deep links & global hotkeys",
    category: "System Bridge",
    icon: Terminal,
    color: "#E9967A",
    glowColor: "rgba(233, 150, 122, 0.6)",
    badge: "v1.2",
    description:
      "Deep desktop integration for Windows and macOS, registering noska:// URI handlers, custom frameless window chrome, and tray runner.",
    versionPatch: "+ Global shortcut background hook",
    size: "8.3 MB",
    status: "ready",
    features: [
      "noska:// page & workspace protocol handler",
      "Global shortcut dispatch listener",
      "Passive background update scheduler",
    ],
  },
];

export interface NoskaOrbitalUpdaterProps {
  mode?: "installer" | "updater";
  currentVersion?: string;
  targetVersion?: string;
  onComplete?: () => void;
  onClose?: () => void;
  autoStart?: boolean;
}

export default function NoskaOrbitalUpdater({
  mode = "installer",
  currentVersion = packageJson.version || "1.1.1",
  targetVersion = "1.2.0",
  onComplete,
  onClose,
  autoStart = true,
}: NoskaOrbitalUpdaterProps) {
  const [activeModuleId, setActiveModuleId] = useState<string>("ai-ghostwriter");
  const [isProcessing, setIsProcessing] = useState(autoStart);
  const [progress, setProgress] = useState(mode === "installer" ? 12 : 8);
  const [isDone, setIsDone] = useState(false);
  const [transferSpeed, setTransferSpeed] = useState<string>("24.5 MB/s");
  const [showModuleDetail, setShowModuleDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"orbit" | "changelog">("orbit");

  // Track positions of nodes for dynamic laser connector
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceNodeRef = useRef<HTMLDivElement>(null);
  const targetNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [laserCoords, setLaserCoords] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }>({ x1: 0, y1: 0, x2: 0, y2: 0 });

  const activeModule = useMemo(
    () => NOSKA_MODULES.find((m) => m.id === activeModuleId) || NOSKA_MODULES[0],
    [activeModuleId]
  );

  // Recalculate laser coordinates dynamically
  const updateLaserCoords = () => {
    if (!containerRef.current || !sourceNodeRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const sourceRect = sourceNodeRef.current.getBoundingClientRect();
    const activeTargetEl = targetNodeRefs.current[activeModuleId];

    if (!activeTargetEl) return;
    const targetRect = activeTargetEl.getBoundingClientRect();

    setLaserCoords({
      x1: sourceRect.right - containerRect.left,
      y1: sourceRect.top + sourceRect.height / 2 - containerRect.top,
      x2: targetRect.left - containerRect.left,
      y2: targetRect.top + targetRect.height / 2 - containerRect.top,
    });
  };

  useEffect(() => {
    updateLaserCoords();
    const handleResize = () => updateLaserCoords();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeModuleId, showModuleDetail]);

  // Handle installation or update progress loop
  useEffect(() => {
    if (!isProcessing || isDone) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDone(true);
          return 100;
        }
        const delta = Math.floor(Math.random() * 6) + 3;
        const next = Math.min(prev + delta, 100);

        // Switch active module progressively as installation advances
        const stepIndex = Math.min(
          Math.floor((next / 100) * NOSKA_MODULES.length),
          NOSKA_MODULES.length - 1
        );
        setActiveModuleId(NOSKA_MODULES[stepIndex].id);

        // Fluctuate speed slightly for realism
        const speedVal = (22 + Math.random() * 8).toFixed(1);
        setTransferSpeed(`${speedVal} MB/s`);

        if (next === 100) {
          setIsDone(true);
        }
        return next;
      });
    }, 280);

    return () => clearInterval(interval);
  }, [isProcessing, isDone]);

  const handleStartProcess = () => {
    setIsProcessing(true);
  };

  const handleFinish = () => {
    if (mode === "installer") {
      try {
        localStorage.setItem("noska_setup_completed", "true");
      } catch {}
    }
    onComplete?.();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[640px] flex flex-col justify-between overflow-hidden select-none font-sans text-white/95 rounded-3xl"
      style={{
        background: `
          radial-gradient(ellipse 90% 70% at 75% 45%, rgba(255, 140, 115, 0.42) 0%, rgba(255, 120, 90, 0.22) 40%, rgba(20, 22, 30, 0.95) 100%),
          radial-gradient(circle at 15% 30%, rgba(255, 180, 140, 0.25) 0%, rgba(15, 17, 24, 0.98) 70%),
          #111319
        `,
      }}
    >
      {/* Ambient glowing background orbs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full bg-[#FF8C69]/25 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-10 left-10 w-[420px] h-[420px] rounded-full bg-[#FF7A59]/18 blur-[130px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

      {/* Top Header Bar */}
      <header className="relative z-30 flex items-center justify-between px-8 pt-6 pb-4 border-b border-white/10 backdrop-blur-md bg-white/[0.02]">
        <div className="flex items-center gap-3.5">
          {/* Noska brand logo badge */}
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-white/95 via-[#FFEAE3] to-[#FFC5B5] shadow-[0_4px_20px_rgba(255,140,115,0.4)] p-0.5 text-neutral-900 font-bold text-lg">
            <span>N</span>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B4A] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF6B4A]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-white drop-shadow-sm">
                Noska {mode === "installer" ? "Desktop Setup" : "Desktop Updater"}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/15 text-white/90 border border-white/20 backdrop-blur-md shadow-sm">
                {mode === "installer" ? "Windows Native" : `v${currentVersion} → v${targetVersion}`}
              </span>
            </div>
            <p className="text-[11px] text-white/60">
              {mode === "installer"
                ? "Configuring local AI workspace & SQLite vault"
                : "Signed cryptographic delta package stream"}
            </p>
          </div>
        </div>

        {/* Tab & Window actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-black/20 border border-white/10 backdrop-blur-xl">
            <button
              onClick={() => setActiveTab("orbit")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === "orbit"
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
            >
              System Orbit
            </button>
            <button
              onClick={() => setActiveTab("changelog")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === "changelog"
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
            >
              What's New
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 transition-colors"
              title="Minimize to background"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Main Interactive Orbit Stage */}
      <main className="relative z-20 flex-1 flex items-center justify-between px-8 py-6 overflow-hidden">
        {activeTab === "orbit" ? (
          <div className="relative w-full h-full flex items-center justify-between">
            {/* SVG Layer for Curved Orbit Arc & Glowing Laser Energy Beam */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              style={{ overflow: "visible" }}
            >
              <defs>
                {/* Laser Glow Filter */}
                <filter id="laser-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="3.5" result="blur1" />
                  <feGaussianBlur stdDeviation="7" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Linear gradient for laser beam */}
                <linearGradient id="beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#FFD3C4" stopOpacity="1" />
                  <stop offset="100%" stopColor="#FFA07A" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* Curved Dashed Orbital Track */}
              <path
                d={`M ${laserCoords.x2 || 580} 30 Q ${
                  (laserCoords.x2 || 580) - 80
                } 250 ${(laserCoords.x2 || 580)} 470`}
                fill="none"
                stroke="rgba(255, 255, 255, 0.22)"
                strokeWidth="1.5"
                strokeDasharray="5 7"
                className="opacity-70"
              />

              {/* Glowing Laser Connector Beam linking Source Pill -> Active Target Pill */}
              {laserCoords.x1 > 0 && laserCoords.x2 > 0 && (
                <g>
                  {/* Diffused outer aura */}
                  <line
                    x1={laserCoords.x1}
                    y1={laserCoords.y1}
                    x2={laserCoords.x2}
                    y2={laserCoords.y2}
                    stroke="rgba(255, 140, 110, 0.45)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#laser-glow)"
                  />

                  {/* Sharp core beam */}
                  <line
                    x1={laserCoords.x1}
                    y1={laserCoords.y1}
                    x2={laserCoords.x2}
                    y2={laserCoords.y2}
                    stroke="url(#beam-grad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    filter="url(#laser-glow)"
                  />

                  {/* Traveling Photon Light Particles */}
                  <circle r="4" fill="#ffffff" filter="url(#laser-glow)">
                    <animateMotion
                      path={`M ${laserCoords.x1} ${laserCoords.y1} L ${laserCoords.x2} ${laserCoords.y2}`}
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle r="2.5" fill="#FFEAE3" filter="url(#laser-glow)">
                    <animateMotion
                      path={`M ${laserCoords.x1} ${laserCoords.y1} L ${laserCoords.x2} ${laserCoords.y2}`}
                      dur="1.2s"
                      begin="0.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              )}
            </svg>

            {/* LEFT SIDE: Parent / Source Node Pill */}
            <div className="relative z-20 flex flex-col items-start max-w-[340px]">
              <motion.div
                ref={sourceNodeRef}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex items-center justify-between gap-4 px-5 py-3.5 rounded-full border border-white/35 bg-white/20 hover:bg-white/25 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] cursor-default transition-all duration-300"
              >
                {/* Left Text Info */}
                <div className="flex flex-col text-left pr-2">
                  <span className="text-xs font-semibold text-white tracking-tight drop-shadow-sm">
                    Noska Desktop Engine
                  </span>
                  <span className="text-[10px] text-white/70 font-normal tracking-wide">
                    {mode === "installer" ? "Active Workspace Provisioning" : "Signed Binary Delta Sync"}
                  </span>
                </div>

                {/* Right Icon Badge inside Source Pill */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-neutral-900 shadow-[0_2px_12px_rgba(255,255,255,0.5)] shrink-0">
                  <Zap size={16} className="text-[#FF6B4A] fill-[#FF6B4A]" />
                </div>

                {/* Subtle top specular border line */}
                <div className="pointer-events-none absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              </motion.div>

              {/* Sub-status card under source pill */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mt-6 p-4 rounded-2xl bg-white/[0.06] border border-white/15 backdrop-blur-xl max-w-[320px] shadow-lg"
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                  <span className="text-white/70 font-medium">Selected Module</span>
                  <span className="font-mono text-[#FFE0D6] text-[11px] font-semibold">
                    {activeModule.size}
                  </span>
                </div>

                <div className="pt-2">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <activeModule.icon size={13} className="text-[#FFA07A]" />
                    {activeModule.title}
                  </h3>
                  <p className="text-[11px] text-white/60 leading-relaxed mt-1 line-clamp-2">
                    {activeModule.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-white/50">
                  <span>Signature: SHA-256 ECDSA</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck size={11} /> Verified
                  </span>
                </div>
              </motion.div>
            </div>

            {/* RIGHT SIDE: Orbit Curved List of Nodes */}
            <div className="relative z-20 flex flex-col gap-3.5 pr-2 py-2 w-[340px]">
              {NOSKA_MODULES.map((mod, index) => {
                const isActive = mod.id === activeModuleId;
                const Icon = mod.icon;

                // Curved offset geometry for orbital feel
                const xOffset = Math.sin((index / (NOSKA_MODULES.length - 1)) * Math.PI) * -28;

                return (
                  <motion.div
                    key={mod.id}
                    ref={(el) => {
                      targetNodeRefs.current[mod.id] = el;
                    }}
                    style={{ transform: `translateX(${xOffset}px)` }}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: xOffset }}
                    transition={{ delay: index * 0.06, duration: 0.5 }}
                    onClick={() => {
                      setActiveModuleId(mod.id);
                      updateLaserCoords();
                    }}
                    className={`group relative flex items-center gap-3.5 px-4 py-3 rounded-full border cursor-pointer select-none transition-all duration-300 ${
                      isActive
                        ? "bg-white/95 text-neutral-900 border-white shadow-[0_0_35px_rgba(255,255,255,0.85),0_0_15px_rgba(255,140,110,0.6)] scale-[1.03]"
                        : "bg-white/[0.12] hover:bg-white/[0.22] text-white border-white/20 hover:border-white/35 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
                    }`}
                  >
                    {/* Left Icon Badge inside Orbit Pill */}
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                        isActive
                          ? "bg-gradient-to-tr from-[#FF6B4A] to-[#FFA07A] text-white shadow-md shadow-[#FF6B4A]/30"
                          : "bg-white/20 text-white/90"
                      }`}
                    >
                      <Icon size={15} />
                    </div>

                    {/* Content text */}
                    <div className="flex flex-col text-left min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-semibold tracking-tight truncate ${
                            isActive ? "text-neutral-900" : "text-white"
                          }`}
                        >
                          {mod.title}
                        </span>
                        {mod.badge && (
                          <span
                            className={`px-1.5 py-0.2 text-[9px] rounded-full font-mono ${
                              isActive
                                ? "bg-neutral-900/10 text-neutral-800"
                                : "bg-white/15 text-white/70"
                            }`}
                          >
                            {mod.badge}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] truncate ${
                          isActive ? "text-neutral-600" : "text-white/60"
                        }`}
                      >
                        {mod.subtitle}
                      </span>
                    </div>

                    {/* Status check / arrow */}
                    <div className="shrink-0 pl-1">
                      {isDone ? (
                        <CheckCircle2
                          size={15}
                          className={isActive ? "text-emerald-600" : "text-emerald-400"}
                        />
                      ) : isActive ? (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B4A] opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF6B4A]" />
                        </span>
                      ) : (
                        <ChevronRight
                          size={14}
                          className="text-white/40 group-hover:text-white/80 transition-transform group-hover:translate-x-0.5"
                        />
                      )}
                    </div>

                    {/* Active Halo Border Specular */}
                    {isActive && (
                      <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/60 animate-pulse" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Changelog & Technical Specifications Tab */
          <div className="w-full h-full overflow-y-auto px-4 py-2 space-y-4">
            <div className="p-5 rounded-2xl bg-white/[0.08] border border-white/15 backdrop-blur-xl">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-[#FFA07A]" />
                Noska Desktop Release Notes — v{targetVersion}
              </h2>
              <p className="text-xs text-white/70 mt-1">
                Optimized native binary release with hardware acceleration & zero-latency sync.
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {NOSKA_MODULES.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-3.5 rounded-xl bg-black/20 border border-white/10"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <mod.icon size={14} className="text-[#FFA07A]" />
                      <span>{mod.title}</span>
                    </div>
                    <ul className="mt-2 space-y-1 text-[11px] text-white/65">
                      {mod.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="text-[#FFA07A]">•</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Progress & Action Dock */}
      <footer className="relative z-30 px-8 py-5 border-t border-white/10 bg-black/30 backdrop-blur-2xl">
        <div className="flex flex-col gap-3">
          {/* Progress label, speed, and percentage */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              {isDone ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 size={15} />
                  <span>
                    {mode === "installer" ? "Setup complete — Ready to launch" : "Update verified & ready"}
                  </span>
                </div>
              ) : isProcessing ? (
                <div className="flex items-center gap-2 text-white/90">
                  <RotateCw size={13} className="animate-spin text-[#FFA07A]" />
                  <span className="font-medium">
                    {mode === "installer"
                      ? `Initializing ${activeModule.title}...`
                      : `Streaming delta package for ${activeModule.title}...`}
                  </span>
                </div>
              ) : (
                <span className="text-white/70">Ready to begin {mode}</span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              {isProcessing && !isDone && (
                <span className="text-white/60 hidden sm:inline">{transferSpeed}</span>
              )}
              <span className="font-semibold text-[#FFE0D6]">{progress}%</span>
            </div>
          </div>

          {/* Glowing Animated Progress Bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/15 shadow-inner">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#FF6B4A] via-[#FFA07A] to-[#FFEAE3] shadow-[0_0_12px_rgba(255,160,122,0.8)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: 0.3 }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-white/50">
              {mode === "installer"
                ? "Signed for Windows x64 · Direct local database"
                : "Cryptographically verified with Minisign ECDSA"}
            </p>

            <div className="flex items-center gap-2.5">
              {!isProcessing && !isDone && (
                <button
                  onClick={handleStartProcess}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/95 text-neutral-900 hover:bg-white text-xs font-semibold shadow-lg shadow-white/20 transition-all active:scale-95 cursor-pointer"
                >
                  <DownloadCloud size={14} />
                  <span>{mode === "installer" ? "Start Setup" : "Download & Install"}</span>
                </button>
              )}

              {isDone ? (
                <motion.button
                  key="finish-btn"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleFinish}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-white to-[#FFE8E0] text-neutral-950 text-xs font-bold shadow-[0_4px_25px_rgba(255,255,255,0.4)] hover:shadow-[0_4px_30px_rgba(255,255,255,0.6)] transition-all active:scale-95 cursor-pointer"
                >
                  <span>{mode === "installer" ? "Launch Workspace" : "Relaunch Noska"}</span>
                  <ArrowRight size={14} />
                </motion.button>
              ) : (
                <button
                  onClick={handleFinish}
                  className="text-xs text-white/50 hover:text-white/80 transition-colors px-2 py-1 cursor-pointer"
                >
                  Skip animation
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
