begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-user-one@example.test', '', now(), now(), now()),
  ('a1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rls-user-two@example.test', '', now(), now(), now());

insert into public.user_data (user_id, data)
values
  ('a1000000-0000-4000-8000-000000000001', '{"tasks":[{"id":"one"}],"habits":[],"courses":[],"studySessions":[],"workouts":[],"notes":[],"leetcode":[],"cp":[],"github":[],"projects":[],"goals":[]}'),
  ('a1000000-0000-4000-8000-000000000002', '{"tasks":[{"id":"two"}],"habits":[],"courses":[],"studySessions":[],"workouts":[],"notes":[],"leetcode":[],"cp":[],"github":[],"projects":[],"goals":[]}');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);

do $$
declare
  visible_rows integer;
  changed_rows integer;
  owner_updated_at timestamptz;
  rpc_saved boolean;
begin
  select count(*) into visible_rows from public.user_data;
  if visible_rows <> 1 then
    raise exception 'RLS leaked or hid rows: expected 1, got %', visible_rows;
  end if;

  update public.user_data
    set data = jsonb_set(data, '{tasks,0,id}', '"updated-by-owner"')
    where user_id = 'a1000000-0000-4000-8000-000000000001';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'Owner could not update their own row';
  end if;

  select updated_at into owner_updated_at
    from public.user_data
    where user_id = 'a1000000-0000-4000-8000-000000000001';
  select result.saved into rpc_saved
    from public.save_user_data(
      '{"tasks":[],"habits":[],"courses":[],"studySessions":[],"workouts":[],"notes":[],"leetcode":[],"cp":[],"github":[],"projects":[],"goals":[]}',
      '2000-01-01T00:00:00Z'
    ) as result;
  if rpc_saved then
    raise exception 'Stale cloud snapshot was accepted';
  end if;

  select result.saved into rpc_saved
    from public.save_user_data(
      '{"tasks":[],"habits":[],"courses":[],"studySessions":[],"workouts":[],"notes":[],"leetcode":[],"cp":[],"github":[],"projects":[],"goals":[]}',
      owner_updated_at
    ) as result;
  if not rpc_saved then
    raise exception 'Current cloud version was rejected';
  end if;

  update public.user_data
    set data = '{"tasks":[]}'
    where user_id = 'a1000000-0000-4000-8000-000000000002';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'Owner updated another account row';
  end if;

  begin
    insert into public.user_data (user_id, data)
      values ('a1000000-0000-4000-8000-000000000002', '{"tasks":[]}');
    raise exception 'Cross-account INSERT unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  delete from public.user_data
    where user_id = 'a1000000-0000-4000-8000-000000000002';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'Owner deleted another account row';
  end if;

  delete from public.user_data
    where user_id = 'a1000000-0000-4000-8000-000000000001';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'Owner could not delete their own row';
  end if;
end
$$;

reset role;
rollback;
