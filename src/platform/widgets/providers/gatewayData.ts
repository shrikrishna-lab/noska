/**
 * Connected-widget data layer — real connector-gateway reads for dashboard
 * widgets (GitHub PRs/Issues, Google Calendar/Drive, Integrations Hub).
 *
 * All network I/O goes through the connector-gateway Edge Function so
 * provider tokens never reach the renderer. Results are cached through
 * ProviderSyncManager (single-flight + SWR) so multiple widgets sharing a
 * provider make one upstream call.
 */
import { connectorGateway, type ConnectorConnection, type GatewayTool } from "../../../lib/connectorGateway";
import { ProviderSyncManager } from "./syncManager";
import type { ListItemData } from "../primitives/ListPrimitive";

export type WidgetDataState<T> =
  | { status: "loading" }
  | { status: "ready"; items: T }
  | { status: "denied" }
  | { status: "error"; message: string };

/** Gateway slugs that satisfy a widget's requiredIntegration label. */
const INTEGRATION_SLUGS: Record<string, string[]> = {
  github: ["github"],
  google: ["gmail", "google-calendar", "google-drive", "google-sheets"],
  figma: ["figma"],
};

export function slugsForIntegration(label: string): string[] {
  return INTEGRATION_SLUGS[label] ?? [label];
}

/** True when the signed-in user has ≥1 live connection matching the label. */
export async function hasIntegrationConnection(label: string): Promise<boolean> {
  const wanted = new Set(slugsForIntegration(label));
  try {
    const connections = await ProviderSyncManager.fetch(
      "gateway",
      "connections",
      () => connectorGateway.listConnections(),
      60_000,
    );
    return connections.some(
      (c) => c.status === "connected" && wanted.has(String(c.connectors?.slug ?? "").toLowerCase()),
    );
  } catch {
    return false;
  }
}

/** Merged tools/list across live connections (60s SWR). */
export async function listGatewayTools(force = false): Promise<GatewayTool[]> {
  const res = await ProviderSyncManager.fetch(
    "gateway",
    "tools",
    () => connectorGateway.listTools({ force }),
    60_000,
    { force },
  );
  return res.tools ?? [];
}

/**
 * Find the first MCP tool on a connector whose name matches any pattern
 * (case-insensitive). Prefers exact-friendly ordered patterns.
 */
export function findToolName(tools: GatewayTool[], connectorSlugs: string[], patterns: RegExp[]): string | null {
  const slugs = new Set(connectorSlugs.map((s) => s.toLowerCase()));
  const owned = tools.filter((t) => slugs.has(String(t.connector_slug ?? "").toLowerCase()));
  for (const re of patterns) {
    const hit = owned.find((t) => re.test(String(t.name ?? "")));
    if (hit) return String(hit.name);
  }
  return null;
}

/** Parse an MCP tools/call result into a plain JS value. */
export function parseToolResult(result: {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}): unknown {
  if (result.structuredContent !== undefined && result.structuredContent !== null) {
    return result.structuredContent;
  }
  const text = (result.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("\n")
    .trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Best-effort extraction of an array of records from heterogeneous MCP
 * payloads: bare arrays, {items|data|results|…: []}, or nested wrappers.
 */
export function extractRecords(payload: unknown, preferredKeys: string[] = []): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload.filter((x) => x && typeof x === "object") as Array<Record<string, unknown>>;
  }
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const keys = [
    ...preferredKeys,
    "items", "data", "results", "entries", "rows",
    "pull_requests", "pullRequests", "issues", "events", "files",
    "repositories", "repos", "documents", "messages",
  ];
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) {
      return val.filter((x) => x && typeof x === "object") as Array<Record<string, unknown>>;
    }
  }
  // One level deeper (e.g. { value: { pull_requests: [...] } })
  for (const val of Object.values(obj)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const nested = extractRecords(val, preferredKeys);
      if (nested.length) return nested;
    }
  }
  return [];
}

