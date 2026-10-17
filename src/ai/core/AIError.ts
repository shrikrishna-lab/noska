/**
 * Noska AI — Structured Error System
 * 
 * Replaces all mockResponse() error masking with proper typed errors.
 * Every provider error flows through this class so the UI, retry logic,
 * and diagnostics can make informed decisions.
 */

// ─── Error Types ────────────────────────────────────────────────────────────

export type AIErrorType =
  | "auth"            // 401/403 — invalid or missing API key
  | "not_found"       // 404 — model or endpoint not found
  | "rate_limit"      // 429 — too many requests
  | "context_length"  // 413 — context window / token limit exceeded
  | "invalid_request" // 400 — malformed request, unsupported params
  | "server"          // 500-504 — provider-side failure
  | "network"         // connection refused, DNS, timeout
  | "timeout"         // our own timeout fired
  | "cancelled"       // user or system aborted
  | "stream"          // stream parsing failure mid-generation
  | "config"          // provider not configured
  | "unsupported"     // feature not supported by this provider/model
  | "unknown";        // unclassifiable

// ─── AIError Class ──────────────────────────────────────────────────────────

export class AIError extends Error {
  readonly type: AIErrorType;
  readonly provider: string;
  readonly model: string;
  readonly statusCode: number | null;
  readonly retryable: boolean;
  readonly userMessage: string;
  readonly technicalMessage: string;
  /** Provider-returned request ID for support escalation */
  readonly requestId: string | null;
  /** Retry-After header value in seconds, if provider sent one */
  readonly retryAfterSeconds: number | null;

  constructor(opts: {
    type: AIErrorType;
    provider: string;
    model?: string;
    statusCode?: number | null;
    retryable?: boolean;
    userMessage: string;
    technicalMessage?: string;
    requestId?: string | null;
    retryAfterSeconds?: number | null;
    cause?: Error;
  }) {
    super(opts.userMessage);
    this.name = "AIError";
    this.type = opts.type;
    this.provider = opts.provider;
    this.model = opts.model || "";
    this.statusCode = opts.statusCode ?? null;
    this.retryable = opts.retryable ?? false;
    this.userMessage = opts.userMessage;
    this.technicalMessage = opts.technicalMessage || opts.userMessage;
    this.requestId = opts.requestId ?? null;
    this.retryAfterSeconds = opts.retryAfterSeconds ?? null;
    if (opts.cause) this.cause = opts.cause;
  }

  /** Safe serialization — never includes API keys or credentials */
  toJSON() {
    return {
      type: this.type,
      provider: this.provider,
      model: this.model,
      statusCode: this.statusCode,
      retryable: this.retryable,
      userMessage: this.userMessage,
      requestId: this.requestId,
    };
  }
}

// ─── Error Classification ───────────────────────────────────────────────────

