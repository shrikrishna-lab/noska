# 03 Editor Core

## Purpose

Editor architecture, block editing, selection, cursor navigation, undo/redo, clipboard.

## UI Specification

### Layout
- Editor is a single-column vertical block flow inside a scrollable section.
- Page title at top: `<input>` element (target: `contentEditable` heading div).
- Block list: `space-y-1` gap, each block is a `motion.div` with `role="listitem"`.
- Blocks indented via `paddingLeft: depth * 24px` (visual nesting, flat DOM).
- Empty state shown when `page.blocks.length === 0`.

### Components
- **Editor.jsx**: Orchestrator. Manages keyboard routing, slash menu, AI, drag state, block operations. ~2160 lines (needs splitting).
- **Block renderer**: `renderBlockEditor.jsx` — switch on `block.type` returns per-type editor JSX. ~860 lines.
- **TextArea**: Universal text input component (src/components/ui/index.jsx).
- **FloatingFormatToolbar**: Selection-aware formatting bar positioned above text.
- **SlashCommandMenu**: Filterable command menu triggered by `/`.

### Text Input (Current — TextArea)
- **Input element**: `<textarea>` with auto-grow via `scrollHeight` (min 40px).
- **Value**: Plain string with markdown markers for formatting.
- **Selection**: `textarea.selectionStart` / `selectionEnd`.
- **Auto-grow**: `useEffect` sets `el.style.height = auto; el.style.height = scrollHeight + 'px'` on every value change.
- **Placeholder**: "Press 'space' for AI or '/' for commands" for text blocks.
- **Focus**: No visual focus indicator (natural caret). Block wrapper gets selection ring.

### Text Input (Target — contentEditable)
- **Input element**: `<div contentEditable>` replacing `<textarea>`.
- **Value**: Rich HTML stored in block state (migration from markdown strings).
- **Formatting**: `document.execCommand` (legacy) → target: `Selection`/`Range` API with inline `<span>`/`<strong>`/`<em>` elements.
- **Selection**: `window.getSelection().getRangeAt(0)`.
- **Paste**: Preserve rich text from clipboard via `e.clipboardData.getData('text/html')`.
- **Auto-grow**: Natural div expansion (no JS height manipulation).

### Formatting System
- **Current (markdown)**: Ctrl+B inserts `**text**`. Formatting visible only when block loses focus (preview overlay with `dangerouslySetInnerHTML` and `renderInlineMarkdown()`).
- **Target (WYSIWYG)**: Ctrl+B applies `<strong>` to selected range. Formatting visible immediately.
- **Format toolbar**: Applies markdown markers to textarea selection. Detects selection via mouse/keyup events on textarea.
- **Format markers**: `**bold**`, `*italic*`, `<u>underline</u>`, `~~strikethrough~~`, `` `code` ``, `@@color:text@@` for colors, `@@bg-color:text@@` for backgrounds.
- **Marker regex**: `renderInlineMarkdown()` in helpers.js replaces markers with HTML for preview overlay.

### Markdown Shortcuts
- `# ` → H1, `## ` → H2, `### ` → H3, `#### ` → H4
- `- `, `* `, `+ ` → bullet list
- `[] ` → todo, `[x] ` → checked todo
- `> ` → toggle, `" ` → quote
- `1. ` → numbered list
- `--- `, `*** ` → divider
- Applied on space key, matched via shortcuts map in Editor.jsx.

### Slash Commands
- Trigger: `/` at block start or after space (regex: `(?:^|\s)\/([a-zA-Z0-9-]*)$`).
- Not triggered in `code` or `inline-equation` blocks.
- Not triggered during IME composition (`e.nativeEvent?.isComposing`).
- Menu appears at caret position (via `Selection.getRangeAt(0).getBoundingClientRect()`).
- 50+ commands across 7 categories: Basic, Media, Database, Advanced, Layout, Inline, Embeds.
- 20 color preset commands + block equation added.
- Keyboard: Arrow Up/Down navigate, Enter executes, Escape closes, Space closes.
- Space closes menu before inserting space (spec §6).
- Backspace on empty query closes menu (spec §6).
- Paste closes menu (spec §11).
- Visual: 352px wide, 460px max-height, list 320px max-height, 13px font, glassmorphism.

### Mentions
- Trigger: `[[` or `@` after space.
- Opens page mention dropdown.
- Selection inserts `[[Page Name]]` or `@Page Name` into text.
- Uses same inputRef-based positioning as slash menu.

### AI Integration
- Inline AI bar: triggered by `/ ` (slash + space).
- Selection AI bar: triggered on text selection.
- AI block: dedicated block type with generation interface.

## Interaction

