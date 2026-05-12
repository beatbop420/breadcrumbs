-- Breadcrumbs RLS fix: anonymous-auth sessions use the authenticated role.
-- Without this, pins disappear after the first successful sign-in because
-- SELECT on public.pins only allows the anon role.

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pins'
      and policyname = 'Allow public read'
  ) then
    alter policy "Allow public read"
      on public.pins
      to anon, authenticated;
  else
    create policy "Allow public read"
      on public.pins
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;
