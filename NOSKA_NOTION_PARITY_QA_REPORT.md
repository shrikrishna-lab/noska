# Noska Notes <-> Notion Parity QA Report

Run date: 2026-06-29  
Mode: Mode B, spec-only comparison, plus live Noska browser checks  
Environment: Noska dev app at `http://127.0.0.1:5173/#page/246f7c36-a264-49e3-bd4f-3b842999293a`  
Notion baseline: Not available in this run  
Canonical spec docs: Not present as standalone files in this workspace; expectations are taken from the attached parity matrix and its spec references.

## Summary Dashboard

| Domain | Total | Match | Partial | Mismatch | Not yet implemented | Blocked |
|---|---:|---:|---:|---:|---:|---:|
| A. Core Editor & Page Tree | 19 | 1 | 5 | 7 | 3 | 3 |
| B. Page Menu & Slash Command Palette | 5 | 1 | 4 | 0 | 0 | 0 |
| C. Databases & Page Types | 15 | 1 | 4 | 1 | 9 | 0 |
| D. Marketplace, Templates & Agents | 10 | 0 | 3 | 3 | 4 | 0 |
| E. Comments, Version History, Sharing, Import/Export, Search | 14 | 0 | 5 | 3 | 6 | 0 |
| **Total** | **63** | **3** | **21** | **14** | **22** | **3** |

Severity histogram for Partial/Mismatch rows:

| Severity | Count |
|---|---:|
| Blocker | 1 |
| Major | 28 |
| Minor | 6 |

Evidence summary:

- Live DOM: Noska loaded on the Course Schedule page, page menu opened, slash palette opened, Marketplace navigation became active.
- Build check: `npm.cmd run build` passed. Direct `npm run build` was blocked by PowerShell script policy.
- Test harness check: `node test-ui.mjs` could not run because `playwright` is not installed in this project.
- Code evidence: source inspection covered `src/App.jsx`, `src/components/PageTree.jsx`, `src/components/Editor.jsx`, `src/components/DatabaseBlock.jsx`, `src/components/editor/*`, `src/features/marketplace/*`, `src/features/creator/*`, `src/features/agents/*`, `src/components/Modals.jsx`, and `src/components/CommandPalette.jsx`.

## Full Result Log

Each row uses the requested test-case template fields in condensed form: spec reference, preconditions, steps, expected, actual Noska, result, and notes.

