import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, BookOpen, ChevronRight, Terminal, Shield, Users, Key, Database, 
  Layout, HelpCircle, ExternalLink, Menu, X, Plug, Copy, Check, ThumbsUp, ThumbsDown,
  Monitor, Mic, GraduationCap, KeyRound, Sparkles
} from 'lucide-react';
import './Docs.css';

export type BadgeTheme = 
  | 'violet' 
  | 'emerald' 
  | 'cyan' 
  | 'amber' 
  | 'rose' 
  | 'sage' 
  | 'indigo' 
  | 'sky' 
  | 'fuchsia' 
  | 'teal' 
  | 'coral' 
  | 'pink' 
  | 'lime' 
  | 'purple';

export interface DocItem {
  id: string;
  title: string;
  isNew?: boolean;
  theme?: BadgeTheme;
  badgeLabel?: string;
}

export const THEME_PALETTE: BadgeTheme[] = [
  'violet', 
  'emerald', 
  'cyan', 
  'amber', 
  'rose', 
  'sage', 
  'indigo', 
  'sky', 
  'fuchsia', 
  'teal', 
  'coral', 
  'pink', 
  'lime', 
  'purple'
];

/**
 * Dynamic registry of active NEW documentation features.
 * - Add any doc ID here to activate a dynamic badge.
 * - When multiple new items exist, each gets a DIFFERENT unique soft color automatically.
 * - When shifting to new docs, simply update this map and older badges disappear automatically.
 */
export const ACTIVE_NEW_DOCS: Record<string, { theme?: BadgeTheme; label?: string }> = {
  'canvas': { theme: 'violet', label: 'NEW' },
  'voice-hub': { theme: 'emerald', label: 'NEW' },
  'ai-assistant': { theme: 'cyan', label: 'NEW' },
  'desktop-tabs': { theme: 'rose', label: 'NEW' },
  'mcp-server': { theme: 'amber', label: 'NEW' },
  'all-ecosystems-catalog': { theme: 'sage', label: 'NEW' },
};

interface DocSection {
  id: string;
  icon: typeof BookOpen;
  title: string;
  items: DocItem[];
}

interface DocContent {
  [key: string]: {
    title: string;
    body: string;
  };
}

const sections: DocSection[] = [
  {
    id: 'getting-started',
    icon: BookOpen,
    title: 'Getting Started',
    items: [
      { id: 'introduction', title: 'Introduction' },
      { id: 'quickstart', title: 'Quick Start' },
      { id: 'core-concepts', title: 'Core Concepts' },
      { id: 'desktop-tabs', title: 'Desktop & Multi-Tab Navigation', isNew: true },
    ],
  },
  {
    id: 'integrations',
    icon: Plug,
    title: 'Integrations & Ecosystems',
    items: [
      { id: 'integrations-overview', title: 'Ecosystem Architecture' },
      { id: 'google-workspace-integration', title: 'Google Workspace' },
      { id: 'microsoft-365-integration', title: 'Microsoft 365' },
      { id: 'atlassian-integration', title: 'Atlassian (Jira & Confluence)' },
      { id: 'github-integration', title: 'GitHub & DevOps' },
      { id: 'slack-discord-integration', title: 'Slack & Discord' },
      { id: 'notion-linear-integration', title: 'Notion, Linear & Tasks' },
      { id: 'developer-cloud-integrations', title: 'Databases & Cloud Storage' },
      { id: 'all-ecosystems-catalog', title: 'All 28 Connected Apps', isNew: true },
    ],
  },
  {
    id: 'features',
    icon: Layout,
    title: 'Core Features',
    items: [
      { id: 'pages-blocks', title: 'Pages & Blocks' },
      { id: 'databases', title: 'Databases' },
      { id: 'canvas', title: 'Spatial Canvas', isNew: true },
      { id: 'voice-hub', title: 'Voice & Dynamic Island', isNew: true },
      { id: 'thought-graph', title: 'Thought Graph' },
      { id: 'spaced-repetition', title: 'Spaced Repetition & Study' },
      { id: 'ai-assistant', title: 'AI Assistant & 13 Live Models', isNew: true },
    ],
  },
  {
    id: 'workspace',
    icon: Users,
    title: 'Workspace',
    items: [
      { id: 'collaboration', title: 'Collaboration & Company Workspaces' },
      { id: 'sharing', title: 'Sharing & Permissions' },
      { id: 'keyboard-shortcuts', title: 'Keyboard Shortcuts Studio' },
    ],
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Security',
    items: [
      { id: 'encryption', title: 'Encryption' },
      { id: 'data-privacy', title: 'Data Privacy' },
      { id: 'rls', title: 'Row-Level Security' },
    ],
  },
  {
    id: 'developers',
    icon: Terminal,
    title: 'Developers',
    items: [
      { id: 'mcp-server', title: 'MCP Server', isNew: true },
      { id: 'api-keys', title: 'API Keys & Scopes' },
      { id: 'api-reference', title: 'API Reference' },
    ],
  },
  {
    id: 'account',
    icon: Key,
    title: 'Account',
    items: [
      { id: 'plans', title: 'Plans & Pricing' },
      { id: 'import-export', title: 'Import & Export' },
    ],
  },
  {
    id: 'support',
    icon: HelpCircle,
    title: 'Help & Support',
    items: [
      { id: 'contact-support', title: 'Support & Community' },
      { id: 'troubleshooting', title: 'Troubleshooting & Diagnostics' },
      { id: 'faq', title: 'Frequently Asked Questions' },
    ],
  },
];

