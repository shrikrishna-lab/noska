# ULTIMATE FEATURES PROMPT — AI NOTE APP
> One master prompt. 23 features. Copy this into a new Claude chat to build each feature.

---

## HOW TO USE THIS

Each section below is a **standalone prompt**. You have two options:

- **Option A** — Paste the full file and say: *"Build all features one by one, starting with Feature 1"*
- **Option B** — Copy one `## FEATURE N` section at a time and build incrementally

All features assume the dark Notion-like base app is already built.

---

---

# ═══════════════════════════════════════
# FEATURE 1 — INFINITE CANVAS
# ═══════════════════════════════════════

Add an **Infinite Canvas mode** to the note app. This is a zoomable, pannable spatial canvas where notes become moveable cards.

## CANVAS ENTRY
- Every page has a view toggle in the top-right: `Document | Canvas`
- Clicking "Canvas" switches the editor into canvas mode
- All existing blocks from the page become draggable cards on the canvas
- Canvas state (positions) is saved separately from document state via `window.storage`

## CANVAS CONTROLS
- **Pan**: click and drag on empty canvas area (cursor becomes grabbing hand)
- **Zoom**: scroll wheel or pinch. Range: 25% → 200%. Show zoom % in bottom-right corner
- **Mini-map**: bottom-right corner, 120x80px thumbnail of entire canvas with a viewport rectangle
- **Fit to screen button**: `⊡` icon, zooms to fit all cards in view
- **Reset zoom**: double-click empty canvas area

## CARDS ON CANVAS
Each note block becomes a card:
```
┌─────────────────────────────────┐
│ ⠿  Block title / first line     │  ← drag handle top-left, 8px
│─────────────────────────────────│
│ Content preview (3 lines max,  
<truncated 45215 bytes>
                     │
│──────────────────────────────────────────────────────────│
│  Your API keys                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ sk-note-abc123...xyz  [Copy]  [Regenerate]  [✕]   │ │
│  └────────────────────────────────────────────────────┘ │
│  [+ Create new API key]                                  │
│                                                          │
│  Usage this month: 1,247 requests / 10,000 free          │
│  [████████░░░░] 12%                                      │
│                                                          │
│  [📖 View API docs]                                      │
└──────────────────────────────────────────────────────────┘
```

## API DOCUMENTATION PAGE (in-app)
Interactive API docs (like Swagger UI but custom-built):
Show these endpoint cards with collapsible request/response:

