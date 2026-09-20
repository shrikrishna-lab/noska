// TopupCards (§11): buy AI credit packs. Same server-verified payment flow as plans.
import React, { useEffect, useState } from "react";
import { fetchTopupProducts, startTopup, verifyPayment, formatMoney } from "@/lib/billing/api";
import type { TopupProduct } from "@/lib/billing/types";
import { openRazorpayCheckout } from "@/lib/billing/razorpay";
import { billingMessage } from "@/lib/billing/errors";
import { notifyBillingChanged, useEntitlements } from "@/hooks/billing/useEntitlements";

export function TopupCards() {
  const [products, setProducts] = useState<TopupProduct[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { displayCurrency } = useEntitlements();

  useEffect(() => {
    fetchTopupProducts(displayCurrency).then(setProducts).catch(() => setProducts([]));
  }, [displayCurrency]);

  async function buy(p: TopupProduct) {
    setMsg(null);
    setBusy(p.slug);
    try {
      const res = await startTopup(p.slug, { currency: displayCurrency, provider: "stripe" });
      if (res.mode === "stripe_session" && res.session_url) {
        window.location.href = res.session_url;
        return;
      }
      if (res.mode !== "topup" || !res.order_id) {
        setMsg("Couldn't start checkout. Try again.");
        setBusy(null);
        return;
      }
      const opened = await openRazorpayCheckout({
        key_id: res.key_id!, order_id: res.order_id!, amount_minor: res.amount_minor!,
        currency: res.currency!, planName: p.name, email: res.email,
        onSuccess: async (r) => {
          try {
            const v = await verifyPayment({ ...r, topup_id: res.topup_id });
            setMsg(`+${v.credits ?? p.credits} AI credits added!`);
            notifyBillingChanged();
          } catch (e) {
            setMsg(billingMessage(e));
          } finally {
            setBusy(null);
          }
        },
        onDismiss: () => setBusy(null),
      });
      if (!opened) {
        setMsg("Couldn't load the payment window. Check your connection and try again.");
        setBusy(null);
      }
    } catch (e) {
      setMsg(billingMessage(e));
      setBusy(null);
    }
  }

  if (!products.length) return null;
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="flex flex-col rounded-2xl border border-neutral-200 p-4 dark:border-white/10">
            <div className="text-sm font-semibold dark:text-white">{p.name}</div>
            <div className="text-2xl font-bold dark:text-white">{p.credits.toLocaleString("en-IN")}<span className="text-xs font-normal text-neutral-500"> credits</span></div>
            <div className="text-sm text-neutral-500">{formatMoney(p.price, p.currency)} · valid {p.expiry_days} days</div>
            <button
              disabled={busy !== null}
              onClick={() => buy(p)}
              className="mt-3 rounded-full bg-black py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {busy === p.slug ? "Working…" : "Buy credits"}
            </button>
          </div>
        ))}
      </div>
      {msg && <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{msg}</p>}
    </div>
  );
}
