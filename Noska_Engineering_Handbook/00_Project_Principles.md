# 00 Project Principles

## Purpose

Noska is a Notion-compatible AI workspace. Every design decision prioritizes parity with Notion's block-based editor, graph view, database system, and AI features.

## UI Specification

- **Layout**: Single-column page with optional sidebar. Editor uses vertical block flow with nesting via padding (24px per level). 720px content width default, toggleable to full-width.
- **Typography**: Body text 16px, headings scale (26px H1, 20px H2, 16px H3, 13.5px H4). System font stack.
- **Spacing**: 4px grid. Block gap 4px (space-y-1). Block padding 8px horizontal, 6px vertical.
- **Colors**: CSS variable system (--text, --secondary, --muted, --accent, --border, --surface, --elevated, --hover, --panel, --callout). 19 color presets for text and background.
- **Components**: Every block renders via `renderBlockEditor.jsx` switch on `block.type`. Unified `TextArea` component for text input (currently `<textarea>`, target: `contentEditable` div).

## Interaction

- **Mouse**: Click to focus block. Hover reveals block-tools (grip + plus). Grip handle drag to reorder. Drag to edge creates columns.
- **Keyboard**: Arrow Up/Down navigates blocks. Enter creates new block. Tab/Shift+Tab indent/outdent. Ctrl+B/I/U for bold/italic/underline. Backspace on empty block deletes it.
- **Touch**: Not implemented (pending Mobile module 19).
- **Focus**: Block highlight on selection. Click outside editor to save.
- **Empty state**: New page shows 14 quick buttons (text, h1-h3, bullet, number, todo, image, code, callout, divider, toggle, table, database).
- **Loading state**: Skeleton for page blocks. Spinner for AI operations.
- **Error state**: Toast notifications for failures. Graceful fallback for embed blocks.

## Accessibility

- **ARIA**: Slash menu uses combobox/listbox pattern. Blocks are listitems. Block context menu uses dialog role.
- **Focus order**: Title → blocks → block tools. Tab through interactive elements.
- **Screen reader support**: Live region for slash menu preview. Block type labels. Icon alt text via aria-label.

## Performance

- **Rendering**: React 18 with automatic batching. Blocks memoized via useMemo. Virtualization planned for 500+ block pages.
- **Optimization**: Lazy-loaded database views. Code-split by route. Dynamic import for heavy libraries (KaTeX, Highlight.js).
- **Chunk size**: Currently 3.3MB main bundle — needs code splitting per subsystem.

## Architecture

- **Components**: Feature-based directory structure under src/components/, src/features/, src/modules/.
- **Hooks**: Custom hooks for multi-block selection, drag state, AI integration, database views.
- **State ownership**: Page state managed via `page` prop + `onBlocks`/`onPatch` callbacks. No global store. Blocks stored as flat array with parentId/content tree.
- **Editor**: Block component renders per-block. Editor component manages block list, keyboard routing, slash menu, AI hooks.

## Acceptance Criteria

- Functional: All 50+ commands work. Blocks render correctly. Drag reorder works.
- Accessible: Slash menu passes combobox pattern. Keyboard navigation covers all actions.
- Tested: Build passes. No console errors on page load, focus, typing, block operations.
