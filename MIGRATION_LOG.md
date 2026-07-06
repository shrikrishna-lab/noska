# TypeScript Migration Log

Append-only log of fixes, retries, security checks, and heartbeats for the
`chore/typescript-migration` branch. Do not edit or remove prior entries.

---

## Phase 0 — Tooling setup
- Installed `typescript@5.7.3`, `@types/react@18.3.18`, `@types/react-dom@18.3.5`, `@types/node@22.13.0`.
- Created `tsconfig.json` (`strict: false`, `allowJs: true`, `@/*` path alias mirroring `vite.config.js`).
- Committed as `dfcd0e8` — "chore(ts): set up TypeScript tooling (tsconfig, type deps)".

## Phase 1 — Supabase schema types
- CLI `supabase link`/`projects list` failed (authenticated CLI account lacked
  privileges for the real project ref in `.env`). Retried via Supabase MCP
  tools instead (`mcp_supabase_list_tables`, `mcp_supabase_generate_typescript_types`),
  which connected successfully. This is a genuinely different approach, not a
  repeat of the same failed method.
- Confirmed all 18 tables present in generated `types/supabase.ts`.
- Verified with `tsc --noEmit` (clean).

## Phase 2A — Manual enum/Block types
- Created `types/enums.ts` with 13 string-literal unions, each backed by a
  comment citing the exact call site(s) the literal values were grepped from.
- Created `types/blocks.ts` — `Block` union based on the real runtime shape in
  `src/utils/helpers.js` (not the aspirational shape in `blockModel.js`, which
  is a known, accepted discrepancy — see final report / open product question).

## Phase 2B — Data layer conversion
Converted to `.ts`: `src/lib/supabase.ts`, `src/lib/supabaseService.ts`,
`src/lib/realtimeCollab.ts`, `src/lib/auditEngine.ts`, `src/hooks/usePresence.ts`.
Added `src/vite-env.d.ts` for `import.meta.env` typing.

### Pre-commit review fix 1 — `AgentRunStatus` premature closed union
- **Issue**: `types/enums.ts` originally defined `AgentRunStatus = "running"`
  as a single-value closed union. `agent_run_logs` has `finished_at` and
  `credits_used` columns implying a real multi-state lifecycle
  (running/completed/failed/etc.), but only `"running"` was ever observed
  being assigned in current code.
- **Fix**: Changed `AgentRunStatus` to `string`, with a comment documenting
  that evidence is incomplete and locking it to one observed value would
  misrepresent it as a closed enum. This matches the intent of Global Rule
  ("apply enums based on real usage, not guesses") — a single-observation
  union is itself a guess about the closed set of states.

### Pre-commit review fix 2 — undocumented `as never` casts (Global Rule #5)
- **Issue**: Found 8 total `as never` cast sites across the data layer with
  no inline justification comment:
  - `src/lib/supabaseService.ts`: `saveAIMemoryEntry` (1), `saveAIMemory` (1),
    `mapPageToDb` — `tags`/`blocks`/`lineage` (3)
  - `src/lib/auditEngine.ts`: `log()` — `content_before`/`content_after`/`ai_tool_calls` (3)
  - `as never` is a red-flag pattern (it can mask real type mismatches rather
    than express a deliberate boundary), and none of these had inline
    documentation.
- **Fix**: Replaced all 8 with `as unknown as Json` (the already-documented
  pattern used for `ai_chats.messages`/`ai_chats.collaborators` in the same
  file), each with a one-line comment explaining why the column's real shape
  can't be derived more precisely (Json columns carrying either arbitrary
  caller-supplied data or app-side types that are structurally narrower than
  `Json` allows).
- No logic changed — these are all serialization boundary casts between
  app-facing types and the Json-typed DB columns; behavior at runtime is
  identical to before.

### Security check — Phase 2B
- Grepped `src/lib/*.ts`, `src/hooks/*.ts` for hardcoded credentials/keys/tokens:
  none found. Supabase URL/anon key are read from `import.meta.env` only, no
  hardcoded fallback (by design — flagged in `supabase.ts` comment).
- Confirmed no RLS/permission/auth logic was dropped or weakened:
  `requireOwner()` guard, `mapPageToDb`/`mapPageFromDb`, and `auditEngine`'s
  `page_permissions`-role defaults are unchanged in behavior — only added
  type annotations and cast documentation.
- Confirmed no `.git`, CI, or deploy config files were touched
  (`git status --short` shows only the 5 renamed data-layer files + new
  `types/`, `src/vite-env.d.ts`).
- Result: **PASS**.

### Verification
- `npx tsc --noEmit`: clean.
- `npm run build`: succeeded (`vite build`, exit code 0).

### Heartbeat
- Phase 2B fixes applied and verified clean. Ready to commit as
  "Convert Supabase data layer to TypeScript" on branch `chore/typescript-migration`.

### Commit
- Committed `d42e286` — "Convert Supabase data layer to TypeScript" on
  `chore/typescript-migration` (14 files changed: 5 data-layer renames,
  3 new `types/` files, `vite-env.d.ts`, this log).

---

## Phase 3 — Leaf UI components (batch)

