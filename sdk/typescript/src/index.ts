/* ============================================================================
 * @noska/sdk — official TypeScript SDK for the Noska API (/api/v1).
 *
 *   import { Noska } from "@noska/sdk";
 *
 *   const noska = new Noska({ apiKey: process.env.NOSKA_API_KEY });
 *   await noska.pages.create({ title: "Hello" });
 *   await noska.tasks.create({ page_id, text: "Ship V5" });
 *   await noska.agents.run(agentId, { input: { focus: "reviews" } });
 *
 * Features: typed resources, automatic retries (429/5xx + backoff),
 * idempotency keys on writes, pagination helpers, structured errors.
 * Zero dependencies; runs in Node 18+ and modern browsers.
 * ========================================================================== */

export interface NoskaOptions {
  apiKey: string;
  /** Full API base, e.g. https://<ref>.supabase.co/functions/v1/api-v1 */
  baseUrl: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  timeoutMs?: number;
}

export class NoskaError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {},
    public rateLimit?: { limit: number; remaining: number; reset: number },
  ) {
    super(message);
    this.name = "NoskaError";
  }
}

interface ListMeta {
  limit?: number;
  offset?: number;
  has_more?: boolean;
  total?: number;
}

interface ApiEnvelope<T> {
  data: T;
  meta?: ListMeta & Record<string, unknown>;
  error?: { code: string; message: string } & Record<string, unknown>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Noska {
  private apiKey: string;
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private maxRetries: number;
  private timeoutMs: number;

  pages: PagesApi;
  tasks: TasksApi;
  reviews: ReviewsApi;
  search: SearchApi;
  workspaces: WorkspacesApi;
  templates: TemplatesApi;
  dashboards: DashboardsApi;
  events: EventsApi;
  agents: AgentsApi;
  agentRuns: RunsApi;
  automations: AutomationsApi;
  automationRuns: RunsApi;
  webhooks: WebhooksApi;
  connections: ConnectionsApi;

  constructor(opts: NoskaOptions) {
    if (!opts.apiKey) throw new Error("Noska: apiKey is required");
    if (!opts.baseUrl) throw new Error("Noska: baseUrl is required");
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.maxRetries = opts.maxRetries ?? 3;
    this.timeoutMs = opts.timeoutMs ?? 30_000;

    this.pages = new PagesApi(this);
    this.tasks = new TasksApi(this);
    this.reviews = new ReviewsApi(this);
    this.search = new SearchApi(this);
    this.workspaces = new WorkspacesApi(this);
    this.templates = new TemplatesApi(this);
    this.dashboards = new DashboardsApi(this);
    this.events = new EventsApi(this);
    this.agents = new AgentsApi(this);
    this.agentRuns = new RunsApi(this, "agent-runs");
    this.automations = new AutomationsApi(this);
    this.automationRuns = new RunsApi(this, "automation-runs");
    this.webhooks = new WebhooksApi(this);
    this.connections = new ConnectionsApi(this);
  }

  /* ─── Core request pipeline ─── */

  async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    opts: { query?: Record<string, string | undefined>; body?: unknown; idempotencyKey?: string } = {},
  ): Promise<{ data: T; meta?: ListMeta & Record<string, unknown>; response: Response }> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }

    let attempt = 0;
    for (;;) {
      attempt++;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
      let res: Response;
      try {
        res = await this.fetchImpl(url.toString(), {
          method,
          signal: ctrl.signal,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey } : {}),
          },
          ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
        });
      } catch (err) {
        clearTimeout(timer);
        if (attempt <= this.maxRetries) { await sleep(backoff(attempt)); continue; }
        throw new NoskaError(0, "network_error", err instanceof Error ? err.message : "Network error");
      }
      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        if (attempt <= this.maxRetries) {
          const retryAfter = Number(res.headers.get("Retry-After"));
          await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoff(attempt));
          continue;
        }
      }

      const rl = {
        limit: Number(res.headers.get("X-RateLimit-Limit") ?? 0),
        remaining: Number(res.headers.get("X-RateLimit-Remaining") ?? 0),
        reset: Number(res.headers.get("X-RateLimit-Reset") ?? 0),
      };

      let payload: ApiEnvelope<T>;
      try {
        payload = await res.json();
      } catch {
        payload = {} as ApiEnvelope<T>;
      }

      if (!res.ok) {
        const e = (payload.error ?? {}) as { code?: string; message?: string };
        throw new NoskaError(
          res.status,
          e.code ?? `http_${res.status}`,
          e.message ?? (res.statusText || `Request failed with ${res.status}`),
          e as Record<string, unknown>,
          rl.limit ? rl : undefined,
        );
      }
      return { data: payload.data, meta: payload.meta as ListMeta & Record<string, unknown>, response: res };
    }
  }

  /** Walk a paginated list endpoint to completion (uses limit/offset). */
  async *paginate<T extends { id?: string }>(
    path: string,
    opts: { query?: Record<string, string | undefined>; pageSize?: number } = {},
  ): AsyncGenerator<T, void, unknown> {
    let offset = 0;
    const limit = opts.pageSize ?? 100;
    for (;;) {
      const { data, meta } = await this.request<Array<T>>("GET", path, {
        query: { ...opts.query, limit: String(limit), offset: String(offset) },
      });
      for (const item of data ?? []) yield item;
      if (!meta?.has_more || !data?.length) break;
      offset += data.length;
    }
  }
}

