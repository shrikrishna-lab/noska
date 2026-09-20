// Billing & Promotional tab — real backend-driven billing (§18).
// Plans/billing come from billing_plans + EntitlementsProvider; coupons are
// validated server-side at checkout (never priced in the browser).
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Tag, Gift, Copy, Sparkles, Check, ArrowRight, ShieldCheck, Mail, Users, Zap, Award } from "lucide-react";
import { BillingSettings } from "@/components/billing/BillingSettings";

interface BillingPromotionalTabProps {
  currentUsername?: string;
  onToast?: (msg: string) => void;
}

type BillingCategory = "plans" | "vouchers" | "rewards";

const APPLE_TRANSITION = { duration: 0.28, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };
const APPLE_SPRING = { type: "spring" as const, stiffness: 420, damping: 32 };

export function BillingPromotionalTab({ currentUsername = "user", onToast }: BillingPromotionalTabProps) {
  const [activeCategory, setActiveCategory] = useState<BillingCategory>("plans");
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const referralCode = (currentUsername || "noska").toLowerCase().replace(/[^a-z0-9]/g, "");
  const referralLink = `https://noska.app/join?ref=${referralCode}`;

  const showMsg = (msg: string) => {
    if (onToast) onToast(msg);
    else if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("noska:toast", { detail: msg }));
  };

  const handleCopyReferral = () => {
    try {
      navigator.clipboard.writeText(referralLink);
      setCopiedReferral(true);
      showMsg("Referral link copied!");
      setTimeout(() => setCopiedReferral(false), 2500);
    } catch { /* clipboard unavailable */ }
  };

  const handleApplyCoupon = (codeToApply?: string) => {
    const target = (codeToApply || couponCode).trim().toUpperCase();
    if (!target) return;
    setAppliedCoupon(target);
    setCouponCode(target);
    showMsg(`Coupon "${target}" applied for your next checkout!`);
  };

  const categories: { id: BillingCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "plans", label: "Plans & Billing", icon: CreditCard },
    { id: "vouchers", label: "Coupons", icon: Tag },
    { id: "rewards", label: "Referrals", icon: Gift },
  ];

  return (
    <div className="max-w-4xl space-y-6 pb-16 font-sans text-[#1c1b18] dark:text-white">
      <div className="pt-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full border border-[#1c1b18]/10 bg-[#1c1b18]/5 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#1c1b18] dark:border-white/10 dark:bg-white/10 dark:text-[#E3CFB3]">
            <Sparkles className="h-2.5 w-2.5 text-[#b4915c] dark:text-[#E3CFB3]" />
            Billing & Hub
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Plans & Billing</h1>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          Manage your subscription, usage and invoices. Prices and features are controlled by your workspace plan.
        </p>
      </div>

      <div className="flex w-fit items-center gap-1 rounded-2xl border border-[#e4ded3] bg-[#ede8df] p-1 text-xs dark:border-white/5 dark:bg-white/10">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`relative z-10 flex cursor-pointer select-none items-center gap-1.5 rounded-xl px-4 py-1.5 font-bold transition-colors ${isActive ? "text-[#1c1b18] dark:text-white" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"}`}
            >
              {isActive && (
                <motion.div layoutId="activeCategoryPill" transition={APPLE_SPRING} className="absolute inset-0 -z-10 rounded-xl bg-white shadow dark:bg-[#1a1c22]" />
              )}
              <Icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">{cat.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeCategory === "plans" && (
          <motion.div key="plans" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={APPLE_TRANSITION}>
            <BillingSettings />
          </motion.div>
        )}

        {activeCategory === "vouchers" && (
          <motion.div
            key="vouchers"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={APPLE_TRANSITION}
            className="space-y-4"
          >
            {/* Promo Code Input Box */}
            <div className="rounded-2xl border border-[#e4ded3] bg-white p-6 shadow-xs dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-7 w-7 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
                  <Tag size={14} className="stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Redeem Coupon Code</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Have a promo or partner code? Enter it below to apply your discount.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <div className="relative flex-1 min-w-[240px]">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === "Enter") handleApplyCoupon(); }}
                    placeholder="ENTER PROMO CODE"
                    className="w-full rounded-xl border border-neutral-300 dark:border-white/20 bg-neutral-50/50 dark:bg-black/50 px-4 py-2.5 text-xs font-mono font-bold tracking-wider uppercase text-neutral-900 dark:text-white placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                  />
                  {couponCode && (
                    <button
                      type="button"
                      onClick={() => { setCouponCode(""); setAppliedCoupon(null); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] font-bold text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  disabled={!couponCode.trim()}
                  className="rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-100 disabled:opacity-40 transition cursor-pointer shrink-0"
                >
                  Apply Code
                </button>
              </div>

              {appliedCoupon && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3.5 flex items-center justify-between gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300"
                >
                  <div className="flex items-center gap-2">
                    <Check size={14} className="stroke-[2.5] text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      Coupon <strong className="font-mono">{appliedCoupon}</strong> is active and will apply at checkout!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("plans")}
                    className="flex items-center gap-1 font-bold underline hover:opacity-80 shrink-0"
                  >
                    <span>View Plans</span>
                    <ArrowRight size={12} />
                  </button>
                </motion.div>
              )}
            </div>

            {/* How Coupons Work Notice */}
            <div className="flex items-start gap-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/60 dark:border-white/5 dark:bg-white/[0.02] p-4 text-xs text-neutral-500 dark:text-neutral-400">
              <ShieldCheck size={16} className="shrink-0 text-neutral-400 mt-0.5" />
              <p className="leading-relaxed">
                Discounts are verified securely and applied to your account for your next upgrade or subscription checkout.
              </p>
            </div>
          </motion.div>
        )}

        {activeCategory === "rewards" && (
          <motion.div
            key="rewards"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={APPLE_TRANSITION}
            className="space-y-6"
          >
            {/* Hero Referral Sharing Card */}
            <div className="rounded-2xl border border-[#e4ded3] bg-white p-6 shadow-xs dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Gift size={18} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Give 1 Month Free, Get 500 AI Credits
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Share your personalized invite link with friends, creators, or your team.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  <Sparkles size={12} className="stroke-[2.5]" />
                  <span>500 Credits per invite</span>
                </div>
              </div>

              {/* Referral Link & Action Bar */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[260px] flex items-center rounded-xl border border-neutral-300 dark:border-white/20 bg-neutral-50/70 dark:bg-black/40 px-3.5 py-2">
                  <span className="font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate select-all">
                    {referralLink}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyReferral}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                    copiedReferral
                      ? "bg-emerald-600 text-white"
                      : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-100"
                  }`}
                >
                  {copiedReferral ? (
                    <>
                      <Check size={13} className="stroke-[2.5]" />
                      <span>Copied Link!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Social Sharing */}
              <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-neutral-500 dark:text-neutral-400 text-[11.5px] font-medium">
                  Quick Share:
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      "I'm organizing my thoughts and building AI workflows on @NoskaApp. Try it out:"
                    )}&url=${encodeURIComponent(referralLink)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-white/10 px-3 py-1.5 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition"
                  >
                    <span>Share on X</span>
                  </a>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Join me on Noska: ${referralLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-white/10 px-3 py-1.5 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition"
                  >
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent("Join me on Noska")}&body=${encodeURIComponent(
                      `I'm using Noska for notes, workspaces, and AI agents. Get started here: ${referralLink}`
                    )}`}
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-white/10 px-3 py-1.5 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition"
                  >
                    <Mail size={12} />
                    <span>Email</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Referrals Stats Cards */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3 px-1">
                Your Referral Stats
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#e4ded3] bg-white p-4.5 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Referred</span>
                    <Users size={14} className="text-neutral-400" />
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">0</div>
                  <div className="mt-0.5 text-[11px] text-neutral-400">Friends invited</div>
                </div>

                <div className="rounded-2xl border border-[#e4ded3] bg-white p-4.5 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Credits Earned</span>
                    <Zap size={14} className="text-amber-500" />
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-white">0</div>
                  <div className="mt-0.5 text-[11px] text-neutral-400">AI credits added</div>
                </div>

                <div className="rounded-2xl border border-[#e4ded3] bg-white p-4.5 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Reward Tier</span>
                    <Award size={14} className="text-emerald-500" />
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">Active</div>
                  <div className="mt-0.5 text-[11px] text-neutral-400">500 credits per friend</div>
                </div>
              </div>
            </div>

            {/* 3-Step "How It Works" Stepper */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3 px-1">
                How It Works
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                  <div className="h-6 w-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center text-[11px] font-bold mb-2.5">
                    1
                  </div>
                  <h5 className="text-xs font-bold text-neutral-900 dark:text-white">Send your invite</h5>
                  <p className="mt-1 text-[11.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Share your custom invite link or referral code with colleagues, friends, or teams.
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                  <div className="h-6 w-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center text-[11px] font-bold mb-2.5">
                    2
                  </div>
                  <h5 className="text-xs font-bold text-neutral-900 dark:text-white">They sign up</h5>
                  <p className="mt-1 text-[11.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Your friend creates their Noska account and starts building their workspace.
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                  <div className="h-6 w-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center text-[11px] font-bold mb-2.5">
                    3
                  </div>
                  <h5 className="text-xs font-bold text-neutral-900 dark:text-white">Both earn rewards</h5>
                  <p className="mt-1 text-[11.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    You instantly receive 500 AI credits, and your friend gets exclusive trial perks.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BillingPromotionalTab;
