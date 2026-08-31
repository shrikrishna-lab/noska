/**
 * Advanced Speech-to-Text Engine
 * Supports multiple providers: Web Speech API, WebAssembly Whisper (Transformers.js), Cloud APIs
 * Designed for real-time, low-latency transcription with fallback chain
 */

import { env } from "../../utils/env";

export type STTProvider = 
  | "web-speech"      // Browser native (Chromium)
  | "whisper-wasm"    // Transformers.js Whisper (offline, on-device)
  | "deepgram"        // Deepgram Nova-2 (cloud, best accuracy)
  | "groq-whisper"    // Groq Whisper (cloud, fast)
  | "openai-whisper"  // OpenAI Whisper (cloud)
  | "assemblyai";     // AssemblyAI (cloud, real-time)

export interface STTConfig {
  provider: STTProvider;
  language: string;
  model?: string;
  apiKey?: string;
  endpoint?: string;
  // Whisper WASM options
  wasmModelSize?: "tiny" | "base" | "small" | "medium" | "large-v3";
  // Real-time streaming options
  interimResults?: boolean;
  punctuation?: boolean;
  profanityFilter?: boolean;
  smartFormat?: boolean;
  continuous?: boolean;
  // Audio constraints
  sampleRate?: number;
  encoding?: "linear16" | "mulaw" | "flac" | "opus" | "webm";
}

export interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
  words?: WordTimestamp[];
  language?: string;
  duration?: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface STTEngineEvents {
  onResult: (result: TranscriptionResult) => void;
  onError: (error: Error) => void;
  onStart: () => void;
  onEnd: () => void;
  onAudioLevel: (level: number) => void;
}

type EventHandler<K extends keyof STTEngineEvents> = STTEngineEvents[K];

export class STTEngine {
  private config: STTConfig;
  private events: Partial<STTEngineEvents> = {};
  private isRunning = false;
  private providerInstance: ISTTProvider | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrame: number | null = null;

  constructor(config: Partial<STTConfig> = {}) {
    this.config = {
      provider: "web-speech",
      language: "en-US",
      interimResults: true,
      punctuation: true,
      smartFormat: true,
      sampleRate: 16000,
      encoding: "linear16",
      ...config,
    };
  }

  on<K extends keyof STTEngineEvents>(event: K, handler: EventHandler<K>) {
    this.events[event] = handler;
  }

  off<K extends keyof STTEngineEvents>(event: K) {
    delete this.events[event];
  }

  private emit<K extends keyof STTEngineEvents>(event: K, ...args: Parameters<EventHandler<K>>) {
    (this.events[event] as any)?.(...args);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);

      this.providerInstance = await this.createProvider(this.config.provider);
      await this.providerInstance.start(this.mediaStream, this.config);
      
      this.isRunning = true;
      this.startAudioLevelMonitoring();
      this.emit("onStart");
    } catch (error) {
      this.emit("onError", error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.providerInstance) {
      await this.providerInstance.stop();
      this.providerInstance = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.emit("onEnd");
  }

  private startAudioLevelMonitoring() {
    if (!this.analyser || !this.isRunning) return;
    
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const checkLevel = () => {
      if (!this.isRunning || !this.analyser) return;
      
      this.analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      const avg = sum / data.length;
      const normalized = Math.min(1, avg / 128);
      this.emit("onAudioLevel", normalized);
      
      this.animationFrame = requestAnimationFrame(checkLevel);
    };
    checkLevel();
  }

  private async createProvider(provider: STTProvider): Promise<ISTTProvider> {
    switch (provider) {
      case "web-speech":
        return new WebSpeechProvider();
      case "whisper-wasm":
        return new WhisperWASMProvider();
      case "deepgram":
        return new DeepgramProvider();
      case "groq-whisper":
        return new GroqWhisperProvider();
      case "openai-whisper":
        return new OpenAIWhisperProvider();
      case "assemblyai":
        return new AssemblyAIProvider();
      default:
        throw new Error(`Unknown STT provider: ${provider}`);
    }
  }

  setConfig(config: Partial<STTConfig>) {
    this.config = { ...this.config, ...config };
    if (this.providerInstance && this.isRunning) {
      this.providerInstance.updateConfig(this.config);
    }
  }

  getConfig(): STTConfig {
    return { ...this.config };
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }
}

interface ISTTProvider {
  start(stream: MediaStream, config: STTConfig): Promise<void>;
  stop(): Promise<void>;
  updateConfig(config: STTConfig): void;
  onResult: (result: TranscriptionResult) => void;
  onError: (error: Error) => void;
}

