# 05 Slash Menu

## Purpose

Slash command architecture, search, categories, keyboard navigation, insertion flow.

## UI Specification

### Layout
- **Width**: 352px fixed
- **Max-height**: 460px overall (container)
- **List body**: 320px max-height (scrollable)
- **Border radius**: 12px (rounded-xl)
- **Border**: 1px solid var(--border)
- **Background**: var(--elevated)/95 with backdrop-blur-md glassmorphism
- **Shadow**: var(--shadow-floating)
- **Z-index**: 130 (above all page content)

### Search Input
- Height: 10px top/bottom padding (py-[10px])
- Left padding: 32px (pl-[32px]) — room for search icon
- Right padding: 12px (pr-3)
- Font: 13px
- Search icon: 14px, positioned absolute left-3, muted color
- Clear button: X icon, appears when search has text
- Border: bottom border (border-[var(--border)])
- Placeholder: "Search or type a command..."

### Category Sidebar
- 36px wide (w-9), shows when search is empty
- Vertical list of category buttons: 24x24px (h-6 w-6)
- Active category: accent tint bg + accent icon color
- Inactive: muted icon, hover shows bg + text color
- Arrow Right/Left keys cycle categories

### Command Items
- Padding: 6px top/bottom, 12px left/right (py-1.5 px-3)
- Icon container: 28x28px (w-7 h-7), rounded-lg, centered
  - Selected: accent/10 bg + accent icon color
  - Default: surface bg + secondary text color
- Title: 13px font-weight 500
- Description: 11px, muted color, shown below title
- Shortcut badge: 10px monospace, surface bg, border, rounded, shown on right
- Star icon: 9px, shows for favorited items
- Category header: 9px uppercase semibold, tracking-wider (0.05em), with category icon

### Preview Panel
- Bottom panel shown when an item is highlighted
- 150ms easeInOut animation (opacity + height)
- Shows command icon, title, and preview description

### Footer
- Border-top separator
- Keyboard shortcut hints: Arrow up/down, Enter, Escape
- Monospace kbd tags with surface bg + border
- Right arrow + left arrow hint shown when categories visible (no search)

### Empty State
- "No blocks found" centered text, muted, 12px, shown when no commands match search

## Interaction

### Trigger
- Regex: `(?:^|\s)\/([a-zA-Z0-9-]*)$` — only at block start or after space
- Not triggered inside `code` or `inline-equation` blocks
- Not triggered during IME composition (e.nativeEvent?.isComposing)
- On match: menu opens, query set to matched group, positioned at caret

### Trigger States

#### State: Closed (default)
- No slash menu visible
- `/` character typed normally into text

#### State: Open (no query)
- Menu appears after `/` typed at valid position
- Shows all commands grouped by category with Suggested/Favorites at top
- First item not highlighted (index -1)

#### State: Open (with query)
- Commands filtered by fuzzy match on title, aliases, description
- Category sidebar hidden
- Results grouped by matching category
- Query clears to close menu behavior

#### State: Open (category filtered)
- Arrow Right/Left cycles single-category view
- Only shows commands from active category
- Search clears category filter

