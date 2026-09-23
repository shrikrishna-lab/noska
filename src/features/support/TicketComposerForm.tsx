/**
 * Shared support-ticket composer — the single source of truth for the "new
 * ticket" form UI. Rendered by the marketing /ticket page AND the dashboard
 * composer modal with byte-identical markup + classes (styled by
 * ticket-composer.css under .nsticket, a pixel twin of the marketing theme).
 */
import React from "react";
import { motion } from "framer-motion";
import {
  LifeBuoy,
  Send,
  AlertCircle,
  ShieldCheck,
  Bug,
  Lightbulb,
  CreditCard,
  Plug,
  Building2,
  type LucideIcon,
} from "lucide-react";
import "./ticket-composer.css";
import type {
  SupportTicketCategory,
  SupportTicketPriority,
} from "./api";

export interface TicketComposerValues {
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  email: string;
  name: string;
  subject: string;
  description: string;
}

export const TICKET_CATEGORIES: Array<{
  id: SupportTicketCategory;
  label: string;
  desc: string;
  icon: LucideIcon;
}> = [
  { id: "bug", label: "Bug Report", icon: Bug, desc: "Something is broken or behaving unexpectedly" },
  { id: "feature", label: "Feature Request", icon: Lightbulb, desc: "Idea for a new tool, canvas block or feature" },
  { id: "billing", label: "Billing & Account", icon: CreditCard, desc: "Subscriptions, invoice receipts, plan upgrades" },
  { id: "integration", label: "Integrations & MCP", icon: Plug, desc: "Google, GitHub, Slack or custom MCP server issues" },
  { id: "enterprise", label: "Enterprise & SLA", icon: Building2, desc: "Dedicated tenancy, SAML SSO, team workspaces" },
];

export const TICKET_PRIORITIES: Array<{ id: SupportTicketPriority; label: string }> = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent / Blocker" },
];

export const DEFAULT_COMPOSER_VALUES: TicketComposerValues = {
  category: "bug",
  priority: "medium",
  email: "",
  name: "",
  subject: "",
  description: "",
};

interface TicketComposerFormProps {
  values: TicketComposerValues;
  onChange: (patch: Partial<TicketComposerValues>) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
  /** Marketing-style header (pill + title + subtitle). Off inside the modal. */
  showHeader?: boolean;
  title?: string;
  subtitle?: string;
  /** Context label for the diagnostic notice, e.g. "Web Browser". */
  envLabel?: string;
  submitLabel?: string;
}

export default function TicketComposerForm({
  values,
  onChange,
  onSubmit,
  loading,
  error,
  showHeader = true,
  title = "Submit a Support Ticket",
  subtitle = "Need assistance or have feedback? Submit your request directly to our core engineering team.",
  envLabel,
  submitLabel = "Submit Ticket",
}: TicketComposerFormProps) {
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading) onSubmit();
  };

  return (
    <div className="nsticket">
      {showHeader && (
        <div className="ticket-form-header">
          <div className="ticket-header-pill">
            <LifeBuoy size={13} />
            <span>Noska Help Desk</span>
          </div>
          <h1 className="ticket-main-title">{title}</h1>
          <p className="ticket-main-sub">{subtitle}</p>
        </div>
      )}

      {error && (
        <div className="ticket-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="ticket-form-body">
        <div className="ticket-field-group">
          <label className="ticket-field-label">Issue Category</label>
          <div className="ticket-categories-grid">
            {TICKET_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = values.category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`ticket-category-btn ${active ? "active" : ""}`}
                  onClick={() => onChange({ category: cat.id })}
                  aria-pressed={active}
                >
                  <div className="ticket-cat-icon">
                    <Icon size={16} />
                  </div>
                  <div className="ticket-cat-info">
                    <p className="ticket-cat-title">{cat.label}</p>
                    <p className="ticket-cat-desc">{cat.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="ticket-input-row">
          <div className="ticket-field-group flex-1">
            <label className="ticket-field-label" htmlFor="nsticket-email">
              Your Email Address <span className="ticket-req">*</span>
            </label>
            <input
              id="nsticket-email"
              type="email"
              placeholder="you@company.com"
              value={values.email}
              onChange={(e) => onChange({ email: e.target.value })}
              className="ticket-input"
              required
            />
          </div>
          <div className="ticket-field-group flex-1">
            <label className="ticket-field-label" htmlFor="nsticket-name">
              Display Name
            </label>
            <input
              id="nsticket-name"
              type="text"
              placeholder="Jane Doe"
              value={values.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="ticket-input"
            />
          </div>
        </div>

        <div className="ticket-field-group">
          <label className="ticket-field-label">Priority Level</label>
          <div className="ticket-priorities-row">
            {TICKET_PRIORITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`ticket-priority-chip ${values.priority === p.id ? "active" : ""}`}
                onClick={() => onChange({ priority: p.id })}
                aria-pressed={values.priority === p.id}
              >
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ticket-field-group">
          <label className="ticket-field-label" htmlFor="nsticket-subject">
            Subject / Summary <span className="ticket-req">*</span>
          </label>
          <input
            id="nsticket-subject"
            type="text"
            placeholder="Brief description of the issue or inquiry"
            value={values.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            className="ticket-input"
            required
          />
        </div>

        <div className="ticket-field-group">
          <label className="ticket-field-label" htmlFor="nsticket-desc">
            Detailed Description <span className="ticket-req">*</span>
          </label>
          <textarea
            id="nsticket-desc"
            rows={5}
            placeholder="Please include steps to reproduce, expected behavior, or specific error messages..."
            value={values.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className="ticket-textarea"
            required
          />
        </div>

        <div className="ticket-env-notice">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>
            Diagnostic context ({envLabel || "Web Browser"}) will be attached securely to expedite triage.
          </span>
        </div>

        <div className="ticket-submit-row">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="ticket-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span>Submitting Ticket…</span>
            ) : (
              <>
                <span>{submitLabel}</span>
                <Send size={14} />
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
