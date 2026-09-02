/** Deterministic, non-destructive commands understood by Noska Voice Agent. */
export type VoiceAgentCommand =
  | { kind: "open-page"; query: string }
  | { kind: "write"; text: string }
  | { kind: "create-page"; title: string }
  | { kind: "search-pages"; query: string }
  | { kind: "configure-provider"; providerId: string; providerName: string }
  | { kind: "open-agents" }
  | { kind: "open-automations" }
  | { kind: "create-agent"; name: string; instructions: string }
  | { kind: "create-automation"; name: string; instructions: string }
  | { kind: "diagnose" }
  | { kind: "report-bug"; description: string }
  | { kind: "open-settings" }
  | { kind: "open-ai" }
  | { kind: "unknown"; raw: string };

function clean(value: string) { return value.trim().replace(/[.?!]+$/, "").trim(); }

export function parseVoiceAgentCommand(raw: string): VoiceAgentCommand {
  const text = clean(raw);
  if (/^(?:set|configure|add|change)\s+(?:my\s+)?(?:opencode|open code)(?:\s+zen)?\s+(?:api\s*)?key$/i.test(text)) {
    return { kind: "configure-provider", providerId: "opencode_zen", providerName: "OpenCode Zen" };
  }
  if (/^(?:open|show)\s+(?:the\s+)?(?:settings|preferences)$/i.test(text)) return { kind: "open-settings" };
  if (/^(?:open|show|ask)\s+(?:the\s+)?(?:ai|assistant|noska ai)$/i.test(text)) return { kind: "open-ai" };
  if (/^(?:open|show)\s+(?:the\s+)?agents?$/i.test(text)) return { kind: "open-agents" };
  if (/^(?:open|show)\s+(?:the\s+)?automations?$/i.test(text)) return { kind: "open-automations" };
  if (/^(?:run|check|show)\s+(?:a\s+)?(?:local\s+)?(?:diagnostics|health|logs?)$/i.test(text)) return { kind: "diagnose" };
  let match = text.match(/^(?:report|file|create)\s+(?:a\s+)?bug(?:\s*[:,-]?\s*(.*))?$/i);
  if (match) return { kind: "report-bug", description: clean(match[1] || "") };
  match = text.match(/^(?:create|make|build)\s+(?:a\s+)?agent(?:\s+(?:called|named))?\s+(.+?)(?:\s+(?:to|that)\s+(.+))?$/i);
  if (match?.[1]) return { kind: "create-agent", name: clean(match[1]), instructions: clean(match[2] || "Assist with the workspace and report progress clearly") };
  match = text.match(/^(?:create|make|build)\s+(?:an?\s+)?automation(?:\s+(?:called|named))?\s+(.+?)(?:\s+(?:to|that)\s+(.+))?$/i);
  if (match?.[1]) return { kind: "create-automation", name: clean(match[1]), instructions: clean(match[2] || "Run this workflow when manually started") };
  match = text.match(/^(?:open|go to|show)\s+(?:the\s+)?(?:page|note|document)?\s*(.+)$/i);
  if (match?.[1]) return { kind: "open-page", query: clean(match[1]) };
  match = text.match(/^(?:write|add|insert|type)\s+(?:this|there|in (?:this|the) (?:page|note))?\s*[:, -]*\s*(.+)$/i);
  if (match?.[1]) return { kind: "write", text: clean(match[1]) };
  match = text.match(/^(?:create|make|new)\s+(?:a\s+)?(?:page|note|document)(?:\s+(?:called|named|titled))?\s*(.+)?$/i);
  if (match) return { kind: "create-page", title: clean(match[1] || "New page") };
  match = text.match(/^(?:find|search for|search)\s+(?:the\s+)?(?:page|note|document)?\s*(.+)$/i);
  if (match?.[1]) return { kind: "search-pages", query: clean(match[1]) };
  return { kind: "unknown", raw: text };
}

export function scorePageName(query: string, title: string): number {
  const target = query.toLocaleLowerCase().trim();
  const candidate = title.toLocaleLowerCase().trim();
  if (!target || !candidate) return 0;
  if (candidate === target) return 100;
  if (candidate.startsWith(target)) return 85;
  if (candidate.includes(target)) return 70;
  const targetWords = new Set(target.split(/\s+/));
  const overlap = candidate.split(/\s+/).filter((word) => targetWords.has(word)).length;
  return overlap ? Math.round((overlap / targetWords.size) * 60) : 0;
}
