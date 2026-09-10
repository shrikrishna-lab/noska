"use client";

import React, { useRef } from "react";
import { LazyMotion, domAnimation, m } from "motion/react";

export type ColorTheme = "sage" | "coral" | "lavender" | "amber" | "orange" | "blue" | "purple";

export interface Step {
  title: string;
  description: string;
  colorTheme?: ColorTheme;
  preview?: React.ReactNode;
  colors?: {
    bg: string;
    text: string;
    border: string;
  };
}

export interface StepPosition {
  className?: string;
  rotate?: string;
}

export interface HowItWorksProps {
  features?: Step[];
  className?: string;
  stepPositions?: StepPosition[];
}

interface CardProps {
  number: string;
  title: string;
  description: string;
  colorTheme?: ColorTheme;
  className?: string;
  rotate?: string;
  preview?: React.ReactNode;
  colors?: {
    bg: string;
    text: string;
    border: string;
  };
}

const Pin = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M16 3a1 1 0 0 1 .117 1.993l-.117 .007v4.764l1.894 3.789a1 1 0 0 1 .1 .331l.006 .116v2a1 1 0 0 1 -.883 .993l-.117 .007h-4v4a1 1 0 0 1 -1.993 .117l-.007 -.117v-4h-4a1 1 0 0 1 -.993 -.883l-.007 -.117v-2a1 1 0 0 1 .06 -.34l.046 -.107l1.894 -3.791v-4.762a1 1 0 0 1 -.117 -1.993l.117 -.007h8z" />
  </svg>
);

const Card = ({
  number,
  title,
  description,
  colorTheme = "sage",
  className = "",
  rotate = "",
  preview,
  colors: customColors,
}: CardProps) => {
  const defaultBgColors: Record<ColorTheme, string> = {
    sage: "bg-gradient-to-b from-[#edf5ef] to-[#dceade] border-[#5b8266]/30 dark:bg-[#5b8266]/15 dark:border-[#5b8266]/30",
    coral: "bg-gradient-to-b from-[#fdeee9] to-[#fcded5] border-[#f48574]/30 dark:bg-[#f48574]/15 dark:border-[#f48574]/30",
    lavender: "bg-gradient-to-b from-[#f3e8ff] to-[#e9d5ff] border-[#c084fc]/30 dark:bg-[#c084fc]/15 dark:border-[#c084fc]/30",
    amber: "bg-gradient-to-b from-[#fef3c7] to-[#fde68a] border-[#f59e0b]/30 dark:bg-[#f59e0b]/15 dark:border-[#f59e0b]/30",
    orange: "bg-gradient-to-b from-[#fff7ed] to-[#ffedd5] border-[#fed7aa] dark:bg-orange-500/10 dark:border-orange-500/20",
    blue: "bg-gradient-to-b from-[#f0f9ff] to-[#e0f2fe] border-[#bae6fd] dark:bg-blue-500/10 dark:border-blue-500/20",
    purple: "bg-gradient-to-b from-[#f5eeff] to-[#eddffc] border-[#d8b4fe] dark:bg-purple-500/10 dark:border-purple-500/20",
  };

  const defaultTextColors: Record<ColorTheme, string> = {
    sage: "text-[#2d4d36] dark:text-[#88b996]",
    coral: "text-[#9c382b] dark:text-[#f89e90]",
    lavender: "text-[#6b21a8] dark:text-[#c084fc]",
    amber: "text-[#78350f] dark:text-[#fbbf24]",
    orange: "text-[#ea580c] dark:text-orange-400",
    blue: "text-[#0284c7] dark:text-blue-400",
    purple: "text-[#7c3aed] dark:text-purple-400",
  };

  const defaultPinColors: Record<ColorTheme, string> = {
    sage: "text-[#3d6148] dark:text-[#5b8266]",
    coral: "text-[#f48574] dark:text-[#f48574]",
    lavender: "text-[#7c3aed] dark:text-[#a855f7]",
    amber: "text-[#d97706] dark:text-[#f59e0b]",
    orange: "text-[#f97316] dark:text-[#fb923c]",
    blue: "text-[#2563eb] dark:text-[#60a5fa]",
    purple: "text-[#9333ea] dark:text-[#c084fc]",
  };

  const bgStyle = customColors?.bg || defaultBgColors[colorTheme] || defaultBgColors.sage;
  const textColor = customColors?.text || defaultTextColors[colorTheme] || defaultTextColors.sage;
  const pinColor = defaultPinColors[colorTheme] || defaultPinColors.sage;

  return (
    <m.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      whileHover={{ scale: 1.04, rotate: "0deg", zIndex: 40 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 24,
        mass: 0.8,
      }}
      className={`relative w-full md:w-[310px] cursor-pointer ${rotate} ${className}`}
    >
      <div className="bg-white dark:bg-neutral-900 p-2.5 sm:p-3 rounded-[24px] shadow-[0_12px_28px_rgba(0,0,0,0.06),2px_2px_0px_#000000] dark:shadow-none border-2 border-black dark:border-neutral-800 transition-all duration-300 hover:shadow-[0_18px_40px_rgba(0,0,0,0.12),3px_3px_0px_#000000]">
        {/* Top Centered Push Pin */}
        <div className="flex justify-center mb-3 -mt-0.5">
          <Pin className={`w-8 h-8 ${pinColor} filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)]`} />
        </div>

        {/* Inner Card Container */}
        <div className={`${bgStyle} border rounded-[16px] p-4 sm:p-5 h-full flex flex-col relative overflow-hidden`}>
          {/* Accent Number */}
          <div className="flex items-center justify-between mb-2">
            <span
              className={`${textColor} text-3xl sm:text-4xl font-black leading-none`}
              style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
            >
              {number}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 border border-black/10 dark:border-white/10">
              Noska Flow
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-snug mb-1.5">
            {title}
          </h3>

          {/* Description */}
          <p className="text-neutral-600 dark:text-neutral-400 text-[13px] leading-relaxed tracking-tight mb-3">
            {description}
          </p>

          {/* Real Feature Micro-UI Demonstration */}
          {preview && (
            <div className="mt-auto pt-2.5 border-t border-black/10 dark:border-white/10">
              {preview}
            </div>
          )}
        </div>
      </div>
    </m.div>
  );
};

