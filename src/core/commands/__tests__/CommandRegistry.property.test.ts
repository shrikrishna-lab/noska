import { describe, it, expect, beforeAll } from "vitest";
import * as fc from "fast-check";
import { getCommand, getFilteredCommands, getAllCommands, type CommandContext } from "../CommandRegistry";
import { BlockRegistry } from "../../../registry/BlockRegistry";

/**
 * Property 1: Embed commands produce embed-generic blocks
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10,
 * 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, 1.18, 1.19
 *
 * For any embed command id from the set {abstract, invision, mixpanel, framer,
 * whimsical, miro, sketch, excalidraw, typeform, replit, hex, deepnote, trello,
 * dropbox-paper, evernote, workflowy, word, monday, quip, zip} and for any valid
 * block context, executing the command SHALL produce a patch with type "embed-generic"
 * and preserve the source block's id, parentId, and content array.
 */
describe("Feature: notion-command-parity, Property 1: Embed commands produce embed-generic blocks", () => {
  const EMBED_COMMAND_IDS = [
    "abstract", "invision", "mixpanel", "framer", "whimsical",
    "miro", "sketch", "excalidraw", "typeform", "replit",
    "hex", "deepnote", "trello", "dropbox-paper", "evernote",
    "workflowy", "word", "monday", "quip", "zip",
  ];

  const arbBlockContext = () =>
    fc.record({
      id: fc.uuid(),
      parentId: fc.option(fc.uuid()).map((v) => v ?? null),
      content: fc.array(fc.record({ id: fc.uuid(), type: fc.string() }), { minLength: 0, maxLength: 5 }),
      text: fc.string(),
    });

  EMBED_COMMAND_IDS.forEach((commandId) => {
    it(`embed command "${commandId}" produces a patch with type "embed-generic" and preserves block identity`, () => {
      fc.assert(
        fc.property(arbBlockContext(), (blockCtx) => {
          const cmd = getCommand(commandId);
          expect(cmd).toBeTruthy();

          let patch = null;
          const ctx = {
            block: blockCtx,
            text: blockCtx.text,
            onPatch(p) { patch = p; },
          };

          cmd.execute(ctx);

          // Patch must have type "embed-generic"
          expect(patch).not.toBeNull();
          expect(patch.type).toBe("embed-generic");

          // Patch must preserve the source block's id
          expect(patch.id).toBe(blockCtx.id);

          // Patch must preserve the source block's parentId
          expect(patch.parentId).toBe(blockCtx.parentId);

          // Patch must preserve the source block's content array
          expect(patch.content).toEqual(blockCtx.content);
        }),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 5: Database view commands set correct view type
 * Validates: Requirements 6.1, 3.1
 *
 * For each database view command and its expected view type string,
 * executing the command SHALL produce a patch with database.view
 * set to the corresponding view type string and preserve block identity.
 */
describe("Property 5: Database view commands set correct view type", () => {
  const VIEW_COMMANDS = [
    { commandId: "table-view", expectedView: "table" },
    { commandId: "board-view", expectedView: "board" },
    { commandId: "gallery-view", expectedView: "gallery" },
    { commandId: "list-view", expectedView: "list" },
    { commandId: "calendar-view", expectedView: "calendar" },
    { commandId: "timeline-view", expectedView: "timeline" },
    { commandId: "dashboard-view", expectedView: "dashboard" },
    { commandId: "map-view", expectedView: "map" },
    { commandId: "feed-view", expectedView: "feed" },
  ];

  const arbBlockContext = () =>
    fc.record({
      id: fc.uuid(),
      parentId: fc.option(fc.uuid()).map((v) => v ?? null),
      content: fc.array(fc.record({ id: fc.uuid(), type: fc.string() })),
      text: fc.string(),
    });

  VIEW_COMMANDS.forEach(({ commandId, expectedView }) => {
    it(`${commandId} sets database.view to "${expectedView}" for any block context`, () => {
      fc.assert(
        fc.property(arbBlockContext(), (blockCtx) => {
          const cmd = getCommand(commandId);
          expect(cmd).toBeTruthy();

          let patch = null;
          const ctx = {
            block: blockCtx,
            text: blockCtx.text,
            onPatch(p) { patch = p; },
          };

          cmd.execute(ctx);

          // Verify database.view is set to expected view type
          expect(patch).not.toBeNull();
          expect(patch.database).toBeDefined();
          expect(patch.database.view).toBe(expectedView);

          // Verify block identity is preserved
          expect(patch.id).toBe(blockCtx.id);
          expect(patch.parentId).toBe(blockCtx.parentId);
          expect(patch.content).toEqual(blockCtx.content);
        }),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 2: Chart commands produce matching chart-type blocks
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 *
 * For any chart command id from the set {bar-chart-v, bar-chart-h, line-chart,
 * donut-chart, number-chart} and for any valid block context, executing the
 * command SHALL produce a patch with type equal to the command id and preserve
 * the source block's id, parentId, and content array.
 */
describe("Property 2: Chart commands produce matching chart-type blocks", () => {
  const CHART_COMMANDS = [
    "bar-chart-v",
    "bar-chart-h",
    "line-chart",
    "donut-chart",
    "number-chart",
  ];

  const arbBlockContext = () =>
    fc.record({
      id: fc.uuid(),
      parentId: fc.option(fc.uuid()).map((v) => v ?? null),
      content: fc.array(fc.record({ id: fc.uuid(), type: fc.string() })),
      text: fc.string(),
    });

  CHART_COMMANDS.forEach((chartId) => {
    it(`${chartId} produces a patch with type "${chartId}" and preserves block identity`, () => {
      fc.assert(
        fc.property(arbBlockContext(), (blockCtx) => {
          const cmd = getCommand(chartId);
          expect(cmd).toBeTruthy();

          let patch = null;
          const ctx = {
            block: blockCtx,
            text: blockCtx.text,
            onPatch(p) { patch = p; },
          };

          cmd.execute(ctx);

          // Verify the patch has type equal to the command id
          expect(patch).not.toBeNull();
          expect(patch.type).toBe(chartId);

          // Verify the patch preserves the source block's id, parentId, and content array
          expect(patch.id).toBe(blockCtx.id);
          expect(patch.parentId).toBe(blockCtx.parentId);
          expect(patch.content).toEqual(blockCtx.content);
        }),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 4: Media commands clear text field
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 *
 * For any media command from the set {image, video, audio, file, bookmark}
 * and for any valid block context regardless of input text content,
 * executing the command SHALL produce a patch with text set to the empty string.
 */
describe("Feature: notion-command-parity, Property 4: Media commands clear text field", () => {
  const MEDIA_COMMANDS = ["image", "video", "audio", "file", "bookmark"];

  const arbBlockContext = () =>
    fc.record({
      id: fc.uuid(),
      parentId: fc.option(fc.uuid()).map((v) => v ?? null),
      content: fc.array(fc.record({ id: fc.uuid(), type: fc.string() }), { minLength: 0, maxLength: 5 }),
      text: fc.string({ minLength: 1 }),
    });

  MEDIA_COMMANDS.forEach((commandId) => {
    it(`media command "${commandId}" clears text to empty string regardless of input text`, () => {
      fc.assert(
        fc.property(arbBlockContext(), (blockCtx) => {
          const cmd = getCommand(commandId);
          expect(cmd).toBeTruthy();

          let patch = null;
          const ctx = {
            block: blockCtx,
            text: blockCtx.text,
            onPatch(p) { patch = p; },
          };

          cmd.execute(ctx);

          // Patch must exist
          expect(patch).not.toBeNull();

          // Patch text must be empty string regardless of input text
          expect(patch.text).toBe("");
        }),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 6: Page toggle commands invert boolean state
 * Validates: Requirements 8.8, 8.9, 8.10
 *
 * For any toggle page-action command from the set {lock, full-width, small-text}
 * and for any page with a boolean value for the corresponding property,
 * executing the command SHALL call onPagePatch with the negated value of that property.
 */
describe("Property 6: Page toggle commands invert boolean state", () => {
  const TOGGLE_COMMANDS = [
    { commandId: "lock", property: "isLocked" },
    { commandId: "full-width", property: "fullWidth" },
    { commandId: "small-text", property: "smallText" },
  ];

  TOGGLE_COMMANDS.forEach(({ commandId, property }) => {
    it(`"${commandId}" calls onPagePatch with negated "${property}" for any boolean value`, () => {
      fc.assert(
        fc.property(fc.boolean(), (currentValue) => {
          const cmd = getCommand(commandId);
          expect(cmd).toBeTruthy();

          let pagePatch: Record<string, unknown> | null = null;
          // Deliberately a partial fake Page — this test only exercises a
          // single toggled property, not a real page shape. Cast through
          // `as any` at the ctx boundary rather than constructing a full
          // Page fixture that's irrelevant to what's under test.
          const ctx: CommandContext = {
            page: { [property]: currentValue } as any,
            block: { id: "test-block", parentId: null, content: [], text: "" },
            text: "",
            onPagePatch(patch: Record<string, unknown>) { pagePatch = patch; },
          };

          cmd!.execute(ctx);

          // onPagePatch must be called with the negated value
          expect(pagePatch).not.toBeNull();
          expect(pagePatch![property]).toBe(!currentValue);
        }),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 3: Block identity preservation (blockForTree invariant)
 * Validates: Requirements 4.1, 4.2, 7.6
 *
 * For any command that uses blockForTree in its execute function and for any
 * valid block context with an id, parentId, and content array, the resulting
 * patch SHALL have the same id, same parentId, and same content array as the
 * source block.
 *
 * Representative subset tested: text, h1, todo, toggle, callout, quote, code,
 * button, tabs, synced-block, toggle-h1, mermaid, block-equation
 */
describe("Feature: notion-command-parity, Property 3: Block identity preservation (blockForTree invariant)", () => {
  const BLOCKFORTREE_COMMANDS = [
    "text",
    "h1",
    "todo",
    "toggle",
    "callout",
    "quote",
    "code",
    "button",
    "tabs",
    "synced-block",
    "toggle-h1",
    "mermaid",
    "block-equation",
  ];

  const arbBlockContext = () =>
    fc.record({
      id: fc.uuid(),
      parentId: fc.option(fc.uuid()).map((v) => v ?? null),
      content: fc.array(fc.record({ id: fc.uuid(), type: fc.string() }), { minLength: 0, maxLength: 5 }),
      text: fc.string(),
    });

  BLOCKFORTREE_COMMANDS.forEach((commandId) => {
    it(`command "${commandId}" preserves block id, parentId, and content array`, () => {
      fc.assert(
        fc.property(arbBlockContext(), (blockCtx) => {
          const cmd = getCommand(commandId);
          expect(cmd).toBeTruthy();

          let patch = null;
          const ctx = {
            block: blockCtx,
            text: blockCtx.text,
            onPatch(p) { patch = p; },
          };

          cmd.execute(ctx);

          // Patch must exist (onPatch was called)
          expect(patch).not.toBeNull();

          // Patch must preserve the source block's id
          expect(patch.id).toBe(blockCtx.id);

          // Patch must preserve the source block's parentId
          expect(patch.parentId).toBe(blockCtx.parentId);

          // Patch must preserve the source block's content array
          expect(patch.content).toEqual(blockCtx.content);
        }),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 8: Command registration invariant
 * Validates: Requirements 10.4, 10.5, 11.2
 *
 * For all registered commands in CommandRegistry, each command SHALL have:
 * a non-empty unique id, a non-empty title, a non-empty icon string,
 * a category from the valid set, a non-empty description, and an execute
 * function of type "function".
 */
describe("Feature: notion-command-parity, Property 8: Command registration invariant", () => {
  const VALID_CATEGORIES = [
    "Basic blocks",
    "Media",
    "Database",
    "Advanced blocks",
    "Layout",
    "Inline",
    "Embeds",
    "Page actions",
  ];

  it("all commands have a non-empty unique id", () => {
    const commands = getAllCommands();
    const ids = commands.map((cmd) => cmd.id);

    for (const cmd of commands) {
      expect(typeof cmd.id).toBe("string");
      expect(cmd.id.length).toBeGreaterThan(0);
    }

    // No two commands share the same id
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all commands have a non-empty title", () => {
    const commands = getAllCommands();

    for (const cmd of commands) {
      expect(typeof cmd.title).toBe("string");
      expect(cmd.title.length).toBeGreaterThan(0);
    }
  });

  it("all commands have a non-empty icon string", () => {
    const commands = getAllCommands();

    for (const cmd of commands) {
      expect(typeof cmd.icon).toBe("string");
      expect(cmd.icon.length).toBeGreaterThan(0);
    }
  });

  it("all commands have a valid category", () => {
    const commands = getAllCommands();

    for (const cmd of commands) {
      expect(VALID_CATEGORIES).toContain(cmd.category);
    }
  });

  it("all commands have a non-empty description", () => {
    const commands = getAllCommands();

    for (const cmd of commands) {
      expect(typeof cmd.description).toBe("string");
      expect(cmd.description.length).toBeGreaterThan(0);
    }
  });

  it("all commands have an execute property of type function", () => {
    const commands = getAllCommands();

    for (const cmd of commands) {
      expect(typeof cmd.execute).toBe("function");
    }
  });
});


/**
 * Property 7: Command search filter correctness
 * Validates: Requirements 10.2, 10.3
 *
 * For any query string and registered command set, every command returned by
 * getFilteredCommands(query) SHALL match the query (case-insensitive) in at least
 * one of: title, aliases, or description. Furthermore, results whose title starts
 * with the query SHALL appear before results matched only by alias or description.
 */
describe("Feature: notion-command-parity, Property 7: Command search filter correctness", () => {
  it("every result matches the query in title, aliases, or description (case-insensitive)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        (query) => {
          const results = getFilteredCommands(query);
          const q = query.toLowerCase();

          for (const cmd of results) {
            const titleMatch = cmd.title.toLowerCase().includes(q);
            const aliasMatch = (cmd.aliases || []).some((a) =>
              a.toLowerCase().includes(q)
            );
            const descMatch = (cmd.description || "").toLowerCase().includes(q);

            expect(
              titleMatch || aliasMatch || descMatch,
              `Command "${cmd.id}" returned for query "${query}" but does not match in title, aliases, or description`
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("results whose title starts with query appear before results matched only by alias or description", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        (query) => {
          const results = getFilteredCommands(query);
          const q = query.toLowerCase();

          let seenNonTitleStart = false;

          for (const cmd of results) {
            const titleStartsWithQuery = cmd.title.toLowerCase().startsWith(q);

            if (!titleStartsWithQuery) {
              seenNonTitleStart = true;
            }

            if (titleStartsWithQuery && seenNonTitleStart) {
              // A title-start match appeared after a non-title-start match — ordering violated
              expect.fail(
                `Command "${cmd.id}" (title starts with "${query}") appeared after a command matched only by alias/description`
              );
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("with empty query, getFilteredCommands returns all available commands", () => {
    const allCommands = getAllCommands();
    const emptyQueryResults = getFilteredCommands("");

    // getFilteredCommands filters by availability with default empty context,
    // so some commands may be excluded. Verify it returns all commands
    // that don't have an availability gate, or whose gate passes with empty ctx.
    const availableCommands = allCommands.filter(
      (c) => !c.available || c.available({})
    );

    expect(emptyQueryResults.length).toBe(availableCommands.length);
  });
});


/**
 * Property 9: Registry bidirectional completeness
 * Validates: Requirements 11.1, 11.3
 *
 * For all block types listed in BlockRegistry, there SHALL exist a corresponding
 * command in CommandRegistry. Conversely, for all commands in CommandRegistry that
 * produce a block type (via blockForTree or blockForDatabaseView), that block type
 * SHALL exist in BlockRegistry.
 */

describe("Feature: notion-command-parity, Property 9: Registry bidirectional completeness", () => {
  // Known exceptions: block types in BlockRegistry that map to commands with different ids
  const BLOCK_TYPE_TO_COMMAND_MAP = {
    "ai-meeting-notes": "ai-meeting", // suggested category, maps to "ai-meeting" command
    "table": "simple-table", // BlockRegistry has "table" type, command is "simple-table"
  };

  // Commands that do NOT produce block types (page actions, formatting, utility)
  const NON_BLOCK_PRODUCING_COMMANDS = new Set([
    "copy-link", "copy-contents", "duplicate", "move-to", "trash",
    "present", "offline", "small-text", "full-width", "customize",
    "lock", "readonly", "suggest", "translate", "import", "export",
    "wiki", "analytics", "history", "review", "generate-study-cards",
    // Inline formatting commands
    "bold", "italic", "underline", "strikethrough", "inline-code",
    // Color commands
    ...Array.from({ length: 10 }, (_, i) => {
      const colors = ["default", "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
      return [`color-${colors[i]}`, `color-bg-${colors[i]}`];
    }).flat(),
    // Utility inline commands that don't produce distinct block types
    "color", "highlight",
  ]);

  // Embed commands that produce "embed-generic" type (their command id differs from block type)
  const EMBED_COMMANDS_PRODUCING_GENERIC = new Set([
    "google-drive", "tweet", "github-gist", "google-maps", "figma",
    "loom", "codepen", "pdf", "abstract", "invision", "mixpanel",
    "framer", "whimsical", "miro", "sketch", "excalidraw", "typeform",
    "replit", "hex", "deepnote", "trello", "dropbox-paper", "evernote",
    "workflowy", "word", "monday", "quip", "zip",
  ]);

  // Database view commands that produce "database" type blocks
  const DATABASE_VIEW_COMMANDS = new Set([
    "table-view", "board-view", "gallery-view", "list-view",
    "calendar-view", "timeline-view", "dashboard-view", "map-view", "feed-view",
  ]);

  // Commands that use onDelete + onAdd pattern (produce block type via onAdd, not onPatch)
  const ON_ADD_COMMANDS = new Set([
    "table-of-contents", "divider", "2-columns", "3-columns", "4-columns", "5-columns",
  ]);

  // Commands where the produced block type differs from command id
  const COMMAND_TO_BLOCK_TYPE = {
    "simple-table": "table",
    "page": "page", // uses onCreateSubpage, not blockForTree
    "link-to-page": "link-to-page",
  };

  // Commands to skip in Test 2 — they produce block types not tracked in BlockRegistry
  const SKIP_IN_TEST_2 = new Set([
    "template-button", // produces "template_button" — legacy type not in BlockRegistry
  ]);

  it("Test 1: Every block type in BlockRegistry has a corresponding command in CommandRegistry", () => {
    const allCommands = getAllCommands();
    const commandIds = new Set(allCommands.map((c) => c.id));

    const blockTypes = BlockRegistry.map((entry) => entry.type);

    const missingCommands = [];

    for (const blockType of blockTypes) {
      // Check if there's a direct command id match
      if (commandIds.has(blockType)) continue;

      // Check if there's a known mapping
      const mappedCommandId = BLOCK_TYPE_TO_COMMAND_MAP[blockType];
      if (mappedCommandId && commandIds.has(mappedCommandId)) continue;

      // Check if there's an embed command that produces embed-generic
      // (individual embed block types in BlockRegistry like "abstract", "invision" are
      //  represented by their matching command id)
      if (commandIds.has(blockType)) continue;

      missingCommands.push(blockType);
    }

    expect(missingCommands).toEqual([]);
  });

  it("Test 2: Every command that produces a block type has that type in BlockRegistry", () => {
    const allCommands = getAllCommands();
    const blockTypes = new Set(BlockRegistry.map((entry) => entry.type));

    const missingBlockTypes = [];

    for (const cmd of allCommands) {
      // Skip commands that don't produce blocks
      if (NON_BLOCK_PRODUCING_COMMANDS.has(cmd.id)) continue;

      // Skip commands with known legacy types not in BlockRegistry
      if (SKIP_IN_TEST_2.has(cmd.id)) continue;

      // Determine what block type this command produces
      let producedType = null;

      if (EMBED_COMMANDS_PRODUCING_GENERIC.has(cmd.id)) {
        producedType = "embed-generic";
      } else if (DATABASE_VIEW_COMMANDS.has(cmd.id)) {
        // Database view commands produce "database" type with a view property;
        // BlockRegistry lists them by their view-specific type (e.g., "table-view")
        producedType = cmd.id; // e.g., "table-view", "board-view" — these are in BlockRegistry
      } else if (ON_ADD_COMMANDS.has(cmd.id)) {
        producedType = cmd.id; // These add a block with type = command id
      } else if (COMMAND_TO_BLOCK_TYPE[cmd.id]) {
        producedType = COMMAND_TO_BLOCK_TYPE[cmd.id];
      } else {
        // Default: command produces a block with type = command id
        producedType = cmd.id;
      }

      if (producedType && !blockTypes.has(producedType)) {
        missingBlockTypes.push({ commandId: cmd.id, producedType });
      }
    }

    expect(missingBlockTypes).toEqual([]);
  });
});


/**
 * Property 10: All execute functions produce side effects
 * Validates: Requirements 11.4
 *
 * For any registered command and for any valid context with mocked callbacks,
 * executing the command SHALL invoke at least one context method (onPatch, onAdd,
 * onDelete, onNavigate, onPagePatch, onToast, onDuplicatePage, onImport, onExport,
 * onAnalytics, onHistory, onCreateSubpage, or setCustomizeOpen).
 */
describe("Feature: notion-command-parity, Property 10: All execute functions produce side effects", () => {

  // Mock navigator.clipboard globally for commands like copy-link, copy-contents.
  // Deliberately partial stand-ins for Navigator/Window/Location — this test
  // only needs `clipboard.writeText` and `location.href` to exist, not a
  // full jsdom-shaped global, so each assignment is cast through `as any`
  // rather than constructing complete fake globals.
  beforeAll(() => {
    if (typeof globalThis.navigator === "undefined") {
      (globalThis as any).navigator = {};
    }
    (globalThis.navigator as any).clipboard = {
      writeText: () => Promise.resolve(),
      readText: () => Promise.resolve(""),
    };
    if (typeof globalThis.window === "undefined") {
      (globalThis as any).window = {};
    }
    (globalThis.window as any).location = { href: "http://localhost/test-page" };
  });

  it("every registered command invokes at least one context callback when executed", () => {
    const commands = getAllCommands();
    expect(commands.length).toBeGreaterThan(0);

    const failures = [];

    for (const cmd of commands) {
      // Track which callbacks are invoked
      let callbackInvoked = false;

      const trackingFn = () => { callbackInvoked = true; };

      // Realistic block object
      const block = {
        id: "test-block-id-123",
        parentId: "test-parent-id-456",
        content: [{ id: "child-1", type: "text" }],
        text: "sample text",
        type: "text",
      };

      // Realistic page object for page action commands
      const page = {
        id: "test-page-id-789",
        title: "Test Page",
        isLocked: false,
        fullWidth: false,
        smallText: false,
        offline: false,
        permission: "edit",
        blocks: [
          { id: "b1", text: "Hello", type: "text" },
          { id: "b2", text: "World", type: "text" },
        ],
      };

      // Build mocked context with all standard callbacks as tracking functions.
      // `page` here is a deliberately partial fake (missing several real
      // Page fields not relevant to this side-effect test) — cast at the
      // ctx boundary rather than completing an irrelevant fixture.
      const ctx: CommandContext = {
        page: page as any,
        pages: [page],
        block,
        blocks: [block],
        text: "sample text",
        onPatch: trackingFn,
        onAdd: trackingFn,
        onDelete: trackingFn,
        onNavigate: trackingFn,
        onDuplicate: trackingFn,
        onBlocks: trackingFn,
        onPagePatch: trackingFn,
        onTrash: trackingFn,
        onToast: trackingFn,
        onAskAI: trackingFn,
        onCreateSubpage: () => { callbackInvoked = true; return "new-page-id"; },
        onSetOpenSlashBlockId: trackingFn,
        setSlashOpen: trackingFn,
        setCustomizeOpen: trackingFn,
        onDuplicatePage: trackingFn,
        onImport: trackingFn,
        onExport: trackingFn,
        onAnalytics: trackingFn,
        onHistory: trackingFn,
      };

      try {
        cmd.execute(ctx);
      } catch (e) {
        // Some commands may throw in test environment (e.g., clipboard issues)
        // As long as they attempted a side effect before the error, that's fine
      }

      if (!callbackInvoked) {
        failures.push(cmd.id);
      }
    }

    // All commands must produce at least one side effect
    expect(failures).toEqual([]);
  });
});


/**
 * Property 11: Synced-block produces unique group IDs
 * Validates: Requirements 7.2
 *
 * For any two executions of the "synced-block" command with different block contexts,
 * the resulting syncedGroupId values SHALL be distinct.
 */
describe("Feature: notion-command-parity, Property 11: Synced-block produces unique group IDs", () => {
  const arbBlockContext = () =>
    fc.record({
      id: fc.uuid(),
      parentId: fc.option(fc.uuid()).map((v) => v ?? null),
      content: fc.array(fc.record({ id: fc.uuid(), type: fc.string() }), { minLength: 0, maxLength: 5 }),
      text: fc.string(),
    });

  it("two executions of synced-block with different block contexts produce distinct syncedGroupId values", () => {
    fc.assert(
      fc.property(
        fc.tuple(arbBlockContext(), arbBlockContext()),
        ([blockCtx1, blockCtx2]) => {
          const cmd = getCommand("synced-block");
          expect(cmd).toBeTruthy();

          // Execute with first block context
          let patch1 = null;
          cmd.execute({
            block: blockCtx1,
            text: blockCtx1.text,
            onPatch(p) { patch1 = p; },
          });

          // Execute with second block context
          let patch2 = null;
          cmd.execute({
            block: blockCtx2,
            text: blockCtx2.text,
            onPatch(p) { patch2 = p; },
          });

          // Both patches must have a syncedGroupId
          expect(patch1).not.toBeNull();
          expect(patch2).not.toBeNull();
          expect(patch1.syncedGroupId).toBeDefined();
          expect(patch2.syncedGroupId).toBeDefined();

          // The syncedGroupId values must be distinct between the two executions
          expect(patch1.syncedGroupId).not.toBe(patch2.syncedGroupId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
