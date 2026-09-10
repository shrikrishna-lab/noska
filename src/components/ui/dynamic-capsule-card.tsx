import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftRight, Check, Plane, Sparkles, X } from "lucide-react";

const showNotification = (msg: string) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("noska:toast", { detail: msg }));
  }
};

export interface DynamicCapsuleCardProps {
  id?: string;
  routeFrom?: string; // "YYZ"
  routeTo?: string; // "HND"
  routeFromLabel?: string; // "Toronto"
  routeToLabel?: string; // "Tokyo"
  timeFrom?: string; // "MON, 6:14 PM"
  timeTo?: string; // "TUE, 7:14 AM"
  etaLabel?: string; // "ETA 2:15 PM"
  etaSub?: string; // "Tokyo Time"
  timerLabel?: string; // "DINNER IN 2:34H"
  sliderLabel?: string; // "-7H 01M"
  accentGlow?: "lime" | "cyan" | "amber" | "rose";
  actionUrl?: string;
  isClaimed?: boolean;
  onClaim?: () => void;
  onDismiss?: () => void;
  className?: string;
}

// 5x7 LED Dot Matrix Character Definitions for true hardware matrix LED display (Image 2)
const DOT_FONT: Record<string, number[]> = {
  A: [0x0c, 0x12, 0x12, 0x1e, 0x12, 0x12, 0x12],
  B: [0x1c, 0x12, 0x12, 0x1c, 0x12, 0x12, 0x1c],
  C: [0x0e, 0x10, 0x10, 0x10, 0x10, 0x10, 0x0e],
  D: [0x1c, 0x12, 0x12, 0x12, 0x12, 0x12, 0x1c],
  E: [0x1e, 0x10, 0x10, 0x1c, 0x10, 0x10, 0x1e],
  F: [0x1e, 0x10, 0x10, 0x1c, 0x10, 0x10, 0x10],
  G: [0x0e, 0x10, 0x10, 0x13, 0x12, 0x12, 0x0d],
  H: [0x12, 0x12, 0x12, 0x1e, 0x12, 0x12, 0x12],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x12, 0x14, 0x18, 0x10, 0x18, 0x14, 0x12],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1e],
  M: [0x11, 0x1b, 0x15, 0x11, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x13, 0x15, 0x19, 0x11, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1e, 0x01, 0x02, 0x0c, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
};

function DotMatrixText({ text }: { text: string }) {
  const chars = text.toUpperCase().slice(0, 4).split("");
  const dotRadius = 1.35;
  const colSpacing = 3.6;
  const rowSpacing = 3.6;
  const charSpacing = 22;

  const totalWidth = chars.length * charSpacing;
  const totalHeight = 28;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="h-8 w-auto inline-block"
      style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.8))" }}
    >
      {chars.map((char, charIdx) => {
        const rows = DOT_FONT[char] || DOT_FONT[" "];
        const charOffsetX = charIdx * charSpacing + 1;

        return (
          <g key={charIdx}>
            {rows.map((rowVal, rowIdx) => {
              const y = rowIdx * rowSpacing + 3;
              return [0, 1, 2, 3, 4].map((colIdx) => {
                const bit = (rowVal >> (4 - colIdx)) & 1;
                if (!bit) return null;
                const x = charOffsetX + colIdx * colSpacing;
                return (
                  <circle
                    key={`${rowIdx}-${colIdx}`}
                    cx={x}
                    cy={y}
                    r={dotRadius}
                    fill="#ffffff"
                  />
                );
              });
            })}
          </g>
        );
      })}
    </svg>
  );
}

const GLOW_THEMES = {
  lime: {
    pill: "from-[#bbf246] to-[#84cc16]",
    glow: "shadow-[0_0_24px_rgba(163,230,53,0.7),inset_0_1px_1px_rgba(255,255,255,0.7)]",
    dot: "#84cc16",
    timerColor: "text-[#ff9500]",
  },
  cyan: {
    pill: "from-[#38bdf8] to-[#0284c7]",
    glow: "shadow-[0_0_24px_rgba(2,132,199,0.7),inset_0_1px_1px_rgba(255,255,255,0.7)]",
    dot: "#0284c7",
    timerColor: "text-sky-400",
  },
  amber: {
    pill: "from-[#fcd34d] to-[#f59e0b]",
    glow: "shadow-[0_0_24px_rgba(245,158,11,0.7),inset_0_1px_1px_rgba(255,255,255,0.7)]",
    dot: "#f59e0b",
    timerColor: "text-amber-400",
  },
  rose: {
    pill: "from-[#fda4af] to-[#f43f5e]",
    glow: "shadow-[0_0_24px_rgba(244,63,94,0.7),inset_0_1px_1px_rgba(255,255,255,0.7)]",
    dot: "#f43f5e",
    timerColor: "text-rose-400",
  },
};

