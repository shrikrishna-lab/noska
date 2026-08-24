# Noska Plugins & Connected Accounts

A Noska plugin is an extension package — NOT an MCP server. It can add
capabilities, commands, event handlers, tools, automation actions and (where
supported) UI surfaces, and can connect external services.

## Manifest

```json
{
  "id": "github",
  "name": "GitHub",
  "version": "1.0.0",
  "publisher": "noska",
  "description": "Issues, pull requests and repositories",
  "permissions": [
    "github.repositories.read",
    "github.issues.read",
    "github.issues.write"
  ],
  "capabilities": ["issues", "pull_requests", "repositories"],
  "events": ["plugin.github.issues.opened"],
  "tools": [{ "name": "list_issues", "description": "List repo issues" }],
  "automationActions": ["create_task_from_issue"]
}
```

Validation rules (enforced in `_shared/core/pure.ts → validatePluginManifest`,
unit-tested): lowercase hyphenated `id`, semver `version`, ≥1 permission
(namespaced like `provider.resource.action`), ≥1 capability.

## Security model

```
User → Workspace → Plugin installation → granted permissions
     → permission gate (assertPluginPermission) → capability APIs only
```

- **No silent access.** Installing grants exactly the permissions the user
  accepted (`granted_permissions`), defaulting to the declared set.
- **Registry gating.** Only manifests with `status='verified'` can be installed;
  manifest writes are service-role/admin only.
- **No direct DB access.** Plugin effects flow through the same canonical
  capability layer as API/MCP — enforced by code review + the gate above.
- **Auditable.** Every plugin execution writes a `plugin_runs` record with
  trigger, tool, status and detail.
- **Revocable & scoped** per user; disabling clears nothing but stops
  execution; revoking wipes grants.
- Secrets of external providers live server-side only (`connected_accounts`
  stores encrypted tokens or none at all until a provider ships).

## Lifecycle states

`installed → enabled ⇄ disabled → revoked` (plus marketplace-facing
`available` / `update_available` handled by the registry listing).

API surface (scope `connections:manage` for accounts):
- `POST/GET /templates`-style management lives behind the Developer UI today
- `GET /connections`, `DELETE /connections/:id`

## Runtime status

Implemented: manifest validation, verified registry, install lifecycle,
permission gate, run auditing, connected-account framework.

Not implemented yet (by design, no fakes): sandboxed execution of third-party
plugin code and first-party providers (GitHub, Google Calendar, Gmail, Slack,
Discord, Linear). The framework is provider-ready; each provider ships only
when its credential flow can be safely supported.

## Agent + automation integration (design contract)

When a provider plugin ships:
- its tools register through the same permission gate agents use — e.g.
  Study Guardian + Google Calendar reads events to schedule reviews, still
  passing the Noska permission gate;
- its events land on the canonical event bus so automations can subscribe —
  e.g. GitHub issue opened → automation → create task.
