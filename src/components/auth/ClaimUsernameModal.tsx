import React, { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { isUsernameAvailable, isValidUsernameFormat, normalizeUsername, setUsername } from "../../lib/supabaseService";
import { isMobile } from "../../platform";

type CheckState = "idle" | "checking" | "available" | "taken" | "invalid";

const DEBOUNCE_MS = 400;

interface ClaimUsernameModalProps {
  userId: string;
  onDone: (username: string) => void;
}

/**
 * Optional username selection prompt for desktop. Completely omitted on mobile.
 */
export default function ClaimUsernameModal({ userId, onDone }: ClaimUsernameModalProps) {
  if (isMobile()) {
    return null;
  }

  const [value, setValue] = useState("");
  const [state, setState] = useState<CheckState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const handleSkip = () => {
    onDone(normalizeUsername(value) || "user");
  };

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
    const cleaned = normalizeUsername(value);
    setSubmitting(true);
    setError(null);
    try {
      if (!userId) {
        onDone(cleaned);
        return;
      }
      await setUsername(userId, cleaned);
      onDone(cleaned);
    } catch (err: any) {
      if (err?.message?.includes("without an authenticated user") || !userId) {
        onDone(cleaned);
        return;
      }
      setError(err?.message || "Failed to set username. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-[400px] rounded-3xl border border-[var(--border)] bg-[var(--elevated,white)] dark:bg-neutral-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 text-[var(--muted,#71717a)] hover:text-[var(--text,#18181b)] p-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold text-[var(--text,#18181b)] dark:text-white">Choose your username</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted,#71717a)] dark:text-neutral-400">
          Pick a unique handle to personalize your workspace. You can also skip this and set it anytime in Settings.
        </p>

        <div className="mt-5 flex flex-col gap-1.5">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--muted,#71717a)] pointer-events-none select-none">@</span>
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
              className="w-full rounded-xl border bg-[var(--surface,white)] dark:bg-neutral-950 pl-8 pr-9 py-2.5 text-sm text-[var(--text,#18181b)] dark:text-white outline-none placeholder:text-[var(--muted,#a1a1aa)] transition-colors"
              style={{
                borderColor: state === "taken" || state === "invalid" ? "#ef4444" : state === "available" ? "#10b981" : "var(--border, rgba(120,120,128,0.2))"
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

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-[var(--accent,#3b82f6)] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Continue"}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full rounded-xl border border-[var(--border,rgba(120,120,128,0.2))] py-2.5 text-sm font-medium text-[var(--muted,#71717a)] dark:text-neutral-400 hover:text-[var(--text,#18181b)] transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
