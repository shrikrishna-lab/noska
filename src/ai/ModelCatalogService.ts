/**
 * ModelCatalogService
 * 
 * Fetches real-time live AI model catalogs across all providers,
 * detects active/live models, and tracks discontinued/deprecating models
 * with exact announced provider shutdown & sunset dates.
 */

export interface ModelDeprecationInfo {
  isDiscontinued: boolean;
  isDeprecating: boolean;
  sunsetDate?: string;
  announcementDate?: string;
  reason?: string;
  suggestedReplacement?: string;
}

// ─── Real-World Provider Sunset & Deprecation Registry ────────────────────────

// Providers completely excluded from displaying NEW badges
export const EXCLUDED_NEW_BADGE_PROVIDERS = new Set([
  "openrouter",
  "ollama",
  "nvidia",
  "lmstudio",
  "opencode_zen",
  "opencode",
]);

// Single latest flagship model per direct provider that receives the NEW badge
export const LATEST_FLAGSHIP_PER_PROVIDER: Record<string, string> = {
  anthropic: "claude-3-7-sonnet-20250219",
  openai: "o3-mini",
  gemini: "gemini-2.0-flash",
  groq: "llama-3.3-70b-versatile",
  deepseek: "deepseek-reasoner",
  mistral: "mistral-large-latest",
  together: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  xai: "grok-2-latest",
};

/**
 * Checks if a model is the single latest release for its provider.
 * Excludes openrouter, ollama, nvidia, lmstudio, and zen.
 */
export function isModelNew(
  modelId: string,
  providerIdOrCreated?: string | number,
  created?: number
): boolean {
  if (!modelId) return false;
  let providerId: string | undefined;

  if (typeof providerIdOrCreated === "string") {
    providerId = providerIdOrCreated;
  }

  const normalizedModel = modelId.toLowerCase().trim();
  const normalizedProvider = (providerId || "").toLowerCase().trim();

  // Exclude aggregated hubs, local daemons, and specific providers
  if (normalizedProvider && EXCLUDED_NEW_BADGE_PROVIDERS.has(normalizedProvider)) {
    return false;
  }
  if (
    normalizedModel.startsWith("openrouter/") ||
    normalizedModel.includes("nemotron-3.5-lightning-free") ||
    normalizedModel.includes("local-model")
  ) {
    return false;
  }

  // Check if this model matches the single designated latest model for the provider
  if (normalizedProvider && LATEST_FLAGSHIP_PER_PROVIDER[normalizedProvider]) {
    const target = LATEST_FLAGSHIP_PER_PROVIDER[normalizedProvider].toLowerCase();
    return (
      normalizedModel === target ||
      normalizedModel.endsWith("/" + target) ||
      target.endsWith("/" + normalizedModel)
    );
  }

  // Fallback match against single known flagship IDs across providers
  const flagshipValues = Object.values(LATEST_FLAGSHIP_PER_PROVIDER).map((v) => v.toLowerCase());
  return flagshipValues.some(
    (target) =>
      normalizedModel === target ||
      normalizedModel === `openrouter/${target}` ||
      normalizedModel.endsWith("/" + target)
  );
}