Converted 36 presentational/leaf files to `.ts`/`.tsx`, covering three
cohesive low-risk areas: the auth screen UI (`src/components/auth/*`), a
handful of standalone `src/components/ui/*` primitives (IconButton, Toast,
FloatingMenu, Modal helpers, TextArea, PearlButton, MotionCards, the
animated icon set), and the entire onboarding flow
(`src/onboarding/**` — context, service, theme/data, steps, sidebar
preview). None of these touch RLS-sensitive tables or the data layer from
Phase 2B.

Renamed via `smart_relocate` (no import updates were needed — none of the
existing imports specify file extensions).

### Fixes made during the loop
- `src/components/ui/icons/index.tsx`: `IconWrapper`'s `hoverAnim`/`pressAnim`
  props were implicitly typed from two specific literal defaults, which
  rejected every other AnimatedX icon's differently-shaped hover animation
  object (`x`, `y`, `rotate`, array keyframes, etc.). Fixed by typing them as
  framer-motion's `TargetAndTransition` and introducing a shared
  `AnimatedIconProps` interface for all ~30 `AnimatedX` icon components.
- `src/components/ui/index.tsx`: added explicit prop interfaces for
  `IconButton`, `Toast`, `FloatingMenu` (including a `FloatingMenuAlign`
  union for `preferredAlign`), `Modal`, `ModalHeader`, `Field`, and a fully
  typed `TextArea` (was a bare `forwardRef` with untyped destructured
  params — now `forwardRef<HTMLTextAreaElement, TextAreaProps>`). Also
  generified `useOutsideDismiss<T>` so its ref type matches whatever
  element the caller attaches it to (was `HTMLElement`-only via `any`
  inference before).
- `src/onboarding/components/Buttons.tsx`: `PrimaryBtn`/`SecondaryBtn` had
  no prop types, which surfaced as "missing property" errors at every call
  site once neighboring files got stricter inference from typed imports.
  Added `PrimaryBtnProps`/`SecondaryBtnProps` with `disabled`/`fullWidth`
  correctly marked optional (not every call site passes them).
- `src/onboarding/components/LivePreviewSidebar.tsx`: `SideItem`'s `active`
  prop was required by inference but not always passed at the call site
  (only shown for the currently active page preview) — made optional and
  added an explicit `SideItemProps`/`SideSection` label type.
- Created `src/onboarding/types.ts` (`OnboardingFormData`,
  `OnboardingTeammate`, `OnboardingPagePreview`) — inferred directly from
  the reducer's `initialState` in `OnboardingContext.tsx` and the return
  shape of `previewPagesFor`/`starterPageForTemplate` in
  `onboardingService.ts`. Used this to properly type
  `OnboardingContext`'s reducer/action union (`OnboardingAction`,
  `OnboardingState`, `OnboardingContextValue`), `useOnboarding.ts`'s return
  type, and `onboardingService.ts`'s exported functions. The
  localStorage-persisted state blob itself is intentionally kept as a loose
  `Record<string, unknown>` (`PersistedOnboardingState`) since it's only
  ever JSON round-tripped, never read field-by-field, by that service — one
  documented `as unknown as Record<string, unknown>` cast at the single
  `saveOnboardingState(state)` call site bridges the typed `OnboardingState`
  to that loose persisted shape.

No `any`, `@ts-ignore`, or undocumented casts introduced — verified via
grep across all 36 files.

### Security check — Phase 3
- Grepped all new/changed files for hardcoded credentials/keys/tokens:
  none found.
- No RLS/permission/auth logic touched — these are presentational
  components and onboarding UI state only; the onboarding flow's actual
  page-creation call (`handleFinalize` in `src/App.jsx`) is untouched.
- Confirmed no `.git`, CI, or deploy config files touched — `git status
  --short` shows exactly the 36 renamed files (as `.jsx`/`.js` deletions +
  `.tsx`/`.ts` additions) plus this log.
- Result: **PASS**.

### Verification
- `npx tsc --noEmit`: clean.
- `npm run build`: succeeded (`vite build`, exit code 0).

### Heartbeat
- Phase 3 batch converted and verified clean. Ready to commit as
  "Convert leaf UI and onboarding components to TypeScript" on branch
  `chore/typescript-migration`.

### Commit
- Committed `1b01588` — "Convert leaf UI and onboarding components to
  TypeScript" on `chore/typescript-migration` (39 files changed: 36
  renames, 2 new files in `src/onboarding/hooks`/`types.ts`, this log).

---

## Phase 3 — Marketing site batch

Converted all 47 files under `src/pages/marketing/**` (Home/Product/Pricing/
Enterprise/Changelog/Resources/Solutions pages + all shared marketing motion
components + the standalone `/launch` page and its components). Fully static/
presentational, zero block or data-layer coupling. Renamed in bulk via
`git mv` (no extension-qualified imports existed, so no import fixups
needed).

- `tsc --noEmit`: clean on first pass, no fixes needed.
- `npm run build`: clean.
- Security check: no credentials, no undocumented casts, no `.git`/CI files
  touched. PASS.
- Committed as "Convert marketing site to TypeScript".

---

## Phase 3 — Remaining leaf/simple batch (features, ai, editor, core, registry, hooks, lib)

