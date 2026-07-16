import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, BookOpen, ChevronRight, Terminal, Shield, Users, Key, Database, Brain, Layout, Share2, Keyboard, FileText, HelpCircle, Github, ExternalLink, Menu, X } from 'lucide-react';
import './Docs.css';

interface DocSection {
  id: string;
  icon: typeof BookOpen;
  title: string;
  items: { id: string; title: string; }[];
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
    ],
  },
  {
    id: 'features',
    icon: Layout,
    title: 'Core Features',
    items: [
      { id: 'pages-blocks', title: 'Pages & Blocks' },
      { id: 'databases', title: 'Databases' },
      { id: 'canvas', title: 'Canvas' },
      { id: 'thought-graph', title: 'Thought Graph' },
      { id: 'ai-assistant', title: 'AI Assistant' },
    ],
  },
  {
    id: 'workspace',
    icon: Users,
    title: 'Workspace',
    items: [
      { id: 'collaboration', title: 'Collaboration' },
      { id: 'sharing', title: 'Sharing & Permissions' },
      { id: 'keyboard-shortcuts', title: 'Keyboard Shortcuts' },
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
    id: 'account',
    icon: Key,
    title: 'Account',
    items: [
      { id: 'plans', title: 'Plans & Pricing' },
      { id: 'import-export', title: 'Import & Export' },
      { id: 'api-reference', title: 'API Reference' },
    ],
  },
];

