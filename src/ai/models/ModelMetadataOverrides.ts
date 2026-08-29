/**
 * Noska AI — Model Metadata Overrides & Capability Enrichment
 * 
 * A lightweight override layer for known capability corrections, display name refinements,
 * and context window defaults when provider APIs omit them.
 * 
 * NOTE: This is NOT a static model list. Models are discovered dynamically from providers;
 * this file only supplies enrichment for known model families.
 */

import type { ModelCapabilities, ModelLifecycleStatus } from './types';

export interface ModelOverride {
  displayName?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  knowledgeCutoff?: string;
  capabilities?: Partial<ModelCapabilities>;
  reasoningModes?: string[];
  pricing?: {
    inputPer1M?: number;
    cachedInputPer1M?: number;
    outputPer1M?: number;
    currency?: string;
  };
  aliases?: string[];
  status?: ModelLifecycleStatus;
  family?: string;
}

export const KNOWN_MODEL_OVERRIDES: Record<string, ModelOverride> = {
  // ─── OpenAI ──────────────────────────────────────────────────────────────
  "gpt-5.6-sol": {
    displayName: "GPT-5.6 Sol (Flagship Reasoning)",
    contextWindow: 1050000,
    maxOutputTokens: 128000,
    knowledgeCutoff: "2025-12",
    reasoningModes: ["none", "low", "medium", "high", "xhigh", "max"],
    capabilities: {
      streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true,
      imageGeneration: false, structuredOutput: true, webSearch: true, fileSearch: true,
      codeExecution: true, computerUse: true, mcp: true, agentMode: true
    },
    pricing: { inputPer1M: 4.00, cachedInputPer1M: 0.40, outputPer1M: 20.00, currency: "USD" },
    aliases: ["gpt-5.6"],
    family: "gpt-5.6"
  },
  "gpt-5.6-terra": {
    displayName: "GPT-5.6 Terra (Balanced Agent)",
    contextWindow: 1050000,
    maxOutputTokens: 128000,
    knowledgeCutoff: "2025-12",
    reasoningModes: ["none", "low", "medium", "high", "xhigh", "max"],
    capabilities: {
      streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true,
      imageGeneration: false, structuredOutput: true, webSearch: true, fileSearch: true,
      codeExecution: true, computerUse: true, mcp: true, agentMode: true
    },
    pricing: { inputPer1M: 2.00, cachedInputPer1M: 0.20, outputPer1M: 12.00, currency: "USD" },
    family: "gpt-5.6"
  },
  "gpt-5.6-luna": {
    displayName: "GPT-5.6 Luna (Fast Efficient)",
    contextWindow: 1050000,
    maxOutputTokens: 128000,
    knowledgeCutoff: "2025-12",
    reasoningModes: ["none", "low", "medium", "high", "xhigh", "max"],
    capabilities: {
      streaming: true, reasoning: true, tools: true, vision: true, audio: false, video: false,
      imageGeneration: false, structuredOutput: true, webSearch: true, fileSearch: true,
      codeExecution: true, computerUse: false, mcp: true, agentMode: true
    },
    pricing: { inputPer1M: 0.20, cachedInputPer1M: 0.02, outputPer1M: 1.20, currency: "USD" },
    family: "gpt-5.6"
  },
  "gpt-5.5": {
    displayName: "GPT-5.5",
    contextWindow: 512000,
    maxOutputTokens: 65536,
    reasoningModes: ["none", "low", "medium", "high"],
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true, structuredOutput: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 5.00, cachedInputPer1M: 1.25, outputPer1M: 20.00, currency: "USD" },
    family: "gpt-5.5"
  },
  "gpt-5.4": {
    displayName: "GPT-5.4",
    contextWindow: 256000,
    maxOutputTokens: 32768,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 3.00, cachedInputPer1M: 0.75, outputPer1M: 15.00, currency: "USD" },
    family: "gpt-5"
  },
  "gpt-5.3-codex": {
    displayName: "GPT-5.3 Codex (Specialized Engineering)",
    contextWindow: 256000,
    maxOutputTokens: 65536,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, structuredOutput: true, codeExecution: true, mcp: true, agentMode: true },
    reasoningModes: ["low", "medium", "high"],
    family: "gpt-5"
  },
  "gpt-5": {
    displayName: "GPT-5",
    contextWindow: 256000,
    maxOutputTokens: 32768,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gpt-5"
  },
  "o3": {
    displayName: "OpenAI o3",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    reasoningModes: ["low", "medium", "high"],
    family: "o3"
  },
  "o3-mini": {
    displayName: "OpenAI o3-mini",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: false, structuredOutput: true, mcp: true, agentMode: true },
    reasoningModes: ["low", "medium", "high"],
    pricing: { inputPer1M: 1.10, cachedInputPer1M: 0.55, outputPer1M: 4.40, currency: "USD" },
    family: "o3"
  },
  "o1": {
    displayName: "OpenAI o1 (Thinking)",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    reasoningModes: ["low", "medium", "high"],
    pricing: { inputPer1M: 15.00, cachedInputPer1M: 7.50, outputPer1M: 60.00, currency: "USD" },
    family: "o1"
  },
  "o1-mini": {
    displayName: "OpenAI o1-mini",
    contextWindow: 128000,
    maxOutputTokens: 65536,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: false, structuredOutput: true, mcp: true, agentMode: true },
    reasoningModes: ["low", "medium", "high"],
    pricing: { inputPer1M: 1.10, cachedInputPer1M: 0.55, outputPer1M: 4.40, currency: "USD" },
    family: "o1"
  },
  "gpt-4o": {
    displayName: "GPT-4o (Omni)",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 2.50, cachedInputPer1M: 1.25, outputPer1M: 10.00, currency: "USD" },
    family: "gpt-4"
  },
  "gpt-4o-mini": {
    displayName: "GPT-4o Mini",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 0.15, cachedInputPer1M: 0.075, outputPer1M: 0.60, currency: "USD" },
    family: "gpt-4"
  },
  "chatgpt-4o-latest": {
    displayName: "ChatGPT 4o Latest",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 5.00, cachedInputPer1M: 2.50, outputPer1M: 15.00, currency: "USD" },
    family: "gpt-4"
  },
  "gpt-4-turbo": {
    displayName: "GPT-4 Turbo",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gpt-4"
  },

  // ─── Anthropic ───────────────────────────────────────────────────────────
  "claude-opus-5": {
    displayName: "Claude Opus 5 (Deep Reasoning & Autonomous Agents)",
    contextWindow: 1000000,
    maxOutputTokens: 128000,
    capabilities: {
      streaming: true, reasoning: true, tools: true, vision: true, audio: false, video: false,
      imageGeneration: false, structuredOutput: true, webSearch: true, fileSearch: true,
      codeExecution: true, computerUse: true, mcp: true, agentMode: true
    },
    reasoningModes: ["adaptive", "low", "medium", "high", "max"],
    pricing: { inputPer1M: 15.00, cachedInputPer1M: 1.50, outputPer1M: 75.00, currency: "USD" },
    family: "claude-5"
  },
  "claude-sonnet-5": {
    displayName: "Claude Sonnet 5 (High-Speed Reasoning)",
    contextWindow: 1000000,
    maxOutputTokens: 128000,
    capabilities: {
      streaming: true, reasoning: true, tools: true, vision: true, audio: false, video: false,
      imageGeneration: false, structuredOutput: true, webSearch: true, fileSearch: true,
      codeExecution: true, computerUse: true, mcp: true, agentMode: true
    },
    reasoningModes: ["adaptive", "low", "medium", "high"],
    pricing: { inputPer1M: 3.00, cachedInputPer1M: 0.30, outputPer1M: 15.00, currency: "USD" },
    family: "claude-5"
  },
  "claude-fable-5": {
    displayName: "Claude Fable 5 (Creative & Complex Synthesis)",
    contextWindow: 1000000,
    maxOutputTokens: 128000,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "claude-5"
  },
  "claude-mythos-5": {
    displayName: "Claude Mythos 5 (Autonomous Research)",
    contextWindow: 1000000,
    maxOutputTokens: 128000,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, structuredOutput: true, computerUse: true, mcp: true, agentMode: true },
    family: "claude-5"
  },
  "claude-haiku-4-5": {
    displayName: "Claude Haiku 4.5",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 0.80, cachedInputPer1M: 0.08, outputPer1M: 4.00, currency: "USD" },
    family: "claude-4.5"
  },
  "claude-3-7-sonnet-latest": {
    displayName: "Claude 3.7 Sonnet (Hybrid Thinking)",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, structuredOutput: true, computerUse: true, mcp: true, agentMode: true },
    reasoningModes: ["low", "medium", "high"],
    pricing: { inputPer1M: 3.00, cachedInputPer1M: 0.30, outputPer1M: 15.00, currency: "USD" },
    family: "claude-3.7"
  },
  "claude-3-7-sonnet-20250219": {
    displayName: "Claude 3.7 Sonnet (Hybrid Thinking)",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, structuredOutput: true, computerUse: true, mcp: true, agentMode: true },
    reasoningModes: ["low", "medium", "high"],
    pricing: { inputPer1M: 3.00, cachedInputPer1M: 0.30, outputPer1M: 15.00, currency: "USD" },
    family: "claude-3.7"
  },
  "claude-3-5-sonnet-latest": {
    displayName: "Claude 3.5 Sonnet",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, computerUse: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 3.00, cachedInputPer1M: 0.30, outputPer1M: 15.00, currency: "USD" },
    family: "claude-3.5"
  },
  "claude-3-5-sonnet-20241022": {
    displayName: "Claude 3.5 Sonnet",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, computerUse: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 3.00, cachedInputPer1M: 0.30, outputPer1M: 15.00, currency: "USD" },
    family: "claude-3.5"
  },
  "claude-3-5-haiku-latest": {
    displayName: "Claude 3.5 Haiku",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 0.80, cachedInputPer1M: 0.08, outputPer1M: 4.00, currency: "USD" },
    family: "claude-3.5"
  },
  "claude-3-5-haiku-20241022": {
    displayName: "Claude 3.5 Haiku",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 0.80, cachedInputPer1M: 0.08, outputPer1M: 4.00, currency: "USD" },
    family: "claude-3.5"
  },
  "claude-3-opus-latest": {
    displayName: "Claude 3 Opus",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 15.00, cachedInputPer1M: 1.50, outputPer1M: 75.00, currency: "USD" },
    family: "claude-3"
  },
  "claude-3-opus-20240229": {
    displayName: "Claude 3 Opus",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 15.00, cachedInputPer1M: 1.50, outputPer1M: 75.00, currency: "USD" },
    family: "claude-3"
  },

  // ─── Google Gemini ───────────────────────────────────────────────────────
  "gemini-3.7-flash": {
    displayName: "Gemini 3.7 Flash (Hybrid Thinking)",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    reasoningModes: ["low", "medium", "high"],
    capabilities: {
      streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true,
      imageGeneration: false, structuredOutput: true, webSearch: true, fileSearch: true,
      codeExecution: true, computerUse: true, mcp: true, agentMode: true
    },
    pricing: { inputPer1M: 0.10, cachedInputPer1M: 0.025, outputPer1M: 0.40, currency: "USD" },
    family: "gemini-3.7"
  },
  "gemini-3.6-flash": {
    displayName: "Gemini 3.6 Flash",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    reasoningModes: ["low", "medium", "high"],
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gemini-3.6"
  },
  "gemini-3.5-flash": {
    displayName: "Gemini 3.5 Flash",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    reasoningModes: ["low", "medium", "high"],
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gemini-3.5"
  },
  "gemini-3.5-flash-lite": {
    displayName: "Gemini 3.5 Flash Lite",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gemini-3.5"
  },
  "gemini-3.1-pro-preview": {
    displayName: "Gemini 3.1 Pro (Preview)",
    contextWindow: 2097152,
    maxOutputTokens: 65536,
    reasoningModes: ["low", "medium", "high"],
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true, structuredOutput: true, codeExecution: true, mcp: true, agentMode: true },
    family: "gemini-3.1"
  },
  "gemini-3-flash-preview": {
    displayName: "Gemini 3 Flash (Preview)",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gemini-3"
  },
  "gemini-2.5-flash": {
    displayName: "Gemini 2.5 Flash",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true, structuredOutput: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 0.075, cachedInputPer1M: 0.01875, outputPer1M: 0.30, currency: "USD" },
    family: "gemini-2.5"
  },
  "gemini-2.5-pro": {
    displayName: "Gemini 2.5 Pro",
    contextWindow: 2097152,
    maxOutputTokens: 65536,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true, structuredOutput: true, mcp: true, agentMode: true },
    pricing: { inputPer1M: 1.25, cachedInputPer1M: 0.3125, outputPer1M: 5.00, currency: "USD" },
    family: "gemini-2.5"
  },
  "gemini-2.0-flash": {
    displayName: "Gemini 2.0 Flash",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gemini-2.0"
  },
  "gemini-2.0-flash-lite": {
    displayName: "Gemini 2.0 Flash Lite",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gemini-2.0"
  },
  "gemini-2.0-pro-exp-02-05": {
    displayName: "Gemini 2.0 Pro (Experimental)",
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gemini-2.0"
  },
  "gemini-2.0-flash-thinking-exp-01-21": {
    displayName: "Gemini 2.0 Flash Thinking",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true, structuredOutput: true, mcp: true, agentMode: true },
    reasoningModes: ["high"],
    family: "gemini-2.0"
  },
  "gemini-1.5-pro": {
    displayName: "Gemini 1.5 Pro",
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, audio: true, video: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gemini-1.5"
  },
  "gemini-1.5-flash": {
    displayName: "Gemini 1.5 Flash",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, audio: true, video: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gemini-1.5"
  },

  // ─── DeepSeek ────────────────────────────────────────────────────────────
  "deepseek-chat": {
    displayName: "DeepSeek V3",
    contextWindow: 65536,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: false, structuredOutput: true, mcp: true, agentMode: true },
    family: "deepseek-v3"
  },
  "deepseek-reasoner": {
    displayName: "DeepSeek R1 (Thinking)",
    contextWindow: 65536,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: true, tools: false, vision: false, structuredOutput: true, mcp: true, agentMode: true },
    reasoningModes: ["high"],
    family: "deepseek-r1"
  },

  // ─── Groq ────────────────────────────────────────────────────────────────
  "llama-3.3-70b-versatile": {
    displayName: "Llama 3.3 70B Versatile",
    contextWindow: 128000,
    maxOutputTokens: 32768,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: false, structuredOutput: true, mcp: true, agentMode: true },
    family: "llama-3.3"
  },
  "llama-3.1-8b-instant": {
    displayName: "Llama 3.1 8B Instant",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: false, structuredOutput: true, mcp: true, agentMode: true },
    family: "llama-3.1"
  },
  "deepseek-r1-distill-llama-70b": {
    displayName: "DeepSeek R1 70B (Groq)",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: true, tools: false, vision: false, structuredOutput: true, mcp: true, agentMode: true },
    family: "deepseek-r1"
  },

  // ─── Known Discontinued / Deprecated Models ──────────────────────────────
  "gemma2-9b-it": { status: "shutdown" },
  "gpt-3.5-turbo-0613": { status: "shutdown" },
  "gpt-3.5-turbo-0301": { status: "shutdown" },
  "gpt-4-0314": { status: "shutdown" },
  "claude-2.0": { status: "shutdown" },
  "claude-2.1": { status: "shutdown" },
  "claude-instant-1.2": { status: "shutdown" },
  "google/gemini-1.0-pro": { status: "shutdown" },
  "meta-llama/llama-2-70b-chat": { status: "shutdown" },
};

