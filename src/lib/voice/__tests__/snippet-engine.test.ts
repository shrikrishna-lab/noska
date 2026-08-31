import { describe, it, expect } from "vitest";
import {
  matchVoiceSnippet,
  resolveSnippetVariables,
  saveVoiceSnippets,
  DEFAULT_VOICE_SNIPPETS,
} from "../snippet-engine";

describe("Fuzzy / Semantic Voice Snippets Engine", () => {
  it("matches built-in calendar snippet from various spoken phrases", () => {
    saveVoiceSnippets(DEFAULT_VOICE_SNIPPETS);

    const res1 = matchVoiceSnippet("my calendar link");
    expect(res1.matched).toBe(true);
    expect(res1.expandedText).toContain("cal.com/noska/30min");

    const res2 = matchVoiceSnippet("share my availability");
    expect(res2.matched).toBe(true);
    expect(res2.expandedText).toContain("cal.com/noska/30min");
  });

  it("resolves dynamic template variables correctly", () => {
    const template = "Today is {{day}}, {{date}} at {{time}}. {{signoff}}";
    const resolvedChat = resolveSnippetVariables(template, "chat");

    expect(resolvedChat).toContain("Cheers,");
    expect(resolvedChat).not.toContain("{{day}}");
    expect(resolvedChat).not.toContain("{{time}}");

    const resolvedEmail = resolveSnippetVariables(template, "email");
    expect(resolvedEmail).toContain("Warm regards,");
  });

  it("returns matched=false for unrelated speech", () => {
    const res = matchVoiceSnippet("just regular dictation about a project");
    expect(res.matched).toBe(false);
  });
});
