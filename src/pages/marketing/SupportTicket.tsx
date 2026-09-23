import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ArrowLeft,
  MessageSquare,
  ExternalLink,
  Search,
  Loader2,
  AlertCircle,
  Inbox,
  Ticket as TicketIcon,
} from 'lucide-react';
import { supabaseAnon } from '../../lib/supabase';
import { isDesktop } from '../../lib/desktop/platform';
import TicketComposerForm, {
  DEFAULT_COMPOSER_VALUES,
  type TicketComposerValues,
} from '../../features/support/TicketComposerForm';
import {
  lookupSupportTicket,
  requestTicketConfirmEmail,
  type SupportMessage,
} from '../../features/support/api';
import './SupportTicket.css';

type Mode = 'submit' | 'track';

export default function SupportTicket() {
  const [mode, setMode] = useState<Mode>('submit');
  const [values, setValues] = useState<TicketComposerValues>(DEFAULT_COMPOSER_VALUES);
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const patch = (p: Partial<TicketComposerValues>) =>
    setValues((v) => ({ ...v, ...p }));

  const handleSubmit = async () => {
    if (!values.email.trim() || !values.subject.trim() || !values.description.trim()) {
      setErrorMsg('Please fill in your email, subject, and description.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      if (!supabaseAnon) throw new Error('Support backend is not configured in this build.');
      // Real insert through the validated portal RPC (the table itself is
      // rpc-only for anon, so a direct insert would silently fail).
      const { data, error } = await supabaseAnon.rpc(
        'support_create_ticket' as never,
        {
          p_subject: values.subject.trim(),
          p_description: values.description.trim(),
          p_category: values.category,
          p_priority: values.priority,
          p_email: values.email.trim(),
          p_name: values.name.trim() || null,
          p_platform: isDesktop() ? 'desktop' : 'web',
          p_user_agent: navigator.userAgent,
        } as never
      );
      if (error) throw error;
      const created = data as { id: string; ticket_number: string };
      if (!created?.ticket_number) throw new Error('Ticket creation returned no data.');
      // Best-effort confirmation email — never blocks the success screen.
      void requestTicketConfirmEmail(supabaseAnon, created.ticket_number, values.email.trim());
      setTimeout(() => {
        setLoading(false);
        setTicketId(created.ticket_number);
      }, 500);
    } catch (err) {
      console.warn('Support ticket submission failed:', err);
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      setLoading(false);
      setErrorMsg(
        msg.includes('RATE_LIMITED')
          ? 'You have submitted several tickets recently. Please wait a bit and try again.'
          : msg.includes('INVALID_EMAIL')
            ? 'That email address doesn\u2019t look valid.'
            : `Could not submit the ticket: ${msg}`
      );
    }
  };

  return (
    <div className="ticket-page-wrapper">
      <div className="ticket-page-container mkt-container">
        <Link to="/docs?section=contact-support" className="ticket-back-link">
          <ArrowLeft size={14} /> Back to Support Docs
        </Link>

        {/* Submit / Track switcher */}
        {!ticketId && (
          <div className="ticket-mode-switch">
            <button
              type="button"
              className={`ticket-mode-btn ${mode === 'submit' ? 'active' : ''}`}
              onClick={() => setMode('submit')}
            >
              Submit a ticket
            </button>
            <button
              type="button"
              className={`ticket-mode-btn ${mode === 'track' ? 'active' : ''}`}
              onClick={() => setMode('track')}
            >
              Track existing ticket
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {mode === 'track' && !ticketId ? (
            <motion.div
              key="track"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <TicketTracker />
            </motion.div>
          ) : ticketId ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="ticket-success-card"
            >
              <div className="ticket-success-icon-badge">
                <Check size={28} className="text-emerald-500" />
              </div>
              <h1 className="ticket-success-title">Ticket Submitted Successfully</h1>
              <p className="ticket-success-sub">
                Your ticket reference ID is <strong className="ticket-ref-code">{ticketId}</strong>. A
                confirmation email is on its way to <strong>{values.email}</strong>.
              </p>

              <div className="ticket-success-details-grid">
                <div className="ticket-detail-item">
                  <span className="ticket-detail-label">Status</span>
                  <span className="ticket-status-pill">Active & Queued</span>
                </div>
                <div className="ticket-detail-item">
                  <span className="ticket-detail-label">Expected Response</span>
                  <span className="ticket-detail-val">&lt; 4–24 hours</span>
                </div>
                <div className="ticket-detail-item">
                  <span className="ticket-detail-label">Category</span>
                  <span className="ticket-detail-val capitalize">{values.category}</span>
                </div>
                <div className="ticket-detail-item">
                  <span className="ticket-detail-label">Priority</span>
                  <span className="ticket-detail-val capitalize">{values.priority}</span>
                </div>
              </div>

              <div className="ticket-success-actions">
                <Link to="/docs" className="ticket-btn secondary">
                  Browse Documentation
                </Link>
                <button
                  type="button"
                  className="ticket-btn primary"
                  onClick={() => setMode('track')}
                >
                  <TicketIcon size={14} /> Track this ticket
                </button>
                <a
                  href="https://discord.gg/noska"
                  target="_blank"
                  rel="noreferrer"
                  className="ticket-btn secondary"
                >
                  <MessageSquare size={14} /> Join Discord <ExternalLink size={12} />
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="ticket-form-card"
            >
              <TicketComposerForm
                values={values}
                onChange={patch}
                onSubmit={handleSubmit}
                loading={loading}
                error={errorMsg}
                showHeader
                envLabel={isDesktop() ? 'Desktop App' : 'Web Browser'}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TicketTracker() {
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    ticket: { ticket_number: string; subject: string; status: string; category: string; priority: string; last_update: string };
    messages: SupportMessage[];
  } | null>(null);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      if (!supabaseAnon) throw new Error('Support backend is not configured in this build.');
      const found = await lookupSupportTicket(supabaseAnon, number, email);
      setResult(found as {
        ticket: { ticket_number: string; subject: string; status: string; category: string; priority: string; last_update: string };
        messages: SupportMessage[];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ticket-form-card">
      <div className="nsticket">
        <div className="ticket-form-header">
          <h1 className="ticket-main-title">Track Your Ticket</h1>
          <p className="ticket-main-sub">
            Enter your ticket reference and the email you submitted it with.
          </p>
        </div>

        {error && (
          <div className="ticket-error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={lookup} className="ticket-form-body">
          <div className="ticket-input-row">
            <div className="ticket-field-group flex-1">
              <label className="ticket-field-label" htmlFor="track-number">
                Ticket Reference <span className="ticket-req">*</span>
              </label>
              <input
                id="track-number"
                type="text"
                placeholder="NSK-123456"
                value={number}
                onChange={(e) => setNumber(e.target.value.toUpperCase())}
                className="ticket-input"
                required
              />
            </div>
            <div className="ticket-field-group flex-1">
              <label className="ticket-field-label" htmlFor="track-email">
                Email Address <span className="ticket-req">*</span>
              </label>
              <input
                id="track-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ticket-input"
                required
              />
            </div>
          </div>
          <div className="ticket-submit-row">
            <button type="submit" className="ticket-submit-btn" disabled={loading}>
              {loading ? (
                <span>Looking up…</span>
              ) : (
                <>
                  <Search size={14} /> <span>Track ticket</span>
                </>
              )}
            </button>
          </div>
        </form>

        {loading && (
          <div className="ticket-track-loading">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {result && (
          <div className="ticket-track-result">
            <div className="ticket-track-head">
              <Inbox size={15} />
              <div>
                <p className="ticket-track-subject">{result.ticket.subject}</p>
                <p className="ticket-track-meta">
                  {result.ticket.ticket_number} · {result.ticket.category} · updated{' '}
                  {new Date(result.ticket.last_update).toLocaleString()}
                </p>
              </div>
              <span className={`ticket-track-status status-${result.ticket.status}`}>
                {result.ticket.status.replace('_', ' ')}
              </span>
            </div>
            <div className="ticket-track-thread">
              {result.messages.map((m) => (
                <div
                  key={m.id}
                  className={`ticket-track-msg ${m.sender_type === 'admin' ? 'from-admin' : 'from-user'}`}
                >
                  {m.sender_type === 'admin' && (
                    <p className="ticket-track-sender">{m.sender_name} · Support</p>
                  )}
                  <p className="ticket-track-text">{m.message}</p>
                  <p className="ticket-track-time">
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <p className="ticket-track-hint">
              Want to reply? Sign in to your dashboard and open Support Tickets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
