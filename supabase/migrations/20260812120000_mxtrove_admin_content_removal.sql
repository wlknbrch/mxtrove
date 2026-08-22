-- Admin content removal for public releases and comments.
-- Removal affects MxTrove visibility only; user-owned cloud originals remain untouched.

alter table public.notifications
  add column if not exists context jsonb not null default '{}'::jsonb;

alter table public.notifications
  drop constraint if exists notifications_context_object_check;

alter table public.notifications
  add constraint notifications_context_object_check
  check (jsonb_typeof(context) = 'object');

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
      'share_link_review',
      'content_moderated'
    )
  );

create table if not exists public.admin_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete restrict,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  reason text not null,
  target_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint admin_moderation_actions_target_type_check
    check (target_type in ('post', 'comment')),
  constraint admin_moderation_actions_action_check
    check (action in ('remove')),
  constraint admin_moderation_actions_reason_check
    check (reason in ('copyright', 'hate', 'harassment', 'sexual_content', 'illegal_content', 'spam', 'other')),
  constraint admin_moderation_actions_snapshot_object_check
    check (jsonb_typeof(target_snapshot) = 'object')
);

create index if not exists admin_moderation_actions_target_created_idx
  on public.admin_moderation_actions (target_type, target_id, created_at desc);

create index if not exists admin_moderation_actions_actor_created_idx
  on public.admin_moderation_actions (actor_id, created_at desc);

alter table public.admin_moderation_actions enable row level security;

drop policy if exists "moderation actions admins select" on public.admin_moderation_actions;
create policy "moderation actions admins select"
on public.admin_moderation_actions for select
using (public.is_app_admin(auth.uid(), 'moderator'));

create or replace function public.create_content_moderation_notification(
  target_recipient_id uuid,
  target_reason text,
  target_type text,
  target_label text,
  target_location text,
  target_action text,
  target_post_id uuid default null,
  target_comment_id uuid default null,
  target_conversation_id uuid default null,
  target_action_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_notification_id uuid;
begin
  if target_recipient_id is null then
    return null;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    post_id,
    comment_id,
    conversation_id,
    context
  )
  values (
    target_recipient_id,
    null,
    'content_moderated',
    target_post_id,
    target_comment_id,
    target_conversation_id,
    jsonb_strip_nulls(jsonb_build_object(
      'reason', target_reason,
      'target_type', target_type,
      'target_label', target_label,
      'location', target_location,
      'action', target_action,
      'moderation_action_id', target_action_id
    ))
  )
  returning id into created_notification_id;

  return created_notification_id;
end;
$$;

