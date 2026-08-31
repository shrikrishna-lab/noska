/**
 * Noska AI — Offline / Local Model Engine & Reliability SLO Tracker
 * 
 * Manages zero-internet local dictation fallback, on-device model routing,
 * and tracks live availability SLO metrics (99.9% uptime target).
 */

import { getVoiceSettings, type ModelTier } from "./voice-settings";

// ─── Types ────────────────────────────────────────────────────────

export interface SLOMetrics {
  totalCalls: number;
  successfulCalls: number;
  offlineFallbacks: number;
  timeouts: number;
  averageLatencyMs: number;
  lastChecked: number;
  successRate: number; // percentage (e.g. 99.92)
}

export interface ModelExecutionPlan {
  useCloud: boolean;
  tierReason: "always_local_pinned" | "always_cloud_pinned" | "auto_online" | "auto_offline_fallback" | "latency_fallback";
  modelName: string;
}

const SLO_STORAGE_KEY = "noska_voice_slo_metrics";

let inMemoryMetrics: SLOMetrics = {
  totalCalls: 0,
  successfulCalls: 0,
  offlineFallbacks: 0,
  timeouts: 0,
  averageLatencyMs: 85,
  lastChecked: Date.now(),
  successRate: 100.0,
};

// ─── Live SLO Tracker ─────────────────────────────────────────────

function loadSLOMetrics(): SLOMetrics {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SLO_STORAGE_KEY) : null;
    if (raw) {
      inMemoryMetrics = JSON.parse(raw);
    }
  } catch {}
  return inMemoryMetrics;
}

function saveSLOMetrics(metrics: SLOMetrics) {
  inMemoryMetrics = { ...metrics };
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SLO_STORAGE_KEY, JSON.stringify(metrics));
    }
  } catch {}
}

export function recordSLOExecution(params: {
  latencyMs: number;
  success: boolean;
  wasOfflineFallback: boolean;
  timedOut?: boolean;
}) {
  const metrics = loadSLOMetrics();
  metrics.totalCalls += 1;
  if (params.success) {
    metrics.successfulCalls += 1;
  }
  if (params.wasOfflineFallback) {
    metrics.offlineFallbacks += 1;
  }
  if (params.timedOut) {
    metrics.timeouts += 1;
  }

  // Rolling average latency
  metrics.averageLatencyMs = Math.round(
    (metrics.averageLatencyMs * (metrics.totalCalls - 1) + params.latencyMs) / metrics.totalCalls
  );
  metrics.lastChecked = Date.now();
  metrics.successRate = Number(
    ((metrics.successfulCalls / Math.max(1, metrics.totalCalls)) * 100).toFixed(2)
  );

  saveSLOMetrics(metrics);
}

export function getSLOMetrics(): SLOMetrics {
  return loadSLOMetrics();
}

export function resetSLOMetrics() {
  const fresh: SLOMetrics = {
    totalCalls: 0,
    successfulCalls: 0,
    offlineFallbacks: 0,
    timeouts: 0,
    averageLatencyMs: 0,
    lastChecked: Date.now(),
    successRate: 100.0,
  };
  saveSLOMetrics(fresh);
  return fresh;
}

// ─── Network Status Listener ──────────────────────────────────────

let isOnlineState = typeof navigator !== "undefined" ? navigator.onLine : true;
const networkListeners = new Set<(isOnline: boolean) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    isOnlineState = true;
    networkListeners.forEach((fn) => {
      try { fn(true); } catch {}
    });
  });

  window.addEventListener("offline", () => {
    isOnlineState = false;
    networkListeners.forEach((fn) => {
      try { fn(false); } catch {}
    });
  });
}

export function isNetworkAvailable(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : isOnlineState;
}

export function onNetworkChange(callback: (isOnline: boolean) => void): () => void {
  networkListeners.add(callback);
  return () => networkListeners.delete(callback);
}

// ─── Model Execution Plan Resolver ────────────────────────────────

/**
 * Determine whether to use cloud AI or local on-device engine based on user preference,
 * network connectivity, and latency health.
 */
export function resolveModelExecutionPlan(): ModelExecutionPlan {
  const settings = getVoiceSettings();
  const tier: ModelTier = settings.modelTier || "auto";
  const online = isNetworkAvailable();

  if (tier === "always_local") {
    return {
      useCloud: false,
      tierReason: "always_local_pinned",
      modelName: "On-Device Local Engine (0 Network)",
    };
  }

  if (tier === "always_cloud") {
    return {
      useCloud: online,
      tierReason: online ? "always_cloud_pinned" : "auto_offline_fallback",
      modelName: online ? "Cloud AI (Active)" : "On-Device Fallback (Offline)",
    };
  }

  // Auto mode: use cloud if online, silently fallback to local if offline
  if (!online) {
    return {
      useCloud: false,
      tierReason: "auto_offline_fallback",
      modelName: "On-Device Local Engine (Auto Offline)",
    };
  }

  return {
    useCloud: true,
    tierReason: "auto_online",
    modelName: "Cloud AI Enhanced",
  };
}