Converted 60 files via `git mv` bulk rename across `src/ai/**`, `src/core/commands/*`
(excluding `CommandRegistry.js`/`CommandRegistry.property.test.js`, which stay
`.js` — Phase 4, block-registry-coupled), `src/editor/*`, `src/features/**`
(all feature modules except the ones flagged block-coupled by the earlier
inventory), `src/hooks/*`, `src/lib/*` + tests, `src/modules/ui/*`,
`src/registry/**` (excluding `BlockRegistry.jsx` — Phase 4).

**Note on scope-mistake caught before commit**: the first bulk-rename pass
accidentally globbed `CommandRegistry.js`, `CommandRegistry.property.test.js`,
and `BlockRegistry.jsx` (all Category B / Phase 4 per the earlier inventory,
since they define/test the block-type registry). Caught immediately via
`git status --short` review before any tsc/build run, reverted with
`git mv` back to original extensions. Final diff contains none of the three.

### Fixes made during the loop
Since these files were previously `.js`/`.jsx` with `checkJs: false`, this
was the first time they were actually type-checked. tsc surfaced ~220
errors across ~25 files. All were real gaps, not migration mistakes:

- **Missing class field declarations** (TS2339 "Property does not exist"):
  `AIManager` (`config`/`_listeners`/`_initialized`/`_healthCache`/
  `_healthTimers`), `ClipboardPipeline` (`onPasteUrl`/`onRichPaste`/
  `onPlainPaste`/`onHtmlPaste`/`onCopy`), `EditorCommands` (`el`),
  `EditorHistory`/`SimpleUndoManager` (`el`/`enabled`/`stack`/`index`/etc.),
  `AudioSynth` in FocusZoom.tsx (`ctx`/`source`/`gainNode`/etc.). Fixed by
  declaring typed fields on each class rather than relying on constructor
  inference, which TS doesn't do for plain JS classes once type-checked.
- **Untyped `{}` accumulator objects** causing "Property does not exist on
  type '{}'" (TS2339) when indexed: `tagCounts` in `ContextBuilder.ts`,
  `ai/tools.ts`, `ai/userProfile.ts`, `graphLayouts.ts`'s `computeDegrees`.
  Fixed with explicit `Record<string, number>` annotations.
- **Untyped `Set`/`Map` module state** causing "not callable" (TS2349) when
  iterated: `KeyboardManager.ts`, `UndoManager.ts`, `IconRegistry.ts`'s
  `_listeners`. Fixed by typing the Set/Map generics at declaration.
- **Real bug caught by the type checker**: `EditorCommands.ts` had
  `range.commonAncestContainer` (typo — not a real DOM API; the correct
  property is `commonAncestorContainer`). This was silently returning
  `undefined` at runtime before. Fixed the typo, not just the type.
- **Real bug caught by the type checker**: `NoteLineage.tsx` had
  `new Date(a.timestamp) - new Date(b.timestamp)` in a sort comparator —
  subtracting Date objects directly relies on implicit `valueOf()`
  coercion; fixed to `.getTime() - .getTime()` for a real numeric diff
  (behavior was very likely already correct via JS coercion, but this is
  no longer implicit/accidental).
- **Duplicate object keys** (TS1117, a real correctness issue, not just a
  type gap): `IconRegistry.ts`'s `emojiDescriptions` had `⌛`/`⏳` defined
  twice with different values. JS object literals silently let the later
  key win, so the first (now-dead) pair was removed — zero behavior change,
  confirmed by keeping the second (winning) definitions intact.
- **Global `SpeechRecognition`/`webkitSpeechRecognition` typing**: not in
  lib.dom.d.ts (non-standard API). Added a minimal `SpeechRecognitionLike`
  interface + `Window` augmentation to `src/vite-env.d.ts` since the exact
  same `window.SpeechRecognition || window.webkitSpeechRecognition` pattern
  is used identically in both `MeetingWorkspace.tsx` and `VoiceCapture.tsx`
  — one shared declaration instead of duplicating a cast in each file.
- **`window.webkitAudioContext`** (Safari-only legacy prefix, also not in
  lib.dom.d.ts): narrowly cast at the two call sites in `FocusZoom.tsx`
  rather than widening `Window` globally, since this one is truly
  one-off/local instead of shared across files.
- **Dead/unused props passed but never destructured** (TS2741 "missing
  property", caught because the *caller* passes more props than the
  component destructures): `GraphControls` (`onNodeSelect`),
  `MyAdditionsView` in MarketplacePage.tsx (`pages`, `onClose`),
  `AgentBuilder`/`TabButton` in AgentWorkspace.tsx (`count`, `agents`).
  Added the missing prop names to each destructure (as unused-but-typed
  params) rather than removing them from call sites — this is a
  documentation-only fix, not a logic change, since the original runtime
  behavior already silently ignored these extra props.
- **`PagePeek` (still `.jsx`, Phase 4 scope) missing `onOpenFull` at a
  Phase-3 call site** in `StackedColumn.tsx`: rather than touching the
  untouched Phase-4 file, passed `onOpenFull={undefined}` explicitly at
  the call site to satisfy the inferred required-prop shape.
- **Test fixtures deliberately testing invalid input** (`writeGuards.test.ts`):
  the test intentionally passes bad owner values (`undefined`, `null`, `""`,
  `0`, `false`) and incomplete objects to verify `requireOwner()` rejects
  them. Added `as any` casts at each call site with an inline comment
  explaining these are deliberately-wrong fixtures under test, not silent
  type escapes.
