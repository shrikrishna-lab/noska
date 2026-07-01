# Requirements Document

## Introduction

Noska aims for full parity with Notion's slash command system. This feature ensures that every command available in Notion's slash menu exists in Noska's CommandRegistry AND that each command's `execute()` function performs the correct action when invoked. The scope covers: adding missing commands (embed services, database chart views, linked views), fixing commands with placeholder/no-op execute functions, and ensuring all commands produce the correct block type with proper initial state.

## Glossary

- **CommandRegistry**: The central registry (`src/core/commands/CommandRegistry.js`) that stores all slash commands with their metadata and execute functions
- **BlockRegistry**: The rendering registry (`src/registry/BlockRegistry.jsx`) that maps block types to UI components and icons
- **Slash_Menu**: The dropdown command palette triggered by typing "/" in the editor
- **Execute_Function**: The `execute(ctx)` method on each command that performs the actual block transformation or page action
- **Block_Context**: The context object passed to execute functions containing: page, block, blocks, onPatch, onAdd, onDelete, onNavigate, and other callbacks
- **blockForTree**: Helper function that creates a properly structured block object from a type and text
- **blockForDatabaseView**: Helper function that creates a database block configured for a specific view type
- **Embed_Block**: A block type that renders an embedded third-party service (iframe or rich preview)
- **Chart_Block**: A database visualization block that renders data as a chart (bar, line, donut, number)
- **Linked_View**: A database view that references data from another page's database

## Requirements

### Requirement 1: Missing Embed Commands

**User Story:** As a user, I want to embed content from all major third-party services via the slash menu, so that I can integrate external tools directly into my pages.

#### Acceptance Criteria

1. WHEN a user selects the "Abstract" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "abstract"
2. WHEN a user selects the "Invision" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "invision"
3. WHEN a user selects the "Mixpanel" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "mixpanel"
4. WHEN a user selects the "Framer" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "framer"
5. WHEN a user selects the "Whimsical" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "whimsical"
6. WHEN a user selects the "Miro" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "miro"
7. WHEN a user selects the "Sketch" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "sketch"
8. WHEN a user selects the "Excalidraw" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "excalidraw"
9. WHEN a user selects the "Typeform" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "typeform"
10. WHEN a user selects the "Replit" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "replit"
11. WHEN a user selects the "Hex" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "hex"
12. WHEN a user selects the "Deepnote" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "deepnote"
13. WHEN a user selects the "Trello" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "trello"
14. WHEN a user selects the "Dropbox Paper" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "dropbox-paper"
15. WHEN a user selects the "Evernote" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "evernote"
16. WHEN a user selects the "Workflowy" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "workflowy"
17. WHEN a user selects the "Word" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "word"
18. WHEN a user selects the "Monday" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "monday"
19. WHEN a user selects the "Quip" command, THE CommandRegistry SHALL create an embed-generic block with embed source set to "quip"
20. WHEN a user selects the "ZIP" command, THE CommandRegistry SHALL create a file block configured for ZIP archive handling

### Requirement 2: Missing Database Chart Commands

**User Story:** As a user, I want to create chart visualizations from the slash menu, so that I can quickly add data visualizations to my pages.

#### Acceptance Criteria

1. WHEN a user selects the "Vertical bar chart" command, THE CommandRegistry SHALL create a bar-chart-v block with default chart configuration
2. WHEN a user selects the "Horizontal bar chart" command, THE CommandRegistry SHALL create a bar-chart-h block with default chart configuration
3. WHEN a user selects the "Line chart" command, THE CommandRegistry SHALL create a line-chart block with default chart configuration
4. WHEN a user selects the "Donut chart" command, THE CommandRegistry SHALL create a donut-chart block with default chart configuration
5. WHEN a user selects the "Number chart" command, THE CommandRegistry SHALL create a number-chart block with default chart configuration
6. THE CommandRegistry SHALL register each chart command with category "Database", appropriate icon, and descriptive aliases

### Requirement 3: Missing Database View Commands

**User Story:** As a user, I want access to all database view types from the slash menu, so that I can quickly create any visualization of my data.

#### Acceptance Criteria

1. WHEN a user selects the "Feed view" command, THE CommandRegistry SHALL create a database block configured with feed view type
2. WHEN a user selects the "Linked view of data source" command, THE CommandRegistry SHALL create a linked-view block that prompts for a data source selection
3. THE CommandRegistry SHALL register "Feed view" with category "Database", aliases including "feed" and "rss", and icon Activity
4. THE CommandRegistry SHALL register "Linked view" with category "Database", aliases including "linked", "source", and "linked-db", and icon Link

