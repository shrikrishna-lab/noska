-- ============================================================================
-- Noska MCP — policy engine credentials
--   user_api_keys.read_only      → read-only MCP connections (§10)
--   user_api_keys.allowed_tools  → per-credential tool allowlist (§4/§44),
--                                  '[]' = every scope-permitted tool
-- Both are enforced server-side by _shared/mcp/policy.ts.
-- ============================================================================

ALTER TABLE public.user_api_keys
  ADD COLUMN IF NOT EXISTS read_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_tools jsonb NOT NULL DEFAULT '[]'::jsonb;