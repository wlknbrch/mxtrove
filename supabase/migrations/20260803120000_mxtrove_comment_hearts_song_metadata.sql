-- MxTrove: comment engagement and optional musical metadata.
-- All additions are nullable/additive so older clients keep working unchanged.

alter table public.songs
  add column if not exists lyrics text,
  add column if not exists musical_key text,
  add column if not exists tempo_bpm numeric(6, 2),
  add column if not exists tempo_confidence numeric(5, 4),
  add column if not exists key_confidence numeric(5, 4),
  add column if not exists audio_analysis_updated_at timestamptz;

alter table public.songs
  drop constraint if exists songs_lyrics_length_check,
  add constraint songs_lyrics_length_check
    check (lyrics is null or char_length(lyrics) <= 50000),
  drop constraint if exists songs_musical_key_length_check,
  add constraint songs_musical_key_length_check
    check (musical_key is null or char_length(musical_key) <= 32),
  drop constraint if exists songs_tempo_bpm_check,
  add constraint songs_tempo_bpm_check
    check (tempo_bpm is null or tempo_bpm between 20 and 400),
  drop constraint if exists songs_tempo_confidence_check,
  add constraint songs_tempo_confidence_check
    check (tempo_confidence is null or tempo_confidence between 0 and 1),
  drop constraint if exists songs_key_confidence_check,
  add constraint songs_key_confidence_check
    check (key_confidence is null or key_confidence between 0 and 1);

alter table public.media_processing_jobs
  add column if not exists song_id uuid references public.songs (id) on delete set null,
  add column if not exists detected_tempo_bpm numeric(6, 2),
  add column if not exists detected_musical_key text,
  add column if not exists tempo_confidence numeric(5, 4),
  add column if not exists key_confidence numeric(5, 4);

create index if not exists media_processing_jobs_song_idx
  on public.media_processing_jobs (song_id, created_at desc)
  where song_id is not null;

create table if not exists public.comment_hearts (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  comment_id uuid not null references public.comments (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, comment_id)
);

create index if not exists comment_hearts_comment_idx
  on public.comment_hearts (comment_id, created_at desc);

create index if not exists comments_parent_comment_idx
  on public.comments (parent_comment_id, created_at)
  where parent_comment_id is not null;

alter table public.comment_hearts enable row level security;

drop policy if exists "comment hearts readable through comment visibility" on public.comment_hearts;
create policy "comment hearts readable through comment visibility"
on public.comment_hearts for select
using (
  exists (
    select 1
    from public.comments as comment
    where comment.id = comment_hearts.comment_id
      and public.can_view_post(comment.post_id, auth.uid())
  )
);

drop policy if exists "comment hearts insert own on visible comments" on public.comment_hearts;
create policy "comment hearts insert own on visible comments"
on public.comment_hearts for insert
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.comments as comment
    where comment.id = comment_hearts.comment_id
      and comment.deleted_at is null
      and comment.author_id <> auth.uid()
      and public.can_view_post(comment.post_id, auth.uid())
      and not public.is_profile_blocked_pair(comment.author_id, auth.uid())
  )
);

drop policy if exists "comment hearts delete own" on public.comment_hearts;
create policy "comment hearts delete own"
on public.comment_hearts for delete
using (profile_id = auth.uid());

create or replace function public.get_comment_engagement(target_post_id uuid)
returns table (
  comment_id uuid,
  heart_count bigint,
  reply_count bigint,
  viewer_has_hearted boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    comment.id,
    count(distinct heart.profile_id),
    count(distinct reply.id) filter (where reply.deleted_at is null),
    coalesce(bool_or(heart.profile_id = auth.uid()), false)
  from public.comments as comment
  left join public.comment_hearts as heart on heart.comment_id = comment.id
  left join public.comments as reply on reply.parent_comment_id = comment.id
  where comment.post_id = target_post_id
    and public.can_view_post(comment.post_id, auth.uid())
  group by comment.id;
$$;

revoke all on function public.get_comment_engagement(uuid) from public;
grant execute on function public.get_comment_engagement(uuid) to anon, authenticated, service_role;

-- Keep the old two-argument call shape valid through the defaulted third argument.
drop function if exists public.request_media_processing_job(uuid, uuid);
create or replace function public.request_media_processing_job(
  source_asset_id uuid,
  linked_song_version_id uuid default null,
  linked_song_id uuid default null
)
returns public.media_processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  source_asset public.assets%rowtype;
  existing_job public.media_processing_jobs%rowtype;
  created_job public.media_processing_jobs%rowtype;
  resolved_song_id uuid := linked_song_id;
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

  if linked_song_version_id is not null then
    select version.song_id
    into resolved_song_id
    from public.song_versions as version
    join public.songs as song on song.id = version.song_id
    where version.id = linked_song_version_id
      and song.owner_id = current_user_id;

    if resolved_song_id is null then
      raise exception 'Linked song version not found.';
    end if;
  elsif resolved_song_id is not null and not exists (
    select 1
    from public.songs as song
    where song.id = resolved_song_id
      and song.owner_id = current_user_id
  ) then
    raise exception 'Linked song not found.';
  end if;

  select *
  into existing_job
  from public.media_processing_jobs as job
  where job.source_asset_id = request_media_processing_job.source_asset_id
    and job.owner_id = current_user_id
    and job.status in ('created', 'uploading', 'queued', 'probing', 'transcoding', 'generating_waveform', 'ready', 'uploading_to_drive')
  order by job.created_at desc
  limit 1;

  if existing_job.id is not null then
    if existing_job.song_id is null and resolved_song_id is not null then
      update public.media_processing_jobs
      set song_id = resolved_song_id,
          song_version_id = coalesce(song_version_id, linked_song_version_id),
          updated_at = timezone('utc', now())
      where id = existing_job.id
      returning * into existing_job;
    end if;
    return existing_job;
  end if;

  insert into public.media_processing_jobs (
    owner_id,
    source_asset_id,
    song_version_id,
    song_id,
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
    resolved_song_id,
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

revoke all on function public.request_media_processing_job(uuid, uuid, uuid) from public;
grant execute on function public.request_media_processing_job(uuid, uuid, uuid) to authenticated, service_role;

grant select on table public.comment_hearts to anon, authenticated;
grant insert, delete on table public.comment_hearts to authenticated;
