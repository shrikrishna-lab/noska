// Razorpay Checkout loader + opener. Key ID comes from billing-checkout (server), never env.
let checkoutPromise: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (typeof window !== "undefined" && (window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve(true);
  if (checkoutPromise) return checkoutPromise;
  checkoutPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return checkoutPromise;
}

export interface OpenCheckoutInput {
  key_id: string;
  order_id: string;
  amount_minor: number;
  currency: string;
  planName: string;
  email?: string;
  onSuccess: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  onDismiss: () => void;
}

export async function openRazorpayCheckout(input: OpenCheckoutInput): Promise<boolean> {
  const ok = await loadRazorpay();
  if (!ok) return false;
  const Razorpay = (window as unknown as { Razorpay: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void } }).Razorpay;
  const rzp = new Razorpay({
    key: input.key_id,
    order_id: input.order_id,
    amount: input.amount_minor,
    currency: input.currency,
    name: "Noska",
    description: `${input.planName} subscription`,
    prefill: input.email ? { email: input.email } : undefined,
    theme: { color: "#1a1a1a" },
    handler: (resp: unknown) => input.onSuccess(resp as { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }),
  });
  rzp.on("payment.failed", () => input.onDismiss());
  rzp.open();
  return true;
}
