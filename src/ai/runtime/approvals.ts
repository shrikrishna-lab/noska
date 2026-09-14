/**
 * Noska Intelligence — Approval Registry
 *
 * When a tool call requires human approval (permission mode "approval"),
 * the runtime pauses on a promise managed here. The UI (Command Center,
 * AI progress card) lists pending approvals and resolves them.
 *
 * If the page unloads mid-approval, the awaiting run is marked interrupted
 * honestly rather than silently resumed.
 */

import type { ApprovalRequest } from "./types";

interface PendingApproval extends ApprovalRequest {
  resolve: (approved: boolean, answer?: string) => void;
}

const pending = new Map<string, PendingApproval>();
const listeners = new Set<(approvals: ApprovalRequest[]) => void>();

function snapshot(): ApprovalRequest[] {
  return [...pending.values()].map(({ resolve: _resolve, ...rest }) => rest);
}

function notify(): void {
  const snap = snapshot();
  for (const listener of listeners) {
    try { listener(snap); } catch { /* ignore */ }
  }
}

/** Create an approval request and wait for the user's decision. */
export function requestApproval(input: {
  executionId: string;
  category: string;
  action: string;
  reason: string;
  params?: Record<string, unknown>;
}): Promise<{ approved: boolean; request: ApprovalRequest }> {
  const id = `apr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      if (!pending.has(id)) return;
      timedOut = true;
      pending.delete(id);
      notify();
      resolve({ approved: false, request: { id, executionId: input.executionId, category: input.category as never, action: input.action, reason: input.reason, params: input.params, resolvedAt: new Date().toISOString(), approved: false } });
    }, 10 * 60_000); // auto-reject after 10 minutes of silence

    const wrapped = (approved: boolean) => {
      clearTimeout(timer);
      resolve({
        approved,
        request: {
          id,
          executionId: input.executionId,
          category: input.category as never,
          action: input.action,
          reason: input.reason,
          params: input.params,
          resolvedAt: new Date().toISOString(),
          approved,
        },
      });
    };

    pending.set(id, {
      id,
      executionId: input.executionId,
      category: input.category as never,
      action: input.action,
      reason: input.reason,
      params: input.params,
      resolve: (approved) => {
        if (timedOut) return;
        wrapped(approved);
      },
    });
    notify();
  });
}

/**
 * Ask the user a clarifying question mid-run and wait for a typed answer.
 * Reuses the pending-approval pipeline (category "clarify") so the existing
 * UI subscription surfaces it; the answer travels back through
 * respondToApproval(id, true, answer).
 */
export function requestClarification(input: {
  executionId: string;
  question: string;
}): Promise<{ answer: string | null }> {
  const id = `apr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      if (!pending.has(id)) return;
      timedOut = true;
      pending.delete(id);
      notify();
      resolve({ answer: null });
    }, 10 * 60_000);

    pending.set(id, {
      id,
      executionId: input.executionId,
      category: "clarify",
      action: input.question,
      reason: "The agent needs your answer to continue",
      resolve: (approved, answer) => {
        if (timedOut) return;
        clearTimeout(timer);
        pending.delete(id);
        notify();
        resolve({ answer: approved ? (answer || "") : null });
      },
    });
    notify();
  });
}

export function respondToApproval(approvalId: string, approved: boolean, answer?: string): boolean {
  const entry = pending.get(approvalId);
  if (!entry) return false;
  pending.delete(approvalId);
  entry.resolve(approved, answer);
  notify();
  return true;
}

export function getPendingApprovals(): ApprovalRequest[] {
  return snapshot();
}

export function subscribeApprovals(listener: (approvals: ApprovalRequest[]) => void): () => void {
  listeners.add(listener);
  listener(snapshot());
  return () => listeners.delete(listener);
}
