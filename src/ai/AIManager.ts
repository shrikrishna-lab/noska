/**
 * Noska AI V4 — AI Manager
 * 
 * Central gateway for ALL AI requests in Noska.
 * Manages provider configuration, context building, and request routing.
 * 
 * Usage:
 *   import { aiManager } from './ai/AIManager';
 *   aiManager.configure({ providers: { openrouter: { apiKey: '...' } }, activeProvider: 'openrouter', activeModel: '...' });
 *   const response = await aiManager.send({ system: '...', prompt: '...' });
 */

import { getProvider, getAllProviders, mockResponse, testProviderConnection, registerCustomProvider, unregisterCustomProvider, type AIProvider } from './providers.js';
import { buildContext, buildMinimalContext } from './ContextBuilder.js';
import { buildAgentPrompt, getAgent } from './agents.js';
import { initializeMemory, getMemory } from './memory.js';
import { buildUserProfileContext } from './userProfile.js';
import { selectModel } from './runtime/modelRouter.js';

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

/**
 * Per-request context enrichments beyond the static page/workspace snapshot.
 * All optional — callers add only what they have (#20 relevance-ranked
 * context instead of dumping everything).
 */
interface AIContextExtras {
  /** Blocks the user has selected in the editor — highest-priority signal */
  selectedBlocks?: { text?: string }[] | null;
  /** Pages open in other split panes ("the other pane" awareness) */
  openPanePages?: unknown[] | null;
  /** Prebuilt conversation-state section (topics, resolved references) */
  conversationSection?: string;
  /** Prebuilt response-policy constraint section */
  policySection?: string;
  /** Request a model class from the router (fast/default/reasoning) */
  modelClass?: "fast" | "default" | "reasoning";
}

interface AIManagerConfig {
  providers: Record<string, ProviderConfigEntry>;
  /** User-defined OpenAI-compatible providers (#2 custom provider support) */
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
}

interface HealthEntry {
  status: string;
  timestamp: number;
}

// Shared param shape for send/sendConversation/stream — every field here
// is genuinely optional at call sites (e.g. MeetingWorkspace.jsx's
// generateSummary only ever passes `prompt`).
interface AISendOpts extends AIContextExtras {
  system?: string;
  prompt?: string;
  page?: any;
  pages?: any[];
  agent?: string;
  maxTokens?: number;
}

interface AIConversationMessage {
  role: string;
  text?: string;
  content?: string;
}

interface AISendConversationOpts extends AISendOpts {
  system?: string;
  messages: AIConversationMessage[];
}

interface AIStreamOpts extends AISendOpts {
  messages?: AIConversationMessage[];
  onChunk?: (partial: string) => void;
  /** cooperative cancellation — checked between chunks */
  signal?: { aborted: boolean };
}

// ─── Default Config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AIManagerConfig = {
  // Provider configs: { [providerId]: { apiKey?, baseUrl?, enabled? } }
  providers: {},
  // User-defined OpenAI-compatible providers
  customProviders: {},
  // Active provider + model
  activeProvider: null,
  activeModel: null,
  // Active agent
  activeAgent: "assistant",
  // Context settings
  context: {
    includeCurrentPage: true,
    includeRecentPages: true,
    includeConnections: true,
    includeTags: true,
    includeMemory: true,
    tokenBudget: 4096
  },
  // Response settings
  maxTokens: 2048,
  streaming: true
};

const STORAGE_KEY = "noska_ai_config";

/** Legacy providers return error banners as strings — detect them so the
 * runtime never treats offline/error text as model output. */
function looksLikeMockFailure(text: string): boolean {
  return /\*\*AI Draft\*\* \(offline\)|is running in local mode|request failed/i.test(text || "");
}
function extractMockError(text: string): string {
  const m = (text || "").match(/Error:\s*([\s\S]{0,240})/);
  return m ? m[1].replace(/_/g, "").trim() : "provider returned an error";
}

// ─── AI Manager Class ───────────────────────────────────────────────────────

