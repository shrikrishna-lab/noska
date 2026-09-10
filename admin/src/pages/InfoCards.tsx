import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/ui/KpiCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Eye,
  MousePointer,
  Radio,
  Layers,
  CheckCircle2,
  Moon,
  Sun,
  Copy,
  Search,
  Zap,
  RotateCcw,
  Clock,
  Calendar,
  AlertCircle,
  Ticket,
  Plane,
  Wallet,
  Gift,
  MoreVertical,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { supabase, SUPABASE_ENABLED, getAdminToken } from "@/lib/supabase";
import { adminSelect } from "@/lib/queries";
import { PromoTicketCard } from "@/components/ui/promo-ticket-card";
import { DynamicCapsuleCard } from "@/components/ui/dynamic-capsule-card";
import { BonusWalletCard } from "@/components/ui/bonus-wallet-card";

export interface InfoCardMediaItem {
  type?: "image" | "video";
  src: string;
  alt?: string;
}

export interface ManagedInfoCard {
  id: string;
  title: string;
  description: string;
  media: InfoCardMediaItem[];
  action_label?: string;
  action_url?: string;
  dismiss_type: "once" | "forever" | "snooze";
  snooze_days?: number;
  storage_key: string;
  target_audience: "all" | "desktop" | "web" | "pro";
  active: boolean;
  priority: number;
  duration_type?: "forever" | "scheduled";
  start_at?: string | null;
  end_at?: string | null;
  duration_label?: string;
  // Promotional program fields
  card_style?: "standard" | "ticket_voucher" | "dynamic_capsule" | "wallet_balance";
  voucher_tag?: string;
  bonus_value?: string;
  terms_text?: string;
  promo_code?: string;
  barcode_number?: string;
  theme_color?: "purple" | "coral" | "cyan" | "dark";
  route_from?: string;
  route_to?: string;
  route_from_label?: string;
  route_to_label?: string;
  eta_label?: string;
  timer_label?: string;
  slider_label?: string;
  accent_glow?: "lime" | "cyan" | "amber" | "rose";
  wallet_title?: string;
  wallet_balance?: string;
  recent_activity_title?: string;
  recent_activity_date?: string;
  recent_activity_amount?: string;
  impressions_count: number;
  clicks_count: number;
  dismisses_count: number;
  claims_count?: number;
  created_at: string;
}

const STORAGE_KEY = "noska_managed_info_cards";
const CHANNEL_NAME = "noska_info_cards_sync";

const INITIAL_CARDS: ManagedInfoCard[] = [
  {
    id: "noska-ai-assistant",
    title: "Noska AI Copilot",
    description: "Deep document search, contextual editing, and live workspace execution in one quiet interface.",
    media: [
      {
        src: "https://cdn.21st.dev/assets/mirror/a1/a12526ad6ce4aa3cac9d4f005480e4c2aa5a4d3cccf7b860ca68ebea82c4c157.webp",
        alt: "Noska AI Copilot Interface",
      },
      {
        src: "https://cdn.21st.dev/assets/mirror/90/908d2bed189c6957365043783152c6347defce5b15eccacf195507176306b08f.webp",
        alt: "Contextual AI Search",
      },
      {
        src: "https://cdn.21st.dev/assets/mirror/a2/a23cdd989b1a11901eb1275f59149b466783492dbde051a57e41382b5bd94896.webp",
        alt: "Realtime Generation",
      },
    ],
    action_label: "Try AI Copilot",
    action_url: "/dashboard",
    dismiss_type: "snooze",
    snooze_days: 7,
    duration_type: "forever",
    duration_label: "Always Active",
    storage_key: "noska_card_ai_copilot_v1",
    target_audience: "all",
    active: true,
    priority: 100,
    impressions_count: 0,
    clicks_count: 0,
    dismisses_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "noska-desktop-app",
    title: "Native Desktop App",
    description: "Download Noska for macOS, Windows & Linux with local offline encryption and instant search.",
    media: [
      {
        src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        alt: "Desktop App Native Architecture",
      },
      {
        src: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=600&auto=format&fit=crop&q=80",
        alt: "Offline Encrypted Engine",
      },
    ],
    action_label: "Download App",
    action_url: "/download",
    dismiss_type: "snooze",
    snooze_days: 14,
    duration_type: "forever",
    duration_label: "Always Active",
    storage_key: "noska_card_desktop_app_v1",
    target_audience: "web",
    active: false,
    priority: 90,
    impressions_count: 0,
    clicks_count: 0,
    dismisses_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "noska-public-roadmap",
    title: "Public Roadmap & Votes",
    description: "Explore upcoming features, submit requests, and vote directly on the development queue.",
    media: [
      {
        src: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&auto=format&fit=crop&q=80",
        alt: "Noska Roadmap Pipeline",
      },
    ],
    action_label: "View Roadmap",
    action_url: "/roadmap",
    dismiss_type: "forever",
    duration_type: "forever",
    duration_label: "Always Active",
    storage_key: "noska_card_public_roadmap_v1",
    target_audience: "all",
    active: false,
    priority: 80,
    impressions_count: 0,
    clicks_count: 0,
    dismisses_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "noska-pro-voucher-32",
    title: "Noska Pro Launch Voucher",
    description: "Unlock 32% discount on Noska Pro annual workspace plan.",
    media: [],
    card_style: "ticket_voucher",
    voucher_tag: "DISCOUNT",
    bonus_value: "32%",
    terms_text: "At selected outlets. Terms and conditions apply",
    promo_code: "NOSKA32",
    barcode_number: "1234567890",
    theme_color: "cyan",
    action_label: "Redeem",
    action_url: "/pricing",
    dismiss_type: "snooze",
    snooze_days: 7,
    duration_type: "forever",
    duration_label: "Always Active",
    storage_key: "noska_card_voucher_32",
    target_audience: "all",
    active: false,
    priority: 75,
    impressions_count: 0,
    clicks_count: 0,
    dismisses_count: 0,
    claims_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "noska-flight-capsule",
    title: "Early Adopter Flight Pass",
    description: "Instant upgrade to Noska Pro high-speed generation engine.",
    media: [],
    card_style: "dynamic_capsule",
    route_from: "YYZ",
    route_to: "HND",
    route_from_label: "Toronto",
    route_to_label: "Tokyo",
    eta_label: "ETA 2:15 PM",
    timer_label: "DINNER IN 2:34H",
    slider_label: "Slide to Claim Perk",
    accent_glow: "lime",
    action_label: "Claim Perk",
    action_url: "/dashboard",
    dismiss_type: "snooze",
    snooze_days: 7,
    duration_type: "forever",
    duration_label: "Always Active",
    storage_key: "noska_card_flight_capsule",
    target_audience: "all",
    active: false,
    priority: 70,
    impressions_count: 0,
    clicks_count: 0,
    dismisses_count: 0,
    claims_count: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "noska-rewards-wallet",
    title: "Noska Balance & Rewards",
    description: "Claim bonus referral credits and view member balance.",
    media: [],
    card_style: "wallet_balance",
    wallet_title: "YOUR BALANCE",
    wallet_balance: "$ 52,002.50",
    recent_activity_title: "Dribbble Pro",
    recent_activity_date: "Jan 17 • 20:12",
    recent_activity_amount: "$60.00",
    action_label: "Receive",
    action_url: "/dashboard",
    dismiss_type: "snooze",
    snooze_days: 7,
    duration_type: "forever",
    duration_label: "Always Active",
    storage_key: "noska_card_rewards_wallet",
    target_audience: "all",
    active: false,
    priority: 65,
    impressions_count: 0,
    clicks_count: 0,
    dismisses_count: 0,
    claims_count: 0,
    created_at: new Date().toISOString(),
  },
];

const PRESET_MEDIA = [
  {
    label: "Browser Screen 1",
    url: "https://cdn.21st.dev/assets/mirror/a1/a12526ad6ce4aa3cac9d4f005480e4c2aa5a4d3cccf7b860ca68ebea82c4c157.webp",
  },
  {
    label: "Browser Screen 2",
    url: "https://cdn.21st.dev/assets/mirror/90/908d2bed189c6957365043783152c6347defce5b15eccacf195507176306b08f.webp",
  },
  {
    label: "Browser Screen 3",
    url: "https://cdn.21st.dev/assets/mirror/a2/a23cdd989b1a11901eb1275f59149b466783492dbde051a57e41382b5bd94896.webp",
  },
  {
    label: "Sky Blue Wave",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
  },
  {
    label: "Flow Diagram",
    url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&auto=format&fit=crop&q=80",
  },
];

const DESTINATION_SHORTCUTS = [
  { label: "Workspace", value: "/dashboard" },
  { label: "Desktop App", value: "/download" },
  { label: "Roadmap", value: "/roadmap" },
  { label: "Pricing", value: "/pricing" },
  { label: "Docs", value: "/docs" },
  { label: "Changelog", value: "/new-updated" },
];

