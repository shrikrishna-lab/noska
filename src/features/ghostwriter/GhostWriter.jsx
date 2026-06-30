import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { runAI } from "../../utils/ai";

/**
 * GhostWriter — inline AI autocomplete for blocks.
 *
 * Renders a ghost suggestion after the user pauses typing for 800ms.
 * Accept with Tab, dismiss with Esc.
 *
 * Usage:
 *   <GhostWriter
 *     blockText="Current block text"
 *     contextBefore="Previous blocks text"
 *     enabled={ghostWriterEnabled}
 *     apiKey={apiKey}
 *     aiProvider={aiProvider}
 *     nvidiaKey={nvidiaKey}
 *     onAccept={(fullText) => updateBlock(...)}
 *   />
 */

export function useGhostWriter({
  blockText,
  contextBefore = "",
  enabled = true,
  apiKey,
  aiProvider,
  nvidiaKey,
  minChars = 8
}) {
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const lastTextRef = useRef("");

  const clear = useCallback(() => {
    setSuggestion("");
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) {
      abortRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !blockText || blockText.length < minChars) {
      clear();
      return;
    }

    // Don't re-trigger if text hasn't changed
    if (blockText === lastTextRef.current) return;
    lastTextRef.current = blockText;

    // Clear previous suggestion
    setSuggestion("");
    if (timerRef.current) clearTimeout(timerRef.current);

    // Debounce 800ms
    timerRef.current = setTimeout(async () => {
      const currentAbort = {};
      abortRef.current = currentAbort;
      setLoading(true);

      try {
        const result = await runAI({
          provider: aiProvider,
          anthropicKey: apiKey,
          nvidiaKey,
          system: `You are an inline writing assistant. Given the context and current line, suggest a SHORT continuation (5-20 words max). Output ONLY the continuation text, nothing else. No quotes, no explanation. If the text seems complete, output nothing.`,
          prompt: `Context:\n${contextBefore.slice(-500)}\n\nCurrent line: ${blockText}\n\nContinuation:`
        });

        if (abortRef.current !== currentAbort) return; // Stale

        const clean = result
          .replace(/^["']|["']$/g, "")
          .replace(/^continuation:\s*/i, "")
          .trim();

        if (clean && clean.length > 2 && clean.length < 200) {
          setSuggestion(clean);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [blockText, enabled, apiKey, aiProvider, nvidiaKey, contextBefore, minChars, clear]);

  const accept = useCallback(() => {
    if (!suggestion) return null;
    const accepted = suggestion;
    setSuggestion("");
    return accepted;
  }, [suggestion]);

  const dismiss = useCallback(() => {
    clear();
  }, [clear]);

  return { suggestion, loading, accept, dismiss, clear };
}

/* ─── Visual component for ghost text ─── */

export function GhostSuggestion({ suggestion, onAccept, onDismiss }) {
  if (!suggestion) return null;

  return (
    <AnimatePresence>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.45 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="pointer-events-none select-none text-[var(--muted)] italic"
        style={{ userSelect: "none" }}
      >
        {suggestion}
        <motion.span
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ delay: 0.3 }}
          className="ml-2 inline-flex items-center gap-0.5 rounded border border-[var(--border)] px-1 py-0 text-[9px] font-medium text-[var(--muted)] not-italic"
        >
          Tab ↹
        </motion.span>
      </motion.span>
    </AnimatePresence>
  );
}

export default useGhostWriter;
