# Graph Report - .  (2026-06-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 833 nodes · 1449 edges · 76 communities (36 shown, 40 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]

## God Nodes (most connected - your core abstractions)
1. `RealtimeCollab` - 31 edges
2. `AIManager` - 30 edges
3. `uid()` - 24 edges
4. `auditEngine` - 22 edges
5. `plainText()` - 22 edges
6. `App()` - 19 edges
7. `SPRING_PRESETS` - 18 edges
8. `buildContext()` - 17 edges
9. `timeAgo()` - 17 edges
10. `blockFor()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `ChatMessageBubble()` --calls--> `uid()`  [EXTRACTED]
  src/components/AIRightPanel.jsx → src/utils/helpers.js
- `DatabaseRowModal()` --calls--> `uid()`  [EXTRACTED]
  src/components/DatabaseBlock.jsx → src/utils/helpers.js
- `PersonalAgentView()` --calls--> `uid()`  [EXTRACTED]
  src/features/agents/AgentWorkspace.jsx → src/utils/helpers.js
- `App()` --calls--> `decryptData()`  [EXTRACTED]
  src/App.jsx → src/features/encryption/Encryption.jsx
- `App()` --calls--> `encryptData()`  [EXTRACTED]
  src/App.jsx → src/features/encryption/Encryption.jsx

## Import Cycles
- None detected.

## Communities (76 total, 40 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (25): AGENTS, buildAgentPrompt(), getAgent(), AIManager, DEFAULT_CONFIG, buildBreadcrumb(), buildContext(), buildMinimalContext() (+17 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (34): WorkspaceJoinBar(), PageTree(), Sidebar(), Topbar(), AnimatedAI(), AnimatedBack(), AnimatedBell(), AnimatedBookmark() (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (33): getProviderList(), CommandPalette(), CustomDialog(), HelpModal(), NoskaAISettings(), SettingsModal(), ShareModal(), TrashModal() (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (28): getAgentList(), hasToolCalls(), stripToolCalls(), AI_ACTIONS, AIActionsCard(), ChatMessage(), ChatCard(), ChatSidebar() (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (8): CollabCursorLayer(), CollabPresenceBar(), CanvasCollabLayer(), BLOCK_ICONS, CanvasView(), useCursor(), usePresence(), RealtimeCollab

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (29): analyzePage(), PageInsights(), Editor(), ActivityTab(), AITab(), AuditTab(), CollaborationTab(), computeKnowledgeScore() (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (8): fetchAIMemory(), mapPageFromDb(), mapPageToDb(), saveAIChats(), savePage(), savePages(), saveSetting(), syncQueue

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (24): Block(), BlockContextMenu(), blockTypes, colorOptions, dragState, EmbedBlock(), getEmbedUrl(), PROVIDERS (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (20): AmbientGlow(), AnimatedGridLayer(), BASE_SPRING, FADE_IN_VARIANTS, NODE_SPRING, NODE_VARIANTS, GraphBackground(), GraphBreadcrumb() (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (33): buildMemoryContext(), clearMemory(), forgetMemory(), getDefaultMemory(), getMemoryByCategory(), getMemoryValue(), getPreference(), loadFromStorage() (+25 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (19): AuthBackground(), AuthCard(), AuthError(), AuthLoading(), AuthPage(), AuthProviders(), LoadingScreen(), LoadingStageText() (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (25): dependencies, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, framer-motion, lucide-react, pg, react (+17 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (5): MARKETPLACE_CATEGORIES, MARKETPLACE_ITEMS, NewPageOverlay(), templateCards, WorkspaceView()

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (11): aiProviders, cardVariants, containerVariants, creationStages, fadeUp, OnboardingFlow(), starterPagesFor(), stepVariants (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (15): 1. Concrete Transformation Patterns, 2. Error-First Structure, 3. Quantified Impact, 4. Self-Contained Examples, 5. Semantic Naming, Code Example Standards, Comments, Impact Level Guidelines (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.23
Nodes (13): initializeMemory(), App(), circlePosition(), createThemeAnimation(), polygonClip(), rectangleClip(), fetchAIChats(), fetchPages() (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (12): Fix suggestion, Source, What happened, Skill Feedback, Steps, Core Principles, Making and Committing Schema Changes, Reference Guides (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (3): DatabaseBlock(), DatabaseRowModal(), makeEmptyDatabase()

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (9): 1. Query Performance (query), 2. Connection Management (conn), 3. Security & RLS (security), 4. Schema Design (schema), 5. Concurrency & Locking (lock), 6. Data Access Patterns (data), 7. Monitoring & Diagnostics (monitor), 8. Advanced Features (advanced) (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.20
Nodes (9): ═══════════════════════════════════════, ═══════════════════════════════════════, API DOCUMENTATION PAGE (in-app), CANVAS CONTROLS, CANVAS ENTRY, CARDS ON CANVAS, FEATURE 1 — INFINITE CANVAS, HOW TO USE THIS (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (7): blocksToHtml(), blocksToMarkdown(), blocksToPlainText(), esc(), ExportPanel(), FORMATS, generateContent()

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (6): textToBlocks(), WebClipper(), textToBlocks(), VoiceCapture(), blockFor(), uid()

### Community 25 - "Community 25"
Cohesion: 0.28
Nodes (3): CATEGORIES, SAMPLE_TEMPLATES, MarketplacePage()

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (8): AI_STATUS_STEPS, LANGUAGES, MeetingWorkspace(), PRIORITIES, SPRING, STATUS_OPTIONS, TAB_SPRING, TABS

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (6): ReadingMode(), THEMES, covers, emojis, isValidUUID(), migrateLegacyIds()

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (7): [0.1.3](https://github.com/supabase/agent-skills/compare/v0.1.2...v0.1.3) (2026-06-02), [0.1.4](https://github.com/supabase/agent-skills/compare/v0.1.3...v0.1.4) (2026-06-05), Bug Fixes, Bug Fixes, Changelog, Features, Features

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (7): [1.2.0](https://github.com/supabase/agent-skills/compare/v1.1.1...v1.2.0) (2026-06-02), [1.3.0](https://github.com/supabase/agent-skills/compare/v1.2.0...v1.3.0) (2026-06-05), Bug Fixes, Bug Fixes, Changelog, Features, Features

### Community 30 - "Community 30"
Cohesion: 0.50
Nodes (7): bufToHex(), decryptData(), deriveKey(), encryptData(), getBytes(), hexToBytes(), LockPageModal()

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (5): How to Use, References, Rule Categories by Priority, Supabase Postgres Best Practices, When to Apply

### Community 33 - "Community 33"
Cohesion: 0.53
Nodes (5): fail(), main(), pass(), results, waitForApp()

## Knowledge Gaps
- **172 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+167 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RealtimeCollab` connect `Community 4` to `Community 16`, `Community 1`, `Community 3`, `Community 13`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `AIManager` connect `Community 0` to `Community 16`, `Community 26`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `auditEngine` connect `Community 14` to `Community 16`, `Community 5`, `Community 3`, `Community 13`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _172 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08181818181818182 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06708595387840671 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._