create extension if not exists pg_trgm;

alter table public.assets
  add column if not exists derived_from_asset_id uuid references public.assets (id) on delete set null,
  add column if not exists processing_job_id uuid,
  add column if not exists preview_generation text,
  add column if not exists codec text,
  add column if not exists sample_rate_hz integer,
  add column if not exists channels integer,
  add column if not exists bit_rate_bps integer,
  add column if not exists waveform_version integer,
  add column if not exists waveform_bucket_count integer,
  add column if not exists waveform_generated_at timestamptz;

create table if not exists public.media_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  source_asset_id uuid not null references public.assets (id) on delete cascade,
  song_version_id uuid references public.song_versions (id) on delete set null,
  status text not null default 'created',
  stage text not null default 'Awaiting upload',
  progress integer not null default 0,
  input_filename text,
  input_mime_type text,
  input_bytes bigint,
  input_checksum text,
  output_mime_type text,
  output_bytes bigint,
  duration_seconds numeric(12,3),
  detected_codec text,
  sample_rate_hz integer,
  channels integer,
  bit_rate_bps integer,
  waveform_data jsonb,
  error_code text,
  error_message text,
  attempt_count integer not null default 0,
  worker_instance_id text,
  cancel_requested_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint media_processing_jobs_status_check
    check (status in ('created', 'uploading', 'queued', 'probing', 'transcoding', 'generating_waveform', 'ready', 'uploading_to_drive', 'completed', 'failed', 'cancelled', 'expired')),
  constraint media_processing_jobs_progress_check
    check (progress >= 0 and progress <= 100)
);

alter table public.assets
  add constraint assets_processing_job_id_fkey
  foreign key (processing_job_id) references public.media_processing_jobs (id) on delete set null;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_label text,
  is_active boolean not null default true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  push_enabled boolean not null default false,
  follows_enabled boolean not null default true,
  post_hearts_enabled boolean not null default true,
  version_hearts_enabled boolean not null default true,
  comments_enabled boolean not null default true,
  replies_enabled boolean not null default true,
  messages_enabled boolean not null default true,
  single_updates_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.push_delivery_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default timezone('utc', now()),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  delivered_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint push_delivery_queue_status_check
    check (status in ('pending', 'processing', 'delivered', 'failed', 'discarded'))
);

