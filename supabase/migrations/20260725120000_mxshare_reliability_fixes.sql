-- Reliability fixes for release creation and version hearts hidden behind post visibility.

create or replace function public.create_single_post(
  target_song_id uuid,
  target_version_id uuid,
  target_title text,
  target_description text default null,
  target_artwork_asset_id uuid default null,
  target_visibility text default 'public'
)
returns public.posts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  created_post public.posts%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_visibility not in ('public', 'followers', 'unlisted', 'private') then
    raise exception 'Unsupported post visibility.';
  end if;

  if not exists (
    select 1
    from public.songs as song
    join public.song_versions as version on version.song_id = song.id
    where song.id = target_song_id
      and song.owner_id = current_user_id
      and version.id = target_version_id
  ) then
    raise exception 'The selected song version is not owned by the current user.';
  end if;

  if target_artwork_asset_id is not null and not exists (
    select 1
    from public.assets as asset
    where asset.id = target_artwork_asset_id
      and asset.owner_id = current_user_id
  ) then
    raise exception 'The selected artwork is not owned by the current user.';
  end if;

  insert into public.posts (
    owner_id,
    post_type,
    title,
    description,
    artwork_asset_id,
    visibility,
    is_published,
    published_at,
    activity_at
  )
  values (
    current_user_id,
    'single',
    coalesce(nullif(btrim(target_title), ''), 'Untitled single'),
    nullif(btrim(coalesce(target_description, '')), ''),
    target_artwork_asset_id,
    target_visibility,
    target_visibility <> 'private',
    case when target_visibility <> 'private' then timezone('utc', now()) else null end,
    timezone('utc', now())
  )
  returning *
  into created_post;

  insert into public.single_posts (post_id, song_id, featured_version_id)
  values (created_post.id, target_song_id, target_version_id);

  return created_post;
end;
$$;

revoke all on function public.create_single_post(uuid, uuid, text, text, uuid, text) from public;
grant execute on function public.create_single_post(uuid, uuid, text, text, uuid, text)
to authenticated, service_role;

create or replace function public.toggle_version_heart(
  target_version_id uuid,
  should_be_active boolean
)
returns table (viewer_has_hearted boolean, changed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  song_owner_id uuid;
  affected_rows integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.can_profile_view_song_version(target_version_id, current_user_id) then
    raise exception 'That song version could not be found.';
  end if;

  select song.owner_id
  into song_owner_id
  from public.song_versions as version
  join public.songs as song on song.id = version.song_id
  where version.id = target_version_id;

  if should_be_active and song_owner_id = current_user_id then
    raise exception 'You cannot heart your own song.';
  end if;

  if should_be_active and public.is_profile_blocked_pair(song_owner_id, current_user_id) then
    raise exception 'This song version is not available.';
  end if;

  if should_be_active then
    insert into public.version_hearts (profile_id, song_version_id)
    values (current_user_id, target_version_id)
    on conflict (profile_id, song_version_id) do nothing;
    get diagnostics affected_rows = row_count;

    return query select true, affected_rows > 0;
    return;
  end if;

  delete from public.version_hearts
  where profile_id = current_user_id
    and song_version_id = target_version_id;
  get diagnostics affected_rows = row_count;

  return query select false, affected_rows > 0;
end;
$$;

revoke all on function public.toggle_version_heart(uuid, boolean) from public;
grant execute on function public.toggle_version_heart(uuid, boolean)
to authenticated, service_role;
