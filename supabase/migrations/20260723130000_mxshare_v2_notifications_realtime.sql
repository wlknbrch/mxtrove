-- MxShare V2: scoped notification preferences and project-aware feedback reply realtime.

alter table public.feedback_replies
  add column project_id uuid references public.collaboration_projects (id) on delete cascade;

update public.feedback_replies as reply
set project_id = thread.project_id
from public.feedback_threads as thread
where thread.id = reply.thread_id
  and reply.project_id is null;

alter table public.feedback_replies
  alter column project_id set not null;

create index feedback_replies_project_created_idx
  on public.feedback_replies (project_id, created_at);

create or replace function public.set_feedback_reply_project()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select project_id into new.project_id
  from public.feedback_threads
  where id = new.thread_id;
  if new.project_id is null then
    raise exception 'Feedback thread not found.';
  end if;
  return new;
end;
$$;

create trigger feedback_replies_set_project
before insert or update of thread_id on public.feedback_replies
for each row execute procedure public.set_feedback_reply_project();

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

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'notifications',
    'collaboration_projects',
    'collaboration_project_members',
    'collaboration_project_tracks',
    'collaboration_activity',
    'feedback_threads',
    'feedback_replies',
    'protected_media_assets',
    'messages',
    'message_attachments'
  ]
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