const docs: DocContent = {
  'introduction': {
    title: 'Introduction',
    body: `Noska is a modern knowledge workspace that combines documents, databases, multi-provider AI assistance, voice capture, and spatial canvases into a single, quiet interface. Think of it as a second brain — a place where your ideas start as quick voice notes or bullet points, grow into structured documents, and become an interconnected knowledge base.

**Why Noska?**

Most tools force you to decide how to structure information before you've even figured out what you're working on. You pick between a doc, a spreadsheet, a whiteboard, or a project manager — and you're locked in. Noska takes a different approach: start with a blank page, and let structure emerge as understanding grows.

**Key principles:**

- **Start blank, stay flexible** — Every page begins as a simple document. Type \`/\` to insert any block type, or just write.
- **Spatial Thinking** — Toggle between linear documents and 2D Whiteboard Canvases with AI clustering and magnetic connectors.
- **Voice-Native Input** — Capture thoughts through the Apple-grade Dynamic Island voice capsule with real-time Wispr Flow transcription.
- **Structure emerges** — The same content can be viewed as a document, a table, a board, a calendar, or a spatial canvas.
- **Connections are automatic** — Link pages and the Thought Graph draws a living map of your relationships.
- **Universal Multi-Provider AI** — Bring your own API key from 13 providers (Claude 3.7, GPT-4.5, Gemini 2.0, DeepSeek R1, Groq, Ollama) with dynamic catalog discovery.`,
  },
  'quickstart': {
    title: 'Quick Start',
    body: `Get started with Noska in under a minute. No credit card required.

**1. Create an account**

Go to [noska.me](/) and sign up with your email or Google account. You'll land in your personal workspace instantly.

**2. Create your first page**

Click **+ New Page** in the sidebar or press \`Ctrl + N\`. A blank page opens. Start typing — there's no template to choose or setup to configure.

**3. Add blocks**

Type \`/\` anywhere on the page to open the block picker. Choose from 33 block types:

| Block Type | Shortcut | Description |
|---|---|---|
| Text | just type | Plain paragraph |
| Heading 1 | \`#\` | Large section heading |
| Heading 2 | \`##\` | Medium section heading |
| Bullet list | \`-\` | Unordered list |
| Numbered list | \`1.\` | Ordered list |
| To-do | \`[]\` | Playful checkable task with organic animated strikethrough |
| Interactive | \`/interactive\` | Live KPI dashboards, charts, counters & sandboxed widgets |
| Code block | \`\`\` | Code with syntax highlighting |
| Table | \`table\` | Rich data table |
| Flashcard | \`/flashcard\` | Spaced repetition study card |
| Canvas Board | \`/canvas\` | Embedded spatial canvas |
| Image / Media | \`image\` | Embed images, audio, or video |
| Callout | \`>\` | Highlighted block |

**4. Capture thoughts with Voice**

Click the microphone button in the bottom capsule or press \`Option + Space\` to open the Dynamic Island Voice Capsule for instant real-time voice-to-text dictation.

**5. Invite your team**

Click **Share** in the top-right corner and enter an email address. Your teammate gets real-time editing access immediately.

**6. Press \`Ctrl + K\`**

Open the command palette from anywhere. Search pages, run commands, trigger AI actions — all without touching the mouse.`,
  },
  'core-concepts': {
    title: 'Core Concepts',
    body: `Noska is built around a few simple concepts that combine to create a powerful knowledge workspace.

**Pages**

A page is the fundamental unit in Noska. Every page is a canvas that can contain any combination of blocks. Pages can be nested inside each other (parent-child), linked together, and organized across workspaces.

Pages have four viewing modes:
- **Document** — Linear, scrollable view
- **Canvas** — Spatial, zoomable view where blocks become draggable cards
- **Graph** — Network view showing connections between pages
- **Database** — Tabular or Kanban structured view

**Blocks**

Blocks are the building blocks of content. Everything on a page is a block — text, images, tables, code, embeds, flashcards, databases, interactive widgets, and more. Each block has its own identity, which means blocks can be:
- Dragged and reordered freely
- Freely resized in 5 directions (width edge bars, length pill, and 2D curved corners with symmetric margin breakout)
- Converted between block types
- Turned into spaced-repetition study flashcards
- Linked to from other pages with bi-directional references

**Databases**

Databases are pages that hold structured records. Each row is a page itself, meaning every database entry can have its own rich content. Databases support multiple views:
- **Table** — Spreadsheet-like grid
- **Board** — Kanban-style columns
- **Calendar** — Time-based layout
- **Timeline** — Gantt-style project view
- **Graph** — Relationship network

**Dynamic Island Voice Hub**

Capture spoken thoughts effortlessly with fluid droplet physics, live speech transcription, and instant AI voice agent interactions.

**Universal AI Engine**

Bring your own AI key across 13 providers (OpenAI, Anthropic, Google, DeepSeek, Groq, Mistral, Ollama, OpenRouter). Ask questions, summarize pages, generate content, and execute tool calls scoped strictly to your data.`,
  },
  'desktop-tabs': {
    title: 'Desktop & Multi-Tab Navigation',
    body: `Noska Desktop is engineered as a native, local-first application designed for multi-tasking workflows, fluid tab switching, and 0ms offline latency.

---

### 🖥️ Native Desktop Architecture

- **Local-First SQLite Engine** — All your notes, databases, and canvases are cached locally on your device. Search and write at 0ms latency even without internet connectivity.
- **Native Windowing** — Integrated macOS traffic lights and Windows 11 Snap layouts with borderless edge-to-edge frame design.
- **Cryptographic Session Pairing** — Secure pairing between Clerk auth and desktop local store with background token refresh.
- **Silent Background Updates** — Seamless auto-updater via GitHub releases and NSIS binary packages with live release check banners.

---

### 📑 Fluid Multi-Tab Experience

Work on multiple documents simultaneously just like in a high-performance web browser:

- **Open in New Tab** — \`Ctrl / Cmd + Click\` any page link, backlink, or Thought Graph node to open it in a new tab.
- **Fluid Spring Animations** — Smooth Framer Motion spring curves when reordering, opening, or closing tabs.
- **Live Hover Previews** — Hover over any background tab to see a live visual snapshot of its content without switching away.
- **Tab Context Menu** — Right-click any tab to access:
  - *Close Tab* (\`Ctrl / Cmd + W\`)
  - *Close Other Tabs*
  - *Close Tabs to the Right*
  - *Close All Tabs*
  - *Duplicate Tab*
  - *Pin Tab to Left*
- **Split View Workspaces** — Drag any tab to the left or right screen edge to work side-by-side on two documents simultaneously.

---

### ⌨️ Tab Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| **New Tab** | \`Ctrl / Cmd + T\` |
| **Close Current Tab** | \`Ctrl / Cmd + W\` |
| **Close All Tabs** | \`Ctrl / Cmd + Shift + W\` |
| **Next Tab** | \`Ctrl + Tab\` or \`Cmd + Option + →\` |
| **Previous Tab** | \`Ctrl + Shift + Tab\` or \`Cmd + Option + ←\` |
| **Switch to Tab 1-9** | \`Ctrl / Cmd + 1..9\` |
| **Reopen Last Closed Tab** | \`Ctrl / Cmd + Shift + T\` |`,
  },
  'pages-blocks': {
    title: 'Pages & Blocks',
    body: `Pages are the heart of Noska. Here's everything you need to know about working with them.

**Creating a page**

- Click **+ New Page** in the sidebar
- Press \`Ctrl + N\` from anywhere
- Use the command palette (\`Ctrl + K\`) and type "New page"

**Page types**

Each page has a type that determines its behavior:
- **Document** — Free-form page with any blocks
- **Database** — Structured rows and columns
- **Canvas** — Spatial layout with draggable blocks

You can switch between these modes at any time using the tabs at the top of the page — your data is preserved across views.

**Block types (33 total)**

| Category | Blocks |
|---|---|
| **Text** | Paragraph, Heading 1-3, Bullet list, Numbered list, To-do, Toggle, Callout, Quote |
| **Media** | Image, Video, Audio, File, Embed, Bookmark, Divider |
| **Code** | Code block (with syntax highlighting for 40+ languages), Inline code |
| **Data** | Table, Database view, Chart, Kanban board |
| **Learning** | Spaced repetition flashcards (SM-2), Quiz blocks |
| **Advanced** | Math (KaTeX), Diagram (Mermaid), Timeline, Map, Link preview |
| **Layout** | Columns, Spacer, Section divider |

**Organizing pages**

- **Drag and drop** pages in the sidebar to reorder or nest
- **Favorites** — Star important pages for quick access
- **Tags** — Add tags to categorize across workspaces
- **Backlinks** — Every page shows which other pages link to it`,
  },
  'databases': {
    title: 'Databases',
    body: `Databases transform your pages into structured, queryable collections. Every row in a database is a full page — not just a spreadsheet cell.

**Creating a database**

Type \`/\` and select **Database** from the block picker, or create a new page and switch to Database mode using the tabs at the top.

**Views**

Databases support multiple visualization modes:

\`\`\`
Table view    | Name    | Status      | Due date   |
              |---------|-------------|------------|
              | Task A  | In progress | 2026-07-20 |
              | Task B  | Done        | 2026-07-15 |

Board view    | To Do   | In Progress | Done       |
              |---------|-------------|------------|
              |         | Task A      | Task B     |

Calendar view | July 2026
              | Mon | Tue | Wed | Thu | Fri
              |     |     |  1  |  2  |  3
\`\`\`

**Properties**

Each column in a database is a property with a specific type:
- Text, Number, Date, Select, Multi-select, Status
- Person, File, URL, Email, Phone, Checkbox
- Formula, Rollup, Relation (link to another database)

**Filters & sorting**

Click the filter icon to show only matching rows. Combine multiple conditions:

\`\`\`
Status  is       "In Progress"
AND
Due date before  2026-08-01
\`\`\`

Sort by any property ascending or descending. Save filtered views as named presets.

**Relations**

Link databases together using the Relation property type. For example, link your "Projects" database to your "Tasks" database so each task belongs to a project.`,
  },
  'canvas': {
    title: 'Spatial Canvas & Whiteboards',
    body: `The Spatial Canvas transforms any document into an infinite 2D thinking canvas. Arrange blocks, sticky notes, visual cards, and diagrams freely across infinite space — complete with AI synthesis, smart connectors, interactive presentation mode, and a 2D Kanban switcher.

---

### 🌟 What's New in Canvas

- **Canvas AI Spatial Assistant** — Brainstorm, cluster cards by theme, summarize complex diagrams, and generate new cards directly on the canvas using natural language.
- **Dynamic Smart Connectors** — Draw curved, straight, or orthogonal relationship lines with directional arrowheads, connection ports, and labeled tags.
- **Interactive Presentation Mode** — Transform canvas cards and sections into a step-by-step presentation slide deck with smooth camera transitions.
- **2D Canvas ⇄ Kanban Dual View** — Toggle between freeform 2D spatial arrangement and structured Kanban columns in 1 click.
- **Multiplayer Realtime Collaboration** — See live collaborator cursors, presence tags, simultaneous dragging, and collaborative card edits.
- **Rich Media Cards & Voice Attachments** — Embed Markdown notes, checklists, code blocks, images, and audio voice dictations into cards.
- **Template Library** — 1-click starters for System Architecture, Brainstorming, Retrospectives, SWOT Analysis, User Journey Maps, and Flowcharts.

---

### 🚀 Entering Canvas Mode

To switch to Canvas view:
1. Open any page in your workspace.
2. Click the **Canvas** tab in the top navigation bar, or press \`Ctrl / Cmd + Option + C\`.
3. Your page blocks instantly become movable spatial cards without losing any text or formatting.

> All card coordinates and visual arrangements are automatically synced and persisted per page.

---

### 🧠 Canvas AI Assistant

The built-in Canvas AI helps you organize, brainstorm, and structure visual ideas:

- **AI Brainstorming** — Type a prompt (e.g., *"Brainstorm 6 growth marketing channels"*) and AI will scatter color-coded sticky cards across your canvas.
- **Auto-Clustering** — Select multiple scattered cards and choose **Cluster by Theme**. AI groups related ideas into spatial clusters with category titles.
- **Summarize Canvas** — Generate an executive summary or markdown report from any selected area or the entire canvas.
- **Auto-Layout Synthesis** — Automatically align and distribute messy brainstorms into clean grids, flowcharts, or radial maps.

---

### 🔗 Smart Connectors & Relationship Diagrams

Link concepts together visually with intelligent connectors:

- **Connector Tools** — Choose between **Curved (Bezier)**, **Orthogonal (Grid-aligned)**, and **Straight** connector lines.
- **Magnetic Ports** — Hover near any card edge to snap connectors to top, right, bottom, or left anchor ports.
- **Arrowheads & Styles** — Configure unidirectional, bidirectional, solid, dashed, or highlighted edges.
- **Relationship Labels** — Double-click any connector line to add descriptive text (e.g., *"depends on"*, *"calls API"*, *"relates to"*).

---

### 🎬 Interactive Presentation Mode

Present your canvas directly without exporting to Google Slides or Keynote:

1. Click the **Present** button in the canvas toolbar.
2. Canvas highlights cards or sections sequentially in presentation order.
3. Use \`Space\` or \`Arrow Keys\` to advance slides with smooth camera panning and zooming.
4. Includes a full-screen presenter HUD with slide overview and timer.

---

### 📊 2D Canvas ⇄ Kanban View Switcher

Switch your mental model with zero data friction:

- **Spatial Mode** — Position cards freely in 2D space for non-linear brainstorming and mind mapping.
- **Kanban Mode** — Group canvas cards into status columns (*To Do*, *In Progress*, *Done*) or custom categories.
- Dragging a card between Kanban columns automatically updates its category tags on the 2D canvas.

---

### 👥 Multiplayer Live Collaboration

Work together in real-time on the same infinite board:
- **Live Cursors** — See teammates' color-coded cursors and names moving across the canvas.
- **Live Dragging & Selection** — Cards highlight when a team member is actively moving or editing them.
- **Audio Feedback** — Subtle spatial sound effects provide tactile feedback during card creation and connection snapping.

---

### 🎨 Pre-built Template Library

Open the **Templates** panel in the canvas toolbar to insert pre-designed frameworks:

| Template | Purpose | Key Elements |
|---|---|---|
| **Brainstorming & Affinity Map** | Ideation sessions | Color-coded sticky notes, category clusters |
| **System Architecture** | Cloud & software design | Server nodes, database boxes, API arrows |
| **User Journey Map** | UX research & personas | Stages, user thoughts, pain points, opportunities |
| **Sprint Retrospective** | Team review | *What went well*, *What to improve*, *Action items* |
| **SWOT Analysis** | Strategic planning | Strengths, Weaknesses, Opportunities, Threats |
| **Mind Map & Graph** | Thought structuring | Central topic node with branching sub-nodes |

---

### ⌨️ Canvas Shortcuts & Gestures

| Action | Shortcut | Touch / Trackpad Gesture |
|---|---|---|
| **Pan Canvas** | \`Space + Drag\` or Middle Click | Two-finger drag |
| **Zoom In / Out** | \`Ctrl / Cmd + \` / \`Ctrl / Cmd - \` | Pinch to zoom |
| **Fit to Viewport** | \`Ctrl / Cmd + 0\` | Double-tap mini-map |
| **Multi-Select** | \`Shift + Drag\` marquee | Drag bounding box |
| **New Sticky Note** | Double-click empty space | Double-tap |
| **Draw Connector** | \`C\` or drag from anchor dot | Drag connection port |
| **Enter Presentation Mode** | \`Ctrl / Cmd + Option + P\` | Present button |
| **Export Canvas** | \`Ctrl / Cmd + Shift + E\` | Toolbar export menu (PNG / SVG / PDF) |`,
  },
  'voice-hub': {
    title: 'Voice & Dynamic Island Capsule',
    body: `Capture, transcribe, and interact with your workspace using the Apple-grade **Dynamic Island Voice Capsule** and Wispr Flow speech synthesis.

---

### 🌊 Dynamic Island Capsule Design

Engineered with organic liquid spring curves (\`stiffness: 420, damping: 25, mass: 0.85\`):

- **3-Piece Droplet Detachment** — The Language Selector \`[ ⌃ | 🌐 ]\`, Center Recording Capsule, and AI Agent Button \`[ ☺️ ]\` glide apart seamlessly like dividing mercury droplets.
- **Specular Liquid Glass Gloss** — Curved glass sheen gradient across all capsule surfaces with ambient breathing aura during active dictation.
- **Tactile Squircle Elasticity** — Real-time micro-interactions with gentle rotational spring recoil on the stop trigger.

---

### 🎙️ Speech-to-Text & Wispr Flow Dictation

- **Real-Time Whisper Transcription** — Convert spoken words into clean Markdown paragraphs at sub-second latency.
- **Language Detection & Multilingual Support** — Switch between 30+ languages on the fly using the Language Island trigger.
- **Voice Agent Conversation Mode** — Click the AI Agent button to speak naturally with your workspace assistant and receive instant streaming spoken audio answers.
- **Audio Voice Attachments** — Spoken notes can be inserted as inline audio blocks or attached directly to spatial canvas nodes.

---

### 🎨 Voice Customization Studio

Configure your capsule aesthetics in **Settings → Voice & Dictation**:

- **Capsule Themes** — Choose between *Apple Vision Glass*, *Siri Hologram Aura*, *Frosted Pearl*, *Cyber Azure*, and *Dynamic Island Pro*.
- **Real-Time Equalizer Waveforms** — Select from 4 visualizer styles:
  - *12 Dynamic Dots*
  - *13-Bar Formant Wave*
  - *24-Bar Studio Spectrum*
  - *3-Orb Siri Pulse*
- **Live Interactive Sandbox** — Test your microphone live inside settings to preview animations, squircle glows, and timer badges before writing notes.

---

### ⌨️ Voice Shortcuts

| Action | Shortcut |
|---|---|
| **Toggle Voice Recording** | \`Option + Space\` (Mac) / \`Alt + Space\` (Win) |
| **Cancel Voice Capture** | \`Escape\` |
| **Toggle Voice Agent Mode** | \`Option + A\` / \`Alt + A\` |`,
  },
  'thought-graph': {
    title: 'Thought Graph',
    body: `The Thought Graph visualizes your workspace as a living network of connected pages. Every link you create between pages becomes a node-and-edge relationship in the graph.

**Opening the graph**

- Click **Graph** tab at the top of any page
- Or open the command palette (\`Ctrl + K\`) and type "Open Thought Graph"

**How it works**

The graph is a force-directed layout where:
- **Nodes** = pages (size scales with connectedness)
- **Edges** = links between pages (parent-child, backlinks, tag relationships)
- **Colors** = page types (document, database, canvas)

**Interacting with the graph**

- **Click a node** to navigate to that page
- **Drag a node** to reposition it (position persists)
- **Scroll** to zoom in/out
- **Shift + click** to select multiple nodes
- **Right-click** to see page options (open, copy link, etc.)

**Filters**

Use the filter panel to show only:
- Pages in a specific workspace
- Pages with certain tags
- Pages modified within a time range
- Direct connections vs. full network

**Pro tip:** The graph is built from real links you create — not from a static sitemap. The more you link, the more useful the graph becomes.`,
  },
  'spaced-repetition': {
    title: 'Spaced Repetition & Study System',
    body: `Turn your knowledge base into an active memory recall engine with built-in **SuperMemo SM-2 spaced repetition flashcards**.

---

### 🧠 How Spaced Repetition Works

Spaced repetition predicts the optimal moment to review information just before you forget it, cementing facts into long-term memory with minimal review time:

1. Highlight any text or type \`/flashcard\` on any page.
2. Enter the **Front (Prompt)** and **Back (Answer)** of the card.
3. Cards are automatically scheduled into your daily review queue.
4. During review sessions, rate your recall quality from **0 (Forgot)** to **5 (Perfect Recall)**.
5. The SM-2 algorithm recalculates ease factors and schedules the next optimal interval (1 day, 6 days, 16 days, etc.).

---

### 📚 Study Hub & Analytics

- **Daily Review Queue** — Access all due cards across your entire workspace from the Study Hub in the sidebar.
- **Knowledge Retention Curves** — Track memory retention percentage, daily review streaks, and card difficulty distributions.
- **Workspace Flashcard Filtering** — Review cards by workspace, subject tag, or individual document.
- **AI Card Generation** — Select any document section and choose **Generate Flashcards with AI** to create question-and-answer pairs instantly.`,
  },
  'ai-assistant': {
    title: 'AI Assistant & Live Dynamic Model Sync',
    body: `Noska AI connects 13 industry-leading LLM providers directly into your knowledge base. Instead of locking you into hardcoded, outdated model lists, Noska implements an **authenticated live sync discovery engine** that queries provider endpoints in real time.

---

### 🔄 Real-Time Dynamic Model Sync Architecture

Traditional note-taking apps rely on static, hardcoded lists that quickly become obsolete as AI providers release new flagships or sunset older models. Noska solves this with an **intelligent live model catalog system** (\`ModelCatalogService.ts\`):

\`\`\`
User API Key (Stored Locally)
  └── On-Demand Live API Sync
        ├── Live Endpoint Query (e.g. OpenAI /v1/models, Anthropic, Gemini, Groq)
        ├── Dynamic Flagship Auto-Registration (Auto-assigns NEW badges)
        ├── Deprecation & Sunset Warning Engine (Sunset dates & modern replacements)
        └── Local Offline Storage Cache (0ms instant startup without network wait)
\`\`\`

---

### ⚡ How the Dynamic Sync Technique Works

1. **Authenticated Live Discovery** — When you enter an API key or click **Sync Live Models** in settings, Noska queries the provider's official catalog endpoint directly from your client using your credentials.
2. **Instant Flagship & New Model Detection** — When a provider launches a new model (e.g. *Claude 3.7 Sonnet*, *GPT-4.5*, *Gemini 2.0 Flash*, *DeepSeek R1*), Noska automatically discovers it, registers its context limits and tool-calling capabilities, and assigns an active **NEW** badge without requiring an application update.
3. **Deprecation & Sunset Engine** — Noska continuously tracks official provider sunset dates (e.g. OpenAI legacy shutdowns, Anthropic older model retirements). Deprecating models are flagged with exact cutoff dates, reasons, and 1-click suggested modern replacements.
4. **Resilient Local Caching** — Discovered catalogs are persisted in encrypted local browser storage so model pickers open with 0ms latency even when offline.
5. **Zero Centralized Proxying** — Requests and API keys never touch Noska servers. Queries stream directly between your device and the AI provider.

---

### 🤖 Supported Providers & Latest Flagships

| Provider | Latest Flagship & Active Models | Key Capabilities & Sync Architecture |
|---|---|---|
| **Anthropic** | \`claude-3-7-sonnet-20250219\`, \`claude-3-5-sonnet-latest\`, \`claude-3-5-haiku\` | Hybrid reasoning traces, adjustable thinking budgets (up to 64k reasoning tokens) |
| **OpenAI** | \`o3-mini\`, \`o1\`, \`gpt-4.5-preview\`, \`gpt-4o\`, \`gpt-4o-mini\` | High-order reasoning, structured JSON outputs, multi-modal vision |
| **Google** | \`gemini-2.0-flash\`, \`gemini-2.0-pro-exp\`, \`gemini-1.5-pro\` | 2M+ token context window, native multimodal audio/video processing |
| **DeepSeek** | \`deepseek-reasoner\` (R1), \`deepseek-chat\` (V3) | Open-weights mathematical reasoning with live chain-of-thought traces |
| **Groq** | \`llama-3.3-70b-versatile\`, \`deepseek-r1-distill-llama-70b\`, \`mixtral-8x7b-32768\` | LPUs delivering ultra-fast inference (500+ tokens/sec) |
| **Mistral AI** | \`mistral-large-latest\`, \`codestral-latest\`, \`pixtral-large-latest\` | Multilingual enterprise reasoning and specialized coding models |
| **Together AI** | \`meta-llama/Llama-3.3-70B-Instruct-Turbo\`, \`deepseek-ai/DeepSeek-R1\` | Serverless open-source scaling with instant dynamic catalog sync |
| **xAI** | \`grok-2-latest\`, \`grok-beta\` | Real-time world knowledge synthesis and deep coding reasoning |
| **AWS Bedrock** | \`anthropic.claude-3-7-sonnet\`, \`amazon.nova-pro\`, \`meta.llama3-3-70b\` | Enterprise AWS IAM role-based execution and VPC compliance |
| **Azure OpenAI** | Custom Enterprise Deployments, \`gpt-4o\`, \`o3-mini\` | Microsoft Entra ID compliance with custom private deployments |
| **OpenRouter** | 300+ models across all global AI providers | Universal gateway with live catalog search and automatic failover |
| **Ollama & LM Studio** | \`llama3.3\`, \`deepseek-r1\`, \`qwen2.5-coder\`, \`mistral\` | 100% Private, offline on-device local models on \`localhost:11434\` / \`localhost:1234\` |
| **OpenCode Zen** | Specialized code analysis and AST models | Deep code refactoring, AST parsing, and workspace transformations |

---

### 💡 Advanced AI Capabilities

- **Workspace Grounding & Citations** — Ground AI answers in your documents, database rows, and connected ecosystems (Google Drive, GitHub, Notion) with clickable source citations.
- **Thinking Budget & Reasoning Traces** — For reasoning models (*Claude 3.7 Sonnet*, *DeepSeek R1*, *o3-mini*), inspect live step-by-step thinking tokens before the final response is generated.
- **Dynamic Ecosystem Tools** — Models automatically inherit function-calling capabilities for connected integrations (e.g. \`github_search_issues\`, \`google_calendar_create_event\`).
- **Inline Ghostwriter** — Trigger AI inline anywhere by pressing \`Space\` or \`/\` on an empty block to draft outlines, rewrite paragraphs, or translate content.`,
  },
  'collaboration': {
    title: 'Collaboration & Company Workspaces',
    body: `Collaborate with teammates in real-time across documents, whiteboards, and organizational teamspaces.

---

### 🏢 Company Workspaces & Team Management

- **Organization Domains** — Group team members under company domains with automated SSO provisioning.
- **Instant User Search & Invite** — Search teammates by name or email and assign roles with 1 click.
- **Role-Based Access Control (RBAC)**:
  - **Owner / Admin** — Manage workspace settings, billing, integrations, and member permissions.
  - **Member** — Create, edit, and share documents across teamspaces.
  - **Viewer** — Read-only access to published team documents.
  - **Guest** — Scoped access to specific designated pages.
- **Workspace Ownership Transfer** — Seamlessly transfer workspace administrative ownership between team accounts.

---

### 👥 Real-Time Multiplayer Presence

- **Live Remote Cursors** — See teammates' color-coded cursors and names moving smoothly across pages and canvases.
- **Block Selection Highlights** — Visual rings appear around blocks being edited by collaborators to prevent edit collisions.
- **CRDT Conflict Resolution** — Microsecond-timestamped state merges guarantee zero lost paragraphs during concurrent editing.
- **Threaded Block Comments** — Anchor discussions directly to text paragraphs, table cells, or canvas cards with \`@mentions\`.`,
  },
  'sharing': {
    title: 'Sharing & Permissions',
    body: `Control exactly who can see and edit your content.

**Page-level sharing**

Every page has its own sharing settings. Click **Share** to configure:

- **Private** — Only you can access
- **Workspace** — Anyone in the workspace can access (with role-based limits)
- **Public** — Anyone with the link can view (no login required)
- **Password-protected** — Public link requires a password

**Publishing**

You can publish pages as public web pages. Published pages get a clean, readable layout at \`noska.me/publish/{page-id}\`. Useful for:
- Documentation
- Blog posts
- Public roadmaps
- Press materials

**Export options**

Export any page or database as:
- Markdown (.md)
- HTML
- PDF
- CSV (databases only)
- JSON`,
  },
  'keyboard-shortcuts': {
    title: 'Keyboard Shortcuts Studio',
    body: `Master Noska with keyboard shortcuts. Customize keybindings in the interactive **Shortcuts Studio** under **Settings → Shortcuts**.

---

### ⌨️ Global Shortcuts

| Shortcut | Action |
|---|---|
| \`Ctrl / Cmd + K\` | Open Command Palette |
| \`Ctrl / Cmd + N\` | Create New Page |
| \`Ctrl / Cmd + P\` | Quick Search Pages |
| \`Ctrl / Cmd + T\` | Open New Tab |
| \`Ctrl / Cmd + W\` | Close Active Tab |
| \`Ctrl / Cmd + Shift + W\` | Close All Tabs |
| \`Ctrl / Cmd + /\` | Toggle Shortcuts Studio |
| \`Ctrl / Cmd + Shift + L\` | Toggle AI Assistant Panel |
| \`Option / Alt + Space\` | Toggle Voice Dynamic Island Capsule |

---

### 📝 Page Editing & Formatting

| Shortcut | Action |
|---|---|
| \`/\` | Open Block Picker |
| \`Ctrl / Cmd + B\` | Bold Text |
| \`Ctrl / Cmd + I\` | Italic Text |
| \`Ctrl / Cmd + U\` | Underline Text |
| \`Ctrl / Cmd + E\` | Inline Code |
| \`Ctrl / Cmd + D\` | Duplicate Selected Block |
| \`Ctrl / Cmd + Shift + Up/Down\` | Move Block Up / Down |
| \`Ctrl / Cmd + 1..6\` | Convert to Heading 1..6 |
| \`Tab / Shift + Tab\` | Indent / Outdent Block or Table Cell |

---

### 🗺️ Canvas & Whiteboard Shortcuts

| Shortcut | Action |
|---|---|
| \`Ctrl / Cmd + Option + C\` | Switch to Canvas Mode |
| \`Space + Drag\` | Pan Canvas Viewport |
| \`Ctrl / Cmd + \` / \`Ctrl / Cmd - \` | Zoom Canvas In / Out |
| \`Ctrl / Cmd + 0\` | Fit Canvas to Screen |
| \`C\` | Start Magnetic Connector Line |
| \`Ctrl / Cmd + Option + P\` | Enter Presentation Mode |`,
  },
  'encryption': {
    title: 'Encryption',
    body: `Noska offers client-side encryption for pages that require an extra layer of protection.

**How it works**

When you lock a page, the content is encrypted in your browser before it ever reaches our servers. The encryption uses the Web Crypto API — the same standard that powers HTTPS.

\`\`\`
Algorithm: AES-GCM 256-bit
Key derivation: PBKDF2 with 600,000 iterations
Salt: Random 16 bytes (stored alongside encrypted content)
IV: Random 12 bytes (stored alongside encrypted content)
\`\`\`

**What this means**

- **Plaintext never leaves your device** — The unencrypted content is never sent over the network
- **Noska cannot read locked pages** — Even we don't have the key
- **Your passphrase is never stored** — We only store the encrypted ciphertext

**Limitations**

- Locked pages cannot be searched by the AI assistant (the AI can't read encrypted content)
- Encrypted pages are not available in the Thought Graph preview
- If you lose your passphrase, the content is unrecoverable — there's no backdoor`,
  },
  'data-privacy': {
    title: 'Data Privacy',
    body: `Noska is built with privacy as a foundation, not an afterthought.

**Data ownership**

You own all the content you create in Noska. We do not:
- Sell your data to third parties
- Use your content to train AI models
- Share personal information with advertisers

**Data storage**

All data is stored in PostgreSQL databases on encrypted volumes. Backups are encrypted at rest. TLS 1.3 protects data in transit.

**Infrastructure**

- **Database** — PostgreSQL with row-level security
- **Auth** — Clerk for authentication (SAML/SSO available on Enterprise)
- **AI** — Bring your own key; AI requests go directly to your chosen provider
- **Hosting** — Supabase infrastructure

**Compliance**

- SOC 2 Type II (in progress for Enterprise)
- GDPR compliant
- CCPA compliant
- Data Processing Agreement (DPA) available on request

**Deleting your data**

You can delete any page or your entire account from Settings. When you delete your account, all your data is permanently removed within 30 days.`,
  },
  'rls': {
    title: 'Row-Level Security',
    body: `Every table in Noska is protected by PostgreSQL Row-Level Security (RLS) policies. This isn't a feature you configure — it's built into the architecture.

**How RLS works**

PostgreSQL RLS ensures that database queries only return rows the authenticated user is allowed to see. The policy is enforced at the database level — not in the application code.

\`\`\`
-- Every query automatically filters by owner
CREATE POLICY owner_scoped ON pages
  FOR ALL
  USING (owner_id = auth.uid());

-- Collaborators can read shared pages
CREATE POLICY collaborator_read ON pages
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT page_id FROM page_collaborators
      WHERE user_id = auth.uid()
    )
  );
\`\`\`

**What this protects**

- **Pages** — Users only see their own pages (and shared ones)
- **Databases** — Database visibility follows page permissions
- **AI chats** — Each chat is scoped to its creator
- **Files & images** — Access is restricted to workspace members

**Security model**

\`\`\`
User → Clerk Auth → JWT → Supabase RLS → Data
  ↑                      ↑
  |-- Every request      |-- Enforced at DB level
  |-- includes JWT       |-- No application bypass
\`\`\`

This means even if an attacker compromised the frontend code, they still couldn't access another user's data — the database itself would reject the query.`,
  },
  'plans': {
    title: 'Plans & Pricing',
    body: `Noska offers plans for individuals, teams, and enterprises.

**Free**

- Unlimited pages and blocks
- 33 block types
- 7-day page history
- 1 workspace
- AI with your own key
- Community support

**Pro**

Everything in Free, plus:
- Unlimited workspaces
- Unlimited collaborators
- Full page history
- Priority support

**Enterprise**

Everything in Pro, plus:
- SAML/SSO
- Audit logs
- Custom retention policies
- Dedicated support
- SLA
- On-premise option available

*Visit [noska.me/pricing](/pricing) for current pricing.*`,
  },
  'import-export': {
    title: 'Import & Export',
    body: `Move your data in and out of Noska freely.

**Import**

Noska supports importing from:

| Source | Format |
|---|---|
| Markdown | .md files |
| HTML | .html files |
| CSV | .csv (imports as database) |
| Notion | Export via Notion's HTML export |

To import, go to **Settings → Import** or use the command palette (\`Ctrl + K\`) and type "Import".

**Export**

Export any page or database:

\`\`\`
Export formats:
├── Markdown (.md)     — Best for portability
├── HTML               — Best for publishing
├── PDF                — Best for sharing/printing
└── CSV                — Databases only

Export scope:
├── Single page
├── Multiple selected pages
├── Entire workspace
└── Database (all rows)
\`\`\`

**API access**

Enterprise customers get API access for programmatic import/export. The API supports RESTful operations for pages, databases, and workspace management.`,
  },
  'mcp-server': {
    title: 'MCP Server',
    body: `Connect AI clients like Claude Desktop, Cursor and custom agents directly to your Noska workspace.

Noska exposes a full Model Context Protocol (MCP) server — 47 tools across 9 capability groups. Search and fetch pages as markdown, create pages from markdown, run native slash commands, manage tasks, query databases, schedule spaced-repetition study cards, and configure agents & automations — all authenticated with scoped API keys and verified against persisted state.

Highlights:
- search / fetch / create-pages / update-page — URL or UUID accepted everywhere
- list-commands → the real slash-command registry; execute-command inserts native blocks
- list-tasks, create-task, complete-task, bulk-update-tasks
- list-reviews, add-study-card, create-study-plan workflow
- get-workspace-context for a compact workspace snapshot
- RED-risk tools require explicit confirmation; every mutation is verified

[[OPEN_MCP_DOCS]]

Full setup guides, Claude Desktop and Cursor configuration, the complete tool reference, the local development stack and troubleshooting live on the dedicated MCP page.`,
  },
  'api-keys': {
    title: 'Developer API Keys & Scopes',
    body: `Manage programmatic access to your Noska workspace with granular, cryptographically hashed API keys.

---

### 🔑 Managing API Keys

Open **Settings → Developer & API Keys** to create and inspect API keys:

1. Click **+ Generate New Key**.
2. Give your key a descriptive name (e.g. \`Claude Desktop MCP\`, \`CI Documentation Pipeline\`).
3. Select an expiration duration or choose *Never Expires*.
4. Choose permission scopes manually or use a 1-click scope preset.
5. Copy your secret key — it is shown only once and stored using SHA-256 cryptographic hashing.

---

### 🎯 1-Click Permission Presets

| Preset | Scopes Included | Best For |
|---|---|---|
| **Full Access** | All 24 read and write scopes | Administrative tooling & private scripts |
| **Read-Only** | \`pages:read\`, \`databases:read\`, \`graph:read\`, \`tasks:read\` | Search assistants & indexers |
| **Agents & Tasks** | \`pages:read\`, \`tasks:read\`, \`tasks:write\`, \`ai:execute\` | Background AI task runners |
| **Pages & DB** | \`pages:*\`, \`databases:*\`, \`media:upload\` | Document import & content sync |

---

### 🛡️ Read-Only Safety Mode

When testing automated AI agents or external MCP clients, toggle **Enforce Read-Only Safety Mode** to block all state-mutating requests at the gateway level regardless of token permissions.`,
  },
  'api-reference': {
    title: 'API Reference',
    body: `Noska provides a built-in API console and REST API for programmatic access.

**API Console**

Open the command palette (\`Ctrl + K\`) and type "API Console" to access the built-in API documentation tool. It's available from the right sidebar of any page.

The console lets you:
- Browse all available API routes
- Generate API tokens
- Run live requests
- View response schemas

**Authentication**

\`\`\`
Authorization: Bearer <your_api_token>
Content-Type: application/json
\`\`\`

Generate an API token from **Settings → Developer & API Keys**.

**Core endpoints**

\`\`\`
GET    /api/v1/pages              List pages
GET    /api/v1/pages/:id          Get page
POST   /api/v1/pages              Create page
PATCH  /api/v1/pages/:id          Update page
DELETE /api/v1/pages/:id          Delete page

GET    /api/v1/databases           List databases
POST   /api/v1/databases           Create database
POST   /api/v1/databases/:id/rows  Add row

GET    /api/v1/search?q=          Search workspace
\`\`\`

**Rate limits**

- Free: 100 requests/hour
- Pro: 1,000 requests/hour
- Enterprise: Custom limits`,
  },
  'integrations-overview': {
    title: 'Ecosystem Architecture Overview',
    body: `Noska provides an enterprise-grade, **ecosystem-first integration system** designed to eliminate connection fragmentation, reduce OAuth authorization fatigue, and grant granular, resource-level data boundaries for your AI workflows.

**The Ecosystem-First Paradigm**

Traditional productivity software treats every tool as an isolated, top-level card (forcing you to authenticate Gmail, Google Drive, Google Calendar, and Google Docs as 4 completely separate connections). 

Noska unifies related products under a single **Parent Ecosystem Connector**:

\`\`\`
Google Workspace (Parent Connection)
  ├── Gmail (Child Service: Active)
  ├── Google Drive (Child Service: Active - Filtered to 3 folders)
  ├── Google Calendar (Child Service: Active)
  ├── Google Docs (Child Service: Active)
  └── Google Sheets (Child Service: Disabled)
\`\`\`

**Core Architectural Pillars**

1. **Single Connection & Unified Token Lifecycle** — Connect an entire workspace (Google, Microsoft 365, Atlassian, GitHub) in a single flow. OAuth tokens, refresh lifecycles, and scopes are managed centrally without repeated sign-ins.
2. **Granular Child Service Toggles** — Each child service under an ecosystem can be enabled or disabled independently at any time. If you want Noska's AI to search your Google Drive documents and Calendar events but NOT read your Gmail inbox, simply toggle Gmail off.
3. **Resource-Level Scoping & Boundaries** — Restrict access to specific repositories, folders, channels, or database tables. Noska will never perform broad scans across your entire enterprise cloud.
4. **Zero Background Polling** — Noska operates on an on-demand retrieval model. External services are queried only when you actively trigger a search or when an AI prompt requires fresh contextual data. This eliminates background battery drain and prevents hitting third-party API rate limits.
5. **AI Engine Tool Filtering** — When you chat with Noska AI, only tools corresponding to connected and currently-enabled child services are registered into the model's function-calling toolset (\`integrationTools.ts\`).
6. **Fault Isolation & Resilience** — If a single service experiences an API rate limit or schema change, the parent connection and other child services remain fully operational.

**Managing Integrations in Settings**

Open **Settings → Integrations** to view all available ecosystems. You can filter by category, search across 28+ ecosystems and their sub-services, and click **Manage** on any connected card to configure granular permissions, scopes, and connected resources.`,
  },
  'google-workspace-integration': {
    title: 'Google Workspace Integration',
    body: `The Google Workspace connector connects your Google Cloud identity and productivity apps to Noska under a single unified authorization.

**Included Services**

- **Gmail** — Search threads, summarize message history, draft replies, and query unread communication.
- **Google Drive** — Search files, inspect folder structures, read PDF/Doc contents, and manage project assets.
- **Google Calendar** — Check schedule availability, query upcoming meetings, find free time slots, and schedule events.
- **Google Docs** — Read and export document outlines, convert Google Docs into Noska pages, and insert live blocks.
- **Google Sheets** — Query structured tabular data, extract summary metrics, and link spreadsheet ranges to Noska databases.

**Granular Permissions & Scopes**

| Service | OAuth Scope | Access Level |
|---|---|---|
| Gmail | \`gmail.readonly\` / \`gmail.send\` | Read messages, draft emails |
| Google Drive | \`drive.file\` / \`drive.readonly\` | Access selected folders & files |
| Google Calendar | \`calendar.events\` | Read and create schedule events |
| Google Docs | \`documents.readonly\` | Read document content |
| Google Sheets | \`spreadsheets.readonly\` | Read tabular worksheet rows |

**Configuring Resource Boundaries**

In the **Manage → Resources** drawer of your Google Workspace connection:
- You can specify exact Google Drive folder IDs so Noska only searches within designated project folders.
- You can select primary vs. secondary calendars to prevent personal events from being ingested into workspace search.

**AI Function Calling Examples**

When Google Workspace is connected, your AI assistant can execute queries like:
- *"What meetings do I have scheduled for tomorrow afternoon?"* → Executes \`google_calendar_list_events\`
- *"Search my Google Drive for the Q3 Financial Roadmap PDF and summarize key takeaways"* → Executes \`google_drive_search\` and \`google_drive_read_file\`
- *"Draft a follow-up email to Alex regarding yesterday's project kickoff"* → Executes \`gmail_draft_email\``,
  },
  'microsoft-365-integration': {
    title: 'Microsoft 365 Integration',
    body: `The Microsoft 365 connector links your Microsoft Entra ID (Azure AD) and Microsoft Graph ecosystem into Noska.

**Included Services**

- **Outlook Mail** — Search emails, query flagged messages, and draft communications via Microsoft Graph Mail API.
- **OneDrive** — Access personal and business cloud files, synced documents, and shared attachments.
- **SharePoint** — Search corporate intranet document libraries, team sites, and enterprise knowledge repositories.
- **Microsoft Teams** — Query channel announcements, summarize missed chats, and send team updates.
- **Microsoft Calendar** — View calendar schedules, query meeting links, and coordinate cross-organization availability.

**Authentication & Security**

Noska supports both Microsoft 365 Multi-Tenant and Custom Single-Tenant enterprise configurations:
- **Client ID & Tenant ID**: Configurable for enterprise IT compliance.
- **Microsoft Graph Scopes**: \`User.Read\`, \`Mail.ReadWrite\`, \`Files.Read.All\`, \`Calendars.ReadWrite\`, \`ChannelMessage.Read.All\`.
- **Zero Data Ingestion**: Files and messages remain in your Microsoft tenant; Noska queries live data ephemerally during AI execution.

**AI Function Calling Examples**

- *"Summarize the latest design feedback from the #marketing Teams channel"* → Executes \`m365_teams_get_messages\`
- *"Find the executive proposal on SharePoint and extract the milestone dates"* → Executes \`m365_sharepoint_search\`
- *"What is on my Outlook calendar for the rest of today?"* → Executes \`m365_calendar_list_events\``,
  },
  'atlassian-integration': {
    title: 'Atlassian Integration (Jira & Confluence)',
    body: `The Atlassian connector unifies project tracking in Jira Software and documentation in Confluence under a single connection.

**Included Services**

- **Jira Software** — Query active sprint boards, search backlog issues using JQL, create bug reports, and update issue statuses.
- **Confluence** — Search space page trees, import Confluence articles into Noska, and keep technical documentation synchronized.

**Multi-Site Routing & Granular Scopes**

Because Atlassian accounts can belong to multiple cloud sites (e.g. \`acme.atlassian.net\` and \`acme-labs.atlassian.net\`), Noska allows you to select the exact Atlassian Site and limit indexing to specific Jira Project Keys and Confluence Space Keys:

\`\`\`
Atlassian Connection (Site: noska-workspace.atlassian.net)
  ├── Jira Projects: [ENG, PROD, SEC] (Other projects excluded)
  └── Confluence Spaces: [ENGINEERING, PRODUCT] (HR/Legal excluded)
\`\`\`

**AI Function Calling Examples**

- *"List all High priority bugs in Jira assigned to sprint 42"* → Executes \`jira_search_issues(jql: "project = ENG AND type = Bug AND priority = High")\`
- *"Create a Jira ticket to investigate the payment webhook timeout"* → Executes \`jira_create_issue\`
- *"Find the Confluence architecture guide for our authentication service"* → Executes \`confluence_search_pages\``,
  },
  'github-integration': {
    title: 'GitHub & DevOps Integration',
    body: `The GitHub connector provides deep source code, issue tracking, pull request, and DevOps visibility inside Noska.

**Included Services**

- **Repositories** — Browse file trees, read code files, inspect READMEs, and check commit histories.
- **Issues** — Search open and closed issues, filter by labels and milestones, and create new issue tickets.
- **Pull Requests** — Review PR descriptions, inspect diff summaries, and track approval states.
- **GitHub Actions** — Monitor CI/CD workflow runs, check build failures, and re-run jobs.
- **Releases** — Track semantic version tags, release notes, and published binary assets.

**Granular Repository Access**

Noska supports selecting specific repositories during GitHub App / OAuth authorization. You do not need to grant organization-wide read access.

**AI Function Calling Examples**

- *"Show me all open pull requests awaiting review on the frontend repository"* → Executes \`github_list_prs(repo: "noska/frontend", state: "open")\`
- *"What failed in the latest CI workflow for main branch?"* → Executes \`github_get_workflow_run_logs\`
- *"Create an issue on noska/desktop titled 'Support high-DPI scaling on Linux'"* → Executes \`github_create_issue\``,
  },
  'slack-discord-integration': {
    title: 'Slack & Discord Integrations',
    body: `Connect your team's real-time communication hubs to Noska to bridge asynchronous notes with active team discussions.

**Slack Ecosystem**

- **Public & Private Channels** — Ingest meeting notes or share document summaries directly to designated channels.
- **Thread Search & Summarization** — Ask AI to summarize 50+ messages in a technical support thread into an actionable task list.
- **Direct Messages & Mentions** — Query unread notifications and urgent pings without context-switching into the full Slack client.

**Discord Ecosystem**

- **Guild Channels & Announcement Feeds** — Monitor community questions, feature requests, and server announcements.
- **Webhook Dispatch** — Automatically push Noska page updates and database state changes to Discord webhooks.

**Privacy & Security**

- Only explicit channels authorized by workspace administrators are accessible.
- Personal direct messages remain completely private unless granted under explicit user OAuth tokens.`,
  },
  'notion-linear-integration': {
    title: 'Notion, Linear & Tasks Suites',
    body: `Unify your external issue trackers, product roadmaps, and document silos into Noska's central knowledge canvas.

**Notion Integration**

- **Database Sync** — Query Notion database properties, select fields, and relation columns directly inside Noska.
- **Page Import & Conversion** — Seamlessly migrate Notion pages and nested blocks into Noska's high-performance local canvas.

**Linear Integration**

- **Teams, Projects & Cycles** — Track active cycle burn-downs, project roadmaps, and sprint velocity.
- **Issue Creation & Triage** — Quickly turn bullet points in Noska notes into fully-formatted Linear issues with priority, assignee, and estimates.

**ClickUp, Asana & Trello**

- **ClickUp** — Manage Spaces, Folders, Lists, and custom task statuses.
- **Asana** — Sync project tasks, subtasks, milestone tracking, and team portfolios.
- **Trello** — View boards, lists, and cards with attachment previews.`,
  },
  'developer-cloud-integrations': {
    title: 'Databases & Cloud Storage',
    body: `Noska connects directly to developer backend infrastructure, cloud databases, and object storage providers.

**Supported Database & Cloud Platforms**

1. **Supabase** — Query Postgres tables, execute parameterized SQL, inspect schema definitions, and link database records to Noska database views.
2. **Airtable** — Read bases, tables, views, formulas, and attachments with live bidirectional synchronization.
3. **Firebase** — Access Firestore collections, documents, and Firebase Storage bucket assets.
4. **AWS S3** — Query object buckets, generate pre-signed read/write URLs, and manage media files securely.
5. **Cloudflare R2** — Zero-egress S3-compatible storage integration for high-throughput asset delivery.

**Security Safeguards**

- **Read-Only Mode Default** — All database queries are executed with read-only privileges unless write access is explicitly authorized.
- **Row-Level Security (RLS)** — User JWTs are forwarded to Supabase and Firebase to enforce your existing database security policies.`,
  },
  'all-ecosystems-catalog': {
    title: 'All 28 Connected Apps Catalog',
    body: `Noska natively supports **28 top-level ecosystems** spanning communication, productivity, engineering, design, cloud storage, CRM, and developer platforms.

**Complete Ecosystem Catalog**

| Ecosystem | Category | Included Child Services | Primary Resource Types |
|---|---|---|---|
| **Google Workspace** | Productivity | Gmail, Drive, Calendar, Docs, Sheets | Folders, Files, Calendars |
| **Microsoft 365** | Productivity | Outlook, OneDrive, SharePoint, Teams, Calendar | Libraries, Channels, Folders |
| **Atlassian** | Engineering | Jira Software, Confluence | Projects, Boards, Spaces |
| **GitHub** | Engineering | Repos, Issues, Pull Requests, Actions, Releases | Repositories, Branches |
| **GitLab** | Engineering | Projects, Merge Requests, Issues, Pipelines | Repositories, Groups |
| **Slack** | Communication | Channels, DMs, Threads, Mentions | Public/Private Channels |
| **Discord** | Communication | Guild Channels, Webhooks, Forum Threads | Guilds, Channels |
| **Notion** | Productivity | Pages, Databases, Blocks | Workspaces, Databases |
| **Linear** | Engineering | Issues, Projects, Cycles, Teams | Teams, Projects |
| **Figma** | Design | Files, Components, Styles, Comments | Teams, Projects, Files |
| **ClickUp** | Productivity | Spaces, Folders, Lists, Tasks | Spaces, Lists |
| **Asana** | Productivity | Tasks, Projects, Portfolios | Workspaces, Projects |
| **Trello** | Productivity | Boards, Lists, Cards | Boards, Lists |
| **Supabase** | Cloud & DB | Postgres Tables, Storage, Auth | Tables, Storage Buckets |
| **Airtable** | Cloud & DB | Bases, Tables, Views, Records | Bases, Tables |
| **Firebase** | Cloud & DB | Firestore, Cloud Storage | Collections, Buckets |
| **HubSpot** | CRM | Contacts, Companies, Deals, Tickets | Pipelines, Lists |
| **Salesforce** | CRM | Leads, Accounts, Opportunities, Cases | Objects, Reports |
| **Stripe** | Finance | Customers, Invoices, Subscriptions, Payments | Accounts, Customers |
| **Zendesk** | Support | Tickets, Users, Organizations, Help Center | Ticket Views, Brands |
| **Intercom** | Support | Conversations, Users, Articles | Inboxes, Collections |
| **Zoom** | Communication | Meetings, Recordings, Webinars | Users, Meeting Rooms |
| **Dropbox** | Cloud & DB | Files, Folders, Paper Docs | Folders, Shared Links |
| **Box** | Cloud & DB | Files, Folders, Enterprise Metadata | Folders, Metadata Templates |
| **AWS** | Cloud & DB | S3 Buckets, Lambda Functions | Buckets, Function Names |
| **Cloudflare** | Cloud & DB | R2 Storage, Workers, DNS | Buckets, Worker Scripts |
| **Twitter / X** | Social | Posts, Mentions, Timelines, Bookmarks | User Timelines |
| **LinkedIn** | Social | Profile, Posts, Organization Updates | Company Pages |

**Connecting an App**

To connect any of the ecosystems above:
1. Open **Settings** (gear icon in sidebar or press \`Cmd/Ctrl + ,\`).
2. Select the **Integrations** tab.
3. Use the search bar or category pills to find the ecosystem.
4. Click **Connect** and authorize access via OAuth or API credentials.
5. In the **Manage** drawer, toggle child services and select the specific resources you wish to expose to Noska.`,
  },
  'contact-support': {
    title: 'Support & Community',
    body: `We're here to help you get the most out of Noska. Whether you have a technical question, hit a bug, or want to discuss a custom integration, our core engineering team is accessible across multiple channels.

**Direct Channels:**

- **Email Support** — [support@noska.app](mailto:support@noska.app). All tickets receive a human response within 24 hours (under 4 hours for Plus and Enterprise customers).
- **Discord Community** — Join thousands of power users, creators, and engineers on our [Official Discord](https://discord.gg/noska) to share templates and discuss upcoming features.
- **GitHub Discussions & Bug Tracker** — Report bugs or submit feature proposals directly on our [GitHub Repository](https://github.com/shrikrishna-lab/noska/issues).
- **Twitter / X** — Follow [@noska_app](https://x.com/noska_app) for real-time changelogs, system status updates, and release announcements.

**Enterprise Support:**

Enterprise organizations receive a dedicated Slack or Microsoft Teams shared channel, tailored onboarding sessions, custom MCP connector development, and a 99.9% uptime Service Level Agreement (SLA). Contact [enterprise@noska.app](mailto:enterprise@noska.app) for details.`,
  },
  'troubleshooting': {
    title: 'Troubleshooting & Diagnostics',
    body: `Quick solutions for the most common issues in Noska desktop and web apps.

**1. Desktop App Reload & Deep Cache Flush**

If you encounter unexpected rendering artifacts or want to reload the latest UI build:
- Press \`Cmd/Ctrl + Shift + R\` inside the desktop app to force-reload the renderer process.
- Alternatively, open **Settings > Diagnostics** and click **Clear Local Cache**.

**2. Sync Conflicts & Offline State**

Noska uses a Conflict-Free Replicated Data Type (CRDT) engine with local SQLite persistence:
- When you are offline, all changes are saved locally with microsecond timestamps.
- Once connectivity is restored, mutations are merged seamlessly without overwriting adjacent paragraphs.
- Look at the cloud indicator in the bottom-left sidebar: **Green checkmark** indicates all local changes are fully synced to cloud replicas.

**3. Resetting Integration Tokens**

If an external ecosystem (e.g. Google Workspace or GitHub) reports an \`Auth Expired\` error:
1. Open **Settings > Integrations**.
2. Find the connected ecosystem and click **Manage**.
3. Click **Reconnect Token** or click **Disconnect** and re-authorize the account.

**4. Custom MCP Connection Failures**

When debugging self-hosted or local Model Context Protocol (MCP) servers:
- Verify that your local stdio command or SSE URL is accessible without firewall blocking.
- Ensure the executable path is absolute (e.g. \`/usr/local/bin/node\` or \`C:\\Program Files\\nodejs\\node.exe\`).
- Check that the server returns valid JSON-RPC 2.0 initialization responses.`,
  },
  'faq': {
    title: 'Frequently Asked Questions',
    body: `**Is Noska local-first?**

Yes. On desktop, all your documents, databases, and canvases are stored in a local SQLite database on your device. You can write, search, and navigate your entire workspace with 0ms network latency, even completely offline on an airplane.

**How does Bring-Your-Own-Key (BYOK) work?**

Noska lets you bring your own API keys for OpenAI, Anthropic, Google Gemini, Groq, Ollama, DeepSeek, Mistral, Together AI, and OpenRouter. Keys are encrypted on your device and sent directly to provider APIs. We never proxy or store your keys on centralized servers.

**Can I export all my data if I decide to leave?**

Absolutely. You retain 100% ownership of your work. You can export individual pages or your entire workspace into standard Markdown files, CSV/JSON relational database tables, or raw SQLite database archives at any time with a single click.

**How does the Thought Graph generate connections?**

The Thought Graph automatically analyzes bi-directional wiki links (\`[[Page Name]]\`), database relation properties, tag intersections, and semantic embeddings to build a living neural graph of your concepts.

**What is the difference between Personal, Plus, and Enterprise plans?**

- **Free / Personal**: Full access to documents, infinite canvas, and Bring-Your-Own-Key AI.
- **Plus**: Unlimited file uploads, 30-day version history, team collaboration, and cloud sync.
- **Enterprise**: Custom SSO / SAML, audit logs, shared teamspaces, custom MCP connector deployment, and dedicated SLAs.`,
  },
};

