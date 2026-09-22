# Workspaces, Plans & Limits

Workspaces let one account keep completely separate bodies of work — for
example `Personal` and `Client Work`. Switching workspaces changes everything
you see: pages, trash, AI chats, routines, reflections, and custom calendar
events. Each workspace has its own trash, so restoring a deleted page always
puts it back in its own workspace, never a stranger's.

## One account, many workspaces

Limits count **owned** workspaces per account (both sign-in identities of the
same person count together — the limit cannot be dodged by signing in another
way). Workspace *members* do not consume the member's allowance; only owners
do.

## Plan allowances

How many workspaces each plan includes is **data, not code**: it comes from
the `max_workspaces` feature on each billing plan, editable any time in
Admin → Billing Plans. Your current allowance is always visible in two
places — the workspace switcher (`used of limit · PlanName`) and
Settings → Billing → usage meters. The Pricing page lists every plan's
allowance. If a number below ever disagrees with those screens, the screens
win.

Paid tiers generally unlock, in addition to more workspaces: higher AI
credit pools, more storage, more members per workspace, and priority
support — see the Pricing page for the current per-plan breakdown.

## What happens at the limit

- **Creating** another workspace is blocked with a clear message and a
  one-tap path to Settings → Billing. The check runs twice: a client
  pre-check for instant feedback, and a database trigger as the unbypassable
  backstop (`WORKSPACE_LIMIT_REACHED`).
- **Downgrading** (or a plan expiring) never deletes anything. Workspaces
  beyond the new allowance become **locked**: fully read-only with a banner
  and lock badges. Everything still opens, searches, and reads normally.
- **Locked means locked**: no editing, creating, moving, trashing,
  restoring, sharing, inviting, commenting, renaming, or AI actions. The
  only things that keep working are **import and export**.
- **Upgrading** unlocks everything instantly — no data is ever lost or moved
  by locking.

## Moving pages between workspaces

Page menu → **Move to workspace** moves a page *with its whole subtree* so
children never strand in the old workspace. Moving is blocked inside locked
workspaces, and into locked targets. New pages land in the active workspace
automatically; subpages inherit their parent; duplicates keep the source.

## Members

Workspace owners can invite members by username from the members dialog in
the switcher. Members can **read** the workspace's pages; editing still
needs a per-page grant (share the page as usual). Owners can remove members,
and anyone can leave. Membership changes are immediate; in locked
workspaces the dialog is read-only.

## What is (and isn't) scoped per workspace

| Scoped per workspace | Global (account-wide) |
|---|---|
| Pages, trash, AI chats | Agents & automations (account machinery) |
| Routines, reflections journal | Company / team spaces (separate system) |
| Custom calendar events | Inbox reminders (shared with AI agent tools) |

Pages, chats, and extras created before workspaces existed attach to the
oldest workspace, so nothing ever disappears when switching.

## Operating notes (admins & developers)

- Limits resolve per canonical account across Clerk-ID and UUID identities,
  reading the effective plan from `billing_subscriptions` (either identity
  form, email fallback), then `billing_entitlement_overrides`, then the
  plan's `max_workspaces` feature. A `NULL` limit means **unlimited**
  (Enterprise semantics, matching `check_feature_access`).
- Service-role writes bypass the limit trigger for admin tooling.
- Client checks (`requireLimit`/`trackUsage`) are UX conveniences; the
  trigger is authoritative.
- Related migrations: `workspace_plan_limits`,
  `workspace_official_plan_limits`, `workspace_unlimited_enterprise`,
  `workspace_member_page_access`, `ai_chats_workspace_scope`,
  `workspace_color_column`.
