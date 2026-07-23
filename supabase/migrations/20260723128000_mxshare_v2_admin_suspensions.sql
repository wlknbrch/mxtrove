-- MxShare V2: explicit, server-controlled temporary account suspensions.

alter table public.profiles
  add column suspended_until timestamptz;

create index profiles_active_suspension_idx
  on public.profiles (suspended_until)
  where suspended_until is not null;

create or replace function public.is_profile_suspended(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_profile_id
      and suspended_until is not null
      and suspended_until > timezone('utc', now())
  );
$$;

create or replace function public.reject_suspended_profile_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and public.is_profile_suspended(auth.uid()) then
    raise exception 'This account is temporarily suspended.';
  end if;
  return new;
end;
$$;

create trigger posts_reject_suspended_write
before insert or update on public.posts
for each row execute procedure public.reject_suspended_profile_write();

create trigger comments_reject_suspended_write
before insert or update on public.comments
for each row execute procedure public.reject_suspended_profile_write();

create trigger messages_reject_suspended_write
before insert or update on public.messages
for each row execute procedure public.reject_suspended_profile_write();

create trigger follows_reject_suspended_write
before insert or update on public.follows
for each row execute procedure public.reject_suspended_profile_write();

create trigger project_invites_reject_suspended_write
before insert or update on public.collaboration_project_invites
for each row execute procedure public.reject_suspended_profile_write();

create trigger song_versions_reject_suspended_write
before insert or update on public.song_versions
for each row execute procedure public.reject_suspended_profile_write();

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
    if hide_target then
      update public.profiles set deactivated_at = coalesce(deactivated_at, timezone('utc', now()))
      where id = target_report.target_id;
    end if;
  elsif target_report.target_type = 'post' then
    select owner_id into target_profile_id from public.posts where id = target_report.target_id;
    if hide_target then
      update public.posts set hidden_at = timezone('utc', now()) where id = target_report.target_id;
    end if;
  elsif target_report.target_type = 'comment' then
    select author_id into target_profile_id from public.comments where id = target_report.target_id;
    if hide_target then
      update public.comments set deleted_at = coalesce(deleted_at, timezone('utc', now()))
      where id = target_report.target_id;
    end if;
  elsif target_report.target_type = 'message' then
    select sender_id into target_profile_id from public.messages where id = target_report.target_id;
    if hide_target then
      update public.messages set deleted_at = coalesce(deleted_at, timezone('utc', now()))
      where id = target_report.target_id;
    end if;
  elsif target_report.target_type = 'project_invite' then
    select invited_by into target_profile_id
    from public.collaboration_project_invites where id = target_report.target_id;
    if hide_target then
      update public.collaboration_project_invites
      set status = 'revoked', revoked_at = coalesce(revoked_at, timezone('utc', now()))
      where id = target_report.target_id and status = 'pending';
    end if;
  elsif target_report.target_type = 'share_link' then
    select owner_id into target_profile_id from public.share_links where id = target_report.target_id;
    if hide_target then
      update public.share_links
      set is_active = false, revoked_at = coalesce(revoked_at, timezone('utc', now()))
      where id = target_report.target_id;
    end if;
  end if;

  if suspension_days is not null and target_profile_id is not null then
    update public.profiles
    set suspended_until = timezone('utc', now()) + make_interval(days => suspension_days)
    where id = target_profile_id;
  end if;
end;
$$;

grant execute on function public.is_profile_suspended(uuid) to authenticated, service_role;
grant execute on function public.moderate_report_v2(uuid, text, text, boolean, integer) to authenticated;