function parseInlineMarkdown(text: string): React.ReactNode[] {
  const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="docs-inline-code">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('[') && part.includes('](')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const [, label, url] = match;
        const isExternal = url.startsWith('http') || url.startsWith('//');
        if (isExternal) {
          return (
            <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="docs-link">
              {label} <ExternalLink size={10} style={{ display: 'inline', marginLeft: 2 }} />
            </a>
          );
        } else {
          return <Link key={index} to={url} className="docs-link">{label}</Link>;
        }
      }
    }
    return part;
  });
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="docs-code-block-wrapper">
      <div className="docs-code-header">
        <span className="docs-code-lang">{lang || 'terminal'}</span>
        <button className="docs-code-copy-btn" onClick={handleCopy} aria-label="Copy code">
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="docs-code-block"><code>{code}</code></pre>
    </div>
  );
}

function DocsFeedback({ sectionId }: { sectionId: string }) {
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null);

  useEffect(() => {
    setVoted(null);
  }, [sectionId]);

  return (
    <div className="docs-feedback-card">
      <div className="docs-feedback-text">
        <p className="docs-feedback-title">Was this helpful?</p>
        <p className="docs-feedback-sub">Let us know how we can make Noska docs better</p>
      </div>
      <div className="docs-feedback-actions">
        {voted ? (
          <div className="docs-feedback-thanks">
            <Check size={14} className="text-emerald-500" />
            <span>Thank you for your feedback!</span>
          </div>
        ) : (
          <>
            <button className="docs-feedback-btn" onClick={() => setVoted('yes')}>
              <ThumbsUp size={13} /> Yes
            </button>
            <button className="docs-feedback-btn" onClick={() => setVoted('no')}>
              <ThumbsDown size={13} /> No
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function parseMarkdownBlocks(body: string): React.ReactNode[] {
  const lines = body.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line === '[[OPEN_MCP_DOCS]]') {
      blocks.push(
        <div key={`mcp-${i}`} className="my-5">
          <Link
            to="/docs/mcp"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
          >
            Open the MCP Documentation <ChevronRight size={14} />
          </Link>
        </div>
      );
      i++;
      continue;
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      blocks.push(<CodeBlock key={`code-${i}`} code={codeLines.join('\n')} lang={lang} />);
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteText = line.slice(2);
      blocks.push(
        <div key={`quote-${i}`} className="docs-callout-box">
          <div className="docs-callout-icon">💡</div>
          <div className="docs-callout-text">{parseInlineMarkdown(quoteText)}</div>
        </div>
      );
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push(<h3 key={`h3-${i}`} className="docs-h3">{parseInlineMarkdown(line.slice(4))}</h3>);
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push(<h2 key={`h2-${i}`} className="docs-h2">{parseInlineMarkdown(line.slice(3))}</h2>);
      i++;
      continue;
    }

    if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
      blocks.push(<p key={`strong-${i}`} className="docs-strong-line">{parseInlineMarkdown(line.slice(2, -2))}</p>);
      i++;
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="docs-ul">
          {listItems.map((item, idx) => (
            <li key={idx} className="docs-li">{parseInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="docs-ol">
          {listItems.map((item, idx) => (
            <li key={idx} className="docs-oli">{parseInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(<hr key={`hr-${i}`} className="docs-hr" />);
      i++;
      continue;
    }

    if (line.trim().startsWith('|') && line.includes('|')) {
      const headerLine = line;
      const headerCells = headerLine.split('|').map(c => c.trim()).filter(Boolean);
      i++; // Move past header

      // Check if next line is separator line (e.g. |---|---|---| or |:---:|)
      if (i < lines.length && lines[i].trim().startsWith('|') && /^\|[\s\-:|]+\|?$/.test(lines[i].trim())) {
        i++; // Skip separator
      }

      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const trimmedRow = lines[i].trim();
        if (!/^\|[\s\-:|]+\|?$/.test(trimmedRow)) {
          const raw = trimmedRow.split('|').map(c => c.trim());
          const cells = trimmedRow.startsWith('|') && trimmedRow.endsWith('|')
            ? raw.slice(1, -1)
            : raw.filter(Boolean);
          rows.push(cells);
        }
        i++;
      }

      blocks.push(
        <div key={`table-wrap-${i}`} className="docs-table-container">
          <table className="docs-table">
            <thead>
              <tr>
                {headerCells.map((c, ci) => <th key={ci}>{parseInlineMarkdown(c)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((c, ci) => <td key={ci}>{parseInlineMarkdown(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    blocks.push(<p key={`p-${i}`} className="docs-p">{parseInlineMarkdown(line)}</p>);
    i++;
  }

  return blocks;
}

export default function Docs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = searchParams.get('section') || 'introduction';
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState(initialSection);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const sectionParam = searchParams.get('section');
    if (sectionParam && docs[sectionParam]) {
      setActiveSection(sectionParam);
    }
  }, [searchParams]);

  // Reset viewport and marketing container scroll to top on doc section change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const marketingEl = document.querySelector('.marketing');
    if (marketingEl) {
      marketingEl.scrollTop = 0;
    }
  }, [activeSection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && search) {
        setSearch('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [search]);

  const currentDoc = docs[activeSection] ?? docs.introduction;

  // Dynamically compute active new metadata and unique color theme per item
  const newItemsMap = useMemo(() => {
    const map = new Map<string, { isNew: boolean; theme: BadgeTheme; label: string }>();
    let colorIndex = 0;

    for (const section of sections) {
      for (const item of section.items) {
        const config = ACTIVE_NEW_DOCS[item.id];
        const isMarkedNew = Boolean(config || item.isNew);
        if (isMarkedNew) {
          const theme = config?.theme || item.theme || THEME_PALETTE[colorIndex % THEME_PALETTE.length];
          const label = config?.label || item.badgeLabel || 'NEW';
          map.set(item.id, { isNew: true, theme, label });
          colorIndex++;
        }
      }
    }
    return map;
  }, []);

  const currentSectionMeta = useMemo(() => {
    for (const sec of sections) {
      const item = sec.items.find((i) => i.id === activeSection);
      if (item) {
        const newMeta = newItemsMap.get(item.id);
        return { 
          category: sec.title, 
          title: item.title, 
          isNew: Boolean(newMeta?.isNew),
          theme: newMeta?.theme || 'violet',
          label: newMeta?.label || 'NEW',
          icon: sec.icon 
        };
      }
    }
    const rootMeta = newItemsMap.get('introduction');
    return { 
      category: 'Getting Started', 
      title: currentDoc.title, 
      isNew: Boolean(rootMeta?.isNew), 
      theme: rootMeta?.theme || 'violet',
      label: rootMeta?.label || 'NEW',
      icon: BookOpen 
    };
  }, [activeSection, currentDoc.title, newItemsMap]);

  const readTimeEstimate = useMemo(() => {
    const words = (currentDoc.body || '').split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 180));
    return `${minutes} min read`;
  }, [currentDoc.body]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results: { id: string; title: string; section: string; isNew?: boolean; theme?: BadgeTheme; label?: string; }[] = [];
    for (const section of sections) {
      for (const item of section.items) {
        const doc = docs[item.id];
        if (doc && (doc.title.toLowerCase().includes(q) || doc.body.toLowerCase().includes(q))) {
          const newMeta = newItemsMap.get(item.id);
          results.push({ 
            id: item.id, 
            title: doc.title, 
            section: section.title, 
            isNew: newMeta?.isNew, 
            theme: newMeta?.theme,
            label: newMeta?.label 
          });
        }
      }
    }
    return results;
  }, [search, newItemsMap]);

  const handleSearchSelect = (id: string) => {
    setActiveSection(id);
    setSearchParams({ section: id });
    setSearch('');
    setSidebarOpen(false);
  };

  const SectionIcon = currentSectionMeta.icon;

  return (
    <div className="docs-wrapper">
      {/* Search Popup Overlay */}
      {search && searchResults && (
        <div className="docs-search-overlay" onClick={() => setSearch('')}>
          <div className="docs-search-popup" onClick={(e) => e.stopPropagation()}>
            <div className="docs-search-popup-header">
              <span>{searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'} for "{search}"</span>
              <span className="docs-search-esc-hint">Press Esc to close</span>
            </div>
            {searchResults.length === 0 ? (
              <p className="docs-search-empty">No results found for "{search}".</p>
            ) : (
              <div className="docs-search-results-list">
                {searchResults.map((r) => (
                  <button key={r.id} className="docs-search-result" onClick={() => handleSearchSelect(r.id)}>
                    <div className="docs-search-result-left">
                      <span className="docs-search-result-title">{r.title}</span>
                      {r.isNew && (
                        <span className={`docs-sidebar-badge-new theme-${r.theme || 'violet'}`}>
                          <span>{r.label || 'NEW'}</span>
                        </span>
                      )}
                    </div>
                    <span className="docs-search-result-section">{r.section}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Topbar */}
      <div className="docs-mobile-topbar mkt-container">
        <button className="docs-mobile-menu-trigger" onClick={() => setSidebarOpen(true)}>
          <Menu size={15} />
          <span>{currentSectionMeta.category} / {currentDoc.title}</span>
        </button>
      </div>

      <div className="docs-body mkt-container">
        <aside className={`docs-sidebar ${sidebarOpen ? 'open' : ''}`} data-lenis-prevent>
          {sidebarOpen && <div className="docs-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
          
          <div className="docs-sidebar-search">
            <div className="docs-search-inner">
              <Search size={14} className="docs-search-icon" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="docs-search-input"
              />
              {search && (
                <button className="docs-search-clear-btn" onClick={() => setSearch('')} aria-label="Clear search">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <nav className="docs-nav">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.id} className="docs-nav-group">
                  <p className="docs-nav-group-title"><Icon size={14} /> {section.title}</p>
                  {section.items.map((item) => {
                    const itemMeta = newItemsMap.get(item.id);
                    return (
                      <button
                        key={item.id}
                        className={`docs-nav-item ${activeSection === item.id ? 'active' : ''} ${itemMeta?.isNew ? 'has-new' : ''}`}
                        onClick={() => handleSearchSelect(item.id)}
                      >
                        <span className="docs-nav-item-text">{item.title}</span>
                        {itemMeta?.isNew && (
                          <span className={`docs-sidebar-badge-new theme-${itemMeta.theme}`}>
                            <span>{itemMeta.label}</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="docs-content">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Breadcrumb & Metadata Header */}
            <div className="docs-meta-header">
              <div className="docs-breadcrumbs">
                <span className="docs-breadcrumb-item">Docs</span>
                <ChevronRight size={12} className="docs-breadcrumb-sep" />
                <span className="docs-breadcrumb-item">{currentSectionMeta.category}</span>
                <ChevronRight size={12} className="docs-breadcrumb-sep" />
                <span className="docs-breadcrumb-active">{currentDoc.title}</span>
              </div>
              <div className="docs-meta-pill">
                <SectionIcon size={12} />
                <span>{currentSectionMeta.category}</span>
                <span className="docs-meta-dot">•</span>
                <span>{readTimeEstimate}</span>
              </div>
            </div>

            <div className="docs-title-row">
              <h1 className="docs-content-title">{currentDoc.title}</h1>
              {currentSectionMeta.isNew && (
                <motion.div 
                  className={`docs-title-badge-new theme-${currentSectionMeta.theme}`}
                  initial={{ opacity: 0, scale: 0.85, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span>{currentSectionMeta.label}</span>
                </motion.div>
              )}
            </div>
            
            <div className="docs-content-body">
              {parseMarkdownBlocks(currentDoc.body)}
            </div>

            <DocsFeedback sectionId={activeSection} />
          </motion.div>

          <div className="docs-footer-nav">
            {(() => {
              const all = sections.flatMap(s => s.items);
              const idx = all.findIndex(i => i.id === activeSection);
              const prev = idx > 0 ? all[idx - 1] : null;
              const next = idx < all.length - 1 ? all[idx + 1] : null;
              return (
                <>
                  {prev && (
                    <button className="docs-footer-link prev" onClick={() => handleSearchSelect(prev.id)}>
                      <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
                      <span><span className="docs-footer-label">Previous</span>{prev.title}</span>
                    </button>
                  )}
                  {next && (
                    <button className="docs-footer-link next" onClick={() => handleSearchSelect(next.id)}>
                      <span><span className="docs-footer-label">Next</span>{next.title}</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </main>
      </div>
    </div>
  );
}