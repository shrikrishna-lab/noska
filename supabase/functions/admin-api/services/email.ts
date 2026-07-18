export async function resendEmail(action: string, _payload: Record<string, unknown>): Promise<unknown> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("Resend not configured");

  const headers = { Authorization: `Bearer ${key}` };

  switch (action) {
    case "analytics":
      return fetch("https://api.resend.com/emails?limit=100", { headers }).then(async (r) => {
        if (!r.ok) throw new Error(`Resend API ${r.status}`);
        const data = await r.json();
        const emails = data?.data ?? [];
        const total = emails.length;
        const delivered = emails.filter((e: { last_event?: string }) => e.last_event === "delivered").length;
        const bounced = emails.filter((e: { last_event?: string }) => e.last_event === "bounced").length;
        const complaints = emails.filter((e: { last_event?: string }) => e.last_event === "complained").length;
        return { total, delivered, bounced, complaints };
      });

    default:
      throw new Error(`Unknown email action: ${action}`);
  }
}
