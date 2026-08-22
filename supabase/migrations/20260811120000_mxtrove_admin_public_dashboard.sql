-- MxTrove admin dashboard: public activity monitoring without private-content access.

create or replace function public.get_admin_dashboard_v1(activity_days integer default 14)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  requested_days integer := greatest(7, least(coalesce(activity_days, 14), 90));
  dashboard jsonb;
begin
  if not public.is_app_admin(auth.uid(), 'moderator') then
    raise exception 'Administrator access required.';
  end if;

  with public_posts as materialized (
    select post.*
    from public.posts as post
    where post.visibility = 'public'
      and post.is_published
      and post.hidden_at is null
  ),
  public_comments as materialized (
    select comment.*
    from public.comments as comment
    join public_posts as post on post.id = comment.post_id
    where comment.deleted_at is null
  ),
  public_profiles as materialized (
    select profile.*
    from public.profiles as profile
    left join public.profile_privacy_settings as privacy
      on privacy.profile_id = profile.id
    where profile.deactivated_at is null
      and coalesce(privacy.profile_visibility, 'public') = 'public'
      and coalesce(privacy.allow_profile_discovery, true)
  ),
  public_asset_usage as materialized (
    select post.artwork_asset_id as asset_id, post.id as post_id
    from public_posts as post
    where post.artwork_asset_id is not null
    union
    select track.preview_asset_id, track.post_id
    from public.release_tracks as track
    join public_posts as post on post.id = track.post_id
    where track.preview_asset_id is not null
    union
    select version.preview_asset_id, single.post_id
    from public.single_posts as single
    join public_posts as post on post.id = single.post_id
    join public.song_versions as version on version.id = single.featured_version_id
    where version.preview_asset_id is not null
  ),
  public_assets as materialized (
    select distinct asset.*
    from public.assets as asset
    join public_asset_usage as usage on usage.asset_id = asset.id
    where asset.asset_type in ('audio_preview', 'cover_artwork')
  )
  select jsonb_build_object(
    'generated_at', timezone('utc', now()),
    'window_days', requested_days,
    'privacy_boundary', jsonb_build_object(
      'public_releases_only', true,
      'public_comments_only', true,
      'discoverable_profiles_only', true,
      'private_assets_excluded', true,
      'messages_excluded', true
    ),
    'totals', jsonb_build_object(
      'public_releases', (select count(*) from public_posts),
      'public_comments', (select count(*) from public_comments),
      'discoverable_creators', (select count(*) from public_profiles),
      'public_media_assets', (select count(*) from public_assets),
      'public_media_bytes', (select coalesce(sum(asset.bytes), 0) from public_assets as asset),
      'open_reports', (
        select count(*)
        from public.reports as report
        where report.status in ('open', 'reviewing')
      ),
      'reports_last_30_days', (
        select count(*)
        from public.reports as report
        where report.created_at >= timezone('utc', now()) - interval '30 days'
      )
    ),
    'daily_activity', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', activity_day.day::date,
          'releases', (
            select count(*)
            from public_posts as post
            where coalesce(post.published_at, post.created_at) >= activity_day.day
              and coalesce(post.published_at, post.created_at) < activity_day.day + interval '1 day'
          ),
          'comments', (
            select count(*)
            from public_comments as comment
            where comment.created_at >= activity_day.day
              and comment.created_at < activity_day.day + interval '1 day'
          ),
          'creators', (
            select count(*)
            from public_profiles as profile
            where profile.created_at >= activity_day.day
              and profile.created_at < activity_day.day + interval '1 day'
          )
        )
        order by activity_day.day
      )
      from generate_series(
        date_trunc('day', timezone('utc', now())) - make_interval(days => requested_days - 1),
        date_trunc('day', timezone('utc', now())),
        interval '1 day'
      ) as activity_day(day)
    ), '[]'::jsonb),
    'release_mix', coalesce((
      select jsonb_agg(
        jsonb_build_object('type', release_count.post_type, 'count', release_count.total)
        order by release_count.total desc, release_count.post_type
      )
      from (
        select post.post_type, count(*) as total
        from public_posts as post
        group by post.post_type
      ) as release_count
    ), '[]'::jsonb),
    'storage_mix', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'provider', storage_count.provider,
          'assets', storage_count.asset_count,
          'bytes', storage_count.total_bytes
        )
        order by storage_count.asset_count desc, storage_count.provider
      )
      from (
        select
          asset.provider,
          count(*) as asset_count,
          coalesce(sum(asset.bytes), 0) as total_bytes
        from public_assets as asset
        group by asset.provider
      ) as storage_count
    ), '[]'::jsonb),
    'report_statuses', coalesce((
      select jsonb_agg(
        jsonb_build_object('status', report_count.status, 'count', report_count.total)
        order by report_count.status
      )
      from (
        select report.status, count(*) as total
        from public.reports as report
        group by report.status
      ) as report_count
    ), '[]'::jsonb),
    'recent_releases', coalesce((
      select jsonb_agg(to_jsonb(release_row) order by release_row.activity_at desc)
      from (
        select
          post.id,
          post.title,
          post.post_type,
          post.activity_at,
          profile.id as owner_id,
          profile.username,
          profile.display_name,
          (select count(*) from public.post_hearts as heart where heart.post_id = post.id) as heart_count,
          (select count(*) from public_comments as comment where comment.post_id = post.id) as comment_count
        from public_posts as post
        join public.profiles as profile on profile.id = post.owner_id
        order by post.activity_at desc
        limit 12
      ) as release_row
    ), '[]'::jsonb),
    'recent_comments', coalesce((
      select jsonb_agg(to_jsonb(comment_row) order by comment_row.created_at desc)
      from (
        select
          comment.id,
          comment.body,
          comment.created_at,
          comment.post_id,
          post.title as post_title,
          profile.id as author_id,
          profile.username,
          profile.display_name,
          (select count(*) from public.comment_hearts as heart where heart.comment_id = comment.id) as heart_count,
          (select count(*) from public_comments as reply where reply.parent_comment_id = comment.id) as reply_count
        from public_comments as comment
        join public_posts as post on post.id = comment.post_id
        join public.profiles as profile on profile.id = comment.author_id
        order by comment.created_at desc
        limit 12
      ) as comment_row
    ), '[]'::jsonb),
    'recent_creators', coalesce((
      select jsonb_agg(to_jsonb(creator_row) order by creator_row.created_at desc)
      from (
        select
          profile.id,
          profile.username,
          profile.display_name,
          profile.created_at,
          (select count(*) from public_posts as post where post.owner_id = profile.id) as public_release_count
        from public_profiles as profile
        order by profile.created_at desc
        limit 10
      ) as creator_row
    ), '[]'::jsonb),
    'recent_media', coalesce((
      select jsonb_agg(to_jsonb(media_row) order by media_row.created_at desc)
      from (
        select deduplicated_media.*
        from (
          select distinct on (asset.id)
            asset.id,
            asset.asset_type,
            asset.provider,
            asset.bytes,
            asset.created_at,
            post.id as post_id,
            post.title as post_title
          from public_assets as asset
          join public_asset_usage as usage on usage.asset_id = asset.id
          join public_posts as post on post.id = usage.post_id
          order by asset.id, post.activity_at desc
        ) as deduplicated_media
        order by deduplicated_media.created_at desc
        limit 12
      ) as media_row
    ), '[]'::jsonb)
  ) into dashboard;

  return dashboard;
end;
$$;

revoke all on function public.get_admin_dashboard_v1(integer) from public;
grant execute on function public.get_admin_dashboard_v1(integer) to authenticated, service_role;
