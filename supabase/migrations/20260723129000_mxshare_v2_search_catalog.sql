-- MxShare V2: permission-scoped cross-category search.

create index if not exists songs_title_search_idx
  on public.songs using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(notes, '')));

create index if not exists messages_body_search_idx
  on public.messages using gin (to_tsvector('simple', coalesce(body, '')))
  where deleted_at is null;

create index if not exists profiles_public_search_idx
  on public.profiles using gin (
    to_tsvector('simple', coalesce(username, '') || ' ' || coalesce(display_name, '') || ' ' || coalesce(bio, ''))
  );

create or replace function public.search_v2_catalog(
  raw_query text,
  result_limit integer default 40
)
returns table (
  result_kind text,
  result_id uuid,
  context_id uuid,
  title text,
  subtitle text,
  rank real
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  query_value tsquery := websearch_to_tsquery('simple', raw_query);
begin
  if current_user_id is null or nullif(btrim(raw_query), '') is null then
    return;
  end if;

  return query
  with results as (
    select
      'creator'::text,
      profile.id,
      null::uuid,
      profile.display_name,
      '@' || profile.username,
      ts_rank(
        to_tsvector('simple', coalesce(profile.username, '') || ' ' || coalesce(profile.display_name, '') || ' ' || coalesce(profile.bio, '')),
        query_value
      )
    from public.profiles as profile
    left join public.profile_privacy_settings as privacy on privacy.profile_id = profile.id
    where public.can_view_profile(profile.id, current_user_id)
      and coalesce(privacy.allow_profile_discovery, true)
      and not public.is_profile_suspended(profile.id)
      and to_tsvector('simple', coalesce(profile.username, '') || ' ' || coalesce(profile.display_name, '') || ' ' || coalesce(profile.bio, '')) @@ query_value

    union all

    select
      'release'::text,
      post.id,
      post.id,
      post.title,
      profile.display_name,
      ts_rank(
        to_tsvector('simple', coalesce(post.title, '') || ' ' || coalesce(post.description, '') || ' ' || coalesce(post.release_notes, '')),
        query_value
      )
    from public.posts as post
    join public.profiles as profile on profile.id = post.owner_id
    where public.can_view_post(post.id, current_user_id)
      and post.hidden_at is null
      and to_tsvector('simple', coalesce(post.title, '') || ' ' || coalesce(post.description, '') || ' ' || coalesce(post.release_notes, '')) @@ query_value

    union all

    select
      'song'::text,
      song.id,
      song.id,
      song.title,
      case when song.owner_id = current_user_id then 'Your private library' else 'Shared music' end,
      ts_rank(to_tsvector('simple', coalesce(song.title, '') || ' ' || coalesce(song.notes, '')), query_value)
    from public.songs as song
    where (
        song.owner_id = current_user_id
        or exists (
          select 1
          from public.collaboration_project_tracks as track
          where track.song_id = song.id
            and public.can_view_collaboration_project(track.project_id, current_user_id)
        )
        or exists (
          select 1 from public.single_posts as single_post
          where single_post.song_id = song.id
            and public.can_view_post(single_post.post_id, current_user_id)
        )
        or exists (
          select 1 from public.release_tracks as release_track
          where release_track.song_id = song.id
            and public.can_view_post(release_track.post_id, current_user_id)
        )
      )
      and to_tsvector('simple', coalesce(song.title, '') || ' ' || coalesce(song.notes, '')) @@ query_value

    union all

    select
      'project'::text,
      project.id,
      project.id,
      project.title,
      project.status,
      ts_rank(
        to_tsvector('simple', coalesce(project.title, '') || ' ' || coalesce(project.description, '')),
        query_value
      )
    from public.collaboration_projects as project
    where public.can_view_collaboration_project(project.id, current_user_id)
      and to_tsvector('simple', coalesce(project.title, '') || ' ' || coalesce(project.description, '')) @@ query_value

    union all

    select
      'project'::text,
      feedback.id,
      feedback.project_id,
      coalesce(feedback.title, 'Feedback at ' || round(feedback.start_seconds)::text || 's'),
      left(feedback.body, 180),
      ts_rank(
        to_tsvector('simple', coalesce(feedback.title, '') || ' ' || coalesce(feedback.body, '')),
        query_value
      )
    from public.feedback_threads as feedback
    where public.can_review_project(feedback.project_id, current_user_id)
      and to_tsvector('simple', coalesce(feedback.title, '') || ' ' || coalesce(feedback.body, '')) @@ query_value

    union all

    select
      'release'::text,
      credit.id,
      credit.post_id,
      credit.display_name,
      credit.role,
      similarity(credit.display_name, raw_query)::real
    from public.post_credits as credit
    where public.can_view_post(credit.post_id, current_user_id)
      and credit.display_name % raw_query

    union all

    select
      'message'::text,
      message.id,
      message.conversation_id,
      left(message.body, 100),
      'Message in your conversation',
      ts_rank(to_tsvector('simple', coalesce(message.body, '')), query_value)
    from public.messages as message
    where message.deleted_at is null
      and public.is_conversation_member(message.conversation_id, current_user_id)
      and to_tsvector('simple', coalesce(message.body, '')) @@ query_value
  )
  select *
  from results
  order by rank desc, title
  limit greatest(1, least(result_limit, 100));
end;
$$;

grant execute on function public.search_v2_catalog(text, integer) to authenticated;
