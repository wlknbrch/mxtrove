create index if not exists feed_events_actor_created_idx
on public.feed_events (actor_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
on public.notifications (recipient_id, is_read, created_at desc);

create index if not exists messages_conversation_created_desc_idx
on public.messages (conversation_id, created_at desc);

create index if not exists conversation_members_profile_last_read_idx
on public.conversation_members (profile_id, last_read_at);

create or replace view public.profile_public_metrics
with (security_invoker = true)
as
with follower_counts as (
  select
    follows.followed_id as profile_id,
    count(*)::integer as followers_count
  from public.follows
  group by follows.followed_id
),
following_counts as (
  select
    follows.follower_id as profile_id,
    count(*)::integer as following_count
  from public.follows
  group by follows.follower_id
),
public_post_counts as (
  select
    posts.owner_id as profile_id,
    count(*)::integer as public_posts_count,
    count(*) filter (where posts.post_type = 'single')::integer as single_count,
    count(*) filter (where posts.post_type = 'ep')::integer as ep_count,
    count(*) filter (where posts.post_type = 'album')::integer as album_count,
    max(posts.activity_at) as last_public_activity_at
  from public.posts
  where posts.visibility = 'public'
  group by posts.owner_id
)
select
  profiles.id as profile_id,
  coalesce(follower_counts.followers_count, 0)::integer as followers_count,
  coalesce(following_counts.following_count, 0)::integer as following_count,
  coalesce(public_post_counts.public_posts_count, 0)::integer as public_posts_count,
  coalesce(public_post_counts.single_count, 0)::integer as single_count,
  coalesce(public_post_counts.ep_count, 0)::integer as ep_count,
  coalesce(public_post_counts.album_count, 0)::integer as album_count,
  public_post_counts.last_public_activity_at
from public.profiles
left join follower_counts
  on follower_counts.profile_id = profiles.id
left join following_counts
  on following_counts.profile_id = profiles.id
left join public_post_counts
  on public_post_counts.profile_id = profiles.id;

create or replace function public.follow_profile(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
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

  if not exists (
    select 1
    from public.profiles
    where profiles.id = target_profile_id
  ) then
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

create or replace function public.unfollow_profile(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_rows integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  delete from public.follows
  where follower_id = current_user_id
    and followed_id = target_profile_id;

  get diagnostics deleted_rows = row_count;
  return deleted_rows > 0;
end;
$$;

create or replace function public.list_home_feed_post_ids(
  limit_count integer default 50,
  offset_count integer default 0
)
returns table (
  post_id uuid,
  feed_created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with relevant_actors as (
    select auth.uid() as actor_id
    union
    select follows.followed_id
    from public.follows
    where follows.follower_id = auth.uid()
  ),
  ranked_posts as (
    select
      feed_events.post_id,
      max(feed_events.created_at) as feed_created_at
    from public.feed_events
    join public.posts
      on posts.id = feed_events.post_id
    join relevant_actors
      on relevant_actors.actor_id = feed_events.actor_id
    where posts.visibility = 'public'
    group by feed_events.post_id
  )
  select
    ranked_posts.post_id,
    ranked_posts.feed_created_at
  from ranked_posts
  order by ranked_posts.feed_created_at desc
  offset greatest(offset_count, 0)
  limit greatest(limit_count, 1);
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
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_relation text := lower(relation);
  normalized_search text := nullif(btrim(search_query), '');
begin
  if normalized_relation not in ('followers', 'following') then
    raise exception 'Relation must be followers or following.';
  end if;

  return query
  with connection_rows as (
    select
      case
        when normalized_relation = 'followers' then follows.follower_id
        else follows.followed_id
      end as related_profile_id,
      follows.created_at as connected_at
    from public.follows
    where (
      normalized_relation = 'followers'
      and follows.followed_id = target_profile_id
    ) or (
      normalized_relation = 'following'
      and follows.follower_id = target_profile_id
    )
  )
  select
    profiles.id as profile_id,
    profiles.username,
    profiles.display_name,
    profiles.bio,
    profiles.avatar_asset_id,
    coalesce(metrics.followers_count, 0)::integer as followers_count,
    coalesce(metrics.following_count, 0)::integer as following_count,
    coalesce(metrics.public_posts_count, 0)::integer as public_posts_count,
    coalesce(metrics.single_count, 0)::integer as single_count,
    coalesce(metrics.ep_count, 0)::integer as ep_count,
    coalesce(metrics.album_count, 0)::integer as album_count,
    exists (
      select 1
      from public.follows as reverse_follow
      where reverse_follow.follower_id = profiles.id
        and reverse_follow.followed_id = current_user_id
    ) as follows_you,
    exists (
      select 1
      from public.follows as viewer_follow
      where viewer_follow.follower_id = current_user_id
        and viewer_follow.followed_id = profiles.id
    ) as viewer_follows_profile,
    connection_rows.connected_at
  from connection_rows
  join public.profiles
    on profiles.id = connection_rows.related_profile_id
  left join public.profile_public_metrics as metrics
    on metrics.profile_id = profiles.id
  where normalized_search is null
    or profiles.username ilike '%' || normalized_search || '%'
    or profiles.display_name ilike '%' || normalized_search || '%'
  order by connection_rows.connected_at desc, profiles.display_name asc
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
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_search text := nullif(btrim(search_query), '');
begin
  return query
  select
    profiles.id as profile_id,
    profiles.username,
    profiles.display_name,
    profiles.bio,
    profiles.avatar_asset_id,
    coalesce(metrics.followers_count, 0)::integer as followers_count,
    coalesce(metrics.following_count, 0)::integer as following_count,
    coalesce(metrics.public_posts_count, 0)::integer as public_posts_count,
    coalesce(metrics.single_count, 0)::integer as single_count,
    coalesce(metrics.ep_count, 0)::integer as ep_count,
    coalesce(metrics.album_count, 0)::integer as album_count,
    exists (
      select 1
      from public.follows as reverse_follow
      where reverse_follow.follower_id = profiles.id
        and reverse_follow.followed_id = current_user_id
    ) as follows_you,
    exists (
      select 1
      from public.follows as viewer_follow
      where viewer_follow.follower_id = current_user_id
        and viewer_follow.followed_id = profiles.id
    ) as viewer_follows_profile,
    metrics.last_public_activity_at
  from public.profiles
  join public.profile_public_metrics as metrics
    on metrics.profile_id = profiles.id
  where profiles.id <> current_user_id
    and metrics.public_posts_count > 0
    and (
      normalized_search is null
      or profiles.username ilike '%' || normalized_search || '%'
      or profiles.display_name ilike '%' || normalized_search || '%'
    )
  order by
    metrics.last_public_activity_at desc nulls last,
    metrics.followers_count desc,
    profiles.created_at desc
  offset greatest(offset_count, 0)
  limit greatest(limit_count, 1);
end;
$$;

create or replace function public.mark_conversation_read(target_conversation_id uuid)
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

  update public.conversation_members
  set last_read_at = timezone('utc', now())
  where conversation_id = target_conversation_id
    and profile_id = current_user_id;
end;
$$;

create or replace function public.notify_direct_message_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, conversation_id)
  select
    conversation_members.profile_id,
    new.sender_id,
    'message',
    new.conversation_id
  from public.conversation_members
  where conversation_members.conversation_id = new.conversation_id
    and conversation_members.profile_id <> new.sender_id;

  return new;
end;
$$;

drop trigger if exists messages_create_notifications on public.messages;
create trigger messages_create_notifications
after insert on public.messages
for each row
execute procedure public.notify_direct_message_members();

create policy "conversation members update own read state"
on public.conversation_members for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());
