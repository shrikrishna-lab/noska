/**
 * OpenCode Zen — which models a third-party API client can actually call.
 *
 * Verified against the live API with a valid key on 2026-10-10 (3 identical
 * calls each, fully deterministic):
 *
 *   POST /zen/v1/chat/completions  space-bunny-free   -> 200
 *   POST /zen/v1/chat/completions  mimo-v2.6-flash-free -> 403
 *   POST /zen/v1/chat/completions  big-pickle           -> 403
 *
 * ...all returning:
 *   403 {"type":"error","error":{"type":"FreeTierError",
 *        "message":"OpenCode's free tier can only be used from within OpenCode"}}
 *
 * This is deliberate policy, not a bug or a misconfiguration. The Zen docs say
 * so directly: the free models "are available on OpenCode for a limited time.
 * The team is using this time to collect feedback and improve the model."
 * They are a feedback programme for the OpenCode client, not a general free
 * API tier, and there is no sanctioned way for another product to reach them.
 * We therefore do NOT attempt to impersonate the OpenCode client to get past
 * the 403 — that would be circumventing an access control the provider put in
 * place on purpose.
 *
 * What we do instead is stop presenting these models as usable. Before this
 * existed, every "*-free" model was listed with a [Free] badge as if it were
 * free to anyone with a key, users picked one, got a 403, and the error copy
 * told them their API key was missing. The key was fine; the model was not
 * available to us.
 *
 * `space-bunny-free` is the exception Zen actually serves over the API. It is
 * also documented as a free model, so this is Zen carving out an exception
 * rather than a general "free means callable" rule.
 *
 * Re-verifying (run occasionally — Zen rotates this list):
 *   for id in <each free id from GET /models>:
 *     POST /zen/v1/chat/completions {"model":id,"max_tokens":16,
 *          "messages":[{"role":"user","content":"hi"}]}   -> 200 means accessible
 */

/**
 * Free-tier model ids Zen serves to third-party API clients.
 *
 * ── 2026-10-10 (later): this set is now EMPTY ──────────────────────────────
 * Zen closed the free tier for API clients partway through the day. Earlier
 * the same day a probe showed exactly one exemption:
 *
 *   space-bunny-free  -> 200        (HTTP 200, returned a real completion)
 *   every other *-free -> 403 FreeTierError
 *   big-pickle          -> 403 FreeTierError
 *
 * A later probe of the same account returned 403 for all ten, including
 * space-bunny-free, across three consecutive attempts:
 *
 *   big-pickle, ling-3.1-flash-free, mimo-v2.6-flash-free,
 *   muse-spark-1.2/1.3-contributor-free, nemotron-3.5-lightning-free,
 *   jev-1.13-free, step-5-preview-free, longcat-2.5-preview-free,
 *   space-bunny-free   ->  all 403 "OpenCode's free tier can only be used
 *                             from within OpenCode"
 *
 * So there is currently no free Zen model callable from Noska. The catalogue
 * still lists them, because that is what Zen's GET /models returns — but every
 * one of them is now client-only.
 *
 * This is exactly the drift the live test in opencodeZenLive.test.ts exists to
 * catch: "isZenApiAccessible matches live Zen behaviour for every free model"
 * failed the moment Zen changed policy. If a free model becomes reachable
 * again, add it here and that test turns green.
 *
 * Re-verifying:
 *   for id in <each free id from GET /models>:
 *     POST /zen/v1/chat/completions {"model":id,"max_tokens":8,
 *          "messages":[{"role":"user","content":"hi"}]}   -> 200 means accessible
 */
export const ZEN_API_ACCESSIBLE_FREE_MODELS: ReadonlySet<string> = new Set<string>([
  // Intentionally empty — see the note above.
]);

/**
 * Shown wherever a gated model would otherwise be presented as selectable.
 *
 * Deliberately avoids the words "API key": the whole failure was that users were
 * told to re-enter a perfectly good key. The actionable half is adding credit.
 */
export const ZEN_CLIENT_ONLY_NOTICE =
  "OpenCode serves its free models only inside the OpenCode app, so they cannot be called from Noska. " +
  "Add credit at opencode.ai/zen to use OpenCode Zen models.";

/** Conditions entry stored on the model's freeAccess record. */
export const ZEN_CLIENT_ONLY_CONDITION = "OpenCode-client-only free tier";

/**
 * True when Zen will serve this model to a plain API client.
 * Paid models are assumed accessible — they only need credit, which is a
 * billing state, not an access-control decision.
 */
export function isZenApiAccessible(modelId: string): boolean {
  const id = String(modelId || "").trim().toLowerCase();
  if (!id) return false;
  if (ZEN_API_ACCESSIBLE_FREE_MODELS.has(id)) return true;
  // `big-pickle` is priced "Free" in the docs but is gated like the rest.
  if (!looksFreeTier(id)) return true;
  return false;
}

/** Cheap free-tier heuristic: mirrors how the catalog marks free models. */
export function looksFreeTier(modelId: string): boolean {
  const id = String(modelId || "").trim().toLowerCase();
  return id.endsWith("-free") || id === "big-pickle";
}

/**
 * Split a discovered Zen catalog into what we can serve and what we cannot,
 * so callers can filter without repeating the rule.
 */
export function partitionZenCatalog<T extends { apiModelId?: string; id?: string }>(
  models: T[],
): { usable: T[]; clientOnly: T[] } {
  const usable: T[] = [];
  const clientOnly: T[] = [];
  for (const m of models) {
    const id = m.apiModelId || m.id || "";
    (isZenApiAccessible(id) ? usable : clientOnly).push(m);
  }
  return { usable, clientOnly };
}