function backoff(attempt: number): number {
  return Math.min(500 * 2 ** (attempt - 1), 8000) + Math.random() * 250;
}

/* ─── Resources ─── */

class PagesApi {
  constructor(private client: Noska) {}
  list(query: { trashed?: boolean; favorite?: boolean; sort?: string } = {}) {
    return this.client.request<unknown[]>("GET", "/pages", {
      query: {
        trashed: query.trashed === undefined ? undefined : String(query.trashed),
        favorite: query.favorite === undefined ? undefined : String(query.favorite),
        sort: query.sort,
      },
    });
  }
  retrieve(id: string) { return this.client.request<Record<string, unknown>>("GET", `/pages/${id}`); }
  create(body: Record<string, unknown>, idempotencyKey?: string) {
    return this.client.request<Record<string, unknown>>("POST", "/pages", { body, idempotencyKey });
  }
  update(id: string, body: Record<string, unknown>) {
    return this.client.request<Record<string, unknown>>("PATCH", `/pages/${id}`, { body });
  }
  trash(id: string) { return this.client.request<Record<string, unknown>>("DELETE", `/pages/${id}`); }
  listBlocks(pageId: string, type?: string) {
    return this.client.request<unknown[]>("GET", "/blocks", { query: { page_id: pageId, type } });
  }
}

class TasksApi {
  constructor(private client: Noska) {}
  list(query: { done?: boolean; page_id?: string } = {}) {
    return this.client.request<unknown[]>("GET", "/tasks", {
      query: {
        done: query.done === undefined ? undefined : String(query.done),
        page_id: query.page_id,
      },
    });
  }
  create(body: { page_id: string; text: string } & Record<string, unknown>, idempotencyKey?: string) {
    return this.client.request<Record<string, unknown>>("POST", "/tasks", { body, idempotencyKey });
  }
  /** Rich metadata: priority, assignee, dueAt, labels, recurrence, parent_task_id (null clears). */
  update(blockId: string, body: Record<string, unknown>) {
    return this.client.request<Record<string, unknown>>("PATCH", `/tasks/${blockId}`, { body });
  }
  complete(blockId: string) { return this.update(blockId, { checked: true }); }
  reopen(blockId: string) { return this.update(blockId, { checked: false }); }
}

class ReviewsApi {
  constructor(private client: Noska) {}
  list(query: { due?: boolean } = {}) {
    return this.client.request<unknown[]>("GET", "/reviews", {
      query: { due: query.due === undefined ? undefined : String(query.due) },
    });
  }
  schedule(pageId: string, blockId: string) {
    return this.client.request<Record<string, unknown>>("POST", "/reviews", {
      body: { page_id: pageId, block_id: blockId },
    });
  }
  rate(pageId: string, blockId: string, quality: 1 | 2 | 3 | 4 | 5) {
    return this.client.request<Record<string, unknown>>("POST", "/reviews/rate", {
      body: { page_id: pageId, block_id: blockId, quality },
    });
  }
  remove(blockId: string, pageId: string) {
    return this.client.request<Record<string, unknown>>("DELETE", `/reviews/${blockId}`, { query: { page_id: pageId } });
  }
}