/** Classify an HTTP status code + error body into an AIError */
export function classifyProviderError(
  provider: string,
  model: string,
  statusCode: number,
  errorBody: string,
  response?: Response
): AIError {
  const requestId = response?.headers?.get("x-request-id") || null;
  const retryAfterRaw = response?.headers?.get("retry-after");
  const retryAfterSeconds = retryAfterRaw ? parseInt(retryAfterRaw, 10) || null : null;

  // Truncate error body to prevent giant payloads
  const body = (errorBody || "").slice(0, 500);

  if (statusCode === 401 || statusCode === 403) {
    if (body.includes("CreditsError") || body.includes("No payment method") || body.includes("insufficient_quota")) {
      return new AIError({
        type: "auth",
        provider,
        model,
        statusCode,
        retryable: false,
        userMessage: `${provider}: No credits on account for this model. Add credits at ${provider === "OpenCode Zen" ? "opencode.ai/zen" : "the provider console"}, then retry.`,
        technicalMessage: body,
        requestId,
      });
    }
    if (body.includes("FreeTierError") || /free tier/i.test(body)) {
      // Verified against the live API: every "*-free" model except space-bunny-free
      // (and big-pickle) returns
      // 403 {"type":"error","error":{"type":"FreeTierError","message":"OpenCode's
      // free tier can only be used from within OpenCode"}}
      // The Zen docs confirm this is intentional — the free models "are
      // available on OpenCode for a limited time" as a feedback programme.
      // The key is valid and present, so telling the user to re-enter it sends
      // them in circles; say what is actually true instead.
      const gatedForThirdParty = /can only be used from within opencode/i.test(body);
      return new AIError({
        type: "auth",
        provider,
        model,
        statusCode,
        retryable: false,
        userMessage: gatedForThirdParty
          ? `${provider}: OpenCode's free tier models are served only inside the OpenCode app, so "${model}" cannot be called from Noska even with a valid API key. Pick a model that is not marked [Free], or add credit at ${provider === "OpenCode Zen" ? "opencode.ai/zen" : "the provider console"}.`
          : `${provider}: Free-tier access was rejected. Make sure your API key is set in Settings → AI, or switch to a paid model.`,
        technicalMessage: body,
        requestId,
      });
    }
    if (body.includes("Missing API key") || body.includes("missing x-noska-provider-key")) {
      return new AIError({
        type: "auth",
        provider,
        model,
        statusCode,
        retryable: false,
        userMessage: `${provider}: No API key was sent with the request. Re-enter your key in Settings → AI.`,
        technicalMessage: body,
        requestId,
      });
    }
    if (/model.{0,120}not supported|not supported.{0,120}model|unsupported model|unknown model|no such model|model.{0,60}not found|model.{0,60}does not exist/i.test(body)) {
      return new AIError({
        type: "not_found",
        provider,
        model,
        statusCode,
        retryable: false,
        userMessage: `${provider}: Model "${model}" is not available on this endpoint. Pick another model in Settings → AI.`,
        technicalMessage: body,
        requestId,
      });
    }
    if (/invalid[\s_-]*or[\s_-]*expired[\s_-]*api[\s_-]*key|invalid[\s_-]*api[\s_-]*key|incorrect[\s_-]*api[\s_-]*key|api[\s_-]*key[\s_-]*(is[\s_-]*)?invalid|unauthorized/i.test(body) ||
        !body.trim()) {
      return new AIError({
        type: "auth",
        provider,
        model,
        statusCode,
        retryable: false,
        userMessage: `${provider}: Invalid or expired API key. Check your key in Settings → AI.`,
        technicalMessage: body,
        requestId,
      });
    }
    return new AIError({
      type: "auth",
      provider,
      model,
      statusCode,
      retryable: false,
      userMessage: `${provider}: Request rejected (${statusCode}) — ${extractErrorMessage(body)}`,
      technicalMessage: body,
      requestId,
    });
  }

  if (statusCode === 404) {
    return new AIError({
      type: "not_found",
      provider,
      model,
      statusCode,
      retryable: false,
      userMessage: `${provider}: Model "${model}" is not available on this endpoint.`,
      technicalMessage: body,
      requestId,
    });
  }

  // Verified against the live API: a retired model returns
  // 410 {"type":"error","error":{"type":"ModelDeprecated", ...},
  //       "metadata":{"model":"...","replacement":"..."}}
  // The replacement id is machine-readable — surface it instead of a dead end.
  if (statusCode === 410 || body.includes("ModelDeprecated")) {
    const replacement = extractJsonString(body, "replacement") ||
      (body.includes("mimo-v2.6-flash-free") ? "mimo-v2.6-flash-free" : null);
    return new AIError({
      type: "not_found",
      provider,
      model,
      statusCode,
      retryable: false,
      userMessage: replacement
        ? `${provider}: Model "${model}" has been retired. Switch to "${replacement}" in Settings → AI.`
        : `${provider}: Model "${model}" has been retired and is no longer available. Pick another model in Settings → AI.`,
      technicalMessage: body,
      requestId,
    });
  }

  // Verified against the live API: 402 "Upstream request failed: Insufficient
  // account funds". Without this branch it fell through to the generic 4xx
  // handler and surfaced as a vague "Request rejected".
  if (statusCode === 402 || /insufficient (account )?funds|insufficient_quota|payment required/i.test(body)) {
    return new AIError({
      type: "auth",
      provider,
      model,
      statusCode,
      retryable: false,
      userMessage: `${provider}: Your account has no credit available for "${model}". Add credit at ${provider === "OpenCode Zen" ? "opencode.ai/zen" : "the provider console"}, then retry.`,
      technicalMessage: body,
      requestId,
    });
  }

  if (statusCode === 429) {
    const isFreeLimit = body.includes("FreeUsageLimitError") || body.includes("free");
    return new AIError({
      type: "rate_limit",
      provider,
      model,
      statusCode,
      retryable: !isFreeLimit,
      userMessage: isFreeLimit
        ? `${provider}: Free tier rate limit reached. Please wait a moment or try another free model.`
        : `${provider}: Rate limit reached. Retrying automatically…`,
      technicalMessage: body,
      requestId,
      retryAfterSeconds,
    });
  }

  if (statusCode === 413) {
    return new AIError({
      type: "context_length",
      provider,
      model,
      statusCode,
      retryable: false,
      userMessage: `${provider}: Request entity too large (413). Shorten prompt or switch model.`,
      technicalMessage: body,
      requestId,
    });
  }

  if (statusCode === 400 || statusCode === 422) {
    if (body.includes("Model is unavailable") || body.includes("Upstream request failed")) {
      return new AIError({
        type: "server",
        provider,
        model,
        statusCode,
        retryable: false,
        // Do not steer users toward a [Free] model here: verified against the
        // live API, Zen's free tier is reserved for the OpenCode client and
        // answers 403 from anywhere else.
        userMessage: `${provider}: Model "${model}" is not currently served by this provider. Pick another model in Settings → AI.`,
        technicalMessage: body,
        requestId,
      });
    }
    return new AIError({
      type: "invalid_request",
      provider,
      model,
      statusCode,
      retryable: false,
      userMessage: `${provider}: Request rejected — ${extractErrorMessage(body)}`,
      technicalMessage: body,
      requestId,
    });
  }

  if (statusCode >= 500 && statusCode <= 504) {
    return new AIError({
      type: "server",
      provider,
      model,
      statusCode,
      retryable: true,
      userMessage: `${provider}: Server error (${statusCode}). Retrying…`,
      technicalMessage: body,
      requestId,
    });
  }

  return new AIError({
    type: "unknown",
    provider,
    model,
    statusCode,
    retryable: statusCode >= 500,
    userMessage: `${provider}: Unexpected error (${statusCode}).`,
    technicalMessage: body,
    requestId,
  });
}

