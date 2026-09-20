// /billing/return — Stripe Checkout landing. Confirms the session server-side,
// refreshes entitlements, then routes to billing. Never trusts URL params.
import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { verifyPayment } from "@/lib/billing/api";
import { billingMessage } from "@/lib/billing/errors";
import { notifyBillingChanged } from "@/hooks/billing/useEntitlements";

export default function BillingReturn() {
  const [params] = useSearchParams();
  const [state, setState] = useState<"working" | "done" | "error" | "pending">("working");
  const [msg, setMsg] = useState("Confirming your payment…");

  async function confirm() {
    const sessionId = params.get("session_id") ?? "";
    const subscriptionId = params.get("subscription_id") ?? undefined;
    const topupId = params.get("topup_id") ?? undefined;
    if (!sessionId || (!subscriptionId && !topupId)) {
      setState("error");
      setMsg("Missing payment reference.");
      return;
    }
    try {
      const r = await verifyPayment({ stripe_session_id: sessionId, subscription_id: subscriptionId, topup_id: topupId });
      if (r.mode === "topup") setMsg(`Payment confirmed — +${r.credits ?? ""} AI credits added!`);
      else setMsg("Payment confirmed — welcome to your plan!");
      notifyBillingChanged();
      setState("done");
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "PAYMENT_FAILED") {
        // Delayed-notification method (e.g. bank transfer): the webhook fulfills later.
        setState("pending");
        setMsg("Your payment method needs extra time to confirm. We'll activate your plan automatically once Stripe confirms — no action needed.");
      } else {
        setState("error");
        setMsg(billingMessage(e));
      }
    }
  }

  useEffect(() => {
    void confirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-8 text-center">
      {state === "working" && <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />}
      {state === "pending" && <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">◷</div>}
      {state === "done" && <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">✓</div>}
      {state === "error" && <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl">!</div>}
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">{msg}</p>
      {state === "pending" && (
        <button onClick={() => { setState("working"); setMsg("Confirming your payment…"); void confirm(); }}
          className="mt-4 rounded-full border border-neutral-300 px-6 py-2 text-sm font-medium dark:border-white/20 dark:text-white">
          Check again
        </button>
      )}
      {state !== "working" && (
        <Link to="/settings/billing" className="mt-4 rounded-full bg-black px-6 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">
          Go to Billing
        </Link>
      )}
    </div>
  );
}
