import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plug,
  RefreshCw,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  KeyRound,
  ShieldCheck,
  Search,
  X,
  Sparkles,
  Check,
  Zap,
  SlidersHorizontal,
  Lock,
  ArrowUpRight,
  Layers,
  Info,
  ChevronLeft,
  ChevronRight,
  Globe,
  Sliders,
  CheckSquare,
  Eye,
  EyeOff,
  Tag,
} from "lucide-react";
import { BrandIcon, hasBrandIcon, normalizeBrandKey } from "../../components/BrandIcon";
import { IntegrationRegistry } from "../../lib/connections/registry";
import { openExternal } from "../../lib/desktop/links";
import { ecosystemManager } from "../../lib/connections/ecosystemManager";
import { InlineAction } from "../ui/inline-action";
import {
  ECOSYSTEM_REGISTRY,
  getEcosystemConnector,
  getAllEcosystemConnectors,
} from "../../lib/connections/ecosystemRegistry";
import type {
  EcosystemCategory,
  EcosystemConnectorDefinition,
  EcosystemConnection,
  ConnectionResourceItem,
  ConnectionAuthMode,
} from "../../lib/connections/types";
import {
  refreshIntegrationTools,
  getIntegrationToolDefinitions,
  getIntegrationSummary,
  subscribeIntegrationTools,
} from "../../ai/integrationTools";

// ── Categories List ─────────────────────────────────────────────
const CATEGORIES: EcosystemCategory[] = [
  "All",
  "Recommended",
  "Connected",
  "Workspace",
  "Communication",
  "Development",
  "Project Management",
  "Design",
  "Files",
  "Data",
  "Automation",
];

// ── Authentic Brand Logo Container ──────────────────────────────
function EcosystemLogo({ id, name, size = "md" }: { id: string; name?: string; size?: "sm" | "md" | "lg" }) {
  const brandKey = normalizeBrandKey(id, name);
  const sizeClasses =
    size === "sm"
      ? "h-8 w-8 rounded-xl text-xs"
      : size === "lg"
        ? "h-12 w-12 rounded-2xl text-base"
        : "h-11 w-11 rounded-2xl text-sm";
  const iconSizeClass = size === "sm" ? "h-4.5 w-4.5" : size === "lg" ? "h-7 w-7" : "h-6 w-6";

  if (!hasBrandIcon(id, name)) {
    return (
      <div
        className={`grid ${sizeClasses} shrink-0 place-items-center bg-[#ede8df] text-[#1c1b18] shadow-2xs border border-[#e8e4db]`}
      >
        <Plug className={iconSizeClass} />
      </div>
    );
  }

  const tileStyle = brandKey.includes("github")
    ? "bg-[#18181b] text-white ring-1 ring-black/10"
    : brandKey.includes("vercel")
      ? "bg-black text-white ring-1 ring-black/10"
      : brandKey.includes("mcp") || brandKey.includes("custom")
        ? "bg-[#1c1b18] text-[#fbf9f5] ring-1 ring-black/10"
        : "bg-white border border-[#e8e4db] text-[#1c1b18] shadow-2xs";

  return (
    <div className={`grid ${sizeClasses} shrink-0 place-items-center ${tileStyle}`}>
      <BrandIcon id={id} name={name} className={iconSizeClass} />
    </div>
  );
}