### Requirement 4: Command Execute Function Correctness — Block Type Commands

**User Story:** As a user, I want every block-type slash command to produce the correct block structure when executed, so that blocks render and behave correctly after creation.

#### Acceptance Criteria

1. WHEN a basic block command (text, h1-h4, bullet, number, todo, toggle, callout, quote) is executed, THE Execute_Function SHALL call onPatch with a block object containing the correct type, preserved block id, preserved parentId, and preserved content array
2. WHEN the "toggle" command is executed, THE Execute_Function SHALL produce a block with type "toggle" that supports nested children in its content array
3. WHEN the "todo" command is executed, THE Execute_Function SHALL produce a block with type "todo" and a checked property set to false
4. WHEN the "callout" command is executed, THE Execute_Function SHALL produce a block with type "callout" and a default icon property
5. WHEN the "divider" command is executed, THE Execute_Function SHALL call onDelete to remove the current block and then call onAdd with type "divider" and empty text
6. WHEN the "simple-table" command is executed, THE Execute_Function SHALL produce a block with type "table" and a table property containing a default 3-column, 2-row grid
7. WHEN a column layout command (2-columns through 5-columns) is executed, THE Execute_Function SHALL call onDelete then onAdd with the column type and empty text
8. WHEN the "page" command is executed, THE Execute_Function SHALL call onCreateSubpage with the current block id and text, then call onNavigate with the returned page id
9. WHEN the "link-to-page" command is executed, THE Execute_Function SHALL produce a block with type "link-to-page", a null targetPageId, and isLinkShortcut set to true

### Requirement 5: Command Execute Function Correctness — Media Commands

**User Story:** As a user, I want media commands to create properly initialized blocks with empty URL placeholders, so that upload or URL-entry UI is triggered after block creation.

#### Acceptance Criteria

1. WHEN the "image" command is executed, THE Execute_Function SHALL produce a block with type "image" and text set to empty string
2. WHEN the "video" command is executed, THE Execute_Function SHALL produce a block with type "video" and text set to empty string
3. WHEN the "audio" command is executed, THE Execute_Function SHALL produce a block with type "audio" and text set to empty string
4. WHEN the "file" command is executed, THE Execute_Function SHALL produce a block with type "file" and text set to empty string
5. WHEN the "bookmark" command is executed, THE Execute_Function SHALL produce a block with type "bookmark" and text set to empty string
6. WHEN the "code" command is executed, THE Execute_Function SHALL produce a block with type "code" and preserve any existing text content

### Requirement 6: Command Execute Function Correctness — Database Commands

**User Story:** As a user, I want database commands to produce fully initialized database blocks with the correct view configuration, so that they render immediately with the selected view type.

#### Acceptance Criteria

1. WHEN a database view command (table-view, board-view, gallery-view, list-view, calendar-view, timeline-view, dashboard-view, map-view) is executed, THE Execute_Function SHALL call onPatch with a block containing a database property with the view field set to the selected view type
2. WHEN the "database-inline" command is executed, THE Execute_Function SHALL produce a block with type "database-inline" that renders within the current page
3. WHEN the "database-full" command is executed, THE Execute_Function SHALL produce a block with type "database-full" that opens as a full-page database
4. WHEN the "form" command is executed, THE Execute_Function SHALL produce a block with type "form" and a formConfig property containing at least one default field

### Requirement 7: Command Execute Function Correctness — Advanced Blocks

**User Story:** As a user, I want advanced block commands to produce correctly structured blocks with all required properties, so that features like synced blocks, tabs, and table-of-contents work immediately after creation.

#### Acceptance Criteria

1. WHEN the "table-of-contents" command is executed, THE Execute_Function SHALL call onDelete then onAdd with type "table-of-contents" and empty text
2. WHEN the "synced-block" command is executed, THE Execute_Function SHALL produce a block with type "synced-block" and a unique syncedGroupId
3. WHEN the "tabs" command is executed, THE Execute_Function SHALL produce a block with type "tabs" and a tabs property containing at least two default tab objects
4. WHEN the "button" command is executed, THE Execute_Function SHALL produce a block with type "button" and a templateBlocks property
5. WHEN the "breadcrumb" command is executed, THE Execute_Function SHALL produce a block with type "breadcrumb"
6. WHEN toggle heading commands (toggle-h1, toggle-h2, toggle-h3) are executed, THE Execute_Function SHALL produce blocks with the corresponding toggle heading type that support nested children
7. WHEN the "mermaid" command is executed, THE Execute_Function SHALL produce a block with type "mermaid" that accepts Mermaid diagram syntax
8. WHEN the "block-equation" command is executed, THE Execute_Function SHALL produce a block with type "block-equation" that accepts LaTeX syntax

