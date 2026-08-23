import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import {
  Terminal,
  Play,
  Key,
  Copy,
  Check,
  X,
  Info,
  BookOpen,
  FlaskConical,
  Loader2,
  ShieldCheck,
  Gauge,
  Braces,
  ExternalLink,
} from "lucide-react";
import ApiKeysManager from "./ApiKeysManager";
import {
  apiBase,
  buildOpenApiSpec,
  buildCurl,
  buildJavaScript,
  buildPython,
  buildTypeScript,
  ENDPOINTS,
  SCOPES,
  type EndpointDoc,
} from "./apiContract";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
  POST: "bg-[var(--noska-blue-soft)] text-[var(--noska-blue)] border-[var(--noska-blue)]/20",
  PATCH: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
  DELETE: "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
};

interface RequestLog {
  requestUrl: string;
  method: string;
  requestBody?: string;
  responseHeaders: Array<[string, string]>;
  responseStatus: number;
  statusText: string;
  responseBody: string;
  latencyMs: number;
}

export default function ApiConsole({ pages, activePageId, currentUserId, onClose, onToast }: {
  /** Used only to prefill path/query ids in the playground picker. */
  pages?: Array<{ id: string; title?: string; icon?: string }>;
  activePageId?: string | null;
  currentUserId?: string | null;
  onClose: () => void;
  onToast?: (message: string) => void;
}) {
  const [tab, setTab] = useState<"playground" | "docs" | "keys">("playground");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-4 sm:p-6"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="w-[900px] max-w-full h-[min(720px,calc(100vh-32px))] flex flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3.5 shrink-0">
          <Terminal size={18} className="text-[var(--accent)]" />
          <h2 className="flex-1 font-semibold text-[var(--text)]">Developer Platform</h2>
          <div className="flex gap-1 rounded-lg bg-[var(--surface)] p-0.5">
            {([
              ["playground", "Playground", FlaskConical],
              ["docs", "Docs", BookOpen],
              ["keys", "API Keys", Key],
            ] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium ${
                  tab === id ? "bg-[var(--hover)] text-[var(--text)]" : "text-[var(--secondary)]"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={16} />
          </button>
        </div>

        {tab === "playground" && (
          <Playground
            base={apiBase(SUPABASE_URL)}
            apiKeyInput={apiKeyInput}
            setApiKeyInput={setApiKeyInput}
            showKey={showKey}
            setShowKey={setShowKey}
            pages={pages ?? []}
            activePageId={activePageId}
            onOpenKeys={() => setTab("keys")}
            onToast={onToast}
          />
        )}
        {tab === "docs" && <DocsPanel base={apiBase(SUPABASE_URL)} onToast={onToast} />}
        {tab === "keys" && (
          <div className="flex-1 overflow-y-auto p-5">
            <p className="mb-4 max-w-xl text-xs leading-relaxed text-[var(--secondary)]">
              Keys authenticate with <code className="rounded bg-[var(--surface)] px-1 font-mono">Authorization: Bearer nsk_…</code>.
              Secrets are shown once at creation — Noska stores only SHA-256 hashes.
            </p>
            <ApiKeysManager userId={currentUserId} onToast={onToast} />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ═══ Playground ═══ */

function Playground({ base, apiKeyInput, setApiKeyInput, showKey, setShowKey, pages, activePageId, onOpenKeys, onToast }: {
  base: string;
  apiKeyInput: string;
  setApiKeyInput: (v: string) => void;
  showKey: boolean;
  setShowKey: (v: boolean) => void;
  pages: Array<{ id: string; title?: string; icon?: string }>;
  activePageId?: string | null;
  onOpenKeys: () => void;
  onToast?: (m: string) => void;
}) {
  const [endpointId, setEndpointId] = useState(ENDPOINTS[0].id);
  const endpoint = useMemo(() => ENDPOINTS.find((e) => e.id === endpointId)!, [endpointId]);
  const [params, setParams] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState(endpoint.sampleBody ?? "");
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState<RequestLog | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Reset per-endpoint state when switching routes.
  useEffect(() => {
    setBodyText(endpoint.sampleBody ?? "");
    const defaults: Record<string, string> = {};
    for (const p of endpoint.params ?? []) {
      if (p.in === "path" && p.name === "id") defaults[p.name] = activePageId || pages[0]?.id || "";
      if (p.in === "query" && p.name === "page_id") defaults[p.name] = activePageId || pages[0]?.id || "";
    }
    setParams(defaults);
    setLog(null);
  }, [endpointId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolvedPath = endpoint.path.replace(/:(\w+)/g, (_, name) => params[name]?.trim() || `{${name}}`);
  const queryPairs = (endpoint.params ?? []).filter((p) => p.in === "query" && (params[p.name] ?? "") !== "");
  const fullUrl = `${base}${resolvedPath}${queryPairs.length ? "?" + queryPairs.map((p) => `${p.name}=${encodeURIComponent(params[p.name])}`).join("&") : ""}`;

  const send = async () => {
    if (!apiKeyInput.trim()) {
      onToast?.("Paste an API key first — create one under API Keys.");
      return;
    }
    for (const p of endpoint.params ?? []) {
      if (p.in === "path" && p.required && !params[p.name]?.trim()) {
        onToast?.(`Fill in :${p.name}`);
        return;
      }
    }
    let parsedBody: string | undefined;
    if (bodyText.trim()) {
      try {
        parsedBody = JSON.stringify(JSON.parse(bodyText));
      } catch {
        onToast?.("Request body is not valid JSON.");
        return;
      }
    }
    setSending(true);
    setLog(null);
    const started = performance.now();
    try {
      const res = await fetch(fullUrl, {
        method: endpoint.method,
        headers: {
          Authorization: `Bearer ${apiKeyInput.trim()}`,
          ...(parsedBody ? { "Content-Type": "application/json" } : {}),
        },
        body: parsedBody,
      });
      const latencyMs = Math.round(performance.now() - started);
      const headers: Array<[string, string]> = [];
      res.headers.forEach((value, name) => {
        if (/ratelimit|content-type|retry-after|x-noska/i.test(name)) headers.push([name, value]);
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch { /* non-JSON body */ }
      setLog({
        requestUrl: fullUrl,
        method: endpoint.method,
        requestBody: parsedBody ? JSON.stringify(JSON.parse(parsedBody), null, 2) : undefined,
        responseHeaders: headers,
        responseStatus: res.status,
        statusText: res.statusText || String(res.status),
        responseBody: pretty || "(empty)",
        latencyMs,
      });
    } catch (err) {
      setLog({
        requestUrl: fullUrl,
        method: endpoint.method,
        requestBody: parsedBody,
        responseHeaders: [],
        responseStatus: 0,
        statusText: "Network error",
        responseBody: err instanceof Error ? err.message : "The request could not be completed.",
        latencyMs: Math.round(performance.now() - started),
      });
    } finally {
      setSending(false);
    }
  };

  const copySnippet = async (kind: "curl" | "js" | "python" | "ts") => {
    const body = bodyText.trim() ? bodyText : undefined;
    const snippets = {
      curl: () => buildCurl(base, endpoint, params, "<your-api-key>", body),
      js: () => buildJavaScript(base, endpoint, params, "<your-api-key>", body),
      python: () => buildPython(base, endpoint, params, "<your-api-key>", body),
      ts: () => buildTypeScript(base, endpoint, params, "${process.env.NOSKA_API_KEY}", body),
    };
    await navigator.clipboard.writeText(snippets[kind]()).catch(() => {});
    setCopied(kind);
    setTimeout(() => setCopied(null), 1800);
    onToast?.(`${kind.toUpperCase()} snippet copied`);
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* Endpoint list */}
      <div className="hidden w-[228px] shrink-0 border-r border-[var(--border)] overflow-y-auto p-2.5 md:block">
        <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Endpoints</div>
        {ENDPOINTS.map((e) => (
          <button
            key={e.id}
            onClick={() => setEndpointId(e.id)}
            className={`mb-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
              e.id === endpointId ? "bg-[var(--hover)]" : "hover:bg-[var(--hover)]/50"
            }`}
          >
            <span className={`shrink-0 rounded border px-1 py-0.5 font-mono text-[9px] font-bold ${METHOD_COLORS[e.method]}`}>
              {e.method}
            </span>
            <span className={`truncate font-mono text-[11px] ${e.id === endpointId ? "font-semibold text-[var(--text)]" : "text-[var(--secondary)]"}`}>
              {e.path.replace(/:(\w+)/g, "{$1}")}
            </span>
          </button>
        ))}
      </div>

      {/* Request / response */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Auth */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Authorization</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="nsk_…"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 pr-14 font-mono text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[var(--secondary)] hover:text-[var(--text)]"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
              </div>
              <button
                onClick={onOpenKeys}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)]"
              >
                <Key size={12} /> Keys
              </button>
            </div>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Kept in memory only — never stored by the console.
            </p>
          </div>

          {/* Route summary */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${METHOD_COLORS[endpoint.method]}`}>{endpoint.method}</span>
              <code className="break-all font-mono text-xs text-[var(--text)]">{fullUrl}</code>
            </div>
            <p className="mt-1 text-xs text-[var(--secondary)]">{endpoint.description}</p>
          </div>

          {/* Params */}
          {(endpoint.params ?? []).filter((p) => p.in !== "body").length > 0 && (
            <div className="space-y-2">
              {(endpoint.params ?? []).filter((p) => p.in !== "body").map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <code className={`w-28 shrink-0 truncate font-mono text-[11px] ${p.required ? "font-bold text-[var(--text)]" : "text-[var(--secondary)]"}`}>
                    {p.in === "path" ? ":" : ""}{p.name}
                    {p.required && "*"}
                  </code>
                  <input
                    value={params[p.name] ?? ""}
                    onChange={(e) => setParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                    placeholder={p.description}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  {["id", "page_id"].includes(p.name) && pages.length > 0 && (
                    <select
                      value={params[p.name] ?? ""}
                      onChange={(e) => setParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                      className="max-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1.5 text-[11px] text-[var(--secondary)] focus:outline-none"
                    >
                      <option value="">Pick page…</option>
                      {pages.slice(0, 50).map((pg) => (
                        <option key={pg.id} value={pg.id}>{(pg.icon?.startsWith("lucide:") ? "📄" : pg.icon || "📄")} {pg.title || "(Untitled)"}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Body */}
          {(endpoint.params ?? []).some((p) => p.in === "body") && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Request body (JSON)</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={6}
                spellCheck={false}
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          )}

          {/* Snippets */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Copy request as</label>
            <div className="flex flex-wrap gap-1.5">
              {([["curl", "cURL"], ["js", "JavaScript"], ["python", "Python"], ["ts", "TypeScript"]] as const).map(([kind, label]) => (
                <button
                  key={kind}
                  onClick={() => copySnippet(kind)}
                  className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                >
                  {copied === kind ? <Check size={11} className="text-[var(--success)]" /> : <Copy size={11} />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Response */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Response</label>
              {log && (
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span
                    className={`rounded px-1.5 py-0.5 font-bold ${
                      log.responseStatus >= 200 && log.responseStatus < 300
                        ? "bg-[var(--success)]/10 text-[var(--success)]"
                        : "bg-[var(--danger)]/10 text-[var(--danger)]"
                    }`}
                  >
                    {log.responseStatus === 0 ? "ERR" : `${log.responseStatus}`} · {log.statusText}
                  </span>
                  <span className="text-[var(--muted)]">{log.latencyMs} ms</span>
                </div>
              )}
            </div>
            <div className="max-h-[240px] min-h-[120px] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs text-[var(--text)]">
              {sending ? (
                <div className="flex h-full items-center justify-center gap-2 pt-8 text-[var(--muted)]">
                  <Loader2 size={14} className="animate-spin" />
                  Sending…
                </div>
              ) : log ? (
                <>
                  {log.responseHeaders.length > 0 && (
                    <div className="mb-3 rounded-md bg-[var(--bg)] p-2 text-[10px] leading-relaxed text-[var(--secondary)]">
                      {log.responseHeaders.map(([k, v]) => (
                        <div key={k}><span className="text-[var(--accent)]">{k}</span>: {v}</div>
                      ))}
                    </div>
                  )}
                  {log.requestBody && (
                    <details className="mb-3">
                      <summary className="cursor-pointer select-none text-[10px] uppercase tracking-wider text-[var(--muted)]">Request body</summary>
                      <pre className="mt-1 whitespace-pre-wrap text-[11px] text-[var(--secondary)]">{log.requestBody}</pre>
                    </details>
                  )}
                  <pre className="whitespace-pre-wrap">{log.responseBody}</pre>
                </>
              ) : (
                <div className="grid h-full place-items-center pt-10 text-[var(--muted)]">
                  <span className="flex items-center gap-1.5"><Info size={13} /> Send a request to see the live response</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Execute bar */}
        <div className="flex shrink-0 items-center justify-between border-t border-[var(--border)] p-3.5">
          <span className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
            <ShieldCheck size={12} />
            Requests hit the real API — writes affect your workspace.
          </span>
          <button
            onClick={send}
            disabled={sending}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            Send request
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Docs (developer portal) ═══ */

function DocsPanel({ base, onToast }: { base: string; onToast?: (m: string) => void }) {
  const [openId, setOpenId] = useState<string | null>(ENDPOINTS[0].id);

  const copyOpenApi = async () => {
    await navigator.clipboard.writeText(JSON.stringify(buildOpenApiSpec(base), null, 2)).catch(() => {});
    onToast?.("OpenAPI spec copied");
  };

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Auth */}
        <Section icon={<ShieldCheck size={14} />} title="Authentication">
          <p className="text-xs leading-relaxed text-[var(--secondary)]">
            Every request needs a key created under <strong className="text-[var(--text)]">API Keys</strong>:
          </p>
          <Code>Authorization: Bearer nsk_yourkeyhere</Code>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--secondary)]">
            <li>Scopes limit what each key can touch (<code className="font-mono text-[11px]">pages:read</code>, <code className="font-mono text-[11px]">tasks:write</code>, …).</li>
            <li>Keys expire on schedule and stop working the moment you revoke them.</li>
            <li>All data is scoped to the key's owner — keys can never read another workspace.</li>
          </ul>
        </Section>

        {/* Rate limits */}
        <Section icon={<Gauge size={14} />} title="Rate limits & pagination">
          <p className="text-xs leading-relaxed text-[var(--secondary)]">
            <strong className="text-[var(--text)]">60 requests per minute</strong> per key (fixed window).
            Every response carries <code className="font-mono text-[11px]">X-RateLimit-Limit</code>,
            <code className="ml-1 font-mono text-[11px]">X-RateLimit-Remaining</code> and
            <code className="ml-1 font-mono text-[11px]">X-RateLimit-Reset</code>; exceeding it returns
            <code className="ml-1 font-mono text-[11px]">429</code> with a <code className="font-mono text-[11px]">Retry-After</code> header.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--secondary)]">
            List endpoints accept <code className="font-mono text-[11px]">limit</code> (1–100) and
            <code className="ml-1 font-mono text-[11px]">offset</code>, returning{" "}
            <code className="font-mono text-[11px]">{`{ data, meta: { has_more } }`}</code>. POST endpoints honor an
            <code className="ml-1 font-mono text-[11px]">Idempotency-Key</code> header (24h replay cache).
          </p>
        </Section>

        {/* Errors */}
        <Section icon={<Braces size={14} />} title="Errors">
          <Code>{`{ "error": { "code": "insufficient_scope", "message": "This endpoint requires the \\"tasks:write\\" scope…" } }`}</Code>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-[var(--secondary)] sm:grid-cols-3">
            {[["401", "unauthorized"], ["401", "invalid_key / key_revoked / key_expired"], ["403", "insufficient_scope"],
              ["404", "not_found"], ["400", "invalid_request"], ["429", "rate_limited"]].map(([status, code]) => (
              <div key={code} className="flex gap-2">
                <span className="font-mono font-bold text-[var(--noska-blue)]">{status}</span>
                <span className="font-mono">{code}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* MCP */}
        <Section icon={<ExternalLink size={14} />} title="Connect AI clients (MCP)">
          <p className="text-xs leading-relaxed text-[var(--secondary)]">
            Noska speaks the Model Context Protocol — point Claude Desktop, Cursor or any MCP client at this endpoint and give it a key with the scopes you want it to have.
          </p>
          <Code>{`{
  "mcpServers": {
    "noska": {
      "url": "${base.replace("/api-v1", "")}/mcp",
      "headers": { "Authorization": "Bearer nsk_…" }
    }
  }
}`}</Code>
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            Tools: search_pages · read_page · create_page · update_page · list_tasks · create_task · list_reviews · add_study_card — each enforced by your key's scopes.
          </p>
        </Section>

        {/* Endpoints */}
        <Section icon={<Terminal size={14} />} title="Endpoints">
          <div className="space-y-1.5">
            {ENDPOINTS.map((ep) => (
              <EndpointDocRow key={ep.id} ep={ep} open={openId === ep.id} onToggle={() => setOpenId(openId === ep.id ? null : ep.id)} />
            ))}
          </div>
        </Section>

        {/* OpenAPI */}
        <Section icon={<ExternalLink size={14} />} title="OpenAPI specification">
          <p className="text-xs leading-relaxed text-[var(--secondary)]">
            The full OpenAPI 3.1 document is generated from this exact contract — import it into Postman, Insomnia or your generator of choice.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(buildOpenApiSpec(base), null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "noska-openapi.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              Download noska-openapi.json
            </button>
            <button
              onClick={copyOpenApi}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)]"
            >
              Copy JSON
            </button>
          </div>
        </Section>

        {/* Scopes reference */}
        <Section icon={<Key size={14} />} title="Scopes">
          <div className="space-y-1">
            {SCOPES.map((s) => (
              <div key={s.id} className="flex items-baseline gap-3 text-xs">
                <code className={`shrink-0 rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[11px] ${s.id.endsWith("write") ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                  {s.id}
                </code>
                <span className="text-[var(--secondary)]">{s.description}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
        <span className="text-[var(--accent)]">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5 font-mono text-[11px] leading-relaxed text-[var(--text)]">
      {children}
    </pre>
  );
}

function EndpointDocRow({ ep, open, onToggle }: { ep: EndpointDoc; open: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <button onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--hover)]/50">
        <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${METHOD_COLORS[ep.method]}`}>{ep.method}</span>
        <code className="font-mono text-xs font-semibold text-[var(--text)]">{ep.path.replace(/:(\w+)/g, "{$1}")}</code>
        <span className="ml-auto hidden truncate text-[11px] text-[var(--muted)] sm:block">{ep.summary}</span>
        <code className="ml-2 hidden shrink-0 rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--accent)] sm:block">{ep.scope}</code>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="border-t border-[var(--border)] px-3 py-2.5">
              <p className="text-xs leading-relaxed text-[var(--secondary)]">{ep.description}</p>
              {(ep.params ?? []).length > 0 && (
                <table className="mt-2 w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-wider text-[var(--muted)]">
                      <th className="py-1 pr-3 font-semibold">Param</th>
                      <th className="py-1 pr-3 font-semibold">In</th>
                      <th className="py-1 pr-3 font-semibold">Type</th>
                      <th className="py-1 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ep.params ?? []).map((p) => (
                      <tr key={`${p.in}-${p.name}`} className="border-t border-[var(--border)]/50 align-top">
                        <td className="py-1.5 pr-3 font-mono font-semibold text-[var(--text)]">
                          {p.name}{p.required ? "*" : ""}
                        </td>
                        <td className="py-1.5 pr-3 text-[var(--secondary)]">{p.in}</td>
                        <td className="py-1.5 pr-3 font-mono text-[var(--secondary)]">{p.type}</td>
                        <td className="py-1.5 text-[var(--secondary)]">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {ep.sampleBody && <Code>{ep.sampleBody}</Code>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
