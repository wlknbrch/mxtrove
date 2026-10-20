begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(1);

-- This file is intended for local Supabase DB verification after migrations + seed.sql.
-- It exercises key V1 security guarantees by simulating authenticated users.

set local role authenticated;

-- Users cannot follow themselves.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
do $$
begin
  begin
    insert into public.follows (follower_id, followed_id)
    values ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111');
    raise exception 'Self follow should have failed.';
  exception
    when insufficient_privilege then null;
    when check_violation then null;
    when unique_violation then null;
  end;
end;
$$;

-- Users cannot read other users' private songs.
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.songs
  where id = '55555555-5555-5555-5555-555555555551';

  if visible_count <> 0 then
    raise exception 'Foreign private songs must not be visible.';
  end if;
end;
$$;

-- Users cannot read other users' private original assets.
do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.assets
  where id = '44444444-4444-4444-4444-444444444441';

  if visible_count <> 0 then
    raise exception 'Foreign private original assets must not be visible.';
  end if;
end;
$$;

-- Duplicate hearts are blocked.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
do $$
begin
  begin
    insert into public.post_hearts (profile_id, post_id)
    values ('11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777771');
    raise exception 'Duplicate heart should have failed.';
  exception
    when unique_violation then null;
  end;
end;
$$;

-- Conversation members can read the member list for their own direct conversation.
do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.conversation_members
  where conversation_id = '99999999-9999-9999-9999-999999999991';

  if visible_count <> 2 then
    raise exception 'Conversation members should be able to read both members in their own direct conversation.';
  end if;
end;
$$;

-- Message access is limited to conversation members.
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.messages
  where conversation_id = '99999999-9999-9999-9999-999999999991';

  if visible_count <> 0 then
    raise exception 'Non-members must not see direct messages.';
  end if;
end;
$$;

reset role;
select pass('V1 access-control assertions completed without an exception');
select * from finish();
rollback;
