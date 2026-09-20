import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { fetchPublicPlans, OFFICIAL_PUBLIC_PLANS, yearlySavings, formatMoney, startCheckout } from "@/lib/billing/api";
import type { PublicPlan } from "@/lib/billing/api";
import { openRazorpayCheckout } from "@/lib/billing/razorpay";
import { verifyPayment } from "@/lib/billing/api";
import { billingMessage } from "@/lib/billing/errors";
import { useEntitlements, notifyBillingChanged } from "@/hooks/billing/useEntitlements";
import { PlanBadge } from "./PlanBadge";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const FEATURE_LABELS: Record<string, string> = {
  ai_generation: "AI generation", ai_image_analysis: "AI image analysis", ai_file_analysis: "AI file analysis",
  advanced_databases: "Advanced databases", database_automations: "Database automations",
  custom_agents: "Custom agents", agent_memory: "Agent memory",
  automation: "Automations", mcp_access: "MCP access", advanced_mcp: "Advanced MCP",
  pdf_export: "PDF export", advanced_export: "Advanced export",
  calendar_sync: "Calendar sync", gmail_sync: "Gmail sync", figma_sync: "Figma sync",
  desktop_app: "Desktop app", mobile_app: "Mobile app", version_history: "Version history",
  team_collaboration: "Team collaboration", teamspaces: "Private teamspaces",
  rbac: "Advanced RBAC", audit_logs: "Audit logs", sso: "SSO / SAML", scim: "SCIM",
  analytics: "Advanced analytics",
  custom_widgets: "Custom widgets", advanced_widgets: "Advanced widgets", api_access: "API access",
  voice_input: "Voice input", offline_mode: "Offline mode", byok: "BYOK", premium_models: "Premium models",
  monthly_ai_credits: "AI credits / month", daily_ai_requests: "AI requests / day",
  max_workspaces: "Workspaces", max_pages: "Pages", max_storage_mb: "Storage", max_file_size_mb: "Max file size",
  max_members: "Members", max_databases: "Databases", max_widgets: "Widgets",
  max_automations: "Automations", max_custom_agents: "Custom agents", max_mcp_calls: "MCP calls / month",
};

const TAGLINES: Record<string, string> = {
  free: "Everything you need to get started.",
  plus: "Everything you need to organize your work.",
  pro: "Build with AI, agents and MCP.",
  team: "Powerful workspaces for teams.",
  enterprise: "Security and scale for organizations.",
};

function fmtLimit(key: string, v: number | null): string {
  if (v === null || v === undefined) return "Unlimited";
  if (key === "max_storage_mb") return v >= 1024 ? `${Math.round(v / 1024)} GB` : `${v} MB`;
  if (v >= 1000 && key === "max_workspaces") return "Unlimited";
  return String(Math.round(v));
}

export function isLimitKey(k: string): boolean {
  return /^(max_|monthly_|daily_)/.test(k);
}

