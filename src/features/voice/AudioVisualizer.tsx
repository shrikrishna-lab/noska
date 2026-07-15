import React, { useEffect, useRef, useState, useCallback } from "react";

interface AudioVisualizerProps {
  /** A MediaStream (e.g. from getUserMedia) — the component will create its own AudioContext. */
  stream?: MediaStream | null;
  /** Or pass an existing AnalyserNode directly. */
  analyserNode?: AnalyserNode | null;
  /** Number of radial bars (should be power of 2). Default 64. */
  barCount?: number;
  /** Inner radius of the radial ring in px. Default 40. */
  initialRadius?: number;
  /** Max length of each bar in px. Default 60. */
  maxBarLength?: number;
  /** Spacing between dots in px. Default 4. */
  dotSpacing?: number;
  /** CSS size of the container. Default 120. */
  size?: number;
  /** Dot color — adapts to theme by default. */
  dotColor?: string;
  /** Background color. Default transparent. */
  backgroundColor?: string;
  /** Whether the visualizer is active/recording. */
  active?: boolean;
  /** Optional className for the wrapper div. */
  className?: string;
}

export default function AudioVisualizer({
  stream = null,
  analyserNode: externalAnalyser = null,
  barCount = 64,
  initialRadius = 40,
  maxBarLength = 60,
  dotSpacing = 4,
  size = 120,
  dotColor,
  backgroundColor = "transparent",
  active = true,
  className = "",
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const [ready, setReady] = useState(false);

  // Setup audio analyser from stream
  useEffect(() => {
    if (externalAnalyser) {
      analyserRef.current = externalAnalyser;
      setReady(true);
      return;
    }

    if (!stream || !active) {
      setReady(false);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = barCount * 4;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyserRef.current = analyser;
      setReady(true);
    } catch {
      setReady(false);
    }

    return () => {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
      setReady(false);
    };
  }, [stream, externalAnalyser, active, barCount]);

  // Resolve dot color — read CSS variable at runtime
  const resolvedColor = useCallback(() => {
    if (dotColor) return dotColor;
    if (typeof window === "undefined") return "#ffffff";
    const val = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    return val || "#6c63ff";
  }, [dotColor]);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const freqData = new Uint8Array(analyserRef.current?.frequencyBinCount || barCount * 2);
    const color = resolvedColor();

    let running = true;
    const draw = () => {
      if (!running) return;

      ctx.clearRect(0, 0, size, size);

      // Background
      if (backgroundColor !== "transparent") {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, size, size);
      }

      ctx.save();
      ctx.translate(size / 2, size / 2);

      if (ready && analyserRef.current && active) {
        analyserRef.current.getByteFrequencyData(freqData);
        const angleStep = (2 * Math.PI) / barCount;

        for (let i = 0; i < barCount / 2; i++) {
          const freqIndex = i * 2;
          const energy = freqData[freqIndex] || 0;
          const barLength = Math.max(0, Math.min(maxBarLength, (energy / 255) * maxBarLength));
          const angle = i * angleStep;
          const dotSize = 0.8 + (energy / 255) * 2;
          const dotAlpha = 0.15 + (energy / 255) * 0.85;

          ctx.fillStyle = color;
          ctx.globalAlpha = dotAlpha;

          // Forward direction
          ctx.save();
          ctx.rotate(angle);
          for (let j = 0; j < barLength; j += dotSpacing) {
            ctx.beginPath();
            ctx.arc(initialRadius + j, 0, dotSize, 0, 2 * Math.PI);
            ctx.fill();
          }
          ctx.restore();

          // Mirror direction
          ctx.save();
          ctx.rotate(angle + Math.PI);
          for (let j = 0; j < barLength; j += dotSpacing) {
            ctx.beginPath();
            ctx.arc(initialRadius + j, 0, dotSize, 0, 2 * Math.PI);
            ctx.fill();
          }
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      } else {
        // Idle pulse ring
        const time = Date.now() * 0.003;
        const pulse = 0.3 + 0.2 * Math.sin(time);
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, initialRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // Inner small glow dot
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time * 1.5);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.globalAlpha = 1;
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, active, size, barCount, initialRadius, maxBarLength, dotSpacing, backgroundColor, resolvedColor]);

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, display: "block" }}
        aria-hidden="true"
      />
    </div>
  );
}