| ID | Spec reference | Preconditions | Steps | Expected | Actual - Noska | Result | Notes |
|---|---|---|---|---|---|---|---|
| A1 | Core Editor section 6 | Editable page with a block | Use block menu Turn into | Only `type` changes; text/children survive | Text is preserved via `blockFor(payload, block.text)` and original id, but true nested children are not modeled consistently | Partial | `src/components/Editor.jsx:762`; `src/utils/blockModel.js:271` |
| A2 | Core Editor section 3.1 | Sidebar page row with hover plus | Add page inside a page | New page is last child, sidebar expands, page opens with title focused | `addPageInside` appends id to parent `content`, expands, opens, focuses rename | Partial | Implementation exists, but live sidebar showed Private Documents empty and full hover-flow was not exercised |
| A3 | Core Editor section 3.2 | Bottom New Page button | Click New Creation and do not pick destination | Destination picker appears; unpicked page commits to Private/top-level | `openNewPage` creates top-level page immediately, then opens overlay | Mismatch | Major: commit timing differs from Notion |
| A4 | Core Editor section 3.3 | Cursor mid-content | Type `/page` and create page | True child page inserted at exact cursor position in parent order | Slash creates a block after the current block; no page entity/content insertion path was found | Mismatch | Major: page tree mechanics differ |
| A5 | Core Editor section 3.4 | Editable text line | Type `+text` shorthand | Inline-rendered true subpage with sidebar parent | No `+text` shorthand path found | Not yet implemented | Backlog item |
| A6 | Core Editor section 3.5 | Existing page plus link/mention/page blocks | Create Link to Page, @mention, and true Page block | Three distinct representations; deleting shortcut never affects source page | Registry advertises these, but `mention-page` falls back to generic paragraph and distinct sidebar semantics are absent | Mismatch | Major |
| A7 | Core Editor section 4 | Sidebar pages | Drag onto, between, and to root | Onto nests; between reorders only; root un-nests | Drag updates `parentId`/`sortOrder`, but renderer uses parent `content` arrays that are not updated | Mismatch | Major; likely tree/render divergence |
| A8 | Core Editor section 4 | Sidebar drag | Alt/Option-drag | Duplicate instead of move | No Alt-drag duplicate handling found | Not yet implemented | Backlog item |
| A9 | Core Editor section 4 | Shared/teamspace page with other access | Move into Private | Others lose access immediately | Permission environment and real collaborators unavailable | Blocked | Needs multi-user sharing setup |
| A10 | Core Editor section 4 | Page with subtree | Trash, restore, purge | Entire subtree soft-deletes/restores; purge after configured window | `updatePage` trashes only the target page; no subtree traversal/purge window in active app flow | Mismatch | Blocker: subtree integrity/data-loss risk |
| A11 | Core Editor section 5 | Multiple sibling blocks | Press Tab on non-first block | Block becomes last child of sibling above; first block cannot indent | Tab increments numeric `indent` only | Mismatch | Major |
| A12 | Core Editor section 5 | Indented block | Press Shift+Tab | Block becomes sibling immediately after former parent | Shift+Tab decrements numeric `indent` only | Mismatch | Major |
| A13 | Core Editor section 5 | Parent block selected | Move/delete/duplicate/recolor parent | Action cascades to subtree | No subtree selection/action model found | Not yet implemented | Backlog item |
| A14 | Core Editor section 5 | Editable page | Try markdown shortcuts | Full shortcut table auto-formats live | Import/paste parser supports a subset; live auto-format is limited; inline bold renders | Partial | Minor |
| A15 | Core Editor section 8 | Two synced instances | Edit one instance; view source | All update live; source jump works | `syncedGroupId` propagation exists; no source jump found | Partial | Major |
| A16 | Core Editor section 9 | Template button block | Click repeatedly | Inserts fresh copies, not live references | Template button clones `templateBlocks` with fresh ids | Match | `src/components/Editor.jsx:1069` |
| A17 | Core Editor section 10 | Two simultaneous sessions | Edit same/different blocks | Different blocks do not conflict; same block merges without data loss | Not exercised; no CRDT/merge engine found in source | Blocked | Needs two live sessions |
| A18 | Core Editor section 10 | Two collaborators | Move cursor/select text | Presence cursor/selection visible live | Local UI showed `1 online`; no second collaborator available | Blocked | Needs second session |
| A19 | Core Editor section 11 | Parent permission chain with override | Resolve permission and inspect indicator | Permission walks parent chain independent of render tree; divergence indicator appears | Simple parent-chain permission exists; no divergence indicator found | Partial | Major |
| B1 | Page Menu section 1 | Open page menu | Inspect and try each item | Full menu item list present and each item functional | Live DOM showed full top-level list; many actions only close menu or toast | Partial | Major |
| B2 | Page Menu section 2 | Open block context menu | Inspect block actions | Turn into, Color, Copy link, Duplicate, Move to, Delete, Suggest edits, Ask AI | Menu contains these plus extras; some actions are shallow or stubbed | Partial | Major |
| B3 | Slash section 4 | Type `/` in editor | Inspect categories and items | Suggested, Basic, Media, Database, Advanced, Inline, Embeds with full item list | Live DOM and registry show categories, but many item types fall back to paragraph/default block behavior | Partial | Major |
| B4 | Slash section 4 | Slash palette open | Fuzzy search uncommon item | Filters across all categories | Source filters every category in `CATEGORIES_ORDER` | Match | `src/components/editor/SlashCommandMenu.jsx:32` |
| B5 | Core Editor section 5 | Keyboard focused in app | Spot-check shortcut table | Published Notion shortcut table works | Help lists some shortcuts and app handles a subset only | Partial | Minor |
| C1 | Databases section 1.2 | Database block | Create/edit every property type; relation reciprocal | All property types and two-way Relation sync | Database only supports simple properties and rows; no Relation engine found | Not yet implemented | Backlog item |
| C2 | Databases section 1.2 | Relation exists | Create Rollup and test calculations | Rollup requires Relation; calculations compute | No Rollup type/engine found | Not yet implemented | Backlog item |
| C3 | Databases section 1.2 | Database properties | Create Formula using `prop()`, `let`, `lets` | Formula evaluates and flags errors | No Formula type/parser found | Not yet implemented | Backlog item |
| C4 | Databases section 1.3 | Database with multiple views | Change filter/sort/group per view | Each view keeps independent settings | Single `db.filter`, `db.sort`, `db.view` are shared globally | Mismatch | Major |
| C5 | Databases section 1.3 | Database rows | Nested AND/OR filters | Correct boolean evaluation | No nested filter model found | Not yet implemented | Backlog item |
| C6 | Databases section 1.4 | Database template | Set default scope and schedule repeat | Default scopes and scheduled rows work | No database template/default/repeat engine found | Not yet implemented | Backlog item |
| C7 | Databases section 1.4 | Existing rows from template | Edit template | Existing rows do not retroactively change | No database template engine found | Not yet implemented | Backlog item |
| C8 | Databases section 1.6 | Linked DB view | Edit row from linked view | Real row updates everywhere | Slash advertises linked view, but no linked-view data-source engine found | Not yet implemented | Backlog item |
| C9 | Databases section 1.7 | Database and workspace search | Search row body/title/property/content | DB search excludes row body; workspace search differs per spec | DB search scans row values; workspace search scans title plus `plainText(page)` | Partial | Major |
| C10 | Page Types section 2.3 | Page and database | Turn page/database into wiki | Page gets wiki properties/views; database blocked | Menu item exists, but no wiki conversion handler found | Not yet implemented | Backlog item |
| C11 | Page Types section 2.4 | Slash palette | Create `/form`; submit | New DB with Form + Responses; submissions only create rows | Form template creates a page with text plus a Responses DB, not a real form/submission engine | Partial | Major |
| C12 | Page Types section 2.4 | Form page | Anonymous toggle and conditional logic | Respondent capture suppressed; conditions hide/show questions | No form response/conditional logic found | Not yet implemented | Backlog item |
| C13 | Page Features section 3.1 | Page icon control | Shuffle/emoji/icon/upload/library | All icon flows work and reusable workspace emoji library updates | Icon button cycles emoji only | Partial | Minor |
| C14 | Page Features section 3.2 | Page cover control | Gallery/upload/URL/reposition | All cover sources work; drag crop persists | Add cover cycles from local covers only | Partial | Minor |
| C15 | Page Features section 3.3 | Empty title page | Observe sidebar/breadcrumb/mentions | `Untitled` renders consistently | Title input placeholder and sidebar fallback use `Untitled` | Match | Mentions not fully exercised |
| D1 | Marketplace section 2.1 | Creator publish form | Publish template with external link | Submission blocked | UI warns, but `handleSubmit` publishes draft without validation | Mismatch | Major |
| D2 | Marketplace section 1.3 | Free/paid templates | Add/free and Buy/paid | Free Add; paid Buy flows to destination picker, stop before payment | Paid Buy opens additions view and immediately duplicates template; no payment/destination picker | Mismatch | Major |
| D3 | Marketplace sections 1.4/1.5 | Added template | Inspect Added page; request refund | Lists template/added-by/price/date; refund removes copies/edits | Additions list title/price/date/status only; no refund behavior | Partial | Major |
| D4 | Marketplace section 2.2 | Creator profile | Edit/view profile | Creator profile distinct from account profile | Separate Creator Profile UI exists, but appears local/UI-only | Partial | Minor |
| D5 | Agents section 3.1 | Personal Agent | Save instructions; enable Plan mode | Instructions persist; Plan mode previews diff before execution | Instructions are component state; Plan mode displays explanatory text only | Partial | Major |
| D6 | Agents section 3.3 | Custom Agent | Configure trigger and cadence | Fires only on configured condition/cadence | Builder stores triggers; no trigger execution engine found | Not yet implemented | Backlog item |
| D7 | Agents section 3.3 | Agent with view-only grant | Attempt write | Write denied per resource | Access grants stored in UI only; no enforcement path found | Not yet implemented | Backlog item |
| D8 | Agents section 3.2 | Duplicate agent with inaccessible resources | Duplicate | Inaccessible resources/triggers dropped | Duplicate shallow-copies agent object and keeps grants/triggers | Mismatch | Major |
| D9 | Agents section 3.5 | Agent with credit cap | Hit cap | Agent auto-pauses and notifies creator | Credit cap fields exist; no run/cap enforcement found | Not yet implemented | Backlog item |
| D10 | Agents section 3.5 | Admin disables agent | Trigger would fire | Disabled agent stops next trigger | No admin disable/execution engine found | Not yet implemented | Backlog item |
| E1 | Comments sections 4.1-4.2 | Page/block comments | Add comments; move/delete block | Anchors survive move, not delete | Co-thinking sim shows comments, but no durable anchored comment model found | Partial | Major |
| E2 | Comments section 4.3 | Two users | @mention in comment | Inbox badge and deep link to exact comment | No real comment mention/inbox routing found | Not yet implemented | Backlog item |
| E3 | Comments section 4.3 | Comment thread | Resolve/reopen | Resolved comments filterable, not deleted | No durable resolved comment model found | Not yet implemented | Backlog item |
| E4 | Version History section 5 | Page/database with edits | Inspect diff; restore database | Chronological revisions/comments, diff, database restore rules | Lineage/audit exist, but no true version diff/restore engine | Mismatch | Major |
| E5 | Version History section 5 | Old page version | Copy blocks from old version | Selective restore works | No old-version block browsing found | Not yet implemented | Backlog item |
| E6 | Sharing section 6.1 | Shared page | Test View/Comment/Edit content/Edit/Full | Tiers enforce correctly | Share UI has roles; active permission model is mainly view/edit | Partial | Major |
| E7 | Sharing section 6.2 | Share modal | Toggle link vs publish | Link access distinct from full Sites publish | Share modal has separate share/publish tabs | Partial | Minor |
| E8 | Sharing section 6.3 | Published page | Slug/search/duplicate/embed/admin options | Full Sites behavior works | Publish UI exists; slug uniqueness/indexing/embed/template clone not found | Partial | Major |
| E9 | Sharing section 6.3 | Admin publishing disabled | Visit live published page | All live pages taken down | No admin kill-switch found | Not yet implemented | Backlog item |
| E10 | Import section 7.1 | Import formats | Import CSV/DOCX/MD/HTML/XLSX/ZIP/app formats | Structure preserved; losses flagged | Import paths are mock/limited; no fidelity warnings found | Mismatch | Major |
| E11 | Export section 7.2 | Non-DB page and DB | Export Markdown/CSV round-trip | Markdown plus DB CSV/row markdown; callouts degrade as documented | Export panel exists for page formats; DB has copy CSV only | Partial | Major |
| E12 | Search section 8.1 | Workspace data | Ctrl+K/P, exact phrase, `in:` | Best Matches, quoting, `in:`, recents, exclusions | CommandPalette search is local substring over titles/plain text/commands; no operators/ranking model | Mismatch | Major |
| E13 | Search section 8.2 | Parent with subpage | In-page find | Does not descend into subpages | No in-page find implementation found | Not yet implemented | Backlog item |
| E14 | Verification section 9 | Verified content | Expire verification | Re-verify notification; search boost | No verification feature found | Not yet implemented | Backlog item |

