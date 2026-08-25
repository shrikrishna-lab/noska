/**
 * Noska Intelligence — Response Policy
 *
 * Decides HOW to respond before generation happens: what the user actually
 * wants (rich intents), how much detail fits, what tone matches, whether
 * tools/workspace data are needed, and which model class the request
 * deserves. Output is a set of CONSTRAINTS injected into the system prompt —
 * never a response template. The model still chooses structure and wording.
 */

import type { RuntimeIntent } from "./runtime/types";

// ─── Rich intents ───────────────────────────────────────────────────────────

export type RichIntent =
  | "informational_question"
  | "explanation"
  | "comparison"
  | "brainstorming"
  | "decision_support"
  | "writing"
  | "editing"
  | "summarization"
  | "research"
  | "planning"
  | "analysis"
  | "workspace_search"
  | "workspace_action"
  | "automation_request"
  | "agent_request"
  | "learning"
  | "troubleshooting"
  | "casual_conversation"
  | "follow_up"
  | "clarification";

export interface IntentSignal {
  re: RegExp;
  intent: RichIntent;
}

/** Ordered by specificity — earlier signals outrank later ones. */
const INTENT_SIGNALS: IntentSignal[] = [
  // Meta-conversation about the chat itself
  { re: /^(yes|yeah|yep|ok(ay)?|sure|go ahead|do it|sounds good|approved)\b[\s!.?]*$/i, intent: "clarification" },
  { re: /^(no|nope|stop|cancel|never ?mind|forget it)\b[\s!.?]*$/i, intent: "clarification" },
  { re: /\b(what do you mean|can you clarify|which one|what did you|didn'?t understand)\b/i, intent: "clarification" },

  // Continuation — short referential messages that only make sense with history
  { re: /^(make it|keep it|turn it|now (make|turn|give|write)|go on|continue|and then\b|more detail|simpler|easier|shorter|longer|again|why\??$|but why)/i, intent: "follow_up" },
  { re: /\b(that|this|it|those|them|the same one|the previous|the other (pane|page))\b/i, intent: "follow_up" },

  { re: /\b(vs\.?|versus|compare|difference between|better than|pros and cons|trade-?offs?)\b/i, intent: "comparison" },
  { re: /\b(summari[sz]e|tl;?dr|key points|main takeaways?)\b/i, intent: "summarization" },
  { re: /\b(write|draft|compose|rewrite|proofread|reword|polish)\b.*\b(post|email|letter|essay|article|bio|caption|message|doc|note)\b/i, intent: "writing" },
  { re: /\b(brainstorm|ideas for|come up with|suggest (some )?(names|ideas|options))\b/i, intent: "brainstorming" },
  { re: /\b(should i|which should|help me decide|worth it|recommend)\b/i, intent: "decision_support" },
  { re: /\b(teach me|explain (like|to) (a|me as)|how does .* work|help me understand|eli5|study|learn|flashcards?)\b/i, intent: "learning" },
  { re: /\b(error|bug|not working|broken|fails?|failing|crash|stuck|debug|fix (this|the|it|my))\b/i, intent: "troubleshooting" },
  { re: /\b(find|search|look for|look(ing)? at|locate|where (is|are)|show me|list)\b[^.?!\n]*\b(pages?|notes?|docs?|tasks?|project|workspace)\b/i, intent: "workspace_search" },
  { re: /\b(research|investigate|dig into|gather (info|data)|sources?)\b/i, intent: "research" },
  { re: /\b(why|what)\b[^.?!\n]*\b(behind|late|delayed|stuck|blocked|slower?|failing)\b/i, intent: "analysis" },

  { re: /^(hi|hey|hello|yo|sup|thanks|thank you|ty|good morning|good evening|good night|bye)[\s!.,?]*$/i, intent: "casual_conversation" },
  { re: /\b(how are you|who are you|what can you do|your name)\b/i, intent: "casual_conversation" },
];

const EXPLANATION_RE = /^(explain|describe|what (is|are|was|were)|how (does|do|did|can|could|would|should)|why (is|are|do|does|did)|tell me about|define)\b/i;
const ANALYSIS_RE = /\b(analy[sz]e|review|audit|assess|evaluate|insights?|root cause|patterns?|trends?)\b/i;
const PLAN_RE = /\b(plan|roadmap|schedule|itinerary|strategy|milestones?|steps to)\b/i;

// Workspace-action verbs (map onto runtime agentic intents)
const ACTION_RE = /\b(create|make|add|new|build|draft|update|edit|rename|move|delete|trash|organi[sz]e|clean ?up|tag|extract|insert|append|convert|turn (this|it|these) into)\b/i;

export interface RichIntentResult {
  /** Most specific intent detected */
  primary: RichIntent;
  /** All plausible intents — requests are frequently mixed */
  all: RichIntent[];
  /**
   * Coarse execution route:
   * - answer     → direct model response
   * - search     → consult workspace data, then answer
   * - act        → multi-step workspace execution through the runtime
   * - converse   → lightweight conversation, minimal ceremony
   */
  route: "answer" | "search" | "act" | "converse";
}

/**
 * Classify a message into rich intents. Purely lexical — fast, free,
 * deterministic. The LLM refines behavior via the policy section; it is not
 * consulted for classification.
 */
export function detectRichIntents(text: string): RichIntentResult {
  const input = (text || "").trim();
  if (!input) return { primary: "casual_conversation", all: [], route: "converse" };

  const hits: RichIntent[] = [];
  for (const { re, intent } of INTENT_SIGNALS) {
    if (re.test(input) && !hits.includes(intent)) hits.push(intent);
  }
  if (EXPLANATION_RE.test(input) && !hits.includes("explanation")) hits.push("explanation");
  if (!hits.includes("informational_question") && input.endsWith("?")) hits.push("informational_question");
  if (ANALYSIS_RE.test(input)) hits.push("analysis");
  if (PLAN_RE.test(input)) hits.push("planning");
  if (ACTION_RE.test(input)) hits.push("workspace_action");

  if (hits.length === 0) hits.push("informational_question");

  const primary = hits[0];
  let route: RichIntentResult["route"] = "answer";
  if (primary === "casual_conversation") route = "converse";
  else if (hits.includes("clarification")) route = "answer";
  else if (hits.includes("follow_up")) route = "answer";
  else if (hits.includes("workspace_action") || hits.includes("agent_request") || hits.includes("automation_request")) route = "act";
  else if (hits.includes("workspace_search") || hits.includes("research")) route = "search";
  else if (hits.includes("analysis")) route = "search";

  return { primary, all: hits.slice(0, 4), route };
}

/**
 * Bridge rich intents onto the runtime's coarse vocabulary so the existing
 * AgentRuntime/planner keep working unchanged.
 */
export function richToRuntimeIntent(rich: RichIntentResult, text: string): RuntimeIntent {
  switch (rich.primary) {
    case "workspace_search":
    case "research":
      return "search";
    case "analysis":
      return "analyze";
    case "planning":
      return "plan";
    case "workspace_action":
      // Distinguish creation from mutation using existing runtime intents
      return /\b(edit|update|rename|fix|improve|append|insert|replace|move|tag)\b/i.test(text) ? "edit" : "create";
    case "automation_request":
      return "automation_intent";
    case "agent_request":
      return "agent_intent";
    case "casual_conversation":
      return "casual";
    case "follow_up":
    case "clarification":
      return "follow_up";
    default:
      return "question";
  }
}

// ─── Reference / follow-up detection ────────────────────────────────────────

const PRONOUN_RE = /\b(it|that|this|these|those|they|them|the same|the above|the previous|the other)\b/i;

/** True when the message cannot be understood without prior turns. */
export function isReferential(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  if (PRONOUN_RE.test(t)) return true;
  // Very short continuation-style messages ("more", "expand", "and?")
  if (t.split(/\s+/).length <= 4 && !EXPLANATION_RE.test(t) && !ACTION_RE.test(t)) return true;
  return false;
}

// ─── Complexity & model class ───────────────────────────────────────────────

export type Complexity = "low" | "medium" | "high";

export function estimateComplexity(text: string): Complexity {
  const t = text || "";
  const words = t.split(/\s+/).filter(Boolean).length;
  let score = 0;
  if (words > 40) score += 2;
  else if (words > 15) score += 1;
  const domainHits = t.match(/\b(analy[sz]e\w*|architect\w*|design\w*|trade-?offs?|security|scal(e|ability)|migrat\w*|refactor\w*|optimi[sz]e\w*|compar\w*|root cause)\b/gi)?.length || 0;
  score += Math.min(domainHits, 4);
  if (/\b(step by step|in depth|deep(dive)?|thorough|comprehensive|detailed)\b/i.test(t)) score += 1;
  if ((t.match(/\?/g)?.length || 0) > 1) score += 1;
  if (/\b(code|function|implement|algorithm|debug)\b/i.test(t)) score += 1;
  return score >= 4 ? "high" : score >= 2 ? "medium" : "low";
}

// ─── Style & length ─────────────────────────────────────────────────────────

export type LengthHint = "minimal" | "short" | "standard" | "deep";

export interface StyleProfile {
  tone: "neutral" | "casual" | "technical" | "encouraging" | "executive";
  length: LengthHint;
  /** explicit user constraint like "one line" or "be brief" */
  forcedLength: LengthHint | null;
  preferProse: boolean;
}

const FORCED_SHORT_RE = /\b(one[- ]liner?|one sentence|one line|just the answer|be brief|briefly|tl;?dr|short answer|no details)\b/i;
const FORCED_DEEP_RE = /\b(in depth|deep dive|explain fully|be thorough|comprehensive|step by step|walk me through|elaborate)\b/i;

export function inferStyle(text: string, opts: { recentUserMessages?: string[] } = {}): StyleProfile {
  const t = text || "";
  const forcedLength: LengthHint | null = FORCED_SHORT_RE.test(t)
    ? "minimal"
    : FORCED_DEEP_RE.test(t)
      ? "deep"
      : null;

  const casual = /\b(why is this|whats|what's up|i'm stuck|ugh|pls|please help|can u|gonna|kinda)\b/i.test(t) || /^[a-z][^.!?]*\?$/.test(t.trim());
  const technical = /\b(api|endpoint|jwt|oauth|sql|schema|deploy|regex|async|cache|latency|typescript|react|edge function|rls|migration)\b/i.test(t);
  const executive = /\b(summary|status|update|stakeholder|deadline|budget|roadmap|report)\b/i.test(t);

  const complexity = estimateComplexity(t);
  let length: LengthHint =
    complexity === "high" ? "deep" : complexity === "low" ? "short" : "standard";
  if (forcedLength) length = forcedLength;

  // Continuity: match the cadence of the ongoing exchange
  const recent = opts.recentUserMessages || [];
  if (!forcedLength && recent.length > 0) {
    const lastLen = recent[recent.length - 1].split(/\s+/).length;
    if (lastLen <= 6 && length === "deep") length = "standard";
  }

  const tone: StyleProfile["tone"] = casual ? "casual" : technical ? "technical" : executive ? "executive" : "neutral";
  const preferProse = !/\b(list|bullet|steps|checklist|table|compare)\b/i.test(t);

  return { tone, length, forcedLength, preferProse };
}

// ─── Modes (configuration profiles over the same intelligence) ──────────────

export type ChatMode = "auto" | "fast" | "deep" | "agent" | "learn" | "research";

export interface ModePolicy {
  mode: ChatMode;
  lengthOverride: LengthHint | null;
  preferReasoningModel: boolean;
  preferFastModel: boolean;
  forceAgenticRouting: boolean;
  extraGuidance: string;
}

export const MODE_POLICIES: Record<ChatMode, ModePolicy> = {
  auto: { mode: "auto", lengthOverride: null, preferReasoningModel: false, preferFastModel: false, forceAgenticRouting: false, extraGuidance: "" },
  fast: { mode: "fast", lengthOverride: "minimal", preferReasoningModel: false, preferFastModel: true, forceAgenticRouting: false, extraGuidance: "The user chose Fast mode: give the shortest useful answer." },
  deep: { mode: "deep", lengthOverride: "deep", preferReasoningModel: true, preferFastModel: false, forceAgenticRouting: false, extraGuidance: "The user chose Deep mode: reason carefully, cover nuance and trade-offs, use examples where they earn their place." },
  agent: { mode: "agent", lengthOverride: null, preferReasoningModel: false, preferFastModel: false, forceAgenticRouting: true, extraGuidance: "The user chose Agent mode: prefer acting on the workspace over describing what could be done." },
  learn: { mode: "learn", lengthOverride: "standard", preferReasoningModel: false, preferFastModel: false, forceAgenticRouting: false, extraGuidance: "The user chose Learn mode: teach. Build from what they already know, check understanding, and offer practice (e.g. flashcards) when natural." },
  research: { mode: "research", lengthOverride: "deep", preferReasoningModel: true, preferFastModel: false, forceAgenticRouting: false, extraGuidance: "The user chose Research mode: ground every claim in workspace context or clearly mark it as general knowledge. Note gaps and contradictions." },
};

// ─── Policy section builder ─────────────────────────────────────────────────

const LENGTH_GUIDANCE: Record<LengthHint, string> = {
  minimal: "Answer in one or two sentences. No preamble, no recap.",
  short: "Keep it tight — a few sentences at most.",
  standard: "Match detail to usefulness: enough to be complete, nothing padded.",
  deep: "Go deep: reasoning, examples, and trade-offs where they matter.",
};

const TONE_GUIDANCE: Record<StyleProfile["tone"], string> = {
  neutral: "",
  casual: "The user writes casually — reply naturally and directly, no corporate register.",
  technical: "The user is technical — use precise terminology and don't oversimplify.",
  encouraging: "Be warm and encouraging without being saccharine.",
  executive: "Lead with the conclusion, then the supporting detail.",
};

export interface PolicyContext {
  rich: RichIntentResult;
  style: StyleProfile;
  mode: ModePolicy;
  /** Resolved target when the user said "that page" etc. (null = unknown) */
  resolvedTarget?: string | null;
  /** True when history exists — enables continuity constraints */
  continuing?: boolean;
}

/**
 * Build the per-request constraint block appended to the system prompt.
 * Deliberately short and non-templated: it constrains behavior, it does not
 * script responses.
 */
export function buildResponsePolicySection(ctx: PolicyContext): string {
  const lines: string[] = ["## Response Policy (constraints, not a template)"];
  const { rich, style, mode } = ctx;

  lines.push(`Request type: ${rich.all.join(", ")}.`);

  const length = mode.lengthOverride || style.length;
  lines.push(LENGTH_GUIDANCE[length]);
  const toneLine = TONE_GUIDANCE[style.tone];
  if (toneLine) lines.push(toneLine);

  if (ctx.continuing) {
    lines.push("This is an ongoing conversation: continue from what was already said. Never restart an explanation the user already has; refine, extend, or challenge it.");
  }
  if (rich.primary === "follow_up" || rich.primary === "clarification") {
    lines.push("Resolve references (\"that\", \"it\", \"the page\") against the conversation and visible context before answering.");
  }
  if (ctx.resolvedTarget) {
    lines.push(`The user most likely means: "${ctx.resolvedTarget}".`);
  }
  if (rich.route === "act") {
    lines.push("This needs real workspace changes — use tools; do not merely describe the change.");
  } else if (rich.route === "search") {
    lines.push("Ground this answer in workspace content. If nothing relevant exists, say so plainly.");
  }
  if (mode.extraGuidance) lines.push(mode.extraGuidance);

  lines.push(
    "Choose your own structure (prose, bullets, table, code) — whichever serves the answer best. No filler openers or closers, no restating my question, no unnecessary headings.",
    "Never claim an action you did not take, and never invent pages, tasks, or sources."
  );

  return lines.filter(Boolean).join("\n");
}
