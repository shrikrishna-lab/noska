import React, { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { isUsernameAvailable, isValidUsernameFormat, normalizeUsername, setUsername } from "../../lib/supabaseService";

type CheckState = "idle" | "checking" | "available" | "taken" | "invalid";

const DEBOUNCE_MS = 400;

interface ClaimUsernameModalProps {
  userId: string;
  onDone: (username: string) => void;
}

/**
 * Blocking, non-dismissable prompt shown once for accounts that predate
 * the username feature (existing `user_profiles` rows with
 * `onboarding_complete = true` but `username = null`) — those users
 * already skip the onboarding flow entirely (see App.tsx's bootstrap
 * effect), so UsernameStep would never reach them otherwise. Deliberately
 * has no skip/close button: every account must end up with a username so
 * `createdBy`/`lastEditedBy` attribution (Editor.tsx) is accurate for
 * everyone, not just new signups.
 */
export default function ClaimUsernameModal({ userId, onDone }: ClaimUsernameModalProps) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<CheckState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = value.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!trimmed) {
      setState("idle");
      setError(null);
      return;
    }
    if (!isValidUsernameFormat(trimmed)) {
      setState("invalid");
      setError("3-20 characters: lowercase letters, numbers, or underscores, starting with a letter.");
      return;
    }

    setState("checking");
    setError(null);
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(trimmed, userId);
        if (requestIdRef.current !== requestId) return;
        setState(available ? "available" : "taken");
        if (!available) setError("That username is already taken.");
      } catch {
        if (requestIdRef.current !== requestId) return;
        setState("idle");
        setError("Couldn't check availability — check your connection and try again.");
      }
    }, DEBOUNCE_MS);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, userId]);

  const canSubmit = state === "available" && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await setUsername(userId, value);
      onDone(normalizeUsername(value));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your username. Try again.");
      setState("idle");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-[400px] rounded-2xl border border-[var(--border)] bg-[var(--elevated)] p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-[var(--text)]">Choose your username</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
          We've added unique usernames since you last signed up. Pick yours to continue — this identifies your edits and lets others share pages with you directly.
        </p>

        <div className="mt-5 flex flex-col gap-1.5">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)] pointer-events-none select-none">@</span>
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(normalizeUsername(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) handleSubmit(); }}
              placeholder="jane_doe"
              maxLength={20}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="w-full rounded-xl border bg-[var(--surface)] pl-8 pr-9 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] transition-colors"
              style={{
                borderColor: state === "taken" || state === "invalid" ? "#ef4444" : state === "available" ? "#10b981" : "var(--border)"
              }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {state === "checking" && <Loader2 size={15} className="animate-spin text-[var(--muted)]" />}
              {state === "available" && <Check size={15} style={{ color: "#10b981" }} />}
              {(state === "taken" || state === "invalid") && <X size={15} style={{ color: "#ef4444" }} />}
            </span>
          </div>
          {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-5 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