```
GET    /api/pages              List all pages
POST   /api/pages              Create a new page
GET    /api/pages/{id}         Get a page with all blocks
PUT    /api/pages/{id}         Update page title/icon/cover
DELETE /api/pages/{id}         Move page to trash

GET    /api/pages/{id}/blocks  Get all blocks
POST   /api/pages/{id}/blocks  Append a new block
PUT    /api/blocks/{id}        Update a block
DELETE /ap
<truncated 36811 bytes>

NOTE: The output was truncated because it was too long. Use a more targeted query or a smaller range to get the information you need.

# ═══════════════════════════════════════
# NOSKA PREMIUM FEATURES DIRECTORY
# ═══════════════════════════════════════

Total Premium Features: **14 Features**

This directory lists all the advanced features built into Noska, how to access them, and how they function.

---

### 1. Infinite Canvas Mode
*   **How to Access**: Click the **Document | Canvas | Graph** mode toggle in the topbar (select **Canvas**).
*   **How it Works**: Transitions the document into an infinite 2D zoomable and pannable workspace.
    *   Note blocks are rendered as interactive, draggable cards using smooth spring physics.
    *   **Controls**: Left-click and drag the canvas to pan. Scroll or pinch to zoom (25% to 200%). Double-click empty canvas to reset.
    *   **Dashboard HUD**: Displays active zoom percentage, a "fit-to-screen" button (`⊡`), reset zoom, and a dynamic mini-map preview in the bottom-right corner.
    *   **Persistence**: Positions of all cards are automatically saved in `localStorage` keyed by page ID.

### 2. Thought Graph View
*   **How to Access**: Click the **Document | Canvas | Graph** mode toggle in the topbar (select **Graph**).
*   **How it Works**: Renders all workspace pages as nodes in a dynamic force-directed connection network.
    *   Connects nodes with animated SVG paths representing parent-child and tag relations.
    *   Spring drag physics let users reposition nodes, dynamically interpolating vectors in real-time.
    *   Clicking a node automatically navigates to that page.

### 3. Focus Zoom
*   **How to Access**: Open a block's options menu (click `⠿` or `AnimatedMenu` on any block's left margin), then click **Focus block**.
*   **How it Works**: Isolates and centers the selected block in a focused overlay, blurring out the rest of the workspace to minimize distraction. Supports inline edits within the focus window, immediately synced to the page.

### 4. Note Stacking (Multi-Column Peeking)
*   **How to Access**: Hold `Alt` (or `Cmd` on Mac) while clicking any page link in the sidebar or editor, or select **Open in split view** from page menus.
*   **How it Works**: Opens pages side-by-side in stacked, resizable columns.
    *   Allows parallel reading and editing.
    *   Columns can be resized by dragging the edge handles and closed individually. Supports spring-guided layout slide-outs when cards are closed.

### 5. Reading Mode
*   **How to Access**: Click the **Reading Mode** button in the Topbar (the book icon) or inside any note column header.
*   **How it Works**: Enters a minimalist distraction-free reading overlay. Removes editing options, grids, toolbars, and focuses purely on clean typographical hierarchy.

### 6. One-Click Export
*   **How to Access**: Click the **Page Options (MoreHorizontal)** icon in the Topbar, and select **Export Page...** (Shortcut: `Ctrl+Shift+E`).
*   **How it Works**: Displays a modal with format selector tabs (**Markdown**, **HTML**, **Plain Text**, **JSON**). Renders a live preview of the converted page blocks.
    *   Clicking "Download" triggers a local memory blob file creation and browser download.

### 7. Web Clipper + AI Digest
*   **How to Access**: Click the **Page Options (MoreHorizontal)** icon in the Topbar, and select **Web Clipper...** (Shortcut: `Ctrl+Shift+C`).
*   **How it Works**: Displays a slide-out panel allowing users to clip URLs or raw text.
    *   Imports content as structured blocks into a new page.
    *   Features an **AI Digest** button that summarizes clips using the AI provider and inserts it as a callout block.
    *   Maintains a localStorage clip history list.

### 8. Voice-to-Structure
*   **How to Access**: Click the **Voice capture** button next to "Add cover" at the top of the editor page (Shortcut: `Ctrl+Shift+V`).
*   **How it Works**: Uses browser SpeechRecognition to transcribe speech.
    *   Displays a beautiful real-time audio canvas wave visualizer during recording.
    *   Sends transcribed text to AI to convert raw speech into structured outlines (headers, checklist items, todos).
    *   Unsupported browsers fall back gracefully.

### 9. AI Ghost Writer
*   **How to Access**: Enabled by default in settings. Pause typing inside any text block for 800ms to trigger.
*   **How it Works**: Predicts text continuation inline using the active AI model, displaying suggestions in grey.
    *   **Tab**: Accept completion.
    *   **Escape**: Dismiss completion.
    *   Can be toggled under Settings (Settings -> Noska AI -> AI Ghost Writer).

### 10. Spaced Repetition (SM-2 Study)
*   **How to Access**: Click a block's options menu, select **Add to Review**. Open the study card player by clicking **Review** at the bottom of the sidebar.
*   **How it Works**: Employs the SuperMemo-2 scheduling algorithm to review flashcards.
    *   Cards show block questions. Users press **Space** to show answers, then rate recall quality (1: Again, 2: Hard, 3: Good, 4: Easy).
    *   Dashboard tabs show performance analytics (total cards, mastery rating, study streaks, and study stats).

### 11. Note DNA & Lineage
*   **How to Access**: Click **Page Options (MoreHorizontal)** in the Topbar, select **Note DNA...**.
*   **How it Works**: Displays a visual vertical timeline tracing the page's history log.
    *   Logs page origin (blank, template details, duplication fork sources) and updates (renames, trash, and restores).

### 12. Multiplayer Co-thinking Simulation
*   **How to Access**: Click **Page Options (MoreHorizontal)** in the Topbar, select **Co-thinking...**.
*   **How it Works**: Simulates team collaboration on a page.
    *   Fades in moving client cursors with color labels editing block content.
    *   Adds an avatar stack next to Topbar share options showing connected users.
    *   Adds block comment bubbles displaying discussion threads.

### 13. End-to-End Encryption
*   **How to Access**: Click **Page Options (MoreHorizontal)** in the Topbar, select **Encrypt Page...**.
*   **How it Works**: Uses standard **SubtleCrypto Web API** with PBKDF2 key derivation and AES-GCM 256-bit encryption.
    *   Locks pages, redacting all text contents into ciphertext blocks in local storage.
    *   Prompt passphrases on page select to decrypt.
    *   Autosaves encrypt content dynamically in the background using active keys, keeping plaintext data entirely in-memory.
    *   Shows lock icons next to page names in the sidebar tree.

### 14. Open API Console
*   **How to Access**: Click **API Console** in the bottom-left sidebar tab.
*   **How it Works**: Documents all local workspace page/block routes (`GET /api/pages`, `POST /api/pages`, etc.).
    *   Allows generating simulated API tokens.
    *   Includes a JSON request editor and playground client that sends live queries to directly mutate the app state in real-time.

