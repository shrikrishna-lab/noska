import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import { Mic, MicOff, Square, Sparkles, X, AlertCircle } from "lucide-react";
import { runAI } from "../../utils/ai";
import { uid, blockFor } from "../../utils/helpers";
import { capture } from "../../lib/posthog";

/* ─── text → structured blocks ─── */

function textToBlocks(text) {
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

/* ─── waveform visualization ─── */

function WaveformVisualizer({ analyser, isRecording }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!analyser || !isRecording || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "rgba(124, 58, 237, 0.6)");
      gradient.addColorStop(0.5, "rgba(236, 72, 153, 0.8)");
      gradient.addColorStop(1, "rgba(124, 58, 237, 0.6)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={60}
      className="rounded-lg opacity-90"
    />
  );
}

/* ─── main component ─── */

export default function VoiceCapture({
  onAppendBlocks,
  onClose,
  apiKey,
  aiProvider,
  nvidiaKey,
  onToast
}) {
  const [supported, setSupported] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [structuring, setStructuring] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const recognitionRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const startRecording = useCallback(async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      // Audio context for waveform
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let final = "";
        let interim = "";
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript((prev) => {
          const newText = prev + final;
          return newText;
        });
        setInterimText(interim);
      };

      recognition.onerror = (event) => {
        if (event.error !== "no-speech") {
          onToast?.(`Speech error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // If still recording, restart (browser may auto-stop)
        if (recognitionRef.current && isRecording) {
          try { recognition.start(); } catch (e) { console.warn("VoiceCapture: restart recognition", e); }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setElapsed(0);

      // Timer
      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } catch (err) {
      onToast?.("Microphone access denied");
    }
  }, [isRecording, onToast]);

  const stopRecording = useCallback(() => {
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
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      stopRecording();
    };
  }, [onClose, stopRecording]);

  const handleStructure = async () => {
    if (!transcript.trim()) return;

    setStructuring(true);
    try {
      const result = await runAI({
        provider: aiProvider,
        anthropicKey: apiKey,
        nvidiaKey,
        system: `You are a note structuring assistant. Convert the following raw speech transcript into well-structured notes using Markdown formatting.
Rules:
- Use ## for section headings
- Use - for bullet points
- Use - [ ] for action items/todos
- Use > for important quotes or key points
- Use 1. for numbered steps
- Clean up filler words and repetitions
- Organize into logical sections
- Keep the original meaning intact
- Be concise but complete`,
        prompt: `Structure this speech transcript into organized notes:\n\n${transcript}`
      });

      const blocks = textToBlocks(result);
      const header = blockFor("callout", `Voice capture · ${formatTime(elapsed)}`);
      header.meta = { tone: "info", icon: "🎙️" };

      onAppendBlocks([header, ...blocks]);
      capture("voice_note_inserted", { structured_with_ai: true, duration_seconds: elapsed, block_count: blocks.length });
      onToast?.(`${blocks.length} structured blocks added`);
      onClose();
    } catch (err) {
      onToast?.("Structuring failed");
    } finally {
      setStructuring(false);
    }
  };

  const handleRawInsert = () => {
    if (!transcript.trim()) return;
    const blocks = transcript
      .split(/[.!?]+/)
      .filter((s) => s.trim())
      .map((s) => blockFor("text", s.trim()));

    const header = blockFor("callout", `Voice note · ${formatTime(elapsed)}`);
    header.meta = { tone: "info", icon: "🎙️" };

    onAppendBlocks([header, ...blocks]);
    capture("voice_note_inserted", { structured_with_ai: false, duration_seconds: elapsed, block_count: blocks.length });
    onToast?.("Voice note added");
    onClose();
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!supported) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-6"
        onMouseDown={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          transition={SPRING_PRESETS.soft}
          className="w-[400px] rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] p-6 shadow-2xl text-center"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <AlertCircle size={40} className="mx-auto mb-4 text-[var(--accent)]" />
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Browser Not Supported</h3>
          <p className="text-sm text-[var(--secondary)] mb-4">
            Voice capture requires the Web Speech API, which is only available in Chrome, Edge, and other Chromium-based browsers.
          </p>
          <button
            onClick={onClose}
            className="rounded-lg bg-[var(--accent)] px-5 py-2 text-xs font-semibold text-white"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-6"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="w-[480px] max-w-full flex flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <Mic size={18} className="text-[var(--accent)]" />
          <h2 className="flex-1 font-semibold text-[var(--text)]">Voice Capture</h2>
          {isRecording && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--danger)]"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--danger)]" />
              {formatTime(elapsed)}
            </motion.span>
          )}
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={16} />
          </button>
        </div>

        {/* Waveform / Controls */}
        <div className="flex flex-col items-center gap-4 p-6">
          {isRecording && (
            <WaveformVisualizer analyser={analyserRef.current} isRecording={isRecording} />
          )}

          {!isRecording && !transcript.trim() && (
            <div className="py-4 text-center">
              <motion.div
                className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-[var(--accent)]/10"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Mic size={28} className="text-[var(--accent)]" />
              </motion.div>
              <p className="text-sm text-[var(--secondary)]">
                Click to start recording
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Speak naturally · AI will structure your notes
              </p>
            </div>
          )}

          {/* Record / Stop button */}
          <div className="flex gap-3">
            {!isRecording ? (
              <motion.button
                onClick={startRecording}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg"
              >
                <Mic size={16} />
                {transcript.trim() ? "Resume" : "Start Recording"}
              </motion.button>
            ) : (
              <motion.button
                onClick={stopRecording}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-full bg-[var(--danger)] px-6 py-3 text-sm font-semibold text-white shadow-lg"
              >
                <Square size={14} />
                Stop
              </motion.button>
            )}
          </div>
        </div>

        {/* Transcript */}
        {(transcript.trim() || interimText) && (
          <div className="border-t border-[var(--border)] px-5 py-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Transcript</div>
            <div className="max-h-32 overflow-y-auto rounded-lg bg-[var(--surface)] p-3 text-sm leading-6 text-[var(--text)] scrollbar-thin">
              {transcript}
              {interimText && (
                <span className="text-[var(--muted)] italic">{interimText}</span>
              )}
              {!transcript.trim() && !interimText && (
                <span className="text-[var(--muted)]">Listening...</span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {transcript.trim() && !isRecording && (
          <div className="flex items-center gap-3 border-t border-[var(--border)] px-5 py-3">
            <button
              onClick={() => { setTranscript(""); setElapsed(0); }}
              className="text-xs text-[var(--muted)] hover:text-[var(--secondary)]"
            >
              Clear
            </button>
            <div className="flex-1" />
            <motion.button
              onClick={handleRawInsert}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--hover)]"
            >
              Insert Raw
            </motion.button>
            <motion.button
              onClick={handleStructure}
              disabled={structuring}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-50"
            >
              <Sparkles size={13} className={structuring ? "animate-spin" : ""} />
              {structuring ? "Structuring..." : "AI Structure"}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