function str(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function repoFullName(r: Record<string, unknown>): string {
  const full = pick(r, ["full_name", "fullName", "repo", "repository", "name_with_owner"]);
  if (typeof full === "string" && full.includes("/")) return full;
  const owner = pick(r, ["owner", "org", "organization"]);
  const name = pick(r, ["name", "repo_name", "project"]);
  const ownerStr =
    owner && typeof owner === "object"
      ? str((owner as Record<string, unknown>).login ?? (owner as Record<string, unknown>).name)
      : str(owner);
  if (ownerStr && name) return `${ownerStr}/${name}`;
  return str(name);
}

function htmlUrl(r: Record<string, unknown>, fallback = ""): string {
  const u = pick(r, ["html_url", "url", "web_url", "permalink", "browser_url", "link"]);
  return typeof u === "string" && u.startsWith("http") ? u : fallback;
}

function relativeTime(iso: unknown): string {
  const t = typeof iso === "string" ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}

/* ─── Row → ListItemData mappers ─────────────────────────────────────── */

export function mapPullRequest(row: Record<string, unknown>): ListItemData {
  const title = str(pick(row, ["title", "name", "subject"]), "Untitled pull request");
  const number = num(pick(row, ["number", "pull_request_number", "pr_number", "id"]));
  const state = str(pick(row, ["state", "status"]), "open").toLowerCase();
  const draft = Boolean(pick(row, ["draft", "is_draft"]));
  const review = str(pick(row, ["review_decision", "reviewDecision", "mergeable_state"]));
  const repo = repoFullName(row);
  const author =
    typeof row.author === "object" && row.author
      ? str((row.author as Record<string, unknown>).login ?? (row.author as Record<string, unknown>).name)
      : str(pick(row, ["user", "author", "created_by"]));
  const updated = pick(row, ["updated_at", "updatedAt", "created_at", "createdAt"]);

  let label = "Open";
  let color = "#10b981";
  if (draft) { label = "Draft"; color = "#706c64"; }
  else if (state === "closed" || state === "merged") {
    label = state === "merged" || Boolean(pick(row, ["merged", "merged_at"])) ? "Merged" : "Closed";
    color = state === "merged" || Boolean(pick(row, ["merged", "merged_at"])) ? "#8b5cf6" : "#ef4444";
  } else if (/^(approved|lgtm)/i.test(review)) { label = "Approved"; color = "#10b981"; }
  else if (/^(changes_requested|review_required)/i.test(review)) { label = "Review Req"; color = "#f59e0b"; }
  else if (/^(ci_pending|pending|waiting)/i.test(review)) { label = "CI"; color = "#6366f1"; }

  const subtitleParts = [
    repo || undefined,
    author ? `by ${author}` : undefined,
    updated ? relativeTime(updated) : undefined,
  ].filter(Boolean) as string[];

  return {
    id: str(pick(row, ["id", "node_id", "url"]), `pr-${number ?? title}`),
    title: number != null && !title.includes("(#") ? `${title} (#${number})` : title,
    subtitle: subtitleParts.join(" • ") || undefined,
    status: { label, color },
    url: htmlUrl(row),
  };
}

export function mapIssue(row: Record<string, unknown>): ListItemData {
  const title = str(pick(row, ["title", "name", "subject"]), "Untitled issue");
  const number = num(pick(row, ["number", "issue_number", "id"]));
  const state = str(pick(row, ["state", "status"]), "open").toLowerCase();
  const labelsRaw = pick(row, ["labels", "label_names"]);
  const labels = Array.isArray(labelsRaw)
    ? labelsRaw
        .map((l) => (typeof l === "string" ? l : str((l as Record<string, unknown>)?.name)))
        .filter(Boolean)
    : [];
  const priority =
    labels.find((l) => /^(p0|p1|critical|high)/i.test(l)) ??
    str(pick(row, ["priority", "severity"]));
  const assignee =
    typeof row.assignee === "object" && row.assignee
      ? str((row.assignee as Record<string, unknown>).login)
      : str(pick(row, ["assignee", "assignees"]));
  const repo = repoFullName(row);
  const url = htmlUrl(row);

  let label = state === "closed" ? "Closed" : "Open";
  let color = state === "closed" ? "#706c64" : "#3b82f6";
  if (priority && /^(p0|critical)/i.test(priority)) { label = "P0"; color = "#ef4444"; }
  else if (/^p1|^high/i.test(priority)) { label = "P1"; color = "#f59e0b"; }

  const subtitle = [repo || undefined, assignee ? `@${assignee}` : undefined, labels.slice(0, 2).join(", ") || undefined]
    .filter(Boolean)
    .join(" • ");

  return {
    id: str(pick(row, ["id", "node_id", "url"]), `iss-${number ?? title}`),
    title: number != null && !title.includes("(#") ? `${title} (#${number})` : title,
    subtitle: subtitle || undefined,
    status: { label, color },
    url: url || undefined,
  };
}

export function mapCalendarEvent(row: Record<string, unknown>): ListItemData {
  const title = str(pick(row, ["summary", "title", "name", "subject"]), "Untitled event");
  const startRaw = pick(row, ["start", "start_time", "startTime", "created_at"]);
  const endRaw = pick(row, ["end", "end_time", "endTime"]);
  const start =
    typeof startRaw === "object" && startRaw
      ? str((startRaw as Record<string, unknown>).dateTime ?? (startRaw as Record<string, unknown>).date)
      : str(startRaw);
  const end =
    typeof endRaw === "object" && endRaw
      ? str((endRaw as Record<string, unknown>).dateTime ?? (endRaw as Record<string, unknown>).date)
      : str(endRaw);

  const fmt = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };
  const dayLabel = (() => {
    if (!start) return "";
    const d = new Date(start);
    if (Number.isNaN(d.getTime())) return "";
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  })();

  const location = str(pick(row, ["location", "room", "conferenceRoom"]));
  const hangout = str(pick(row, ["hangoutLink", "meet_link", "conferenceData"]));
  const timePart = start ? (end ? `${fmt(start)} – ${fmt(end)}` : fmt(start)) : "";
  const subtitle = [dayLabel && timePart ? `${dayLabel} • ${timePart}` : timePart || dayLabel, location || undefined]
    .filter(Boolean)
    .join(" • ");

  const startMs = start ? Date.parse(start) : NaN;
  let status: ListItemData["status"];
  if (Number.isFinite(startMs)) {
    const delta = startMs - Date.now();
    if (delta > 0 && delta < 60 * 60_000) status = { label: `In ${Math.max(1, Math.round(delta / 60_000))}m`, color: "#10b981" };
    else if (dayLabel === "Today") status = { label: "Today", color: "#6366f1" };
    else if (dayLabel === "Tomorrow") status = { label: "Tomorrow", color: "#706c64" };
    else status = { label: dayLabel || "Event", color: "#706c64" };
  } else {
    status = { label: "Event", color: "#706c64" };
  }

  return {
    id: str(pick(row, ["id", "iCalUID", "uid"]), `ev-${title}`),
    title,
    subtitle: subtitle || undefined,
    status,
    url: hangout || htmlUrl(row) || undefined,
  };
}

