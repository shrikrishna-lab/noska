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
