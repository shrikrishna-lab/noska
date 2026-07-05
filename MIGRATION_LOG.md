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
