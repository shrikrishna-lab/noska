import { supabase, supabaseAnon, isSupabaseConfigured } from "./supabase";

export interface InfoCardMediaItem {
  type?: "image" | "video";
  src: string;
  alt?: string;
  className?: string;
}

export interface InfoCardRecord {
  id: string;
  title: string;
  description: string;
  media: InfoCardMediaItem[];
  action_label?: string;
  action_url?: string;
  dismiss_type: "once" | "forever" | "snooze";
  snooze_days?: number; // Days to snooze when dismissed
  storage_key: string;
  target_audience: "all" | "desktop" | "web" | "pro";
  active: boolean;
  priority: number;
  // Duration & Scheduling fields
  duration_type?: "forever" | "scheduled";
  start_at?: string | null; // ISO string
  end_at?: string | null; // ISO string
  duration_label?: string; // e.g. "3 Days", "1 Week", "Permanent"
  // Bonus & Promotional Program fields
  card_style?: "standard" | "ticket_voucher" | "dynamic_capsule" | "wallet_balance";
  // Ticket Voucher specifics (Image 1 style)
  voucher_tag?: string; // e.g. "DISCOUNT", "BONUS", "PROMO", "GIFT"
  bonus_value?: string; // e.g. "32%", "$50 CREDIT", "1 MO FREE"
  terms_text?: string; // e.g. "Terms & conditions apply"
  promo_code?: string; // e.g. "NOSKA32"
  barcode_number?: string; // e.g. "1234567890"
  theme_color?: "purple" | "coral" | "cyan" | "dark";
  redeem_url?: string;
  // Dynamic Capsule specifics (Image 2 style)
  route_from?: string; // e.g. "YYZ" or "FREE"
  route_to?: string; // e.g. "HND" or "PRO"
  route_from_label?: string; // e.g. "Toronto" or "Starter"
  route_to_label?: string; // e.g. "Tokyo" or "Pro Studio"
  eta_label?: string; // e.g. "ETA 2:15 PM"
  timer_label?: string; // e.g. "DINNER IN 2:34H" or "EXPIRES IN 24H"
  slider_label?: string; // e.g. "Slide to Claim"
  accent_glow?: "lime" | "cyan" | "amber" | "rose";
  // Apple Wallet specifics (Image 3 style)
  wallet_title?: string; // e.g. "YOUR BALANCE" or "BONUS REWARDS"
  wallet_balance?: string; // e.g. "$52,002.50" or "2,500 AI CREDITS"
  recent_activity_title?: string; // e.g. "Dribbble Pro" or "Welcome Bonus"
  recent_activity_date?: string; // e.g. "Jan 17 • 20:12"
  recent_activity_amount?: string; // e.g. "$60.00" or "+500 Credits"
  impressions_count?: number;
  clicks_count?: number;
  dismisses_count?: number;
  claims_count?: number;
  created_at?: string;
  updated_at?: string;
}

const STORAGE_KEY = "noska_managed_info_cards";
const CHANNEL_NAME = "noska_info_cards_sync";

