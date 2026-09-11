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
  const s = (id || name || "").toLowerCase();

  // GitHub
  if (s.includes("github")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#18181b] text-white shadow-xs">
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      </div>
    );
  }

  // Notion
  if (s.includes("notion")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white border border-[#e8e4db] shadow-xs text-[#1c1b18]">
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l11.458-.84c1.12-.093 1.306-.467 1.026-1.027L18.15 1.13c-.373-.56-.933-.84-1.68-.747L3.992 1.408c-.746.094-.933.467-.653 1.027l1.12 1.773zm.933 3.64v13.533c0 .84.467 1.213 1.307 1.12l12.485-.933c.84-.094 1.12-.654 1.12-1.494V6.541c0-.84-.373-1.12-1.12-1.027l-12.485.933c-.747.094-1.307.56-1.307 1.399zm11.372 2.053c.093.467 0 .934-.373.934-.374 0-1.587-.84-2.8-.84-1.307 0-2.333.653-2.333 1.773 0 1.213 1.12 1.773 2.52 2.427 1.773.84 2.8 1.586 2.8 3.266 0 2.24-1.867 3.547-4.107 3.547-1.493 0-2.8-.56-3.453-1.027-.373-.28-.28-.84.093-.933.373-.094 1.587.747 3.08.747 1.493 0 2.52-.747 2.52-2.053 0-1.214-1.027-1.774-2.427-2.334-1.773-.746-2.893-1.586-2.893-3.266 0-2.054 1.773-3.36 3.827-3.36 1.306 0 2.52.466 3.173.84.28.187.373.467.373.747z" />
        </svg>
      </div>
    );
  }

  // Gmail / Google Mail
  if (s.includes("gmail") || s.includes("mail")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white border border-[#e8e4db] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v.4l10 6.25 10-6.25V6z"/>
          <path fill="#EA4335" d="M22 6.4L12 12.65 2 6.4V18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6.4z"/>
          <path fill="#FBBC05" d="M20 4h-3.5L12 9.5 7.5 4H4c-1.1 0-2 .9-2 2v2.5L12 15l10-6.5V6c0-1.1-.9-2-2-2z"/>
          <path fill="#34A853" d="M2 18V8.5L6.5 12 2 15.5V18z"/>
        </svg>
      </div>
    );
  }

  // Google Calendar
  if (s.includes("calendar")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white border border-[#e8e4db] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="17" rx="3" fill="#FFFFFF" stroke="#4285F4" strokeWidth="2"/>
          <rect x="3" y="4" width="18" height="5" fill="#4285F4"/>
          <circle cx="8" cy="3" r="1.5" fill="#EA4335"/>
          <circle cx="16" cy="3" r="1.5" fill="#34A853"/>
          <text x="12" y="17" fill="#1A73E8" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">31</text>
        </svg>
      </div>
    );
  }

  // Google Drive / Docs / Sheets
  if (s.includes("drive") || s.includes("gdrive") || s.includes("docs")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white border border-[#e8e4db] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#FFC107" d="M8.01 4L2 14.5l3.87 6.5h6.02L5.88 10.5z" />
          <path fill="#0066DA" d="M15.99 4H8.01L14.03 14.5h7.97z" />
          <path fill="#00AC47" d="M22 14.5L18.13 21H5.87L9.74 14.5z" />
        </svg>
      </div>
    );
  }

  // Slack
  if (s.includes("slack")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white border border-[#e8e4db] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
          <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
          <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
          <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
        </svg>
      </div>
    );
  }

  // Linear
  if (s.includes("linear")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#5e6ad2] text-white shadow-xs">
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M2.5 12a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0zm9.5-6.5a6.5 6.5 0 1 0 6.5 6.5A6.5 6.5 0 0 0 12 5.5z" />
        </svg>
      </div>
    );
  }

  // Figma
  if (s.includes("figma")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#1e1e1e] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#F24E1E" d="M8 2h4a4 4 0 0 1 4 4 4 4 0 0 1-4 4H8V2z"/>
          <path fill="#A259FF" d="M8 10h4a4 4 0 0 1 4 4 4 4 0 0 1-4 4H8v-8z"/>
          <path fill="#0ACF83" d="M8 18h4a4 4 0 0 1 0 4 4 4 0 0 1-4-4v0z"/>
          <path fill="#FF7262" d="M4 2h4v8H4a4 4 0 0 1-4-4 4 4 0 0 1 4-4z"/>
          <path fill="#1ABCFE" d="M4 10h4v8H4a4 4 0 0 1-4-4 4 4 0 0 1 4-4z"/>
        </svg>
      </div>
    );
  }

  // Jira / Atlassian
  if (s.includes("jira") || s.includes("atlassian")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white border border-[#e8e4db] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#2684FF" d="M11.53 2c0 5.26-4.27 9.53-9.53 9.53V2h9.53z" />
          <path fill="#0052CC" d="M12.47 2c0 5.26 4.27 9.53 9.53 9.53V2h-9.53z" />
          <path fill="#0052CC" d="M11.53 12.47c0 5.26-4.27 9.53-9.53 9.53v-9.53h9.53z" />
          <path fill="#2684FF" d="M12.47 12.47c0 5.26 4.27 9.53 9.53 9.53v-9.53h-9.53z" />
        </svg>
      </div>
    );
  }

  // GitLab
  if (s.includes("gitlab")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#292961]/10 border border-[#fc6d26]/20 shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#E24329" d="m12 21.05 3.7-11.38H8.3L12 21.05z" />
          <path fill="#FC6D26" d="M12 21.05 8.3 9.67H2.23L12 21.05z" />
          <path fill="#FCA326" d="m2.23 9.67-.85 2.62c-.17.52.01 1.1.46 1.42L12 21.05 2.23 9.67z" />
          <path fill="#E24329" d="M2.23 9.67h6.07L5.8 2.2a.57.57 0 0 0-1.09 0L2.23 9.67z" />
          <path fill="#FC6D26" d="M12 21.05l3.7-11.38h6.07L12 21.05z" />
          <path fill="#FCA326" d="m21.77 9.67.85 2.62c.17.52-.01 1.1-.46 1.42L12 21.05l9.77-11.38z" />
          <path fill="#E24329" d="M21.77 9.67h-6.07l2.5-7.47a.57.57 0 0 1 1.09 0l2.48 7.47z" />
        </svg>
      </div>
    );
  }

  // Discord
  if (s.includes("discord")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#5865f2] text-white shadow-xs">
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      </div>
    );
  }

  // Asana
  if (s.includes("asana")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#fff0f0] border border-[#f06a6a]/20 shadow-xs">
        <svg className="h-5 w-5 fill-[#F06A6A]" viewBox="0 0 24 24">
          <circle cx="12" cy="6.5" r="4" />
          <circle cx="6.5" cy="16" r="4" />
          <circle cx="17.5" cy="16" r="4" />
        </svg>
      </div>
    );
  }

  // Trello
  if (s.includes("trello")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0079bf] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <rect width="20" height="20" x="2" y="2" rx="4" fill="#0079BF"/>
          <rect width="4.5" height="11" x="5.5" y="5.5" rx="1.5" fill="#FFFFFF"/>
          <rect width="4.5" height="7" x="14" y="5.5" rx="1.5" fill="#FFFFFF"/>
        </svg>
      </div>
    );
  }

  // Dropbox
  if (s.includes("dropbox")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white border border-[#e8e4db] shadow-xs">
        <svg className="h-5 w-5 fill-[#0061FF]" viewBox="0 0 24 24">
          <path d="M6 3l6 4-6 4-6-4 6-4zm12 0l6 4-6 4-6-4 6-4zM0 11l6 4 6-4-6-4-6 4zm24 0l-6 4-6-4 6-4 6 4zm-12 5.5l-6-4-6 4 12 7.5 12-7.5-6-4-6 4z"/>
        </svg>
      </div>
    );
  }

  // Zendesk
  if (s.includes("zendesk")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#03363d] text-white shadow-xs">
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-5v-1.8l3.2-3.7H8V9.5h5v1.8l-3.2 3.7H13v1.5z"/>
        </svg>
      </div>
    );
  }

  // Supabase
  if (s.includes("supabase")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#1c1c1c] shadow-xs">
        <svg className="h-5 w-5 fill-[#3ECF8E]" viewBox="0 0 24 24">
          <path d="M13.3 2.1a1 1 0 0 0-1.6.8v7.6H3.5a1 1 0 0 0-.8 1.6l8.4 10.8a1 1 0 0 0 1.6-.8v-7.6h8.2a1 1 0 0 0 .8-1.6L13.3 2.1z"/>
        </svg>
      </div>
    );
  }

  // PostHog
  if (s.includes("posthog")) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#1d1f27] shadow-xs">
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#F54E00" d="M5 8h4v8H5zm5-3h4v14h-4zm5 6h4v5h-4z" />
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
