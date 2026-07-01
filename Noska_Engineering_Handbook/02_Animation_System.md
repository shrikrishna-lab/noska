# 02 Animation System

## Purpose

Motion principles, transition curves, durations, hover states, entrance/exit animations.

## UI Specification

### Motion Design Tokens
- Spring stiff: { stiffness: 380, damping: 28 } — block entrance, tooltip entrance
- Spring gentle: { stiffness: 260, damping: 22 } — toggle open/close, column resize
- Ease out: { duration: 0.2, ease: "easeOut" } — chevron rotation, panel slides
- Ease in out: { duration: 0.15, ease: "easeInOut" } — preview drawer
- Slash entry: { duration: 0.12, ease: [0.16, 1, 0.3, 1] } — menu appear
- Slash exit: { duration: 0.08, ease: [0.7, 0, 0.84, 0] } — menu dismiss
- Hover/select: duration-75 (75ms) CSS — block hover, item highlight

### Block Animations
- Entrance: spring(380, 28), opacity 0→1, y 3px→0. Applied via motion.div initial/animate.
- Exit (AnimatePresence): Not yet implemented for blocks. Planned: spring, opacity 1→0, y 0→-3.
- Indentation change: no animation (instant paddingLeft update).
- Selection ring: 75ms CSS transition (not animated via framer-motion).

### Slash Menu Animations
- **Container entry**: 120ms, cubic-bezier(0.16, 1, 0.3, 1), scale 0.95→1.0, opacity 0→1, y 6px→0
- **Container exit**: 80ms, cubic-bezier(0.7, 0, 0.84, 0), scale 0.95→0.97, opacity 1→0, y 0→3px
- **Preview drawer**: 150ms easeInOut, opacity 0→1, height 0→auto
- **Item highlight**: 75ms CSS transition-colors (not framer-motion)

### Graph Animations
- Node drag: framer-motion `drag` prop with spring physics
- Link hover: CSS transition stroke-width (duration-75)
- Node selection: 150ms ease-out scale 1→1.05

### Database Animations
- Row reorder: CSS transition (duration-100)
- View switch: instant (no crossfade yet)
- Filter dropdown: 120ms ease-out opacity + y

### Hover States
- Grip handle: scale 1.1, color shift (CSS hover:scale-110)
- Plus button: scale 1.1, accent color (CSS hover:scale-110)
- Block background: hover:bg-[var(--hover)]/55 (75ms)
- Slash item: bg-[var(--accent)]/8 on selection (75ms)
- Icon container: bg-[var(--accent)]/10 + accent text on selection (75ms)
- Buttons: active:scale-90 press effect (CSS)

## Interaction

- Hover: CSS transitions only (no JS animation) for performance
- Click: instant state change, no click animation
- Focus: no visible focus animation (natural browser caret)
- Drag: native HTML5 drag (legacy). Target: @dnd-kit with animated sortable feedback.
- Scroll: smooth scroll via scrollIntoView({ block: "nearest" })

## Accessibility

- prefers-reduced-motion: Not implemented. Plan: respect prefers-reduced-motion media query, disable all spring animations, use instant transitions.
- Transitions are non-blocking (CSS/framer-motion off main thread).

## Performance

- Framer-motion transforms only (never animates layout properties like width/height except when necessary).
- Spring animations are GPU-composited (scale, opacity, y).
- CSS transitions for hover states avoid JS overhead.
- AnimatePresence uses exit animations — ensures unmount doesn't cause layout jump.

## Architecture

- Animation primitives defined in src/features/motion/MotionSystem.js (SPRING_PRESETS, AnimatedModal).
- Block animations inline in Editor.jsx (motion.div on block wrapper).
- Slash menu animations inline in SlashCommandMenu.jsx.
- CSS transitions in tailwind classes (duration-75, transition-colors, etc.).

## Acceptance Criteria

- Slash menu entry/exit timing matches spec (120ms entry, 80ms exit, correct easings)
- Block entrance animation plays on page load and new block creation
- Hover states are instant (no delay)
- Drag has visual feedback (drop target highlight, drag preview)
- No animation blocks scrolling or typing
