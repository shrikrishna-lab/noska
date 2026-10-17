/**
 * Provider request routing for the ai-proxy edge-function relay.
 *
 * Why this exists: several upstream AI providers either send no CORS headers
 * at all (NVIDIA NIM) or block browser-originated calls, so a direct `fetch`
 * from the web app fails as a network TypeError. The relay lives in
 * supabase/functions/ai-proxy and forwards the call server-side.
 *
 * There used to be three copies of this logic (providers.ts, the discovery
 * adapters, and BaseAdapter.fetchWithRetry) and they disagreed on the target
 * URL:
 *
 *   - providers.ts         -> the real edge function URL
 *   - BaseAdapter.ts       -> same-origin `/api/proxy/<name>`
 *   - OpencodeZenModel…    -> same-origin `/api/proxy/opencode`
 *
 * The same-origin `/api/proxy/*` path only exists in the **Vite dev server**
 * (vite.config.js `server.proxy`). It is NOT a Vercel rewrite — `vercel.json`
 * only rewrites `/control` and the SPA catch-all `/(.*)` — so in production
 * every request to it fell through to `/index.html` and came back as HTML.
 * `GET /api/proxy/opencode/models` therefore returned the SPA shell with a
 * 200, `res.json()` threw, and OpenCode Zen model discovery never populated
 * the registry at all.
 *
 * Everything now resolves through this module so a provider's model list is
 * fetched from the real relay in every environment.
 */

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "";

export const AI_PROXY_BASE: string | null = supabaseUrl
  ? `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/ai-proxy`
  : null;

export const AI_PROXY_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "";

/** Upstream base URL -> relay name. Keys must match `UPSTREAM` in the edge function. */
export const PROVIDER_PROXY_TARGETS: Record<string, string> = {
  "https://opencode.ai/zen/v1": "opencode",
  "https://openrouter.ai/api/v1": "openrouter",
  "https://api.anthropic.com/v1": "anthropic",
  "https://api.openai.com/v1": "openai",
  "https://generativelanguage.googleapis.com/v1beta": "gemini",
  "https://api.groq.com/openai/v1": "groq",
  "https://api.deepseek.com/v1": "deepseek",
  "https://api.mistral.ai/v1": "mistral",
  "https://api.together.xyz/v1": "together",
  "https://api.x.ai/v1": "xai",
  "https://integrate.api.nvidia.com/v1": "nvidia",
};

export interface ProxiedRequest {
  /** Relay URL to call, or null when the provider has no relay and the caller should go direct. */
  url: string | null;
  /** Headers to send to the relay. The provider key moves to `x-noska-provider-key`. */
  headers: Record<string, string>;
}

/**
 * Rewrite headers for a relay hop: the BYOK provider key must travel in
 * `x-noska-provider-key` (the edge function reads only that header and never
 * logs it), and `Authorization` is re-pointed at the Supabase gateway's anon
 * key so the function's own gateway check passes.
 */
export function toProxyHeaders(headers: HeadersInit | Record<string, string>): Record<string, string> {
  const h = new Headers(headers as HeadersInit);
  const providerKey = h.get("Authorization") || h.get("x-api-key") || h.get("x-goog-api-key") || "";
  h.delete("Authorization");
  if (providerKey) h.set("x-noska-provider-key", providerKey.replace(/^Bearer\s+/i, ""));
  if (AI_PROXY_ANON_KEY) h.set("Authorization", `Bearer ${AI_PROXY_ANON_KEY}`);
  const out: Record<string, string> = {};
  h.forEach((v, k) => { out[k] = v; });
  return out;
}

/**
 * Map an upstream provider URL onto the relay. Returns null when the URL is
 * not a proxied provider, or when the relay is unavailable (missing
 * VITE_SUPABASE_URL) — callers must then go direct.
 */
export function resolveProxiedUrl(
  upstreamUrl: string,
  method: string = "GET",
  headers: HeadersInit | Record<string, string> = {},
): ProxiedRequest | null {
  if (!AI_PROXY_BASE) return null;
  if (upstreamUrl.includes("/functions/v1/ai-proxy")) return null; // already proxied
  for (const [base, name] of Object.entries(PROVIDER_PROXY_TARGETS)) {
    if (upstreamUrl.startsWith(base)) {
      const rest = upstreamUrl.slice(base.length); // "/models", "/chat/completions", ...
      return {
        url: `${AI_PROXY_BASE}/${name}${rest}`,
        headers: toProxyHeaders(headers),
      };
    }
  }
  return null;
}

/** True when `url` targets the relay rather than the provider. */
export function isProxiedUrl(url: string): boolean {
  return url.includes("/functions/v1/ai-proxy") || url.includes("/api/proxy/");
}