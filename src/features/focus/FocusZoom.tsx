import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Clock,
} from "lucide-react";
import { IconButton } from "../../components/ui";
import { isDesktop, isMobile } from "../../platform";

// Synthesized sound helper using Web Audio API
class AudioSynth {
  ctx: AudioContext | null;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  isPlaying: boolean;
  volume: number;
  type: string; // brown, pink, lofi
  lofiAudio: HTMLAudioElement | null;

  constructor() {
    this.ctx = null;
    this.source = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.volume = 0.4;
    this.type = "brown"; // brown, pink, lofi
    this.lofiAudio = null;
  }

  initContext() {
    if (!this.ctx) {
      // Safari-only legacy prefix — not in standard lib.dom types, so
      // narrowly cast the window lookup rather than widening the whole
      // class to `any`.
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextCtor!();
    }
  }

  start(type: string) {
    this.initContext();
    this.stop();
    this.type = type;

    if (type === "lofi") {
      this.lofiAudio = new Audio("https://coderadio-admin.freecodecamp.org/radio/8010/radio.mp3");
      this.lofiAudio.crossOrigin = "anonymous";
      this.lofiAudio.volume = this.volume;
      this.lofiAudio.play().catch((err) => console.warn("Stream play blocked", err));
      this.isPlaying = true;
      return;
    }

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    if (type === "brown") {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Compensate volume
      }
    } else if (type === "pink") {
      let b0, b1, b2, b3, b4, b5, b6;
      b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11;
        b6 = white * 0.115926;
      }
    }

    this.source = this.ctx.createBufferSource();
    this.source.buffer = noiseBuffer;
    this.source.loop = true;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.volume;

    this.source.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);
    this.source.start(0);
    this.isPlaying = true;
  }

  stop() {
    if (this.lofiAudio) {
      this.lofiAudio.pause();
      this.lofiAudio = null;
    }
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {}
      this.source = null;
    }
    this.isPlaying = false;
  }

  setVolume(vol) {
    this.volume = vol;
    if (this.gainNode) {
      this.gainNode.gain.value = vol;
    }
    if (this.lofiAudio) {
      this.lofiAudio.volume = vol;
    }
  }
}

const synthInstance = new AudioSynth();

