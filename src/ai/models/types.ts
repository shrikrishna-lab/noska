/**
 * Noska AI — Dynamic Model Catalog Types
 * 
 * Unified model schema and discovery contracts across all 12 supported providers.
 */

export type ProviderId =
  | "openrouter"
  | "gemini"
  | "openai"
  | "anthropic"
  | "groq"
  | "deepseek"
  | "mistral"
  | "together"
  | "xai"
  | "nvidia"
  | "opencode_zen"
  | "ollama"
  | "lmstudio";

export interface ModelCapabilities {
  streaming: boolean;
  reasoning: boolean;
  tools: boolean;
  vision: boolean;
  audio: boolean;
  video: boolean;
  imageGeneration: boolean;
  structuredOutput: boolean;
  mcp: boolean;
  agentMode: boolean;
}

export type FreeTierStatus = "free" | "free_limited" | "paid" | "unknown" | "local";

export type ModelWireProtocol = "openai_chat" | "anthropic_messages" | "responses" | "gemini";

export interface FreeAccessInfo {
  isFree: boolean;
  status: FreeTierStatus;
  source: "provider" | "catalog" | "zen_catalog" | "override" | "unknown" | "local";
  verifiedAt?: string;
  conditions?: string[];
}

export interface ModelPricing {
  inputPer1M?: number;
  outputPer1M?: number;
  cachedInputPer1M?: number;
  cachedOutputPer1M?: number;
  currency?: string;
}

export type ModelLifecycleStatus =
  | "available"
  | "preview"
  | "deprecated"
  | "shutdown"
  | "unknown";

export type ModelSource =
  | "live"
  | "local"
  | "cached"
  | "static_verified"
  | "unavailable"
  | "override";

export interface LocalModelRuntimeState {
  available: boolean; // Present on local disk / runtime
  loaded: boolean;    // Currently loaded in RAM / VRAM
  ready: boolean;     // Ready for immediate inference
}

export interface NoskaModel {
  /** Unique composite ID: e.g. "openrouter/anthropic/claude-3.7-sonnet" or "openai/gpt-4o" */
  id: string;
  provider: ProviderId;
  displayName: string;
  apiModelId: string;

  family?: string;
  version?: string;

  contextWindow?: number;
  maxOutputTokens?: number;

  capabilities: ModelCapabilities;
  reasoningModes?: string[];

  pricing?: ModelPricing;
  freeAccess?: FreeAccessInfo;
  protocol?: ModelWireProtocol;
  endpoint?: string;

  status: ModelLifecycleStatus;
  source: ModelSource;
  localState?: LocalModelRuntimeState;

  createdAt?: string;
  lastVerifiedAt?: string;

  description?: string;
  enabled: boolean;
  score?: number;
}

export interface DiscoveredModel {
  apiModelId: string;
  displayName?: string;
  family?: string;
  version?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  capabilities?: Partial<ModelCapabilities>;
  reasoningModes?: string[];
  pricing?: ModelPricing;
  freeAccess?: FreeAccessInfo;
  protocol?: ModelWireProtocol;
  endpoint?: string;
  status?: ModelLifecycleStatus;
  localState?: LocalModelRuntimeState;
  createdAt?: string | number;
  description?: string;
  raw?: unknown;
}

export interface ProviderDiscoveryConfig {
  apiKey?: string;
  baseUrl?: string;
  signal?: AbortSignal;
}

export interface ModelDiscoveryAdapter {
  provider: ProviderId;
  listModels(config?: ProviderDiscoveryConfig): Promise<DiscoveredModel[]>;
  normalizeModel(raw: unknown): DiscoveredModel | null;
}

export interface ProviderDiscoveryResult {
  provider: ProviderId;
  models: NoskaModel[];
  fetchedCount: number;
  filteredCount: number;
  displayedCount: number;
  newestModel?: string;
  source: ModelSource;
  discoveryMode: "live" | "local" | "cached" | "static_verified" | "unavailable";
  lastVerifiedAt: string;
  status: "online" | "offline" | "unconfigured" | "error";
  error?: string;
}

export interface ModelFilterOptions {
  excludeDeprecated?: boolean;
  requireChatCapability?: boolean;
  maxModels?: number;
}
