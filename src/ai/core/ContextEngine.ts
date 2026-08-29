/**
 * Noska AI — Context Engine
 *
 * Intelligent context assembly that replaces the crude slice(-20) approach.
 * Budgets the model's context window across competing sections:
 *   system + tools + memory + workspace + conversation + output_reserve
 *
 * Key behaviors:
 * - Prunes conversation history by relevance, not just recency
 * - Only includes relevant memory entries (keyword + importance scoring)
 * - Respects model-specific context limits
 * - Tracks token usage per section for diagnostics
 */

import { buildContext as legacyBuildContext, estimateTokens } from '../ContextBuilder.js';
import { getMemory, type MemoryEntry, type MemoryCache } from '../memory.js';
import { buildUserProfileContext } from '../userProfile.js';
import type { ConversationState } from './ConversationState.js';
import type { IntelligenceResult } from './IntelligenceEngine.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ContextBudget {
  /** Total model context window */
  totalWindow: number;
  /** Tokens reserved for output */
  outputReserve: number;
  /** Tokens reserved for reasoning */
  reasoningReserve: number;
  /** Available for input (totalWindow - outputReserve - reasoningReserve) */
  availableInput: number;
  /** Allocation per section */
  sections: {
    system: number;
    tools: number;
    conversationState: number;
    memory: number;
    workspace: number;
    history: number;
  };
}

export interface ContextResult {
  /** System prompt (agent persona + instructions) */
  systemPrompt: string;
  /** Workspace context block */
  workspaceContext: string;
  /** Memory context block */
  memoryContext: string;
  /** Conversation state block */
  conversationStateContext: string;
  /** User profile block */
  userProfile: string;
  /** Pruned conversation history */
  prunedHistory: Array<{ role: string; content: string }>;
  /** Diagnostics: token estimates per section */
  tokenEstimates: Record<string, number>;
}

export interface ContextOpts {
  page?: any;
  pages?: any[];
  /** Full conversation messages */
  messages?: Array<{ role: string; text?: string; content?: string }>;
  /** Current user prompt (not yet in messages) */
  currentPrompt?: string;
  /** Intelligence analysis result */
  intelligence?: IntelligenceResult;
  /** Conversation state tracker */
  conversationState?: ConversationState;
  /** Model context window size */
  contextWindow?: number;
  /** Max output tokens */
  maxOutputTokens?: number;
  /** Tool instructions text */
  toolInstructions?: string;
  /** Agent system prompt */
  agentSystemPrompt?: string;
}

// ─── Token Estimation ───────────────────────────────────────────────────────

/**
 * Improved token estimation. Still heuristic (no WASM tokenizer),
 * but accounts for common patterns that throw off simple length/4.
 */