- **Provider registry typing** (`ai/providers.ts`): added `AIProvider`/
  `AIModel`/`AIMessage`/`ProviderSendOpts` interfaces inferred from the
  provider object literals (every provider implements `send()`, most
  implement `stream()`, only `ollama`/`lmstudio` implement
  `discoverModels()`). This is what let `AIManager.ts`'s cascading
  "provider.stream doesn't exist" errors resolve automatically.
- **`AIManager.send/sendConversation/stream` params**: added `AISendOpts`/
  `AISendConversationOpts`/`AIStreamOpts` interfaces with every field
  correctly optional (call sites like `MeetingWorkspace.tsx`'s
  `generateSummary` only ever pass `{ prompt }`).
- **Shared `MemoryEntry`/`MemoryCache` types**: defined once in
  `ai/memory.ts` (the canonical owner of the AI-memory shape) and imported
  into `ai/ContextBuilder.ts` and `ai/tools.ts` rather than duplicating the
  interface three times.

No `any` used as a silent escape — every `as any`/implicit-loose spot above
is either a deliberately-invalid test fixture (documented) or a
dead/unused prop being named for documentation purposes only.

### Security check
- Grepped all 60 changed files + `vite-env.d.ts` for hardcoded
  credentials/keys/tokens: none found.
- No RLS/permission/auth logic touched — this batch is AI plumbing, editor
  command infra, graph/feature UI, and simple pickers; none of it touches
  Supabase RLS-adjacent tables directly (that's Phase 2B, already done).
- Confirmed no `.git`/CI/deploy files touched — `git status --short` shows
  exactly the 60 renamed files + `vite-env.d.ts` (SpeechRecognition types).
- Result: **PASS**.

### Verification
- `npx tsc --noEmit`: clean (after fixing ~220 real errors surfaced by
  enabling type-checking on these files for the first time).
- `npm run build`: clean (`vite build`, "✓ built").

### Commit
- Committed `a3c026c` — "Convert remaining Phase 3 leaf/simple modules to
  TypeScript" on `chore/typescript-migration` (61 files: 60 renames +
  `vite-env.d.ts` update).

---

## Phase 3 — Canvas, export, spaced repetition, comments, permissions batch

Converted 15 files: `src/features/canvas/**` (all 8 files, incl. `canvasStore.js`
→ `.ts`), `src/features/export/ExportPanel.tsx`,
`src/features/spaced/SpacedRepetition.tsx`, `src/components/comments/CommentThread.tsx`,
`src/components/permissions/PermissionPanel.tsx`, and `src/utils/{colors,pageLinks,richText,storage}.ts`.
All verified against the block-coupling inventory: these read `block.type`/
`.review`/`.blocks` only as loose serialization input (markdown/HTML export,
spaced-repetition scheduling, comment anchoring) — none dispatch through the
`Block` union or `BlockRegistry`, so they stayed in Phase 3.

### Fixes made during the loop
- **`src/utils/richText.ts`**: the biggest fix in this batch. Defined a
  `RichTextSpan` interface (text + optional bold/italic/underline/
  strikethrough/code/link/color/bgColor/highlight/tag) used consistently
  across every function in the file — `richTextToHtml`, `htmlToRichText`,
  `normalizeRichText`, `compareRichText`, `cloneRichText`,
  `plainTextToRichText`, the markdown tokenizer/parser. Also typed the
  internal `WalkState`/`WalkOptions` (DOM-walking accumulator) and
  `MarkdownToken` shapes. This was the largest single-file error count in
  the whole migration so far (~65 errors), entirely from one missing
  shared type definition cascading through every function signature.
- **`src/features/canvas/canvasStore.ts`**: added `CanvasRect`,
  `CanvasElementData`, `CanvasData`, and `Connector` interfaces (inferred
  from `makeElement`'s per-kind return shapes and `loadCanvasData`'s
  parsed-JSON shape). This is the canonical canvas data shape now imported
  by `CanvasView.tsx`/`CanvasElement.tsx`/`CanvasConnectors.tsx` instead of
  each file re-inferring loose objects.
- **`src/hooks/useCursor.ts`**: added `CursorEntry`/`CursorMap` types
  (this file was renamed in the previous batch but left loosely typed
  since nothing consumed it strictly yet — `CanvasCollabLayer.tsx` in this
  batch is the first strict consumer, which surfaced the gap).
- **`src/features/canvas/CanvasCollabLayer.tsx`**: typed `cursors` prop as
  `CursorMap`, `canvasWidth`/`canvasHeight` marked optional (call site in
  `CanvasView.tsx` only ever passes `cursors`).
- **`src/features/canvas/CanvasElement.tsx`**: `commonStyle` object needed
  an explicit `React.CSSProperties` annotation — `position: "absolute"`
  was widening to plain `string` without it, which doesn't satisfy CSS's
  `Position` union.
- **`src/features/canvas/CanvasToolbar.tsx`**: `ToolButton`'s `active`/
  `disabled` props were being read as required from inference (some call
  sites omit one or the other) — added an explicit `ToolButtonProps`
  interface with both optional.
- **`src/features/canvas/CanvasView.tsx`**: `document.activeElement` is
  typed `Element | null`, which lacks `isContentEditable` (an `HTMLElement`
  property) — narrowly cast at that one check.
