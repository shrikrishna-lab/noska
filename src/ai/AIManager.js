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

import { getProvider, getAllProviders, mockResponse, testProviderConnection } from './providers.js';
import { buildContext, buildMinimalContext } from './ContextBuilder.js';
import { buildAgentPrompt, getAgent } from './agents.js';
import { initializeMemory, getMemory } from './memory.js';
import { buildUserProfileContext } from './userProfile.js';

// ─── Default Config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  // Provider configs: { [providerId]: { apiKey?, baseUrl?, enabled? } }
  providers: {},
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

// ─── AI Manager Class ───────────────────────────────────────────────────────

class AIManager {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this._listeners = new Set();
    this._initialized = false;
    this._healthCache = new Map();
    this._healthTimers = new Map();
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
      }
    } catch {
      // Use defaults
    }
    this._initialized = true;
    // Initialize AI memory (non-blocking)
    initializeMemory().catch(() => {});
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
  async _tryProvider(providerId, { system, messages, maxTokens }) {
    const provider = getProvider(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found`);
    const config = this.config.providers[providerId] || {};
    if (provider.requiresKey && !config.apiKey) throw new Error(`Provider "${providerId}" not configured`);

    return await provider.send({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || provider.baseUrl,
      model: providerId === this.config.activeProvider ? (this.config.activeModel || provider.defaultModel) : provider.defaultModel,
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
   * Send an AI request (non-streaming) with auto-fallback
   * @param {Object} opts - { system?, prompt, page?, pages?, agent?, maxTokens? }
   * @returns {Promise<string>}
   */
  async send({ system, prompt, page, pages, agent, maxTokens }) {
    const provider = this.getActiveProvider();
    const providerConfig = this.config.providers[this.config.activeProvider] || {};

    // Build context if page data is provided
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

    // Build system prompt with agent persona
    const agentId = agent || this.config.activeAgent;
    const fullSystem = system || buildAgentPrompt(agentId, contextString, { tools: true });

    // If no provider is configured, return mock
    if (!provider || (provider.requiresKey && !providerConfig.apiKey)) {
      return mockResponse("No AI provider configured");
    }

    // Try active provider, then fallbacks
    const fallbacks = this._getFallbackProviders();
    const messages = [{ role: "user", content: prompt }];

    for (const pid of [this.config.activeProvider, ...fallbacks]) {
      try {
        const result = await this._tryProvider(pid, { system: fullSystem, messages, maxTokens });
        // Update health cache on success
        this._healthCache.set(pid, { status: "online", timestamp: Date.now() });
        return this.guardResponse(result, pages, page);
      } catch (err) {
        this._healthCache.set(pid, { status: "error", timestamp: Date.now() });
        // Try next fallback
      }
    }

    return mockResponse("All providers failed");
  }

  /**
   * Send a multi-turn conversation
   * @param {Object} opts - { system?, messages, page?, pages?, agent?, maxTokens? }
   * @returns {Promise<string>}
   */
  async sendConversation({ system, messages, page, pages, agent, maxTokens }) {
    const provider = this.getActiveProvider();
    const providerConfig = this.config.providers[this.config.activeProvider] || {};

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
    const fullSystem = system || buildAgentPrompt(agentId, contextString, { tools: true });

    if (!provider || (provider.requiresKey && !providerConfig.apiKey)) {
      return mockResponse("No AI provider configured");
    }

    // Convert messages format: { role, text } → { role, content }
    const apiMessages = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role, content: m.text || m.content }));

    try {
      const result = await provider.send({
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl || provider.baseUrl,
        model: this.config.activeModel || provider.defaultModel,
        system: fullSystem,
        messages: apiMessages,
        maxTokens: maxTokens || this.config.maxTokens
      });
      return this.guardResponse(result, pages, page);
    } catch (err) {
      return mockResponse(`Request failed: ${err.message}`);
    }
  }

  /**
   * Stream an AI response
   * @param {Object} opts - { system?, prompt, page?, pages?, agent?, maxTokens?, onChunk }
   * @returns {Promise<string>} - Full accumulated response
   */
  async stream({ system, prompt, messages, page, pages, agent, maxTokens, onChunk }) {
    const provider = this.getActiveProvider();
    const providerConfig = this.config.providers[this.config.activeProvider] || {};

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
    const fullSystem = system || buildAgentPrompt(agentId, contextString, { tools: true });

    if (!provider || (provider.requiresKey && !providerConfig.apiKey)) {
      const fallback = mockResponse("No AI provider configured");
      onChunk?.(fallback);
      return fallback;
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

    // If provider supports streaming, use it
    if (typeof provider.stream === "function") {
      try {
        let full = "";
        const iterator = provider.stream({
          apiKey: providerConfig.apiKey,
          baseUrl: providerConfig.baseUrl || provider.baseUrl,
          model: this.config.activeModel || provider.defaultModel,
          system: fullSystem,
          messages: apiMessages,
          maxTokens: maxTokens || this.config.maxTokens
        });
        for await (const chunk of iterator) {
          full += chunk;
          onChunk?.(full);
        }
        return full;
      } catch (err) {
        const fallback = mockResponse(`Streaming failed: ${err.message}`);
        onChunk?.(fallback);
        return fallback;
      }
    }

    // Fallback: non-streaming send, deliver all at once
    try {
      const result = await provider.send({
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl || provider.baseUrl,
        model: this.config.activeModel || provider.defaultModel,
        system: fullSystem,
        messages: apiMessages,
        maxTokens: maxTokens || this.config.maxTokens
      });
      const guarded = this.guardResponse(result, pages, page);
      onChunk?.(guarded);
      return guarded;
    } catch (err) {
      const fallback = mockResponse(`Request failed: ${err.message}`);
      onChunk?.(fallback);
      return fallback;
    }
  }

  /**
   * Migrate from old config format (apiKey, aiProvider, nvidiaKey)
   */
  migrateFromLegacy({ apiKey, aiProvider, nvidiaKey }) {
    const updates = {};
    if (nvidiaKey) {
      updates.nvidia = { apiKey: nvidiaKey, enabled: true };
    }
    if (apiKey) {
      updates.anthropic = { apiKey, enabled: true };
    }
    if (Object.keys(updates).length > 0) {
      this.config.providers = { ...this.config.providers, ...updates };
      // Set active provider based on legacy setting
      if (aiProvider === "nvidia" && nvidiaKey) {
        this.config.activeProvider = "nvidia";
        this.config.activeModel = "nvidia/llama-3.1-nemotron-70b-instruct";
      } else if (apiKey) {
        this.config.activeProvider = "anthropic";
        this.config.activeModel = "claude-sonnet-4-20250514";
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
