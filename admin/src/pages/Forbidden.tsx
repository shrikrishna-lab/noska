import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowLeft,
  Volume2,
  VolumeX,
  ShieldAlert,
  ShieldCheck,
  LayoutDashboard,
  KeyRound,
  Copy,
  Check,
  Send,
  Lock,
  Compass,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS, ROLE_WORKFLOWS, type AdminRole, type AdminCapability } from "@/lib/rbac";
import { requiredCapabilityForPath } from "@/lib/navigation";
import toast from "react-hot-toast";
import sunsetMeadowBg from "@/assets/sunset_meadow_bg.jpg";
import forbiddenVideo from "@/assets/403.mp4";

// Ambient Sakura Chime Synthesizer using Web Audio API
class SakuraAudio {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private interval: number | null = null;

  private init() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playChime(freq: number, duration = 2.0) {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  startAmbientMelody() {
    this.init();
    this.isPlaying = true;
    const pentatonicNotes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

    this.playChime(pentatonicNotes[0], 2.5);

    this.interval = window.setInterval(() => {
      if (!this.isPlaying) return;
      const note = pentatonicNotes[Math.floor(Math.random() * pentatonicNotes.length)];
      this.playChime(note, 2.2);
    }, 2800);
  }

  stopAmbientMelody() {
    this.isPlaying = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

const sakuraAudio = new SakuraAudio();

// Floating Sakura Blossom Petals & Light Motes Canvas
function FloatingSakuraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      type: "petal" | "mote";
      alpha: number;
      angle: number;
      angleSpeed: number;
    }> = [];

    for (let i = 0; i < 48; i++) {
      const type = i % 4 === 0 ? "mote" : "petal";
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.2) * 0.6 + 0.25,
        vy: -Math.random() * 0.45 - 0.2,
        size: type === "petal" ? Math.random() * 6 + 3.5 : Math.random() * 2.5 + 1.2,
        type,
        alpha: Math.random() * 0.65 + 0.35,
        angle: Math.random() * Math.PI * 2,
        angleSpeed: (Math.random() - 0.5) * 0.03,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.angle += p.angleSpeed;
        p.x += p.vx + Math.sin(p.angle) * 0.5;
        p.y += p.vy;

        if (p.y < -20) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
        if (p.x > width + 20) p.x = -20;
        if (p.x < -20) p.x = width + 20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.alpha;

        if (p.type === "petal") {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fillStyle = p.size > 5.5 ? "#f472b6" : "#fbcfe8";
          ctx.shadowBlur = 8;
          ctx.shadowColor = "#f472b6";
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = "#fed7aa";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#f59e0b";
          ctx.fill();
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 opacity-85"
    />
  );
}

// Smooth aesthetic role color themes
const ROLE_SMOOTH_STYLES: Record<string, { bg: string; border: string; text: string; dot: string; glow: string }> = {
  super_admin: {
    bg: "bg-purple-500/15",
    border: "border-purple-400/30",
    text: "text-purple-200",
    dot: "bg-purple-400",
    glow: "shadow-[0_0_15px_rgba(192,132,252,0.25)]",
  },
  admin: {
    bg: "bg-sky-500/15",
    border: "border-sky-400/30",
    text: "text-sky-200",
    dot: "bg-sky-400",
    glow: "shadow-[0_0_15px_rgba(56,189,248,0.25)]",
  },
  developer: {
    bg: "bg-emerald-500/15",
    border: "border-emerald-400/30",
    text: "text-emerald-200",
    dot: "bg-emerald-400",
    glow: "shadow-[0_0_15px_rgba(52,211,153,0.25)]",
  },
  support: {
    bg: "bg-amber-500/15",
    border: "border-amber-400/30",
    text: "text-amber-200",
    dot: "bg-amber-400",
    glow: "shadow-[0_0_15px_rgba(251,191,36,0.25)]",
  },
  marketing: {
    bg: "bg-rose-500/15",
    border: "border-rose-400/30",
    text: "text-rose-200",
    dot: "bg-rose-400",
    glow: "shadow-[0_0_15px_rgba(251,113,133,0.25)]",
  },
  guest: {
    bg: "bg-white/10",
    border: "border-white/20",
    text: "text-neutral-200",
    dot: "bg-white/70",
    glow: "shadow-[0_0_12px_rgba(255,255,255,0.1)]",
  },
};

export function Forbidden() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Real role fetched from the database session via useAuth()
  const roleLabel = user?.role
    ? ROLE_LABELS[user.role as AdminRole] || user.role
    : "Guest / Not Signed In";

  const roleStyle = user?.role
    ? ROLE_SMOOTH_STYLES[user.role] || ROLE_SMOOTH_STYLES.guest
    : ROLE_SMOOTH_STYLES.guest;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black flex flex-col justify-between items-center select-none">
      {/* 403.mp4 Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        poster={sunsetMeadowBg}
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
      >
        <source src={forbiddenVideo} type="video/mp4" />
        <source src="/403.mp4" type="video/mp4" />
      </video>

      {/* Subtle Cinematic Ambient Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/50 backdrop-blur-[0.3px]" />

      {/* Floating Canvas Particles */}
      <FloatingSakuraCanvas />

      {/* Empty spacer for clean vertical balance */}
      <div className="h-12 w-full" />

      {/* Center Minimalist Floating Hero Typography */}
      <main className="relative z-20 flex flex-col items-center justify-center text-center px-4 max-w-xl my-auto">
        {/* Soft Radial Ambient Glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.5)_0%,transparent_75%)] scale-150 blur-xl" />

        {/* Minimal Shield Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-lg"
        >
          <ShieldAlert className="h-7 w-7 text-white" />
        </motion.div>

        {/* 403 Crisp Pure White Title */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight text-white drop-shadow-[0_12px_30px_rgba(0,0,0,0.9)]"
        >
          403
        </motion.h1>

        {/* Clean Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-1 text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
        >
          You can't access this area
        </motion.h2>

        {/* Subtitle Message */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-2.5 text-xs sm:text-sm font-normal text-white/80 max-w-md drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] leading-relaxed"
        >
          This feature isn't available for your role. Only administrators with the right permission can open it.
        </motion.p>
      </main>

      {/* Bottom Floating Minimalist Aesthetic Dock */}
      <footer className="relative z-30 w-full flex justify-center px-4 pb-8 sm:pb-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-3 rounded-full border border-white/20 bg-black/40 px-4 py-2.5 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
        >
          {/* Smooth Color Role Tag */}
          <div
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-md transition-all ${roleStyle.bg} ${roleStyle.border} ${roleStyle.text} ${roleStyle.glow}`}
          >
            <span className={`flex h-1.5 w-1.5 rounded-full ${roleStyle.dot} animate-pulse`} />
            <span>Role: <strong className="font-semibold text-white">{roleLabel}</strong></span>
          </div>

          <div className="hidden sm:block h-5 w-px bg-white/20" />

          {/* Clean White Dashboard Button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 rounded-full bg-white hover:bg-neutral-100 px-5 py-2 text-xs sm:text-sm font-semibold text-black shadow-md transition-all hover:scale-[1.03] active:scale-[0.98]"
          >
            <LayoutDashboard className="h-4 w-4 text-black" />
            Go to Dashboard
          </button>

          {/* Clean Translucent Go Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2 text-xs sm:text-sm font-medium text-white backdrop-blur-xl transition-all hover:scale-[1.03] active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </motion.div>
      </footer>
    </div>
  );
}






