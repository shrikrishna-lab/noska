/**
 * Noska Intelligence — Intent Classification
 *
 * Classifies a user request into a RuntimeIntent so the runtime can decide
 * between answering directly, running an agentic multi-step job, or
 * proposing an automation/agent. Rule-based first (fast, deterministic,
 * free); the LLM is only consulted as a fallback for ambiguous requests.
 */

import type { IntentResult, RuntimeIntent } from "./types";

interface Rule {
  intent: RuntimeIntent;
  multiStep: boolean;
  rationale: string;
  patterns: RegExp[];
}

// Ordered by specificity — first match wins.
const RULES: Rule[] = [
  {
    // Agent intent outranks automation: "create an agent that … every
    // morning" is a persistent worker whose TRIGGER happens to be a
    // schedule, not a one-shot workflow.
    intent: "agent_intent",
    multiStep: false,
    rationale: "This needs a persistent AI worker, not a one-off answer",
    patterns: [
      /\b(create|build|make|set up|deploy)\s+(me\s+)?(an?\s+)?agent\b/i,
      /\b(create|build|make|set up|deploy)\s+(me\s+)?(an?\s+)?assistant\b/i,
      /\bagents?\s+that\b/i,
      /\bsomething\s+that\s+automatically\b/i,
      /\bwatches?\s+(my|this|the)\b/i,
      /\bhire\b.*\bagent\b/i,
    ],
  },
  {
    intent: "automation_intent",
    multiStep: false,
    rationale: "This looks like recurring work that should be automated",
    patterns: [
      /\bevery\s+(day|morning|afternoon|evening|night|week|weekday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|month|hour|time)\b/i,
      /\b(when|whenever)\s+(a\s+)?(task|page|record|todo|item)\b.*\b(completed|done|created|updated|changed|added|finished)\b/i,
      /\bautomate\b/i,
      /\beach\s+(week|month|day)\b/i,
      /\bdaily\b.*\b(summar|report|plan|review|check|remind)/i,
      /\bi\s+(always|keep|regularly)\s+(have to|need to|do)\b/i,
      // "automate this/that/my…" without the word agent
      /\bautomate\s+(this|that|my|it)\b/i,
    ],
  },
  {
    intent: "action",
    multiStep: false,
    rationale: "Navigating to a view or page in the app",
    patterns: [
      /\b(open|show|display|go\s*to|switch\s*to|navigate\s*to|take\s*me\s*to|jump\s*to)\s+(?:me\s+)?(?:to\s+)?(?:the\s+|my\s+)?(inbox|calendar|tasks?|todos?|chats?|meetings?|library|shared|trash|graph|canvas|home|daily|journal|dashboard|command\s*center|agents?|automations?|marketplace|creator|company\s*workspace|teamspace|settings)\b/i,
      /\b(open|go\s*to|switch\s*to|navigate\s*to|take\s*me\s*to)\s+(?:the\s+|my\s+)?(?:page|note|document)\b/i,
    ],
  },
  {
    intent: "action",
    multiStep: false,
    rationale: "Setting a reminder or asking for a briefing",
    patterns: [
      /\bremind\s+(?:me|us)\b/i,
      /\b(set|add|create)\s+(?:a\s+)?reminder\b/i,
      /\b(catch\s+me\s+up|brief\s+me|daily\s+briefing|summarize\s+my\s+day)\b/i,
    ],
  },
  {
    intent: "organize",
    multiStep: true,
    rationale: "Reorganizing the workspace requires inspecting and moving content",
    patterns: [
      /\b(organi[sz]e|clean ?up|restructure|tidy|sort)\b.*\b(workspace|pages?|notes?|hierarchy|folders?)\b/i,
      /\b(find|detect)\s+(duplicates?|misplaced)\b/i,
      /\bmove\s+(all|these|the)\b/i,
    ],
  },
  {
    intent: "analyze",
    multiStep: true,
    rationale: "Analysis needs workspace data gathered before answering",
    patterns: [
      /\b(analyz|analys)e\b/i,
      /\b(why|what)\s+(is|are)\b.*\b(delayed|late|blocked|failing|behind)\b/i,
      /\bwhy\b[^?]*\b(delayed|late|blocked|failing|behind|stuck|slow)\b/i,
      /\b(progress|status|health|insights?|summary of my workspace)\b/i,
      /\bfind\s+blockers?\b/i,
      /\breview\s+(my|the)\s+(project|tasks|workspace)\b/i,
    ],
  },
  {
    intent: "plan",
    multiStep: true,
    rationale: "Planning benefits from gathering context before drafting",
    patterns: [
      /\b(create|make|draft|write|prepare)\s+(me\s+)?(a\s+)?(project\s+plan|plan|roadmap|schedule|itinerary|strategy)\b/i,
      /\bplan\s+(my|the|a)\b/i,
      /\bprepare\s+(me\s+)?for\b/i,
    ],
  },
  {
    intent: "create",
    multiStep: true,
    rationale: "Creating real pages/records in your workspace",
    patterns: [
      /\b(create|make|add|new)\b.*\b(page|database|table|crm|tracker|task|todo|note)s?\b/i,
      /\bturn (this|these|it) into (tasks|todos|a database|a table|tasks)\b/i,
      /\btake notes\b/i,
    ],
  },
  {
    intent: "edit",
    multiStep: true,
    rationale: "Editing existing workspace content",
    patterns: [
      /\b(edit|update|fix|rewrite|improve|rename|reword|append)\b.*\b(page|content|text|title|blocks?|notes?)\b/i,
      /\badd\s+(a\s+)?(section|heading|todo|task)\b/i,
    ],
  },
  {
    intent: "search",
    multiStep: false,
    rationale: "Searching the workspace",
    patterns: [
      /^(find|search|look for|locate|show me|list)\b/i,
      /\b(where is|which pages?)\b/i,
    ],
  },
];