create table if not exists public.push_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  queue_item_id uuid not null references public.push_delivery_queue (id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions (id) on delete cascade,
  status_code integer,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

update public.assets
set preview_generation = 'manual'
where asset_type = 'audio_preview'
  and preview_generation is null;

alter table public.assets
  add constraint assets_preview_generation_check
  check (
    preview_generation is null
    or preview_generation in ('manual', 'automatic')
  );

create index if not exists media_processing_jobs_owner_created_idx
on public.media_processing_jobs (owner_id, created_at desc);

create index if not exists media_processing_jobs_source_status_idx
on public.media_processing_jobs (source_asset_id, status, created_at desc);

create index if not exists push_subscriptions_profile_active_idx
on public.push_subscriptions (profile_id, is_active, updated_at desc);

create index if not exists push_delivery_queue_pending_idx
on public.push_delivery_queue (status, available_at, created_at);

create index if not exists push_delivery_queue_recipient_idx
on public.push_delivery_queue (recipient_id, created_at desc);

create index if not exists profiles_username_trgm_idx
on public.profiles using gin (username gin_trgm_ops);

create index if not exists profiles_display_name_trgm_idx
on public.profiles using gin (display_name gin_trgm_ops);

create index if not exists posts_title_trgm_idx
on public.posts using gin (title gin_trgm_ops);

create index if not exists posts_description_trgm_idx
on public.posts using gin (description gin_trgm_ops);

create index if not exists songs_title_trgm_idx
on public.songs using gin (title gin_trgm_ops);

create index if not exists release_tracks_title_trgm_idx
on public.release_tracks using gin (track_title gin_trgm_ops);

create or replace function public.ensure_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_notification_preferences on public.profiles;
create trigger profiles_create_notification_preferences
after insert on public.profiles
for each row
execute procedure public.ensure_notification_preferences();

insert into public.notification_preferences (profile_id)
select profiles.id
from public.profiles
left join public.notification_preferences
  on notification_preferences.profile_id = profiles.id
where notification_preferences.profile_id is null;

create or replace function public.request_media_processing_job(
  source_asset_id uuid,
  linked_song_version_id uuid default null
)
returns public.media_processing_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  source_asset public.assets%rowtype;
  existing_job public.media_processing_jobs%rowtype;
  created_job public.media_processing_jobs%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into source_asset
  from public.assets
  where id = source_asset_id
    and owner_id = current_user_id;

  if source_asset.id is null then
    raise exception 'Source asset not found.';
  end if;

  if source_asset.asset_type <> 'audio_original' then
    raise exception 'Only private original audio can be processed.';
  end if;

  if linked_song_version_id is not null and not exists (
    select 1
    from public.song_versions
    join public.songs on songs.id = song_versions.song_id
    where song_versions.id = linked_song_version_id
      and songs.owner_id = current_user_id
  ) then
    raise exception 'Linked song version not found.';
  end if;

  select *
  into existing_job
  from public.media_processing_jobs
  where media_processing_jobs.source_asset_id = request_media_processing_job.source_asset_id
    and media_processing_jobs.owner_id = current_user_id
    and media_processing_jobs.status in ('created', 'uploading', 'queued', 'probing', 'transcoding', 'generating_waveform', 'ready', 'uploading_to_drive')
  order by media_processing_jobs.created_at desc
  limit 1;

  if existing_job.id is not null then
    return existing_job;
  end if;

  insert into public.media_processing_jobs (
    owner_id,
    source_asset_id,
    song_version_id,
    status,
    stage,
    progress,
    input_filename,
    input_mime_type,
    input_bytes,
    input_checksum,
    attempt_count
  )
  values (
    current_user_id,
    source_asset_id,
    linked_song_version_id,
    'created',
    'Awaiting upload',
    0,
    source_asset.filename,
    source_asset.mime_type,
    source_asset.bytes,
    source_asset.checksum,
    0
  )
  returning * into created_job;

  return created_job;
end;
$$;

create or replace function public.cancel_media_processing_job(job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  update public.media_processing_jobs
  set cancel_requested_at = timezone('utc', now())
  where id = job_id
    and owner_id = current_user_id
    and status not in ('completed', 'cancelled', 'expired');
end;
$$;

create or replace function public.finalize_media_processing_job(
  job_id uuid,
  preview_asset_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_job public.media_processing_jobs%rowtype;
  preview_asset public.assets%rowtype;
  bucket_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into target_job
  from public.media_processing_jobs
  where id = job_id
    and owner_id = current_user_id;

  if target_job.id is null then
    raise exception 'Processing job not found.';
  end if;

  if target_job.status not in ('ready', 'uploading_to_drive') then
    raise exception 'Processing job is not ready for finalization.';
  end if;

  select *
  into preview_asset
  from public.assets
  where id = preview_asset_id
    and owner_id = current_user_id;

  if preview_asset.id is null then
    raise exception 'Preview asset not found.';
  end if;

  if preview_asset.asset_type <> 'audio_preview' then
    raise exception 'Preview asset must be an audio preview.';
  end if;

  if preview_asset.mime_type <> 'audio/mpeg' then
    raise exception 'Preview asset must use audio/mpeg.';
  end if;

  if preview_asset.access_mode <> 'public' then
    raise exception 'Preview asset must already be public.';
  end if;

  if preview_asset.derived_from_asset_id is distinct from target_job.source_asset_id then
    raise exception 'Preview asset does not match the source asset.';
  end if;

  if target_job.waveform_data is null then
    raise exception 'Waveform data is missing.';
  end if;

  select coalesce(jsonb_array_length(target_job.waveform_data -> 'peaks'), 0)
  into bucket_count;

  if coalesce((target_job.waveform_data ->> 'version')::integer, 0) <> 1 or bucket_count <= 0 then
    raise exception 'Waveform data is invalid.';
  end if;

  if target_job.song_version_id is not null and not exists (
    select 1
    from public.song_versions
    join public.songs on songs.id = song_versions.song_id
    where song_versions.id = target_job.song_version_id
      and songs.owner_id = current_user_id
  ) then
    raise exception 'Linked song version is not owned by the current user.';
  end if;

  update public.assets
  set
    processing_job_id = target_job.id,
    preview_generation = 'automatic',
    waveform_peaks = target_job.waveform_data,
    waveform_version = 1,
    waveform_bucket_count = bucket_count,
    waveform_generated_at = timezone('utc', now()),
    codec = coalesce(codec, target_job.detected_codec),
    sample_rate_hz = coalesce(sample_rate_hz, target_job.sample_rate_hz),
    channels = coalesce(channels, target_job.channels),
    bit_rate_bps = coalesce(bit_rate_bps, target_job.bit_rate_bps)
  where id = preview_asset_id;

  if target_job.song_version_id is not null then
    update public.song_versions
    set
      preview_asset_id = preview_asset_id,
      updated_at = timezone('utc', now())
    where id = target_job.song_version_id;
  end if;

  update public.media_processing_jobs
  set
    status = 'completed',
    stage = 'Completed',
    progress = 100,
    ready_at = coalesce(ready_at, timezone('utc', now())),
    completed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = target_job.id;
end;
$$;

create or replace function public.notification_type_push_enabled(
  preference_row public.notification_preferences,
  notification_type text
)
returns boolean
language plpgsql
immutable
as $$
begin
  if not preference_row.push_enabled then
    return false;
  end if;

  return case notification_type
    when 'follow' then preference_row.follows_enabled
    when 'post_heart' then preference_row.post_hearts_enabled
    when 'version_heart' then preference_row.version_hearts_enabled
    when 'comment' then preference_row.comments_enabled
    when 'comment_reply' then preference_row.replies_enabled
    when 'message' then preference_row.messages_enabled
    when 'single_version' then preference_row.single_updates_enabled
    else false
  end;
end;
$$;

create or replace function public.queue_notification_for_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preferences public.notification_preferences%rowtype;
begin
  if new.recipient_id is null or new.recipient_id = new.actor_id then
    return new;
  end if;

  select *
  into preferences
  from public.notification_preferences
  where profile_id = new.recipient_id;

  if preferences.profile_id is null then
    insert into public.notification_preferences (profile_id)
    values (new.recipient_id)
    on conflict (profile_id) do nothing;

    select *
    into preferences
    from public.notification_preferences
    where profile_id = new.recipient_id;
  end if;

  if public.notification_type_push_enabled(preferences, new.type) then
    if exists (
      select 1
      from public.push_subscriptions
      where push_subscriptions.profile_id = new.recipient_id
        and push_subscriptions.is_active = true
    ) then
      insert into public.push_delivery_queue (notification_id, recipient_id)
      values (new.id, new.recipient_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_queue_push_delivery on public.notifications;
create trigger notifications_queue_push_delivery
after insert on public.notifications
for each row
execute procedure public.queue_notification_for_push();

create or replace function public.create_post_heart_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_owner_id uuid;
begin
  select owner_id
  into target_owner_id
  from public.posts
  where id = new.post_id;

  if target_owner_id is not null and target_owner_id <> new.profile_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (target_owner_id, new.profile_id, 'post_heart', new.post_id);
  end if;

  return new;
end;
$$;

drop trigger if exists post_hearts_create_notifications on public.post_hearts;
create trigger post_hearts_create_notifications
after insert on public.post_hearts
for each row
execute procedure public.create_post_heart_notification();

create or replace function public.create_version_heart_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_owner_id uuid;
begin
  select songs.owner_id
  into target_owner_id
  from public.song_versions
  join public.songs on songs.id = song_versions.song_id
  where song_versions.id = new.song_version_id;

  if target_owner_id is not null and target_owner_id <> new.profile_id then
    insert into public.notifications (recipient_id, actor_id, type, song_version_id)
    values (target_owner_id, new.profile_id, 'version_heart', new.song_version_id);
  end if;

  return new;
end;
$$;

drop trigger if exists version_hearts_create_notifications on public.version_hearts;
create trigger version_hearts_create_notifications
after insert on public.version_hearts
for each row
execute procedure public.create_version_heart_notification();

create or replace function public.create_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post_owner_id uuid;
  parent_author_id uuid;
begin
  select owner_id
  into target_post_owner_id
  from public.posts
  where id = new.post_id;

  if new.parent_comment_id is not null then
    select author_id
    into parent_author_id
    from public.comments
    where id = new.parent_comment_id;
  end if;

  if target_post_owner_id is not null and target_post_owner_id <> new.author_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
    values (target_post_owner_id, new.author_id, 'comment', new.post_id, new.id);
  end if;

  if parent_author_id is not null and parent_author_id <> new.author_id and parent_author_id <> target_post_owner_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
    values (parent_author_id, new.author_id, 'comment_reply', new.post_id, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists comments_create_notifications on public.comments;
create trigger comments_create_notifications
after insert on public.comments
for each row
execute procedure public.create_comment_notification();

create or replace function public.claim_push_delivery_batch(batch_size integer default 20)
returns table (
  queue_item_id uuid,
  notification_id uuid,
  recipient_id uuid,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  notification_type text,
  post_id uuid,
  song_version_id uuid,
  comment_id uuid,
  conversation_id uuid,
  actor_display_name text,
  actor_username text,
  post_title text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required.';
  end if;

  return query
  with claimed as (
    select q.id
    from public.push_delivery_queue q
    where q.status in ('pending', 'failed')
      and q.available_at <= timezone('utc', now())
    order by q.created_at asc
    for update skip locked
    limit greatest(batch_size, 1)
  ),
  updated as (
    update public.push_delivery_queue q
    set
      status = 'processing',
      locked_at = timezone('utc', now()),
      locked_by = coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), 'service-role'),
      updated_at = timezone('utc', now())
    from claimed
    where q.id = claimed.id
    returning q.*
  )
  select
    updated.id as queue_item_id,
    updated.notification_id,
    updated.recipient_id,
    subscriptions.id as subscription_id,
    subscriptions.endpoint,
    subscriptions.p256dh,
    subscriptions.auth,
    notifications.type as notification_type,
    notifications.post_id,
    notifications.song_version_id,
    notifications.comment_id,
    notifications.conversation_id,
    actor.display_name as actor_display_name,
    actor.username as actor_username,
    posts.title as post_title
  from updated
  join public.notifications
    on notifications.id = updated.notification_id
  join public.push_subscriptions as subscriptions
    on subscriptions.profile_id = updated.recipient_id
   and subscriptions.is_active = true
  left join public.profiles as actor
    on actor.id = notifications.actor_id
  left join public.posts
    on posts.id = notifications.post_id;
end;
$$;

create or replace function public.update_release_post(
  target_post_id uuid,
  next_title text,
  next_description text,
  next_release_url text,
  next_artwork_asset_id uuid,
  next_tracks jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_post public.posts%rowtype;
  track_entry jsonb;
  track_index integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into target_post
  from public.posts
  where id = target_post_id
    and owner_id = current_user_id;

  if target_post.id is null then
    raise exception 'Post not found.';
  end if;

  update public.posts
  set
    title = coalesce(nullif(btrim(next_title), ''), title),
    description = nullif(btrim(next_description), ''),
    release_url = nullif(btrim(next_release_url), ''),
    artwork_asset_id = next_artwork_asset_id,
    updated_at = timezone('utc', now())
  where id = target_post_id;

  if target_post.post_type = 'single' then
    return;
  end if;

  if next_tracks is null or jsonb_typeof(next_tracks) <> 'array' then
    raise exception 'Tracks payload must be a JSON array.';
  end if;

  delete from public.release_tracks
  where post_id = target_post_id;

  for track_entry in
    select value
    from jsonb_array_elements(next_tracks)
  loop
    track_index := track_index + 1;

    insert into public.release_tracks (
      post_id,
      song_id,
      song_version_id,
      track_title,
      track_number,
      preview_asset_id,
      production_stage
    )
    values (
      target_post_id,
      (track_entry ->> 'song_id')::uuid,
      nullif(track_entry ->> 'song_version_id', '')::uuid,
      coalesce(nullif(btrim(track_entry ->> 'track_title'), ''), 'Untitled track'),
      coalesce((track_entry ->> 'track_number')::integer, track_index),
      nullif(track_entry ->> 'preview_asset_id', '')::uuid,
      nullif(track_entry ->> 'production_stage', '')
    );
  end loop;

  update public.posts
  set updated_at = timezone('utc', now())
  where id = target_post_id;
end;
$$;

create or replace function public.search_public_catalog(
  raw_query text,
  limit_count integer default 24,
  offset_count integer default 0
)
returns table (
  result_kind text,
  profile_id uuid,
  post_id uuid,
  username text,
  display_name text,
  title text,
  description text,
  post_type text,
  activity_at timestamptz,
  followers_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_query text := nullif(btrim(raw_query), '');
begin
  if normalized_query is null then
    return;
  end if;

  return query
  with creator_matches as (
    select
      'creator'::text as result_kind,
      profiles.id as profile_id,
      null::uuid as post_id,
      profiles.username,
      profiles.display_name,
      profiles.display_name as title,
      profiles.bio as description,
      null::text as post_type,
      metrics.last_public_activity_at as activity_at,
      metrics.followers_count
    from public.profiles
    join public.profile_public_metrics as metrics
      on metrics.profile_id = profiles.id
    where metrics.public_posts_count > 0
      and (
        profiles.username ilike '%' || normalized_query || '%'
        or profiles.display_name ilike '%' || normalized_query || '%'
      )
  ),
  post_matches as (
    select
      'post'::text as result_kind,
      posts.owner_id as profile_id,
      posts.id as post_id,
      profiles.username,
      profiles.display_name,
      posts.title,
      posts.description,
      posts.post_type::text,
      posts.activity_at,
      metrics.followers_count
    from public.posts
    join public.profiles
      on profiles.id = posts.owner_id
    left join public.profile_public_metrics as metrics
      on metrics.profile_id = posts.owner_id
    left join public.single_posts
      on single_posts.post_id = posts.id
    left join public.songs
      on songs.id = single_posts.song_id
    left join public.release_tracks
      on release_tracks.post_id = posts.id
    where posts.visibility = 'public'
      and (
        posts.title ilike '%' || normalized_query || '%'
        or coalesce(posts.description, '') ilike '%' || normalized_query || '%'
        or coalesce(songs.title, '') ilike '%' || normalized_query || '%'
        or coalesce(release_tracks.track_title, '') ilike '%' || normalized_query || '%'
        or coalesce(release_tracks.production_stage, '') ilike '%' || normalized_query || '%'
      )
    group by posts.id, profiles.id, metrics.followers_count
  )
  select *
  from (
    select * from creator_matches
    union all
    select * from post_matches
  ) combined
  order by combined.activity_at desc nulls last, combined.followers_count desc nulls last, combined.title asc
  offset greatest(offset_count, 0)
  limit greatest(limit_count, 1);
end;
$$;

create or replace function public.list_trending_public_post_ids(
  limit_count integer default 40,
  offset_count integer default 0
)
returns table (
  post_id uuid,
  trending_score numeric
)
language sql
security definer
set search_path = public
as $$
  with scored as (
    select
      posts.id as post_id,
      (
        coalesce(metrics.heart_count, 0) * 3
        + coalesce(metrics.featured_version_heart_count, 0) * 2
        + coalesce(metrics.comment_count, 0) * 4
      )::numeric
      /
      greatest(
        extract(epoch from greatest(timezone('utc', now()) - posts.activity_at, interval '1 hour')) / 3600,
        1
      ) as trending_score
    from public.posts
    left join public.post_public_metrics as metrics
      on metrics.post_id = posts.id
    where posts.visibility = 'public'
  )
  select
    scored.post_id,
    scored.trending_score
  from scored
  order by scored.trending_score desc, scored.post_id desc
  offset greatest(offset_count, 0)
  limit greatest(limit_count, 1);
$$;

alter table public.media_processing_jobs enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_delivery_queue enable row level security;
alter table public.push_delivery_attempts enable row level security;

create policy "media jobs owner select"
on public.media_processing_jobs for select
using (owner_id = auth.uid());

create policy "media jobs owner insert"
on public.media_processing_jobs for insert
with check (owner_id = auth.uid());

create policy "push subscriptions owner select"
on public.push_subscriptions for select
using (profile_id = auth.uid());

create policy "push subscriptions owner insert"
on public.push_subscriptions for insert
with check (profile_id = auth.uid());

create policy "push subscriptions owner update"
on public.push_subscriptions for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "push subscriptions owner delete"
on public.push_subscriptions for delete
using (profile_id = auth.uid());

create policy "notification preferences owner select"
on public.notification_preferences for select
using (profile_id = auth.uid());

create policy "notification preferences owner insert"
on public.notification_preferences for insert
with check (profile_id = auth.uid());

create policy "notification preferences owner update"
on public.notification_preferences for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop trigger if exists media_processing_jobs_set_updated_at on public.media_processing_jobs;
create trigger media_processing_jobs_set_updated_at
before update on public.media_processing_jobs
for each row execute procedure public.set_updated_at();

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute procedure public.set_updated_at();

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute procedure public.set_updated_at();

drop trigger if exists push_delivery_queue_set_updated_at on public.push_delivery_queue;
create trigger push_delivery_queue_set_updated_at
before update on public.push_delivery_queue
for each row execute procedure public.set_updated_at();
