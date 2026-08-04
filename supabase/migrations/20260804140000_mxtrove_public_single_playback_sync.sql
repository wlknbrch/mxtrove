-- Keep public single posts and their featured playback versions readable together.

create or replace function public.ensure_public_single_playback_version(target_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from public.posts as post
    where post.id = target_post_id
      and post.post_type = 'single'
      and post.visibility = 'public'
      and post.is_published = true
  ) then
    update public.song_versions as version
    set
      is_published = true,
      published_at = coalesce(version.published_at, timezone('utc', now())),
      updated_at = timezone('utc', now())
    from public.single_posts as single_link
    where single_link.post_id = target_post_id
      and version.id = single_link.featured_version_id
      and version.is_published = false;
  end if;
end;
$$;

create or replace function public.sync_public_single_playback_from_post()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.ensure_public_single_playback_version(new.id);
  return new;
end;
$$;

create or replace function public.sync_public_single_playback_from_single_link()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.ensure_public_single_playback_version(new.post_id);
  return new;
end;
$$;

drop trigger if exists posts_sync_public_single_playback_version on public.posts;
create trigger posts_sync_public_single_playback_version
after insert or update of visibility, is_published on public.posts
for each row
execute function public.sync_public_single_playback_from_post();

drop trigger if exists single_posts_sync_public_single_playback_version on public.single_posts;
create trigger single_posts_sync_public_single_playback_version
after insert or update of featured_version_id on public.single_posts
for each row
execute function public.sync_public_single_playback_from_single_link();

update public.song_versions as version
set
  is_published = true,
  published_at = coalesce(version.published_at, timezone('utc', now())),
  updated_at = timezone('utc', now())
from public.single_posts as single_link
join public.posts as post on post.id = single_link.post_id
where version.id = single_link.featured_version_id
  and post.post_type = 'single'
  and post.visibility = 'public'
  and post.is_published = true
  and version.is_published = false;

revoke all on function public.ensure_public_single_playback_version(uuid) from public;
revoke all on function public.sync_public_single_playback_from_post() from public;
revoke all on function public.sync_public_single_playback_from_single_link() from public;
