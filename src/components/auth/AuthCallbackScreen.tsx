import { useAuth, useUser, useClerk, useSession } from "@clerk/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, supabaseAnon, setClerkSessionToken } from "../../lib/supabase";
import { upsertUserProfile, fetchUserProfile, hasPages } from "../../lib/supabaseService";
import { capture, identifyUser } from "../../lib/posthog";
import { setSentryUser } from "../../lib/sentry";
import { clearOAuthIntent } from "../../lib/oauthIntent";
import AuthBackground from "./AuthBackground";
import { slugifyWorkspaceName } from "../../utils/helpers";

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
  const { session } = useSession();
  const clerk = useClerk();
  const [stage, setStage] = useState<Stage>("signing_in");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const [dots, setDots] = useState("");
  const mountedRef = useRef(true);
  const processedRef = useRef(false);
  const callbackStartedRef = useRef(false);

  useEffect(() => {
    if (session) {
      setClerkSessionToken(() => session.getToken({ template: "supabase" }));
    }
  }, [session]);

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
    if (!isLoaded || window.location.pathname !== "/sso-callback" || callbackStartedRef.current) return;
    callbackStartedRef.current = true;
    clerk.handleRedirectCallback({}).catch((error) => {
      // The routing effect below may already be processing a completed
      // session (e.g. the user returned signed-in with no pending OAuth
      // state). Only surface an error if nothing took over.
      setTimeout(() => {
        if (!mountedRef.current || processedRef.current) return;
        setStage("error");
        setErrorMessage(error instanceof Error ? error.message : "Authentication failed. Please try again.");
      }, 250);
    });
  }, [clerk, isLoaded]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (processedRef.current) return;

    const isCallbackRoute = window.location.pathname === "/sso-callback";

    if (!isSignedIn) {
      if (isCallbackRoute) {
        timeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          setStage("error");
          setErrorMessage("Sign-in timed out. Please try again.");
        }, 15000);
        return;
      }
      navigate("/login", { replace: true });
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!user) return;

    processedRef.current = true;
    // The callback completed on this route — the marketing-home recovery
    // net must not fire for this attempt.
    clearOAuthIntent();

    (async () => {
      try {
        if (session) {
          setClerkSessionToken(() => session.getToken({ template: "supabase" }));
        }

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

        let isReturningUser = existingProfile?.onboarding_complete === true;
        if (!isReturningUser) {
          try {
            isReturningUser = await hasPages(user.id);
          } catch {}
        }

        try {
          await upsertUserProfile({
            userId: user.id,
            userName: uname,
            email,
            avatarUrl,
            // Preserve existing flags — upsertUserProfile omits unknown keys,
            // so a failed profile fetch can never downgrade a completed
            // onboarding back to false (which re-shows the create page).
            onboardingComplete: isReturningUser ? true : (existingProfile?.onboarding_complete ?? undefined),
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

        // Track first login and update waitlist status for approved entries.
        try {
          const { data: waitlistEntry } = await supabaseAnon
            .from("waitlist_entries" as never)
            .select("id, status, first_login_at" as never)
            .eq("email" as never, email.toLowerCase())
            .in("status" as never, ["invited", "approved", "accepted"] as never)
            .maybeSingle() as { data: { id: string; status: string; first_login_at: string | null } | null };

          if (waitlistEntry && !waitlistEntry.first_login_at) {
            await supabaseAnon
              .from("waitlist_entries" as never)
              .update({
                first_login_at: new Date().toISOString(),
                status: "accepted",
              } as never)
              .eq("id" as never, waitlistEntry.id);
          }
        } catch {
          // Non-critical: don't block sign-in if tracking fails
        }

        // Waitlist membership is a separate marketing workflow. It must not
        // block a successful application sign-in; new users should continue
        // into Noska's own onboarding UI. Only an explicit ban blocks access.

        setStage("redirecting");

        if (!mountedRef.current) return;

        await new Promise((r) => setTimeout(r, 600));

        const go = (path: string) => {
          if (import.meta.env.DEV) {
            const saved = sessionStorage.getItem("noska_dev_deep_link");
            if (saved) {
              path = saved;
              sessionStorage.removeItem("noska_dev_deep_link");
            }
          }
          if (window.opener) {
            window.close();
          } else {
            navigate(path, { replace: true });
          }
        };
        if (accessStatus === "approved") {
          // Never send a completed sign-in back to /login. Route returning
          // users directly into their workspace and new users into onboarding.
          const workspaceSlug = isReturningUser
            ? slugifyWorkspaceName(existingProfile?.workspace_name || `${uname}'s Workspace`)
            : null;
          go(workspaceSlug ? `/${workspaceSlug}` : (isReturningUser ? "/dashboard" : "/onboarding"));
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
  }, [isLoaded, isSignedIn, user, session]);

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
