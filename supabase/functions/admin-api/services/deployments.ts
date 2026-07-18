export async function vercelDeployments(action: string, payload: Record<string, unknown>): Promise<unknown> {
  const token = Deno.env.get("VERCEL_TOKEN");
  const projectId = Deno.env.get("VERCEL_PROJECT_ID");
  if (!token || !projectId) throw new Error("Vercel not configured");

  const headers = { Authorization: `Bearer ${token}` };

  switch (action) {
    case "list":
      return fetch(`https://api.vercel.com/v1/deployments?projectId=${projectId}&limit=${String(payload.limit ?? "25")}`, { headers }).then((r) => {
        if (!r.ok) throw new Error(`Vercel API ${r.status}`);
        return r.json();
      });

    default:
      throw new Error(`Unknown deployments action: ${action}`);
  }
}
