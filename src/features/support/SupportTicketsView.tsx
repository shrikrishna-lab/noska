/**
 * Noska Help Desk — dashboard "Support Tickets" view (real Supabase data).
 *
 * Designed with modern Bento & Tactile Folder Pocket Aesthetics:
 * - Bento-grid Metric HUD with floating dark/light badges
 * - Tactile Pastel Folder Pocket Category Launchers (Bugs, Features, Billing, Integrations)
 * - Master-Detail conversation hub with paper-card thread depth
 * - Real-time network diagnostic layers and responsive states
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LifeBuoy,
  Plus,
  Search,
  RefreshCw,
  Send,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Bug,
  Lightbulb,
  CreditCard,
  Plug,
  Building2,
  Tag,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  Layers,
  FileText,
  Lock,
  Headphones,
  Zap,
  MessageSquarePlus,
  Smile,
  Heart,
} from "lucide-react";
import {
  createSupportTicket,
  fetchSupportMessages,
  replyToSupportTicket,
  requestTicketConfirmEmail,
  diagnoseSupportBackend,
  useMySupportTickets,
  markTicketSeen,
  hasUnreadAdminReply,
  isOpenTicket,
  type SupportTicket,
  type SupportMessage,
  type BackendDiagnosis,
  type SupportTicketCategory,
  type SupportTicketPriority,
} from "./api";
import TicketComposerForm, {
  DEFAULT_COMPOSER_VALUES,
  type TicketComposerValues,
} from "./TicketComposerForm";
import { supabase } from "../../lib/supabase";

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; dot: string; bg: string }
> = {
  open: {
    label: "Open",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    dot: "bg-rose-500",
    bg: "from-rose-500/10 to-orange-500/5",
  },
  in_progress: {
    label: "In Progress",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
    bg: "from-amber-500/10 to-yellow-500/5",
  },
  pending: {
    label: "Pending",
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
    bg: "from-sky-500/10 to-blue-500/5",
  },
  resolved: {
    label: "Resolved",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
    bg: "from-emerald-500/10 to-teal-500/5",
  },
  closed: {
    label: "Closed",
    badge: "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20",
    dot: "bg-neutral-400",
    bg: "from-neutral-500/10 to-stone-500/5",
  },
};

const PRIORITY_CONFIG: Record<
  string,
  { label: string; badge: string }
> = {
  low: {
    label: "Low",
    badge: "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20",
  },
  medium: {
    label: "Medium",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  high: {
    label: "High",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold",
  },
  urgent: {
    label: "Urgent",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold",
  },
};

// Pastel Pocket Theme Palette inspired by reference Image 2
const FOLDER_POCKETS: Array<{
  category: SupportTicketCategory;
  title: string;
  subtitle: string;
  countLabel: string;
  folderBg: string;
  pocketBg: string;
  textColor: string;
  borderColor: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
    {
      category: "bug",
      title: "Bug Reports",
      subtitle: "Unexpected behavior & glitches",
      countLabel: "Direct Engineer Priority",
      folderBg: "bg-gradient-to-b from-rose-100/80 to-rose-50/50 dark:from-rose-950/40 dark:to-rose-900/20",
      pocketBg: "bg-gradient-to-t from-rose-200/90 via-rose-100/80 to-rose-50/60 dark:from-rose-900/60 dark:via-rose-950/50 dark:to-rose-900/30",
      textColor: "text-rose-950 dark:text-rose-200",
      borderColor: "border-rose-200/80 dark:border-rose-500/20",
      icon: Bug,
    },
    {
      category: "feature",
      title: "Feature Requests",
      subtitle: "Canvas tools, blocks & AI ideas",
      countLabel: "Product Roadmap Queue",
      folderBg: "bg-gradient-to-b from-purple-100/80 to-purple-50/50 dark:from-purple-950/40 dark:to-purple-900/20",
      pocketBg: "bg-gradient-to-t from-purple-200/90 via-purple-100/80 to-purple-50/60 dark:from-purple-900/60 dark:via-purple-950/50 dark:to-purple-900/30",
      textColor: "text-purple-950 dark:text-purple-200",
      borderColor: "border-purple-200/80 dark:border-purple-500/20",
      icon: Lightbulb,
    },
    {
      category: "billing",
      title: "Billing & Plans",
      subtitle: "Invoices, seats & subscriptions",
      countLabel: "Finance & Accounts",
      folderBg: "bg-gradient-to-b from-amber-100/80 to-amber-50/50 dark:from-amber-950/40 dark:to-amber-900/20",
      pocketBg: "bg-gradient-to-t from-amber-200/90 via-amber-100/80 to-amber-50/60 dark:from-amber-900/60 dark:via-amber-950/50 dark:to-amber-900/30",
      textColor: "text-amber-950 dark:text-amber-200",
      borderColor: "border-amber-200/80 dark:border-amber-500/20",
      icon: CreditCard,
    },
    {
      category: "integration",
      title: "Integrations & API",
      subtitle: "MCP servers, Slack, GitHub sync",
      countLabel: "Developer Ecosystem",
      folderBg: "bg-gradient-to-b from-sky-100/80 to-sky-50/50 dark:from-sky-950/40 dark:to-sky-900/20",
      pocketBg: "bg-gradient-to-t from-sky-200/90 via-sky-100/80 to-sky-50/60 dark:from-sky-900/60 dark:via-sky-950/50 dark:to-sky-900/30",
      textColor: "text-sky-950 dark:text-sky-200",
      borderColor: "border-sky-200/80 dark:border-sky-500/20",
      icon: Plug,
    },
  ];

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

type Filter = "all" | "open" | "unread" | "resolved";

const SUPPORT_JOURNEY_STAGES = [
  {
    id: "create",
    label: "Create Ticket",
    description: "User submits a support request",
    icon: MessageSquarePlus,
    color: "text-amber-500",
    glow: "bg-amber-400/25",
  },
  {
    id: "connect",
    label: "Admin Connects",
    description: "Core engineer takes ownership",
    icon: Headphones,
    color: "text-sky-500",
    glow: "bg-sky-400/25",
  },
  {
    id: "reply",
    label: "Solution Dispatched",
    description: "Direct diagnosis and verified fix",
    icon: Zap,
    color: "text-indigo-500",
    glow: "bg-indigo-400/25",
  },
  {
    id: "happy",
    label: "Problem Solved",
    description: "Issue resolved & user is happy!",
    icon: Smile,
    color: "text-emerald-500",
    glow: "bg-emerald-400/25",
  },
];

export default function SupportTicketsView({ onToast }: { onToast?: (m: string) => void }) {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
  const displayName = user?.fullName || user?.username || email.split("@")[0] || "there";

  const { tickets, loading, error, offline, updatedAt, stale, refresh } = useMySupportTickets();
  const [filter, setFilter] = useState<Filter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerValues, setComposerValues] = useState<TicketComposerValues>({
    ...DEFAULT_COMPOSER_VALUES,
    category: "bug",
    email: "",
    name: "",
  });
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [journeyIndex, setJourneyIndex] = useState(0);

  // Cyclical Support Journey Animation (Create -> Connect -> Solve -> Happy)
  useEffect(() => {
    const timer = setInterval(() => {
      setJourneyIndex((prev) => (prev + 1) % SUPPORT_JOURNEY_STAGES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) || null,
    [tickets, selectedId]
  );

  useEffect(() => {
    if (selectedId && !tickets.some((t) => t.id === selectedId)) setSelectedId(null);
  }, [tickets, selectedId]);

  // Auto-select first ticket on wide screens
  useEffect(() => {
    if (!selectedId && tickets.length > 0 && window.innerWidth >= 1024) {
      setSelectedId(tickets[0].id);
    }
  }, [tickets, selectedId]);

  const stats = useMemo(() => {
    const open = tickets.filter(isOpenTicket);
    const unread = tickets.filter(hasUnreadAdminReply).length;
    const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
    return { open: open.length, unread, resolved, total: tickets.length };
  }, [tickets]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filter === "open" && !isOpenTicket(t)) return false;
      if (filter === "unread" && !hasUnreadAdminReply(t)) return false;
      if (filter === "resolved" && isOpenTicket(t)) return false;
      if (categoryFilter !== "all" && t.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        (t.ticket_number || "").toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    });
  }, [tickets, filter, categoryFilter, query]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 650));
    try {
      await Promise.all([refresh(), minDelay]);
    } finally {
      setRefreshing(false);
    }
  };

  const openTicket = (t: SupportTicket) => {
    setSelectedId(t.id);
    markTicketSeen(t.id);
  };

  const handleCopyTicketNumber = (e: React.MouseEvent, num: string) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(num);
    setCopiedId(num);
    onToast?.(`Copied ${num} to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenComposer = (cat: SupportTicketCategory = "bug") => {
    setComposerValues({
      ...DEFAULT_COMPOSER_VALUES,
      category: cat,
      email: email || composerValues.email,
      name: typeof displayName === "string" ? displayName : "",
    });
    setComposerError(null);
    setComposerOpen(true);
  };

  const handleCreateTicket = async () => {
    if (submittingTicket) return;
    if (!composerValues.email.trim() || !composerValues.subject.trim() || !composerValues.description.trim()) {
      setComposerError("Please fill in your email, subject, and description.");
      return;
    }
    setComposerError(null);
    setSubmittingTicket(true);
    try {
      const created = await createSupportTicket({
        subject: composerValues.subject,
        description: composerValues.description,
        category: composerValues.category,
        priority: composerValues.priority,
        email: composerValues.email,
        name: composerValues.name,
        platform: "dashboard",
      });
      void requestTicketConfirmEmail(supabase, created.ticket_number, composerValues.email.trim());
      setComposerOpen(false);
      void refresh().then(() => setSelectedId(created.id));
      onToast?.(`Ticket ${created.ticket_number} created successfully`);
    } catch (err) {
      setComposerError(err instanceof Error ? err.message : "Failed to create ticket.");
    } finally {
      setSubmittingTicket(false);
    }
  };

  // ================= DEDICATED SEPARATE PAGE/SECTION: OPEN SUPPORT TICKET =================
  if (composerOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="mx-auto flex h-full w-full min-h-0 flex-1 flex-col overflow-y-auto max-w-4xl gap-5 p-4 sm:p-6 select-none font-sans text-neutral-900 dark:text-[#EDEBE5]"
      >
        {/* Navigation & Breadcrumb Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setComposerOpen(false)}
              className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-white/[0.06] hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 border border-black/10 dark:border-white/10 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
              <span>Back to Support Hub</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500 font-medium">
              <span>/</span>
              <span className="text-neutral-700 dark:text-neutral-300 font-semibold">Open Support Ticket</span>
            </div>
          </div>

          {/* Frosted SLA badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <Clock size={13} className="text-amber-500" />
            <span>Avg response: <strong>4–24h</strong></span>
          </div>
        </div>

        {/* Dedicated Ticket Composer Form Section */}
        <div className="relative rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#14161F] p-6 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
          <TicketComposerForm
            values={composerValues}
            onChange={(p) => setComposerValues((v) => ({ ...v, ...p }))}
            onSubmit={() => void handleCreateTicket()}
            loading={submittingTicket}
            error={composerError}
            showHeader={true}
            title="Open a Support Ticket"
            subtitle="Describe your issue or request. Our engineering team reviews and responds directly."
            envLabel="Dashboard"
            submitLabel="Submit Support Ticket"
          />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full min-h-0 flex-1 flex-col overflow-y-auto max-w-6xl gap-5 p-4 sm:p-6 select-none font-sans text-neutral-900 dark:text-[#EDEBE5]">
      {/* ================= DYNAMIC ISLAND STADIUM CAPSULE HEADER (Animated Perimeter Border & Texture) ================= */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="relative w-full shrink-0 rounded-[34px] p-1.5 sm:p-2 bg-gradient-to-b from-neutral-300/80 via-neutral-200/50 to-neutral-300/30 dark:from-white/15 dark:via-white/5 dark:to-white/10 shadow-[0_16px_45px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-3xl border border-black/5 dark:border-white/10 overflow-hidden"
      >
        {/* Outer Orbiting Conic Border Aura */}
        <div className="pointer-events-none absolute -inset-[100%] animate-[spin_8s_linear_infinite] opacity-30 dark:opacity-40">
          <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0_300deg,#FFC107_335deg,#FFF_350deg,transparent_360deg)] blur-xl" />
        </div>

        <header className="relative flex shrink-0 min-h-[72px] sm:min-h-[76px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6 rounded-[28px] bg-[#0A0B10] text-white shadow-2xl overflow-hidden group">
          {/* Ceramic / Obsidian Sub-pixel Stipple Texture */}
          <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:12px_12px]" />

          {/* Continuous Traveling Golden Laser Perimeter Border with True Feather-Faded Start & End (No Sharp Edges) */}
          <div className="pointer-events-none absolute inset-0 rounded-[28px] overflow-hidden z-0">
            {/* Diffused Ambient Glow Layer */}
            <div
              className="absolute inset-0 rounded-[28px]"
              style={{
                padding: "3.5px",
                mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                maskComposite: "exclude",
                WebkitMaskComposite: "xor",
              }}
            >
              <div
                className="absolute -inset-[150%] animate-[spin_5.5s_linear_infinite]"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(255, 193, 7, 0.01) 280deg, rgba(255, 193, 7, 0.3) 310deg, rgba(255, 213, 79, 0.85) 345deg, #FFFFFF 355deg, rgba(255, 255, 255, 0.2) 358deg, transparent 360deg)",
                  filter: "blur(6px)",
                }}
              />
            </div>

            {/* Crisp High-Definition Laser Core with Smooth Feathered Head & Tail */}
            <div
              className="absolute inset-0 rounded-[28px]"
              style={{
                padding: "1.75px",
                mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                maskComposite: "exclude",
                WebkitMaskComposite: "xor",
              }}
            >
              <div
                className="absolute -inset-[150%] animate-[spin_5.5s_linear_infinite]"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(255, 193, 7, 0.02) 280deg, rgba(255, 193, 7, 0.5) 315deg, rgba(255, 224, 130, 0.95) 348deg, #FFFFFF 355deg, rgba(255, 255, 255, 0.3) 358deg, transparent 360deg)",
                }}
              />
            </div>
          </div>

          {/* Left: Circular White Brand Emblem + Status Info */}
          <div className="flex items-center gap-3.5 z-10">
            {/* Crisp White Circular Brand Badge with Rich Micro-Animated Journey Stages */}
            {(() => {
              const currentStage = SUPPORT_JOURNEY_STAGES[journeyIndex];
              return (
                <div className="relative flex items-center justify-center group/emblem">
                  {/* Dynamic Ambient Glow matching the active stage */}
                  <motion.div
                    key={`glow-${currentStage.id}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1.15 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className={`absolute -inset-2 rounded-full ${currentStage.glow} blur-lg pointer-events-none`}
                  />

                  <div
                    title={`${currentStage.label}: ${currentStage.description}`}
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-neutral-950 shadow-[0_4px_20px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.08)] transition-all duration-300 group-hover/emblem:scale-110 overflow-hidden cursor-help"
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentStage.id}
                        initial={{ opacity: 0, scale: 0.4, rotate: -20, y: 6 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.4, rotate: 20, y: -6 }}
                        transition={{ type: "spring", stiffness: 450, damping: 24 }}
                        className={`relative flex items-center justify-center ${currentStage.color}`}
                      >
                        {currentStage.id === "create" && (
                          <div className="relative flex items-center justify-center">
                            <MessageSquarePlus size={20} strokeWidth={2.2} />
                            <motion.span
                              animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                              transition={{ repeat: Infinity, duration: 1.2 }}
                              className="absolute -top-1 -right-1 text-amber-500"
                            >
                              <Sparkles size={8} />
                            </motion.span>
                          </div>
                        )}

                        {currentStage.id === "connect" && (
                          <div className="relative flex items-center justify-center">
                            {/* Left Sound Wave Arc */}
                            <motion.span
                              animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
                              transition={{ repeat: Infinity, duration: 0.9 }}
                              className="absolute -left-2 text-sky-400 text-[10px] font-bold select-none"
                            >
                              (
                            </motion.span>
                            <Headphones size={20} strokeWidth={2.2} />
                            {/* Right Sound Wave Arc */}
                            <motion.span
                              animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
                              transition={{ repeat: Infinity, duration: 0.9, delay: 0.15 }}
                              className="absolute -right-2 text-sky-400 text-[10px] font-bold select-none"
                            >
                              )
                            </motion.span>
                          </div>
                        )}

                        {currentStage.id === "reply" && (
                          <div className="relative flex items-center justify-center">
                            <motion.div
                              animate={{ rotate: [-8, 8, -8] }}
                              transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
                            >
                              <Zap size={20} strokeWidth={2.4} />
                            </motion.div>
                          </div>
                        )}

                        {currentStage.id === "happy" && (
                          <div className="relative flex items-center justify-center">
                            <Smile size={21} strokeWidth={2.2} />
                            <motion.span
                              animate={{ scale: [0.8, 1.3, 0.8], rotate: [0, 20, 0] }}
                              transition={{ repeat: Infinity, duration: 1 }}
                              className="absolute -top-1 -right-1 text-emerald-400"
                            >
                              <Heart size={8} fill="currentColor" />
                            </motion.span>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              );
            })()}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white drop-shadow-xs">
                  Support Hub Live
                </h1>

                {/* Apple-Style Frosted Live Response Pill */}
                <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.08] hover:bg-white/[0.12] text-neutral-200 border border-white/15 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-colors">
                  {/* Bouncing Audio Waveform Bars */}
                  <div className="flex items-end gap-[2px] h-3">
                    <motion.div
                      animate={{ height: ["4px", "11px", "5px"] }}
                      transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }}
                      className="w-[2px] rounded-full bg-gradient-to-t from-amber-400 to-amber-200"
                    />
                    <motion.div
                      animate={{ height: ["9px", "4px", "11px"] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: 0.15, ease: "easeInOut" }}
                      className="w-[2px] rounded-full bg-gradient-to-t from-amber-400 to-amber-200"
                    />
                    <motion.div
                      animate={{ height: ["5px", "11px", "4px"] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: 0.3, ease: "easeInOut" }}
                      className="w-[2px] rounded-full bg-gradient-to-t from-amber-400 to-amber-200"
                    />
                    <motion.div
                      animate={{ height: ["8px", "3px", "9px"] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: 0.45, ease: "easeInOut" }}
                      className="w-[2px] rounded-full bg-gradient-to-t from-amber-400 to-amber-200"
                    />
                  </div>
                  <span className="flex items-center gap-1">
                    <span className="font-bold text-[#FFE082]">4–24h</span>
                    <span className="text-white/60 text-[10.5px]">avg response</span>
                  </span>
                </div>
              </div>

              <p className="text-[11.5px] text-white/70 mt-0.5 flex items-center gap-1.5 font-normal">
                <span>We review every request personally</span>
                <span className="text-white/30">•</span>
                <span className="text-[#FFD54F]/95 font-medium">Direct line to Noska creators</span>
              </p>
            </div>
          </div>

          {/* Right: Frosted Capsule Action Buttons */}
          <div className="flex items-center gap-2 z-10 ml-auto">
            <button
              type="button"
              onClick={handleRefresh}
              title="Refresh tickets"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/15 transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin text-[#FFD54F]" : ""} />
            </button>

            <button
              type="button"
              onClick={() => handleOpenComposer("bug")}
              className="group relative flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.15] hover:bg-white/[0.25] text-white font-bold text-xs border border-white/25 hover:border-white/45 shadow-[0_2px_12px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.3)] transition-all active:scale-95 cursor-pointer backdrop-blur-md overflow-hidden"
            >
              {/* Subtle button border ray */}
              <div className="absolute inset-0 rounded-full border border-[#FFC107]/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus size={13} className="text-[#FFD54F] transition-transform group-hover:rotate-90" />
              <span>New Ticket</span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
            </button>
          </div>
        </header>
      </motion.div>

      {/* ================= BENTO METRICS HUD (Real Interactive Data & Visuals) ================= */}
      {(() => {
        const resolveRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 100;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Active Tickets */}
            <button
              type="button"
              onClick={() => setFilter("open")}
              className={`group relative flex flex-col justify-between p-4 rounded-3xl border text-left transition-all cursor-pointer overflow-hidden ${filter === "open"
                  ? "bg-white dark:bg-[#181A22] border-amber-500/40 dark:border-amber-400/40 shadow-md shadow-amber-500/5 scale-[1.01]"
                  : "bg-white/70 dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.07] hover:bg-white dark:hover:bg-white/[0.06]"
                }`}
            >
              {/* Top Row: Real Icon + Live Number + Badge */}
              <div className="flex items-center justify-between gap-3 mb-3 w-full">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-xs transition-transform group-hover:scale-105">
                    <Clock size={16} strokeWidth={2.4} />
                  </div>
                  <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                    {stats.open}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-xs ${stats.open > 0
                      ? "bg-amber-500 text-white"
                      : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                    }`}
                >
                  {stats.open > 0 ? `${stats.open} Open` : "0 Active"}
                </span>
              </div>

              {/* Bottom Row: Title + Muted Subtitle */}
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white leading-tight">
                  Active Tickets
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-[#8E92A4] mt-0.5 leading-snug">
                  {stats.open > 0 ? "In review with our engineering core" : "No pending tickets in flight"}
                </p>
              </div>

              {filter === "open" && (
                <div className="pointer-events-none absolute inset-x-4 bottom-0 h-[2.5px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              )}
            </button>

            {/* Card 2: Unread Messages */}
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`group relative flex flex-col justify-between p-4 rounded-3xl border text-left transition-all cursor-pointer overflow-hidden ${filter === "unread"
                  ? "bg-white dark:bg-[#181A22] border-rose-500/40 dark:border-rose-400/40 shadow-md shadow-rose-500/5 scale-[1.01]"
                  : "bg-white/70 dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.07] hover:bg-white dark:hover:bg-white/[0.06]"
                }`}
            >
              <div className="flex items-center justify-between gap-3 mb-3 w-full">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${stats.unread > 0
                        ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      } shadow-xs transition-transform group-hover:scale-105`}
                  >
                    {stats.unread > 0 ? (
                      <Inbox size={16} strokeWidth={2.4} />
                    ) : (
                      <CheckCircle2 size={16} strokeWidth={2.4} />
                    )}
                  </div>
                  <span
                    className={`text-2xl font-black tracking-tight ${stats.unread > 0 ? "text-rose-600 dark:text-rose-400" : "text-neutral-900 dark:text-white"
                      }`}
                  >
                    {stats.unread}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-xs ${stats.unread > 0
                      ? "bg-rose-500 text-white animate-pulse"
                      : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                    }`}
                >
                  {stats.unread > 0 ? `${stats.unread} New` : "Synced"}
                </span>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white leading-tight">
                  Unread Replies
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-[#8E92A4] mt-0.5 leading-snug">
                  {stats.unread > 0 ? "New messages awaiting your review" : "All staff conversations up to date"}
                </p>
              </div>

              {filter === "unread" && (
                <div className="pointer-events-none absolute inset-x-4 bottom-0 h-[2.5px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
              )}
            </button>

            {/* Card 3: Resolved Issues */}
            <button
              type="button"
              onClick={() => setFilter("resolved")}
              className={`group relative flex flex-col justify-between p-4 rounded-3xl border text-left transition-all cursor-pointer overflow-hidden ${filter === "resolved"
                  ? "bg-white dark:bg-[#181A22] border-emerald-500/40 dark:border-emerald-400/40 shadow-md shadow-emerald-500/5 scale-[1.01]"
                  : "bg-white/70 dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.07] hover:bg-white dark:hover:bg-white/[0.06]"
                }`}
            >
              <div className="flex items-center justify-between gap-3 mb-3 w-full">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-xs transition-transform group-hover:scale-105">
                    <CheckCircle2 size={16} strokeWidth={2.4} />
                  </div>
                  <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                    {stats.resolved}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-xs bg-emerald-600 text-white">
                  {resolveRate}% Solved
                </span>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white leading-tight">
                  Resolved Issues
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-[#8E92A4] mt-0.5 leading-snug">
                  {stats.resolved > 0 ? `${stats.resolved} verified solutions applied` : "Closed fixes will appear here"}
                </p>
              </div>

              {filter === "resolved" && (
                <div className="pointer-events-none absolute inset-x-4 bottom-0 h-[2.5px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              )}
            </button>

            {/* Card 4: Total Conversations / Support Chats */}
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`group relative flex flex-col justify-between p-4 rounded-3xl border text-left transition-all cursor-pointer overflow-hidden ${filter === "all"
                  ? "bg-white dark:bg-[#181A22] border-indigo-500/40 dark:border-indigo-400/40 shadow-md shadow-indigo-500/5 scale-[1.01]"
                  : "bg-white/70 dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.07] hover:bg-white dark:hover:bg-white/[0.06]"
                }`}
            >
              <div className="flex items-center justify-between gap-3 mb-3 w-full">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-xs transition-transform group-hover:scale-105">
                    <MessageSquare size={16} strokeWidth={2.4} />
                  </div>
                  <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                    {stats.total}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-xs bg-indigo-600 text-white">
                  {stats.total === 1 ? "1 Thread" : `${stats.total} Threads`}
                </span>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white leading-tight">
                  Total Conversations
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-[#8E92A4] mt-0.5 leading-snug">
                  {stats.total > 0 ? "Direct threads with engineering core" : "All your tickets & chats will show here"}
                </p>
              </div>

              {filter === "all" && (
                <div className="pointer-events-none absolute inset-x-4 bottom-0 h-[2.5px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
              )}
            </button>
          </div>
        );
      })()}

      {/* ================= FILTER & SEARCH STRIP ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06] backdrop-blur-md">
          {[
            { id: "all", label: "All Tickets", count: stats.total },
            { id: "open", label: "Open", count: stats.open },
            { id: "unread", label: "Unread", count: stats.unread },
            { id: "resolved", label: "Resolved", count: stats.resolved },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id as Filter)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${filter === f.id
                  ? "bg-white dark:bg-white/20 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 dark:text-[#8E92A4] hover:text-neutral-900 dark:hover:text-white"
                }`}
            >
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filter === f.id
                    ? "bg-neutral-900/10 dark:bg-white/20 text-neutral-900 dark:text-white font-bold"
                    : "bg-black/[0.05] dark:bg-white/10 text-neutral-400 dark:text-neutral-500"
                  }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickets, IDs, topics…"
            className="h-10 w-full rounded-2xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/[0.04] pl-9 pr-8 text-xs text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400 focus:border-[#FF6B4A]/50 focus:ring-2 focus:ring-[#FF6B4A]/20 transition-all shadow-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ================= WORKSPACE BODY ================= */}
      {loading ? (
        <div className="flex flex-1 min-h-[380px] flex-col items-center justify-center gap-3 rounded-3xl border border-black/[0.05] dark:border-white/[0.06] bg-white/40 dark:bg-white/[0.02] text-neutral-400">
          <Loader2 size={24} className="animate-spin text-[#FF6B4A]" />
          <p className="text-xs font-medium">Syncing support conversations…</p>
        </div>
      ) : error && visible.length === 0 ? (
        /* ================= ELEVATED TROUBLESHOOTING CARD ================= */
        <div className="relative flex flex-1 min-h-[380px] flex-col items-center justify-center gap-4 rounded-3xl border border-[#FF6B4A]/20 bg-gradient-to-b from-[#FF6B4A]/[0.05] via-white/50 to-white/70 dark:from-[#FF6B4A]/[0.08] dark:via-white/[0.02] dark:to-transparent p-8 text-center backdrop-blur-2xl shadow-sm">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-3xl bg-[#FF6B4A]/10 text-[#FF6B4A] shadow-lg shadow-[#FF6B4A]/15 border border-[#FF6B4A]/20">
            <AlertCircle size={26} />
          </div>

          <div className="max-w-md">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Support Connectivity Notice
            </h3>
            <p className="mt-1 text-xs text-neutral-600 dark:text-[#A0A4B8] leading-relaxed">
              {offline
                ? "Your device is currently offline. Please check your internet connection to load and send support tickets."
                : error}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-md hover:brightness-110 transition-all active:scale-95 cursor-pointer disabled:opacity-75"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin text-[#FF6B4A]" : ""} />
              <span>{refreshing ? "Retrying Connection…" : "Retry Connection"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenComposer("bug")}
              className="px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.05] text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-white/10 transition-all cursor-pointer"
            >
              Open Offline Ticket
            </button>
          </div>

          {!offline && <ConnectionDiagnostics />}
        </div>
      ) : visible.length === 0 ? (
        /* ================= TACTILE FOLDER POCKETS (Inspired by Image 2) ================= */
        <div className="flex flex-1 flex-col gap-6 py-4">
          <div className="text-center max-w-md mx-auto">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              {tickets.length === 0 ? "How can our engineering team assist you?" : "No matching tickets found"}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-[#8E92A4] mt-1">
              {tickets.length === 0
                ? "Select a topic folder below to open a direct thread with our core team."
                : "Try adjusting your search query or switching your status filter above."}
            </p>
          </div>

          {tickets.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FOLDER_POCKETS.map((f) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.category}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => handleOpenComposer(f.category)}
                    className={`group relative flex flex-col justify-between h-56 rounded-3xl p-4 border ${f.borderColor} ${f.folderBg} shadow-md hover:shadow-xl cursor-pointer overflow-hidden select-none`}
                  >
                    {/* Hover Orbiting Border Beam Highlight */}
                    <div className="pointer-events-none absolute -inset-[100%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-[spin_5s_linear_infinite]">
                      <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0_320deg,rgba(255,193,7,0.35)_350deg,transparent_360deg)]" />
                    </div>

                    {/* Floating Paper Cards Peeking Out of Pocket */}
                    <div className="relative z-10 flex justify-center -space-x-4 mb-2">
                      <div className="w-16 h-18 rounded-2xl bg-white dark:bg-[#1E202C] border border-black/10 dark:border-white/15 shadow-sm transform -rotate-6 p-2 flex flex-col justify-between">
                        <Icon size={14} className="text-[#FF6B4A]" />
                        <div className="h-1.5 w-8 rounded-full bg-neutral-200 dark:bg-white/20" />
                      </div>
                      <div className="w-16 h-18 rounded-2xl bg-white dark:bg-[#252836] border border-black/10 dark:border-white/15 shadow-md transform rotate-4 p-2 flex flex-col justify-between">
                        <Sparkles size={14} className="text-amber-400" />
                        <div className="h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-white/20" />
                      </div>
                    </div>

                    {/* Tactile Front Pocket */}
                    <div
                      className={`relative z-20 rounded-2xl p-3.5 border ${f.borderColor} ${f.pocketBg} shadow-sm backdrop-blur-md flex flex-col justify-between`}
                    >
                      <div>
                        <h4 className={`text-xs font-bold ${f.textColor}`}>
                          {f.title}
                        </h4>
                        <p className="text-[10.5px] opacity-75 line-clamp-1 mt-0.5">
                          {f.subtitle}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/5 dark:border-white/10 text-[10px] font-semibold opacity-85">
                        <span>{f.countLabel}</span>
                        <ArrowRight size={12} className="transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================= SPLIT MASTER-DETAIL WORKSPACE ================= */
        <div className="grid min-h-[500px] flex-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* List Stream */}
          <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto pr-1">
            {visible.map((t) => {
              const active = t.id === selectedId;
              const unread = hasUnreadAdminReply(t);
              const status = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
              const priority = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openTicket(t)}
                  className={`group relative flex flex-col gap-2.5 rounded-3xl border p-4 text-left transition-all cursor-pointer ${active
                      ? "bg-white dark:bg-[#181A22] border-[#FF6B4A]/40 dark:border-[#FF6B4A]/50 shadow-md shadow-[#FF6B4A]/5 scale-[1.005]"
                      : "bg-white/70 dark:bg-white/[0.03] border-black/[0.05] dark:border-white/[0.06] hover:bg-white dark:hover:bg-white/[0.06]"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {unread && (
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                        </span>
                      )}
                      <p className="min-w-0 font-bold text-xs sm:text-[13px] tracking-tight text-neutral-900 dark:text-white truncate">
                        {t.subject}
                      </p>
                    </div>

                    <span className="shrink-0 text-[10px] font-mono font-semibold text-neutral-400 dark:text-neutral-500">
                      {timeAgo(t.last_update)}
                    </span>
                  </div>

                  {t.description && (
                    <p className="text-[11px] text-neutral-500 dark:text-[#8E92A4] line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${status.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priority.badge}`}>
                        {priority.label}
                      </span>
                    </div>

                    <div
                      onClick={(e) => handleCopyTicketNumber(e, t.ticket_number || t.id.slice(0, 8))}
                      className="flex items-center gap-1 text-[10.5px] font-mono text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
                      title="Click to copy ticket ID"
                    >
                      <span>{t.ticket_number || t.id.slice(0, 8)}</span>
                      {copiedId === (t.ticket_number || t.id.slice(0, 8)) ? (
                        <Check size={10} className="text-emerald-500" />
                      ) : (
                        <Copy size={10} className="opacity-0 group-hover:opacity-60" />
                      )}
                    </div>
                  </div>

                  {active && (
                    <div className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-r-full bg-[#FF6B4A]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Conversation Detail Pane */}
          <div className="min-h-[500px] flex flex-col">
            {selected ? (
              <TicketThread
                key={selected.id}
                ticket={selected}
                offline={offline}
                onToast={onToast}
                onChanged={refresh}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-black/[0.06] dark:border-white/[0.06] bg-white/40 dark:bg-white/[0.02] p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 text-neutral-400">
                  <ShieldCheck size={22} />
                </div>
                <p className="text-sm font-bold text-neutral-800 dark:text-white">
                  Select a Conversation
                </p>
                <p className="max-w-[240px] text-xs text-neutral-400">
                  Pick a support ticket from the list to view the conversation and reply to our engineers.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionDiagnostics() {
  const [open, setOpen] = useState(false);
  const [diag, setDiag] = useState<BackendDiagnosis | null>(null);
  const [checking, setChecking] = useState(false);

  const run = async () => {
    setChecking(true);
    try {
      setDiag(await diagnoseSupportBackend());
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (open && !diag && !checking) void run();
  }, [open]);

  const rows: Array<[string, boolean | null]> = diag
    ? [
      ["Internet Connection", diag.online],
      [`API Gateway (${diag.host})`, diag.hostReachable],
      ["PostgREST Service", diag.apiReachable],
      ["Support RPC Endpoint", diag.rpcReachable],
    ]
    : [];

  return (
    <div className="w-full max-w-sm mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors underline-offset-4 hover:underline cursor-pointer"
      >
        {open ? "Hide technical diagnostic" : "Show diagnostic details"}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-[#181A22] p-4 text-left shadow-lg"
        >
          {checking && !diag ? (
            <p className="flex items-center gap-2 text-xs text-neutral-500">
              <Loader2 size={13} className="animate-spin text-[#FF6B4A]" /> Probing network layers…
            </p>
          ) : diag ? (
            <>
              <ul className="space-y-1.5">
                {rows.map(([label, ok]) => (
                  <li key={label} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-300">{label}</span>
                    {ok === null ? (
                      <span className="text-neutral-400 font-mono text-[11px]">Pending</span>
                    ) : ok ? (
                      <span className="flex items-center gap-1 text-emerald-500 font-medium text-[11px]">
                        <CheckCircle2 size={13} /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-500 font-medium text-[11px]">
                        <X size={13} /> Blocked
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400 border-t border-black/5 dark:border-white/5 pt-2">
                {diag.hint}
              </p>
              <button
                type="button"
                onClick={() => void run()}
                className="mt-2 text-xs font-bold text-[#FF6B4A] hover:underline cursor-pointer"
              >
                Re-run probe
              </button>
            </>
          ) : null}
        </motion.div>
      )}
    </div>
  );
}

function TicketThread({
  ticket,
  offline,
  onToast,
  onChanged,
}: {
  ticket: SupportTicket;
  offline: boolean;
  onToast?: (m: string) => void;
  onChanged: () => void;
}) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const closed = ticket.status === "closed";
  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;

  const load = React.useCallback(async () => {
    try {
      const rows = await fetchSupportMessages(ticket.id);
      setMessages(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, [ticket.id]);

  useEffect(() => {
    setLoading(true);
    void load();
    markTicketSeen(ticket.id);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load, ticket.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending || closed) return;
    setSending(true);
    try {
      const msg = await replyToSupportTicket(ticket.id, text);
      setMessages((prev) => [...prev, msg]);
      setDraft("");
      markTicketSeen(ticket.id);
      onChanged();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Reply failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-[500px] flex-col overflow-hidden rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#14161F]/90 backdrop-blur-2xl shadow-sm">
      {/* Thread Header */}
      <div className="border-b border-black/[0.06] dark:border-white/[0.08] p-5 bg-black/[0.01] dark:bg-white/[0.01]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#FF6B4A]">
                {ticket.ticket_number || ticket.id.slice(0, 8)}
              </span>
              <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                {ticket.subject}
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Opened {new Date(ticket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · Category: {ticket.category}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${status.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priority.badge}`}>
              {priority.label}
            </span>
          </div>
        </div>

        {ticket.description && (
          <div className="mt-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] p-3.5 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300 border border-black/[0.04] dark:border-white/[0.05]">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Initial Issue Description
            </span>
            {ticket.description}
          </div>
        )}
      </div>

      {/* Message Stream */}
      <div className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-5">
        {loading ? (
          <div className="flex h-full items-center justify-center text-neutral-400">
            <Loader2 size={20} className="animate-spin text-[#FF6B4A]" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-rose-500">
            <AlertCircle size={18} className="mx-auto mb-2" />
            <span>{error}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-neutral-400">
            <MessageSquare size={24} className="text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              No replies yet
            </p>
            <p className="text-[11px] text-neutral-400 max-w-xs mt-0.5">
              Our engineering team is reviewing this ticket and will respond directly in this thread.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_type === "user";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${mine
                      ? "bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-900 text-white dark:from-white dark:via-[#FFEBE3] dark:to-white dark:text-neutral-950 rounded-br-xs"
                      : "bg-white dark:bg-white/[0.07] text-neutral-800 dark:text-neutral-100 border border-black/[0.06] dark:border-white/[0.08] rounded-bl-xs"
                    }`}
                >
                  {!mine && (
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-[#FF6B4A]">
                      <ShieldCheck size={12} />
                      <span className="uppercase tracking-wider">{m.sender_name} · Support Engineer</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  <p
                    className={`mt-1.5 text-[10px] text-right font-mono ${mine ? "text-white/60 dark:text-neutral-600" : "text-neutral-400"
                      }`}
                  >
                    {timeAgo(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Message Composer Dock */}
      <div className="border-t border-black/[0.06] dark:border-white/[0.08] p-3.5 bg-black/[0.01] dark:bg-white/[0.01]">
        {closed ? (
          <p className="rounded-2xl bg-neutral-500/10 px-4 py-3 text-center text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            This conversation is closed. Open a new ticket if you need further assistance.
          </p>
        ) : offline ? (
          <p className="rounded-2xl bg-amber-500/[0.08] px-4 py-3 text-center text-xs font-medium text-amber-700 dark:text-amber-400">
            You're currently offline — reconnect to send messages.
          </p>
        ) : (
          <div className="flex items-end gap-2.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder="Type your response… (Enter to send, Shift+Enter for new line)"
              className="max-h-28 min-h-[46px] flex-1 resize-y rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3.5 py-2.5 text-xs sm:text-[13px] text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400 focus:border-[#FF6B4A]/50 focus:ring-2 focus:ring-[#FF6B4A]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!draft.trim() || sending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF6B4A] to-[#FF8E53] text-white shadow-md transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 cursor-pointer"
              title="Send reply"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
