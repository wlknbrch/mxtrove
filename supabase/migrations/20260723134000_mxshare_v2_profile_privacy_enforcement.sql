-- MxShare V2: enforce profile-field privacy in server-side read models.

alter table public.profile_privacy_settings
  add column private_location text;

update public.profile_privacy_settings as privacy
set private_location = profile.location
from public.profiles as profile
where profile.id = privacy.profile_id
  and not privacy.show_location
  and profile.location is not null;

update public.profiles as profile
set location = null
from public.profile_privacy_settings as privacy
where privacy.profile_id = profile.id
  and not privacy.show_location;

create or replace function public.protect_hidden_profile_location()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  location_is_public boolean;
begin
  select coalesce(show_location, true)
  into location_is_public
  from public.profile_privacy_settings
  where profile_id = new.id;

  if location_is_public = false and new.location is not null then
    update public.profile_privacy_settings
    set private_location = new.location
    where profile_id = new.id;
    new.location := null;
  end if;

  return new;
end;
$$;

create trigger profiles_protect_hidden_location
before update of location on public.profiles
for each row execute procedure public.protect_hidden_profile_location();

create or replace function public.get_current_profile_v2()
returns public.profiles
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    return null;
  end if;

  select profile.*
  into result_profile
  from public.profiles as profile
  where profile.id = auth.uid();

  if not found then
    return null;
  end if;

  select coalesce(privacy.private_location, result_profile.location)
  into result_profile.location
  from public.profile_privacy_settings as privacy
  where privacy.profile_id = result_profile.id;

  return result_profile;
end;
$$;

create or replace function public.get_profile_by_username_v2(target_username text)
returns public.profiles
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result_profile public.profiles%rowtype;
  location_is_public boolean;
  hidden_location text;
begin
  select profile.*
  into result_profile
  from public.profiles as profile
  where lower(profile.username) = lower(regexp_replace(btrim(target_username), '^@+', ''))
  limit 1;

  if not found
    or not public.can_view_profile(result_profile.id, auth.uid()) then
    return null;
  end if;

  select
    coalesce(privacy.show_location, true),
    privacy.private_location
  into location_is_public, hidden_location
  from public.profile_privacy_settings as privacy
  where privacy.profile_id = result_profile.id;

  location_is_public := coalesce(location_is_public, true);

  if result_profile.id = auth.uid() then
    result_profile.location := coalesce(hidden_location, result_profile.location);
  elsif not location_is_public then
    result_profile.location := null;
  end if;

  return result_profile;
end;
$$;

