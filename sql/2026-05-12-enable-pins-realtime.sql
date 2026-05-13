-- Breadcrumbs live fix:
-- Ensure inserts on public.pins are published to Supabase Realtime.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pins'
  ) then
    alter publication supabase_realtime add table public.pins;
  end if;
end $$;
