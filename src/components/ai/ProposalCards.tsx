import { motion } from "framer-motion";
import { Bot, Zap, CheckCircle2, ShieldCheck } from "lucide-react";
import { describeTrigger } from "../../ai/runtime";
import type { AgentProposal, AutomationProposal } from "../../ai/runtime";

/** "Agent Ready" review card — nothing is created until the user confirms.
 * Shared by the AI right panel and the full AI panel so proposal review is
 * identical everywhere. */
export function AgentProposalCardView({ proposal, busy, onCreate, onDismiss }: {
  proposal: AgentProposal;
  busy: boolean;
  onCreate: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mr-auto w-full max-w-full rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/[0.04] p-3"
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/12 flex items-center justify-center">
          <Bot size={12} className="text-[var(--accent)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-[var(--text)] truncate">{proposal.name}</p>
          <p className="text-[9px] text-[var(--muted)]">Agent Ready · {describeTrigger(proposal.trigger)}</p>
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-secondary)] mt-2 line-clamp-3">{proposal.description}</p>

      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1 text-[9px] text-[var(--muted)]">
          <CheckCircle2 size={8} className="text-[var(--success)]" />
          Context: {proposal.contextScope.length > 0 ? proposal.contextScope.join(", ") : "Workspace"}
        </div>
        <div className="flex items-center gap-1 text-[9px] text-[var(--muted)]">
          <ShieldCheck size={8} className="text-[var(--success)]" />
          Creates & updates pages · Deletes need approval
        </div>
      </div>

      <details className="mt-2 group/proposal">
        <summary className="cursor-pointer text-[9px] text-[var(--muted)] hover:text-[var(--text-secondary)] select-none">
          Review instructions
        </summary>
        <p className="text-[9px] text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] rounded-md p-2 mt-1 whitespace-pre-wrap max-h-28 overflow-y-auto scrollbar-thin">
          {proposal.instructions}
        </p>
      </details>

      <div className="flex gap-1.5 mt-2.5">
        <button
          onClick={onCreate}
          disabled={busy}
          className="flex-1 rounded-lg bg-[var(--accent)] px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-[var(--accent)]/90 disabled:opacity-50 transition"
        >
          Create Agent
        </button>
        <button
          onClick={onDismiss}
          className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--text)] transition"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}

/** "Automation Ready" review card. */
export function AutomationProposalCardView({ proposal, busy, onCreate, onDismiss }: {
  proposal: AutomationProposal;
  busy: boolean;
  onCreate: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mr-auto w-full max-w-full rounded-xl border border-[var(--warning)]/25 bg-[var(--warning)]/[0.05] p-3"
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-[var(--warning)]/12 flex items-center justify-center">
          <Zap size={12} className="text-[var(--warning)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-[var(--text)] truncate">{proposal.name}</p>
          <p className="text-[9px] text-[var(--muted)]">Automation Ready · {describeTrigger(proposal.trigger)}</p>
        </div>
      </div>

      <div className="mt-2 space-y-0.5">
        {proposal.actions.map((a, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
            <CheckCircle2 size={8} className="text-[var(--success)] shrink-0" />
            {a.label}
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mt-2.5">
        <button
          onClick={onCreate}
          disabled={busy}
          className="flex-1 rounded-lg bg-[var(--warning)] px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-[var(--warning)]/90 disabled:opacity-50 transition"
        >
          Create Automation
        </button>
        <button
          onClick={onDismiss}
          className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--text)] transition"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}
