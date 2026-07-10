create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique default ('user_' || substring(gen_random_uuid()::text from 1 for 8)),
  display_name text not null default 'New artist',
  bio text,
  location text,
  website_url text,
  instagram_url text,
  spotify_url text,
  youtube_url text,
  support_url text,
  avatar_asset_id uuid,
  pinned_post_id uuid,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_username_format_check
    check (username ~ '^[a-z0-9_]{3,30}$')
);

create table if not exists public.cloud_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'google_drive',
  provider_account_email text,
  root_folder_id text,
  audio_originals_folder_id text,
  audio_previews_folder_id text,
  artwork_folder_id text,
  avatars_folder_id text,
  connected_at timestamptz not null default timezone('utc', now()),
  last_verified_at timestamptz,
  constraint cloud_connections_provider_check check (provider = 'google_drive'),
  constraint cloud_connections_profile_provider_key unique (profile_id, provider)
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'google_drive',
  remote_file_id text not null,
  remote_parent_folder_id text,
  filename text not null,
  display_name text,
  mime_type text not null,
  file_extension text not null,
  bytes bigint,
  duration_seconds numeric(10, 2),
  checksum text,
  asset_type text not null,
  access_mode text not null default 'private',
  share_url text,
  view_url text,
  thumbnail_url text,
  waveform_peaks jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint assets_provider_check check (provider = 'google_drive'),
  constraint assets_asset_type_check check (asset_type in ('audio_original', 'audio_preview', 'cover_artwork', 'avatar')),
  constraint assets_access_mode_check check (access_mode in ('private', 'public')),
  constraint assets_owner_remote_file_key unique (owner_id, remote_file_id)
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  notes text,
  default_artwork_asset_id uuid references public.assets (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.song_versions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  source_asset_id uuid not null references public.assets (id) on delete restrict,
  preview_asset_id uuid references public.assets (id) on delete set null,
  version_number integer not null,
  version_label text not null,
  production_stage text not null,
  changelog text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint song_versions_song_version_key unique (song_id, version_number)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  post_type text not null,
  title text not null,
  description text,
  visibility text not null default 'private',
  artwork_asset_id uuid references public.assets (id) on delete set null,
  release_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  activity_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint posts_post_type_check check (post_type in ('single', 'ep', 'album')),
  constraint posts_visibility_check check (visibility in ('private', 'public'))
);

create table if not exists public.single_posts (
  post_id uuid primary key references public.posts (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  featured_version_id uuid not null references public.song_versions (id) on delete restrict
);

create table if not exists public.release_tracks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete restrict,
  song_version_id uuid references public.song_versions (id) on delete set null,
  track_title text not null,
  track_number integer not null,
  preview_asset_id uuid references public.assets (id) on delete set null,
  production_stage text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint release_tracks_post_track_key unique (post_id, track_number),
  constraint release_tracks_track_number_check check (track_number > 0)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, followed_id),
  constraint follows_no_self_follow check (follower_id <> followed_id)
);

create table if not exists public.post_hearts (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, post_id)
);