## Bug Table

Sorted by severity. Partial rows are included when they represent user-visible parity gaps rather than pure backlog.

| ID | Domain | Test Case ID | Spec Ref | Steps Summary | Expected | Actual (Noska) | Severity | Evidence |
|---|---|---|---|---|---|---|---|---|
| BUG-001 | A. Tree | A10 | Core Editor section 4 | Trash page with subtree | Whole subtree soft-deletes/restores and purges after window | Only target page is patched trashed; no subtree/purge flow | Blocker | `src/App.jsx:674` |
| BUG-002 | A. Tree | A4 | Core Editor section 3.3 | Create `/page` mid-content | True child page inserted at cursor position | Creates block-level item; no page entity insertion | Major | `src/App.jsx:1217`; live slash DOM |
| BUG-003 | A. Tree | A7 | Core Editor section 4 | Drag sidebar page | Onto/between/root semantics with coherent tree state | `parentId`/`sortOrder` updated but `content` arrays drive render | Major | `src/components/PageTree.jsx:286` |
| BUG-004 | A. Tree | A11 | Core Editor section 5 | Press Tab | Child of sibling above | Numeric indent only | Major | `src/components/Editor.jsx:467` |
| BUG-005 | A. Tree | A12 | Core Editor section 5 | Press Shift+Tab | Sibling after former parent | Numeric indent only | Major | `src/components/Editor.jsx:467` |
| BUG-006 | A. Tree | A3 | Core Editor section 3.2 | Open bottom New Page | Destination picker before commit | Page commits immediately before overlay | Major | `src/App.jsx:890` |
| BUG-007 | A. Tree | A6 | Core Editor section 3.5 | Compare page link/mention/page | Three distinct entities and sidebar behavior | Registry labels exist; distinct semantics incomplete | Major | `src/registry/BlockRegistry.jsx:122`; `src/utils/helpers.js:98` |
| BUG-008 | A. Tree | A19 | Core Editor section 11 | Override permission under inherited page | Show divergence indicator | Simple inherited permission only, no indicator | Major | `src/utils/blockModel.js:260` |
| BUG-009 | B. Menus | B1 | Page Menu section 1 | Use every page menu item | Every item functional | Live menu labels present; many are stubs/no-ops | Major | live DOM; `src/components/editor/PageOptionsMenu.jsx:72` |
| BUG-010 | B. Menus | B2 | Page Menu section 2 | Use every block menu item | Every action functional | Menu present, but actions are partial/stubbed | Major | `src/components/editor/BlockContextMenu.jsx:59` |
| BUG-011 | B. Slash | B3 | Slash section 4 | Create advertised slash items | Items create correct block engines | Many registry types fall back to paragraph/default | Major | live DOM; `src/utils/helpers.js:98` |
| BUG-012 | C. Databases | C4 | Databases section 1.3 | Change view-specific filters/sorts | Per-view independent state | Single global db filter/sort/view | Major | `src/components/DatabaseBlock.jsx:34` |
| BUG-013 | C. Search | C9 | Databases section 1.7 | Search database/workspace | DB search limited; workspace behavior per spec | Simple row value scan and workspace plain-text search | Major | `src/components/DatabaseBlock.jsx:34`; `src/components/CommandPalette.jsx:101` |
| BUG-014 | C. Forms | C11 | Page Types section 2.4 | Create `/form` | Real form DB with submissions | Creates page plus Responses DB, no submission engine | Major | `src/App.jsx:779` |
| BUG-015 | D. Marketplace | D1 | Marketplace section 2.1 | Publish template with external links | Block submission | Warning only; draft is created | Major | `src/features/creator/CreatorDashboard.jsx:74` |
| BUG-016 | D. Marketplace | D2 | Marketplace section 1.3 | Paid Buy flow | Stop before payment, destination picker | Paid Buy immediately adds template | Major | `src/features/marketplace/MarketplacePage.jsx:46` |
| BUG-017 | D. Marketplace | D3 | Marketplace sections 1.4/1.5 | Manage/refund added template | Full added metadata and refund cleanup | Partial list; no refund | Major | `src/features/marketplace/MarketplacePage.jsx:225` |
| BUG-018 | D. Agents | D5 | Agents section 3.1 | Plan mode | Diff/preview before execution | Text notice only | Major | `src/features/agents/AgentWorkspace.jsx:115` |
| BUG-019 | D. Agents | D8 | Agents section 3.2 | Duplicate agent | Drop inaccessible grants/triggers | Shallow copy keeps everything | Major | `src/features/agents/AgentWorkspace.jsx:37` |
| BUG-020 | E. Comments | E1 | Comments sections 4.1-4.2 | Add/move/delete comments | Durable anchors | Simulation only/no durable anchor model | Major | `src/features/collab/CoThinking.jsx` |
| BUG-021 | E. Versions | E4 | Version History section 5 | View diff/restore | True version diff and restore | Lineage/audit only | Major | `src/features/lineage/NoteLineage.jsx`; `src/lib/auditEngine.js` |
| BUG-022 | E. Sharing | E6 | Sharing section 6.1 | Enforce all tiers | View/comment/edit-content/edit/full | Simple role UI and view/edit permission | Major | `src/components/Modals.jsx:1097`; `src/utils/blockModel.js:260` |
| BUG-023 | E. Sites | E8 | Sharing section 6.3 | Publish with slug/index/embed/template clone | Full Sites behavior | Publish UI lacks these enforcement surfaces | Major | `src/components/Modals.jsx:1281` |
| BUG-024 | E. Import | E10 | Import section 7.1 | Import all formats | Fidelity-preserving import with warnings | Mock/limited import; no loss flags | Major | `src/components/WorkspaceViews.jsx:1279`; `src/components/Modals.jsx:494` |
| BUG-025 | E. Export | E11 | Export section 7.2 | Round-trip page and DB | Markdown plus DB CSV/row markdown behavior | Page export partial; DB CSV copy only | Major | `src/features/export/ExportPanel.jsx`; `src/components/DatabaseBlock.jsx:281` |
| BUG-026 | E. Search | E12 | Search section 8.1 | Quick Find operators/ranking | Best Matches, quotes, `in:`, exclusions | Local substring search only | Major | `src/components/CommandPalette.jsx:101` |
| BUG-027 | A. Editor | A14 | Core Editor section 5 | Markdown shortcuts | Full live shortcut table | Parser/rendering subset | Minor | `src/utils/helpers.js:147` |
| BUG-028 | C. Page icon | C13 | Page Features section 3.1 | Shuffle/upload/library | Full icon system | Emoji cycle only | Minor | live DOM; `src/components/Editor.jsx` |
| BUG-029 | C. Page cover | C14 | Page Features section 3.2 | Upload/URL/reposition | Full cover system | Cover cycle only | Minor | live DOM; `src/components/Editor.jsx` |
| BUG-030 | D. Profile | D4 | Marketplace section 2.2 | Creator profile | Durable public identity | Separate UI, local-only evidence | Minor | `src/features/creator/CreatorDashboard.jsx:198` |
| BUG-031 | E. Link/publish | E7 | Sharing section 6.2 | Distinct toggles | Link access distinct from publish | UI tabs exist; enforcement not verified | Minor | `src/components/Modals.jsx:1178` |
| BUG-032 | B. Shortcuts | B5 | Core Editor section 5 | Shortcut table | Full shortcut coverage | Subset only | Minor | `src/components/Modals.jsx:1320`; `src/App.jsx` |

