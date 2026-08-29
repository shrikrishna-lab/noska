/* ============================================================================
 * Noska MCP — Policy Engine (single authorization choke point).
 *
 * EVERY tools/call passes through authorizeTool() before a handler runs.
 * Nothing in the tool registry may duplicate these decisions.
 *
 * Model (matches the platform's real shape):
 *   - Identity:   the API key's user (Clerk subject mirrored in user_id)
 *   - Workspace:  resources are user-scoped; workspaces gate workspace-scoped
 *                 resources (agents/automations/templates/dashboards) via
 *                 membership. Content (pages/blocks) is user-scoped by design
 *                 — workspace_id tags it for organization.
 *   - Scopes:     key.scopes gate tool families (learning:* ≡ reviews:*)
 *   - Role:       workspace_members.role caps what a membership may do
 *   - Read-only:  key.read_only refuses every mutating tool
 *   - Tool allow: key.allowed_tools ([] = all scope-permitted tools)
 *   - Execution:  run-agent/run-automation additionally bounded per hour
 *
 * Error codes follow the platform contract (§34) — stable, machine-readable.
 * ========================================================================== */

export type Row = Record<string, unknown>;

export interface PolicyKey {
  id: string;
  user_id: string;
  scopes: string[];
  read_only?: boolean;
  allowed_tools?: string[];
  default_workspace_id?: string;
}

export interface PolicyTool {
  name: string;
  scope: string;
  risk: 'GREEN' | 'YELLOW' | 'RED';
  /** Tools that trigger real executions (stricter budget). */
  executes?: boolean;
}

export interface WorkspaceContext {
  workspaceId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer' | 'none';
}

export class PolicyError extends Error {
  status: number;
  code: string;
  extra: Row;
  constructor(status: number, code: string, message: string, extra: Row = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const PolicyErrors = {
  authRequired: (m = 'Missing or invalid MCP credential.') =>
    new PolicyError(401, 'AUTH_REQUIRED', m),
  tokenExpired: () => new PolicyError(401, 'TOKEN_EXPIRED', 'This credential has expired.'),
  tokenRevoked: () => new PolicyError(401, 'TOKEN_REVOKED', 'This credential has been revoked.'),
  workspaceNotFound: () => new PolicyError(404, 'WORKSPACE_NOT_FOUND', 'Workspace was not found.'),
  workspaceDenied: () =>
    new PolicyError(403, 'WORKSPACE_ACCESS_DENIED', 'You are not a member of this workspace.'),
  insufficientScope: (scope: string) =>
    new PolicyError(403, 'INSUFFICIENT_SCOPE', `Requires the "${scope}" scope.`, { required_scope: scope }),
  readOnly: () =>
    new PolicyError(403, 'READ_ONLY_CREDENTIAL', 'This credential is read-only; mutating tools are refused.'),
  toolNotAllowed: (tool: string) =>
    new PolicyError(403, 'TOOL_NOT_ALLOWED', `Tool "${tool}" is not allowed for this credential.`, { tool }),
  roleDenied: (role: string, action: string) =>
    new PolicyError(403, 'ROLE_FORBIDDEN', `Workspace role "${role}" does not permit ${action}.`, { role }),
  rateLimited: (retryAfterSeconds: number) =>
    new PolicyError(429, 'RATE_LIMITED', 'Rate limit exceeded. Retry after the window resets.', {
      retry_after_seconds: retryAfterSeconds,
    }),
  executionBudget: (limitPerHour: number) =>
    new PolicyError(429, 'EXECUTION_LIMIT', `Execution tools are limited to ${limitPerHour}/hour per credential.`, {
      limit_per_hour: limitPerHour,
    }),
};

/* ─── Role → capability ceiling ─── */

const WRITE_CAPABLE_ROLES = new Set(['owner', 'admin', 'member', 'editor']);
const ADMIN_ROLES = new Set(['owner', 'admin']);

export function roleCanWrite(role: WorkspaceContext['role']): boolean {
  return WRITE_CAPABLE_ROLES.has(role);
}
export function roleCanAdmin(role: WorkspaceContext['role']): boolean {
  return ADMIN_ROLES.has(role);
}

/* ─── Scope check (learning:* ≡ reviews:* aliases) ─── */

const SCOPE_ALIASES: Record<string, string> = {
  'learning:read': 'reviews:read',
  'learning:write': 'reviews:write',
};

function normalizeScope(s: string): string {
  return SCOPE_ALIASES[s] ?? s;
}

export function keyHasScope(keyScopes: string[], required: string): boolean {
  const set = new Set(keyScopes.map(normalizeScope));
  return set.has(normalizeScope(required));
}

/* ─── Mutating-tool detection (read-only mode) ───
 * A tool mutates unless its declared scope is strictly read-flavored. */

export function toolIsRead(scope: string): boolean {
  return scope.endsWith(':read');
}

/* ─── Core verdict ───
 * Order matters: cheapest checks first, workspace I/O last. */

export function authorizeTool(
  key: PolicyKey,
  tool: PolicyTool,
): void {
  // 1. Scope family
  if (!keyHasScope(key.scopes ?? [], tool.scope)) {
    throw PolicyErrors.insufficientScope(tool.scope);
  }

  // 2. Explicit per-credential tool allowlist ([] or absent = all permitted)
  const allowed = key.allowed_tools ?? [];
  if (allowed.length > 0 && !allowed.includes(tool.name)) {
    throw PolicyErrors.toolNotAllowed(tool.name);
  }

  // 3. Read-only credentials may only use read-flavored tools
  if (key.read_only && !toolIsRead(tool.scope)) {
    throw PolicyErrors.readOnly();
  }
}

/** Workspace-scoped verdict — call when a tool resolves a workspace. */
export function authorizeWorkspaceAction(
  ctx: WorkspaceContext,
  action: 'read' | 'write' | 'admin',
): void {
  if (ctx.role === 'none') throw PolicyErrors.workspaceDenied();
  if (action === 'read') return;
  if (action === 'write' && !roleCanWrite(ctx.role)) {
    throw PolicyErrors.roleDenied(ctx.role, 'writes');
  }
  if (action === 'admin' && !roleCanAdmin(ctx.role)) {
    throw PolicyErrors.roleDenied(ctx.role, 'administration');
  }
}
