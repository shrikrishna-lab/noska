/**
 * System widgets — Sync Status, Connection Status, Noska World Clock & Timezones,
 * and Ambient Soundscapes Player.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, RefreshCw, TriangleAlert, Wifi, WifiOff, Globe, Volume2, VolumeX, Play, Pause, CloudRain, Trees, Coffee, Waves, Sun, Moon } from "lucide-react";
import { useWidgetEngine } from "../engine";
import type { WidgetProps } from "../types";

type SyncState = "synced" | "syncing" | "offline" | "issue";

function useSyncState(): { state: SyncState; lastChangeAt: string | null } {
  const { online } = useWidgetEngine();
  const [syncing, setSyncing] = useState(false);
  const [lastChangeAt, setLastChangeAt] = useState<string | null>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      setLastChangeAt(new Date().toISOString());
      setSyncing(true);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setSyncing(false), 2500);
    };
    window.addEventListener("noska:pages-synced", handler);
    return () => {
      window.removeEventListener("noska:pages-synced", handler);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const state: SyncState = !online ? "offline" : syncing ? "syncing" : "synced";
  return { state, lastChangeAt };
}

export function SyncStatusWidget({ ctx }: WidgetProps) {
  const { state } = useSyncState();

  if (state === "synced") {
    return (
      <div className="flex h-full items-center gap-2.5 p-1 select-none">
        <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
        <div>
          <p className="text-[12px] font-bold text-neutral-900 dark:text-white">Synced</p>
          <p className="text-[10px] text-neutral-400">Everything is up to date</p>
        </div>
      </div>
    );
  }
  if (state === "syncing") {
    return (
      <div className="flex h-full items-center gap-2.5 p-1 select-none">
        <Loader2 size={18} className="shrink-0 animate-spin text-blue-500" />
        <div>
          <p className="text-[12px] font-bold text-neutral-900 dark:text-white">Syncing…</p>
          <p className="text-[10px] text-neutral-400">Saving your changes</p>
        </div>
      </div>
    );
  }
  if (state === "offline") {
    return (
      <div className="flex h-full items-center gap-2.5 p-1 select-none">
        <WifiOff size={18} className="shrink-0 text-neutral-400" />
        <div>
          <p className="text-[12px] font-bold text-neutral-900 dark:text-white">Offline</p>
          <p className="text-[10px] text-neutral-400">Changes stored locally</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full items-center gap-2.5 p-1 select-none">
      <TriangleAlert size={18} className="shrink-0 text-amber-500" />
      <div>
        <p className="text-[12px] font-bold text-neutral-900 dark:text-white">Sync issues</p>
        <p className="text-[10px] text-neutral-400">Retrying connection...</p>
      </div>
    </div>
  );
}

export function ConnectionStatusWidget({}: WidgetProps) {
  const { online } = useWidgetEngine();
  return (
    <div className="flex h-full items-center gap-2.5 p-1 select-none">
      {online ? (
        <>
          <Wifi size={18} className="shrink-0 text-emerald-500" />
          <div>
            <p className="text-[12px] font-bold text-neutral-900 dark:text-white">Connected</p>
            <p className="text-[10px] text-neutral-400">Real-time sync active</p>
          </div>
        </>
      ) : (
        <>
          <WifiOff size={18} className="shrink-0 text-neutral-400" />
          <div>
            <p className="text-[12px] font-bold text-neutral-900 dark:text-white">Offline</p>
            <p className="text-[10px] text-neutral-400">Local offline cache</p>
          </div>
        </>
      )}
    </div>
  );
}

// ── 3. Noska World Clock & Timezones ─────────────────────────────────────────

const CITIES = [
  { city: "San Francisco", zone: "America/Los_Angeles", label: "PST", offset: -7 },
  { city: "London", zone: "Europe/London", label: "GMT", offset: 1 },
  { city: "Mumbai", zone: "Asia/Kolkata", label: "IST", offset: 5.5 },
  { city: "Tokyo", zone: "Asia/Tokyo", label: "JST", offset: 9 },
];

export function WorldClockWidget({ size }: WidgetProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const secAngle = seconds * 6;
  const minAngle = minutes * 6 + seconds * 0.1;
  const hourAngle = (hours % 12) * 30 + minutes * 0.5;

  return (
    <div className="flex h-full flex-col justify-between p-2 select-none">
      {/* Top Chronometer Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1.5">
          <Globe size={13} className="text-indigo-500" />
          <span className="text-xs font-bold text-neutral-900 dark:text-white">World Clock</span>
        </div>
        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Analog Clock & Cities list */}
      <div className="flex items-center gap-3 my-auto py-1">
        {/* Analog Clock Dial */}
        <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full border border-black/[0.1] dark:border-white/[0.15] bg-black/[0.02] dark:bg-white/[0.04] shadow-2xs">
          {/* Hour ticks */}
          {[0, 90, 180, 270].map((deg) => (
            <div
              key={deg}
              className="absolute size-1 rounded-full bg-neutral-400"
              style={{
                transform: `rotate(${deg}deg) translateY(-28px)`,
              }}
            />
          ))}

          {/* Hour hand */}
          <div
            className="absolute h-4 w-1 rounded-full bg-neutral-800 dark:bg-neutral-200 origin-bottom"
            style={{ transform: `rotate(${hourAngle}deg) translateY(-50%)` }}
          />
          {/* Minute hand */}
          <div
            className="absolute h-6 w-0.5 rounded-full bg-neutral-700 dark:bg-neutral-300 origin-bottom"
            style={{ transform: `rotate(${minAngle}deg) translateY(-50%)` }}
          />
          {/* Second hand */}
          <div
            className="absolute h-6.5 w-[1px] rounded-full bg-amber-500 origin-bottom"
            style={{ transform: `rotate(${secAngle}deg) translateY(-50%)` }}
          />
          {/* Center Pin */}
          <div className="absolute size-2 rounded-full bg-amber-500 shadow-xs" />
        </div>

        {/* Global Cities List */}
        <div className="flex-1 space-y-1">
          {CITIES.slice(0, size === "small" ? 2 : 3).map((c) => {
            const cityTime = new Intl.DateTimeFormat([], {
              timeZone: c.zone,
              hour: "2-digit",
              minute: "2-digit",
            }).format(time);

            return (
              <div key={c.city} className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-neutral-600 dark:text-neutral-400 truncate">
                  {c.city}
                </span>
                <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                  {cityTime}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 4. Ambient Soundscapes Player ────────────────────────────────────────────

const SOUNDS = [
  { id: "rain", name: "Lofi Rain", icon: CloudRain, color: "text-blue-500" },
  { id: "forest", name: "Deep Forest", icon: Trees, color: "text-emerald-500" },
  { id: "cafe", name: "Cozy Cafe", icon: Coffee, color: "text-amber-500" },
  { id: "waves", name: "Ocean Waves", icon: Waves, color: "text-cyan-500" },
];

export function AmbientSoundscapesWidget({ ctx }: WidgetProps) {
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const audioRef = useRef<{ ctx: AudioContext; gain: GainNode; sources: AudioScheduledSourceNode[] } | null>(null);

  const stopSoundscape = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.sources.forEach((node) => {
        try { node.stop(); } catch { /* already stopped */ }
        try { node.disconnect(); } catch { /* already disconnected */ }
      });
      try { void audio.ctx.close(); } catch { /* context already closed */ }
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startSoundscape = useCallback(
    (id: string) => {
      stopSoundscape();
      let created: AudioContext | null = null;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) throw new Error("Web Audio unsupported");
        const ac = new AudioCtx();
        created = ac;
        if (ac.state === "suspended") void ac.resume();

        const master = ac.createGain();
        master.gain.value = volume * 0.15;
        master.connect(ac.destination);

        const sources: AudioScheduledSourceNode[] = [];

        const noiseBuffer = (seconds: number, brownFactor: number) => {
          const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * seconds), ac.sampleRate);
          const out = buf.getChannelData(0);
          let last = 0;
          for (let i = 0; i < out.length; i++) {
            const white = Math.random() * 2 - 1;
            last = (last + brownFactor * white) / (1 + brownFactor);
            out[i] = last * 3.5;
          }
          return buf;
        };

        if (id === "rain") {
          const src = ac.createBufferSource();
          src.buffer = noiseBuffer(2, 0.08);
          src.loop = true;
          const band = ac.createBiquadFilter();
          band.type = "bandpass";
          band.frequency.value = 1400;
          band.Q.value = 0.4;
          src.connect(band);
          band.connect(master);
          src.start();
          sources.push(src);
        } else if (id === "forest") {
          const src = ac.createBufferSource();
          src.buffer = noiseBuffer(2, 0.02);
          src.loop = true;
          const lp = ac.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = 500;
          src.connect(lp);
          lp.connect(master);
          src.start();
          sources.push(src);
        } else if (id === "cafe") {
          [130.81, 196.0, 261.63].forEach((freq, i) => {
            const osc = ac.createOscillator();
            osc.type = i === 2 ? "sine" : "triangle";
            osc.frequency.value = freq;
            const oscGain = ac.createGain();
            oscGain.gain.value = 0.22;
            const lp = ac.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 700;
            osc.connect(oscGain);
            oscGain.connect(lp);
            lp.connect(master);
            osc.start();
            sources.push(osc);
          });
        } else if (id === "waves") {
          const src = ac.createBufferSource();
          src.buffer = noiseBuffer(2, 0.02);
          src.loop = true;
          const lp = ac.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = 300;
          const swell = ac.createGain();
          swell.gain.value = 0.7;
          const lfo = ac.createOscillator();
          lfo.frequency.value = 0.12;
          const lfoGain = ac.createGain();
          lfoGain.gain.value = 0.3;
          lfo.connect(lfoGain);
          lfoGain.connect(swell.gain);
          src.connect(lp);
          lp.connect(swell);
          swell.connect(master);
          src.start();
          lfo.start();
          sources.push(src, lfo);
        } else {
          void ac.close();
          return false;
        }

        audioRef.current = { ctx: ac, gain: master, sources };
        setActiveSound(id);
        setIsPlaying(true);
        return true;
      } catch {
        // Never leak a half-built AudioContext if node wiring fails.
        if (created && created.state !== "closed") {
          try { void created.close(); } catch { /* already closing */ }
        }
        ctx.actions.onToast?.("Audio is unavailable in this browser");
        return false;
      }
    },
    [stopSoundscape, volume, ctx.actions],
  );

  const togglePlay = (id: string) => {
    if (activeSound === id && isPlaying) {
      stopSoundscape();
      ctx.actions.onToast?.("Soundscape paused ⏸️");
    } else if (startSoundscape(id)) {
      ctx.actions.onToast?.(`Playing ${SOUNDS.find((s) => s.id === id)?.name} 🎧`);
    }
  };

  // Live volume updates without restarting the soundscape.
  useEffect(() => {
    if (audioRef.current) audioRef.current.gain.gain.value = volume * 0.15;
  }, [volume]);

  // Never leave audio running after the widget unmounts.
  useEffect(() => stopSoundscape, [stopSoundscape]);

  return (
    <div className="flex h-full flex-col justify-between p-2 select-none">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1.5">
          <Volume2 size={13} className="text-indigo-500" />
          <span className="text-xs font-bold text-neutral-900 dark:text-white">Ambient Sound</span>
        </div>
        {isPlaying && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
            Playing
          </span>
        )}
      </div>

      {/* Sound selector grid */}
      <div className="grid grid-cols-2 gap-1.5 my-auto">
        {SOUNDS.map((s) => {
          const Icon = s.icon;
          const active = activeSound === s.id && isPlaying;
          return (
            <motion.button
              key={s.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => togglePlay(s.id)}
              className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                active
                  ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                  : "bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.05] dark:border-white/[0.06] text-neutral-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
              }`}
            >
              <Icon size={14} className={s.color} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold truncate">{s.name}</p>
              </div>
              {active && (
                <div className="flex items-center gap-0.5">
                  {[8, 14, 10].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 rounded-full bg-indigo-500"
                      animate={{ height: [3, h, 3] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Volume control — updates the live gain without restarting playback */}
      <div className="flex items-center gap-2 pt-1.5">
        <VolumeX size={12} className="text-neutral-400 shrink-0" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer accent-indigo-500"
          aria-label="Soundscape volume"
        />
        <span className="w-8 text-right text-[10px] font-semibold text-neutral-400 tabular-nums">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
}
