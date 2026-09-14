/**
 * Web search for the Noska AI agent — powered by Tavily (tavily.com).
 *
 * The user supplies their own free API key (stored locally, never synced),
 * so the tool is fully functional only after that opt-in. Direct browser
 * calls work: api.tavily.com sends CORS headers.
 */

export const TAVILY_KEY_STORAGE = "noska_tavily_key";

export function getTavilyKey(): string {
  try {
    const stored = localStorage.getItem(TAVILY_KEY_STORAGE);
    if (stored?.trim()) return stored.trim();
  } catch { /* ignore */ }
  return (import.meta.env.VITE_TAVILY_API_KEY as string | undefined)?.trim() || "";
}

export function hasWebSearch(): boolean {
  return Boolean(getTavilyKey());
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const q = String(query || "").trim();
  if (!q) throw new Error("web_search needs a query");
  const key = getTavilyKey();
  if (!key) {
    throw new Error(
      'Web search needs a free Tavily API key — get one at tavily.com and add it in Settings → Noska AI → Web Search.'
    );
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      query: q,
      max_results: Math.min(Math.max(Number(maxResults) || 5, 1), 10),
      search_depth: "basic",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const detail = res.status === 401 || res.status === 403
      ? "the API key was rejected — check Settings → Noska AI → Web Search"
      : body.slice(0, 200);
    throw new Error(`Web search failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const results: WebSearchResult[] = (Array.isArray(data?.results) ? data.results : [])
    .map((r: Record<string, unknown>) => ({
      title: String(r.title || ""),
      url: String(r.url || ""),
      snippet: String(r.content || "").slice(0, 400),
    }))
    .filter((r: WebSearchResult) => r.title || r.snippet);
  return results;
}