const docs: DocContent = {
  'introduction': {
    title: 'Introduction',
    body: `Noska is a modern knowledge workspace that combines documents, databases, AI assistance, and spatial canvases into a single, quiet interface. Think of it as a second brain — a place where your ideas can start as quick notes, grow into structured documents, and eventually become an interconnected knowledge base.

**Why Noska?**

Most tools force you to decide how to structure information before you've even figured out what you're working on. You pick between a doc, a spreadsheet, a whiteboard, or a project manager — and you're locked in. Noska takes a different approach: start with a blank page, and let structure emerge as understanding grows.

**Key principles:**

- **Start blank, stay flexible** — Every page begins as a simple document. Type \`/\` to insert any block type, or just write.
- **Structure emerges** — The same content can be viewed as a document, a table, a board, a calendar, or a spatial canvas.
- **Connections are automatic** — Link pages and the Thought Graph draws a living map of your relationships.
- **AI works where you do** — Bring your own key from any of 8 providers and ask questions about your workspace content.`,
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
|-----------|---------|-------------|
| Text | just type | Plain paragraph |
| Heading 1 | \`#\` | Large section heading |
| Heading 2 | \`##\` | Medium section heading |
| Bullet list | \`-\` | Unordered list |
| Numbered list | \`1.\` | Ordered list |
| To-do | \`[]\` | Checkable task |
| Code block | \`\`\` | Code with syntax highlighting |
| Table | \`table\` | Rich data table |
| Image | \`image\` | Embed an image |
| Callout | \`>\` | Highlighted block |

**4. Invite your team**

Click **Share** in the top-right corner and enter an email address. Your teammate gets real-time editing access immediately.

**5. Press \`Ctrl + K\`**

Open the command palette from anywhere. Search pages, run commands, trigger AI actions — all without touching the mouse.`,
  },
  'core-concepts': {
    title: 'Core Concepts',
    body: `Noska is built around a few simple concepts that combine to create a powerful knowledge workspace.

**Pages**

A page is the fundamental unit in Noska. Every page is a canvas that can contain any combination of blocks. Pages can be nested inside each other (parent-child), linked together, and organized across workspaces.

Pages have three viewing modes:
- **Document** — Linear, scrollable view
- **Canvas** — Spatial, zoomable view where blocks become draggable
- **Graph** — Network view showing connections between pages

**Blocks**

Blocks are the building blocks of content. Everything on a page is a block — text, images, tables, code, embeds, databases, and more. Each block has its own identity, which means blocks can be:
- Dragged and reordered
- Converted between types
- Turned into flashcards
- Linked to from other pages

**Databases**

Databases are pages that hold structured records. Each row is a page itself, meaning every database entry can have its own rich content. Databases support multiple views:
- **Table** — Spreadsheet-like grid
- **Board** — Kanban-style columns
- **Calendar** — Time-based layout
- **Timeline** — Gantt-style project view
- **Graph** — Relationship network

**Connections**

Linking pages creates a web of knowledge. The Thought Graph visualizes these connections as a force-directed network, making it easy to discover relationships you might have missed.

**AI Workspace**

Bring your own AI key (OpenAI, Anthropic, Google, Groq, and more) to query your workspace. Ask questions, summarize pages, generate content, and get suggestions — all scoped to your own data.`,
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
|----------|--------|
| Text | Paragraph, Heading 1-3, Bullet list, Numbered list, To-do, Toggle, Callout, Quote |
| Media | Image, Video, Audio, File, Embed, Bookmark, Divider |
| Code | Code block (with syntax highlighting for 40+ languages), Inline code |
| Data | Table, Database view, Chart, Kanban board |
| Advanced | Math (KaTeX), Diagram (Mermaid), Timeline, Map, Link preview |
| Layout | Columns, Spacer, Section divider |

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
Table view    | Name    | Status    | Due date     |
              |---------|-----------|-------------|
              | Task A  | In progress | 2026-07-20 |
              | Task B  | Done       | 2026-07-15 |

Board view    | To Do      | In Progress | Done    |
              |------------|-------------|---------|
              |            | Task A      | Task B  |

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
    title: 'Canvas',
    body: `The Canvas transforms any page into a spatial, zoomable workspace. Blocks become draggable cards that you can position freely — great for brainstorming, whiteboarding, and visual organization.

**Entering Canvas mode**

Click the **Canvas** tab at the top of any page. The page content is preserved — it just becomes freely positionable.

**Canvas features**

- **Pan** — Click and drag on empty space to move around
- **Zoom** — Scroll to zoom in and out, or use \`Ctrl + +\` / \`Ctrl + -\`
- **Mini-map** — A small overview in the corner shows your position
- **Drag blocks** — Pick up any block and place it anywhere
- **Snap to grid** — Blocks align to an invisible grid for tidy layouts

**Use cases**

- **Brainstorming** — Scatter ideas across the canvas and group them as you go
- **Architecture diagrams** — Arrange system components spatially and link them
- **Mood boards** — Collect images, notes, and links in a visual layout
- **Sprint planning** — Move sticky-note style cards between columns

**Tips**

- Double-click empty space to create a new text block at that position
- Use the mini-map to navigate large canvases quickly
- Press \`Shift + drag\` to select multiple blocks
- Canvas blocks maintain their positions when you switch back to Document view`,
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
  'ai-assistant': {
    title: 'AI Assistant',
    body: `Noska AI brings large language models directly into your workspace. Bring your own API key — your data and queries never touch our servers.

**Supported providers**

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4o-mini, GPT-4-turbo |
| Anthropic | Claude 3.5 Sonnet, Claude 3 Opus |
| Google | Gemini 1.5 Pro, Gemini 1.5 Flash |
| Groq | Llama 3, Mixtral, Gemma |
| AWS Bedrock | Claude, Llama, Mistral |
| Azure OpenAI | GPT-4o, GPT-4 |
| Together AI | Mixtral, Llama, DeepSeek |
| OpenRouter | 200+ models across providers |

**What AI can do**

- **Answer questions** — Ask about your workspace content ("What did we decide about the Q3 roadmap?")
- **Generate content** — Draft emails, blog posts, meeting notes
- **Summarize pages** — Get a tl;dr of any page
- **Rewrite & edit** — Change tone, fix grammar, expand or condense
- **Brainstorm** — Generate ideas, outlines, or alternatives

**How it works**

\`\`\`
1. Open the AI panel (click the AI icon in the toolbar)
2. Select your provider and model
3. Type your question or instruction
4. AI searches your workspace for relevant context
5. Response appears inline, with citations to source pages
\`\`\`

**Privacy**

Your API key is stored in your browser's local storage. All AI requests go directly from your browser to the provider — Noska never proxies your queries or sees your key.`,
  },
  'collaboration': {
    title: 'Collaboration',
    body: `Noska supports real-time collaborative editing, so your team can work together on the same page simultaneously.

**Inviting collaborators**

Click the **Share** button in the top-right corner of any page. Enter the email address of the person you want to invite. They'll receive a notification and can access the page immediately.

**Permission levels**

| Role | Access |
|------|--------|
| Viewer | Read-only access |
| Editor | Can create, edit, and delete blocks |
| Admin | Can manage sharing and page settings |

**Real-time features**

- **Presence cursors** — See where others are typing, with their name
- **Live sync** — Changes appear instantly for all connected users
- **Conflict resolution** — Noska handles concurrent edits gracefully
- **Activity log** — See who changed what and when

**Workspace sharing**

You can also share entire workspaces with teams. When a workspace is shared, all pages inside it inherit the workspace's permissions automatically, unless individual pages have custom sharing settings.

**Comments & discussions**

Select any block and click the comment icon (or press \`Ctrl + Shift + M\`) to start a discussion thread. Comments are anchored to specific content and persist even if the block moves.`,
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
    title: 'Keyboard Shortcuts',
    body: `Master Noska with keyboard shortcuts. Everything you can do with a mouse, you can do faster from the keyboard.

**Global shortcuts**

\`\`\`
Ctrl + K       Open command palette
Ctrl + N       New page
Ctrl + P       Quick search pages
Ctrl + /       Show all shortcuts
Ctrl + Shift + M   Toggle comments
Ctrl + Shift + L   Toggle AI panel
\`\`\`

**Page editing**

\`\`\`
/             Open block picker
Ctrl + B      Bold
Ctrl + I      Italic
Ctrl + U      Underline
Ctrl + Shift + S  Strikethrough
Ctrl + E      Inline code
Ctrl + Z      Undo
Ctrl + Shift + Z  Redo
Ctrl + D      Duplicate block
Ctrl + Shift + Up/Down   Move block up/down
\`\`\`

**Navigation**

\`\`\`
Ctrl + 1-6    Heading 1-6
Ctrl + ]      Indent
Ctrl + [      Outdent
Tab / Shift + Tab   Navigate table cells
Enter         Split block / new row
Shift + Enter New line (in same block)
\`\`\`

**Database views**

\`\`\`
Ctrl + Shift + T   Switch to Table view
Ctrl + Shift + B   Switch to Board view
Ctrl + Shift + C   Switch to Calendar view
Ctrl + Shift + G   Switch to Graph view
Ctrl + Shift + Enter   New row
\`\`\`

**Canvas mode**

\`\`\`
Space + drag    Pan canvas
Ctrl + + / -    Zoom in/out
Ctrl + 0        Reset zoom
Shift + drag    Select multiple blocks
Delete/Backspace   Remove selected blocks
\`\`\``,
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
|--------|--------|
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

Generate an API token from **Settings → API Keys**.

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

export default function Docs() {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('introduction');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentDoc = docs[activeSection] ?? docs.introduction;

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results: { id: string; title: string; section: string; }[] = [];
    for (const section of sections) {
      for (const item of section.items) {
        const doc = docs[item.id];
        if (doc.title.toLowerCase().includes(q) || doc.body.toLowerCase().includes(q)) {
          results.push({ id: item.id, title: doc.title, section: section.title });
        }
      }
    }
    return results;
  }, [search]);

  const handleSearchSelect = (id: string) => {
    setActiveSection(id);
    setSearch('');
    setSidebarOpen(false);
  };

  return (
    <div className="docs-wrapper">
      <div className="docs-search-bar mkt-container">
        <div className="docs-search-inner">
          <Search size={15} className="docs-search-icon" />
          <input
            type="text"
            placeholder="Search documentation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="docs-search-input"
          />
          <button className="docs-sidebar-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={16} />
          </button>
        </div>
      </div>

      {search && searchResults && (
        <div className="docs-search-overlay" onClick={() => setSearch('')}>
          <div className="docs-search-popup" onClick={(e) => e.stopPropagation()}>
            {searchResults.length === 0 ? (
              <p className="docs-search-empty">No results found.</p>
            ) : (
              searchResults.map((r) => (
                <button key={r.id} className="docs-search-result" onClick={() => handleSearchSelect(r.id)}>
                  <span className="docs-search-result-title">{r.title}</span>
                  <span className="docs-search-result-section">{r.section}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="docs-body mkt-container">
        <aside className={`docs-sidebar ${sidebarOpen ? 'open' : ''}`} data-lenis-prevent>
          {sidebarOpen && <div className="docs-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
          <nav className="docs-nav">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.id} className="docs-nav-group">
                  <p className="docs-nav-group-title"><Icon size={14} /> {section.title}</p>
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      className={`docs-nav-item ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => handleSearchSelect(item.id)}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="docs-content">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="docs-content-title">{currentDoc.title}</h1>
            <div className="docs-content-body">
              {currentDoc.body.split('\n').map((line, i, lines) => {
                if (line.startsWith('```')) {
                  const lang = line.slice(3).trim();
                  const codeLines: string[] = [];
                  let j = i + 1;
                  while (j < lines.length && !lines[j].startsWith('```')) {
                    codeLines.push(lines[j]);
                    j++;
                  }
                  const code = codeLines.join('\n');
                  return (
                    <div key={i} className="docs-code-block-wrapper">
                      {lang && <div className="docs-code-lang">{lang}</div>}
                      <pre className="docs-code-block"><code>{code}</code></pre>
                    </div>
                  );
                }
                if (line.startsWith('### ')) {
                  return <h3 key={i} className="docs-h3">{parseInlineMarkdown(line.slice(4))}</h3>;
                }
                if (line.startsWith('## ')) {
                  return <h2 key={i} className="docs-h2">{parseInlineMarkdown(line.slice(3))}</h2>;
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className="docs-strong-line">{parseInlineMarkdown(line.slice(2, -2))}</p>;
                }
                if (line.startsWith('- ')) {
                  return <li key={i} className="docs-li">{parseInlineMarkdown(line.slice(2))}</li>;
                }
                if (line.startsWith('| ')) {
                  const cells = line.split('|').filter(Boolean).map(c => c.trim());
                  if (cells.every(c => /^[-]+$/.test(c))) return null;
                  if (i > 0 && lines[i - 1]?.startsWith('| ')) {
                    return <tr key={i}>{cells.map((c, ci) => <td key={ci}>{parseInlineMarkdown(c)}</td>)}</tr>;
                  }
                  return (
                    <table key={i} className="docs-table">
                      <thead><tr>{cells.map((c, ci) => <th key={ci}>{parseInlineMarkdown(c)}</th>)}</tr></thead>
                      <tbody></tbody>
                    </table>
                  );
                }
                if (line.trim() === '') return null;
                return <p key={i} className="docs-p">{parseInlineMarkdown(line)}</p>;
              })}
            </div>
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