/* Platform V5 — SDK contract tests (mocked transport). */
import { describe, it, expect, vi } from "vitest";
import { Noska, NoskaError } from "../../../sdk/typescript/src/index.ts";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function makeClient(responder: (req: Request) => Response | Promise<Response>) {
  const impl = vi.fn(async (input: string | URL | Request, init?: RequestInit) =>
    responder(new Request(input instanceof Request ? input.url : String(input), init)));
  return new Noska({
    apiKey: "nsk_test",
    baseUrl: "https://x.supabase.co/functions/v1/api-v1",
    fetchImpl: impl as unknown as typeof fetch,
    maxRetries: 2,
  }) as Noska & { fetchImpl: typeof fetch };
}

describe("Noska SDK", () => {
  it("sends bearer auth and unwraps the data envelope", async () => {
    let seenAuth = "";
    const client = makeClient((req) => {
      seenAuth = req.headers.get("Authorization") ?? "";
      return jsonResponse(200, { data: { id: "p1", title: "Hello" } });
    });
    const page = await client.pages.create({ title: "Hello" });
    expect(seenAuth).toBe("Bearer nsk_test");
    expect(page.data).toMatchObject({ id: "p1", title: "Hello" });
  });

  it("maps API errors to structured NoskaError", async () => {
    const client = makeClient(() => jsonResponse(403, {
      error: { code: "insufficient_scope", message: "Requires tasks:write.", required_scope: "tasks:write" },
    }));
    await expect(client.tasks.create({ page_id: "p", text: "x" }))
      .rejects.toMatchObject({ status: 403, code: "insufficient_scope" });
    try {
      await client.tasks.create({ page_id: "p", text: "x" });
    } catch (e) {
      expect(e).toBeInstanceOf(NoskaError);
      expect((e as NoskaError).extra).toMatchObject({ required_scope: "tasks:write" });
    }
  });

  it("retries on 429 honoring Retry-After then succeeds", async () => {
    let calls = 0;
    const client = makeClient(() => {
      calls++;
      if (calls === 1) return jsonResponse(429, { error: { code: "rate_limited", message: "slow down" } }, { "Retry-After": "0.01" });
      return jsonResponse(200, { data: [] });
    });
    await client.pages.list();
    expect(calls).toBe(2);
  });

  it("does not retry 4xx scope errors", async () => {
    let calls = 0;
    const client = makeClient(() => { calls++; return jsonResponse(403, { error: { code: "forbidden", message: "nope" } }); });
    await expect(client.workspaces.list()).rejects.toBeInstanceOf(NoskaError);
    expect(calls).toBe(1);
  });

  it("passes idempotency keys through on writes", async () => {
    let idem: string | null = null;
    const client = makeClient((req) => {
      idem = req.headers.get("Idempotency-Key");
      return jsonResponse(201, { data: { id: "w1" } });
    });
    await client.workspaces.create({ name: "Semester 5" }, "idem-123");
    expect(idem).toBe("idem-123");
  });

  it("paginate walks has_more pages to completion", async () => {
    const pagesData = [
      Array.from({ length: 100 }, (_, i) => ({ id: `p${i}` })),
      Array.from({ length: 40 }, (_, i) => ({ id: `q${i}` })),
    ];
    let call = 0;
    const client = makeClient((req) => {
      const offset = Number(new URL(req.url).searchParams.get("offset") ?? "0");
      void offset; call++;
      const batch = pagesData[call - 1] ?? [];
      return jsonResponse(200, {
        data: batch,
        meta: { limit: 100, offset, has_more: call < pagesData.length },
      });
    });
    const ids: string[] = [];
    for await (const page of client.paginate<{ id: string }>("/pages")) ids.push(page.id);
    expect(ids).toHaveLength(140);
    expect(ids[0]).toBe("p0");
    expect(ids[139]).toBe("q39");
  });

  it("agent run helpers hit the documented Phase-7 routes", async () => {
    const urls: string[] = [];
    const methods: string[] = [];
    const client = makeClient((req) => {
      urls.push(new URL(req.url).pathname);
      methods.push(req.method);
      if (urls.length === 1) return jsonResponse(202, { data: { runId: "r1", status: "queued" } });
      if (urls.length === 2) return jsonResponse(200, { data: { run: { id: "r1", status: "completed" }, events: [] } });
      return jsonResponse(200, { data: { cancelled: true } });
    });
    const run = await client.agents.run("a1", { input: { focus: "reviews" } });
    expect(run.data.status).toBe("queued");
    await client.agentRuns.get("r1");
    await client.agentRuns.cancel("r1");

    expect(urls[0]).toContain("/agents/a1/runs");
    expect(methods[0]).toBe("POST");
    expect(urls[1]).toContain("/agent-runs/r1");
    expect(urls[2]).toContain("/agent-runs/r1/cancel");
  });

  it("webhook create returns the one-time signing secret shape", async () => {
    const client = makeClient(() => jsonResponse(201, {
      data: {
        endpoint: { id: "wh1", url: "https://example.com/hook", secret_hint: "whsec_…ab12" },
        signing_secret: "whsec_topsecret",
      },
    }));
    const res = await client.webhooks.create({
      url: "https://example.com/hook",
      events: ["task.completed"],
    });
    // the raw secret is returned exactly once and never in the endpoint row
    expect(res.data.endpoint.secret_hint).toBeTypeOf("string");
    expect(JSON.stringify(res.data.endpoint)).not.toContain("topsecret");
    expect(res.data.signing_secret).toBe("whsec_topsecret");
  });
});
