/**
 * Noska AI — Provider Adapter Registry
 */

import type { ProviderAdapter } from "../normalizedSchema";
import { OpenAIAdapter } from "./OpenAIAdapter";
import { GeminiAdapter } from "./GeminiAdapter";
import { AnthropicAdapter } from "./AnthropicAdapter";
import { GroqAdapter } from "./GroqAdapter";
import { MistralAdapter } from "./MistralAdapter";
import { XAIAdapter } from "./XAIAdapter";
import { CohereAdapter } from "./CohereAdapter";
import { TogetherAdapter } from "./TogetherAdapter";
import { DeepSeekAdapter } from "./DeepSeekAdapter";
import { NvidiaAdapter } from "./NvidiaAdapter";
import { OpenRouterAdapter } from "./OpenRouterAdapter";
import { OllamaAdapter } from "./OllamaAdapter";
import { LMStudioAdapter } from "./LMStudioAdapter";
import { OpenCodeZenAdapter } from "./OpenCodeZenAdapter";

const ADAPTERS: Record<string, ProviderAdapter> = {
  openai: new OpenAIAdapter(),
  gemini: new GeminiAdapter(),
  anthropic: new AnthropicAdapter(),
  groq: new GroqAdapter(),
  mistral: new MistralAdapter(),
  xai: new XAIAdapter(),
  cohere: new CohereAdapter(),
  together: new TogetherAdapter(),
  deepseek: new DeepSeekAdapter(),
  nvidia: new NvidiaAdapter(),
  openrouter: new OpenRouterAdapter(),
  ollama: new OllamaAdapter(),
  lmstudio: new LMStudioAdapter(),
  opencode_zen: new OpenCodeZenAdapter(),
  opencode: new OpenCodeZenAdapter(),
};

export function getProviderAdapter(provider: string): ProviderAdapter | null {
  const normalized = (provider || "").toLowerCase().trim();
  return ADAPTERS[normalized] || null;
}

export function getAllAdapters(): ProviderAdapter[] {
  return Object.values(ADAPTERS);
}

export {
  OpenAIAdapter,
  GeminiAdapter,
  AnthropicAdapter,
  GroqAdapter,
  MistralAdapter,
  XAIAdapter,
  CohereAdapter,
  TogetherAdapter,
  DeepSeekAdapter,
  NvidiaAdapter,
  OpenRouterAdapter,
  OllamaAdapter,
  LMStudioAdapter,
  OpenCodeZenAdapter,
};