class AIManager {
  config: AIManagerConfig;
  _listeners: Set<(config: AIManagerConfig) => void>;
  _initialized: boolean;
  _healthCache: Map<string, HealthEntry>;
  _healthTimers: Map<string, ReturnType<typeof setTimeout>>;
  /** True when the user (or Settings UI) deliberately picked a provider —
   * legacy nvidiaKey/anthropicKey migration must never override it. */
  _hasExplicitSelection: boolean;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this._listeners = new Set();
    this._initialized = false;
    this._healthCache = new Map();
    this._healthTimers = new Map();
    this._hasExplicitSelection = false;
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
        // A deliberate provider choice (Settings → Noska AI) must never be
        // stomped by legacy-key migration on later loads.
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
    // First custom provider → make it active so agents work immediately.
    if (!this.config.activeProvider) {
      this.config.activeProvider = id;
      this.config.activeModel = clean.defaultModel || clean.models[0].id;
      this._hasExplicitSelection = true;
    }
    this._persist();
    this._notify();
    return id;
  }

  /** Remove a custom provider (also deactivates it if it was active). */
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

  /**
   * Configure the AI manager (partial update)
   */
  configure(update) {
    if (update.context) {
      this.config.context = { ...this.config.context, ...update.context };
      delete update.context;
    }
    Object.assign(this.config, update);
    this._persist();
    this._notify();
  }

  /**
   * Set active provider and model
   */
  setActiveProvider(providerId, modelId = null) {
    const provider = getProvider(providerId);
    if (!provider) return;
    this.config.activeProvider = providerId;
    this.config.activeModel = modelId || provider.defaultModel;
    this._persist();
    this._notify();
  }

  /**
   * Set active model on the current provider
   */
  setActiveModel(modelId: string | null) {
    this.config.activeModel = modelId;
    this._persist();
    this._notify();
  }

  /**
   * Get the active model ID (raw, may be null before first selection)
   */
  getActiveModel(): string | null {
    return this.config.activeModel;
  }

  /**
   * Set active agent
   */
  setActiveAgent(agentId) {
    this.config.activeAgent = agentId;
    this._persist();
    this._notify();
  }

  /**
   * Update a provider's config (API key, baseUrl, enabled state)
   */
  setProviderConfig(providerId, providerConfig) {
    this.config.providers = {
      ...this.config.providers,
      [providerId]: {
        ...(this.config.providers[providerId] || {}),
        ...providerConfig
      }
    };
    this._persist();
    this._notify();
  }

  /**
   * Check a provider's health by sending a minimal test request
   * Results are cached for 60 seconds
   */
  async checkProviderHealth(providerId) {
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

  /**
   * Check health of all configured providers
   */
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

  /**
   * Get the current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get the active provider definition
   */
  getActiveProvider() {
    if (!this.config.activeProvider) return null;
    return getProvider(this.config.activeProvider);
  }

  /**
   * Get active provider's display name
   */
  getActiveProviderName() {
    const provider = this.getActiveProvider();
    return provider?.name || "Local";
  }

  /**
   * Get active model name
   */
  getActiveModelName() {
    const provider = this.getActiveProvider();
    if (!provider) return "Offline";
    const model = provider.models.find(m => m.id === this.config.activeModel);
    return model?.name || this.config.activeModel || provider.defaultModel;
  }

  /**
   * Check if the active provider has a valid configuration
   */
  isConfigured() {
    const provider = this.getActiveProvider();
    if (!provider) return false;
    const config = this.config.providers[provider.id];
    if (provider.requiresKey && !config?.apiKey) return false;
    return true;
  }

  /**
   * Get all enabled providers with their status
   */
  getProviderStatuses() {
    return getAllProviders().map(p => {
      const config = this.config.providers[p.id] || {};
      const isEnabled = config.enabled !== false;
      const hasKey = !p.requiresKey || Boolean(config.apiKey);
      const isActive = this.config.activeProvider === p.id;
      const health = this._healthCache.get(p.id);
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        enabled: isEnabled,
        configured: hasKey,
        active: isActive,
        health: health?.status || "unknown",
        models: p.models,
        defaultModel: p.defaultModel
      };
    });
  }

  /**
   * Try sending to a specific provider, returns result or throws
   */
  async _tryProvider(providerId, { system, messages, maxTokens, modelOverride }: {
    system?: string;
    messages: Array<{ role: string; content: string }>;
    maxTokens?: number;
    modelOverride?: string;
  }) {
    const provider = getProvider(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found`);
    const config = this.config.providers[providerId] || {};
    if (provider.requiresKey && !config.apiKey) throw new Error(`Provider "${providerId}" not configured`);

    return await provider.send({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || provider.baseUrl,
      model: providerId === this.config.activeProvider
        ? (modelOverride || this.config.activeModel || provider.defaultModel)
        : provider.defaultModel,
      system,
      messages,
      maxTokens: maxTokens || this.config.maxTokens
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
   * @param {string} response - AI response text
   * @param {Array} pages - Known workspace pages
   * @param {Object} currentPage - Current page if any
   * @returns {string} - Response with hallucination warning appended if suspicious
   */
  guardResponse(response, pages, currentPage) {
    if (!response || !pages) return response;

    const lower = response.toLowerCase();
    const knownTitles = new Set(pages.filter(p => !p.trashed).map(p => p.title.toLowerCase()));
    const knownIds = new Set(pages.filter(p => !p.trashed).map(p => p.id));
    const activeCount = pages.filter(p => !p.trashed).length;

    let warnings = [];

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

    // Check for quoted page titles that don't exist
    const quoteMatches = response.match(/"([^"]+)"/g);
    if (quoteMatches) {
      for (const m of quoteMatches) {
        const title = m.replace(/"/g, "").trim().toLowerCase();
        if (title.length > 3 && !knownTitles.has(title) && !title.includes("current page") && !title.includes("workspace")) {
          warnings.push(`${m}`);
        }
      }
    }

    // Check numeric page count claims
    const countPatterns = [
      /you have (\d+) pages/i,
      /there are (\d+) pages/i,
      /(\d+) pages in (your|the) workspace/i,
      /total of (\d+) pages/i,
      /(\d+) active pages/i
    ];
    for (const pattern of countPatterns) {
      const match = lower.match(pattern);
      if (match) {
        const claimed = parseInt(match[1]);
        if (claimed !== activeCount) {
          warnings.push(`"${match[0].trim()}" (actual: ${activeCount})`);
        }
      }
    }

    if (warnings.length > 0) {
      console.warn("AI response guard: potential hallucination detected", warnings);
    }

    return response;
  }

  /**
   * Raw provider call used by the shared agent runtime. Unlike send/sendConversation
   * this performs NO context building or agent persona injection — the caller owns
   * the full prompt — and supports explicit provider/model overrides for model
   * orchestration (fast/default/reasoning routing). Falls back through configured
   * providers exactly like send().
   */
  async sendRaw({ system, messages, maxTokens, providerId, modelId }: {
    system?: string;
    messages: Array<{ role: string; content: string }>;
    maxTokens?: number;
    providerId?: string | null;
    modelId?: string | null;
  }): Promise<string> {
    const primaryPid = providerId || this.config.activeProvider;
    if (!primaryPid) return mockResponse("No AI provider configured");

    const candidates = [primaryPid, ...this._getFallbackProviders().filter((p) => p !== primaryPid)];
    let lastFriendlyError = "";
    for (const pid of candidates) {
      try {
        const provider = getProvider(pid);
        if (!provider) continue;
        const config = this.config.providers[pid] || {};
        if (provider.requiresKey && !config.apiKey) continue;
        // Explicit model override only applies to the requested provider;
        // fallbacks always use their own defaults.
        const model = pid === primaryPid && modelId ? modelId : provider.defaultModel;
        const result = await provider.send({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl || provider.baseUrl,
          model,
          system,
          messages,
          maxTokens: maxTokens || this.config.maxTokens
        });
        // Some legacy providers return error banners as strings — treat those
        // as failures so callers (agent runtime) never mistake them for output.
        if (looksLikeMockFailure(result)) {
          lastFriendlyError = extractMockError(result);
          continue;
        }
        return result;
      } catch (err) {
        // Prefer provider-thrown messages (e.g. rate limit) over generic ones
        lastFriendlyError = err instanceof Error ? err.message : "provider failed";
      }
    }
    throw new Error(lastFriendlyError || "All AI providers failed");
  }

  /**
   * Build the workspace-context string for a request, including any
   * per-request extras (selection, open panes, conversation state).
   */
  _buildContextString(opts: { page?: any; pages?: any[] } & AIContextExtras): string {
    if (!opts.page && !(opts.pages && opts.pages.length) && !opts.conversationSection && !opts.policySection) return "";
    const parts: string[] = [];
    const contextString = buildContext({
      page: opts.page,
      pages: opts.pages || [],
      options: {
        ...this.config.context,
        selectedBlocks: opts.selectedBlocks ?? null,
        openPanePages: (opts.openPanePages ?? null) as never,
      },
      memory: getMemory(),
      userProfile: buildUserProfileContext()
    });
    if (contextString) parts.push(contextString);
    if (opts.conversationSection) parts.push(opts.conversationSection);
    if (opts.policySection) parts.push(opts.policySection);
    return parts.join("\n\n---\n\n");
  }

  /** Resolve an optional model-class request to a concrete model id on the
   * active provider. Returns undefined to keep the user's selected model. */
  _resolveClassModel(modelClass?: AIContextExtras["modelClass"]): string | undefined {
    if (!modelClass || modelClass === "default") return undefined;
    try {
      const sel = selectModel(modelClass);
      return sel.providerId ? (sel.modelId || undefined) : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Send an AI request (non-streaming) with auto-fallback
   * @param {Object} opts - { system?, prompt, page?, pages?, agent?, maxTokens?, contextExtras? }
   * @returns {Promise<string>}
   */
  async send({ system, prompt, page, pages, agent, maxTokens, selectedBlocks, openPanePages, conversationSection, policySection, modelClass }: AISendOpts) {
    const provider = this.getActiveProvider();
    const providerConfig = this.config.providers[this.config.activeProvider] || {};

    const contextString = this._buildContextString({ page, pages, selectedBlocks, openPanePages, conversationSection, policySection });

    // Build system prompt with agent persona
    const agentId = agent || this.config.activeAgent;
    const fullSystem = system || buildAgentPrompt(agentId, contextString, { tools: true });

    // If no provider is configured, return mock
    if (!provider || (provider.requiresKey && !providerConfig.apiKey)) {
      return mockResponse("No AI provider configured");
    }

    // Class-based routing keeps the user's provider; only the model id moves.
    const classModel = this._resolveClassModel(modelClass);
    const preferredModel = classModel || this.config.activeModel;

    // Try active provider, then fallbacks (#12 quality-first degradation)
    const fallbacks = this._getFallbackProviders();
    const messages = [{ role: "user", content: prompt }];
    let lastError = "";

    for (const pid of [this.config.activeProvider, ...fallbacks]) {
      try {
        const result = await this._tryProvider(pid, {
          system: fullSystem, messages, maxTokens,
          ...(pid === this.config.activeProvider && preferredModel ? { modelOverride: preferredModel } : {})
        });
        if (looksLikeMockFailure(result)) {
          lastError = extractMockError(result);
          this._healthCache.set(pid, { status: "error", timestamp: Date.now() });
          continue;
        }
        // Update health cache on success
        this._healthCache.set(pid, { status: "online", timestamp: Date.now() });
        return this.guardResponse(result, pages, page);
      } catch (err) {
        lastError = err instanceof Error ? err.message : "provider failed";
        this._healthCache.set(pid, { status: "error", timestamp: Date.now() });
        // Try next fallback
      }
    }

    // Honest failure — the chat UI renders this as a real error message.
    throw new Error(lastError || "All AI providers failed");
  }

  /**
   * Send a multi-turn conversation with auto-fallback across providers.
   * Conversation context, intent and style are preserved across failover —
   * the same messages go to the next candidate (#42).
   * @param {Object} opts - { system?, messages, page?, pages?, agent?, maxTokens? }
   * @returns {Promise<string>}
   */
  async sendConversation({ system, messages, page, pages, agent, maxTokens, selectedBlocks, openPanePages, conversationSection, policySection, modelClass }: AISendConversationOpts) {
    const provider = this.getActiveProvider();
    const providerConfig = this.config.providers[this.config.activeProvider] || {};

    const contextString = this._buildContextString({ page, pages, selectedBlocks, openPanePages, conversationSection, policySection });

    const agentId = agent || this.config.activeAgent;
    const fullSystem = system || buildAgentPrompt(agentId, contextString, { tools: true });

    if (!provider || (provider.requiresKey && !providerConfig.apiKey)) {
      return mockResponse("No AI provider configured");
    }

    // Convert messages format: { role, text } → { role, content }
    const apiMessages = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role, content: m.text || m.content }));

    const classModel = this._resolveClassModel(modelClass);

    const candidates = [this.config.activeProvider, ...this._getFallbackProviders()];
    let lastError = "";
    for (const pid of candidates) {
      try {
        const result = await this._tryProvider(pid, {
          system: fullSystem,
          messages: apiMessages,
          maxTokens,
          ...(pid === this.config.activeProvider && classModel ? { modelOverride: classModel } : {})
        });
        if (looksLikeMockFailure(result)) {
          lastError = extractMockError(result);
          this._healthCache.set(pid, { status: "error", timestamp: Date.now() });
          continue;
        }
        this._healthCache.set(pid, { status: "online", timestamp: Date.now() });
        return this.guardResponse(result, pages, page);
      } catch (err) {
        lastError = err instanceof Error ? err.message : "AI request failed";
        this._healthCache.set(pid, { status: "error", timestamp: Date.now() });
      }
    }
    // Honest failure — panel catch blocks render friendly messages.
    throw new Error(lastError || "All AI providers failed");
  }

  /**
   * Stream an AI response. Falls back through configured providers on
   * failure and degrades gracefully to non-streaming when no provider
   * supports streams. onChunk always receives the FULL accumulated text.
   * @param {Object} opts - { system?, prompt, page?, pages?, agent?, maxTokens?, onChunk }
   * @returns {Promise<string>} - Full accumulated response
   */
  async stream({ system, prompt, messages, page, pages, agent, maxTokens, onChunk, selectedBlocks, openPanePages, conversationSection, policySection, modelClass, signal }: AIStreamOpts) {
    const provider = this.getActiveProvider();
    const providerConfig = this.config.providers[this.config.activeProvider] || {};

    const contextString = this._buildContextString({ page, pages, selectedBlocks, openPanePages, conversationSection, policySection });

    const agentId = agent || this.config.activeAgent;
    const fullSystem = system || buildAgentPrompt(agentId, contextString, { tools: true });

    if (!provider || (provider.requiresKey && !providerConfig.apiKey)) {
      throw new Error("No AI provider configured");
    }

    // Build message list
    let apiMessages;
    if (messages) {
      apiMessages = messages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role, content: m.text || m.content }));
    } else {
      apiMessages = [{ role: "user", content: prompt }];
    }

    const classModel = this._resolveClassModel(modelClass);
    const candidates = [this.config.activeProvider, ...this._getFallbackProviders()];
    let lastError = "";

    for (const pid of candidates) {
      const p = getProvider(pid);
      if (!p) continue;
      const cfg = this.config.providers[pid] || {};
      if (p.requiresKey && !cfg.apiKey) continue;

      // Preferred path: native streaming
      if (typeof p.stream === "function") {
        try {
          let full = "";
          const iterator = p.stream({
            apiKey: cfg.apiKey,
            baseUrl: cfg.baseUrl || p.baseUrl,
            model: pid === this.config.activeProvider ? ((classModel || this.config.activeModel) || p.defaultModel) : p.defaultModel,
            system: fullSystem,
            messages: apiMessages,
            maxTokens: maxTokens || this.config.maxTokens
          });
          for await (const chunk of iterator) {
            if (signal?.aborted) break;
            full += chunk;
            onChunk?.(full);
          }
          if (signal?.aborted) {
            return this.guardResponse(full + "\n\n*(stopped)*", pages, page);
          }
          if (looksLikeMockFailure(full)) {
            lastError = extractMockError(full);
            this._healthCache.set(pid, { status: "error", timestamp: Date.now() });
            continue;
          }
          this._healthCache.set(pid, { status: "online", timestamp: Date.now() });
          return this.guardResponse(full, pages, page);
        } catch (err) {
          lastError = err instanceof Error ? err.message : "streaming failed";
          this._healthCache.set(pid, { status: "error", timestamp: Date.now() });
          continue;
        }
      }

      // Degrade honestly to non-streaming rather than failing the request
      try {
        const result = await p.send({
          apiKey: cfg.apiKey,
          baseUrl: cfg.baseUrl || p.baseUrl,
          model: pid === this.config.activeProvider ? ((classModel || this.config.activeModel) || p.defaultModel) : p.defaultModel,
          system: fullSystem,
          messages: apiMessages,
          maxTokens: maxTokens || this.config.maxTokens
        });
        if (looksLikeMockFailure(result)) {
          lastError = extractMockError(result);
          this._healthCache.set(pid, { status: "error", timestamp: Date.now() });
          continue;
        }
        this._healthCache.set(pid, { status: "online", timestamp: Date.now() });
        const guarded = this.guardResponse(result, pages, page);
        onChunk?.(guarded);
        return guarded;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "request failed";
        this._healthCache.set(pid, { status: "error", timestamp: Date.now() });
      }
    }

    throw new Error(lastError || "All AI providers failed");
  }

  /**
   * Migrate from old config format (apiKey, aiProvider, nvidiaKey)
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
      // Only auto-switch the ACTIVE provider on first-ever migration —
      // once the user picked one deliberately, legacy keys just register
      // as available providers and never hijack the selection again.
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

  /**
   * Subscribe to config changes
   */
  subscribe(listener) {
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