function estimateTokensImproved(text: string): number {
  if (!text) return 0;

  let estimate = 0;
  // Base: ~4 chars per token for English prose
  estimate = text.length / 3.8;

  // Code blocks use more tokens per character (operators, symbols)
  const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
  for (const block of codeBlocks) {
    // Code is roughly 3.2 chars/token instead of 3.8
    estimate += block.length * (1 / 3.2 - 1 / 3.8);
  }

  // JSON/structured data is token-heavy
  if (text.includes("{") && text.includes("}")) {
    const jsonLike = (text.match(/[{}\[\]:,"]/g) || []).length;
    estimate += jsonLike * 0.3;
  }

  // URLs are very token-heavy
  const urls = text.match(/https?:\/\/\S+/g) || [];
  for (const url of urls) {
    estimate += url.length * 0.2; // URLs tokenize badly
  }

  return Math.ceil(estimate);
}

// ─── Memory Relevance Scoring ───────────────────────────────────────────────

function scoreMemoryRelevance(
  key: string,
  entry: MemoryEntry,
  currentPrompt: string,
  entities: string[]
): number {
  let score = entry._importance || 0.5;

  // Keyword matching against current prompt
  const promptLower = currentPrompt.toLowerCase();
  const keyLower = key.toLowerCase();
  const textLower = (entry.text || entry.content || "").toLowerCase();

  // Direct key match
  if (promptLower.includes(keyLower.replace(/^(fact|pref):/, ""))) {
    score += 0.4;
  }

  // Content overlap with prompt
  const words = promptLower.split(/\s+/).filter(w => w.length > 3);
  let matches = 0;
  for (const word of words) {
    if (textLower.includes(word)) matches++;
  }
  if (words.length > 0) {
    score += (matches / words.length) * 0.3;
  }

  // Entity match
  for (const entity of entities) {
    if (textLower.includes(entity.toLowerCase()) || keyLower.includes(entity.toLowerCase())) {
      score += 0.2;
      break;
    }
  }

  // Recency bonus (decay over 7 days)
  const age = Date.now() - (entry._updated || 0);
  const dayAge = age / (1000 * 60 * 60 * 24);
  if (dayAge < 1) score += 0.15;
  else if (dayAge < 7) score += 0.05;

  // Preference/fact categories get a small bonus
  if (entry._category === "preference" || entry._category === "fact") {
    score += 0.1;
  }

  // Ephemeral memories get demoted
  if (entry._category === "ephemeral") {
    score -= 0.3;
  }

  return Math.max(0, Math.min(1, score));
}

// ─── History Pruning ────────────────────────────────────────────────────────

interface PrunedMessage {
  role: string;
  content: string;
  /** True if this is a summary of older messages */
  isSummary?: boolean;
}

function pruneHistory(
  messages: Array<{ role: string; text?: string; content?: string }>,
  tokenBudget: number,
  contextDepth: string
): PrunedMessage[] {
  if (!messages || messages.length === 0) return [];

  // Convert to uniform format
  const formatted = messages
    .filter(m => m.role === "user" || m.role === "assistant" || m.role === "ai")
    .map(m => ({
      role: m.role === "ai" ? "assistant" : m.role,
      content: (m.text || m.content || "").trim(),
    }))
    .filter(m => m.content.length > 0 && m.content !== "..." && m.content !== "…");

  if (formatted.length === 0) return [];

  // Determine how many messages to keep based on context depth
  const maxMessages = contextDepth === "minimal" ? 4 :
    contextDepth === "standard" ? 10 :
      contextDepth === "deep" ? 20 :
        30; // "full"

  // Always keep the most recent messages
  const recentCount = Math.min(formatted.length, 6);
  const recent = formatted.slice(-recentCount);
  const older = formatted.slice(0, -recentCount);

  // Calculate recent token cost
  let recentTokens = 0;
  for (const msg of recent) {
    recentTokens += estimateTokensImproved(msg.content);
  }

  // If recent messages already exceed budget, truncate them
  if (recentTokens > tokenBudget) {
    const result: PrunedMessage[] = [];
    let used = 0;
    // Keep messages from most recent backward until budget hit
    for (let i = recent.length - 1; i >= 0; i--) {
      const tokens = estimateTokensImproved(recent[i].content);
      if (used + tokens > tokenBudget) break;
      result.unshift(recent[i]);
      used += tokens;
    }
    return result;
  }

  // Remaining budget for older messages
  const remainingBudget = tokenBudget - recentTokens;

  if (older.length === 0 || remainingBudget < 100) {
    return recent;
  }

  // Select important older messages that fit in budget
  const scored = older.map((msg, idx) => {
    let importance = 0;
    // User messages with questions or instructions are important
    if (msg.role === "user") {
      importance += 0.3;
      if (msg.content.includes("?")) importance += 0.1;
      if (/\b(must|should|always|never|require|important)\b/i.test(msg.content)) importance += 0.2;
    }
    // AI messages with decisions/code are important
    if (msg.role === "assistant") {
      if (msg.content.includes("```")) importance += 0.2;
      if (/\b(decided|conclusion|result|answer|solution)\b/i.test(msg.content)) importance += 0.15;
    }
    // Position: messages toward the end of the "older" block are more relevant
    importance += (idx / older.length) * 0.2;
    return { msg, importance, tokens: estimateTokensImproved(msg.content) };
  });

  // Sort by importance (highest first) and greedily fill budget
  scored.sort((a, b) => b.importance - a.importance);

  const selectedOlder: PrunedMessage[] = [];
  let olderUsed = 0;
  const limit = Math.min(scored.length, maxMessages - recentCount);
  for (let i = 0; i < limit; i++) {
    if (olderUsed + scored[i].tokens > remainingBudget) continue;
    selectedOlder.push(scored[i].msg);
    olderUsed += scored[i].tokens;
  }

  // Re-sort by original order
  const olderIndices = selectedOlder.map(m => older.indexOf(m));
  selectedOlder.sort((a, b) => older.indexOf(a) - older.indexOf(b));

  return [...selectedOlder, ...recent];
}

// ─── Main Context Builder ───────────────────────────────────────────────────

/**
 * Build optimized context for a generation request.
 *
 * This replaces the old pattern of:
 *   buildContext() + slice(-20) + buildAgentPrompt()
 * with a token-budget-aware assembler that only includes relevant data.
 */
export function buildOptimizedContext(opts: ContextOpts): ContextResult {
  const contextWindow = opts.contextWindow || 128000;
  const maxOutput = opts.maxOutputTokens || 4096;
  const intelligence = opts.intelligence;
  const contextDepth = intelligence?.contextDepth || "standard";

  // ─── Budget Calculation ──────────────────────────────────────────
  const outputReserve = maxOutput;
  const reasoningReserve = intelligence?.reasoningEffort === "maximum" ? 16000 :
    intelligence?.reasoningEffort === "high" ? 8000 :
      intelligence?.reasoningEffort === "medium" ? 4000 : 0;

  const availableInput = contextWindow - outputReserve - reasoningReserve;

  // Allocate sections (percentages of available input)
  const systemBudget = Math.floor(availableInput * 0.15);
  const toolsBudget = Math.floor(availableInput * 0.12);
  const stateBudget = Math.floor(availableInput * 0.05);
  const memoryBudget = Math.floor(availableInput * 0.08);
  const workspaceBudget = Math.floor(availableInput * 0.25);
  const historyBudget = Math.floor(availableInput * 0.35);

  const tokenEstimates: Record<string, number> = {};

  // ─── System Prompt ───────────────────────────────────────────────
  const systemPrompt = opts.agentSystemPrompt || "";
  tokenEstimates.system = estimateTokensImproved(systemPrompt);

  // ─── Tools ───────────────────────────────────────────────────────
  tokenEstimates.tools = estimateTokensImproved(opts.toolInstructions || "");

  // ─── Workspace Context ───────────────────────────────────────────
  let workspaceContext = "";
  if (opts.page || (opts.pages && opts.pages.length > 0)) {
    workspaceContext = legacyBuildContext({
      page: opts.page,
      pages: opts.pages || [],
      options: {
        includeCurrentPage: true,
        includeRecentPages: contextDepth !== "minimal",
        includeConnections: contextDepth === "deep" || contextDepth === "full",
        includeTags: contextDepth !== "minimal",
        includeMemory: false, // We handle memory separately
        includeUserProfile: false, // We handle profile separately
        tokenBudget: Math.floor(workspaceBudget * 3.8), // Convert to chars
      },
      memory: null,
      userProfile: null,
    });
  }
  tokenEstimates.workspace = estimateTokensImproved(workspaceContext);

  // ─── Memory (Relevance-scored) ───────────────────────────────────
  let memoryContext = "";
  const memory = getMemory();
  if (memory && Object.keys(memory).length > 0 && opts.currentPrompt) {
    const entities = opts.conversationState?.get().lastRelevantEntities || [];

    const scored = Object.entries(memory)
      .map(([key, entry]) => ({
        key,
        entry,
        score: scoreMemoryRelevance(key, entry as MemoryEntry, opts.currentPrompt || "", entities),
      }))
      .filter(e => e.score > 0.3) // Only include above-threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // Top 8 most relevant

    if (scored.length > 0) {
      const lines = scored.map(({ key, entry }) => {
        const text = (entry as MemoryEntry).text || (entry as MemoryEntry).content || "";
        return `- ${key.replace(/^(fact|pref):/, "")}: ${text}`;
      });
      memoryContext = `## Relevant Memory\n${lines.join("\n")}`;
    }
  }
  tokenEstimates.memory = estimateTokensImproved(memoryContext);

  // ─── User Profile ────────────────────────────────────────────────
  const userProfile = buildUserProfileContext() || "";
  tokenEstimates.userProfile = estimateTokensImproved(userProfile);

  // ─── Conversation State ──────────────────────────────────────────
  let conversationStateContext = "";
  if (opts.conversationState) {
    conversationStateContext = opts.conversationState.buildContextString();
  }
  tokenEstimates.conversationState = estimateTokensImproved(conversationStateContext);

  // ─── History (Token-budget-aware pruning) ─────────────────────────
  const historyTokenBudget = Math.max(
    historyBudget - tokenEstimates.workspace - tokenEstimates.memory,
    Math.floor(availableInput * 0.2) // Minimum 20% for history
  );
  const prunedHistory = pruneHistory(
    opts.messages || [],
    historyTokenBudget,
    contextDepth
  );
  tokenEstimates.history = prunedHistory.reduce(
    (sum, m) => sum + estimateTokensImproved(m.content),
    0
  );

  tokenEstimates.total = Object.values(tokenEstimates).reduce((a, b) => a + b, 0);
  tokenEstimates.available = availableInput;
  tokenEstimates.utilization = Math.round((tokenEstimates.total / availableInput) * 100);

  return {
    systemPrompt,
    workspaceContext,
    memoryContext,
    conversationStateContext,
    userProfile,
    prunedHistory,
    tokenEstimates,
  };
}
