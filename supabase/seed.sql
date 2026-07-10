begin;

create extension if not exists pgcrypto;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'kai.orion@example.com',
    crypt('password123', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Kai Orion"}',
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'luna.park@example.com',
    crypt('password123', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Luna Park"}',
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (id) do update
set
  aud = excluded.aud,
  role = excluded.role,
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  created_at,
  updated_at
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"kai.orion@example.com"}',
    'email',
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"luna.park@example.com"}',
    'email',
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (id) do update
set
  user_id = excluded.user_id,
  provider_id = excluded.provider_id,
  identity_data = excluded.identity_data,
  provider = excluded.provider,
  updated_at = excluded.updated_at;

insert into public.profiles (
  id,
  username,
  display_name,
  bio,
  location,
  website_url,
  instagram_url,
  support_url,
  onboarding_completed
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'kai_orion',
    'Kai Orion',
    'Producer and late-night sketch collector.',
    'Berlin, Germany',
    'https://kai.example.com',
    'https://instagram.com/kai_orion',
    'https://ko-fi.com/kai_orion',
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'luna_park',
    'Luna Park',
    'Electronic songwriter collecting versions in public.',
    'Copenhagen, Denmark',
    'https://luna.example.com',
    'https://instagram.com/luna_park',
    null,
    true
  )
on conflict (id) do update
set
  username = excluded.username,
  display_name = excluded.display_name,
  bio = excluded.bio,
  location = excluded.location,
  website_url = excluded.website_url,
  instagram_url = excluded.instagram_url,
  support_url = excluded.support_url,
  onboarding_completed = excluded.onboarding_completed;

insert into public.cloud_connections (
  id,
  profile_id,
  provider,
  provider_account_email,
  root_folder_id,
  audio_originals_folder_id,
  audio_previews_folder_id,
  artwork_folder_id,
  avatars_folder_id,
  connected_at,
  last_verified_at
)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'google_drive',
  'kai.orion@example.com',
  'demo-root-folder',
  'demo-originals-folder',
  'demo-previews-folder',
  'demo-artwork-folder',
  'demo-avatars-folder',
  timezone('utc', now()),
  timezone('utc', now())
)
on conflict (id) do update
set
  profile_id = excluded.profile_id,
  provider = excluded.provider,
  provider_account_email = excluded.provider_account_email,
  root_folder_id = excluded.root_folder_id,
  audio_originals_folder_id = excluded.audio_originals_folder_id,
  audio_previews_folder_id = excluded.audio_previews_folder_id,
  artwork_folder_id = excluded.artwork_folder_id,
  avatars_folder_id = excluded.avatars_folder_id,
  last_verified_at = excluded.last_verified_at;

insert into public.assets (
  id,
  owner_id,
  provider,
  remote_file_id,
  remote_parent_folder_id,
  filename,
  display_name,
  mime_type,
  file_extension,
  bytes,
  asset_type,
  access_mode,
  share_url,
  view_url,
  thumbnail_url,
  waveform_peaks
)
values
  (
    '44444444-4444-4444-4444-444444444441',
    '11111111-1111-1111-1111-111111111111',
    'google_drive',
    'seed-original-1',
    'demo-originals-folder',
    'eternal-light-demo.wav',
    'Original audio placeholder - no real Drive file',
    'audio/wav',
    '.wav',
    52000000,
    'audio_original',
    'private',
    null,
    null,
    null,
    '[12,24,36,52,68,54,38,22]'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '11111111-1111-1111-1111-111111111111',
    'google_drive',
    'seed-preview-1',
    'demo-previews-folder',
    'eternal-light-demo.mp3',
    'Demo preview placeholder - attach a real Drive preview to test playback',
    'audio/mpeg',
    '.mp3',
    3900000,
    'audio_preview',
    'public',
    null,
    null,
    null,
    '[18,26,40,60,74,58,44,22]'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444443',
    '11111111-1111-1111-1111-111111111111',
    'google_drive',
    'seed-artwork-1',
    'demo-artwork-folder',
    'eternal-light-cover.png',
    'Cover placeholder - replace with Drive-hosted artwork',
    'image/png',
    '.png',
    220000,
    'cover_artwork',
    'public',
    null,
    null,
    null,
    null
  )
on conflict (id) do update
set
  owner_id = excluded.owner_id,
  provider = excluded.provider,
  remote_file_id = excluded.remote_file_id,
  remote_parent_folder_id = excluded.remote_parent_folder_id,
  filename = excluded.filename,
  display_name = excluded.display_name,
  mime_type = excluded.mime_type,
  file_extension = excluded.file_extension,
  bytes = excluded.bytes,
  asset_type = excluded.asset_type,
  access_mode = excluded.access_mode,
  share_url = excluded.share_url,
  view_url = excluded.view_url,
  thumbnail_url = excluded.thumbnail_url,
  waveform_peaks = excluded.waveform_peaks;

insert into public.songs (
  id,
  owner_id,
  title,
  notes,
  default_artwork_asset_id
)
values (
  '55555555-5555-5555-5555-555555555551',
  '11111111-1111-1111-1111-111111111111',
  'Eternal Light',
  'Need a lighter chorus lift and tighter outro.',
  '44444444-4444-4444-4444-444444444443'
)
on conflict (id) do update
set
  owner_id = excluded.owner_id,
  title = excluded.title,
  notes = excluded.notes,
  default_artwork_asset_id = excluded.default_artwork_asset_id;