function getDurationStatus(card: ManagedInfoCard) {
  if (card.duration_type !== "scheduled" || (!card.start_at && !card.end_at)) {
    return { status: "always", label: "Always Active", color: "text-muted-foreground border-border" };
  }
  const now = Date.now();
  if (card.start_at && new Date(card.start_at).getTime() > now) {
    const diffHours = Math.ceil((new Date(card.start_at).getTime() - now) / (1000 * 60 * 60));
    const label = diffHours > 24 ? `Starts in ${Math.ceil(diffHours / 24)}d` : `Starts in ${diffHours}h`;
    return { status: "upcoming", label, color: "text-amber-500 border-amber-500/30 bg-amber-500/10" };
  }
  if (card.end_at) {
    const remainingMs = new Date(card.end_at).getTime() - now;
    if (remainingMs <= 0) {
      return { status: "expired", label: "Expired", color: "text-red-500 border-red-500/30 bg-red-500/10" };
    }
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const label = hours > 24 ? `Expires in ${Math.ceil(hours / 24)}d` : `Expires in ${hours}h`;
    return { status: "active", label, color: "text-sky-500 border-sky-500/30 bg-sky-500/10" };
  }
  return { status: "always", label: "Always Active", color: "text-muted-foreground border-border" };
}

async function syncCardsToDatabase(cardsToSave: ManagedInfoCard[]) {
  if (!SUPABASE_ENABLED || !supabase) return;
  try {
    const adminToken = getAdminToken();
    if (adminToken) {
      const existing = await adminSelect<any>("landing_content", "*", { eq: ["section", "sidebar_info_cards"] });
      if (existing && existing.length > 0) {
        await supabase.rpc("admin_update", {
          p_session_token: adminToken,
          p_table: "landing_content",
          p_id: existing[0].id,
          p_data: {
            content: { cards: cardsToSave },
            updated_at: new Date().toISOString(),
          },
          p_min_role: "marketing",
        });
      } else {
        await supabase.rpc("admin_insert", {
          p_session_token: adminToken,
          p_table: "landing_content",
          p_data: {
            section: "sidebar_info_cards",
            title: "Sidebar Info Cards",
            content: { cards: cardsToSave },
            active: true,
            sort_order: 99,
          },
          p_min_role: "marketing",
        });
      }
    }
  } catch (err) {
    console.warn("[InfoCards] Database sync notice:", err);
  }
}

