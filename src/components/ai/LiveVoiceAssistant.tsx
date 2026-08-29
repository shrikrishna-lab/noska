import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Square, X, Mic, Volume2, Sparkles, Settings2, Key, Play, Check,
  ChevronDown, Radio, ExternalLink, AlertCircle, RefreshCw, Cpu
} from "lucide-react";
import { aiManager } from "../../ai/AIManager";
import {
  ELEVENLABS_VOICES,
  getElevenLabsApiKey,
  setElevenLabsApiKey,
  getSelectedVoiceId,
  setSelectedVoiceId,
  streamElevenLabsSpeech,
  getCustomVoices,
  type ElevenLabsVoice
} from "../../lib/voice/elevenlabs";
import type { Page } from "../../lib/supabaseService";

interface LiveVoiceAssistantProps {
  open: boolean;
  onClose: () => void;
  page?: Page;
  modelName?: string;
  onToast?: (msg: string) => void;
}

type AssistantVoiceState = "listening" | "thinking" | "speaking" | "idle" | "error";

const POPULAR_MODELS = [
  { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4", desc: "Most intelligent reasoning" },
  { id: "openai/chatgpt-4o-latest", name: "ChatGPT 4o", desc: "Ultra-fast voice dialogue" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3", desc: "Fast & economical" },
  { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", desc: "Open-weights powerhouse" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", desc: "Reliable & versatile" },
];

export default function LiveVoiceAssistant({
  open,
  onClose,
  page,
  modelName = "ChatGPT 4o",
  onToast,
}: LiveVoiceAssistantProps) {
  const [voiceState, setVoiceState] = useState<AssistantVoiceState>("listening");
  const [userTranscript, setUserTranscript] = useState("");
  const [aiResponseText, setAiResponseText] = useState("");
  const [audioLevels, setAudioLevels] = useState<number[]>([0.15, 0.3, 0.75, 1.0, 0.65, 0.35, 0.15]);

  // Resizable Card Dimensions (Clamped)
  const [cardSize, setCardSize] = useState<{ width: number; height: number }>({
    width: 560,
    height: 480,
  });
  const isResizingRef = useRef<string | null>(null);
  const startPosRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 560, h: 480 });

  // Provider & API Key States
  const [isAiConfigured, setIsAiConfigured] = useState(aiManager.isConfigured());
  const [activeModel, setActiveModel] = useState(modelName);
  const [showAiKeySetup, setShowAiKeySetup] = useState(false);
  const [aiApiKeyInput, setAiApiKeyInput] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("openrouter");

  // ElevenLabs Voice & Settings States
  const [elevenKey, setElevenKey] = useState(getElevenLabsApiKey());
  const [selectedVoice, setSelectedVoice] = useState(getSelectedVoiceId());
  const [showSettings, setShowSettings] = useState(false);
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  // Real-time Web Audio Analyser references
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const allVoices = [...getCustomVoices(), ...ELEVENLABS_VOICES];
  const activeVoiceObj = allVoices.find((v) => v.id === selectedVoice) || ELEVENLABS_VOICES[0];

  // Check AI config & prefill current AI panel keys on open
  useEffect(() => {
    if (open) {
      setIsAiConfigured(aiManager.isConfigured());
      setElevenKey(getElevenLabsApiKey());
      const curProv = (aiManager as any).config?.activeProvider || "openrouter";
      setSelectedProvider(curProv);
      const curKey = (aiManager as any).config?.providers?.[curProv]?.apiKey || "";
      setAiApiKeyInput(curKey);
    }
  }, [open]);

  const handleProviderSelect = (prov: string) => {
    setSelectedProvider(prov);
    const existingKey = (aiManager as any).config?.providers?.[prov]?.apiKey || "";
    setAiApiKeyInput(existingKey);
  };

  // Interactive Resizing handlers for 4 corner handles
  const handleResizeStart = (corner: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = corner;
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: cardSize.width,
      h: cardSize.height,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const dx = ev.clientX - startPosRef.current.x;
      const dy = ev.clientY - startPosRef.current.y;
      const factorX = corner.includes("right") ? 1 : -1;
      const factorY = corner.includes("bottom") ? 1 : -1;

      const newW = Math.min(940, Math.max(460, startPosRef.current.w + dx * factorX * 2));
      const newH = Math.min(740, Math.max(400, startPosRef.current.h + dy * factorY * 2));

      setCardSize({ width: newW, height: newH });
    };

    const handleMouseUp = () => {
      isResizingRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Full teardown of microphone, audio context, speech recognition, and synthesis
  const cleanupAllAudio = useCallback(() => {
    activeRef.current = false;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Setup Real-time Microphone Audio Analyser only when modal opens
  useEffect(() => {
    if (!open) {
      cleanupAllAudio();
      return;
    }

    let isMounted = true;

    const setupMicAnalyser = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!isMounted || !activeRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const renderRealtimeLevels = () => {
          if (!activeRef.current || !analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Map frequencies to 7 bars
          const step = Math.floor(dataArray.length / 7);
          const levels = [0, 1, 2, 3, 4, 5, 6].map((i) => {
            const val = dataArray[i * step] || 0;
            return Math.max(0.12, Math.min(1.0, val / 140));
          });
          setAudioLevels(levels);

          animFrameRef.current = requestAnimationFrame(renderRealtimeLevels);
        };

        animFrameRef.current = requestAnimationFrame(renderRealtimeLevels);
      } catch (err) {
        console.warn("Microphone analyser not accessible:", err);
      }
    };

    setupMicAnalyser();

    return () => {
      isMounted = false;
      cleanupAllAudio();
    };
  }, [open, cleanupAllAudio]);

  // Voice output generation using ElevenLabs or native fallback
  const speakResponse = useCallback(
    async (text: string, onComplete?: () => void) => {
      const cleanSpeech = text
        .replace(/[*_~`#>]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .trim();

      if (!cleanSpeech) {
        onComplete?.();
        return;
      }

      // Try ElevenLabs High-Fidelity TTS first if configured
      if (elevenKey) {
        try {
          await streamElevenLabsSpeech({
            text: cleanSpeech,
            voiceId: selectedVoice,
            apiKey: elevenKey,
            onAudioStart: () => setVoiceState("speaking"),
            onAudioEnd: () => {
              if (activeRef.current) {
                setVoiceState("listening");
                onComplete?.();
              }
            },
          });
          return;
        } catch (err: any) {
          console.warn("ElevenLabs fallback to native speech:", err);
          onToast?.("ElevenLabs error, using native voice");
        }
      }

      // Native SpeechSynthesis Fallback
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        onComplete?.();
        return;
      }

      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanSpeech);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const voices = synth.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha") ||
            v.name.includes("Daniel") ||
            v.name.includes("Alex"))
      ) || voices.find((v) => v.lang.startsWith("en"));

      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onstart = () => {
        setVoiceState("speaking");
      };

      utterance.onend = () => {
        if (activeRef.current) {
          setVoiceState("listening");
          onComplete?.();
        }
      };

      utterance.onerror = () => {
        if (activeRef.current) {
          setVoiceState("listening");
          onComplete?.();
        }
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);
    },
    [elevenKey, selectedVoice, onToast]
  );

  // Process user speech through AI
  const handleUserQuery = useCallback(
    async (query: string) => {
      if (!query.trim() || !activeRef.current) return;

      if (!aiManager.isConfigured()) {
        setShowAiKeySetup(true);
        setVoiceState("error");
        return;
      }

      setVoiceState("thinking");
      setAiResponseText("");

      try {
        const pageContext = page
          ? `Current Document: ${page.title || "Untitled"}\n${(page.blocks || [])
              .slice(0, 8)
              .map((b: any) => b.text || "")
              .join("\n")}`
          : "";

        const systemPrompt = `You are Noska Voice Assistant, an intelligent, conversational voice partner like ChatGPT Advanced Voice Mode. Keep your responses concise (1-3 sentences), warm, natural, and friendly for spoken audio. Avoid markdown formatting like asterisks, tables, or bullet lists. Speak conversationally as two people talking.`;

        const response = await aiManager.send({
          prompt: query,
          system: `${systemPrompt}\n${pageContext}`,
        });

        const fullText = response || "I heard you. How can I assist with your workspace?";
        setAiResponseText(fullText);

        if (activeRef.current && fullText.trim()) {
          await speakResponse(fullText, () => {
            setUserTranscript("");
            startListening();
          });
        }
      } catch (err: any) {
        console.error("Voice assistant AI error:", err);
        const fallback = "I understood your query. How else can I help with your workspace?";
        setAiResponseText(fallback);
        await speakResponse(fallback, () => {
          setUserTranscript("");
          startListening();
        });
      }
    },
    [page, speakResponse]
  );

  // Start continuous speech recognition
  const startListening = useCallback(() => {
    if (!activeRef.current) return;

    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onToast?.("Speech recognition not supported in this browser.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        if (activeRef.current) {
          setVoiceState("listening");
        }
      };

      rec.onresult = (event: any) => {
        // Conversational Barge-In: Stop AI speech if user starts talking
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }

        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }

        if (transcript.trim()) {
          setUserTranscript(transcript);

          // Reset debounce silence timer
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (activeRef.current && transcript.trim()) {
              try {
                rec.stop();
              } catch {
                // ignore
              }
              handleUserQuery(transcript);
            }
          }, 1400);
        }
      };

      rec.onerror = (e: any) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          console.warn("Speech recognition error:", e);
        }
      };

      rec.onend = () => {
        if (activeRef.current && voiceState === "listening") {
          try {
            rec.start();
          } catch {
            // ignore
          }
        }
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      console.warn("Speech recognition start failed:", err);
    }
  }, [handleUserQuery, onToast, voiceState]);

  // Voice Preview Demo function
  const handlePreviewVoice = async (voice: ElevenLabsVoice) => {
    if (previewingVoice) return;
    setPreviewingVoice(voice.id);

    const sampleText =
      voice.previewSampleText || `Hello, this is ${voice.name} from ElevenLabs studio.`;

    if (elevenKey) {
      try {
        await streamElevenLabsSpeech({
          text: sampleText,
          voiceId: voice.id,
          apiKey: elevenKey,
          onAudioEnd: () => setPreviewingVoice(null),
        });
        return;
      } catch (err: any) {
        console.warn("Preview error:", err);
      }
    }

    // Fallback native speech preview
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(sampleText);
      u.onend = () => setPreviewingVoice(null);
      u.onerror = () => setPreviewingVoice(null);
      window.speechSynthesis.speak(u);
    } else {
      setPreviewingVoice(null);
    }
  };

  // Save AI API Key
  const handleSaveAiKey = () => {
    if (!aiApiKeyInput.trim()) return;

    aiManager.configure({
      providers: {
        [selectedProvider]: { apiKey: aiApiKeyInput.trim(), enabled: true },
      },
      activeProvider: selectedProvider,
    });

    setIsAiConfigured(true);
    setShowAiKeySetup(false);
    onToast?.(`Configured ${selectedProvider} API key successfully!`);
    setVoiceState("listening");
    startListening();
  };

  // Handle open/close lifecycle
  useEffect(() => {
    if (open) {
      activeRef.current = true;
      synthRef.current = window.speechSynthesis;
      setUserTranscript("");
      setAiResponseText("");
      startListening();
    } else {
      cleanupAllAudio();
      setVoiceState("idle");
    }

    return () => {
      cleanupAllAudio();
    };
  }, [open, startListening, cleanupAllAudio]);

  const handleStop = () => {
    cleanupAllAudio();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-2xl"
        >
          {/* Resizable Card Wrapper */}
          <div
            style={{ width: `${cardSize.width}px`, height: `${cardSize.height}px` }}
            className="relative flex items-center justify-center transition-[width,height] duration-75"
          >
            {/* ── 4 Bold Resizable Curved Corner Brackets (matching Screenshot 2) ── */}
            {/* Top-Left Corner Handle */}
            <div
              onMouseDown={(e) => handleResizeStart("top-left", e)}
              className="absolute -top-3 -left-3 w-8 h-8 cursor-nwse-resize z-40 group flex items-center justify-center"
              title="Drag to resize"
            >
              <div className="w-6 h-6 border-t-[3.5px] border-l-[3.5px] border-white/60 group-hover:border-white rounded-tl-2xl transition-colors" />
            </div>

            {/* Top-Right Corner Handle */}
            <div
              onMouseDown={(e) => handleResizeStart("top-right", e)}
              className="absolute -top-3 -right-3 w-8 h-8 cursor-nesw-resize z-40 group flex items-center justify-center"
              title="Drag to resize"
            >
              <div className="w-6 h-6 border-t-[3.5px] border-r-[3.5px] border-white/60 group-hover:border-white rounded-tr-2xl transition-colors" />
            </div>

            {/* Bottom-Left Corner Handle */}
            <div
              onMouseDown={(e) => handleResizeStart("bottom-left", e)}
              className="absolute -bottom-3 -left-3 w-8 h-8 cursor-nesw-resize z-40 group flex items-center justify-center"
              title="Drag to resize"
            >
              <div className="w-6 h-6 border-b-[3.5px] border-l-[3.5px] border-white/60 group-hover:border-white rounded-bl-2xl transition-colors" />
            </div>

            {/* Bottom-Right Corner Handle */}
            <div
              onMouseDown={(e) => handleResizeStart("bottom-right", e)}
              className="absolute -bottom-3 -right-3 w-8 h-8 cursor-nwse-resize z-40 group flex items-center justify-center"
              title="Drag to resize"
            >
              <div className="w-6 h-6 border-b-[3.5px] border-r-[3.5px] border-white/60 group-hover:border-white rounded-br-2xl transition-colors" />
            </div>

            {/* Main Dark Matte Voice Assistant Card */}
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full h-full rounded-[36px] bg-[#0c0c0e] border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.95)] p-7 sm:p-9 relative flex flex-col items-center justify-between overflow-hidden select-none"
            >
              {/* Top Bar Header */}
              <div className="w-full flex items-center justify-between z-20">
                <div className="flex items-center gap-2">
                  {/* Real-time Model Selector Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setModelMenuOpen(!modelMenuOpen)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white/90 transition cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="truncate max-w-[130px]">{activeModel}</span>
                      <ChevronDown size={11} className={`text-white/40 transition-transform ${modelMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {modelMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.96 }}
                          className="absolute left-0 top-full mt-2 w-64 rounded-2xl border border-white/15 bg-[#18181c] p-2 shadow-2xl backdrop-blur-2xl z-50 space-y-1"
                        >
                          <div className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-white/40 border-b border-white/10 mb-1">
                            Select AI Brain
                          </div>
                          {POPULAR_MODELS.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setActiveModel(m.name);
                                setModelMenuOpen(false);
                                onToast?.(`Switched model to ${m.name}`);
                              }}
                              className={`w-full flex flex-col text-left px-2.5 py-1.5 rounded-xl text-xs transition ${
                                activeModel === m.name ? "bg-white/15 text-white font-semibold" : "text-white/70 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span className="font-medium">{m.name}</span>
                              <span className="text-[10px] text-white/40">{m.desc}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ElevenLabs Voice Switcher Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setVoiceMenuOpen(!voiceMenuOpen)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-medium text-white/80 transition cursor-pointer"
                    >
                      <Radio size={12} className="text-purple-400" />
                      <span>{activeVoiceObj.name}</span>
                      <ChevronDown size={11} className={`text-white/40 transition-transform ${voiceMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {voiceMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.96 }}
                          className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-white/15 bg-[#18181c] p-2 shadow-2xl backdrop-blur-2xl z-50 space-y-1"
                        >
                          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold tracking-wider uppercase text-white/40 border-b border-white/10 mb-1">
                            <span>ElevenLabs Voices</span>
                            <span className="text-[10px] text-purple-400 font-mono">Studio HD</span>
                          </div>

                          <div className="max-h-56 overflow-y-auto scrollbar-thin space-y-1">
                            {allVoices.map((v) => (
                              <div
                                key={v.id}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition ${
                                  v.id === selectedVoice ? "bg-purple-600/20 text-white font-semibold" : "text-white/70 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedVoice(v.id);
                                    setSelectedVoiceId(v.id);
                                    setVoiceMenuOpen(false);
                                    onToast?.(`Voice changed to ${v.name}`);
                                  }}
                                  className="flex-1 text-left flex flex-col"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span>{v.name}</span>
                                    {v.isCustom && (
                                      <span className="text-[9px] font-bold uppercase tracking-wider px-1 rounded bg-purple-500/20 text-purple-300">
                                        Custom
                                      </span>
                                    )}
                                    <span className="text-[10px] text-white/40 font-normal">({v.accent})</span>
                                  </div>
                                  <span className="text-[10px] text-white/40 font-normal line-clamp-1">{v.description}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreviewVoice(v);
                                  }}
                                  className="p-1 rounded-lg hover:bg-white/20 text-white/60 hover:text-white transition cursor-pointer"
                                  title="Listen to demo preview"
                                >
                                  <Play size={12} className={previewingVoice === v.id ? "text-emerald-400 animate-pulse fill-emerald-400" : ""} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* AI / ElevenLabs API Key Settings Modal Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                      !isAiConfigured
                        ? "bg-amber-500/20 text-amber-300 animate-bounce"
                        : elevenKey
                        ? "bg-white/10 hover:bg-white/20 text-white/80"
                        : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                    }`}
                    title="Configure AI & ElevenLabs Keys"
                  >
                    <Key size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStop();
                    }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition cursor-pointer"
                    title="Close voice conversation"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Warning Banner if Main AI API Key is Not Configured */}
              {!isAiConfigured && !showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full mx-auto my-2 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2 z-20"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} className="text-amber-400 shrink-0" />
                    <span>AI API Key required to chat with voice.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-semibold text-[11px] shrink-0 hover:bg-amber-400 transition cursor-pointer"
                  >
                    Set Key
                  </button>
                </motion.div>
              )}

              {/* Settings Overlay for AI & ElevenLabs API Keys */}
              <AnimatePresence>
                {(showSettings || showAiKeySetup) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-x-6 top-16 z-30 rounded-2xl bg-[#141417] border border-white/15 p-5 shadow-2xl space-y-4 max-h-[380px] overflow-y-auto"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2 font-bold text-xs text-white">
                        <Key size={14} className="text-purple-400" />
                        <span>API Keys & Voice Setup</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSettings(false);
                          setShowAiKeySetup(false);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* 1. Main LLM Provider Key */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-white">
                        <span>1. AI Brain Provider Key</span>
                        <select
                          value={selectedProvider}
                          onChange={(e) => handleProviderSelect(e.target.value)}
                          className="bg-white/10 text-[11px] rounded-lg px-2 py-0.5 text-white border border-white/10 outline-none cursor-pointer"
                        >
                          <option value="openrouter" className="bg-[#18181c]">OpenRouter</option>
                          <option value="openai" className="bg-[#18181c]">OpenAI</option>
                          <option value="groq" className="bg-[#18181c]">Groq</option>
                          <option value="anthropic" className="bg-[#18181c]">Anthropic</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={aiApiKeyInput}
                          onChange={(e) => setAiApiKeyInput(e.target.value)}
                          placeholder={`Paste ${selectedProvider} API key (sk-...)`}
                          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-purple-400 placeholder:text-white/30"
                        />
                        <button
                          type="button"
                          onClick={handleSaveAiKey}
                          className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition shrink-0 cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* 2. ElevenLabs Voice API Key */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between text-xs font-semibold text-white">
                        <span>2. ElevenLabs Ultra-Realistic Voice Key</span>
                        <a
                          href="https://elevenlabs.io"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-purple-400 hover:underline flex items-center gap-1"
                        >
                          <span>Get Key</span>
                          <ExternalLink size={9} />
                        </a>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={elevenKey}
                          onChange={(e) => {
                            setElevenKey(e.target.value);
                            setElevenLabsApiKey(e.target.value);
                          }}
                          placeholder="ElevenLabs API key (sk_...)"
                          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-purple-400 placeholder:text-white/30 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowSettings(false);
                            setShowAiKeySetup(false);
                            onToast?.("ElevenLabs key saved!");
                          }}
                          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition shrink-0 cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Center Fluid Organic Audio Waveform Bars with Real-Time Decibel Reaction */}
              <div className="my-auto flex flex-col items-center justify-center space-y-7 z-10 w-full">
                <div className="flex items-center justify-center gap-2 sm:gap-2.5 h-24">
                  {audioLevels.map((lvl, idx) => (
                    <motion.div
                      key={idx}
                      animate={{
                        height: Math.max(12, lvl * 85),
                        opacity: 0.5 + lvl * 0.5,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 440,
                        damping: 22,
                      }}
                      className="w-3.5 sm:w-4 rounded-full bg-gradient-to-t from-white/40 via-white to-white shadow-[0_0_28px_rgba(255,255,255,0.85)]"
                    />
                  ))}
                </div>

                {/* Dynamic Spoken Transcript Text (matching Screenshot 2) */}
                <div className="min-h-[56px] max-w-md text-center px-4">
                  <AnimatePresence mode="wait">
                    {voiceState === "speaking" && aiResponseText ? (
                      <motion.p
                        key="ai-text"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="text-base sm:text-lg text-white font-medium tracking-tight leading-relaxed line-clamp-3"
                      >
                        {aiResponseText}
                      </motion.p>
                    ) : userTranscript ? (
                      <motion.p
                        key="user-text"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="text-base sm:text-lg text-white font-medium tracking-tight leading-relaxed"
                      >
                        {userTranscript}
                      </motion.p>
                    ) : (
                      <motion.p
                        key="prompt-idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm sm:text-base text-white/40 font-medium"
                      >
                        {voiceState === "listening"
                          ? "Say something..."
                          : voiceState === "thinking"
                          ? `Thinking with ${activeModel}...`
                          : "Ready"}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Bottom Footer Actions with Glowing Orange Stop Button (matching Screenshot 2) */}
              <div className="w-full flex items-center justify-between z-10 pt-2">
                <div className="text-[11px] font-medium text-white/40 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-purple-400" />
                  <span>
                    {elevenKey ? `ElevenLabs HD: ${activeVoiceObj.name}` : "Conversational Voice Mode"}
                  </span>
                </div>

                {/* Glowing Amber Circular Stop Button matching Screenshot 2 */}
                <button
                  type="button"
                  onClick={handleStop}
                  className="w-12 h-12 rounded-full bg-black border-2 border-[#ea580c] flex items-center justify-center shadow-[0_0_30px_rgba(234,88,12,0.65)] hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                  title="Stop voice assistant"
                >
                  <Square className="size-4 fill-[#ea580c] text-[#ea580c] group-hover:scale-90 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
