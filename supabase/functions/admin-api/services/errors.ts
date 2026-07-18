export async function sentryErrors(action: string, payload: Record<string, unknown>): Promise<unknown> {
  const token = Deno.env.get("SENTRY_AUTH_TOKEN");
  const org = Deno.env.get("SENTRY_ORG");
  const proj = Deno.env.get("SENTRY_PROJECT");
  if (!token || !org || !proj) throw new Error("Sentry not configured");

  const headers = { Authorization: `Bearer ${token}` };
  const base = `https://sentry.io/api/0/projects/${org}/${proj}`;

  switch (action) {
    case "issue-counts":
      return fetch(`${base}/issues/?statsPeriod=24h&limit=1`, { headers }).then(async (r) => {
        if (!r.ok) throw new Error(`Sentry API ${r.status}`);
        return { total: parseInt(r.headers.get("x-hits") ?? "0", 10) };
      });

    case "events":
      return fetch(`${base}/events/?limit=${String(payload.limit ?? "50")}`, { headers }).then((r) => r.json());

    default:
      throw new Error(`Unknown errors action: ${action}`);
  }
}
