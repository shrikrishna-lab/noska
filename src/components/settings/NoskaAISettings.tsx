import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Bot,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  Cpu,
  Layers,
  Zap,
  Sliders,
  Terminal,
  Server,
  Globe,
  Check,
  Search,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { aiManager } from "../../ai/AIManager";
import { getProviderList, testProviderConnection, type AIProvider, type AIModel } from "../../ai/providers";
import { modelCatalogService, isModelNew } from "../../ai/ModelCatalogService";
import { modelCatalogSyncService } from "../../ai/models/ModelCatalogSyncService";
import { modelRepository } from "../../ai/models/ModelRepository";
import type { NormalizedModel, SyncResult } from "../../ai/models/normalizedSchema";
import CustomProviders from "./CustomProviders";
import { InlineAction } from "../ui/inline-action";

interface NoskaAISettingsProps {
  apiKey?: string;
  setApiKey?: (key: string) => void;
  aiProvider?: string;
  setAIProvider?: (provider: string) => void;
  nvidiaKey?: string;
  setNvidiaKey?: (key: string) => void;
  ghostWriterEnabled?: boolean;
  setGhostWriterEnabled?: (enabled: boolean) => void;
  onToast?: (msg: string) => void;
}

interface ProviderTestResult {
  ok: boolean;
  error?: string;
  response?: string;
}

function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return "Never synced";
  try {
    const ms = Date.now() - new Date(isoString).getTime();
    if (ms < 45000) return "just now";
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } catch {
    return "recently";
  }
}

function ProviderLogo({ id }: { id: string }) {
  switch (id) {
    case "anthropic":
      return (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#d97757]/10 text-[#d97757] border border-[#d97757]/20 font-bold text-xs">
          ▲
        </div>
      );
    case "openai":
      return (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold text-xs">
          ❋
        </div>
      );
    case "gemini":
      return (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold text-xs">
          ✦
        </div>
      );
    case "groq":
      return (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/20 font-bold text-xs">
          ⚡
        </div>
      );
    case "nvidia":
      return (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-600/10 text-emerald-700 border border-emerald-600/20 font-bold text-xs">
          👁
        </div>
      );
    case "ollama":
      return (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#ede8df] text-[#1c1b18] border border-[#e8e4db] font-bold text-xs">
          🦙
        </div>
      );
    case "lmstudio":
      return (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 font-bold text-xs">
          ⊞
        </div>
      );
    default:
      return (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#ede8df] text-[#706c64] border border-[#e8e4db] font-bold text-xs">
          <Bot size={15} />
        </div>
      );
  }
}