### Keyboard
- **ArrowDown**: Move highlight down (skip category headers). If at bottom, stay at bottom.
- **ArrowUp**: Move highlight up (skip category headers). If at top, stay at top.
- **ArrowRight** (no search): Cycle to next category sidebar
- **ArrowLeft** (no search): Cycle to previous category sidebar
- **Enter**: Execute highlighted command. If no highlight, execute first command.
- **Escape**: Close menu. Text remains (slash not removed).
- **Backspace**: If search is empty or text before cursor is "/", close menu. Otherwise delete character.
- **Space**: Close menu first, then insert space (spec §6 — don't trigger markdown shortcuts during menu).
- **Shift+Enter**: Pass through to block (soft newline) — not intercepted.
- **Paste**: Close menu (spec §11).

### Mouse
- **Click item**: Execute command, close menu, add to favorites
- **Hover item**: Set highlight to that item, show preview
- **Click category**: Toggle category filter
- **Click outside**: Close menu (handled by backdrop or blur)

### Search
- Fuzzy matching via character subsequence (not strict contains)
- Filtered via `getFilteredCommands()` in CommandRegistry.js
- Priority: title match > alias match > description match
- Synonyms: `/p` → Text, `/todo` → To-do, `/table` → Simple Table, etc.

### Favorites
- Stored in localStorage key "slash-favorites"
- Max 6 items
- Shown as first group when search is empty
- Clicking a command adds it to favorites

### Suggested
- Hardcoded set of 12 common commands: text, h1, h2, h3, bullet, todo, image, divider, toggle, callout, database-inline, code
- Shown after Favorites, before categorized groups
- Hidden when search is active

## Animation

- **Entry**: 120ms, cubic-bezier(0.16, 1, 0.3, 1), scale 0.95→1.0, opacity 0→1, y 6px→0
- **Exit**: 80ms, cubic-bezier(0.7, 0, 0.84, 0), scale 0.95→0.97, opacity 1→0, y 0→3px
- **Preview drawer**: 150ms easeInOut, opacity 0→1, height 0→auto
- **Item highlight**: 75ms CSS transition-colors (duration-75)

## Accessibility

- **Search**: role="combobox", aria-autocomplete="list", aria-expanded, aria-haspopup="listbox", aria-controls="slash-listbox", aria-activedescendant
- **List**: role="listbox", id="slash-listbox"
- **Items**: role="option", aria-selected, id="slash-item-{id}"
- **Live region**: off-screen aria-live="polite" announces highlighted command title + description
- **Dialog**: role="dialog", aria-label="Block type selector"

## Architecture

### Components
- `SlashCommandMenu.jsx`: UI component (347 lines). Manages search, highlight, groups, preview, animation.
- `CommandRegistry.js`: Command definitions (850 lines). Provides `getFilteredCommands()`, `getAllCommands()`, `registerCommand()`.
- `Editor.jsx`: Trigger detection, positioning, Keyboard interception (part of onKeyDown).

### Command Registry
- 50+ commands across 8 categories: Basic blocks, Media, Database, Advanced blocks, Layout, Inline, Embeds, Page actions
- Each command: `{ id, title, aliases, icon, category, description, shortcut, execute(ctx), preview(ctx), available(ctx) }`
- 20 color preset commands registered via loop
- Commands auto-register on import (`initRegistry()` called at module level)

### Execution Flow
1. User types `/` → trigger regex matches → menu opens
2. User selects command → `executeCommand(type, ctx)` called
3. Context passed: `{ block, text, onPatch, onAdd, onDelete, onNavigate, ... }`
4. Command calls `ctx.onPatch(blockForTree(block, type, text))` to transform block
5. Menu closes

### Categories (order)
1. Suggested / Favorites (dynamic)
2. Basic blocks
3. Media
4. Layout
5. Database
6. Advanced blocks
7. Inline
8. Embeds
9. Page actions (filtered out from slash menu, shown in page menu)

## Performance

- Commands list memoized via `useMemo` with `search`/`activeCategory`/`favorites` deps
- Flat items recomputed from groups via `useMemo`
- Highlight scrollIntoView uses `{ block: "nearest" }` — no smooth scroll
- Fuzzy match uses simple character subsequence (no Fuse.js or similar)

## Acceptance Criteria

- Typing `/` at block start opens menu
- Typing `/mid-word` does not trigger
- Typing filter text narrows results by title, alias, description
- Arrow keys navigate items, Enter executes, Escape closes
- Space closes menu before inserting
- Backspace on empty query closes menu
- Paste closes menu
- IME composition does not trigger slash
- Categories show, sidebar toggles filter
- Favorites persist across sessions
- Build passes with no console errors
