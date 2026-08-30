/**
 * Noska AI V5 — AI Manager
 * 
 * Central gateway for ALL AI requests in Noska.
 * 
 * V5 changes:
 * - AbortSignal support throughout (real cancellation)
 * - Exponential backoff retry for transient failures
 * - Structured AIError instead of mockResponse() masking
 * - Intelligence engine integration for adaptive reasoning
 * - Context engine for intelligent history/memory management
 * - Conversation state tracking
 * - Diagnostics for every request
 * 
 * Usage:
 *   import { aiManager } from './ai/AIManager';
 *   const controller = new AbortController();
 *   const response = await aiManager.stream({ prompt: '...', signal: controller.signal });
 *   // To cancel: controller.abort();
 */

import { getProvider, getAllProviders, mockResponse, testProviderConnection, registerCustomProvider, unregisterCustomProvider, type AIProvider, type ProviderSendOpts } from './providers.js';
import { buildContext, buildMinimalContext } from './ContextBuilder.js';
import { buildAgentPrompt, getAgent } from './agents.js';
import { initializeMemory, getMemory } from './memory.js';
import { buildUserProfileContext } from './userProfile.js';
import { AIError, configError, isRetryable, isCancelled } from './core/AIError.js';
import { createDiagnosticTracker } from './core/AIDiagnostics.js';
import { analyzeRequest, type IntelligenceMode, type IntelligenceResult } from './core/IntelligenceEngine.js';
import { buildOptimizedContext } from './core/ContextEngine.js';
import { ConversationState } from './core/ConversationState.js';
import { modelRegistry } from './models/ModelRegistry.js';
import type { ProviderId } from './models/types.js';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProviderConfigEntry {
  apiKey?: string;
  baseUrl?: string;
  enabled?: boolean;
}

interface ContextSettings {
  includeCurrentPage: boolean;
  includeRecentPages: boolean;
  includeConnections: boolean;
  includeTags: boolean;
  includeMemory: boolean;
  tokenBudget: number;
}

interface AIManagerConfig {
  providers: Record<string, ProviderConfigEntry>;
  /** User-defined OpenAI-compatible providers */
  customProviders: Record<string, {
    id: string; name: string; baseUrl: string;
    models: Array<{ id: string; name?: string }>; defaultModel?: string;
  }>;
  activeProvider: string | null;
  activeModel: string | null;
  activeAgent: string;
  context: ContextSettings;
  maxTokens: number;
  streaming: boolean;
  /** Intelligence mode: auto | fast | balanced | deep | maximum */
  intelligenceMode: IntelligenceMode;
}

interface HealthEntry {
  status: string;
  timestamp: number;
}

interface AISendOpts {
  system?: string;
  prompt?: string;
  page?: any;
  pages?: any[];
  agent?: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  thinking?: boolean;
  signal?: AbortSignal;
}

interface AIConversationMessage {
  role: string;
  text?: string;
  content?: string;
}

interface AISendConversationOpts {
  system?: string;
  messages: AIConversationMessage[];
  page?: any;
  pages?: any[];
  agent?: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  thinking?: boolean;
  signal?: AbortSignal;
}

interface AIStreamOpts extends AISendOpts {
  messages?: AIConversationMessage[];
  onChunk?: (partial: string) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AIManagerConfig = {
  providers: {},
  customProviders: {},
  activeProvider: null,
  activeModel: null,
  activeAgent: "assistant",
  context: {
    includeCurrentPage: true,
    includeRecentPages: true,
    includeConnections: true,
    includeTags: true,
    includeMemory: true,
    tokenBudget: 4096
  },
  maxTokens: 2048,
  streaming: true,
  intelligenceMode: "auto",
};

const STORAGE_KEY = "noska_ai_config";
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY = 1000; // 1 second

/** Legacy providers return error banners as strings — detect them so the
 * runtime never treats offline/error text as model output. */
function looksLikeMockFailure(text: string): boolean {
  return /\*\*AI Draft\*\* \(offline\)|is running in local mode|request failed/i.test(text || "");
}
function extractMockError(text: string): string {
  const m = (text || "").match(/Error:\s*([\s\S]{0,240})/);
  return m ? m[1].replace(/_/g, "").trim() : "provider returned an error";
}

// ─── Retry Logic ────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal,
  maxRetries = MAX_RETRIES,
  diagnosticTracker?: ReturnType<typeof createDiagnosticTracker>
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new AIError({
        type: "cancelled",
        provider: "",
        retryable: false,
        userMessage: "Generation stopped.",
      });
    }
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (isCancelled(err)) throw err;
      if (!isRetryable(err) || attempt === maxRetries) throw err;

      // Exponential backoff with jitter
      diagnosticTracker?.incrementRetry();
      const retryAfter = err instanceof AIError ? err.retryAfterSeconds : null;
      const delay = retryAfter
        ? retryAfter * 1000
        : BASE_RETRY_DELAY * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise(r => setTimeout(r, Math.min(delay, 30000)));
    }
  }
  throw lastError;
}

