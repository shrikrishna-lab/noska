-- ============================================================================
-- Noska API keys — auth-path hardening + lifecycle optimization
--
-- 1. user_api_keys.key_hash had NO index: every REST/MCP request did a
--    sequential scan. Add a unique btree index (IF NOT EXISTS; the UNIQUE
--    constraint already implies one on fresh installs, this heals older DBs).
-- 2. Composite index for the console list query (user_id, created_at DESC).
-- 3. Partial index for active-key checks (revoked_at IS NULL).
-- 4. Guardrails: name length + key_hash format + scopes-is-array checks.
-- 5. user_api_keys.updated_at for lifecycle auditing (defaults to created).
-- All statements idempotent.
-- ============================================================================

-- 1. Auth lookup index (heals DBs created before the unique constraint).
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_api_keys_key_hash
  ON public.user_api_keys (key_hash);

-- 2. Console list ordering.
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_created
  ON public.user_api_keys (user_id, created_at DESC);

-- 3. Active-key filter.
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active
  ON public.user_api_keys (user_id) WHERE revoked_at IS NULL;

-- 4. Guardrails (added only when the column exists; never fails a deploy).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'user_api_keys'
               AND column_name = 'name') THEN
    BEGIN
      ALTER TABLE public.user_api_keys
        ADD CONSTRAINT user_api_keys_name_len
        CHECK (char_length(name) BETWEEN 1 AND 80);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'user_api_keys'
               AND column_name = 'key_hash') THEN
    BEGIN
      ALTER TABLE public.user_api_keys
        ADD CONSTRAINT user_api_keys_hash_format
        CHECK (key_hash ~ '^[0-9a-f]{64}$');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'user_api_keys'
               AND column_name = 'scopes') THEN
    BEGIN
      ALTER TABLE public.user_api_keys
        ADD CONSTRAINT user_api_keys_scopes_array
        CHECK (jsonb_typeof(scopes) = 'array');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 5. Lifecycle timestamp.
ALTER TABLE public.user_api_keys
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Keep updated_at fresh on writes (idempotent: drop + recreate).
DROP TRIGGER IF EXISTS trg_user_api_keys_updated_at ON public.user_api_keys;
CREATE OR REPLACE FUNCTION public.fn_touch_user_api_keys_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_user_api_keys_updated_at
  BEFORE UPDATE ON public.user_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.fn_touch_user_api_keys_updated_at();