### Mouse
- **Click**: Focus block textarea. Right-click for context menu (block actions).
- **Hover**: Reveal block-tools (grip + plus buttons). Grip for drag reorder.
- **Selection**: Click-drag selects text within a block. Drag-select across blocks (multi-block selection mode via `useMultiBlockSelect`).
- **Drag**: Grip handle starts native HTML5 drag (target: @dnd-kit).
  - Drop on toggle nests block inside.
  - Drop on column swaps positions.
  - Drop elsewhere reorders.
  - Drag to edge creates column layout.

### Keyboard
- **Navigation**: Arrow Up/Down moves between blocks. Tab/Shift+Tab indent/outdent.
- **Blocks**: Enter creates new block below. Backspace on empty deletes block.
- **Format**: Ctrl+B bold, Ctrl+I italic, Ctrl+U underline, Ctrl+Shift+S strikethrough, Ctrl+` code.
- **Duplicate**: Ctrl+D duplicates block.
- **Move**: Ctrl+Shift+Arrow Up/Down moves block.
- **Add above**: Ctrl+Shift+Enter adds block above.
- **Selection**: Shift+Arrow for text selection within block. Ctrl+A selects all text in block.
- **Undo/Redo**: Not implemented. Plan: snapshot-based undo stack per block.

### Touch
- Not implemented.

### Focus
- Block focus managed via inputRef (shared across blocks).
- Key handler lives on Editor.jsx, dispatched to active input.
- Slash menu keeps focus on search input (refocused after selection).
- Block blur saves markdown preview.

### Empty state
- Quick-add buttons: 14 block types with icons.
- Click adds a block of that type below any existing content.
- Hidden once blocks are present.

### Loading state
- None for text. Image uploads show placeholder. Database views show skeleton.

### Error state
- Toast notifications for clipboard operations. Error boundary for crashes.

## Accessibility

- **ARIA**: Block role="listitem". Block tools have aria-labels. Slash menu combobox/listbox pattern.
- **Focus order**: Title → blocks → block tools. Tab through interactive elements.
- **Screen reader**: Slash menu live region announces highlighted command. Block type announced.
- **Keyboard**: All operations accessible without mouse.

## Performance

- Input handler: `onChange` triggers re-render of single block (not entire page).
- Auto-grow: useEffect runs on every value change — potential bottleneck at scale.
- Preview overlay: `dangerouslySetInnerHTML` with `renderInlineMarkdown` runs on every render (optimize with useMemo).
- Slash menu: items memoized via useMemo, filtered via `getFilteredCommands`.
- Block entrance: spring animation runs once (motion.div initial/animate).

## Architecture

### Components
- `Editor.jsx`: Top-level editor. Too large (~2160 lines). Needs splitting into:
  - Editor (block list, drag, paste, keyboard router)
  - BlockWrapper (single block rendering, tools, context menu)
  - KeyboardManager (format shortcuts, navigation, slash trigger)
  - EditorCanvas (empty state, customize panel, title)

### Hooks
- `useMultiBlockSelect.js`: Click-drag selection across blocks. Marquee overlay rendering.
- `useOnboarding.js`: First-time tutorial flow.

### State ownership
- Blocks: `page.blocks` array, passed down and mutated via `onBlocks()` / `onPatch()` callbacks.
- Selection: `selectedBlockIds` Set, managed in Editor.
- Slash: `slashOpen`, `slashQuery`, `slashPos` state in Editor.
- Drag: `dragState` module-level variable (needs React ref or zustand).
- Focus: `inputRef` shared ref passed to each block.

### File organization (target)
```
src/components/editor/
  Editor.jsx              — orchestrator, keyboard, drag, empty state
  Block.jsx               — single block wrapper, tools, context menu
  renderBlockEditor.jsx   — switch on block.type
  SlashCommandMenu.jsx    — slash command UI
  FloatingFormatToolbar.jsx — formatting toolbar
  TextEditor.jsx          — contentEditable wrapper (replaces TextArea)
  CustomizePanel.jsx
  VersionHistoryPanel.jsx
  BlockContextMenu.jsx
```

## Acceptance Criteria

- Typing in a block auto-grows the textarea/contentEditable
- Enter creates a new block below, focused
- Backspace on empty block deletes it, focuses previous
- Markdown shortcuts (#, -, [], >, ") convert on space
- Ctrl+B/I/U apply formatting to selected text
- Arrow Up/Down navigate between blocks
- Tab indent, Shift+Tab outdent
- Empty state shows quick-add buttons
- Drag grip reorders blocks (target: smooth animated reorder)
- Paste URL auto-converts to embed/image/bookmark
- Slash command `/` opens menu, keyboard navigates, executes, closes on Escape/Space/Enter
- Build passes with no console errors
