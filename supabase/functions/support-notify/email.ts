/**
 * Pure email builders for support notifications (no imports — unit-testable
 * from the web test suite by importing this file directly).
 */

export interface TicketConfirmDetails {
  ticket_number: string;
  user_name: string;
  subject: string;
}

export interface AdminReplyDetails {
  ticket_number: string;
  user_name: string;
  subject: string;
  admin_name: string;
  reply_excerpt: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(title: string, body: string): string {
  return `<div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
    <h2 style="margin-top: 0; color: #17161b;">${title}</h2>
    ${body}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="color: #6b7280; font-size: 12px;">Noska Help Desk — replies to this email are not monitored. Reply inside your ticket thread instead.</p>
  </div>`;
}

export function buildTicketConfirmEmail(t: TicketConfirmDetails): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your Noska support ticket ${t.ticket_number} is queued`;
  const html = shell(
    `Ticket ${esc(t.ticket_number)} received`,
    `<p>Hey ${esc(t.user_name)},</p>
    <p>We've queued your request and the support team will pick it up shortly (usually within 4–24 hours).</p>
    <p style="margin: 20px 0; padding: 12px 16px; background: #f7f5f1; border-radius: 8px;">
      <strong>Subject:</strong> ${esc(t.subject)}<br />
      <strong>Reference:</strong> <code>${esc(t.ticket_number)}</code>
    </p>
    <p>You can track progress any time with your ticket number and this email address.</p>`
  );
  const text =
    `Hey ${t.user_name},\n\nWe've queued your Noska support request (${t.ticket_number}, "${t.subject}"). ` +
    `The support team will pick it up shortly (usually within 4–24 hours).\n\n` +
    `— Noska Help Desk`;
  return { subject, html, text };
}

export function buildAdminReplyEmail(t: AdminReplyDetails): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Support replied to your ticket ${t.ticket_number}`;
  const html = shell(
    `New reply on ${esc(t.ticket_number)}`,
    `<p>Hey ${esc(t.user_name)},</p>
    <p><strong>${esc(t.admin_name)}</strong> from support replied to "${esc(t.subject)}":</p>
    <blockquote style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #17161b; background: #f7f5f1; border-radius: 0 8px 8px 0;">${esc(t.reply_excerpt)}</blockquote>
    <p>Open your ticket thread to read the full reply and respond.</p>`
  );
  const text =
    `Hey ${t.user_name},\n\n${t.admin_name} from support replied to "${t.subject}" (${t.ticket_number}):\n\n` +
    `${t.reply_excerpt}\n\nOpen your ticket thread to respond.\n\n— Noska Help Desk`;
  return { subject, html, text };
}

/** Keep notification emails readable — cut long replies with an ellipsis. */
export function excerpt(message: string, max = 300): string {
  const clean = message.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}
