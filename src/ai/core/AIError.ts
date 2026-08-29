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
        userMessage: `${provider}: No credits on account for this model. Select a [Free] model (like Nemotron 3.5 Lightning [Free]) or add credits at ${provider === "OpenCode Zen" ? "opencode.ai/zen" : "provider console"}.`,
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
      userMessage: `${provider}: Invalid or expired API key. Check your key in Settings → AI.`,
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
        userMessage: `${provider}: Model "${model}" is temporarily unavailable upstream. Try Nemotron 3.5 Lightning (Free) or Laguna S 2.1 (Free).`,
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