export const DEFAULT_INFO_CARDS: InfoCardRecord[] = [
  {
    id: "noska-ai-assistant",
    title: "Noska AI Copilot",
    description: "Deep document search, contextual editing, and live workspace execution in one quiet interface.",
    media: [
      {
        src: "https://cdn.21st.dev/assets/mirror/a1/a12526ad6ce4aa3cac9d4f005480e4c2aa5a4d3cccf7b860ca68ebea82c4c157.webp",
        alt: "Noska AI Assistant Interface",
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
    updated_at: new Date().toISOString(),
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
    updated_at: new Date().toISOString(),
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
    claims_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "noska-pro-voucher-32",
    title: "Noska Pro Launch Voucher",
    description: "Unlock 32% discount on Noska Pro annual workspace plan.",
    media: [],
    card_style: "ticket_voucher",
    voucher_tag: "DISCOUNT",
    bonus_value: "32%",
    terms_text: "At all Noska workspaces. Terms and conditions apply",
    promo_code: "NOSKA32",
    barcode_number: "1234567890",
    theme_color: "cyan",
    action_label: "Redeem",
    action_url: "/pricing",
    redeem_url: "/pricing?promo=NOSKA32",
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
    updated_at: new Date().toISOString(),
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
    updated_at: new Date().toISOString(),
  },
  {
    id: "noska-rewards-wallet",
    title: "Noska Balance & Rewards",
    description: "Claim bonus referral credits and view member balance.",
    media: [],
    card_style: "wallet_balance",
    wallet_title: "YOUR BALANCE",
    wallet_balance: "$52,002.50",
    recent_activity_title: "Dribbble Pro",
    recent_activity_date: "Jan 17 • 20:12",
    recent_activity_amount: "$60.00",
    action_label: "Claim",
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
    updated_at: new Date().toISOString(),
  },
];

class InfoCardService {
  private broadcastChannel: BroadcastChannel | null = null;
  private realtimeChannel: any = null;
  private listeners: Set<(cards: InfoCardRecord[]) => void> = new Set();
  private cachedCards: InfoCardRecord[] | null = null;

  constructor() {
    // 1. Same-origin BroadcastChannel for local browser tabs
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === "CARDS_UPDATED" && Array.isArray(event.data.cards)) {
            this.handleRemoteCards(event.data.cards);
          }
        };
      } catch (err) {
        console.warn("[InfoCards] BroadcastChannel init error:", err);
      }
    }

    // 2. Supabase Realtime WebSocket Channel across ALL ports, origins, and desktop apps
    this.initSupabaseRealtime();

    // 3. Hydrate from Supabase database landing_content table if available
    this.hydrateFromDatabase();
  }

  private initSupabaseRealtime(): void {
    const client = supabaseAnon || supabase;
    if (!client || !isSupabaseConfigured) return;

    try {
      this.realtimeChannel = client.channel(CHANNEL_NAME, {
        config: { broadcast: { self: false } },
      });

      this.realtimeChannel
        .on("broadcast", { event: "CARDS_UPDATED" }, (payload: any) => {
          const cards = payload?.payload?.cards;
          if (Array.isArray(cards) && cards.length > 0) {
            this.handleRemoteCards(cards);
          }
        })
        .on("broadcast", { event: "RESET_DISMISSAL" }, (payload: any) => {
          const key = payload?.payload?.storageKey;
          if (typeof window !== "undefined") {
            if (key) {
              localStorage.removeItem(key);
              sessionStorage.removeItem(key);
            } else {
              // Reset all known info card storage keys
              const all = this.getCards();
              for (const c of all) {
                if (c.storage_key) {
                  localStorage.removeItem(c.storage_key);
                  sessionStorage.removeItem(c.storage_key);
                }
              }
            }
          }
          this.notifyListeners();
        })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "landing_content",
            filter: "section=eq.sidebar_info_cards",
          },
          (payload: any) => {
            const content = payload.new?.content;
            if (content?.cards && Array.isArray(content.cards)) {
              this.handleRemoteCards(content.cards);
            }
          }
        )
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            console.log("[InfoCards] Connected to live Supabase Realtime sync channel");
          }
        });
    } catch (err) {
      console.warn("[InfoCards] Realtime channel setup error:", err);
    }
  }

  private async hydrateFromDatabase(): Promise<void> {
    const client = supabaseAnon || supabase;
    if (!client || !isSupabaseConfigured) return;

    try {
      const { data, error } = await client
        .from("landing_content")
        .select("content")
        .eq("section", "sidebar_info_cards")
        .maybeSingle();

      if (!error && data?.content && typeof data.content === "object") {
        const content = data.content as { cards?: InfoCardRecord[] };
        if (Array.isArray(content.cards) && content.cards.length > 0) {
          this.handleRemoteCards(content.cards);
        }
      }
    } catch {
      // Offline or table not ready yet
    }
  }

  private handleRemoteCards(incoming: InfoCardRecord[]): void {
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    const hasLegacyMock = incoming.some(
      (c: any) =>
        c.id === "default-new-dashboard" ||
        c.id === "ai-canvas-v2" ||
        c.id === "ai-assistant-v2" ||
        c.impressions_count === 1420 ||
        c.impressions_count === 890 ||
        c.impressions_count === 2310 ||
        c.title?.includes("New Dashboard") ||
        c.description?.includes("New Feature. New Platform")
    );
    const sanitized = hasLegacyMock ? DEFAULT_INFO_CARDS : incoming;
    this.cachedCards = sanitized;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      } catch {}
    }
    this.notifyListeners();
  }

  public getCards(): InfoCardRecord[] {
    if (this.cachedCards) return this.cachedCards;
    if (typeof window === "undefined") return DEFAULT_INFO_CARDS;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        let parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasLegacyMock = parsed.some(
            (c: any) =>
              c.id === "default-new-dashboard" ||
              c.id === "ai-canvas-v2" ||
              c.id === "ai-assistant-v2" ||
              c.impressions_count === 1420 ||
              c.impressions_count === 890 ||
              c.title?.includes("New Dashboard") ||
              c.description?.includes("New Feature. New Platform")
          );
          if (hasLegacyMock) {
            this.cachedCards = DEFAULT_INFO_CARDS;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INFO_CARDS));
            return DEFAULT_INFO_CARDS;
          }
          this.cachedCards = parsed;
          return parsed;
        }
      }
    } catch {
      // fallback
    }

    this.cachedCards = DEFAULT_INFO_CARDS;
    return DEFAULT_INFO_CARDS;
  }

  public saveCards(cards: InfoCardRecord[]): void {
    this.cachedCards = cards;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
        this.broadcastChannel?.postMessage({
          type: "CARDS_UPDATED",
          cards,
        });
      } catch (err) {
        console.warn("Failed to persist info cards:", err);
      }
    }

    // Broadcast across all origins / ports via Supabase Realtime
    try {
      this.realtimeChannel?.send({
        type: "broadcast",
        event: "CARDS_UPDATED",
        payload: {
          cards,
          timestamp: Date.now(),
        },
      });
    } catch (err) {
      console.warn("[InfoCards] Realtime broadcast send error:", err);
    }

    this.notifyListeners();
  }

  public getActiveCard(platform: "desktop" | "web" = "desktop"): InfoCardRecord | null {
    const cards = this.getCards();
    const now = Date.now();

    const active = cards
      .filter((c) => c.active)
      .filter((c) => {
        if (c.target_audience === "all") return true;
        if (c.target_audience === platform) return true;
        return false;
      })
      .filter((c) => {
        // Duration / Scheduling check:
        if (c.start_at && new Date(c.start_at).getTime() > now) {
          return false; // Scheduled for future
        }
        if (c.end_at && new Date(c.end_at).getTime() < now) {
          return false; // Expired duration
        }
        return true;
      })
      .sort((a, b) => {
        const priorityDiff = (b.priority || 0) - (a.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        return timeB - timeA;
      });

    // Check dismissal behavior (session / snooze / forever)
    for (const card of active) {
      if (typeof window !== "undefined" && card.storage_key) {
        if (card.dismiss_type === "once") {
          if (sessionStorage.getItem(card.storage_key) === "dismissed") {
            continue;
          }
        } else if (card.dismiss_type === "snooze") {
          const stored = localStorage.getItem(card.storage_key);
          if (stored) {
            try {
              const { dismissedAt } = JSON.parse(stored);
              const cooloffMs = (card.snooze_days || 7) * 24 * 60 * 60 * 1000;
              if (now - dismissedAt < cooloffMs) {
                continue; // Still snoozed
              }
            } catch {
              if (stored === "dismissed") continue;
            }
          }
        } else if (card.dismiss_type === "forever") {
          if (localStorage.getItem(card.storage_key) === "dismissed") {
            continue;
          }
        }
      }
      return card;
    }

    return null;
  }

  public trackImpression(cardId: string): void {
    const cards = this.getCards().map((c) => {
      if (c.id === cardId) {
        return { ...c, impressions_count: (c.impressions_count || 0) + 1 };
      }
      return c;
    });
    this.saveCards(cards);

    try {
      this.realtimeChannel?.send({
        type: "broadcast",
        event: "METRICS_UPDATED",
        payload: { cardId, metric: "impressions", timestamp: Date.now() },
      });
    } catch {}
  }

  public trackClick(cardId: string): void {
    const cards = this.getCards().map((c) => {
      if (c.id === cardId) {
        return { ...c, clicks_count: (c.clicks_count || 0) + 1 };
      }
      return c;
    });
    this.saveCards(cards);

    try {
      this.realtimeChannel?.send({
        type: "broadcast",
        event: "METRICS_UPDATED",
        payload: { cardId, metric: "clicks", timestamp: Date.now() },
      });
    } catch {}
  }

  public trackDismiss(cardId: string): void {
    const card = this.getCards().find((c) => c.id === cardId);
    if (card && typeof window !== "undefined") {
      if (card.dismiss_type === "once") {
        sessionStorage.setItem(card.storage_key, "dismissed");
      } else if (card.dismiss_type === "snooze") {
        localStorage.setItem(
          card.storage_key,
          JSON.stringify({ dismissedAt: Date.now(), cardId })
        );
      } else {
        localStorage.setItem(card.storage_key, "dismissed");
      }
    }

    const cards = this.getCards().map((c) => {
      if (c.id === cardId) {
        return { ...c, dismisses_count: (c.dismisses_count || 0) + 1 };
      }
      return c;
    });
    this.saveCards(cards);

    try {
      this.realtimeChannel?.send({
        type: "broadcast",
        event: "METRICS_UPDATED",
        payload: { cardId, metric: "dismisses", timestamp: Date.now() },
      });
    } catch {}
  }

  public trackClaim(cardId: string): void {
    const card = this.getCards().find((c) => c.id === cardId);
    if (card && typeof window !== "undefined") {
      try {
        localStorage.setItem(`claimed_${card.storage_key}`, JSON.stringify({ claimedAt: Date.now(), cardId }));
      } catch {}
    }

    const cards = this.getCards().map((c) => {
      if (c.id === cardId) {
        return { ...c, claims_count: (c.claims_count || 0) + 1 };
      }
      return c;
    });
    this.saveCards(cards);

    try {
      this.realtimeChannel?.send({
        type: "broadcast",
        event: "METRICS_UPDATED",
        payload: { cardId, metric: "claims", timestamp: Date.now() },
      });
    } catch {}
  }

  public isCardClaimed(cardId: string, storageKey?: string): boolean {
    if (typeof window === "undefined") return false;
    const key = storageKey || `noska_card_${cardId}`;
    try {
      return !!localStorage.getItem(`claimed_${key}`);
    } catch {
      return false;
    }
  }

  public subscribe(listener: (cards: InfoCardRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getCards());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const cards = this.getCards();
    this.listeners.forEach((l) => l(cards));
  }
}

export const infoCardService = new InfoCardService();
