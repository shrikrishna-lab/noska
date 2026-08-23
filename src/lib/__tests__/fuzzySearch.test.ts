import { describe, it, expect } from "vitest";
import { fuzzyScore } from "../../components/CommandPalette";

describe("fuzzyScore", () => {
  it("rejects non-matches", () => {
    expect(fuzzyScore("kubernetes", "Distributed Systems notes")).toBe(-1);
    expect(fuzzyScore("", "anything")).toBe(-1);
  });

  it("ranks exact and prefix matches highest", () => {
    const exact = fuzzyScore("algorithms", "algorithms");
    const prefix = fuzzyScore("alg", "algorithms");
    const contains = fuzzyScore("alg", "intro to algorithms");
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(contains);
    expect(contains).toBeGreaterThan(0);
  });

  it("supports subsequence matching across words", () => {
    // "dst sys" → "Distributed Systems"
    expect(fuzzyScore("dst sys", "Distributed Systems")).toBeGreaterThan(0);
    expect(fuzzyScore("dsm", "Distributed Systems")).toBeGreaterThan(0);
  });

  it("earlier matches score higher than later ones", () => {
    const early = fuzzyScore("net", "network layer");
    const late = fuzzyScore("net", "the internet works");
    expect(early).toBeGreaterThan(late);
  });
});