/** Wrap a network/fetch error into AIError */
export function classifyNetworkError(provider: string, model: string, err: Error): AIError {
  const msg = err.message || "";

  if (err.name === "AbortError" || msg.includes("aborted")) {
    return new AIError({
      type: "cancelled",
      provider,
      model,
      retryable: false,
      userMessage: "Generation stopped.",
      technicalMessage: msg,
      cause: err,
    });
  }

  if (msg.includes("timeout") || msg.includes("Timeout")) {
    return new AIError({
      type: "timeout",
      provider,
      model,
      retryable: true,
      userMessage: `${provider}: Request timed out. Retrying…`,
      technicalMessage: msg,
      cause: err,
    });
  }

  // Local model specific connection failure messages
  const lowerProv = provider.toLowerCase();
  if (lowerProv.includes("ollama")) {
    return new AIError({
      type: "network",
      provider,
      model,
      retryable: false,
      userMessage: "Ollama is not running locally. Please start Ollama on your machine (http://localhost:11434) to use local models.",
      technicalMessage: msg,
      cause: err,
    });
  }
  if (lowerProv.includes("lm studio") || lowerProv.includes("lmstudio")) {
    return new AIError({
      type: "network",
      provider,
      model,
      retryable: false,
      userMessage: "LM Studio local server is not running. Please start the local server in LM Studio (http://localhost:1234) to use local models.",
      technicalMessage: msg,
      cause: err,
    });
  }

  return new AIError({
    type: "network",
    provider,
    model,
    retryable: true,
    userMessage: `${provider}: Connection failed — check your network connection.`,
    technicalMessage: msg,
    cause: err,
  });
}

/** Create an AIError for unconfigured provider */
export function configError(provider: string): AIError {
  return new AIError({
    type: "config",
    provider,
    retryable: false,
    userMessage: `${provider}: Not configured. Add your API key in Settings → AI.`,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Pull a string field out of a JSON error body without throwing on non-JSON. */
function extractJsonString(body: string, field: string): string | null {
  try {
    const json = JSON.parse(body);
    const value = json?.[field] ?? json?.metadata?.[field] ?? json?.error?.[field];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

/** Try to extract a readable error message from JSON or text bodies */
function extractErrorMessage(body: string): string {
  try {
    const json = JSON.parse(body);
    return (
      json.error?.message ||
      json.message ||
      json.detail ||
      json.error?.type ||
      body.slice(0, 150)
    );
  } catch {
    return body.slice(0, 150);
  }
}

/** Check if an error is worth retrying */
export function isRetryable(err: unknown): boolean {
  if (err instanceof AIError) return err.retryable;
  if (err instanceof Error) {
    const msg = err.message || "";
    return /429|500|502|503|504|timeout|ECONNRESET|ENOTFOUND|fetch failed/i.test(msg);
  }
  return false;
}

/** Check if user cancelled */
export function isCancelled(err: unknown): boolean {
  if (err instanceof AIError) return err.type === "cancelled";
  if (err instanceof Error) return err.name === "AbortError";
  return false;
}
