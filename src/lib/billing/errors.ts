// Human-readable billing errors. Raw provider errors are never shown to users.
import type { BillingErrorShape } from "./types";

const MESSAGES: Record<string, string> = {
  FEATURE_NOT_AVAILABLE: "This feature isn't included in your current plan.",
  LIMIT_EXCEEDED: "You've reached the limit for this feature on your current plan.",
  SUBSCRIPTION_NOT_FOUND: "We couldn't find your subscription.",
  PLAN_NOT_FOUND: "This plan is not available.",
  PLAN_UNAVAILABLE: "This plan is not available right now.",
  PAYMENT_FAILED: "Your payment didn't go through. Check your payment method and try again.",
  PAYMENT_VERIFICATION_FAILED: "We couldn't verify your payment. If money was debited, it will reflect shortly or be refunded.",
  COUPON_INVALID: "This coupon code isn't valid.",
  COUPON_EXPIRED: "This coupon has expired.",
  COUPON_NOT_APPLICABLE: "This coupon doesn't apply to the selected plan.",
  COUPON_MAX_REDEMPTIONS: "This coupon has reached its redemption limit.",
  COUPON_ALREADY_REDEEMED: "You've already used this coupon.",
  SUBSCRIPTION_ALREADY_CANCELLED: "Your subscription is already cancelled.",
  SUBSCRIPTION_ALREADY_ACTIVE: "You already have an active subscription to this plan.",
  INVALID_SUBSCRIPTION_TRANSITION: "This change isn't available for your subscription right now.",
  NOT_AUTHENTICATED: "Please sign in to manage billing.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  CHECKOUT_FAILED: "We couldn't start checkout. Please try again.",
  PAYMENT_PROVIDER_NOT_CONFIGURED: "Online payments aren't available yet. Please contact support.",
  ENTITLEMENT_REFRESH_REQUIRED: "Your plan just changed. Refreshing your access…",
};

export function billingMessage(err: BillingErrorShape | { code?: string; message?: string } | unknown): string {
  if (err && typeof err === "object") {
    const e = err as BillingErrorShape & { message?: string; name?: string };
    // Native network failures (offline, CORS, DNS, blocked requests) — never surface raw.
    if (e.name === "TypeError" || /^failed to fetch$/i.test(e.message ?? "")) {
      return "Couldn't reach the server. Check your connection and try again.";
    }
    if (e.code && MESSAGES[e.code]) {
      if (e.code === "LIMIT_EXCEEDED" && typeof e.current === "number" && typeof e.limit === "number") {
        return `You've used ${e.current} of ${e.limit} allowed. Upgrade your plan or wait for the next cycle.`;
      }
      return MESSAGES[e.code];
    }
    if (e.code === "NOT_FOUND") {
      return "Billing is temporarily unavailable. Please try again later.";
    }
    if (typeof e.message === "string" && e.message && !/razorpay|hmac|signature|service_role|supabase|postgres|sql/i.test(e.message)) {
      return e.message;
    }
  }
  return "Something went wrong. Please try again.";
}
