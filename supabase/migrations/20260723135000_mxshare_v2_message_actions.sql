-- MxShare V2: safe message references and sender-controlled message deletion.

create or replace function public.can_profile_view_song_version(
  target_version_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.song_versions as version
    join public.songs as song on song.id = version.song_id
    where version.id = target_version_id
      and (
        song.owner_id = target_profile_id
        or (
          version.collaboration_project_id is not null
          and public.can_view_collaboration_project(
            version.collaboration_project_id,
            target_profile_id
          )
        )
        or exists (
          select 1
          from public.single_posts as single_post
          where single_post.featured_version_id = version.id
            and public.can_view_post(single_post.post_id, target_profile_id)
        )
        or exists (
          select 1
          from public.release_tracks as release_track
          where release_track.song_version_id = version.id
            and public.can_view_post(release_track.post_id, target_profile_id)
        )
      )
  );
$$;

create or replace function public.create_message_reference_attachment(
  target_message_id uuid,
  target_attachment_type text,
  target_id uuid
)
returns public.message_attachments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  target_message public.messages%rowtype;
  reference_title text;
  result_attachment public.message_attachments%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_attachment_type not in (
    'project_reference',
    'post_reference',
    'song_version_reference'
  ) then
    raise exception 'Unsupported message reference type.';
  end if;

  select *
  into target_message
  from public.messages
  where id = target_message_id
    and sender_id = current_user_id
    and deleted_at is null;

  if target_message.id is null
    or not public.is_conversation_member(target_message.conversation_id, current_user_id) then
    raise exception 'Message not found.';
  end if;

  if target_attachment_type = 'project_reference' then
    select title into reference_title
    from public.collaboration_projects
    where id = target_id
      and archived_at is null;

    if reference_title is null or exists (
      select 1
      from public.conversation_members as member
      where member.conversation_id = target_message.conversation_id
        and not public.can_view_collaboration_project(target_id, member.profile_id)
    ) then
      raise exception 'Every conversation member must be able to view this project.';
    end if;
  elsif target_attachment_type = 'post_reference' then
    select title into reference_title
    from public.posts
    where id = target_id;

    if reference_title is null or exists (
      select 1
      from public.conversation_members as member
      where member.conversation_id = target_message.conversation_id
        and not public.can_view_post(target_id, member.profile_id)
    ) then
      raise exception 'Every conversation member must be able to view this release.';
    end if;
  else
    select song.title || ' · ' || version.version_label
    into reference_title
    from public.song_versions as version
    join public.songs as song on song.id = version.song_id
    where version.id = target_id;

    if reference_title is null or exists (
      select 1
      from public.conversation_members as member
      where member.conversation_id = target_message.conversation_id
        and not public.can_profile_view_song_version(target_id, member.profile_id)
    ) then
      raise exception 'Every conversation member must be able to view this song version.';
    end if;
  end if;

  insert into public.message_attachments (
    message_id,
    owner_id,
    attachment_type,
    post_id,
    project_id,
    song_version_id,
    filename,
    mime_type,
    bytes
  )
  values (
    target_message_id,
    current_user_id,
    target_attachment_type,
    case when target_attachment_type = 'post_reference' then target_id else null end,
    case when target_attachment_type = 'project_reference' then target_id else null end,
    case when target_attachment_type = 'song_version_reference' then target_id else null end,
    reference_title,
    'application/x-mxshare-reference',
    0
  )
  returning * into result_attachment;

  return result_attachment;
end;
$$;

create or replace function public.delete_own_message(target_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_rows integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if exists (
    select 1
    from public.message_attachments
    where message_id = target_message_id
      and deleted_at is null
  ) then
    raise exception 'Delete the message attachments before deleting the message.';
  end if;

  update public.messages
  set
    body = '',
    deleted_at = timezone('utc', now()),
    edited_at = timezone('utc', now())
  where id = target_message_id
    and sender_id = auth.uid()
    and deleted_at is null;

  get diagnostics updated_rows = row_count;
  return updated_rows > 0;
end;
$$;

drop policy if exists "message attachments sender insert" on public.message_attachments;
create policy "message attachments inserted by trusted functions"
on public.message_attachments for insert
with check (false);

grant execute on function public.can_profile_view_song_version(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.create_message_reference_attachment(uuid, text, uuid)
  to authenticated;
grant execute on function public.delete_own_message(uuid)
  to authenticated;