export function mapDriveFile(row: Record<string, unknown>): ListItemData {
  const title = str(pick(row, ["name", "title", "filename"]), "Untitled");
  const mime = str(pick(row, ["mimeType", "mime_type", "type"]));
  const modified = pick(row, ["modifiedTime", "modified_at", "updatedAt", "last_modified"]);
  const iconMap: Array<[RegExp, { label: string; color: string }]> = [
    [/document|gdoc|text\/plain/, { label: "Doc", color: "#3b82f6" }],
    [/sheet|csv|excel|spreadsheet/, { label: "Sheet", color: "#10b981" }],
    [/slides|presentation|powerpoint/, { label: "Slides", color: "#f59e0b" }],
    [/pdf/, { label: "PDF", color: "#ef4444" }],
    [/image|png|jpeg|jpg/, { label: "Image", color: "#8b5cf6" }],
    [/folder/, { label: "Folder", color: "#706c64" }],
  ];
  const status = iconMap.find(([re]) => re.test(mime))?.[1] ?? { label: "File", color: "#706c64" };

  return {
    id: str(pick(row, ["id", "fileId", "webViewLink"]), `f-${title}`),
    title,
    subtitle: modified ? `Modified ${relativeTime(modified)}` : (mime || undefined),
    status,
    url: htmlUrl(row),
  };
}

/* ─── High-level widget fetchers ─────────────────────────────────────── */

async function connectedOrThrow(integration: string): Promise<void> {
  const ok = await hasIntegrationConnection(integration);
  if (!ok) {
    const err = new Error("CONNECTED_WIDGET_DENIED") as Error & { code: string };
    err.code = "CONNECTED_WIDGET_DENIED";
    throw err;
  }
}

