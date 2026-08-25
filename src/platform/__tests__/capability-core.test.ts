/* Platform V5 — canonical capability core (pure logic) tests. */
import { describe, it, expect } from "vitest";
import {
  blocksToMarkdown, markdownToBlocks, COMMANDS, commandByName,
  extractId, mustId,
  initialReviewState, scheduleSM2,
  keyHasScope, requireScopeOf, normalizeScope,
  errors, PlatformError,
  currentRateWindow,
  EVENT_TYPES, isValidEventType,
} from "../../../supabase/functions/_shared/core/pure.ts";

describe("markdown ↔ native blocks", () => {
  it("round-trips headings, lists, todos, quotes, code and dividers", () => {
    const md = [
      "# Title",
      "## Sub",
      "- bullet one",
      "- [ ] open task",
      "- [x] done task",
      "> quote",
      "---",
      "1. numbered",
    ].join("\n");
    const blocks = markdownToBlocks(md);
    const types = blocks.map((b) => b.type);
    expect(types).toContain("heading_1");
    expect(types).toContain("heading_2");
    expect(types).toContain("bulleted_list_item");
    expect(types).toContain("to_do");
    expect(types).toContain("quote");
    expect(types).toContain("divider");
    expect(types).toContain("numbered_list_item");

    const back = blocksToMarkdown(blocks);
    expect(back).toContain("# Title");
    expect(back).toContain("- [ ] open task");
    expect(back).toContain("- [x] done task");
  });

  it("preserves code fences as single code blocks", () => {
    const blocks = markdownToBlocks("```ts\nconst a = 1;\nconst b = 2;\n```");
    const code = blocks.filter((b) => b.type === "code");
    expect(code).toHaveLength(1);
    expect(code[0].text).toBe("const a = 1;\nconst b = 2;");
    expect(code[0].language).toBe("ts");
  });

  it("every block gets an id", () => {
    for (const b of markdownToBlocks("# h\n\n- x\n\n> q")) expect(b.id).toBeTruthy();
  });
});

describe("command registry (native slash primitives)", () => {
  it("exposes the 12 real Noska slash commands", () => {
    const names = COMMANDS.map((c) => c.name);
    expect(names).toEqual([
      "/text", "/h1", "/h2", "/h3", "/bullet", "/numbered",
      "/todo", "/toggle", "/quote", "/callout", "/code", "/divider",
    ]);
  });

  it("resolves commands case-insensitively without slash", () => {
    expect(commandByName("/TODO")?.blockType).toBe("to_do");
    expect(commandByName("h2")?.blockType).toBe("heading_2");
    expect(commandByName("/nope")).toBeUndefined();
  });
});

describe("id resolution", () => {
  it("extracts UUIDs from raw ids and URLs", () => {
    const id = "9f1d3a2b-1111-2222-3333-abcdefabcdef";
    expect(extractId(id)).toBe(id);
    expect(extractId(`https://app.noska.me/my-workspace/${id}`)).toBe(id);
    expect(extractId("not-a-uuid")).toBeNull();
    expect(extractId(null)).toBeNull();
  });

  it("mustId throws INVALID_ID for garbage", () => {
    try { mustId("garbage", "page reference"); throw new Error("should have thrown"); }
    catch (e) {
      expect(e).toBeInstanceOf(PlatformError);
      expect((e as PlatformError).code).toBe("INVALID_ID");
      expect((e as PlatformError).status).toBe(400);
    }
  });
});

describe("SM-2 scheduling", () => {
  it("initial state is due immediately", () => {
    const s = initialReviewState();
    expect(s.interval).toBe(0);
    expect(s.repetition).toBe(0);
    expect(new Date(String(s.nextReview)).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("follows 1 → 6 → interval×ease progression for good answers", () => {
    let state = initialReviewState();
    state = scheduleSM2(state, 4);
    expect(state.interval).toBe(1);
    state = scheduleSM2(state, 4);
    expect(state.interval).toBe(6);
    state = scheduleSM2(state, 5);
    expect(state.interval).toBeGreaterThan(6);
    expect(state.repetition).toBe(3);
  });

  it("resets repetition on failures", () => {
    let state = initialReviewState();
    state = scheduleSM2(state, 4);
    state = scheduleSM2(state, 4);
    state = scheduleSM2(state, 1);
    expect(state.interval).toBe(1);
    expect(state.repetition).toBe(0);
  });
});

describe("scopes", () => {
  it("treats learning:* as alias of reviews:*", () => {
    expect(normalizeScope("learning:read")).toBe("reviews:read");
    expect(keyHasScope(["learning:read"], "reviews:read")).toBe(true);
    expect(keyHasScope(["reviews:write"], "learning:write")).toBe(true);
  });

  it("denies missing scopes", () => {
    expect(keyHasScope(["pages:read"], "pages:write")).toBe(false);
    expect(() => requireScopeOf(["pages:read"], "agents:run")).toThrow(PlatformError);
    try { requireScopeOf([], "agents:run"); }
    catch (e) { expect((e as PlatformError).extra).toMatchObject({ required_scope: "agents:run" }); }
  });
});

describe("error model", () => {
  it("produces standardized codes and statuses", () => {
    expect(errors.notFound("Page").status).toBe(404);
    expect(errors.forbidden().code).toBe("FORBIDDEN");
    expect(errors.unsupported("nope").status).toBe(501);
    expect(errors.validation("bad").status).toBe(400);
    expect(errors.conflict("dup").status).toBe(409);
  });
});

describe("event bus vocabulary", () => {
  it("accepts spec event names and rejects unknown ones", () => {
    for (const t of ["page.created", "task.completed", "study.card.created", "review.due",
      "agent.run.completed", "automation.run.completed", "workspace.created", "member.added"]) {
      expect(isValidEventType(t)).toBe(true);
    }
    expect(isValidEventType("page.exploded")).toBe(false);
  });
});

describe("rate window math", () => {
  it("aligns windows to minute boundaries", () => {
    const now = Date.UTC(2026, 7, 24, 12, 34, 56, 789);
    const { windowStart, resetEpochSec } = currentRateWindow(now);
    expect(windowStart.getTime()).toBe(Date.UTC(2026, 7, 24, 12, 34, 0, 0));
    expect(resetEpochSec).toBe(Math.ceil(windowStart.getTime() / 1000) + 60);
  });
});