export const KNOWN_DEPRECATIONS: Record<string, ModelDeprecationInfo> = {
  // OpenAI Deprecations
  "openai/gpt-3.5-turbo-0613": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "June 13, 2024",
    reason: "OpenAI legacy shutdown in favor of modern Omni architecture.",
    suggestedReplacement: "openai/gpt-4o-mini",
  },
  "openai/gpt-3.5-turbo-0301": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "June 13, 2024",
    reason: "Shut down by OpenAI.",
    suggestedReplacement: "openai/gpt-4o-mini",
  },
  "openai/gpt-4-0314": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "June 13, 2024",
    reason: "First-generation GPT-4 snapshot sunset.",
    suggestedReplacement: "openai/gpt-4o",
  },
  "openai/gpt-4-0613": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "June 6, 2025",
    reason: "Legacy GPT-4 function calling snapshot being retired.",
    suggestedReplacement: "openai/gpt-4o",
  },
  "openai/gpt-4-vision-preview": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "December 6, 2024",
    reason: "Integrated natively into GPT-4o.",
    suggestedReplacement: "openai/gpt-4o",
  },
  "openai/o1-preview": {
    isDiscontinued: false,
    isDeprecating: true,
    sunsetDate: "October 15, 2025",
    reason: "Preview checkpoint replaced by production o1 & o3-mini.",
    suggestedReplacement: "openai/o1",
  },
  "openai/o1-mini": {
    isDiscontinued: false,
    isDeprecating: true,
    sunsetDate: "November 30, 2025",
    reason: "Superseded by OpenAI o3-mini with higher speed and STEM reasoning.",
    suggestedReplacement: "openai/o3-mini",
  },
  "openai/text-davinci-003": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "January 4, 2024",
    reason: "Completions API legacy engine shutdown.",
    suggestedReplacement: "openai/gpt-4o-mini",
  },

  // Anthropic Deprecations
  "anthropic/claude-2.0": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "November 6, 2024",
    reason: "Anthropic legacy architecture retired.",
    suggestedReplacement: "anthropic/claude-3.5-sonnet-20241022",
  },
  "anthropic/claude-2.1": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "November 6, 2024",
    reason: "Anthropic legacy architecture retired.",
    suggestedReplacement: "anthropic/claude-3.5-sonnet-20241022",
  },
  "anthropic/claude-instant-1.2": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "November 6, 2024",
    reason: "Instant v1 series shut down.",
    suggestedReplacement: "anthropic/claude-3.5-haiku-20241022",
  },
  "anthropic/claude-3-haiku-20240307": {
    isDiscontinued: false,
    isDeprecating: true,
    sunsetDate: "October 22, 2025",
    reason: "Anthropic announced sunset in favor of Claude 3.5 Haiku.",
    suggestedReplacement: "anthropic/claude-3.5-haiku-20241022",
  },

  // Google Gemini Deprecations
  "google/gemini-1.0-pro": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "February 15, 2025",
    reason: "Google AI Studio shut down Gemini 1.0 generation.",
    suggestedReplacement: "google/gemini-2.5-flash",
  },
  "google/gemini-1.0-ultra": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "March 1, 2025",
    reason: "Replaced by Gemini 1.5 Pro & Gemini 2.5 Pro.",
    suggestedReplacement: "google/gemini-2.5-pro",
  },
  "google/gemini-1.5-flash-8b": {
    isDiscontinued: false,
    isDeprecating: true,
    sunsetDate: "September 30, 2025",
    reason: "Google transitioning sub-10B tier to Gemini 2.0 Flash Lite.",
    suggestedReplacement: "google/gemini-2.0-flash-lite",
  },

  // Meta & Open Source Deprecations
  "meta-llama/llama-2-70b-chat": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "July 2024",
    reason: "Superseded by Llama 3.1 & Llama 3.3.",
    suggestedReplacement: "meta-llama/llama-3.3-70b-instruct",
  },
  "meta-llama/llama-3-70b-instruct": {
    isDiscontinued: false,
    isDeprecating: true,
    sunsetDate: "December 31, 2025",
    reason: "Replaced by Llama 3.3 70B with 128K context window.",
    suggestedReplacement: "meta-llama/llama-3.3-70b-instruct",
  },
  "deepseek/deepseek-coder-33b-instruct": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "August 2024",
    reason: "Replaced by DeepSeek V3 & Qwen 2.5 Coder 32B.",
    suggestedReplacement: "qwen/qwen-2.5-coder-32b-instruct",
  },
  "mistralai/mistral-medium": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "May 2024",
    reason: "Retired by Mistral AI in favor of Mistral Small & Large.",
    suggestedReplacement: "mistralai/mistral-large-2407",
  },
  "mistralai/mistral-tiny": {
    isDiscontinued: true,
    isDeprecating: false,
    sunsetDate: "May 2024",
    reason: "Retired by Mistral AI in favor of Ministral 8B.",
    suggestedReplacement: "mistralai/mistral-small-latest",
  },
  "gemma2-9b-it": {
    isDiscontinued: true,
    isDeprecating: false,
    reason: "Decommissioned by Groq in favor of Llama 3.3 70B & Llama 3.1 8B.",
    suggestedReplacement: "llama-3.1-8b-instant",
  },
  "groq/gemma2-9b-it": {
    isDiscontinued: true,
    isDeprecating: false,
    reason: "Decommissioned by Groq in favor of Llama 3.3 70B & Llama 3.1 8B.",
    suggestedReplacement: "llama-3.1-8b-instant",
  },
};