function noToolError(): Error & { code: string } {
  const err = new Error("CONNECTED_WIDGET_NO_TOOL") as Error & { code: string };
  err.code = "CONNECTED_WIDGET_NO_TOOL";
  return err;
}

/** Invoke the first tool whose name matches, returning the raw payload. */
async function invokeFirstMatchingTool(
  connectorSlugs: string[],
  patterns: RegExp[],
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const tools = await listGatewayTools();
  const toolName = findToolName(tools, connectorSlugs, patterns);
  if (!toolName) throw noToolError();
  const tool = tools.find((t) => String(t.name) === toolName)!;
  const slug = String(tool.connector_slug);
  const res = await connectorGateway.callTool(slug, toolName, args);
  if (res.result?.isError) {
    const text = (res.result.content ?? []).map((c) => c.text ?? "").join(" ");
    throw new Error(text || `Tool ${toolName} failed`);
  }
  return parseToolResult(res.result ?? {});
}

async function callFirstMatchingTool(
  connectorSlugs: string[],
  patterns: RegExp[],
  preferredResultKeys: string[],
  args: Record<string, unknown> = {},
): Promise<Array<Record<string, unknown>>> {
  const payload = await invokeFirstMatchingTool(connectorSlugs, patterns, args);
  return extractRecords(payload, preferredResultKeys);
}

/** Normalize a single-record payload (object or one-element array). */
function singleRecord(payload: unknown): Record<string, unknown> | null {
  if (Array.isArray(payload)) {
    const recs = payload.filter((x) => x && typeof x === "object") as Array<Record<string, unknown>>;
    return recs[0] ?? null;
  }
  if (payload && typeof payload === "object") return payload as Record<string, unknown>;
  return null;
}

export async function fetchGitHubPullRequests(): Promise<ListItemData[]> {
  await connectedOrThrow("github");
  // Prefer a cross-repo search when available; fall back to list endpoints.
  const rows = await callFirstMatchingTool(
    ["github"],
    [/search.*pull|pull.*search|list.*pull|pull.*list|pullrequest/i],
    ["pull_requests", "pullRequests", "items", "results"],
    { query: "is:pr is:open", state: "open", per_page: 20 },
  ).catch(async (e) => {
    if (e?.message && /required|missing|invalid|argument/i.test(String(e.message))) {
      return callFirstMatchingTool(
        ["github"],
        [/search.*pull|pull.*search|list.*pull|pull.*list|pullrequest/i],
        ["pull_requests", "pullRequests", "items"],
        { state: "open" },
      );
    }
    throw e;
  });
  return rows.map(mapPullRequest);
}

export async function fetchGitHubIssues(): Promise<ListItemData[]> {
  await connectedOrThrow("github");
  const rows = await callFirstMatchingTool(
    ["github"],
    [/search.*issue|issue.*search|list.*issue|issue.*list/i],
    ["issues", "items", "results"],
    { query: "is:issue is:open", state: "open", per_page: 20 },
  ).catch(async (e) => {
    if (e?.message && /required|missing|invalid|argument/i.test(String(e.message))) {
      return callFirstMatchingTool(
        ["github"],
        [/search.*issue|issue.*search|list.*issue|issue.*list/i],
        ["issues", "items"],
        { state: "open" },
      );
    }
    throw e;
  });
  return rows.map(mapIssue);
}

export async function fetchCalendarEvents(): Promise<ListItemData[]> {
  await connectedOrThrow("google");
  const rows = await callFirstMatchingTool(
    ["google-calendar", "gmail"],
    [/list.*event|event.*list|get.*event|calendar.*event|listevents/i],
    ["events", "items", "results"],
    { max_results: 10, time_min: new Date().toISOString() },
  );
  return rows.map(mapCalendarEvent);
}

export async function fetchDriveFiles(): Promise<ListItemData[]> {
  await connectedOrThrow("google");
  const rows = await callFirstMatchingTool(
    ["gmail", "google-calendar", "google-drive"],
    [/list.*file|file.*list|search.*file|drive.*file|listfiles|search/i],
    ["files", "items", "results"],
    { query: "", page_size: 10 },
  ).catch(async (e) => {
    // Some servers reject empty query — retry without args.
    if (e?.message && /required|missing|invalid|argument/i.test(String(e.message))) {
      return callFirstMatchingTool(
        ["gmail", "google-calendar", "google-drive"],
        [/list.*file|file.*list|search.*file|drive.*file|listfiles|search/i],
        ["files", "items"],
        {},
      );
    }
    throw e;
  });
  return rows.map(mapDriveFile);
}