export function InfoCardsPage() {
  const [cards, setCards] = useState<ManagedInfoCard[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasLegacyMock = parsed.some(
            (c: any) =>
              c.id === "default-new-dashboard" ||
              c.id === "ai-canvas-v2" ||
              c.id === "ai-assistant-v2" ||
              c.impressions_count === 1420 ||
              c.impressions_count === 890 ||
              c.impressions_count === 2310 ||
              c.title?.includes("New Dashboard") ||
              c.title?.includes("AI Canvas") ||
              c.description?.includes("New Feature. New Platform")
          );
          if (!hasLegacyMock) {
            const existingIds = new Set(parsed.map((c: any) => c.id));
            const missing = INITIAL_CARDS.filter((p) => !existingIds.has(p.id));
            if (missing.length > 0) {
              const merged = [...parsed, ...missing];
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              } catch {}
              return merged;
            }
            return parsed;
          }
        }
      }
    } catch {}
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CARDS));
    } catch {}
    return INITIAL_CARDS;
  });

  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel | null>(null);
  const [supabaseChannel, setSupabaseChannel] = useState<any>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "offline">("connecting");
  const [singleActiveMode, setSingleActiveMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"studio" | "library">("studio");
  const [selectedLibraryPreviewCard, setSelectedLibraryPreviewCard] = useState<ManagedInfoCard | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAudience, setFilterAudience] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [actionLabel, setActionLabel] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [dismissType, setDismissType] = useState<"once" | "forever" | "snooze">("snooze");
  const [snoozeDays, setSnoozeDays] = useState<number>(7);
  const [storageKey, setStorageKey] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "desktop" | "web" | "pro">("all");
  const [priority, setPriority] = useState<number>(100);
  const [active, setActive] = useState(true);
  const [mediaList, setMediaList] = useState<InfoCardMediaItem[]>([]);
  const [newMediaSrc, setNewMediaSrc] = useState("");

  // Duration & Scheduling State
  const [durationType, setDurationType] = useState<"forever" | "scheduled">("forever");
  const [durationPreset, setDurationPreset] = useState<string>("forever");
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");

  // Program & Bonus Customization States
  const [cardStyle, setCardStyle] = useState<"standard" | "ticket_voucher" | "dynamic_capsule" | "wallet_balance">("standard");
  // Ticket Voucher specifics (Image 1)
  const [voucherTag, setVoucherTag] = useState<string>("DISCOUNT");
  const [bonusValue, setBonusValue] = useState<string>("32%");
  const [termsText, setTermsText] = useState<string>("At selected outlets. Terms and conditions apply");
  const [promoCode, setPromoCode] = useState<string>("NOSKA32");
  const [barcodeNumber, setBarcodeNumber] = useState<string>("1234567890");
  const [themeColor, setThemeColor] = useState<"purple" | "coral" | "cyan" | "dark">("cyan");
  // Dynamic Capsule specifics (Image 2)
  const [routeFrom, setRouteFrom] = useState<string>("YYZ");
  const [routeTo, setRouteTo] = useState<string>("HND");
  const [routeFromLabel, setRouteFromLabel] = useState<string>("Toronto");
  const [routeToLabel, setRouteToLabel] = useState<string>("Tokyo");
  const [etaLabel, setEtaLabel] = useState<string>("ETA 2:15 PM");
  const [timerLabel, setTimerLabel] = useState<string>("DINNER IN 2:34H");
  const [sliderLabel, setSliderLabel] = useState<string>("-7H 01M");
  const [accentGlow, setAccentGlow] = useState<"lime" | "cyan" | "amber" | "rose">("lime");
  // Apple Wallet specifics (Image 3)
  const [walletTitle, setWalletTitle] = useState<string>("YOUR BALANCE");
  const [walletBalance, setWalletBalance] = useState<string>("$ 52,002.50");
  const [recentActivityTitle, setRecentActivityTitle] = useState<string>("Dribbble Pro");
  const [recentActivityDate, setRecentActivityDate] = useState<string>("Jan 17 • 20:12");
  const [recentActivityAmount, setRecentActivityAmount] = useState<string>("$60.00");

  // Preview Sandbox State
  const [previewHovered, setPreviewHovered] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<"dark" | "light">("dark");
  const [previewDismissed, setPreviewDismissed] = useState(false);

  // 1. Same-Origin BroadcastChannel setup
  useEffect(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const ch = new BroadcastChannel(CHANNEL_NAME);
        setBroadcastChannel(ch);
        ch.onmessage = (ev) => {
          if (ev.data?.type === "CARDS_UPDATED" && Array.isArray(ev.data.cards)) {
            setCards(ev.data.cards);
          }
        };
        return () => ch.close();
      } catch (e) {
        console.warn(e);
      }
    }
  }, []);

  // 2. Supabase Realtime WebSocket setup
  useEffect(() => {
    if (SUPABASE_ENABLED && supabase) {
      try {
        const ch = supabase.channel(CHANNEL_NAME, {
          config: { broadcast: { self: true } },
        });

        ch.on("broadcast", { event: "CARDS_UPDATED" }, (payload: any) => {
          const remoteCards = payload?.payload?.cards;
          if (Array.isArray(remoteCards) && remoteCards.length > 0) {
            const hasLegacyMock = remoteCards.some(
              (c: any) =>
                c.id === "default-new-dashboard" ||
                c.id === "ai-canvas-v2" ||
                c.id === "ai-assistant-v2" ||
                c.impressions_count === 1420 ||
                c.impressions_count === 890 ||
                c.impressions_count === 2310 ||
                c.title?.includes("New Dashboard") ||
                c.title?.includes("AI Canvas") ||
                c.description?.includes("New Feature. New Platform")
            );
            const safe = hasLegacyMock ? INITIAL_CARDS : remoteCards;
            setCards(safe);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
            } catch {}
          }
        });

        // Realtime live user metrics stream (views, clicks, dismisses)
        ch.on("broadcast", { event: "METRICS_UPDATED" }, (payload: any) => {
          const { cardId, metric } = payload?.payload || {};
          if (cardId && metric) {
            setCards((prev) => {
              const updated = prev.map((c) => {
                if (c.id === cardId) {
                  const key = `${metric}_count` as keyof ManagedInfoCard;
                  return {
                    ...c,
                    [key]: ((c[key] as number) || 0) + 1,
                  };
                }
                return c;
              });
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        });

        ch.subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            setRealtimeStatus("connected");
          } else if (status === "CHANNEL_ERROR") {
            setRealtimeStatus("offline");
          }
        });

        setSupabaseChannel(ch);

        return () => {
          ch.unsubscribe();
        };
      } catch (err) {
        console.warn("Supabase channel error:", err);
        setRealtimeStatus("offline");
      }
    } else {
      setRealtimeStatus("offline");
    }
  }, []);

  // 3. Hydrate latest cards from database landing_content table
  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return;
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("landing_content")
          .select("content")
          .eq("section", "sidebar_info_cards")
          .maybeSingle();

        if (isMounted && !error && data?.content && typeof data.content === "object") {
          const content = data.content as { cards?: ManagedInfoCard[] };
          if (Array.isArray(content.cards) && content.cards.length > 0) {
            const hasLegacyMock = content.cards.some(
              (c: any) =>
                c.id === "default-new-dashboard" ||
                c.id === "ai-canvas-v2" ||
                c.id === "ai-assistant-v2" ||
                c.impressions_count === 1420 ||
                c.impressions_count === 890 ||
                c.impressions_count === 2310 ||
                c.title?.includes("New Dashboard") ||
                c.title?.includes("AI Canvas") ||
                c.description?.includes("New Feature. New Platform")
            );
            if (!hasLegacyMock) {
              setCards(content.cards);
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(content.cards));
              } catch {}
            } else {
              // Legacy mock found in database: overwrite with clean real cards
              syncCardsToDatabase(INITIAL_CARDS);
            }
          }
        }
      } catch (err) {
        console.warn("[InfoCards] Initial hydration notice:", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const persistCards = (updated: ManagedInfoCard[], activatedId?: string) => {
    setCards(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      broadcastChannel?.postMessage({
        type: "CARDS_UPDATED",
        cards: updated,
      });
    } catch (err) {
      console.warn("Storage error:", err);
    }

    try {
      supabaseChannel?.send({
        type: "broadcast",
        event: "CARDS_UPDATED",
        payload: {
          cards: updated,
          activeCardId: activatedId,
          timestamp: Date.now(),
        },
      });
    } catch (err) {
      console.warn("Supabase broadcast error:", err);
    }

    syncCardsToDatabase(updated);
  };

  const handleBroadcastSync = () => {
    try {
      broadcastChannel?.postMessage({
        type: "CARDS_UPDATED",
        cards,
      });
      supabaseChannel?.send({
        type: "broadcast",
        event: "CARDS_UPDATED",
        payload: {
          cards,
          timestamp: Date.now(),
        },
      });
      toast.success("⚡ Broadcasted cards to all active user sessions in real time!");
    } catch {
      toast.error("Failed to broadcast sync event");
    }
  };

  const handleResetDismissals = () => {
    try {
      supabaseChannel?.send({
        type: "broadcast",
        event: "RESET_DISMISSAL",
        payload: {},
      });
      toast.success("🔄 Reset dismissals: all users will now see the active card!");
    } catch {
      toast.error("Failed to broadcast dismissal reset");
    }
  };

  const handlePurgeMockData = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CARDS));
      setCards(INITIAL_CARDS);
      syncCardsToDatabase(INITIAL_CARDS);
      broadcastChannel?.postMessage({
        type: "CARDS_UPDATED",
        cards: INITIAL_CARDS,
      });
      supabaseChannel?.send({
        type: "broadcast",
        event: "CARDS_UPDATED",
        payload: {
          cards: INITIAL_CARDS,
          timestamp: Date.now(),
        },
      });
      toast.success("✨ Purged all dummy/mock data! Reset to real Noska cards with real live telemetry.");
    } catch {
      toast.error("Failed to reset mock data");
    }
  };

  const handleTestAction = (url?: string) => {
    const target = url?.trim() || "/dashboard";
    toast.success(`Testing destination: "${target}"`);
    if (target.startsWith("http://") || target.startsWith("https://")) {
      window.open(target, "_blank", "noopener,noreferrer");
    } else {
      window.open(target, "_blank");
    }
  };

  const handleDuplicate = (card: ManagedInfoCard) => {
    const cloned: ManagedInfoCard = {
      ...card,
      id: `card_${Date.now()}`,
      title: `${card.title} (Copy)`,
      storage_key: `noska_card_${Date.now()}`,
      active: false,
      impressions_count: 0,
      clicks_count: 0,
      dismisses_count: 0,
      created_at: new Date().toISOString(),
    };
    persistCards([cloned, ...cards]);
    toast.success("Card duplicated as draft");
  };

  // Determine which card is currently returned to users (taking duration into account)
  const primaryActiveCard = useMemo(() => {
    const now = Date.now();
    const active = cards
      .filter((c) => c.active)
      .filter((c) => {
        if (c.duration_type === "scheduled") {
          if (c.start_at && new Date(c.start_at).getTime() > now) return false;
          if (c.end_at && new Date(c.end_at).getTime() < now) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pDiff = (b.priority || 0) - (a.priority || 0);
        if (pDiff !== 0) return pDiff;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        return timeB - timeA;
      });
    return active[0] || null;
  }, [cards]);

  // Real KPIs (0 dummy numbers)
  const totalCards = cards.length;
  const activeCards = cards.filter((c) => c.active).length;
  const totalImpressions = cards.reduce((acc, c) => acc + (c.impressions_count || 0), 0);
  const totalClicks = cards.reduce((acc, c) => acc + (c.clicks_count || 0), 0);
  const totalDismisses = cards.reduce((acc, c) => acc + (c.dismisses_count || 0), 0);
  const totalClaims = cards.reduce((acc, c) => acc + (c.claims_count || 0), 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";
  const claimRate = totalImpressions > 0 ? ((totalClaims / totalImpressions) * 100).toFixed(1) : "0.0";

  // Dedicated one-click activation
  const handleMakePrimary = (id: string) => {
    const target = cards.find((c) => c.id === id);
    if (!target) return;

    const highestPriority = Math.max(...cards.map((c) => c.priority || 0), 100);
    const updated = cards.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          active: true,
          priority: highestPriority + 10,
          created_at: new Date().toISOString(),
        };
      }
      if (singleActiveMode) {
        return { ...c, active: false };
      }
      return c;
    });

    persistCards(updated, id);
    toast.success(`⚡ "${target.title}" is now LIVE for all users in real time!`);
  };

  const handleToggleActive = (id: string) => {
    const target = cards.find((c) => c.id === id);
    if (!target) return;

    const willBeActive = !target.active;
    const highestPriority = Math.max(...cards.map((c) => c.priority || 0), 100);

    const updated = cards.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          active: willBeActive,
          priority: willBeActive ? highestPriority + 10 : c.priority,
          created_at: willBeActive ? new Date().toISOString() : c.created_at,
        };
      }
      if (willBeActive && singleActiveMode) {
        return { ...c, active: false };
      }
      return c;
    });

    persistCards(updated, id);
    if (willBeActive) {
      toast.success(`⚡ Activated "${target.title}" & pushed live in real time!`);
    } else {
      toast.success(`Card "${target.title}" deactivated.`);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this Info Card?")) {
      const updated = cards.filter((c) => c.id !== id);
      persistCards(updated);
      toast.success("Card deleted");
      if (editingId === id) resetForm();
    }
  };

  const handleStartEdit = (card: ManagedInfoCard) => {
    setIsEditing(true);
    setEditingId(card.id);
    setTitle(card.title);
    setDescription(card.description);
    setActionLabel(card.action_label || "");
    setActionUrl(card.action_url || "");
    setDismissType(card.dismiss_type || "snooze");
    setSnoozeDays(card.snooze_days || 7);
    setStorageKey(card.storage_key);
    setTargetAudience(card.target_audience);
    setPriority(card.priority || 100);
    setActive(card.active);
    setMediaList(card.media || []);
    setDurationType(card.duration_type || "forever");
    setStartAt(card.start_at ? card.start_at.slice(0, 16) : "");
    setEndAt(card.end_at ? card.end_at.slice(0, 16) : "");
    setCardStyle(card.card_style || "standard");
    setVoucherTag(card.voucher_tag || "DISCOUNT");
    setBonusValue(card.bonus_value || "32%");
    setTermsText(card.terms_text || "At selected outlets. Terms and conditions apply");
    setPromoCode(card.promo_code || "NOSKA32");
    setBarcodeNumber(card.barcode_number || "1234567890");
    setThemeColor(card.theme_color || "cyan");
    setRouteFrom(card.route_from || "YYZ");
    setRouteTo(card.route_to || "HND");
    setRouteFromLabel(card.route_from_label || "Toronto");
    setRouteToLabel(card.route_to_label || "Tokyo");
    setEtaLabel(card.eta_label || "ETA 2:15 PM");
    setTimerLabel(card.timer_label || "DINNER IN 2:34H");
    setSliderLabel(card.slider_label || "-7H 01M");
    setAccentGlow(card.accent_glow || "lime");
    setWalletTitle(card.wallet_title || "YOUR BALANCE");
    setWalletBalance(card.wallet_balance || "$ 52,002.50");
    setRecentActivityTitle(card.recent_activity_title || "Dribbble Pro");
    setRecentActivityDate(card.recent_activity_date || "Jan 17 • 20:12");
    setRecentActivityAmount(card.recent_activity_amount || "$60.00");
    setPreviewDismissed(false);
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitle("");
    setDescription("");
    setActionLabel("");
    setActionUrl("");
    setDismissType("snooze");
    setSnoozeDays(7);
    setStorageKey("");
    setTargetAudience("all");
    setPriority(100);
    setActive(true);
    setMediaList([]);
    setNewMediaSrc("");
    setDurationType("forever");
    setDurationPreset("forever");
    setStartAt("");
    setEndAt("");
    setCardStyle("standard");
    setVoucherTag("DISCOUNT");
    setBonusValue("32%");
    setTermsText("At selected outlets. Terms and conditions apply");
    setPromoCode("NOSKA32");
    setBarcodeNumber("1234567890");
    setThemeColor("cyan");
    setRouteFrom("YYZ");
    setRouteTo("HND");
    setRouteFromLabel("Toronto");
    setRouteToLabel("Tokyo");
    setEtaLabel("ETA 2:15 PM");
    setTimerLabel("DINNER IN 2:34H");
    setSliderLabel("-7H 01M");
    setAccentGlow("lime");
    setWalletTitle("YOUR BALANCE");
    setWalletBalance("$ 52,002.50");
    setRecentActivityTitle("Dribbble Pro");
    setRecentActivityDate("Jan 17 • 20:12");
    setRecentActivityAmount("$60.00");
    setPreviewDismissed(false);
  };

  const loadPreset = (presetId: string) => {
    const target = INITIAL_CARDS.find((c) => c.id === presetId);
    if (target) {
      handleStartEdit(target);
      setActiveTab("studio");
      toast.success(`Loaded "${target.title}" into Studio`);
    }
  };

  const handleSeedAllTemplates = () => {
    const existingIds = new Set(cards.map((c) => c.id));
    const toAdd = INITIAL_CARDS.filter((preset) => !existingIds.has(preset.id));
    const merged = [...cards, ...toAdd];
    persistCards(merged);
    toast.success(`✨ Synced all ${merged.length} Pro templates into Card Library!`);
  };

  const handleDurationPresetChange = (preset: string) => {
    setDurationPreset(preset);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const toInputVal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    if (preset === "forever") {
      setDurationType("forever");
      setStartAt("");
      setEndAt("");
    } else if (preset === "24h") {
      setDurationType("scheduled");
      setStartAt(toInputVal(now));
      setEndAt(toInputVal(new Date(now.getTime() + 24 * 60 * 60 * 1000)));
    } else if (preset === "3d") {
      setDurationType("scheduled");
      setStartAt(toInputVal(now));
      setEndAt(toInputVal(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)));
    } else if (preset === "7d") {
      setDurationType("scheduled");
      setStartAt(toInputVal(now));
      setEndAt(toInputVal(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)));
    } else if (preset === "14d") {
      setDurationType("scheduled");
      setStartAt(toInputVal(now));
      setEndAt(toInputVal(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)));
    } else if (preset === "30d") {
      setDurationType("scheduled");
      setStartAt(toInputVal(now));
      setEndAt(toInputVal(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)));
    } else {
      setDurationType("scheduled");
    }
  };

  const handleAddMedia = () => {
    if (!newMediaSrc.trim()) return;
    if (mediaList.length >= 3) {
      toast.error("Maximum 3 media items allowed in layered stack");
      return;
    }
    setMediaList([...mediaList, { src: newMediaSrc.trim(), type: "image", alt: "Media visual" }]);
    setNewMediaSrc("");
  };

  const handleRemoveMedia = (index: number) => {
    setMediaList(mediaList.filter((_, i) => i !== index));
  };

  const addPresetImage = (url: string) => {
    if (mediaList.length >= 3) {
      toast.error("Maximum 3 media items allowed in layered stack");
      return;
    }
    setMediaList([...mediaList, { src: url, type: "image", alt: "Preset visual" }]);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please enter a title and description");
      return;
    }

    const effectiveKey =
      storageKey.trim() || `noska_card_${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

    const durationLabel =
      durationType === "forever"
        ? "Always Active"
        : durationPreset !== "custom"
        ? `${durationPreset.toUpperCase()}`
        : "Custom Schedule";

    const formattedStart = startAt ? new Date(startAt).toISOString() : null;
    const formattedEnd = endAt ? new Date(endAt).toISOString() : null;

    if (isEditing && editingId) {
      const updated = cards.map((c) => {
        if (c.id === editingId) {
          return {
            ...c,
            title: title.trim(),
            description: description.trim(),
            action_label: actionLabel.trim() || undefined,
            action_url: actionUrl.trim() || undefined,
            dismiss_type: dismissType,
            snooze_days: snoozeDays,
            storage_key: effectiveKey,
            target_audience: targetAudience,
            priority,
            active,
            media: cardStyle === "standard" ? mediaList : [],
            duration_type: durationType,
            start_at: formattedStart,
            end_at: formattedEnd,
            duration_label: durationLabel,
            card_style: cardStyle,
            voucher_tag: voucherTag,
            bonus_value: bonusValue,
            terms_text: termsText,
            promo_code: promoCode,
            barcode_number: barcodeNumber,
            theme_color: themeColor,
            route_from: routeFrom,
            route_to: routeTo,
            route_from_label: routeFromLabel,
            route_to_label: routeToLabel,
            eta_label: etaLabel,
            timer_label: timerLabel,
            slider_label: sliderLabel,
            accent_glow: accentGlow,
            wallet_title: walletTitle,
            wallet_balance: walletBalance,
            recent_activity_title: recentActivityTitle,
            recent_activity_date: recentActivityDate,
            recent_activity_amount: recentActivityAmount,
            claims_count: c.claims_count || 0,
            created_at: new Date().toISOString(),
          };
        }
        if (active && singleActiveMode) {
          return { ...c, active: false };
        }
        return c;
      });
      persistCards(updated, editingId);
      toast.success("Card updated & pushed live in real time!");
    } else {
      const newCard: ManagedInfoCard = {
        id: `card_${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        action_label: actionLabel.trim() || undefined,
        action_url: actionUrl.trim() || undefined,
        dismiss_type: dismissType,
        snooze_days: snoozeDays,
        storage_key: effectiveKey,
        target_audience: targetAudience,
        priority,
        active,
        media: cardStyle === "standard" ? mediaList : [],
        duration_type: durationType,
        start_at: formattedStart,
        end_at: formattedEnd,
        duration_label: durationLabel,
        card_style: cardStyle,
        voucher_tag: voucherTag,
        bonus_value: bonusValue,
        terms_text: termsText,
        promo_code: promoCode,
        barcode_number: barcodeNumber,
        theme_color: themeColor,
        route_from: routeFrom,
        route_to: routeTo,
        route_from_label: routeFromLabel,
        route_to_label: routeToLabel,
        eta_label: etaLabel,
        timer_label: timerLabel,
        slider_label: sliderLabel,
        accent_glow: accentGlow,
        wallet_title: walletTitle,
        wallet_balance: walletBalance,
        recent_activity_title: recentActivityTitle,
        recent_activity_date: recentActivityDate,
        recent_activity_amount: recentActivityAmount,
        impressions_count: 0,
        clicks_count: 0,
        dismisses_count: 0,
        claims_count: 0,
        created_at: new Date().toISOString(),
      };
      const updated = singleActiveMode && active
        ? [newCard, ...cards.map((c) => ({ ...c, active: false }))]
        : [newCard, ...cards];

      persistCards(updated, newCard.id);
      toast.success("New Info Card created & pushed live in real time!");
    }

    resetForm();
  };

  // Filtered list
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (card.action_url && card.action_url.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesAudience =
        filterAudience === "all" || card.target_audience === filterAudience || card.target_audience === "all";

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && card.active) ||
        (statusFilter === "inactive" && !card.active);

      return matchesSearch && matchesAudience && matchesStatus;
    });
  }, [cards, searchQuery, filterAudience, statusFilter]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Promotional & Info Cards"
        description="Manage promotional cards, vouchers, and onboarding widgets for user sidebars."
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Realtime Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                realtimeStatus === "connected"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs"
                  : realtimeStatus === "connecting"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  realtimeStatus === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : realtimeStatus === "connecting"
                    ? "bg-amber-500 animate-ping"
                    : "bg-slate-400"
                }`}
              />
              <span>
                {realtimeStatus === "connected"
                  ? "Realtime Live"
                  : realtimeStatus === "connecting"
                  ? "Connecting..."
                  : "Offline"}
              </span>
            </div>

            {/* Solo Active Mode Switch Pill */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/80 bg-card/70 text-xs shadow-xs"
              title="Solo Mode: activating a card deactivates other cards so users instantly see this card."
            >
              <span className="text-[11px] font-semibold text-muted-foreground">Solo Mode:</span>
              <Switch
                checked={singleActiveMode}
                onCheckedChange={setSingleActiveMode}
                className="scale-75 data-[state=checked]:bg-[#0066FF]"
              />
            </div>

            {/* Push Live Sync */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBroadcastSync}
              className="h-8 text-xs font-semibold gap-1.5 border-[#0066FF]/30 text-[#0066FF] hover:bg-[#0066FF]/10 shadow-xs"
              title="Broadcast cards live to all users via WebSocket"
            >
              <Radio className="h-3.5 w-3.5 text-[#0066FF] animate-pulse" />
              <span>Push Sync</span>
            </Button>

            {/* Sync & Tools Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground border-border/80 shadow-xs"
                  title="Template presets and maintenance tools"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  <span>Sync & Tools</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl border border-border/80 shadow-lg">
                <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                  Template Library
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={handleSeedAllTemplates}
                  className="text-xs font-medium cursor-pointer gap-2 py-2 rounded-lg"
                >
                  <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Sync 6 Pro Templates</span>
                    <span className="text-[10px] text-muted-foreground">Vouchers, capsules, wallet cards</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                  User Cache & Controls
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={handleResetDismissals}
                  className="text-xs font-medium cursor-pointer gap-2 py-2 rounded-lg"
                >
                  <RotateCcw className="h-4 w-4 text-sky-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Reset Dismissals</span>
                    <span className="text-[10px] text-muted-foreground">Clear snoozes for all users</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handlePurgeMockData}
                  className="text-xs font-medium text-rose-600 dark:text-rose-400 focus:text-rose-600 cursor-pointer gap-2 py-2 rounded-lg"
                >
                  <Trash2 className="h-4 w-4 text-rose-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold">Purge Demo Cards</span>
                    <span className="text-[10px] text-rose-400">Restore factory clean state</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Primary CTA */}
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setActiveTab("studio");
                window.scrollTo({ top: 200, behavior: "smooth" });
              }}
              className="h-8 text-xs font-semibold gap-1.5 bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-sm shadow-[#0066FF]/25"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Card</span>
            </Button>
          </div>
        }
      />

      {/* Slim Executive Realtime Status Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2.5 rounded-xl border border-sky-500/20 bg-gradient-to-r from-sky-500/[0.08] via-blue-500/[0.04] to-transparent text-xs gap-2">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          <span className="font-semibold text-foreground">Realtime Active:</span>
          <span className="text-muted-foreground hidden md:inline">
            Active cards sync directly to user sidebars.
          </span>
        </div>
        {primaryActiveCard && (
          <div className="flex items-center gap-2 shrink-0 bg-background/90 px-2.5 py-1 rounded-lg border border-sky-500/30 shadow-xs">
            <span className="text-[11px] text-muted-foreground font-medium">Live:</span>
            <span className="text-xs font-bold text-[#0066FF] dark:text-[#4791FF]">{primaryActiveCard.title}</span>
          </div>
        )}
      </div>

      {/* Executive KPI Stats Grid (Using Unified Admin KpiCard Component) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Total Cards"
          value={totalCards}
          icon={Layers}
          subtitle="Managed cards"
        />
        <KpiCard
          title="Active Cards"
          value={activeCards}
          icon={CheckCircle2}
          subtitle={singleActiveMode ? "Solo active ON" : "Multi-rotation"}
        />
        <KpiCard
          title="Impressions"
          value={totalImpressions.toLocaleString()}
          icon={Eye}
          subtitle="Live views recorded"
        />
        <KpiCard
          title="Clicks"
          value={totalClicks.toLocaleString()}
          icon={MousePointer}
          subtitle="CTA clicks recorded"
        />
        <KpiCard
          title="Claims"
          value={totalClaims.toLocaleString()}
          icon={Gift}
          subtitle={`${claimRate}% claim conversion`}
        />
        <KpiCard
          title="Avg. CTR"
          value={`${ctr}%`}
          icon={Sparkles}
          subtitle={`${totalDismisses} dismissals`}
        />
      </div>

      {/* Segmented Navigation (Using Unified Admin Tabs Component) & Presets */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-xl bg-card border border-border shadow-xs">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "studio" | "library")}>
          <TabsList className="bg-muted p-1 h-9">
            <TabsTrigger value="studio" className="gap-2 text-xs font-semibold px-3">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span>Studio</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2 text-xs font-semibold px-3">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Library ({cards.length})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Quick Template Presets */}
        {activeTab === "studio" ? (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-wrap">
            <span className="text-xs font-medium text-muted-foreground shrink-0 pl-1">
              Presets:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadPreset("noska-pro-voucher-32")}
              className="h-8 px-2.5 text-xs font-medium gap-1.5 border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400 hover:bg-purple-500/15 transition-all shadow-xs shrink-0"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>32% Voucher</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadPreset("noska-flight-capsule")}
              className="h-8 px-2.5 text-xs font-medium gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 transition-all shadow-xs shrink-0"
            >
              <Plane className="w-3.5 h-3.5" />
              <span>Flight Capsule</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadPreset("noska-rewards-wallet")}
              className="h-8 px-2.5 text-xs font-medium gap-1.5 border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400 hover:bg-sky-500/15 transition-all shadow-xs shrink-0"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Apple Wallet</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadPreset("noska-ai-assistant")}
              className="h-8 px-2.5 text-xs font-medium gap-1.5 border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/15 transition-all shadow-xs shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Copilot</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pr-2">
            <span>Select any card to preview</span>
          </div>
        )}
      </div>

      {/* Main Grid: Left = Studio Form or Card Library, Right = Live Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {activeTab === "library" ? (
            /* Card Management List */
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <span>Card Library</span>
                      <Badge variant="secondary" className="text-xs">
                        {cards.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Manage active cards and delivery schedules.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              {/* Filter & Search Toolbar */}
              <div className="px-6 pb-3 pt-1 border-b border-border/60">
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by title, description, or url..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={filterAudience} onValueChange={setFilterAudience}>
                      <SelectTrigger className="h-9 w-[110px] text-xs">
                        <SelectValue placeholder="Audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Audiences</SelectItem>
                        <SelectItem value="desktop">Desktop</SelectItem>
                        <SelectItem value="web">Web</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center rounded-lg border p-0.5 bg-muted/30 text-xs">
                      <button
                        type="button"
                        onClick={() => setStatusFilter("all")}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                          statusFilter === "all" ? "bg-[#0066FF] text-white" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter("active")}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                          statusFilter === "active" ? "bg-[#0066FF] text-white" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Active ({activeCards})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter("inactive")}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                          statusFilter === "inactive" ? "bg-[#0066FF] text-white" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Inactive ({cards.length - activeCards})
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="space-y-3 pt-3">
                {filteredCards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No cards match your filter criteria.
                  </div>
                ) : (
                  filteredCards.map((card) => {
                    const isPrimary = card.id === primaryActiveCard?.id;
                    const isSelected = selectedLibraryPreviewCard?.id === card.id;
                    const durationInfo = getDurationStatus(card);

                    return (
                      <div
                        key={card.id}
                        onClick={() => setSelectedLibraryPreviewCard(card)}
                        className={`group relative flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl border transition-all duration-200 gap-4 cursor-pointer ${
                          isPrimary
                            ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/[0.04] to-transparent ring-1 ring-emerald-500/20 shadow-xs"
                            : isSelected
                            ? "border-[#0066FF]/60 bg-gradient-to-r from-[#0066FF]/[0.04] to-transparent ring-1 ring-[#0066FF]/25 shadow-xs"
                            : "bg-card/70 border-border/70 hover:border-border hover:bg-muted/20 hover:shadow-xs"
                        }`}
                      >
                        {/* Left Style Icon Avatar */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <div className="shrink-0 pt-0.5">
                            {card.card_style === "ticket_voucher" && (
                              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-xs">
                                <Ticket className="w-4 h-4" />
                              </div>
                            )}
                            {card.card_style === "dynamic_capsule" && (
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                                <Plane className="w-4 h-4" />
                              </div>
                            )}
                            {card.card_style === "wallet_balance" && (
                              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs">
                                <Wallet className="w-4 h-4" />
                              </div>
                            )}
                            {(!card.card_style || card.card_style === "standard") && (
                              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                                <Sparkles className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          {/* Central Details */}
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm tracking-tight text-foreground truncate">{card.title}</span>

                              {/* Live Status Badges */}
                              {isPrimary ? (
                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-extrabold animate-pulse flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  LIVE
                                </Badge>
                              ) : card.active ? (
                                <Badge className="bg-[#0066FF]/10 text-[#0066FF] dark:text-[#4791FF] border-[#0066FF]/30 text-[10px] font-semibold">
                                  Active (Standby)
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Draft / Inactive
                                </Badge>
                              )}

                              {/* Style Badge */}
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground border border-border flex items-center gap-1">
                                {card.card_style === "ticket_voucher"
                                  ? "Voucher"
                                  : card.card_style === "dynamic_capsule"
                                  ? "Capsule"
                                  : card.card_style === "wallet_balance"
                                  ? "Wallet"
                                  : "Standard"}
                              </span>

                              {/* Duration Badge */}
                              <Badge variant="outline" className={`text-[10px] flex items-center gap-1 ${durationInfo.color}`}>
                                <Clock className="h-2.5 w-2.5" />
                                <span>{durationInfo.label}</span>
                              </Badge>

                              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                {card.target_audience}
                              </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground line-clamp-1">{card.description}</p>

                            {/* Telemetry Pills Row */}
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/40 border border-border/40 font-mono text-[10px]">
                                <Eye className="w-2.5 h-2.5 opacity-70" />
                                <strong>{card.impressions_count || 0}</strong> views
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/40 border border-border/40 font-mono text-[10px]">
                                <MousePointer className="w-2.5 h-2.5 opacity-70" />
                                <strong>{card.clicks_count || 0}</strong> clicks
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/40 border border-border/40 font-mono text-[10px]">
                                <Zap className="w-2.5 h-2.5 text-[#0066FF]" />
                                CTR: <strong className="text-[#0066FF]">
                                  {(card.impressions_count || 0) > 0
                                    ? (((card.clicks_count || 0) / (card.impressions_count || 1)) * 100).toFixed(1)
                                    : "0.0"}%
                                </strong>
                              </span>
                              {(card.claims_count || 0) > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                  <Gift className="w-2.5 h-2.5" />
                                  <strong>{card.claims_count}</strong> claims
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/40 border border-border/40 font-mono text-[10px]">
                                <strong>{card.dismisses_count || 0}</strong> dismissals
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Action Toolbar */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0">
                          {/* Live Status Switch Pill */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border transition-all ${
                              card.active
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted/40 border-border/70 text-muted-foreground"
                            }`}
                            title={card.active ? "Currently active — click to deactivate" : "Currently inactive — click to push live"}
                          >
                            <span className="text-[11px] font-bold">{card.active ? "Live" : "Off"}</span>
                            <Switch
                              checked={card.active}
                              onCheckedChange={() => handleToggleActive(card.id)}
                              className="scale-75 data-[state=checked]:bg-emerald-500"
                            />
                          </div>

                          {/* Edit in Studio */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(card);
                              setActiveTab("studio");
                            }}
                            className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-border/80 hover:bg-muted text-foreground shadow-xs"
                            title="Open in Studio Customizer"
                          >
                            <Edit2 className="h-3 w-3 text-muted-foreground" />
                            <span>Edit</span>
                          </Button>

                          {/* Preview Selector */}
                          <Button
                            size="sm"
                            variant={isSelected ? "secondary" : "ghost"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLibraryPreviewCard(card);
                            }}
                            className={`h-8 px-2.5 text-xs font-semibold gap-1.5 ${
                              isSelected
                                ? "bg-[#0066FF]/10 text-[#0066FF] border border-[#0066FF]/30"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            title="Preview in Simulator"
                          >
                            <Eye className="h-3 w-3" />
                            <span className="hidden md:inline">{isSelected ? "Previewing" : "Preview"}</span>
                          </Button>

                          {/* Duplicate */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(card);
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Duplicate Card"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(card.id);
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete Card"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ) : (
            /* Create or Edit Form (Live Studio Workbench) */
            /* Create or Edit Form (Live Studio Workbench) */
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#0066FF]" />
                      <span>{isEditing ? `Edit Card: ${title}` : "Card Studio"}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configure layout, action routes, and duration schedule.
                    </CardDescription>
                  </div>
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={resetForm}
                      className="h-7 text-xs"
                    >
                      New Card
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <form onSubmit={handleSaveCard} className="space-y-4 text-xs">
                  {/* Card Style Selector */}
                  <div className="space-y-2 pb-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">Card Format</Label>
                      <span className="text-[11px] text-muted-foreground font-normal">Choose UI layout</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        {
                          id: "standard",
                          name: "Standard",
                          desc: "Media stack & CTA link",
                          icon: Layers,
                          color: "text-primary",
                          activeBg: "border-primary bg-primary/5 ring-primary/20",
                        },
                        {
                          id: "ticket_voucher",
                          name: "Ticket Voucher",
                          desc: "Cutout coupon & barcode",
                          icon: Ticket,
                          color: "text-purple-600 dark:text-purple-400",
                          activeBg: "border-purple-500 bg-purple-500/10 ring-purple-500/30",
                        },
                        {
                          id: "dynamic_capsule",
                          name: "Dynamic Capsule",
                          desc: "LED route & slide pill",
                          icon: Plane,
                          color: "text-emerald-600 dark:text-emerald-400",
                          activeBg: "border-emerald-500 bg-emerald-500/10 ring-emerald-500/30",
                        },
                        {
                          id: "wallet_balance",
                          name: "Apple Wallet",
                          desc: "Balance & 3D tactile pills",
                          icon: Wallet,
                          color: "text-sky-600 dark:text-sky-400",
                          activeBg: "border-sky-500 bg-sky-500/10 ring-sky-500/30",
                        },
                      ].map((fmt) => {
                        const Icon = fmt.icon;
                        const isSelected = cardStyle === fmt.id;
                        return (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => setCardStyle(fmt.id as any)}
                            className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                              isSelected
                                ? `${fmt.activeBg} text-foreground ring-1 shadow-xs`
                                : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                              <Icon className={`h-4 w-4 shrink-0 ${fmt.color}`} />
                              <span className="truncate">{fmt.name}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-tight truncate">{fmt.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Conditional Customizer: Ticket Voucher */}
                  {cardStyle === "ticket_voucher" && (
                    <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/[0.03] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-purple-500" />
                          <Label className="text-xs font-semibold">Voucher Settings</Label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Ribbon Tag</Label>
                          <Input
                            placeholder="e.g. DISCOUNT, BONUS, PROMO, GIFT"
                            value={voucherTag}
                            onChange={(e) => setVoucherTag(e.target.value.toUpperCase())}
                            className="text-xs h-8 font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Discount / Value</Label>
                          <Input
                            placeholder="e.g. 32%, $50, 1 MO FREE"
                            value={bonusValue}
                            onChange={(e) => setBonusValue(e.target.value)}
                            className="text-xs h-8 font-mono font-black"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Promo Coupon Code</Label>
                          <Input
                            placeholder="e.g. NOSKA32"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                            className="text-xs h-8 font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Barcode Number</Label>
                          <Input
                            placeholder="e.g. 1234567890"
                            value={barcodeNumber}
                            onChange={(e) => setBarcodeNumber(e.target.value)}
                            className="text-xs h-8 font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Color Palette</Label>
                          <div className="flex gap-2">
                            {[
                              { id: "purple", label: "Lavender", color: "bg-purple-400" },
                              { id: "coral", label: "Peach", color: "bg-orange-400" },
                              { id: "cyan", label: "Sky / Mint", color: "bg-sky-400" },
                              { id: "dark", label: "Obsidian", color: "bg-zinc-800" },
                            ].map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setThemeColor(t.id as any)}
                                className={`flex-1 py-1 px-1.5 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                                  themeColor === t.id
                                    ? "border-purple-500 ring-2 ring-purple-500/30 bg-card text-foreground"
                                    : "border-border hover:bg-muted text-muted-foreground"
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${t.color}`} />
                                <span className="truncate">{t.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Terms & Conditions</Label>
                        <Input
                          placeholder="e.g. At selected outlets. Terms and conditions apply"
                          value={termsText}
                          onChange={(e) => setTermsText(e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  )}

                  {/* Conditional Customizer: Dynamic Capsule */}
                  {cardStyle === "dynamic_capsule" && (
                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Plane className="h-4 w-4 text-emerald-500" />
                          <Label className="text-xs font-semibold">Dynamic Capsule Settings</Label>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Origin Code (LED)</Label>
                          <Input
                            placeholder="e.g. YYZ, FREE"
                            value={routeFrom}
                            onChange={(e) => setRouteFrom(e.target.value.toUpperCase())}
                            className="text-xs h-8 font-mono font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Origin Subtitle</Label>
                          <Input
                            placeholder="e.g. Toronto, Starter Tier"
                            value={routeFromLabel}
                            onChange={(e) => setRouteFromLabel(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Destination Code (LED)</Label>
                          <Input
                            placeholder="e.g. HND, PRO"
                            value={routeTo}
                            onChange={(e) => setRouteTo(e.target.value.toUpperCase())}
                            className="text-xs h-8 font-mono font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Destination Subtitle</Label>
                          <Input
                            placeholder="e.g. Tokyo, Pro Studio"
                            value={routeToLabel}
                            onChange={(e) => setRouteToLabel(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">ETA Status</Label>
                          <Input
                            placeholder="e.g. ETA 2:15 PM"
                            value={etaLabel}
                            onChange={(e) => setEtaLabel(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Countdown Timer</Label>
                          <Input
                            placeholder="e.g. DINNER IN 2:34H"
                            value={timerLabel}
                            onChange={(e) => setTimerLabel(e.target.value)}
                            className="text-xs h-8 text-amber-500 font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Slide Pill Label</Label>
                          <Input
                            placeholder="e.g. -7H 01M, Slide to Claim"
                            value={sliderLabel}
                            onChange={(e) => setSliderLabel(e.target.value)}
                            className="text-xs h-8 font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Glowing Slider Accent</Label>
                        <div className="flex gap-2">
                          {[
                            { id: "lime", label: "Neon Lime", color: "bg-lime-500" },
                            { id: "cyan", label: "Sky Blue", color: "bg-sky-500" },
                            { id: "amber", label: "Amber Orange", color: "bg-amber-500" },
                            { id: "rose", label: "Neon Rose", color: "bg-rose-500" },
                          ].map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setAccentGlow(g.id as any)}
                              className={`flex-1 py-1 px-1.5 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                                accentGlow === g.id
                                  ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-card text-foreground"
                                  : "border-border hover:bg-muted text-muted-foreground"
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${g.color}`} />
                              <span className="truncate">{g.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conditional Customizer: Apple Wallet */}
                  {cardStyle === "wallet_balance" && (
                    <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/[0.03] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-sky-500" />
                          <Label className="text-xs font-semibold">Wallet Balance Settings</Label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Balance Card Title</Label>
                          <Input
                            placeholder="e.g. YOUR BALANCE, BONUS CREDITS"
                            value={walletTitle}
                            onChange={(e) => setWalletTitle(e.target.value.toUpperCase())}
                            className="text-xs h-8 font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Balance / Credit Amount</Label>
                          <Input
                            placeholder="e.g. $ 52,002.50, 2,500 Credits"
                            value={walletBalance}
                            onChange={(e) => setWalletBalance(e.target.value)}
                            className="text-xs h-8 font-mono font-black"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Transaction Title</Label>
                          <Input
                            placeholder="e.g. Dribbble Pro, Welcome Bonus"
                            value={recentActivityTitle}
                            onChange={(e) => setRecentActivityTitle(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Transaction Date / Time</Label>
                          <Input
                            placeholder="e.g. Jan 17 • 20:12"
                            value={recentActivityDate}
                            onChange={(e) => setRecentActivityDate(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Transaction Amount</Label>
                          <Input
                            placeholder="e.g. $60.00, +$25.00"
                            value={recentActivityAmount}
                            onChange={(e) => setRecentActivityAmount(e.target.value)}
                            className="text-xs h-8 font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Title & Storage Key */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Card Title</Label>
                      <Input
                        placeholder="e.g. Noska Pro Voucher"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-xs h-9"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Tracking Key</Label>
                      <Input
                        placeholder="e.g. noska_promo_v1"
                        value={storageKey}
                        onChange={(e) => setStorageKey(e.target.value)}
                        className="text-xs h-9 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Description</Label>
                    <Input
                      placeholder="e.g. Deep document search, contextual editing, and live workspace execution."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="text-xs h-9 font-medium"
                      required
                    />
                  </div>

                  {/* Action Button Label & Destination URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Button Label</Label>
                      <Input
                        placeholder="e.g. Try AI Copilot, Download App"
                        value={actionLabel}
                        onChange={(e) => setActionLabel(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Destination URL</Label>
                        {actionUrl && (
                          <button
                            type="button"
                            onClick={() => handleTestAction(actionUrl)}
                            className="text-[11px] text-[#0066FF] hover:underline flex items-center gap-0.5"
                          >
                            Test link <ExternalLink size={10} />
                          </button>
                        )}
                      </div>
                      <Input
                        placeholder="e.g. /dashboard, /download, /pricing"
                        value={actionUrl}
                        onChange={(e) => setActionUrl(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Destination Shortcuts Quick-Pills */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">Quick Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {DESTINATION_SHORTCUTS.map((sc) => (
                        <button
                          key={sc.value}
                          type="button"
                          onClick={() => setActionUrl(sc.value)}
                          className={`text-[11px] px-2.5 py-0.5 rounded-md border transition-all ${
                            actionUrl === sc.value
                              ? "border-[#0066FF] bg-[#0066FF]/10 text-[#0066FF] font-semibold shadow-xs"
                              : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {sc.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration & Scheduling */}
                  <div className="space-y-2.5 p-3.5 rounded-xl border border-border/80 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#0066FF]" />
                        <span>Display Duration</span>
                      </Label>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {durationType === "forever" ? "Permanent" : "Scheduled"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "forever", label: "Permanent" },
                        { id: "24h", label: "24 Hours" },
                        { id: "3d", label: "3 Days" },
                        { id: "7d", label: "7 Days" },
                        { id: "14d", label: "14 Days" },
                        { id: "30d", label: "30 Days" },
                        { id: "custom", label: "Custom Dates" },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleDurationPresetChange(preset.id)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                            durationPreset === preset.id
                              ? "border-[#0066FF] bg-[#0066FF] text-white shadow-xs"
                              : "border-border bg-card hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {durationPreset === "custom" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Start Showing (Local Time)</Label>
                          <Input
                            type="datetime-local"
                            value={startAt}
                            onChange={(e) => setStartAt(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Auto-Expire At (Local Time)</Label>
                          <Input
                            type="datetime-local"
                            value={endAt}
                            onChange={(e) => setEndAt(e.target.value)}
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Target Audience, Dismissal & Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Target Audience</Label>
                      <Select
                        value={targetAudience}
                        onValueChange={(val: any) => setTargetAudience(val)}
                      >
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="desktop">Desktop App Only</SelectItem>
                          <SelectItem value="web">Web Browser Only</SelectItem>
                          <SelectItem value="pro">Pro Workspace Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Dismissal Behavior</Label>
                      <Select
                        value={dismissType}
                        onValueChange={(val: any) => setDismissType(val)}
                      >
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="snooze">Snooze for 7 Days (Recommended)</SelectItem>
                          <SelectItem value="forever">Dismiss Forever</SelectItem>
                          <SelectItem value="once">Session Dismiss</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Priority Weight (1-200)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="200"
                        value={priority}
                        onChange={(e) => setPriority(parseInt(e.target.value) || 100)}
                        className="text-xs h-9 font-mono"
                      />
                    </div>
                  </div>

                  {/* Active Switch */}
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold">Active Status</Label>
                      <p className="text-[11px] text-muted-foreground">
                        {singleActiveMode
                          ? "Solo mode active: will become the primary live card."
                          : "Active and scheduled by priority."}
                      </p>
                    </div>
                    <Switch checked={active} onCheckedChange={setActive} />
                  </div>

                  {/* Media Stack (Standard cards only) */}
                  {cardStyle === "standard" && (
                    <div className="space-y-2 p-3.5 rounded-xl border border-border/80 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Visual Media Stack</Label>
                        <span className="text-[10px] text-muted-foreground">
                          {mediaList.length} / 3 layers
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Items fan out on hover.
                      </p>

                      <div className="space-y-1.5">
                        <span className="text-[10px] text-muted-foreground">Presets:</span>
                        <div className="flex flex-wrap gap-1">
                          {PRESET_MEDIA.map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => addPresetImage(preset.url)}
                              className="text-[10px] px-2 py-0.5 rounded-md border border-border bg-card hover:bg-muted text-foreground flex items-center gap-1"
                            >
                              <Plus size={10} />
                              <span>{preset.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Input
                          type="url"
                          placeholder="Paste image/media URL (https://...)"
                          value={newMediaSrc}
                          onChange={(e) => setNewMediaSrc(e.target.value)}
                          className="text-xs h-8"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddMedia}
                          className="text-xs h-8 shrink-0 gap-1"
                        >
                          <Plus size={12} />
                          Add Layer
                        </Button>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {mediaList.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg border bg-card text-xs gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={item.src}
                                alt=""
                                className="h-8 w-12 rounded object-cover border shrink-0 bg-white"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-[11px] truncate">
                                  Layer {idx + 1} (z-index {idx})
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {item.src}
                                </span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveMedia(idx)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t">
                    {isEditing && (
                      <Button type="button" variant="outline" size="sm" onClick={resetForm} className="text-xs">
                        Discard Changes
                      </Button>
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs gap-1.5 shadow-md shadow-[#0066FF]/20"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>{isEditing ? "Save Changes" : "Publish Card"}</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Live Simulator (5 cols, sticky top-6) */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4 text-[#0066FF]" />
                    <span>Live Simulator</span>
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    {activeTab === "studio"
                      ? "Real-time preview of Studio configuration."
                      : selectedLibraryPreviewCard
                      ? `Selected: ${selectedLibraryPreviewCard.title}`
                      : primaryActiveCard
                      ? `Live: ${primaryActiveCard.title}`
                      : "Previewing sidebar."}
                  </CardDescription>
                </div>

                {/* Dark / Light Toggle */}
                <div className="flex items-center rounded-lg border p-0.5 bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setPreviewTheme("dark")}
                    className={`p-1.5 rounded-md transition-colors ${
                      previewTheme === "dark" ? "bg-[#0066FF] text-white" : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Simulate Dark Mode"
                  >
                    <Moon size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTheme("light")}
                    className={`p-1.5 rounded-md transition-colors ${
                      previewTheme === "light" ? "bg-[#0066FF] text-white" : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Simulate Light Mode"
                  >
                    <Sun size={12} />
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-3">
              {/* Reset simulator if dismissed */}
              {previewDismissed && (
                <div className="mb-3 p-2.5 rounded-lg border border-dashed text-center text-xs space-y-1">
                  <p className="text-muted-foreground">Card dismissed in preview simulation.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewDismissed(false)}
                    className="h-7 text-xs"
                  >
                    Restore Card Preview
                  </Button>
                </div>
              )}

              {/* Sidebar Canvas Container */}
              <div
                className={`p-4 rounded-2xl border transition-all duration-200 shadow-inner overflow-hidden ${
                  previewTheme === "dark"
                    ? "bg-[#0B0C0E] border-white/10 text-white"
                    : "bg-[#F1F3F6] border-black/10 text-slate-900"
                }`}
              >
                {/* Simulated Window Control Dots */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/40">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/80">Noska Desktop v1.1</span>
                </div>

                {/* Simulated Sidebar Header */}
                <div className="flex items-center justify-between pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#0066FF] ring-2 ring-[#0066FF]/20" />
                    <span className="text-xs font-bold tracking-tight">Workspace</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                    ONLINE
                  </span>
                </div>

                {/* Simulated Sidebar Menu Items (Contextual Backdrop) */}
                <div className="space-y-1 mb-3.5 text-xs">
                  <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                    previewTheme === "dark" ? "bg-white/[0.05] text-white" : "bg-black/[0.04] text-slate-900"
                  }`}>
                    <Layers className="h-3.5 w-3.5 text-[#0066FF]" />
                    <span>Active Workspace</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-muted-foreground text-xs opacity-60">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI Copilot & Tools</span>
                  </div>
                </div>

                {/* Simulated Info Card Rendering */}
                <AnimatePresence mode="wait">
                  {!previewDismissed && (
                    <motion.div
                      key={activeTab === "studio" ? cardStyle : (selectedLibraryPreviewCard?.card_style || primaryActiveCard?.card_style || "standard")}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, y: 8 }}
                      transition={{ type: "spring", stiffness: 280, damping: 24, mass: 0.8 }}
                    >
                      {/* 1. When in Studio mode: render form state */}
                      {activeTab === "studio" ? (
                        <>
                          {cardStyle === "ticket_voucher" && (
                            <PromoTicketCard
                              tag={voucherTag}
                              bonusValue={bonusValue}
                              title={title}
                              description={description}
                              termsText={termsText}
                              promoCode={promoCode}
                              barcodeNumber={barcodeNumber}
                              themeColor={themeColor}
                              actionLabel={actionLabel || "REDEEM"}
                              actionUrl={actionUrl}
                              onDismiss={() => {
                                setPreviewDismissed(true);
                                toast("Voucher dismissed in preview simulation");
                              }}
                            />
                          )}

                          {cardStyle === "dynamic_capsule" && (
                            <DynamicCapsuleCard
                              routeFrom={routeFrom}
                              routeTo={routeTo}
                              routeFromLabel={routeFromLabel}
                              routeToLabel={routeToLabel}
                              etaLabel={etaLabel}
                              timerLabel={timerLabel}
                              sliderLabel={sliderLabel}
                              accentGlow={accentGlow}
                              actionUrl={actionUrl}
                              onDismiss={() => {
                                setPreviewDismissed(true);
                                toast("Capsule dismissed in preview simulation");
                              }}
                            />
                          )}

                          {cardStyle === "wallet_balance" && (
                            <BonusWalletCard
                              balanceTitle={walletTitle}
                              balanceAmount={walletBalance}
                              recentActivityTitle={recentActivityTitle}
                              recentActivityDate={recentActivityDate}
                              recentActivityAmount={recentActivityAmount}
                              actionLabel={actionLabel || "Receive"}
                              actionUrl={actionUrl}
                              onDismiss={() => {
                                setPreviewDismissed(true);
                                toast("Wallet dismissed in preview simulation");
                              }}
                            />
                          )}

                          {cardStyle === "standard" && (
                            <div
                              onMouseEnter={() => setPreviewHovered(true)}
                              onMouseLeave={() => setPreviewHovered(false)}
                              className={`group relative rounded-2xl border p-3.5 shadow-md transition-all duration-300 ${
                                previewTheme === "dark"
                                  ? "bg-[#13111C] border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                                  : "bg-white border-slate-200/90 shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
                              }`}
                            >
                              <div className="flex flex-col text-xs">
                                <div className="flex items-center gap-1.5 mb-1 select-none">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#0066FF] shrink-0" />
                                  <div className="font-normal text-xs text-[#9CA3AF] dark:text-[#9CA3AF]/90 leading-none">
                                    {title.trim() || "Card Category / Feature"}
                                  </div>
                                </div>

                                <div
                                  className={`text-[14px] font-medium leading-tight select-none mb-2.5 ${
                                    previewTheme === "dark" ? "text-[#E5E7EB]" : "text-[#374151]"
                                  }`}
                                >
                                  {description.trim() || "Card description and primary message goes here."}
                                </div>

                                {mediaList.length > 0 && (
                                  <motion.div
                                    className="relative w-full overflow-hidden rounded-xl"
                                    animate={{ height: previewHovered ? 145 : 85 }}
                                    transition={{ type: "spring", stiffness: 280, damping: 24, mass: 0.8 }}
                                  >
                                    <div className="relative w-full h-[85px]">
                                      {mediaList.map((item, index) => {
                                        const count = mediaList.length;
                                        let rotateZ = 0;
                                        let yOffset = 0;
                                        if (previewHovered) {
                                          if (count === 2) {
                                            rotateZ = index === 0 ? -4 : 4;
                                            yOffset = index === 0 ? 0 : 12;
                                          } else if (count === 3) {
                                            rotateZ = index === 0 ? -6 : index === 1 ? 0 : 6;
                                            yOffset = index === 0 ? 0 : index === 1 ? 10 : 20;
                                          }
                                        }
                                        return (
                                          <motion.div
                                            key={index}
                                            className="absolute inset-x-0 top-0 origin-bottom"
                                            animate={{ rotateZ, y: yOffset }}
                                            transition={{ type: "spring", stiffness: 280, damping: 24, mass: 0.8 }}
                                            style={{ zIndex: index + 1 }}
                                          >
                                            <img
                                              src={item.src}
                                              alt={item.alt || ""}
                                              className={`w-full h-[96px] rounded-lg object-cover object-top shadow-md border ${
                                                previewTheme === "dark"
                                                  ? "border-white/10 bg-[#13111C]"
                                                  : "border-slate-200 bg-white"
                                              }`}
                                            />
                                          </motion.div>
                                        );
                                      })}
                                    </div>

                                    <motion.div
                                      className={`absolute inset-x-0 bottom-0 h-8 pointer-events-none ${
                                        previewTheme === "dark"
                                          ? "bg-gradient-to-t from-[#13111C] via-[#13111C]/80 to-transparent"
                                          : "bg-gradient-to-t from-white via-white/80 to-transparent"
                                      }`}
                                      animate={{ opacity: previewHovered ? 0 : 1 }}
                                      transition={{ duration: 0.2 }}
                                    />
                                  </motion.div>
                                )}

                                <motion.div
                                  className="flex justify-between items-center text-xs overflow-hidden pt-1"
                                  animate={{
                                    opacity: previewHovered ? 1 : 0,
                                    height: previewHovered ? "auto" : 0,
                                    marginTop: previewHovered ? 12 : 0,
                                  }}
                                  transition={{ type: "spring", stiffness: 280, damping: 24, mass: 0.8 }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewDismissed(true);
                                      toast("Card dismissed in preview simulation");
                                    }}
                                    className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer border-0 bg-transparent"
                                  >
                                    Dismiss
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleTestAction(actionUrl)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-[0_2px_8px_rgba(0,102,255,0.32)] hover:shadow-[0_4px_14px_rgba(0,102,255,0.42)] active:scale-95 transition-all duration-200 cursor-pointer"
                                  >
                                    <span>{actionLabel.trim() || "Try it out"}</span>
                                    <ExternalLink size={11} className="shrink-0" />
                                  </button>
                                </motion.div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        /* 2. When in Library mode: render selected or primary active card */
                        (() => {
                          const activeCard = selectedLibraryPreviewCard || primaryActiveCard || cards[0];
                          if (!activeCard) {
                            return (
                              <div className="p-6 text-center text-xs text-muted-foreground">
                                No active card to preview. Click any card in the library.
                              </div>
                            );
                          }

                          if (activeCard.card_style === "ticket_voucher") {
                            return (
                              <PromoTicketCard
                                tag={activeCard.voucher_tag || "DISCOUNT"}
                                bonusValue={activeCard.bonus_value || "32%"}
                                title={activeCard.title}
                                description={activeCard.description}
                                termsText={activeCard.terms_text}
                                promoCode={activeCard.promo_code || "NOSKA32"}
                                barcodeNumber={activeCard.barcode_number || "1234567890"}
                                themeColor={activeCard.theme_color || "cyan"}
                                actionLabel={activeCard.action_label || "REDEEM"}
                                actionUrl={activeCard.action_url}
                                onDismiss={() => setPreviewDismissed(true)}
                              />
                            );
                          }

                          if (activeCard.card_style === "dynamic_capsule") {
                            return (
                              <DynamicCapsuleCard
                                routeFrom={activeCard.route_from || "YYZ"}
                                routeTo={activeCard.route_to || "HND"}
                                routeFromLabel={activeCard.route_from_label || "Toronto"}
                                routeToLabel={activeCard.route_to_label || "Tokyo"}
                                etaLabel={activeCard.eta_label || "ETA 2:15 PM"}
                                timerLabel={activeCard.timer_label || "DINNER IN 2:34H"}
                                sliderLabel={activeCard.slider_label || "-7H 01M"}
                                accentGlow={activeCard.accent_glow || "lime"}
                                actionUrl={activeCard.action_url}
                                onDismiss={() => setPreviewDismissed(true)}
                              />
                            );
                          }

                          if (activeCard.card_style === "wallet_balance") {
                            return (
                              <BonusWalletCard
                                balanceTitle={activeCard.wallet_title || "YOUR BALANCE"}
                                balanceAmount={activeCard.wallet_balance || "$ 52,002.50"}
                                recentActivityTitle={activeCard.recent_activity_title || "Dribbble Pro"}
                                recentActivityDate={activeCard.recent_activity_date || "Jan 17 • 20:12"}
                                recentActivityAmount={activeCard.recent_activity_amount || "$60.00"}
                                actionLabel={activeCard.action_label || "Receive"}
                                actionUrl={activeCard.action_url}
                                onDismiss={() => setPreviewDismissed(true)}
                              />
                            );
                          }

                          return (
                            <div
                              onMouseEnter={() => setPreviewHovered(true)}
                              onMouseLeave={() => setPreviewHovered(false)}
                              className={`group relative rounded-2xl border p-3.5 shadow-md transition-all duration-300 ${
                                previewTheme === "dark"
                                  ? "bg-[#13111C] border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                                  : "bg-white border-slate-200/90 shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
                              }`}
                            >
                              <div className="flex flex-col text-xs">
                                <div className="flex items-center gap-1.5 mb-1 select-none">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#0066FF] shrink-0" />
                                  <div className="font-normal text-xs text-[#9CA3AF] dark:text-[#9CA3AF]/90 leading-none">
                                    {activeCard.title}
                                  </div>
                                </div>

                                <div
                                  className={`text-[14px] font-medium leading-tight select-none mb-2.5 ${
                                    previewTheme === "dark" ? "text-[#E5E7EB]" : "text-[#374151]"
                                  }`}
                                >
                                  {activeCard.description}
                                </div>

                                {activeCard.media && activeCard.media.length > 0 && (
                                  <motion.div
                                    className="relative w-full overflow-hidden rounded-xl"
                                    animate={{ height: previewHovered ? 145 : 85 }}
                                    transition={{ type: "spring", stiffness: 280, damping: 24, mass: 0.8 }}
                                  >
                                    <div className="relative w-full h-[85px]">
                                      {activeCard.media.map((item, index) => (
                                        <div
                                          key={index}
                                          className="absolute inset-x-0 top-0"
                                          style={{ zIndex: index + 1 }}
                                        >
                                          <img
                                            src={item.src}
                                            alt={item.alt || ""}
                                            className={`w-full h-[96px] rounded-lg object-cover object-top shadow-md border ${
                                              previewTheme === "dark"
                                                ? "border-white/10 bg-[#13111C]"
                                                : "border-slate-200 bg-white"
                                            }`}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}

                                <div className="flex justify-between items-center text-xs pt-3">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewDismissed(true)}
                                    className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                  >
                                    Dismiss
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleTestAction(activeCard.action_url)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0066FF] text-white shadow-sm"
                                  >
                                    <span>{activeCard.action_label || "Open"}</span>
                                    <ExternalLink size={11} className="shrink-0" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Simulated User Profile Row */}
                <div
                  className={`mt-4 flex items-center justify-between rounded-lg border p-2 ${
                    previewTheme === "dark" ? "border-white/5 bg-white/[0.02]" : "border-black/5 bg-black/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-[#0066FF]/20 flex items-center justify-center text-xs font-bold text-[#0066FF]">
                      KL
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium leading-none">Workspace User</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">user@noska.app</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
