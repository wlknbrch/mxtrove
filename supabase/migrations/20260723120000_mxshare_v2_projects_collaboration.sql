-- MxShare V2: collaboration projects, project roles, invites, tracks, activity, and project chat.
-- This migration is additive. Existing V1/V1.5 rows and behavior remain valid.

alter table public.conversations
  drop constraint if exists conversations_kind_check;

alter table public.conversations
  add constraint conversations_kind_check
  check (kind in ('direct', 'project'));

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'follow',
      'post_heart',
      'version_heart',
      'comment',
      'comment_reply',
      'single_version',
      'message',
      'project_invite',
      'project_invite_accepted',
      'project_member_removed',
      'project_role_changed',
      'project_feedback',
      'project_feedback_reply',
      'project_feedback_resolved',
      'project_version_uploaded',
      'project_status_changed',
      'message_attachment',
      'share_link_review'
    )
  );

create table public.collaboration_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  project_type text not null,
  title text not null,
  description text,
  artwork_asset_id uuid references public.assets (id) on delete set null,
  visibility text not null default 'private',
  status text not null default 'planning',
  linked_post_id uuid references public.posts (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  constraint collaboration_projects_type_check
    check (project_type in ('single', 'ep', 'album', 'loose_collection')),
  constraint collaboration_projects_visibility_check
    check (visibility in ('private', 'members_only', 'link_invite')),
  constraint collaboration_projects_status_check
    check (status in ('planning', 'active', 'review', 'finalizing', 'completed', 'archived')),
  constraint collaboration_projects_title_length_check
    check (char_length(btrim(title)) between 1 and 160)
);