export default function NoskaAISettings({
  apiKey,
  setApiKey,
  aiProvider,
  setAIProvider,
  nvidiaKey,
  setNvidiaKey,
  ghostWriterEnabled,
  setGhostWriterEnabled,
  onToast,
}: NoskaAISettingsProps) {
  const [providerTests, setProviderTests] = useState<Record<string, ProviderTestResult>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<Record<string, { type: "success" | "error" | "info"; message: string }>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [modelSearch, setModelSearch] = useState<Record<string, string>>({});
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({
    anthropic: true,
    openai: true,
  });
  const [, forceUpdate] = useState(0);

  const providerList = getProviderList();
  const currentConfig = aiManager.getConfig();

  // Subscribe to AIManager config updates
  useEffect(() => {
    const unsubscribe = aiManager.subscribe(() => forceUpdate((n) => n + 1));
    return () => {
      unsubscribe();
    };
  }, []);

  // Subscribe to Dynamic ModelCatalogSyncService updates (on-demand syncs & cache changes)
  useEffect(() => {
    const unsubscribeSync = modelCatalogSyncService.subscribe(() => forceUpdate((n) => n + 1));
    return () => {
      unsubscribeSync();
    };
  }, []);

  // Sync legacy props with AIManager
  useEffect(() => {
    if (apiKey) aiManager.setProviderConfig("anthropic", { apiKey, enabled: true });
  }, [apiKey]);

  useEffect(() => {
    if (nvidiaKey) aiManager.setProviderConfig("nvidia", { apiKey: nvidiaKey, enabled: true });
  }, [nvidiaKey]);

  const handleKeyChange = (providerId: string, key: string) => {
    aiManager.setProviderConfig(providerId, { apiKey: key, enabled: true });
    if (providerId === "anthropic" && setApiKey) setApiKey(key);
    if (providerId === "nvidia" && setNvidiaKey) setNvidiaKey(key);
  };

  const handleSetActive = (providerId: string, modelId?: string) => {
    const provider = providerList.find((p) => p.id === providerId);
    const chosenModel = modelId || provider?.defaultModel;
    aiManager.setActiveProvider(providerId, chosenModel);
    if (setAIProvider) setAIProvider(providerId);
    onToast?.(`Switched to ${chosenModel ? `${provider?.name} · ${chosenModel}` : provider?.name}`);
  };

  const handleSelectModel = (providerId: string, modelId: string) => {
    aiManager.setActiveProvider(providerId, modelId);
    if (setAIProvider) setAIProvider(providerId);
    onToast?.(`Active model set to ${modelId}`);
  };

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [batchSyncResult, setBatchSyncResult] = useState<string | null>(null);

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    setBatchSyncResult(null);
    try {
      const activeCfg = aiManager.getConfig();
      
      // Providers with API key entered:
      const keyedProviders = providerList
        .filter((p) => Boolean(activeCfg.providers[p.id]?.apiKey?.trim()))
        .map((p) => p.id);

      // Open/public and local providers:
      const openProviders = ["openrouter", "opencode_zen", "ollama", "lmstudio"];
      const targetList = Array.from(new Set([...keyedProviders, ...openProviders]));
      
      const summary = await modelCatalogSyncService.syncAllConfigured(activeCfg.providers, targetList);

      if (summary.providersSynced > 0) {
        let msg = `✨ Synced ${summary.providersSynced} provider${summary.providersSynced > 1 ? "s" : ""} · ${summary.modelsFoundTotal} models registered`;
        if (summary.modelsAddedTotal > 0) {
          msg += ` (${summary.modelsAddedTotal} new)`;
        }
        setBatchSyncResult(msg);
        onToast?.(msg);
      } else if (summary.errors.length > 0) {
        const errorSummary = `Sync notice: ${summary.errors[0]?.error || "Check credentials"}`;
        setBatchSyncResult(errorSummary);
        onToast?.(errorSummary);
      } else {
        const upToDateMsg = "All model catalogs are up to date";
        setBatchSyncResult(upToDateMsg);
        onToast?.(upToDateMsg);
      }
    } catch (err: any) {
      const errMsg = `Sync error: ${err?.message || "Unknown error"}`;
      setBatchSyncResult(errMsg);
      onToast?.(errMsg);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingId(providerId);
    const providerConfig = currentConfig.providers[providerId] || {};
    const result = await testProviderConnection(providerId, providerConfig);
    setProviderTests((prev) => ({ ...prev, [providerId]: result }));
    setTestingId(null);
    if (result.ok) {
      onToast?.(`Connection to ${providerId} verified`);
    }
  };

  const activeProviderObj = providerList.find((p) => p.id === currentConfig.activeProvider);
  const activeModels = activeProviderObj
    ? modelCatalogSyncService.getModels(activeProviderObj.id, activeProviderObj.models)
    : [];
  const isReady = aiManager.isConfigured();

  return (
    <div className="max-w-2xl space-y-6 text-[#1c1b18] dark:text-white pb-16 font-sans">
      {/* ── Title ──────────────────────────────────────────────── */}
      <div className="pt-1">
        <h1 className="text-[28px] font-normal tracking-tight font-serif text-[#1c1b18] dark:text-white">
          Noska AI
        </h1>
        <p className="text-xs text-[#706c64] dark:text-white/60 mt-1">
          Configure dynamic intelligence models, provider connections, context injection, and writing assistants.
        </p>
      </div>

      {/* ── Active Model Hero Card ────────────────────────────── */}
      <div className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] p-5 border border-[#e8e4db] dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1c1b18] text-white dark:bg-white dark:text-[#1c1b18] shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1c1b18] dark:text-white">
                  {aiManager.getActiveModelName()}
                </span>
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${isReady
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
                    }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                      }`}
                  />
                  {isReady ? "Engine Ready" : "Key Required"}
                </span>
              </div>
              <p className="text-[11px] text-[#706c64] dark:text-white/60 mt-0.5">
                Default routing via <span className="font-semibold text-[#1c1b18] dark:text-white">{aiManager.getActiveProviderName()}</span>
              </p>
            </div>
          </div>

          {/* Unified Sync Models Trigger */}
          <button
            type="button"
            disabled={isSyncingAll || modelCatalogSyncService.isSyncingAny()}
            onClick={handleSyncAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e8e4db] dark:border-white/10 bg-white dark:bg-white/5 hover:bg-[#ede8df] dark:hover:bg-white/10 text-xs font-semibold text-[#1c1b18] dark:text-white transition cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
            title="Perform on-demand sync and register live models"
          >
            <RotateCw
              size={12}
              className={isSyncingAll || modelCatalogSyncService.isSyncingAny() ? "animate-spin text-purple-600" : ""}
            />
            <span>{isSyncingAll ? "Syncing..." : "Sync Models"}</span>
          </button>
        </div>

        {/* Model switcher selector for active provider */}
        {activeModels.length > 1 && (
          <div className="pt-1">
            <label className="block text-[10px] font-semibold text-[#706c64] dark:text-white/60 mb-1">
              Active Model Variant
            </label>
            <select
              value={currentConfig.activeModel || activeProviderObj?.defaultModel}
              onChange={(e) => {
                if (activeProviderObj) {
                  aiManager.setActiveProvider(activeProviderObj.id, e.target.value);
                  onToast?.(`Switched to ${e.target.value}`);
                }
              }}
              className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-white dark:bg-[#1f2330] px-3.5 py-2 text-xs font-medium text-[#1c1b18] dark:text-white outline-none cursor-pointer focus:border-[#1c1b18]"
            >
              {activeModels.map((model) => (
                <option key={model.providerModelId} value={model.providerModelId}>
                  {model.displayName} {isModelNew(model.providerModelId, activeProviderObj?.id) ? "★ [NEW]" : ""} ({Math.round(model.contextWindow / 1000)}k context)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Built-in Providers & Model Catalogs ────────────────── */}
      <div className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] p-5 sm:p-6 border border-[#e8e4db] dark:border-white/10 shadow-sm divide-y divide-[#e8e4db] dark:divide-white/10">
        <div className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-[#1c1b18] dark:text-white flex items-center gap-2 flex-wrap">
              <span>Cloud & Local Providers</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-[#706c64] dark:text-white/60 mt-0.5 leading-relaxed">
              On-demand model discovery via official provider APIs, cached snapshots, and live metadata.
            </p>
          </div>

          <div className="shrink-0 self-start sm:self-auto">
            <InlineAction
              size="sm"
              label="Live Catalog"
              icon={<RotateCw size={13} className={isSyncingAll ? "animate-spin text-purple-600" : ""} />}
              actionText="Sync All"
              onAction={handleSyncAll}
              className="px-0 w-auto"
            />
          </div>
        </div>

        {/* Global Batch Sync Feedback Banner */}
        {batchSyncResult && (
          <div className="py-3">
            <div className="rounded-xl px-3.5 py-2 text-xs font-medium bg-emerald-50/80 text-emerald-900 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">{batchSyncResult}</span>
              </div>
              <button
                type="button"
                onClick={() => setBatchSyncResult(null)}
                className="text-xs text-emerald-700 dark:text-emerald-400 hover:opacity-70 cursor-pointer shrink-0 p-0.5"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {providerList.map((provider) => {
          const providerConfig = currentConfig.providers[provider.id] || {};
          const isActive = currentConfig.activeProvider === provider.id;
          const hasKey = !provider.requiresKey || Boolean(providerConfig.apiKey);
          const testResult = providerTests[provider.id];
          const isTesting = testingId === provider.id;
          const isKeyVisible = showKey[provider.id] || false;
          const isExpanded = expandedProviders[provider.id] ?? false;

          // Dynamic Model Discovery & Live Sync State
          const availableModels = modelCatalogSyncService.getModels(provider.id, provider.models);
          const isStale = modelCatalogSyncService.isStale(provider.id);
          const lastSyncedAt = modelCatalogSyncService.getLastSyncedAt(provider.id);
          const feedback = syncFeedback[provider.id];

          const newModelsCount = availableModels.filter((m) => isModelNew(m.providerModelId, provider.id)).length;

          return (
            <div key={provider.id} className="py-4 first:pt-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <ProviderLogo id={provider.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#1c1b18] dark:text-white">{provider.name}</span>
                      <span className="rounded-full bg-white dark:bg-white/10 border border-[#e8e4db] dark:border-white/10 px-2 py-0.5 text-[9.5px] text-[#706c64] dark:text-white/70 font-semibold uppercase">
                        {provider.type}
                      </span>
                      {isActive && (
                        <span className="rounded-full bg-[#1c1b18] text-white dark:bg-white dark:text-[#1c1b18] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
                          Active
                        </span>
                      )}
                      {newModelsCount > 0 && (
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300">
                          ✨ {newModelsCount} New Model{newModelsCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {isStale && (
                        <span className="rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 text-[9.5px] font-semibold text-amber-700 dark:text-amber-300">
                          Catalog may be outdated
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#706c64] dark:text-white/60 mt-0.5 leading-relaxed truncate flex items-center gap-2">
                      <span>{availableModels.length} models available</span>
                      <span>·</span>
                      <span>Last synced {formatRelativeTime(lastSyncedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isActive && hasKey && (
                    <button
                      type="button"
                      onClick={() => handleSetActive(provider.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] text-xs font-semibold transition cursor-pointer"
                    >
                      Select
                    </button>
                  )}
                </div>
              </div>

              {/* API Key / Endpoint Configuration */}
              {provider.requiresKey ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={isKeyVisible ? "text" : "password"}
                        value={providerConfig.apiKey || ""}
                        onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                        placeholder={provider.keyPlaceholder || "Paste API key..."}
                        className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-white dark:bg-[#1f2330] pl-3.5 pr-9 py-2 text-xs font-mono text-[#1c1b18] dark:text-white outline-none placeholder:text-[#a09c94] focus:border-[#1c1b18] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((prev) => ({ ...prev, [provider.id]: !isKeyVisible }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#706c64] hover:text-[#1c1b18] dark:hover:text-white transition cursor-pointer p-0.5"
                        title={isKeyVisible ? "Hide key" : "Show key"}
                      >
                        {isKeyVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTestConnection(provider.id)}
                      disabled={!providerConfig.apiKey || isTesting}
                      className="rounded-xl bg-white dark:bg-white/10 hover:bg-[#ede8df] px-3.5 py-2 text-xs font-semibold text-[#1c1b18] dark:text-white border border-[#e8e4db] dark:border-white/10 transition disabled:opacity-40 cursor-pointer shadow-xs shrink-0"
                    >
                      {isTesting ? "Testing..." : "Test"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={providerConfig.baseUrl || ""}
                    onChange={(e) => aiManager.setProviderConfig(provider.id, { baseUrl: e.target.value })}
                    placeholder={`Endpoint URL (default: ${provider.id === "ollama" ? "http://localhost:11434" : "http://localhost:1234/v1"
                      })`}
                    className="flex-1 rounded-xl border border-[#e8e4db] dark:border-white/10 bg-white dark:bg-[#1f2330] px-3.5 py-2 text-xs font-mono text-[#1c1b18] dark:text-white outline-none placeholder:text-[#a09c94] focus:border-[#1c1b18] transition"
                  />
                  <button
                    type="button"
                    onClick={() => handleTestConnection(provider.id)}
                    disabled={isTesting}
                    className="rounded-xl bg-white dark:bg-white/10 hover:bg-[#ede8df] px-3.5 py-2 text-xs font-semibold text-[#1c1b18] dark:text-white border border-[#e8e4db] dark:border-white/10 transition disabled:opacity-40 cursor-pointer shadow-xs shrink-0"
                  >
                    {isTesting ? "Testing..." : "Test"}
                  </button>
                </div>
              )}

              {/* Sync Feedback Toast / Banner */}
              {feedback && (
                <div
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium flex items-center justify-between gap-2 transition ${feedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                      : "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
                    }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {feedback.type === "success" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    <span>{feedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSyncFeedback((prev) => ({ ...prev, [provider.id]: undefined as any }))}
                    className="text-xs hover:opacity-70 cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Verification Feedback Badge */}
              {testResult && (
                <div
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 ${testResult.ok
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                      : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30"
                    }`}
                >
                  {testResult.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  <span>{testResult.ok ? "Connection verified successfully" : testResult.error || "Connection failed"}</span>
                </div>
              )}

              {/* ── Expandable Model Catalog Explorer ────────────── */}
              {(() => {
                const currentSearch = (modelSearch[provider.id] || "").toLowerCase().trim();
                const filteredModels = currentSearch
                  ? availableModels.filter(
                    (m) =>
                      m.displayName.toLowerCase().includes(currentSearch) ||
                      m.providerModelId.toLowerCase().includes(currentSearch) ||
                      (m.description && m.description.toLowerCase().includes(currentSearch))
                  )
                  : availableModels;

                if (availableModels.length === 0) return null;

                return (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedProviders((prev) => ({
                          ...prev,
                          [provider.id]: !prev[provider.id],
                        }))
                      }
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/5 hover:bg-[#ede8df] dark:hover:bg-white/10 border border-[#e8e4db] dark:border-white/10 text-xs font-semibold text-[#1c1b18] dark:text-white transition cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-[#a8824b] group-hover:scale-110 transition-transform" />
                        <span>
                          {isExpanded ? "Hide Models" : `View All ${availableModels.length} Models`}
                        </span>
                        {newModelsCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 px-2 py-0.5 text-[9.5px] font-bold">
                            <Sparkles size={9} />
                            {newModelsCount} NEW
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[#706c64] dark:text-white/60 text-[11px]">
                        <span>{isExpanded ? "Collapse" : "Explore"}</span>
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                            }`}
                        />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2.5 space-y-2 rounded-2xl bg-[#faf8f4] dark:bg-black/30 p-3 border border-[#e8e4db] dark:border-white/10 shadow-inner">
                            {/* Search filter for providers with 4+ models */}
                            {availableModels.length >= 4 && (
                              <div className="relative mb-2">
                                <Search
                                  size={13}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#706c64] dark:text-white/50"
                                />
                                <input
                                  type="text"
                                  value={modelSearch[provider.id] || ""}
                                  onChange={(e) =>
                                    setModelSearch((prev) => ({
                                      ...prev,
                                      [provider.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={`Search ${provider.name} models...`}
                                  className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-white dark:bg-[#181b24] pl-8.5 pr-3 py-1.5 text-xs font-medium text-[#1c1b18] dark:text-white outline-none placeholder:text-[#a09c94] focus:border-[#1c1b18] dark:focus:border-white transition"
                                />
                              </div>
                            )}

                            {filteredModels.length === 0 ? (
                              <div className="py-4 text-center text-xs text-[#706c64] dark:text-white/50">
                                No models match &ldquo;{modelSearch[provider.id]}&rdquo;
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5 custom-scrollbar">
                                {filteredModels.map((model) => {
                                  const isNew = isModelNew(model.providerModelId, provider.id);
                                  const isCurrent =
                                    isActive &&
                                    (currentConfig.activeModel === model.providerModelId ||
                                      (!currentConfig.activeModel && provider.defaultModel === model.providerModelId));
                                  const isDefault = provider.defaultModel === model.providerModelId;

                                  const isReasoning = model.capabilities.reasoning;
                                  const isVision = model.capabilities.imageInput;
                                  const isToolCapable = model.capabilities.toolCalling;

                                  return (
                                    <div
                                      key={model.id}
                                      className={`rounded-xl border p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-all duration-150 ${isCurrent
                                          ? "bg-white dark:bg-[#1f2331] border-[#1c1b18] dark:border-white/40 shadow-xs ring-1 ring-[#1c1b18]/10 dark:ring-white/10"
                                          : "bg-white/80 dark:bg-white/5 border-[#e8e4db] dark:border-white/5 hover:border-[#1c1b18]/30 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/8"
                                        }`}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs font-bold text-[#1c1b18] dark:text-white tracking-tight">
                                            {model.displayName}
                                          </span>

                                          {/* Dynamic Single NEW Flagship Badge */}
                                          {isNew && (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase shadow-2xs">
                                              <Sparkles size={9} />
                                              NEW
                                            </span>
                                          )}

                                          {/* Capability Tags */}
                                          {isReasoning && (
                                            <span className="rounded-md bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 px-1.5 py-0.2 text-[9px] font-semibold">
                                              Reasoning
                                            </span>
                                          )}
                                          {isVision && (
                                            <span className="rounded-md bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 px-1.5 py-0.2 text-[9px] font-semibold">
                                              Vision
                                            </span>
                                          )}
                                          {isToolCapable && (
                                            <span className="rounded-md bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-1.5 py-0.2 text-[9px] font-semibold">
                                              Tools
                                            </span>
                                          )}

                                          {model.status === "preview" && (
                                            <span className="rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 text-[9px] font-semibold">
                                              Preview
                                            </span>
                                          )}

                                          {isCurrent && (
                                            <span className="rounded-md bg-[#1c1b18] text-white dark:bg-white dark:text-[#1c1b18] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                              Active
                                            </span>
                                          )}

                                          {isDefault && !isCurrent && (
                                            <span className="rounded-md bg-[#ede8df] dark:bg-white/10 text-[#706c64] dark:text-white/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase">
                                              Default
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-1 text-[10.5px] text-[#706c64] dark:text-white/60 font-mono flex-wrap">
                                          <span className="truncate max-w-[220px] sm:max-w-none text-[#1c1b18]/70 dark:text-white/70 font-semibold">
                                            {model.providerModelId}
                                          </span>
                                          <span>·</span>
                                          <span className="rounded bg-[#ede8df]/60 dark:bg-white/5 px-1 py-0.2 text-[9.5px]">
                                            {model.contextWindow >= 1000000
                                              ? `${(model.contextWindow / 1000000).toFixed(1)}M tokens`
                                              : `${Math.round(model.contextWindow / 1000)}k context`}
                                          </span>
                                          {model.maxOutputTokens && (
                                            <span className="text-[9.5px] text-[#706c64]/80 dark:text-white/40">
                                              (max out: {Math.round(model.maxOutputTokens / 1000)}k)
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="shrink-0">
                                        {isCurrent ? (
                                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-500/15 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
                                            <Check size={13} /> Active
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleSelectModel(provider.id, model.providerModelId)}
                                            className="px-3 py-1.2 rounded-lg bg-[#ede8df] hover:bg-[#1c1b18] hover:text-white dark:bg-white/10 dark:hover:bg-white dark:hover:text-[#1c1b18] text-[#1c1b18] dark:text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
                                          >
                                            Use
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* ── Custom Bring-Your-Own Gateways ────────────────────── */}
      <CustomProviders onToast={onToast} />

      {/* ── Context Settings Card ─────────────────────────────── */}
      <div className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] p-5 sm:p-6 border border-[#e8e4db] dark:border-white/10 shadow-sm divide-y divide-[#e8e4db] dark:divide-white/10">
        <div className="pb-3">
          <div className="text-sm font-bold text-[#1c1b18] dark:text-white">Context Injection</div>
          <div className="text-xs text-[#706c64] dark:text-white/60 mt-0.5">
            Control which workspace data is sent with agent prompts.
          </div>
        </div>

        {[
          { key: "includeCurrentPage", label: "Current page content", desc: "Send active document notes and blocks" },
          { key: "includeRecentPages", label: "Recent pages context", desc: "Include summaries of recently edited notes" },
          { key: "includeConnections", label: "Graph backlinks", desc: "Include connected bi-directional links" },
          { key: "includeTags", label: "Workspace tags", desc: "Send relevant metadata tags for broader reasoning" },
        ].map(({ key, label, desc }) => (
          <div key={key} className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-[#1c1b18] dark:text-white">{label}</div>
              <div className="text-[11px] text-[#706c64] dark:text-white/60 mt-0.5">{desc}</div>
            </div>
            <input
              type="checkbox"
              checked={(currentConfig.context as unknown as Record<string, boolean>)?.[key] !== false}
              onChange={(e) =>
                aiManager.configure({
                  context: { ...currentConfig.context, [key]: e.target.checked },
                })
              }
              className="h-4 w-4 rounded accent-[#1c1b18] cursor-pointer"
            />
          </div>
        ))}
      </div>

      {/* ── AI Ghost Writer Card ──────────────────────────────── */}
      <div className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] p-5 border border-[#e8e4db] dark:border-white/10 shadow-sm flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1c1b18] dark:text-white">AI Ghost Writer</span>
            <span className="rounded-full bg-white dark:bg-white/10 border border-[#e8e4db] dark:border-white/10 px-2 py-0.5 text-[9.5px] font-semibold text-[#706c64] dark:text-white/70">
              Inline Assist
            </span>
          </div>
          <p className="text-[11px] text-[#706c64] dark:text-white/60 mt-0.5">
            Predicts and suggests intelligent inline completions as you pause typing.
          </p>
        </div>
        <input
          type="checkbox"
          checked={Boolean(ghostWriterEnabled)}
          onChange={(e) => setGhostWriterEnabled?.(e.target.checked)}
          className="h-4 w-4 rounded accent-[#1c1b18] cursor-pointer shrink-0"
        />
      </div>
    </div>
  );
}