### Requirement 8: Command Execute Function Correctness — Page Actions

**User Story:** As a user, I want page action commands to perform their intended operations reliably, so that page-level operations like duplicate, move, trash, export, and import work from the slash menu.

#### Acceptance Criteria

1. WHEN the "copy-link" command is executed, THE Execute_Function SHALL copy the current page URL to the clipboard and display a toast notification
2. WHEN the "copy-contents" command is executed, THE Execute_Function SHALL copy all block text content from the current page to the clipboard
3. WHEN the "duplicate" command is executed, THE Execute_Function SHALL call onDuplicatePage to create a copy of the current page
4. WHEN the "move-to" command is executed, THE Execute_Function SHALL trigger a page-move dialog or picker allowing the user to select a destination
5. WHEN the "trash" command is executed, THE Execute_Function SHALL call onTrash with the current page id to soft-delete the page
6. WHEN the "import" command is executed, THE Execute_Function SHALL call onImport to open the import dialog
7. WHEN the "export" command is executed, THE Execute_Function SHALL call onExport to open the export dialog
8. WHEN the "lock" command is executed, THE Execute_Function SHALL toggle the page isLocked property via onPagePatch
9. WHEN the "full-width" command is executed, THE Execute_Function SHALL toggle the page fullWidth property via onPagePatch
10. WHEN the "small-text" command is executed, THE Execute_Function SHALL toggle the page smallText property via onPagePatch

### Requirement 9: Command Execute Function Correctness — Inline Commands

**User Story:** As a user, I want inline commands (mentions, emoji, date) to insert the correct inline element or open the appropriate picker UI.

#### Acceptance Criteria

1. WHEN the "mention-page" command is executed, THE Execute_Function SHALL produce a mention block with isInlineMention set to true and a null mentionPageId ready for page selection
2. WHEN the "mention-person" command is executed, THE Execute_Function SHALL produce a mention block with isInlineMention set to true ready for person selection
3. WHEN the "emoji" command is executed, THE Execute_Function SHALL open an emoji picker or insert an emoji placeholder that triggers the picker
4. WHEN the "date-reminder" command is executed, THE Execute_Function SHALL open a date picker or insert a date placeholder that triggers the picker
5. WHEN the "inline-equation" command is executed, THE Execute_Function SHALL produce an inline-equation block that accepts LaTeX input

### Requirement 10: Command Discoverability and Search

**User Story:** As a user, I want to find any command quickly by typing keywords, aliases, or partial names in the slash menu, so that I do not need to scroll through categories.

#### Acceptance Criteria

1. THE Slash_Menu SHALL display all registered commands grouped by category when opened with no query
2. WHEN a user types a search query, THE Slash_Menu SHALL filter commands by matching against title, aliases, and description fields (case-insensitive)
3. THE Slash_Menu SHALL prioritize commands whose title starts with the query over commands matched only by alias or description
4. THE CommandRegistry SHALL assign each command exactly one category from: "Basic blocks", "Media", "Database", "Advanced blocks", "Layout", "Inline", "Embeds", "Page actions"
5. THE CommandRegistry SHALL assign each command a unique id, a non-empty title, and at least one alias for discoverability

### Requirement 11: Command Registration Completeness

**User Story:** As a developer, I want all commands present in BlockRegistry to also be registered in CommandRegistry with working execute functions, so that no block type is unreachable from the slash menu.

#### Acceptance Criteria

1. FOR ALL block types defined in BlockRegistry, THE CommandRegistry SHALL have a corresponding registered command with a matching id or equivalent mapping
2. THE CommandRegistry SHALL register each command with all required fields: id, title, icon, category, description, and execute function
3. IF a command in CommandRegistry references a block type, THEN THE BlockRegistry SHALL contain a matching entry to ensure the block can be rendered
4. THE CommandRegistry SHALL contain no commands with no-op or placeholder execute functions that fail to produce the intended result

