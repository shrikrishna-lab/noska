import React, { useEffect, useRef, useState, useCallback } from "react";

interface AudioVisualizerProps {
  /** A MediaStream (e.g. from getUserMedia) — the component will create its own AudioContext. */
  stream?: MediaStream | null;
  /** Or pass an existing AnalyserNode directly. */
  analyserNode?: AnalyserNode | null;
  /** Number of frequency bands (should be power of 2). Default 64. */
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
  /** Sensitivity boost for visualization (1.0 to 5.0). Higher = more responsive. */
  sensitivityBoost?: number;
  /** Visualization style: "bars" (vertical bars), "radial" (current), "spectrum" (frequency spectrum) */
  style?: "bars" | "radial" | "spectrum";
  /** Smoothing constant for audio data (0 to 1). Higher = smoother, lower = more responsive. */
  smoothing?: number;
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
  sensitivityBoost = 2.5,
  style = "radial",
  smoothing = 0.8,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avgEnergy, setAvgEnergy] = useState(0);

  // Setup audio analyser from stream
  useEffect(() => {
    if (externalAnalyser) {
      analyserRef.current = externalAnalyser;
      setReady(true);
      return;
    }

    if (!stream || !active) {
      setReady(false);
      setIsSpeaking(false);
      setAvgEnergy(0);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = barCount * 4;
      analyser.smoothingTimeConstant = smoothing || 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
      setReady(true);
    } catch {
      setReady(false);
      setIsSpeaking(false);
      setAvgEnergy(0);
    }

    // Real-time energy monitoring
    const monitorEnergy = () => {
      if (!analyserRef.current || !isSpeaking) return;

      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      const energy = sum / data.length;
      const normalized = Math.min(1, energy / 128);

      setAvgEnergy(normalized);

      // Speak detection threshold
      if (normalized > 0.3) {
        setIsSpeaking(true);
      } else if (normalized < 0.1) {
        setIsSpeaking(false);
      }

      rafRef.current = requestAnimationFrame(monitorEnergy);
    };

    // Start monitoring after a short delay to let audio settle
    const energyId = setTimeout(monitorEnergy, 100);

    return () => {
      clearTimeout(energyId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
      setReady(false);
      setIsSpeaking(false);
      setAvgEnergy(0);
    };
  }, [stream, externalAnalyser, active, barCount, smoothing]);

  // Resolve dot color — read CSS variable at runtime
  const resolvedColor = useCallback(() => {
    if (dotColor) return dotColor;
    if (typeof window === "undefined") return "#ffffff";
    const val = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    return val || "#6c63ff";
  }, [dotColor]);

  // Draw loop for radial/bar visualization
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

        if (style === "bars") {
          // Vertical bar graph style
          const barWidth = (size * 0.8) / (barCount / 2);
          const barSpacing = barWidth * 0.1;

          for (let i = 0; i < barCount / 2; i++) {
            const freqIndex = i * 2;
            const energy = freqData[freqIndex] || 0;
            // Apply sensitivity boost and map to bar length
            const adjustedEnergy = Math.min(255, energy * sensitivityBoost);
            const barLength = Math.max(2, (adjustedEnergy / 255) * maxBarLength);

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.8 + (adjustedEnergy / 255) * 0.3;

            // Draw bar
            ctx.fillRect(
              0,
              -barLength / 2,
              barWidth,
              barLength
            );

            // Rotate to position
            ctx.save();
            ctx.rotate((i * (2 * Math.PI)) / (barCount / 2) - Math.PI / 2);
            ctx.translate(-size / 4, 0);
            ctx.fillRect(0, 0, barWidth, barLength);
            ctx.restore();
          }
        } else if (style === "spectrum") {
          // Frequency spectrum style - horizontal bars
          const barWidth = size / (barCount / 2);
          const barSpacing = barWidth * 0.1;

          for (let i = 0; i < barCount / 2; i++) {
            const freqIndex = i * 2;
            const energy = freqData[freqIndex] || 0;
            const adjustedEnergy = Math.min(255, energy * sensitivityBoost);
            const barLength = Math.max(2, (adjustedEnergy / 255) * (maxBarLength * 0.6));

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6 + (adjustedEnergy / 255) * 0.5;

            const barX = i * barWidth + barWidth / 4;
            const barY = -barLength / 2;

            ctx.fillRect(barX, barY, barWidth * 0.8, barLength);
          }
        } else {
          // Radial/dot style (original)
          const angleStep = (2 * Math.PI) / barCount;

          for (let i = 0; i < barCount / 2; i++) {
            const freqIndex = i * 2;
            const energy = freqData[freqIndex] || 0;
            const barLength = Math.max(0, Math.min(maxBarLength, (energy / 255) * maxBarLength));
            const dotSize = 0.8 + (energy / 255) * 2;
            const dotAlpha = 0.15 + (energy / 255) * 0.85;

            ctx.fillStyle = color;
            ctx.globalAlpha = dotAlpha;

            // Forward direction
            ctx.save();
            ctx.rotate(angleStep * i);
            for (let j = 0; j < barLength; j += dotSpacing) {
              ctx.beginPath();
              ctx.arc(initialRadius + j, 0, dotSize, 0, 2 * Math.PI);
              ctx.fill();
            }
            ctx.restore();

            // Mirror direction
            ctx.save();
            ctx.rotate(angleStep * i + Math.PI);
            for (let j = 0; j < barLength; j += dotSpacing) {
              ctx.beginPath();
              ctx.arc(initialRadius + j, 0, dotSize, 0, 2 * Math.PI);
              ctx.fill();
            }
            ctx.restore();
          }
          ctx.globalAlpha = 1;
        }
      } else {
        // Idle state - show subtle pulse based on energy
        const pulse = 0.3 + 0.2 * Math.sin(Date.now() * 0.003);
        const idleEnergy = avgEnergy > 0 ? avgEnergy : pulse;

        ctx.globalAlpha = idleEnergy;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, initialRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // Inner glow based on energy
        ctx.globalAlpha = 0.3 + idleEnergy * 0.4;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, 2 * Math.PI);
        ctx.fill();

        // Speak indicator when voice detected
        if (isSpeaking) {
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
          ctx.beginPath();
          ctx.arc(0, 0, initialRadius + 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready, active, size, barCount, initialRadius, maxBarLength, dotSpacing, backgroundColor, style, sensitivityBoost, smoothing, avgEnergy, isSpeaking]);

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, display: "block" }}
        aria-label={isSpeaking ? "Voice active visualizer" : "Voice idle visualizer"}
      />
    </div>
  );
}