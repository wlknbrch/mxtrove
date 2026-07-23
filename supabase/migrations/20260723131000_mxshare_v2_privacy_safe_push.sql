-- MxShare V2: include project routing and the recipient's privacy choice in push claims.

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

revoke all on function public.claim_push_delivery_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_push_delivery_batch(integer) to service_role;