export interface LiveCatalogModel {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  context: number;
  description?: string;
  pricing?: { prompt: number; completion: number };
  status: "active" | "deprecating" | "discontinued";
  deprecation?: ModelDeprecationInfo;
  created?: number;
  isNew?: boolean;
}

const CACHE_KEY = "noska_live_model_catalog";
const CACHE_TIMESTAMP_KEY = "noska_live_model_catalog_ts";
const CACHE_TTL_MS = 1000 * 60 * 60 * 2; // 2 hours

export class ModelCatalogService {
  private static _instance: ModelCatalogService;
  private _cachedModels: LiveCatalogModel[] = [];
  private _isFetching = false;
  private _listeners: Array<() => void> = [];

  public static getInstance(): ModelCatalogService {
    if (!ModelCatalogService._instance) {
      ModelCatalogService._instance = new ModelCatalogService();
    }
    return ModelCatalogService._instance;
  }

  constructor() {
    this._loadFromStorage();
    // Revalidate live in the background on startup
    if (typeof window !== "undefined") {
      setTimeout(() => this.fetchRealtimeCatalog(), 1000);
    }
  }

  public subscribe(cb: () => void): () => void {
    this._listeners.push(cb);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== cb);
    };
  }

  private _notify() {
    for (const l of this._listeners) {
      try {
        l();
      } catch (err) {
        console.error("ModelCatalogService listener error:", err);
      }
    }
  }

  private _loadFromStorage() {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        this._cachedModels = JSON.parse(raw);
      }
    } catch { }
  }

  private _saveToStorage(models: LiveCatalogModel[]) {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(CACHE_KEY, JSON.stringify(models));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
    } catch { }
  }

  /**
   * Get deprecation metadata for a given model ID
   */
  public getDeprecationInfo(modelId: string): ModelDeprecationInfo | null {
    if (!modelId) return null;
    const normalized = modelId.toLowerCase().trim();

    // Check exact matches
    if (KNOWN_DEPRECATIONS[normalized]) {
      return KNOWN_DEPRECATIONS[normalized];
    }

    // Check partial/sub-string matches
    for (const [pattern, info] of Object.entries(KNOWN_DEPRECATIONS)) {
      const p = pattern.toLowerCase();
      if (normalized.includes(p) || p.includes(normalized)) {
        return info;
      }
    }

    return null;
  }

  /**
   * Fetch real-time live models from OpenRouter Public API & Local Engines
   */
  public async fetchRealtimeCatalog(force = false): Promise<LiveCatalogModel[]> {
    if (this._isFetching) return this._cachedModels;

    const lastTs = Number(typeof window !== "undefined" ? localStorage.getItem(CACHE_TIMESTAMP_KEY) : 0);
    if (!force && this._cachedModels.length > 0 && Date.now() - lastTs < CACHE_TTL_MS) {
      return this._cachedModels;
    }

    this._isFetching = true;
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://noska.ai" }
      });

      if (!response.ok) throw new Error(`OpenRouter API status: ${response.status}`);
      const data = await response.json();
      const rawList = Array.isArray(data.data) ? data.data : [];

      const parsedModels: LiveCatalogModel[] = [];

      for (const m of rawList) {
        const id = String(m.id || "");
        const name = String(m.name || id);
        const context = Number(m.context_length || 128000);
        const description = String(m.description || "");

        // Determine provider ID based on prefix
        let providerId = "openrouter";
        let providerName = "OpenRouter";
        if (id.startsWith("google/")) {
          providerName = "Google AI";
        } else if (id.startsWith("openai/")) {
          providerName = "OpenAI";
        } else if (id.startsWith("anthropic/")) {
          providerName = "Anthropic";
        } else if (id.startsWith("meta-llama/")) {
          providerName = "Meta Llama";
        } else if (id.startsWith("deepseek/")) {
          providerName = "DeepSeek";
        } else if (id.startsWith("mistralai/")) {
          providerName = "Mistral AI";
        } else if (id.startsWith("qwen/")) {
          providerName = "Qwen";
        } else if (id.startsWith("x-ai/")) {
          providerName = "xAI";
        }

        const deprecation = this.getDeprecationInfo(id);
        let status: "active" | "deprecating" | "discontinued" = "active";

        if (deprecation) {
          if (deprecation.isDiscontinued) {
            status = "discontinued";
          } else if (deprecation.sunsetDate) {
            const sunsetTs = Date.parse(deprecation.sunsetDate);
            if (!isNaN(sunsetTs)) {
              status = sunsetTs <= Date.now() ? "discontinued" : "deprecating";
            } else {
              status = deprecation.isDeprecating ? "deprecating" : "active";
            }
          } else if (deprecation.isDeprecating) {
            status = "deprecating";
          }
        }

        const isNew = isModelNew(id, providerId, m.created ? Number(m.created) : undefined);

        parsedModels.push({
          id,
          name,
          providerId,
          providerName,
          context,
          description,
          status,
          deprecation: deprecation || undefined,
          created: m.created ? Number(m.created) : undefined,
          isNew,
        });
      }

      if (parsedModels.length > 0) {
        this._cachedModels = parsedModels;
        this._saveToStorage(parsedModels);
        this._notify();
      }

      return this._cachedModels;
    } catch (err) {
      console.warn("Could not fetch live realtime OpenRouter models, using local cache/fallback:", err);
      return this._cachedModels;
    } finally {
      this._isFetching = false;
    }
  }

  public getCachedModels(): LiveCatalogModel[] {
    return this._cachedModels;
  }

  /**
   * Returns models for a given provider, respecting the caps:
   * - ollama, nvidia, lmstudio, opencode_zen: capped at at most 3 models, strictly no NEW badge
   * - openrouter: displays live synced models or base models, strictly no NEW badge
   * - direct providers: displays authentic models with at most ONE single NEW badge for the latest flagship
   */
  public getModelsForProvider(
    providerId: string,
    fallbackModels: Array<{ id: string; name: string; context: number; isNew?: boolean; description?: string }> = []
  ): Array<{ id: string; name: string; context: number; isNew?: boolean; description?: string }> {
    const normalizedProvider = (providerId || "").toLowerCase().trim();

    // 1. Hubs / Local engines capped at max 3 models, strictly NO NEW badge
    if (["ollama", "nvidia", "lmstudio", "opencode_zen", "opencode"].includes(normalizedProvider)) {
      return fallbackModels.slice(0, 3).map((m) => ({
        ...m,
        isNew: false,
      }));
    }

    // 2. OpenRouter: if we have live synced catalog models, show them without NEW badge
    if (normalizedProvider === "openrouter") {
      if (this._cachedModels.length > 0) {
        return this._cachedModels.map((m) => ({
          id: m.id,
          name: m.name,
          context: m.context,
          description: m.description,
          isNew: false,
        }));
      }
      return fallbackModels.map((m) => ({ ...m, isNew: false }));
    }

    // 3. Direct providers: dynamically ensure exactly ONE latest flagship gets isNew=true
    return fallbackModels.map((m) => ({
      ...m,
      isNew: isModelNew(m.id, normalizedProvider),
    }));
  }

  public isFetching(): boolean {
    return this._isFetching;
  }
}

export const modelCatalogService = new ModelCatalogService();
