/**
 * Noska Intelligence — Agent Memory
 *
 * Controlled, per-agent memory separate from user memory and workspace data.
 * Agents may remember preferences, execution metadata, and workspace facts
 * under their own namespace. Users can inspect and clear it from the agent
 * detail view. Stored in localStorage (workspace-local by design); entries
 * are size-capped and importance-ranked so memory never grows unbounded.
 */

const MAX_ENTRIES = 50;
const MAX_VALUE_CHARS = 2000;

export interface AgentMemoryEntry {
  key: string;
  value: string;
  category: "preference" | "fact" | "execution" | "state";
  importance: number; // 0..1
  updatedAt: string;
}

function storageKey(agentId: string): string {
  return `noska_agent_memory_${agentId}`;
}

export function getAgentMemory(agentId: string): AgentMemoryEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(agentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

export function rememberFact(
  agentId: string,
  key: string,
  value: unknown,
  options: { category?: AgentMemoryEntry["category"]; importance?: number } = {}
): void {
  const entries = getAgentMemory(agentId);
  const entry: AgentMemoryEntry = {
    key: key.slice(0, 80),
    value: typeof value === "string" ? value.slice(0, MAX_VALUE_CHARS) : JSON.stringify(value).slice(0, MAX_VALUE_CHARS),
    category: options.category || "fact",
    importance: Math.min(Math.max(options.importance ?? 0.5, 0), 1),
    updatedAt: new Date().toISOString(),
  };
  const idx = entries.findIndex((e) => e.key === entry.key);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  // Evict lowest-importance oldest when over cap
  while (entries.length > MAX_ENTRIES) {
    let minIdx = 0;
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].importance < entries[minIdx].importance) minIdx = i;
    }
    entries.splice(minIdx, 1);
  }
  try {
    localStorage.setItem(storageKey(agentId), JSON.stringify(entries));
  } catch { /* storage full — drop silently */ }
}

export function recallContext(agentId: string, maxEntries = 8): string {
  const entries = getAgentMemory(agentId)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, maxEntries);
  if (entries.length === 0) return "";
  return `## Agent Memory\n${entries.map((e) => `- ${e.key}: ${e.value}`).join("\n")}`;
}

export function forgetFact(agentId: string, key: string): void {
  const entries = getAgentMemory(agentId).filter((e) => e.key !== key);
  try {
    localStorage.setItem(storageKey(agentId), JSON.stringify(entries));
  } catch { /* ignore */ }
}

export function clearAgentMemory(agentId: string): void {
  try {
    localStorage.removeItem(storageKey(agentId));
  } catch { /* ignore */ }
}
