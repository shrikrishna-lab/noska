/**
 * ElevenLabs Voice Integration for Noska AI
 * Supports high-fidelity voice models, live voice discovery, real preview audio streaming, and tier categorization.
 */

export interface ElevenLabsVoice {
  id: string;
  name: string;
  category: string;
  description: string;
  accent?: string;
  gender?: "female" | "male" | "neutral";
  tier?: "free" | "paid" | "popular";
  previewUrl?: string;
  previewSampleText?: string;
  isCustom?: boolean;
  useCase?: string;
}

// ─── Real Official Studio Voices with Official Preview URLs ───────────────────

export const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    category: "Conversational",
    description: "Warm, natural, and expressive tone designed for live dialogue and assistants.",
    accent: "American (Calm)",
    gender: "female",
    tier: "popular",
    useCase: "Assistant / Dialogue",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/previews/voices/21m00Tcm4TlvDq8ikWAM/american_rachel.mp3",
    previewSampleText: "Hello! I am Rachel, your Noska voice assistant. How can I help you today?",
  },
  {
    id: "9BWtsMINqrJLrRacOk9x",
    name: "Aria",
    category: "Expressive",
    description: "Crisp, dynamic, and engaging voice with bright cadence for active workflows.",
    accent: "American (Clear)",
    gender: "female",
    tier: "popular",
    useCase: "Brainstorming / Productivity",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/previews/voices/9BWtsMINqrJLrRacOk9x/american_aria.mp3",
    previewSampleText: "Hey there! Aria here. Let's build something awesome in your workspace.",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    category: "Soft & Storyteller",
    description: "Gentle, soothing tone ideal for deep reading, note taking, and long focus sessions.",
    accent: "American (Soft)",
    gender: "female",
    tier: "free",
    useCase: "Reading & Research",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/previews/voices/EXAVITQu4vr4xnSDxMaL/american_sarah.mp3",
    previewSampleText: "Good day. I am Sarah, ready to assist with deep research, documents, and notes.",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    category: "Professional",
    description: "Deep, resonant, and articulate male voice with executive clarity.",
    accent: "American (Deep)",
    gender: "male",
    tier: "popular",
    useCase: "Executive Briefs & Analysis",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/previews/voices/pNInz6obpgDQGcFmaJgB/american_adam.mp3",
    previewSampleText: "Welcome to Noska. Let's analyze your documents and streamline your workflow.",
  },
  {
    id: "29vD33N1CtxCmqQRPOHJ",
    name: "Drew",
    category: "Modern Casual",
    description: "Confident, tech-focused, and natural everyday conversational voice.",
    accent: "American (Mid-range)",
    gender: "male",
    tier: "paid",
    useCase: "Tech & Casual Chat",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/previews/voices/29vD33N1CtxCmqQRPOHJ/american_drew.mp3",
    previewSampleText: "Hey! Ready whenever you are. What are we brainstorming next?",
  },
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    category: "Intellectual",
    description: "Warm British tone for thoughtful reasoning, analysis, and summaries.",
    accent: "British (Warm)",
    gender: "male",
    tier: "popular",
    useCase: "Analysis & Synthesis",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/previews/voices/JBFqnCBsd6RMkjVDRZzb/british_george.mp3",
    previewSampleText: "Greetings. I have synthesized your notes and prepared the key takeaways.",
  },
  {
    id: "IKne3meq5aSn9XLyUdCD",
    name: "Charlie",
    category: "Friendly",
    description: "Casual Australian tone with natural rhythm and engaging personality.",
    accent: "Australian",
    gender: "male",
    tier: "free",
    useCase: "General Assistant",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/previews/voices/IKne3meq5aSn9XLyUdCD/australian_charlie.mp3",
    previewSampleText: "G'day! Let's get right into your tasks and ideas.",
  },
  {
    id: "XB0fDUnXU5powFXDhCwa",
    name: "Charlotte",
    category: "Narrative & Audiobook",
    description: "Sophisticated Swedish-English accent for elegant reading.",
    accent: "English (Swedish Accent)",
    gender: "female",
    tier: "paid",
    useCase: "Storytelling & Audiobooks",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/previews/voices/XB0fDUnXU5powFXDhCwa/charlotte.mp3",
    previewSampleText: "Hello there. Let me read through your drafted sections with elegance and depth.",
  },
  {
    id: "bIHbv24MWmeRgasZH58o",
    name: "Will",
    category: "Friendly & Casual",
    description: "Warm American voice suitable for tutorials, explanations, and advice.",
    accent: "American (Warm)",
    gender: "male",
    tier: "free",
    useCase: "Tutorials & Guides",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/previews/voices/bIHbv24MWmeRgasZH58o/will.mp3",
    previewSampleText: "Hey! Let's walk through how this feature works step by step.",
  },
  {
    id: "CwhRBWXzGAHq8TQ4Fs17",
    name: "Roger",
    category: "Confident Executive",
    description: "Authoritative, clear, and reassuring tone for business and strategy.",
    accent: "American (Polished)",
    gender: "male",
    tier: "paid",
    useCase: "Business & Strategy",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/previews/voices/CwhRBWXzGAHq8TQ4Fs17/roger.mp3",
    previewSampleText: "Good morning. Here is the operational summary of your strategic goals.",
  },
];

