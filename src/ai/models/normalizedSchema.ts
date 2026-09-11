/**
 * Noska AI — Normalized Model Catalog Schema
 * 
 * Defines the unified internal model structure, database entities,
 * provider adapter interfaces, and synchronization contracts.
 */

export type ModelType =
  | "chat"
  | "completion"
  | "embedding"
  | "image"
  | "audio"
  | "moderation"
  | "reasoning"
  | "multimodal";

export type ModelStatus =
  | "active"
  | "preview"
  | "deprecated"
  | "unavailable"
  | "unknown";

export interface ModelCapabilities {
  textInput: boolean;
  imageInput: boolean;
  audioInput: boolean;
  videoInput: boolean;
  textOutput: boolean;
  imageOutput: boolean;
  audioOutput: boolean;
  videoOutput: boolean;
  reasoning: boolean;
  toolCalling: boolean;
  structuredOutput: boolean;
  streaming: boolean;
  embeddings: boolean;
}

export interface ModelPricing {
  prompt?: number;        // USD per 1M tokens or per token
  completion?: number;    // USD per 1M tokens or per token
  cachedPrompt?: number;
  unit?: "per_1m_tokens" | "per_1k_tokens" | "per_token" | "per_image" | "per_second";
  currency?: string;
}

/**
 * Normalized Model Structure across all providers
 */
export interface NormalizedModel {
  id: string;                         // Unique ID: `${provider}:${providerModelId}`
  provider: string;                   // e.g. "openai", "gemini", "anthropic"
  providerModelId: string;           // Provider-specific model ID: e.g. "gpt-4o", "gemini-2.0-flash"
  displayName: string;
  description?: string;
  type: ModelType;
  capabilities: ModelCapabilities;
  contextWindow: number;
  maxOutputTokens?: number;
  pricing?: ModelPricing;
  status: ModelStatus;
  aliases?: string[];
  providerMetadata?: Record<string, any>;
  lastSeenAt: string;                 // ISO-8601 string
  lastSyncedAt: string;               // ISO-8601 string
}

// ─── Database Entity Models ──────────────────────────────────────────────────

export interface AIConnection {
  id: string;
  userId?: string;
  provider: string;
  encryptedCredentials?: string;     // Server-side encrypted or secure local vault
  status: "active" | "invalid_credentials" | "rate_limited" | "error" | "unconfigured";
  lastValidatedAt?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIModelEntity {
  id: string;
  connectionId?: string;
  provider: string;
  providerModelId: string;
  displayName: string;
  description?: string;
  type: string;
  capabilitiesJson: string;          // Serialized ModelCapabilities
  contextWindow: number;
  maxOutputTokens?: number;
  pricingJson?: string;              // Serialized ModelPricing
  status: ModelStatus;
  lastSeenAt: string;
  lastSyncedAt: string;
  providerMetadataJson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIModelSyncRun {
  id: string;
  connectionId?: string;
  provider: string;
  startedAt: string;
  completedAt?: string;
  status: "success" | "failed" | "running";
  modelsFound: number;
  modelsAdded: number;
  modelsUpdated: number;
  modelsUnavailable: number;
  error?: string;
  durationMs?: number;
}

// ─── Sync Contracts ──────────────────────────────────────────────────────────

export interface SyncResult {
  success: boolean;
  provider: string;
  connectionId?: string;
  modelsFound: number;
  modelsAdded: number;
  modelsUpdated: number;
  modelsUnavailable: number;
  syncedAt: string;
  durationMs: number;
  error?: string;
  models: NormalizedModel[];
  isCachedFallback?: boolean;
}

export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
  headers?: Record<string, string>;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: Record<string, any>;
}

export interface ProviderAdapter {
  provider: string;
  displayName: string;
  defaultBaseUrl: string;
  validateConnection(credentials: ProviderCredentials, signal?: AbortSignal): Promise<ValidationResult>;
  listModels(credentials: ProviderCredentials, signal?: AbortSignal): Promise<NormalizedModel[]>;
  normalizeModel(raw: any): NormalizedModel | null;
  testModel?(credentials: ProviderCredentials, modelId: string, signal?: AbortSignal): Promise<boolean>;
}