// ─── Web Speech API Provider (Browser Native) ───
class WebSpeechProvider implements ISTTProvider {
  private recognition: any = null;
  private config: STTConfig = { provider: "web-speech", language: "en-US" };
  onResult: (result: TranscriptionResult) => void = () => {};
  onError: (error: Error) => void = () => {};

  async start(stream: MediaStream, config: STTConfig): Promise<void> {
    this.config = config;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error("Web Speech API not supported in this browser");
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = config.interimResults ?? true;
    this.recognition.lang = config.language;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      let lastConfidence: number | undefined;
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += transcript;
          lastConfidence = result[0].confidence;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.onResult({
          text: finalTranscript.trim(),
          isFinal: true,
          confidence: lastConfidence,
        });
      }
      if (interimTranscript) {
        this.onResult({
          text: interimTranscript.trim(),
          isFinal: false,
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        this.onError(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    this.recognition.onend = () => {
      if (this.recognition && this.config.continuous) {
        try { this.recognition.start(); } catch {}
      }
    };

    this.recognition.start();
  }

  async stop(): Promise<void> {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }

  updateConfig(config: STTConfig) {
    this.config = { ...this.config, ...config };
    if (this.recognition) {
      this.recognition.lang = config.language ?? this.recognition.lang;
      this.recognition.interimResults = config.interimResults ?? this.recognition.interimResults;
    }
  }
}

// ─── Whisper WASM Provider (Transformers.js - Offline/On-Device) ───
class WhisperWASMProvider implements ISTTProvider {
  private pipeline: any = null;
  private config: STTConfig = { provider: "whisper-wasm", language: "en-US" };
  private audioChunks: Float32Array[] = [];
  private isProcessing = false;
  private processor: ScriptProcessorNode | null = null;
  onResult: (result: TranscriptionResult) => void = () => {};
  onError: (error: Error) => void = () => {};

  async start(stream: MediaStream, config: STTConfig): Promise<void> {
    this.config = config;
    
    try {
      // Dynamic import to avoid bundling if not used
      // @ts-ignore - optional dependency, not always installed
      const { pipeline } = await (import("@xenova/transformers") as any);
      
      const modelSize = config.wasmModelSize || "base";
      const modelId = `Xenova/whisper-${modelSize}.en`;
      
      this.pipeline = await pipeline(
        "automatic-speech-recognition",
        modelId,
        { quantized: true, revision: "main" }
      );

      // Set up audio processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      this.processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        if (!this.isProcessing) {
          const inputData = e.inputBuffer.getChannelData(0);
          this.audioChunks.push(new Float32Array(inputData));
        }
      };

      source.connect(this.processor);
      this.processor.connect(audioContext.destination);

      // Process chunks periodically
      this.processLoop();
    } catch (error) {
      this.onError(new Error(`Failed to load Whisper WASM: ${error}`));
      throw error;
    }
  }

  private async processLoop() {
    while (this.pipeline && this.audioChunks.length > 0) {
      if (this.isProcessing) {
        await new Promise(r => setTimeout(r, 100));
        continue;
      }

      this.isProcessing = true;
      
      // Combine chunks
      const totalLength = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of this.audioChunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      this.audioChunks = [];

      // Process if we have enough audio (at least 1 second)
      if (combined.length >= 16000) {
        try {
          const result = await this.pipeline(combined, {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: true,
          });

          if (result.text && result.text.trim()) {
            this.onResult({
              text: result.text.trim(),
              isFinal: true,
              words: result.chunks?.map((c: any) => ({
                word: c.text.trim(),
                start: c.timestamp[0],
                end: c.timestamp[1],
                confidence: 0.9,
              })),
            });
          }
        } catch (error) {
          console.error("Whisper processing error:", error);
        }
      }
      
      this.isProcessing = false;
    }
    
    if (this.pipeline) {
      setTimeout(() => this.processLoop(), 500);
    }
  }

  async stop(): Promise<void> {
    this.pipeline = null;
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
  }

  updateConfig(config: STTConfig) {
    this.config = { ...this.config, ...config };
  }
}

// ─── Deepgram Provider (Cloud, Best Real-time) ───
class DeepgramProvider implements ISTTProvider {
  private socket: WebSocket | null = null;
  private config: STTConfig = { provider: "deepgram", language: "en-US" };
  private mediaRecorder: MediaRecorder | null = null;
  onResult: (result: TranscriptionResult) => void = () => {};
  onError: (error: Error) => void = () => {};

