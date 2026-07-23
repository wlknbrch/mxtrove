-- MxShare V2: blocking, muting, privacy enforcement, account lifecycle, and export requests.

alter table public.profiles
  add column deactivated_at timestamptz,
  add column deletion_scheduled_at timestamptz;

create table public.profile_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  constraint profile_blocks_no_self_check check (blocker_id <> blocked_id)
);

create table public.profile_mutes (
  muter_id uuid not null references public.profiles (id) on delete cascade,
  muted_id uuid not null references public.profiles (id) on delete cascade,
  mute_posts boolean not null default true,
  mute_notifications boolean not null default true,
  mute_messages boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (muter_id, muted_id),
  constraint profile_mutes_no_self_check check (muter_id <> muted_id)
);

create table public.profile_privacy_settings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  profile_visibility text not null default 'public',
  message_permission text not null default 'everyone',
  project_invite_permission text not null default 'everyone',
  show_location boolean not null default true,
  show_follower_counts boolean not null default true,
  show_activity_status boolean not null default true,
  allow_profile_discovery boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profile_privacy_visibility_check
    check (profile_visibility in ('public', 'members_only')),
  constraint profile_privacy_message_check
    check (message_permission in ('everyone', 'people_i_follow', 'mutual_follows', 'nobody')),
  constraint profile_privacy_invite_check
    check (project_invite_permission in ('everyone', 'people_i_follow', 'mutual_follows', 'nobody'))
);

create table public.account_deletion_requests (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'scheduled',
  requested_at timestamptz not null default timezone('utc', now()),
  scheduled_for timestamptz not null,
  cancelled_at timestamptz,
  completed_at timestamptz,
  delete_cloud_files boolean not null default false,
  constraint account_deletion_requests_status_check
    check (status in ('scheduled', 'cancelled', 'processing', 'completed'))
);

create table public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'queued',
  format text not null default 'json',
  protected_asset_id uuid references public.protected_media_assets (id) on delete set null,
  requested_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  error_message text,
  constraint data_export_requests_status_check
    check (status in ('queued', 'processing', 'ready', 'failed', 'expired')),
  constraint data_export_requests_format_check
    check (format in ('json', 'json_csv'))
);

create index profile_blocks_blocked_idx
  on public.profile_blocks (blocked_id, blocker_id);
create index profile_mutes_muted_idx
  on public.profile_mutes (muted_id, muter_id);
create index account_deletion_scheduled_idx
  on public.account_deletion_requests (scheduled_for)
  where status = 'scheduled';
create index data_export_requests_profile_created_idx
  on public.data_export_requests (profile_id, requested_at desc);
create index data_export_requests_queue_idx
  on public.data_export_requests (requested_at)
  where status = 'queued';

create trigger profile_mutes_set_updated_at
before update on public.profile_mutes
for each row execute procedure public.set_updated_at();

create trigger profile_privacy_settings_set_updated_at
before update on public.profile_privacy_settings
for each row execute procedure public.set_updated_at();