- **`src/features/spaced/SpacedRepetition.tsx`**: added a `ReviewState`
  interface for the SM-2 spaced-repetition state shape (`easeFactor`/
  `interval`/`repetition`/etc.), typed as `Required<ReviewState>` on the
  `sm2()` return since every field is always populated on output even
  though input fields are optional (first-time review has no prior state).
- **`src/components/comments/CommentThread.tsx`**: `e.target.closest(...)`
  needed a cast to `HTMLElement` (same `EventTarget` gap seen in earlier
  batches).
- **`src/components/permissions/PermissionPanel.tsx`**: `newRole` state
  and `handleRoleChange`'s `role` param were inferred as plain `string`,
  which doesn't satisfy `auditEngine.setPermission`'s `PageRole` parameter
  (from `types/enums.ts`, Phase 2B). Imported `PageRole` and typed the
  state/param/`<select>` `onChange` casts against it — this is a real
  correctness improvement, since it means switching this panel's role
  values out of sync with `PageRole`'s five-value union will now be a
  compile error instead of a silent runtime string.
- **`src/utils/storage.ts`**: `window.storage` is a host-injected global
  with no declaration anywhere in the codebase (grepped — no
  `window.storage = ...` assignment exists). Cast narrowly at the one
  read site rather than adding another ambient global declaration, since
  this one is genuinely local/one-off unlike the shared `SpeechRecognition`
  case from the previous batch.

No `any` used as a silent escape; all casts above are either DOM-API type
gaps (`EventTarget`→`HTMLElement`, `Element`→`HTMLElement`) or one
documented host-global cast, consistent with prior batches.

### Security check
- Grepped all 15 changed files for hardcoded credentials/keys/tokens: none
  found.
- No RLS/permission logic weakened — `PermissionPanel.tsx`'s role typing
  change is strictly additive (compile-time enforcement of the same
  `PageRole` union `auditEngine.ts` already enforced at runtime via
  `ROLE_DEFAULTS` fallback); `auditEngine.ts` itself untouched.
- No `.git`/CI/deploy files touched — `git status --short` shows exactly
  the 15 renamed/modified files + this log.
- Result: **PASS**.

### Verification
- `npx tsc --noEmit`: clean.
- `npm run build`: clean (`vite build`, "✓ built").

### Commit
- Committed `c8208d5` — "Convert canvas, export, spaced repetition,
  comments to TypeScript" on `chore/typescript-migration` (17 files: 14
  renames, `useCursor.ts` type fix, this log).

---

## Phase 3 — Final leaf/simple batch (ai panels, collab UI, PageInspector, entry point)

Converted 16 files: `src/components/ai/*` (8 files), `src/components/collab/*`
(3 files), `src/components/PageInspector.tsx`, `src/main.tsx` (app entry
point), `src/onboarding/pages/OnboardingPage.tsx`, `src/utils/ai.ts`, and the
two test-support files `src/test/{normalizePreview.test,setup}.ts`. Also
updated `index.html` (`/src/main.jsx` → `/src/main.tsx`) since it's the one
place a bare file path is referenced outside the module graph.

### Fixes made during the loop
- **`src/main.tsx`**: imports of the marketing pages used explicit `.jsx`
  extensions pointing at files renamed to `.tsx` in an earlier batch —
  updated to extensionless imports (matching the rest of the codebase's
  convention) instead of hardcoding the new extension, so future
  renames don't re-break this file. Also added a non-null assertion on
  `document.getElementById("root")` (typed `HTMLElement | null`).
- **Date arithmetic bugs caught by the type checker** (same pattern as
  prior batches): `ChatSidebar.tsx`'s `timeGroup()` did `now - d` directly
  on two `Date` objects; `PageInspector.tsx`'s `ActivityTab` merge-sort did
  `new Date(b.timestamp) - new Date(a.timestamp)`. Both fixed to
  `.getTime() - .getTime()`.
- **Real bug fixed, not just typed**: `PageInspector.tsx`'s
  `computePageStats()` never included a `blocks` count in its return
  object, but `OverviewTab` already read `stats.blocks` in its JSX (`{stats.chars}
  chars · {stats.blocks} blocks · ...`) — this was rendering `undefined`
  at runtime. Added `blocks: blocks.length` to the returned `PageStats`
  interface, which is a genuine bug fix surfaced by strict typing, not a
  behavior change I introduced.
- **`ContextPanel.tsx` / `PageInspector.tsx`**: both had a local
  `CollapsibleSection`/`SectionHeader` component whose `icon` prop was
  inferred too loosely to accept Lucide icon components at every call
  site — typed against `LucideIcon` from `lucide-react` (consistent with
  the pattern established in earlier batches) instead of a custom
  `ComponentType<{...}>` shape.
- **`window.realtimeCollab` global**: grepped for an assignment onto
  `window` anywhere in the codebase — found none. This means every
  `window.realtimeCollab?.on?.(...)` call across the app (this file,
  `Sidebar.jsx`, `WorkspaceViews.jsx`, `Modals.jsx`, `CoThinking.jsx` — the
  latter four still `.jsx`, untouched) has always been dead code at
  runtime, silently masked by optional chaining. Declared
  `Window.realtimeCollab?: unknown` in `vite-env.d.ts` (deliberately not
  the real `RealtimeCollab` class type, to avoid a circular type
  dependency from the ambient declaration file back into the module) and
  cast narrowly at the one read site in this batch. Flagged as
  pre-existing dead code, not something to "fix" as part of a type
  migration.
