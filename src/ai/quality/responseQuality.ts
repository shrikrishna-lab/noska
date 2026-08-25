/**
 * Noska Intelligence — Response Quality Audit
 *
 * Heuristic detectors for generic/repetitive/untrustworthy response
 * patterns (#37). Pure functions over the final response text — cheap
 * enough to run on every assistant message; results feed analytics and
 * tests, never user-facing warnings (no nagging).
 */

export interface QualityIssue {
  kind:
    | "generic_opener"
    | "filler_closer"
    | "question_restate"
    | "template_headings"
    | "unverified_success_claim"
    | "excessive_disclaimer"
    | "repetitive_conclusion"
    | "raw_tool_dump";
  detail: string;
}

const GENERIC_OPENERS = [
  /^(sure|certainly|of course|great question|excellent question|good question|absolutely|happy to help|i'd be glad)[\s!,]/i,
];
const FILLER_CLOSERS = [
  /(let me know if you (need|have)[^.!]*|feel free to ask[^.!]*|hope this helps!?|i hope this answers[^.!]*|don'?t hesitate to reach out[^.!]*)\s*[!.]*$/i,
];
const UNVERIFIED_CLAIMS = [
  /\b(i have (successfully )?(created|updated|deleted|renamed|moved)|i've (successfully )?(created|updated|deleted|renamed|moved)|(created|updated|deleted) all \d+)\b/i,
];
const DISCLAIMERS = [
  /\b(as an ai( language model)?|i cannot and do not|it'?s important to note that|please consult (a|an) (professional|qualified))\b/gi,
];

/** Headings that smell like a forced template rather than real structure */
const TEMPLATE_HEADING_RE = /^#{1,3}\s*(summary|overview|introduction|conclusion|next steps|key points|final thoughts)\s*$/gim;

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Audit an assistant response for known generic patterns.
 * `userMessage` enables question-restating detection;
 * `toolResultsOk` (when provided) validates success claims against reality.
 */
export function auditResponse(
  response: string,
  opts: { userMessage?: string; toolResultsOk?: boolean } = {}
): QualityIssue[] {
  const text = String(response || "");
  if (!text.trim()) return [];
  const issues: QualityIssue[] = [];

  for (const re of GENERIC_OPENERS) {
    if (re.test(text)) {
      issues.push({ kind: "generic_opener", detail: "Opens with a filler pleasance" });
      break;
    }
  }

  const trimmedEnd = text.replace(/\s+$/, "");
  for (const re of FILLER_CLOSERS) {
    if (re.test(trimmedEnd)) {
      issues.push({ kind: "filler_closer", detail: "Ends with a boilerplate offer" });
      break;
    }
  }

  const um = String(opts.userMessage || "").trim().toLowerCase();
  if (um.length > 8) {
    // Restating the user's question verbatim-ish at the start
    const firstSentences = sentences(text).slice(0, 1).join(" ").toLowerCase();
    const umHead = um.slice(0, Math.min(40, um.length));
    if (firstSentences.includes(umHead) && !/^(you asked|regarding)/i.test(firstSentences)) {
      issues.push({ kind: "question_restate", detail: "Repeats the user's question back" });
    }
  }

  const headingMatches = text.match(TEMPLATE_HEADING_RE) || [];
  if (headingMatches.length >= 2) {
    issues.push({
      kind: "template_headings",
      detail: `Boilerplate heading scaffold detected (${headingMatches.length})`,
    });
  }

  if (opts.toolResultsOk === false && UNVERIFIED_CLAIMS.some((re) => re.test(text))) {
    issues.push({ kind: "unverified_success_claim", detail: "Claims success but tools failed" });
  }

  let disclaimerCount = 0;
  for (const re of DISCLAIMERS) disclaimerCount += (text.match(re) || []).length;
  if (disclaimerCount >= 1) {
    issues.push({ kind: "excessive_disclaimer", detail: "AI-disclaimer phrasing present" });
  }

  // Same concluding sentence twice (looping models)
  const sents = sentences(text);
  if (sents.length >= 4) {
    const last = sents[sents.length - 1].toLowerCase();
    if (sents.slice(0, -1).some((s) => s.toLowerCase() === last && last.split(" ").length >= 5)) {
      issues.push({ kind: "repetitive_conclusion", detail: "Conclusion sentence duplicated" });
    }
  }

  if (/Tool returned:\s*\[?\{/.test(text) || /Tool: \w+\nResult: \[?\{/.test(text)) {
    issues.push({ kind: "raw_tool_dump", detail: "Raw tool JSON surfaced to the user" });
  }

  return issues;
}

/** Compact label for analytics — e.g. "generic_opener+filler_closer" */
export function qualityLabel(issues: QualityIssue[]): string | null {
  if (!issues.length) return null;
  return issues.map((i) => i.kind).join("+");
}
