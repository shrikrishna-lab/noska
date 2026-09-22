/**
 * Notion-Style Connections Settings Page
 *
 * Implements a compact, searchable connections catalog with:
 * - Category filter chips
 * - Connected apps section with multi-account support
 * - Discover apps section with capability indicators
 * - App Details slide-over/modal with translated human-readable permissions
 * - Connect, Add another account, Reconnect, and Disconnect actions
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Lock,
  ChevronRight,
  User,
  ShieldCheck,
  Globe,
  SlidersHorizontal,
  X,
  Layers,
  Sparkles,
  Link as LinkIcon,
  AtSign,
  Database,
  ArrowUpRight,
  Terminal,
} from "lucide-react";
import { IntegrationRegistry } from "../../lib/connections/registry";
import { ConnectionsService } from "../../lib/connections/connectionsService";
import type {
  IntegrationProviderDefinition,
  ConnectedAccountInfo,
  ProviderCategory,
} from "../../lib/connections/types";
import { BrandIcon, hasBrandIcon, normalizeBrandKey } from "../../components/BrandIcon";
import { openExternal } from "../../lib/desktop/links";

function ProviderIconBadge({ id, name }: { id: string; name: string; brandColor?: string }) {
  const brandKey = normalizeBrandKey(id, name);
  if (!hasBrandIcon(id, name)) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#ede8df] text-[#1c1b18] font-bold text-xs shadow-xs border border-[#e8e4db]">
        {name ? name.slice(0, 2).toUpperCase() : "?"}
      </div>
    );
  }
  // Dark/brand tiles for white-mark logos; white tile for colored marks.
  const tile = brandKey.includes("github")
    ? "bg-[#18181b] text-white"
    : brandKey.includes("vercel")
      ? "bg-black text-white"
      : brandKey.includes("mcp") || brandKey.includes("custom")
        ? "bg-[#1c1b18] text-[#fbf9f5]"
        : "bg-white border border-[#e8e4db] text-[#1c1b18]";
  return (
    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl shadow-xs ${tile}`}>
      <BrandIcon id={id} name={name} className="h-5.5 w-5.5" />
    </div>
  );
}

export default function ConnectionsSettings({ onToast }: { onToast?: (m: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccountInfo[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<IntegrationProviderDefinition | null>(null);
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenLabel, setTokenLabel] = useState("");
  const [showTokenModal, setShowTokenModal] = useState<IntegrationProviderDefinition | null>(null);

  const categories = useMemo(() => ["all", ...IntegrationRegistry.getCategories()], []);

  const loadConnections = useCallback(async () => {
    try {
      const accounts = await ConnectionsService.listConnectedAccounts();
      setConnectedAccounts(accounts);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load connected accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnections();
    return ConnectionsService.subscribe(() => {
      void loadConnections();
    });
  }, [loadConnections]);

  const filteredProviders = useMemo(() => {
    return IntegrationRegistry.search(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  const connectedAccountsByProvider = useMemo(() => {
    const map = new Map<string, ConnectedAccountInfo[]>();
    for (const acc of connectedAccounts) {
      if (acc.status === "revoked") continue;
      const list = map.get(acc.providerId.toLowerCase()) || [];
      list.push(acc);
      map.set(acc.providerId.toLowerCase(), list);
    }
    return map;
  }, [connectedAccounts]);

  const connectedProviders = useMemo(() => {
    const slugs = new Set(connectedAccounts.filter((a) => a.status !== "revoked").map((a) => a.providerId.toLowerCase()));
    return IntegrationRegistry.getAll().filter((p) => slugs.has(p.id.toLowerCase()));
  }, [connectedAccounts]);

  const discoverProviders = useMemo(() => {
    const connectedSlugs = new Set(connectedAccounts.filter((a) => a.status !== "revoked").map((a) => a.providerId.toLowerCase()));
    return filteredProviders.filter((p) => !connectedSlugs.has(p.id.toLowerCase()));
  }, [filteredProviders, connectedAccounts]);

  const handleConnect = async (provider: IntegrationProviderDefinition) => {
    if (provider.status === "coming_soon") {
      onToast?.(`${provider.name} connection is coming soon!`);
      return;
    }

    if (provider.capabilities.oauth) {
      setConnectingSlug(provider.id);
      try {
        await ConnectionsService.startOAuthConnect(provider.id);
        onToast?.(`Connecting to ${provider.name}... Complete authorization in your browser.`);
      } catch (err) {
        onToast?.(`Failed to start ${provider.name} OAuth: ${err instanceof Error ? err.message : "Error"}`);
      } finally {
        setConnectingSlug(null);
      }
    } else {
      setShowTokenModal(provider);
    }
  };

  const handleManualTokenSubmit = async () => {
    if (!showTokenModal || !tokenInput.trim()) return;
    try {
      await ConnectionsService.connectManualToken({
        providerId: showTokenModal.id,
        token: tokenInput.trim(),
        label: tokenLabel.trim() || undefined,
      });
      onToast?.(`Connected to ${showTokenModal.name}!`);
      setShowTokenModal(null);
      setTokenInput("");
      setTokenLabel("");
      await loadConnections();
    } catch (err) {
      onToast?.(`Connection failed: ${err instanceof Error ? err.message : "Error"}`);
    }
  };

  const handleDisconnect = async (connectionId: string, name: string) => {
    try {
      await ConnectionsService.disconnectAccount(connectionId);
      onToast?.(`Disconnected ${name}`);
      await loadConnections();
    } catch (err) {
      onToast?.(`Disconnect failed: ${err instanceof Error ? err.message : "Error"}`);
    }
  };

  return (
    <div className="space-y-6 font-sans text-xs max-w-2xl pb-12">
      {/* ── Search & Filter Controls ─────────────────────────── */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c887f] dark:text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connections by name, description, or capability..."
            className="w-full pl-9 pr-8 py-2.5 bg-[#f4efe6] dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 rounded-2xl text-xs text-[#1c1b18] dark:text-white placeholder-[#8c887f] dark:placeholder-white/40 focus:outline-none focus:border-[#1c1b18]/40 dark:focus:border-white/25 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all shadow-inner font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c887f] hover:text-[#1c1b18] dark:text-white/40 dark:hover:text-white transition cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          {categories.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl capitalize transition cursor-pointer font-medium ${
                  isSelected
                    ? "bg-[#1c1b18] text-white shadow-xs dark:bg-white dark:text-[#1c1b18]"
                    : "bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 text-[#706c64] dark:text-white/70 hover:bg-[#ede8df] dark:hover:bg-white/10"
                }`}
              >
                {cat === "all" ? "All Categories" : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Connected Apps Section ──────────────────────────── */}
      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Couldn't load your connections: {loadError}</span>
        </div>
      )}
      {connectedProviders.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#8c887f] dark:text-white/50 uppercase tracking-wider px-1">
            <span>Connected Apps ({connectedProviders.length})</span>
          </div>

          <div className="space-y-3">
            {connectedProviders.map((prov) => {
              const accounts = connectedAccountsByProvider.get(prov.id.toLowerCase()) || [];
              return (
                <div
                  key={prov.id}
                  className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 p-4 shadow-sm flex items-center justify-between gap-4 transition hover:border-[#d6d0c4] dark:hover:border-white/20"
                >
                  <div
                    onClick={() => setSelectedApp(prov)}
                    className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                  >
                    <ProviderIconBadge id={prov.id} name={prov.name} brandColor={prov.brandColor} />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1c1b18] dark:text-white">{prov.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/80 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                          Connected
                        </span>
                      </div>
                      <div className="text-[11px] text-[#706c64] dark:text-white/60 truncate mt-0.5">
                        {accounts.length === 1
                          ? accounts[0].label || accounts[0].accountUsername
                          : `${accounts.length} accounts connected`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleConnect(prov)}
                      className="grid h-8 w-8 place-items-center rounded-xl bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 text-[#706c64] hover:text-[#1c1b18] dark:text-white/60 dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 transition cursor-pointer shadow-xs"
                      title="Add another account"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedApp(prov)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 text-[#1c1b18] dark:text-white text-xs font-semibold hover:bg-[#ede8df] dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <span>Manage</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Discover Apps Section ───────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#8c887f] dark:text-white/50 uppercase tracking-wider px-1">
          <span>Discover Connections ({discoverProviders.length})</span>
        </div>

        {discoverProviders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e8e4db] dark:border-white/10 p-8 text-center text-[#8c887f] dark:text-white/40">
            No connections found matching your search.
          </div>
        ) : (
          <div className="space-y-3">
            {discoverProviders.map((prov) => {
              const isConnecting = connectingSlug === prov.id;
              return (
                <div
                  key={prov.id}
                  className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 p-4 shadow-sm flex items-center justify-between gap-4 transition hover:border-[#d6d0c4] dark:hover:border-white/20 group"
                >
                  <div
                    onClick={() => setSelectedApp(prov)}
                    className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                  >
                    <ProviderIconBadge id={prov.id} name={prov.name} brandColor={prov.brandColor} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1c1b18] dark:text-white">{prov.name}</span>
                        <span className="text-[10px] text-[#706c64] dark:text-white/60 px-2 py-0.5 rounded-md bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 font-medium">
                          {prov.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#706c64] dark:text-white/60 line-clamp-1 mt-0.5 leading-relaxed">
                        {prov.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isConnecting}
                      onClick={() => handleConnect(prov)}
                      className="px-4 py-2 rounded-xl bg-[#1c1b18] dark:bg-white text-white dark:text-[#1c1b18] text-xs font-semibold hover:bg-black dark:hover:bg-white/90 transition cursor-pointer shadow-xs active:scale-[0.98] flex items-center gap-1.5"
                    >
                      {isConnecting && <Loader2 size={12} className="animate-spin" />}
                      <span>{prov.status === "coming_soon" ? "Coming soon" : "Connect"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── App Details Slide-Over / Modal ─────────────────── */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-lg rounded-3xl border border-[#e8e4db] bg-white dark:bg-[#12141a] dark:border-white/10 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-100 font-sans">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <ProviderIconBadge id={selectedApp.id} name={selectedApp.name} brandColor={selectedApp.brandColor} />
                <div>
                  <h3 className="font-bold text-base text-[#1c1b18] dark:text-white">{selectedApp.name}</h3>
                  <div className="text-xs text-[#706c64] dark:text-white/60 font-medium">{selectedApp.category}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="grid h-8 w-8 place-items-center rounded-xl bg-[#ede8df] text-[#706c64] hover:bg-[#e4ded3] hover:text-[#1c1b18] transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-xs text-[#706c64] dark:text-white/70 leading-relaxed">{selectedApp.description}</p>

            {/* Translated Permissions */}
            <div className="space-y-2 p-4 rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10">
              <div className="font-bold text-xs text-[#1c1b18] dark:text-white flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>What Noska can access:</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[#706c64] dark:text-white/70 list-disc list-inside">
                {selectedApp.permissions.map((perm, idx) => (
                  <li key={idx}>{perm}</li>
                ))}
              </ul>
            </div>

            {/* Connected Accounts List */}
            {connectedAccountsByProvider.has(selectedApp.id.toLowerCase()) && (
              <div className="space-y-2">
                <div className="font-bold text-xs text-[#1c1b18] dark:text-white">Connected Accounts:</div>
                <div className="space-y-2">
                  {connectedAccountsByProvider.get(selectedApp.id.toLowerCase())?.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3 rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-[#181b24] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <User size={13} className="text-[#8c887f] shrink-0" />
                        <span className="font-semibold text-[#1c1b18] dark:text-white truncate">{acc.label}</span>
                        {acc.tokenHint && (
                          <span className="text-[10px] text-[#8c887f] dark:text-white/50 font-mono">····{acc.tokenHint}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDisconnect(acc.id, acc.label)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                        title="Disconnect account"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#e8e4db] dark:border-white/10">
              {selectedApp.websiteUrl ? (
                <button
                  type="button"
                  onClick={() => openExternal(selectedApp.websiteUrl!)}
                  className="flex items-center gap-1 text-xs font-medium text-[#706c64] hover:text-[#1c1b18] dark:text-white/60 dark:hover:text-white transition cursor-pointer"
                >
                  <span>Provider website</span>
                  <ArrowUpRight size={12} />
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleConnect(selectedApp)}
                  className="px-4 py-2 rounded-xl bg-[#1c1b18] dark:bg-white text-white dark:text-[#1c1b18] text-xs font-semibold hover:bg-black dark:hover:bg-white/90 transition cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  {connectedAccountsByProvider.has(selectedApp.id.toLowerCase())
                    ? "Connect Another Account"
                    : "Connect"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual Token Modal ─────────────────────────────── */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-md rounded-3xl border border-[#e8e4db] bg-white dark:bg-[#12141a] dark:border-white/10 p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1c1b18] dark:text-white">Connect to {showTokenModal.name}</h3>
              <button
                type="button"
                onClick={() => setShowTokenModal(null)}
                className="grid h-7 w-7 place-items-center rounded-lg bg-[#ede8df] text-[#706c64] hover:bg-[#e4ded3] transition"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-[#706c64] dark:text-white/60 leading-relaxed">
              Paste your Personal Access Token (PAT) or API Key. Tokens are stored encrypted with AES-256 and never exposed.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-[#706c64] dark:text-white/60 mb-1">Account Label (Optional)</label>
                <input
                  type="text"
                  value={tokenLabel}
                  onChange={(e) => setTokenLabel(e.target.value)}
                  placeholder="e.g. Work GitHub / Personal"
                  className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-[#181b24] px-3.5 py-2 text-xs text-[#1c1b18] dark:text-white placeholder-[#a09c94] outline-none focus:border-[#1c1b18] dark:focus:border-white/40 transition font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#706c64] dark:text-white/60 mb-1">Token / API Key</label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste token..."
                  className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-[#181b24] px-3.5 py-2 text-xs font-mono text-[#1c1b18] dark:text-white placeholder-[#a09c94] outline-none focus:border-[#1c1b18] dark:focus:border-white/40 transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTokenModal(null)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#706c64] hover:text-[#1c1b18] dark:text-white/60 dark:hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualTokenSubmit}
                disabled={!tokenInput.trim()}
                className="px-4 py-2 rounded-xl bg-[#1c1b18] dark:bg-white text-white dark:text-[#1c1b18] text-xs font-semibold hover:bg-black dark:hover:bg-white/90 disabled:opacity-50 transition shadow-xs cursor-pointer active:scale-[0.98]"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
