/**
 * Noska Widget Platform — Action & Automation Widgets.
 * Powered by reusable ActionPrimitive.
 */
import React from "react";
import { Play, Webhook, Sparkles, RefreshCw, Send, CheckSquare, Plus } from "lucide-react";
import { ActionPrimitive, type ActionItem } from "../primitives/ActionPrimitive";
import type { WidgetProps } from "../types";

export function ActionButtonsWidget({ size, ctx }: WidgetProps) {
  const actions: ActionItem[] = [
    {
      id: "act-deploy",
      label: "Trigger Production Build",
      description: "Vercel / Supabase Sync",
      actionType: "workflow",
      icon: Play,
      requiresConfirmation: true,
      confirmationMessage: "Trigger immediate production deployment for workspace?",
    },
    {
      id: "act-ai-digest",
      label: "Generate Weekly AI Digest",
      description: "Synthesize all active pages",
      actionType: "ai_prompt",
      icon: Sparkles,
    },
    {
      id: "act-sync-cache",
      label: "Purge & Resync Connectors",
      description: "GitHub, Google, Slack",
      actionType: "provider_action",
      icon: RefreshCw,
    },
    {
      id: "act-task",
      label: "Create Sprint Task",
      description: "Add to active board",
      actionType: "create_record",
      icon: Plus,
    },
  ];

  return (
    <ActionPrimitive
      title="Quick Workspace Actions"
      actions={actions}
      size={size}
      onExecute={async (act) => {
        if (act.actionType === "ai_prompt") {
          ctx.actions.onAI();
          ctx.actions.onToast?.("AI Weekly Digest requested 🧠");
        } else if (act.actionType === "create_record") {
          ctx.actions.onNew("todo");
          ctx.actions.onToast?.("New task opened 📝");
        } else {
          ctx.actions.onToast?.(`Executed action: ${act.label} ⚡`);
        }
      }}
    />
  );
}