// ─── AI Manager Class ───────────────────────────────────────────────────────

class AIManager {
  config: AIManagerConfig;
  _listeners: Set<(config: AIManagerConfig) => void>;
  _initialized: boolean;
  _healthCache: Map<string, HealthEntry>;
  _healthTimers: Map<string, ReturnType<typeof setTimeout>>;
  _hasExplicitSelection: boolean;
  /** Per-conversation state tracker */
  _conversationState: ConversationState;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this._listeners = new Set();
    this._initialized = false;
    this._healthCache = new Map();
    this._healthTimers = new Map();
    this._hasExplicitSelection = false;
    this._conversationState = new ConversationState();
  }

  _buildReasoningDirective(effort?: "low" | "medium" | "high", thinking?: boolean): string {
    if (!effort && !thinking) return "";
    let directive = "\n\n[REASONING ENGINE DIRECTIVE]";
    if (effort === "low") {
      directive += "\n- Reasoning Effort: LOW. Prioritize direct, concise, high-speed execution. Deliver direct answers with minimal preamble or redundant explanation.";
    } else if (effort === "medium") {
      directive += "\n- Reasoning Effort: MEDIUM. Provide balanced, structured, and comprehensive analysis with clear explanations and logical rationale.";
    } else if (effort === "high") {
      directive += "\n- Reasoning Effort: HIGH. Conduct deep, thorough reasoning. Analyze edge cases, explore alternative architectural paradigms, verify intermediate logic step-by-step, and synthesize high-depth solutions.";
    }
    if (thinking) {
      directive += "\n- Deep Thinking Mode: Active. Perform internal chain-of-thought verification before formulating the final response.";
    }
    return directive;
  }

  /**
   * Initialize from localStorage and load memory
   */
  init() {
    if (this._initialized) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { ...DEFAULT_CONFIG, ...parsed, context: { ...DEFAULT_CONFIG.context, ...parsed.context } };
        this._hasExplicitSelection = Boolean(parsed.activeProvider);
      }
    } catch {
      // Use defaults
    }
    // Re-register user-defined custom providers so getProvider finds them
    for (const cfg of Object.values(this.config.customProviders || {})) {
      if (cfg && cfg.id && cfg.baseUrl) registerCustomProvider(cfg as never);
    }
    this._initialized = true;
    // Initialize AI memory (non-blocking)
    initializeMemory().catch(() => {});
    // Trigger background dynamic discovery across all configured providers
    if (typeof window !== "undefined") {
      setTimeout(() => {
        modelRegistry.refreshAll(this.config.providers as any).catch(() => {});
      }, 500);
    }
  }

  /**
   * Add or update a user-defined custom provider (any OpenAI-compatible endpoint).
   */
  setCustomProvider(cfg: { id?: string; name: string; baseUrl: string; models: Array<{ id: string; name?: string }>; defaultModel?: string }): string {
    const id = cfg.id || `custom_${Date.now().toString(36)}`;
    const clean = {
      id,
      name: cfg.name.trim() || "Custom provider",
      baseUrl: cfg.baseUrl.trim().replace(/\/+$/, ""),
      models: (cfg.models || []).filter((m) => m.id?.trim()).map((m) => ({ id: m.id.trim(), name: (m.name || m.id).trim() })),
      defaultModel: cfg.defaultModel?.trim() || undefined,
    };
    if (!clean.baseUrl.startsWith("http")) throw new Error("Base URL must start with http(s)://");
    if (clean.models.length === 0) throw new Error("Add at least one model ID");
    registerCustomProvider(clean);
    this.config.customProviders = { ...this.config.customProviders, [id]: clean };
    if (!this.config.activeProvider) {
      this.config.activeProvider = id;
      this.config.activeModel = clean.defaultModel || clean.models[0].id;
      this._hasExplicitSelection = true;
    }
    this._persist();
    this._notify();
    return id;
  }

  /** Remove a custom provider */
  removeCustomProvider(id: string): void {
    unregisterCustomProvider(id);
    const next = { ...this.config.customProviders };
    delete next[id];
    this.config.customProviders = next;
    if (this.config.activeProvider === id) {
      const builtin = getAllProviders().find((p) => p.id !== id);
      this.config.activeProvider = builtin?.id || null;
      this.config.activeModel = builtin?.defaultModel || null;
    }
    this._persist();
    this._notify();
  }

  configure(update: Partial<AIManagerConfig>) {
    if (update.context) {
      this.config.context = { ...this.config.context, ...update.context };
      delete (update as any).context;
    }
    Object.assign(this.config, update);
    this._persist();
    this._notify();
  }

  setActiveProvider(providerId: string, modelId: string | null = null) {
    const provider = getProvider(providerId);
    if (!provider) return;
    this.config.activeProvider = providerId;
    this.config.activeModel = modelId || provider.defaultModel;
    this._persist();
    this._notify();
  }

  setActiveModel(modelId: string | null) {
    this.config.activeModel = modelId;
    if (modelId) {
      // 1. Check dynamic ModelRegistry first
      const registered = modelRegistry.getModel(modelId);
      if (registered?.provider) {
        this.config.activeProvider = registered.provider;
      } else if (modelId.includes("/")) {
        const prefix = modelId.split("/")[0];
        const matchingProvider = getAllProviders().find(p => p.id === prefix);
        if (matchingProvider) {
          this.config.activeProvider = matchingProvider.id;
        }
      } else {
        // 2. Check static provider models
        for (const provider of getAllProviders()) {
          if (provider.models.some((m) => m.id === modelId)) {
            this.config.activeProvider = provider.id;
            break;
          }
        }
      }
    }
    this._persist();
    this._notify();
  }

  getActiveModel(): string | null {
    return this.config.activeModel;
  }

  setActiveAgent(agentId: string) {
    this.config.activeAgent = agentId;
    this._persist();
    this._notify();
  }

  setProviderConfig(providerId: string, providerConfig: Partial<ProviderConfigEntry>) {
    this.config.providers = {
      ...this.config.providers,
      [providerId]: {
        ...(this.config.providers[providerId] || {}),
        ...providerConfig
      }
    };
    this._persist();
    this._notify();

    // Trigger dynamic discovery refresh for this provider
    modelRegistry.refreshProvider(providerId as ProviderId, {
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl
    }).catch(() => {});
  }

  async checkProviderHealth(providerId: string) {
    const cached = this._healthCache.get(providerId);
    if (cached && Date.now() - cached.timestamp < 60000) return cached.status;

    const provider = getProvider(providerId);
    if (!provider) return "unknown";
    const config = this.config.providers[providerId] || {};
    if (provider.requiresKey && !config.apiKey) return "unconfigured";

    try {
      const result = await testProviderConnection(providerId, {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl
      });
      const status = result.ok ? "online" : "error";
      this._healthCache.set(providerId, { status, timestamp: Date.now() });
      return status;
    } catch {
      const status = "error";
      this._healthCache.set(providerId, { status, timestamp: Date.now() });
      return status;
    }
  }

  async checkAllProviderHealth() {
    const providers = getAllProviders();
    const results = await Promise.allSettled(
      providers.map(p => this.checkProviderHealth(p.id))
    );
    return results.map((r, i) => ({
      id: providers[i].id,
      status: r.status === "fulfilled" ? r.value : "error"
    }));
  }

  getConfig() {
    return { ...this.config };
  }

  getActiveProvider() {
    if (this.config.activeProvider) {
      const p = getProvider(this.config.activeProvider);
      if (p) return p;
    }
    const fallbacks = this._getFallbackProviders();
    if (fallbacks.length > 0) {
      return getProvider(fallbacks[0]);
    }
    return getProvider("opencode_zen") || getProvider("openrouter");
  }

  getActiveProviderName() {
    const provider = this.getActiveProvider();
    return provider?.name || "Local";
  }

  getActiveModelName() {
    const provider = this.getActiveProvider();
    if (!provider) return "Offline";
    const dynamic = modelRegistry.getModel(this.config.activeModel);
    if (dynamic) return dynamic.displayName;
    const model = provider.models.find(m => m.id === this.config.activeModel);
    return model?.name || this.config.activeModel || provider.defaultModel;
  }

  isConfigured() {
    const provider = this.getActiveProvider();
    if (!provider) return false;
    const config = this.config.providers[provider.id];
    if (provider.requiresKey && !config?.apiKey) return false;
    return true;
  }

  getAllProviders() {
    return getAllProviders();
  }

  getProviderStatuses() {
    return getAllProviders().map(p => {
      const config = this.config.providers[p.id] || {};
      const isEnabled = config.enabled !== false;
      const health = this._healthCache.get(p.id);
      const isOnline = health?.status === "online";
      // Cloud providers are configured if API key is set; local providers if online or explicitly configured
      const isConfigured = p.requiresKey ? Boolean(config.apiKey) : (isOnline || Boolean(config.baseUrl));
      const isActive = this.config.activeProvider === p.id;

      // Get dynamic models from registry if available, fallback to static p.models
      const dynamicModels = modelRegistry.getModelsForProvider(p.id as ProviderId);
      const models = dynamicModels.length > 0
        ? dynamicModels.map(m => ({ id: m.apiModelId, name: m.displayName, context: m.contextWindow || 128000 }))
        : p.models;

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        enabled: isEnabled,
        configured: isConfigured,
        active: isActive,
        health: health?.status || "unknown",
        models,
        defaultModel: dynamicModels[0]?.apiModelId || p.defaultModel
      };
    });
  }

  /** Get the conversation state tracker */
  getConversationState(): ConversationState {
    return this._conversationState;
  }

  /** Reset conversation state (new chat) */
  resetConversationState(): void {
    this._conversationState = new ConversationState();
  }

  /**
   * Resolve a valid model ID for a given provider, falling back to default if model is invalid or decommissioned
   */
  _resolveValidModel(provider: AIProvider, requestedModelId?: string | null): string {
    const raw = requestedModelId || this.config.activeModel;
    if (!raw) return provider.defaultModel;

    // 1. Validate against dynamic ModelRegistry
    const validation = modelRegistry.validateModel(raw, provider.id as ProviderId);
    if (validation.valid) return validation.resolvedModelId;

    // 2. Check provider's local models list
    const found = provider.models.find(m => m.id === raw);
    if (found) return found.id;
    if (provider.type === "custom" || provider.id === "openrouter") return raw;

    return validation.resolvedModelId || provider.defaultModel;
  }

  /**
   * Try sending to a specific provider, returns result or throws AIError
   */
  async _tryProvider(providerId: string, opts: {
    system?: string;
    messages: any[];
    maxTokens?: number;
    effort?: "low" | "medium" | "high";
    thinking?: boolean;
    signal?: AbortSignal;
  }) {
    const provider = getProvider(providerId);
    if (!provider) throw new AIError({ type: "config", provider: providerId, retryable: false, userMessage: `Provider "${providerId}" not found` });
    const config = this.config.providers[providerId] || {};
    if (provider.requiresKey && !config.apiKey) throw configError(providerId);

    const model = this._resolveValidModel(provider, providerId === this.config.activeProvider ? this.config.activeModel : null);

    return await provider.send({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || provider.baseUrl,
      model,
      system: opts.system,
      messages: opts.messages,
      maxTokens: opts.maxTokens || this.config.maxTokens,
      effort: opts.effort,
      thinking: opts.thinking,
      signal: opts.signal,
    });
  }

  /**
   * Find the next viable provider for fallback
   */
  _getFallbackProviders() {
    return getAllProviders()
      .filter(p => {
        if (p.id === this.config.activeProvider) return false;
        const config = this.config.providers[p.id] || {};
        if (config.enabled === false) return false;
        if (p.requiresKey && !config.apiKey) return false;
        return true;
      })
      .map(p => p.id);
  }

  /**
   * Guard against AI hallucination by checking response claims against known workspace data
   */
  guardResponse(response: string, pages?: any[], currentPage?: any) {
    if (!response || !pages) return response;

    const lower = response.toLowerCase();
    const knownTitles = new Set(pages.filter(p => !p.trashed).map(p => p.title.toLowerCase()));
    const knownIds = new Set(pages.filter(p => !p.trashed).map(p => p.id));
    const activeCount = pages.filter(p => !p.trashed).length;

    let warnings: string[] = [];

    // Check for bold page titles that don't exist in workspace
    const boldMatches = response.match(/\*\*([^*]+)\*\*/g);
    if (boldMatches) {
      for (const m of boldMatches) {
        const title = m.replace(/\*\*/g, "").trim().toLowerCase();
        if (title.length > 3 && !knownTitles.has(title) && !title.includes("current") && !title.includes("page") && !title.includes("workspace") && !title.includes("note")) {
          warnings.push(`"${m.replace(/\*\*/g, "")}"`);
        }
      }
    }

    if (warnings.length > 0) {
      console.warn("AI response guard: potential hallucination detected", warnings);
    }

    return response;
  }

  /**
   * Raw provider call used by the shared agent runtime.
   * Now throws AIError instead of returning mockResponse().
   */
  async sendRaw({ system, messages, maxTokens, providerId, modelId, signal }: {
    system?: string;
    messages: Array<{ role: string; content: string }>;
    maxTokens?: number;
    providerId?: string | null;
    modelId?: string | null;
    signal?: AbortSignal;
  }): Promise<string> {
    const primaryPid = providerId || this.config.activeProvider;
    if (!primaryPid) throw configError("Noska AI");

    const candidates = [primaryPid, ...this._getFallbackProviders().filter((p) => p !== primaryPid)];
    let lastError: unknown = null;
    for (const pid of candidates) {
      try {
        const provider = getProvider(pid);
        if (!provider) continue;
        const config = this.config.providers[pid] || {};
        if (provider.requiresKey && !config.apiKey) continue;
        const model = pid === primaryPid && modelId ? modelId : provider.defaultModel;
        const result = await withRetry(() => provider.send({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl || provider.baseUrl,
          model,
          system,
          messages,
          maxTokens: maxTokens || this.config.maxTokens,
          signal,
        }), signal);

        if (looksLikeMockFailure(result)) {
          lastError = new Error(extractMockError(result));
          continue;
        }
        return result;
      } catch (err) {
        if (isCancelled(err)) throw err;
        lastError = err;
      }
    }
    if (lastError instanceof AIError) throw lastError;
    throw new AIError({
      type: "unknown",
      provider: primaryPid,
      retryable: false,
      userMessage: lastError instanceof Error ? lastError.message : "All AI providers failed",
    });
  }

  /**
   * Send an AI request (non-streaming) with retry and fallback
   */
  async send({ system, prompt, page, pages, agent, maxTokens, effort, thinking, signal }: AISendOpts) {
    let contextString = "";
    if (page || pages) {
      contextString = buildContext({
        page,
        pages: pages || [],
        options: this.config.context,
        memory: getMemory(),
        userProfile: buildUserProfileContext()
      });
    }

    const agentId = agent || this.config.activeAgent;
    const baseSystem = system || buildAgentPrompt(agentId, contextString, { tools: true });
    const fullSystem = `${baseSystem}${this._buildReasoningDirective(effort, thinking)}`;

    let provider = this.getActiveProvider();
    let providerConfig = provider ? (this.config.providers[provider.id] || {}) : {};
    if (!provider || (provider.requiresKey && !providerConfig.apiKey)) {
      const fallbackPid = this._getFallbackProviders()[0];
      if (fallbackPid) {
        provider = getProvider(fallbackPid);
        providerConfig = this.config.providers[fallbackPid] || {};
      }
    }

    if (!provider || (provider.requiresKey && !providerConfig.apiKey)) {
      throw configError(this.config.activeProvider || "Noska AI");
    }

    const messages = [{ role: "user", content: prompt || "" }];

    return await withRetry(async () => {
      try {
        const result = await this._tryProvider(provider!.id, {
          system: fullSystem, messages, maxTokens, effort, thinking, signal
        });
        if (looksLikeMockFailure(result)) {
          throw new Error(extractMockError(result));
        }
        this._healthCache.set(this.config.activeProvider!, { status: "online", timestamp: Date.now() });
        return this.guardResponse(result, pages, page);
      } catch (err: unknown) {
        if (isCancelled(err)) throw err;
        const fallbacks = this._getFallbackProviders().filter(id => id !== provider!.id);
        for (const fbId of fallbacks) {
          try {
            const fbResult = await this._tryProvider(fbId, {
              system: fullSystem, messages, maxTokens, effort, thinking, signal
            });
            if (fbResult && !looksLikeMockFailure(fbResult)) {
              return this.guardResponse(fbResult, pages, page);
            }
          } catch {}
        }
        throw err;
      }
    }, signal);
  }

  /**
   * Send a multi-turn conversation
   */
  async sendConversation({ system, messages, page, pages, agent, maxTokens, effort, thinking, signal }: AISendConversationOpts) {
    const provider = this.getActiveProvider();
    const providerConfig = this.config.providers[this.config.activeProvider || ""] || {};

    let contextString = "";
    if (page || pages) {
      contextString = buildContext({
        page,
        pages: pages || [],
        options: this.config.context,
        memory: getMemory(),
        userProfile: buildUserProfileContext()
      });
    }

    const agentId = agent || this.config.activeAgent;
    const baseSystem = system || buildAgentPrompt(agentId, contextString, { tools: true });
    const fullSystem = `${baseSystem}${this._buildReasoningDirective(effort, thinking)}`;

    if (!provider || (provider.requiresKey && !providerConfig.apiKey)) {
      throw configError(this.config.activeProvider || "Noska AI");
    }

    const apiMessages = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role, content: m.text || m.content || "" }));

    return await withRetry(async () => {
      const model = this._resolveValidModel(provider);
      const result = await provider.send({
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl || provider.baseUrl,
        model,
        system: fullSystem,
        messages: apiMessages,
        maxTokens: maxTokens || this.config.maxTokens,
        effort,
        thinking,
        signal,
      });
      if (looksLikeMockFailure(result)) {
        throw new Error(extractMockError(result));
      }
      return this.guardResponse(result, pages, page);
    }, signal);
  }

  /**
   * Stream an AI response with cancellation, retry, and intelligence engine
   */
  async stream({ system, prompt, messages, page, pages, agent, maxTokens, effort, thinking, onChunk, signal }: AIStreamOpts) {
    let provider = this.getActiveProvider();
    let providerConfig = provider ? (this.config.providers[provider.id] || {}) : {};
    if (!provider || (provider.requiresKey && !providerConfig.apiKey)) {
      const fallbackPid = this._getFallbackProviders()[0];
      if (fallbackPid) {
        provider = getProvider(fallbackPid);
        providerConfig = this.config.providers[fallbackPid] || {};
      }
    }
    const diagnostics = createDiagnosticTracker(`req_${Date.now().toString(36)}`);

    // ─── Intelligence Analysis ─────────────────────────────────────
    const intelligence = analyzeRequest(prompt || "", this.config.intelligenceMode, {
      hasHistory: (messages?.length || 0) > 0,
    });
    diagnostics.setIntelligence({
      intent: intelligence.intent,
      complexityScore: intelligence.complexityScore,
      reasoningEffort: intelligence.reasoningEffort,
      contextDepth: intelligence.contextDepth,
      responseFormat: intelligence.responseFormat,
    });

    // ─── Conversation State ────────────────────────────────────────
    if (prompt) {
      this._conversationState.updateFromUserMessage(prompt);
    }

    // ─── Resolve Dynamic Model & Context Parameters ───────────────
    const resolvedModel = provider ? this._resolveValidModel(provider) : (this.config.activeModel || "unknown");
    const registeredModel = modelRegistry.getModel(resolvedModel) || modelRegistry.getModel(this.config.activeModel);
    const dynamicContextWindow = registeredModel?.contextWindow || provider?.models.find(m => m.id === resolvedModel)?.context || 128000;
    const dynamicMaxOutputTokens = maxTokens || registeredModel?.maxOutputTokens || this.config.maxTokens || 8192;

    // ─── Context Building ──────────────────────────────────────────
    const agentId = agent || this.config.activeAgent;
    const contextResult = buildOptimizedContext({
      page,
      pages: pages || [],
      messages: messages || [],
      currentPrompt: prompt || "",
      intelligence,
      conversationState: this._conversationState,
      contextWindow: dynamicContextWindow,
      maxOutputTokens: dynamicMaxOutputTokens,
      agentSystemPrompt: system || buildAgentPrompt(agentId, "", { tools: true }),
    });

    diagnostics.setContext({
      contextBudget: contextResult.tokenEstimates.available,
      contextTokenEstimate: contextResult.tokenEstimates.total,
      historyTokens: contextResult.tokenEstimates.history,
      memoryTokens: contextResult.tokenEstimates.memory,
      workspaceTokens: contextResult.tokenEstimates.workspace,
      historyMessageCount: messages?.length || 0,
      prunedMessageCount: contextResult.prunedHistory.length,
    });

    // Build full system prompt with workspace context + memory + conversation state
    const contextParts = [
      contextResult.systemPrompt,
      contextResult.workspaceContext,
      contextResult.memoryContext,
      contextResult.conversationStateContext,
      contextResult.userProfile,
    ].filter(Boolean);
    const fullSystem = `${contextParts.join("\n\n---\n\n")}${this._buildReasoningDirective(effort || (intelligence.reasoningEffort === "high" || intelligence.reasoningEffort === "maximum" ? "high" : intelligence.reasoningEffort === "medium" ? "medium" : undefined), thinking)}`;

    diagnostics.setModel(
      this.config.activeProvider || "unknown",
      resolvedModel
    );

    if (!provider || (provider.requiresKey && !providerConfig.apiKey)) {
      const err = configError(this.config.activeProvider || "Noska AI");
      diagnostics.setError(err.userMessage);
      diagnostics.finish("error", 0);
      throw err;
    }

    // Use pruned history from context engine, stripping out any temporary loading placeholders
    const rawHistory = (messages || [])
      .filter(m => m.role === "user" || m.role === "assistant" || m.role === "ai")
      .map(m => ({ role: m.role === "ai" ? "assistant" : m.role, content: (m.text || m.content || "").trim() }))
      .filter(m => m.content.length > 0 && m.content !== "..." && m.content !== "…");

    const historyMessages = contextResult.prunedHistory.length > 0
      ? contextResult.prunedHistory.filter(m => m.content !== "..." && m.content !== "…")
      : rawHistory;

    // Ensure the current user prompt is strictly the final user message in the payload
    const apiMessages: Array<{ role: string; content: string }> = [...historyMessages];
    if (prompt && (!apiMessages.length || apiMessages[apiMessages.length - 1].content !== prompt || apiMessages[apiMessages.length - 1].role !== "user")) {
      apiMessages.push({ role: "user", content: prompt });
    }

    // ─── Stream with provider ──────────────────────────────────────
    if (typeof provider.stream === "function") {
      try {
        let full = "";
        let firstChunk = true;
        const iterator = provider.stream({
          apiKey: providerConfig.apiKey,
          baseUrl: providerConfig.baseUrl || provider.baseUrl,
          model: resolvedModel,
          system: fullSystem,
          messages: apiMessages,
          maxTokens: maxTokens || this.config.maxTokens,
          effort,
          thinking,
          signal,
        });
        for await (const chunk of iterator) {
          if (signal?.aborted) break;
          if (firstChunk) {
            diagnostics.markFirstToken();
            firstChunk = false;
          }
          full = chunk; // streamEventsToText yields accumulated text
          onChunk?.(full);
        }

        // Update conversation state with response
        this._conversationState.updateFromAIResponse(full);
        this._healthCache.set(this.config.activeProvider!, { status: "online", timestamp: Date.now() });
        diagnostics.finish("completed", full.length);
        return full;
      } catch (err: unknown) {
        if (isCancelled(err)) {
          diagnostics.finish("cancelled", 0);
          throw err;
        }
        diagnostics.setError(err instanceof Error ? err.message : "Stream failed");

        // Intelligent Cross-Provider Self-Healing Fallback
        const fallbacks = this._getFallbackProviders().filter(id => id !== provider.id);
        for (const fallbackId of fallbacks) {
          const fallbackProvider = getProvider(fallbackId);
          const fallbackConfig = this.config.providers[fallbackId] || {};
          if (fallbackProvider && (fallbackConfig.apiKey || !fallbackProvider.requiresKey) && typeof fallbackProvider.stream === "function") {
            try {
              const fbModel = this._resolveValidModel(fallbackProvider);
              let full = "";
              const fbIterator = fallbackProvider.stream({
                apiKey: fallbackConfig.apiKey,
                baseUrl: fallbackConfig.baseUrl || fallbackProvider.baseUrl,
                model: fbModel,
                system: fullSystem,
                messages: apiMessages,
                maxTokens: maxTokens || this.config.maxTokens,
                effort,
                thinking,
                signal,
              });
              for await (const chunk of fbIterator) {
                if (signal?.aborted) break;
                full = chunk;
                onChunk?.(full);
              }
              if (full) {
                this._conversationState.updateFromAIResponse(full);
                diagnostics.finish("completed", full.length);
                return full;
              }
            } catch {
              // Continue to next fallback if this one fails
            }
          }
        }

        diagnostics.finish("error", 0);
        throw err;
      }
    }

    // ─── Fallback: non-streaming send ──────────────────────────────
    try {
      const result = await withRetry(() => provider.send({
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl || provider.baseUrl,
        model: resolvedModel,
        system: fullSystem,
        messages: apiMessages,
        maxTokens: maxTokens || this.config.maxTokens,
        effort,
        thinking,
        signal,
      }), signal, MAX_RETRIES, diagnostics);

      const guarded = this.guardResponse(result, pages, page);
      onChunk?.(guarded);
      this._conversationState.updateFromAIResponse(guarded);
      diagnostics.finish("completed", guarded.length);
      return guarded;
    } catch (err: unknown) {
      if (isCancelled(err)) {
        diagnostics.finish("cancelled", 0);
        throw err;
      }
      diagnostics.setError(err instanceof Error ? err.message : "Request failed");
      diagnostics.finish("error", 0);
      throw err;
    }
  }

  /**
   * Migrate from old config format
   */
  migrateFromLegacy({ apiKey, aiProvider, nvidiaKey }: { apiKey?: string; aiProvider?: string; nvidiaKey?: string }) {
    const updates: Record<string, ProviderConfigEntry> = {};
    if (nvidiaKey) {
      updates.nvidia = { apiKey: nvidiaKey, enabled: true };
    }
    if (apiKey) {
      updates.anthropic = { apiKey, enabled: true };
    }
    if (Object.keys(updates).length > 0) {
      this.config.providers = { ...this.config.providers, ...updates };
      if (!this._hasExplicitSelection) {
        if (aiProvider === "nvidia" && nvidiaKey) {
          this.config.activeProvider = "nvidia";
          this.config.activeModel = "nvidia/llama-3.1-nemotron-70b-instruct";
        } else if (apiKey) {
          this.config.activeProvider = "anthropic";
          this.config.activeModel = "claude-sonnet-4-20250514";
        }
        this._hasExplicitSelection = true;
      }
      this._persist();
      this._notify();
    }
  }

  // ─── Subscriptions ──────────────────────────────────────────────────────

  subscribe(listener: (config: AIManagerConfig) => void) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    const config = this.getConfig();
    this._listeners.forEach(fn => {
      try { fn(config); } catch { /* ignore */ }
    });
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch { /* ignore */ }
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────────

export const aiManager = new AIManager();

// Auto-initialize on import
aiManager.init();

export default aiManager;
