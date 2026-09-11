/**
 * Noska AI — Base Provider Adapter
 * 
 * Shared network, error classification, bounded retry, and pagination helpers
 * for official AI provider model discovery APIs.
 */

import type {
  ModelCapabilities,
  NormalizedModel,
  ProviderAdapter,
  ProviderCredentials,
  ValidationResult,
} from "../normalizedSchema";
import { KNOWN_MODEL_OVERRIDES } from "../ModelMetadataOverrides";

export interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxRetries?: number;
}

/**
 * Generic deterministic formatter converting model IDs (e.g. gpt-xyz-mini, gemini-2.0-flash,
 * llama-3.3-70b-versatile, future-model-xyz-2026) into clean, human-readable display names.
 */
export function formatModelName(id: string): string {
  if (!id) return "";

  // Strip common URL / provider prefixes e.g. "models/", "accounts/xyz/models/"
  let clean = id.replace(/^(models\/|accounts\/[^/]+\/models\/)/i, "");

  // If id is namespace-scoped like "nvidia/llama-3.1-nemotron-70b-instruct"
  if (clean.includes("/")) {
    const parts = clean.split("/");
    clean = parts[parts.length - 1];
  }

  // Replace delimiters with spaces
  clean = clean.replace(/[-_.:]/g, " ");

  const techAcronyms: Record<string, string> = {
    gpt: "GPT",
    dall: "DALL",
    e: "E",
    nim: "NIM",
    ai: "AI",
    api: "API",
    llm: "LLM",
    vl: "VL",
    moe: "MoE",
    tts: "TTS",
    r1: "R1",
    v3: "V3",
    v2: "V2",
    v1: "V1",
    "70b": "70B",
    "8b": "8B",
    "32b": "32B",
    "14b": "14B",
    "7b": "7B",
    "3b": "3B",
    "1b": "1B",
    "24b": "24B",
    "405b": "405B",
    "671b": "671B",
    exp: "Exp",
    it: "IT",
    instruct: "Instruct",
    preview: "Preview",
    turbo: "Turbo",
    flash: "Flash",
    pro: "Pro",
    sonnet: "Sonnet",
    haiku: "Haiku",
    opus: "Opus",
    llama: "Llama",
    gemini: "Gemini",
    claude: "Claude",
    deepseek: "DeepSeek",
    mistral: "Mistral",
    codestral: "Codestral",
    pixtral: "Pixtral",
    ministral: "Ministral",
    grok: "Grok",
    qwen: "Qwen",
  };

  return clean
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (techAcronyms[lower]) {
        return techAcronyms[lower];
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

const PROXY_MAP: Record<string, string> = {
  "https://opencode.ai/zen/v1": "/api/proxy/opencode",
  "https://openrouter.ai/api/v1": "/api/proxy/openrouter",
  "https://api.anthropic.com/v1": "/api/proxy/anthropic",
  "https://api.openai.com/v1": "/api/proxy/openai",
  "https://generativelanguage.googleapis.com/v1beta": "/api/proxy/gemini",
  "https://api.groq.com/openai/v1": "/api/proxy/groq",
  "https://api.deepseek.com/v1": "/api/proxy/deepseek",
  "https://api.mistral.ai/v1": "/api/proxy/mistral",
  "https://api.together.xyz/v1": "/api/proxy/together",
  "https://api.x.ai/v1": "/api/proxy/xai",
  "https://integrate.api.nvidia.com/v1": "/api/proxy/nvidia",
};

export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract provider: string;
  abstract displayName: string;
  abstract defaultBaseUrl: string;

  abstract listModels(credentials: ProviderCredentials, signal?: AbortSignal): Promise<NormalizedModel[]>;
  abstract normalizeModel(raw: any): NormalizedModel | null;

  async validateConnection(credentials: ProviderCredentials, signal?: AbortSignal): Promise<ValidationResult> {
    try {
      const models = await this.listModels(credentials, signal);
      return {
        isValid: Array.isArray(models) && models.length > 0,
        details: { count: models.length },
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: err?.message || "Connection validation failed",
      };
    }
  }

  /**
   * Safe fetch with bounded exponential backoff for transient errors (429, 502, 503, 504)
   * and automatic browser CORS proxy resolution.
   */
  protected async fetchWithRetry(
    url: string,
    init: RequestInit = {},
    options: RequestOptions = {}
  ): Promise<Response> {
    const maxRetries = options.maxRetries ?? 2;
    const timeoutMs = options.timeoutMs ?? 15000;
    let attempt = 0;

    let targetUrl = url;
    if (typeof window !== "undefined" && !url.includes("/api/proxy/")) {
      for (const [prefix, proxyPrefix] of Object.entries(PROXY_MAP)) {
        if (url.startsWith(prefix)) {
          targetUrl = url.replace(prefix, `${window.location.origin}${proxyPrefix}`);
          break;
        }
      }
    }

    while (attempt <= maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      if (options.signal) {
        options.signal.addEventListener("abort", () => controller.abort(), { once: true });
      }

      try {
        const res = await fetch(targetUrl, {
          ...init,
          signal: controller.signal,
          headers: {
            "Accept": "application/json",
            ...options.headers,
            ...init.headers,
          },
        });

        clearTimeout(timer);

        // Success or non-retryable client error (400, 401, 403, 404)
        if (res.ok || (res.status >= 400 && res.status < 429)) {
          return res;
        }

        // Retryable: 429 (rate limit) or 5xx (server error)
        if (attempt <= maxRetries && (res.status === 429 || res.status >= 500)) {
          const retryAfterHeader = res.headers.get("Retry-After");
          const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;
          const backoffMs = retryAfterMs || Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        return res;
      } catch (err: any) {
        clearTimeout(timer);
        if (attempt > maxRetries || controller.signal.aborted) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    throw new Error(`Failed to fetch from ${url} after ${maxRetries} retries.`);
  }

  /**
   * Resolve model display name:
   * 1. raw.name / raw.display_name / raw.displayName
   * 2. Optional Noska enrichment override
   * 3. Generic deterministic ID formatter
   */
  protected resolveDisplayName(modelId: string, raw?: any): string {
    if (raw?.displayName && typeof raw.displayName === "string") return raw.displayName.trim();
    if (raw?.display_name && typeof raw.display_name === "string") return raw.display_name.trim();
    if (raw?.name && typeof raw.name === "string" && !raw.name.startsWith("models/")) return raw.name.trim();

    const override = KNOWN_MODEL_OVERRIDES[modelId] || KNOWN_MODEL_OVERRIDES[`${this.provider}/${modelId}`];
    if (override?.displayName) return override.displayName;

    return formatModelName(modelId);
  }

  /**
   * Detect capabilities dynamically:
   * 1. Provider API metadata
   * 2. Optional enrichment override
   * 3. Conservative trait inference (never invent capabilities without evidence)
   */
  protected inferCapabilities(modelId: string, raw?: any): ModelCapabilities {
    const override = KNOWN_MODEL_OVERRIDES[modelId] || KNOWN_MODEL_OVERRIDES[`${this.provider}/${modelId}`];
    const rawCaps = raw?.capabilities;
    const rawModalities: string[] = Array.isArray(raw?.supported_modalities) ? raw.supported_modalities : [];
    const rawMethods: string[] = Array.isArray(raw?.supportedGenerationMethods) ? raw.supportedGenerationMethods : [];

    const id = (modelId || "").toLowerCase();
    const isImageGen = id.includes("dall-e") || id.includes("imagen") || id.includes("flux") || rawModalities.includes("image_generation");
    const isEmbeddings = id.includes("embedding") || id.includes("embed") || id.includes("ada-002");

    // Vision
    let isVision = false;
    if (rawCaps?.vision !== undefined) isVision = Boolean(rawCaps.vision);
    else if (rawModalities.includes("image") || rawModalities.includes("vision")) isVision = true;
    else if (override?.capabilities?.vision !== undefined) isVision = Boolean(override.capabilities.vision);
    else isVision = id.includes("vision") || id.includes("-vl") || id.includes("pixtral") || id.includes("gpt-4o") || id.includes("gemini") || id.includes("claude-3");

    // Audio
    let isAudio = false;
    if (rawCaps?.audio !== undefined) isAudio = Boolean(rawCaps.audio);
    else if (rawModalities.includes("audio")) isAudio = true;
    else if (override?.capabilities?.audio !== undefined) isAudio = Boolean(override.capabilities.audio);
    else isAudio = id.includes("whisper") || id.includes("audio") || id.includes("voice");

    // Video
    let isVideo = false;
    if (rawCaps?.video !== undefined) isVideo = Boolean(rawCaps.video);
    else if (rawModalities.includes("video")) isVideo = true;
    else if (override?.capabilities?.video !== undefined) isVideo = Boolean(override.capabilities.video);
    else isVideo = id.includes("video");

    // Reasoning
    let isReasoning = false;
    if (rawCaps?.reasoning !== undefined) isReasoning = Boolean(rawCaps.reasoning);
    else if (override?.capabilities?.reasoning !== undefined) isReasoning = Boolean(override.capabilities.reasoning);
    else isReasoning = id.includes("reason") || id.includes("thinking") || id.includes("r1") || id.startsWith("o1") || id.startsWith("o3");

    // Tool calling
    let isToolCapable = !isEmbeddings && !isImageGen;
    if (raw?.tools !== undefined) isToolCapable = Boolean(raw.tools);
    else if (rawCaps?.tools !== undefined) isToolCapable = Boolean(rawCaps.tools);
    else if (rawMethods.length > 0) isToolCapable = rawMethods.includes("generateContent") || rawMethods.includes("generateAnswer");
    else if (override?.capabilities?.tools !== undefined) isToolCapable = Boolean(override.capabilities.tools);

    return {
      textInput: !isImageGen,
      imageInput: isVision,
      audioInput: isAudio,
      videoInput: isVideo,
      textOutput: !isEmbeddings && !isImageGen,
      imageOutput: isImageGen,
      audioOutput: isAudio && id.includes("tts"),
      videoOutput: false,
      reasoning: isReasoning,
      toolCalling: isToolCapable,
      structuredOutput: isToolCapable,
      streaming: !isEmbeddings && !isImageGen,
      embeddings: isEmbeddings,
    };
  }

  /**
   * Extract context window:
   * 1. Provider metadata (context_window, context_length, input_token_limit, max_context_length, etc.)
   * 2. Optional Noska override
   * 3. Conservative default (128000)
   */
  protected inferContextWindow(modelId: string, raw?: any): number {
    if (raw?.context_window && Number(raw.context_window) > 0) {
      return Number(raw.context_window);
    }
    if (raw?.context_length && Number(raw.context_length) > 0) {
      return Number(raw.context_length);
    }
    if (raw?.inputTokenLimit && Number(raw.inputTokenLimit) > 0) {
      return Number(raw.inputTokenLimit);
    }
    if (raw?.input_token_limit && Number(raw.input_token_limit) > 0) {
      return Number(raw.input_token_limit);
    }
    if (raw?.max_context_length && Number(raw.max_context_length) > 0) {
      return Number(raw.max_context_length);
    }
    if (raw?.top_provider?.context_length && Number(raw.top_provider.context_length) > 0) {
      return Number(raw.top_provider.context_length);
    }

    const override = KNOWN_MODEL_OVERRIDES[modelId] || KNOWN_MODEL_OVERRIDES[`${this.provider}/${modelId}`];
    if (override?.contextWindow && override.contextWindow > 0) {
      return override.contextWindow;
    }

    return 128000;
  }
}
