import { useAuth, useUser, useClerk } from "@clerk/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, supabaseAnon } from "../../lib/supabase";
import { upsertUserProfile, fetchUserProfile } from "../../lib/supabaseService";
import { capture, identifyUser } from "../../lib/posthog";
import { setSentryUser } from "../../lib/sentry";
import AuthBackground from "./AuthBackground";

type Stage = "signing_in" | "syncing" | "checking" | "redirecting" | "error";

interface StageConfig {
  label: string;
  description: string;
}

const STAGES: Record<Stage, StageConfig> = {
  signing_in: { label: "Completing sign-in", description: "Establishing your secure session" },
  syncing: { label: "Syncing your profile", description: "Setting up your workspace" },
  checking: { label: "Checking access", description: "Verifying your account status" },
  redirecting: { label: "Almost there", description: "Taking you to your workspace" },
  error: { label: "Something went wrong", description: "" },
};

export function AuthCallbackScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const [stage, setStage] = useState<Stage>("signing_in");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const [dots, setDots] = useState("");
  const mountedRef = useRef(true);
  const processedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (processedRef.current) return;

    const hasCallbackParams = window.location.href.includes("__clerk_status") ||
      window.location.search.includes("code=") ||
      window.location.search.includes("state=");

    if (!isSignedIn && !hasCallbackParams) {
      navigate("/login", { replace: true });
      return;
    }

    if (!isSignedIn || !user) return;

    processedRef.current = true;

    (async () => {
      try {
        const email = user.primaryEmailAddress?.emailAddress || "";
        const uname = user.fullName || email.split("@")[0] || "User";
        const avatarUrl = user.imageUrl || null;

        identifyUser(user.id, { email, name: uname });
        setSentryUser({ id: user.id, email, name: uname });

        setStage("syncing");

        let existingProfile = null;
        try {
          existingProfile = await fetchUserProfile(user.id);
        } catch {}

        try {
          await upsertUserProfile({
            userId: user.id,
            userName: uname,
            email,
            avatarUrl,
            onboardingComplete: existingProfile?.onboarding_complete ?? false,
            useCase: existingProfile?.use_case,
            workspaceName: existingProfile?.workspace_name,
          });
        } catch (e) {
          console.warn("AuthCallback: profile upsert failed", e);
        }

        setStage("checking");

        let accessStatus: "approved" | "waiting" | "banned" = "approved";

        try {
          const { data: banned } = await supabaseAnon
            .from("banned_users" as never)
            .select("id" as never)
            .eq("email" as never, email.toLowerCase())
            .maybeSingle() as never;
          if (banned) {
            accessStatus = "banned";
          }
        } catch {}

        if (accessStatus !== "banned") {
          try {
            const { data: approved } = await supabaseAnon
              .from("approved_emails")
              .select("id")
              .eq("email", email.toLowerCase())
              .maybeSingle();
            if (!approved) {
              accessStatus = "waiting";
            }
          } catch {
            accessStatus = "approved";
          }
        }

        setStage("redirecting");

        if (!mountedRef.current) return;

        await new Promise((r) => setTimeout(r, 600));

        const go = (path: string) => {
          if (window.opener) {
            window.close();
          } else {
            navigate(path, { replace: true });
          }
        };
        if (accessStatus === "approved") {
          go("/login");
        } else if (accessStatus === "banned") {
          go("/banned");
        } else {
          go("/waitlist");
        }
      } catch (e) {
        if (!mountedRef.current) return;
        setStage("error");
        setErrorMessage(e instanceof Error ? e.message : "Authentication failed. Please try again.");
      }
    })();
  }, [isLoaded, isSignedIn, user]);

  const handleRetry = useCallback(() => {
    processedRef.current = false;
    setStage("signing_in");
    setErrorMessage(null);
    window.location.replace("/login");
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#f8fafc] z-50 overflow-hidden font-sans select-none">
      <AuthBackground />

      <div className="relative z-10 w-full max-w-[400px] px-4 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center w-full"
        >
          <div className="w-16 h-16 mb-10 bg-white border border-slate-200/80 flex items-center justify-center p-3.5 shrink-0 rounded-2xl shadow-lg">
            <img
              src="/logo.png"
              alt="Noska Logo"
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </div>

          <AnimatePresence mode="wait">
            {stage !== "error" ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center w-full"
              >
                <div className="relative h-12 w-12 mb-6">
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-slate-200"
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: 0.3 }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-slate-700"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  />
                </div>

                <p className="text-sm font-medium text-slate-700 mb-1">
                  {STAGES[stage].label}{dots}
                </p>
                <p className="text-xs text-slate-400">
                  {STAGES[stage].description}
                </p>

                <div className="w-48 h-1 bg-slate-200/60 rounded-full mt-8 overflow-hidden">
                  <motion.div
                    className="h-full bg-slate-700 rounded-full"
                    initial={{ width: "0%" }}
                    animate={
                      stage === "signing_in" ? { width: "25%" } :
                      stage === "syncing" ? { width: "50%" } :
                      stage === "checking" ? { width: "75%" } :
                      { width: "100%" }
                    }
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center w-full"
              >
                <div className="h-12 w-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-5">
                  <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">Sign-in failed</p>
                <p className="text-xs text-slate-400 text-center max-w-xs mb-6">
                  {errorMessage || "We couldn't complete the sign-in. Please try again."}
                </p>
                <button
                  onClick={handleRetry}
                  className="px-6 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Try again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
