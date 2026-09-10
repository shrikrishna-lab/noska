import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Copy,
  CreditCard,
  Crown,
  Gift,
  Tag,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BonusWalletCard } from "@/components/ui/bonus-wallet-card";
import { PromoTicketCard } from "@/components/ui/promo-ticket-card";

interface BillingPromotionalTabProps {
  currentUsername?: string;
  onToast?: (msg: string) => void;
}

type BillingCategory = "plans" | "vouchers" | "rewards";

// Apple-grade fluid animation presets
const APPLE_TRANSITION = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

const APPLE_SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
};

export function BillingPromotionalTab({
  currentUsername = "user",
  onToast,
}: BillingPromotionalTabProps) {
  const [activeCategory, setActiveCategory] = useState<BillingCategory>("plans");
  const [billingCycle, setBillingCycle] = useState<"yearly" | "monthly">("yearly");
  const [currentPlan, setCurrentPlan] = useState<string>("Free Starter");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountPercent?: number;
    bonusAmount?: number;
    description: string;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  const referralCode = currentUsername ? currentUsername.toLowerCase() : "noska_vip";
  const referralLink = `https://noska.app/join?ref=${referralCode}`;

  const showMsg = (msg: string) => {
    if (onToast) {
      onToast(msg);
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("noska:toast", { detail: msg }));
    }
  };

  const applyPromoCode = (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    if (code === "NOSKA32") {
      setAppliedPromo({
        code: "NOSKA32",
        discountPercent: 32,
        description: "32% Launch Voucher applied to all plans!",
      });
      setPromoError(null);
      setPromoInput("");
      showMsg("🎉 32% discount activated on all plans!");
    } else if (code === "BONUS50") {
      setAppliedPromo({
        code: "BONUS50",
        bonusAmount: 50,
        description: "$50.00 credit deposited to workspace balance!",
      });
      setPromoError(null);
      setPromoInput("");
      showMsg("✨ $50.00 credit added to your balance!");
    } else if (code === "WELCOME2026") {
      setAppliedPromo({
        code: "WELCOME2026",
        discountPercent: 100,
        description: "1 Month Free Plus membership unlocked!",
      });
      setPromoError(null);
      setPromoInput("");
      showMsg("🚀 1 Month Free Plus activated!");
    } else {
      setPromoError("Invalid or expired code. Try 'NOSKA32' or 'BONUS50'.");
    }
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    applyPromoCode(promoInput);
  };

  const handleCopyReferral = () => {
    try {
      navigator.clipboard.writeText(referralLink);
      setCopiedReferral(true);
      showMsg("📋 Referral link copied!");
      setTimeout(() => setCopiedReferral(false), 2500);
    } catch {}
  };

  const handleUpgrade = (planName: string) => {
    setUpgradingPlan(planName);
    setTimeout(() => {
      setCurrentPlan(planName);
      setUpgradingPlan(null);
      showMsg(`🚀 Switched to ${planName}!`);
    }, 800);
  };

  const plans = [
    {
      id: "free",
      name: "Starter",
      badge: "Current",
      price: 0,
      period: "forever",
      description: "Essential notes, AI canvas, and local encryption.",
      features: [
        "Up to 3 active workspaces",
        "Encrypted local storage",
        "Standard AI copilot",
        "Community support",
      ],
      isCurrent: currentPlan.includes("Starter"),
    },
    {
      id: "plus",
      name: "Plus",
      popular: true,
      price: billingCycle === "yearly" ? 8 : 10,
      period: "/ mo",
      description: "Neural dictation, rapid AI models, and version control.",
      features: [
        "Unlimited workspaces & canvas",
        "Fast Wispr neural voice",
        "30-day version history",
        "Up to 100 collaborators",
        "Priority GPU compute",
      ],
      isCurrent: currentPlan.includes("Plus"),
    },
    {
      id: "business",
      name: "Business",
      price: billingCycle === "yearly" ? 15 : 18,
      period: "/ seat / mo",
      description: "Dedicated teamspaces, audit logs, and custom models.",
      features: [
        "Everything in Plus",
        "Private team spaces & RBAC",
        "Team audit telemetry",
        "Bring Your Own API Keys (BYOK)",
        "90-day activity logs",
      ],
      isCurrent: currentPlan.includes("Business"),
    },
  ];

  const categories: { id: BillingCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "plans", label: "Plans & Pricing", icon: CreditCard },
    { id: "vouchers", label: "Redeem Vouchers", icon: Tag },
    { id: "rewards", label: "Rewards & Wallet", icon: Gift },
  ];

  return (
    <div className="max-w-4xl space-y-6 pb-16 font-sans text-[#1c1b18] dark:text-white">
      {/* Sleek Minimal Header */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2 py-0.5 rounded-full bg-[#1c1b18]/5 dark:bg-white/10 text-[#1c1b18] dark:text-[#E3CFB3] border border-[#1c1b18]/10 dark:border-white/10 text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-[#b4915c] dark:text-[#E3CFB3]" />
            Billing & Hub
          </span>
          {appliedPromo && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10.5px] font-bold">
              {appliedPromo.code} Active ({appliedPromo.discountPercent ? `${appliedPromo.discountPercent}% off` : `$${appliedPromo.bonusAmount}`})
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1c1b18] dark:text-white">
          Plans & Billing
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Manage subscriptions, redeem promotional vouchers, and earn referral balance.
        </p>
      </div>

      {/* Apple-Style Fluid Sliding Category Segment Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#ede8df] dark:bg-white/10 border border-[#e4ded3] dark:border-white/5 w-fit text-xs">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`relative px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer select-none z-10 ${
                isActive
                  ? "text-[#1c1b18] dark:text-white"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeCategoryPill"
                  transition={APPLE_SPRING}
                  className="absolute inset-0 rounded-xl bg-white dark:bg-[#1a1c22] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] -z-10"
                />
              )}
              <Icon className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">{cat.label}</span>
              {cat.id === "vouchers" && appliedPromo && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 relative z-10" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Promo Notification (Compact) */}
      <AnimatePresence>
        {appliedPromo && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={APPLE_TRANSITION}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>{appliedPromo.code}:</strong> {appliedPromo.description}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAppliedPromo(null);
                showMsg("Promo removed.");
              }}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-[11px] underline font-semibold ml-3 shrink-0 cursor-pointer"
            >
              Remove
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smooth Apple-Grade Animated View Transitions */}
      <AnimatePresence mode="wait">
        {/* CATEGORY 1: Plans & Pricing */}
        {activeCategory === "plans" && (
          <motion.div
            key="plans"
            initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
            transition={APPLE_TRANSITION}
            className="space-y-4"
          >
            {/* Subheader & Cycle Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Active plan: <strong className="text-[#1c1b18] dark:text-[#E3CFB3] font-bold">{currentPlan}</strong>
              </div>

              {/* Fluid Sliding Billing Cycle Switcher */}
              <div className="inline-flex items-center p-1 rounded-2xl bg-[#ede8df] dark:bg-white/10 border border-[#e4ded3] dark:border-white/5 text-xs">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`relative px-3.5 py-1 rounded-xl font-medium transition-colors cursor-pointer select-none z-10 ${
                    billingCycle === "monthly"
                      ? "text-[#1c1b18] dark:text-white font-bold"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  {billingCycle === "monthly" && (
                    <motion.div
                      layoutId="activeCyclePill"
                      transition={APPLE_SPRING}
                      className="absolute inset-0 rounded-xl bg-white dark:bg-[#1a1c22] shadow-[0_1px_3px_rgba(0,0,0,0.08)] -z-10"
                    />
                  )}
                  <span className="relative z-10">Monthly</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`relative px-3.5 py-1 rounded-xl font-medium transition-colors flex items-center gap-1.5 cursor-pointer select-none z-10 ${
                    billingCycle === "yearly"
                      ? "text-[#1c1b18] dark:text-white font-bold"
                      : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  {billingCycle === "yearly" && (
                    <motion.div
                      layoutId="activeCyclePill"
                      transition={APPLE_SPRING}
                      className="absolute inset-0 rounded-xl bg-white dark:bg-[#1a1c22] shadow-[0_1px_3px_rgba(0,0,0,0.08)] -z-10"
                    />
                  )}
                  <span className="relative z-10">Yearly</span>
                  <span className="relative z-10 px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9.5px] font-extrabold">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isDiscounted = appliedPromo?.discountPercent && plan.price > 0;
                const finalPrice = isDiscounted
                  ? (plan.price * (1 - appliedPromo.discountPercent! / 100)).toFixed(2)
                  : plan.price;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col justify-between p-4.5 rounded-2xl border transition-all duration-200 ${
                      plan.popular
                        ? "border-[#1c1b18] dark:border-[#E3CFB3]/60 bg-[#1c1b18]/[0.02] dark:bg-white/[0.03] ring-1 ring-[#1c1b18]/15 dark:ring-[#E3CFB3]/25 shadow-sm"
                        : "border-[#e8e4db] dark:border-white/10 bg-[#fbfaf6] dark:bg-[#15161c]"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-[#1c1b18] text-white dark:bg-[#E3CFB3] dark:text-[#0F1117] text-[9px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1">
                        <Crown className="w-2.5 h-2.5 text-[#E3CFB3] dark:text-[#0F1117]" />
                        Popular
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold">{plan.name}</h3>
                        {plan.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9.5px] font-bold">
                            Current
                          </span>
                        )}
                      </div>

                      <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 min-h-[28px] leading-relaxed">
                        {plan.description}
                      </p>

                      {/* Pricing */}
                      <div className="my-3 flex items-baseline gap-1.5">
                        {isDiscounted ? (
                          <>
                            <span className="text-2xl font-black font-sans text-emerald-600 dark:text-emerald-400">
                              ${finalPrice}
                            </span>
                            <span className="text-xs text-neutral-400 line-through">
                              ${plan.price}
                            </span>
                            <span className="text-[11px] text-neutral-500">{plan.period}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl font-black font-sans">
                              {typeof plan.price === "number" ? `$${plan.price}` : plan.price}
                            </span>
                            <span className="text-[11px] text-neutral-500">{plan.period}</span>
                          </>
                        )}
                      </div>

                      {/* Features */}
                      <div className="space-y-1.5 pt-2.5 border-t border-[#e8e4db] dark:border-white/10">
                        {plan.features.map((feat, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                            <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-[11.5px] leading-tight">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-[#e8e4db]/60 dark:border-white/5">
                      <button
                        type="button"
                        disabled={plan.isCurrent || upgradingPlan === plan.name}
                        onClick={() => handleUpgrade(plan.name)}
                        className={`w-full py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                          plan.isCurrent
                            ? "bg-neutral-200 dark:bg-white/10 text-neutral-500 cursor-default"
                            : plan.popular
                            ? "bg-[#1c1b18] hover:bg-black text-white dark:bg-[#E3CFB3] dark:hover:bg-[#d8c09e] dark:text-[#0F1117] shadow-xs active:scale-98"
                            : "bg-[#ede8df] dark:bg-white/10 hover:bg-[#e4ded3] text-neutral-800 dark:text-white active:scale-98"
                        }`}
                      >
                        {upgradingPlan === plan.name ? (
                          <span>Processing...</span>
                        ) : plan.isCurrent ? (
                          <span>Active Plan</span>
                        ) : (
                          <>
                            <span>Upgrade</span>
                            <ArrowRight className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* CATEGORY 2: Redeem & Vouchers */}
        {activeCategory === "vouchers" && (
          <motion.div
            key="vouchers"
            initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
            transition={APPLE_TRANSITION}
            className="space-y-6"
          >
            {/* Minimal Clean Promo Code Card (Matching User Screenshot) */}
            <div className="rounded-2xl p-6 bg-[#f8f6f0] dark:bg-[#15161c] border border-[#e8e4db] dark:border-white/10 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#1c1b18] dark:text-white">
                  Add promo code
                </h2>
                <span className="text-neutral-400 font-light">—</span>
              </div>

              {/* Exact Styled Input & Soft Button from Screenshot */}
              <form onSubmit={handleApplyPromo} className="flex items-center gap-3 max-w-md">
                <input
                  type="text"
                  placeholder="Type here"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl border border-neutral-700 dark:border-neutral-500 bg-white dark:bg-[#1a1c22] text-sm text-[#1c1b18] dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all"
                />
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#78756e] hover:bg-[#636059] text-white font-medium text-sm transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer"
                >
                  Apply
                </button>
              </form>

              {promoError && (
                <p className="text-xs text-rose-500 font-medium">{promoError}</p>
              )}

              {/* Suggestions Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-[11px] font-medium text-neutral-400">Suggestions:</span>
                <button
                  type="button"
                  onClick={() => applyPromoCode("NOSKA32")}
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] dark:bg-white/10 dark:hover:bg-white/15 border border-[#e4ded3] dark:border-white/10 text-xs font-medium text-[#1c1b18] dark:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <span className="font-mono font-bold tracking-wider">NOSKA32</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[9.5px] font-bold">
                    32% OFF
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPromoCode("BONUS50")}
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] dark:bg-white/10 dark:hover:bg-white/15 border border-[#e4ded3] dark:border-white/10 text-xs font-medium text-[#1c1b18] dark:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <span className="font-mono font-bold tracking-wider">BONUS50</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[9.5px] font-bold">
                    $50 CREDIT
                  </span>
                </button>
              </div>
            </div>

            {/* Interactive Available Voucher Tickets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Available Vouchers For You
                </h3>
                <span className="text-[11px] text-neutral-400">Click redeem to auto-apply</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PromoTicketCard
                  tag="DISCOUNT"
                  bonusValue="32%"
                  title="Launch Offer"
                  description="32% off on all annual plans"
                  promoCode="NOSKA32"
                  barcodeNumber="987213456"
                  themeColor="purple"
                  actionLabel="REDEEM"
                  isClaimed={appliedPromo?.code === "NOSKA32"}
                  onClaim={() => applyPromoCode("NOSKA32")}
                />

                <PromoTicketCard
                  tag="CREDIT"
                  bonusValue="$50"
                  title="Workspace Credit"
                  description="Instant $50 deposited to balance"
                  promoCode="BONUS50"
                  barcodeNumber="543210987"
                  themeColor="cyan"
                  actionLabel="REDEEM"
                  isClaimed={appliedPromo?.code === "BONUS50"}
                  onClaim={() => applyPromoCode("BONUS50")}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* CATEGORY 3: Rewards & Wallet */}
        {activeCategory === "rewards" && (
          <motion.div
            key="rewards"
            initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
            transition={APPLE_TRANSITION}
            className="grid grid-cols-1 lg:grid-cols-2 gap-5"
          >
            {/* Referral Card */}
            <div className="rounded-2xl p-5 bg-[#f8f6f0] dark:bg-[#15161c] border border-[#e8e4db] dark:border-white/10 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Gift className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-sm font-bold">Referral Program: Give $25, Get $25</h2>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Earn $25 in credits for every teammate or friend who creates a workspace.
                </p>

                {/* Stats Counter */}
                <div className="grid grid-cols-3 gap-2 my-3 p-3 rounded-xl bg-white dark:bg-[#1f2028] border border-[#e8e4db] dark:border-white/5 text-center">
                  <div>
                    <div className="text-lg font-black text-foreground">3</div>
                    <div className="text-[9.5px] text-neutral-400 uppercase font-bold">Friends Joined</div>
                  </div>
                  <div className="border-x border-[#e8e4db] dark:border-white/10">
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">$75.00</div>
                    <div className="text-[9.5px] text-neutral-400 uppercase font-bold">Earned</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-[#1c1b18] dark:text-[#E3CFB3]">2 More</div>
                    <div className="text-[9.5px] text-neutral-400 uppercase font-bold">Next Tier</div>
                  </div>
                </div>

                {/* Referral Link Copy */}
                <div className="space-y-1">
                  <label className="text-[10.5px] font-semibold text-neutral-400">Your Referral Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={referralLink}
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs border border-[#d8d3c5] dark:border-white/15 bg-white dark:bg-[#1f2028] font-mono text-neutral-700 dark:text-neutral-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyReferral}
                      className="px-3.5 py-1.5 rounded-xl bg-[#1c1b18] hover:bg-black text-white dark:bg-[#E3CFB3] dark:hover:bg-[#d8c09e] dark:text-[#0F1117] text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                    >
                      {copiedReferral ? (
                        <>
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[#e8e4db] dark:border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Instant payout
                </span>
                <span className="font-semibold text-neutral-500">Unlimited invites</span>
              </div>
            </div>

            {/* Bonus Wallet Card Widget */}
            <div className="flex flex-col justify-center">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-1 text-xs font-bold text-neutral-600 dark:text-neutral-400">
                  <Wallet className="w-3.5 h-3.5 text-[#1c1b18] dark:text-[#E3CFB3]" />
                  <span>Rewards Wallet</span>
                </div>
                <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Balance
                </span>
              </div>

              <BonusWalletCard
                balanceTitle="AVAILABLE BALANCE"
                balanceAmount="$ 52,002.50"
                recentActivityTitle="Referral Bonus"
                recentActivityDate="Today • 10:45"
                recentActivityAmount="+$25.00"
                actionLabel="Claim Bonus"
                actionUrl="/dashboard"
                onClaim={() => showMsg("🎉 Bonus credits deposited to your balance!")}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BillingPromotionalTab;
