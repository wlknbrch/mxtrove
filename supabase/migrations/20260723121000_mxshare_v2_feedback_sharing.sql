-- MxShare V2: protected derivatives, timed feedback, follower/unlisted visibility, and share links.

alter table public.posts
  drop constraint if exists posts_visibility_check;

alter table public.posts
  add constraint posts_visibility_check
  check (visibility in ('private', 'followers', 'unlisted', 'public'));

create table public.protected_media_quotas (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  used_bytes bigint not null default 0,
  reserved_bytes bigint not null default 0,
  attachment_used_bytes bigint not null default 0,
  attachment_reserved_bytes bigint not null default 0,
  protected_limit_bytes bigint not null default 2147483648,
  attachment_limit_bytes bigint not null default 524288000,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint protected_media_quotas_nonnegative_check
    check (
      used_bytes >= 0
      and reserved_bytes >= 0
      and attachment_used_bytes >= 0
      and attachment_reserved_bytes >= 0
      and protected_limit_bytes > 0
      and attachment_limit_bytes > 0
    )
);

create table public.protected_media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  storage_provider text not null default 'local',
  storage_key text not null unique,
  purpose text not null,
  status text not null default 'reserved',
  filename text not null,
  mime_type text not null,
  bytes bigint,
  reserved_bytes bigint not null default 0,
  checksum text,
  duration_seconds numeric(10, 3),
  width integer,
  height integer,
  waveform_data jsonb,
  source_asset_id uuid references public.assets (id) on delete set null,
  post_id uuid references public.posts (id) on delete cascade,
  project_id uuid references public.collaboration_projects (id) on delete cascade,
  song_version_id uuid references public.song_versions (id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  ready_at timestamptz,
  deleted_at timestamptz,
  constraint protected_media_assets_provider_check
    check (storage_provider in ('local', 's3')),
  constraint protected_media_assets_purpose_check
    check (
      purpose in (
        'post_preview',
        'collaboration_preview',
        'message_audio',
        'message_image',
        'message_document',
        'social_preview',
        'data_export'
      )
    ),
  constraint protected_media_assets_status_check
    check (status in ('reserved', 'processing', 'ready', 'failed', 'deleted')),
  constraint protected_media_assets_bytes_check
    check (
      coalesce(bytes, 0) >= 0
      and reserved_bytes >= 0
    ),
  constraint protected_media_assets_storage_key_check
    check (storage_key ~ '^[a-z0-9][a-z0-9/_-]{8,220}$')
);

alter table public.song_versions
  add column protected_preview_asset_id uuid references public.protected_media_assets (id) on delete set null;

create table public.feedback_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.collaboration_projects (id) on delete cascade,
  track_id uuid not null references public.collaboration_project_tracks (id) on delete cascade,
  song_version_id uuid not null references public.song_versions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  start_seconds numeric(10, 3) not null,
  end_seconds numeric(10, 3),
  title text,
  body text not null,
  category text not null default 'general',
  priority text not null default 'normal',
  status text not null default 'open',
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  constraint feedback_threads_time_check
    check (
      start_seconds >= 0
      and (end_seconds is null or end_seconds >= start_seconds)
    ),
  constraint feedback_threads_body_check
    check (char_length(btrim(body)) between 1 and 5000),
  constraint feedback_threads_category_check
    check (category in ('general', 'arrangement', 'mix', 'vocals', 'lyrics', 'sound_design', 'mastering', 'performance', 'technical')),
  constraint feedback_threads_priority_check
    check (priority in ('low', 'normal', 'high', 'blocking')),
  constraint feedback_threads_status_check
    check (status in ('open', 'in_progress', 'resolved', 'wont_fix'))
);

create table public.feedback_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.feedback_threads (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint feedback_replies_body_check
    check (char_length(btrim(body)) between 1 and 5000)
);

