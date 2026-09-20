// Noska Billing — shared types. Business rules live server-side; these are presentation shapes.
export interface BillingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  currency: string;
  monthly_price: number;
  yearly_price: number;
  trial_days: number;
  badge: string | null;
  cta_text: string | null;
  is_highlighted: boolean;
  display_order: number;
  metadata?: { per_seat?: boolean; custom_pricing?: boolean; tagline?: string } | null;
}

export interface TopupProduct {
  id: string;
  name: string;
  slug: string;
  credits: number;
  price: number;
  currency: string;
  expiry_days: number;
  metadata?: { tagline?: string } | null;
}

export interface EntitlementSnapshot {
  plan: { id: string; name: string; slug: string };
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
  usage: Record<string, number>;
  remaining: Record<string, number>;
  credits?: {
    plan_credits: number | null;
    bonus_credits: number;
    used_credits: number;
    remaining_credits: number | null;
    topups: Array<{ remaining: number; expires_at: string | null }>;
  };
  subscription: {
    id?: string;
    status: string;
    billing_cycle?: string;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean;
    trial_end?: string | null;
    grace_period_until?: string | null;
  };
  customer?: {
    billing_country: string | null;
    display_currency: string;
  };
}

export interface BillingSummary extends EntitlementSnapshot {
  invoices: InvoiceRow[];
  payments: PaymentRow[];
}

export interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  status: string;
  total: number;
  currency: string;
  issued_at: string | null;
  paid_at: string | null;
  invoice_url: string | null;
}

export interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  failure_message: string | null;
  paid_at: string | null;
  created_at: string;
}

export type BillingErrorCode =
  | "FEATURE_NOT_AVAILABLE"
  | "LIMIT_EXCEEDED"
  | "SUBSCRIPTION_NOT_FOUND"
  | "PLAN_NOT_FOUND"
  | "PLAN_UNAVAILABLE"
  | "PAYMENT_FAILED"
  | "PAYMENT_VERIFICATION_FAILED"
  | "WEBHOOK_SIGNATURE_INVALID"
  | "COUPON_INVALID"
  | "COUPON_EXPIRED"
  | "COUPON_NOT_APPLICABLE"
  | "COUPON_MAX_REDEMPTIONS"
  | "COUPON_ALREADY_REDEEMED"
  | "SUBSCRIPTION_ALREADY_CANCELLED"
  | "SUBSCRIPTION_ALREADY_ACTIVE"
  | "INVALID_SUBSCRIPTION_TRANSITION"
  | "NOT_AUTHENTICATED"
  | "RATE_LIMITED"
  | "CHECKOUT_FAILED"
  | "PAYMENT_PROVIDER_NOT_CONFIGURED";

export interface BillingErrorShape {
  code: BillingErrorCode | string;
  message?: string;
  feature?: string;
  current?: number;
  limit?: number;
  upgrade_required?: boolean;
}
