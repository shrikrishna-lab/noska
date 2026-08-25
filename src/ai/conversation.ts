/**
 * Noska Intelligence — Conversation State
 *
 * Maintains lightweight, ephemeral conversation understanding: what topics
 * and pages have been discussed, what "that page" most plausibly refers to,
 * and semantic chat titles. Nothing here is persistent memory — this is
 * per-conversation working context.
 */

import { aiManager } from "./AIManager";

export interface ConversationTurn {
  role: string;
  content?: string;
  text?: string;
}

export interface ConversationState {
  /** Page titles mentioned in recent messages (most recent first) */
  mentionedPages: string[];
  /** Topic keywords from the last assistant answer */
  lastTopic: string;
  /** The user's last substantive request (skips meta messages) */
  lastUserRequest: string;
  turnCount: number;
}

function msgText(m: ConversationTurn): string {
  return String((m.text || m.content || "")).trim();
}

/** Extract working conversation state from the message history. */
export function extractConversationState(messages: ConversationTurn[]): ConversationState {
  const turns = (messages || []).filter((m) => m.role === "user" || m.role === "assistant");
  const state: ConversationState = { mentionedPages: [], lastTopic: "", lastUserRequest: "", turnCount: turns.length };

  // Walk backwards; collect up to 5 distinct capitalized-title-like mentions
  const seen = new Set<string>();
  for (let i = turns.length - 1; i >= 0 && seen.size < 5; i--) {
    const text = msgText(turns[i]);
    if (!text) continue;
    // Title-ish phrases: "Project Phoenix", quoted names, [[wikilinks]]
    const candidates = [
      ...(text.match(/\[\[([^\]]+)\]\]/g) || []).map((w) => w.replace(/\[\[|\]\]/g, "")),
      ...(text.match(/"([^"]{3,60})"/g) || []).map((q) => q.replace(/"/g, "")),
      ...(text.match(/\b([A-Z][a-zA-Z0-9]+(?: [A-Z][a-zA-Z0-9]+)+)\b/g) || []),
    ];
    for (const c of candidates) {
      const key = c.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        state.mentionedPages.push(c);
      }
    }
    if (!state.lastTopic && turns[i].role === "assistant" && text.length > 20) {
      state.lastTopic = text.slice(0, 400);
    }
    if (!state.lastUserRequest && turns[i].role === "user" && text.length > 2) {
      state.lastUserRequest = text.slice(0, 300);
    }
  }
  return state;
}

/**
 * Resolve a referential message ("update that page") to a concrete target.
 *
 * Priority: explicit mention in THIS message → pages open in other panes →
 * titles mentioned earlier in the conversation → current page.
 * Returns null when genuinely ambiguous — callers should ask instead of guess.
 */
export function resolveReference(
  text: string,
  state: ConversationState,
  ctx: { currentPageTitle?: string | null; openPaneTitles?: string[] } = {}
): string | null {
  const t = (text || "").trim();
  if (!t) return null;

  // 1. Explicit title in the message itself wins
  for (const candidate of [...(t.match(/"([^"]{3,60})"/g) || []).map((q) => q.replace(/"/g, "")), ...(t.match(/\b([A-Z][a-zA-Z0-9]+(?: [A-Z][a-zA-Z0-9]+)+)\b/g) || [])]) {
    if (!/^(the|this|that|these|those)\b/i.test(candidate)) return candidate;
  }

  const refersToOtherPane = /\bother pane\b/i.test(t);

  // 2. "The other pane" is only unambiguous with exactly one other pane
  const panes = ctx.openPaneTitles || [];
  if (refersToOtherPane) {
    if (panes.length === 1) return panes[0];
    return null; // multiple panes — must ask
  }

  // 3. Titles from recent conversation, newest first
  if (state.mentionedPages.length > 0) return state.mentionedPages[0];

  // 4. Fall back to the single open pane, then the current page
  if (panes.length === 1) return panes[0];
  if (ctx.currentPageTitle) return ctx.currentPageTitle;

  return null;
}

// ─── Semantic chat titles ───────────────────────────────────────────────────

function fallbackTitle(firstUserMessage: string): string {
  let t = (firstUserMessage || "").replace(/\s+/g, " ").trim();
  if (!t) return "New Chat";
  // Strip leading command words so titles read like topics
  t = t.replace(/^(please\s+)?(can you\s+)?(help me\s+)?(explain|tell me about|write|draft|create|make|find|search|summari[sz]e|analy[sz]e|how (do|does|to)|what (is|are)|why (is|are|does|do))\s+/i, "");
  t = t.replace(/[?.!]+$/, "");
  if (!t) t = (firstUserMessage || "").trim();
  const words = t.split(" ").slice(0, 6).join(" ");
  const title = words.charAt(0).toUpperCase() + words.slice(1);
  return title.slice(0, 48) || "New Chat";
}

/**
 * Generate a meaningful conversation title ("Debugging Clerk auth", not
 * "New Chat"). Uses the fast model class; falls back to a cleaned version of
 * the opening message when no provider is available or the call fails.
 * Never throws.
 */
export async function generateChatTitle(messages: ConversationTurn[]): Promise<string> {
  const firstUser = messages.find((m) => m.role === "user");
  const fb = fallbackTitle(msgText(firstUser || ({} as ConversationTurn)));
  const firstAssistant = messages.find((m) => m.role === "assistant");
  if (!firstUser || !firstAssistant || !aiManager.isConfigured()) return fb;

  try {
    const result = await aiManager.sendRaw({
      system:
        'You name chat conversations. Reply with ONLY the title: 3-6 words, Title Case, describing the actual topic or goal. No quotes, no punctuation at the end, no prefix like "Conversation about".',
      messages: [
        {
          role: "user",
          content: `First user message: ${msgText(firstUser).slice(0, 300)}\n\nAssistant reply (truncated): ${msgText(firstAssistant).slice(0, 500)}`,
        },
      ],
      maxTokens: 24,
    });
    const clean = stripToolCallsLocal(result)
      .replace(/^["'\s]+|["'\s.]+$/g, "")
      .split("\n")[0]
      .slice(0, 60);
    // Guard against degenerate output
    if (clean && clean.length >= 3 && clean.length <= 60 && !/^(i|i'm|as an?|sure|here)/i.test(clean)) {
      return clean;
    }
    return fb;
  } catch {
    return fb;
  }
}

function stripToolCallsLocal(text: string): string {
  return String(text || "").replace(/<<TOOL:\w+>>[\s\S]*?<<\/TOOL>>/g, "").trim();
}
