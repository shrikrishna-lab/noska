/**
 * Noska Intelligence — Provider/Model Selection
 *
 * Model ids are NOT unique across providers ("gpt-4o" exists on
 * OpenRouter, OpenAI, Groq…), so a selection is only meaningful as a
 * (providerId, modelId) PAIR. These helpers keep that pair atomic:
 * resolving what's stored, and applying a user pick so it persists.
 */

import { aiManager } from "./AIManager";

export interface ModelEntryLike {
  id: string;
  providerId: string;
}

/**
 * Resolve the stored (activeProvider, activeModel) pair against a concrete
 * model list. Returns the matching entry, the provider's first entry when
 * the stored model doesn't exist there, or null when the stored provider
 * is unknown/unlisted.
 */
export function resolveStoredSelection<T extends ModelEntryLike>(models: T[]): T | null {
  const cfg = aiManager.getConfig();
  if (!cfg.activeProvider) return null;
  return (
    models.find((m) => m.providerId === cfg.activeProvider && m.id === cfg.activeModel) ||
    models.find((m) => m.providerId === cfg.activeProvider)
  );
}

/** True when the user hand-picked a non-default model on the active provider. */
export function userHasPinnedModel(): boolean {
  const cfg = aiManager.getConfig();
  const provider = aiManager.getActiveProvider();
  if (!provider || !cfg.activeModel) return false;
  return cfg.activeModel !== provider.defaultModel;
}

/**
 * Apply a user's pick AT PICK TIME (not just on send): switching providers
 * carries the chosen model id; staying on the same provider updates only
 * the model. Both setters persist to localStorage immediately.
 */
export function applyModelPick(entry: ModelEntryLike): void {
  const cfg = aiManager.getConfig();
  if (entry.providerId !== cfg.activeProvider) {
    aiManager.setActiveProvider(entry.providerId, entry.id);
  } else if (entry.id && entry.id !== cfg.activeModel) {
    aiManager.setActiveModel(entry.id);
  }
}