/** Requests that are clearly plain questions — checked before the generic
 * action rules so e.g. "What is spaced repetition?" stays informational. */
const QUESTION_GUARDS: RegExp[] = [
  /^what ('s|is|are|was|were)\s+(a |an |the )?[^?]*\??$/i,
  /^how (does|do|did|can|could|should|would|to)\b[^?]*\??$/i,
  /^(explain|define|describe|tell me about|compare)\b/i,
  /^(who|why|when)\s+(is|was|are|were|did|does)\b[^?]*\??$/i,
];

export function classifyIntent(text: string): IntentResult {
  const input = (text || "").trim();
  if (!input) return { intent: "question", multiStep: false, rationale: "Empty request" };

  // Automation / agent intents always win — even when phrased as questions
  // ("every friday summarize..." starts with an implied question shape).
  for (const rule of RULES.slice(0, 2)) {
    if (rule.patterns.some((p) => p.test(input))) {
      return { intent: rule.intent, multiStep: rule.multiStep, rationale: rule.rationale };
    }
  }

  for (const guard of QUESTION_GUARDS) {
    if (guard.test(input)) {
      return { intent: "question", multiStep: false, rationale: "Informational question" };
    }
  }

  for (const rule of RULES.slice(2)) {
    if (rule.patterns.some((p) => p.test(input))) {
      return { intent: rule.intent, multiStep: rule.multiStep, rationale: rule.rationale };
    }
  }

  return { intent: "question", multiStep: false, rationale: "General request" };
}

/** True when the intent should run through the full agentic loop. */
export function isAgenticIntent(intent: RuntimeIntent): boolean {
  return ["create", "edit", "analyze", "organize", "plan", "action"].includes(intent);
}

// ─── LLM refinement fallback ────────────────────────────────────────────────

const VALID_INTENTS: RuntimeIntent[] = [
  "question", "search", "create", "edit", "analyze", "organize",
  "plan", "action", "agent_intent", "automation_intent",
];

const MULTI_STEP_HINTS = /\b(?:then|after that|and then|and also|as well as|finally|afterwards)\b|[;\n]|\d\.\s/i;
const ACTION_VERBS = /\b(write|draft|add|append|insert|update|change|delete|remove|rename|move|archive|merge|split|convert|reorganiz|restructur|clean ?up|extract|collect|compare|compile|export|fill|populate|assign|schedule|set ?up)\b/i;

/**
 * Cheap heuristic: flags requests the regex rules can't classify but that
 * look like multi-step work rather than a plain question. Gates the LLM
 * refinement so ordinary chat never pays an extra round-trip.
 */
export function looksLikeComplexAction(text: string): boolean {
  const input = (text || "").trim();
  if (input.length < 24) return false;
  if (QUESTION_GUARDS.some((g) => g.test(input))) return false;
  return MULTI_STEP_HINTS.test(input) && ACTION_VERBS.test(input);
}

/**
 * One small LLM call to classify an ambiguous request. Returns null on any
 * failure (unconfigured provider, unparseable reply) so callers can fall
 * back to the rule-based result — the fallback is always safe.
 */
export async function refineIntentWithLLM(text: string): Promise<IntentResult | null> {
  try {
    const { aiManager } = await import("../AIManager");
    if (!aiManager.isConfigured()) return null;
    const raw = await aiManager.sendRaw({
      system: [
        "You classify user requests for a workspace AI assistant. Reply with ONLY a JSON object, no prose:",
        '{"intent":"<intent>","multiStep":<true|false>,"rationale":"<max 12 words>"}',
        'Intent is exactly one of: question, search, create, edit, analyze, organize, plan, action, agent_intent, automation_intent.',
        'agent_intent = the user wants a PERSISTENT automated worker created. automation_intent = recurring/scheduled work. question = informational answer. edit/analyze/plan/organize/action = concrete multi-step workspace work. create = making new pages/content.',
      ].join("\n"),
      messages: [{ role: "user", content: text.slice(0, 500) }],
      maxTokens: 120,
    });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as { intent?: string; multiStep?: boolean; rationale?: string };
    if (!parsed.intent || !VALID_INTENTS.includes(parsed.intent as RuntimeIntent)) return null;
    return {
      intent: parsed.intent as RuntimeIntent,
      multiStep: Boolean(parsed.multiStep),
      rationale: String(parsed.rationale || "Refined by model").slice(0, 80),
    };
  } catch {
    return null;
  }
}

/**
 * Rule-based classification first (fast, free, deterministic); the LLM is
 * consulted only for requests the rules fall through on AND that the cheap
 * heuristic flags as likely multi-step work. Never throws.
 */
export async function classifyIntentSmart(text: string): Promise<IntentResult> {
  const ruleResult = classifyIntent(text);
  const fellThrough = ruleResult.intent === "question" && ruleResult.rationale === "General request";
  if (fellThrough && looksLikeComplexAction(text)) {
    const refined = await refineIntentWithLLM(text);
    if (refined) return refined;
  }
  return ruleResult;
}
