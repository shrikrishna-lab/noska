/**
 * Noska AI V5 — Provider Registry
 *
 * Unified provider interface for cloud and local AI providers.
 * 
 * V5 changes from V4:
 * - Every provider throws AIError instead of returning mockResponse()
 * - Every provider accepts AbortSignal for cancellation
 * - Every provider that supports streaming implements stream() with StreamEvent
 * - Gemini API key moved from URL parameter to header (security fix)
 * - NVIDIA maxTokens default fixed from 1000 to 2048
 * - Anthropic stream extracts thinking blocks
 * - All providers use normalized stream parsers from StreamProtocol
 */

import {
  AIError,
  classifyProviderError,
  classifyNetworkError,
  configError,
} from './core/AIError.js';
import {
  parseOpenAIStream,
  parseAnthropicStream,
  parseGeminiStream,
  parseOllamaStream,
  streamEventsToText,
  type StreamEvent,
} from './core/StreamProtocol.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AIModel {
  id: string;
  name: string;
  context: number;
}

export interface AIMessage {
  role: string;
  content: string;
}

export interface ProviderSendOpts {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  system?: string;
  messages: AIMessage[];
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  thinking?: boolean;
  signal?: AbortSignal;
}

export interface AIProvider {
  id: string;
  name: string;
  type: string;
  requiresKey: boolean;
  baseUrl: string;
  keyPlaceholder: string;
  models: AIModel[];
  defaultModel: string;
  send(opts: ProviderSendOpts): Promise<string>;
  stream?(opts: ProviderSendOpts): AsyncGenerator<string>;
  streamEvents?(opts: ProviderSendOpts): AsyncGenerator<StreamEvent>;
  discoverModels?(baseUrl?: string): Promise<AIModel[]>;
}

// ─── Shared Fetch Helper ────────────────────────────────────────────────────

const CONNECTION_TIMEOUT = 30000;  // 30s connection timeout
const STREAM_INACTIVITY_TIMEOUT = 90000; // 90s stream inactivity timeout

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

/**
 * Fetch wrapper that adds:
 * 1. Connection timeout (configurable per request)
 * 2. AbortSignal composition
 * 3. Automatic browser CORS/proxy fallback
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
  timeoutMs = CONNECTION_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const composedSignal = controller.signal;

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  // Connection timeout
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: composedSignal });
    clearTimeout(timer);
    return res;
  } catch (err: unknown) {
    clearTimeout(timer);
    // Automatic browser CORS proxy fallback for all providers
    if (typeof window !== "undefined" && !url.includes("/api/proxy/")) {
      for (const [targetUrl, proxyPrefix] of Object.entries(PROXY_MAP)) {
        if (url.startsWith(targetUrl)) {
          const proxyUrl = url.replace(targetUrl, `${window.location.origin}${proxyPrefix}`);
          try {
            return await fetch(proxyUrl, { ...init, signal: composedSignal });
          } catch {
            break;
          }
        }
      }
    }
    throw err;
  }
}

/** Check response status and throw AIError if not ok */
async function checkResponse(res: Response, provider: string, model: string): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw classifyProviderError(provider, model, res.status, body, res);
  }
}

// ─── Provider Definitions ───────────────────────────────────────────────────

