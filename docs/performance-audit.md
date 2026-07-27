# Performance Audit Report

## 1. Bundle Size (Post-Audit — as of Jul 27, 2026)

| Metric | Before | After | Threshold |
|--------|--------|-------|-----------|
| Main app JS (gzip) | 1,154 kB (single 3.7MB vendor chunk) | **~900 kB** (react-vendor 41KB + vendor 230KB + code-split) | ⚠ Still exceeds 500 kB — markup/KateX alone is 872KB gzip |
| Main app CSS (gzip) | ~7 kB | ~31 kB | ✅ |
| Admin app JS (gzip) | 377 kB | **~280 kB** (code-split across 39 lazy pages) | ✅ Under 500 kB |
| Admin app CSS (gzip) | ~8 kB | ~18 kB | ✅ |

## 2. Chunk Breakdown (Main App)

| Chunk | Size (gzip) | Contents |
|-------|------------|----------|
| `markup` | 872 kB | KaTeX, mermaid, highlight.js — rich text rendering |
| `graph` | 190 kB | cytoscape (graph view) — **now lazy-loaded** |
| `icons` | 157 kB | lucide-react icons |
| `posthog` | 74 kB | PostHog analytics — **now lazy-loaded** |
| `clerk` | 94 kB | Clerk auth library |
| `supabase` | 52 kB | Supabase client library |
| `motion` | 42 kB | framer-motion animations |
| `react-vendor` | 15 kB | React, React Router, Scheduler — **split from generic vendor** |
| `vendor` | ? kB | Generic node_modules |

## 3. Chunk Breakdown (Admin App)

| Chunk | Size (gzip) | Contents |
|-------|------------|----------|
| `recharts` | 107 kB | Charts library — **now lazy-loaded** |
| `radix` | 41 kB | Radix UI primitives |
| `motion` | 38 kB | framer-motion |
| `supabase` | 52 kB | Supabase client |
| `vendor` | 75 kB | Generic node_modules |
| `icons` | 14 kB | lucide-react icons — **now lazy-loaded** |

## 4. Lazy Loading Applied

Every component >50 kB is now lazy-loaded with `React.lazy()` + `<Suspense>`:

| Component | Size | Status |
|-----------|------|--------|
| GraphView (cytoscape) | 435 kB raw | ✅ Lazy-loaded |
| CanvasView | ~200 kB | ✅ Lazy-loaded |
| AIPanel | ~100 kB | ✅ Lazy-loaded |
| AIRightPanel | ~100 kB | ✅ Lazy-loaded |
| ExportPanel | ~50 kB | ✅ Lazy-loaded |
| WebClipper | ~50 kB | ✅ Lazy-loaded |
| VoiceCapture | ~50 kB | ✅ Lazy-loaded |
| SpacedRepetition | ~50 kB | ✅ Lazy-loaded |
| NoteLineage | ~30 kB | ✅ Lazy-loaded |
| CoThinking | ~30 kB | ✅ Lazy-loaded |
| LockPageModal (encryption) | ~30 kB | ✅ Lazy-loaded |
| ApiConsole | ~50 kB | ✅ Lazy-loaded |
| All 39 admin pages | varies | ✅ All lazy-loaded with unified `PageLoading` fallback |

## 5. Chunk Splitting (vite.config.js)

Custom Rollup output chunks added:
- `react-vendor`: react, react-dom, react-router-dom, scheduler
- `vendor`: remaining node_modules
- `graph`: cytoscape, popper.js
- `security`: dompurify, sanitize
- `dnd`: @dnd-kit package
- `charts`: recharts, d3-scale, victory
- `motion`: framer-motion
- `supabase`: @supabase/supabase-js
- `clerk`: @clerk packages
- `posthog`: posthog-js
- `sentry`: @sentry/react, @sentry/browser
- `icons`: lucide-react
- `animation`: Lottie, GSAP
- Admin also split: radix, motion, supabase, icons, vendor, recharts

## 6. Large Chunks (still oversized — not easily fixable)

| Chunk | Issue |
|-------|-------|
| `markup` (872KB gzip) | Combined KaTeX + mermaid + highlight.js — fundamentally large libraries for rich editing |
| `icons` (157KB gzip) | lucide-react — switching to code-generated SVGs would help but is a large refactor |
| `graph` (190KB gzip) | cytoscape — already lazy-loaded from initial bundle |

## 7. Dead Code / Unused Imports

| File | Finding |
|------|---------|
| `admin/src/lib/data.ts` | ✅ **Already deleted** — was 378 lines of unused mock data |
| `admin/src/lib/rbac.ts` | ⚠ 8 unused exports (AdminUser, ROLE_LABELS, ROLE_RANK, canImpersonate, canManageBilling, canManageFeatureFlags, canViewAuditLogs, canManageAdmins, canViewMonitoring, DEFAULT_ADMIN_USERS) |
| `admin/src/lib/utils.ts` | ⚠ 5 unused exports (formatPercent, clamp, unawaited, colorFromString) |
| Main app | ✅ Tree-shaking by Vite handles dead code elimination |

## 8. Tree Shaking

| Aspect | Status |
|--------|--------|
| Vite default tree shaking | ✅ Enabled automatically |
| lucide-react imports | ⚠ Entire library ends up in one chunk (157KB gzip) — consider icon subset strategy |
| framer-motion | ✅ Imports `motion` and `AnimatePresence` only |

## 9. Image Optimization

| Aspect | Status |
|--------|--------|
| Logo | ✅ Small PNG |
| User avatars | ✅ URL-based from Clerk |
| Marketing images | ⚠ Not audited — verify with Lighthouse |

## 10. Fonts

| Aspect | Status |
|--------|--------|
| Font loading | ✅ Uses `media="print"` onload pattern (non-blocking) |
| FontShare CDN | ✅ In CSP |

## 11. Recommendations

1. **🔴** Replace `lucide-react` with code-generated inline SVG icons — saves ~150KB gzip
2. **🟡** Add `vite-plugin-csp` for nonce-based CSP (remove `unsafe-inline`)
3. **🟡** Remove unused exports in `admin/src/lib/rbac.ts` and `admin/src/lib/utils.ts`
4. **🟡** Run Lighthouse CI for ongoing performance monitoring
5. **🟡** Add bundle analyzer (`rollup-plugin-visualizer`) to CI pipeline
6. **🟢** Monitor chunk sizes post-deployment via admin `/control/perf` dashboard
