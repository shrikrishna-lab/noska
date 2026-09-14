// Supabase Edge Function: ai-proxy
//
// Streaming BYOK relay for AI providers that block direct browser calls
// (NVIDIA NIM sends no Access-Control-Allow-Origin; Anthropic needs a
// special opt-in header; corporate networks differ). The client always
// tries the provider directly first and only falls back here on network
// failure, so this function never sees traffic that already works.
//
// Security model:
//  - Strict upstream allow-list (no open relay)
//  - Bring-your-own-key: the caller's provider key arrives in the
//    x-noska-provider-key header and is NEVER logged or persisted
//  - No secrets stored server-side; JWT verification is disabled so the
//    CORS preflight (OPTIONS) always passes
//  - Response bodies (including SSE streams) are passed through untouched
//    with permissive CORS headers so the browser can read them

const UPSTREAM: Record<string, { base: string; auth: "bearer" | "x-api-key" | "x-goog" }> = {
  openrouter: { base: "https://openrouter.ai/api/v1", auth: "bearer" },
  anthropic: { base: "https://api.anthropic.com/v1", auth: "x-api-key" },
  openai: { base: "https://api.openai.com/v1", auth: "bearer" },
  gemini: { base: "https://generativelanguage.googleapis.com/v1beta", auth: "x-goog" },
  groq: { base: "https://api.groq.com/openai/v1", auth: "bearer" },
  deepseek: { base: "https://api.deepseek.com/v1", auth: "bearer" },
  mistral: { base: "https://api.mistral.ai/v1", auth: "bearer" },
  together: { base: "https://api.together.xyz/v1", auth: "bearer" },
  xai: { base: "https://api.x.ai/v1", auth: "bearer" },
  nvidia: { base: "https://integrate.api.nvidia.com/v1", auth: "bearer" },
  opencode: { base: "https://opencode.ai/zen/v1", auth: "bearer" },
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...CORS_HEADERS,
        // Echo requested headers — provider SDKs send varied ones.
        "Access-Control-Allow-Headers": req.headers.get("Access-Control-Request-Headers") ??
          "authorization, content-type, x-noska-provider-key, x-api-key, anthropic-version, accept",
      },
    });
  }

  if (req.method !== "POST") {
    return json(405, { error: "ai-proxy: POST only" });
  }

  // Path: /functions/v1/ai-proxy/<name>/<rest...>
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segments.indexOf("ai-proxy");
  const name = idx >= 0 ? segments[idx + 1] : undefined;
  const rest = idx >= 0 ? segments.slice(idx + 2).join("/") : "";
  const upstream = name ? UPSTREAM[name] : undefined;

  if (!upstream) {
    return json(404, { error: `ai-proxy: unknown provider '${name ?? ""}'` });
  }

  const providerKey = (req.headers.get("x-noska-provider-key") || "").trim();
  if (!providerKey) {
    return json(401, { error: "ai-proxy: missing x-noska-provider-key header" });
  }

  const headers = new Headers();
  if (upstream.auth === "bearer") headers.set("Authorization", `Bearer ${providerKey}`);
  else if (upstream.auth === "x-api-key") headers.set("x-api-key", providerKey);
  else headers.set("x-goog-api-key", providerKey);

  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const accept = req.headers.get("accept");
  if (accept) headers.set("Accept", accept);
  // Pass through provider-specific optional headers when present.
  for (const h of ["anthropic-version", "anthropic-dangerous-direct-browser-access", "http-referer", "x-title"]) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }

  const target = `${upstream.base}/${rest}${new URL(req.url).search}`;
  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(target, {
      method: "POST",
      headers,
      body: await req.text(),
    });
  } catch (err) {
    return json(502, { error: `ai-proxy: upstream unreachable: ${err instanceof Error ? err.message : "unknown"}` });
  }

  const resHeaders = new Headers(CORS_HEADERS);
  resHeaders.set(
    "Content-Type",
    upstreamRes.headers.get("content-type") ?? "application/json",
  );
  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: resHeaders,
  });
});