insert into public.song_versions (
  id,
  song_id,
  source_asset_id,
  preview_asset_id,
  version_number,
  version_label,
  production_stage,
  changelog,
  is_published,
  published_at
)
values
  (
    '66666666-6666-6666-6666-666666666661',
    '55555555-5555-5555-5555-555555555551',
    '44444444-4444-4444-4444-444444444441',
    '44444444-4444-4444-4444-444444444442',
    1,
    'Demo',
    'Demo',
    'First workable topline and intro drums.',
    true,
    timezone('utc', now())
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '55555555-5555-5555-5555-555555555551',
    '44444444-4444-4444-4444-444444444441',
    '44444444-4444-4444-4444-444444444442',
    2,
    'Mix 1',
    'Mix 1',
    'Wider synth field and stronger vocal rides.',
    true,
    timezone('utc', now())
  )
on conflict (id) do update
set
  song_id = excluded.song_id,
  source_asset_id = excluded.source_asset_id,
  preview_asset_id = excluded.preview_asset_id,
  version_number = excluded.version_number,
  version_label = excluded.version_label,
  production_stage = excluded.production_stage,
  changelog = excluded.changelog,
  is_published = excluded.is_published,
  published_at = excluded.published_at;

insert into public.posts (
  id,
  owner_id,
  post_type,
  title,
  description,
  visibility,
  artwork_asset_id,
  is_published,
  published_at,
  activity_at
)
values
  (
    '77777777-7777-7777-7777-777777777771',
    '22222222-2222-2222-2222-222222222222',
    'single',
    'Eternal Light',
    'New mix for the second single. Would love your thoughts!',
    'public',
    '44444444-4444-4444-4444-444444444443',
    true,
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (id) do update
set
  owner_id = excluded.owner_id,
  post_type = excluded.post_type,
  title = excluded.title,
  description = excluded.description,
  visibility = excluded.visibility,
  artwork_asset_id = excluded.artwork_asset_id,
  is_published = excluded.is_published,
  published_at = excluded.published_at,
  activity_at = excluded.activity_at;

insert into public.single_posts (
  post_id,
  song_id,
  featured_version_id
)
values (
  '77777777-7777-7777-7777-777777777771',
  '55555555-5555-5555-5555-555555555551',
  '66666666-6666-6666-6666-666666666662'
)
on conflict (post_id) do update
set
  song_id = excluded.song_id,
  featured_version_id = excluded.featured_version_id;

insert into public.follows (follower_id, followed_id)
values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict (follower_id, followed_id) do nothing;

insert into public.post_hearts (profile_id, post_id)
values ('11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777771')
on conflict (profile_id, post_id) do nothing;

insert into public.comments (id, post_id, author_id, body)
values
  (
    '88888888-8888-8888-8888-888888888881',
    '77777777-7777-7777-7777-777777777771',
    '11111111-1111-1111-1111-111111111111',
    'The chorus lift lands better now. The last vocal stack feels cleaner too.'
  )
on conflict (id) do update
set
  post_id = excluded.post_id,
  author_id = excluded.author_id,
  body = excluded.body,
  parent_comment_id = excluded.parent_comment_id,
  deleted_at = excluded.deleted_at;

insert into public.conversations (id, kind)
values ('99999999-9999-9999-9999-999999999991', 'direct')
on conflict (id) do update
set
  kind = excluded.kind,
  updated_at = timezone('utc', now());

insert into public.conversation_members (conversation_id, profile_id)
values
  ('99999999-9999-9999-9999-999999999991', '11111111-1111-1111-1111-111111111111'),
  ('99999999-9999-9999-9999-999999999991', '22222222-2222-2222-2222-222222222222')
on conflict (conversation_id, profile_id) do nothing;

insert into public.messages (id, conversation_id, sender_id, body)
values
  (
    'cccccccc-0000-0000-0000-000000000001',
    '99999999-9999-9999-9999-999999999991',
    '11111111-1111-1111-1111-111111111111',
    'I''m into the new drums. Want me to send a note on the bridge tomorrow?'
  ),
  (
    'cccccccc-0000-0000-0000-000000000002',
    '99999999-9999-9999-9999-999999999991',
    '22222222-2222-2222-2222-222222222222',
    'Yes please. Especially the transition into the chorus.'
  )
on conflict (id) do update
set
  conversation_id = excluded.conversation_id,
  sender_id = excluded.sender_id,
  body = excluded.body,
  edited_at = excluded.edited_at,
  deleted_at = excluded.deleted_at;

insert into public.notifications (id, recipient_id, actor_id, type, post_id, song_version_id)
values
  (
    'dddddddd-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'single_version',
    '77777777-7777-7777-7777-777777777771',
    '66666666-6666-6666-6666-666666666662'
  )
on conflict (id) do update
set
  recipient_id = excluded.recipient_id,
  actor_id = excluded.actor_id,
  type = excluded.type,
  post_id = excluded.post_id,
  song_version_id = excluded.song_version_id,
  comment_id = excluded.comment_id,
  conversation_id = excluded.conversation_id;

insert into public.feed_events (id, actor_id, post_id, song_version_id, event_type)
values
  (
    'eeeeeeee-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222',
    '77777777-7777-7777-7777-777777777771',
    '66666666-6666-6666-6666-666666666662',
    'single_update'
  )
on conflict (id) do update
set
  actor_id = excluded.actor_id,
  post_id = excluded.post_id,
  song_version_id = excluded.song_version_id,
  event_type = excluded.event_type;

commit;