const DEFAULT_CARD_POSITIONS: StepPosition[] = [
  { className: "md:absolute md:top-0 md:left-[10%]", rotate: "rotate-5" },
  {
    className: "md:absolute md:top-[160px] md:right-[10%]",
    rotate: "-rotate-5",
  },
  { className: "md:absolute md:top-[560px] md:left-[8%]", rotate: "rotate-5" },
  {
    className: "md:absolute md:top-[720px] md:right-[8%]",
    rotate: "-rotate-5",
  },
  { className: "md:absolute md:top-[1120px] md:left-[10%]", rotate: "rotate-5" },
];

export default function HowItWorks({
  features,
  className = "",
  stepPositions,
}: HowItWorksProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Default steps with authentic real-world Noska Flow voice-to-text workflows
  const defaultFeatures: Step[] = [
    {
      title: "Hold Your Global Hotkey",
      description:
        "Hold your chosen trigger key in any app (Slack, VSCode, Chrome, Notes) to summon the floating voice pill.",
      colorTheme: "sage",
      preview: (
        <div className="space-y-2 bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono px-2 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black font-bold text-[11px] shadow-sm">
              ⌥ Option
            </span>
            <span className="text-[11px] font-semibold text-[#2d4d36] dark:text-[#88b996] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Global Overlay Active
            </span>
          </div>
          {/* Animated soundwave pill */}
          <div className="flex items-center justify-center gap-1 py-1 px-3 bg-neutral-900 text-white rounded-full text-[11px] font-medium shadow-inner">
            <span className="text-emerald-400">🎙️</span>
            <span>Listening...</span>
            <div className="flex items-center gap-0.5 ml-1">
              {[8, 14, 20, 12, 18, 10].map((h, i) => (
                <m.span
                  key={i}
                  animate={{ height: [4, h, 4] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                  className="w-0.5 bg-emerald-400 rounded-full"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Speak at 200+ WPM Naturally",
      description:
        "Talk fast with natural pauses and stutters. Noska removes 'um/ah', adds punctuation, and structures thoughts.",
      colorTheme: "coral",
      preview: (
        <div className="space-y-1.5 bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-black/10 dark:border-white/10 text-[11px]">
          <div className="text-neutral-400 line-through truncate">
            "um so basically we need to like..."
          </div>
          <div className="font-medium text-[#9c382b] dark:text-[#f89e90] bg-[#fdeee9] dark:bg-[#9c382b]/20 p-1.5 rounded-lg border border-[#f48574]/30">
            ✓ "We need to deploy the v2 release tomorrow morning."
          </div>
          <div className="text-[10px] text-neutral-500 text-right">
            ⚡ Disfluencies Stripped (0ms)
          </div>
        </div>
      ),
    },
    {
      title: "Real-Time Voice Commands",
      description:
        "Say 'scratch that', 'format as list', or 'translate to Spanish' without touching your mouse or keyboard.",
      colorTheme: "lavender",
      preview: (
        <div className="space-y-1.5 bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-black/10 dark:border-white/10 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              🗣️ "Scratch last sentence"
            </span>
            <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded">
              Undo
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              🗣️ "Make it a bullet point"
            </span>
            <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded">
              Format
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Instant Tone Formatting",
      description:
        "Select your desired tone to automatically rewrite casual speech into formal email, executive brief, or code.",
      colorTheme: "amber",
      preview: (
        <div className="space-y-2 bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-black/10 dark:border-white/10">
          <div className="grid grid-cols-2 gap-1 text-[10.5px]">
            <span className="px-2 py-1 rounded bg-[#fef3c7] dark:bg-[#78350f]/30 text-[#78350f] dark:text-[#fbbf24] font-bold border border-[#f59e0b]/30 text-center">
              👔 Formal
            </span>
            <span className="px-2 py-1 rounded bg-black/5 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 font-medium text-center">
              💬 Casual
            </span>
            <span className="px-2 py-1 rounded bg-black/5 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 font-medium text-center">
              💼 Executive
            </span>
            <span className="px-2 py-1 rounded bg-black/5 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 font-medium text-center">
              ⚡ Technical
            </span>
          </div>
          <div className="text-[10px] text-center text-amber-700 dark:text-amber-400 font-semibold">
            ✨ Auto-restructures to selected tone
          </div>
        </div>
      ),
    },
    {
      title: "100% On-Device Whisper & Paste",
      description:
        "Zero cloud latency, complete offline privacy, and instant text paste directly at your active cursor.",
      colorTheme: "sage",
      preview: (
        <div className="space-y-1.5 bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-black/10 dark:border-white/10 text-[11px]">
          <div className="flex items-center justify-between text-[#2d4d36] dark:text-[#88b996] font-bold">
            <span>🔒 Local Neural Engine</span>
            <span className="bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded text-[10px]">
              0.2s Latency
            </span>
          </div>
          <div className="text-neutral-700 dark:text-neutral-300 text-[10.5px] bg-white dark:bg-black/50 p-1.5 rounded border border-black/5 font-mono">
            Direct paste: Cursor @ Active Window
          </div>
        </div>
      ),
    },
  ];

  const data = features && features.length > 0 ? features : defaultFeatures;
  const positions = stepPositions || DEFAULT_CARD_POSITIONS;

  const height = data.length > 4 ? 1480 : data.length * 280 + 160;

  return (
    <LazyMotion features={domAnimation}>
      <div
        ref={containerRef}
        className={`bg-[#faf9f0] dark:bg-black text-neutral-900 dark:text-neutral-100 py-16 md:py-24 px-4 sm:px-8 relative overflow-hidden select-none ${className}`}
      >
        {/* Subtle Horizontal Grid Texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06] dark:opacity-[0.12]"
          style={{
            backgroundImage: "linear-gradient(#000 1px, transparent 1px)",
            backgroundSize: "100% 36px",
            marginTop: "4px",
          }}
        />

        {/* Ambient Pastel Glow Vignettes */}
        <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-[#5b8266]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-[450px] h-[450px] bg-[#f48574]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] bg-[#c084fc]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Edge Fade Gradients */}
        <div className="from-[#faf9f0] dark:from-black pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r to-transparent z-10" />
        <div className="from-[#faf9f0] dark:from-black pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l to-transparent z-10" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div
            className="relative w-full max-w-[1020px] mx-auto flex flex-col space-y-8 md:space-y-0 md:block h-auto md:h-[var(--md-height)]"
            style={{ "--md-height": `${height}px` } as React.CSSProperties}
          >
            {/* Animated Connecting Dashed Straight SVG Path */}
            {data.length > 1 && (
              <svg
                className="absolute top-0 left-0 w-full h-full pointer-events-none hidden md:block z-0"
                viewBox={`0 0 1020 ${height}`}
                preserveAspectRatio="none"
              >
                {(() => {
                  const defaultCenters = [
                    { x: 260, y: 170 },
                    { x: 760, y: 330 },
                    { x: 240, y: 730 },
                    { x: 780, y: 890 },
                    { x: 260, y: 1290 },
                  ];

                  const pathD = data.reduce((acc, _, index) => {
                    if (index >= data.length - 1) return acc;
                    const p1 = defaultCenters[index] || { x: index % 2 === 0 ? 260 : 760, y: 170 + index * 260 };
                    const p2 = defaultCenters[index + 1] || { x: (index + 1) % 2 === 0 ? 260 : 760, y: 170 + (index + 1) * 260 };
                    
                    if (index === 0) {
                      return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
                    }
                    return `${acc} L ${p2.x} ${p2.y}`;
                  }, "");

                  return (
                    <g>
                      {/* Base Subtle Trace Line */}
                      <path
                        d={pathD}
                        className="stroke-neutral-300/40 dark:stroke-neutral-800"
                        strokeWidth="2"
                        strokeDasharray="8 6"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />

                      {/* Active Flowing / Moving Dashed Animation */}
                      <m.path
                        d={pathD}
                        className="stroke-neutral-500 dark:stroke-neutral-400"
                        strokeWidth="2.5"
                        strokeDasharray="10 8"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        initial={{ strokeDashoffset: 0 }}
                        animate={{
                          strokeDashoffset: -144,
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </g>
                  );
                })()}
              </svg>
            )}

            {/* Positioned Floating Cards */}
            {data.map((step, index) => {
              const position = positions[index % positions.length];
              const defaultThemes: ColorTheme[] = ["sage", "coral", "lavender", "amber", "sage"];

              return (
                <Card
                  key={step.title}
                  number={`0${index + 1}`}
                  title={step.title}
                  description={step.description}
                  colorTheme={step.colorTheme || defaultThemes[index % defaultThemes.length]}
                  colors={step.colors}
                  preview={step.preview}
                  rotate={position.rotate}
                  className={position.className}
                />
              );
            })}
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}


