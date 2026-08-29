/**
 * Noska AI — Intelligence Engine
 * 
 * Pre-generation analysis that determines:
 * - What the user actually wants (intent)
 * - How complex the task is (complexity)
 * - How much reasoning effort to spend
 * - What context depth is needed
 * - What response format to use
 * - Whether tools are needed
 * 
 * This is the "brain before the brain" — it makes decisions about
 * HOW to think before the model starts thinking.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserIntent =
  | "question"          // factual or conceptual question
  | "explanation"       // explain how/why something works  
  | "coding"            // write, review, or modify code
  | "debugging"         // find and fix a bug
  | "planning"          // create a plan, roadmap, strategy
  | "analysis"          // analyze data, patterns, tradeoffs
  | "comparison"        // compare options or approaches
  | "writing"           // write or edit content
  | "summarization"     // summarize content
  | "task_execution"    // perform a workspace action
  | "search"            // find something in the workspace
  | "creative"          // brainstorm, ideate
  | "follow_up"         // continuation of previous exchange
  | "clarification"     // asking for clarification
  | "greeting"          // hello, thanks, etc.
  | "unknown";

export type ReasoningEffort = "none" | "low" | "medium" | "high" | "maximum";

export type IntelligenceMode = "auto" | "fast" | "balanced" | "deep" | "maximum";

export type ResponseFormat = 
  | "concise"       // 1-3 sentences
  | "standard"      // normal paragraphs
  | "detailed"      // thorough with structure
  | "structured"    // headings, lists, sections
  | "code"          // code-focused with explanation
  | "comparison"    // comparison table/matrix
  | "step_by_step"; // numbered steps

export interface IntelligenceResult {
  /** What the user wants */
  intent: UserIntent;
  /** Task complexity 0-100 */
  complexityScore: number;
  /** How much reasoning to apply */
  reasoningEffort: ReasoningEffort;
  /** How much context to include */
  contextDepth: "minimal" | "standard" | "deep" | "full";
  /** Suggested response format */
  responseFormat: ResponseFormat;
  /** Whether tools are likely needed */
  requiresTools: boolean;
  /** Whether this is a multi-step task */
  multiStep: boolean;
  /** Brief rationale for debugging */
  rationale: string;
}

// ─── Intent Classification ──────────────────────────────────────────────────

interface IntentRule {
  intent: UserIntent;
  /** Patterns that strongly indicate this intent */
  patterns: RegExp[];
  /** Negative patterns — if matched, this intent is unlikely */
  antiPatterns?: RegExp[];
  /** Base complexity for this intent type */
  baseComplexity: number;
}

