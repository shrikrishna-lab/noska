import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import { Mic, MicOff, Square, Sparkles, X, AlertCircle, Copy, Check, FileText } from "lucide-react";
import { runAI } from "../../utils/ai";
import { uid, blockFor } from "../../utils/helpers";
import { capture } from "../../lib/posthog";
import { cleanDictation, detectTargetApp } from "../../lib/voice/dictation-cleanup";
import { createVoiceIntelligence, type VoiceIntent, type VoiceProcessingResult } from "../../lib/voice/voice-intelligence";

declare class SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/**
 * SpeechRecognition is a browser-provided constructor. The ambient class
 * above is type-only, so using `new SpeechRecognition()` directly would
 * throw at runtime in the bundled app. Always resolve the vendor-prefixed
 * constructor from window.
 */
function getSpeechRecognitionConstructor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return (window.SpeechRecognition || window.webkitSpeechRecognition || null) as
    (new () => SpeechRecognition) | null;
}

/* ─── text → structured blocks ─── */
function textToBlocks(text: string) {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      if (line.startsWith("### ")) return blockFor("h3", line.replace("### ", ""));
      if (line.startsWith("## ")) return blockFor("h2", line.replace("## ", ""));
      if (line.startsWith("# ")) return blockFor("h1", line.replace("# ", ""));
      if (/^[-•*]\s/.test(line)) return blockFor("bullet", line.replace(/^[-•*]\s/, ""));
      if (/^\d+\.\s/.test(line)) return blockFor("number", line.replace(/^\d+\.\s/, ""));
      if (line.startsWith("> ")) return blockFor("quote", line.replace("> ", ""));
      if (/^- \[[ x]\]/i.test(line)) {
        const b = blockFor("todo", line.replace(/^- \[[ x]\]\s*/i, ""));
        b.checked = /^- \[x\]/i.test(line);
        return b;
      }
      return blockFor("text", line);
    });
}

type WebGLResources = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  uniforms: {
    time: WebGLUniformLocation | null;
    amplitude: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
  };
};

export interface VoiceCaptureProps {
  onAppendBlocks: (blocks: any[]) => void;
  onClose: () => void;
  apiKey?: string;
  aiProvider?: string;
  nvidiaKey?: string;
  onToast?: (msg: string) => void;
}