class SearchApi {
  constructor(private client: Noska) {}
  query(text: string, limit?: number) {
    return this.client.request<Record<string, unknown>>("POST", "/search", { body: { query: text, limit } });
  }
}

class WorkspacesApi {
  constructor(private client: Noska) {}
  list() { return this.client.request<{ owned: unknown[]; shared: unknown[] }>("GET", "/workspaces"); }
  create(body: { name: string } & Record<string, unknown>, idempotencyKey?: string) {
    return this.client.request<Record<string, unknown>>("POST", "/workspaces", { body, idempotencyKey });
  }
  retrieve(id: string) { return this.client.request<Record<string, unknown>>("GET", `/workspaces/${id}`); }
  update(id: string, body: Record<string, unknown>) {
    return this.client.request<Record<string, unknown>>("PATCH", `/workspaces/${id}`, { body });
  }
  archive(id: string) { return this.client.request<Record<string, unknown>>("DELETE", `/workspaces/${id}`); }
  switch(id: string) {
    return this.client.request<Record<string, unknown>>("POST", `/workspaces/${id}/switch`, { body: {} });
  }
}

class TemplatesApi {
  constructor(private client: Noska) {}
  list(archived?: boolean) {
    return this.client.request<{ templates: unknown[] }>("GET", "/templates", { query: { archived: archived === undefined ? undefined : String(archived) } });
  }
  create(body: Record<string, unknown>, idempotencyKey?: string) {
    return this.client.request<Record<string, unknown>>("POST", "/templates", { body, idempotencyKey });
  }
  instantiate(id: string, body: Record<string, unknown> = {}, idempotencyKey?: string) {
    return this.client.request<{
      template: { id: string; name: string };
      instantiated: Array<Record<string, unknown>>;
      failed_steps: Array<Record<string, unknown>>;
      verified: boolean;
    }>("POST", `/templates/${id}/instantiate`, { body, idempotencyKey });
  }
  archive(id: string) { return this.client.request<Record<string, unknown>>("DELETE", `/templates/${id}`); }
}

class DashboardsApi {
  constructor(private client: Noska) {}
  list(archived?: boolean) {
    return this.client.request<{ dashboards: unknown[] }>("GET", "/dashboards", { query: { archived: archived === undefined ? undefined : String(archived) } });
  }
  create(body: { name: string } & Record<string, unknown>, idempotencyKey?: string) {
    return this.client.request<Record<string, unknown>>("POST", "/dashboards", { body, idempotencyKey });
  }
  retrieve(id: string) { return this.client.request<Record<string, unknown>>("GET", `/dashboards/${id}`); }
  update(id: string, body: Record<string, unknown>) {
    return this.client.request<Record<string, unknown>>("PATCH", `/dashboards/${id}`, { body });
  }
  archive(id: string) { return this.client.request<Record<string, unknown>>("DELETE", `/dashboards/${id}`); }
}

class EventsApi {
  constructor(private client: Noska) {}
  list(query: { type?: string; since?: string } = {}) {
    return this.client.request<{ events: Array<{ id: string; type: string; created_at: string }> }>("GET", "/events", { query: query as Record<string, string | undefined> });
  }
}

