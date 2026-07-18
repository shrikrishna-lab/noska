export async function clerkUsers(action: string, payload: Record<string, unknown>): Promise<unknown> {
  const key = Deno.env.get("CLERK_SECRET_KEY");
  if (!key) throw new Error("Clerk not configured");

  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const base = "https://api.clerk.com/v1";

  switch (action) {
    case "count":
      return fetch(`${base}/users?limit=1`, { headers }).then(async (r) => {
        if (!r.ok) throw new Error(`Clerk API ${r.status}`);
        const total = parseInt(r.headers.get("x-request-count") ?? "0", 10);
        return { total };
      });

    case "list":
      return fetch(`${base}/users?limit=${String(payload.limit ?? 50)}&offset=${String(payload.offset ?? 0)}`, { headers }).then((r) => r.json());

    case "user":
      return fetch(`${base}/users/${String(payload.userId ?? "")}`, { headers }).then((r) => r.json());

    case "sessions":
      return fetch(`${base}/users/${String(payload.userId ?? "")}/sessions`, { headers }).then((r) => r.json());

    case "organizations":
      return fetch(`${base}/users/${String(payload.userId ?? "")}/organizations`, { headers }).then((r) => r.json());

    default:
      throw new Error(`Unknown users action: ${action}`);
  }
}
