import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Hexagon,
  Info,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

export interface BonusWalletCardProps {
  id?: string;
  userName?: string; // "Ana" or "Workspace User"
  userAvatar?: string;
  balanceTitle?: string; // "YOUR BALANCE"
  balanceAmount?: string; // "$ 52,002.50"
  avatars?: string[];
  recentActivityTitle?: string; // "Dribbble Pro"
  recentActivityDate?: string; // "Jan 17 • 20:12"
  recentActivityAmount?: string; // "$60.00"
  actionLabel?: string; // "Receive"
  actionUrl?: string;
  isClaimed?: boolean;
  onClaim?: () => void;
  onDismiss?: () => void;
  className?: string;
}

function MemojiMasked() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="50" fill="#a7f3d0" />
      <ellipse cx="50" cy="46" rx="26" ry="30" fill="#6d4c41" />
      <path d="M 24 38 C 24 20, 76 20, 76 38 C 76 26, 68 18, 50 18 C 32 18, 24 26, 24 38 Z" fill="#2d1d16" />
      <ellipse cx="40" cy="42" rx="3.5" ry="3.5" fill="#ffffff" />
      <circle cx="40" cy="42" r="2" fill="#1e1e1e" />
      <ellipse cx="60" cy="42" rx="3.5" ry="3.5" fill="#ffffff" />
      <circle cx="60" cy="42" r="2" fill="#1e1e1e" />
      <path d="M 35 36 Q 40 34 45 36" stroke="#2d1d16" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M 55 36 Q 60 34 65 36" stroke="#2d1d16" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M 27 50 Q 50 56 73 50 L 71 70 Q 50 78 29 70 Z" fill="#34d399" />
      <path d="M 29 55 Q 50 60 71 55" stroke="#10b981" strokeWidth="1.5" fill="none" />
      <path d="M 29 62 Q 50 67 71 62" stroke="#10b981" strokeWidth="1.5" fill="none" />
      <path d="M 27 50 Q 20 48 24 40" stroke="#a7f3d0" strokeWidth="1.5" fill="none" />
      <path d="M 73 50 Q 80 48 76 40" stroke="#a7f3d0" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function MemojiBlonde() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="50" fill="#fed7aa" />
      <path d="M 20 50 C 18 20, 82 20, 80 50 C 84 75, 78 90, 78 95 L 22 95 C 22 90, 16 75, 20 50 Z" fill="#fde047" />
      <ellipse cx="50" cy="50" rx="24" ry="28" fill="#fbcfe8" />
      <path d="M 25 38 Q 50 20 75 38 Q 65 30 50 30 Q 35 30 25 38 Z" fill="#facc15" />
      <path d="M 28 46 L 47 48 L 45 56 L 31 54 Z" fill="#f43f5e" />
      <path d="M 53 48 L 72 46 L 69 54 L 55 56 Z" fill="#f43f5e" />
      <line x1="47" y1="48" x2="53" y2="48" stroke="#f43f5e" strokeWidth="2.5" />
      <path d="M 31 48 L 44 49 L 43 54 L 33 53 Z" fill="#881337" opacity="0.8" />
      <path d="M 57 49 L 70 48 L 68 53 L 58 54 Z" fill="#881337" opacity="0.8" />
      <path d="M 43 68 Q 50 74 57 68" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function MemojiBraids() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="50" fill="#fecdd3" />
      <ellipse cx="50" cy="50" rx="25" ry="29" fill="#a16207" />
      {[22, 28, 34, 40, 46, 52, 58, 64, 70, 76].map((x, i) => (
        <path
          key={i}
          d={`M ${x} 26 Q ${x + (i % 2 === 0 ? 3 : -3)} 55 ${x + (i < 5 ? -6 : 6)} 85`}
          stroke="#1c1917"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      ))}
      <path d="M 38 46 Q 42 42 46 46" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 54 46 Q 58 42 62 46" stroke="#1c1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M 38 62 Q 50 78 62 62 Z" fill="#ffffff" stroke="#1c1917" strokeWidth="1.5" />
      <path d="M 40 64 Q 50 72 60 64" fill="#dc2626" />
    </svg>
  );
}

