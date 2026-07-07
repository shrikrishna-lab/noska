import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Loader2, X } from "lucide-react";
import { C } from "../../theme";
import { useOnboarding } from "../../hooks/useOnboarding";
import { PrimaryBtn } from "../Buttons";
import { isUsernameAvailable, isValidUsernameFormat, normalizeUsername } from "../../../lib/supabaseService";

type CheckState = "idle" | "checking" | "available" | "taken" | "invalid";

const DEBOUNCE_MS = 400;

/**
 * First real step of onboarding — every user must pick a unique,
 * permanent username here before continuing. This is what replaces the
 * hardcoded "Krishna Handibag" fallback seen throughout the editor: once
 * set, this becomes the identity written into every block/page edit
 * (see App.tsx's handleOnboardingComplete and Editor.tsx's edit paths).
 *
 * No "Back" button — this is the first real step (WelcomeStep has none
 * either) and username is a one-time, required choice at signup.
 */
export default function UsernameStep() {
  const { form, setFormField, next, currentUserId } = useOnboarding();
  const [state, setState] = useState<CheckState>(form.username ? "checking" : "idle");
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a slow, stale availability check resolving after the
  // user has already typed something else — without this, an in-flight
  // check for "alice" could overwrite the UI state for "alice2" if it
  // resolves later.
  const requestIdRef = useRef(0);

  useEffect(() => {
    const value = form.username.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value) {
      setState("idle");
      setError(null);
      return;
    }
    if (!isValidUsernameFormat(value)) {
      setState("invalid");
      setError("3-20 characters: lowercase letters, numbers, or underscores, starting with a letter.");
      return;
    }

    setState("checking");
    setError(null);
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        // Excludes the signed-in user's own row (see isUsernameAvailable's
        // doc comment) so replaying onboarding with an already-set
        // username doesn't falsely report it as taken.
        const available = await isUsernameAvailable(value, currentUserId);
        if (requestIdRef.current !== requestId) return; // superseded by a newer check
        setState(available ? "available" : "taken");
        if (!available) setError("That username is already taken.");
      } catch {
        if (requestIdRef.current !== requestId) return;
        setState("idle");
        setError("Couldn't check availability — check your connection and try again.");
      }
    }, DEBOUNCE_MS);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.username, currentUserId]);

  const canContinue = state === "available";

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold tracking-[-0.4px]" style={{ color: C.text }}>Choose your username</h2>
        <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
          This is your unique handle across Noska. It can't be changed later, and no two people can share one.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.muted }}>
          Username
        </label>
        <div className="relative">
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none"
            style={{ color: C.muted }}
          >
            @
          </span>
          <input
            autoFocus
            value={form.username}
            onChange={(e) => setFormField("username", normalizeUsername(e.target.value))}
            onKeyDown={(e) => { if (e.key === "Enter" && canContinue) next(); }}
            placeholder="jane_doe"
            className="w-full pl-8 pr-9 py-2.5 text-sm rounded-xl outline-none placeholder:text-[#9a9ab0] transition-all duration-200"
            style={{
              background: "#fff",
              border: state === "taken" || state === "invalid"
                ? "1.5px solid #ef4444"
                : state === "available"
                  ? "1.5px solid #10b981"
                  : `1.5px solid ${C.border}`,
              boxShadow: state === "checking" ? "0 0 0 3px rgba(124,58,237,0.1)" : "none",
              color: C.text,
            }}
            maxLength={20}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {state === "checking" && <Loader2 size={15} className="animate-spin" style={{ color: C.muted }} />}
            {state === "available" && <Check size={15} style={{ color: "#10b981" }} />}
            {(state === "taken" || state === "invalid") && <X size={15} style={{ color: "#ef4444" }} />}
          </span>
        </div>
        {error ? (
          <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>
        ) : (
          <p className="text-xs" style={{ color: C.muted }}>
            {state === "available" ? `noska.app/@${form.username} is yours` : "Lowercase letters, numbers, and underscores only."}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end pt-1">
        <PrimaryBtn onClick={next} disabled={!canContinue}>
          Continue <ChevronRight size={15} />
        </PrimaryBtn>
      </div>
    </div>
  );
}
