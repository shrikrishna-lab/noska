# Requirements: Slash Command Hover/Selection Preview Panel (Phase A)

## Overview

Upgrade the existing slash command menu preview from a small bottom-panel text snippet to a **side panel** that displays beside the menu (matching Notion's behavior). The preview updates on both mouse hover and keyboard arrow navigation, showing a description and optional illustrative image for the highlighted command.

This is Phase A of the Noska Slash Command Roadmap — it establishes the visual pattern and mechanism that all 60+ commands will use.

## Reference

- Screenshots in: `Commands Notion Images/` (18 reference images from Notion's slash menu)
- Existing implementation: `src/components/editor/SlashCommandMenu.jsx`
- Command registry: `src/core/commands/CommandRegistry.js`

---

## Functional Requirements

### FR-1: Side Preview Panel Position
The preview panel must appear **beside** the main menu (to the right by default), not below it. The main menu's size and position must not shift when the preview appears or disappears.

### FR-2: Preview Triggered by Highlight
The preview panel updates whenever a command is highlighted — either by:
- Mouse hover (onMouseEnter on a menu item)
- Keyboard arrow navigation (ArrowUp/ArrowDown changing highlightedIndex)

Both triggers must produce identical preview behavior.

### FR-3: Preview Content — Description
Every registered command (all 60+ in CommandRegistry.js) must have a `description` string displayed in the preview panel. All existing commands already have this field populated.

### FR-4: Preview Content — Image (Optional)
Each command's config gains an optional `preview.image` field (path to a static asset). When present, the preview panel displays the image above the description text. When absent, only the description is shown (no broken image placeholder).

### FR-5: Representative Images (5–10 commands)
For Phase A, add illustrative preview images for 5–10 representative commands covering at least one from each major section:
- Basic blocks (e.g., Text, Heading, Toggle)
- Database (e.g., Table view, Board view)
- Inline (e.g., Mention a page, Emoji)
- Media (e.g., Image, Code)
- Advanced blocks (e.g., Table of contents, Synced block)

These images prove the visual pattern works. Full asset coverage is deferred to Phase G.

### FR-6: Viewport Collision Handling
If the menu is positioned near the right edge of the viewport (insufficient space for the preview panel on the right), the preview panel flips to appear on the **left** side of the menu. Similarly handle top/bottom overflow so the preview panel never clips outside the viewport.

### FR-7: Preview Panel Visibility
- Preview panel is visible only when a command is highlighted (highlightedIndex >= 0 pointing to a non-group item)
- Preview panel smoothly animates in/out (consistent with existing framer-motion usage)
- When no command is highlighted, the panel is hidden — no empty box shown

### FR-8: Keyboard-Only Navigation
A user navigating entirely with keyboard (no mouse) must see the preview panel update on every ArrowDown/ArrowUp step. This is already partially working via the existing `useEffect` that sets `previewCmd` from `highlightedIndex` — the requirement is that the new side-panel implementation preserves this behavior.

### FR-9: Command Config Schema Extension
Extend the command definition schema to support:
```js
{
  id: string,
  title: string,
  // ... existing fields ...
  preview: {
    description: string,  // Required — shown in preview panel
    image?: string        // Optional — path to preview image asset
  }
}
```
Backward-compatible: commands that still use the old `preview: "string"` format should auto-adapt (treat the string as `preview.description` with no image).

### FR-10: Accessibility
- The preview panel content is announced to screen readers via an aria-live region (existing implementation already has this — preserve it)
- Preview panel has `role="tooltip"` or `role="complementary"` with appropriate aria-label
- Preview image has alt text derived from the command title

---

## Non-Functional Requirements

### NFR-1: Performance
Preview panel rendering must not cause visible jank or layout recalculation on the main menu. The panel should be absolutely/fixed positioned so it doesn't participate in the menu's flex layout.

### NFR-2: No New Dependencies
Use existing project dependencies only (React, framer-motion, lucide-react, Tailwind CSS). No new packages for this feature.

### NFR-3: Image Asset Format
Preview images should be lightweight PNGs or SVGs stored in `public/previews/` or `src/assets/previews/`. Target size: ~200×120px max, optimized for fast load.

### NFR-4: Responsive
On very narrow viewports (< 500px width), hide the preview panel entirely rather than overlapping the menu or breaking layout.

---

## Existing State (What's Already Built)

| Aspect | Current State | Phase A Target |
|--------|--------------|----------------|
| Preview location | Bottom of menu (inside menu container) | Side panel (beside menu, outside container) |
| Preview content | Text-only (`previewCmd.preview` string) | Description + optional image |
| Trigger | Keyboard + hover (both work) | Same — preserve existing behavior |
| Config format | `preview: "string"` on each command | `preview: { description, image? }` with backward compat |
| Viewport awareness | None — can overflow | Flip side on edge collision |
| Commands with preview text | All 60+ commands | Same + 5–10 with images |

---

## Out of Scope (Phase A)

- Illustrating ALL commands with images (Phase G)
- Color system fixes (Phase B)
- New block implementations (Phase C)
- Inline command completion (Phase D)
- CSV import / URL embed (Phase E)
- Any infrastructure-dependent features (Phase F)

---

## Verification Criteria

1. Open the slash menu with `/`
2. Arrow through all items using keyboard only — preview panel updates on every step
3. Hover mouse over items — preview panel updates
4. Preview panel appears beside the menu, not inside or below it
5. Commands with images show the image above description text
6. Commands without images show description only (no empty image box)
7. Position the menu near the right viewport edge — preview flips to left side
8. Menu does not shift/resize when preview appears
9. Build passes with no errors
10. No regressions in existing slash command selection behavior
