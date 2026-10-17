/**
 * Shared helpers for the model-discovery adapters in this folder.
 *
 * These adapters run at app start (AIManager.init -> ModelRegistry.refreshAll)
 * in the browser, so every one of them needs the same two things:
 *
 *  1. A request path that survives CORS. Go direct first; fall back to the
 *     ai-proxy edge function only when the direct call throws. Discovery used
 *     to rewrite to a same-origin "/api/proxy/<name>" path, which exists only
 *     in the Vite dev server — in production vercel.json's catch-all served
 *     index.html, so `res.json()` threw and the catalog never loaded.
 *
 *  2. A bare upstream model id. Catalogs and the registry store composite ids
 *     ("opencode_zen/claude-sonnet-5"); protocol routing matches on
 *     `startsWith`, so a composite id silently selects the wrong endpoint.
 */

import { resolveProxiedUrl } from "../../core/providerProxy";

export type DiscoveryResult =
  | { ok: true; json: any }
  | { ok: false; status: number; error: string };

/**
 * GET `url`, falling back to the ai-proxy relay when the direct call fails
 * with a network/CORS error. Never throws — callers decide whether a failure
 * is fatal or should degrade to a bundled snapshot.
 */
export async function fetchJsonViaProxy(
  url: string,
  headers: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<DiscoveryResult> {
  const attempt = async (
    target: string,
    hdrs: Record<string, string>,
  ): Promise<{ status: number; json?: any; error: string }> => {
    try {
      const res = await fetch(target, { method: "GET", headers: hdrs, signal });
      if (!res.ok) return { status: res.status, error: `HTTP ${res.status}` };
      return { status: res.status, json: await res.json(), error: "" };
    } catch (err: unknown) {
      // status 0 marks a transport/CORS failure, which is the only case the
      // relay can possibly fix. A 4xx/5xx is a real answer from the provider.
      return { status: 0, error: err instanceof Error ? err.message : "network error" };
    }
  };

  const direct = await attempt(url, headers);
  if (direct.status >= 200 && direct.status < 300 && direct.json !== undefined) {
    return { ok: true, json: direct.json };
  }

  const proxied = resolveProxiedUrl(url, "GET", headers);
  if (proxied?.url && direct.status === 0) {
    const viaRelay = await attempt(proxied.url, proxied.headers);
    if (viaRelay.status >= 200 && viaRelay.status < 300 && viaRelay.json !== undefined) {
      return { ok: true, json: viaRelay.json };
    }
    if (viaRelay.status !== 0) {
      return { ok: false, status: viaRelay.status, error: viaRelay.error };
    }
    return { ok: false, status: 0, error: viaRelay.error || direct.error };
  }

  return { ok: false, status: direct.status, error: direct.error };
}

const KNOWN_PROVIDER_IDS = new Set([
  "opencode_zen", "opencode", "openrouter", "anthropic", "openai", "gemini",
  "groq", "deepseek", "mistral", "together", "xai", "nvidia", "ollama",
  "lmstudio", "zen",
]);

/**
 * Strip a registry/adapter composite prefix so the value can be matched
 * against protocol rules and sent upstream as-is.
 *
 * Only a *known* provider segment is stripped — OpenRouter ids legitimately
 * look like "vendor/model", so an unknown prefix must survive untouched.
 */
export function stripModelPrefixForRequest(modelId: string): string {
  if (!modelId) return "";
  let id = modelId.trim();
  const colon = id.indexOf(":");
  if (colon > 0 && KNOWN_PROVIDER_IDS.has(id.slice(0, colon).toLowerCase())) {
    id = id.slice(colon + 1);
  }
  const slash = id.indexOf("/");
  if (slash > 0 && KNOWN_PROVIDER_IDS.has(id.slice(0, slash).toLowerCase())) {
    id = id.slice(slash + 1);
  }
  return id.replace(/^models\//i, "");
}