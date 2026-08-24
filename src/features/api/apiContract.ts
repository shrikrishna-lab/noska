/* ─── Noska API v1 contract ───
 *
 * Single source of truth for everything developer-facing: the console
 * playground, the docs tab, code-snippet generation and the OpenAPI
 * document all render from these definitions, so they cannot drift from
 * what supabase/functions/api-v1 actually implements.
 */

export const API_VERSION = "2026-08-23";

/** Edge Function base path (relative to the project's Supabase URL). */
export function apiBase(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/api-v1`;
}

export const SCOPES: Array<{ id: string; description: string }> = [
  { id: "pages:read", description: "List and read pages and their blocks" },
  { id: "pages:write", description: "Create, update and trash pages" },
  { id: "databases:read", description: "List databases and read their schema + rows" },
  { id: "databases:write", description: "Reserved — database writes are not exposed yet" },
  { id: "tasks:read", description: "List todo items across pages" },
  { id: "tasks:write", description: "Create and update tasks" },
  { id: "reviews:read", description: "List spaced-repetition review cards" },
  { id: "reviews:write", description: "Add cards to review, rate answers, remove cards" },
  { id: "search:read", description: "Keyword search across pages and blocks" },
];

export interface EndpointParam {
  name: string;
  in: "path" | "query" | "body";
  required?: boolean;
  type: "string" | "integer" | "boolean" | "array" | "object";
  description: string;
}

export interface EndpointDoc {
  id: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string; // e.g. "/pages/:id"
  summary: string;
  description: string;
  scope: string;
  params?: EndpointParam[];
  /** Sample JSON request body rendered in the playground. */
  sampleBody?: string;
}

export const ENDPOINTS: EndpointDoc[] = [
  {
    id: "list_pages",
    method: "GET",
    path: "/pages",
    summary: "List pages",
    description: "Returns pages in your workspace, newest activity first.",
    scope: "pages:read",
    params: [
      { name: "limit", in: "query", type: "integer", description: "Page size, 1–100 (default 25)." },
      { name: "offset", in: "query", type: "integer", description: "Offset for pagination (default 0)." },
      { name: "trashed", in: "query", type: "boolean", description: "Filter by trash state." },
      { name: "favorite", in: "query", type: "boolean", description: "Only favorites when true." },
      { name: "sort", in: "query", type: "string", description: "updated_at | created_at | title, prefix with - for descending (default -updated_at)." },
    ],
  },
  {
    id: "create_page",
    method: "POST",
    path: "/pages",
    summary: "Create a page",
    description: "Creates a page owned by the key's user. Parent must belong to the same owner.",
    scope: "pages:write",
    params: [
      { name: "title", in: "body", type: "string", description: "Page title." },
      { name: "icon", in: "body", type: "string", description: "Emoji or lucide icon identifier." },
      { name: "parent_id", in: "body", type: "string", description: "Parent page UUID (must be yours)." },
      { name: "tags", in: "body", type: "array", description: "Array of tags." },
      { name: "blocks", in: "body", type: "array", description: "Initial block array." },
    ],
    sampleBody: JSON.stringify({ title: "Created via API", icon: "🤖" }, null, 2),
  },
  {
    id: "get_page",
    method: "GET",
    path: "/pages/:id",
    summary: "Retrieve a page",
    description: "Returns a full page including its blocks.",
    scope: "pages:read",
    params: [{ name: "id", in: "path", required: true, type: "string", description: "Page UUID." }],
  },
  {
    id: "update_page",
    method: "PATCH",
    path: "/pages/:id",
    summary: "Update a page",
    description: "Updates title, icon, cover, tags, favorite, trashed, parent or blocks. Only provided fields change.",
    scope: "pages:write",
    params: [
      { name: "id", in: "path", required: true, type: "string", description: "Page UUID." },
      { name: "title", in: "body", type: "string", description: "New title." },
      { name: "blocks", in: "body", type: "array", description: "Replacement blocks array." },
    ],
    sampleBody: JSON.stringify({ title: "Renamed via API" }, null, 2),
  },
  {
    id: "delete_page",
    method: "DELETE",
    path: "/pages/:id",
    summary: "Trash a page",
    description: "Soft-deletes a page (moves it to trash; restorable in-app).",
    scope: "pages:write",
    params: [{ name: "id", in: "path", required: true, type: "string", description: "Page UUID." }],
  },
  {
    id: "list_blocks",
    method: "GET",
    path: "/blocks",
    summary: "List blocks of a page",
    description: "Returns the block array of one page, optionally filtered by type (e.g. todo, database, heading).",
    scope: "pages:read",
    params: [
      { name: "page_id", in: "query", required: true, type: "string", description: "Page UUID." },
      { name: "type", in: "query", type: "string", description: "Filter by block type." },
    ],
  },
  {
    id: "list_databases",
    method: "GET",
    path: "/databases",
    summary: "List databases",
    description: "Lists every database block embedded across your pages, with row/property counts.",
    scope: "databases:read",
    params: [
      { name: "limit", in: "query", type: "integer", description: "Page size (default 25)." },
      { name: "offset", in: "query", type: "integer", description: "Offset for pagination." },
    ],
  },
  {
    id: "get_database",
    method: "GET",
    path: "/databases/:id",
    summary: "Retrieve a database",
    description: "Returns a database's properties, views and rows.",
    scope: "databases:read",
    params: [{ name: "id", in: "path", required: true, type: "string", description: "Database block UUID." }],
  },
  {
    id: "list_tasks",
    method: "GET",
    path: "/tasks",
    summary: "List tasks",
    description: "Lists todo blocks across all non-trashed pages.",
    scope: "tasks:read",
    params: [
      { name: "done", in: "query", type: "boolean", description: "Filter by completion state." },
      { name: "page_id", in: "query", type: "string", description: "Restrict to one page." },
      { name: "limit", in: "query", type: "integer", description: "Page size (default 25)." },
      { name: "offset", in: "query", type: "integer", description: "Offset for pagination." },
    ],
  },
  {
    id: "create_task",
    method: "POST",
    path: "/tasks",
    summary: "Create a task",
    description: "Appends an uncompleted todo block to a page you own.",
    scope: "tasks:write",
    params: [
      { name: "page_id", in: "body", required: true, type: "string", description: "Target page UUID." },
      { name: "text", in: "body", required: true, type: "string", description: "Task label." },
    ],
    sampleBody: JSON.stringify({ page_id: "<your-page-id>", text: "Review PR #142" }, null, 2),
  },
  {
    id: "update_task",
    method: "PATCH",
    path: "/tasks/:block_id",
    summary: "Update a task",
    description: "Updates a task's text or checked state. Pass its page as ?page_id=.",
    scope: "tasks:write",
    params: [
      { name: "block_id", in: "path", required: true, type: "string", description: "Task block UUID." },
      { name: "page_id", in: "query", required: true, type: "string", description: "Owning page UUID." },
      { name: "text", in: "body", type: "string", description: "New label." },
      { name: "checked", in: "body", type: "boolean", description: "Completion state." },
    ],
    sampleBody: JSON.stringify({ checked: true }, null, 2),
  },
  {
    id: "list_reviews",
    method: "GET",
    path: "/reviews",
    summary: "List review cards",
    description: "Lists spaced-repetition cards. Combine ?due=true with limit for a study queue.",
    scope: "reviews:read",
    params: [
      { name: "due", in: "query", type: "boolean", description: "Only cards whose next review has arrived." },
      { name: "limit", in: "query", type: "integer", description: "Page size (default 25)." },
      { name: "offset", in: "query", type: "integer", description: "Offset for pagination." },
    ],
  },
  {
    id: "create_review",
    method: "POST",
    path: "/reviews",
    summary: "Add a card to review",
    description: "Schedules an existing block as a spaced-repetition card (due immediately). Scheduling follows SM-2, identical to the in-app review engine.",
    scope: "reviews:write",
    params: [
      { name: "page_id", in: "body", required: true, type: "string", description: "Owning page UUID." },
      { name: "block_id", in: "body", required: true, type: "string", description: "Block to memorize." },
    ],
    sampleBody: JSON.stringify({ page_id: "<your-page-id>", block_id: "<block-id>" }, null, 2),
  },
  {
    id: "rate_review",
    method: "POST",
    path: "/reviews/rate",
    summary: "Rate a review card",
    description: "Records an answer quality (SM-2): 1 Again · 3 Hard · 4 Good · 5 Easy. Returns the next scheduled state.",
    scope: "reviews:write",
    params: [
      { name: "page_id", in: "body", required: true, type: "string", description: "Owning page UUID." },
      { name: "block_id", in: "body", required: true, type: "string", description: "Card block UUID." },
      { name: "quality", in: "body", required: true, type: "integer", description: "1–5 (Again/Hard/Good/Easy)." },
    ],
    sampleBody: JSON.stringify({ page_id: "<your-page-id>", block_id: "<block-id>", quality: 4 }, null, 2),
  },
  {
    id: "delete_review",
    method: "DELETE",
    path: "/reviews/:block_id",
    summary: "Remove a card from review",
    description: "Strips review scheduling metadata from a block. Pass its page as ?page_id=.",
    scope: "reviews:write",
    params: [
      { name: "block_id", in: "path", required: true, type: "string", description: "Card block UUID." },
      { name: "page_id", in: "query", required: true, type: "string", description: "Owning page UUID." },
    ],
  },
  {
    id: "search",
    method: "POST",
    path: "/search",
    summary: "Search the workspace",
    description: "Keyword search across titles and block text of your 500 most recently updated pages. Results are grouped into pages, blocks, tasks and review cards.",
    scope: "search:read",
    params: [
      { name: "query", in: "body", required: true, type: "string", description: "Search text." },
      { name: "limit", in: "body", type: "integer", description: "Per-group result cap, 1–50 (default 25)." },
    ],
    sampleBody: JSON.stringify({ query: "distributed systems", limit: 10 }, null, 2),
  },
];

/* ─── Snippet builders (used by the playground's Copy-as buttons) ─── */

function resolvePath(pathTemplate: string, params: Record<string, string>): string {
  return pathTemplate.replace(/:(\w+)/g, (_, name) => params[name] || `{${name}}`);
}

export function endpointQuery(endpoint: EndpointDoc, params: Record<string, string>): string {
  const query = (endpoint.params ?? [])
    .filter((p) => p.in === "query")
    .map((p) => [p.name, params[p.name] ?? ""])
    .filter(([, v]) => v !== "");
  return query.length ? "?" + query.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&") : "";
}

export function buildCurl(base: string, endpoint: EndpointDoc, params: Record<string, string>, key: string, body?: string): string {
  const url = `${base}${resolvePath(endpoint.path, params)}${endpointQuery(endpoint, params)}`;
  const lines = [`curl -X ${endpoint.method} "${url}"`, `  -H "Authorization: Bearer ${key}"`];
  if (body) lines.push(`  -H "Content-Type: application/json"`, `  -d '${body.replace(/\n\s*/g, " ")}'`);
  return lines.join(" \\\n");
}

export function buildJavaScript(base: string, endpoint: EndpointDoc, params: Record<string, string>, key: string, body?: string): string {
  const url = `${base}${resolvePath(endpoint.path, params)}${endpointQuery(endpoint, params)}`;
  const hasBody = !!body;
  return `const res = await fetch("${url}", {
  method: "${endpoint.method}",
  headers: {
    Authorization: "Bearer ${key}"${hasBody ? ',\n    "Content-Type": "application/json"' : ""},
  },${hasBody ? `\n  body: JSON.stringify(${indentJSON(body, 2)}),` : ""}
});
const data = await res.json();
console.log(res.status, data);`;
}

export function buildPython(base: string, endpoint: EndpointDoc, params: Record<string, string>, key: string, body?: string): string {
  const url = `${base}${resolvePath(endpoint.path, params)}${endpointQuery(endpoint, params)}`;
  return `import requests

res = requests.${endpoint.method.toLowerCase()}(
    "${url}",
    headers={"Authorization": "Bearer ${key}"},${body ? `\n    json=${indentJSON(body, 4)},` : ""}
)
print(res.status_code, res.json())`;
}

export function buildTypeScript(base: string, endpoint: EndpointDoc, params: Record<string, string>, key: string, body?: string): string {
  const url = `${base}${resolvePath(endpoint.path, params)}${endpointQuery(endpoint, params)}`;
  const hasBody = !!body;
  return `interface ApiResponse<T> { data: T; meta?: Record<string, unknown>; error?: { code: string; message: string } }

const res = await fetch("${url}", {
  method: "${endpoint.method}",
  headers: {
    Authorization: \`Bearer \${process.env.NOSKA_API_KEY}\`${hasBody ? ',\n    "Content-Type": "application/json"' : ""},
  },${hasBody ? `\n  body: JSON.stringify(${indentJSON(body, 2)} as RequestInit["body"]),` : ""}
});
const payload = (await res.json()) as ApiResponse<unknown>;
if (!res.ok) throw new Error(payload.error?.message ?? res.statusText);`;
}

function indentJSON(json: string, spaces: number): string {
  try {
    return JSON.stringify(JSON.parse(json), null, spaces);
  } catch {
    return json;
  }
}

/* ─── OpenAPI 3.1 document generated from the same contract ─── */

export function buildOpenApiSpec(base: string): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const ep of ENDPOINTS) {
    const pathKey = ep.path.replace(/:(\w+)/g, "{$1}");
    paths[pathKey] ??= {};
    const parameters = (ep.params ?? [])
      .filter((p) => p.in === "path" || p.in === "query")
      .map((p) => ({
        name: p.name,
        in: p.in,
        required: p.required ?? p.in === "path",
        description: p.description,
        schema: { type: p.type === "array" ? "array" : p.type },
      }));
    const bodyParams = (ep.params ?? []).filter((p) => p.in === "body");
    const doc: Record<string, unknown> = {
      operationId: ep.id,
      summary: ep.summary,
      description: ep.description,
      tags: [ep.path.split("/")[1] ?? "misc"],
      security: [{ BearerAuth: [] }],
      "x-required-scope": ep.scope,
      responses: {
        "200": { description: ep.method === "POST" ? "Created / OK" : "OK", content: { "application/json": {} } },
        "401": { description: "Missing, invalid, revoked or expired key", content: { "application/json": {} } },
        "403": { description: "Key lacks the required scope", content: { "application/json": {} } },
        "429": { description: "Rate limit exceeded (60 req/min/key)", content: { "application/json": {} } },
      },
    };
    if (parameters.length) doc.parameters = parameters;
    if (bodyParams.length || ep.sampleBody) {
      const props: Record<string, unknown> = {};
      for (const p of bodyParams) {
        props[p.name] = { type: p.type === "array" ? "array" : p.type, description: p.description };
      }
      doc.requestBody = {
        content: { "application/json": { schema: { type: "object", properties: props }, example: ep.sampleBody ? safeParse(ep.sampleBody) : undefined } },
      };
    }
    paths[pathKey][ep.method.toLowerCase()] = doc;
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Noska API",
      version: API_VERSION,
      description:
        "The Noska public API gives programmatic access to your workspace: pages, blocks, databases, tasks, spaced-repetition review cards and search.\n\nAll endpoints authenticate with a Noska API key (`nsk_…`) created in Settings → Developer → API Keys. Keys carry fine-grained scopes, expire on schedule, and are rate limited to 60 requests per minute.",
    },
    servers: [{ url: base }],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", description: "Noska API key: Authorization: Bearer nsk_…" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string", description: "unauthorized | invalid_key | key_revoked | key_expired | insufficient_scope | not_found | invalid_request | rate_limited | internal_error" },
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    paths,
  };
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}
