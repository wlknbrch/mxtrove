-- Notify comment authors when another profile hearts their comment.

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

create or replace function public.create_comment_heart_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_author_id uuid;
  target_post_id uuid;
begin
  select comment.author_id, comment.post_id
  into target_author_id, target_post_id
  from public.comments as comment
  where comment.id = new.comment_id
    and comment.deleted_at is null;

  if target_author_id is not null and target_author_id <> new.profile_id then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      post_id,
      comment_id
    )
    values (
      target_author_id,
      new.profile_id,
      'comment_heart',
      target_post_id,
      new.comment_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists comment_hearts_create_notifications on public.comment_hearts;
create trigger comment_hearts_create_notifications
after insert on public.comment_hearts
for each row
execute procedure public.create_comment_heart_notification();

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
