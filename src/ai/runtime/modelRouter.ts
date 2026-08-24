/**
 * Noska Intelligence — Model Router
 *
 * Chooses a model class per task instead of hard-coding one model:
 *   fast      → classification, extraction, simple summaries
 *   default   → normal Q&A and tool use
 *   reasoning → complex planning, multi-step analysis
 *
 * The router maps a requested class onto the active provider's model list
 * using well-known naming patterns, falling back to the provider's default
 * when no obvious match exists. The chosen model is always logged on the
 * run record so users can see what ran (no silent downgrades for
 * user-visible chat: interactive Q&A keeps the user's selected model).
 */

import { aiManager } from "../AIManager";
import type { ModelClass } from "./types";

const FAST_PATTERNS = [/flash/i, /mini/i, /haiku/i, /instant/i, /lite/i, /8b/i, /small/i];
const REASONING_PATTERNS = [/r1/i, /o1/i, /o3/i, /reasoning|think/i, /opus/i];

function pickModelId(models: Array<{ id: string; name: string }>, preferred: string | null | undefined, klass: ModelClass): string | null {
  if (!models || models.length === 0) return null;
  if (klass === "default") return preferred && models.some((m) => m.id === preferred) ? preferred : models[0]?.id || null;

  const pool = models.filter((m) => m.id !== preferred);
  const patterns = klass === "fast" ? FAST_PATTERNS : REASONING_PATTERNS;
  const match = (klass === "fast" ? [...pool].reverse() : pool).find((m) => patterns.some((p) => p.test(m.id)));
  return match?.id || preferred || models[0]?.id || null;
}

export interface ModelSelection {
  class: ModelClass;
  providerId: string | null;
  modelId: string | null;
  /** true when the exact class wasn't available and the default was used */
  fellBack: boolean;
}

export function selectModel(klass: ModelClass): ModelSelection {
  const config = aiManager.getConfig();
  const provider = aiManager.getActiveProvider();
  if (!provider) {
    return { class: klass, providerId: null, modelId: null, fellBack: false };
  }
  const preferred = config.activeModel || provider.defaultModel;
  let modelId = pickModelId(provider.models, preferred, klass);
  let fellBack = false;
  if (!modelId || modelId === preferred) {
    // No distinct model for this class — reuse the active one honestly.
    fellBack = modelId !== preferred;
    modelId = preferred;
    if (!modelId) modelId = provider.defaultModel || null;
  }
  return { class: klass, providerId: provider.id, modelId, fellBack };
}

/** Route a task description to an appropriate class. */
export function classifyModelNeed(taskHint: "classification" | "planning" | "tool_use" | "summary" | "answer"): ModelClass {
  switch (taskHint) {
    case "classification":
    case "summary":
      return "fast";
    case "planning":
      return "reasoning";
    case "tool_use":
    case "answer":
    default:
      return "default";
  }
}
