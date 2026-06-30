# Noska Help & Feature Reference

## Quick Start

| Shortcut | Action |
|---|---|
| `/` | Open slash command menu |
| `Ctrl+F` / `Cmd+F` | Find in page |
| `Ctrl+Shift+D` | Duplicate block |
| `Ctrl+Shift+E` | Export page |
| `Ctrl+Shift+V` | Voice capture |
| `Alt+Click` | Open page in side peek |
| `Ctrl+D` | Duplicate page |
| `Ctrl+Shift+R` | Rename page |
| `Ctrl+Shift+P` | Move page |
| `Arrow keys` | Navigate sidebar tree |
| `Enter` | Open selected tree item |
| `Home` / `End` | Jump to first/last tree item |
| `Escape` | Close find bar, dismiss menus |

---

## Page Tree & Navigation

- **Sidebar tree** shows private documents in a nested hierarchy
- **Chevron** (`▶` / `▼`) expands/collapses — no navigation
- **Title/icon** clicks navigate to that page
- **`+`** button creates a child page under the parent
- **Drag** to reorder or reparent (6px activation threshold)
- **Favorites** section at top shows starred pages
- **In-page child cards** appear below page content (with child count `› N` indicator)

### Keyboard Navigation

Press `Tab` to focus the tree, then:
- `ArrowUp`/`ArrowDown` — move focus
- `ArrowRight` — expand collapsed + open page
- `ArrowLeft` — collapse expanded
- `Enter` — open page
- `Home`/`End` — first/last item

---

## Breadcrumbs

Every page shows a full hierarchy path above the title. Each segment is clickable to navigate upward. `aria-current="page"` marks the current page segment.

---

## Game Engine
<!-- (This is a placeholder; feature not yet built but reserved) -->

---

## Comment System

- Click the **Comment** button on any block to create a threaded comment
- Comments anchor to `blockId` and survive block moves
- Resolve/reopen support with `@mention` of collaborators
- `CommentThread` panel shows active and resolved comments with `timeAgo` formatting

---

## Version History

- Auto-saves page state every 5 seconds of inactivity (last 50 versions)
- **Page Options → History** opens `VersionHistoryPanel`
- Block-by-block diff engine (`added` / `removed` / `changed` / `unchanged`)
- Selective restore of individual blocks
- Database versions restore views/properties only (preserves row data)

---

## Wiki Conversion

- **Page Options → Wiki** adds 6 database properties (Page, Tags, Owner, Status, Verification, Last-edited) and 3 wiki views (Home, All pages, Pages I own)
- Sets `wikiEnabled: true`

---

## Forms Engine

- `/form` slash command inserts a `FormsBlock` with 7 field types: text, textarea, email, number, select, checkbox, date
- Required validation, email validation, conditional logic (show/hide based on other fields)
- Anonymous toggle for submissions
- Responses table with CSV export

---

## Filters (Database Views)

- Per-view filter groups with nested AND/OR conditions
- Property/operator/value selectors with `is-empty` / `is-not-empty` operators
- Add/remove conditions interactively

---

## Embed Blocks

| Type | Description |
|---|---|
| `video` | Embedded video player |
| `audio` | Audio playback |
| `file` | File attachment |
| `bookmark` | URL bookmark with preview |
| `table_of_contents` | Auto-generated page TOC |
| `tabs` | Tabbed content container |

---

## Page Options Menu

| Action | Description |
|---|---|
| **Present** | Fullscreen presentation overlay |
| **Suggest edits** | Toggle suggestion mode banner |
| **Move to** | Open page picker modal to reparent |
| **Import** | File picker + markdown parser |
| **Export** | Download as `.md` (Blob) |
| **Wiki** | Convert page to wiki with properties + views |
| **History** | Version history panel |
| **Analytics** | Blocks/word/database/comment counts |

---

## Premium Features