create table public.collaboration_project_members (
  project_id uuid not null references public.collaboration_projects (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  membership_status text not null default 'invited',
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (project_id, profile_id),
  constraint collaboration_project_members_role_check
    check (role in ('owner', 'admin', 'editor', 'contributor', 'reviewer', 'viewer')),
  constraint collaboration_project_members_status_check
    check (membership_status in ('invited', 'accepted', 'declined', 'removed'))
);

create table public.collaboration_project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.collaboration_projects (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  invited_profile_id uuid references public.profiles (id) on delete cascade,
  invited_email text,
  invite_token_hash text not null unique,
  role text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint collaboration_project_invites_target_check
    check (invited_profile_id is not null or nullif(btrim(invited_email), '') is not null),
  constraint collaboration_project_invites_role_check
    check (role in ('admin', 'editor', 'contributor', 'reviewer', 'viewer')),
  constraint collaboration_project_invites_status_check
    check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired'))
);

create unique index collaboration_project_invites_pending_profile_idx
  on public.collaboration_project_invites (project_id, invited_profile_id)
  where status = 'pending' and invited_profile_id is not null;

create unique index collaboration_project_invites_pending_email_idx
  on public.collaboration_project_invites (project_id, lower(invited_email))
  where status = 'pending' and invited_email is not null;

create table public.collaboration_project_tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.collaboration_projects (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete restrict,
  active_version_id uuid references public.song_versions (id) on delete set null,
  track_title text not null,
  track_number integer not null,
  notes text,
  status text not null default 'idea',
  created_by uuid not null references public.profiles (id) on delete restrict,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint collaboration_project_tracks_number_key unique (project_id, track_number),
  constraint collaboration_project_tracks_number_check check (track_number > 0),
  constraint collaboration_project_tracks_title_check
    check (char_length(btrim(track_title)) between 1 and 160),
  constraint collaboration_project_tracks_status_check
    check (status in ('idea', 'draft', 'recording', 'arrangement', 'mixing', 'review', 'approved', 'final'))
);

create table public.collaboration_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.collaboration_projects (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  activity_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint collaboration_activity_type_check
    check (
      activity_type in (
        'project_created',
        'member_invited',
        'member_joined',
        'member_removed',
        'member_left',
        'role_changed',
        'ownership_transferred',
        'track_added',
        'track_removed',
        'track_reordered',
        'version_uploaded',
        'version_selected',
        'feedback_added',
        'feedback_resolved',
        'status_changed',
        'project_published',
        'project_archived'
      )
    )
);

alter table public.conversations
  add column project_id uuid references public.collaboration_projects (id) on delete cascade,
  add column history_visible_from timestamptz;

create unique index conversations_project_key
  on public.conversations (project_id)
  where kind = 'project';

alter table public.conversations
  add constraint conversations_project_shape_check
  check (
    (kind = 'direct' and project_id is null)
    or (kind = 'project' and project_id is not null)
  );

alter table public.song_versions
  add column owner_id uuid references public.profiles (id) on delete restrict,
  add column collaboration_project_id uuid references public.collaboration_projects (id) on delete set null,
  add column collaboration_track_id uuid references public.collaboration_project_tracks (id) on delete set null,
  add column sharing_mode text not null default 'private',
  add column review_status text not null default 'not_requested';

update public.song_versions as version
set owner_id = song.owner_id
from public.songs as song
where song.id = version.song_id
  and version.owner_id is null;

alter table public.song_versions
  alter column owner_id set not null,
  add constraint song_versions_sharing_mode_check
    check (sharing_mode in ('private', 'project_members', 'followers', 'public')),
  add constraint song_versions_review_status_check
    check (review_status in ('not_requested', 'review_requested', 'changes_requested', 'approved'));

create or replace function public.set_song_version_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

create trigger song_versions_set_owner
before insert on public.song_versions
for each row execute procedure public.set_song_version_owner();

alter table public.notifications
  add column project_id uuid references public.collaboration_projects (id) on delete cascade;

create index collaboration_projects_owner_updated_idx
  on public.collaboration_projects (owner_id, updated_at desc);
create index collaboration_projects_status_updated_idx
  on public.collaboration_projects (status, updated_at desc);
create index collaboration_members_profile_status_idx
  on public.collaboration_project_members (profile_id, membership_status, updated_at desc);
create index collaboration_tracks_project_number_idx
  on public.collaboration_project_tracks (project_id, track_number);
create index collaboration_tracks_song_idx
  on public.collaboration_project_tracks (song_id);
create index collaboration_activity_project_created_idx
  on public.collaboration_activity (project_id, created_at desc);
create index collaboration_invites_profile_status_idx
  on public.collaboration_project_invites (invited_profile_id, status, created_at desc);
create index song_versions_collaboration_project_idx
  on public.song_versions (collaboration_project_id, created_at desc)
  where collaboration_project_id is not null;
create index notifications_project_idx
  on public.notifications (project_id, created_at desc)
  where project_id is not null;

create trigger collaboration_projects_set_updated_at
before update on public.collaboration_projects
for each row execute procedure public.set_updated_at();

create trigger collaboration_project_members_set_updated_at
before update on public.collaboration_project_members
for each row execute procedure public.set_updated_at();

create trigger collaboration_project_tracks_set_updated_at
before update on public.collaboration_project_tracks
for each row execute procedure public.set_updated_at();

create or replace function public.collaboration_role_rank(member_role text)
returns integer
language sql
immutable
parallel safe
as $$
  select case member_role
    when 'viewer' then 10
    when 'reviewer' then 20
    when 'contributor' then 30
    when 'editor' then 40
    when 'admin' then 50
    when 'owner' then 60
    else 0
  end;
$$;

-- SECURITY DEFINER membership helpers avoid recursive RLS checks. They expose only booleans.
create or replace function public.collaboration_member_role(
  target_project_id uuid,
  target_profile_id uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select member.role
  from public.collaboration_project_members as member
  where member.project_id = target_project_id
    and member.profile_id = target_profile_id
    and member.membership_status = 'accepted'
  limit 1;
$$;

create or replace function public.can_view_collaboration_project(
  target_project_id uuid,
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
    from public.collaboration_projects as project
    where project.id = target_project_id
      and (
        project.owner_id = target_profile_id
        or exists (
          select 1
          from public.collaboration_project_members as member
          where member.project_id = project.id
            and member.profile_id = target_profile_id
            and member.membership_status = 'accepted'
        )
      )
  );
$$;

create or replace function public.can_edit_collaboration_project(
  target_project_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    public.collaboration_role_rank(
      public.collaboration_member_role(target_project_id, target_profile_id)
    ) >= public.collaboration_role_rank('editor'),
    false
  );
$$;

create or replace function public.can_manage_collaboration_members(
  target_project_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    public.collaboration_role_rank(
      public.collaboration_member_role(target_project_id, target_profile_id)
    ) >= public.collaboration_role_rank('admin'),
    false
  );
$$;

create or replace function public.can_upload_project_version(
  target_project_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    public.collaboration_role_rank(
      public.collaboration_member_role(target_project_id, target_profile_id)
    ) >= public.collaboration_role_rank('contributor'),
    false
  );
$$;

create or replace function public.can_review_project(
  target_project_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    public.collaboration_member_role(target_project_id, target_profile_id)
      in ('owner', 'admin', 'editor', 'contributor', 'reviewer'),
    false
  );
$$;

create or replace function public.create_collaboration_project(
  project_title text,
  project_kind text,
  project_description text default null,
  project_visibility text default 'private'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  new_project_id uuid;
  new_conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if project_kind not in ('single', 'ep', 'album', 'loose_collection') then
    raise exception 'Unsupported project type.';
  end if;

  if project_visibility not in ('private', 'members_only', 'link_invite') then
    raise exception 'Unsupported project visibility.';
  end if;

  if not (char_length(btrim(project_title)) between 1 and 160) then
    raise exception 'Project title must contain between 1 and 160 characters.';
  end if;

  if (
    select count(*)
    from public.collaboration_projects
    where owner_id = current_user_id
      and archived_at is null
  ) >= 25 then
    raise exception 'The active collaboration project quota has been reached.';
  end if;

  insert into public.collaboration_projects (
    owner_id,
    project_type,
    title,
    description,
    visibility,
    status
  )
  values (
    current_user_id,
    project_kind,
    btrim(project_title),
    nullif(btrim(project_description), ''),
    project_visibility,
    'planning'
  )
  returning id into new_project_id;

  insert into public.collaboration_project_members (
    project_id,
    profile_id,
    role,
    membership_status,
    invited_by,
    joined_at
  )
  values (
    new_project_id,
    current_user_id,
    'owner',
    'accepted',
    current_user_id,
    timezone('utc', now())
  );

  insert into public.conversations (kind, project_id)
  values ('project', new_project_id)
  returning id into new_conversation_id;

  insert into public.conversation_members (conversation_id, profile_id)
  values (new_conversation_id, current_user_id);

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id
  )
  values (
    new_project_id,
    current_user_id,
    'project_created',
    'project',
    new_project_id
  );

  return new_project_id;
end;
$$;

create or replace function public.invite_project_member(
  target_project_id uuid,
  target_role text,
  target_profile_id uuid default null,
  target_email text default null,
  expires_in_days integer default 14
)
returns table (invite_id uuid, invite_token text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  actor_role text;
  raw_token text;
  new_invite_id uuid;
begin
  actor_role := public.collaboration_member_role(target_project_id, current_user_id);

  if actor_role not in ('owner', 'admin') then
    raise exception 'You cannot manage members for this project.';
  end if;

  if target_role not in ('admin', 'editor', 'contributor', 'reviewer', 'viewer') then
    raise exception 'Unsupported project role.';
  end if;

  if actor_role = 'admin' and target_role = 'admin' then
    raise exception 'Only the owner can assign the admin role.';
  end if;

  if target_profile_id is null and nullif(btrim(target_email), '') is null then
    raise exception 'Choose a profile or provide an email address.';
  end if;

  if target_profile_id = current_user_id then
    raise exception 'You are already a member of this project.';
  end if;

  if (
    select count(*)
    from public.collaboration_project_members
    where project_id = target_project_id
      and membership_status in ('invited', 'accepted')
  ) >= 25 then
    raise exception 'The project member quota has been reached.';
  end if;

  if target_profile_id is not null and exists (
    select 1
    from public.collaboration_project_members
    where project_id = target_project_id
      and profile_id = target_profile_id
      and membership_status in ('invited', 'accepted')
  ) then
    raise exception 'This profile already belongs to the project.';
  end if;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.collaboration_project_invites (
    project_id,
    invited_by,
    invited_profile_id,
    invited_email,
    invite_token_hash,
    role,
    expires_at
  )
  values (
    target_project_id,
    current_user_id,
    target_profile_id,
    nullif(lower(btrim(target_email)), ''),
    encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    target_role,
    timezone('utc', now()) + make_interval(days => greatest(1, least(expires_in_days, 30)))
  )
  returning id into new_invite_id;

  if target_profile_id is not null then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      project_id
    )
    values (
      target_profile_id,
      current_user_id,
      'project_invite',
      target_project_id
    );
  end if;

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_project_id,
    current_user_id,
    'member_invited',
    'invite',
    new_invite_id,
    jsonb_build_object('role', target_role)
  );

  return query select new_invite_id, raw_token;
end;
$$;

create or replace function public.resolve_project_invite(invite_token text)
returns table (
  invite_id uuid,
  project_id uuid,
  project_title text,
  project_type text,
  role text,
  status text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    invite.id,
    invite.project_id,
    project.title,
    project.project_type,
    invite.role,
    case
      when invite.status = 'pending' and invite.expires_at <= timezone('utc', now()) then 'expired'
      else invite.status
    end,
    invite.expires_at
  from public.collaboration_project_invites as invite
  join public.collaboration_projects as project on project.id = invite.project_id
  where invite.invite_token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
  limit 1;
$$;

create or replace function public.list_pending_project_invites()
returns table (
  invite_id uuid,
  project_id uuid,
  project_title text,
  project_type text,
  role text,
  invited_by uuid,
  inviter_name text,
  expires_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    invite.id,
    invite.project_id,
    project.title,
    project.project_type,
    invite.role,
    invite.invited_by,
    inviter.display_name,
    invite.expires_at,
    invite.created_at
  from public.collaboration_project_invites as invite
  join public.collaboration_projects as project on project.id = invite.project_id
  join public.profiles as inviter on inviter.id = invite.invited_by
  where invite.invited_profile_id = auth.uid()
    and invite.status = 'pending'
    and invite.expires_at > timezone('utc', now())
  order by invite.created_at desc;
$$;

create or replace function public.accept_project_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_invite public.collaboration_project_invites%rowtype;
  project_conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into target_invite
  from public.collaboration_project_invites
  where invite_token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
  for update;

  if target_invite.id is null then
    raise exception 'Invitation not found.';
  end if;

  if target_invite.status <> 'pending' then
    raise exception 'This invitation can no longer be accepted.';
  end if;

  if target_invite.expires_at <= timezone('utc', now()) then
    update public.collaboration_project_invites
    set status = 'expired'
    where id = target_invite.id;
    raise exception 'This invitation has expired.';
  end if;

  if target_invite.invited_profile_id is not null
    and target_invite.invited_profile_id <> current_user_id then
    raise exception 'This invitation belongs to another account.';
  end if;

  insert into public.collaboration_project_members (
    project_id,
    profile_id,
    role,
    membership_status,
    invited_by,
    joined_at
  )
  values (
    target_invite.project_id,
    current_user_id,
    target_invite.role,
    'accepted',
    target_invite.invited_by,
    timezone('utc', now())
  )
  on conflict (project_id, profile_id)
  do update set
    role = excluded.role,
    membership_status = 'accepted',
    invited_by = excluded.invited_by,
    joined_at = timezone('utc', now()),
    updated_at = timezone('utc', now());

  update public.collaboration_project_invites
  set
    invited_profile_id = current_user_id,
    status = 'accepted',
    accepted_at = timezone('utc', now())
  where id = target_invite.id;

  select id
  into project_conversation_id
  from public.conversations
  where project_id = target_invite.project_id
    and kind = 'project';

  insert into public.conversation_members (conversation_id, profile_id)
  values (project_conversation_id, current_user_id)
  on conflict do nothing;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    project_id
  )
  values (
    target_invite.invited_by,
    current_user_id,
    'project_invite_accepted',
    target_invite.project_id
  );

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_invite.project_id,
    current_user_id,
    'member_joined',
    'profile',
    current_user_id,
    jsonb_build_object('role', target_invite.role)
  );

  return target_invite.project_id;
end;
$$;

create or replace function public.decline_project_invite(invite_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
begin
  update public.collaboration_project_invites
  set status = 'declined'
  where invite_token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
    and status = 'pending'
    and (invited_profile_id is null or invited_profile_id = current_user_id);

  if not found then
    raise exception 'This invitation cannot be declined.';
  end if;
end;
$$;

create or replace function public.accept_project_invite_by_id(target_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_invite public.collaboration_project_invites%rowtype;
  project_conversation_id uuid;
begin
  select *
  into target_invite
  from public.collaboration_project_invites
  where id = target_invite_id
    and invited_profile_id = current_user_id
  for update;

  if target_invite.id is null
    or target_invite.status <> 'pending'
    or target_invite.expires_at <= timezone('utc', now()) then
    raise exception 'This invitation can no longer be accepted.';
  end if;

  insert into public.collaboration_project_members (
    project_id,
    profile_id,
    role,
    membership_status,
    invited_by,
    joined_at
  )
  values (
    target_invite.project_id,
    current_user_id,
    target_invite.role,
    'accepted',
    target_invite.invited_by,
    timezone('utc', now())
  )
  on conflict (project_id, profile_id)
  do update set
    role = excluded.role,
    membership_status = 'accepted',
    invited_by = excluded.invited_by,
    joined_at = timezone('utc', now()),
    updated_at = timezone('utc', now());

  update public.collaboration_project_invites
  set
    status = 'accepted',
    accepted_at = timezone('utc', now())
  where id = target_invite.id;

  select id into project_conversation_id
  from public.conversations
  where project_id = target_invite.project_id
    and kind = 'project';

  insert into public.conversation_members (conversation_id, profile_id)
  values (project_conversation_id, current_user_id)
  on conflict do nothing;

  insert into public.notifications (recipient_id, actor_id, type, project_id)
  values (
    target_invite.invited_by,
    current_user_id,
    'project_invite_accepted',
    target_invite.project_id
  );

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_invite.project_id,
    current_user_id,
    'member_joined',
    'profile',
    current_user_id,
    jsonb_build_object('role', target_invite.role)
  );

  return target_invite.project_id;
end;
$$;

create or replace function public.decline_project_invite_by_id(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.collaboration_project_invites
  set status = 'declined'
  where id = target_invite_id
    and invited_profile_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'This invitation cannot be declined.';
  end if;
end;
$$;

create or replace function public.remove_project_member(
  target_project_id uuid,
  target_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  actor_role text := public.collaboration_member_role(target_project_id, current_user_id);
  target_role text := public.collaboration_member_role(target_project_id, target_profile_id);
  project_conversation_id uuid;
begin
  if actor_role not in ('owner', 'admin') then
    raise exception 'You cannot manage members for this project.';
  end if;

  if target_role is null then
    raise exception 'Project member not found.';
  end if;

  if target_role = 'owner' then
    raise exception 'The project owner cannot be removed.';
  end if;

  if actor_role = 'admin' and target_role = 'admin' then
    raise exception 'Admins cannot remove other admins.';
  end if;

  update public.collaboration_project_members
  set
    membership_status = 'removed',
    updated_at = timezone('utc', now())
  where project_id = target_project_id
    and profile_id = target_profile_id;

  select id into project_conversation_id
  from public.conversations
  where project_id = target_project_id
    and kind = 'project';

  delete from public.conversation_members
  where conversation_id = project_conversation_id
    and profile_id = target_profile_id;

  insert into public.notifications (recipient_id, actor_id, type, project_id)
  values (target_profile_id, current_user_id, 'project_member_removed', target_project_id);

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id
  )
  values (
    target_project_id,
    current_user_id,
    'member_removed',
    'profile',
    target_profile_id
  );
end;
$$;

create or replace function public.change_project_member_role(
  target_project_id uuid,
  target_profile_id uuid,
  next_role text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  actor_role text := public.collaboration_member_role(target_project_id, current_user_id);
  current_target_role text := public.collaboration_member_role(target_project_id, target_profile_id);
begin
  if actor_role not in ('owner', 'admin') then
    raise exception 'You cannot manage project roles.';
  end if;

  if next_role not in ('admin', 'editor', 'contributor', 'reviewer', 'viewer') then
    raise exception 'Unsupported project role.';
  end if;

  if current_target_role is null or current_target_role = 'owner' then
    raise exception 'The selected role cannot be changed.';
  end if;

  if actor_role = 'admin' and (
    current_target_role = 'admin'
    or next_role = 'admin'
  ) then
    raise exception 'Only the owner can manage admin roles.';
  end if;

  update public.collaboration_project_members
  set role = next_role
  where project_id = target_project_id
    and profile_id = target_profile_id
    and membership_status = 'accepted';

  insert into public.notifications (recipient_id, actor_id, type, project_id)
  values (target_profile_id, current_user_id, 'project_role_changed', target_project_id);

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_project_id,
    current_user_id,
    'role_changed',
    'profile',
    target_profile_id,
    jsonb_build_object('previous_role', current_target_role, 'role', next_role)
  );
end;
$$;

create or replace function public.leave_collaboration_project(target_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  member_role text := public.collaboration_member_role(target_project_id, current_user_id);
  project_conversation_id uuid;
begin
  if member_role is null then
    raise exception 'You are not an active member of this project.';
  end if;

  if member_role = 'owner' then
    raise exception 'Transfer project ownership before leaving.';
  end if;

  update public.collaboration_project_members
  set membership_status = 'removed'
  where project_id = target_project_id
    and profile_id = current_user_id;

  select id into project_conversation_id
  from public.conversations
  where project_id = target_project_id
    and kind = 'project';

  delete from public.conversation_members
  where conversation_id = project_conversation_id
    and profile_id = current_user_id;

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id
  )
  values (
    target_project_id,
    current_user_id,
    'member_left',
    'profile',
    current_user_id
  );
end;
$$;

create or replace function public.transfer_project_ownership(
  target_project_id uuid,
  next_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if public.collaboration_member_role(target_project_id, current_user_id) <> 'owner' then
    raise exception 'Only the project owner can transfer ownership.';
  end if;

  if public.collaboration_member_role(target_project_id, next_owner_id) is null then
    raise exception 'The next owner must be an accepted project member.';
  end if;

  update public.collaboration_project_members
  set role = 'admin'
  where project_id = target_project_id
    and profile_id = current_user_id;

  update public.collaboration_project_members
  set role = 'owner'
  where project_id = target_project_id
    and profile_id = next_owner_id;

  update public.collaboration_projects
  set owner_id = next_owner_id
  where id = target_project_id;

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_project_id,
    current_user_id,
    'ownership_transferred',
    'profile',
    next_owner_id,
    jsonb_build_object('previous_owner_id', current_user_id)
  );
end;
$$;

create or replace function public.add_project_track(
  target_project_id uuid,
  target_song_id uuid,
  target_version_id uuid default null,
  target_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  next_track_number integer;
  new_track_id uuid;
  song_title text;
begin
  if not public.can_edit_collaboration_project(target_project_id, current_user_id) then
    raise exception 'You cannot edit the track list for this project.';
  end if;

  select title into song_title
  from public.songs
  where id = target_song_id
    and (
      owner_id = current_user_id
      or exists (
        select 1
        from public.song_versions
        where song_id = target_song_id
          and collaboration_project_id = target_project_id
      )
    );

  if song_title is null then
    raise exception 'Song not found or unavailable.';
  end if;

  if target_version_id is not null and not exists (
    select 1
    from public.song_versions
    where id = target_version_id
      and song_id = target_song_id
  ) then
    raise exception 'The selected version does not belong to this song.';
  end if;

  select coalesce(max(track_number), 0) + 1
  into next_track_number
  from public.collaboration_project_tracks
  where project_id = target_project_id;

  insert into public.collaboration_project_tracks (
    project_id,
    song_id,
    active_version_id,
    track_title,
    track_number,
    created_by
  )
  values (
    target_project_id,
    target_song_id,
    target_version_id,
    coalesce(nullif(btrim(target_title), ''), song_title),
    next_track_number,
    current_user_id
  )
  returning id into new_track_id;

  if target_version_id is not null then
    update public.song_versions
    set
      collaboration_project_id = target_project_id,
      collaboration_track_id = new_track_id,
      sharing_mode = 'project_members'
    where id = target_version_id;
  end if;

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_project_id,
    current_user_id,
    'track_added',
    'track',
    new_track_id,
    jsonb_build_object('track_number', next_track_number)
  );

  return new_track_id;
end;
$$;

create or replace function public.reorder_project_tracks(
  target_project_id uuid,
  ordered_track_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  existing_count integer;
  requested_count integer;
begin
  if not public.can_edit_collaboration_project(target_project_id, current_user_id) then
    raise exception 'You cannot reorder this project.';
  end if;

  select count(*) into existing_count
  from public.collaboration_project_tracks
  where project_id = target_project_id;

  select count(distinct track_id) into requested_count
  from unnest(ordered_track_ids) as track_id;

  if existing_count <> requested_count or exists (
    select 1
    from unnest(ordered_track_ids) as requested(track_id)
    left join public.collaboration_project_tracks as track
      on track.id = requested.track_id
      and track.project_id = target_project_id
    where track.id is null
  ) then
    raise exception 'The supplied track order is incomplete or invalid.';
  end if;

  -- Move through negative values first to preserve the unique project/track-number constraint.
  update public.collaboration_project_tracks
  set track_number = -track_number
  where project_id = target_project_id;

  update public.collaboration_project_tracks as track
  set track_number = requested.position
  from unnest(ordered_track_ids) with ordinality as requested(track_id, position)
  where track.id = requested.track_id
    and track.project_id = target_project_id;

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_project_id,
    current_user_id,
    'track_reordered',
    'project',
    target_project_id,
    jsonb_build_object('track_ids', ordered_track_ids)
  );
end;
$$;

create or replace function public.select_project_track_version(
  target_project_id uuid,
  target_track_id uuid,
  target_version_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_song_id uuid;
begin
  if not public.can_edit_collaboration_project(target_project_id, current_user_id) then
    raise exception 'You cannot select versions for this project.';
  end if;

  select song_id into target_song_id
  from public.collaboration_project_tracks
  where id = target_track_id
    and project_id = target_project_id;

  if target_song_id is null or not exists (
    select 1
    from public.song_versions
    where id = target_version_id
      and song_id = target_song_id
  ) then
    raise exception 'The selected version is unavailable for this track.';
  end if;

  update public.collaboration_project_tracks
  set active_version_id = target_version_id
  where id = target_track_id
    and project_id = target_project_id;

  update public.song_versions
  set
    collaboration_project_id = target_project_id,
    collaboration_track_id = target_track_id,
    sharing_mode = 'project_members'
  where id = target_version_id;

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_project_id,
    current_user_id,
    'version_selected',
    'track',
    target_track_id,
    jsonb_build_object('song_version_id', target_version_id)
  );
end;
$$;

create or replace function public.update_project_status(
  target_project_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  previous_status text;
begin
  if not public.can_edit_collaboration_project(target_project_id, current_user_id) then
    raise exception 'You cannot update this project.';
  end if;

  if next_status not in ('planning', 'active', 'review', 'finalizing', 'completed', 'archived') then
    raise exception 'Unsupported project status.';
  end if;

  select status into previous_status
  from public.collaboration_projects
  where id = target_project_id
  for update;

  update public.collaboration_projects
  set
    status = next_status,
    archived_at = case
      when next_status = 'archived' then timezone('utc', now())
      else null
    end
  where id = target_project_id;

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_project_id,
    current_user_id,
    case when next_status = 'archived' then 'project_archived' else 'status_changed' end,
    'project',
    target_project_id,
    jsonb_build_object('previous_status', previous_status, 'status', next_status)
  );

  insert into public.notifications (recipient_id, actor_id, type, project_id)
  select
    member.profile_id,
    current_user_id,
    'project_status_changed',
    target_project_id
  from public.collaboration_project_members as member
  where member.project_id = target_project_id
    and member.membership_status = 'accepted'
    and member.profile_id <> current_user_id;
end;
$$;

alter table public.collaboration_projects enable row level security;
alter table public.collaboration_project_members enable row level security;
alter table public.collaboration_project_invites enable row level security;
alter table public.collaboration_project_tracks enable row level security;
alter table public.collaboration_activity enable row level security;

create policy "collaboration projects visible to accepted members"
on public.collaboration_projects for select
using (public.can_view_collaboration_project(id, auth.uid()));

create policy "collaboration projects editable by editors"
on public.collaboration_projects for update
using (public.can_edit_collaboration_project(id, auth.uid()))
with check (public.can_edit_collaboration_project(id, auth.uid()));

create policy "collaboration projects deletable by owner"
on public.collaboration_projects for delete
using (owner_id = auth.uid());

create policy "collaboration members visible to project members"
on public.collaboration_project_members for select
using (public.can_view_collaboration_project(project_id, auth.uid()));

create policy "collaboration invites visible to managers or invitee"
on public.collaboration_project_invites for select
using (
  public.can_manage_collaboration_members(project_id, auth.uid())
  or invited_profile_id = auth.uid()
);

create policy "collaboration tracks visible to members"
on public.collaboration_project_tracks for select
using (public.can_view_collaboration_project(project_id, auth.uid()));

create policy "collaboration tracks insert by editors"
on public.collaboration_project_tracks for insert
with check (
  public.can_edit_collaboration_project(project_id, auth.uid())
  and created_by = auth.uid()
);

create policy "collaboration tracks update by editors"
on public.collaboration_project_tracks for update
using (public.can_edit_collaboration_project(project_id, auth.uid()))
with check (public.can_edit_collaboration_project(project_id, auth.uid()));

create policy "collaboration tracks delete by editors"
on public.collaboration_project_tracks for delete
using (public.can_edit_collaboration_project(project_id, auth.uid()));

create policy "collaboration activity visible to members"
on public.collaboration_activity for select
using (public.can_view_collaboration_project(project_id, auth.uid()));

drop policy if exists "songs owner only" on public.songs;
create policy "songs owner or collaboration member"
on public.songs for select
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.collaboration_project_tracks as track
    where track.song_id = songs.id
      and public.can_view_collaboration_project(track.project_id, auth.uid())
  )
);

drop policy if exists "song versions owner or published single" on public.song_versions;
create policy "song versions owner project member or published"
on public.song_versions for select
using (
  owner_id = auth.uid()
  or is_published = true
  or (
    collaboration_project_id is not null
    and sharing_mode = 'project_members'
    and public.can_view_collaboration_project(collaboration_project_id, auth.uid())
  )
);

drop policy if exists "song versions insert via owner" on public.song_versions;
create policy "song versions insert via owner or project contributor"
on public.song_versions for insert
with check (
  owner_id = auth.uid()
  and (
    exists (
      select 1
      from public.songs
      where songs.id = song_versions.song_id
        and songs.owner_id = auth.uid()
    )
    or (
      collaboration_project_id is not null
      and public.can_upload_project_version(collaboration_project_id, auth.uid())
    )
  )
);

drop policy if exists "song versions update via owner" on public.song_versions;
create policy "song versions update via owner or project editor"
on public.song_versions for update
using (
  owner_id = auth.uid()
  or (
    collaboration_project_id is not null
    and public.can_edit_collaboration_project(collaboration_project_id, auth.uid())
  )
)
with check (
  owner_id = auth.uid()
  or (
    collaboration_project_id is not null
    and public.can_edit_collaboration_project(collaboration_project_id, auth.uid())
  )
);

grant execute on function public.collaboration_member_role(uuid, uuid) to authenticated;
grant execute on function public.can_view_collaboration_project(uuid, uuid) to authenticated;
grant execute on function public.can_edit_collaboration_project(uuid, uuid) to authenticated;
grant execute on function public.can_manage_collaboration_members(uuid, uuid) to authenticated;
grant execute on function public.can_upload_project_version(uuid, uuid) to authenticated;
grant execute on function public.can_review_project(uuid, uuid) to authenticated;
grant execute on function public.create_collaboration_project(text, text, text, text) to authenticated;
grant execute on function public.invite_project_member(uuid, text, uuid, text, integer) to authenticated;
grant execute on function public.resolve_project_invite(text) to authenticated;
grant execute on function public.list_pending_project_invites() to authenticated;
grant execute on function public.accept_project_invite(text) to authenticated;
grant execute on function public.decline_project_invite(text) to authenticated;
grant execute on function public.accept_project_invite_by_id(uuid) to authenticated;
grant execute on function public.decline_project_invite_by_id(uuid) to authenticated;
grant execute on function public.remove_project_member(uuid, uuid) to authenticated;
grant execute on function public.change_project_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.leave_collaboration_project(uuid) to authenticated;
grant execute on function public.transfer_project_ownership(uuid, uuid) to authenticated;
grant execute on function public.add_project_track(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.reorder_project_tracks(uuid, uuid[]) to authenticated;
grant execute on function public.select_project_track_version(uuid, uuid, uuid) to authenticated;
grant execute on function public.update_project_status(uuid, text) to authenticated;
