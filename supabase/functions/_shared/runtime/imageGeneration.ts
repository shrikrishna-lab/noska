export type ServerImageProvider = "openai" | "gemini" | "openrouter" | "together" | "custom";

export interface ServerImageRequest {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  prompt: string;
  size?: string;
  quality?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface ServerImageResult {
  bytes: Uint8Array;
  mimeType: string;
  revisedPrompt?: string;
  provider: ServerImageProvider;
  model: string;
}

const DEFAULT_BASES: Record<Exclude<ServerImageProvider, "custom">, string> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  openrouter: "https://openrouter.ai/api/v1",
  together: "https://api.together.xyz/v1",
};

const REMOTE_HOSTS: Record<ServerImageProvider, string[]> = {
  openai: ["api.openai.com", "images.openai.com", "oaidalleapiprodscus.blob.core.windows.net"],
  gemini: ["generativelanguage.googleapis.com", "storage.googleapis.com", "lh3.googleusercontent.com"],
  openrouter: ["openrouter.ai", "cdn.openrouter.ai"],
  together: ["api.together.xyz", "together.ai", "cdn.together.xyz"],
  custom: [],
};

const MAX_PROMPT_LENGTH = 4_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 120_000;

function normalizeProvider(value: string): ServerImageProvider {
  const provider = String(value || "").trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(DEFAULT_BASES, provider)) return provider as Exclude<ServerImageProvider, "custom">;
  if (provider === "custom") return "custom";
  throw new Error(`Unsupported image provider: ${value}`);
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host.includes(":")) return host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

export function validateImageBaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(String(value || "").trim());
  } catch {
    throw new Error("Image provider base URL is invalid");
  }
  if (parsed.protocol !== "https:") throw new Error("Image provider base URL must use HTTPS");
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("Image provider base URL cannot contain credentials, query parameters, or fragments");
  if (isPrivateHost(parsed.hostname)) throw new Error("Image provider base URL cannot target a private or local host");
  return parsed.toString().replace(/\/+$/, "");
}

export function supportsServerImageGeneration(providerValue: string, model: string): boolean {
  const provider = String(providerValue || "").trim().toLowerCase();
  const id = String(model || "").trim().toLowerCase();
  if (!id) return false;
  if (provider === "custom") return true;
  if (provider === "openai") return /dall-e|gpt-image/.test(id);
  if (provider === "gemini") return /imagen|image/.test(id);
  if (provider === "together") return /flux|stable-diffusion|sdxl/.test(id);
  if (provider === "openrouter") return /image|imagen|flux|dall-e/.test(id);
  return false;
}

export function resolveImageBaseUrl(providerValue: string, configured?: string): string {
  const provider = normalizeProvider(providerValue);
  const configuredValue = String(configured || "").trim();
  if (provider === "custom") {
    if (!configuredValue) throw new Error("Custom image provider needs a base URL");
    return validateImageBaseUrl(configuredValue);
  }
  const base = validateImageBaseUrl(configuredValue || DEFAULT_BASES[provider]);
  const expectedHost = new URL(DEFAULT_BASES[provider]).hostname;
  if (new URL(base).hostname !== expectedHost) throw new Error(`Use the custom provider option for an alternate ${provider} base URL`);
  return base;
}

function normalizeMimeType(value: unknown): string {
  const mime = String(value || "").toLowerCase().split(";")[0].trim();
  if (mime.includes("png")) return "image/png";
  if (mime.includes("webp")) return "image/webp";
  if (mime.includes("gif")) return "image/gif";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "image/jpeg";
  return mime.startsWith("image/") ? mime : "";
}

function decodeBase64(value: string): Uint8Array {
  const normalized = String(value || "").replace(/^data:[^,]+,/, "").trim();
  if (!normalized || normalized.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 16) throw new Error("Generated image is too large");
  try {
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Generated image is too large");
    return bytes;
  } catch {
    throw new Error("Provider returned invalid image data");
  }
}

function isAllowedRemoteHost(provider: ServerImageProvider, hostname: string, baseUrl: string): boolean {
  const host = hostname.toLowerCase();
  if (host === new URL(baseUrl).hostname) return true;
  if (isPrivateHost(host)) return false;
  return REMOTE_HOSTS[provider].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, externalSignal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(Math.max(timeoutMs, 1_000), DEFAULT_TIMEOUT_MS));
  const abort = () => controller.abort();
  externalSignal?.addEventListener("abort", abort, { once: true });
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Image provider request timed out");
    throw error;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abort);
  }
}

async function readResponseBytes(response: Response): Promise<Uint8Array> {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) throw new Error("Generated image is too large");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Generated image is too large");
  return bytes;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (text.length > MAX_RESPONSE_BYTES) throw new Error("Image provider response is too large");
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object") throw new Error("Image provider returned an invalid response");
    return value as Record<string, unknown>;
  } catch {
    throw new Error("Image provider returned invalid JSON");
  }
}

