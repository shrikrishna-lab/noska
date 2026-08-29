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
  capabilities?: Partial<ModelCapabilities>;
  reasoningModes?: string[];
  status?: ModelLifecycleStatus;
  family?: string;
}

export const KNOWN_MODEL_OVERRIDES: Record<string, ModelOverride> = {
  // ─── OpenAI ──────────────────────────────────────────────────────────────
  "gpt-4o": {
    displayName: "GPT-4o (Omni)",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gpt-4"
  },
  "gpt-4o-mini": {
    displayName: "GPT-4o Mini",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gpt-4"
  },
  "o1": {
    displayName: "OpenAI o1 (Thinking)",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    reasoningModes: ["low", "medium", "high"],
    family: "o1"
  },
  "o3-mini": {
    displayName: "OpenAI o3-mini",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: false, structuredOutput: true, mcp: true, agentMode: true },
    reasoningModes: ["low", "medium", "high"],
    family: "o3"
  },
  "gpt-4-turbo": {
    displayName: "GPT-4 Turbo",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gpt-4"
  },

  // ─── Anthropic ───────────────────────────────────────────────────────────
  "claude-3-7-sonnet-20250219": {
    displayName: "Claude 3.7 Sonnet (Hybrid Thinking)",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    reasoningModes: ["low", "medium", "high"],
    family: "claude-3.7"
  },
  "claude-3-5-sonnet-20241022": {
    displayName: "Claude 3.5 Sonnet",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "claude-3.5"
  },
  "claude-3-5-haiku-20241022": {
    displayName: "Claude 3.5 Haiku",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "claude-3.5"
  },
  "claude-3-opus-20240229": {
    displayName: "Claude 3 Opus",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    capabilities: { streaming: true, reasoning: false, tools: true, vision: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "claude-3"
  },

  // ─── Google Gemini ───────────────────────────────────────────────────────
  "gemini-2.5-flash": {
    displayName: "Gemini 2.5 Flash",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true, structuredOutput: true, mcp: true, agentMode: true },
    family: "gemini-2.5"
  },
  "gemini-2.5-pro": {
    displayName: "Gemini 2.5 Pro",
    contextWindow: 2097152,
    maxOutputTokens: 65536,
    capabilities: { streaming: true, reasoning: true, tools: true, vision: true, audio: true, video: true, structuredOutput: true, mcp: true, agentMode: true },
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