- **`PageInspector.tsx`'s audit filter `<select>`**: has `create`/`restore`
  options that are not members of the real `AuditAction` union
  (`types/enums.ts`, Phase 2B — built strictly from grepped
  `auditEngine.log()` call sites). Selecting either will always return
  zero results since no code path ever logs those actions. This looks
  like a pre-existing dead-filter UI bug, not a migration-introduced
  issue — documented with an inline comment and cast the filter state
  through `as any` at the one call site rather than guessing which side
  (the UI options or the `AuditAction` union) is "wrong."

No `any` used as a silent escape — the two `as any`/`unknown` casts above
are both documented with multi-line comments explaining the specific
pre-existing gap they bridge.

### Security check
- Grepped all 16 changed files + `index.html` for hardcoded
  credentials/keys/tokens: none found (`utils/ai.ts` reads `apiKey` from
  a parameter, no hardcoded fallback).
- No RLS/permission logic touched.
- No `.git`/CI/deploy files touched — `index.html` is a build entry
  reference, not a deploy config file.
- Result: **PASS**.

### Verification
- `npx tsc --noEmit`: clean.
- `npm run build`: clean (`vite build`, "✓ built").

**This closes out Phase 3** — every remaining `.jsx`/`.js` file in `src/`
either belongs to Phase 4 (editor/block components, `BlockRegistry.jsx`,
`CommandRegistry.js`, `blockModel.js`, `helpers.js`, `pageTreeOps.js`,
`Editor.jsx`, `App.jsx`) or Category C (canvas/database-adjacent files
flagged for individual review before Phase 4 starts).

### Commit
- Committed `017b42a` — "Convert ai panels, collab UI, PageInspector, entry
  point to TypeScript" on `chore/typescript-migration` (20 files: 16
  renames, `index.html` + `vite-env.d.ts` updates, this log).
- **Phase 3 complete.**

---

## Phase 4 — Pre-work: fixing the `block.language` gap in types/blocks.ts

Before starting Phase 4 conversions, resolved the `block.language` gap
flagged at the end of Phase 3 (CodeBlock.jsx reads `block.language`, which
wasn't in any `Block` union member).

### Investigation
- Grepped every block renderer (`src/components/editor/*.jsx`,
  `src/components/*.jsx`) for `language` usage: only
  `src/components/editor/CodeBlock.jsx` reads/writes a top-level
  `block.language` (via `onPatch({ language: langId })`, a generic
  merge-patch — confirmed `onBlockPatch`/`updateBlock` in `src/App.jsx` do
  `{ ...b, ...patch }`, so any field can land on any block).
- Confirmed the field is real and intentional, not a typo: both
  `src/utils/helpers.js`'s `blockFor('code', ...)`
  (`props.language = 'plain'`) and `src/utils/blockModel.js`'s
  `BLOCK_TYPES.code` default (`props: { richText: [], language: 'plain' }`)
  set it, and `src/components/Editor.jsx`'s "turn into code" slash-command
  handler writes `language: "plain"` at the top level too.
- Confirmed scope: no other block type reads a top-level `language`
  field anywhere in the codebase — this is exclusively a `code`-block
  field, not a `BaseBlock`-wide concern.

### Fix
- Added `CodeBlockData` interface to `types/blocks.ts`
  (`type: "code"; language: string`, extending `BaseBlock`), with an
  inline comment documenting exactly where the field comes from and why
  it's scoped to `code` only. Named `CodeBlockData` rather than
  `CodeBlock` to avoid colliding with the existing
  `src/components/editor/CodeBlock.jsx` component's default export name.
- Added `CodeBlockData` to the `Block` union.
- `npx tsc --noEmit`: clean (this is a types-only file, no runtime files
  changed yet).

This was a documentation-only fix to the type definition — no `.jsx`→`.tsx`
conversion happened here. Phase 4 file-by-file conversions start next.

---

## Phase 4 — BlockRegistry.jsx + CommandRegistry.js (registry/taxonomy layer)

Converted the two registry files that define the block-type taxonomy,
lower risk than the actual block renderers since they're metadata/dispatch
tables rather than components reading live block data.

### src/registry/BlockRegistry.jsx → .tsx
- Added `BlockRegistryEntry` interface (`type`, `label`, `icon: LucideIcon`,
  `category`, optional `shortcut`/`badge`) and typed `BlockType` as
  `Record<string, string>`, `BlockRegistry` as `BlockRegistryEntry[]`.
- Documented inline that this registry is a separate taxonomy from
  `types/blocks.ts`'s `Block` union: `BlockRegistry` is UI-facing slash-menu
  metadata (including ~30 embed-provider ids that all collapse to the
  single `embed-generic` `Block` shape, and view-only ids like
  `table-view`/`board-view` that are UI variants of a `database` block) —
  not a 1:1 mirror of `Block`'s discriminated members.
- Zero errors on first pass — this file had no runtime logic, just data.

### src/core/commands/CommandRegistry.js → .ts (+ its property test)
- Added `Command`, `CommandContext`, `CommandPreview`, `NormalizedCommand`
  types. `CommandContext` was built by grepping every `ctx.<field>` access
  across all ~150 command definitions in the file (basic/media/database/
  advanced/layout/inline/embeds/pageActions categories) — every field is
  optional since different call sites (SlashCommandMenu, PageOptionsMenu,
  CommandPalette — all still `.jsx`, not yet converted) each supply only
  the subset of handlers relevant to their own context.
- `normalizePreview` converted to an overloaded function
  (`Command → NormalizedCommand`, `undefined → undefined`) so
  `getCommand`/`getAllCommands`/`getFilteredCommands` all return properly
  narrowed `NormalizedCommand`/`NormalizedCommand[]` instead of a
  `T | undefined` union leaking through `.map()`.
- `blockForTree`/`blockForDatabaseView` helpers deliberately left with
  `block: any` and an untyped return: they call `blockFor()` from
  `src/utils/helpers.js`, which is still untyped (a separate Phase 4 file
  not yet converted). Documented inline that typing only the call site
  against `Block` here would be an unchecked assertion, not real safety,
  until `helpers.js` itself is converted — deferred rather than guessed.
- Test file (`CommandRegistry.property.test.ts`) needed 3 fixes, all
  documented inline as deliberately-partial test fixtures (not silent
  `any` escapes): (1) two `ctx.page` fixtures that are partial fake pages
  testing single toggled properties or side-effect tracking, not real
  `Page` shapes — cast `as any` at the ctx boundary; (2) `globalThis.navigator`/
  `globalThis.window`/`location` test mocks that only need `clipboard.writeText`
  and `location.href` to exist, not full jsdom-shaped globals — cast
  `as any` at each assignment.

### Security check
- Grepped both converted files + the test file for hardcoded
  credentials/keys/tokens: none found.
- No RLS/permission logic touched (these are UI metadata + command
  dispatch, no Supabase calls).
- No `.git`/CI/deploy files touched.
- Result: **PASS**.

### Verification
- `npx tsc --noEmit`: clean.
- `npm run build`: clean (`vite build`, "✓ built").
- `npx vitest run`: **140/140 tests pass** (full suite, not just the
  affected files) — confirms the property-test fixture type casts didn't
  change runtime behavior, only satisfied the type checker.

### Commit
- Committed `cd4bfa1` — "Convert BlockRegistry and CommandRegistry to
  TypeScript" on `chore/typescript-migration` (5 files: 3 renames,
  `types/blocks.ts` CodeBlockData addition, this log).