export function mapGmailMessage(row: Record<string, unknown>): ListItemData {
  const subject = str(pick(row, ["subject", "title", "name"]), "(no subject)");
  const from = str(pick(row, ["from", "sender", "from_address", "fromAddress"]));
  const snippet = str(pick(row, ["snippet", "preview", "body_text"]));
  const dateRaw = pick(row, ["date", "internal_date", "received_at", "created_at", "createdAt"]);
  const date = typeof dateRaw === "number" ? new Date(dateRaw).toISOString() : str(dateRaw);
  const subtitle =
    [from || undefined, date ? relativeTime(date) : undefined].filter(Boolean).join(" • ") ||
    snippet ||
    undefined;

  return {
    id: str(pick(row, ["id", "message_id", "messageId", "thread_id", "threadId"]), `gm-${subject}`),
    title: subject,
    subtitle,
    status: { label: "Mail", color: "#ea4335" },
    url: htmlUrl(row),
  };
}

/* ─── Gmail operations (list / read / send) ─────────────────────────── */

const GMAIL_SLUGS = ["gmail"];
const GMAIL_LIST_PATTERNS = [/list.*messag|messag.*list|search.*mail|list.*mail|search.*messag/i];
const GMAIL_READ_PATTERNS = [/get.*messag|read.*messag|messag.*get|get.*mail/i];
const GMAIL_SEND_PATTERNS = [/send.*messag|send.*mail|messag.*send|compose.*mail/i];

export async function listGmailMessages(
  opts: { query?: string; maxResults?: number } = {},
): Promise<ListItemData[]> {
  await connectedOrThrow("google");
  const rows = await callFirstMatchingTool(
    GMAIL_SLUGS,
    GMAIL_LIST_PATTERNS,
    ["messages", "items", "results"],
    { query: opts.query ?? "in:inbox", max_results: opts.maxResults ?? 20 },
  );
  return rows.map(mapGmailMessage);
}

export async function readGmailMessage(messageId: string): Promise<Record<string, unknown> | null> {
  await connectedOrThrow("google");
  const payload = await invokeFirstMatchingTool(GMAIL_SLUGS, GMAIL_READ_PATTERNS, {
    message_id: messageId,
    id: messageId,
  });
  return singleRecord(payload);
}

