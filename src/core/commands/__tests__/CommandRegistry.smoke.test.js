import { describe, it, expect } from "vitest";
import { getCommand, getAllCommands } from "../CommandRegistry";

describe("Checkpoint: All new commands registered and discoverable", () => {
  describe("20 embed commands are registered", () => {
    const EMBED_COMMANDS = [
      "abstract", "invision", "mixpanel", "framer", "whimsical",
      "miro", "sketch", "excalidraw", "typeform", "replit",
      "hex", "deepnote", "trello", "dropbox-paper", "evernote",
      "workflowy", "word", "monday", "quip", "zip",
    ];

    EMBED_COMMANDS.forEach((id) => {
      it(`embed command "${id}" is registered`, () => {
        const cmd = getCommand(id);
        expect(cmd).toBeTruthy();
        expect(cmd.id).toBe(id);
        expect(cmd.category).toBe("Embeds");
        expect(typeof cmd.execute).toBe("function");
        expect(cmd.title).toBeTruthy();
        expect(cmd.icon).toBeTruthy();
        expect(cmd.description).toBeTruthy();
        expect(Array.isArray(cmd.aliases)).toBe(true);
      });
    });
  });

  describe("5 chart commands are registered", () => {
    const CHART_COMMANDS = [
      "bar-chart-v", "bar-chart-h", "line-chart", "donut-chart", "number-chart",
    ];

    CHART_COMMANDS.forEach((id) => {
      it(`chart command "${id}" is registered`, () => {
        const cmd = getCommand(id);
        expect(cmd).toBeTruthy();
        expect(cmd.id).toBe(id);
        expect(cmd.category).toBe("Database");
        expect(typeof cmd.execute).toBe("function");
        expect(cmd.title).toBeTruthy();
        expect(cmd.icon).toBeTruthy();
        expect(cmd.description).toBeTruthy();
      });
    });
  });

  describe("feed-view and linked-view commands are registered", () => {
    it("feed-view is registered with correct metadata", () => {
      const cmd = getCommand("feed-view");
      expect(cmd).toBeTruthy();
      expect(cmd.id).toBe("feed-view");
      expect(cmd.category).toBe("Database");
      expect(typeof cmd.execute).toBe("function");
      expect(cmd.aliases).toEqual(expect.arrayContaining(["feed", "rss"]));
    });

    it("linked-view is registered with correct metadata", () => {
      const cmd = getCommand("linked-view");
      expect(cmd).toBeTruthy();
      expect(cmd.id).toBe("linked-view");
      expect(cmd.category).toBe("Database");
      expect(typeof cmd.execute).toBe("function");
      expect(cmd.aliases).toEqual(expect.arrayContaining(["linked", "source", "linked-db"]));
    });
  });

  describe("No duplicate command IDs", () => {
    it("all commands have unique IDs", () => {
      const allCmds = getAllCommands();
      const ids = allCmds.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