### 1. Infinite Canvas Mode
Toggle in topbar: **Document → Canvas → Graph**.
Zoomable/pannable 2D workspace. Cards are draggable with spring physics. Positions saved to localStorage.

### 2. Thought Graph View
Force-directed page relationship graph. Nodes = pages, edges = parent-child + tag relations.

### 3. Focus Zoom
Block menu → **Focus block**. Isolates a single block in a centered overlay.

### 4. Note Stacking (Multi-Column)
`Alt+Click` any page link to open in side-by-side resizable columns.

### 5. Reading Mode
Topbar book icon. Minimalist distraction-free reading overlay.

### 6. One-Click Export
`Ctrl+Shift+E`. Markdown / HTML / Plain Text / JSON with live preview.

### 7. Web Clipper + AI Digest
Clip URLs or text. AI Digest summarizes clips as callout blocks.

### 8. Voice-to-Structure
`Ctrl+Shift+V`. Speech-to-text with AI structuring into headers/lists/todos.

### 9. AI Ghost Writer
Pause 800ms → grey inline prediction. `Tab` to accept, `Escape` to dismiss.

### 10. Spaced Repetition (SM-2)
Block → **Add to Review**. Study flashcards with SuperMemo-2 algorithm.

### 11. Note DNA & Lineage
Page Options → **Note DNA**. Visual timeline of page creation, edits, trashes.

### 12. Multiplayer Co-thinking
Simulated collaboration with cursors, comments, avatar stacks.

### 13. End-to-End Encryption
AES-GCM 256-bit via SubtleCrypto. Lock pages in sidebar with lock icon.

### 14. Open API Console
Documented local API routes with live request playground.

---

# Build Notion-Level Database Engine for Noska

## Context

Noska is an AI-first workspace inspired by Notion but designed to surpass it.

### Current Stack
- React 19
- Vite
- TailwindCSS
- TipTap Editor
- React Router
- Zustand
- Supabase
- TypeScript (preferred)
- Vercel deployment

Architecture must be modular, scalable, and maintainable. Follow feature-based architecture.

---

## Goal

Implement a fully functional Database Engine similar to Notion.

- Every database row must itself be a Page
- Every page can contain: Blocks, Child Pages, Properties, Relations, Comments, Attachments, AI Context
- Everything in Noska is ultimately a Page

---

## Core Architecture

```
src/
  modules/
    database/
      components/
      views/
      hooks/
      services/
      types/
      utils/
    page/
      properties/
      relations/
      peek/
      views/
        table/
        board/
        calendar/
        timeline/
        gallery/
        graph/
```

---

## Data Model

```
Workspace
  └── Pages
       ├── Blocks
       ├── Properties
       ├── Relations
       └── Views
```

Every object extends Page:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique ID |
| `title` | string | Page title |
| `icon` | string | Emoji icon |
| `cover` | string | Cover URL/gradient |
| `parentId` | string? | Parent page ID |
| `createdAt` | ISO | Creation timestamp |
| `updatedAt` | ISO | Last update timestamp |
| `children` | string[] | Child page IDs |
| `blocks` | Block[] | Content blocks |
| `properties` | Property[] | Page properties |
| `relations` | Relation[] | Linked relations |
| `comments` | Comment[] | Threaded comments |
| `attachments` | Attachment[] | File attachments |
| `aiMetadata` | object | AI-generated metadata |

### Database
| Field | Type |
|---|---|
| `properties[]` | PropertyDefinition[] |
| `views[]` | ViewDefinition[] |
| `rows[]` | Page[] (extend Page) |

Each row is editable as a page, inherits all page capabilities.

---

## Property System

### Supported Types