const ELEVENLABS_KEY_STORAGE = "noska_elevenlabs_api_key";
const ELEVENLABS_VOICE_STORAGE = "noska_elevenlabs_voice_id";
const ELEVENLABS_CUSTOM_VOICES_STORAGE = "noska_elevenlabs_custom_voices";
const ELEVENLABS_LIVE_CATALOG_STORAGE = "noska_elevenlabs_live_catalog";

export function getElevenLabsApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ELEVENLABS_KEY_STORAGE) || "";
}

export function setElevenLabsApiKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ELEVENLABS_KEY_STORAGE, key.trim());
}

export function getCustomVoices(): ElevenLabsVoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ELEVENLABS_CUSTOM_VOICES_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addCustomVoice(voice: { id: string; name: string; description?: string; accent?: string }): ElevenLabsVoice[] {
  if (typeof window === "undefined") return [];
  const current = getCustomVoices().filter((v) => v.id !== voice.id);
  const newVoice: ElevenLabsVoice = {
    id: voice.id.trim(),
    name: voice.name.trim(),
    category: "Custom Cloned Voice",
    description: voice.description?.trim() || "User configured custom cloned voice",
    accent: voice.accent?.trim() || "Custom Cloned",
    gender: "neutral",
    tier: "paid",
    useCase: "Custom Voice Cloning",
    previewSampleText: `Hello! This is a real test preview of ${voice.name.trim()} on Noska AI.`,
    isCustom: true,
  };
  const updated = [newVoice, ...current];
  localStorage.setItem(ELEVENLABS_CUSTOM_VOICES_STORAGE, JSON.stringify(updated));
  return updated;
}

export function removeCustomVoice(voiceId: string): ElevenLabsVoice[] {
  if (typeof window === "undefined") return [];
  const updated = getCustomVoices().filter((v) => v.id !== voiceId);
  localStorage.setItem(ELEVENLABS_CUSTOM_VOICES_STORAGE, JSON.stringify(updated));
  return updated;
}

/**
 * Fetch real-time live voices from ElevenLabs API
 */
export async function fetchLiveElevenLabsVoices(apiKey?: string): Promise<ElevenLabsVoice[]> {
  const key = apiKey || getElevenLabsApiKey();
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (key) headers["xi-api-key"] = key;

    const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers });
    if (!res.ok) throw new Error(`ElevenLabs API status: ${res.status}`);

    const data = await res.json();
    const liveList = Array.isArray(data.voices) ? data.voices : [];

    const parsed: ElevenLabsVoice[] = liveList.map((v: any) => {
      const labels = v.labels || {};
      const accent = labels.accent ? `${labels.accent} (${labels.description || labels.tone || "Natural"})` : labels.gender || "Studio Voice";
      const gender = (labels.gender?.toLowerCase() === "female" ? "female" : labels.gender?.toLowerCase() === "male" ? "male" : "neutral") as "female" | "male" | "neutral";
      const isCustomCloned = v.category === "cloned" || v.category === "generated";
      const tier: "free" | "paid" | "popular" = isCustomCloned ? "paid" : (v.high_quality_base_model_ids?.length ? "popular" : "free");

      return {
        id: v.voice_id,
        name: v.name,
        category: v.category || labels.use_case || "Conversational",
        description: v.description || labels.description || `Studio voice model by ElevenLabs.`,
        accent,
        gender,
        tier,
        useCase: labels.use_case || v.category || "Assistant",
        previewUrl: v.preview_url,
        previewSampleText: `Hello! You are listening to ${v.name}, live on Noska AI.`,
        isCustom: isCustomCloned,
      };
    });

    if (parsed.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(ELEVENLABS_LIVE_CATALOG_STORAGE, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch (err) {
    console.warn("Could not fetch live ElevenLabs voices, using cached/fallback:", err);
  }

  // Fallback to cached catalog or default studio models
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(ELEVENLABS_LIVE_CATALOG_STORAGE);
      if (cached) return JSON.parse(cached);
    } catch {}
  }

  return ELEVENLABS_VOICES;
}

