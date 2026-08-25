import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { realtimeCollab } from '../../lib/realtimeCollab';
import { aiManager } from '../../ai/AIManager';
import { resolveStoredSelection, applyModelPick } from '../../ai/modelSelection';
import {
  AiPromptInput,
  type AiModelSelection,
  type AiPromptSendStatus,
  getRealAiModels,
} from '../ui/ai-prompt-input';

interface PromptComposerProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onSend: (overrideText?: string, selection?: AiModelSelection) => void;
  loading: boolean;
  onAbort?: () => void;
  currentAgent?: { name: string; icon?: string | React.ReactNode };
  page?: { id?: string; title?: string };
  onOpenKeySetup?: (providerId?: string) => void;
  onUploadFile?: () => void;
  onSkills?: () => void;
  onConnectors?: () => void;
  onToast?: (msg: string) => void;
}

const WORKSPACE_PLACEHOLDERS = [
  "Ask anything about your workspace...",
  "Summarize this document...",
  "Extract action items and todo tasks...",
  "Draft a response or new page section...",
  "Brainstorm ideas or analyze structure...",
] as const;

/**
 * Resolve the persisted provider+model pair to a concrete selection entry.
 * Model ids are NOT unique across providers ("gpt-4o" exists on many), so
 * the pair must be resolved together — an id alone is ambiguous.
 */
function selectionFromAiManager(models: ReturnType<typeof getRealAiModels>): AiModelSelection | null {
  const chosen = resolveStoredSelection(models);
  if (!chosen) return null;
  return { id: chosen.id, effort: "high", context: undefined, fast: true, thinking: false };
}

export default function PromptComposer({
  prompt,
  setPrompt,
  onSend,
  loading,
  onAbort,
  currentAgent,
  page,
  onOpenKeySetup,
  onUploadFile,
  onSkills,
  onConnectors,
  onToast,
}: PromptComposerProps) {
  const models = useMemo(() => getRealAiModels(), []);
  const [modelSelection, setModelSelection] = useState<AiModelSelection>(() => {
    // Start from the PERSISTED provider+model pair so reloads keep the choice
    const saved = selectionFromAiManager(models);
    if (saved) return saved;
    // Nothing usable persisted → first configured model, else first listed
    const firstReady = models.find((m) => m.configured || m.providerType === "local") || models[0];
    return {
      id: firstReady?.id || "",
      effort: "high",
      context: undefined,
      fast: true,
      thinking: false,
    };
  });
  const [deepResearch, setDeepResearch] = useState(false);
  const [webSearch, setWebSearch] = useState(false);

  // Persist the choice THE MOMENT it's picked — including switching
  // providers — so it survives reloads and applies everywhere (#persist).
  const handleSelectionChange = useCallback(
    (next: AiModelSelection) => {
      setModelSelection(next);
      const entry = models.find((m) => m.id === next.id);
      if (!entry) return;
      applyModelPick(entry);
    },
    [models]
  );

  // Stay in sync when config changes elsewhere (e.g. the API-key modal
  // activates a different provider after saving a key).
  useEffect(() => {
    const unsubscribe = aiManager.subscribe(() => {
      const cfg = aiManager.getConfig();
      setModelSelection((prev) => {
        const currentEntry = models.find((m) => m.id === prev.id);
        const stillValid =
          currentEntry &&
          currentEntry.providerId === cfg.activeProvider &&
          prev.id === cfg.activeModel;
        if (stillValid) return prev;
        const saved = selectionFromAiManager(models);
        if (saved) return saved;
        return prev;
      });
    });
    return () => { unsubscribe(); };
  }, [models]);

  const handleSubmit = useCallback((value: string, selection: AiModelSelection) => {
    let finalPrompt = value;
    if (deepResearch) {
      finalPrompt = `[Deep Research Mode] ${finalPrompt}`;
    }
    if (webSearch) {
      finalPrompt = `[Web Search Active] ${finalPrompt}`;
    }
    onSend(finalPrompt, selection);
  }, [deepResearch, webSearch, onSend]);

  const handleChange = useCallback((val: string) => {
    setPrompt(val);
    if (page?.id && realtimeCollab.isJoined()) {
      realtimeCollab.sendTyping(page.id);
    }
  }, [setPrompt, page?.id]);

  const status: AiPromptSendStatus = loading ? "loading" : "idle";

  return (
    <div className="w-full px-4 pb-6 pt-2">
      {/* Clean Minimalist AI Prompt Card */}
      <AiPromptInput
        value={prompt}
        onChange={handleChange}
        onSubmit={handleSubmit}
        status={status}
        models={models}
        modelSelection={modelSelection}
        onModelSelectionChange={handleSelectionChange}
        onOpenKeySetup={onOpenKeySetup}
        placeholders={WORKSPACE_PLACEHOLDERS}
        placeholderInterval={3200}
        deepResearch={deepResearch}
        onDeepResearchChange={setDeepResearch}
        webSearch={webSearch}
        onWebSearchChange={setWebSearch}
        onUploadFile={onUploadFile ?? (() => onToast?.("File uploader ready"))}
        onSkills={onSkills ?? (() => onToast?.("AI Skills activated"))}
        onConnectors={onConnectors ?? (() => onToast?.("Connectors ready"))}
        aria-label="AI prompt"
      />

      {/* Real-time processing feedback */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between px-3 pt-2 text-xs text-[var(--muted)]"
          >
            <div className="flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '240ms' }} />
              </span>
              <span>{currentAgent?.name || 'AI'} is thinking with {modelSelection.id}...</span>
            </div>
            {onAbort && (
              <button
                type="button"
                onClick={onAbort}
                className="text-[var(--danger)] hover:underline font-medium"
              >
                Cancel
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
