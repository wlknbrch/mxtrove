-- Engaged-follower release updates, invoker-safe public metrics, and realtime cache invalidation.

create or replace view public.post_public_metrics
with (security_invoker = true)
as
select
  posts.id as post_id,
  count(distinct post_hearts.profile_id) as heart_count,
  count(distinct comments.id) filter (where comments.deleted_at is null) as comment_count,
  count(distinct version_hearts.profile_id) as featured_version_heart_count
from public.posts
left join public.post_hearts on post_hearts.post_id = posts.id
left join public.comments on comments.post_id = posts.id
left join public.single_posts on single_posts.post_id = posts.id
left join public.version_hearts on version_hearts.song_version_id = single_posts.featured_version_id
group by posts.id;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'follow',
      'post_heart',
      'version_heart',
      'comment_heart',
      'comment',
      'comment_reply',
      'single_version',
      'release_update',
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

create or replace function public.create_engaged_follower_release_update_notifications()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    post_id
  )
  select distinct
    follow.follower_id,
    new.owner_id,
    'release_update',
    new.id
  from public.follows as follow
  where follow.followed_id = new.owner_id
    and follow.follower_id <> new.owner_id
    and public.can_view_post(new.id, follow.follower_id)
    and (
      exists (
        select 1
        from public.post_hearts as heart
        where heart.post_id = new.id
          and heart.profile_id = follow.follower_id
      )
      or exists (
        select 1
        from public.comments as comment
        where comment.post_id = new.id
          and comment.author_id = follow.follower_id
          and comment.deleted_at is null
      )
    )
    and not exists (
      select 1
      from public.notifications as existing
      where existing.recipient_id = follow.follower_id
        and existing.actor_id = new.owner_id
        and existing.type = 'release_update'
        and existing.post_id = new.id
        and existing.created_at >= timezone('utc', now()) - interval '15 minutes'
    );

  return new;
end;
$$;

drop trigger if exists posts_notify_engaged_followers_on_update on public.posts;
create trigger posts_notify_engaged_followers_on_update
after update of title, description, artwork_asset_id, release_url, visibility
on public.posts
for each row
execute procedure public.create_engaged_follower_release_update_notifications();

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
    when 'comment_heart' then preference_row.comments_enabled
    when 'comment' then preference_row.comments_enabled
    when 'comment_reply' then preference_row.replies_enabled
    when 'message' then preference_row.messages_enabled
    when 'single_version' then preference_row.single_updates_enabled
    when 'release_update' then preference_row.single_updates_enabled
    when 'project_invite' then preference_row.project_invites_enabled
    when 'project_invite_accepted' then preference_row.project_invites_enabled
    when 'project_member_removed' then preference_row.project_activity_enabled
    when 'project_role_changed' then preference_row.project_activity_enabled
    when 'project_feedback' then preference_row.project_feedback_enabled
    when 'project_feedback_reply' then preference_row.project_feedback_enabled
    when 'project_feedback_resolved' then preference_row.project_feedback_enabled
    when 'project_version_uploaded' then preference_row.project_activity_enabled
    when 'project_status_changed' then preference_row.project_activity_enabled
    when 'message_attachment' then preference_row.message_attachments_enabled
    when 'share_link_review' then preference_row.project_feedback_enabled
    else false
  end;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['posts', 'feed_events']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
