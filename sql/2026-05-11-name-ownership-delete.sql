-- Breadcrumbs Phase 2 update: lightweight name accounts and owner-only delete flow.

create table if not exists public.accounts (
  name text primary key,
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts'
      and policyname = 'accounts_select_public'
  ) then
    create policy accounts_select_public
      on public.accounts
      for select
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts'
      and policyname = 'accounts_insert_public'
  ) then
    create policy accounts_insert_public
      on public.accounts
      for insert
      with check (length(trim(name)) > 0 and length(trim(name)) <= 100);
  end if;
end $$;

alter table public.pins
  add column if not exists owner_name text;

update public.pins
set owner_name = nullif(trim(submitted_by), '')
where owner_name is null;

create index if not exists pins_owner_name_idx on public.pins (owner_name);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pins_owner_name_length_check'
  ) then
    alter table public.pins
      add constraint pins_owner_name_length_check
      check (owner_name is null or length(trim(owner_name)) <= 100);
  end if;
end $$;
