// CreditBalance (§10): Plan credits / Promotional / Used / Remaining — all dynamic.
import React from "react";
import { useEntitlements } from "@/hooks/billing/useEntitlements";

function num(v: number | null | undefined): string {
  if (v === null || v === undefined) return "Unlimited";
  return Math.round(v).toLocaleString("en-IN");
}

export function CreditBalance() {
  const { data } = useEntitlements();
  const c = data?.credits;
  if (!c) return null;
  const rows: Array<[string, string]> = [
    ["Plan credits", num(c.plan_credits)],
    ["Promotional", c.bonus_credits > 0 ? `+${num(c.bonus_credits)}` : "—"],
    ["Used", num(c.used_credits)],
    ["Remaining", num(c.remaining_credits)],
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-neutral-50 p-3 text-center dark:bg-white/5">
            <div className="text-lg font-bold dark:text-white">{value}</div>
            <div className="text-[11px] text-neutral-500">{label}</div>
          </div>
        ))}
      </div>
      {c.topups.length > 0 && (
        <p className="mt-2 text-[11px] text-neutral-500">
          Includes {c.topups.length} credit pack{c.topups.length > 1 ? "s" : ""}
          {c.topups[0]?.expires_at ? ` — earliest expiry ${new Date(c.topups[0].expires_at).toLocaleDateString("en-IN")}` : ""}.
        </p>
      )}
    </div>
  );
}
