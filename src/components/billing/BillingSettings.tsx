// BillingSettings: current plan, renewal, actions, usage, credits, top-ups, invoices, payments (§18/§22).
// Payment states (§53) rendered as friendly statuses — never raw provider codes.
import React, { useEffect, useState } from "react";
import { useEntitlements, notifyBillingChanged } from "@/hooks/billing/useEntitlements";
import { fetchMyInvoices, fetchMyPayments, manageSubscription, downgradePreview, formatMoney } from "@/lib/billing/api";
import type { InvoiceRow, PaymentRow } from "@/lib/billing/types";
import { billingMessage } from "@/lib/billing/errors";
import { UsageMeters } from "./UsageMeters";
import { PricingCards } from "./PricingCards";
import { CreditBalance } from "./CreditBalance";
import { TopupCards } from "./TopupCards";
import { PlanBadge } from "./PlanBadge";

const COUNTRIES: Array<{ code: string; label: string }> = [
  { code: "", label: "Not set (prices in USD)" },
  { code: "US", label: "United States (USD)" },
  { code: "IN", label: "India (INR)" },
  { code: "GB", label: "United Kingdom (GBP)" },
  { code: "DE", label: "Germany (EUR)" },
  { code: "FR", label: "France (EUR)" },
  { code: "NL", label: "Netherlands (EUR)" },
  { code: "ES", label: "Spain (EUR)" },
  { code: "IT", label: "Italy (EUR)" },
  { code: "CA", label: "Canada (CAD)" },
  { code: "AU", label: "Australia (AUD)" },
  { code: "SG", label: "Singapore (SGD)" },
  { code: "AE", label: "UAE (AED)" },
  { code: "JP", label: "Japan (JPY)" },
  { code: "BR", label: "Brazil (BRL)" },
];

const STATUS_LABEL: Record<string, string> = {
  active: "Active", trialing: "Trial", past_due: "Past due", paused: "Paused",
  cancelled: "Cancelled", expired: "Expired", pending: "Processing", incomplete: "Incomplete",
  unpaid: "Unpaid", none: "Free", unknown_cached: "Offline (cached)",
  captured: "Paid", paid: "Paid", failed: "Failed", refunded: "Refunded",
};

