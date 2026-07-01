# Implementation Plan: Slash Command Preview Panel (Phase A)

## Overview

This plan implements the slash command side preview panel feature in 7 tasks organized into 4 waves. The implementation starts with data layer changes (CommandRegistry), then builds the UI component, integrates it into the existing menu, adds image assets, and finally implements comprehensive tests.

## Task Dependency Graph

```json
{
  "waves": [
    ["task1"],
    ["task2", "task4"],
    ["task3"],
    ["task5", "task6", "task7"]
  ]
}
```

## Tasks

- [ ] 1. Extend CommandRegistry.js with normalizePreview shim
  - [ ] 1.1 Add `normalizePreview(cmd)` function to `src/core/commands/CommandRegistry.js` that handles string, object, null, and undefined `preview` values
  - [ ] 1.2 Modify `getCommand()` export to call `normalizePreview` on its return value
  - [ ] 1.3 Modify `getAllCommands()` export to map results through `normalizePreview`
  - [ ] 1.4 Modify `getFilteredCommands()` export to map results through `normalizePreview`
  - [ ] 1.5 Add `preview.image` field (object form) to 10 representative commands: `text`, `toggle`, `table-view`, `board-view`, `image`, `code`, `mention-page`, `table-of-contents`, `2-columns`, `callout`

- [ ] 2. Create SlashCommandPreviewPanel.jsx component
  - [ ] 2.1 Create `src/components/editor/SlashCommandPreviewPanel.jsx` with props: `command`, `menuRect`, `side`, `visible`
  - [ ] 2.2 Implement description text rendering from `command.preview.description`
  - [ ] 2.3 Implement optional image rendering with `onError` handler to hide broken images
  - [ ] 2.4 Add framer-motion `AnimatePresence` + `motion.aside` with slide + fade animation
  - [ ] 2.5 Add accessibility attributes: `role="complementary"`, `aria-label="Command preview"`, image `alt` text from command title
  - [ ] 2.6 Style the panel with Tailwind CSS (260px width, rounded corners, shadow, themed colors)

- [ ] 3. Modify SlashCommandMenu.jsx to integrate preview panel
  - [ ] 3.1 Remove the existing bottom preview `<AnimatePresence>` block (the `border-t` section)
  - [ ] 3.2 Add a fixed-position wrapper `<div>` around both the menu and the preview panel
  - [ ] 3.3 Integrate `<SlashCommandPreviewPanel>` as a sibling of the menu's `<motion.div>`
  - [ ] 3.4 Add `menuRect` computation via `menuRef` + `getBoundingClientRect()` inside a `useLayoutEffect`
  - [ ] 3.5 Implement viewport collision detection (`panelSide` useMemo: right/left flip based on available space)
  - [ ] 3.6 Add viewport width state and resize listener; compute `panelVisible` flag (hidden below 500px)
  - [ ] 3.7 Auto-highlight first non-group item on menu open (set `highlightedIndex` in `useEffect([open])`)
  - [ ] 3.8 Update `aria-live` region to use `previewCmd.preview.description` instead of `previewCmd.preview` string

- [ ] 4. Add preview image assets for 10 representative commands
  - [ ] 4.1 Create `public/previews/` directory
  - [ ] 4.2 Add preview image for `text` command (`public/previews/text.png`)
  - [ ] 4.3 Add preview image for `toggle` command (`public/previews/toggle.png`)
  - [ ] 4.4 Add preview image for `table-view` command (`public/previews/table-view.png`)
  - [ ] 4.5 Add preview image for `board-view` command (`public/previews/board-view.png`)
  - [ ] 4.6 Add preview image for `image` command (`public/previews/image.png`)
  - [ ] 4.7 Add preview image for `code` command (`public/previews/code.png`)
  - [ ] 4.8 Add preview image for `mention-page` command (`public/previews/mention-page.png`)
  - [ ] 4.9 Add preview image for `table-of-contents` command (`public/previews/table-of-contents.png`)
  - [ ] 4.10 Add preview image for `2-columns` command (`public/previews/2-columns.png`)
  - [ ] 4.11 Add preview image for `callout` command (`public/previews/callout.png`)

- [ ] 5. Add test infrastructure and unit tests
  - [ ] 5.1 Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, and `fast-check` as devDependencies; add `"test"` script to `package.json`; create `vitest.config.js`
  - [ ] 5.2 Write unit test: `normalizePreview` handles string, object, null, and undefined inputs correctly
  - [ ] 5.3 Write unit test: 10 representative commands have `preview.image` defined after normalization
  - [ ] 5.4 Write unit test: Panel hidden at viewport width 499px, visible at 500px
  - [ ] 5.5 Write unit test: Image `onError` hides the img element (no broken image shown)
  - [ ] 5.6 Write unit test: Auto-highlight sets first non-group item index on menu open

- [ ] 6. Property-based tests (fast-check)
  - [ ] 6.1 Write property test: Property 1 — Preview tracks highlighted command (`previewTracking.property.test.js`) [PBT]
  - [ ] 6.2 Write property test: Property 2 — normalizePreview produces valid shape for all inputs (`normalizePreview.property.test.js`) [PBT]
  - [ ] 6.3 Write property test: Property 3 — Panel positioning correctness (`panelPositioning.property.test.js`) [PBT]
  - [ ] 6.4 Write property test: Property 4 — Panel visibility rule (`panelVisibility.property.test.js`) [PBT]
  - [ ] 6.5 Write property test: Property 5 — Image rendering conditioned on preview.image (`imageRendering.property.test.js`) [PBT]
  - [ ] 6.6 Write property test: Property 6 — Accessibility attributes present for all commands (`accessibility.property.test.js`) [PBT]

- [ ] 7. Integration tests
  - [ ] 7.1 Write integration test: Open menu → arrow down 5 times → verify panel content matches each highlighted command
  - [ ] 7.2 Write integration test: Mouse hover across multiple items → verify panel transitions correctly
  - [ ] 7.3 Write integration test: Menu positioned at right viewport edge → verify panel renders on left side

## Notes

- **NFR-2 compliance**: `vitest` and `fast-check` are added as devDependencies only — no new runtime dependencies.
- **Existing SlashCommandPreviewPanel.jsx**: A file already exists at this path — Task 2 will overwrite it with the new implementation per the design.
- **Image assets**: Phase A uses simple schematic placeholder PNGs (~200×120px). Full polished illustrations are deferred to Phase G.
- **Backward compatibility**: The `normalizePreview` shim ensures all existing commands with `preview: "string"` continue working without mass data migration.
