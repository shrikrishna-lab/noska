import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/react";
import { supabase } from "../../lib/supabase";
import { motion } from "framer-motion";

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
          <p className="text-sm text-zinc-500">Checking access...</p>
        </div>
      </div>
    );
  }

  if (status === "approved") return <>{children}</>;

  if (status === "expired") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
          <div className="mb-6 text-6xl">⏳</div>
          <h1 className="mb-3 text-2xl font-bold text-white">Invite Expired</h1>
          <p className="mb-2 text-zinc-400">Your invitation has expired. Please request a new one.</p>
          <button onClick={() => clerk.signOut()} className="rounded-lg bg-zinc-800 px-6 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700">Sign out</button>
        </motion.div>
      </div>
    );
  }

  if (status === "banned") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
          <div className="mb-6 text-6xl">🚫</div>
          <h1 className="mb-3 text-2xl font-bold text-white">Access Restricted</h1>
          <p className="mb-2 text-zinc-400">{entryData?.ban_reason ?? "Your account has been banned."}</p>
          <button onClick={() => clerk.signOut()} className="rounded-lg bg-zinc-800 px-6 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700">Sign out</button>
        </motion.div>
      </div>
    );
  }

  if (status === "suspended") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
          <div className="mb-6 text-6xl">⏸️</div>
          <h1 className="mb-3 text-2xl font-bold text-white">Account Suspended</h1>
          <p className="mb-2 text-zinc-400">{entryData?.suspension_reason ?? "Your account has been temporarily suspended."}</p>
          <button onClick={() => clerk.signOut()} className="rounded-lg bg-zinc-800 px-6 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700">Sign out</button>
        </motion.div>
      </div>
    );
  }

  const position = entryData?.position;
  const joinedDate = entryData?.joined_at ? new Date(entryData.joined_at).toLocaleDateString() : null;

  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a0a] p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
        <div className="mb-6 text-6xl">🎉</div>
        <h1 className="mb-3 text-2xl font-bold text-white">You're on the Noska Waitlist!</h1>
        {position && <p className="mb-1 text-3xl font-bold text-[#7c3aed]">#{position}</p>}
        {position && <p className="mb-2 text-xs text-zinc-500">Your position in queue</p>}
        <p className="mb-2 text-zinc-400">
          Your email <strong className="text-zinc-200">{clerkUser?.emailAddresses?.[0]?.emailAddress}</strong> has been registered but hasn't been approved yet.
        </p>
        {joinedDate && <p className="mb-2 text-xs text-zinc-500">Applied: {joinedDate} · Est. invite: 2–3 weeks</p>}
        <p className="mb-8 text-zinc-500 text-sm">
          An admin needs to approve your access. You'll receive an email when you're approved.
        </p>
        <button onClick={() => clerk.signOut()} className="rounded-lg bg-zinc-800 px-6 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700">Sign out</button>
      </motion.div>
    </div>
  );
}
