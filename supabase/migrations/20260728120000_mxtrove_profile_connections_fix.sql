-- Fix the profile connection RPC after the privacy migration introduced an
-- ambiguous reference between the table-return column and the privacy table.

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
        from public.profile_privacy_settings as target_privacy
        where target_privacy.profile_id = target_profile_id
          and not target_privacy.show_follower_counts
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

grant execute on function public.list_profile_connections(uuid, text, text, integer, integer)
to authenticated;