create table if not exists public.version_hearts (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  song_version_id uuid not null references public.song_versions (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, song_version_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  parent_comment_id uuid references public.comments (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint conversations_kind_check check (kind = 'direct')
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  last_read_at timestamptz,
  primary key (conversation_id, profile_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  edited_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null,
  post_id uuid references public.posts (id) on delete set null,
  song_version_id uuid references public.song_versions (id) on delete set null,
  comment_id uuid references public.comments (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notifications_type_check
    check (type in ('follow', 'post_heart', 'version_heart', 'comment', 'comment_reply', 'single_version', 'message'))
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  constraint reports_reason_check
    check (reason in ('spam', 'harassment', 'copyright', 'hate', 'sexual_content', 'illegal_content', 'other')),
  constraint reports_status_check
    check (status in ('open', 'reviewing', 'resolved', 'dismissed'))
);

create table if not exists public.feed_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  song_version_id uuid references public.song_versions (id) on delete set null,
  event_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint feed_events_type_check check (event_type in ('single_release', 'single_update', 'release_publish'))
);

alter table public.profiles
  add constraint profiles_avatar_asset_id_fkey foreign key (avatar_asset_id) references public.assets (id) on delete set null;

alter table public.profiles
  add constraint profiles_pinned_post_id_fkey foreign key (pinned_post_id) references public.posts (id) on delete set null;

create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists cloud_connections_profile_idx on public.cloud_connections (profile_id);
create index if not exists assets_owner_idx on public.assets (owner_id, asset_type, created_at desc);
create index if not exists assets_access_mode_idx on public.assets (access_mode, asset_type);
create index if not exists songs_owner_idx on public.songs (owner_id, updated_at desc);
create index if not exists song_versions_song_idx on public.song_versions (song_id, version_number desc);
create index if not exists posts_owner_idx on public.posts (owner_id, activity_at desc);
create index if not exists posts_public_activity_idx on public.posts (visibility, activity_at desc);
create index if not exists release_tracks_post_idx on public.release_tracks (post_id, track_number);
create index if not exists follows_followed_idx on public.follows (followed_id, created_at desc);
create index if not exists comments_post_idx on public.comments (post_id, created_at asc);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at asc);
create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index if not exists feed_events_post_idx on public.feed_events (post_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    'user_' || substring(new.id::text from 1 for 8),
    coalesce(new.raw_user_meta_data ->> 'display_name', 'New artist')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.validate_comment_depth()
returns trigger
language plpgsql
as $$
declare
  parent_parent uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select parent_comment_id into parent_parent
  from public.comments
  where id = new.parent_comment_id;

  if parent_parent is not null then
    raise exception 'Comments support only one reply level in V1.';
  end if;

  return new;
end;
$$;

create or replace function public.validate_song_version_assets()
returns trigger
language plpgsql
as $$
declare
  source_type text;
  preview_type text;
begin
  select asset_type into source_type from public.assets where id = new.source_asset_id;
  if source_type <> 'audio_original' then
    raise exception 'Song versions must use a private original asset as source.';
  end if;

  if new.preview_asset_id is not null then
    select asset_type into preview_type from public.assets where id = new.preview_asset_id;
    if preview_type <> 'audio_preview' then
      raise exception 'Preview assets must use the audio_preview asset type.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_single_post()
returns trigger
language plpgsql
as $$
declare
  post_type_value text;
  version_song_id uuid;
begin
  select post_type into post_type_value from public.posts where id = new.post_id;
  if post_type_value <> 'single' then
    raise exception 'single_posts rows must reference a single post.';
  end if;

  select song_id into version_song_id from public.song_versions where id = new.featured_version_id;
  if version_song_id <> new.song_id then
    raise exception 'Featured version must belong to the linked song.';
  end if;

  return new;
end;
$$;

create or replace function public.validate_release_track()
returns trigger
language plpgsql
as $$
declare
  post_type_value text;
  post_visibility text;
  version_song_id uuid;
begin
  select post_type, visibility into post_type_value, post_visibility from public.posts where id = new.post_id;
  if post_type_value not in ('ep', 'album') then
    raise exception 'release_tracks rows must reference an EP or album post.';
  end if;

  if new.song_version_id is not null then
    select song_id into version_song_id from public.song_versions where id = new.song_version_id;
    if version_song_id <> new.song_id then
      raise exception 'Selected track version must belong to the same song.';
    end if;
  end if;

  if post_visibility = 'public' and new.preview_asset_id is null then
    raise exception 'Public EPs and albums need preview assets for every track.';
  end if;

  return new;
end;
$$;

create or replace function public.bump_conversation_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set updated_at = timezone('utc', now())
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists assets_set_updated_at on public.assets;
create trigger assets_set_updated_at before update on public.assets for each row execute procedure public.set_updated_at();
drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at before update on public.songs for each row execute procedure public.set_updated_at();
drop trigger if exists song_versions_set_updated_at on public.song_versions;
create trigger song_versions_set_updated_at before update on public.song_versions for each row execute procedure public.set_updated_at();
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts for each row execute procedure public.set_updated_at();
drop trigger if exists release_tracks_set_updated_at on public.release_tracks;
create trigger release_tracks_set_updated_at before update on public.release_tracks for each row execute procedure public.set_updated_at();
drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at before update on public.conversations for each row execute procedure public.set_updated_at();
drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at before update on public.comments for each row execute procedure public.set_updated_at();

drop trigger if exists comments_validate_depth on public.comments;
create trigger comments_validate_depth before insert or update on public.comments for each row execute procedure public.validate_comment_depth();
drop trigger if exists song_versions_validate_assets on public.song_versions;
create trigger song_versions_validate_assets before insert or update on public.song_versions for each row execute procedure public.validate_song_version_assets();
drop trigger if exists single_posts_validate on public.single_posts;
create trigger single_posts_validate before insert or update on public.single_posts for each row execute procedure public.validate_single_post();
drop trigger if exists release_tracks_validate on public.release_tracks;
create trigger release_tracks_validate before insert or update on public.release_tracks for each row execute procedure public.validate_release_track();
drop trigger if exists messages_bump_conversation on public.messages;
create trigger messages_bump_conversation after insert on public.messages for each row execute procedure public.bump_conversation_updated_at();

create or replace view public.post_public_metrics as
select
  posts.id as post_id,
  count(distinct post_hearts.profile_id) as heart_count,
  count(distinct comments.id) filter (where comments.deleted_at is null) as comment_count,
  count(distinct version_hearts.profile_id) as featured_version_heart_count
from public.posts
left join public.post_hearts on post_hearts.post_id = posts.id
left join public.comments on comments.post_id = posts.id
left join public.single_posts on single_posts.post_id = posts.id
left join public.version_hearts on version_hearts.song_version_id = single_posts.featured_version_id
group by posts.id;

create or replace function public.publish_single_version(version_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_song_id uuid;
  target_preview_asset_id uuid;
  target_post_id uuid;
  existing_published_count integer;
  target_preview_access text;
  target_preview_type text;
  event_name text;
begin
  select song_id, preview_asset_id
  into target_song_id, target_preview_asset_id
  from public.song_versions
  where id = version_id;

  if target_song_id is null then
    raise exception 'Song version not found.';
  end if;

  if not exists (
    select 1
    from public.songs
    where id = target_song_id
      and owner_id = current_user_id
  ) then
    raise exception 'Only the song owner can publish this version.';
  end if;

  if target_preview_asset_id is null then
    raise exception 'A public preview asset is required before publishing.';
  end if;

  select access_mode, asset_type
  into target_preview_access, target_preview_type
  from public.assets
  where id = target_preview_asset_id;

  if target_preview_access <> 'public' or target_preview_type <> 'audio_preview' then
    raise exception 'The selected preview asset is not publicly playable.';
  end if;

  select post_id into target_post_id
  from public.single_posts
  where song_id = target_song_id;

  if target_post_id is null then
    raise exception 'No single post exists for this song yet.';
  end if;

  select count(*)
  into existing_published_count
  from public.song_versions
  where song_id = target_song_id
    and is_published = true
    and id <> version_id;

  event_name := case when existing_published_count > 0 then 'single_update' else 'single_release' end;

  update public.song_versions
  set
    is_published = true,
    published_at = coalesce(published_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id = version_id;

  update public.single_posts
  set featured_version_id = version_id
  where post_id = target_post_id;

  update public.posts
  set
    visibility = 'public',
    is_published = true,
    published_at = coalesce(published_at, timezone('utc', now())),
    activity_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = target_post_id;

  insert into public.feed_events (actor_id, post_id, song_version_id, event_type)
  values (current_user_id, target_post_id, version_id, event_name);

  insert into public.notifications (recipient_id, actor_id, type, post_id, song_version_id)
  select
    follows.follower_id,
    current_user_id,
    'single_version',
    target_post_id,
    version_id
  from public.follows
  where follows.followed_id = current_user_id
    and follows.follower_id <> current_user_id;
end;
$$;

create or replace function public.create_direct_conversation(other_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_conversation_id uuid;
  new_conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if current_user_id = other_profile_id then
    raise exception 'You cannot create a direct conversation with yourself.';
  end if;

  select cm1.conversation_id
  into existing_conversation_id
  from public.conversation_members cm1
  join public.conversation_members cm2
    on cm1.conversation_id = cm2.conversation_id
  join public.conversations c
    on c.id = cm1.conversation_id
  where c.kind = 'direct'
    and cm1.profile_id = current_user_id
    and cm2.profile_id = other_profile_id
  limit 1;

  if existing_conversation_id is not null then
    return existing_conversation_id;
  end if;

  insert into public.conversations (kind)
  values ('direct')
  returning id into new_conversation_id;

  insert into public.conversation_members (conversation_id, profile_id)
  values
    (new_conversation_id, current_user_id),
    (new_conversation_id, other_profile_id);

  return new_conversation_id;
end;
$$;

create or replace function public.mark_notification_read(notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set is_read = true
  where id = notification_id
    and recipient_id = auth.uid();
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set is_read = true
  where recipient_id = auth.uid();
end;
$$;

alter table public.profiles enable row level security;
alter table public.cloud_connections enable row level security;
alter table public.assets enable row level security;
alter table public.songs enable row level security;
alter table public.song_versions enable row level security;
alter table public.posts enable row level security;
alter table public.single_posts enable row level security;
alter table public.release_tracks enable row level security;
alter table public.follows enable row level security;
alter table public.post_hearts enable row level security;
alter table public.version_hearts enable row level security;
alter table public.comments enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.feed_events enable row level security;

create policy "profiles are publicly readable"
on public.profiles for select
using (true);

create policy "profiles insert own row"
on public.profiles for insert
with check (id = auth.uid());

create policy "profiles update own row"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles delete own row"
on public.profiles for delete
using (id = auth.uid());

create policy "cloud connections owner only"
on public.cloud_connections for select
using (profile_id = auth.uid());

create policy "cloud connections insert own"
on public.cloud_connections for insert
with check (profile_id = auth.uid());

create policy "cloud connections update own"
on public.cloud_connections for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "cloud connections delete own"
on public.cloud_connections for delete
using (profile_id = auth.uid());

create policy "assets read owner or public"
on public.assets for select
using (owner_id = auth.uid() or access_mode = 'public');

create policy "assets insert own"
on public.assets for insert
with check (owner_id = auth.uid());

create policy "assets update own"
on public.assets for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "assets delete own"
on public.assets for delete
using (owner_id = auth.uid());

create policy "songs owner only"
on public.songs for select
using (owner_id = auth.uid());

create policy "songs insert own"
on public.songs for insert
with check (owner_id = auth.uid());

create policy "songs update own"
on public.songs for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "songs delete own"
on public.songs for delete
using (owner_id = auth.uid());

create policy "song versions owner or published single"
on public.song_versions for select
using (
  exists (
    select 1
    from public.songs
    where songs.id = song_versions.song_id
      and songs.owner_id = auth.uid()
  )
  or is_published = true
);

create policy "song versions insert via owner"
on public.song_versions for insert
with check (
  exists (
    select 1
    from public.songs
    where songs.id = song_versions.song_id
      and songs.owner_id = auth.uid()
  )
);

create policy "song versions update via owner"
on public.song_versions for update
using (
  exists (
    select 1
    from public.songs
    where songs.id = song_versions.song_id
      and songs.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.songs
    where songs.id = song_versions.song_id
      and songs.owner_id = auth.uid()
  )
);

create policy "song versions delete via owner"
on public.song_versions for delete
using (
  exists (
    select 1
    from public.songs
    where songs.id = song_versions.song_id
      and songs.owner_id = auth.uid()
  )
);

create policy "posts read owner or public"
on public.posts for select
using (owner_id = auth.uid() or visibility = 'public');

create policy "posts insert own"
on public.posts for insert
with check (owner_id = auth.uid());

create policy "posts update own"
on public.posts for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "posts delete own"
on public.posts for delete
using (owner_id = auth.uid());

create policy "single posts read public or owner"
on public.single_posts for select
using (
  exists (
    select 1
    from public.posts
    where posts.id = single_posts.post_id
      and (posts.owner_id = auth.uid() or posts.visibility = 'public')
  )
);

create policy "single posts modify own post"
on public.single_posts for all
using (
  exists (
    select 1
    from public.posts
    where posts.id = single_posts.post_id
      and posts.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.posts
    where posts.id = single_posts.post_id
      and posts.owner_id = auth.uid()
  )
);

create policy "release tracks read public or owner"
on public.release_tracks for select
using (
  exists (
    select 1
    from public.posts
    where posts.id = release_tracks.post_id
      and (posts.owner_id = auth.uid() or posts.visibility = 'public')
  )
);

create policy "release tracks modify own post"
on public.release_tracks for all
using (
  exists (
    select 1
    from public.posts
    where posts.id = release_tracks.post_id
      and posts.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.posts
    where posts.id = release_tracks.post_id
      and posts.owner_id = auth.uid()
  )
);

create policy "follows readable"
on public.follows for select
using (true);

create policy "follow self-owned relations only"
on public.follows for insert
with check (follower_id = auth.uid() and follower_id <> followed_id);

create policy "unfollow self-owned relations only"
on public.follows for delete
using (follower_id = auth.uid());

create policy "post hearts readable"
on public.post_hearts for select
using (true);

create policy "post hearts self-owned"
on public.post_hearts for insert
with check (profile_id = auth.uid());

create policy "post hearts self-delete"
on public.post_hearts for delete
using (profile_id = auth.uid());

create policy "version hearts readable"
on public.version_hearts for select
using (true);

create policy "version hearts self-owned"
on public.version_hearts for insert
with check (profile_id = auth.uid());

create policy "version hearts self-delete"
on public.version_hearts for delete
using (profile_id = auth.uid());

create policy "comments readable for visible posts"
on public.comments for select
using (
  exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
      and (posts.owner_id = auth.uid() or posts.visibility = 'public')
  )
);

create policy "comments insert own"
on public.comments for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
      and (posts.owner_id = auth.uid() or posts.visibility = 'public')
  )
);

create policy "comments update own"
on public.comments for update
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "comments delete own"
on public.comments for delete
using (author_id = auth.uid());

create policy "conversations member only"
on public.conversations for select
using (
  exists (
    select 1
    from public.conversation_members
    where conversation_members.conversation_id = conversations.id
      and conversation_members.profile_id = auth.uid()
  )
);

create policy "conversation members readable by members"
on public.conversation_members for select
using (
  exists (
    select 1
    from public.conversation_members as membership
    where membership.conversation_id = conversation_members.conversation_id
      and membership.profile_id = auth.uid()
  )
);

create policy "messages member only"
on public.messages for select
using (
  exists (
    select 1
    from public.conversation_members
    where conversation_members.conversation_id = messages.conversation_id
      and conversation_members.profile_id = auth.uid()
  )
);

create policy "messages insert by sender membership"
on public.messages for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversation_members
    where conversation_members.conversation_id = messages.conversation_id
      and conversation_members.profile_id = auth.uid()
  )
);

create policy "messages update own"
on public.messages for update
using (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversation_members
    where conversation_members.conversation_id = messages.conversation_id
      and conversation_members.profile_id = auth.uid()
  )
)
with check (sender_id = auth.uid());

create policy "notifications recipient only"
on public.notifications for select
using (recipient_id = auth.uid());

create policy "notifications recipient update"
on public.notifications for update
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

create policy "reports reporter only"
on public.reports for select
using (reporter_id = auth.uid());

create policy "reports reporter create"
on public.reports for insert
with check (reporter_id = auth.uid());

create policy "feed events read public posts"
on public.feed_events for select
using (
  exists (
    select 1
    from public.posts
    where posts.id = feed_events.post_id
      and (posts.owner_id = auth.uid() or posts.visibility = 'public')
  )
);