export function BillingSettings() {
  const { data, loading, refresh } = useEntitlements();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [preview, setPreview] = useState<null | { target: string; warnings: Array<{ key: string; used: number; allowed: number }>; effective: string | null }>(null);

  useEffect(() => {
    fetchMyInvoices().then(setInvoices).catch(() => {});
    fetchMyPayments().then(setPayments).catch(() => {});
  }, []);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setMsg(null);
    try {
      if (action === "cancel" && !window.confirm("Cancel at the end of the billing period? You keep access until then.")) { setBusy(false); return; }
      const res = await manageSubscription({ action, ...extra });
      if (action === "change_plan" && (res as { mode?: string }).mode === "upgrade_checkout") {
        setMsg("Upgrade order created — complete payment from the pricing section.");
        setShowPlans(true);
      } else if (action === "change_plan") {
        const p = res as { effective?: string };
        setMsg(`Downgrade scheduled — takes effect ${p.effective ? new Date(p.effective).toLocaleDateString("en-IN") : "at period end"}. Nothing is deleted.`);
      } else {
        setMsg("Done.");
      }
      await refresh();
      notifyBillingChanged();
    } catch (e) {
      setMsg(billingMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function showDowngradePreview(planSlug: string) {
    setMsg(null);
    try {
      const p = await downgradePreview(planSlug);
      setPreview({ target: planSlug, warnings: p.warnings, effective: p.effective });
    } catch (e) {
      setMsg(billingMessage(e));
    }
  }

  async function openPortal() {
    setBusy(true); setMsg(null);
    try {
      const res = await manageSubscription({ action: "portal", app_origin: window.location.origin }) as { portal_url?: string };
      if (res.portal_url) window.location.href = res.portal_url;
      else setMsg("Customer portal is not available yet.");
    } catch (e) {
      setMsg(billingMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading || !data) return <div className="animate-pulse space-y-3"><div className="h-24 rounded-2xl bg-neutral-100 dark:bg-white/5" /><div className="h-24 rounded-2xl bg-neutral-100 dark:bg-white/5" /></div>;

  const sub = data.subscription;
  const failed = payments.filter((p) => p.status === "failed").slice(0, 3);
  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

  return (
    <div className="space-y-6">
      {failed.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/30">
          <div className="font-semibold text-red-700 dark:text-red-300">Payment failed</div>
          {failed.map((p) => (
            <div key={p.id} className="mt-1 text-red-600 dark:text-red-400">
              {formatMoney(p.amount, p.currency)} on {fmtDate(p.created_at)}{p.failure_message ? ` — ${p.failure_message}` : ""}.{" "}
              <button onClick={() => setShowPlans(true)} className="underline">Retry by renewing</button>
            </div>
          ))}
          {sub.grace_period_until && <div className="mt-1 text-xs">Access continues until {fmtDate(sub.grace_period_until)} (grace period).</div>}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">Current plan</div>
            <div className="text-xl font-bold dark:text-white flex items-center gap-2.5 mt-0.5">
              <span>{data.plan.name}</span>
              <PlanBadge slug={data.plan.slug} name={data.plan.name} size="sm" />
            </div>
            <div className="mt-1 text-sm text-neutral-500">
              Status: <span className="font-medium">{STATUS_LABEL[sub.status] ?? sub.status}</span>
              {sub.billing_cycle && sub.status !== "none" && <> · {sub.billing_cycle}</>}
              {sub.current_period_end && <> · Renews {fmtDate(sub.current_period_end)}</>}
              {sub.cancel_at_period_end && <> · Cancels {fmtDate(sub.current_period_end)}</>}
              {sub.trial_end && sub.status === "trialing" && <> · Trial ends {fmtDate(sub.trial_end)}</>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => setShowPlans((v) => !v)} className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black">
              {showPlans ? "Hide plans" : "Change plan"}
            </button>
            {sub.status === "active" && !sub.cancel_at_period_end && (
              <button disabled={busy} onClick={() => act("cancel")} className="rounded-full border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-white/20 dark:text-white">
                Cancel
              </button>
            )}
            {sub.status === "cancelled" && sub.cancel_at_period_end && (
              <button disabled={busy} onClick={() => act("resume")} className="rounded-full border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-white/20 dark:text-white">
                Resume
              </button>
            )}
            {(sub.status === "active" || sub.status === "past_due") && (
              <button disabled={busy} onClick={openPortal} className="rounded-full border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-white/20 dark:text-white">
                Payment method
              </button>
            )}
          </div>
        </div>
        {showPlans && (
          <div className="mt-5 space-y-3">
            <PricingCards />
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-neutral-500">Check impact before downgrading:</span>
              {(["plus", "free"] as const).map((s) => (
                <button key={s} onClick={() => showDowngradePreview(s)} className="rounded-full border border-neutral-300 px-3 py-1 dark:border-white/20 dark:text-white">
                  Preview {s}
                </button>
              ))}
            </div>
            {preview && (
              <div className="rounded-2xl bg-neutral-50 p-4 text-sm dark:bg-white/5">
                <div className="font-semibold dark:text-white">Moving to {preview.target} — effective {fmtDate(preview.effective)}</div>
                {preview.warnings.length === 0 ? (
                  <p className="mt-1 text-neutral-500">Your usage fits within the new limits.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-amber-600">
                    {preview.warnings.map((w) => (
                      <li key={w.key}>⚠ {w.key}: using {w.used}, new limit {w.allowed}. Your data stays, but you can't add more until usage fits.</li>
                    ))}
                  </ul>
                )}
                <button
                  disabled={busy}
                  onClick={() => act("change_plan", { plan_slug: preview.target, billing_cycle: sub.billing_cycle ?? "monthly" })}
                  className="mt-3 rounded-full bg-black px-4 py-2 text-xs font-medium text-white dark:bg-white dark:text-black"
                >
                  Confirm downgrade
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-white/10">
        <h3 className="mb-1 text-sm font-semibold dark:text-white">Billing details</h3>
        <p className="mb-3 text-xs text-neutral-500">Country controls your pricing currency. GSTIN appears on Indian invoices.</p>
        <BillingProfileForm currentCountry={data.customer?.billing_country ?? null} onSaved={async () => { await refresh(); notifyBillingChanged(); }} />
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-white/10">
        <h3 className="mb-3 text-sm font-semibold dark:text-white">AI credits</h3>
        <CreditBalance />
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-white/10">
        <h3 className="mb-1 text-sm font-semibold dark:text-white">Buy AI credits</h3>
        <p className="mb-3 text-xs text-neutral-500">Top-ups stack on your plan allowance and expire as shown.</p>
        <TopupCards />
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-white/10">
        <h3 className="mb-3 text-sm font-semibold dark:text-white">Usage</h3>
        <UsageMeters />
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-white/10">
        <h3 className="mb-3 text-sm font-semibold dark:text-white">Invoices</h3>
        {invoices.length === 0 ? (
          <p className="text-sm text-neutral-500">No invoices yet.</p>
        ) : (
          <div className="divide-y divide-neutral-100 text-sm dark:divide-white/5">
            {invoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between py-2">
                <div><span className="font-medium dark:text-white">{i.invoice_number ?? "Invoice"}</span>{" "}<span className="text-neutral-500">{fmtDate(i.issued_at)} · {STATUS_LABEL[i.status] ?? i.status}</span></div>
                <div className="font-medium dark:text-white">{formatMoney(i.total, i.currency)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5 dark:border-white/10">
        <h3 className="mb-3 text-sm font-semibold dark:text-white">Payment history</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-neutral-500">No payments yet.</p>
        ) : (
          <div className="divide-y divide-neutral-100 text-sm dark:divide-white/5">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div><span className="font-medium dark:text-white">{STATUS_LABEL[p.status] ?? p.status}</span>{" "}<span className="text-neutral-500">{fmtDate(p.paid_at ?? p.created_at)}{p.payment_method ? ` · ${p.payment_method}` : ""}</span></div>
                <div className="font-medium dark:text-white">{formatMoney(p.amount, p.currency)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {msg && <p className="text-sm text-neutral-600 dark:text-neutral-300">{msg}</p>}
    </div>
  );
}

function BillingProfileForm({ currentCountry, onSaved }: { currentCountry: string | null; onSaved: () => Promise<void> }) {
  const [country, setCountry] = useState(currentCountry ?? "");
  const [gstin, setGstin] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setNote(null);
    try {
      await manageSubscription({ action: "update_billing_profile", billing_country: country || undefined, gstin: gstin || undefined, billing_name: name || undefined });
      setNote("Billing details saved. Prices now show in your local currency where available.");
      await onSaved();
    } catch (e) {
      setNote(billingMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-xs text-neutral-500">
        Country
        <select value={country} onChange={(e) => setCountry(e.target.value)}
          className="mt-1 w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm text-black dark:border-white/10 dark:text-white">
          {COUNTRIES.map((c) => <option key={c.code || "unset"} value={c.code}>{c.label}</option>)}
        </select>
      </label>
      <label className="text-xs text-neutral-500">
        Billing name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc"
          className="mt-1 w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-white/10 dark:text-white" />
      </label>
      <label className="text-xs text-neutral-500">
        GSTIN (India only)
        <input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5"
          className="mt-1 w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 font-mono text-sm dark:border-white/10 dark:text-white" />
      </label>
      <div className="flex items-end">
        <button disabled={saving} onClick={save} className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black">
          {saving ? "Saving…" : "Save details"}
        </button>
      </div>
      {note && <p className="text-xs text-neutral-500 sm:col-span-2">{note}</p>}
    </div>
  );
}
