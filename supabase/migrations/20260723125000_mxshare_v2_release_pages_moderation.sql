-- MxShare V2: release credits/links/slugs, embeds, social previews, moderation, and scoped search.

alter table public.posts
  add column slug text,
  add column release_notes text,
  add column allow_embed boolean not null default true,
  add column hidden_at timestamptz,
  add constraint posts_slug_format_check
    check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create unique index posts_owner_slug_key
  on public.posts (owner_id, slug)
  where slug is not null;

create table public.post_credits (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  display_name text not null,
  role text not null,
  position integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint post_credits_position_key unique (post_id, position),
  constraint post_credits_position_check check (position > 0),
  constraint post_credits_name_check
    check (char_length(btrim(display_name)) between 1 and 120),
  constraint post_credits_role_check
    check (
      role in (
        'artist',
        'featured_artist',
        'producer',
        'composer',
        'lyricist',
        'vocalist',
        'instrumentalist',
        'mix_engineer',
        'mastering_engineer',
        'artwork',
        'other'
      )
    )
);

create table public.post_external_links (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  platform text not null,
  label text not null,
  url text not null,
  position integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint post_external_links_position_key unique (post_id, position),
  constraint post_external_links_position_check check (position > 0),
  constraint post_external_links_platform_check
    check (platform in ('spotify', 'apple_music', 'youtube', 'bandcamp', 'soundcloud', 'website', 'download', 'other')),
  constraint post_external_links_url_check
    check (url ~* '^https://')
);

create table public.social_preview_cache (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  cache_key text not null unique,
  storage_key text not null unique,
  mime_type text not null default 'image/png',
  bytes bigint not null,
  content_hash text not null,
  generated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  constraint social_preview_cache_target_check
    check (target_type in ('post', 'profile')),
  constraint social_preview_cache_bytes_check check (bytes > 0)
);

create table public.app_admin_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, role),
  constraint app_admin_roles_role_check
    check (role in ('moderator', 'admin'))
);

create table public.report_admin_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint report_admin_notes_body_check
    check (char_length(btrim(body)) between 1 and 5000)
);

update public.reports
set status = 'action_taken'
where status = 'resolved';

alter table public.reports
  drop constraint if exists reports_status_check;

alter table public.reports
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz,
  add column target_hidden_at timestamptz,
  add constraint reports_status_check
    check (status in ('open', 'reviewing', 'action_taken', 'dismissed')),
  add constraint reports_target_type_check
    check (target_type in ('profile', 'post', 'comment', 'message', 'project_invite', 'share_link'));

alter table public.notification_preferences
  add column project_invites_enabled boolean not null default true,
  add column project_feedback_enabled boolean not null default true,
  add column project_activity_enabled boolean not null default true,
  add column message_attachments_enabled boolean not null default true,
  add column privacy_safe_push boolean not null default true;

create index post_credits_post_position_idx
  on public.post_credits (post_id, position);
create index post_credits_profile_idx
  on public.post_credits (profile_id)
  where profile_id is not null;
create index post_credits_display_name_trgm_idx
  on public.post_credits using gin (display_name gin_trgm_ops);
create index post_external_links_post_position_idx
  on public.post_external_links (post_id, position);
create index reports_status_created_idx
  on public.reports (status, created_at desc);
create index report_admin_notes_report_created_idx
  on public.report_admin_notes (report_id, created_at);
create index collaboration_projects_search_idx
  on public.collaboration_projects using gin (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  );
create index feedback_threads_search_idx
  on public.feedback_threads using gin (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))
  );

