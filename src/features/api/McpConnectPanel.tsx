import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plug,
  Copy,
  Check,
  ShieldAlert,
  ExternalLink,
  Zap,
  Loader2,
  Globe,
  MonitorSmartphone,
} from "lucide-react";
import {
  MCP_CLIENTS,
  clientConfig,
  isLoopbackUrl,
  isValidKeyInput,
  mcpEndpoint,
  oneLinkUrl,
  resolvePublicSupabaseUrl,
  type McpClientId,
} from "./mcpConnect";
import { cn } from "../../lib/utils";

const ENDPOINT = mcpEndpoint(
  resolvePublicSupabaseUrl(import.meta.env.VITE_SUPABASE_URL, import.meta.env.PROD),
);
const IS_LOCAL_ENDPOINT = isLoopbackUrl(ENDPOINT);
const PROD_ENDPOINT = mcpEndpoint("https://yxgtmzksnyarlivgxujf.supabase.co");

/**
 * Settings → Developer → "Connect AI Clients (MCP)".
 *
 * Copy-paste MCP setup: paste a key once (it never leaves this tab), pick
 * the client, copy the config. Freshly created keys arrive via `initialKey`
 * so create-key → copy-config is one motion.
 */
export default function McpConnectPanel({
  initialKey,
  onToast,
}: {
  /** Raw key just created/rotated (shown once) — auto-fills the input. */
  initialKey?: string | null;
  onToast?: (msg: string) => void;
}) {
  const [client, setClient] = useState<McpClientId>("claude-desktop");
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [withKeyInUrl, setWithKeyInUrl] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null);
  const copyTimer = useRef<number | null>(null);
  const testAbort = useRef<AbortController | null>(null);

  // A just-revealed key fills the (empty) input exactly once per key.
  useEffect(() => {
    if (initialKey && isValidKeyInput(initialKey) && !keyInput) {
      setKeyInput(initialKey);
    }
  }, [initialKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      testAbort.current?.abort();
    },
    [],
  );

  const hasKey = isValidKeyInput(keyInput);
  // One-link URL only when the user opted in AND we have a key (never leak partial input).
  const displayEndpoint = useMemo(() => {
    if (!hasKey || !withKeyInUrl) return ENDPOINT;
    return oneLinkUrl(ENDPOINT, keyInput);
  }, [hasKey, withKeyInUrl, keyInput]);
  // Bare endpoint for network tests (strip ?key=… if present).
  const bareEndpoint = useMemo(
    () => displayEndpoint.replace(/\?key=.*$/, ""),
    [displayEndpoint],
  );
  const cfg = useMemo(
    () => clientConfig(client, ENDPOINT, hasKey ? keyInput : null, withKeyInUrl),
    [client, hasKey, keyInput, withKeyInUrl],
  );

  const flash = useCallback((id: string) => {
    setCopied(id);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 1600);
  }, []);

  const copyText = useCallback(
    async (id: string, text: string, toast?: string) => {
      await navigator.clipboard.writeText(text).catch(() => {});
      flash(id);
      if (toast) onToast?.(toast);
    },
    [flash, onToast],
  );

  /** Live check: initialize → tools/list with the pasted key. Aborts on unmount. */
  const testConnection = useCallback(async () => {
    if (!hasKey || testing) return;
    setTesting(true);
    setTestResult(null);
    testAbort.current?.abort();
    const ctrl = new AbortController();
    testAbort.current = ctrl;
    const post = (body: unknown) =>
      fetch(bareEndpoint, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${keyInput}`,
          "MCP-Protocol-Version": "2025-06-18",
        },
        body: JSON.stringify(body),
      });
    try {
      const init = await post({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "noska-settings", version: "1" },
        },
      });
      if (init.status === 401) {
        setTestResult({
          ok: false,
          detail: "Key rejected (401) — check it isn't revoked or expired.",
        });
        return;
      }
      const initBody = await init.json().catch(() => ({}));
      const server = initBody?.result?.serverInfo?.name;
      const list = await post({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/list",
      });
      const listBody = await list.json().catch(() => ({}));
      const n = listBody?.result?.tools?.length;
      if (server === "noska" && typeof n === "number") {
        setTestResult({
          ok: true,
          detail: `Connected — server "${server}", ${n} tools visible to this key.`,
        });
        onToast?.("MCP connection verified.");
      } else {
        setTestResult({ ok: false, detail: `Unexpected response (HTTP ${list.status}).` });
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setTestResult({
        ok: false,
        detail: "Network or CORS error — is the MCP function deployed?",
      });
    } finally {
      if (testAbort.current === ctrl) testAbort.current = null;
      setTesting(false);
    }
  }, [hasKey, testing, bareEndpoint, keyInput, onToast]);

  return (
    <div className="rounded-2xl bg-[#f8f6f0] dark:bg-[#181b24] border border-[#e8e4db] dark:border-white/10 p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500/10 dark:bg-violet-500/15 border border-violet-500/20 text-violet-600 dark:text-violet-400">
            <Plug size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1c1b18] dark:text-white">Connect AI Clients (MCP)</span>
              <span className="flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                Claude · ChatGPT · Agents
              </span>
            </div>
            <p className="text-[11px] text-[#706c64] dark:text-white/60 mt-0.5">
              One endpoint, copy-paste setup — use Noska inside any AI client.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/mcp"
            className="flex items-center gap-1 text-[11px] font-semibold text-[#706c64] hover:text-[#1c1b18] dark:text-white/60 dark:hover:text-white transition"
          >
            Interactive setup <ExternalLink size={11} />
          </a>
          <a
            href="/docs/mcp"
            className="flex items-center gap-1 text-[11px] font-semibold text-[#706c64] hover:text-[#1c1b18] dark:text-white/60 dark:hover:text-white transition"
          >
            Docs <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Step 01 — key */}
      <div className="rounded-xl bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1c1b18] dark:bg-white text-white dark:text-[#1c1b18] text-[10px] font-bold">1</span>
          <span className="text-xs font-bold text-[#1c1b18] dark:text-white">Paste an API key</span>
          <span className="text-[10.5px] text-[#8c887f] dark:text-white/50">Stays in this tab — never sent anywhere except your test.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type={showKey ? "text" : "password"}
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value.trim());
              setTestResult(null);
            }}
            placeholder="nsk_… (create one above)"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 min-w-0 rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-[#14161f] px-3 py-2 font-mono text-xs text-[#1c1b18] dark:text-white placeholder-[#a09c94] focus:outline-none focus:border-[#1c1b18] dark:focus:border-white/40 transition"
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            className="px-2.5 py-2 rounded-xl text-[11px] font-semibold text-[#706c64] hover:text-[#1c1b18] dark:text-white/60 dark:hover:text-white transition cursor-pointer shrink-0"
          >
            {showKey ? "Hide" : "Show"}
          </button>
          {keyInput && (
            <button
              type="button"
              onClick={() => {
                setKeyInput("");
                setTestResult(null);
              }}
              className="px-2.5 py-2 rounded-xl text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer shrink-0"
            >
              Clear
            </button>
          )}
        </div>
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={withKeyInUrl}
            onChange={(e) => setWithKeyInUrl(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded accent-[#1c1b18] cursor-pointer"
          />
          <span className="text-[11px] text-[#706c64] dark:text-white/60">
            Put the key in the link itself <code className="font-mono rounded bg-[#f8f6f0] dark:bg-white/10 px-1">?key=…</code> — required for ChatGPT connectors &amp; header-less agents.
          </span>
        </label>
        {hasKey && withKeyInUrl && (
          <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-1.5">
            <ShieldAlert size={13} className="mt-px shrink-0" />
            One-link mode: treat the link like a password — anyone with it uses your key. Revoke anytime below.
          </p>
        )}
      </div>

      {/* Step 02 — endpoint */}
      <div className="rounded-xl bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1c1b18] dark:bg-white text-white dark:text-[#1c1b18] text-[10px] font-bold">2</span>
          <span className="text-xs font-bold text-[#1c1b18] dark:text-white">Copy the endpoint</span>
          {hasKey && withKeyInUrl && (
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-px text-[9.5px] font-bold text-amber-700 dark:text-amber-300">one-link mode</span>
          )}
          <span
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-px text-[9.5px] font-bold",
              IS_LOCAL_ENDPOINT
                ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300"
                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
            )}
            title={
              IS_LOCAL_ENDPOINT
                ? "Local/dev endpoint — external AI clients cannot reach 127.0.0.1"
                : "Hosted production endpoint — reachable from any AI client"
            }
          >
            {IS_LOCAL_ENDPOINT ? <MonitorSmartphone size={10} /> : <Globe size={10} />}
            {IS_LOCAL_ENDPOINT ? "local" : "production"}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-[#1c1b18] px-3 py-2.5">
          <code className="flex-1 min-w-0 truncate font-mono text-[11px] text-white select-all">{displayEndpoint}</code>
          <button
            type="button"
            onClick={() => copyText("endpoint", displayEndpoint, "MCP endpoint copied")}
            className="flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[10px] font-semibold text-white/80 hover:text-white transition cursor-pointer shrink-0"
          >
            {copied === "endpoint" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            <span>{copied === "endpoint" ? "Copied" : "Copy link"}</span>
          </button>
        </div>
        {IS_LOCAL_ENDPOINT && (
          <div className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-1.5">
            <ShieldAlert size={13} className="mt-px shrink-0" />
            <span>
              You're on a local/dev URL — Claude, ChatGPT, Cursor etc. running elsewhere can't open{" "}
              <code className="font-mono">127.0.0.1</code>. For real clients use the production endpoint:{" "}
              <button
                type="button"
                onClick={() => copyText("prod-endpoint", PROD_ENDPOINT, "Production MCP endpoint copied")}
                className="font-mono underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer text-left break-all"
              >
                {PROD_ENDPOINT}
                {copied === "prod-endpoint" ? " ✓" : ""}
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Step 03 — client */}
      <div className="rounded-xl bg-white dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1c1b18] dark:bg-white text-white dark:text-[#1c1b18] text-[10px] font-bold">3</span>
          <span className="text-xs font-bold text-[#1c1b18] dark:text-white">Pick the client, paste the config</span>
        </div>
        <div className="flex gap-1 rounded-xl bg-[#f8f6f0] dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 p-1 overflow-x-auto scrollbar-none" role="tablist">
          {MCP_CLIENTS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={client === c.id}
              onClick={() => setClient(c.id)}
              className={cn(
                "whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer",
                client === c.id
                  ? "bg-[#1c1b18] text-white dark:bg-white dark:text-[#1c1b18] shadow-xs"
                  : "text-[#706c64] dark:text-white/60 hover:text-[#1c1b18] dark:hover:text-white",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        <ol className="space-y-1">
          {cfg.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-[#555] dark:text-white/70">
              <span className="mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#f8f6f0] dark:bg-white/10 border border-[#e8e4db] dark:border-white/10 text-[9px] font-bold text-[#706c64] dark:text-white/60">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        <div className="relative rounded-xl bg-[#1c1b18] p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto shadow-inner">
          <button
            type="button"
            onClick={() => copyText("cfg", cfg.copy, `${cfg.name} config copied`)}
            className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[10px] font-semibold text-white/80 hover:text-white transition cursor-pointer"
          >
            {copied === "cfg" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            <span>{copied === "cfg" ? "Copied" : "Copy"}</span>
          </button>
          <pre className="pr-16 text-white whitespace-pre-wrap break-all">{cfg.copy}</pre>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {cfg.deeplink && (
            <a
              href={cfg.deeplink}
              className="flex items-center gap-1.5 rounded-xl bg-[#1c1b18] dark:bg-white text-white dark:text-[#1c1b18] px-3.5 py-1.5 text-[11px] font-bold hover:opacity-90 transition active:scale-[0.98]"
            >
              <Zap size={12} />
              One-click install in {cfg.name}
            </a>
          )}
          <button
            type="button"
            onClick={testConnection}
            disabled={!hasKey || testing}
            title={!hasKey ? "Paste a key first" : "Verify the key against the live MCP server"}
            className="flex items-center gap-1.5 rounded-xl border border-[#e8e4db] dark:border-white/10 bg-white dark:bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold text-[#1c1b18] dark:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 transition cursor-pointer disabled:opacity-40"
          >
            {testing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {testing ? "Testing…" : "Test connection"}
          </button>
          {testResult && (
            <span
              className={cn(
                "text-[11px] font-semibold",
                testResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
              )}
            >
              {testResult.detail}
            </span>
          )}
        </div>

        {cfg.requiresOneLink && hasKey && !withKeyInUrl && (
          <button
            type="button"
            onClick={() => setWithKeyInUrl(true)}
            className="flex items-center gap-1.5 w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition cursor-pointer text-left"
          >
            <Zap size={12} className="shrink-0" />
            {cfg.name} needs the key in the URL — enable one-link mode
          </button>
        )}

        <p className="text-[10.5px] leading-relaxed text-[#8c887f] dark:text-white/50">
          Prefer the <code className="font-mono rounded bg-[#f8f6f0] dark:bg-white/10 px-1">Authorization</code> header where the client supports it.
          Keys are SHA-256 hashed server-side and can be revoked below at any time.
        </p>
      </div>
    </div>
  );
}