const INTENT_RULES: IntentRule[] = [
  // Greetings — must be checked first and be short
  {
    intent: "greeting",
    patterns: [
      /^(hi|hello|hey|thanks|thank you|good morning|good evening|yo|sup)[\s!.?]*$/i,
    ],
    baseComplexity: 0,
  },
  // Follow-ups — very short, referential
  {
    intent: "follow_up",
    patterns: [
      /^(why|how|continue|go on|more|elaborate|explain|and|also|what about|now|next|ok|yes|no|sure|do it|implement it|proceed)[\s!.?]*$/i,
      /^(use|try) (the |that |this )/i,
      /^(what|how) about /i,
      /^can you (also|now|then) /i,
    ],
    baseComplexity: 10,
  },
  // Clarification
  {
    intent: "clarification",
    patterns: [
      /^what (do you mean|did you mean|does that mean)/i,
      /^(clarify|can you clarify|I don't understand)/i,
      /^(which one|what kind|what type)/i,
    ],
    baseComplexity: 5,
  },
  // Search
  {
    intent: "search",
    patterns: [
      /^(find|search|look for|locate|show me|where is|which pages?)/i,
      /^list (all |my |the )/i,
    ],
    antiPatterns: [/how to find/i],
    baseComplexity: 15,
  },
  // Task execution (workspace actions)
  {
    intent: "task_execution",
    patterns: [
      /^(create|make|add|delete|remove|rename|move|tag|archive|trash|set|update|change) (a |the |my |this )?/i,
      /^turn (this|these|it) into/i,
    ],
    antiPatterns: [/^(create|make) .*(plan|strategy|roadmap)/i],
    baseComplexity: 20,
  },
  // Coding
  {
    intent: "coding",
    patterns: [
      /\b(write|generate|create|implement|build) .*(code|function|class|component|script|api|endpoint|query|module)/i,
      /\b(refactor|optimize|improve) .*(code|function|algorithm|implementation)/i,
      /```/,
      /\b(typescript|javascript|python|react|css|html|sql|regex)\b/i,
    ],
    baseComplexity: 40,
  },
  // Debugging
  {
    intent: "debugging",
    patterns: [
      /\b(debug|fix|error|bug|issue|problem|broken|not working|fails|crash|exception|undefined|null)\b/i,
      /\b(why (is|does|doesn't|won't|can't))\b/i,
      /\bwhat('s| is) wrong\b/i,
    ],
    antiPatterns: [/^why$/i],  // bare "why" is follow_up
    baseComplexity: 45,
  },
  // Planning
  {
    intent: "planning",
    patterns: [
      /\b(plan|roadmap|strategy|schedule|timeline|milestone|phase)\b.*\b(create|make|draft|build|develop|prepare|design)\b/i,
      /\b(create|make|draft|build) .*(plan|roadmap|strategy|schedule)\b/i,
      /\bplan (for|out|how to)\b/i,
    ],
    // "What is the plan for Q4?" is a question, not planning
    antiPatterns: [/^what (is|are|was|were) (the|our|my) plan/i],
    baseComplexity: 55,
  },
  // Analysis
  {
    intent: "analysis",
    patterns: [
      /\b(analyze|analyse|review|audit|assess|evaluate|examine)\b/i,
      /\b(compare and contrast|pros and cons|strengths and weaknesses|tradeoffs?)\b/i,
      /\b(find|detect) .*(pattern|trend|anomaly|issue|bottleneck)/i,
    ],
    baseComplexity: 50,
  },
  // Comparison
  {
    intent: "comparison",
    patterns: [
      /\bcompare\b/i,
      /\bvs\.?\b/i,
      /\b(difference|differences?) between\b/i,
      /\bwhich (is|one|should|would) (be )?(better|best|faster|cheaper|more)/i,
    ],
    baseComplexity: 35,
  },
  // Writing
  {
    intent: "writing",
    patterns: [
      /\b(write|draft|compose|rewrite|edit|proofread|rephrase|paraphrase)\b.*\b(email|letter|report|article|blog|post|description|summary|intro|conclusion|text|content|document|essay|proposal)/i,
      /\b(improve|enhance|polish) .*(writing|text|content|copy|prose|wording)/i,
    ],
    baseComplexity: 30,
  },
  // Summarization
  {
    intent: "summarization",
    patterns: [
      /\b(summarize|summary|summar|tldr|tl;dr|brief|overview|recap|digest)\b/i,
      /\b(main|key) (points?|takeaways?|findings?|ideas?)\b/i,
    ],
    baseComplexity: 20,
  },
  // Creative
  {
    intent: "creative",
    patterns: [
      /\b(brainstorm|ideate|suggest|ideas?|creative|imagine|what if|inspire)\b/i,
      /\b(come up with|think of|give me) .*(ideas?|names?|concepts?|approaches?)/i,
    ],
    baseComplexity: 30,
  },
  // Explanation
  {
    intent: "explanation",
    patterns: [
      /^(explain|describe|tell me about|what is|what are|how does|how do|define|what's)\b/i,
      /\bhow (does|do|did|can|could|would|should|to)\b/i,
    ],
    baseComplexity: 20,
  },
  // General questions (lowest priority)
  {
    intent: "question",
    patterns: [
      /\?$/,
      /^(is|are|was|were|do|does|did|can|could|would|should|will|has|have|had)\b/i,
    ],
    baseComplexity: 15,
  },
];

// ─── Complexity Signals ─────────────────────────────────────────────────────

function estimateComplexity(text: string, intent: UserIntent, baseComplexity: number): number {
  let score = baseComplexity;
  const lower = text.toLowerCase();

  // Length signals — longer requests tend to be more complex
  if (text.length > 500) score += 15;
  else if (text.length > 200) score += 8;
  else if (text.length > 100) score += 3;
  else if (text.length < 20) score -= 10;

  // Constraint count
  const constraintWords = (lower.match(/\b(must|should|need|require|always|never|constraint|rule|ensure|guarantee|condition)\b/g) || []).length;
  score += Math.min(constraintWords * 4, 20);

  // Technical depth indicators
  const techWords = (lower.match(/\b(algorithm|architecture|system|design|pattern|optimization|performance|scalab|concurren|parallel|async|distributed|security|auth|encrypt|database|schema|migration|deploy|infrastructure|kubernetes|docker|ci\/cd)\b/g) || []).length;
  score += Math.min(techWords * 5, 25);

  // Multi-step indicators
  const multiStepWords = (lower.match(/\b(then|after|next|first|second|third|step|phase|stage|finally|also|and then|furthermore|additionally)\b/g) || []).length;
  score += Math.min(multiStepWords * 3, 15);

  // Code complexity
  const codeBlocks = (text.match(/```/g) || []).length / 2;
  if (codeBlocks > 0) score += Math.min(codeBlocks * 8, 20);

  // Mathematical/logical complexity
  if (/\b(prove|theorem|lemma|proof|complexity|O\(|big-O|NP|polynomial)\b/i.test(text)) {
    score += 20;
  }

  // Ambiguity reduction — very specific requests are actually simpler
  if (/\bexactly\b|\bspecifically\b|\bprecisely\b/i.test(text)) {
    score -= 5;
  }

  // Simple transformations
  if (/\b(format|convert|translate|lowercase|uppercase|sort|reverse|count)\b/i.test(lower)) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

// ─── Reasoning Effort Selection ─────────────────────────────────────────────

function selectReasoningEffort(
  complexity: number,
  intent: UserIntent,
  mode: IntelligenceMode
): ReasoningEffort {
  // User override modes
  if (mode === "fast") return complexity > 60 ? "low" : "none";
  if (mode === "maximum") return "maximum";
  if (mode === "deep") return complexity < 20 ? "medium" : "high";

  // Auto mode — map complexity to effort
  if (intent === "greeting" || intent === "clarification") return "none";
  if (intent === "follow_up" && complexity < 20) return "none";

  if (complexity <= 15) return "none";
  if (complexity <= 30) return "low";
  if (complexity <= 55) return "medium";
  if (complexity <= 80) return "high";
  return "maximum";
}

// ─── Response Format Selection ──────────────────────────────────────────────

function selectResponseFormat(intent: UserIntent, complexity: number): ResponseFormat {
  switch (intent) {
    case "greeting":
    case "clarification":
      return "concise";
    case "question":
      return complexity < 25 ? "concise" : "standard";
    case "explanation":
      return complexity < 30 ? "standard" : "structured";
    case "coding":
    case "debugging":
      return "code";
    case "comparison":
      return "comparison";
    case "planning":
      return "step_by_step";
    case "analysis":
      return "structured";
    case "summarization":
      return "structured";
    case "task_execution":
    case "search":
      return "concise";
    case "writing":
      return "standard";
    case "creative":
      return "structured";
    case "follow_up":
      return "standard";
    default:
      return "standard";
  }
}

// ─── Context Depth Selection ────────────────────────────────────────────────

function selectContextDepth(intent: UserIntent, complexity: number): IntelligenceResult["contextDepth"] {
  if (intent === "greeting" || intent === "clarification") return "minimal";
  if (intent === "follow_up" && complexity < 20) return "minimal";
  if (intent === "question" && complexity < 25) return "standard";
  if (complexity > 60) return "deep";
  if (intent === "analysis" || intent === "planning") return "deep";
  return "standard";
}

// ─── Main Classification ────────────────────────────────────────────────────

/**
 * Classify a user message into intent + complexity + reasoning parameters.
 * 
 * This is the entry point for the intelligence engine. Call this before
 * every generation to determine HOW the AI should think about the request.
 */
export function analyzeRequest(
  text: string,
  mode: IntelligenceMode = "auto",
  conversationContext?: {
    hasHistory: boolean;
    lastUserMessage?: string;
    lastAIResponse?: string;
    activeTask?: string;
  }
): IntelligenceResult {
  const input = (text || "").trim();
  if (!input) {
    return {
      intent: "unknown",
      complexityScore: 0,
      reasoningEffort: "none",
      contextDepth: "minimal",
      responseFormat: "concise",
      requiresTools: false,
      multiStep: false,
      rationale: "Empty request",
    };
  }

  // ─── Intent Classification ─────────────────────────────────────────
  let matchedIntent: UserIntent = "question";
  let baseComplexity = 15;

  for (const rule of INTENT_RULES) {
    // Check anti-patterns first
    if (rule.antiPatterns?.some(p => p.test(input))) continue;
    // Check patterns
    if (rule.patterns.some(p => p.test(input))) {
      matchedIntent = rule.intent;
      baseComplexity = rule.baseComplexity;
      break;
    }
  }

  // Context-aware overrides
  if (conversationContext?.hasHistory && matchedIntent === "question") {
    // Short messages in an ongoing conversation are likely follow-ups
    if (input.length < 30 && !/\?/.test(input)) {
      matchedIntent = "follow_up";
      baseComplexity = 10;
    }
  }

  // ─── Complexity ────────────────────────────────────────────────────
  const complexityScore = estimateComplexity(input, matchedIntent, baseComplexity);

  // ─── Tool Requirements ─────────────────────────────────────────────
  const requiresTools = [
    "task_execution", "search",
  ].includes(matchedIntent) ||
    /\b(create|make|add|delete|remove|rename|search|find|list) .*(page|todo|task|tag|block|database)/i.test(input);

  // ─── Multi-step ────────────────────────────────────────────────────
  const multiStep = requiresTools && (
    matchedIntent === "task_execution" ||
    matchedIntent === "planning" ||
    matchedIntent === "analysis" ||
    complexityScore > 50
  );

  // ─── Reasoning/Context/Format ──────────────────────────────────────
  const reasoningEffort = selectReasoningEffort(complexityScore, matchedIntent, mode);
  const contextDepth = selectContextDepth(matchedIntent, complexityScore);
  const responseFormat = selectResponseFormat(matchedIntent, complexityScore);

  return {
    intent: matchedIntent,
    complexityScore,
    reasoningEffort,
    contextDepth,
    responseFormat,
    requiresTools,
    multiStep,
    rationale: `${matchedIntent} (complexity=${complexityScore}, effort=${reasoningEffort})`,
  };
}

/**
 * Map reasoning effort to provider-specific parameters.
 */
export function mapReasoningToProvider(
  effort: ReasoningEffort,
  providerType: "openai" | "anthropic" | "openrouter" | "gemini" | "other"
): {
  temperature?: number;
  effort?: "low" | "medium" | "high";
  thinking?: boolean;
  thinkingBudget?: number;
} {
  if (effort === "none") {
    return { temperature: 0.3 };
  }
  if (effort === "low") {
    return { temperature: 0.3, effort: "low" };
  }
  if (effort === "medium") {
    return { temperature: 0.4, effort: "medium" };
  }
  if (effort === "high") {
    return {
      temperature: 0.5,
      effort: "high",
      thinking: providerType === "anthropic" || providerType === "openrouter",
    };
  }
  // maximum
  return {
    temperature: 0.6,
    effort: "high",
    thinking: true,
    thinkingBudget: 16000,
  };
}
