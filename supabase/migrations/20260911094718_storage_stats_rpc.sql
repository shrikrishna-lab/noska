-- Real storage statistics for the admin monitoring views. The admin-api
-- "monitor/storage" action calls this with the service-role key; EXECUTE is
-- revoked from public/anon/authenticated so it is not a public endpoint
-- (it reads storage.objects and pg_total_relation_size, which are internal).

create or replace function public.get_storage_stats()
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'storage', 'pg_catalog'
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'dbSizeBytes', pg_database_size(current_database()),
    'storageObjects', coalesce((select count(*) from storage.objects), 0),
    'storageBytes', coalesce((
      select sum(coalesce((metadata->>'size')::bigint, 0)) from storage.objects
    ), 0),
    'buckets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', b.name,
        'objects', o.cnt,
        'bytes', o.bytes
      ) order by o.bytes desc nulls last)
      from storage.buckets b
      left join (
        select bucket_id, count(*) as cnt, sum(coalesce((metadata->>'size')::bigint, 0)) as bytes
        from storage.objects group by bucket_id
      ) o on o.bucket_id = b.id
    ), '[]'::jsonb),
    'topTables', coalesce((
      select jsonb_agg(jsonb_build_object(
        'table', c.relname,
        'bytes', pg_total_relation_size(c.oid)
      ) order by pg_total_relation_size(c.oid) desc)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and pg_total_relation_size(c.oid) > 0
      limit 10
    ), '[]'::jsonb)
  into result;

  return result;
end;
$$;

revoke execute on function public.get_storage_stats() from public, anon, authenticated;
grant execute on function public.get_storage_stats() to service_role;
