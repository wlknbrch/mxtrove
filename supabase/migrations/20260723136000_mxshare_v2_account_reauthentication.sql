-- Require a recent first-factor authentication before starting the destructive
-- account deletion lifecycle. Supabase preserves AMR timestamps across token
-- refreshes, so refreshing an old session alone does not satisfy this check.
create or replace function public.request_account_deletion(
  grace_period_days integer default 14,
  remove_cloud_files boolean default false
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  scheduled_time timestamptz;
  latest_auth_at bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select max(
    case
      when jsonb_typeof(method_reference) = 'object'
        and method_reference ? 'timestamp'
      then (method_reference ->> 'timestamp')::bigint
      else null
    end
  )
  into latest_auth_at
  from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb))
    as method_reference;

  if latest_auth_at is null
    or latest_auth_at < extract(epoch from timezone('utc', now()) - interval '10 minutes')::bigint
  then
    raise exception 'Recent authentication required.';
  end if;

  scheduled_time := timezone('utc', now())
    + make_interval(days => greatest(1, least(grace_period_days, 30)));

  insert into public.account_deletion_requests (
    profile_id,
    status,
    requested_at,
    scheduled_for,
    cancelled_at,
    completed_at,
    delete_cloud_files
  )
  values (
    auth.uid(),
    'scheduled',
    timezone('utc', now()),
    scheduled_time,
    null,
    null,
    remove_cloud_files
  )
  on conflict (profile_id)
  do update set
    status = 'scheduled',
    requested_at = timezone('utc', now()),
    scheduled_for = excluded.scheduled_for,
    cancelled_at = null,
    completed_at = null,
    delete_cloud_files = excluded.delete_cloud_files;

  update public.profiles
  set
    deactivated_at = timezone('utc', now()),
    deletion_scheduled_at = scheduled_time
  where id = auth.uid();

  return scheduled_time;
end;
$$;

grant execute on function public.request_account_deletion(integer, boolean)
  to authenticated;