export default function VoiceCapture({
  onAppendBlocks,
  onClose,
  apiKey,
  aiProvider,
  nvidiaKey,
  onToast
}: VoiceCaptureProps) {
  const [supported, setSupported] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [structuring, setStructuring] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [agentMode, setAgentMode] = useState(false);

  // Initialize Voice Intelligence engine (moved before canvasRef for proper scoping)
  const voiceIntelligence = createVoiceIntelligence({
    autoProcess: false,
    autoDictation: true,
    autoCommands: true,
    confirmationRequiredForMixed: true,
    languageDetection: true,
    codeSwitchingDetection: true,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const webglRef = useRef<WebGLResources | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const amplitudeRef = useRef(0.08);
  const targetAmplitudeRef = useRef(0.08);

  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);
  const isStartingRef = useRef(false);

  // Initialize WebGL Halftone / Bayer-Dithered soundwave sphere
  const initialiseWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) return;

    const vertexShaderSource = `
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      uniform float uTime;
      uniform float uAmplitude;
      uniform vec2 uResolution;

      float bayerDither(vec2 coord) {
        vec2 p = floor(mod(coord, 8.0));
        float x = p.x;
        float y = p.y;
        float index =
          1.0 * mod(x, 2.0) +
          2.0 * mod(y, 2.0) +
          4.0 * mod(floor(x / 2.0), 2.0) +
          8.0 * mod(floor(y / 2.0), 2.0) +
          16.0 * mod(floor(x / 4.0), 2.0) +
          32.0 * mod(floor(y / 4.0), 2.0);
        return (index + 0.5) / 64.0;
      }

      void main() {
        vec2 normalized = gl_FragCoord.xy / uResolution;
        vec2 uv = normalized * 2.0 - 1.0;
        uv.x *= uResolution.x / uResolution.y;

        float time = uTime * 0.5;
        float amplitude = clamp(uAmplitude, 0.0, 1.2);

        float radius = 0.21 + amplitude * 0.11 + sin(time * 0.9) * 0.012;
        float thickness = 0.07 + amplitude * 0.05 + sin(time * 0.63) * 0.009;

        float dist = length(uv);
        float ring = smoothstep(radius + thickness, radius, dist) - smoothstep(radius, radius - thickness, dist);
        float glow = exp(-14.0 * abs(dist - radius));
        float halo = exp(-6.5 * dist * (1.0 + amplitude * 0.35));

        float intensity = clamp(ring * 0.75 + glow * 0.5 + halo * 0.08, 0.0, 1.0);
        float threshold = bayerDither(gl_FragCoord.xy);
        float shade = step(threshold, intensity);

        gl_FragColor = vec4(vec3(shade), 1.0);
      }
    `;

    const createShader = (type: GLenum, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Unable to create shader");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
      if (!compiled) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(info ?? "Shader compilation error");
      }
      return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    if (!program) throw new Error("Unable to create WebGL program");

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error(info ?? "WebGL link error");
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const vertices = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(program);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const uniforms = {
      time: gl.getUniformLocation(program, "uTime"),
      amplitude: gl.getUniformLocation(program, "uAmplitude"),
      resolution: gl.getUniformLocation(program, "uResolution"),
    };

    webglRef.current = { gl, program, uniforms };

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      const width = Math.round(rect.width * pixelRatio);
      const height = Math.round(rect.height * pixelRatio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    };

    resize();

    const render = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(render);
      const resources = webglRef.current;
      if (!resources) return;
      const { gl: context, program: shaderProgram, uniforms: shaderUniforms } = resources;

      // Extract real-time mic volume if available
      if (analyserRef.current && isListeningRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const val = (data[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / data.length);
        targetAmplitudeRef.current = Math.min(1.2, 0.08 + rms * 3.5);
      } else if (!isListeningRef.current) {
        targetAmplitudeRef.current = 0.05 + Math.sin(time * 0.002) * 0.015;
      }

      resize();
      context.useProgram(shaderProgram);
      context.clearColor(0, 0, 0, 1);
      context.clear(context.COLOR_BUFFER_BIT);

      const smoothing = 0.92;
      const amplitude =
        amplitudeRef.current +
        (targetAmplitudeRef.current - amplitudeRef.current) * (1 - smoothing);
      amplitudeRef.current = amplitude;

      if (shaderUniforms.time) {
        context.uniform1f(shaderUniforms.time, time * 0.001);
      }
      if (shaderUniforms.amplitude) {
        context.uniform1f(shaderUniforms.amplitude, amplitude);
      }
      if (shaderUniforms.resolution) {
        context.uniform2f(
          shaderUniforms.resolution,
          context.drawingBufferWidth,
          context.drawingBufferHeight,
        );
      }

      const button = buttonRef.current;
      if (button) {
        const scale = 1 + amplitude * 0.15;
        const glow = 12 + amplitude * 90;
        const opacity = 0.08 + amplitude * 0.25;
        button.style.transform = `translate(-50%, -50%) scale(${scale})`;
        button.style.boxShadow = `0 0 ${glow.toFixed(1)}px rgba(255, 255, 255, ${opacity.toFixed(3)})`;
      }

      context.drawArrays(context.TRIANGLES, 0, 6);
    };

    render(0);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = null;
    };
  }, []);

  useEffect(() => {
    try {
      const cleanup = initialiseWebGL();
      return () => {
        if (cleanup) cleanup();
        webglRef.current = null;
      };
    } catch (error) {
      console.error(error);
    }
  }, [initialiseWebGL]);

  const startRecording = useCallback(async () => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let accumulatedFinal = "";
        let currentInterim = "";
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0]) {
            const chunk = item[0].transcript || "";
            if (item.isFinal) {
              accumulatedFinal += (accumulatedFinal ? " " : "") + chunk.trim();
            } else {
              currentInterim += (currentInterim ? " " : "") + chunk.trim();
            }
          }
        }
        if (accumulatedFinal) {
          setTranscript(accumulatedFinal);
        }
        setInterimText(currentInterim);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          onToast?.(`Speech error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current && isListeningRef.current) {
          try { recognition.start(); } catch (e) { console.warn("VoiceCapture restart:", e); }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      setIsRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } catch (err) {
      onToast?.("Microphone access denied or unavailable");
    }
  }, [onToast]);

  const stopRecording = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setInterimText("");
    setAgentMode(false); // Reset agent mode when stopping
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      stopRecording();
    };
  }, [onClose, stopRecording]);

  const handleToggle = useCallback(async () => {
    // A second click while getUserMedia is pending cannot safely cancel the
    // browser permission prompt; ignore it instead of racing the start path.
    if (isStartingRef.current) return;

    if (isRecording) {
      // Stop recording
      isListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
      setInterimText("");
      setAgentMode(false); // Reset agent mode when stopping
      return;
    }

    // Start recording in normal dictation mode. Do not publish recording
    // state until both the microphone and recognition session are ready.
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    isStartingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let accumulatedFinal = "";
        let currentInterim = "";
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0]) {
            const chunk = item[0].transcript || "";
            if (item.isFinal) {
              accumulatedFinal += (accumulatedFinal ? " " : "") + chunk.trim();
            } else {
              currentInterim += (currentInterim ? " " : "") + chunk.trim();
            }
          }
        }
        if (accumulatedFinal) {
          setTranscript(accumulatedFinal);
        }
        setInterimText(currentInterim);

        // If not in agent mode, just update transcript
        if (!agentMode) {
          // Normal dictation mode - just show text
        } else {
          // Agent mode - process with voice intelligence
          voiceIntelligence.processUtterance(currentInterim, {
            getContent: () => transcript,
            getCursorPosition: () => 0,
            getSelection: () => null,
            getCurrentBlock: () => null,
            executeAction: async (action, params) => {
              // Execute actions based on agent commands
              return { success: true, feedback: `Action: ${action}` };
            }
          });
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          onToast?.(`Speech error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current && isListeningRef.current) {
          try { recognition.start(); } catch (e) { console.warn("VoiceCapture restart:", e); }
        }
      };

      recognitionRef.current = recognition;
      isListeningRef.current = true;
      recognition.start();
      isStartingRef.current = false;
      setIsRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } catch (err) {
      isStartingRef.current = false;
      isListeningRef.current = false;
      recognitionRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      onToast?.("Microphone access denied or unavailable");
      setIsRecording(false);
    }
  }, [isRecording, agentMode, transcript, voiceIntelligence]);

  const handleStructure = async () => {
    const fullText = (transcript + " " + interimText).trim();
    if (!fullText) return;

    setStructuring(true);
    try {
      const result = await runAI({
        provider: aiProvider || "groq",
        anthropicKey: apiKey,
        nvidiaKey,
        system: `You are a professional note structuring assistant. Convert raw speech transcript into well-structured, beautiful notes using Markdown.
Rules:
- Use ## for clear section headings
- Use - for key takeaways and bullet points
- Use - [ ] for actionable tasks and next steps
- Use > for important quotes, thoughts or key insights
- Use 1. for sequential workflows
- Eliminate stuttering, repeated words, and speech fillers
- Keep original substance intact, formatted cleanly`,
        prompt: `Structure this voice recording into clear, actionable notes:\n\n${fullText}`
      });

      const blocks = textToBlocks(result);
      const header = blockFor("callout", `Voice Dictation · ${formatTime(elapsed || 1)}`);
      (header as any).meta = { tone: "info", icon: "🎙️" };

      onAppendBlocks([header, ...blocks]);
      capture("voice_note_inserted", { structured_with_ai: true, duration_seconds: elapsed, block_count: blocks.length });
      onToast?.(`${blocks.length} structured blocks inserted`);
      onClose();
    } catch (err) {
      onToast?.("Structuring failed, inserting raw text");
      handleRawInsert();
    } finally {
      setStructuring(false);
    }
  };

  const handleAIPolish = async () => {
    const fullText = (transcript + " " + interimText).trim();
    if (!fullText) return;

    setPolishing(true);
    try {
      const result = await cleanDictation({
        rawTranscript: fullText,
        targetApp: "docs",
        dictationMode: "ai_polished",
      });

      const blocks = textToBlocks(result.cleanedText);
      const header = blockFor("callout", `Voice Dictation · ${formatTime(elapsed || 1)}`);
      (header as any).meta = { tone: "info", icon: "🎙️" };

      onAppendBlocks([header, ...blocks]);
      capture("voice_note_inserted", { structured_with_ai: true, ai_polished: true, duration_seconds: elapsed, block_count: blocks.length });
      onToast?.(`${blocks.length} AI-polished blocks inserted`);
      onClose();
    } catch (err) {
      onToast?.("AI polish failed, inserting raw text");
      handleRawInsert();
    } finally {
      setPolishing(false);
    }
  };

  const handleRawInsert = () => {
    const fullText = (transcript + " " + interimText).trim();
    if (!fullText) return;

    const blocks = fullText
      .split(/[.!?]+/)
      .filter((s) => s.trim())
      .map((s) => blockFor("text", s.trim()));

    const header = blockFor("callout", `Voice Dictation · ${formatTime(elapsed || 1)}`);
    (header as any).meta = { tone: "info", icon: "🎙️" };

    onAppendBlocks([header, ...blocks]);
    capture("voice_note_inserted", { structured_with_ai: false, duration_seconds: elapsed, block_count: blocks.length });
    onToast?.("Voice notes inserted");
    onClose();
  };

  const handleCopyTranscript = () => {
    const fullText = (transcript + " " + interimText).trim();
    if (!fullText) return;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Compute average audio level from analyser for UI indicator
  useEffect(() => {
    const updateLevel = () => {
      if (!analyserRef.current || !isListeningRef.current) return;

      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const val = (data[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / data.length);
      // Store for UI indicator (0 to 1 range)
      amplitudeRef.current = Math.min(1, 0.1 + rms * 4);
    };

    // Update UI level a few times per second
    const intervalId = setInterval(updateLevel, 200);
    updateLevel(); // Initial call

    return () => clearInterval(intervalId);
  }, [isListeningRef.current, analyserRef]);

  // Set up voice intelligence event handlers when recording
  useEffect(() => {
    if (!isRecording) return;

    (voiceIntelligence as any).onResult = (result: any) => {
      if (result.text?.trim()) {
        setInterimText(result.text.trim());
      }
    };

    (voiceIntelligence as any).onError = (error: any) => {
      onToast?.(`Voice intelligence error: ${error.message}`);
    };
  }, [isRecording, voiceIntelligence]);

  if (!supported) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
        onMouseDown={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-[420px] rounded-3xl border border-white/20 bg-[#12141a] p-7 shadow-2xl text-center text-white"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <AlertCircle size={44} className="mx-auto mb-4 text-amber-400" />
          <h3 className="text-xl font-bold mb-2 tracking-tight">Speech Recognition Unavailable</h3>
          <p className="text-sm text-white/70 mb-5 leading-relaxed">
            Voice capture uses the browser Web Speech API (available in Chromium-based browsers like Chrome, Edge, and Arc).
          </p>
          <button
            onClick={onClose}
            className="rounded-full bg-white/15 hover:bg-white/25 px-6 py-2.5 text-xs font-semibold text-white transition cursor-pointer"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    );
  }

  const currentDisplay = (transcript + " " + interimText).trim();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="relative w-[780px] max-w-full h-[580px] max-h-[92vh] flex flex-col overflow-hidden rounded-[32px] border border-white/20 bg-black shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.2)] text-white select-none"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* WebGL Canvas Halftone Pulsing Soundwave Sphere */}
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none z-0" />

        {/* Top Header Bar */}
        <div className="relative z-20 flex items-center justify-between px-7 py-5">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
              <Mic size={14} className={isRecording ? "text-red-400 animate-pulse" : "text-white/80"} />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white/95">Voice Dictation</h2>
              <p className="text-[11px] text-white/50">
                {isRecording ? `Recording • ${formatTime(elapsed)}` : "Natural speech to AI structured notes"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRecording && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-300">
                <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
                Live
              </span>
            )}
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Close (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Center Orb Interactive Button */}
        <motion.button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          className="absolute top-1/2 left-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white z-20 cursor-pointer shadow-[0_0_24px_rgba(255,255,255,0.4)] flex items-center justify-center"
          animate={{
            scale: isRecording ? [1, 1.12, 1] : 1,
            opacity: isRecording ? 0.95 : 0.75,
          }}
          transition={{
            scale: {
              duration: 0.8,
              repeat: isRecording ? Infinity : 0,
              ease: "easeInOut",
            },
            opacity: {
              duration: 0.4,
              ease: "easeInOut",
            },
          }}
          whileHover={{ scale: 1.25 }}
          whileTap={{ scale: 0.9 }}
          title={isRecording ? "Click to pause / stop recording" : "Click to start voice recording"}
        >
          {isRecording ? (
            <Square size={12} className="text-black fill-black" />
          ) : (
            <Mic size={14} className="text-black" />
          )}
        </motion.button>

        {/* Bottom Transcript Display & Dynamic Controls */}
        <div className="mt-auto relative z-20 flex flex-col p-6 pt-0">
          {/* Transcript text */}
          <div className="relative mb-4">
            {/* Audio level indicator bar */}
            <div className="h-2 bg-white/20 rounded-full overflow-hidden margin-t-2">
              <div
                className={`h-full bg-red-400 transition-all duration-100 ease-out ${isRecording
                    ? `w-[${Math.max(0, Math.min(100, amplitudeRef.current * 100))}%]`
                    : "w-0"
                  }`}
                style={{ width: "100%" }}
              />
            </div>

            <motion.p
              className="max-h-28 overflow-y-auto px-4 text-center text-sm sm:text-base leading-relaxed text-pretty text-white/90 font-medium scrollbar-thin tracking-tight"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {currentDisplay || (
                <span className="text-white/40 font-normal">
                  {isRecording
                    ? agentMode
                      ? "Listening... AI agent mode active - performing tasks based on voice commands"
                      : "Listening... speak freely and AI will format your thoughts"
                    : "Tap the central pulsing sphere to start recording"}
                </span>
              )}
            </motion.p>
          </div>

          {/* Action pill bar */}
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${isRecording
                    ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                    : "bg-white/15 hover:bg-white/25 text-white border border-white/20"
                  }`}
              >
                {isRecording ? <Square size={12} /> : <Mic size={12} />}
                <span>{isRecording ? "Stop Recording" : currentDisplay ? "Resume Recording" : "Start Recording"}</span>
              </button>

{currentDisplay && (
                <button
                  onClick={() => {
                    setTranscript("");
                    setInterimText("");
                    setElapsed(0);
                  }}
                  className="px-3 py-2 rounded-full text-xs text-white/50 hover:text-white/80 hover:bg-white/10 transition cursor-pointer"
                >
                  Clear
                </button>
              )}

              {/* Agent mode button - appears when recording starts */}
              {isRecording && !agentMode && (
                <button
                  onClick={() => setAgentMode(true)}
                  className="px-3 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-green-500/25 transition cursor-pointer"
                  title="Enable Agent Mode: Voice can perform tasks & activities"
                >
                  Agent
                </button>
              )}

              {currentDisplay && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyTranscript}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-white/10 hover:bg-white/15 text-white/80 transition cursor-pointer"
                    title="Copy transcript to clipboard"
                  >
                    {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>

                  <button
                    onClick={handleRawInsert}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 text-white/90 border border-white/15 transition cursor-pointer"
                    title="Insert raw text directly"
                  >
                    <FileText size={13} />
                    <span>Insert Raw</span>
                  </button>

                  <button
                    onClick={handleAIPolish}
                    disabled={polishing || structuring}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25 transition cursor-pointer disabled:opacity-50"
                    title="AI-polish transcript: remove fillers, fix grammar, clean punctuation"
                  >
                    <Sparkles size={13} className={polishing ? "animate-spin" : ""} />
                    <span>{polishing ? "Polishing..." : "AI Polish"}</span>
                  </button>

                  <button
                    onClick={handleStructure}
                    disabled={structuring || polishing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition cursor-pointer disabled:opacity-50"
                    title="Use AI to turn transcript into structured note blocks"
                  >
                    <Sparkles size={13} className={structuring ? "animate-spin" : ""} />
                    <span>{structuring ? "Structuring..." : "AI Structure"}</span>
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>

        {/* Ambient bottom gradient shade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-black via-black/70 to-transparent" />
      </motion.div>
    </motion.div>
  );
}
