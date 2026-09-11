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
import { openExternal } from "../../lib/desktop/links";

function ProviderIconBadge({ id, name, brandColor }: { id: string; name: string; brandColor?: string }) {
  const s = id.toLowerCase();

  if (s.includes("github")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#18181b] text-white shadow-xs">
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      </div>
    );
  }

  if (s.includes("notion")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white border border-[#e8e4db] text-[#1c1b18] shadow-xs">
        <span className="font-serif text-lg font-black leading-none">N</span>
      </div>
    );
  }

  if (s.includes("jira") || s.includes("atlassian")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0052cc]/10 border border-[#0052cc]/20 text-[#0052cc] shadow-xs font-bold text-xs">
        JIRA
      </div>
    );
  }

  if (s.includes("slack")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#4a154b]/10 border border-[#4a154b]/20 text-[#4a154b] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
      </div>
    );
  }

  if (s.includes("linear")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 text-[#5e6ad2] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.5 12a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0zm9.5-6.5a6.5 6.5 0 1 0 6.5 6.5A6.5 6.5 0 0 0 12 5.5z" />
        </svg>
      </div>
    );
  }

  if (s.includes("figma")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#f24e1e]/10 border border-[#f24e1e]/20 text-[#f24e1e] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 2h4a4 4 0 0 1 4 4 4 4 0 0 1-4 4H8V2zm0 8h4a4 4 0 0 1 4 4 4 4 0 0 1-4 4H8v-8zm0 8h4a4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4zm0-16H4a4 4 0 0 0-4 4 4 4 0 0 0 4 4h4V2zm0 8H4a4 4 0 0 0-4 4 4 4 0 0 0 4 4h4v-8z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#ede8df] text-[#1c1b18] font-bold text-xs shadow-xs border border-[#e8e4db]">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function ConnectionsSettings({ onToast }: { onToast?: (m: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccountInfo[]>([]);
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
    } catch {
      // Ignored
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
