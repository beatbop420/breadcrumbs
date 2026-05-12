-- Breadcrumbs live fixes:
-- 1. Allow authenticated anonymous sessions to delete pins.
-- 2. Create/configure the public `pins` storage bucket.
-- 3. Allow authenticated anonymous sessions to upload and delete photo objects.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pins'
      and policyname = 'pins_delete_authenticated'
  ) then
    create policy pins_delete_authenticated
      on public.pins
      for delete
      to authenticated
      using (true);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'pins',
  'pins',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
where not exists (
  select 1
  from storage.buckets
  where id = 'pins'
);

update storage.buckets
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'pins';

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'storage_pins_select_public'
  ) then
    create policy storage_pins_select_public
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'pins');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'storage_pins_insert_authenticated'
  ) then
    create policy storage_pins_insert_authenticated
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'pins');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'storage_pins_delete_authenticated'
  ) then
    create policy storage_pins_delete_authenticated
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'pins');
  end if;
end $$;