export async function sendGmailMessage(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<unknown> {
  await connectedOrThrow("google");
  return invokeFirstMatchingTool(GMAIL_SLUGS, GMAIL_SEND_PATTERNS, {
    to: input.to,
    subject: input.subject,
    body: input.body,
  });
}

/* ─── Calendar operations (list via fetchCalendarEvents / create) ───── */

export async function createCalendarEvent(input: {
  summary: string;
  start: string;
  end?: string;
  description?: string;
  location?: string;
}): Promise<unknown> {
  await connectedOrThrow("google");
  return invokeFirstMatchingTool(
    ["google-calendar"],
    [/create.*event|insert.*event|event.*create|add.*event/i],
    {
      summary: input.summary,
      start: input.start,
      ...(input.end ? { end: input.end } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.location ? { location: input.location } : {}),
    },
  );
}

/* ─── Drive operations (list via fetchDriveFiles / read) ────────────── */

export async function readDriveFile(fileId: string): Promise<unknown> {
  await connectedOrThrow("google");
  return invokeFirstMatchingTool(
    ["google-drive"],
    [/get.*file|read.*file|download.*file|file.*get|file.*content|export.*file/i],
    { file_id: fileId, id: fileId },
  );
}

/* ─── Sheets operations (list / read / write / append) ──────────────── */

const SHEETS_SLUGS = ["google-sheets"];
const SHEETS_READ_PATTERNS = [/get.*value|read.*range|values.*get|batch.*get|range.*get/i];
const SHEETS_WRITE_PATTERNS = [/update.*value|write.*range|values.*update|set.*cell|range.*update/i];
const SHEETS_APPEND_PATTERNS = [/append.*value|values.*append|add.*row|append.*row/i];

/**
 * Invoke a Sheets tool, retrying once with the camelCase spreadsheet id
 * when the server rejects the snake_case argument (same fallback pattern
 * as the GitHub list fetchers above).
 */
async function invokeSheetTool(
  patterns: RegExp[],
  spreadsheetId: string,
  rest: Record<string, unknown> = {},
): Promise<unknown> {
  try {
    return await invokeFirstMatchingTool(SHEETS_SLUGS, patterns, {
      spreadsheet_id: spreadsheetId,
      ...rest,
    });
  } catch (e) {
    if (e && typeof e === "object" && "message" in e && /required|missing|invalid|argument/i.test(String((e as { message: unknown }).message))) {
      return invokeFirstMatchingTool(SHEETS_SLUGS, patterns, {
        spreadsheetId,
        ...rest,
      });
    }
    throw e;
  }
}

export async function listSpreadsheets(
  opts: { query?: string; maxResults?: number } = {},
): Promise<ListItemData[]> {
  await connectedOrThrow("google");
  // The Sheets API has no list endpoint — spreadsheets are enumerated
  // through Drive and filtered to the spreadsheet MIME type.
  const rows = await callFirstMatchingTool(
    ["google-drive"],
    [/list.*file|file.*list|search.*file|drive.*file|listfiles|search/i],
    ["files", "items", "results"],
    { query: opts.query ?? "mimeType = 'application/vnd.google-apps.spreadsheet'", page_size: opts.maxResults ?? 20 },
  ).catch(async (e) => {
    if (e?.message && /required|missing|invalid|argument/i.test(String(e.message))) {
      return callFirstMatchingTool(
        ["google-drive"],
        [/list.*file|file.*list|search.*file|drive.*file|listfiles|search/i],
        ["files", "items"],
        {},
      );
    }
    throw e;
  });
  // Keep spreadsheet files when the server reports MIME types; otherwise
  // return whatever the (already MIME-queried) server gave us.
  const sheets = rows.filter((r) => {
    const mime = str(pick(r, ["mimeType", "mime_type", "type"]));
    return !mime || mime.includes("spreadsheet");
  });
  return sheets.map(mapDriveFile);
}

export async function readSheetRange(input: {
  spreadsheetId: string;
  range: string;
}): Promise<unknown> {
  await connectedOrThrow("google");
  return invokeSheetTool(SHEETS_READ_PATTERNS, input.spreadsheetId, { range: input.range });
}

export async function writeSheetRange(input: {
  spreadsheetId: string;
  range: string;
  values: unknown[][];
}): Promise<unknown> {
  await connectedOrThrow("google");
  return invokeSheetTool(SHEETS_WRITE_PATTERNS, input.spreadsheetId, {
    range: input.range,
    values: input.values,
  });
}

export async function appendSheetRow(input: {
  spreadsheetId: string;
  range: string;
  values: unknown[][];
}): Promise<unknown> {
  await connectedOrThrow("google");
  return invokeSheetTool(SHEETS_APPEND_PATTERNS, input.spreadsheetId, {
    range: input.range,
    values: input.values,
  });
}

/* ─── Slack operations (post message) ───────────────────────────────── */

export async function postSlackMessage(input: {
  channel: string;
  text: string;
}): Promise<unknown> {
  await connectedOrThrow("slack");
  return invokeFirstMatchingTool(
    ["slack"],
    [/post.*message|chat.*post|send.*message|message.*send/i],
    { channel: input.channel, text: input.text },
  );
}

export async function fetchLiveConnections(): Promise<ConnectorConnection[]> {
  return ProviderSyncManager.fetch(
    "gateway",
    "connections",
    () => connectorGateway.listConnections(),
    60_000,
  );
}

/** Map a thrown gateway error into a widget data state (never throws). */
export function toWidgetState<T>(err: unknown): WidgetDataState<T> {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
  if (code === "CONNECTED_WIDGET_DENIED") return { status: "denied" };
  if (code === "CONNECTED_WIDGET_NO_TOOL") {
    return { status: "error", message: "No matching tool is available on this connection yet." };
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/sign in|not authenticated|unauthorized|401/i.test(msg)) return { status: "denied" };
  return { status: "error", message: msg.slice(0, 200) };
}
