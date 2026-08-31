import React from "react";
import { cn } from "@/lib/utils";
import { Check, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export interface TeamInvitationProps {
  inviterName?: string;
  teamName?: string;
  avatarUrl?: string;
  timeAgoText?: string;
  online?: boolean;
  onAccept?: () => void | Promise<void>;
  onDecline?: () => void | Promise<void>;
  loading?: boolean;
  className?: string;
}

export function TeamInvitation({
  inviterName = " teammate",
  teamName = "Workspace",
  avatarUrl,
  timeAgoText = "Invited recently",
  online = true,
  onAccept,
  onDecline,
  loading = false,
  className,
}: TeamInvitationProps) {
  const [acting, setActing] = React.useState<"accept" | "decline" | null>(null);

  const handleAccept = async () => {
    if (acting || loading) return;
    setActing("accept");
    try { await onAccept?.(); } finally { setActing(null); }
  };

  const handleDecline = async () => {
    if (acting || loading) return;
    setActing("decline");
    try { await onDecline?.(); } finally { setActing(null); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("w-full max-w-xl mx-auto", className)}
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="relative h-10 w-10 shrink-0 rounded-full bg-[var(--hover)] grid place-items-center text-sm font-bold text-[var(--secondary)]">
            {inviterName.charAt(0).toUpperCase()}
            {online && (
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--surface)]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text)]">Team Invitation</p>
            <p className="text-[13px] text-[var(--secondary)] mt-0.5">
              <span className="font-medium text-[var(--text)]">{inviterName}</span> invited you to join{" "}
              <span className="font-medium text-[var(--text)]">{teamName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDecline}
              disabled={acting !== null || loading}
              className="rounded-lg h-8 w-8 flex items-center justify-center text-[var(--muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition disabled:opacity-40 cursor-pointer"
            >
              {acting === "decline" ? <Loader2 className="h-4 w-4 animate-spin text-red-500" /> : <X className="h-4 w-4" />}
            </button>
            <button
              onClick={handleAccept}
              disabled={acting !== null || loading}
              className="rounded-lg h-8 w-8 flex items-center justify-center text-[var(--muted)] hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition disabled:opacity-40 cursor-pointer"
            >
              {acting === "accept" ? <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> : <Check className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="mt-2 ml-14">
          <p className="text-[12px] text-[var(--muted)]">{timeAgoText}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default TeamInvitation;