function MemojiTurban() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="50" fill="#fed7aa" />
      <ellipse cx="50" cy="32" rx="32" ry="24" fill="#eab308" />
      <path d="M 22 36 Q 50 48 78 36 Q 74 18 50 18 Q 26 18 22 36 Z" fill="#ca8a04" />
      <ellipse cx="50" cy="55" rx="23" ry="27" fill="#b45309" />
      <path d="M 32 54 Q 50 82 68 54 Q 65 86 50 88 Q 35 86 32 54 Z" fill="#451a03" />
      <path d="M 38 50 Q 42 46 46 50" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="58" cy="50" r="2.5" fill="#ffffff" />
      <path d="M 44 67 Q 50 72 56 67" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function MemojiVisor() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <circle cx="50" cy="50" r="50" fill="#bae6fd" />
      <path d="M 20 45 C 18 16, 82 16, 80 45 C 75 75, 25 75, 20 45 Z" fill="#3b82f6" />
      <ellipse cx="50" cy="52" rx="23" ry="27" fill="#6366f1" />
      <path d="M 26 44 Q 50 48 74 44 L 72 56 Q 50 60 28 56 Z" fill="#ec4899" />
      <path d="M 29 47 Q 50 51 71 47" stroke="#facc15" strokeWidth="2.5" fill="none" />
      <path d="M 44 68 Q 50 73 56 70" stroke="#fbcfe8" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function BonusWalletCard({
  id = "bonus-wallet",
  userName = "Ana",
  userAvatar,
  balanceTitle = "YOUR BALANCE",
  balanceAmount = "$ 52,002.50",
  avatars,
  recentActivityTitle = "Dribbble Pro",
  recentActivityDate = "Jan 17 • 20:12",
  recentActivityAmount = "$60.00",
  actionLabel = "Receive",
  actionUrl = "/dashboard",
  isClaimed = false,
  onClaim,
  onDismiss,
  className = "",
}: BonusWalletCardProps) {
  const [claimed, setClaimed] = useState(isClaimed);

  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClaimed(true);
    onClaim?.();
    toast.success("✨ Bonus Claimed and deposited into your balance!");
  };

  const handleAction = (url?: string) => {
    const target = url || actionUrl || "/dashboard";
    if (target.startsWith("http://") || target.startsWith("https://")) {
      window.open(target, "_blank", "noopener,noreferrer");
    } else {
      window.open(target, "_blank");
    }
  };

  return (
    <div
      className={`relative w-full select-none transition-all duration-300 ${className}`}
      data-testid="admin-bonus-wallet-card"
    >
      <div className="relative overflow-hidden rounded-[26px] bg-[#F2F3F7] dark:bg-[#15161c] border border-black/[0.06] dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-3 pb-3">
        {onDismiss && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="absolute top-3.5 right-3.5 z-30 p-1.5 rounded-full bg-white/20 dark:bg-white/10 hover:bg-white/30 text-white backdrop-blur-md transition-colors cursor-pointer"
            title="Dismiss wallet card"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Top Vibrant Curved Blue Card */}
        <div
          className="relative rounded-[20px] rounded-b-[24px] pt-3 pb-7 px-3.5 text-white shadow-md overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)",
            boxShadow: "inset 0 1px 1.5px rgba(255, 255, 255, 0.4)",
          }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full overflow-hidden border border-white/50 shadow-sm bg-white/20 flex items-center justify-center">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <MemojiBlonde />
                )}
              </div>
              <span className="text-xs font-semibold tracking-tight text-white drop-shadow-xs">
                {userName}
              </span>
            </div>

            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mr-6 text-white shadow-inner">
              <span className="font-serif italic font-bold text-[11px]">i</span>
            </div>
          </div>

          {/* Balance Capsule & Big Amount */}
          <div className="flex flex-col items-center justify-center my-1 text-center">
            <div className="px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[9px] font-bold tracking-wider uppercase text-white/95 mb-1 shadow-xs">
              {balanceTitle}
            </div>
            <div className="text-2xl sm:text-[26px] font-black tracking-tight text-white drop-shadow-sm font-sans leading-none">
              {balanceAmount}
            </div>
          </div>
        </div>

        {/* Overlapping Memoji 3-Avatars Circle Row + Counter */}
        <div className="relative -mt-5 mb-2 flex items-center justify-center z-20">
          <div className="flex items-center -space-x-1.5">
            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#15161c] shadow-sm overflow-hidden bg-white shrink-0 hover:scale-110 transition-transform">
              <MemojiMasked />
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#15161c] shadow-sm overflow-hidden bg-white shrink-0 hover:scale-110 transition-transform">
              <MemojiBlonde />
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#15161c] shadow-sm overflow-hidden bg-white shrink-0 hover:scale-110 transition-transform">
              <MemojiBraids />
            </div>
            <div className="w-8 h-8 rounded-full bg-black/30 dark:bg-white/20 backdrop-blur-md border-2 border-white dark:border-[#15161c] shadow-sm text-[9.5px] font-bold text-white flex items-center justify-center shrink-0">
              +2
            </div>
          </div>
        </div>

        {/* Middle Activity Section */}
        <div className="px-0.5 pb-2">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-normal mb-1.5 px-0.5">
            <span>Last transaction</span>
            <button
              type="button"
              onClick={() => handleAction("/dashboard")}
              className="text-[11px] text-neutral-700 dark:text-neutral-300 font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1e1f26] border border-neutral-200/50 dark:border-white/5 shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#c084fc] via-[#f472b6] to-[#a855f7] p-0.5 shadow-xs flex items-center justify-center shrink-0">
                <div className="w-full h-full rounded-full bg-[#18181b] flex items-center justify-center p-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="1.5" className="w-full h-full">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M 12 2 A 10 10 0 0 0 12 22" />
                    <path d="M 12 2 A 10 10 0 0 1 12 22" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                  </svg>
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-[11px] font-bold text-neutral-900 dark:text-white leading-tight truncate">
                  {recentActivityTitle}
                </div>
                <div className="text-[9.5px] text-neutral-400 font-medium truncate">
                  {recentActivityDate}
                </div>
              </div>
            </div>

            <div className="text-xs font-black text-neutral-900 dark:text-white font-sans shrink-0 ml-1.5">
              {recentActivityAmount}
            </div>
          </div>
        </div>

        {/* Bottom Compact Animated Actions Bar */}
        <div className="px-0.5 pt-0.5 flex items-center gap-1.5 justify-between">
          {/* Quick Primary Claim / Receive Action Pill */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.04, y: -0.5 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            onClick={handleClaim}
            className={`flex-1 h-7.5 px-2.5 rounded-full text-[10.5px] font-bold flex items-center justify-center gap-1 shadow-xs border transition-all cursor-pointer select-none ${
              claimed
                ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/25"
                : "bg-white dark:bg-white/95 text-neutral-900 hover:bg-neutral-50 border-black/[0.08] shadow-[0_1.5px_4px_rgba(0,0,0,0.06)]"
            }`}
          >
            {claimed ? (
              <motion.span
                key="claimed"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="flex items-center gap-1"
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Claimed</span>
              </motion.span>
            ) : (
              <motion.span
                key="unclaimed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1"
              >
                <span>{actionLabel || "Receive"}</span>
                <ArrowDown className="w-2.5 h-2.5 stroke-[2.5] text-blue-600" />
              </motion.span>
            )}
          </motion.button>

          {/* Quick Secondary Send Pill */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.04, y: -0.5 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            onClick={() => handleAction("/pricing")}
            className="h-7.5 px-3 rounded-full bg-neutral-900 hover:bg-black text-white text-[10.5px] font-bold shadow-xs border border-white/10 flex items-center justify-center gap-1 cursor-pointer shrink-0"
          >
            <span>Send</span>
            <ArrowUp className="w-2.5 h-2.5 stroke-[2.5]" />
          </motion.button>

          {/* Small Round History / Swap Icon Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            onClick={() => handleAction("/dashboard")}
            className="w-7.5 h-7.5 rounded-full bg-white dark:bg-[#202127] shadow-2xs border border-black/[0.06] dark:border-white/10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white cursor-pointer shrink-0"
            title="Transactions"
          >
            <ArrowUpDown className="w-3 h-3 stroke-[2]" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
