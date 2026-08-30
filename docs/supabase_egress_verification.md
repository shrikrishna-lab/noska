# Supabase Egress Verification & Post-Deployment Monitoring Plan

## Overview
This document establishes the official verification procedure and measurement framework to evaluate the real-world impact of the Supabase egress optimizations deployed in Noska.

> [!IMPORTANT]
> The authoritative metric source is strictly the **Supabase Dashboard → Organization Settings → Usage** and **Project Reports → API / Database / Realtime**. Client-side logs and dev monitors provide diagnostic inspection only and must never be treated as billing metrics.

---

## 1. Pre-Optimization Baseline (Known Metrics)

The pre-optimization measurements recorded prior to this deployment:

| Metric | Pre-Optimization Baseline (Before) | Source |
|---|---|---|
| **Total Monthly Egress** | `~7.66 GB` (Free limit: 5.00 GB) | Supabase Dashboard (Billing Usage) |
| **Peak Daily Egress Spike** | `~5.90 GB` (Recorded on Aug 27) | Supabase Dashboard (Daily Egress Graph) |
| **Realtime Messages** | `~397,845` messages | Supabase Dashboard (Realtime Reports) |
| **Peak Realtime Connections** | `~10` concurrent sockets | Supabase Dashboard (Realtime Reports) |
| **Database Size** | `50 MB / 500 MB` | Supabase Dashboard |
| **File Storage** | `0 MB / 1 GB` | Supabase Dashboard |

---

## 2. Post-Deployment Comparison Tracking Template

Use this table to record actual 24h and 48h readings following production deployment:

| Metric | Baseline (Before) | 24 Hours Post-Deploy | 48 Hours Post-Deploy | Net Change | Status |
|---|---|---|---|---|---|
| **Daily Egress Volume** | ~5.90 GB (Spike) | _[To be measured]_ | _[To be measured]_ | _[Pending]_ | ⏳ Monitoring |
| **Total Billing Egress** | 7.66 GB | _[To be measured]_ | _[To be measured]_ | _[Pending]_ | ⏳ Monitoring |
| **Realtime Messages (Daily)** | ~397k (Period) | _[To be measured]_ | _[To be measured]_ | _[Pending]_ | ⏳ Monitoring |
| **Peak Realtime Connections** | ~10 sockets | _[To be measured]_ | _[To be measured]_ | _[Pending]_ | ⏳ Monitoring |
| **Autosave Payload Size** | Full workspace MBs | < 1 KB (204 No Content) | < 1 KB (204 No Content) | >99% reduction | ✅ Code Verified |
| **Marketing WebSocket Channels**| 7 public channels | 0 channels | 0 channels | 100% reduction | ✅ Code Verified |

---

## 3. Workflow Verification Checklist

Perform these exact functional verification scenarios in staging/production:

- [ ] **A. Edit Single Page:** Edit 1 block on a single page. Inspect Network tab: verify PostgREST sends only 1 record and returns `204 No Content` without echoing the full document JSON tree.
- [ ] **B. Rapid Keystroke Coalescing:** Type continuously for 15 seconds. Verify autosave debounces and coalesces edits into a single dirty save without redundant in-flight overlapping writes.
- [ ] **C. Multi-Page Edits:** Make edits across two distinct pages. Verify the debounced sync batches strictly those 2 dirty pages without sending unrelated workspace documents.
- [ ] **D. AI Chat Messages:** Send multiple messages in an AI chat session. Verify message persistence does not refetch or rewrite the entire conversation history unnecessarily.
- [ ] **E. Public Marketing Navigation:** Navigate across Landing, Blog, Legal, and Changelog as an anonymous visitor. Verify **0 Realtime WebSocket subscriptions** are initialized and responses are served from in-memory cache (5–10 min TTL).
- [ ] **F. AI Analytics Modal:** Open the AI Analytics Dashboard. Verify Realtime subscribes only to `user-ai-stats-${userId}` (current user). Close the modal and confirm channel is removed immediately with 0 background wildcard listeners.
- [ ] **G. Workspace & Team Context Switching:** Switch between teams/workspaces. Verify previous channels are cleanly unsubscribed and no orphaned listeners remain.
- [ ] **H. Network Interruption Recovery:** Disconnect network during page edits and reconnect. Verify dirty state is preserved in memory and successfully persisted upon reconnection with backoff retry.

---

## 4. Evaluation Criteria & Next Actions

Once 24–48 hours of real Supabase telemetry data have been observed:

| Observation | Diagnosis | Action |
|---|---|---|
| **Egress drops significantly (e.g., <100 MB/day)** | Optimizations succeeded completely. | **No further action required.** Close issue. |
| **Egress drops but remains unexpectedly high** | A secondary query or endpoint is active. | Inspect **Supabase Project Reports → API** to identify the exact endpoint before modifying code. |
| **Egress remains unchanged** | Unaccounted background worker or external tool running. | Check external API keys, webhooks, or scheduled scripts outside the client repository. |
| **Realtime message count remains high** | Remaining presence or broadcast channel active. | Audit `realtimeCollab.ts` presence frequency during active collaborative editing sessions. |

---

## 5. Final Report Requirements

At the conclusion of the 48-hour monitoring period, compile the following findings:
1. Complete Before vs After metrics comparison table.
2. Total egress delta and percentage reduction.
3. Realtime message count delta.
4. Top remaining database query identified from Supabase Reports.
5. Confirmation that no regressions occurred across existing functionality, RLS, or security boundaries.