class AgentsApi {
  constructor(private client: Noska) {}
  list(status?: string) {
    return this.client.request<{ agents: unknown[] }>("GET", "/agents", { query: { status } });
  }
  create(body: { name: string } & Record<string, unknown>, idempotencyKey?: string) {
    return this.client.request<Record<string, unknown>>("POST", "/agents", { body, idempotencyKey });
  }
  retrieve(id: string) { return this.client.request<Record<string, unknown>>("GET", `/agents/${id}`); }
  update(id: string, body: Record<string, unknown>) {
    return this.client.request<Record<string, unknown>>("PATCH", `/agents/${id}`, { body });
  }
  archive(id: string) { return this.client.request<Record<string, unknown>>("DELETE", `/agents/${id}`); }
  /** Trigger a server-side run through the Agent Runtime. */
  run(id: string, body: { input?: Record<string, unknown>; confirmation_mode?: "auto" | "approval"; idempotency_key?: string } = {}) {
    return this.client.request<{ runId?: string; run_id?: string; status?: string }>(
      "POST", `/agents/${id}/runs`, { body, idempotencyKey: body.idempotency_key },
    );
  }
  listRuns(id: string) {
    return this.client.request<{ runs: unknown[] }>("GET", `/agents/${id}/runs`);
  }
}

class AutomationsApi {
  constructor(private client: Noska) {}
  list(status?: string) {
    return this.client.request<{ automations: unknown[] }>("GET", "/automations", { query: { status } });
  }
  create(body: { name: string; trigger_type: string } & Record<string, unknown>, idempotencyKey?: string) {
    return this.client.request<Record<string, unknown>>("POST", "/automations", { body, idempotencyKey });
  }
  retrieve(id: string) { return this.client.request<Record<string, unknown>>("GET", `/automations/${id}`); }
  update(id: string, body: Record<string, unknown>) {
    return this.client.request<Record<string, unknown>>("PATCH", `/automations/${id}`, { body });
  }
  archive(id: string) { return this.client.request<Record<string, unknown>>("DELETE", `/automations/${id}`); }
  run(id: string, body: { input?: Record<string, unknown>; idempotency_key?: string } = {}) {
    return this.client.request<{ runId?: string; run_id?: string; status?: string }>(
      "POST", `/automations/${id}/runs`, { body, idempotencyKey: body.idempotency_key },
    );
  }
  listRuns(id: string) {
    return this.client.request<{ runs: unknown[] }>("GET", `/automations/${id}/runs`);
  }
}

/** Shared shape of /agent-runs and /automation-runs. */
class RunsApi {
  constructor(private client: Noska, private prefix: string) {}
  get(id: string) {
    return this.client.request<{ run: Record<string, unknown>; events: unknown[] }>("GET", `/${this.prefix}/${id}`);
  }
  cancel(id: string) {
    return this.client.request<Record<string, unknown>>("POST", `/${this.prefix}/${id}/cancel`, { body: {} });
  }
  retry(id: string) {
    return this.client.request<Record<string, unknown>>("POST", `/${this.prefix}/${id}/retry`, { body: {} });
  }
}

class WebhooksApi {
  constructor(private client: Noska) {}
  list() { return this.client.request<{ endpoints: unknown[] }>("GET", "/webhooks"); }
  create(body: { url: string; events: string[] } & Record<string, unknown>, idempotencyKey?: string) {
    return this.client.request<{ endpoint: Record<string, unknown>; signing_secret: string }>("POST", "/webhooks", { body, idempotencyKey });
  }
  update(id: string, body: Record<string, unknown>) {
    return this.client.request<Record<string, unknown>>("PATCH", `/webhooks/${id}`, { body });
  }
  delete(id: string) { return this.client.request<Record<string, unknown>>("DELETE", `/webhooks/${id}`); }
  test(id: string) {
    return this.client.request<{ delivered: boolean; event_id: string }>("POST", `/webhooks/${id}/test`, { body: {} });
  }
  rotateSecret(id: string) {
    return this.client.request<{ rotated: boolean; signing_secret: string }>("POST", `/webhooks/${id}/rotate`, { body: {} });
  }
  deliveries(id: string) {
    return this.client.request<{ deliveries: unknown[] }>("GET", `/webhooks/${id}/deliveries`);
  }
}

class ConnectionsApi {
  constructor(private client: Noska) {}
  list() { return this.client.request<{ connections: unknown[] }>("GET", "/connections"); }
  revoke(id: string) { return this.client.request<Record<string, unknown>>("DELETE", `/connections/${id}`); }
}