---

## Phase 4 — Block union match table + types/blocks.ts corrections

Before converting `renderBlockEditor.jsx` (the actual block dispatcher),
built a full match table of every `block.type` branch in that file against
`types/blocks.ts`'s `Block` union members, per the user's explicit request.
37 branches checked. Found 3 real type-definition bugs and 2 undocumented-
but-structurally-covered gaps — all backed by grepped runtime evidence, none
guessed.

### Bugs found and fixed in types/blocks.ts
1. **`ColumnsBlock.type`** was the literal `"columns"`, which never actually
   occurs as a `block.type` value — `helpers.js`'s `blockFor()` stores the
   original `2-columns`/`3-columns`/`4-columns`/`5-columns` argument
   verbatim via `createBlock(type, ...)`; the `'columns'` string is only
   used internally as a `BLOCK_TYPES` lookup key for shared defaults, never
   assigned to `block.type` itself. Fixed to
   `"2-columns" | "3-columns" | "4-columns" | "5-columns"`.
2. **`PageListBlock.type`** had `"table_of_contents"` (underscore) but the
   real value everywhere (helpers.js, BlockRegistry.tsx, CommandRegistry.ts,
   renderBlockEditor.jsx) is `"table-of-contents"` (hyphen) — these never
   matched. Fixed to the hyphenated form.
3. **`TemplateButtonBlock.type`** only had `"template_button"`, but two
   distinct commands ("button" and "template-button" in
   CommandRegistry.ts) both produce this same field shape with different
   `block.type` values (`"button"` and `"template_button"` respectively) —
   confirmed both reach the same combined dispatch branch in
   renderBlockEditor.jsx. Fixed to `"button" | "template_button"`.

### Gaps documented (not bugs — previously silently absorbed by
GenericBlock's index signature, now given dedicated interfaces since they
have real distinguishing fields)
4. **`MentionBlock`** (new) — `type: "mention"`, `mentionPageId: string |
   null`, `isInlineMention?: boolean`. Produced identically by both the
   "mention-person" and "mention-page" commands.
5. **`ChartBlockData`** (new) — `type:` one of the 5 chart-command ids,
   `chart?: { title?, series: ChartSeriesPoint[], unit? }`. Confirmed
   against `src/components/editor/ChartBlock.jsx`'s `getChartData()`.

Both added to the `Block` union. `npx tsc --noEmit`: clean after all
changes (this was a types-only change to `types/blocks.ts`, no `.jsx`
files touched yet in this step).

### Full match table (37 branches)

