import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/react";
import { supabase } from "../../lib/supabase";
import { motion } from "framer-motion";

export function WaitlistGate({ children }: { children: React.ReactNode }) {
  const { user: clerkUser } = useUser();
  const clerk = useClerk();
  const [status, setStatus] = useState<"checking" | "approved" | "waiting" | "error">("checking");

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
          .from("approved_emails" as never)
          .select("id")
          .eq("email" as never, email.toLowerCase())
          .maybeSingle() as never;
        setStatus(data ? "approved" : "waiting");
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

  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a0a] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="mb-6 text-6xl">🎉</div>
        <h1 className="mb-3 text-2xl font-bold text-white">You're on the Noska Waitlist!</h1>
        <p className="mb-2 text-zinc-400">
          Your email <strong className="text-zinc-200">{clerkUser?.emailAddresses?.[0]?.emailAddress}</strong> has been registered but hasn't been approved yet.
        </p>
        <p className="mb-8 text-zinc-500 text-sm">
          An admin needs to approve your access. You'll receive an email when you're approved.
        </p>
        <button
          onClick={() => clerk.signOut()}
          className="rounded-lg bg-zinc-800 px-6 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Sign out
        </button>
      </motion.div>
    </div>
  );
}