function findRemoteUrl(payload: Record<string, unknown>): string | null {
  const data = Array.isArray(payload.data) ? payload.data[0] : null;
  const candidate = data && typeof data === "object" ? (data as Record<string, unknown>).url : payload.url;
  return typeof candidate === "string" && /^https:\/\//i.test(candidate) ? candidate : null;
}

function findBase64(payload: Record<string, unknown>): { value: string; mimeType: string; revisedPrompt?: string } | null {
  const data = Array.isArray(payload.data) ? payload.data[0] : null;
  const openAi = data && typeof data === "object" ? data as Record<string, unknown> : null;
  const openAiValue = openAi?.b64_json ?? openAi?.image_base64;
  if (typeof openAiValue === "string" && openAiValue) {
    return {
      value: openAiValue,
      mimeType: normalizeMimeType(openAi?.mime_type ?? openAi?.output_format) || "image/png",
      revisedPrompt: typeof openAi?.revised_prompt === "string" ? openAi.revised_prompt : undefined,
    };
  }

  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts = candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>).content : null;
    const partList = parts && typeof parts === "object" && Array.isArray((parts as Record<string, unknown>).parts) ? (parts as Record<string, unknown>).parts as unknown[] : [];
    for (const part of partList) {
      if (!part || typeof part !== "object") continue;
      const value = part as Record<string, unknown>;
      const inline = value.inlineData ?? value.inline_data;
      if (!inline || typeof inline !== "object") continue;
      const inlineRecord = inline as Record<string, unknown>;
      const dataValue = inlineRecord.data;
      if (typeof dataValue !== "string" || !dataValue) continue;
      return { value: dataValue, mimeType: normalizeMimeType(inlineRecord.mimeType ?? inlineRecord.mime_type) || "image/png" };
    }
  }
  return null;
}

export async function generateServerImage(request: ServerImageRequest): Promise<ServerImageResult> {
  const provider = normalizeProvider(request.provider);
  const model = String(request.model || "").trim();
  const prompt = String(request.prompt || "").trim();
  if (!model || model.length > 200) throw new Error("Image generation needs a valid model");
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) throw new Error("Image generation needs a prompt under 4,000 characters");
  const size = request.size ? String(request.size).trim() : "";
  const quality = request.quality ? String(request.quality).trim() : "";
  if (size && !/^[a-zA-Z0-9_-]{1,32}$/.test(size)) throw new Error("Image size is invalid");
  if (quality && !/^[a-zA-Z0-9_-]{1,32}$/.test(quality)) throw new Error("Image quality is invalid");
  const baseUrl = resolveImageBaseUrl(provider, request.baseUrl);
  const isGemini = provider === "gemini";
  const endpoint = isGemini
    ? `${baseUrl}/models/${encodeURIComponent(model.replace(/^models\//, ""))}:generateContent`
    : `${baseUrl}/images/generations`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (isGemini) headers["x-goog-api-key"] = request.apiKey;
  else headers.Authorization = `Bearer ${request.apiKey}`;
  const body = isGemini
    ? { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }
    : { model, prompt, n: 1, ...(size ? { size } : {}), ...(quality ? { quality } : {}), ...(provider === "openai" && /dall-e/i.test(model) ? { response_format: "b64_json" } : {}) };

  const response = await fetchWithTimeout(endpoint, { method: "POST", headers, body: JSON.stringify(body) }, request.timeoutMs ?? DEFAULT_TIMEOUT_MS, request.signal);
  if (!response.ok) {
    throw new Error(`Image provider request failed with status ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) throw new Error("Image provider returned HTML instead of JSON");
  const payload = await readJson(response);
  const base64 = findBase64(payload);
  if (base64) {
    const bytes = decodeBase64(base64.value);
    const mimeType = normalizeMimeType(base64.mimeType) || "image/png";
    return { bytes, mimeType, revisedPrompt: base64.revisedPrompt, provider, model };
  }

  const remoteUrl = findRemoteUrl(payload);
  if (remoteUrl) {
    const remote = new URL(remoteUrl);
    if (!isAllowedRemoteHost(provider, remote.hostname, baseUrl)) throw new Error("Image provider returned an untrusted image URL");
    const imageResponse = await fetchWithTimeout(remoteUrl, {}, request.timeoutMs ?? DEFAULT_TIMEOUT_MS, request.signal);
    if (!imageResponse.ok) throw new Error(`Image download failed with ${imageResponse.status}`);
    const mimeType = normalizeMimeType(imageResponse.headers.get("content-type"));
    if (!mimeType) throw new Error("Image provider returned a non-image response");
    return { bytes: await readResponseBytes(imageResponse), mimeType, provider, model };
  }

  throw new Error("Image provider returned no image data");
}