create table public.feedback_reactions (
  thread_id uuid not null references public.feedback_threads (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (thread_id, profile_id, reaction),
  constraint feedback_reactions_reaction_check
    check (reaction in ('agree', 'disagree', 'done', 'important'))
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  token_hash text not null unique,
  permission text not null default 'view',
  expires_at timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  constraint share_links_target_type_check
    check (target_type in ('post', 'collaboration_project', 'song_version')),
  constraint share_links_permission_check
    check (permission in ('view', 'review')),
  constraint share_links_usage_check
    check (use_count >= 0 and (max_uses is null or max_uses > 0))
);

create table public.share_link_access_logs (
  id bigint generated always as identity primary key,
  share_link_id uuid not null references public.share_links (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  accessed_at timestamptz not null default timezone('utc', now()),
  access_kind text not null default 'view',
  user_agent_hash text,
  constraint share_link_access_logs_kind_check
    check (access_kind in ('view', 'review', 'media'))
);

create index protected_media_owner_status_idx
  on public.protected_media_assets (owner_id, status, created_at desc);
create index protected_media_post_idx
  on public.protected_media_assets (post_id)
  where post_id is not null and deleted_at is null;
create index protected_media_project_idx
  on public.protected_media_assets (project_id)
  where project_id is not null and deleted_at is null;
create index protected_media_version_idx
  on public.protected_media_assets (song_version_id)
  where song_version_id is not null and deleted_at is null;
create index feedback_threads_project_status_idx
  on public.feedback_threads (project_id, status, created_at desc);
create index feedback_threads_version_time_idx
  on public.feedback_threads (song_version_id, start_seconds);
create index feedback_replies_thread_created_idx
  on public.feedback_replies (thread_id, created_at);
create index share_links_owner_target_idx
  on public.share_links (owner_id, target_type, target_id, created_at desc);
create index share_link_access_logs_link_idx
  on public.share_link_access_logs (share_link_id, accessed_at desc);

create trigger protected_media_quotas_set_updated_at
before update on public.protected_media_quotas
for each row execute procedure public.set_updated_at();

create trigger feedback_threads_set_updated_at
before update on public.feedback_threads
for each row execute procedure public.set_updated_at();

create trigger feedback_replies_set_updated_at
before update on public.feedback_replies
for each row execute procedure public.set_updated_at();

create or replace function public.ensure_protected_media_quota()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.protected_media_quotas (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

create trigger profiles_create_protected_media_quota
after insert on public.profiles
for each row execute procedure public.ensure_protected_media_quota();

insert into public.protected_media_quotas (profile_id)
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
  -- Replaced by the privacy migration once profile_blocks exists.
  select false;
$$;

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
    where post.id = target_post_id
      and not public.is_profile_blocked_pair(post.owner_id, target_profile_id)
      and (
        post.owner_id = target_profile_id
        or post.visibility = 'public'
        or (
          post.visibility = 'followers'
          and exists (
            select 1
            from public.follows
            where follower_id = target_profile_id
              and followed_id = post.owner_id
          )
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

create or replace function public.reserve_protected_media_asset(
  target_owner_id uuid,
  target_purpose text,
  target_filename text,
  target_mime_type text,
  expected_bytes bigint,
  target_source_asset_id uuid default null,
  target_post_id uuid default null,
  target_project_id uuid default null,
  target_song_version_id uuid default null,
  target_expires_at timestamptz default null
)
returns public.protected_media_assets
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  quota public.protected_media_quotas%rowtype;
  new_asset public.protected_media_assets%rowtype;
  safe_expected_bytes bigint := greatest(coalesce(expected_bytes, 0), 0);
  is_attachment boolean := target_purpose in ('message_audio', 'message_image', 'message_document');
begin
  if target_purpose not in (
    'post_preview',
    'collaboration_preview',
    'message_audio',
    'message_image',
    'message_document',
    'social_preview',
    'data_export'
  ) then
    raise exception 'Unsupported protected media purpose.';
  end if;

  insert into public.protected_media_quotas (profile_id)
  values (target_owner_id)
  on conflict (profile_id) do nothing;

  select *
  into quota
  from public.protected_media_quotas
  where profile_id = target_owner_id
  for update;

  if quota.used_bytes + quota.reserved_bytes + safe_expected_bytes > quota.protected_limit_bytes then
    raise exception 'Protected media quota exceeded.';
  end if;

  if is_attachment
    and quota.attachment_used_bytes + quota.attachment_reserved_bytes + safe_expected_bytes > quota.attachment_limit_bytes then
    raise exception 'Message attachment quota exceeded.';
  end if;

  insert into public.protected_media_assets (
    owner_id,
    storage_key,
    purpose,
    status,
    filename,
    mime_type,
    reserved_bytes,
    source_asset_id,
    post_id,
    project_id,
    song_version_id,
    expires_at
  )
  values (
    target_owner_id,
    lower(target_owner_id::text) || '/' || lower(gen_random_uuid()::text),
    target_purpose,
    'reserved',
    left(regexp_replace(target_filename, '[[:cntrl:]/\\]+', '_', 'g'), 240),
    lower(target_mime_type),
    safe_expected_bytes,
    target_source_asset_id,
    target_post_id,
    target_project_id,
    target_song_version_id,
    target_expires_at
  )
  returning * into new_asset;

  update public.protected_media_quotas
  set
    reserved_bytes = reserved_bytes + safe_expected_bytes,
    attachment_reserved_bytes = attachment_reserved_bytes + case when is_attachment then safe_expected_bytes else 0 end
  where profile_id = target_owner_id;

  return new_asset;
end;
$$;

create or replace function public.finalize_protected_media_asset(
  target_asset_id uuid,
  actual_bytes bigint,
  target_checksum text default null,
  target_duration_seconds numeric default null,
  target_width integer default null,
  target_height integer default null,
  target_waveform_data jsonb default null
)
returns public.protected_media_assets
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  asset public.protected_media_assets%rowtype;
  quota public.protected_media_quotas%rowtype;
  safe_actual_bytes bigint := greatest(coalesce(actual_bytes, 0), 0);
  is_attachment boolean;
begin
  select *
  into asset
  from public.protected_media_assets
  where id = target_asset_id
  for update;

  if asset.id is null or asset.status not in ('reserved', 'processing') then
    raise exception 'Protected media reservation is unavailable.';
  end if;

  select *
  into quota
  from public.protected_media_quotas
  where profile_id = asset.owner_id
  for update;

  is_attachment := asset.purpose in ('message_audio', 'message_image', 'message_document');

  if quota.used_bytes + greatest(0, quota.reserved_bytes - asset.reserved_bytes) + safe_actual_bytes > quota.protected_limit_bytes then
    raise exception 'Protected media quota exceeded.';
  end if;

  if is_attachment
    and quota.attachment_used_bytes
      + greatest(0, quota.attachment_reserved_bytes - asset.reserved_bytes)
      + safe_actual_bytes > quota.attachment_limit_bytes then
    raise exception 'Message attachment quota exceeded.';
  end if;

  update public.protected_media_quotas
  set
    reserved_bytes = greatest(0, reserved_bytes - asset.reserved_bytes),
    attachment_reserved_bytes = greatest(
      0,
      attachment_reserved_bytes - case when is_attachment then asset.reserved_bytes else 0 end
    ),
    used_bytes = used_bytes + safe_actual_bytes,
    attachment_used_bytes = attachment_used_bytes + case when is_attachment then safe_actual_bytes else 0 end
  where profile_id = asset.owner_id;

  update public.protected_media_assets
  set
    status = 'ready',
    bytes = safe_actual_bytes,
    reserved_bytes = 0,
    checksum = target_checksum,
    duration_seconds = target_duration_seconds,
    width = target_width,
    height = target_height,
    waveform_data = target_waveform_data,
    ready_at = timezone('utc', now())
  where id = target_asset_id
  returning * into asset;

  return asset;
end;
$$;

create or replace function public.release_protected_media_asset(target_asset_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  asset public.protected_media_assets%rowtype;
  storage_key_to_delete text;
  is_attachment boolean;
begin
  select *
  into asset
  from public.protected_media_assets
  where id = target_asset_id
  for update;

  if asset.id is null then
    return null;
  end if;

  storage_key_to_delete := asset.storage_key;
  is_attachment := asset.purpose in ('message_audio', 'message_image', 'message_document');

  update public.protected_media_quotas
  set
    reserved_bytes = greatest(0, reserved_bytes - case when asset.status in ('reserved', 'processing') then asset.reserved_bytes else 0 end),
    attachment_reserved_bytes = greatest(
      0,
      attachment_reserved_bytes - case
        when asset.status in ('reserved', 'processing') and is_attachment then asset.reserved_bytes
        else 0
      end
    ),
    used_bytes = greatest(0, used_bytes - case when asset.status = 'ready' then coalesce(asset.bytes, 0) else 0 end),
    attachment_used_bytes = greatest(
      0,
      attachment_used_bytes - case
        when asset.status = 'ready' and is_attachment then coalesce(asset.bytes, 0)
        else 0
      end
    )
  where profile_id = asset.owner_id;

  update public.protected_media_assets
  set
    status = 'deleted',
    deleted_at = timezone('utc', now()),
    reserved_bytes = 0
  where id = target_asset_id;

  return storage_key_to_delete;
end;
$$;

create or replace function public.can_access_protected_media(
  target_asset_id uuid,
  target_profile_id uuid default auth.uid(),
  supplied_share_token text default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.protected_media_assets as asset
    where asset.id = target_asset_id
      and asset.status = 'ready'
      and asset.deleted_at is null
      and (asset.expires_at is null or asset.expires_at > timezone('utc', now()))
      and not public.is_profile_blocked_pair(asset.owner_id, target_profile_id)
      and (
        asset.owner_id = target_profile_id
        or (
          asset.post_id is not null
          and public.can_view_post(asset.post_id, target_profile_id)
        )
        or (
          asset.project_id is not null
          and public.can_view_collaboration_project(asset.project_id, target_profile_id)
        )
        or (
          supplied_share_token is not null
          and exists (
            select 1
            from public.share_links as share_link
            where share_link.token_hash = encode(extensions.digest(supplied_share_token, 'sha256'), 'hex')
              and share_link.is_active = true
              and share_link.revoked_at is null
              and (share_link.expires_at is null or share_link.expires_at > timezone('utc', now()))
              and (share_link.max_uses is null or share_link.use_count < share_link.max_uses)
              and (
                (share_link.target_type = 'post' and share_link.target_id = asset.post_id)
                or (share_link.target_type = 'collaboration_project' and share_link.target_id = asset.project_id)
                or (share_link.target_type = 'song_version' and share_link.target_id = asset.song_version_id)
              )
          )
        )
      )
  );
$$;

create or replace function public.create_feedback_thread(
  target_project_id uuid,
  target_track_id uuid,
  target_song_version_id uuid,
  feedback_start_seconds numeric,
  feedback_end_seconds numeric,
  feedback_title text,
  feedback_body text,
  feedback_category text default 'general',
  feedback_priority text default 'normal',
  feedback_assigned_to uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  new_thread_id uuid;
begin
  if not public.can_review_project(target_project_id, current_user_id) then
    raise exception 'You cannot add feedback to this project.';
  end if;

  if not exists (
    select 1
    from public.collaboration_project_tracks
    where id = target_track_id
      and project_id = target_project_id
      and song_id = (
        select song_id from public.song_versions where id = target_song_version_id
      )
  ) then
    raise exception 'The selected version does not belong to this project track.';
  end if;

  insert into public.feedback_threads (
    project_id,
    track_id,
    song_version_id,
    author_id,
    start_seconds,
    end_seconds,
    title,
    body,
    category,
    priority,
    assigned_to
  )
  values (
    target_project_id,
    target_track_id,
    target_song_version_id,
    current_user_id,
    feedback_start_seconds,
    feedback_end_seconds,
    nullif(btrim(feedback_title), ''),
    btrim(feedback_body),
    feedback_category,
    feedback_priority,
    feedback_assigned_to
  )
  returning id into new_thread_id;

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
    'feedback_added',
    'feedback',
    new_thread_id,
    jsonb_build_object(
      'track_id', target_track_id,
      'song_version_id', target_song_version_id,
      'start_seconds', feedback_start_seconds
    )
  );

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    project_id,
    song_version_id
  )
  select
    member.profile_id,
    current_user_id,
    'project_feedback',
    target_project_id,
    target_song_version_id
  from public.collaboration_project_members as member
  where member.project_id = target_project_id
    and member.membership_status = 'accepted'
    and member.profile_id <> current_user_id
    and (
      feedback_assigned_to is null
      or member.profile_id = feedback_assigned_to
    );

  return new_thread_id;
end;
$$;

create or replace function public.reply_to_feedback_thread(
  target_thread_id uuid,
  reply_body text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_thread public.feedback_threads%rowtype;
  new_reply_id uuid;
begin
  select * into target_thread
  from public.feedback_threads
  where id = target_thread_id;

  if target_thread.id is null
    or not public.can_review_project(target_thread.project_id, current_user_id) then
    raise exception 'Feedback thread not found.';
  end if;

  insert into public.feedback_replies (thread_id, author_id, body)
  values (target_thread_id, current_user_id, btrim(reply_body))
  returning id into new_reply_id;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    project_id,
    song_version_id
  )
  select distinct recipient_id, current_user_id, 'project_feedback_reply', target_thread.project_id, target_thread.song_version_id
  from (
    select target_thread.author_id as recipient_id
    union
    select author_id from public.feedback_replies where thread_id = target_thread_id
  ) as recipients
  where recipient_id <> current_user_id;

  return new_reply_id;
end;
$$;

create or replace function public.resolve_feedback_thread(target_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_thread public.feedback_threads%rowtype;
begin
  select * into target_thread
  from public.feedback_threads
  where id = target_thread_id
  for update;

  if target_thread.id is null
    or not public.can_review_project(target_thread.project_id, current_user_id) then
    raise exception 'Feedback thread not found.';
  end if;

  update public.feedback_threads
  set
    status = 'resolved',
    resolved_at = timezone('utc', now()),
    resolved_by = current_user_id
  where id = target_thread_id;

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id
  )
  values (
    target_thread.project_id,
    current_user_id,
    'feedback_resolved',
    'feedback',
    target_thread_id
  );

  if target_thread.author_id <> current_user_id then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      project_id,
      song_version_id
    )
    values (
      target_thread.author_id,
      current_user_id,
      'project_feedback_resolved',
      target_thread.project_id,
      target_thread.song_version_id
    );
  end if;
end;
$$;

create or replace function public.reopen_feedback_thread(target_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_project_id uuid;
begin
  select project_id into target_project_id
  from public.feedback_threads
  where id = target_thread_id;

  if target_project_id is null
    or not public.can_review_project(target_project_id, current_user_id) then
    raise exception 'Feedback thread not found.';
  end if;

  update public.feedback_threads
  set
    status = 'open',
    resolved_at = null,
    resolved_by = null
  where id = target_thread_id;
end;
$$;

create or replace function public.create_share_link(
  target_kind text,
  target_entity_id uuid,
  target_permission text default 'view',
  target_expires_at timestamptz default null,
  target_max_uses integer default null
)
returns table (share_link_id uuid, share_token text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  raw_token text;
  new_link_id uuid;
  can_create boolean := false;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_kind = 'post' then
    can_create := exists (
      select 1 from public.posts where id = target_entity_id and owner_id = current_user_id
    );
  elsif target_kind = 'collaboration_project' then
    can_create := public.can_manage_collaboration_members(target_entity_id, current_user_id);
  elsif target_kind = 'song_version' then
    can_create := exists (
      select 1 from public.song_versions where id = target_entity_id and owner_id = current_user_id
    );
  else
    raise exception 'Unsupported share-link target.';
  end if;

  if not can_create then
    raise exception 'You cannot share this item.';
  end if;

  if (
    select count(*)
    from public.share_links
    where owner_id = current_user_id
      and target_type = target_kind
      and target_id = target_entity_id
      and is_active = true
  ) >= 10 then
    raise exception 'The active share-link quota for this item has been reached.';
  end if;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.share_links (
    owner_id,
    target_type,
    target_id,
    token_hash,
    permission,
    expires_at,
    max_uses
  )
  values (
    current_user_id,
    target_kind,
    target_entity_id,
    encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    target_permission,
    target_expires_at,
    target_max_uses
  )
  returning id into new_link_id;

  return query select new_link_id, raw_token;
end;
$$;

create or replace function public.revoke_share_link(target_share_link_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.share_links
  set
    is_active = false,
    revoked_at = timezone('utc', now())
  where id = target_share_link_id
    and owner_id = auth.uid();

  if not found then
    raise exception 'Share link not found.';
  end if;
end;
$$;

create or replace function public.resolve_share_link(
  supplied_token text,
  requested_access_kind text default 'view'
)
returns table (
  share_link_id uuid,
  target_type text,
  target_id uuid,
  permission text,
  owner_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_link public.share_links%rowtype;
begin
  select *
  into target_link
  from public.share_links
  where token_hash = encode(extensions.digest(supplied_token, 'sha256'), 'hex')
  for update;

  if target_link.id is null
    or not target_link.is_active
    or target_link.revoked_at is not null
    or (target_link.expires_at is not null and target_link.expires_at <= timezone('utc', now()))
    or (target_link.max_uses is not null and target_link.use_count >= target_link.max_uses) then
    raise exception 'This share link is invalid or has expired.';
  end if;

  if requested_access_kind = 'review' and target_link.permission <> 'review' then
    raise exception 'This share link does not permit review access.';
  end if;

  update public.share_links
  set use_count = use_count + 1
  where id = target_link.id;

  insert into public.share_link_access_logs (
    share_link_id,
    profile_id,
    access_kind
  )
  values (
    target_link.id,
    auth.uid(),
    case when requested_access_kind = 'review' then 'review' else 'view' end
  );

  return query
  select
    target_link.id,
    target_link.target_type,
    target_link.target_id,
    target_link.permission,
    target_link.owner_id,
    target_link.expires_at;
end;
$$;

alter table public.protected_media_quotas enable row level security;
alter table public.protected_media_assets enable row level security;
alter table public.feedback_threads enable row level security;
alter table public.feedback_replies enable row level security;
alter table public.feedback_reactions enable row level security;
alter table public.share_links enable row level security;
alter table public.share_link_access_logs enable row level security;

create policy "protected quota owner select"
on public.protected_media_quotas for select
using (profile_id = auth.uid());

create policy "protected media owner metadata select"
on public.protected_media_assets for select
using (
  owner_id = auth.uid()
  or (project_id is not null and public.can_view_collaboration_project(project_id, auth.uid()))
  or (post_id is not null and public.can_view_post(post_id, auth.uid()))
);

create policy "feedback visible to project reviewers"
on public.feedback_threads for select
using (public.can_review_project(project_id, auth.uid()));

create policy "feedback insert through reviewer permission"
on public.feedback_threads for insert
with check (
  author_id = auth.uid()
  and public.can_review_project(project_id, auth.uid())
);

create policy "feedback update by author or project editor"
on public.feedback_threads for update
using (
  author_id = auth.uid()
  or public.can_edit_collaboration_project(project_id, auth.uid())
)
with check (public.can_review_project(project_id, auth.uid()));

create policy "feedback replies visible with thread"
on public.feedback_replies for select
using (
  exists (
    select 1
    from public.feedback_threads as thread
    where thread.id = feedback_replies.thread_id
      and public.can_review_project(thread.project_id, auth.uid())
  )
);

create policy "feedback replies insert by reviewers"
on public.feedback_replies for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.feedback_threads as thread
    where thread.id = feedback_replies.thread_id
      and public.can_review_project(thread.project_id, auth.uid())
  )
);

create policy "feedback replies update own"
on public.feedback_replies for update
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "feedback reactions visible with thread"
on public.feedback_reactions for select
using (
  exists (
    select 1
    from public.feedback_threads as thread
    where thread.id = feedback_reactions.thread_id
      and public.can_review_project(thread.project_id, auth.uid())
  )
);

create policy "feedback reactions insert own"
on public.feedback_reactions for insert
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.feedback_threads as thread
    where thread.id = feedback_reactions.thread_id
      and public.can_review_project(thread.project_id, auth.uid())
  )
);

create policy "feedback reactions delete own"
on public.feedback_reactions for delete
using (profile_id = auth.uid());

create policy "share links owner select"
on public.share_links for select
using (owner_id = auth.uid());

create policy "share link access log owner select"
on public.share_link_access_logs for select
using (
  exists (
    select 1
    from public.share_links
    where share_links.id = share_link_access_logs.share_link_id
      and share_links.owner_id = auth.uid()
  )
);

drop policy if exists "posts read owner or public" on public.posts;
create policy "posts read through v2 visibility"
on public.posts for select
using (public.can_view_post(id, auth.uid()));

drop policy if exists "single posts read public or owner" on public.single_posts;
create policy "single posts read through post visibility"
on public.single_posts for select
using (public.can_view_post(post_id, auth.uid()));

drop policy if exists "release tracks read public or owner" on public.release_tracks;
create policy "release tracks read through post visibility"
on public.release_tracks for select
using (public.can_view_post(post_id, auth.uid()));

drop policy if exists "comments readable for visible posts" on public.comments;
create policy "comments readable through post visibility"
on public.comments for select
using (public.can_view_post(post_id, auth.uid()));

drop policy if exists "comments insert own" on public.comments;
create policy "comments insert on visible posts"
on public.comments for insert
with check (
  author_id = auth.uid()
  and public.can_view_post(post_id, auth.uid())
);

drop policy if exists "feed events read public posts" on public.feed_events;
create policy "feed events read visible posts"
on public.feed_events for select
using (public.can_view_post(post_id, auth.uid()));

revoke all on function public.reserve_protected_media_asset(uuid, text, text, text, bigint, uuid, uuid, uuid, uuid, timestamptz) from public;
revoke all on function public.finalize_protected_media_asset(uuid, bigint, text, numeric, integer, integer, jsonb) from public;
revoke all on function public.release_protected_media_asset(uuid) from public;
grant execute on function public.reserve_protected_media_asset(uuid, text, text, text, bigint, uuid, uuid, uuid, uuid, timestamptz) to service_role;
grant execute on function public.finalize_protected_media_asset(uuid, bigint, text, numeric, integer, integer, jsonb) to service_role;
grant execute on function public.release_protected_media_asset(uuid) to service_role;
grant execute on function public.can_access_protected_media(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.can_view_post(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.create_feedback_thread(uuid, uuid, uuid, numeric, numeric, text, text, text, text, uuid) to authenticated;
grant execute on function public.reply_to_feedback_thread(uuid, text) to authenticated;
grant execute on function public.resolve_feedback_thread(uuid) to authenticated;
grant execute on function public.reopen_feedback_thread(uuid) to authenticated;
grant execute on function public.create_share_link(text, uuid, text, timestamptz, integer) to authenticated;
grant execute on function public.revoke_share_link(uuid) to authenticated;
grant execute on function public.resolve_share_link(text, text) to authenticated;