const PROVIDERS: Record<string, AIProvider> = {
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    type: "cloud",
    requiresKey: true,
    baseUrl: "https://openrouter.ai/api/v1",
    keyPlaceholder: "sk-or-...",
    models: [
      { id: "anthropic/claude-opus-4.6", name: "Claude Opus 4.6 (Thinking)", context: 200000 },
      { id: "anthropic/claude-sonnet-5", name: "Claude Sonnet 5 (Thinking)", context: 200000 },
      { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6 (Thinking)", context: 200000 },
      { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", context: 200000 },
      { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet (Thinking)", context: 200000 },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", context: 200000 },
      { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", context: 200000 },
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", context: 1000000 },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", context: 2000000 },
      { id: "openai/gpt-4o", name: "GPT-4o (Omni)", context: 128000 },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", context: 128000 },
      { id: "openai/o3-mini", name: "OpenAI o3 Mini", context: 200000 },
      { id: "openai/o1", name: "OpenAI o1 (Thinking)", context: 200000 },
      { id: "deepseek/deepseek-r1", name: "DeepSeek R1 (Thinking)", context: 65536 },
      { id: "deepseek/deepseek-chat", name: "DeepSeek V3", context: 65536 },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", context: 131072 },
      { id: "qwen/qwen-2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B", context: 32768 },
      { id: "mistralai/mistral-large-2407", name: "Mistral Large 2", context: 128000 }
    ],
    defaultModel: "anthropic/claude-opus-4.6",
    async send({ apiKey, model, system, messages, maxTokens = 2048, effort, thinking, signal }) {
      if (!apiKey) throw configError("OpenRouter");
      const modelId = model || this.defaultModel;
      const payload: Record<string, any> = {
        model: modelId,
        max_tokens: maxTokens,
        temperature: effort === "low" ? 0.2 : effort === "high" ? 0.6 : 0.4,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...messages
        ]
      };
      if (effort) payload.reasoning = { effort };
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://noska.me",
            "X-Title": "Noska"
          },
          body: JSON.stringify(payload)
        }, signal);
        await checkResponse(res, "OpenRouter", modelId);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("OpenRouter", modelId, err as Error);
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 2048, effort, thinking, signal }) {
      if (!apiKey) throw configError("OpenRouter");
      const modelId = model || this.defaultModel;
      const payload: Record<string, any> = {
        model: modelId,
        max_tokens: maxTokens,
        temperature: effort === "low" ? 0.2 : effort === "high" ? 0.6 : 0.4,
        stream: true,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...messages
        ]
      };
      if (effort) payload.reasoning = { effort };
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://noska.me",
            "X-Title": "Noska"
          },
          body: JSON.stringify(payload)
        }, signal);
        await checkResponse(res, "OpenRouter", modelId);
        yield* streamEventsToText(parseOpenAIStream(res, signal));
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("OpenRouter", modelId, err as Error);
      }
    }
  },

  gemini: {
    id: "gemini",
    name: "Google Gemini",
    type: "cloud",
    requiresKey: true,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    keyPlaceholder: "AIza...",
    models: [
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", context: 1048576 },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", context: 2097152 },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context: 1048576 },
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", context: 1048576 },
      { id: "gemini-2.0-pro-exp-02-05", name: "Gemini 2.0 Pro (Exp)", context: 2097152 },
      { id: "gemini-2.0-flash-thinking-exp-01-21", name: "Gemini 2.0 Flash Thinking", context: 1048576 },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", context: 2097152 },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", context: 1048576 }
    ],
    defaultModel: "gemini-2.5-flash",
    async send({ apiKey, model, system, messages, maxTokens = 2048, effort, thinking, signal }) {
      if (!apiKey) throw configError("Gemini");
      const modelId = model || this.defaultModel;
      try {
        const contents = messages.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }));
        const generationConfig: Record<string, any> = { maxOutputTokens: maxTokens, temperature: 0.4 };
        if (modelId.includes("3.7") || modelId.includes("3.6") || modelId.includes("3.5") || modelId.includes("thinking") || thinking) {
          generationConfig.thinkingConfig = {
            thinkingBudget: effort === "high" ? 16000 : effort === "low" ? 2048 : 8000
          };
        }
        const body: Record<string, any> = { contents, generationConfig };
        if (system) {
          body.systemInstruction = { parts: [{ text: system }] };
        }
        const res = await fetchWithTimeout(
          `${this.baseUrl}/models/${modelId}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            },
            body: JSON.stringify(body)
          },
          signal
        );
        await checkResponse(res, "Gemini", modelId);
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("Gemini", modelId, err as Error);
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 2048, effort, thinking, signal }) {
      if (!apiKey) throw configError("Gemini");
      const modelId = model || this.defaultModel;
      try {
        const contents = messages.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }));
        const generationConfig: Record<string, any> = { maxOutputTokens: maxTokens, temperature: 0.4 };
        if (modelId.includes("3.7") || modelId.includes("3.6") || modelId.includes("3.5") || modelId.includes("thinking") || thinking) {
          generationConfig.thinkingConfig = {
            thinkingBudget: effort === "high" ? 16000 : effort === "low" ? 2048 : 8000
          };
        }
        const body: Record<string, any> = { contents, generationConfig };
        if (system) {
          body.systemInstruction = { parts: [{ text: system }] };
        }
        const res = await fetchWithTimeout(
          `${this.baseUrl}/models/${modelId}:streamGenerateContent?alt=sse`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            },
            body: JSON.stringify(body)
          },
          signal
        );
        await checkResponse(res, "Gemini", modelId);
        yield* streamEventsToText(parseGeminiStream(res, signal));
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("Gemini", modelId, err as Error);
      }
    }
  },

  openai: {
    id: "openai",
    name: "OpenAI",
    type: "cloud",
    requiresKey: true,
    baseUrl: "https://api.openai.com/v1",
    keyPlaceholder: "sk-...",
    models: [
      { id: "gpt-5.6-sol", name: "GPT-5.6 Sol (Flagship Reasoning)", context: 1050000 },
      { id: "gpt-5.6-terra", name: "GPT-5.6 Terra (Balanced Agent)", context: 1050000 },
      { id: "gpt-5.6-luna", name: "GPT-5.6 Luna (Fast Efficient)", context: 1050000 },
      { id: "o3-mini", name: "OpenAI o3 Mini (Reasoning)", context: 200000 },
      { id: "o1", name: "OpenAI o1 (Thinking)", context: 200000 },
      { id: "gpt-4o", name: "GPT-4o (Omni)", context: 128000 },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", context: 128000 },
      { id: "chatgpt-4o-latest", name: "ChatGPT 4o Latest", context: 128000 }
    ],
    defaultModel: "gpt-5.6-sol",
    async send({ apiKey, model, system, messages, maxTokens = 2048, effort, thinking, signal }) {
      if (!apiKey) throw configError("OpenAI");
      const modelId = model || this.defaultModel;
      const isReasoning = modelId.startsWith("o1") || modelId.startsWith("o3") || modelId.includes("gpt-5") || Boolean(thinking);
      try {
        const payload: Record<string, any> = {
          model: modelId,
          max_tokens: maxTokens,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            ...messages
          ]
        };
        if (!isReasoning) {
          payload.temperature = effort === "low" ? 0.2 : effort === "high" ? 0.7 : 0.4;
        } else {
          payload.reasoning_effort = effort || "medium";
        }
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        }, signal);
        await checkResponse(res, "OpenAI", modelId);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("OpenAI", modelId, err as Error);
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 2048, effort, thinking, signal }) {
      if (!apiKey) throw configError("OpenAI");
      const modelId = model || this.defaultModel;
      const isReasoning = modelId.startsWith("o1") || modelId.startsWith("o3") || modelId.includes("gpt-5") || Boolean(thinking);
      try {
        const payload: Record<string, any> = {
          model: modelId,
          max_tokens: maxTokens,
          stream: true,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            ...messages
          ]
        };
        if (!isReasoning) {
          payload.temperature = effort === "low" ? 0.2 : effort === "high" ? 0.7 : 0.4;
        } else {
          payload.reasoning_effort = effort || "medium";
        }
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        }, signal);
        await checkResponse(res, "OpenAI", modelId);
        yield* streamEventsToText(parseOpenAIStream(res, signal));
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("OpenAI", modelId, err as Error);
      }
    }
  },

  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    type: "cloud",
    requiresKey: true,
    baseUrl: "https://api.anthropic.com/v1",
    keyPlaceholder: "sk-ant-...",
    models: [
      { id: "claude-opus-5", name: "Claude Opus 5 (Deep Reasoning)", context: 1000000 },
      { id: "claude-sonnet-5", name: "Claude Sonnet 5 (High-Speed)", context: 1000000 },
      { id: "claude-fable-5", name: "Claude Fable 5", context: 1000000 },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", context: 200000 },
      { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet (Hybrid Thinking)", context: 200000 },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", context: 200000 },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", context: 200000 }
    ],
    defaultModel: "claude-opus-5",
    async send({ apiKey, model, system, messages, maxTokens = 4096, effort, thinking, signal }) {
      if (!apiKey) throw configError("Anthropic");
      const modelId = model || this.defaultModel;
      const isAdaptiveThinking = modelId.includes("claude-3-7") || modelId.includes("5") || Boolean(thinking);
      try {
        const payload: Record<string, any> = {
          model: modelId,
          max_tokens: Math.max(maxTokens, 4096),
          stream: false,
          ...(system ? { system } : {}),
          messages
        };
        if (isAdaptiveThinking) {
          const budget = effort === "high" ? 16000 : effort === "low" ? 2048 : 8000;
          payload.thinking = { type: "enabled", budget_tokens: budget };
          payload.max_tokens = Math.max(payload.max_tokens, budget + 4096);
        }
        const res = await fetchWithTimeout(`${this.baseUrl}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify(payload)
        }, signal);
        await checkResponse(res, "Anthropic", modelId);
        const data = await res.json();
        return data.content?.map((c: any) => c.text).join("\n") || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("Anthropic", modelId, err as Error);
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 4096, effort, thinking, signal }) {
      if (!apiKey) throw configError("Anthropic");
      const modelId = model || this.defaultModel;
      const isAdaptiveThinking = modelId.includes("claude-3-7") || modelId.includes("5") || Boolean(thinking);
      try {
        const payload: Record<string, any> = {
          model: modelId,
          max_tokens: Math.max(maxTokens, 4096),
          stream: true,
          ...(system ? { system } : {}),
          messages
        };
        if (isAdaptiveThinking) {
          const budget = effort === "high" ? 16000 : effort === "low" ? 2048 : 8000;
          payload.thinking = { type: "enabled", budget_tokens: budget };
          payload.max_tokens = Math.max(payload.max_tokens, budget + 4096);
        }
        const res = await fetchWithTimeout(`${this.baseUrl}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify(payload)
        }, signal);
        await checkResponse(res, "Anthropic", modelId);
        yield* streamEventsToText(parseAnthropicStream(res, signal));
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("Anthropic", modelId, err as Error);
      }
    }
  },

  groq: {
    id: "groq",
    name: "Groq",
    type: "cloud",
    requiresKey: true,
    baseUrl: "https://api.groq.com/openai/v1",
    keyPlaceholder: "gsk_...",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile", context: 128000 },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", context: 128000 },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 70B (Groq)", context: 128000 },
      { id: "deepseek-r1-distill-qwen-32b", name: "DeepSeek R1 Qwen 32B (Groq)", context: 128000 },
      { id: "qwen-2.5-32b", name: "Qwen 2.5 32B (Groq)", context: 32768 },
      { id: "qwen-2.5-coder-32b", name: "Qwen 2.5 Coder 32B (Groq)", context: 32768 },
      { id: "llama-3.2-11b-vision-preview", name: "Llama 3.2 11B Vision", context: 128000 },
      { id: "llama-3.2-90b-vision-preview", name: "Llama 3.2 90B Vision", context: 128000 }
    ],
    defaultModel: "llama-3.3-70b-versatile",
    async send({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError("Groq");
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        }, signal);
        await checkResponse(res, "Groq", modelId);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("Groq", modelId, err as Error);
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError("Groq");
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            stream: true,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        }, signal);
        await checkResponse(res, "Groq", modelId);
        yield* streamEventsToText(parseOpenAIStream(res, signal));
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("Groq", modelId, err as Error);
      }
    }
  },

  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    type: "cloud",
    requiresKey: true,
    baseUrl: "https://api.deepseek.com/v1",
    keyPlaceholder: "sk-…",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3 Chat (671B)", context: 64000 },
      { id: "deepseek-reasoner", name: "DeepSeek R1 Reasoner (Thinking)", context: 64000 },
      { id: "deepseek-coder-v2.5", name: "DeepSeek Coder V2.5", context: 128000 },
      { id: "deepseek-vl2", name: "DeepSeek Vision Language 2", context: 64000 }
    ],
    defaultModel: "deepseek-chat",
    async send({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError("DeepSeek");
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [...(system ? [{ role: "system", content: system }] : []), ...messages]
          })
        }, signal);
        await checkResponse(res, "DeepSeek", modelId);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("DeepSeek", modelId, err as Error);
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError("DeepSeek");
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            stream: true,
            messages: [...(system ? [{ role: "system", content: system }] : []), ...messages]
          })
        }, signal);
        await checkResponse(res, "DeepSeek", modelId);
        yield* streamEventsToText(parseOpenAIStream(res, signal));
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("DeepSeek", modelId, err as Error);
      }
    }
  },

  mistral: {
    id: "mistral",
    name: "Mistral AI",
    type: "cloud",
    requiresKey: true,
    baseUrl: "https://api.mistral.ai/v1",
    keyPlaceholder: "…",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large 2", context: 128000 },
      { id: "mistral-small-latest", name: "Mistral Small (24B)", context: 128000 },
      { id: "codestral-latest", name: "Codestral (256k)", context: 256000 },
      { id: "pixtral-large-latest", name: "Pixtral Large (Vision)", context: 128000 },
      { id: "pixtral-12b-2409", name: "Pixtral 12B", context: 128000 },
      { id: "ministral-8b-latest", name: "Ministral 8B", context: 128000 },
      { id: "ministral-3b-latest", name: "Ministral 3B", context: 128000 },
      { id: "mistral-embed", name: "Mistral Embed", context: 8192 }
    ],
    defaultModel: "mistral-large-latest",
    async send({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError("Mistral");
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [...(system ? [{ role: "system", content: system }] : []), ...messages]
          })
        }, signal);
        await checkResponse(res, "Mistral", modelId);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("Mistral", modelId, err as Error);
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError("Mistral");
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            stream: true,
            messages: [...(system ? [{ role: "system", content: system }] : []), ...messages]
          })
        }, signal);
        await checkResponse(res, "Mistral", modelId);
        yield* streamEventsToText(parseOpenAIStream(res, signal));
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("Mistral", modelId, err as Error);
      }
    }
  },

  together: {
    id: "together",
    name: "Together AI",
    type: "cloud",
    requiresKey: true,
    baseUrl: "https://api.together.xyz/v1",
    keyPlaceholder: "…",
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B Turbo", context: 131072 },
      { id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", name: "Llama 3.1 405B Turbo", context: 131072 },
      { id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", name: "Llama 3.1 8B Turbo", context: 131072 },
      { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1 (Together)", context: 65536 },
      { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3 (Together)", context: 65536 },
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen 2.5 Coder 32B", context: 32768 },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", name: "Qwen 2.5 72B Turbo", context: 32768 },
      { id: "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF", name: "Nemotron 70B Turbo", context: 131072 }
    ],
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    async send({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError("Together");
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [...(system ? [{ role: "system", content: system }] : []), ...messages]
          })
        }, signal);
        await checkResponse(res, "Together", modelId);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("Together", modelId, err as Error);
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError("Together");
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            stream: true,
            messages: [...(system ? [{ role: "system", content: system }] : []), ...messages]
          })
        }, signal);
        await checkResponse(res, "Together", modelId);
        yield* streamEventsToText(parseOpenAIStream(res, signal));
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("Together", modelId, err as Error);
      }
    }
  },

  xai: {
    id: "xai",
    name: "xAI Grok",
    type: "cloud",
    requiresKey: true,
    baseUrl: "https://api.x.ai/v1",
    keyPlaceholder: "xai-…",
    models: [
      { id: "grok-2-latest", name: "Grok 2", context: 131072 },
      { id: "grok-2-vision-latest", name: "Grok 2 Vision", context: 131072 },
      { id: "grok-2-1212", name: "Grok 2 (1212)", context: 131072 },
      { id: "grok-2-vision-1212", name: "Grok 2 Vision (1212)", context: 131072 },
      { id: "grok-beta", name: "Grok Beta Preview", context: 131072 }
    ],
    defaultModel: "grok-2-latest",
    async send({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError("xAI");
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [...(system ? [{ role: "system", content: system }] : []), ...messages]
          })
        }, signal);
        await checkResponse(res, "xAI", modelId);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("xAI", modelId, err as Error);
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError("xAI");
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            stream: true,
            messages: [...(system ? [{ role: "system", content: system }] : []), ...messages]
          })
        }, signal);
        await checkResponse(res, "xAI", modelId);
        yield* streamEventsToText(parseOpenAIStream(res, signal));
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("xAI", modelId, err as Error);
      }
    }
  },

  nvidia: {
    id: "nvidia",
    name: "NVIDIA NIM",
    type: "cloud",
    requiresKey: true,
    baseUrl: "https://integrate.api.nvidia.com/v1",
    keyPlaceholder: "nvapi-...",
    models: [
      { id: "nvidia/nemotron-3.5-lightning-30b-a3b", name: "Nemotron 3.5 Lightning (Thinking)", context: 131072 },
      { id: "deepseek-ai/deepseek-v4-pro-0813", name: "DeepSeek V4 Pro", context: 131072 },
      { id: "minimaxai/minimax-m3", name: "MiniMax M3", context: 1000000 },
      { id: "moonshotai/kimi-k3", name: "Kimi K3", context: 131072 },
      { id: "openai/gpt-oss-120b", name: "GPT OSS 120B", context: 131072 },
      { id: "google/gemma-4-31b-it", name: "Gemma 4 31B", context: 131072 },
      { id: "nvidia/nemotron-3-ultra-550b-a55b", name: "Nemotron 3 Ultra 550B", context: 131072 },
      { id: "poolside/laguna-xs-2.1", name: "Laguna XS 2.1", context: 131072 },
      { id: "mistralai/mistral-nemotron", name: "Mistral Nemotron", context: 131072 },
      { id: "meta/llama-3.2-90b-vision-instruct", name: "Llama 3.2 90B Vision", context: 131072 }
    ],
    defaultModel: "nvidia/nemotron-3.5-lightning-30b-a3b",
    async send({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError("NVIDIA");
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.5,
            top_p: 1,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        }, signal, 45000);
        await checkResponse(res, "NVIDIA", modelId);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("NVIDIA", modelId, err as Error);
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError("NVIDIA");
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "Authorization": `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.5,
            top_p: 1,
            stream: true,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        }, signal, 45000);
        await checkResponse(res, "NVIDIA", modelId);
        yield* streamEventsToText(parseOpenAIStream(res, signal));
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("NVIDIA", modelId, err as Error);
      }
    }
  },

  opencode_zen: {
    id: "opencode_zen",
    name: "OpenCode Zen",
    type: "cloud",
    requiresKey: true,
    baseUrl: "https://opencode.ai/zen/v1",
    keyPlaceholder: "sk-...",
    models: [
      { id: "nemotron-3.5-lightning-free", name: "Nemotron 3.5 Lightning [Free ⚡]", context: 131072 },
      { id: "nemotron-3-ultra-free", name: "Nemotron 3 Ultra [Free ⚡]", context: 131072 },
      { id: "laguna-s-2.1-free", name: "Laguna S 2.1 [Free ⚡]", context: 65536 },
      { id: "mimo-v2.5-free", name: "Mimo v2.5 [Free ⚡]", context: 65536 },
      { id: "claude-sonnet-5", name: "Claude Sonnet 5 (Zen)", context: 200000 },
      { id: "claude-opus-5", name: "Claude Opus 5 (Zen)", context: 200000 },
      { id: "claude-opus-4-8", name: "Claude Opus 4.8 (Zen)", context: 200000 },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6 (Zen)", context: 200000 },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5 (Zen)", context: 200000 },
      { id: "gpt-5.6-sol", name: "GPT-5.6 Sol (Zen)", context: 200000 },
      { id: "gpt-5.5-pro", name: "GPT-5.5 Pro (Zen)", context: 200000 },
      { id: "grok-4.6", name: "Grok 4.6 (Zen)", context: 131072 },
      { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash (Zen)", context: 1000000 },
      { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro (Zen)", context: 65536 }
    ],
    defaultModel: "nemotron-3.5-lightning-free",
    async send({ apiKey, baseUrl, model, system, messages, maxTokens = 2048, signal }) {
      const url = (baseUrl || this.baseUrl || "https://opencode.ai/zen/v1").replace(/\/+$/, "");
      const modelId = model || this.defaultModel;
      if (!modelId) {
        throw new AIError({
          type: "config",
          provider: "OpenCode Zen",
          userMessage: "OpenCode Zen: No active model selected or discovered from configured endpoint.",
        });
      }
      try {
        const isAnthropic = modelId.toLowerCase().startsWith("claude-");
        const endpoint = isAnthropic ? `${url}/messages` : `${url}/chat/completions`;

        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };
        if (apiKey) {
          headers["Authorization"] = `Bearer ${apiKey.trim()}`;
          if (isAnthropic) {
            headers["x-api-key"] = apiKey.trim();
            headers["anthropic-version"] = "2023-06-01";
          }
        }

        const body = isAnthropic
          ? JSON.stringify({
              model: modelId,
              max_tokens: maxTokens,
              ...(system ? { system } : {}),
              messages: messages.map(m => ({ role: m.role, content: m.content }))
            })
          : JSON.stringify({
              model: modelId,
              max_tokens: maxTokens,
              temperature: 0.4,
              messages: [
                ...(system ? [{ role: "system", content: system }] : []),
                ...messages
              ]
            });

        const res = await fetchWithTimeout(endpoint, {
          method: "POST",
          headers,
          body,
        }, signal);

        await checkResponse(res, "OpenCode Zen", modelId);
        const data = await res.json();
        if (isAnthropic) {
          return data.content?.[0]?.text || "";
        }
        const choice = data.choices?.[0];
        return choice?.message?.content || choice?.message?.reasoning || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("OpenCode Zen", modelId, err as Error);
      }
    },
    async *stream({ apiKey, baseUrl, model, system, messages, maxTokens = 2048, signal }) {
      const url = (baseUrl || this.baseUrl || "https://opencode.ai/zen/v1").replace(/\/+$/, "");
      const modelId = model || this.defaultModel;
      if (!modelId) {
        throw new AIError({
          type: "config",
          provider: "OpenCode Zen",
          userMessage: "OpenCode Zen: No active model selected or discovered from configured endpoint.",
        });
      }
      try {
        const isAnthropic = modelId.toLowerCase().startsWith("claude-");
        const endpoint = isAnthropic ? `${url}/messages` : `${url}/chat/completions`;

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Accept": "text/event-stream"
        };
        if (apiKey) {
          headers["Authorization"] = `Bearer ${apiKey.trim()}`;
          if (isAnthropic) {
            headers["x-api-key"] = apiKey.trim();
            headers["anthropic-version"] = "2023-06-01";
          }
        }

        const body = isAnthropic
          ? JSON.stringify({
              model: modelId,
              max_tokens: maxTokens,
              stream: true,
              ...(system ? { system } : {}),
              messages: messages.map(m => ({ role: m.role, content: m.content }))
            })
          : JSON.stringify({
              model: modelId,
              max_tokens: maxTokens,
              temperature: 0.4,
              stream: true,
              messages: [
                ...(system ? [{ role: "system", content: system }] : []),
                ...messages
              ]
            });

        const res = await fetchWithTimeout(endpoint, {
          method: "POST",
          headers,
          body,
        }, signal);

        await checkResponse(res, "OpenCode Zen", modelId);
        if (isAnthropic) {
          yield* streamEventsToText(parseAnthropicStream(res, signal));
        } else {
          yield* streamEventsToText(parseOpenAIStream(res, signal));
        }
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("OpenCode Zen", modelId, err as Error);
      }
    }
  },

  ollama: {
    id: "ollama",
    name: "Ollama",
    type: "local",
    requiresKey: false,
    baseUrl: "http://localhost:11434",
    keyPlaceholder: "",
    models: [
      { id: "llama3.3:latest", name: "Llama 3.3 70B (Local)", context: 131072 },
      { id: "deepseek-r1:latest", name: "DeepSeek R1 (Local)", context: 65536 },
      { id: "qwen2.5-coder:latest", name: "Qwen 2.5 Coder (Local)", context: 32768 },
      { id: "mistral:latest", name: "Mistral 7B (Local)", context: 32768 },
      { id: "phi4:latest", name: "Phi-4 (Local)", context: 16384 },
      { id: "gemma2:latest", name: "Gemma 2 (Local)", context: 8192 },
      { id: "codellama:latest", name: "CodeLlama (Local)", context: 16384 },
      { id: "starcoder2:latest", name: "StarCoder 2 (Local)", context: 16384 }
    ],
    defaultModel: "llama3.3:latest",
    async discoverModels(baseUrl) {
      try {
        const url = baseUrl || this.baseUrl;
        const res = await fetch(`${url}/api/tags`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.models || []).map((m: any) => ({
          id: m.name,
          name: m.name,
          context: 32768
        }));
      } catch {
        return [];
      }
    },
    async send({ baseUrl, model, system, messages, maxTokens = 2048, signal }) {
      const url = baseUrl || this.baseUrl;
      const modelId = model || this.defaultModel;
      if (!modelId) throw configError("Ollama");
      try {
        const res = await fetchWithTimeout(`${url}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelId,
            stream: false,
            options: { num_predict: maxTokens, temperature: 0.4 },
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        }, signal, 60000); // Ollama may need longer timeout for initial load
        await checkResponse(res, "Ollama", modelId);
        const data = await res.json();
        return data.message?.content || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("Ollama", modelId, err as Error);
      }
    },
    async *stream({ baseUrl, model, system, messages, maxTokens = 2048, signal }) {
      const url = baseUrl || this.baseUrl;
      const modelId = model || this.defaultModel;
      if (!modelId) throw configError("Ollama");
      try {
        const res = await fetchWithTimeout(`${url}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelId,
            stream: true,
            options: { num_predict: maxTokens, temperature: 0.4 },
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        }, signal, 60000);
        await checkResponse(res, "Ollama", modelId);
        yield* streamEventsToText(parseOllamaStream(res, signal));
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("Ollama", modelId, err as Error);
      }
    }
  },

  lmstudio: {
    id: "lmstudio",
    name: "LM Studio",
    type: "local",
    requiresKey: false,
    baseUrl: "http://localhost:1234/v1",
    keyPlaceholder: "",
    models: [
      { id: "local-model", name: "LM Studio Active Model", context: 32768 },
      { id: "llama-3.3-70b-instruct", name: "Llama 3.3 70B", context: 131072 },
      { id: "deepseek-r1-distill-qwen-32b", name: "DeepSeek R1 Qwen 32B", context: 65536 },
      { id: "qwen2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B", context: 32768 },
      { id: "mistral-small-instruct", name: "Mistral Small", context: 128000 },
      { id: "phi-4-instruct", name: "Phi-4 Instruct", context: 16384 },
      { id: "gemma-2-27b-it", name: "Gemma 2 27B", context: 8192 },
      { id: "hermes-3-llama-3.1-8b", name: "Hermes 3 8B", context: 131072 }
    ],
    defaultModel: "local-model",
    async discoverModels(baseUrl) {
      try {
        const url = baseUrl || this.baseUrl;
        const res = await fetch(`${url}/models`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.data || []).map((m: any) => ({
          id: m.id,
          name: m.id,
          context: 32768
        }));
      } catch {
        return [];
      }
    },
    async send({ baseUrl, apiKey, model, system, messages, maxTokens = 2048, signal }) {
      const url = baseUrl || this.baseUrl;
      const modelId = model || this.defaultModel;
      if (!modelId) throw configError("LM Studio");
      try {
        const res = await fetchWithTimeout(`${url}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {})
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        }, signal, 60000);
        await checkResponse(res, "LM Studio", modelId);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("LM Studio", modelId, err as Error);
      }
    },
    // NEW: LM Studio streaming
    async *stream({ baseUrl, apiKey, model, system, messages, maxTokens = 2048, signal }) {
      const url = baseUrl || this.baseUrl;
      const modelId = model || this.defaultModel;
      if (!modelId) throw configError("LM Studio");
      try {
        const res = await fetchWithTimeout(`${url}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {})
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            stream: true,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        }, signal, 60000);
        await checkResponse(res, "LM Studio", modelId);
        yield* streamEventsToText(parseOpenAIStream(res, signal));
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError("LM Studio", modelId, err as Error);
      }
    }
  }
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockResponse(reason = "local fallback") {
  return `**AI Draft** (offline)\n\nNoska AI is running in local mode. ${reason}.\n\n> Configure your preferred AI provider in **Settings → Noska AI** to unlock live responses.`;
}

