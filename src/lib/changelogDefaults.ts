export interface ChangelogEntry {
  id: string;
  title: string;
  description: string | null;
  tag: string;
  version: string | null;
  published_at: string | null;
  created_at: string;
}

export const DEFAULT_CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: "release-v1-2-2",
    title: "Free 5-Directional Block Resizer, Organic Playful To-Do Lists & Interactive Live Blocks Suite",
    tag: "Feature Update",
    version: "v1.2.2",
    published_at: "2026-09-15T00:00:00Z",
    created_at: "2026-09-15T00:00:00Z",
    description: `### 📐 Universal Free Block Resizing Engine
- **5-Directional Resizing Handles**: Free width (left/right blue edge bars), height (bottom pill), and simultaneous 2D free resizing (bottom-left and bottom-right curved corner handles).
- **Symmetric Breakout Expansion**: Wide and custom-width blocks now smoothly break out into both left and right margins with 1:1 cursor tracking and real-time dimension HUD tooltip.
- **Double-Click Reset**: Instant double-click reset on any handle or corner to restore default block dimensions.
- **Full Reading & Editor Parity**: Seamless resizing support across interactive blocks, embeds, code cells, tables, widgets, databases, videos, and charts in both Editor and Reading modes.

### ✨ Playful Animated To-Do Lists
- **Organic Pen Strikethrough Animation**: Smooth, variable-width monotonic pen stroke SVG strikethrough that renders cleanly on single letters, words, or full multi-line items without distortion or blotting.
- **Playful Particle Confetti & Sound Feedback**: Tactile celebration micro-interactions on task completion.

### ⚡ Interactive Sandboxed Blocks Suite
- **Dynamic KPI Dashboards & Charts**: Embed live interactive widgets, real-time counters, countdown timers, and charts with fluid width and height adaptation.`
  },
  {
    id: "release-v1-2-1",
    title: "Spatial Canvas 2.0: AI Spatial Synthesis, Smart Connectors, 2D Kanban Dual-View & Interactive Presentation Mode",
    tag: "Major Release",
    version: "v1.2.1",
    published_at: "2026-09-12T00:00:00Z",
    created_at: "2026-09-12T00:00:00Z",
    description: `### 🗺️ Infinite Spatial Canvas & Whiteboards Suite
- **AI Spatial Synthesis & Auto-Clustering**: Natural language prompt-driven card generation, 1-click thematic card clustering, and visual executive summaries across any canvas region.
- **Dynamic Magnetic Connectors**: Smooth curved (Bezier), orthogonal, and straight smart connectors with magnetic snap ports, directional arrows, and relationship labels.
- **Interactive Presentation Mode**: Turn canvas nodes and sections into a smooth step-by-step presentation deck with fluid camera panning, zooming, and full-screen presenter controls.
- **2D Canvas ⇄ Kanban Dual View Switcher**: Effortlessly switch between non-linear 2D spatial arrangement and structured Kanban columns by category or status.
- **Multiplayer Real-time Collaboration**: Live multiplayer cursors, presence tags, simultaneous card dragging, and instant cross-client synchronization.
- **Rich Media Cards & Attachments**: Sticky notes, markdown blocks, checklists, images, and audio voice dictations attached directly to canvas nodes.
- **Pre-built Templates Library**: 1-click templates for System Architecture, Brainstorming, Retrospectives, SWOT Analysis, User Journey Maps, and Flowcharts.`
  },
  {
    id: "release-v1-2-0",
    title: "Dynamic Island Fluid Voice, Visual Settings Studio & Developer API Keys Suite",
    tag: "Major Release",
    version: "v1.2.0",
    published_at: "2026-09-10T00:00:00Z",
    created_at: "2026-09-10T00:00:00Z",
    description: `### 🎙️ Fluid Voice Dictation & Dynamic Island
- **Live Sound-Wave Dynamic Island**: Multi-state fluid Dynamic Island bar with real-time waveform visualization, active voice dictation pill, and audio processing indicators.
- **Whisper AI Speech-to-Text**: Fast local and cloud-backed audio transcription with automatic capitalization, punctuation correction, and instant markdown insertion.
- **Visual Settings Studio**: Re-architected Preferences modal with granular appearance controls, accent theme pickers, glassmorphism density controls, and telemetry toggles.
- **Developer API Keys Management**: Secure key generation with scoped permissions, usage quotas, rate limits, and cryptographic key hashing.`
  },
  {
    id: "release-v1-1-0",
    title: "Interactive Markdown Cards, Quick Commands HUD & Auto-Updater Engine",
    tag: "Feature Update",
    version: "v1.1.0",
    published_at: "2026-09-08T00:00:00Z",
    created_at: "2026-09-08T00:00:00Z",
    description: `### ⚡ Command HUD & Performance Engine
- **Global Command HUD (Cmd+K / Ctrl+K)**: Instant fuzzy workspace search, quick page navigation, AI agent execution, and theme toggling in a floating HUD.
- **Interactive Markdown Code Blocks**: Syntax-highlighted code cells with copy buttons, language tags, and live LaTeX math formula rendering.
- **Silent Background Auto-Updater**: Instant differential updates with cryptographic signature verification for macOS, Windows, and Linux desktop clients.`
  },
  {
    id: "release-v1-0-0",
    title: "Noska V1.0 Official Launch: The AI-Powered Spatial Workspace",
    tag: "Initial Release",
    version: "v1.0.0",
    published_at: "2026-09-01T00:00:00Z",
    created_at: "2026-09-01T00:00:00Z",
    description: `### 🚀 Initial Public Release
- **All-in-One Spatial Workspace**: Combining infinite canvas, structured documents, Kanban boards, and AI assistance in a unified privacy-focused platform.
- **End-to-End Encryption Support**: Client-side encrypted workspace partitions with zero-knowledge data protection.
- **Cross-Platform Native Apps**: High-performance lightweight builds for macOS, Windows, and Linux powered by Tauri.`
  }
];