| Branch | Runtime type(s) | Union member | Status |
|---|---|---|---|
| Embeds passthrough | ~30 embed ids | GenericBlock | ✅ |
| page | page | GenericBlock | ✅ |
| link-to-page | link-to-page | GenericBlock | ✅ |
| mention | mention | MentionBlock (new) | ✅ (was gap, now fixed) |
| divider/todo/toggle/image | (same) | GenericBlock | ✅ |
| code | code | CodeBlockData | ✅ (fixed earlier this session) |
| video/audio/file/bookmark | (same) | GenericBlock | ✅ |
| table | table | TableBlock | ✅ |
| columns dispatch | 2/3/4/5-columns | ColumnsBlock | ✅ (fixed) |
| database/database-inline/database-full | (same) | DatabaseBlock | ✅ |
| linked-view/callout/bullet/number | (same) | GenericBlock | ✅ |
| table-of-contents | table-of-contents | PageListBlock | ✅ (fixed) |
| tabs | tabs | TabsBlock | ✅ |
| chart dispatch | 5 chart ids | ChartBlockData (new) | ✅ (was gap, now fixed) |
| button/template_button | button, template_button | TemplateButtonBlock | ✅ (fixed) |
| breadcrumb | breadcrumb | PageListBlock | ✅ |
| form | form | FormBlock | ✅ |
| synced-block/block-equation/toggle-h1-3/mermaid/ai-block/ai-meeting/text/quote/h1-4 | (same) | GenericBlock | ✅ |
| fallback | anything else | GenericBlock | ✅ |

All 37 branches now structurally match a `Block` union member. Full detail
of the investigation (grep evidence per mismatch) is in the conversation
record; summarized here for the log.

---

## Phase 4 — renderBlockEditor.jsx → .tsx (the block dispatcher)

Converted the actual block-type dispatcher, after the match table above
confirmed all 37 branches correspond to a real `Block` union member (with
3 bugs fixed and 2 gaps documented in `types/blocks.ts` first).

### Approach
- `block`/`page`/`pages` parameters kept as `any`/`any[]` rather than
  narrowed to `Block`/`Page`/`Page[]`. Documented inline why: this
  dispatcher reads dozens of type-specific fields across ~35 if-branches
  (an if-chain, not a switch), and properly narrowing `block: Block` per
  branch would require rewriting the dispatch as a discriminated
  switch/exhaustiveness pattern — a structural rewrite beyond a type-only
  migration pass. This is a deliberate, documented scope boundary, not a
  silent gap — the match table proves every branch is real and covered.
- All other parameters (`index`, `cls`, `ref`, `onPatch`, `onKeyDown`,
  etc.) are fully typed against their actual call site in `Editor.jsx`
  (still `.jsx`, so those types are inferred from usage, not enforced
  both ways yet — will tighten once `Editor.jsx` itself converts).
- `CalloutBlock` (local sub-component) given a full `CalloutBlockProps`
  interface.

### Real bugs found and fixed (not just type gaps)
- **Missing `GripHorizontal` import**: used in the video-resize corner
  handle JSX but never imported from `lucide-react` — would have thrown
  `ReferenceError` at runtime if that specific hover state ever rendered
  (video blocks with an active resize-corner hover). Added the import.
- **Dead `onPasteUrl` prop on one `TextArea` usage** (tabs branch): the
  real `TextArea` component (`src/components/ui/index.tsx`, typed in
  Phase 3) has no `onPasteUrl` prop — every other `TextArea` usage in this
  file correctly omits it; only the tabs branch had it as inert dead code.
  Removed with an inline comment rather than adding an unused prop to
  `TextArea` itself (would be inventing functionality, not migrating).
- **`ref` param type**: initially typed as `React.Ref<any>` (covers both
  object-refs and callback-refs), which broke `.current` access in two
  branches. Traced the actual call site in `Editor.jsx`
  (`const inputRef = useRef(null)`) — always an object ref — and narrowed
  to `React.RefObject<any>`, matching real usage.

### Cross-file dead-prop fixes (same pattern as earlier phases)
- `PagePeek` (still `.jsx`, untouched): 3 call sites in this file pass
  `page`/`pages`/`onNavigate` but the component requires `onOpenFull` too
  (inferred-required from other call sites). Passed `onOpenFull={undefined}`
  explicitly at each of the 3 sites — consistent with the same fix applied
  to `StackedColumn.tsx` in an earlier Phase 3 batch, not a new pattern.
- `MediaUploadPlaceholder` (still `.jsx`): `fileName` is destructured with
  no default, making it inferred-required; the video/audio branches never
  passed it (only the file branch did, with `fileName={true}`). Added
  `fileName={false}` at both call sites — matches the always-`undefined`
  (falsy) value these branches always effectively had.
- `DatabaseBlock.jsx` (separate file, not otherwise touched this phase):
  `isLocked` is passed at 2 call sites in `renderBlockEditor.tsx` but
  wasn't destructured by the component at all — added `isLocked` to its
  destructure for documentation/pass-through consistency, no behavior
  change (the prop was previously silently dropped either way).

### Security check
- Grepped the converted file + `DatabaseBlock.jsx` for hardcoded
  credentials/keys/tokens: none found (`apiKey`/`aiProvider` are read from
  parameters, no hardcoded fallback).
- No RLS/permission logic touched — this is pure block-rendering
  dispatch, no Supabase calls.
- No `.git`/CI/deploy files touched.
- Result: **PASS**.

### Verification
- `npx tsc --noEmit`: clean.
- `npm run build`: clean (`vite build`, "✓ built").
- `npx vitest run`: **140/140 tests pass** (full suite) — confirms the
  dead-prop/ref-type fixes and the `GripHorizontal` import addition don't
  change any tested runtime behavior.
