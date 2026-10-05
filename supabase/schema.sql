create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "Users can read their own data" on public.user_data;
create policy "Users can read their own data"
  on public.user_data for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own data" on public.user_data;
create policy "Users can insert their own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own data" on public.user_data;
create policy "Users can update their own data"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_data'
  ) then
    alter publication supabase_realtime add table public.user_data;
  end if;
end
$$;