| Type | Widget |
|---|---|
| Text | Single-line input |
| Number | Numeric input |
| Checkbox | Boolean toggle |
| Date | Date picker |
| Select | Single dropdown |
| Multi Select | Tag pills |
| Status | Colored status badge |
| Priority | Priority scale (1-5) |
| Person | User selector |
| Relation | Linked page picker |
| Rollup | Aggregated value |
| Formula | Computed expression |
| URL | Hyperlink |
| Email | Mailto link |
| Phone | Tel link |
| Files | File upload list |
| Created Time | Auto-set on creation |
| Updated Time | Auto-set on update |
| Created By | Auto-set from user |
| Updated By | Auto-set from user |
| AI Summary | AI-generated summary |
| AI Tags | AI-generated tags |
| Estimated Time | Duration estimate |
| Risk Score | Computed risk metric |

Each property type is pluggable — new types require minimal code.

---

## Views

One database, multiple synchronized views. Changing data in any view updates all others.

### Table View
- Resizable columns
- Drag to reorder columns
- Hide/show columns
- Sort (ascending/descending)
- Filter (AND/OR groups with operators)
- Search within view
- Pagination
- Inline editing
- Multi-select rows
- Bulk delete / bulk edit
- Duplicate rows
- Keyboard navigation (Arrow keys, Tab, Enter)

### Board / Kanban View
- Drag cards between columns
- Custom grouping by Status, Priority, Assignee, or any Select property
- Animated drag with virtual rendering
- Column add/remove

### Calendar View
- Month / Week / Day / Agenda layouts
- Drag to reschedule events
- Date property binding
- Recurring events support

### Timeline View
- Horizontal Gantt-style timeline
- Zoom in/out
- Resize duration bars
- Dependency arrows between items
- Milestone markers

### Gallery View
- Card preview with cover image
- Custom preview property selection
- Responsive auto-grid layout

### Graph View
- Visualize page relationships as nodes + edges
- Zoom, pan, drag nodes
- Expand/collapse connected pages
- Search within graph
- Force-directed animated layout

---

## Page Opening

Every database row opens as a Page with these modes:

| Mode | Behavior |
|---|---|
| **Full Page** | Navigates to the page |
| **Right Peek** | Opens in resizable right panel, left sidebar stays visible |
| **Bottom Peek** | Opens in bottom panel |
| **Floating Window** | Detached window overlay |
| **Split View** | Side-by-side with current page |
| **New Tab** | Opens in a new stacked column |

Peek panel is resizable. Does not navigate away from current context.

### Peek Panel
- Left side always remains visible
- Right side displays: Properties, Blocks, Children, Comments, Relations, History, AI
- Supports multiple peek panels simultaneously

---

## Child Pages

- Pages contain unlimited nested pages (Notion-exact)
- Click child page → navigates in same context
- Breadcrumb updates to reflect current path
- No sidebar required for navigation

---

## Relations

- One to One, One to Many, Many to Many
- Click relation → opens linked page
- Bi-directional sync

---

## Rollups

| Rollup | Example |
|---|---|
| Count | Number of tasks in project |
| Sum | Total hours logged |
| Avg | Average priority |
| Min/Max | Earliest/latest due date |
| Percent | Completion percentage |

---

## Formula Engine

| Category | Operations |
|---|---|
| Math | `+`, `-`, `*`, `/`, `%`, `abs`, `round`, `floor`, `ceil`, `min`, `max` |
| Date | `now()`, `date()`, `dateBetween()`, `formatDate()` |
| String | `concat()`, `slice()`, `replace()`, `contains()` |
| Boolean | `if()`, `and()`, `or()`, `not()`, `empty()` |
| Conditional | `if(condition, then, else)`, `switch()` |

Formulas update automatically when dependencies change.

---

## Templates

| Template | Properties |
|---|---|
| **Task** | Status, Priority, Assignee, Due Date, Estimated Time |
| **Meeting** | Date, Attendees, Agenda, Action Items |
| **Project** | Status, Owner, Timeline, Milestones, Budget |
| **CRM** | Contact, Company, Stage, Deal Value |
| **Bug Report** | Severity, Reproducibility, Environment, Steps |
| **Documentation** | Category, Tags, Reviewer, Published |