/**
 * Infer default capabilities from model name/ID patterns if not explicitly provided by provider
 */
export function inferModelCapabilities(modelId: string): ModelCapabilities {
  const lower = modelId.toLowerCase();

  const isReasoning =
    lower.includes("reason") ||
    lower.includes("thinking") ||
    lower.includes("r1") ||
    lower.includes("o1") ||
    lower.includes("o3") ||
    lower.includes("o4") ||
    lower.includes("hybrid");

  const isVision =
    lower.includes("vision") ||
    lower.includes("vl") ||
    lower.includes("multimodal") ||
    lower.includes("omni") ||
    lower.includes("4o") ||
    lower.includes("gemini");

  return {
    streaming: true,
    reasoning: isReasoning,
    tools: true,
    vision: isVision,
    audio: lower.includes("audio") || lower.includes("omni"),
    video: lower.includes("video"),
    imageGeneration: false,
    structuredOutput: true,
    mcp: true,
    agentMode: true,
  };
}

/**
 * Clean up raw API model IDs into human-readable display names
 */
export function formatDefaultDisplayName(apiModelId: string): string {
  // Strip provider prefix if present
  let clean = apiModelId.replace(/^[^/]+\//, "");
  // Replace underscores and dashes with spaces
  clean = clean
    .replace(/[-_]/g, " ")
    .replace(/\b(\w)/g, (c) => c.toUpperCase())
    .replace(/\b(Gpt|Ai|Api|Nim|Lm|Sse|Ndjson)\b/gi, (m) => m.toUpperCase());

  return clean;
}