  async start(stream: MediaStream, config: STTConfig): Promise<void> {
    this.config = config;
    const apiKey = config.apiKey || env.VITE_DEEPGRAM_API_KEY;
    
    if (!apiKey) {
      throw new Error("Deepgram API key required");
    }

    const params = new URLSearchParams({
      model: config.model || "nova-2",
      language: config.language.split("-")[0],
      punctuate: String(config.punctuation ?? true),
      smart_format: String(config.smartFormat ?? true),
      interim_results: String(config.interimResults ?? true),
      encoding: config.encoding || "linear16",
      sample_rate: String(config.sampleRate || 16000),
      channels: "1",
    });

    this.socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ["token", apiKey]);
    this.socket.binaryType = "arraybuffer";

    this.socket.onopen = () => {
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(e.data);
        }
      };
      
      this.mediaRecorder.start(100); // Send chunks every 100ms
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.channel?.alternatives?.[0]?.transcript) {
          this.onResult({
            text: data.channel.alternatives[0].transcript,
            isFinal: data.is_final || false,
            confidence: data.channel.alternatives[0].confidence,
            words: data.channel.alternatives[0].words?.map((w: any) => ({
              word: w.word,
              start: w.start,
              end: w.end,
              confidence: w.confidence,
            })),
          });
        }
      } catch {}
    };

    this.socket.onerror = (event) => {
      this.onError(new Error("Deepgram connection error"));
    };

    this.socket.onclose = () => {
      if (this.mediaRecorder) {
        this.mediaRecorder.stop();
      }
    };
  }

  async stop(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  updateConfig(config: STTConfig) {
    this.config = { ...this.config, ...config };
  }
}

// ─── Groq Whisper Provider (Cloud, Fast) ───
class GroqWhisperProvider implements ISTTProvider {
  private config: STTConfig = { provider: "groq-whisper", language: "en-US" };
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isProcessing = false;
  onResult: (result: TranscriptionResult) => void = () => {};
  onError: (error: Error) => void = () => {};

  async start(stream: MediaStream, config: STTConfig): Promise<void> {
    this.config = config;
    const apiKey = config.apiKey || env.VITE_GROQ_API_KEY;
    
    if (!apiKey) {
      throw new Error("Groq API key required for Whisper");
    }

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => this.processRecording(apiKey);
    this.mediaRecorder.start(3000); // Process every 3 seconds
  }

  private async processRecording(apiKey: string) {
    if (this.isProcessing || this.audioChunks.length === 0) return;
    this.isProcessing = true;

    const blob = new Blob(this.audioChunks, { type: "audio/webm" });
    this.audioChunks = [];

    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", this.config.model || "whisper-large-v3-turbo");
    formData.append("language", this.config.language.split("-")[0]);
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "word");

    try {
      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}` },
        body: formData,
      });

      if (!response.ok) throw new Error(`Groq API error: ${response.statusText}`);
      
      const data = await response.json();
      if (data.text?.trim()) {
        this.onResult({
          text: data.text.trim(),
          isFinal: true,
          words: data.words?.map((w: any) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            confidence: 0.95,
          })),
        });
      }
    } catch (error) {
      this.onError(new Error(`Groq transcription failed: ${error}`));
    } finally {
      this.isProcessing = false;
      if (this.mediaRecorder?.state === "recording") {
        this.mediaRecorder.start(3000);
      }
    }
  }

  async stop(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
  }

  updateConfig(config: STTConfig) {
    this.config = { ...this.config, ...config };
  }
}

// ─── OpenAI Whisper Provider ───
class OpenAIWhisperProvider implements ISTTProvider {
  private config: STTConfig = { provider: "openai-whisper", language: "en-US" };
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isProcessing = false;
  onResult: (result: TranscriptionResult) => void = () => {};
  onError: (error: Error) => void = () => {};

  async start(stream: MediaStream, config: STTConfig): Promise<void> {
    this.config = config;
    const apiKey = config.apiKey || env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("OpenAI API key required for Whisper");
    }

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => this.processRecording(apiKey);
    this.mediaRecorder.start(5000); // Process every 5 seconds
  }

  private async processRecording(apiKey: string) {
    if (this.isProcessing || this.audioChunks.length === 0) return;
    this.isProcessing = true;

    const blob = new Blob(this.audioChunks, { type: "audio/webm" });
    this.audioChunks = [];

    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", this.config.model || "whisper-1");
    formData.append("language", this.config.language.split("-")[0]);
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "word");

    try {
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}` },
        body: formData,
      });

      if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);
      
      const data = await response.json();
      if (data.text?.trim()) {
        this.onResult({
          text: data.text.trim(),
          isFinal: true,
          words: data.words?.map((w: any) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            confidence: 0.95,
          })),
        });
      }
    } catch (error) {
      this.onError(new Error(`OpenAI transcription failed: ${error}`));
    } finally {
      this.isProcessing = false;
      if (this.mediaRecorder?.state === "recording") {
        this.mediaRecorder.start(5000);
      }
    }
  }

  async stop(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
  }

  updateConfig(config: STTConfig) {
    this.config = { ...this.config, ...config };
  }
}