Users can create custom templates.

---

## AI Features (Noska AI-first)

| Feature | Description |
|---|---|
| **AI Summary** | Auto-summarize page content |
| **Auto Tags** | Generate tags from content |
| **Smart Priority** | Predict priority based on content |
| **Estimated Time** | Auto-estimate task duration |
| **Risk Score** | Compute risk from properties |
| **Generate Description** | AI-write description from title |
| **Suggest Relations** | Find linked pages automatically |
| **Suggest Properties** | Recommend property types for content |
| **Find Duplicates** | Detect similar pages |
| **Natural Language Queries** | "Show overdue tasks", "Tasks due this week" |

---

## Search

- Normal text search across pages and blocks
- Property-specific search
- Relation-aware search
- Architecture supports future vector/semantic search

---

## Performance

- Virtual scrolling for large lists
- Lazy rendering of offscreen content
- Optimistic updates for snappy UI
- Code splitting by view module
- Memoization of expensive computations
- Infinite scrolling for paginated views
- Background sync with Supabase

---

## Collaboration Ready

Architecture supports future:
- Presence indicators
- Live cursors
- Realtime editing
- Comments + mentions
- Notifications
- Activity log (already implemented)
- Version history (already implemented)

---

## Backend (Supabase)

### Tables
- `pages` — All pages and database rows
- `blocks` — Page content blocks
- `databases` — Database definitions
- `database_rows` — Row membership
- `properties` — Property definitions
- `property_values` — Cell values
- `relations` — Page-to-page links
- `views` — Saved view configurations
- `comments` — Threaded comments
- `attachments` — File metadata
- `activity` — Audit log

All tables normalized, with RLS policies for multi-user access.

---

## UI Standards

- Dark mode first
- 4px / 8px rounded cards
- Smooth spring animations (380 stiffness, 28 damping)
- Minimal, clean interface
- No clutter
- Notion-quality feel

---

## Future AI (Extensible Architecture)

Design supports plugging in without rewriting:
- Canvas & Whiteboard
- Mind Maps
- Voice Notes
- PDF AI Chat
- Chat With Database
- Knowledge Graph
- Agent Workspace

---

## Deliverables (Build Order)

| Step | Module | Status |
|---|---|---|---|
| 1 | Database Engine (core data model + CRUD) | Done |
| 2 | Property Engine (all 24 types pluggable) | Done |
| 3 | Views (Table, Board, Calendar, Timeline, Gallery, List, Graph) | Done |
| 4 | Peek Panel (right-bottom-floating modes) | Done |
| 5 | Relations (1:1, 1:N, N:M with engine) | Done |
| 6 | Rollups (count, sum, avg, min, max, percent) | Done |
| 7 | Formula Engine (math, date, string, boolean, conditional) | Done |
| 8 | Templates (task, meeting, project, CRM, bug, docs) | Done |
| 9 | AI Layer (summary, tags, priority, risk, NL queries) | Done |
| 10 | Performance Optimization (virtual scroll, debounce, batch) | Done |

---

## Build Status

| Step | Status |
|---|---|
| Database Engine | Not started |
| Property Engine | Not started |
| Views | Not started |
| Peek Panel | Not started |
| Relations | Not started |
| Rollups | Not started |
| Formula Engine | Not started |
| Templates | Not started |
| AI Layer | Partially implemented (ghost writer, voice, AI actions) |
| Performance Optimization | Basic memoization done |

---

## Key Implementation Notes

- **Normalized data model** — `pages` table with `type` discriminator (page / database / row)
- **Property values** stored in `property_values` table as JSONB for flexibility
- **Views** are saved configurations (not separate data copies)
- **Formulas** recompute on dependency change via a DAG
- **Rollups** aggregate across relation-linked rows
- **Relations** are bi-directional with automatic reverse sync
- **Peek** is a context-preserving overlay, not a navigation event
- **Every row is a page** — clicking any database cell opens the underlying page
