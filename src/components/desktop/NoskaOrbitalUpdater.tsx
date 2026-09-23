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
  Folder,
  FolderOpen,
  Layers,
  FileText,
  FileCode,
  Sliders,
  Play,
  RotateCcw,
  Boxes,
  Compass,
  Check,
} from "lucide-react";
import { isDesktop } from "@/lib/desktop/platform";
import packageJson from "../../../package.json";

export interface OrbitalModule {
  id: string;
  title: string;
  shortName: string;
  subtitle: string;
  category: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  bgGradient: string;
  glowColor: string;
  badge?: string;
  description: string;
  versionPatch: string;
  size: string;
  status: "pending" | "installing" | "ready";
  features: string[];
  flightAngle?: number; // trajectory spawn angle
}

export const NOSKA_MODULES: OrbitalModule[] = [
  {
    id: "ai-ghostwriter",
    title: "AI Ghostwriter & Copilot",
    shortName: "Copilot",
    subtitle: "Predictive text & voice agent",
    category: "Intelligence Engine",
    icon: Sparkles,
    color: "#FF6B6B",
    bgGradient: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
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
    flightAngle: -45,
  },
  {
    id: "spatial-canvas",
    title: "Infinite Spatial Canvas",
    shortName: "Spatial Canvas",
    subtitle: "GPU 2D card physics & zoom",
    category: "Spatial Workspace",
    icon: Maximize2,
    color: "#FFA07A",
    bgGradient: "linear-gradient(135deg, #FFA07A 0%, #FF7F50 100%)",
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
    flightAngle: -25,
  },
  {
    id: "thought-graph",
    title: "Thought Graph Engine",
    shortName: "Thought Graph",
    subtitle: "Bi-directional neural network",
    category: "Knowledge Graph",
    icon: Share2,
    color: "#38BDF8",
    bgGradient: "linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)",
    glowColor: "rgba(56, 189, 248, 0.6)",
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
    flightAngle: -8,
  },
  {
    id: "crypto-vault",
    title: "E2E Cryptographic Vault",
    shortName: "Crypto Vault",
    subtitle: "AES-GCM 256-bit encryption",
    category: "Security & Privacy",
    icon: Lock,
    color: "#F59E0B",
    bgGradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    glowColor: "rgba(245, 158, 11, 0.6)",
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
    flightAngle: 10,
  },
  {
    id: "sqlite-sync",
    title: "Offline SQLite & Cache",
    shortName: "Offline SQLite",
    subtitle: "Zero-latency local database",
    category: "Core Storage",
    icon: Database,
    color: "#10B981",
    bgGradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    glowColor: "rgba(16, 185, 129, 0.6)",
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
    flightAngle: 28,
  },
  {
    id: "native-os",
    title: "Native OS Integrations",
    shortName: "Native OS",
    subtitle: "Deep links & global hotkeys",
    category: "System Bridge",
    icon: Terminal,
    color: "#A855F7",
    bgGradient: "linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)",
    glowColor: "rgba(168, 85, 247, 0.6)",
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
    flightAngle: 48,
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
  // Animation Stages:
  // "ingesting" -> files streaming into folder along bezier paths
  // "popout" -> 100% download finished, all cards blast out in 3D fan burst
  // "welcome" -> zoom-in transition to "Welcome to Noska" launch screen
  const [phase, setPhase] = useState<"ingesting" | "popout" | "welcome">("ingesting");
  
  const [progress, setProgress] = useState(mode === "installer" ? 8 : 4);
  const [isProcessing, setIsProcessing] = useState(autoStart);
  const [transferSpeed, setTransferSpeed] = useState<string>("38.4 MB/s");
  const [ingestedIndices, setIngestedIndices] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<"stream" | "chaos" | "modules" | "changelog">("stream");
  const [selectedModule, setSelectedModule] = useState<OrbitalModule | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Total modules
  const totalModules = NOSKA_MODULES.length;

  // Ingestion loop
  useEffect(() => {
    if (!isProcessing || phase !== "ingesting") return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          handleDownloadFinished();
          return 100;
        }

        const delta = Math.floor(Math.random() * 5) + 3;
        const next = Math.min(prev + delta, 100);

        // Calculate which modules are currently absorbed into the folder
        const count = Math.min(
          Math.floor((next / 100) * totalModules),
          totalModules
        );
        const indices = Array.from({ length: count }, (_, i) => i);
        setIngestedIndices(indices);

        // Fluctuate transfer speed for realism
        const speed = (34 + Math.random() * 12).toFixed(1);
        setTransferSpeed(`${speed} MB/s`);

        if (next === 100) {
          clearInterval(interval);
          handleDownloadFinished();
        }
        return next;
      });
    }, 240);

    return () => clearInterval(interval);
  }, [isProcessing, phase]);

  // When 100% download completes -> Trigger Popout, then Zoom-in Welcome
  const handleDownloadFinished = () => {
    setIngestedIndices(Array.from({ length: totalModules }, (_, i) => i));
    
    // Step 1: Wait 400ms then transition to 3D Popout Explosion
    setTimeout(() => {
      setPhase("popout");

      // Step 2: After 2.4s of popout burst showcase -> smooth zoom-in to Welcome screen
      setTimeout(() => {
        setPhase("welcome");
      }, 2400);
    }, 500);
  };

  const handleStartProcess = () => {
    setIsProcessing(true);
  };

  const handleReplay = () => {
    setPhase("ingesting");
    setProgress(0);
    setIngestedIndices([]);
    setIsProcessing(true);
  };

  const handleLaunch = () => {
    if (mode === "installer") {
      try {
        localStorage.setItem("noska_setup_completed", "true");
      } catch {}
    }
    onComplete?.();
  };

  // Trajectory path calculation for 6 modules fanning from top arc down to center folder (x: 400, y: 380)
  const getFlightCoords = (index: number) => {
    // 6 origin points spread across top of stage
    const total = NOSKA_MODULES.length;
    const startX = 120 + (index / (total - 1)) * 560; // 120 to 680
    const startY = 80 + Math.abs(index - (total - 1) / 2) * 22; // slight parabolic top curve
    const targetX = 400; // center folder aperture
    const targetY = 360; // top mouth of folder
    const controlX = startX + (targetX - startX) * 0.4;
    const controlY = startY + (targetY - startY) * 0.75 + 30;

    return {
      startX,
      startY,
      targetX,
      targetY,
      controlX,
      controlY,
      path: `M ${startX} ${startY} Q ${controlX} ${controlY} ${targetX} ${targetY}`,
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[640px] flex flex-col justify-between overflow-hidden select-none font-sans text-white/95 rounded-3xl"
      style={{
        background: `
          radial-gradient(ellipse 95% 75% at 50% 30%, rgba(255, 115, 80, 0.28) 0%, rgba(30, 20, 35, 0.75) 50%, rgba(12, 14, 20, 0.98) 100%),
          #0C0E14
        `,
      }}
    >
      {/* Ambient glowing background aura */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[480px] rounded-full bg-gradient-to-b from-[#FF6B4A]/25 via-[#FFA07A]/15 to-transparent blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-10 w-[450px] h-[350px] rounded-full bg-[#FF8E53]/15 blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff0d_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />

      {/* Top Apple-style Glass Header Bar */}
      <header className="relative z-40 flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/10 backdrop-blur-xl bg-white/[0.03]">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-3">
          {/* Glowing Noska Monogram */}
          <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#FF5722] via-[#FF8A65] to-[#FFE0B2] text-neutral-950 font-black text-base shadow-[0_2px_18px_rgba(255,87,34,0.45)]">
            <span>N</span>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-white">
                Noska {mode === "installer" ? "Desktop Setup" : "Desktop Updater"}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white/10 text-white/90 border border-white/15">
                {mode === "installer" ? `v${targetVersion}` : `v${currentVersion} → v${targetVersion}`}
              </span>
            </div>
            <p className="text-[11px] text-white/60">
              {phase === "welcome"
                ? "Setup verified & ready to launch"
                : phase === "popout"
                ? "Unpacking and activating modular intelligence..."
                : "Streaming & ingesting modules into local secure vault"}
            </p>
          </div>
        </div>

        {/* Center / Right: View Switchers & Controls */}
        <div className="flex items-center gap-2">
          {phase === "ingesting" && (
            <div className="flex items-center p-1 rounded-xl bg-black/30 border border-white/10 backdrop-blur-xl">
              <button
                onClick={() => setActiveTab("stream")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "stream"
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <FolderDownIcon size={13} />
                <span>Stream</span>
              </button>
              <button
                onClick={() => setActiveTab("chaos")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "chaos"
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Boxes size={13} />
                <span>Chaos → Clarity</span>
              </button>
              <button
                onClick={() => setActiveTab("modules")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "modules"
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Layers size={13} />
                <span>Vault Deck</span>
              </button>
              <button
                onClick={() => setActiveTab("changelog")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "changelog"
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <FileText size={13} />
                <span>What's New</span>
              </button>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 transition-colors"
              title="Close window"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Main Dynamic Animation Stage */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ================= PHASE 3: WELCOME SCREEN (ZOOM-IN TRANSITION) ================= */}
          {phase === "welcome" && (
            <motion.div
              key="welcome-stage"
              initial={{ opacity: 0, scale: 0.88, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="relative w-full max-w-2xl flex flex-col items-center text-center py-6"
            >
              {/* Glowing 3D Hero Emblem */}
              <div className="relative mb-6">
                <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-[#FF5722]/40 via-[#FFA07A]/30 to-[#38BDF8]/20 blur-2xl animate-pulse" />
                <motion.div
                  initial={{ rotateY: -60, scale: 0.7 }}
                  animate={{ rotateY: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 180, damping: 18 }}
                  className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-white via-[#FFE6DC] to-[#FF8A65] flex items-center justify-center text-neutral-950 font-black text-4xl shadow-[0_12px_45px_rgba(255,87,34,0.5),inset_0_1px_2px_rgba(255,255,255,0.9)] border border-white/40"
                >
                  <span>N</span>
                  <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-emerald-500 text-white shadow-lg border-2 border-[#0C0E14]">
                    <Check size={14} strokeWidth={3} />
                  </div>
                </motion.div>
              </div>

              {/* Title & Tagline */}
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md"
              >
                Welcome to Noska
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-sm text-white/70 max-w-md mt-2 leading-relaxed"
              >
                All 6 intelligence engines, offline SQLite cache, and cryptographic vault are primed and ready for your workflow.
              </motion.p>

              {/* Ready Feature Pills */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-lg"
              >
                {NOSKA_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <div
                      key={mod.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.07] border border-white/15 backdrop-blur-md text-xs text-white/90"
                    >
                      <Icon size={13} className="text-[#FFA07A]" />
                      <span className="font-medium">{mod.shortName}</span>
                      <CheckCircle2 size={12} className="text-emerald-400 ml-0.5" />
                    </div>
                  );
                })}
              </motion.div>

              {/* Start Noska Primary Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.45, type: "spring", stiffness: 240, damping: 20 }}
                className="mt-8 flex flex-col items-center gap-3"
              >
                <button
                  onClick={handleLaunch}
                  className="group relative flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-white via-[#FFEBE3] to-[#FFD1C1] text-neutral-950 font-bold text-sm tracking-tight shadow-[0_4px_30px_rgba(255,255,255,0.4),0_0_20px_rgba(255,87,34,0.3)] hover:shadow-[0_6px_40px_rgba(255,255,255,0.6),0_0_30px_rgba(255,87,34,0.5)] transition-all transform active:scale-95 cursor-pointer overflow-hidden"
                >
                  <span className="relative z-10">Start Noska</span>
                  <ArrowRight
                    size={16}
                    className="relative z-10 group-hover:translate-x-1 transition-transform"
                  />
                  {/* Subtle specular sheen streak */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
                </button>

                <button
                  onClick={handleReplay}
                  className="flex items-center gap-1.5 text-xs text-white/45 hover:text-white/80 transition-colors pt-1 cursor-pointer"
                >
                  <RotateCcw size={11} />
                  <span>Replay animation</span>
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ================= PHASE 2: 100% COMPLETE 3D POPOUT BURST ================= */}
          {phase === "popout" && (
            <motion.div
              key="popout-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              className="relative w-full h-full max-w-4xl flex items-center justify-center"
            >
              {/* Central Glowing 3D Folder Burst Core */}
              <div className="relative flex flex-col items-center justify-center z-10">
                {/* Shockwave energy rings */}
                <motion.div
                  initial={{ scale: 0.6, opacity: 1 }}
                  animate={{ scale: 2.4, opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute w-44 h-44 rounded-full border-2 border-[#FFA07A] shadow-[0_0_40px_#FF6B4A]"
                />
                <motion.div
                  initial={{ scale: 0.4, opacity: 1 }}
                  animate={{ scale: 3.2, opacity: 0 }}
                  transition={{ duration: 1.6, delay: 0.2, ease: "easeOut" }}
                  className="absolute w-44 h-44 rounded-full border-2 border-white/60 shadow-[0_0_50px_#FFFFFF]"
                />

                {/* 3D Open Folder Centerpiece */}
                <motion.div
                  initial={{ scale: 0.85, y: 30 }}
                  animate={{ scale: [0.85, 1.1, 1], y: 0 }}
                  transition={{ duration: 0.6, ease: "backOut" }}
                  className="relative z-20 w-44 h-32 rounded-3xl bg-gradient-to-b from-[#FFA785] via-[#FF8A65] to-[#E64A19] shadow-[0_20px_60px_rgba(255,87,34,0.5)] flex flex-col items-center justify-center border-t border-white/40 p-4"
                >
                  <FolderOpen size={48} className="text-white drop-shadow-md animate-bounce" />
                  <span className="text-[11px] font-bold text-white tracking-wider uppercase mt-1">
                    Unpacking 100%
                  </span>
                </motion.div>
              </div>

              {/* Radial Popout Feature Cards Fanning Out */}
              {NOSKA_MODULES.map((mod, index) => {
                const Icon = mod.icon;
                const total = NOSKA_MODULES.length;
                // Calculate radial positions around center
                const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
                const radiusX = 280;
                const radiusY = 160;
                const targetX = Math.cos(angle) * radiusX;
                const targetY = Math.sin(angle) * radiusY;

                return (
                  <motion.div
                    key={mod.id}
                    initial={{ scale: 0.2, x: 0, y: 0, opacity: 0, rotate: 0 }}
                    animate={{
                      scale: 1,
                      x: targetX,
                      y: targetY,
                      opacity: 1,
                      rotate: (index % 2 === 0 ? 1 : -1) * 4,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 14,
                      delay: 0.1 + index * 0.08,
                    }}
                    className="absolute z-30 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.14] border border-white/30 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(255,255,255,0.2)] text-white w-56"
                  >
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-md text-white"
                      style={{ background: mod.bgGradient }}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex flex-col text-left min-w-0 flex-1">
                      <span className="text-xs font-bold truncate text-white">
                        {mod.shortName}
                      </span>
                      <span className="text-[10px] text-white/70 truncate">
                        {mod.badge} · Ready
                      </span>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* ================= PHASE 1: STREAMING / INGESTION INTO 3D FOLDER ================= */}
          {phase === "ingesting" && activeTab === "stream" && (
            <motion.div
              key="stream-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full max-w-4xl flex flex-col items-center justify-between py-2"
            >
              {/* Dynamic SVG Layer for Curved Dotted Trajectory Paths */}
              <svg
                viewBox="0 0 800 480"
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                style={{ overflow: "visible" }}
              >
                <defs>
                  <linearGradient id="streamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFA07A" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#FF6B4A" stopOpacity="0.2" />
                  </linearGradient>
                  <filter id="pathGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Draw 6 graceful curved bezier trajectories */}
                {NOSKA_MODULES.map((mod, i) => {
                  const coords = getFlightCoords(i);
                  const isIngested = ingestedIndices.includes(i);

                  return (
                    <g key={mod.id}>
                      {/* Curved Dotted Flight Track */}
                      <path
                        d={coords.path}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.18)"
                        strokeWidth="1.5"
                        strokeDasharray="4 6"
                        className="opacity-60"
                      />

                      {/* Active Traveling Light Beam when installing */}
                      {!isIngested && isProcessing && (
                        <path
                          d={coords.path}
                          fill="none"
                          stroke="url(#streamGrad)"
                          strokeWidth="2.5"
                          strokeDasharray="20 180"
                          strokeLinecap="round"
                          filter="url(#pathGlow)"
                        >
                          <animate
                            attributeName="stroke-dashoffset"
                            from="200"
                            to="0"
                            dur={`${1.4 + i * 0.2}s`}
                            repeatCount="indefinite"
                          />
                        </path>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* TOP FLIGHT ROW: Feature / Capability Cards in Orbit */}
              <div className="relative z-30 w-full flex items-center justify-between px-2 pt-2">
                {NOSKA_MODULES.map((mod, index) => {
                  const isIngested = ingestedIndices.includes(index);
                  const Icon = mod.icon;
                  const coords = getFlightCoords(index);

                  return (
                    <motion.div
                      key={mod.id}
                      initial={{ opacity: 0, y: -20, scale: 0.8 }}
                      animate={
                        isIngested
                          ? {
                              // Card sucked down along curve into the folder!
                              opacity: [1, 0.9, 0],
                              scale: [1, 0.65, 0.15],
                              y: [0, 160, 260],
                              x: [0, (400 - coords.startX) * 0.5, 400 - coords.startX],
                              rotate: [0, 12, 35],
                              transition: {
                                duration: 0.65,
                                ease: [0.16, 1, 0.3, 1],
                              },
                            }
                          : {
                              opacity: 1,
                              y: [0, -6, 0],
                              scale: 1,
                              x: 0,
                              rotate: (index % 2 === 0 ? 1 : -1) * 2,
                              transition: {
                                y: {
                                  duration: 3 + index * 0.4,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                },
                              },
                            }
                      }
                      onClick={() => setSelectedModule(mod)}
                      className="group relative flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.12] hover:bg-white/[0.22] border border-white/20 hover:border-white/40 backdrop-blur-xl shadow-[0_8px_25px_rgba(0,0,0,0.25)] cursor-pointer transition-all w-24 sm:w-28 text-center"
                    >
                      {/* App Icon Badge */}
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-xl mb-1.5 shadow-md transition-transform group-hover:scale-110"
                        style={{ background: mod.bgGradient }}
                      >
                        <Icon size={18} className="text-white" />
                      </div>

                      {/* Title & Size */}
                      <span className="text-[11px] font-semibold text-white tracking-tight leading-tight line-clamp-1">
                        {mod.shortName}
                      </span>
                      <span className="text-[9px] font-mono text-white/60 mt-0.5">
                        {mod.size}
                      </span>

                      {/* Status pill */}
                      <div className="mt-1 flex items-center justify-center">
                        {isIngested ? (
                          <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-medium">
                            <CheckCircle2 size={10} /> Packed
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[9px] text-white/50">
                            {mod.badge}
                          </span>
                        )}
                      </div>

                      {/* Top highlight line */}
                      <div className="pointer-events-none absolute inset-x-2 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                    </motion.div>
                  );
                })}
              </div>

              {/* CENTER-BOTTOM: 3D Skeuomorphic-Modern Noska Ingestion Folder */}
              <div className="relative z-20 flex flex-col items-center justify-center mt-6 mb-2">
                {/* Absorption Ripple Glow Portal behind folder */}
                <div className="relative flex items-center justify-center">
                  <motion.div
                    animate={{
                      scale: isProcessing ? [1, 1.25, 1] : 1,
                      opacity: isProcessing ? [0.3, 0.7, 0.3] : 0.2,
                    }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute w-72 h-40 rounded-full bg-gradient-to-t from-[#FF5722] via-[#FFA07A] to-transparent blur-3xl pointer-events-none"
                  />

                  {/* 3D Multi-Layer Folder */}
                  <div className="relative w-64 sm:w-72 h-40 select-none">
                    {/* Folder Back Tab */}
                    <div className="absolute top-0 left-4 w-28 h-8 rounded-t-2xl bg-[#E65100] border-t border-l border-r border-white/30" />
                    <div className="absolute top-4 inset-x-0 h-36 rounded-2xl bg-gradient-to-b from-[#FF6E40] to-[#D84315] shadow-[0_15px_45px_rgba(0,0,0,0.5)] border border-white/25" />

                    {/* Inside Folder Aperture (Deep Cavity where cards disappear) */}
                    <div className="absolute top-6 inset-x-3 h-14 rounded-xl bg-black/40 border border-black/30 shadow-inner flex items-center justify-center overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-b from-black/60 to-transparent flex items-center justify-center">
                        <span className="text-[10px] font-mono tracking-widest text-[#FFCCBC]/70 uppercase animate-pulse">
                          {isProcessing
                            ? `Ingesting Modules (${ingestedIndices.length}/${totalModules})`
                            : "Vault Ready"}
                        </span>
                      </div>
                    </div>

                    {/* Folder Front Flap with embossed branding */}
                    <motion.div
                      animate={{
                        rotateX: isProcessing ? [0, 8, 0] : 0,
                      }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                      style={{ transformOrigin: "bottom center" }}
                      className="absolute bottom-0 inset-x-0 h-28 rounded-2xl bg-gradient-to-b from-[#FFA785] via-[#FF8A65] to-[#E64A19] border-t border-white/45 shadow-[0_-4px_20px_rgba(0,0,0,0.25),0_15px_35px_rgba(255,87,34,0.3)] flex flex-col justify-between p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-white/90 text-neutral-900 flex items-center justify-center font-bold text-xs shadow-sm">
                            N
                          </div>
                          <span className="text-xs font-bold text-white tracking-wide drop-shadow-sm">
                            Noska Core Vault
                          </span>
                        </div>

                        {/* Live Ingestion Counter Pill */}
                        <div className="px-2.5 py-0.5 rounded-full bg-black/25 border border-white/25 text-[10px] font-mono font-bold text-white shadow-sm flex items-center gap-1">
                          <span className="text-[#FFE0D6]">{ingestedIndices.length}</span>
                          <span className="text-white/40">/</span>
                          <span>{totalModules} Packed</span>
                        </div>
                      </div>

                      {/* Folder Bottom Status */}
                      <div className="flex items-center justify-between text-[10px] text-white/80 pt-2 border-t border-white/15">
                        <span className="flex items-center gap-1">
                          <ShieldCheck size={12} className="text-white" /> AES-256 Verified
                        </span>
                        <span className="font-mono text-white/90 font-semibold">
                          {progress}%
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= TAB: CHAOS TO CLARITY (Inspired by Image 2) ================= */}
          {phase === "ingesting" && activeTab === "chaos" && (
            <motion.div
              key="chaos-stage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full max-w-4xl flex items-center justify-between gap-6 px-4 py-4"
            >
              {/* Left Side: Messy Pile of Clutter */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-xl relative overflow-hidden">
                <div className="text-center mb-4">
                  <span className="text-xs font-bold tracking-wider text-rose-300 uppercase">
                    Before Noska
                  </span>
                  <h3 className="text-sm font-semibold text-white mt-0.5">
                    Unorganized Chaos & Scattered Notes
                  </h3>
                </div>

                {/* Chaotic visual stack */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  {[
                    { rot: -18, x: -20, y: -15, label: "raw_keys.pem", color: "bg-red-500/20" },
                    { rot: 25, x: 25, y: -20, label: "scattered_notes.txt", color: "bg-amber-500/20" },
                    { rot: -32, x: 10, y: 25, label: "broken_links.db", color: "bg-blue-500/20" },
                    { rot: 14, x: -15, y: 15, label: "unsynced_tasks.json", color: "bg-purple-500/20" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        rotate: item.rot,
                        x: item.x,
                        y: item.y,
                      }}
                      className={`absolute px-3 py-2 rounded-xl border border-white/20 backdrop-blur-md text-[10px] font-mono text-white/80 shadow-lg ${item.color}`}
                    >
                      {item.label}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Center Flow Arrow */}
              <div className="flex flex-col items-center justify-center gap-1 shrink-0 text-[#FFA07A]">
                <div className="p-3 rounded-full bg-white/10 border border-white/20 shadow-lg">
                  <ArrowRight size={20} className="animate-pulse" />
                </div>
                <span className="text-[10px] font-mono text-white/50">Auto-Ingest</span>
              </div>

              {/* Right Side: Clean 3D Organized Spaces */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-xl relative overflow-hidden">
                <div className="text-center mb-4">
                  <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
                    With Noska Core
                  </span>
                  <h3 className="text-sm font-semibold text-white mt-0.5">
                    Structured Smart Vaults & Spaces
                  </h3>
                </div>

                {/* Clean Floating 3D Folders */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                  {[
                    { title: "AI Thoughts", count: "142 pages", color: "from-blue-500 to-indigo-600" },
                    { title: "Encrypted Vault", count: "AES-256", color: "from-amber-500 to-orange-600" },
                    { title: "Spatial Graph", count: "Real-time", color: "from-emerald-500 to-teal-600" },
                    { title: "Offline Cache", count: "Zero-latency", color: "from-purple-500 to-pink-600" },
                  ].map((f, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.04 }}
                      className="p-3 rounded-2xl bg-white/[0.08] border border-white/15 backdrop-blur-md shadow-md flex items-center gap-2.5"
                    >
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${f.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                        <Folder size={15} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-white truncate">{f.title}</span>
                        <span className="text-[10px] text-white/60 truncate">{f.count}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= TAB: VAULT DECK / MODULES ================= */}
          {phase === "ingesting" && activeTab === "modules" && (
            <motion.div
              key="modules-stage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full h-full max-w-4xl overflow-y-auto px-4 py-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {NOSKA_MODULES.map((mod, i) => {
                  const Icon = mod.icon;
                  const isIngested = ingestedIndices.includes(i);

                  return (
                    <div
                      key={mod.id}
                      className="p-4 rounded-2xl bg-white/[0.07] border border-white/15 backdrop-blur-xl hover:bg-white/[0.12] transition-all flex flex-col justify-between shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                            style={{ background: mod.bgGradient }}
                          >
                            <Icon size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-white">{mod.title}</h4>
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono text-white/70">
                                {mod.badge}
                              </span>
                            </div>
                            <p className="text-[10px] text-white/60 mt-0.5">{mod.subtitle}</p>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-[#FFE0D6] font-semibold">
                          {mod.size}
                        </span>
                      </div>

                      <p className="text-[11px] text-white/75 mt-3 leading-relaxed">
                        {mod.description}
                      </p>

                      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                        <span className="text-white/50">{mod.versionPatch}</span>
                        {isIngested ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Ready
                          </span>
                        ) : (
                          <span className="text-amber-300 font-medium flex items-center gap-1">
                            <RotateCw size={11} className="animate-spin" /> Pending Ingest
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ================= TAB: CHANGELOG ================= */}
          {phase === "ingesting" && activeTab === "changelog" && (
            <motion.div
              key="changelog-stage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full h-full max-w-3xl overflow-y-auto px-4 py-2 space-y-4"
            >
              <div className="p-5 rounded-2xl bg-white/[0.08] border border-white/15 backdrop-blur-xl">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-[#FFA07A]" />
                  Noska Desktop Release Notes — v{targetVersion}
                </h3>
                <p className="text-xs text-white/70 mt-1">
                  Optimized native binary package with 3D folder ingestion, GPU-accelerated spatial canvas, and zero-latency local SQLite sync.
                </p>

                <div className="mt-4 space-y-2">
                  {[
                    "Ultra-smooth 3D folder download & ingestion physics",
                    "Hardware-accelerated AES-GCM 256 cryptographic vault",
                    "Claude 3.7 & GPT-4o multi-agent inline copilot",
                    "CRDT bi-directional offline synchronization engine",
                    "Minisign cryptographic signature verification",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-white/80">
                      <span className="text-[#FFA07A]">•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Progress & Action Dock (Visible during Ingestion) */}
      {phase === "ingesting" && (
        <footer className="relative z-30 px-8 py-4 border-t border-white/10 bg-black/40 backdrop-blur-2xl">
          <div className="flex flex-col gap-2.5 max-w-4xl mx-auto w-full">
            {/* Speed, Stage, & Percentage */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-white/90">
                {isProcessing ? (
                  <>
                    <RotateCw size={13} className="animate-spin text-[#FFA07A]" />
                    <span className="font-medium">
                      Downloading & Packing Modules into Noska Vault...
                    </span>
                  </>
                ) : (
                  <span className="text-white/70">Ready to begin download</span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                {isProcessing && (
                  <span className="text-white/60 hidden sm:inline">{transferSpeed}</span>
                )}
                <span className="font-bold text-[#FFE0D6]">{progress}%</span>
              </div>
            </div>

            {/* Glowing Apple-style Progress Bar */}
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/15 shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#FF5722] via-[#FFA07A] to-[#FFE0B2] shadow-[0_0_15px_rgba(255,160,122,0.9)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.25 }}
              />
            </div>

            {/* Bottom Actions & Verification Meta */}
            <div className="flex items-center justify-between pt-0.5">
              <p className="text-[10px] text-white/50">
                Cryptographically signed with Minisign ECDSA · Local SQLite Engine
              </p>

              <div className="flex items-center gap-2">
                {!isProcessing && (
                  <button
                    onClick={handleStartProcess}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white text-neutral-900 text-xs font-bold shadow-md hover:bg-[#FFEBE3] transition-all cursor-pointer active:scale-95"
                  >
                    <DownloadCloud size={13} />
                    <span>Start Download</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setProgress(100);
                    handleDownloadFinished();
                  }}
                  className="text-[11px] text-white/40 hover:text-white/80 transition-colors px-2 py-1 cursor-pointer"
                >
                  Skip to finish
                </button>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Quick Module Detail Modal on Click */}
      <AnimatePresence>
        {selectedModule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md p-6 rounded-3xl bg-[#181A22] border border-white/20 text-white shadow-2xl"
            >
              <button
                onClick={() => setSelectedModule(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70"
              >
                <X size={14} />
              </button>

              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ background: selectedModule.bgGradient }}
                >
                  <selectedModule.icon size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedModule.title}</h3>
                  <span className="text-xs text-white/60">{selectedModule.category} · {selectedModule.size}</span>
                </div>
              </div>

              <p className="text-xs text-white/80 mt-4 leading-relaxed">
                {selectedModule.description}
              </p>

              <div className="mt-4 pt-3 border-t border-white/10">
                <h4 className="text-[11px] font-semibold text-[#FFA07A] uppercase tracking-wider">Features</h4>
                <ul className="mt-2 space-y-1 text-xs text-white/70">
                  {selectedModule.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FolderDownIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <path d="M12 10v6" />
      <path d="m9 13 3 3 3-3" />
    </svg>
  );
}
