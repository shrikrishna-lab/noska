import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/react";
import { supabase } from "../../lib/supabase";
import { motion } from "framer-motion";
import { Sparkles, LogOut, Clock, Mail, Calendar, ShieldAlert } from "lucide-react";

type GateStatus = "checking" | "approved" | "waiting" | "expired" | "banned" | "suspended" | "error";

export function WaitlistGate({ children }: { children: React.ReactNode }) {
  const { user: clerkUser } = useUser();
  const clerk = useClerk();
  const [status, setStatus] = useState<GateStatus>("checking");
  const [entryData, setEntryData] = useState<{
    position?: number; joined_at?: string; status?: string;
    invite_expires_at?: string; ban_reason?: string; suspension_reason?: string;
  } | null>(null);

  useEffect(() => {
    if (!clerkUser) { setStatus("error"); return; }
    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    if (!email) { setStatus("error"); return; }

    if (!supabase) {
      setStatus("approved");
      return;
    }

    (async () => {
      try {
        const { data } = await supabase
          .from("waitlist_entries" as never)
          .select("id, status, position, joined_at, invite_expires_at, ban_reason, suspension_reason" as never)
          .eq("email" as never, email.toLowerCase())
          .maybeSingle() as never;

        if (!data) {
          const { data: aeData } = await supabase
            .from("approved_emails" as never)
            .select("id, status")
            .eq("email" as never, email.toLowerCase())
            .maybeSingle() as never;
          setStatus(aeData ? "approved" : "waiting");
          return;
        }

        const entry = data as Record<string, unknown>;
        setEntryData({
          position: entry.position as number | undefined,
          joined_at: entry.joined_at as string | undefined,
          status: entry.status as string | undefined,
          invite_expires_at: entry.invite_expires_at as string | undefined,
          ban_reason: entry.ban_reason as string | undefined,
          suspension_reason: entry.suspension_reason as string | undefined,
        });

        const s = entry.status as string;
        if (s === "banned") { setStatus("banned"); return; }
        if (s === "suspended") { setStatus("suspended"); return; }
        if (s === "approved" || s === "invited" || s === "accepted") {
          if (s === "invited" && entry.invite_expires_at && new Date(entry.invite_expires_at as string) < new Date()) {
            setStatus("expired");
            return;
          }
          setStatus("approved");
          return;
        }
        setStatus("waiting");
      } catch {
        setStatus("approved");
      }
    })();
  }, [clerkUser]);

  if (status === "checking") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7c3aed] border-t-transparent" />
          <p className="text-sm text-zinc-500 font-medium tracking-wide">Checking access...</p>
        </div>
      </div>
    );
  }

  if (status === "approved") return <>{children}</>;

  const renderContainer = (content: React.ReactNode) => {
    return (
      <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black p-4 font-sans select-none">
        {/* Background Image with elegant vignette and color overlays */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/waitlist-bg.png" 
            alt="Waitlist Background" 
            className="h-full w-full object-cover opacity-80"
          />
          {/* Subtle Radial Gradient overlay to focus eye on the center */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.85)_80%,#000_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
        </div>

        {/* Floating gradient glow behind card */}
        <div className="absolute left-1/2 top-1/2 z-0 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

        {/* Main Content Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.98 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-8 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
        >
          {/* Top subtle highlight border */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          {content}
        </motion.div>
      </div>
    );
  };

  if (status === "expired") {
    return renderContainer(
      <div className="flex flex-col items-center text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Clock className="h-6 w-6" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-white font-sans">Invite Expired</h1>
        <p className="mb-6 text-sm leading-relaxed text-zinc-400">Your invitation has expired. Please request a new one.</p>
        <button 
          onClick={() => clerk.signOut()} 
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    );
  }

  if (status === "banned") {
    return renderContainer(
      <div className="flex flex-col items-center text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-white font-sans">Access Restricted</h1>
        <p className="mb-6 text-sm leading-relaxed text-zinc-400">{entryData?.ban_reason ?? "Your account has been banned."}</p>
        <button 
          onClick={() => clerk.signOut()} 
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    );
  }

  if (status === "suspended") {
    return renderContainer(
      <div className="flex flex-col items-center text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
          <Clock className="h-6 w-6" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-white font-sans">Account Suspended</h1>
        <p className="mb-6 text-sm leading-relaxed text-zinc-400">{entryData?.suspension_reason ?? "Your account has been temporarily suspended."}</p>
        <button 
          onClick={() => clerk.signOut()} 
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    );
  }

  const position = entryData?.position;
  const joinedDate = entryData?.joined_at ? new Date(entryData.joined_at).toLocaleDateString() : null;

  return renderContainer(
    <div className="flex flex-col items-center text-center">
      {/* Celebration Icon with elegant gradient background */}
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400">
        <Sparkles className="h-7 w-7" />
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-violet-500"></span>
        </span>
      </div>

      <h1 className="mb-2 text-2xl font-bold tracking-tight text-white font-sans">
        You're on the Noska Waitlist!
      </h1>

      {/* Position Badge & Counter */}
      {position ? (
        <div className="my-4 w-full rounded-xl bg-violet-500/5 border border-violet-500/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-violet-400/80">Your Queue Position</div>
          <div className="mt-1.5 text-4xl font-extrabold text-white tracking-tight">
            #{position}
          </div>
          <p className="mt-1 text-xs text-zinc-500">We're letting people in in batches.</p>
        </div>
      ) : (
        <div className="my-4 w-full rounded-xl bg-white/5 border border-white/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Status</div>
          <div className="mt-1 text-base font-bold text-zinc-200">Pending Approval</div>
          <p className="mt-1 text-xs text-zinc-500">Our team is reviewing applications.</p>
        </div>
      )}

      {/* Details Box */}
      <div className="mt-2 w-full space-y-2.5 rounded-xl bg-zinc-900/30 border border-zinc-800/40 p-4 text-left text-sm">
        <div className="flex items-center gap-3 text-zinc-400">
          <Mail className="h-4 w-4 shrink-0 text-zinc-500" />
          <span className="truncate text-zinc-300 font-medium">{clerkUser?.emailAddresses?.[0]?.emailAddress}</span>
        </div>
        {joinedDate && (
          <div className="flex items-center gap-3 text-zinc-400">
            <Calendar className="h-4 w-4 shrink-0 text-zinc-500" />
            <span className="text-zinc-300">Applied on {joinedDate}</span>
          </div>
        )}
      </div>

      <p className="mt-6 mb-8 text-xs leading-relaxed text-zinc-500 max-w-[280px]">
        An admin needs to approve your access. You'll receive a confirmation email when you're approved.
      </p>

      {/* Sign Out Button */}
      <button 
        onClick={() => clerk.signOut()} 
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}