create or replace function public.remove_public_content_for_moderation(
  target_content_type text,
  target_content_id uuid,
  removal_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_reason text := lower(btrim(coalesce(removal_reason, '')));
  target_post public.posts%rowtype;
  target_comment public.comments%rowtype;
  target_snapshot jsonb;
  action_id uuid;
  action_time timestamptz := timezone('utc', now());
  recipient_id uuid;
  target_label text;
  target_location text;
  target_post_id uuid;
  target_comment_id uuid;
begin
  if not public.is_app_admin(auth.uid(), 'moderator') then
    raise exception 'Administrator access required.';
  end if;

  if target_content_type not in ('post', 'comment') then
    raise exception 'Only public posts and comments can be removed here.';
  end if;

  if normalized_reason not in ('copyright', 'hate', 'harassment', 'sexual_content', 'illegal_content', 'spam', 'other') then
    raise exception 'Choose a valid moderation reason.';
  end if;

  if target_content_type = 'post' then
    select post.* into target_post
    from public.posts as post
    where post.id = target_content_id
    for update;

    if target_post.id is null then
      raise exception 'The release could not be found.';
    end if;
    if target_post.visibility <> 'public' or not target_post.is_published then
      raise exception 'Private and unpublished releases are outside the moderation dashboard.';
    end if;
    if target_post.hidden_at is not null then
      raise exception 'This release has already been removed.';
    end if;
    target_snapshot := jsonb_build_object(
      'title', target_post.title,
      'owner_id', target_post.owner_id,
      'post_type', target_post.post_type,
      'visibility', target_post.visibility
    );
    recipient_id := target_post.owner_id;
    target_label := target_post.title;
    target_location := 'Public release “' || target_post.title || '”';
    target_post_id := target_post.id;

    update public.posts
    set hidden_at = action_time,
        activity_at = action_time
    where id = target_post.id;
  else
    select comment.* into target_comment
    from public.comments as comment
    join public.posts as post on post.id = comment.post_id
    where comment.id = target_content_id
      and post.visibility = 'public'
      and post.is_published
      and post.hidden_at is null
    for update of comment;

    if target_comment.id is null then
      raise exception 'The public comment could not be found.';
    end if;
    if target_comment.deleted_at is not null then
      raise exception 'This comment has already been removed.';
    end if;
    target_snapshot := jsonb_build_object(
      'body', target_comment.body,
      'author_id', target_comment.author_id,
      'post_id', target_comment.post_id,
      'parent_comment_id', target_comment.parent_comment_id
    );
    recipient_id := target_comment.author_id;
    target_label := left(target_comment.body, 180);
    target_post_id := target_comment.post_id;
    target_comment_id := target_comment.id;
    select 'Comment on “' || post.title || '”'
    into target_location
    from public.posts as post
    where post.id = target_comment.post_id;

    update public.comments
    set deleted_at = action_time,
        updated_at = action_time
    where id = target_comment.id;
  end if;

  insert into public.admin_moderation_actions (
    actor_id,
    target_type,
    target_id,
    action,
    reason,
    target_snapshot
  )
  values (
    auth.uid(),
    target_content_type,
    target_content_id,
    'remove',
    normalized_reason,
    target_snapshot
  )
  returning id into action_id;

  perform public.create_content_moderation_notification(
    recipient_id,
    normalized_reason,
    target_content_type,
    target_label,
    target_location,
    case
      when target_content_type = 'post' then 'The release was removed from MxTrove.'
      else 'The comment was removed from MxTrove.'
    end,
    target_post_id,
    target_comment_id,
    null,
    action_id
  );

  update public.reports
  set status = 'action_taken',
      reviewed_by = auth.uid(),
      reviewed_at = action_time,
      target_hidden_at = action_time
  where reports.target_type = target_content_type
    and reports.target_id = target_content_id
    and reports.status in ('open', 'reviewing');

  return jsonb_build_object(
    'action_id', action_id,
    'target_type', target_content_type,
    'target_id', target_content_id,
    'removed_at', action_time
  );
end;
$$;

create or replace function public.moderate_report_v2(
  target_report_id uuid,
  next_status text,
  internal_note text default null,
  hide_target boolean default false,
  suspension_days integer default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_report public.reports%rowtype;
  target_profile_id uuid;
  notification_post_id uuid;
  notification_comment_id uuid;
  notification_conversation_id uuid;
  target_label text;
  target_location text;
  action_summary text;
begin
  if not public.is_app_admin(auth.uid(), 'moderator') then
    raise exception 'Administrator access required.';
  end if;
  if next_status not in ('open', 'reviewing', 'action_taken', 'dismissed') then
    raise exception 'Unsupported report status.';
  end if;
  if suspension_days is not null and suspension_days not between 1 and 90 then
    raise exception 'Suspension duration must be between 1 and 90 days.';
  end if;

  select * into target_report
  from public.reports
  where id = target_report_id
  for update;
  if target_report.id is null then
    raise exception 'Report not found.';
  end if;

  if target_report.target_type = 'profile' then
    target_profile_id := target_report.target_id;
  elsif target_report.target_type = 'post' then
    select owner_id into target_profile_id
    from public.posts where id = target_report.target_id;
  elsif target_report.target_type = 'comment' then
    select author_id into target_profile_id
    from public.comments where id = target_report.target_id;
  elsif target_report.target_type = 'message' then
    select sender_id into target_profile_id
    from public.messages where id = target_report.target_id;
  elsif target_report.target_type = 'project_invite' then
    select invited_by into target_profile_id
    from public.collaboration_project_invites where id = target_report.target_id;
  elsif target_report.target_type = 'share_link' then
    select owner_id into target_profile_id
    from public.share_links where id = target_report.target_id;
  end if;

  update public.reports
  set
    status = next_status,
    reviewed_by = auth.uid(),
    reviewed_at = timezone('utc', now()),
    target_hidden_at = case when hide_target then timezone('utc', now()) else target_hidden_at end
  where id = target_report_id;

  if nullif(btrim(internal_note), '') is not null then
    insert into public.report_admin_notes (report_id, author_id, body)
    values (target_report_id, auth.uid(), btrim(internal_note));
  end if;

  if target_report.target_type = 'profile' then
    target_profile_id := target_report.target_id;
    target_label := 'Your profile';
    target_location := 'Public profile';
    if hide_target then
      update public.profiles set deactivated_at = coalesce(deactivated_at, timezone('utc', now()))
      where id = target_report.target_id;
      action_summary := 'Your public profile was deactivated on MxTrove.';
    end if;
  elsif target_report.target_type = 'post' then
    select owner_id, title, id
    into target_profile_id, target_label, notification_post_id
    from public.posts where id = target_report.target_id;
    target_location := 'Public release “' || coalesce(target_label, 'Untitled release') || '”';
    if hide_target then
      update public.posts set hidden_at = timezone('utc', now()) where id = target_report.target_id;
      action_summary := 'The release was removed from MxTrove.';
    end if;
  elsif target_report.target_type = 'comment' then
    select comment.author_id, left(comment.body, 180), comment.id, comment.post_id,
           'Comment on “' || post.title || '”'
    into target_profile_id, target_label, notification_comment_id, notification_post_id, target_location
    from public.comments as comment
    join public.posts as post on post.id = comment.post_id
    where comment.id = target_report.target_id;
    if hide_target then
      update public.comments set deleted_at = coalesce(deleted_at, timezone('utc', now()))
      where id = target_report.target_id;
      action_summary := 'The comment was removed from MxTrove.';
    end if;
  elsif target_report.target_type = 'message' then
    select sender_id, conversation_id
    into target_profile_id, notification_conversation_id
    from public.messages where id = target_report.target_id;
    target_label := 'Direct message';
    target_location := 'Direct message conversation';
    if hide_target then
      update public.messages set deleted_at = coalesce(deleted_at, timezone('utc', now()))
      where id = target_report.target_id;
      action_summary := 'The message was removed from MxTrove.';
    end if;
  elsif target_report.target_type = 'project_invite' then
    select invited_by into target_profile_id
    from public.collaboration_project_invites where id = target_report.target_id;
    target_label := 'Project invitation';
    target_location := 'Collaboration invitation';
    if hide_target then
      update public.collaboration_project_invites
      set status = 'revoked', revoked_at = coalesce(revoked_at, timezone('utc', now()))
      where id = target_report.target_id and status = 'pending';
      action_summary := 'The project invitation was revoked.';
    end if;
  elsif target_report.target_type = 'share_link' then
    select owner_id into target_profile_id from public.share_links where id = target_report.target_id;
    target_label := 'Protected review link';
    target_location := 'Private sharing';
    if hide_target then
      update public.share_links
      set is_active = false, revoked_at = coalesce(revoked_at, timezone('utc', now()))
      where id = target_report.target_id;
      action_summary := 'The protected share link was revoked.';
    end if;
  end if;

  if suspension_days is not null and target_profile_id is not null then
    update public.profiles
    set suspended_until = timezone('utc', now()) + make_interval(days => suspension_days)
    where id = target_profile_id;
    action_summary := concat_ws(
      ' ',
      nullif(action_summary, ''),
      'The account was suspended for ' || suspension_days || case when suspension_days = 1 then ' day.' else ' days.' end
    );
  end if;

  if target_profile_id is not null
    and (hide_target or suspension_days is not null)
  then
    perform public.create_content_moderation_notification(
      target_profile_id,
      target_report.reason,
      target_report.target_type,
      coalesce(target_label, initcap(replace(target_report.target_type, '_', ' '))),
      coalesce(target_location, initcap(replace(target_report.target_type, '_', ' '))),
      coalesce(action_summary, 'A moderation action was taken on MxTrove.'),
      notification_post_id,
      notification_comment_id,
      notification_conversation_id,
      null
    );
  end if;
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
    when 'content_moderated' then true
    else false
  end;
end;
$$;

drop function if exists public.claim_push_delivery_batch(integer);

create function public.claim_push_delivery_batch(batch_size integer default 20)
returns table (
  queue_item_id uuid,
  notification_id uuid,
  recipient_id uuid,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  notification_type text,
  notification_context jsonb,
  post_id uuid,
  project_id uuid,
  song_version_id uuid,
  comment_id uuid,
  conversation_id uuid,
  actor_display_name text,
  actor_username text,
  post_title text,
  privacy_safe_push boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required.';
  end if;

  return query
  with claimed as (
    select queue.id
    from public.push_delivery_queue as queue
    where queue.status in ('pending', 'failed')
      and queue.available_at <= timezone('utc', now())
    order by queue.created_at asc
    for update skip locked
    limit greatest(batch_size, 1)
  ),
  updated as (
    update public.push_delivery_queue as queue
    set
      status = 'processing',
      locked_at = timezone('utc', now()),
      locked_by = coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), 'service-role'),
      updated_at = timezone('utc', now())
    from claimed
    where queue.id = claimed.id
    returning queue.*
  )
  select
    updated.id as queue_item_id,
    updated.notification_id,
    updated.recipient_id,
    subscriptions.id as subscription_id,
    subscriptions.endpoint,
    subscriptions.p256dh,
    subscriptions.auth,
    notification.type as notification_type,
    notification.context as notification_context,
    notification.post_id,
    notification.project_id,
    notification.song_version_id,
    notification.comment_id,
    notification.conversation_id,
    actor.display_name as actor_display_name,
    actor.username as actor_username,
    post.title as post_title,
    coalesce(preference.privacy_safe_push, true) as privacy_safe_push
  from updated
  join public.notifications as notification
    on notification.id = updated.notification_id
  join public.push_subscriptions as subscriptions
    on subscriptions.profile_id = updated.recipient_id
   and subscriptions.is_active = true
  left join public.notification_preferences as preference
    on preference.profile_id = updated.recipient_id
  left join public.profiles as actor
    on actor.id = notification.actor_id
  left join public.posts as post
    on post.id = notification.post_id;
end;
$$;

revoke all on table public.admin_moderation_actions from anon, authenticated;
grant select on table public.admin_moderation_actions to authenticated;

revoke all on function public.remove_public_content_for_moderation(text, uuid, text) from public;
grant execute on function public.remove_public_content_for_moderation(text, uuid, text) to authenticated, service_role;
revoke all on function public.create_content_moderation_notification(uuid, text, text, text, text, text, uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_push_delivery_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_push_delivery_batch(integer) to service_role;
grant execute on function public.moderate_report_v2(uuid, text, text, boolean, integer) to authenticated;