export function DynamicCapsuleCard({
  id = "flight-capsule",
  routeFrom = "YYZ",
  routeTo = "HND",
  routeFromLabel = "Toronto",
  routeToLabel = "Tokyo",
  timeFrom = "MON, 6:14 PM",
  timeTo = "TUE, 7:14 AM",
  etaLabel = "ETA 2:15 PM",
  etaSub = "Tokyo Time",
  timerLabel = "DINNER IN 2:34H",
  sliderLabel = "-7H 01M",
  accentGlow = "lime",
  actionUrl = "/dashboard",
  isClaimed = false,
  onClaim,
  onDismiss,
  className = "",
}: DynamicCapsuleCardProps) {
  const [claimed, setClaimed] = useState(isClaimed);
  const theme = GLOW_THEMES[accentGlow] || GLOW_THEMES.lime;
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [maxDrag, setMaxDrag] = useState(130);

  React.useEffect(() => {
    const updateWidth = () => {
      if (trackRef.current) {
        const trackWidth = trackRef.current.clientWidth;
        setMaxDrag(Math.max(50, trackWidth - 52));
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const handleSlideComplete = () => {
    if (claimed) return;
    setClaimed(true);
    onClaim?.();
    showNotification("🚀 Flight Perk Claimed! Priority boarding unlocked.");
  };

  const promptText =
    !sliderLabel || /^[-0-9H\sM]+$/.test(sliderLabel)
      ? "Slide to Claim"
      : sliderLabel.toLowerCase().startsWith("slide")
      ? sliderLabel
      : `Slide to ${sliderLabel}`;

  return (
    <div
      className={`relative w-full select-none transition-all duration-300 ${className}`}
      data-testid="dynamic-capsule-card"
    >
      {/* Dark Outer Container with tactile dot matrix grid in top-left */}
      <div
        className="relative overflow-hidden rounded-[20px] bg-[#121316] border border-white/[0.08] p-3 text-white shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255, 255, 255, 0.12) 1.2px, transparent 1.2px)",
          backgroundSize: "8px 8px",
          backgroundPosition: "0 0",
        }}
      >
        {/* Soft radial mask over background grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 30%, transparent 20%, #121316 85%)",
          }}
        />

        {/* Top Header Row */}
        <div className="relative z-10 flex items-start justify-between gap-2 mb-2.5">
          {/* Left: LED Dot Matrix Airport Route */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <DotMatrixText text={routeFrom} />
              <span className="text-[#ff9500] text-sm font-bold px-0.5 select-none leading-none">
                ➔
              </span>
              <DotMatrixText text={routeTo} />
            </div>

            {/* City Names & Timing Subtitles */}
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              <div>
                <div className="text-[11px] font-semibold text-white truncate">
                  {routeFromLabel}
                </div>
                <div className="text-[9.5px] text-[#8e929a] font-sans font-medium mt-0.5 truncate">
                  {timeFrom}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-white truncate">
                  {routeToLabel}
                </div>
                <div className="text-[9.5px] text-[#8e929a] font-sans font-medium mt-0.5 truncate">
                  {timeTo}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Inset Dark Rounded Box */}
          <div className="bg-[#1c1d22] border border-white/5 rounded-xl p-1.5 px-2 min-w-[84px] text-left shrink-0 shadow-sm">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-bold text-white tracking-tight">
                {etaLabel}
              </span>
              {onDismiss ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                  }}
                  className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
                  title="Dismiss flight card"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              ) : (
                <div className="w-3.5 h-3.5 rounded-full bg-white/10 flex items-center justify-center text-white/80">
                  <ArrowLeftRight className="w-2 h-2" />
                </div>
              )}
            </div>

            <div className="text-[9px] text-[#7a7e87] font-medium mb-0.5 truncate">
              {etaSub}
            </div>

            <div
              className={`text-[9.5px] font-bold tracking-wide uppercase ${theme.timerColor}`}
            >
              {timerLabel}
            </div>
          </div>
        </div>

        {/* Bottom Section: Authentic Interactive Slide to Claim Slider */}
        <div className="relative z-10 mt-2.5">
          <div
            ref={trackRef}
            onClick={() => {
              if (!claimed) handleSlideComplete();
            }}
            className="relative h-10 w-full rounded-full bg-[#090a0d] border border-white/[0.08] p-1 flex items-center shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)] overflow-hidden cursor-pointer select-none"
          >
            {/* Background Shimmer Prompt Text (visible when unclaimed) */}
            {!claimed && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pl-11 pr-3">
                <span className="text-[10px] font-bold tracking-wider uppercase text-white/45 flex items-center gap-1.5 drop-shadow-xs">
                  <span>{promptText}</span>
                  <motion.span
                    animate={{ x: [0, 3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="text-white/70 text-xs leading-none"
                  >
                    ➔
                  </motion.span>
                </span>
              </div>
            )}

            {/* Draggable Glowing Handle / Pill */}
            <motion.div
              drag={!claimed ? "x" : false}
              dragConstraints={{ left: 0, right: maxDrag }}
              dragElastic={0.06}
              dragMomentum={false}
              onDrag={(_, info) => {
                if (info.offset.x >= maxDrag * 0.6) {
                  handleSlideComplete();
                }
              }}
              onDragEnd={(_, info) => {
                if (info.offset.x >= maxDrag * 0.55) {
                  handleSlideComplete();
                }
              }}
              animate={
                claimed
                  ? { x: 0, width: "100%" }
                  : { x: 0, width: "44px" }
              }
              whileHover={!claimed ? { scale: 1.05 } : {}}
              whileTap={!claimed ? { scale: 0.95 } : {}}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className={`h-8 rounded-full bg-gradient-to-r ${theme.pill} ${theme.glow} flex items-center justify-center cursor-grab active:cursor-grabbing relative z-10 transition-colors shadow-md shrink-0`}
            >
              {claimed ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="flex items-center gap-1.5 text-black font-extrabold text-[11px] tracking-wide uppercase px-3"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>CLAIMED • UNLOCKED</span>
                </motion.div>
              ) : (
                <div className="flex items-center justify-center">
                  <motion.div
                    animate={{ x: [0, 2, 0] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                  >
                    <Plane className="w-4 h-4 text-black fill-black rotate-45 shrink-0 drop-shadow-xs" />
                  </motion.div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
