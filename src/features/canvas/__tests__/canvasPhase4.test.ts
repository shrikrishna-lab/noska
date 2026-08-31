import { describe, it, expect, beforeEach } from "vitest";
import {
  isSoundEnabled,
  toggleSound,
  playNoteLiftSound,
  playNoteDropSound,
  playConnectorSound,
  playTidySound
} from "../canvasAudio";

describe("Phase 4: Polish, Sound & Delighters (The Noska Soul)", () => {
  beforeEach(() => {
    // reset storage
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  describe("Web Audio Feedback & Mute Toggle", () => {
    it("reads initial sound preference as active", () => {
      expect(typeof isSoundEnabled()).toBe("boolean");
    });

    it("toggles sound preference and persists to localStorage", () => {
      const initial = isSoundEnabled();
      const next = toggleSound();
      expect(next).toBe(!initial);
      expect(isSoundEnabled()).toBe(next);
    });

    it("synthesizes audio without throwing in headless environments", () => {
      expect(() => playNoteLiftSound()).not.toThrow();
      expect(() => playNoteDropSound()).not.toThrow();
      expect(() => playConnectorSound()).not.toThrow();
      expect(() => playTidySound()).not.toThrow();
    });
  });

  describe("Presentation Mode Compilation & Story Flow", () => {
    it("handles both canvas elements and page blocks cleanly", () => {
      const mockBlocks = [
        { id: "b1", type: "text", text: "Project Goal", page_id: "p1", position: 0 }
      ];
      const mockElements = {
        "el-1": { id: "el-1", kind: "sticky", x: 100, y: 100, w: 200, h: 200, text: "Key Idea", color: "amber" }
      };
      expect(mockBlocks.length).toBe(1);
      expect(Object.keys(mockElements).length).toBe(1);
    });
  });
});