## Not-Yet-Implemented List

| Test Case ID | Backlog Item |
|---|---|
| A5 | `+text` inline shorthand that creates a true subpage |
| A8 | Alt/Option-drag sidebar duplicate |
| A13 | Subtree selection/action cascade |
| C1 | Full database property type engine, including two-way Relation |
| C2 | Rollups and calculations |
| C3 | Formula parser/type checker |
| C5 | Nested AND/OR filter groups |
| C6 | Database templates with default scope and repeating schedules |
| C7 | Database template immutability for existing rows |
| C8 | Linked database views backed by a real data source |
| C10 | Wiki conversion properties/views and database-block guard |
| C12 | Real forms with anonymous toggle and conditional logic |
| D6 | Agent trigger execution engine |
| D7 | Agent per-resource access enforcement |
| D9 | Agent credit cap enforcement and notification |
| D10 | Admin disable/kill-switch for agents |
| E2 | Comment @mention inbox badges and deep links |
| E3 | Resolve/reopen durable comments |
| E5 | Selective restore from old versions |
| E9 | Admin publishing kill-switch |
| E13 | In-page find scoped to current page only |
| E14 | Verification expiry notifications and search boosting |

## Blocked List

| Test Case ID | Why Blocked | Needed To Unblock |
|---|---|---|
| A9 | Requires a shared/teamspace page with another user's access and a Private move target | Disposable multi-user workspace or seeded sharing test fixture |
| A17 | Requires two simultaneous edit sessions on the same page | Two browser sessions/accounts and deterministic conflict test data |
| A18 | Requires a second collaborator session | Second authenticated session or local collaboration harness |

## Regression Cadence Recommendation

Before release candidates, rerun at least these high-risk rows: A3, A4, A7, A10, A11, A12, B1, B3, C4, D1, D2, D8, E4, E10, and E12. Treat any previously passing row that regresses as Blocker per the supplied rubric.