create or replace function public.save_profile_v2(
  next_display_name text,
  next_username text,
  next_bio text,
  next_location text,
  next_website_url text,
  next_instagram_url text,
  next_spotify_url text,
  next_youtube_url text,
  next_support_url text,
  next_avatar_asset_id uuid
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result_profile public.profiles%rowtype;
  location_is_public boolean;
  normalized_location text := nullif(btrim(next_location), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select coalesce(show_location, true)
  into location_is_public
  from public.profile_privacy_settings
  where profile_id = auth.uid();

  location_is_public := coalesce(location_is_public, true);

  update public.profiles
  set
    display_name = btrim(next_display_name),
    username = lower(btrim(next_username)),
    bio = nullif(btrim(next_bio), ''),
    location = case when location_is_public then normalized_location else null end,
    website_url = nullif(btrim(next_website_url), ''),
    instagram_url = nullif(btrim(next_instagram_url), ''),
    spotify_url = nullif(btrim(next_spotify_url), ''),
    youtube_url = nullif(btrim(next_youtube_url), ''),
    support_url = nullif(btrim(next_support_url), ''),
    avatar_asset_id = next_avatar_asset_id,
    onboarding_completed = true
  where id = auth.uid()
  returning * into result_profile;

  if not found then
    raise exception 'Profile not found.';
  end if;

  update public.profile_privacy_settings
  set private_location = case when location_is_public then null else normalized_location end
  where profile_id = auth.uid();

  result_profile.location := normalized_location;
  return result_profile;
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
  current_public_location text;
  current_private_location text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select profile.location, privacy.private_location
  into current_public_location, current_private_location
  from public.profiles as profile
  left join public.profile_privacy_settings as privacy
    on privacy.profile_id = profile.id
  where profile.id = auth.uid();

  insert into public.profile_privacy_settings (
    profile_id,
    profile_visibility,
    message_permission,
    project_invite_permission,
    show_location,
    show_follower_counts,
    show_activity_status,
    allow_profile_discovery,
    private_location
  )
  values (
    auth.uid(),
    next_profile_visibility,
    next_message_permission,
    next_project_invite_permission,
    next_show_location,
    next_show_follower_counts,
    next_show_activity_status,
    next_allow_profile_discovery,
    case
      when next_show_location then null
      else coalesce(current_public_location, current_private_location)
    end
  )
  on conflict (profile_id)
  do update set
    profile_visibility = excluded.profile_visibility,
    message_permission = excluded.message_permission,
    project_invite_permission = excluded.project_invite_permission,
    show_location = excluded.show_location,
    show_follower_counts = excluded.show_follower_counts,
    show_activity_status = excluded.show_activity_status,
    allow_profile_discovery = excluded.allow_profile_discovery,
    private_location = excluded.private_location
  returning * into updated_settings;

  if next_show_location then
    update public.profiles
    set location = coalesce(current_public_location, current_private_location)
    where id = auth.uid();
  else
    update public.profiles
    set location = null
    where id = auth.uid();
  end if;

  return updated_settings;
end;
$$;

create or replace function public.get_profile_metrics_v2(target_profile_id uuid)
returns table (
  profile_id uuid,
  followers_count integer,
  following_count integer,
  public_posts_count integer,
  single_count integer,
  ep_count integer,
  album_count integer,
  last_public_activity_at timestamptz,
  follower_counts_visible boolean,
  activity_visible boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    metrics.profile_id,
    case
      when metrics.profile_id = auth.uid() or coalesce(privacy.show_follower_counts, true)
        then metrics.followers_count
      else 0
    end,
    case
      when metrics.profile_id = auth.uid() or coalesce(privacy.show_follower_counts, true)
        then metrics.following_count
      else 0
    end,
    metrics.public_posts_count,
    metrics.single_count,
    metrics.ep_count,
    metrics.album_count,
    case
      when metrics.profile_id = auth.uid() or coalesce(privacy.show_activity_status, true)
        then metrics.last_public_activity_at
      else null
    end,
    metrics.profile_id = auth.uid() or coalesce(privacy.show_follower_counts, true),
    metrics.profile_id = auth.uid() or coalesce(privacy.show_activity_status, true)
  from public.profile_public_metrics as metrics
  left join public.profile_privacy_settings as privacy
    on privacy.profile_id = metrics.profile_id
  where metrics.profile_id = target_profile_id
    and public.can_view_profile(metrics.profile_id, auth.uid());
$$;

create or replace function public.list_profile_connections(
  target_profile_id uuid,
  relation text,
  search_query text default null,
  limit_count integer default 50,
  offset_count integer default 0
)
returns table (
  profile_id uuid,
  username text,
  display_name text,
  bio text,
  avatar_asset_id uuid,
  followers_count integer,
  following_count integer,
  public_posts_count integer,
  single_count integer,
  ep_count integer,
  album_count integer,
  follows_you boolean,
  viewer_follows_profile boolean,
  connected_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_relation text := lower(relation);
  normalized_search text := nullif(btrim(search_query), '');
begin
  if normalized_relation not in ('followers', 'following') then
    raise exception 'Relation must be followers or following.';
  end if;

  if not public.can_view_profile(target_profile_id, current_user_id)
    or (
      target_profile_id <> current_user_id
      and exists (
        select 1
        from public.profile_privacy_settings
        where profile_id = target_profile_id
          and not show_follower_counts
      )
    ) then
    return;
  end if;

  return query
  with connection_rows as (
    select
      case
        when normalized_relation = 'followers' then follow.follower_id
        else follow.followed_id
      end as related_profile_id,
      follow.created_at as connected_at
    from public.follows as follow
    where (
      normalized_relation = 'followers'
      and follow.followed_id = target_profile_id
    ) or (
      normalized_relation = 'following'
      and follow.follower_id = target_profile_id
    )
  )
  select
    profile.id,
    profile.username,
    profile.display_name,
    profile.bio,
    profile.avatar_asset_id,
    case
      when profile.id = current_user_id or coalesce(privacy.show_follower_counts, true)
        then coalesce(metrics.followers_count, 0)::integer
      else 0
    end,
    case
      when profile.id = current_user_id or coalesce(privacy.show_follower_counts, true)
        then coalesce(metrics.following_count, 0)::integer
      else 0
    end,
    coalesce(metrics.public_posts_count, 0)::integer,
    coalesce(metrics.single_count, 0)::integer,
    coalesce(metrics.ep_count, 0)::integer,
    coalesce(metrics.album_count, 0)::integer,
    public.follows_profile(profile.id, current_user_id),
    public.follows_profile(current_user_id, profile.id),
    connection_rows.connected_at
  from connection_rows
  join public.profiles as profile
    on profile.id = connection_rows.related_profile_id
  left join public.profile_public_metrics as metrics
    on metrics.profile_id = profile.id
  left join public.profile_privacy_settings as privacy
    on privacy.profile_id = profile.id
  where public.can_view_profile(profile.id, current_user_id)
    and (
      normalized_search is null
      or profile.username ilike '%' || normalized_search || '%'
      or profile.display_name ilike '%' || normalized_search || '%'
    )
  order by connection_rows.connected_at desc, profile.display_name asc
  offset greatest(offset_count, 0)
  limit greatest(limit_count, 1);
end;
$$;

create or replace function public.list_public_creators(
  search_query text default null,
  limit_count integer default 18,
  offset_count integer default 0
)
returns table (
  profile_id uuid,
  username text,
  display_name text,
  bio text,
  avatar_asset_id uuid,
  followers_count integer,
  following_count integer,
  public_posts_count integer,
  single_count integer,
  ep_count integer,
  album_count integer,
  follows_you boolean,
  viewer_follows_profile boolean,
  last_public_activity_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_search text := nullif(btrim(search_query), '');
begin
  return query
  select
    profile.id,
    profile.username,
    profile.display_name,
    profile.bio,
    profile.avatar_asset_id,
    case
      when coalesce(privacy.show_follower_counts, true)
        then coalesce(metrics.followers_count, 0)::integer
      else 0
    end,
    case
      when coalesce(privacy.show_follower_counts, true)
        then coalesce(metrics.following_count, 0)::integer
      else 0
    end,
    coalesce(metrics.public_posts_count, 0)::integer,
    coalesce(metrics.single_count, 0)::integer,
    coalesce(metrics.ep_count, 0)::integer,
    coalesce(metrics.album_count, 0)::integer,
    public.follows_profile(profile.id, current_user_id),
    public.follows_profile(current_user_id, profile.id),
    case
      when coalesce(privacy.show_activity_status, true)
        then metrics.last_public_activity_at
      else null
    end
  from public.profiles as profile
  join public.profile_public_metrics as metrics
    on metrics.profile_id = profile.id
  left join public.profile_privacy_settings as privacy
    on privacy.profile_id = profile.id
  where profile.id <> current_user_id
    and profile.deactivated_at is null
    and metrics.public_posts_count > 0
    and coalesce(privacy.allow_profile_discovery, true)
    and public.can_view_profile(profile.id, current_user_id)
    and (
      normalized_search is null
      or profile.username ilike '%' || normalized_search || '%'
      or profile.display_name ilike '%' || normalized_search || '%'
    )
  order by
    case
      when coalesce(privacy.show_activity_status, true)
        then metrics.last_public_activity_at
      else null
    end desc nulls last,
    case
      when coalesce(privacy.show_follower_counts, true)
        then metrics.followers_count
      else 0
    end desc,
    profile.created_at desc
  offset greatest(offset_count, 0)
  limit greatest(limit_count, 1);
end;
$$;

grant execute on function public.get_current_profile_v2() to authenticated;
grant execute on function public.get_profile_by_username_v2(text) to anon, authenticated;
grant execute on function public.save_profile_v2(text, text, text, text, text, text, text, text, text, uuid) to authenticated;
grant execute on function public.get_profile_metrics_v2(uuid) to anon, authenticated;
