/**
 * Noska Widget Platform — Reusable Action & Automation Primitive.
 * Renders interactive button grids and trigger actions (Workflow, Webhook, AI, Provider Action).
 */
import React, { useState } from "react";
import { Play, Loader2, Check, AlertTriangle, ArrowRight, Zap, Sparkles } from "lucide-react";
import type { WidgetSize } from "../types";

export interface ActionItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  actionType: "workflow" | "webhook" | "provider_action" | "ai_prompt" | "create_record";
  color?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  payload?: Record<string, unknown>;
}

export interface ActionPrimitiveProps {
  title?: string;
  actions: ActionItem[];
  size?: WidgetSize;
  onExecute: (action: ActionItem) => Promise<void> | void;
}

export function ActionPrimitive({
  title,
  actions = [],
  size = "medium",
  onExecute,
}: ActionPrimitiveProps) {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<ActionItem | null>(null);

  const handleRun = async (act: ActionItem) => {
    if (act.requiresConfirmation && !confirmingAction) {
      setConfirmingAction(act);
      return;
    }

    setConfirmingAction(null);
    setRunningId(act.id);
    try {
      await onExecute(act);
      setSuccessId(act.id);
      setTimeout(() => setSuccessId(null), 2000);
    } catch {
      // Error handled upstream
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="flex h-full w-full flex-col justify-between p-3 select-none font-sans relative">
      {title && (
        <div className="flex items-center gap-1.5 pb-1 border-b border-black/[0.04] dark:border-white/[0.06] mb-1">
          <Zap size={13} className="text-amber-500" />
          <h4 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 truncate">{title}</h4>
        </div>
      )}

      {/* Confirmation Overlay */}
      {confirmingAction && (
        <div className="absolute inset-2 z-20 rounded-xl bg-white/95 dark:bg-[#151820]/95 backdrop-blur-md p-3 flex flex-col justify-between border border-amber-500/30 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle size={14} />
              <span>Confirm Action</span>
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
              {confirmingAction.confirmationMessage || `Are you sure you want to run "${confirmingAction.label}"?`}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setConfirmingAction(null)}
              className="flex-1 py-1 text-xs font-semibold rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 text-neutral-700 dark:text-neutral-300"
            >
              Cancel
            </button>
            <button
              onClick={() => handleRun(confirmingAction)}
              className="flex-1 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              Confirm & Run
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 my-auto py-1">
        {actions.map((act) => {
          const isRunning = runningId === act.id;
          const isSuccess = successId === act.id;
          const IconComp = act.icon || Play;

          return (
            <button
              key={act.id}
              disabled={isRunning}
              onClick={() => handleRun(act)}
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition active:scale-97 cursor-pointer text-left group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-7 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shrink-0">
                  {isRunning ? (
                    <Loader2 size={13} className="animate-spin text-indigo-500" />
                  ) : isSuccess ? (
                    <Check size={13} className="text-emerald-500 font-bold" />
                  ) : (
                    <IconComp size={13} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{act.label}</p>
                  {act.description && (
                    <p className="text-[10px] text-neutral-400 truncate">{act.description}</p>
                  )}
                </div>
              </div>
              <ArrowRight size={12} className="text-neutral-400 group-hover:translate-x-0.5 transition shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ActionPrimitive;
