import { describe, it, expect } from "vitest";
import { getCommand, getAllCommands, registerCommand } from "../core/commands/CommandRegistry";

describe("normalizePreview", () => {
  it("converts string preview to object form", () => {
    const cmd = getCommand("h1");
    expect(cmd).toBeTruthy();
    expect(typeof cmd.preview).toBe("object");
    expect(typeof cmd.preview.description).toBe("string");
    expect(cmd.preview.description.length).toBeGreaterThan(0);
  });

  it("passes through object preview unchanged", () => {
    const cmd = getCommand("text");
    expect(cmd.preview).toEqual({
      description: "A simple text block for writing content",
      image: "/previews/text.svg",
    });
  });

  it("handles command with no preview field gracefully", () => {
    // Register a command with no preview
    registerCommand({
      id: "__test-no-preview",
      title: "Test No Preview",
      description: "A test command",
      category: "Basic blocks",
      icon: "Type",
      execute() {},
    });
    const cmd = getCommand("__test-no-preview");
    expect(cmd.preview).toEqual({ description: "A test command" });
  });

  it("handles null preview", () => {
    registerCommand({
      id: "__test-null-preview",
      title: "Test Null Preview",
      description: "Fallback desc",
      preview: null,
      category: "Basic blocks",
      icon: "Type",
      execute() {},
    });
    const cmd = getCommand("__test-null-preview");
    expect(cmd.preview).toEqual({ description: "Fallback desc" });
  });

  it("handles undefined preview", () => {
    registerCommand({
      id: "__test-undefined-preview",
      title: "Test Undef Preview",
      description: "Fallback desc 2",
      preview: undefined,
      category: "Basic blocks",
      icon: "Type",
      execute() {},
    });
    const cmd = getCommand("__test-undefined-preview");
    expect(cmd.preview).toEqual({ description: "Fallback desc 2" });
  });

  it("returns null/undefined for missing command ID", () => {
    const cmd = getCommand("__nonexistent-command-xyz");
    expect(cmd).toBeUndefined();
  });
});

describe("Representative commands have preview images", () => {
  const COMMANDS_WITH_IMAGES = [
    "text",
    "toggle",
    "table-view",
    "board-view",
    "image",
    "code",
    "mention-page",
    "table-of-contents",
    "2-columns",
    "callout",
  ];

  COMMANDS_WITH_IMAGES.forEach((id) => {
    it(`command "${id}" has preview.image defined`, () => {
      const cmd = getCommand(id);
      expect(cmd).toBeTruthy();
      expect(cmd.preview.image).toBeTruthy();
      expect(typeof cmd.preview.image).toBe("string");
      expect(cmd.preview.image).toMatch(/^\/previews\//);
    });
  });
});
