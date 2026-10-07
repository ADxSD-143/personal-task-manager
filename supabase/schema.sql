create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.user_data
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_data enable row level security;
alter table public.user_data force row level security;

revoke all on public.user_data from anon, public;
grant select, insert, update, delete on public.user_data to authenticated;

drop policy if exists "Users can read their own data" on public.user_data;
create policy "Users can read their own data"
  on public.user_data for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own data" on public.user_data;
create policy "Users can insert their own data"
  on public.user_data for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own data" on public.user_data;
create policy "Users can update their own data"
  on public.user_data for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own data" on public.user_data;
create policy "Users can delete their own data"
  on public.user_data for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.save_user_data(
  p_data jsonb,
  p_expected_updated_at timestamptz
)
returns table(saved boolean, data jsonb, updated_at timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  current_data jsonb;
  current_updated_at timestamptz;
  next_updated_at timestamptz := pg_catalog.clock_timestamp();
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if pg_catalog.jsonb_typeof(p_data) <> 'object' then
    raise exception 'Data must be a JSON object';
  end if;

  select ud.data, ud.updated_at
    into current_data, current_updated_at
    from public.user_data as ud
    where ud.user_id = current_user_id
    for update;

  if not found then
    if p_expected_updated_at is not null then
      return query select false, null::jsonb, null::timestamptz;
      return;
    end if;
    begin
      insert into public.user_data (user_id, data, updated_at)
        values (current_user_id, p_data, next_updated_at);
    exception when unique_violation then
      select ud.data, ud.updated_at
        into current_data, current_updated_at
        from public.user_data as ud
        where ud.user_id = current_user_id
        for update;
      return query select false, current_data, current_updated_at;
      return;
    end;
  else
    if p_expected_updated_at is null or current_updated_at <> p_expected_updated_at then
      return query select false, current_data, current_updated_at;
      return;
    end if;
    update public.user_data as ud
      set data = p_data, updated_at = next_updated_at
      where ud.user_id = current_user_id;
  end if;

  return query select true, p_data, next_updated_at;
end
$$;

revoke all on function public.save_user_data(jsonb, timestamptz) from public, anon;
grant execute on function public.save_user_data(jsonb, timestamptz) to authenticated;

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
