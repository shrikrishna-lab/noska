/**
 * Reasoning-block handling for assistant messages.
 *
 * `<think>…</think>` reaches the UI through two independent routes, which is
 * why it must be stripped in one shared place:
 *
 *   1. The stream wrapper in ai/core/StreamProtocol wraps a provider's
 *      `reasoning_content` in <think>…</think>, and
 *   2. Some models emit literal <think> tags inside their normal `content`
 *      (observed live from space-bunny-free).
 *
 * So a single message can carry several think blocks, and both have to be
 * removed — otherwise the model's internal reasoning renders as visible prose
 * in the middle of its answer.
 *
 * This lived inline in ChatMessage.tsx, which meant the other message renderer
 * (AIRightPanel's chat bubble) stripped tool envelopes but not think tags, and
 * showed the raw reasoning to the user.
 */

// Tags models actually emit. `thinking`/`thought` are not hypothetical —
// providers vary, and an unrecognised tag leaks the same way a missing closer does.
const TAGS = "think|thinking|thought";

/** A *complete* reasoning block: opening tag, body, matching closing tag. */
const THINK_BLOCK = new RegExp(`<(${TAGS})>([\\s\\S]*?)<\\/\\1>`, "gi");

/** Bracketed variant used by some providers. */
const BRACKET_BLOCK =
  /\[(?:Thinking Process|Reasoning Process|Thinking|Reasoning)\]([\s\S]*?)\[\/(?:Thinking Process|Reasoning Process|Thinking|Reasoning)\]/gi;

/**
 * An opening tag with no closing tag, anchored to the **start of the message**.
 *
 * This is the one that bit in practice: when a stream is cut off mid-reasoning
 * (token limit, abort, provider hiccup) the block never closes, so a
 * close-tag-required pattern matches nothing and the entire reasoning renders
 * as the answer.
 *
 * Start-anchoring is deliberate, and it is a genuine trade-off. Stripping *any*
 * unclosed opener to end-of-string also destroys legitimate prose that merely
 * mentions the tag — "use the <think> tag carefully" would lose everything
 * after it. A stream that begins inside a reasoning block is the truncation
 * shape and is unambiguous; a tag appearing mid-sentence is almost always prose
 * about reasoning, and the existing contract is to leave it alone.
 *
 * The cost: `answer text\n<think>reasoning…` with no closer keeps the trailing
 * reasoning. That is the rarer case, and erring toward showing text is safer
 * than silently deleting a user's answer.
 */
const UNCLOSED_AT_START = new RegExp(`^\\s*<(?:${TAGS})>[\\s\\S]*$`, "i");
const UNCLOSED_BRACKET_AT_START =
  /^\s*\[(?:Thinking Process|Reasoning Process|Thinking|Reasoning)\][\s\S]*$/i;

/** Remove `<think>` and `[Reasoning Process]` blocks, returning the visible text. */
export function stripThinking(text: string): string {
  if (!text) return "";
  return text
    .replace(THINK_BLOCK, "")
    .replace(BRACKET_BLOCK, "")
    .replace(UNCLOSED_AT_START, "")
    .replace(UNCLOSED_BRACKET_AT_START, "")
    .trim();
}

export interface SplitThinking {
  /** Concatenated reasoning, or null when the message had none. */
  thought: string | null;
  /** The message with all reasoning removed. */
  cleanText: string;
}

/**
 * Split a raw assistant message into reasoning and visible prose.
 * Every block is collected — a single `.replace()` only removes the first.
 */
export function splitThinking(text: string): SplitThinking {
  if (!text) return { thought: null, cleanText: text ?? "" };

  const collect = (re: RegExp) => [...text.matchAll(re)].map((m) => m[2].trim()).filter(Boolean);

  const thinks = collect(THINK_BLOCK);
  const brackets = collect(BRACKET_BLOCK);

  // An unclosed tail is reasoning too, and is the common case on a truncated
  // stream. Capture it before it gets stripped out from under us.
  const withoutComplete = text.replace(THINK_BLOCK, "").replace(BRACKET_BLOCK, "");
  const tail =
    withoutComplete.match(UNCLOSED_AT_START)?.[0] ??
    withoutComplete.match(UNCLOSED_BRACKET_AT_START)?.[0] ??
    "";

  const thought = [...thinks, ...brackets, stripTags(tail)].filter(Boolean).join("\n\n").trim();

  const cleanText = withoutComplete
    .replace(UNCLOSED_AT_START, "")
    .replace(UNCLOSED_BRACKET_AT_START, "")
    .trim();
  if (!thought) return { thought: null, cleanText };
  // Reasoning-only message: keep the reasoning, render nothing in the body.
  return { thought, cleanText: cleanText || "" };
}

/** Drop a leading opening tag from an unclosed block so the reasoning reads cleanly. */
function stripTags(block: string): string {
  return block.replace(new RegExp(`^<(?:${TAGS})>`, "i"), "").trim();
}