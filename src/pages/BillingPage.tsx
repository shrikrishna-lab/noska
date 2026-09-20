// /settings/billing — standalone billing page (§22). Works signed-in on
// web/desktop/mobile shells; prompts sign-in otherwise.
import React from "react";
import { BillingSettings } from "@/components/billing/BillingSettings";
import { useAuth } from "@clerk/react";

export default function BillingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    );
  }
  if (!isSignedIn) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-8 text-center">
        <h1 className="text-xl font-bold">Billing</h1>
        <p className="mt-2 text-sm text-neutral-500">Please sign in to manage your subscription.</p>
        <a href="/login" className="mt-4 rounded-full bg-black px-6 py-2 text-sm font-medium text-white">Sign in</a>
      </div>
    );
  }
  return (
    <div className="mx-auto min-h-screen max-w-4xl p-4 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Billing</h1>
      <p className="mb-6 text-sm text-neutral-500">Plan, usage, credits, invoices and payment history.</p>
      <BillingSettings />
    </div>
  );
}
