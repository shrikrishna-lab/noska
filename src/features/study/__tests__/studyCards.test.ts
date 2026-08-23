import { describe, it, expect } from "vitest";
import {
  hasCloze,
  clozeCount,
  blankCloze,
  revealCloze,
  cardSides,
  makeStudyBlock,
  studySectionBlocks,
} from "../studyCards";

describe("cloze parsing", () => {
  it("detects {{...}} and {{cN::...}} syntax", () => {
    expect(hasCloze("The OSI {{data link}} layer frames packets")).toBe(true);
    expect(hasCloze("TCP port {{c1::443}} carries HTTPS")).toBe(true);
    expect(hasCloze("No deletions here")).toBe(false);
    expect(hasCloze("")).toBe(false);
  });

  it("counts every deletion", () => {
    expect(clozeCount("{{a}} and {{b}} and {{c2::third}}")).toBe(3);
    expect(clozeCount("none")).toBe(0);
  });

  it("blanks for the front side", () => {
    expect(blankCloze("BGP runs over {{port 179}}")) .toBe("BGP runs over [ … ]");
  });

  it("reveals answers on the back side", () => {
    expect(revealCloze("BGP runs over {{port 179}}")).toBe("BGP runs over port 179");
    expect(revealCloze("{{c1::UDP}} is connectionless")).toBe("UDP is connectionless");
  });

  it("handles multiple deletions in one sentence", () => {
    const text = "{{IPSEC}} secures {{layer 3}}";
    expect(blankCloze(text)).toBe("[ … ] secures [ … ]");
    expect(revealCloze(text)).toBe("IPSEC secures layer 3");
  });
});

describe("cardSides", () => {
  it("uses study.answer as the back when present", () => {
    const sides = cardSides({ text: "What does DNS resolve?", study: { answer: "Domain names to IP addresses" } });
    expect(sides.front).toBe("What does DNS resolve?");
    expect(sides.back).toBe("Domain names to IP addresses");
    expect(sides.isCloze).toBe(false);
  });

  it("falls back to the full text when no answer exists", () => {
    const sides = cardSides({ text: "Recall the CAP theorem" });
    expect(sides.front).toBe(sides.back);
    expect(sides.isCloze).toBe(false);
  });

  it("blanks on front and reveals on back for cloze cards", () => {
    const sides = cardSides({ text: "HTTP {{304}} means not modified" });
    expect(sides.front).toBe("HTTP [ … ] means not modified");
    expect(sides.back).toBe("HTTP 304 means not modified");
    expect(sides.isCloze).toBe(true);
  });
});

describe("makeStudyBlock", () => {
  it("creates an editor-valid block carrying study + due review state", () => {
    const block = makeStudyBlock({ type: "flashcard", front: "Q?", answer: "A" });
    expect(block.id).toBeTruthy();
    expect(block.type).toBe("text");
    expect(block.text).toBe("Q?");
    expect(block.study.answer).toBe("A");
    expect(block.study.origin).toBe("ai-generated");
    // Due immediately, same contract as right-click → Add to review.
    const next = new Date(block.review.nextReview!).getTime();
    expect(next).toBeLessThanOrEqual(Date.now());
    expect(block.review.easeFactor).toBeCloseTo(2.5);
  });

  it("omits empty answers from study metadata", () => {
    const block = makeStudyBlock({ type: "question", front: "Why?", answer: "  " });
    expect(block.study.answer).toBeUndefined();
  });

  it("studySectionBlocks leads with a heading", () => {
    const blocks = studySectionBlocks([
      { type: "flashcard", front: "F1", answer: "A1" },
      { type: "cloze", front: "{{X}}", answer: "X" },
    ]);
    expect(blocks).toHaveLength(3);
    expect((blocks[0] as { text?: string }).text).toBe("Study Cards");
    expect(((blocks[1] as { review?: { nextReview?: string } }).review?.nextReview) ?? "").toBeTruthy();
  });
});