// ─── AssemblyAI Provider (Real-time Streaming) ───
class AssemblyAIProvider implements ISTTProvider {
  private socket: WebSocket | null = null;
  private config: STTConfig = { provider: "assemblyai", language: "en-US" };
  private mediaRecorder: MediaRecorder | null = null;
  onResult: (result: TranscriptionResult) => void = () => {};
  onError: (error: Error) => void = () => {};

  async start(stream: MediaStream, config: STTConfig): Promise<void> {
    this.config = config;
    const apiKey = config.apiKey || env.VITE_ASSEMBLYAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("AssemblyAI API key required");
    }

    this.socket = new WebSocket("wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000");
    this.socket.binaryType = "arraybuffer";

    this.socket.onopen = () => {
      this.socket?.send(JSON.stringify({ token_type: "Bearer", token: apiKey }));
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onload = () => {
            this.socket?.send(JSON.stringify({ audio_data: btoa(reader.result as string) }));
          };
          reader.readAsBinaryString(e.data);
        }
      };
      
      this.mediaRecorder.start(100);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.text) {
          this.onResult({
            text: data.text,
            isFinal: data.message_type === "FinalTranscript",
            confidence: data.confidence,
          });
        }
      } catch {}
    };

    this.socket.onerror = () => {
      this.onError(new Error("AssemblyAI connection error"));
    };
  }

  async stop(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  updateConfig(config: STTConfig) {
    this.config = { ...this.config, ...config };
  }
}

// ─── Factory & Helper Functions ───
export function createSTTEngine(config?: Partial<STTConfig>): STTEngine {
  return new STTEngine(config);
}

export async function getAvailableProviders(): Promise<STTProvider[]> {
  const providers: STTProvider[] = ["web-speech"];
  
  // Check if Transformers.js is available (for Whisper WASM)
  try {
    // @ts-ignore - optional dependency, not always installed
    await (import("@xenova/transformers") as any);
    providers.push("whisper-wasm");
  } catch {}

  // Cloud providers are always available if API keys exist
  if (env.VITE_DEEPGRAM_API_KEY) providers.push("deepgram");
  if (env.VITE_GROQ_API_KEY) providers.push("groq-whisper");
  if (env.VITE_OPENAI_API_KEY) providers.push("openai-whisper");
  if (env.VITE_ASSEMBLYAI_API_KEY) providers.push("assemblyai");

  return providers;
}

export function getProviderDisplayName(provider: STTProvider): string {
  const names: Record<STTProvider, string> = {
    "web-speech": "Browser Native (Free, Chromium only)",
    "whisper-wasm": "Whisper WASM (Offline, On-Device)",
    "deepgram": "Deepgram Nova-2 (Best Accuracy, Real-time)",
    "groq-whisper": "Groq Whisper (Fast, Cloud)",
    "openai-whisper": "OpenAI Whisper (Cloud)",
    "assemblyai": "AssemblyAI (Real-time Streaming)",
  };
  return names[provider];
}

export function getProviderDescription(provider: STTProvider): string {
  const descriptions: Record<STTProvider, string> = {
    "web-speech": "Built into Chrome/Edge. Free, no API key needed. Limited to Chromium browsers.",
    "whisper-wasm": "Runs entirely in your browser via WebAssembly. Private, offline, no API key. Slower on first load.",
    "deepgram": "Industry-leading accuracy with real-time streaming. Requires Deepgram API key.",
    "groq-whisper": "Extremely fast Whisper inference on Groq LPU. Requires Groq API key.",
    "openai-whisper": "OpenAI's hosted Whisper model. Requires OpenAI API key.",
    "assemblyai": "Real-time streaming with speaker diarization. Requires AssemblyAI API key.",
  };
  return descriptions[provider];
}