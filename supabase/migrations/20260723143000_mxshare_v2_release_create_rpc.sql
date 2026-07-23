create or replace function public.create_release_post(
  next_post_type text,
  next_title text,
  next_description text default null,
  next_release_url text default null,
  next_artwork_asset_id uuid default null,
  next_visibility text default 'public',
  next_tracks jsonb default '[]'::jsonb
)
returns public.posts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  created_post public.posts%rowtype;
  normalized_title text := coalesce(nullif(btrim(next_title), ''), 'Untitled release');
  normalized_description text := nullif(btrim(coalesce(next_description, '')), '');
  normalized_release_url text := nullif(btrim(coalesce(next_release_url, '')), '');
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if next_post_type not in ('ep', 'album') then
    raise exception 'Release posts must be EPs or albums.';
  end if;

  begin
    insert into public.posts (
      owner_id,
      post_type,
      title,
      description,
      release_url,
      artwork_asset_id,
      visibility,
      is_published,
      published_at,
      activity_at
    )
    values (
      current_user_id,
      next_post_type,
      normalized_title,
      normalized_description,
      normalized_release_url,
      next_artwork_asset_id,
      next_visibility,
      next_visibility <> 'private',
      case when next_visibility <> 'private' then timezone('utc', now()) else null end,
      timezone('utc', now())
    )
    returning *
    into created_post;

    perform public.update_release_post(
      created_post.id,
      normalized_title,
      coalesce(normalized_description, ''),
      coalesce(normalized_release_url, ''),
      next_artwork_asset_id,
      coalesce(next_tracks, '[]'::jsonb)
    );

    select *
    into created_post
    from public.posts
    where id = created_post.id;

    return created_post;
  exception
    when others then
      if created_post.id is not null then
        delete from public.posts
        where id = created_post.id;
      end if;
      raise;
  end;
end;
$$;

revoke all on function public.create_release_post(text, text, text, text, uuid, text, jsonb) from public;
grant execute on function public.create_release_post(text, text, text, text, uuid, text, jsonb) to authenticated;
grant execute on function public.create_release_post(text, text, text, text, uuid, text, jsonb) to service_role;