export function PricingCards() {
  const [plans, setPlans] = useState<PublicPlan[]>(OFFICIAL_PUBLIC_PLANS);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [coupon, setCoupon] = useState("");
  const [seats, setSeats] = useState(3);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { data: ent, displayCurrency } = useEntitlements();
  const currentSlug = ent?.plan.slug;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Inertial momentum & direct-manipulation drag engine
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollStartRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const prevCanLeftRef = useRef(false);
  const prevCanRightRef = useRef(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nextLeft = el.scrollLeft > 12;
    const nextRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 12;

    if (nextLeft !== prevCanLeftRef.current) {
      prevCanLeftRef.current = nextLeft;
      setCanScrollLeft(nextLeft);
    }
    if (nextRight !== prevCanRightRef.current) {
      prevCanRightRef.current = nextRight;
      setCanScrollRight(nextRight);
    }
  }, []);

  useEffect(() => {
    fetchPublicPlans(displayCurrency).then(setPlans).catch(() => setPlans([]));
  }, [displayCurrency]);

  const ordered = useMemo(() => [...plans].sort((a, b) => a.display_order - b.display_order), [plans]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [checkScroll, ordered]);

  // Apple-grade ease-out quint animation for arrow navigation
  const smoothScrollTo = (targetX: number, duration = 340) => {
    const el = scrollRef.current;
    if (!el) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const startX = el.scrollLeft;
    const distance = targetX - startX;
    const startTime = performance.now();

    const animateScroll = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Apple fluid ease-out quartic
      const ease = 1 - Math.pow(1 - progress, 4);
      el.scrollLeft = startX + distance * ease;

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateScroll);
      } else {
        checkScroll();
      }
    };

    animFrameRef.current = requestAnimationFrame(animateScroll);
  };

  const scrollByAmount = (direction: -1 | 1) => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cardWidth = 280; // card min-width + gap
    const target = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, el.scrollLeft + direction * cardWidth));
    smoothScrollTo(target, 360);
  };

  // Direct-manipulation drag gesture with velocity tracking & inertial decay
  const handleMouseDown = (e: React.MouseEvent) => {
    // If the click is on an interactive element (button, input, a), don't hijack as drag
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, select, textarea")) {
      return;
    }

    const el = scrollRef.current;
    if (!el) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    isDraggingRef.current = true;
    startXRef.current = e.pageX;
    scrollStartRef.current = el.scrollLeft;
    lastXRef.current = e.pageX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;

    const deltaX = Math.abs(e.pageX - startXRef.current);
    if (!isDragging && deltaX > 6) {
      setIsDragging(true);
    }

    if (deltaX <= 6) return;

    e.preventDefault();
    const now = performance.now();
    const dt = Math.max(now - lastTimeRef.current, 8);
    const dx = e.pageX - lastXRef.current;

    velocityRef.current = dx / dt;
    lastXRef.current = e.pageX;
    lastTimeRef.current = now;

    const totalWalk = (e.pageX - startXRef.current) * 1.15;
    scrollRef.current.scrollLeft = scrollStartRef.current - totalWalk;
  };

  const handleMouseUpOrLeave = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const wasDragging = isDragging;
    if (wasDragging) {
      setTimeout(() => setIsDragging(false), 50);
    } else {
      setIsDragging(false);
    }

    const el = scrollRef.current;
    if (!el || !wasDragging) return;

    // Apply smooth inertia glide if released with velocity
    let v = velocityRef.current * 18;
    if (Math.abs(v) > 1.5) {
      const startPos = el.scrollLeft;
      const targetPos = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, startPos - v * 12));
      smoothScrollTo(targetPos, Math.min(480, Math.max(260, Math.abs(v) * 20)));
    }
  };

  async function subscribe(plan: PublicPlan) {
    if (plan.metadata?.custom_pricing) return;
    setMsg(null);
    setBusy(plan.slug);
    try {
      const res = await startCheckout({
        plan_slug: plan.slug,
        billing_cycle: cycle,
        coupon_code: coupon.trim() || undefined,
        seats: plan.metadata?.per_seat ? seats : undefined,
        currency: displayCurrency,
        provider: "stripe",
      });
      if (res.mode === "trial") {
        setMsg(`Trial started — enjoy ${plan.name}!`);
        notifyBillingChanged();
        setBusy(null);
        return;
      }
      if (res.mode === "stripe_session" && res.session_url) {
        window.location.href = res.session_url;
        return;
      }
      if (res.mode === "order" && res.order_id) {
        const opened = await openRazorpayCheckout({
          key_id: res.key_id!,
          order_id: res.order_id!,
          amount_minor: res.amount_minor!,
          currency: res.currency!,
          planName: plan.name,
          email: res.email,
          onSuccess: async (r) => {
            try {
              await verifyPayment({ ...r, subscription_id: res.subscription_id });
              setMsg(`Welcome to ${plan.name}!`);
              notifyBillingChanged();
            } catch (e) {
              setMsg(billingMessage(e));
            } finally {
              setBusy(null);
            }
          },
          onDismiss: () => setBusy(null),
        });
        if (!opened) {
          setMsg("Couldn't load the payment window. Check your connection and try again.");
          setBusy(null);
        }
        return;
      }
      setMsg("Couldn't start checkout. Try again.");
      setBusy(null);
    } catch (e) {
      setMsg(billingMessage(e));
      setBusy(null);
    }
  }

  if (plans.length === 0) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 pt-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-96 min-w-[275px] flex-1 shrink-0 animate-pulse rounded-3xl bg-neutral-100 dark:bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full select-none">
      {/* Apple-grade Fluid Spring Billing Cycle Switcher */}
      <div className="mb-6 flex flex-col items-center justify-center gap-2">
        <LayoutGroup id="pricingCycleSwitcher">
          <div className="relative inline-flex items-center p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-xl">
            {(["monthly", "yearly"] as const).map((c) => {
              const isActive = cycle === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  className={`relative z-10 px-5 py-2 text-xs sm:text-sm font-bold cursor-pointer outline-none transition-colors duration-150 ${
                    isActive
                      ? "text-neutral-900 dark:text-white"
                      : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="pricingCycleActivePill"
                      className="absolute inset-0 rounded-full bg-white dark:bg-neutral-800 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] -z-10"
                      transition={{ type: "spring", stiffness: 440, damping: 32, mass: 0.8 }}
                    />
                  )}
                  {c === "monthly" ? "Monthly billing" : "Yearly billing (Save up to 17%)"}
                </button>
              );
            })}
          </div>
        </LayoutGroup>

        <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
          Prices shown in {displayCurrency}. Set your billing country in Settings → Billing for local pricing.
        </p>
      </div>

      {/* Horizontal Scrollable Carousel Container */}
      <div className="relative group/carousel">
        {/* Navigation Arrow Controls with Apple-grade spring tap */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1, x: -2 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              onClick={() => scrollByAmount(-1)}
              className="absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/95 dark:bg-neutral-800/95 border border-black/10 dark:border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-md flex items-center justify-center text-neutral-800 dark:text-neutral-100 cursor-pointer"
              title="Scroll left"
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} className="stroke-[2.5]" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1, x: 2 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              onClick={() => scrollByAmount(1)}
              className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/95 dark:bg-neutral-800/95 border border-black/10 dark:border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-md flex items-center justify-center text-neutral-800 dark:text-neutral-100 cursor-pointer"
              title="Scroll right"
              aria-label="Scroll right"
            >
              <ChevronRight size={20} className="stroke-[2.5]" />
            </motion.button>
          )}
        </AnimatePresence>

        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`flex items-stretch gap-4 overflow-x-auto pb-6 pt-3 px-1 no-scrollbar will-change-scroll ${
            isDragging ? "cursor-grabbing select-none snap-none" : "cursor-grab snap-x snap-mandatory"
          }`}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            scrollBehavior: "auto",
          }}
        >
          {ordered.map((p, index) => {
            const custom = Boolean(p.metadata?.custom_pricing);
            const perSeat = Boolean(p.metadata?.per_seat);
            const price = cycle === "yearly" ? p.yearly_price : p.monthly_price;
            const save = yearlySavings(p.monthly_price, p.yearly_price);
            const isCurrent = currentSlug === p.slug;
            const boolFeats = p.features.filter((f) => f.enabled && !isLimitKey(f.feature_key));
            const limitFeats = p.features.filter((f) => isLimitKey(f.feature_key));

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.8, delay: index * 0.03 }}
                whileHover={isDragging ? undefined : { y: -4, transition: { type: "spring", stiffness: 400, damping: 26 } }}
                whileTap={{ scale: 0.995 }}
                style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
                className={`relative flex flex-col justify-between rounded-[26px] border p-5.5 min-w-[260px] sm:min-w-[275px] max-w-[295px] flex-1 shrink-0 snap-start transform-gpu will-change-transform ${
                  isDragging ? "pointer-events-none" : ""
                } ${
                  p.is_highlighted
                    ? "border-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:border-white ring-1 ring-neutral-900/10 dark:ring-white/20 bg-white dark:bg-neutral-900"
                    : "border-neutral-200/90 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.04)] bg-white dark:bg-neutral-900/90"
                }`}
              >
                {/* Top Plan Details */}
                <div>
                  {p.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-neutral-950 px-3.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-md dark:bg-white dark:text-black">
                      {p.badge}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{p.name}</h3>
                    <PlanBadge slug={p.slug} name={p.name} size="xs" />
                  </div>

                  <p className="mt-1 min-h-[34px] text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                    {TAGLINES[p.slug] ?? p.description}
                  </p>

                  <div className="mt-3 flex items-baseline gap-1 tabular-nums">
                    {custom ? (
                      <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">Custom</span>
                    ) : (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={cycle + String(price)}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ type: "spring", stiffness: 420, damping: 28 }}
                          className="flex items-baseline gap-1"
                        >
                          <span className="text-3xl font-extrabold text-neutral-900 dark:text-white tabular-nums tracking-tight">
                            {price === 0 ? `${p.currency === "INR" ? "₹" : ""}0` : formatMoney(perSeat && cycle === "monthly" ? price : price, p.currency)}
                          </span>
                          {price > 0 && (
                            <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                              /{perSeat ? "user/" : ""}{cycle === "yearly" ? "year" : "month"}
                            </span>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>

                  {!custom && cycle === "yearly" && save.save > 0 && price > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
                    >
                      Save {formatMoney(save.save, p.currency)} ({save.pct}%)
                    </motion.div>
                  )}

                  {p.trial_days > 0 && (
                    <div className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      {p.trial_days}-day free trial
                    </div>
                  )}

                  {perSeat && (
                    <label className="mt-2.5 flex items-center justify-between gap-2 text-[11.5px] font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-white/5 p-2 rounded-xl">
                      <span>Seats</span>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={seats}
                        onChange={(e) => setSeats(Math.max(1, Number(e.target.value) || 1))}
                        className="w-16 rounded-lg border border-neutral-300 dark:border-white/20 bg-white dark:bg-black px-2 py-1 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none"
                      />
                    </label>
                  )}

                  <ul className="mt-4 space-y-2 text-[12.5px] text-neutral-600 dark:text-neutral-300">
                    {boolFeats.slice(0, 5).map((f) => (
                      <li key={f.feature_key} className="flex items-center gap-2">
                        <span className="text-emerald-500 font-bold shrink-0">✓</span>
                        <span className="truncate">{FEATURE_LABELS[f.feature_key] ?? f.feature_key}</span>
                      </li>
                    ))}
                    {limitFeats.filter((f) => ["monthly_ai_credits", "max_workspaces", "max_storage_mb", "max_members"].includes(f.feature_key)).map((f) => (
                      <li key={f.feature_key} className="flex items-center gap-2">
                        <span className="text-emerald-500 font-bold shrink-0">✓</span>
                        <span className="truncate">{fmtLimit(f.feature_key, f.limit_value)} {FEATURE_LABELS[f.feature_key] ?? f.feature_key}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom CTA button */}
                <div className="pt-5 mt-auto">
                  {custom ? (
                    <a
                      href="/enterprise"
                      className="block w-full rounded-full border border-neutral-300 dark:border-white/20 py-2.5 text-center text-xs font-bold text-neutral-800 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-150"
                    >
                      {p.cta_text || "Contact sales"}
                    </a>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      disabled={busy !== null || isCurrent}
                      onClick={(e) => {
                        e.stopPropagation();
                        subscribe(p);
                      }}
                      className={`w-full rounded-full py-2.5 text-xs font-bold shadow-xs cursor-pointer ${
                        isCurrent
                          ? "bg-neutral-100 text-neutral-400 dark:bg-white/10 cursor-not-allowed"
                          : p.is_highlighted
                          ? "bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-100"
                          : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white/90 dark:text-black dark:hover:bg-white"
                      } disabled:opacity-50`}
                    >
                      {isCurrent ? "Current plan" : busy === p.slug ? "Working…" : (p.cta_text || `Upgrade to ${p.name}`)}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {msg && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center text-sm font-medium text-neutral-600 dark:text-neutral-300"
        >
          {msg}
        </motion.p>
      )}
    </div>
  );
}
