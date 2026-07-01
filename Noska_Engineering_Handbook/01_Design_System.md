# 01 Design System

## Purpose

Design tokens, colors, typography, spacing, icons, and component conventions.

## UI Specification

### Layout
- Page max-width: 720px default, full-width toggle removes max-width constraint.
- Sidebar: 260px default, user-resizable via drag handle. Collapses to icon-only.
- Block indentation: 24px per nesting level.
- Slash menu: 352px wide, 460px max-height, 12px border-radius, glassmorphism backdrop-blur-md.
- Floating toolbar: positioned above selection, 320px max-width.

### Typography
- Body text: 16px (14.5px legacy — migrated to 16px). Line-height: 1.6.
- H1: 26px, bold, tracking-tight, mt-7 mb-2
- H2: 20px, semibold, tracking-tight, mt-5 mb-2
- H3: 16px, semibold, mt-4 mb-1
- H4: 13.5px, semibold, uppercase, mt-3 mb-0.5
- Callout: 13.5px
- Code: 12.5px monospace
- Slash menu: search 13px, items 13px/500 weight, description 11px, shortcut 10px, category 9px uppercase
- Font stack: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- Monospace: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas

### Spacing
- Grid unit: 4px
- Block padding: px-3 py-1.5 (12px horizontal, 6px vertical)
- TextArea internal padding: px-2 py-1.5 (8px horizontal, 6px vertical)
- Block gap: 4px (space-y-1)
- Slash item: px-3 py-1.5, gap-2.5 between icon and text
- Icon container: 28x28px (w-7 h-7), rounded-lg, centered

### Colors
- CSS variable system in src/index.css
  - `--text`: primary text
  - `--secondary`: secondary text
  - `--muted`: muted/de-emphasized text
  - `--accent`: accent/highlight (blue)
  - `--border`: borders and dividers
  - `--border-strong`: prominent borders
  - `--surface`: card/surface background
  - `--elevated`: elevated surface (modals)
  - `--hover`: hover state background
  - `--callout`: callout background
  - `--panel`: sidebar/panel background
  - `--shadow-floating`: floating element shadow
- 19 text color presets + 19 background color presets
- Selection: accent/8 for background, accent/10 for icon container

### Components
- **TextArea**: Universal text input (target: contentEditable div). No focus ring/underline. Auto-grows min 40px. Transparent background.
- **Button**: motion.button with whileHover/whileTap scale effects. CSS vars for text/muted/accent states.
- **Icon**: lucide-react icons. 14px default size in blocks, 13px in slash menu categories, 15px in grip handle.
- **Block wrapper**: motion.div with spring enter animation (stiffness 380, damping 28). Indentation via paddingLeft.
- **KBD tags**: monospace font, border, surface background, 10px text, px-1.5 py-0.5 rounded.
- **Category chip**: 9px font, 0.05em letter-spacing, uppercase, semibold, muted color.
- **Empty state**: 14 quick block type buttons with icons, 10px text, variant/accent style.

## Interaction

- **Mouse**: Hover reveals block-tools (opacity 0→100). Grip handle hover scales to 1.1. Plus button hover shows tooltip.
- **Keyboard**: Tab between interactive elements. Enter activates buttons. Space closes slash menu.
- **Touch**: Not implemented.
- **Focus**: Block has accent ring on selection (ring-1). TextArea has no visible focus indicator (natural caret).
- **Empty state**: Shows on no blocks. Click-to-add buttons with icon + label.
- **Loading state**: None for text — blocks appear instantly. Images show upload placeholder.
- **Error state**: Toast for clipboard/load failures. "Failed to load" for broken embeds.

## Accessibility

- **ARIA**: buttons have aria-label. Blocks have role="listitem". Slash menu uses combobox + listbox pattern.
- **Focus order**: Left-to-right, top-to-bottom. Grip → content → tools.
- **Screen reader support**: Slash menu has aria-live region for preview. Block type announced via aria-label.

## Performance

- Framer-motion animations use GPU-accelerated transforms only (scale, opacity, y).
- spring animations for block entrance (avoids layout thrashing).
- CSS transitions for hover states (duration-75/150).

## Architecture

- All design tokens are CSS variables (no JS theme switching yet).
- Component library in src/components/ui/: TextArea, PearlButton, AnimatedModal.
- Icons via lucide-react, no custom icon components.
- Block type CSS classes centralized in Editor.jsx `classByType` map.

## Acceptance Criteria

- Typography matches Notion proportions (16px body, 26px H1, etc.)
- Spacing uses 4px grid consistently
- Colors respect CSS variable system (no hardcoded color values)
- All buttons have aria-labels
- Hover/active states exist for all interactive elements
- Build passes with no console errors