/**
 * Get provider definition by ID (built-ins + user-registered custom ones)
 */
export function getProvider(id: string): AIProvider | null {
  return PROVIDERS[id] || customProviders.get(id) || null;
}

/**
 * Get all provider definitions
 */
export function getAllProviders(): AIProvider[] {
  return [...Object.values(PROVIDERS), ...customProviders.values()];
}

// ─── Custom Providers (#2: bring any OpenAI-compatible endpoint) ───────────

const customProviders = new Map<string, AIProvider>();

export interface CustomProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  models: Array<{ id: string; name?: string }>;
  defaultModel?: string;
}

/** Build an AIProvider around ANY OpenAI-compatible chat-completions endpoint */
export function createCustomProvider(cfg: CustomProviderConfig): AIProvider {
  const base = cfg.baseUrl.replace(/\/+$/, "");
  return {
    id: cfg.id,
    name: cfg.name,
    type: "custom",
    requiresKey: true,
    baseUrl: base,
    keyPlaceholder: "sk-… / API key",
    models: cfg.models.map((m) => ({ id: m.id, name: m.name || m.id, context: 128000 })),
    defaultModel: cfg.defaultModel || cfg.models[0]?.id || "",
    async send({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError(cfg.name);
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${base}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages,
            ],
          }),
        }, signal);
        await checkResponse(res, cfg.name, modelId);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError(cfg.name, modelId, err as Error);
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 2048, signal }) {
      if (!apiKey) throw configError(cfg.name);
      const modelId = model || this.defaultModel;
      try {
        const res = await fetchWithTimeout(`${base}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelId,
            max_tokens: maxTokens,
            temperature: 0.4,
            stream: true,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages,
            ],
          }),
        }, signal);
        await checkResponse(res, cfg.name, modelId);
        yield* streamEventsToText(parseOpenAIStream(res, signal));
      } catch (err: unknown) {
        if (err instanceof AIError) throw err;
        throw classifyNetworkError(cfg.name, modelId, err as Error);
      }
    },
  };
}

/** Register a custom provider for this session */
export function registerCustomProvider(cfg: CustomProviderConfig): void {
  if (!cfg?.id || !cfg.baseUrl) return;
  customProviders.set(cfg.id, createCustomProvider(cfg));
}

export function unregisterCustomProvider(id: string): void {
  customProviders.delete(id);
}

/**
 * Get provider list metadata (without send/stream functions) for UI display
 */
export function getProviderList() {
  return Object.values(PROVIDERS).map(p => ({
    id: p.id,
    name: p.name,
    type: p.type,
    requiresKey: p.requiresKey,
    keyPlaceholder: p.keyPlaceholder,
    models: p.models,
    defaultModel: p.defaultModel,
    hasStream: typeof p.stream === "function",
    hasDiscover: typeof p.discoverModels === "function"
  }));
}

/**
 * Test a provider connection by sending a minimal request
 */
export async function testProviderConnection(providerId: string, config: { apiKey?: string; baseUrl?: string; model?: string }) {
  const provider = PROVIDERS[providerId] || customProviders.get(providerId);
  if (!provider) return { ok: false, error: "Unknown provider" };
  try {
    const result = await provider.send({
      ...config,
      system: "Respond with exactly: OK",
      messages: [{ role: "user", content: "Ping" }],
      maxTokens: 10
    });
    const isOk = result && !result.includes("offline") && !result.includes("failed") && !result.includes("not configured");
    return { ok: isOk, response: result.slice(0, 100) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Connection test failed";
    return { ok: false, error: message };
  }
}

/** Legacy providers return error banners as strings — detect them so the
 * runtime never treats offline/error text as model output. */
function looksLikeMockFailure(text: string): boolean {
  return /\*\*AI Draft\*\* \(offline\)|is running in local mode|request failed/i.test(text || "");
}
function extractMockError(text: string): string {
  const m = (text || "").match(/Error:\s*([\s\S]{0,240})/);
  return m ? m[1].replace(/_/g, "").trim() : "provider returned an error";
}

export { PROVIDERS, mockResponse, looksLikeMockFailure, extractMockError };
