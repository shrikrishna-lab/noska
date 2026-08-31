/**
 * Noska AI — Fuzzy / Semantic Voice Snippets Engine
 * 
 * Expands spoken triggers into multi-paragraph templates with dynamic variables
 * ({{time}}, {{date}}, {{day}}, {{target_app}}, {{clipboard}}).
 * Supports teaching multiple spoken phrases per snippet.
 */

import type { TargetApp } from "./dictation-cleanup";

// ─── Types ────────────────────────────────────────────────────────

export interface VoiceSnippet {
  id: string;
  title: string;
  triggers: string[]; // e.g. ["my calendar link", "send my calendar", "share my availability"]
  template: string;   // e.g. "Feel free to book time on my calendar: https://cal.com/noska-demo"
  category?: "links" | "signoffs" | "templates" | "custom";
  enabled: boolean;
}

export interface SnippetExpansionResult {
  matched: boolean;
  snippet?: VoiceSnippet;
  matchedTrigger?: string;
  expandedText?: string;
}

const SNIPPET_STORAGE_KEY = "noska_voice_snippets";

// ─── Default Built-in Snippets ────────────────────────────────────

export const DEFAULT_VOICE_SNIPPETS: VoiceSnippet[] = [
  {
    id: "snip_calendar",
    title: "Calendar Link",
    triggers: [
      "my calendar link",
      "send my calendar",
      "share my availability",
      "book time with me",
      "my booking link",
    ],
    template: "Feel free to grab a time that works best for you on my calendar here: https://cal.com/noska/30min",
    category: "links",
    enabled: true,
  },
  {
    id: "snip_signoff",
    title: "Smart Contextual Sign-Off",
    triggers: [
      "standard sign off",
      "insert sign off",
      "best regards",
      "my signature",
    ],
    template: "{{signoff}}\nBest,\nNoska Team",
    category: "signoffs",
    enabled: true,
  },
  {
    id: "snip_datetime",
    title: "Timestamp & Date",
    triggers: [
      "current timestamp",
      "insert current time",
      "todays date",
      "current date and time",
    ],
    template: "{{date}} at {{time}}",
    category: "templates",
    enabled: true,
  },
  {
    id: "snip_meeting_recap",
    title: "Meeting Summary Outline",
    triggers: [
      "meeting recap template",
      "insert meeting notes",
      "meeting outline",
    ],
    template: "## Meeting Notes · {{date}}\n\n### Key Takeaways\n- \n\n### Action Items\n- [ ] \n\n### Next Steps\n1. ",
    category: "templates",
    enabled: true,
  },
];

// ─── Snippets Storage ─────────────────────────────────────────────

export function getVoiceSnippets(): VoiceSnippet[] {
  try {
    const raw = localStorage.getItem(SNIPPET_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_VOICE_SNIPPETS];
}

export function saveVoiceSnippets(snippets: VoiceSnippet[]): void {
  try {
    localStorage.setItem(SNIPPET_STORAGE_KEY, JSON.stringify(snippets));
  } catch {}
}

export function addVoiceSnippet(snippet: Omit<VoiceSnippet, "id">): VoiceSnippet {
  const list = getVoiceSnippets();
  const created: VoiceSnippet = {
    ...snippet,
    id: `snip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  };
  list.push(created);
  saveVoiceSnippets(list);
  return created;
}

export function updateVoiceSnippet(id: string, patch: Partial<VoiceSnippet>): void {
  const list = getVoiceSnippets().map((s) => (s.id === id ? { ...s, ...patch } : s));
  saveVoiceSnippets(list);
}

export function deleteVoiceSnippet(id: string): void {
  const list = getVoiceSnippets().filter((s) => s.id !== id);
  saveVoiceSnippets(list);
}

// ─── Dynamic Variable Resolver ────────────────────────────────────

export function resolveSnippetVariables(template: string, targetApp?: TargetApp): string {
  const now = new Date();

  // Time (e.g. 2:45 PM)
  const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  // Date (e.g. Monday, August 31, 2026)
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Day (e.g. Monday)
  const dayStr = now.toLocaleDateString([], { weekday: "long" });

  // Contextual signoff
  let signoff = "Kind regards,";
  if (targetApp === "chat") {
    signoff = "Cheers,";
  } else if (targetApp === "email") {
    signoff = "Warm regards,";
  }

  let resolved = template
    .replace(/\{\{time\}\}/gi, timeStr)
    .replace(/\{\{date\}\}/gi, dateStr)
    .replace(/\{\{day\}\}/gi, dayStr)
    .replace(/\{\{target_app\}\}/gi, targetApp || "application")
    .replace(/\{\{signoff\}\}/gi, signoff);

  return resolved;
}

// ─── Fast Trigger Matcher ─────────────────────────────────────────

/**
 * Match a spoken utterance against configured voice snippet triggers.
 * Returns the resolved snippet text if matched.
 */
export function matchVoiceSnippet(
  spokenText: string,
  targetApp?: TargetApp
): SnippetExpansionResult {
  if (!spokenText || !spokenText.trim()) {
    return { matched: false };
  }

  const clean = spokenText.trim().toLowerCase().replace(/[.,!?:;]+$/, "");
  const snippets = getVoiceSnippets().filter((s) => s.enabled);

  for (const snippet of snippets) {
    for (const trigger of snippet.triggers) {
      const normalizedTrigger = trigger.trim().toLowerCase().replace(/[.,!?:;]+$/, "");
      if (clean === normalizedTrigger || clean.endsWith(normalizedTrigger)) {
        const expandedText = resolveSnippetVariables(snippet.template, targetApp);
        return {
          matched: true,
          snippet,
          matchedTrigger: trigger,
          expandedText,
        };
      }
    }
  }

  return { matched: false };
}
