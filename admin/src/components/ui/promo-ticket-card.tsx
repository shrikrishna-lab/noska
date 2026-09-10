import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, X, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export interface PromoTicketCardProps {
  id?: string;
  tag?: string;
  bonusValue?: string;
  title?: string;
  description?: string;
  termsText?: string;
  promoCode?: string;
  barcodeNumber?: string;
  themeColor?: "purple" | "coral" | "cyan" | "dark";
  actionLabel?: string;
  actionUrl?: string;
  viewUrl?: string;
  isClaimed?: boolean;
  onClaim?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const THEMES = {
  purple: {
    bg: "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 50%, #93c5fd 100%)",
    tagBg: "#8b5cf6",
    barcodeFill: "#1e1b4b",
    textColor: "#1e1b4b",
  },
  coral: {
    bg: "linear-gradient(135deg, #fca5a5 0%, #f87171 50%, #fb923c 100%)",
    tagBg: "#ea580c",
    barcodeFill: "#450a0a",
    textColor: "#450a0a",
  },
  cyan: {
    bg: "linear-gradient(135deg, #38bdf8 0%, #06b6d4 50%, #2dd4bf 100%)",
    tagBg: "#0284c7",
    barcodeFill: "#082f49",
    textColor: "#082f49",
  },
  dark: {
    bg: "linear-gradient(135deg, #27272a 0%, #18181b 50%, #09090b 100%)",
    tagBg: "#3f3f46",
    barcodeFill: "#ffffff",
    textColor: "#ffffff",
  },
};

export function PromoTicketCard({
  id = "ticket-voucher",
  tag = "DISCOUNT",
  bonusValue = "32%",
  title = "Special Offer",
  description = "Terms and conditions apply",
  termsText,
  promoCode = "NOSKA32",
  barcodeNumber = "1234567890",
  themeColor = "cyan",
  actionLabel = "CLAIM",
  actionUrl = "/pricing",
  viewUrl,
  isClaimed = false,
  onClaim,
  onDismiss,
  className = "",
}: PromoTicketCardProps) {
  const [claimed, setClaimed] = useState(isClaimed);
  const theme = THEMES[themeColor] || THEMES.cyan;

  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (promoCode) {
      try {
        navigator.clipboard.writeText(promoCode);
      } catch {}
    }
    setClaimed(true);
    onClaim?.();
    toast.success(`🎉 Promo Redeemed! Code "${promoCode}" copied.`);
  };

  const handleCardClick = () => {
    const target = viewUrl || actionUrl;
    if (target) {
      if (target.startsWith("http://") || target.startsWith("https://")) {
        window.open(target, "_blank", "noopener,noreferrer");
      } else {
        window.open(target, "_blank");
      }
    }
  };

  return (
    <div
      className={`relative w-full max-w-full select-none transition-all duration-200 ${className}`}
      data-testid="promo-ticket-card"
    >
      {/* Outer Coupon Container with authentic ticket perforation */}
      <div
        onClick={handleCardClick}
        className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow text-white flex min-h-[116px] cursor-pointer"
        style={{ background: theme.bg }}
      >
        {/* Vertical Left Tag Stub Ribbon */}
        <div
          className="relative flex items-center justify-center shrink-0 py-2.5 z-10 select-none border-r border-dashed border-black/15 dark:border-white/20"
          style={{
            width: "32px",
            backgroundColor: theme.tagBg,
          }}
        >
          {/* Top Perforation Cutout Notch */}
          <div className="absolute -top-2.5 -right-2 w-4 h-4 rounded-full bg-card shadow-[inset_0_-1.5px_2px_rgba(0,0,0,0.12)] z-20 pointer-events-none" />

          {/* Bottom Perforation Cutout Notch */}
          <div className="absolute -bottom-2.5 -right-2 w-4 h-4 rounded-full bg-card shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.12)] z-20 pointer-events-none" />

          <span
            className="text-white font-black text-[9.5px] tracking-[0.2em] uppercase whitespace-nowrap"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            {tag}
          </span>
        </div>

        {/* Main Ticket Content Body */}
        <div className="flex-1 p-2 pl-2.5 pr-2 flex flex-col justify-between z-10 min-w-0">
          {/* Top Row: Big % and Dismiss button */}
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <div className="text-[26px] font-black tracking-tight text-white leading-none drop-shadow-xs font-sans">
                {bonusValue}
              </div>
              <p className="text-[9.5px] font-medium text-white/90 leading-tight mt-0.5 truncate">
                {termsText || description || title}
              </p>
            </div>

            {/* Dismiss Button */}
            {onDismiss && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="shrink-0 p-1 rounded-full bg-black/15 hover:bg-black/30 text-white/90 transition-colors cursor-pointer"
                title="Dismiss voucher"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Bottom Row: Barcode + Action Pill Button */}
          <div className="flex items-end justify-between gap-1 pt-1 min-w-0">
            {/* Barcode with Code Number */}
            <div className="flex flex-col items-start shrink-0">
              <svg viewBox="0 0 76 16" className="h-3.5 w-[52px]" preserveAspectRatio="none">
                <rect x="0" y="0" width="2" height="16" fill={theme.barcodeFill} />
                <rect x="3.5" y="0" width="1" height="16" fill={theme.barcodeFill} />
                <rect x="5.5" y="0" width="3" height="16" fill={theme.barcodeFill} />
                <rect x="10" y="0" width="1.5" height="16" fill={theme.barcodeFill} />
                <rect x="13" y="0" width="1" height="16" fill={theme.barcodeFill} />
                <rect x="15.5" y="0" width="2.5" height="16" fill={theme.barcodeFill} />
                <rect x="19.5" y="0" width="1" height="16" fill={theme.barcodeFill} />
                <rect x="22" y="0" width="3" height="16" fill={theme.barcodeFill} />
                <rect x="26.5" y="0" width="1.5" height="16" fill={theme.barcodeFill} />
                <rect x="29.5" y="0" width="1" height="16" fill={theme.barcodeFill} />
                <rect x="32" y="0" width="2.2" height="16" fill={theme.barcodeFill} />
                <rect x="35.5" y="0" width="1" height="16" fill={theme.barcodeFill} />
                <rect x="38" y="0" width="2.8" height="16" fill={theme.barcodeFill} />
                <rect x="42" y="0" width="1.8" height="16" fill={theme.barcodeFill} />
                <rect x="45" y="0" width="1" height="16" fill={theme.barcodeFill} />
                <rect x="47.5" y="0" width="2.5" height="16" fill={theme.barcodeFill} />
                <rect x="51.5" y="0" width="1.5" height="16" fill={theme.barcodeFill} />
                <rect x="54.5" y="0" width="1" height="16" fill={theme.barcodeFill} />
                <rect x="57" y="0" width="3" height="16" fill={theme.barcodeFill} />
                <rect x="61.5" y="0" width="1.8" height="16" fill={theme.barcodeFill} />
                <rect x="64.5" y="0" width="2.5" height="16" fill={theme.barcodeFill} />
                <rect x="68.5" y="0" width="1" height="16" fill={theme.barcodeFill} />
                <rect x="71" y="0" width="2" height="16" fill={theme.barcodeFill} />
                <rect x="74.5" y="0" width="1.5" height="16" fill={theme.barcodeFill} />
              </svg>
              <span
                className="text-[7.5px] font-mono font-medium tracking-wider mt-0.5 leading-none"
                style={{ color: theme.barcodeFill }}
              >
                {barcodeNumber}
              </span>
            </div>

            {/* Modern Luxury Micro Action Button */}
            <div className="flex items-center shrink-0 mb-0.5">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                onClick={handleClaim}
                className={`group relative overflow-hidden h-[18px] px-2 rounded-full text-[7px] font-semibold uppercase tracking-[0.14em] transition-all flex items-center gap-1 cursor-pointer select-none whitespace-nowrap shadow-[0_2px_6px_rgba(0,0,0,0.25),inset_0_1px_0.5px_rgba(255,255,255,0.25)] ${
                  claimed
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border border-emerald-300/80 shadow-[0_0_10px_rgba(16,185,129,0.45)]"
                    : themeColor === "dark"
                    ? "bg-white/95 hover:bg-white text-neutral-900 border border-white/80 shadow-xs"
                    : "bg-neutral-950/85 hover:bg-neutral-950 text-white border border-white/20 hover:border-white/35 backdrop-blur-md"
                }`}
              >
                {/* Subtle light sheen on hover */}
                {!claimed && (
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none rounded-full" />
                )}

                {claimed ? (
                  <motion.span
                    key="claimed"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="flex items-center gap-0.5 relative z-10"
                  >
                    <Check className="w-2 h-2 stroke-[3]" />
                    <span>CLAIMED</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="unclaimed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1 relative z-10"
                  >
                    <Sparkles className="w-2 h-2 text-amber-300 fill-amber-300/80 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)] shrink-0" />
                    <span className="leading-none">{actionLabel || "REDEEM"}</span>
                  </motion.span>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PromoTicketCard;
