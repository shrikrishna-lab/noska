import { describe, it, expect, beforeEach } from "vitest";
import {
  classifyRewindTrigger,
  recordUtterance,
  getLastUtterance,
  clearRewindBuffer,
  executeRewind,
} from "../rewind-engine";

describe("Rewind Hands-Free Voice Self-Correction Engine", () => {
  beforeEach(() => {
    clearRewindBuffer();
  });

  describe("classifyRewindTrigger", () => {
    it("detects 'wait, I meant' corrections", () => {
      const res = classifyRewindTrigger("wait, I meant 4 PM");
      expect(res.isRewind).toBe(true);
      expect(res.isDelete).toBe(false);
      expect(res.correctionText).toBe("4 PM");
    });

    it("detects 'no actually' corrections", () => {
      const res = classifyRewindTrigger("no, actually Friday afternoon");
      expect(res.isRewind).toBe(true);
      expect(res.isDelete).toBe(false);
      expect(res.correctionText).toBe("Friday afternoon");
    });

    it("detects 'scratch that, make it' corrections", () => {
      const res = classifyRewindTrigger("scratch that, make it next Monday");
      expect(res.isRewind).toBe(true);
      expect(res.isDelete).toBe(false);
      expect(res.correctionText).toBe("next Monday");
    });

    it("detects pure deletion trigger 'scratch that'", () => {
      const res = classifyRewindTrigger("scratch that");
      expect(res.isRewind).toBe(true);
      expect(res.isDelete).toBe(true);
      expect(res.correctionText).toBe("");
    });

    it("detects 'correction:' triggers", () => {
      const res = classifyRewindTrigger("correction: send the report to Sarah");
      expect(res.isRewind).toBe(true);
      expect(res.isDelete).toBe(false);
      expect(res.correctionText).toBe("send the report to Sarah");
    });

    it("returns false for standard dictation", () => {
      const res = classifyRewindTrigger("The quick brown fox jumps over the lazy dog");
      expect(res.isRewind).toBe(false);
    });
  });

  describe("Rolling Utterance Buffer & In-Place Replacement", () => {
    it("records and retrieves the latest utterance", () => {
      const input = document.createElement("input");
      input.value = "The meeting is at 3 PM";

      recordUtterance(input, "at 3 PM", 15, 22, "The meeting is ", "");
      const last = getLastUtterance(input);
      expect(last).not.toBeNull();
      expect(last?.text).toBe("at 3 PM");
    });

    it("executes in-place replacement on an input element", () => {
      const input = document.createElement("input");
      input.value = "The meeting is at 3 PM";
      document.body.appendChild(input);

      recordUtterance(input, "at 3 PM", 15, 22, "The meeting is ", "");

      const rewindRes = classifyRewindTrigger("wait, I meant at 4 PM");
      const success = executeRewind(rewindRes, input);

      expect(success).toBe(true);
      expect(input.value).toBe("The meeting is at 4 PM");

      document.body.removeChild(input);
    });

    it("executes pure deletion ('scratch that') on an input element", () => {
      const input = document.createElement("input");
      input.value = "Hello world something extra";
      document.body.appendChild(input);

      recordUtterance(input, "something extra", 12, 27, "Hello world ", "");

      const rewindRes = classifyRewindTrigger("scratch that");
      const success = executeRewind(rewindRes, input);

      expect(success).toBe(true);
      expect(input.value.trim()).toBe("Hello world");

      document.body.removeChild(input);
    });
  });
});
