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
} from "lucide-react";
import { IntegrationRegistry } from "../../lib/connections/registry";
import { ConnectionsService } from "../../lib/connections/connectionsService";
import type {
  IntegrationProviderDefinition,
  ConnectedAccountInfo,
  ProviderCategory,
} from "../../lib/connections/types";
import { openExternal } from "../../lib/desktop/links";

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
    <div className="space-y-6 font-sans text-xs max-w-2xl">
      {/* Search and Category Filter Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connections by name, description, or capability..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--elevated)] text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
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
                className={`px-2.5 py-1 rounded-lg capitalize shrink-0 transition cursor-pointer ${
                  isSelected
                    ? "bg-[var(--accent)] text-white font-medium shadow-sm"
                    : "bg-[var(--elevated)] border border-[var(--border)]/70 text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
                }`}
              >
                {cat === "all" ? "All categories" : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Connected Apps Section */}
      {connectedProviders.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider px-1">
            <span>Connected Apps ({connectedProviders.length})</span>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--elevated)] divide-y divide-[var(--border)]/50 overflow-hidden shadow-sm">
            {connectedProviders.map((prov) => {
              const accounts = connectedAccountsByProvider.get(prov.id.toLowerCase()) || [];
              return (
                <div
                  key={prov.id}
                  className="p-3.5 hover:bg-[var(--hover)]/40 transition flex items-center justify-between gap-3"
                >
                  <div
                    onClick={() => setSelectedApp(prov)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg)] border border-[var(--border)]/80 flex items-center justify-center font-bold text-xs shrink-0 text-[var(--accent)]">
                      {prov.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[var(--text)]">{prov.name}</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          Connected
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--muted)] truncate mt-0.5">
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
                      className="p-1.5 rounded-lg hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
                      title="Add another account"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedApp(prov)}
                      className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--secondary)] hover:text-[var(--text)] text-xs font-medium transition cursor-pointer flex items-center gap-1"
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

      {/* Discover Apps Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider px-1">
          <span>Discover Connections ({discoverProviders.length})</span>
        </div>

        {discoverProviders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-[var(--muted)]">
            No connections found matching your search.
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--elevated)] divide-y divide-[var(--border)]/50 overflow-hidden shadow-sm">
            {discoverProviders.map((prov) => {
              const isConnecting = connectingSlug === prov.id;
              return (
                <div
                  key={prov.id}
                  className="p-3.5 hover:bg-[var(--hover)]/30 transition flex items-center justify-between gap-3 group"
                >
                  <div
                    onClick={() => setSelectedApp(prov)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg)] border border-[var(--border)]/80 flex items-center justify-center font-bold text-xs shrink-0 text-[var(--secondary)] group-hover:text-[var(--accent)] transition">
                      {prov.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[var(--text)]">{prov.name}</span>
                        <span className="text-[10px] text-[var(--muted)] px-1.5 py-0.2 rounded bg-[var(--bg)] border border-[var(--border)]/60">
                          {prov.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--muted)] line-clamp-1 mt-0.5">
                        {prov.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isConnecting}
                      onClick={() => handleConnect(prov)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-sm flex items-center gap-1.5"
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

      {/* App Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--elevated)] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-100 font-sans">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center font-bold text-sm text-[var(--accent)]">
                  {selectedApp.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[var(--text)]">{selectedApp.name}</h3>
                  <div className="text-xs text-[var(--muted)]">{selectedApp.category}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[var(--secondary)] leading-relaxed">{selectedApp.description}</p>

            {/* Translated Permissions */}
            <div className="space-y-2 p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)]/70">
              <div className="font-semibold text-[11px] text-[var(--text)] flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>What Noska can access:</span>
              </div>
              <ul className="space-y-1 text-xs text-[var(--secondary)] list-disc list-inside">
                {selectedApp.permissions.map((perm, idx) => (
                  <li key={idx}>{perm}</li>
                ))}
              </ul>
            </div>

            {/* Connected Accounts List */}
            {connectedAccountsByProvider.has(selectedApp.id.toLowerCase()) && (
              <div className="space-y-2">
                <div className="font-semibold text-[11px] text-[var(--text)]">Connected accounts:</div>
                <div className="space-y-1.5">
                  {connectedAccountsByProvider.get(selectedApp.id.toLowerCase())?.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <User size={13} className="text-[var(--muted)] shrink-0" />
                        <span className="font-medium text-[var(--text)] truncate">{acc.label}</span>
                        {acc.tokenHint && (
                          <span className="text-[10px] text-[var(--muted)] font-mono">{acc.tokenHint}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDisconnect(acc.id, acc.label)}
                        className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
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
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/60">
              {selectedApp.websiteUrl ? (
                <button
                  type="button"
                  onClick={() => openExternal(selectedApp.websiteUrl!)}
                  className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
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
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-sm"
                >
                  {connectedAccountsByProvider.has(selectedApp.id.toLowerCase())
                    ? "Connect another account"
                    : "Connect"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Token Connection Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--elevated)] p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[var(--text)]">Connect to {showTokenModal.name}</h3>
              <button
                type="button"
                onClick={() => setShowTokenModal(null)}
                className="p-1 text-[var(--muted)] hover:text-[var(--text)]"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-xs text-[var(--muted)]">
              Paste your Personal Access Token (PAT) or API Key. Tokens are AES-GCM encrypted and never exposed.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--secondary)] mb-1">Account Label (Optional)</label>
                <input
                  type="text"
                  value={tokenLabel}
                  onChange={(e) => setTokenLabel(e.target.value)}
                  placeholder="e.g. Work GitHub / Personal"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--secondary)] mb-1">Token / API Key</label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste token..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTokenModal(null)}
                className="px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs text-[var(--secondary)] hover:bg-[var(--hover)] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualTokenSubmit}
                disabled={!tokenInput.trim()}
                className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition"
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