create or replace function public.ensure_profile_v2_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profile_privacy_settings (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

create trigger profiles_create_v2_settings
after insert on public.profiles
for each row execute procedure public.ensure_profile_v2_settings();

insert into public.profile_privacy_settings (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;

create or replace function public.is_profile_blocked_pair(
  first_profile_id uuid,
  second_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    first_profile_id is not null
    and second_profile_id is not null
    and exists (
      select 1
      from public.profile_blocks
      where (blocker_id = first_profile_id and blocked_id = second_profile_id)
        or (blocker_id = second_profile_id and blocked_id = first_profile_id)
    );
$$;

create or replace function public.can_view_profile(
  target_profile_id uuid,
  viewer_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles as profile
    left join public.profile_privacy_settings as privacy
      on privacy.profile_id = profile.id
    where profile.id = target_profile_id
      and profile.deactivated_at is null
      and not public.is_profile_blocked_pair(profile.id, viewer_profile_id)
      and (
        profile.id = viewer_profile_id
        or coalesce(privacy.profile_visibility, 'public') = 'public'
        or (
          privacy.profile_visibility = 'members_only'
          and viewer_profile_id is not null
        )
      )
  );
$$;

create or replace function public.follows_profile(
  follower_profile_id uuid,
  followed_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.follows
    where follower_id = follower_profile_id
      and followed_id = followed_profile_id
  );
$$;

create or replace function public.can_message_profile(
  sender_profile_id uuid,
  recipient_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    sender_profile_id is not null
    and recipient_profile_id is not null
    and sender_profile_id <> recipient_profile_id
    and not public.is_profile_blocked_pair(sender_profile_id, recipient_profile_id)
    and exists (
      select 1
      from public.profiles as profile
      left join public.profile_privacy_settings as privacy
        on privacy.profile_id = profile.id
      where profile.id = recipient_profile_id
        and profile.deactivated_at is null
        and (
          coalesce(privacy.message_permission, 'everyone') = 'everyone'
          or (
            privacy.message_permission = 'people_i_follow'
            and public.follows_profile(recipient_profile_id, sender_profile_id)
          )
          or (
            privacy.message_permission = 'mutual_follows'
            and public.follows_profile(sender_profile_id, recipient_profile_id)
            and public.follows_profile(recipient_profile_id, sender_profile_id)
          )
        )
    );
$$;

create or replace function public.can_invite_profile_to_project(
  inviter_profile_id uuid,
  invitee_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    inviter_profile_id is not null
    and invitee_profile_id is not null
    and inviter_profile_id <> invitee_profile_id
    and not public.is_profile_blocked_pair(inviter_profile_id, invitee_profile_id)
    and exists (
      select 1
      from public.profiles as profile
      left join public.profile_privacy_settings as privacy
        on privacy.profile_id = profile.id
      where profile.id = invitee_profile_id
        and profile.deactivated_at is null
        and (
          coalesce(privacy.project_invite_permission, 'everyone') = 'everyone'
          or (
            privacy.project_invite_permission = 'people_i_follow'
            and public.follows_profile(invitee_profile_id, inviter_profile_id)
          )
          or (
            privacy.project_invite_permission = 'mutual_follows'
            and public.follows_profile(inviter_profile_id, invitee_profile_id)
            and public.follows_profile(invitee_profile_id, inviter_profile_id)
          )
        )
    );
$$;

create or replace function public.can_send_message_to_conversation(
  target_conversation_id uuid,
  sender_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.conversations as conversation
    where conversation.id = target_conversation_id
      and public.is_conversation_member(conversation.id, sender_profile_id)
      and (
        (
          conversation.kind = 'project'
          and public.can_view_collaboration_project(conversation.project_id, sender_profile_id)
        )
        or (
          conversation.kind = 'direct'
          and not exists (
            select 1
            from public.conversation_members as member
            where member.conversation_id = conversation.id
              and member.profile_id <> sender_profile_id
              and not public.can_message_profile(sender_profile_id, member.profile_id)
          )
        )
      )
  );
$$;

create or replace function public.block_profile(target_profile_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  shared_project_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if current_user_id = target_profile_id then
    raise exception 'You cannot block yourself.';
  end if;

  if not exists (
    select 1 from public.profiles where id = target_profile_id
  ) then
    raise exception 'Profile not found.';
  end if;

  insert into public.profile_blocks (blocker_id, blocked_id)
  values (current_user_id, target_profile_id)
  on conflict do nothing;

  delete from public.follows
  where (follower_id = current_user_id and followed_id = target_profile_id)
    or (follower_id = target_profile_id and followed_id = current_user_id);

  delete from public.profile_mutes
  where muter_id = current_user_id
    and muted_id = target_profile_id;

  select count(distinct mine.project_id)::integer
  into shared_project_count
  from public.collaboration_project_members as mine
  join public.collaboration_project_members as theirs
    on theirs.project_id = mine.project_id
  where mine.profile_id = current_user_id
    and mine.membership_status = 'accepted'
    and theirs.profile_id = target_profile_id
    and theirs.membership_status = 'accepted';

  return coalesce(shared_project_count, 0);
end;
$$;

create or replace function public.unblock_profile(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_rows integer;
begin
  delete from public.profile_blocks
  where blocker_id = auth.uid()
    and blocked_id = target_profile_id;

  get diagnostics deleted_rows = row_count;
  return deleted_rows > 0;
end;
$$;

create or replace function public.mute_profile(
  target_profile_id uuid,
  should_mute_posts boolean default true,
  should_mute_notifications boolean default true,
  should_mute_messages boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or auth.uid() = target_profile_id then
    raise exception 'This profile cannot be muted.';
  end if;

  insert into public.profile_mutes (
    muter_id,
    muted_id,
    mute_posts,
    mute_notifications,
    mute_messages
  )
  values (
    auth.uid(),
    target_profile_id,
    should_mute_posts,
    should_mute_notifications,
    should_mute_messages
  )
  on conflict (muter_id, muted_id)
  do update set
    mute_posts = excluded.mute_posts,
    mute_notifications = excluded.mute_notifications,
    mute_messages = excluded.mute_messages,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.unmute_profile(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_rows integer;
begin
  delete from public.profile_mutes
  where muter_id = auth.uid()
    and muted_id = target_profile_id;

  get diagnostics deleted_rows = row_count;
  return deleted_rows > 0;
end;
$$;

create or replace function public.update_privacy_settings(
  next_profile_visibility text,
  next_message_permission text,
  next_project_invite_permission text,
  next_show_location boolean,
  next_show_follower_counts boolean,
  next_show_activity_status boolean,
  next_allow_profile_discovery boolean
)
returns public.profile_privacy_settings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_settings public.profile_privacy_settings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  insert into public.profile_privacy_settings (
    profile_id,
    profile_visibility,
    message_permission,
    project_invite_permission,
    show_location,
    show_follower_counts,
    show_activity_status,
    allow_profile_discovery
  )
  values (
    auth.uid(),
    next_profile_visibility,
    next_message_permission,
    next_project_invite_permission,
    next_show_location,
    next_show_follower_counts,
    next_show_activity_status,
    next_allow_profile_discovery
  )
  on conflict (profile_id)
  do update set
    profile_visibility = excluded.profile_visibility,
    message_permission = excluded.message_permission,
    project_invite_permission = excluded.project_invite_permission,
    show_location = excluded.show_location,
    show_follower_counts = excluded.show_follower_counts,
    show_activity_status = excluded.show_activity_status,
    allow_profile_discovery = excluded.allow_profile_discovery
  returning * into updated_settings;

  return updated_settings;
end;
$$;

create or replace function public.request_account_deletion(
  grace_period_days integer default 14,
  remove_cloud_files boolean default false
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  scheduled_time timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  scheduled_time := timezone('utc', now()) + make_interval(days => greatest(1, least(grace_period_days, 30)));

  insert into public.account_deletion_requests (
    profile_id,
    status,
    requested_at,
    scheduled_for,
    cancelled_at,
    completed_at,
    delete_cloud_files
  )
  values (
    auth.uid(),
    'scheduled',
    timezone('utc', now()),
    scheduled_time,
    null,
    null,
    remove_cloud_files
  )
  on conflict (profile_id)
  do update set
    status = 'scheduled',
    requested_at = timezone('utc', now()),
    scheduled_for = excluded.scheduled_for,
    cancelled_at = null,
    completed_at = null,
    delete_cloud_files = excluded.delete_cloud_files;

  update public.profiles
  set
    deactivated_at = timezone('utc', now()),
    deletion_scheduled_at = scheduled_time
  where id = auth.uid();

  return scheduled_time;
end;
$$;

create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.account_deletion_requests
  set
    status = 'cancelled',
    cancelled_at = timezone('utc', now())
  where profile_id = auth.uid()
    and status = 'scheduled'
    and scheduled_for > timezone('utc', now());

  if not found then
    raise exception 'No recoverable account deletion request exists.';
  end if;

  update public.profiles
  set
    deactivated_at = null,
    deletion_scheduled_at = null
  where id = auth.uid();
end;
$$;

create or replace function public.request_data_export(export_format text default 'json')
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if exists (
    select 1
    from public.data_export_requests
    where profile_id = auth.uid()
      and status in ('queued', 'processing')
  ) then
    raise exception 'A data export is already being prepared.';
  end if;

  insert into public.data_export_requests (profile_id, format)
  values (auth.uid(), export_format)
  returning id into new_request_id;

  return new_request_id;
end;
$$;

create or replace function public.list_blocked_profiles()
returns table (
  profile_id uuid,
  username text,
  display_name text,
  avatar_asset_id uuid,
  blocked_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    profile.id,
    profile.username,
    profile.display_name,
    profile.avatar_asset_id,
    block.created_at
  from public.profile_blocks as block
  join public.profiles as profile on profile.id = block.blocked_id
  where block.blocker_id = auth.uid()
  order by block.created_at desc;
$$;

create or replace function public.follow_profile(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_rows integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if current_user_id = target_profile_id then
    raise exception 'You cannot follow yourself.';
  end if;

  if public.is_profile_blocked_pair(current_user_id, target_profile_id) then
    raise exception 'This profile is unavailable.';
  end if;

  if not public.can_view_profile(target_profile_id, current_user_id) then
    raise exception 'Target profile not found.';
  end if;

  insert into public.follows (follower_id, followed_id)
  values (current_user_id, target_profile_id)
  on conflict do nothing;

  get diagnostics inserted_rows = row_count;

  if inserted_rows > 0 then
    insert into public.notifications (recipient_id, actor_id, type)
    values (target_profile_id, current_user_id, 'follow');
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.create_direct_conversation(other_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  existing_conversation_id uuid;
  new_conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.can_message_profile(current_user_id, other_profile_id) then
    raise exception 'This account is not accepting direct messages from you.';
  end if;

  select member.conversation_id
  into existing_conversation_id
  from public.conversation_members as member
  join public.conversation_members as counterpart
    on counterpart.conversation_id = member.conversation_id
  join public.conversations as conversation
    on conversation.id = member.conversation_id
  where conversation.kind = 'direct'
    and member.profile_id = current_user_id
    and counterpart.profile_id = other_profile_id
  limit 1;

  if existing_conversation_id is not null then
    return existing_conversation_id;
  end if;

  insert into public.conversations (kind)
  values ('direct')
  returning id into new_conversation_id;

  insert into public.conversation_members (conversation_id, profile_id)
  values
    (new_conversation_id, current_user_id),
    (new_conversation_id, other_profile_id);

  return new_conversation_id;
end;
$$;

create or replace function public.validate_project_invite_privacy()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.invited_profile_id is not null
    and not public.can_invite_profile_to_project(new.invited_by, new.invited_profile_id) then
    raise exception 'This account is not accepting project invitations from you.';
  end if;
  return new;
end;
$$;

create trigger collaboration_invites_validate_privacy
before insert on public.collaboration_project_invites
for each row execute procedure public.validate_project_invite_privacy();

create or replace function public.can_view_post(
  target_post_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.posts as post
    join public.profiles as owner on owner.id = post.owner_id
    where post.id = target_post_id
      and owner.deactivated_at is null
      and not public.is_profile_blocked_pair(post.owner_id, target_profile_id)
      and (
        post.owner_id = target_profile_id
        or post.visibility = 'public'
        or (
          post.visibility = 'followers'
          and public.follows_profile(target_profile_id, post.owner_id)
        )
        or exists (
          select 1
          from public.collaboration_projects as project
          where project.linked_post_id = post.id
            and public.can_view_collaboration_project(project.id, target_profile_id)
        )
      )
  );
$$;

alter table public.profile_blocks enable row level security;
alter table public.profile_mutes enable row level security;
alter table public.profile_privacy_settings enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.data_export_requests enable row level security;

create policy "profile blocks owner select"
on public.profile_blocks for select
using (blocker_id = auth.uid());

create policy "profile mutes owner select"
on public.profile_mutes for select
using (muter_id = auth.uid());

create policy "privacy settings owner select"
on public.profile_privacy_settings for select
using (profile_id = auth.uid());

create policy "account deletion owner select"
on public.account_deletion_requests for select
using (profile_id = auth.uid());

create policy "data exports owner select"
on public.data_export_requests for select
using (profile_id = auth.uid());

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles readable through privacy"
on public.profiles for select
using (public.can_view_profile(id, auth.uid()));

drop policy if exists "messages insert by sender membership" on public.messages;
create policy "messages insert through privacy"
on public.messages for insert
with check (
  sender_id = auth.uid()
  and public.can_send_message_to_conversation(conversation_id, auth.uid())
);

drop policy if exists "follow self-owned relations only" on public.follows;
create policy "follow allowed relations only"
on public.follows for insert
with check (
  follower_id = auth.uid()
  and follower_id <> followed_id
  and not public.is_profile_blocked_pair(follower_id, followed_id)
);

drop policy if exists "post hearts self-owned" on public.post_hearts;
create policy "post hearts self-owned unblocked"
on public.post_hearts for insert
with check (
  profile_id = auth.uid()
  and public.can_view_post(post_id, auth.uid())
  and not exists (
    select 1 from public.posts where id = post_id and owner_id = auth.uid()
  )
);

drop policy if exists "version hearts self-owned" on public.version_hearts;
create policy "version hearts self-owned unblocked"
on public.version_hearts for insert
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.song_versions as version
    join public.songs as song on song.id = version.song_id
    where version.id = song_version_id
      and song.owner_id <> auth.uid()
      and not public.is_profile_blocked_pair(song.owner_id, auth.uid())
  )
);

drop policy if exists "comments insert on visible posts" on public.comments;
create policy "comments insert on visible unblocked posts"
on public.comments for insert
with check (
  author_id = auth.uid()
  and public.can_view_post(post_id, auth.uid())
  and not exists (
    select 1
    from public.posts
    where id = comments.post_id
      and public.is_profile_blocked_pair(owner_id, auth.uid())
  )
);

grant execute on function public.is_profile_blocked_pair(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.can_view_profile(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.can_message_profile(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_invite_profile_to_project(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_send_message_to_conversation(uuid, uuid) to authenticated, service_role;
grant execute on function public.block_profile(uuid) to authenticated;
grant execute on function public.unblock_profile(uuid) to authenticated;
grant execute on function public.mute_profile(uuid, boolean, boolean, boolean) to authenticated;
grant execute on function public.unmute_profile(uuid) to authenticated;
grant execute on function public.update_privacy_settings(text, text, text, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.request_account_deletion(integer, boolean) to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;
grant execute on function public.request_data_export(text) to authenticated;
grant execute on function public.list_blocked_profiles() to authenticated;
