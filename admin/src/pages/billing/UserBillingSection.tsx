// User admin profile → Subscription section (§47): live billing subscription,
// payments, overrides + support actions (grant credits, extend trial, cancel at period end).
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import {
  useUserBillingSubs, useUserBillingPayments, useUserBillingOverrides, useUserBillingCustomer,
  useCreateOverride, useAdminCancelSubscription, stripeDashboardUrl,
} from "@/lib/billing-queries";
import { supabase, getAdminToken } from "@/lib/supabase";

export function UserBillingSection({ clerkUserId }: { clerkUserId?: string }) {
  const subs = useUserBillingSubs(clerkUserId);
  const pays = useUserBillingPayments(clerkUserId);
  const ovs = useUserBillingOverrides(clerkUserId);
  const cust = useUserBillingCustomer(clerkUserId);
  const grant = useCreateOverride();
  const cancel = useAdminCancelSubscription();
  const [credits, setCredits] = useState("1000");
  const [reason, setReason] = useState("");

  if (!clerkUserId) return null;
  const active = (subs.data ?? []).find((s) => ["active", "trialing", "past_due"].includes(s.status ?? ""));
  const stripeCusId = (cust.data ?? []).find((c) => c.provider_customer_id)?.provider_customer_id ?? null;
  const stripeCusUrl = stripeDashboardUrl("customers", stripeCusId);
  const stripeSubUrl = active?.provider === "stripe" ? stripeDashboardUrl("subscriptions", active.provider_subscription_id) : null;

  async function grantCredits() {
    if (!reason.trim()) { toast.error("Reason required"); return; }
    try {
      await grant.mutateAsync({ user_id: clerkUserId!, feature_key: "monthly_ai_credits", limit_value: Number(credits) || 1000, expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), reason: reason.trim() });
      toast.success("Credits granted (30-day override)");
    } catch { toast.error("Grant failed"); }
  }

  async function extendTrial() {
    if (!active) { toast.error("No active subscription"); return; }
    if (!supabase) return;
    const end = new Date(new Date(active.trial_end ?? active.current_period_end ?? Date.now()).getTime() + 7 * 86400000).toISOString();
    const { error } = await supabase.rpc("admin_update", {
      p_session_token: getAdminToken(), p_table: "billing_subscriptions", p_id: active.id,
      p_data: { trial_end: end },
    });
    if (error) toast.error("Extend failed");
    else { toast.success("Trial extended by 7 days"); subs.refetch(); }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm"><CreditCard className="h-4 w-4" /> Billing (live)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {active ? (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={active.status === "active" ? "success" : "warning"}>{active.status}</Badge>
              <span>{active.billing_cycle} · {active.provider ?? "—"}</span>
              <span className="text-muted-foreground">renews {active.current_period_end ? new Date(active.current_period_end).toLocaleDateString("en-IN") : "—"}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {active.status === "trialing" && active.trial_end && <span className="text-muted-foreground">trial ends {new Date(active.trial_end).toLocaleDateString("en-IN")}</span>}
              {active.cancel_at_period_end && <span className="text-amber-600">cancels at period end</span>}
              {stripeSubUrl && <a href={stripeSubUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open in Stripe ↗</a>}
              {stripeCusUrl && <a href={stripeCusUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Customer in Stripe ↗</a>}
            </div>
          </div>
        ) : <p className="text-muted-foreground">No active billing subscription (Free).</p>}

        <div>
          <div className="mb-1 text-xs font-semibold">Recent payments</div>
          {(pays.data ?? []).slice(0, 5).map((p) => {
            const payUrl = stripeDashboardUrl("payments", p.provider_payment_id);
            return (
              <div key={p.id} className="flex justify-between text-xs">
                <span>{p.status} · {p.payment_method ?? "—"}{payUrl ? <> · <a href={payUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Stripe ↗</a></> : null}</span>
                <span>{p.currency ?? ""} {Number(p.amount).toLocaleString("en-IN")}</span>
              </div>
            );
          })}
          {(pays.data ?? []).length === 0 && <p className="text-xs text-muted-foreground">No payments.</p>}
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold">Active overrides</div>
          {(ovs.data ?? []).filter((o) => !o.expires_at || new Date(o.expires_at) > new Date()).map((o) => (
            <div key={o.id} className="font-mono text-xs">{o.feature_key} → {o.limit_value ?? (o.enabled ? "on" : "off")} · expires {o.expires_at ? new Date(o.expires_at).toLocaleDateString("en-IN") : "never"}</div>
          ))}
          {(ovs.data ?? []).length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Input className="w-28" value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="Credits" />
          <Input className="w-48" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" />
          <Button size="sm" onClick={grantCredits}>Grant credits</Button>
          <Button size="sm" variant="outline" onClick={extendTrial}>Extend trial 7d</Button>
          {active && (
            <Button size="sm" variant="destructive" disabled={!reason.trim()} onClick={async () => {
              try { await cancel.mutateAsync({ id: active.id, reason: reason.trim() }); toast.success("Set to cancel at period end"); }
              catch { toast.error("Cancel failed"); }
            }}>Cancel at period end</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