export default function IntegrationsSettings({ onToast }: { onToast?: (m: string) => void }) {
  const [connectors, setConnectors] = useState<EcosystemConnectorDefinition[]>([]);
  const [connections, setConnections] = useState<EcosystemConnection[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EcosystemCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedConnectorForManage, setSelectedConnectorForManage] = useState<EcosystemConnectorDefinition | null>(null);

  // Category bar scroll controls
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkCategoryScroll = useCallback(() => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    const el = categoryScrollRef.current;
    if (!el) return;
    checkCategoryScroll();
    el.addEventListener("scroll", checkCategoryScroll, { passive: true });
    window.addEventListener("resize", checkCategoryScroll);
    return () => {
      el.removeEventListener("scroll", checkCategoryScroll);
      window.removeEventListener("resize", checkCategoryScroll);
    };
  }, [checkCategoryScroll]);

  const scrollCategoryTrack = (direction: "left" | "right") => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const offset = direction === "left" ? -240 : 240;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };

  // Manual token dialog state
  const [tokenModalConnector, setTokenModalConnector] = useState<EcosystemConnectorDefinition | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenLabelInput, setTokenLabelInput] = useState("");
  const [serverUrlInput, setServerUrlInput] = useState("");
  const [showTokenSecret, setShowTokenSecret] = useState(false);
  const [isConnectingToken, setIsConnectingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Modal active tab
  const [manageTab, setManageTab] = useState<"services" | "resources" | "permissions" | "danger">("services");
  const [resourceSearch, setResourceSearch] = useState("");
  const [isSyncingResources, setIsSyncingResources] = useState(false);

  // Escape key closes modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (tokenModalConnector) {
          setTokenModalConnector(null);
          setTokenError(null);
        } else if (selectedConnectorForManage) {
          setSelectedConnectorForManage(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tokenModalConnector, selectedConnectorForManage]);

  // Tool summary state
  const [toolCount, setToolCount] = useState(0);

  // Ecosystem ids whose connector has no live gateway catalog row yet
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);

  // Reload connections and connectors
  const reloadData = useCallback(async () => {
    try {
      const allDefs = ecosystemManager.getAllDefinitions();
      setConnectors(allDefs);
      await ecosystemManager.refreshCatalog();
      const conns = await ecosystemManager.refreshConnections();
      setConnections(conns);
      setUnavailableIds(allDefs.filter((d) => !ecosystemManager.isProviderConnectable(d.id)).map((d) => d.id));
      await refreshIntegrationTools(true);
      const summary = getIntegrationSummary();
      setToolCount(summary.toolCount);
    } catch (err) {
      console.warn("Error refreshing ecosystem connections:", err);
    }
  }, []);

  // The gateway's OAuth callback redirects back into the app with
  // ?connector=<slug>&status=connected|error[&message=…]. Surface the
  // result once and clean the URL so a refresh doesn't re-toast.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const status = params.get("status");
      const connector = params.get("connector");
      const message = params.get("message");
      if (!status) return;
      params.delete("status");
      params.delete("connector");
      params.delete("message");
      const qs = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
      if (status === "connected") {
        onToast?.(`${connector ? `${connector} ` : ""}connected — its tools are now available to AI agents.`);
      } else {
        onToast?.(`Connection failed${message ? `: ${message}` : "."}`);
      }
      void reloadData();
    } catch {
      // URL parsing must never break the settings surface
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    reloadData().finally(() => {
      setLoading(false);
      setTimeout(checkCategoryScroll, 100);
    });

    const unsubscribeEcosystem = ecosystemManager.subscribe(() => {
      setConnections(
        ecosystemManager.getAllDefinitions().map((d) => ecosystemManager.getConnection(d.id)).filter(Boolean) as EcosystemConnection[]
      );
    });

    const unsubscribeTools = subscribeIntegrationTools(() => {
      const summary = getIntegrationSummary();
      setToolCount(summary.toolCount);
    });

    return () => {
      unsubscribeEcosystem();
      unsubscribeTools();
    };
  }, [reloadData, checkCategoryScroll]);

  // Connect via OAuth
  const handleOAuthConnect = async (connector: EcosystemConnectorDefinition) => {
    try {
      await ecosystemManager.connectEcosystem(connector.id, "oauth");
      onToast?.(`Finish connecting ${connector.name} in the browser window that just opened.`);
    } catch (err: any) {
      onToast?.(`Could not start connect flow: ${err?.message || err}`);
    }
  };

  // Connect via Manual Token / API Key
  const handleTokenConnect = async () => {
    if (!tokenModalConnector) return;
    const isCustomMcp = tokenModalConnector.id === "custom-mcp";
    if (!tokenInput.trim() && !isCustomMcp) {
      setTokenError("Please enter a valid token or key.");
      return;
    }
    setIsConnectingToken(true);
    setTokenError(null);
    try {
      await ecosystemManager.connectEcosystem(tokenModalConnector.id, "token", {
        token: tokenInput.trim(),
        label: tokenLabelInput.trim() || undefined,
        serverUrl: serverUrlInput.trim() || undefined,
      });
      onToast?.(`Connected to ${tokenModalConnector.name}!`);
      setTokenModalConnector(null);
      setTokenInput("");
      setTokenLabelInput("");
      setServerUrlInput("");
      await reloadData();
    } catch (err: any) {
      setTokenError(err?.message || "Failed to authenticate with token.");
    } finally {
      setIsConnectingToken(false);
    }
  };

  // Disconnect
  const handleDisconnect = async (connectorId: string, name: string) => {
    if (!window.confirm(`Disconnect ${name}? This will revoke access and remove its tools for AI agents.`)) {
      return;
    }
    try {
      await ecosystemManager.disconnectEcosystem(connectorId);
      await refreshIntegrationTools(true);
      onToast?.(`Disconnected ${name}`);
      if (selectedConnectorForManage?.id === connectorId) {
        setSelectedConnectorForManage(null);
      }
      await reloadData();
    } catch (err: any) {
      onToast?.(`Failed to disconnect: ${err?.message || err}`);
    }
  };

  // Sync resources on-demand (zero interval polling)
  const handleSyncResources = async (providerId: string) => {
    setIsSyncingResources(true);
    try {
      const { discoveredCount } = await ecosystemManager.syncResources(providerId);
      onToast?.(
        discoveredCount > 0
          ? `Synced — ${discoveredCount} resource${discoveredCount === 1 ? "" : "s"} discovered.`
          : "Synced — connection healthy. This server doesn't expose MCP resources, so Services govern its tools."
      );
    } catch (err: any) {
      onToast?.(`Resource sync: ${err?.message || "Using cached items"}`);
    } finally {
      setIsSyncingResources(false);
    }
  };

  // Filter connectors
  const filteredConnectors = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return connectors.filter((c) => {
      // Category filter
      if (selectedCategory === "Recommended") {
        if (!c.isRecommended) return false;
      } else if (selectedCategory === "Connected") {
        const conn = connections.find((co) => co.providerId === c.id);
        if (!conn || conn.status !== "connected") return false;
      } else if (selectedCategory !== "All") {
        const matchesMain = c.category === selectedCategory;
        const matchesSecondary = c.secondaryCategories?.includes(selectedCategory);
        if (!matchesMain && !matchesSecondary) return false;
      }

      // Search query filter: check connector name, slug, description, and child services
      if (!query) return true;
      const matchesName = c.name.toLowerCase().includes(query);
      const matchesSlug = c.slug.toLowerCase().includes(query);
      const matchesDesc = c.description.toLowerCase().includes(query);
      const matchesTagline = c.tagline.toLowerCase().includes(query);
      const matchesService = c.services.some(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query)
      );

      return matchesName || matchesSlug || matchesDesc || matchesTagline || matchesService;
    });
  }, [connectors, connections, selectedCategory, searchQuery]);

  // Connected counts
  const connectedEcosystemsCount = useMemo(() => {
    return connections.filter((c) => c.status === "connected").length;
  }, [connections]);

  const activeServicesCount = useMemo(() => {
    let count = 0;
    for (const c of connections) {
      if (c.status !== "connected") continue;
      for (const s of Object.values(c.services)) {
        if (s.enabled && s.status === "active") count++;
      }
    }
    return count;
  }, [connections]);

  return (
    <div className="space-y-4 text-[#1c1b18] font-sans">
      {/* ── Toolbar: Search & Live Stats ────────────────────────── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input with sleek styling */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8a29e]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ecosystems or child services (Gmail, Jira, Drive, Outlook, Sheets)..."
            className="w-full rounded-2xl border border-[#e8e4db] bg-white py-2.5 pl-10 pr-9 text-xs text-[#1c1b18] placeholder-[#a8a29e] shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#1c1b18] focus:outline-none focus:ring-2 focus:ring-[#1c1b18]/10 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#a8a29e] hover:bg-[#ede8df] hover:text-[#1c1b18] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Live status badge & sync action */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <div className="flex items-center gap-3 rounded-2xl border border-[#e8e4db] bg-white px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] text-[11px] font-medium text-[#57534e]">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>
                <strong className="text-[#1c1b18]">{connectedEcosystemsCount}</strong> Connected
              </span>
            </div>
            <div className="h-2.5 w-px bg-[#e8e4db]" />
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-600" />
              <span>
                <strong className="text-[#1c1b18]">{toolCount}</strong> Tools
              </span>
            </div>
          </div>

          <InlineAction
            size="sm"
            label="Ecosystems"
            icon={<RefreshCw size={13} className={isRefreshing ? "animate-spin text-purple-600" : ""} />}
            actionText="Sync"
            onAction={async () => {
              setIsRefreshing(true);
              await reloadData();
              setIsRefreshing(false);
              onToast?.("Refreshed connections and tool catalog.");
            }}
            className="px-0 w-auto shrink-0"
          />
        </div>
      </div>

      {/* ── Segmented Category Filter Track with Beside < and > Scroll Controls ─ */}
      <div className="flex items-center gap-2">
        {/* Left Arrow Button (<) Beside the bar */}
        <button
          type="button"
          onClick={() => scrollCategoryTrack("left")}
          disabled={!canScrollLeft}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e8e4db] bg-white shadow-2xs transition-all duration-150 ${
            canScrollLeft
              ? "hover:bg-[#f4efe6] hover:border-[#d8d3c5] active:scale-90 cursor-pointer text-[#1c1b18]"
              : "opacity-40 cursor-not-allowed text-[#a8a29e] border-[#eeeae1] bg-[#fbf9f5]"
          }`}
          title="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Center Category Track */}
        <div className="relative flex-1 overflow-hidden rounded-2xl bg-[#f4efe6] p-1 shadow-inner">
          <div
            ref={categoryScrollRef}
            className="flex items-center gap-1 overflow-x-auto scrollbar-none scroll-smooth px-0.5"
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setTimeout(checkCategoryScroll, 100);
                  }}
                  className={`relative whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer ${
                    active ? "text-[#1c1b18] font-semibold" : "text-[#78716c] hover:text-[#1c1b18] hover:bg-white/40"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeCategoryPill"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="absolute inset-0 rounded-xl bg-white shadow-xs"
                    />
                  )}
                  <span className="relative z-10">{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Arrow Button (>) Beside the bar */}
        <button
          type="button"
          onClick={() => scrollCategoryTrack("right")}
          disabled={!canScrollRight}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e8e4db] bg-white shadow-2xs transition-all duration-150 ${
            canScrollRight
              ? "hover:bg-[#f4efe6] hover:border-[#d8d3c5] active:scale-90 cursor-pointer text-[#1c1b18]"
              : "opacity-40 cursor-not-allowed text-[#a8a29e] border-[#eeeae1] bg-[#fbf9f5]"
          }`}
          title="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Modern Ecosystem Cards Grid (Responsive 3-Column) ───── */}
      {loading ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2.5 text-[#78716c]">
          <Loader2 className="h-5 w-5 animate-spin text-[#1c1b18]" />
          <p className="text-xs">Loading ecosystem connectors...</p>
        </div>
      ) : filteredConnectors.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-[#e8e4db] bg-white/60 p-6 text-center">
          <Plug className="h-7 w-7 text-[#a8a29e] mb-2" />
          <h3 className="font-serif text-sm font-medium text-[#1c1b18]">No ecosystems found</h3>
          <p className="mt-0.5 text-xs text-[#78716c]">
            No connectors matched &quot;{searchQuery}&quot; in &quot;{selectedCategory}&quot;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
            }}
            className="mt-3 rounded-xl bg-[#ede8df] px-3 py-1.5 text-xs font-medium text-[#1c1b18] hover:bg-[#e3ded4] transition-all cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredConnectors.map((connector) => {
            const conn = connections.find((co) => co.providerId === connector.id);
            const isConnected = conn && conn.status === "connected";
            const isConnecting = conn && conn.status === "connecting";
            const isUnavailable = unavailableIds.includes(connector.id);
            const supportsToken = connector.authModes.includes("token") || connector.authModes.includes("api_key");
            const supportsOAuth = connector.authModes.includes("oauth");
            const enabledServicesCount = conn
              ? Object.values(conn.services).filter((s) => s.enabled && s.status === "active").length
              : 0;

            const openTokenModal = () => {
              setTokenModalConnector(connector);
              setTokenInput("");
              setTokenLabelInput("");
              setServerUrlInput("");
              setTokenError(null);
            };

            return (
              <div
                key={connector.id}
                className={`group relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] ${
                  isConnected
                    ? "border-[#d8d3c5] bg-white shadow-xs ring-1 ring-[#e8e4db]"
                    : "border-[#e8e4db] bg-white hover:border-[#d4cebe]"
                }`}
              >
                <div>
                  {/* Top Header: Logo + Title + Status */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <EcosystemLogo id={connector.id} name={connector.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-[#1c1b18] text-sm truncate">{connector.name}</h3>
                          {connector.isRecommended && (
                            <span className="rounded-full bg-amber-50 px-1.5 py-0.2 text-[9px] font-semibold text-amber-700 border border-amber-200/60 shrink-0">
                              Featured
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#78716c] truncate mt-0.5">{connector.tagline}</p>
                      </div>
                    </div>

                    {/* Connection status indicator */}
                    {isConnecting ? (
                      <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200 shrink-0">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        <span>Connecting…</span>
                      </div>
                    ) : isConnected ? (
                      <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>Connected</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Description */}
                  <p className="mt-2.5 text-xs text-[#57534e] line-clamp-2 leading-relaxed">
                    {connector.description}
                  </p>

                  {/* Included Services Section */}
                  <div className="mt-3.5 pt-2.5 border-t border-[#f4efe6]">
                    <div className="flex items-center justify-between text-[10px] font-medium text-[#78716c] mb-1.5">
                      <span className="uppercase tracking-wider text-[9px] text-[#a8a29e] font-semibold">
                        {connector.category}
                      </span>
                      {isConnected ? (
                        <span className="text-emerald-700 font-semibold text-[10px]">
                          {enabledServicesCount}/{connector.services.length} active
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#a8a29e]">{connector.services.length} services</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {connector.services.slice(0, 4).map((service) => {
                        const isServiceActive = isConnected && conn?.services[service.id]?.enabled;
                        return (
                          <span
                            key={service.id}
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                              isServiceActive
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-semibold"
                                : "bg-[#f4efe6] text-[#78716c]"
                            }`}
                          >
                            <BrandIcon id={service.icon || service.id || connector.id} name={service.name || connector.name} className="h-2.5 w-2.5 shrink-0" />
                            <span>{service.name}</span>
                          </span>
                        );
                      })}
                      {connector.services.length > 4 && (
                        <span className="rounded-md bg-[#ede8df] px-1 py-0.5 text-[9px] font-medium text-[#78716c]">
                          +{connector.services.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row */}
                <div className="mt-3.5 pt-3 border-t border-[#f4efe6] flex items-center justify-between gap-2">
                  {isConnected ? (
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="text-[10px] text-[#78716c] truncate max-w-[130px]">
                        {conn?.accountEmail || conn?.accountUsername || "Connected"}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConnectorForManage(connector);
                          setManageTab("services");
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-[#1c1b18] px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#33312e] active:scale-95 transition-all cursor-pointer"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        <span>Manage</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex w-full items-center justify-between gap-2">
                      {connector.websiteUrl ? (
                        <button
                          type="button"
                          onClick={() => openExternal(connector.websiteUrl!)}
                          className="text-[11px] font-medium text-[#78716c] hover:text-[#1c1b18] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>Docs</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-1.5">
                        {isUnavailable && !isConnected ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="flex items-center gap-1.5 rounded-xl bg-[#ede8df] px-3 py-1.5 text-xs font-medium text-[#a8a29e] cursor-not-allowed"
                              title="This connector isn't in your workspace's gateway catalog yet."
                            >
                              <Lock className="h-3 w-3" />
                              <span>Coming soon</span>
                            </span>
                          </div>
                        ) : supportsToken && !supportsOAuth ? (
                          <button
                            type="button"
                            onClick={openTokenModal}
                            className="flex items-center gap-1.5 rounded-xl bg-[#1c1b18] px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#33312e] active:scale-95 transition-all cursor-pointer"
                          >
                            <KeyRound className="h-3 w-3" />
                            <span>Connect Key</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOAuthConnect(connector)}
                              className="flex items-center gap-1.5 rounded-xl bg-[#1c1b18] px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#33312e] active:scale-95 transition-all cursor-pointer"
                            >
                              <Plug className="h-3 w-3" />
                              <span>Connect</span>
                            </button>
                            {supportsToken && (
                              <button
                                type="button"
                                onClick={openTokenModal}
                                title="Connect with a personal access token or API key instead"
                                className="flex items-center rounded-xl border border-[#e8e4db] bg-white p-1.5 text-[#57534e] shadow-xs hover:bg-[#f4efe6] active:scale-95 transition-all cursor-pointer"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── More Integrations (registry: defined, connectable soon) ─ */}
      {(() => {
        // Everything the ecosystem list already covers — def slugs/ids plus
        // their service ids (jira/confluence live under "atlassian") and
        // gateway slugs (drive/sheets live under "google-workspace") — so a
        // covered provider never ALSO renders as a "coming soon" duplicate.
        const catalogSlugs = new Set<string>();
        for (const c of connectors) {
          catalogSlugs.add((c.slug || c.id || "").toLowerCase());
          for (const s of c.services ?? []) catalogSlugs.add((s.id || "").toLowerCase());
          for (const g of (c as { gatewaySlugs?: string[] }).gatewaySlugs ?? []) {
            catalogSlugs.add(g.toLowerCase());
          }
        }
        // A provider is only "coming soon" when NEITHER the ecosystem list
        // (above) NOR the live gateway catalog has it — otherwise a live
        // gateway row (e.g. sentry, vercel) would render a stale Soon badge.
        const extras = IntegrationRegistry.getAll().filter(
          (p) =>
            !catalogSlugs.has(p.slug.toLowerCase()) &&
            !catalogSlugs.has(p.id.toLowerCase()) &&
            !ecosystemManager.isGatewaySlugLive(p.slug) &&
            !ecosystemManager.isGatewaySlugLive(p.id),
        );
        if (extras.length === 0) return null;
        return (
          <div className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-serif text-lg font-medium text-[#1c1b18]">More integrations</h2>
              <span className="text-[11px] text-[#78716c]">Defined in Noska — gateway connection coming soon</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {extras.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#e8e4db] bg-white/60 p-3.5 opacity-90"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#e8e4db] bg-white">
                    <BrandIcon id={p.slug || p.id} name={p.name} className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-[#1c1b18]">{p.name}</p>
                      <span className="shrink-0 rounded-full bg-[#ede8df] px-1.5 py-0.5 text-[9px] font-medium text-[#57534e]">
                        Soon
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-[#78716c]">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Manage Drawer / Modal ────────────────────────────────── */}
      {selectedConnectorForManage &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedConnectorForManage(null);
            }}
          >
            <div
              className="relative flex h-[82vh] max-h-[720px] w-full max-w-2xl flex-col rounded-3xl border border-[#e8e4db] bg-[#fbf9f5] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#e8e4db] bg-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <EcosystemLogo id={selectedConnectorForManage.id} name={selectedConnectorForManage.name} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-lg font-medium text-[#1c1b18]">
                        {selectedConnectorForManage.name}
                      </h2>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        Connected
                      </span>
                    </div>
                    <p className="text-[11px] text-[#78716c]">
                      Configure enabled services, selected resources, and scopes.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedConnectorForManage(null)}
                  className="rounded-full p-1.5 text-[#78716c] hover:bg-[#ede8df] hover:text-[#1c1b18] transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex items-center gap-1 border-b border-[#e8e4db] bg-[#fbf9f5] px-6 pt-2">
                {[
                  { id: "services", label: "Services", count: selectedConnectorForManage.services.length },
                  {
                    id: "resources",
                    label: "Resources",
                    count: ecosystemManager.getConnection(selectedConnectorForManage.id)?.resources.length || 0,
                  },
                  { id: "permissions", label: "Permissions" },
                  { id: "danger", label: "Settings" },
                ].map((tab) => {
                  const active = manageTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setManageTab(tab.id as any)}
                      className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
                        active
                          ? "border-[#1c1b18] text-[#1c1b18] font-semibold"
                          : "border-transparent text-[#78716c] hover:text-[#1c1b18]"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span className="rounded-full bg-[#ede8df] px-1.5 py-0.2 text-[9px] text-[#57534e]">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* ── TAB 1: Services Toggles ────────────────────────── */}
                {manageTab === "services" && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-amber-50/70 border border-amber-200/60 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                      <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold">Granular Service Control:</strong> Toggling a service off hides its capabilities from AI agents while keeping other services active.
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {selectedConnectorForManage.services.map((service) => {
                        const conn = ecosystemManager.getConnection(selectedConnectorForManage.id);
                        const isEnabled = conn?.services[service.id]?.enabled ?? service.defaultEnabled;

                        return (
                          <div
                            key={service.id}
                            className="flex items-start justify-between gap-3 rounded-2xl border border-[#e8e4db] bg-white p-3.5 shadow-xs"
                          >
                            <div className="flex items-start gap-3">
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#f4efe6] text-[#1c1b18]">
                                <BrandIcon id={service.icon || service.id || selectedConnectorForManage.id} name={service.name || selectedConnectorForManage.name} className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-semibold text-[#1c1b18]">{service.name}</h4>
                                  {isEnabled && (
                                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-700 border border-emerald-200/60">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-[11px] text-[#78716c]">{service.description}</p>

                                <div className="mt-2 flex flex-wrap gap-1">
                                  {service.toolNames.map((tn) => (
                                    <span
                                      key={tn}
                                      className="rounded bg-[#f4efe6] px-1.5 py-0.2 text-[9px] font-mono text-[#57534e]"
                                    >
                                      {tn}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Toggle switch */}
                            <button
                              type="button"
                              onClick={async () => {
                                await ecosystemManager.toggleService(
                                  selectedConnectorForManage.id,
                                  service.id,
                                  !isEnabled
                                );
                                await refreshIntegrationTools(true);
                              }}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isEnabled ? "bg-[#1c1b18]" : "bg-[#e8e4db]"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  isEnabled ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── TAB 2: Resources Selection ────────────────────── */}
                {manageTab === "resources" && (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-[#1c1b18]">Granular Resource Access</h4>
                        <p className="text-[11px] text-[#78716c]">
                          Select which repositories, drives, or calendars agents can inspect.
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            ecosystemManager.selectAllResources(selectedConnectorForManage.id, undefined, true)
                          }
                          className="rounded-xl border border-[#e8e4db] bg-white px-2 py-1 text-[11px] font-medium text-[#1c1b18] hover:bg-[#ede8df] cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            ecosystemManager.selectAllResources(selectedConnectorForManage.id, undefined, false)
                          }
                          className="rounded-xl border border-[#e8e4db] bg-white px-2 py-1 text-[11px] font-medium text-[#1c1b18] hover:bg-[#ede8df] cursor-pointer"
                        >
                          Deselect All
                        </button>
                        <InlineAction
                          size="sm"
                          label="Resources"
                          icon={<RefreshCw size={13} className={isSyncingResources ? "animate-spin text-purple-600" : ""} />}
                          actionText="Sync Now"
                          onAction={() => handleSyncResources(selectedConnectorForManage.id)}
                          className="px-0 w-auto shrink-0"
                        />
                      </div>
                    </div>

                    {/* Resource Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a8a29e]" />
                      <input
                        type="text"
                        value={resourceSearch}
                        onChange={(e) => setResourceSearch(e.target.value)}
                        placeholder="Filter resources by name..."
                        className="w-full rounded-xl border border-[#e8e4db] bg-white py-1.5 pl-9 pr-3 text-xs text-[#1c1b18] placeholder-[#a8a29e] focus:border-[#1c1b18] focus:outline-none"
                      />
                    </div>

                    {/* Resource Items List */}
                    {(() => {
                      const conn = ecosystemManager.getConnection(selectedConnectorForManage.id);
                      const allResources = conn?.resources || [];
                      const filtered = allResources.filter(
                        (r) =>
                          r.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
                          r.serviceId.toLowerCase().includes(resourceSearch.toLowerCase()) ||
                          r.resourceType.toLowerCase().includes(resourceSearch.toLowerCase())
                      );

                      if (filtered.length === 0) {
                        return (
                          <div className="rounded-2xl border border-dashed border-[#e8e4db] bg-white p-6 text-center">
                            <Layers className="h-5 w-5 mx-auto text-[#a8a29e] mb-2" />
                            <p className="text-xs font-medium text-[#1c1b18]">No resources discovered yet</p>
                            <p className="mt-1 text-[11px] text-[#78716c] leading-relaxed">
                              Use &quot;Sync Now&quot; to verify the connection and pull what it exposes. Until
                              resources are listed here, everything the connected account can reach is governed
                              by the Services toggles.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="divide-y divide-[#f4efe6] rounded-2xl border border-[#e8e4db] bg-white overflow-hidden">
                          {filtered.map((resource) => {
                            return (
                              <label
                                key={resource.id}
                                className="flex items-center justify-between p-3 hover:bg-[#fbf9f5] cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={resource.selected}
                                    onChange={(e) =>
                                      ecosystemManager.updateResourceSelection(
                                        selectedConnectorForManage.id,
                                        resource.id,
                                        e.target.checked
                                      )
                                    }
                                    className="h-3.5 w-3.5 rounded border-[#d8d3c5] text-[#1c1b18] focus:ring-[#1c1b18] cursor-pointer"
                                  />
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-medium text-[#1c1b18]">{resource.name}</span>
                                      <span className="rounded bg-[#f4efe6] px-1.5 py-0.2 text-[9px] text-[#78716c]">
                                        {resource.resourceType}
                                      </span>
                                    </div>
                                    {resource.parentName && (
                                      <span className="text-[10px] text-[#a8a29e]">{resource.parentName}</span>
                                    )}
                                  </div>
                                </div>

                                <span className="text-[10px] text-[#a8a29e]">
                                  {resource.lastSyncedAt
                                    ? `Synced ${new Date(resource.lastSyncedAt).toLocaleDateString()}`
                                    : "Cached"}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── TAB 3: Permissions & Scopes ──────────────────── */}
                {manageTab === "permissions" && (
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-white border border-[#e8e4db] p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1b18] mb-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <span>Security & Permissions</span>
                      </div>
                      <p className="text-[11px] text-[#78716c] leading-relaxed mb-3">
                        Tokens are encrypted at rest via AES-GCM. Noska strictly protects external access tokens.
                      </p>

                      <div className="space-y-2.5">
                        {selectedConnectorForManage.services.map((s) => (
                          <div key={s.id} className="rounded-xl bg-[#fbf9f5] p-3 border border-[#e8e4db]">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1c1b18]">
                              <BrandIcon id={s.icon || s.id || selectedConnectorForManage.id} name={s.name || selectedConnectorForManage.name} className="h-3.5 w-3.5" />
                              <span>{s.name}</span>
                            </div>
                            <div className="mt-2 space-y-1">
                              {s.permissions.map((p) => (
                                <div key={p.id} className="flex items-center justify-between text-[11px]">
                                  <span className="text-[#57534e]">{p.label}</span>
                                  <span
                                    className={`rounded px-1.5 py-0.2 text-[9px] font-medium uppercase ${
                                      p.type === "admin"
                                        ? "bg-rose-50 text-rose-700"
                                        : p.type === "write"
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-blue-50 text-blue-700"
                                    }`}
                                  >
                                    {p.type}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 4: Connection & Danger Zone ───────────────── */}
                {manageTab === "danger" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-white border border-[#e8e4db] p-4">
                      <h4 className="text-xs font-semibold text-[#1c1b18] mb-1">Re-authenticate Ecosystem</h4>
                      <p className="text-[11px] text-[#78716c] mb-3">
                        Refresh authorization tokens or request updated scopes.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOAuthConnect(selectedConnectorForManage)}
                        className="rounded-xl border border-[#e8e4db] bg-[#fbf9f5] px-3.5 py-1.5 text-xs font-medium text-[#1c1b18] hover:bg-[#ede8df] transition-all cursor-pointer"
                      >
                        Re-authorize with {selectedConnectorForManage.name}
                      </button>
                    </div>

                    <div className="rounded-2xl bg-rose-50/50 border border-rose-200/80 p-4">
                      <h4 className="text-xs font-semibold text-rose-900 mb-1">Disconnect Ecosystem</h4>
                      <p className="text-[11px] text-rose-700/90 mb-3">
                        Revokes access tokens and removes {selectedConnectorForManage.name} tools from AI agents.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          handleDisconnect(selectedConnectorForManage.id, selectedConnectorForManage.name)
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-rose-700 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Disconnect {selectedConnectorForManage.name}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Manual Token Connect Dialog ─────────────────────────── */}
      {tokenModalConnector &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setTokenModalConnector(null);
                setTokenError(null);
              }
            }}
          >
            <div
              className="relative w-full max-w-md rounded-2xl border border-[#e8e4db] bg-white p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#e8e4db]">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <EcosystemLogo id={tokenModalConnector.id} name={tokenModalConnector.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base font-semibold text-[#1c1b18] truncate">
                      Connect {tokenModalConnector.name}
                    </h3>
                    <p className="text-xs text-[#78716c] truncate mt-0.5">
                      {tokenModalConnector.id === "custom-mcp"
                        ? "Connect a remote Model Context Protocol server"
                        : "Provide a Personal Access Token or API Key"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTokenModalConnector(null);
                    setTokenError(null);
                  }}
                  className="rounded-lg p-1.5 text-[#78716c] hover:bg-[#ede8df] hover:text-[#1c1b18] transition-colors cursor-pointer shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form - Fully fitted, zero scroll */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTokenConnect();
                }}
                className="mt-4 space-y-3.5"
              >
                {tokenModalConnector.id === "custom-mcp" && (
                  <div>
                    <label className="block text-xs font-medium text-[#1c1b18] mb-1">
                      Server Endpoint URL <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Globe className="absolute left-3 h-3.5 w-3.5 text-[#a8a29e]" />
                      <input
                        type="url"
                        required
                        autoFocus
                        value={serverUrlInput}
                        onChange={(e) => setServerUrlInput(e.target.value)}
                        placeholder="https://mcp.yourdomain.com/sse"
                        className="w-full rounded-xl border border-[#e8e4db] bg-[#fbf9f5] pl-9 pr-3 py-2 text-xs text-[#1c1b18] placeholder-[#a8a29e] focus:border-[#1c1b18] focus:bg-white focus:ring-2 focus:ring-[#1c1b18]/10 focus:outline-none transition-all"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#78716c]">
                      HTTPS endpoint exposing MCP tools via Server-Sent Events or Stream.
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#1c1b18]">
                      {tokenModalConnector.id === "custom-mcp" ? "Bearer Token (optional for open servers)" : "API Token / Key"}{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    {tokenModalConnector.docsUrl && (
                      <button
                        type="button"
                        onClick={() => openExternal(tokenModalConnector.docsUrl!)}
                        className="text-[11px] font-medium text-[#78716c] hover:text-[#1c1b18] flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Docs</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <KeyRound className="absolute left-3 h-3.5 w-3.5 text-[#a8a29e]" />
                    <input
                      type={showTokenSecret ? "text" : "password"}
                      required={tokenModalConnector.id !== "custom-mcp"}
                      autoFocus={tokenModalConnector.id !== "custom-mcp"}
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Paste token or API key..."
                      className="w-full rounded-xl border border-[#e8e4db] bg-[#fbf9f5] pl-9 pr-10 py-2 text-xs text-[#1c1b18] placeholder-[#a8a29e] focus:border-[#1c1b18] focus:bg-white focus:ring-2 focus:ring-[#1c1b18]/10 focus:outline-none transition-all font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTokenSecret(!showTokenSecret)}
                      className="absolute right-2.5 p-1 text-[#a8a29e] hover:text-[#1c1b18] cursor-pointer rounded-lg hover:bg-[#ede8df]/60"
                      tabIndex={-1}
                    >
                      {showTokenSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1c1b18] mb-1">
                    Account Label <span className="text-[#a8a29e] font-normal">(Optional)</span>
                  </label>
                  <div className="relative flex items-center">
                    <Tag className="absolute left-3 h-3.5 w-3.5 text-[#a8a29e]" />
                    <input
                      type="text"
                      value={tokenLabelInput}
                      onChange={(e) => setTokenLabelInput(e.target.value)}
                      placeholder="e.g., Personal / Work / Staging"
                      className="w-full rounded-xl border border-[#e8e4db] bg-[#fbf9f5] pl-9 pr-3 py-2 text-xs text-[#1c1b18] placeholder-[#a8a29e] focus:border-[#1c1b18] focus:bg-white focus:ring-2 focus:ring-[#1c1b18]/10 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {tokenError && (
                  <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 border border-rose-200/80 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{tokenError}</span>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#e8e4db]">
                  <button
                    type="button"
                    onClick={() => {
                      setTokenModalConnector(null);
                      setTokenError(null);
                    }}
                    className="rounded-xl px-3.5 py-1.5 text-xs font-medium text-[#78716c] hover:bg-[#ede8df] hover:text-[#1c1b18] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConnectingToken}
                    className="flex items-center gap-1.5 rounded-xl bg-[#1c1b18] px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#33312e] active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isConnectingToken ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Save Connection</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
