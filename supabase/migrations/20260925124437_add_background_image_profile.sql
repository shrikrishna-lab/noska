alter table public.agent_execution_settings
  add column if not exists image_provider text,
  add column if not exists image_model text,
  add column if not exists image_base_url text,
  add column if not exists encrypted_image_key text,
  add column if not exists image_key_hint text;
