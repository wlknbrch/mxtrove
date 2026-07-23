begin;

create or replace function public.update_feedback_thread_status(
  target_thread_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_thread public.feedback_threads%rowtype;
begin
  if next_status not in ('open', 'in_progress', 'resolved', 'wont_fix') then
    raise exception 'Unsupported feedback status.';
  end if;

  select * into target_thread
  from public.feedback_threads
  where id = target_thread_id
  for update;

  if target_thread.id is null
    or not public.can_review_project(target_thread.project_id, current_user_id) then
    raise exception 'Feedback thread not found.';
  end if;

  update public.feedback_threads
  set
    status = next_status,
    resolved_at = case when next_status in ('resolved', 'wont_fix') then timezone('utc', now()) else null end,
    resolved_by = case when next_status in ('resolved', 'wont_fix') then current_user_id else null end
  where id = target_thread_id;

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_thread.project_id,
    current_user_id,
    case when next_status = 'resolved' then 'feedback_resolved' else 'feedback_status_changed' end,
    'feedback',
    target_thread_id,
    jsonb_build_object('status', next_status)
  );
end;
$$;

create or replace function public.update_song_version_review_status(
  target_project_id uuid,
  target_version_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if next_status not in ('not_requested', 'review_requested', 'changes_requested', 'approved') then
    raise exception 'Unsupported review status.';
  end if;

  if not public.can_review_project(target_project_id, current_user_id) then
    raise exception 'You cannot review this project.';
  end if;

  update public.song_versions
  set review_status = next_status
  where id = target_version_id
    and collaboration_project_id = target_project_id;

  if not found then
    raise exception 'Project version not found.';
  end if;

  insert into public.collaboration_activity (
    project_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_project_id,
    current_user_id,
    'version_review_status_changed',
    'song_version',
    target_version_id,
    jsonb_build_object('review_status', next_status)
  );
end;
$$;

revoke all on function public.update_feedback_thread_status(uuid, text) from public;
revoke all on function public.update_song_version_review_status(uuid, uuid, text) from public;
grant execute on function public.update_feedback_thread_status(uuid, text) to authenticated;
grant execute on function public.update_song_version_review_status(uuid, uuid, text) to authenticated;

commit;