create or replace function public.slugify_release_title(raw_title text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(
    both '-'
    from regexp_replace(
      regexp_replace(lower(coalesce(raw_title, 'release')), '[^a-z0-9]+', '-', 'g'),
      '-+',
      '-',
      'g'
    )
  );
$$;

create or replace function public.ensure_post_slug()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  base_slug text;
begin
  if new.slug is not null and btrim(new.slug) <> '' then
    new.slug := public.slugify_release_title(new.slug);
    return new;
  end if;

  base_slug := left(public.slugify_release_title(new.title), 70);
  if base_slug = '' then
    base_slug := 'release';
  end if;

  new.slug := base_slug || '-' || substring(new.id::text from 1 for 8);
  return new;
end;
$$;

create trigger posts_ensure_slug
before insert or update of slug, title on public.posts
for each row execute procedure public.ensure_post_slug();

update public.posts
set slug = null
where slug is null;

insert into public.post_external_links (post_id, platform, label, url, position)
select
  post.id,
  'other',
  'Release link',
  post.release_url,
  1
from public.posts as post
where post.release_url is not null
  and post.release_url ~* '^https://'
  and not exists (
    select 1
    from public.post_external_links
    where post_id = post.id
  );

create or replace function public.is_app_admin(
  target_profile_id uuid default auth.uid(),
  minimum_role text default 'moderator'
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.app_admin_roles
    where profile_id = target_profile_id
      and (
        role = 'admin'
        or (minimum_role = 'moderator' and role = 'moderator')
      )
  );
$$;

create or replace function public.replace_release_credits(
  target_post_id uuid,
  next_credits jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.posts
    where id = target_post_id
      and owner_id = auth.uid()
  ) then
    raise exception 'Release not found.';
  end if;

  if jsonb_typeof(coalesce(next_credits, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(next_credits, '[]'::jsonb)) > 40 then
    raise exception 'Credits must be an array with at most 40 entries.';
  end if;

  delete from public.post_credits
  where post_id = target_post_id;

  insert into public.post_credits (
    post_id,
    profile_id,
    display_name,
    role,
    position
  )
  select
    target_post_id,
    credit.profile_id,
    btrim(credit.display_name),
    credit.role,
    credit.position
  from jsonb_to_recordset(coalesce(next_credits, '[]'::jsonb))
    as credit(profile_id uuid, display_name text, role text, position integer);
end;
$$;

create or replace function public.replace_release_external_links(
  target_post_id uuid,
  next_links jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.posts
    where id = target_post_id
      and owner_id = auth.uid()
  ) then
    raise exception 'Release not found.';
  end if;

  if jsonb_typeof(coalesce(next_links, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(next_links, '[]'::jsonb)) > 20 then
    raise exception 'External links must be an array with at most 20 entries.';
  end if;

  delete from public.post_external_links
  where post_id = target_post_id;

  insert into public.post_external_links (
    post_id,
    platform,
    label,
    url,
    position
  )
  select
    target_post_id,
    link.platform,
    btrim(link.label),
    btrim(link.url),
    link.position
  from jsonb_to_recordset(coalesce(next_links, '[]'::jsonb))
    as link(platform text, label text, url text, position integer);

  update public.posts
  set release_url = (
    select url
    from public.post_external_links
    where post_id = target_post_id
    order by position
    limit 1
  )
  where id = target_post_id;
end;
$$;

create or replace function public.moderate_report(
  target_report_id uuid,
  next_status text,
  internal_note text default null,
  hide_target boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_report public.reports%rowtype;
begin
  if not public.is_app_admin(auth.uid(), 'moderator') then
    raise exception 'Administrator access required.';
  end if;

  if next_status not in ('open', 'reviewing', 'action_taken', 'dismissed') then
    raise exception 'Unsupported report status.';
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

  if hide_target and target_report.target_type = 'post' then
    update public.posts
    set hidden_at = timezone('utc', now())
    where id = target_report.target_id;
  elsif hide_target and target_report.target_type = 'comment' then
    update public.comments
    set deleted_at = coalesce(deleted_at, timezone('utc', now()))
    where id = target_report.target_id;
  elsif hide_target and target_report.target_type = 'message' then
    update public.messages
    set deleted_at = coalesce(deleted_at, timezone('utc', now()))
    where id = target_report.target_id;
  elsif hide_target and target_report.target_type = 'profile' then
    update public.profiles
    set deactivated_at = coalesce(deactivated_at, timezone('utc', now()))
    where id = target_report.target_id;
  end if;
end;
$$;

create or replace function public.search_v2(
  raw_query text,
  result_limit integer default 20
)
returns table (
  result_kind text,
  result_id uuid,
  title text,
  subtitle text,
  rank real
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  query_value tsquery := websearch_to_tsquery('simple', raw_query);
begin
  if nullif(btrim(raw_query), '') is null then
    return;
  end if;

  return query
  with results as (
    select
      'release'::text as result_kind,
      post.id as result_id,
      post.title as title,
      profile.display_name as subtitle,
      ts_rank(
        to_tsvector('simple', coalesce(post.title, '') || ' ' || coalesce(post.description, '')),
        query_value
      ) as rank
    from public.posts as post
    join public.profiles as profile on profile.id = post.owner_id
    where public.can_view_post(post.id, current_user_id)
      and post.hidden_at is null
      and to_tsvector('simple', coalesce(post.title, '') || ' ' || coalesce(post.description, '')) @@ query_value

    union all

    select
      'project'::text,
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
      'feedback'::text,
      feedback.id,
      coalesce(feedback.title, 'Feedback at ' || feedback.start_seconds::text),
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
      'credit'::text,
      credit.id,
      credit.display_name,
      credit.role,
      similarity(credit.display_name, raw_query)::real
    from public.post_credits as credit
    where public.can_view_post(credit.post_id, current_user_id)
      and credit.display_name % raw_query
  )
  select *
  from results
  order by rank desc
  limit greatest(1, least(result_limit, 100));
end;
$$;

alter table public.post_credits enable row level security;
alter table public.post_external_links enable row level security;
alter table public.social_preview_cache enable row level security;
alter table public.app_admin_roles enable row level security;
alter table public.report_admin_notes enable row level security;

create policy "post credits visible through release"
on public.post_credits for select
using (public.can_view_post(post_id, auth.uid()));

create policy "post external links visible through release"
on public.post_external_links for select
using (public.can_view_post(post_id, auth.uid()));

create policy "social preview cache service only"
on public.social_preview_cache for select
using (false);

create policy "admin roles self visible"
on public.app_admin_roles for select
using (profile_id = auth.uid() or public.is_app_admin(auth.uid(), 'admin'));

create policy "report admin notes admins only"
on public.report_admin_notes for select
using (public.is_app_admin(auth.uid(), 'moderator'));

drop policy if exists "reports reporter only" on public.reports;
create policy "reports reporter or admins select"
on public.reports for select
using (
  reporter_id = auth.uid()
  or public.is_app_admin(auth.uid(), 'moderator')
);

create policy "reports admins update"
on public.reports for update
using (public.is_app_admin(auth.uid(), 'moderator'))
with check (public.is_app_admin(auth.uid(), 'moderator'));

create or replace function public.can_view_post(
  target_post_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.posts as post
    join public.profiles as owner on owner.id = post.owner_id
    where post.id = target_post_id
      and owner.deactivated_at is null
      and post.hidden_at is null
      and not public.is_profile_blocked_pair(post.owner_id, target_profile_id)
      and (
        post.owner_id = target_profile_id
        or post.visibility = 'public'
        or (
          post.visibility = 'followers'
          and public.follows_profile(target_profile_id, post.owner_id)
        )
        or exists (
          select 1
          from public.collaboration_projects as project
          where project.linked_post_id = post.id
            and public.can_view_collaboration_project(project.id, target_profile_id)
        )
      )
  );
$$;

grant execute on function public.is_app_admin(uuid, text) to authenticated, service_role;
grant execute on function public.replace_release_credits(uuid, jsonb) to authenticated;
grant execute on function public.replace_release_external_links(uuid, jsonb) to authenticated;
grant execute on function public.moderate_report(uuid, text, text, boolean) to authenticated;
grant execute on function public.search_v2(text, integer) to authenticated;
