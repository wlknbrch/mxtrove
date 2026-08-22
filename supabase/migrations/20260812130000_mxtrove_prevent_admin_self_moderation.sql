-- Prevent administrators from using moderation powers against their own
-- account or content. Owner edit/delete controls remain the correct path.

create or replace function public.get_admin_report_target_profile_id(target_report_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  target_report public.reports%rowtype;
  target_profile_id uuid;
begin
  if not public.is_app_admin(auth.uid(), 'moderator') then
    raise exception 'Administrator access required.';
  end if;

  select * into target_report
  from public.reports
  where id = target_report_id;

  if target_report.id is null then
    return null;
  end if;

  if target_report.target_type = 'profile' then
    target_profile_id := target_report.target_id;
  elsif target_report.target_type = 'post' then
    select owner_id into target_profile_id from public.posts where id = target_report.target_id;
  elsif target_report.target_type = 'comment' then
    select author_id into target_profile_id from public.comments where id = target_report.target_id;
  elsif target_report.target_type = 'message' then
    select sender_id into target_profile_id from public.messages where id = target_report.target_id;
  elsif target_report.target_type = 'project_invite' then
    select invited_by into target_profile_id
    from public.collaboration_project_invites where id = target_report.target_id;
  elsif target_report.target_type = 'share_link' then
    select owner_id into target_profile_id from public.share_links where id = target_report.target_id;
  end if;

  return target_profile_id;
end;
$$;

create or replace function public.prevent_admin_self_moderation_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_profile_id uuid;
begin
  if new.target_type = 'post' then
    select owner_id into target_profile_id
    from public.posts
    where id = new.target_id;
  elsif new.target_type = 'comment' then
    select author_id into target_profile_id
    from public.comments
    where id = new.target_id;
  end if;

  if target_profile_id = new.actor_id then
    raise exception 'Administrators cannot moderate their own content. Use the normal owner controls instead.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_admin_self_moderation_action
  on public.admin_moderation_actions;
create trigger prevent_admin_self_moderation_action
before insert on public.admin_moderation_actions
for each row execute function public.prevent_admin_self_moderation_action();

create or replace function public.prevent_admin_self_report_moderation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_profile_id uuid;
begin
  if new.reviewed_by is null then
    return new;
  end if;

  if new.target_type = 'profile' then
    target_profile_id := new.target_id;
  elsif new.target_type = 'post' then
    select owner_id into target_profile_id from public.posts where id = new.target_id;
  elsif new.target_type = 'comment' then
    select author_id into target_profile_id from public.comments where id = new.target_id;
  elsif new.target_type = 'message' then
    select sender_id into target_profile_id from public.messages where id = new.target_id;
  elsif new.target_type = 'project_invite' then
    select invited_by into target_profile_id
    from public.collaboration_project_invites where id = new.target_id;
  elsif new.target_type = 'share_link' then
    select owner_id into target_profile_id from public.share_links where id = new.target_id;
  end if;

  if target_profile_id = new.reviewed_by then
    raise exception 'Administrators cannot moderate their own content or account.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_admin_self_report_moderation on public.reports;
create trigger prevent_admin_self_report_moderation
before update on public.reports
for each row execute function public.prevent_admin_self_report_moderation();

revoke all on function public.get_admin_report_target_profile_id(uuid) from public, anon, authenticated;
grant execute on function public.get_admin_report_target_profile_id(uuid) to authenticated, service_role;

revoke all on function public.prevent_admin_self_moderation_action() from public, anon, authenticated;
revoke all on function public.prevent_admin_self_report_moderation() from public, anon, authenticated;
