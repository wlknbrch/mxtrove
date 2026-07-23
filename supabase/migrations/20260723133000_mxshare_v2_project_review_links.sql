begin;

create or replace function public.resolve_share_link_target(supplied_token text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select target_type
  from public.share_links
  where token_hash = encode(extensions.digest(supplied_token, 'sha256'), 'hex')
    and is_active = true
    and revoked_at is null
    and (expires_at is null or expires_at > timezone('utc', now()))
    and (max_uses is null or use_count < max_uses);
$$;

create or replace function public.resolve_shared_project(supplied_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_link public.share_links%rowtype;
  target_project_id uuid;
  response jsonb;
begin
  select * into target_link
  from public.share_links
  where token_hash = encode(extensions.digest(supplied_token, 'sha256'), 'hex')
    and target_type in ('collaboration_project', 'song_version')
  for update;

  if target_link.id is null
    or not target_link.is_active
    or target_link.revoked_at is not null
    or (target_link.expires_at is not null and target_link.expires_at <= timezone('utc', now()))
    or (target_link.max_uses is not null and target_link.use_count >= target_link.max_uses) then
    raise exception 'This shared project is invalid or has expired.';
  end if;

  if target_link.target_type = 'collaboration_project' then
    target_project_id := target_link.target_id;
  else
    select collaboration_project_id into target_project_id
    from public.song_versions
    where id = target_link.target_id;
  end if;

  if target_project_id is null or not exists (
    select 1 from public.collaboration_projects
    where id = target_project_id and archived_at is null
  ) then
    raise exception 'This shared project is unavailable.';
  end if;

  update public.share_links
  set use_count = use_count + 1
  where id = target_link.id;

  insert into public.share_link_access_logs (share_link_id, profile_id, access_kind)
  values (target_link.id, auth.uid(), case when target_link.permission = 'review' then 'review' else 'view' end);

  select jsonb_build_object(
    'targetType', target_link.target_type,
    'targetId', target_link.target_id,
    'permission', target_link.permission,
    'project', to_jsonb(project),
    'owner', to_jsonb(owner),
    'tracks', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'track', to_jsonb(track),
          'song', to_jsonb(song),
          'version', to_jsonb(version),
          'protectedAsset', to_jsonb(protected_asset)
        )
        order by track.track_number
      )
      from public.collaboration_project_tracks as track
      join public.songs as song on song.id = track.song_id
      left join public.song_versions as version
        on version.id = case
          when target_link.target_type = 'song_version' then target_link.target_id
          else track.active_version_id
        end
        and version.song_id = track.song_id
      left join public.protected_media_assets as protected_asset
        on protected_asset.id = version.protected_preview_asset_id
        and protected_asset.status = 'ready'
        and protected_asset.deleted_at is null
      where track.project_id = project.id
        and (
          target_link.target_type = 'collaboration_project'
          or version.id = target_link.target_id
        )
    ), '[]'::jsonb),
    'feedbackThreads', coalesce((
      select jsonb_agg(to_jsonb(thread) order by thread.start_seconds)
      from public.feedback_threads as thread
      where thread.project_id = project.id
        and (
          target_link.target_type = 'collaboration_project'
          or thread.song_version_id = target_link.target_id
        )
    ), '[]'::jsonb)
  )
  into response
  from public.collaboration_projects as project
  join public.profiles as owner on owner.id = project.owner_id
  where project.id = target_project_id;

  return response;
end;
$$;

create or replace function public.create_shared_feedback_thread(
  supplied_token text,
  target_track_id uuid,
  target_song_version_id uuid,
  feedback_start_seconds numeric,
  feedback_end_seconds numeric,
  feedback_title text,
  feedback_body text,
  feedback_category text default 'general',
  feedback_priority text default 'normal'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_link public.share_links%rowtype;
  target_track public.collaboration_project_tracks%rowtype;
  new_thread_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in to leave review feedback.';
  end if;

  select * into target_link
  from public.share_links
  where token_hash = encode(extensions.digest(supplied_token, 'sha256'), 'hex')
    and target_type in ('collaboration_project', 'song_version');

  if target_link.id is null
    or target_link.permission <> 'review'
    or not target_link.is_active
    or target_link.revoked_at is not null
    or (target_link.expires_at is not null and target_link.expires_at <= timezone('utc', now()))
    or public.is_profile_blocked_pair(target_link.owner_id, current_user_id) then
    raise exception 'This review link is unavailable.';
  end if;

  select * into target_track
  from public.collaboration_project_tracks
  where id = target_track_id;

  if target_track.id is null
    or not exists (
      select 1 from public.song_versions as version
      where version.id = target_song_version_id
        and version.song_id = target_track.song_id
        and version.collaboration_project_id = target_track.project_id
    )
    or (
      target_link.target_type = 'collaboration_project'
      and target_link.target_id <> target_track.project_id
    )
    or (
      target_link.target_type = 'song_version'
      and target_link.target_id <> target_song_version_id
    ) then
    raise exception 'The shared review target does not match this version.';
  end if;

  if feedback_start_seconds < 0
    or (feedback_end_seconds is not null and feedback_end_seconds < feedback_start_seconds)
    or char_length(btrim(feedback_body)) not between 1 and 5000
    or feedback_category not in ('general', 'arrangement', 'mix', 'vocals', 'lyrics', 'sound_design', 'mastering', 'performance', 'technical')
    or feedback_priority not in ('low', 'normal', 'high', 'blocking') then
    raise exception 'The feedback details are invalid.';
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
    priority
  )
  values (
    target_track.project_id,
    target_track_id,
    target_song_version_id,
    current_user_id,
    feedback_start_seconds,
    feedback_end_seconds,
    nullif(btrim(feedback_title), ''),
    btrim(feedback_body),
    feedback_category,
    feedback_priority
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
    target_track.project_id,
    current_user_id,
    'feedback_added',
    'feedback',
    new_thread_id,
    jsonb_build_object('source', 'review_link', 'track_id', target_track_id)
  );

  insert into public.notifications (recipient_id, actor_id, type, project_id, song_version_id)
  values (target_link.owner_id, current_user_id, 'share_link_review', target_track.project_id, target_song_version_id);

  return new_thread_id;
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
          asset.message_id is not null
          and exists (
            select 1 from public.messages as message
            where message.id = asset.message_id
              and public.is_conversation_member(message.conversation_id, target_profile_id)
          )
        )
        or (asset.post_id is not null and public.can_view_post(asset.post_id, target_profile_id))
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
              and (share_link.max_uses is null or share_link.use_count <= share_link.max_uses)
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

revoke all on function public.resolve_share_link_target(text) from public;
revoke all on function public.resolve_shared_project(text) from public;
revoke all on function public.create_shared_feedback_thread(text, uuid, uuid, numeric, numeric, text, text, text, text) from public;
grant execute on function public.resolve_share_link_target(text) to anon, authenticated;
grant execute on function public.resolve_shared_project(text) to anon, authenticated;
grant execute on function public.create_shared_feedback_thread(text, uuid, uuid, numeric, numeric, text, text, text, text) to authenticated;

commit;
