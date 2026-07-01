# Implementation Plan: Notion Command Parity

## Overview


This plan adds all missing slash commands to CommandRegistry to achieve full parity with Notion's command palette. The work covers 20 embed commands, 5 chart commands, and 2 database view commands — all wired to existing helpers (`blockForTree`, `blockForDatabaseView`). Property-based tests validate correctness properties using fast-check with Vitest.

## Tasks

- [x] 1. Add missing embed commands to CommandRegistry
  - [x] 1.1 Add 20 embed commands to the `embeds` array in `src/core/commands/CommandRegistry.js`
    - Add entries for: abstract, invision, mixpanel, framer, whimsical, miro, sketch, excalidraw, typeform, replit, hex, deepnote, trello, dropbox-paper, evernote, workflowy, word, monday, quip, zip
    - Each command uses pattern: `execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "embed-generic", ctx.text)); }`
    - Each command must have: id, title, aliases (at minimum the service name lowercase), icon, category "Embeds", description, preview string
    - Register them after the existing `pdf` and `codepen` entries in the embeds array
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, 1.18, 1.19, 1.20_

  - [x]* 1.2 Write property test: Embed commands produce embed-generic blocks
    - **Property 1: Embed commands produce embed-generic blocks**
    - **Validates: Requirements 1.1–1.19**
    - Create test file `src/core/commands/__tests__/CommandRegistry.property.test.js`
    - Use fast-check to generate arbitrary block contexts (id, parentId, content, text)
    - For each of the 20 embed command IDs, verify execute produces a patch with type "embed-generic" and preserves source block id, parentId, and content

- [x] 2. Add missing database chart and view commands
  - [x] 2.1 Add 5 chart commands to the `database` array in `src/core/commands/CommandRegistry.js`
    - Add entries for: bar-chart-v, bar-chart-h, line-chart, donut-chart, number-chart
    - Each uses: `execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "<chart-type>", ctx.text)); }`
    - Each must have: id, title, aliases, icon, category "Database", description, preview
    - Place after existing `database-full` entry in the database array
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.2 Add feed-view and linked-view commands to the `database` array
    - feed-view uses: `execute(ctx) { ctx.onPatch(blockForDatabaseView(ctx.block, "feed", ctx.text)); }`
    - feed-view aliases: ["feed", "rss"]
    - linked-view uses: `execute(ctx) { ctx.onPatch(blockForTree(ctx.block, "linked-view", ctx.text)); }`
    - linked-view aliases: ["linked", "source", "linked-db"]
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x]* 2.3 Write property test: Chart commands produce matching chart-type blocks
    - **Property 2: Chart commands produce matching chart-type blocks**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
    - For each chart command ID, verify execute produces a patch with type equal to the command ID and preserves block identity

  - [x]* 2.4 Write property test: Database view commands set correct view type
    - **Property 5: Database view commands set correct view type**
    - **Validates: Requirements 6.1, 3.1**
    - For each database view command (table-view, board-view, gallery-view, list-view, calendar-view, timeline-view, dashboard-view, map-view, feed-view), verify the patch has `database.view` set to the correct view type string

- [x] 3. Checkpoint — Verify commands registered and discoverable
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Write property tests for block identity and media commands
  - [x]* 4.1 Write property test: Block identity preservation (blockForTree invariant)
    - **Property 3: Block identity preservation (blockForTree invariant)**
    - **Validates: Requirements 4.1, 4.2, 7.6**
    - For any command using blockForTree, verify the result preserves the source block's id, parentId, and content array

  - [x]* 4.2 Write property test: Media commands clear text field
    - **Property 4: Media commands clear text field**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
    - For each media command (image, video, audio, file, bookmark), verify execute produces a patch with text set to empty string regardless of input text

  - [x]* 4.3 Write property test: Page toggle commands invert boolean state
    - **Property 6: Page toggle commands invert boolean state**
    - **Validates: Requirements 8.8, 8.9, 8.10**
    - For lock, full-width, small-text commands with a page having boolean values, verify onPagePatch is called with the negated value

- [x] 5. Write property tests for search, registration, and completeness
  - [x]* 5.1 Write property test: Command search filter correctness
    - **Property 7: Command search filter correctness**
    - **Validates: Requirements 10.2, 10.3**
    - For any query string, verify every result from `getFilteredCommands(query)` matches the query in title, aliases, or description (case-insensitive), and title-start matches appear first

  - [x]* 5.2 Write property test: Command registration invariant
    - **Property 8: Command registration invariant**
    - **Validates: Requirements 10.4, 10.5, 11.2**
    - For all commands, verify: non-empty unique id, non-empty title, non-empty icon, valid category, non-empty description, execute is a function

  - [x]* 5.3 Write property test: Registry bidirectional completeness
    - **Property 9: Registry bidirectional completeness**
    - **Validates: Requirements 11.1, 11.3**
    - Every block type in BlockRegistry has a corresponding command, and every command that produces a block type references one that exists in BlockRegistry

  - [x]* 5.4 Write property test: All execute functions produce side effects
    - **Property 10: All execute functions produce side effects**
    - **Validates: Requirements 11.4**
    - For any command with mocked context callbacks, executing the command invokes at least one context method

  - [x]* 5.5 Write property test: Synced-block produces unique group IDs
    - **Property 11: Synced-block produces unique group IDs**
    - **Validates: Requirements 7.2**
    - Two executions of "synced-block" with different block contexts produce distinct `syncedGroupId` values

- [x] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Vitest + fast-check (both already installed in devDependencies)
- Test file location: `src/core/commands/__tests__/CommandRegistry.property.test.js`
- All new commands follow established patterns — no new infrastructure needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2"] },
    { "id": 1, "tasks": ["1.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5"] }
  ]
}
```