export default function FocusZoom({ block, onClose, onPatch }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const [text, setText] = useState(block.text || "");
  const [fontFamily, setFontFamily] = useState("serif"); // sans, serif, mono
  const [fontSize, setFontSize] = useState("md"); // sm, md, lg
  const [lineHeight, setLineHeight] = useState("normal"); // tight, normal, loose
  const [theme, setTheme] = useState("dark"); // dark, light, sepia, forest
  const [typewriterMode, setTypewriterMode] = useState(true);
  const [showControls, setShowControls] = useState(true);
  
  // Audio state
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [soundType, setSoundType] = useState("brown"); // brown (rain), pink (wind), lofi
  const [volume, setVolume] = useState(0.4);

  // Pomodoro state
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoSeconds, setPomoSeconds] = useState(1500); // 25 minutes
  const [pomoTotal, setPomoTotal] = useState(1500);
  const [pomoBreak, setPomoBreak] = useState(false);

  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Handle changes and patch on unmount/input
  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    onPatch({ text: val });

    if (typewriterMode) {
      setTimeout(alignCursorToCenter, 0);
    }
  };

  // Keep cursor centered
  const alignCursorToCenter = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    
    const { selectionStart } = ta;
    const textBeforeCursor = ta.value.substring(0, selectionStart);
    const lineCountBefore = textBeforeCursor.split("\n").length;
    
    const lineHeightPx = fontSize === "sm" ? 24 : fontSize === "md" ? 28 : 36;
    const cursorTop = lineCountBefore * lineHeightPx;
    
    const container = containerRef.current;
    if (container) {
      const targetScrollTop = cursorTop - container.clientHeight / 2 + lineHeightPx / 2;
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth"
      });
    }
  };

  // Audio control
  const toggleSound = () => {
    if (soundPlaying) {
      synthInstance.stop();
      setSoundPlaying(false);
    } else {
      synthInstance.start(soundType);
      setSoundPlaying(true);
    }
  };

  const changeSoundType = (type) => {
    setSoundType(type);
    if (soundPlaying) {
      synthInstance.start(type);
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    synthInstance.setVolume(vol);
  };

  // Pomodoro timer logic
  useEffect(() => {
    let interval = null;
    if (pomoActive && pomoSeconds > 0) {
      interval = setInterval(() => {
        setPomoSeconds((prev) => prev - 1);
      }, 1000);
    } else if (pomoSeconds === 0) {
      // Bell/Alarm notification
      try {
        const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioContextCtor!();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.value = 880; // A5 pitch
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.5);
      } catch (e) {}

      if (!pomoBreak) {
        // Switch to break
        setPomoBreak(true);
        setPomoSeconds(300); // 5 min break
        setPomoTotal(300);
      } else {
        // Reset
        setPomoBreak(false);
        setPomoSeconds(1500); // 25 min work
        setPomoTotal(1500);
      }
      setPomoActive(false);
    }
    return () => clearInterval(interval);
  }, [pomoActive, pomoSeconds, pomoBreak]);

  const togglePomo = () => setPomoActive(!pomoActive);
  const resetPomo = () => {
    setPomoActive(false);
    setPomoBreak(false);
    setPomoSeconds(1500);
    setPomoTotal(1500);
  };

  const formatPomoTime = () => {
    const m = Math.floor(pomoSeconds / 60);
    const s = pomoSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Auto-hide controls when user types / remains idle
  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (soundPlaying || pomoActive) {
        setShowControls(false);
      }
    }, 4000);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(controlsTimeoutRef.current);
      synthInstance.stop();
    };
  }, [soundPlaying, pomoActive]);

  // CSS themes setup
  const themeClasses = {
    dark: "bg-[#121212] text-[#e0e0e0] border-[#222]",
    light: "bg-[#fcfcfa] text-[#1a1a1a] border-[#e0e0e0]",
    sepia: "bg-[#f4ecd8] text-[#433422] border-[#ebdcb9]",
    forest: "bg-[#0b170c] text-[#d9e7d9] border-[#152e18]"
  };

  const fontClasses = {
    sans: "font-sans",
    serif: "font-serif",
    mono: "font-mono"
  };

  const sizeClasses = {
    sm: "text-sm md:text-base leading-normal",
    md: "text-base md:text-xl leading-relaxed",
    lg: "text-lg md:text-2xl leading-loose"
  };

  const pomoProgress = ((pomoTotal - pomoSeconds) / pomoTotal) * 282.6; // SVG circle circumference

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`fixed inset-x-0 bottom-0 ${isDesktop() && !isMobile() ? "top-7.5" : "top-0"} z-[100] flex flex-col items-center justify-between p-6 transition-all duration-300 ${themeClasses[theme]}`}
    >
      {/* Top Bar controls */}
      <div
        className={`flex w-full items-center justify-between transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Typography configuration dropdown */}
          <div className="flex items-center gap-1 rounded-full bg-[var(--hover)] border border-[var(--border)] p-1">
            <button
              onClick={() => setFontFamily("sans")}
              className={`rounded-full px-3 py-1 text-xs transition ${fontFamily === "sans" ? "bg-[var(--surface)] font-bold" : "opacity-50"}`}
            >
              Sans
            </button>
            <button
              onClick={() => setFontFamily("serif")}
              className={`rounded-full px-3 py-1 text-xs transition ${fontFamily === "serif" ? "bg-[var(--surface)] font-bold" : "opacity-50"}`}
            >
              Serif
            </button>
            <button
              onClick={() => setFontFamily("mono")}
              className={`rounded-full px-3 py-1 text-xs transition ${fontFamily === "mono" ? "bg-[var(--surface)] font-bold" : "opacity-50"}`}
            >
              Mono
            </button>
          </div>

          {/* Size Selectors */}
          <div className="flex items-center gap-1 rounded-full bg-[var(--hover)] border border-[var(--border)] p-1 text-xs">
            {["sm", "md", "lg"].map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`rounded-full px-2 py-0.5 uppercase transition ${fontSize === size ? "bg-[var(--surface)] font-bold" : "opacity-50"}`}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Color Themes */}
          <div className="flex items-center gap-1 rounded-full bg-[var(--hover)] border border-[var(--border)] p-1.5">
            {["dark", "light", "sepia", "forest"].map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`h-4.5 w-4.5 rounded-full border transition-all ${
                  t === "dark"
                    ? "bg-[#121212] border-[var(--border-strong)]"
                    : t === "light"
                    ? "bg-[#fcfcfa] border-black/20"
                    : t === "sepia"
                    ? "bg-[#f4ecd8] border-[#ebdcb9]"
                    : "bg-[#0b170c] border-[#152e18]"
                } ${theme === t ? "scale-120 ring-1 ring-offset-1 ring-white/40" : "hover:scale-110"}`}
                title={`${t} theme`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Typewriter Toggle */}
          <button
            onClick={() => setTypewriterMode(!typewriterMode)}
            className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
              typewriterMode ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border)] opacity-60"
            }`}
          >
            Typewriter
          </button>
          
          <IconButton icon={X} label="Close focus mode" onClick={onClose} />
        </div>
      </div>

      {/* Writing Container */}
      <div
        ref={containerRef}
        className="relative w-full max-w-2xl flex-1 overflow-y-auto pt-[20vh] pb-[30vh] px-4 scrollbar-none"
        onClick={() => textareaRef.current?.focus()}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          placeholder="Start writing distraction-free..."
          className={`w-full bg-transparent border-none outline-none resize-none focus:ring-0 ${fontClasses[fontFamily]} ${sizeClasses[fontSize]} text-center`}
          style={{ minHeight: "200px", caretColor: "var(--accent)" }}
        />
      </div>

      {/* Bottom controls panel */}
      <div
        className={`flex w-full flex-col sm:flex-row items-center justify-between border-t border-[var(--border)] pt-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Ambient Noise controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className={`rounded-full p-2 border transition ${
              soundPlaying ? "bg-[var(--surface)] border-[var(--border-strong)] text-[var(--accent)]" : "border-[var(--border)] opacity-55"
            }`}
            title={soundPlaying ? "Stop ambient sound" : "Play ambient sound"}
          >
            {soundPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => changeSoundType("brown")}
              className={`rounded px-2.5 py-1 transition ${
                soundType === "brown" ? "bg-[var(--surface)] text-[var(--text)] font-medium" : "opacity-50 hover:opacity-100"
              }`}
            >
              Rain (Brown)
            </button>
            <button
              onClick={() => changeSoundType("pink")}
              className={`rounded px-2.5 py-1 transition ${
                soundType === "pink" ? "bg-[var(--surface)] text-[var(--text)] font-medium" : "opacity-50 hover:opacity-100"
              }`}
            >
              Wind (Pink)
            </button>
            <button
              onClick={() => changeSoundType("lofi")}
              className={`rounded px-2.5 py-1 transition ${
                soundType === "lofi" ? "bg-[var(--surface)] text-[var(--text)] font-medium" : "opacity-50 hover:opacity-100"
              }`}
            >
              Lofi Stream
            </button>
          </div>

          {soundPlaying && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-[var(--surface)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
              title="Ambient Volume"
            />
          )}
        </div>

        {/* Pomodoro Timer widget */}
        <div className="flex items-center gap-4 mt-4 sm:mt-0">
          <div className="relative flex items-center justify-center h-10 w-10">
            {/* Circular progress bar */}
            <svg className="absolute transform -rotate-90" width="40" height="40">
              <circle
                cx="20"
                cy="20"
                r="18"
                className="stroke-white/5"
                strokeWidth="2"
                fill="transparent"
              />
              <circle
                cx="20"
                cy="20"
                r="18"
                className={`transition-all duration-1000 ${
                  pomoBreak ? "stroke-[var(--success)]" : "stroke-[#2383E2]"
                }`}
                strokeWidth="2.5"
                fill="transparent"
                strokeDasharray="113"
                strokeDashoffset={113 - (113 * (pomoTotal - pomoSeconds)) / pomoTotal}
              />
            </svg>
            <Clock size={15} className={`z-10 ${pomoActive ? "animate-pulse" : "opacity-60"}`} />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-wider font-mono">
              {formatPomoTime()} {pomoBreak && <span className="text-[var(--success)] text-[10px]">BREAK</span>}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={togglePomo}
                className="text-[10px] uppercase font-bold tracking-wider hover:text-[var(--accent)]"
              >
                {pomoActive ? "Pause" : "Start"}
              </button>
              <span className="opacity-30">|</span>
              <button
                onClick={resetPomo}
                className="text-[10px] uppercase font-bold tracking-wider opacity-60 hover:opacity-100 hover:text-[var(--danger)]"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
