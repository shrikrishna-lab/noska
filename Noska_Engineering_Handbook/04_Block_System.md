# 04 Block System

## Purpose

Block lifecycle, type registry, rendering, nesting, drag/drop, context menus.

## UI Specification

### Block Types
Registered in `blockModel.js` (BLOCK_TYPES) and `BlockRegistry.jsx`. Block model defines:
- `type`: string identifier
- `props`: default properties per type
- `icon`: display icon
- `label`: human-readable name

Block type list (from BLOCK_TYPES):
- Basic: paragraph, heading_1-4, bulleted_list_item, numbered_list_item, to_do, toggle, callout, quote, divider
- Media: image, video, audio, file, bookmark, code
- Database: database (with view: table/board/gallery/list/calendar/timeline/dashboard/map)
- Advanced: table_of_contents, synced_block, template_button, breadcrumb, button, tabs, form, toggle-h1/h2/h3, ai-block, mermaid, ai-meeting, inline-equation, block-equation
- Layout: column_list, column, columns
- Other: page, link_to_page, mention, table

### Block Data Structure
```js
{
  id: string,          // crypto.randomUUID()
  type: string,        // block type identifier
  text: string,        // content (plain text with markdown markers)
  parentId: string|null,
  content: string[],   // child block IDs
  properties: {},      // type-specific properties
  checked: boolean,    // for todo
  open: boolean,       // for toggle
  imageWidth: number,  // for image resize
  color: string,       // text color
  bgColor: string,     // background color
  _depth: number,      // computed nesting depth (render-only)
  _isGroup: boolean,   // group header (for columns)
}
```

### Block Rendering
- `Editor.jsx` flattens blocks via `flattenEditorBlocks()` — computed property `_depth` added for indentation.
- Each block rendered as `motion.div` with:
  - `paddingLeft: depth * 24px` (visual nesting)
  - Block tools: grip handle (drag) + plus button (add)
  - Content: `renderBlockEditor(block, index, cls, ...)` returns type-specific JSX
  - Selection: `ring-1 ring-[var(--accent)]` + background tint when selected
  - Drag-over: `bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]` when dragged over
  - Class: `group relative flex gap-1 rounded py-1 transition hover:bg-[var(--hover)]/55`
- `renderBlockEditor.jsx`: switch on `block.type` returns appropriate component:
  - Text-based: `<TextArea>` with type-specific `cls` class
  - Code: `<CodeBlock>` with syntax highlighting
  - Image: `<ImageBlock>` with upload, resize, caption
  - Video: `<video>` element with resize handles
  - Embed: `<EmbedBlock>` for generic URL embeds
  - Database: `<DatabaseBlock>` with view switching
  - Table: `<SimpleTable>` editable grid
  - Columns: `<ColumnsBlock>` multi-column layout
  - Block equation: KaTeX renderer
  - Form: `<FormsBlock>` form builder
  - Button: action/template button
  - Synced block: synced content container
  - Breadcrumb: page hierarchy path
  - Block equation: centered KaTeX display math
  - Charts: bar/line/donut/number chart visualizations

### Nesting
- Visual nesting via `paddingLeft` on flat list.
- True nesting stored via `parentId` and `content` (child ID array).
- `blockFor()` (helpers.js) creates new blocks with proper properties.
- `indentBlockTree()` / `outdentBlockTree()` for Tab/Shift+Tab indentation.
- Nest into toggle via drag-drop on toggle block.

### Drag/Drop (Current — Native HTML5 DnD)
- **Drag start**: Grip handle `onDragStart` sets `dragState.fromBlockId`.
- **Drag image**: Custom div created, set via `setDragImage()`, removed after timeout.
- **Drag over**: Block `onDragOver` sets `isDragOver` visual. Container handles edge scroll and column creation.
- **Drop**: Block `onDrop` dispatches:
  - Toggle type: nest into toggle children
  - Column type: swap positions
  - Other: reorder via `onSwapBlocks`
- **Drag end**: `onDragEnd` cleans up `dragState`.
- **Column drop**: Container edge zones (80px left/right) create 2-column layout on drop.

### Drag/Drop (Target — @dnd-kit)
- Replace native HTML5 DnD with `@dnd-kit/core` + `@dnd-kit/sortable` (already used in sidebar).
- `useSortable` for each block with drag handle via `DragOverlay`.
- Smooth animated reorder with `verticalListSortingStrategy`.
- Multi-block drag via `selectedBlockIds`.
- Nest into toggle via drop detection.
- Column drop zones as sortable containers.

### Block Operations
- **Add**: `blockFor(type, text)` creates block, `onBlocks(insertBlockAfterTree(blocks, id, newBlock))` inserts.
- **Add above**: `insertBlockBeforeTree()` via Ctrl+Shift+Enter.
- **Delete**: `softDelete()` removes block from tree.
- **Duplicate**: `duplicateBlockTree()` clones block and children.
- **Move**: `onMoveBlock(id, dir)` swaps adjacent.
- **Patch**: `onBlockPatch(id, patch)` merges patch into block.
- **Indent/Outdent**: Tab/Shift+Tab transforms tree via `indentBlockTree` / `outdentBlockTree`.

### Context Menu
- Right-click or grip-click opens `BlockContextMenu`:
  - Turn into (type change)
  - Move up/down
  - Duplicate
  - Delete
  - Copy link
  - Color/background options
- Positioned at cursor via `onContextMenu` event.

## Interaction

### Mouse
- **Click**: Focus block. Click grip opens context menu.
- **Hover**: Show block tools (grip + plus).
- **Drag**: Grip handle reorder. Edge drop creates columns.
- **Right-click**: Context menu.

### Keyboard
- Enter: new block below
- Backspace (empty): delete block
- Tab/Shift+Tab: indent/outdent
- Ctrl+D: duplicate
- Ctrl+Shift+Arrow: move block
- Arrow Up/Down: navigate blocks

### Touch
- Long press: drag (not implemented).

## Accessibility

- Blocks have `role="listitem"` and `aria-label="<type> block"`.
- Grip handle has `aria-label="Block options and drag reorder"`.
- Drag state announced via `aria-grabbed` (not implemented).
- Context menu has `role="menu"` with `role="menuitem"` items (not implemented).

## Performance

- Block rendering is O(n) for n blocks. Virtualization needed at 500+.
- `renderBlockEditor` switch is called per block — no memoization of JSX output.
- Drag state uses module variable (no React state) — does not trigger re-renders.
- Image blocks lazy-load via native `<img loading="lazy">`.

## Architecture

### Block Registry
- `blockModel.js`: BLOCK_TYPES map, block creation, tree operations.
- `BlockRegistry.jsx`: UI-facing block list (category, icon, label, badge).
- `CommandRegistry.js`: slash command definitions with execute handlers.
- `helpers.js`: `blockFor()`, `renderInlineMarkdown()`, tree utilities.

### Tree Operations
- `src/utils/helpers.js`: `insertBlockAfterTree`, `insertBlockBeforeTree`, `softDelete`, `duplicateBlockTree`, `indentBlockTree`, `outdentBlockTree`, `getBlock`, `getChildren`, `flattenEditorBlocks`, `childIdsFor`.
- All tree operations are pure functions returning new block arrays (immutable).

## Acceptance Criteria

- All block types render correctly
- Drag reorder works (target: smooth animated via @dnd-kit)
- Indent/outdent preserves tree structure
- Block operations (add, delete, duplicate, move) work correctly
- Context menu accessible via right-click and grip click
- Empty block shows placeholder text
- Build passes with no console errors
