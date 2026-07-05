/**
 * Noska AI V4 — Provider Registry
 * 
 * Unified provider interface for cloud and local AI providers.
 * Each provider implements: send(), and optionally stream().
 * All providers gracefully handle missing keys by returning mock responses.
 */

// ─── Types ──────────────────────────────────────────────────────────────────
// Inferred from the provider object literals below — every provider here
// implements send() and most implement stream(); only the local providers
// (ollama, lmstudio) implement discoverModels(), so it's optional.

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
  discoverModels?(baseUrl?: string): Promise<AIModel[]>;
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
      { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4", context: 200000 },
      { id: "google/gemini-2.5-flash-preview", name: "Gemini 2.5 Flash", context: 1000000 },
      { id: "openai/gpt-4o", name: "GPT-4o", context: 128000 },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", context: 131072 },
      { id: "deepseek/deepseek-r1", name: "DeepSeek R1", context: 65536 }
    ],
    defaultModel: "anthropic/claude-sonnet-4-20250514",
    async send({ apiKey, model, system, messages, maxTokens = 2048 }) {
      if (!apiKey) return mockResponse("OpenRouter key not configured");
      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "Noska"
          },
          body: JSON.stringify({
            model: model || this.defaultModel,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err) {
        return `${mockResponse("OpenRouter request failed")}\n\n_Error: ${err.message}_`;
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 2048 }) {
      if (!apiKey) { yield mockResponse("OpenRouter key not configured"); return; }
      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "Noska"
          },
          body: JSON.stringify({
            model: model || this.defaultModel,
            max_tokens: maxTokens,
            temperature: 0.4,
            stream: true,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        });
        if (!res.ok) throw new Error(await res.text());
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) yield delta;
              } catch { /* skip malformed chunks */ }
            }
          }
        }
      } catch (err) {
        yield `\n\n_Streaming error: ${err.message}_`;
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
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", context: 1000000 },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", context: 1000000 },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context: 1000000 }
    ],
    defaultModel: "gemini-2.5-flash",
    async send({ apiKey, model, system, messages, maxTokens = 2048 }) {
      if (!apiKey) return mockResponse("Gemini key not configured");
      const modelId = model || this.defaultModel;
      try {
        const contents = messages.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }));
        const body: {
          contents: typeof contents;
          generationConfig: { maxOutputTokens: number; temperature: number };
          systemInstruction?: { parts: { text: string }[] };
        } = {
          contents,
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 }
        };
        if (system) {
          body.systemInstruction = { parts: [{ text: system }] };
        }
        const res = await fetch(
          `${this.baseUrl}/models/${modelId}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
      } catch (err) {
        return `${mockResponse("Gemini request failed")}\n\n_Error: ${err.message}_`;
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
      { id: "gpt-4o", name: "GPT-4o", context: 128000 },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", context: 128000 },
      { id: "o3", name: "o3", context: 200000 },
      { id: "o4-mini", name: "o4 Mini", context: 200000 }
    ],
    defaultModel: "gpt-4o",
    async send({ apiKey, model, system, messages, maxTokens = 2048 }) {
      if (!apiKey) return mockResponse("OpenAI key not configured");
      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || this.defaultModel,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err) {
        return `${mockResponse("OpenAI request failed")}\n\n_Error: ${err.message}_`;
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 2048 }) {
      if (!apiKey) { yield mockResponse("OpenAI key not configured"); return; }
      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || this.defaultModel,
            max_tokens: maxTokens,
            temperature: 0.4,
            stream: true,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        });
        if (!res.ok) throw new Error(await res.text());
        yield* parseSSEStream(res);
      } catch (err) {
        yield `\n\n_Streaming error: ${err.message}_`;
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
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", context: 200000 },
      { id: "claude-haiku-3-20250307", name: "Claude Haiku 3.5", context: 200000 }
    ],
    defaultModel: "claude-sonnet-4-20250514",
    async send({ apiKey, model, system, messages, maxTokens = 2048 }) {
      if (!apiKey) return mockResponse("Anthropic key not configured");
      try {
        const res = await fetch(`${this.baseUrl}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model: model || this.defaultModel,
            max_tokens: maxTokens,
            stream: false,
            ...(system ? { system } : {}),
            messages
          })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return data.content?.map(c => c.text).join("\n") || "";
      } catch (err) {
        return `${mockResponse("Anthropic request failed")}\n\n_Error: ${err.message}_`;
      }
    },
    async *stream({ apiKey, model, system, messages, maxTokens = 2048 }) {
      if (!apiKey) { yield mockResponse("Anthropic key not configured"); return; }
      try {
        const res = await fetch(`${this.baseUrl}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model: model || this.defaultModel,
            max_tokens: maxTokens,
            stream: true,
            ...(system ? { system } : {}),
            messages
          })
        });
        if (!res.ok) throw new Error(await res.text());
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            try {
              const json = JSON.parse(trimmed.slice(6));
              if (json.type === "content_block_delta" && json.delta?.text) {
                yield json.delta.text;
              }
            } catch { /* skip */ }
          }
        }
      } catch (err) {
        yield `\n\n_Streaming error: ${err.message}_`;
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
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", context: 131072 },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", context: 32768 },
      { id: "gemma2-9b-it", name: "Gemma 2 9B", context: 8192 }
    ],
    defaultModel: "llama-3.3-70b-versatile",
    async send({ apiKey, model, system, messages, maxTokens = 2048 }) {
      if (!apiKey) return mockResponse("Groq key not configured");
      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || this.defaultModel,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err) {
        return `${mockResponse("Groq request failed")}\n\n_Error: ${err.message}_`;
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
      { id: "nvidia/llama-3.1-nemotron-70b-instruct", name: "Nemotron 70B", context: 32768 }
    ],
    defaultModel: "nvidia/llama-3.1-nemotron-70b-instruct",
    async send({ apiKey, model, system, messages, maxTokens = 1000 }) {
      if (!apiKey) return mockResponse("NVIDIA key not configured");
      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model || this.defaultModel,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err) {
        return `${mockResponse("NVIDIA request failed")}\n\n_Error: ${err.message}_`;
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
    models: [],
    defaultModel: "",
    async discoverModels(baseUrl) {
      try {
        const url = baseUrl || this.baseUrl;
        const res = await fetch(`${url}/api/tags`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.models || []).map(m => ({
          id: m.name,
          name: m.name,
          context: 8192
        }));
      } catch {
        return [];
      }
    },
    async send({ baseUrl, model, system, messages, maxTokens = 2048 }) {
      const url = baseUrl || this.baseUrl;
      if (!model) return mockResponse("No Ollama model selected");
      try {
        const res = await fetch(`${url}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            options: { num_predict: maxTokens, temperature: 0.4 },
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return data.message?.content || "";
      } catch (err) {
        return `${mockResponse("Ollama request failed")}\n\n_Error: ${err.message}. Make sure Ollama is running._`;
      }
    },
    async *stream({ baseUrl, model, system, messages, maxTokens = 2048 }) {
      const url = baseUrl || this.baseUrl;
      if (!model) { yield mockResponse("No Ollama model selected"); return; }
      try {
        const res = await fetch(`${url}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            stream: true,
            options: { num_predict: maxTokens, temperature: 0.4 },
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        });
        if (!res.ok) throw new Error(await res.text());
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json = JSON.parse(line);
              if (json.message?.content) yield json.message.content;
            } catch { /* skip */ }
          }
        }
      } catch (err) {
        yield `\n\n_Streaming error: ${err.message}_`;
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
    models: [],
    defaultModel: "",
    async discoverModels(baseUrl) {
      try {
        const url = baseUrl || this.baseUrl;
        const res = await fetch(`${url}/models`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.data || []).map(m => ({
          id: m.id,
          name: m.id,
          context: 8192
        }));
      } catch {
        return [];
      }
    },
    async send({ baseUrl, apiKey, model, system, messages, maxTokens = 2048 }) {
      const url = baseUrl || this.baseUrl;
      if (!model) return mockResponse("No LM Studio model selected");
      try {
        const res = await fetch(`${url}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {})
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages
            ]
          })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (err) {
        return `${mockResponse("LM Studio request failed")}\n\n_Error: ${err.message}. Make sure LM Studio server is running._`;
      }
    }
  }
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockResponse(reason = "local fallback") {
  return `**AI Draft** (offline)\n\nNoska AI is running in local mode. ${reason}.\n\n> Configure your preferred AI provider in **Settings → Noska AI** to unlock live responses.`;
}

async function* parseSSEStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (trimmed.startsWith("data: ")) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch { /* skip malformed chunks */ }
      }
    }
  }
}

/**
 * Get provider definition by ID
 */
export function getProvider(id) {
  return PROVIDERS[id] || null;
}

/**
 * Get all provider definitions
 */
export function getAllProviders() {
  return Object.values(PROVIDERS);
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
export async function testProviderConnection(providerId, config) {
  const provider = PROVIDERS[providerId];
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
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export { PROVIDERS, mockResponse };