export function getAllVoices(): ElevenLabsVoice[] {
  const custom = getCustomVoices();
  let live: ElevenLabsVoice[] = [];
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(ELEVENLABS_LIVE_CATALOG_STORAGE);
      if (cached) live = JSON.parse(cached);
    } catch {}
  }
  const base = live.length > 0 ? live : ELEVENLABS_VOICES;
  const seen = new Set<string>();
  const list: ElevenLabsVoice[] = [];

  for (const c of custom) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      list.push(c);
    }
  }
  for (const b of base) {
    if (!seen.has(b.id)) {
      seen.add(b.id);
      list.push(b);
    }
  }

  return list;
}

export function getSelectedVoiceId(): string {
  if (typeof window === "undefined") return ELEVENLABS_VOICES[0].id;
  return localStorage.getItem(ELEVENLABS_VOICE_STORAGE) || ELEVENLABS_VOICES[0].id;
}

export function setSelectedVoiceId(voiceId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ELEVENLABS_VOICE_STORAGE, voiceId);
}

// ─── Real Audio Preview Manager ───────────────────────────────────────────────

let activePreviewAudio: HTMLAudioElement | null = null;

export function stopVoicePreview(): void {
  if (activePreviewAudio) {
    try {
      activePreviewAudio.pause();
      activePreviewAudio.currentTime = 0;
    } catch {}
    activePreviewAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

export async function playVoicePreview(voice: ElevenLabsVoice, onEnd?: () => void): Promise<void> {
  stopVoicePreview();

  // 1. Play real official preview MP3 if available
  if (voice.previewUrl) {
    try {
      const audio = new Audio(voice.previewUrl);
      activePreviewAudio = audio;
      audio.onended = () => {
        activePreviewAudio = null;
        onEnd?.();
      };
      audio.onerror = () => {
        activePreviewAudio = null;
        playBrowserSynthesis(voice, onEnd);
      };
      await audio.play();
      return;
    } catch (err) {
      console.warn("Could not play audio from previewUrl, falling back to speech synthesis:", err);
    }
  }

  // 2. Fallback to browser neural TTS
  playBrowserSynthesis(voice, onEnd);
}

function playBrowserSynthesis(voice: ElevenLabsVoice, onEnd?: () => void): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  const sample = voice.previewSampleText || `Hello! This is a preview of ${voice.name} on Noska.`;
  const utterance = new SpeechSynthesisUtterance(sample);
  
  if (voice.gender === "female") {
    utterance.pitch = 1.15;
  } else if (voice.gender === "male") {
    utterance.pitch = 0.88;
  } else {
    utterance.pitch = 1.0;
  }
  utterance.rate = 1.0;

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
}

/**
 * Synthesize speech using ElevenLabs API
 */
export async function streamElevenLabsSpeech({
  text,
  voiceId,
  apiKey,
  onAudioStart,
  onAudioEnd,
}: {
  text: string;
  voiceId?: string;
  apiKey?: string;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
}): Promise<void> {
  const key = apiKey || getElevenLabsApiKey();
  const vid = voiceId || getSelectedVoiceId();

  if (!key) {
    throw new Error("ElevenLabs API key not configured");
  }

  const cleanText = text
    .replace(/[*_~`#>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

  if (!cleanText) {
    onAudioEnd?.();
    return;
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${vid}/stream?optimize_streaming_latency=3`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": key,
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "API request failed");
    throw new Error(`ElevenLabs error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);

  onAudioStart?.();

  return new Promise((resolve) => {
    source.onended = () => {
      onAudioEnd?.();
      audioContext.close();
      resolve();
    };
    source.start(0);
  });
}
