-- MxShare V2: protected message attachments and conversation-safe attachment access.

alter table public.media_processing_jobs
  add column output_mode text not null default 'public_cloud',
  add column protected_purpose text,
  add column target_project_id uuid references public.collaboration_projects (id) on delete set null,
  add column protected_asset_id uuid references public.protected_media_assets (id) on delete set null,
  add constraint media_processing_jobs_output_mode_check
    check (output_mode in ('public_cloud', 'protected')),
  add constraint media_processing_jobs_protected_shape_check
    check (
      (output_mode = 'public_cloud' and protected_purpose is null)
      or (
        output_mode = 'protected'
        and protected_purpose in ('post_preview', 'collaboration_preview', 'message_audio')
      )
    );

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  attachment_type text not null,
  protected_asset_id uuid references public.protected_media_assets (id) on delete set null,
  asset_id uuid references public.assets (id) on delete set null,
  post_id uuid references public.posts (id) on delete set null,
  project_id uuid references public.collaboration_projects (id) on delete set null,
  song_version_id uuid references public.song_versions (id) on delete set null,
  filename text not null,
  mime_type text not null,
  bytes bigint not null,
  duration_seconds numeric(10, 3),
  width integer,
  height integer,
  created_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint message_attachments_type_check
    check (
      attachment_type in (
        'audio',
        'image',
        'document',
        'project_reference',
        'post_reference',
        'song_version_reference'
      )
    ),
  constraint message_attachments_bytes_check
    check (bytes >= 0 and bytes <= 52428800),
  constraint message_attachments_payload_check
    check (
      (attachment_type in ('audio', 'image', 'document') and protected_asset_id is not null)
      or (attachment_type = 'project_reference' and project_id is not null)
      or (attachment_type = 'post_reference' and post_id is not null)
      or (attachment_type = 'song_version_reference' and song_version_id is not null)
    )
);

alter table public.protected_media_assets
  add column message_id uuid references public.messages (id) on delete cascade;

create index message_attachments_message_created_idx
  on public.message_attachments (message_id, created_at);
create index message_attachments_owner_created_idx
  on public.message_attachments (owner_id, created_at desc);
create index protected_media_message_idx
  on public.protected_media_assets (message_id)
  where message_id is not null and deleted_at is null;

create or replace function public.validate_message_attachment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_message public.messages%rowtype;
  existing_count integer;
begin
  select *
  into target_message
  from public.messages
  where id = new.message_id;

  if target_message.id is null or target_message.sender_id <> new.owner_id then
    raise exception 'Attachments must belong to the message sender.';
  end if;

  if not public.is_conversation_member(target_message.conversation_id, new.owner_id) then
    raise exception 'The attachment owner is not a conversation member.';
  end if;

  select count(*)
  into existing_count
  from public.message_attachments
  where message_id = new.message_id
    and deleted_at is null
    and id <> new.id;

  if existing_count >= 5 then
    raise exception 'A message can contain at most five attachments.';
  end if;

  if new.attachment_type = 'audio' and (
    new.bytes > 52428800
    or new.mime_type not in ('audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/aiff', 'audio/x-aiff')
  ) then
    raise exception 'Unsupported audio attachment.';
  end if;

  if new.attachment_type = 'image' and (
    new.bytes > 15728640
    or new.mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
  ) then
    raise exception 'Unsupported image attachment.';
  end if;

  if new.attachment_type = 'document' and (
    new.bytes > 20971520
    or new.mime_type not in ('application/pdf', 'text/plain', 'text/markdown')
  ) then
    raise exception 'Unsupported document attachment.';
  end if;

  if new.protected_asset_id is not null and not exists (
    select 1
    from public.protected_media_assets
    where id = new.protected_asset_id
      and owner_id = new.owner_id
      and status = 'ready'
      and deleted_at is null
  ) then
    raise exception 'Protected attachment media is unavailable.';
  end if;

  return new;
end;
$$;

create trigger message_attachments_validate
before insert or update on public.message_attachments
for each row execute procedure public.validate_message_attachment();

create or replace function public.notify_message_attachment_members()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_conversation_id uuid;
begin
  select conversation_id
  into target_conversation_id
  from public.messages
  where id = new.message_id;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    conversation_id
  )
  select
    member.profile_id,
    new.owner_id,
    'message_attachment',
    target_conversation_id
  from public.conversation_members as member
  where member.conversation_id = target_conversation_id
    and member.profile_id <> new.owner_id;

  return new;
end;
$$;

create trigger message_attachments_create_notifications
after insert on public.message_attachments
for each row execute procedure public.notify_message_attachment_members();

create or replace function public.can_access_message_attachment(
  target_attachment_id uuid,
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
    from public.message_attachments as attachment
    join public.messages as message on message.id = attachment.message_id
    where attachment.id = target_attachment_id
      and attachment.deleted_at is null
      and public.is_conversation_member(message.conversation_id, target_profile_id)
  );
$$;

create or replace function public.can_access_protected_media(
  target_asset_id uuid,
  target_profile_id uuid default auth.uid(),
  supplied_share_token text default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.protected_media_assets as asset
    where asset.id = target_asset_id
      and asset.status = 'ready'
      and asset.deleted_at is null
      and (asset.expires_at is null or asset.expires_at > timezone('utc', now()))
      and not public.is_profile_blocked_pair(asset.owner_id, target_profile_id)
      and (
        asset.owner_id = target_profile_id
        or (
          asset.message_id is not null
          and exists (
            select 1
            from public.messages as message
            where message.id = asset.message_id
              and public.is_conversation_member(message.conversation_id, target_profile_id)
          )
        )
        or (
          asset.post_id is not null
          and public.can_view_post(asset.post_id, target_profile_id)
        )
        or (
          asset.project_id is not null
          and public.can_view_collaboration_project(asset.project_id, target_profile_id)
        )
        or (
          supplied_share_token is not null
          and exists (
            select 1
            from public.share_links as share_link
            where share_link.token_hash = encode(extensions.digest(supplied_share_token, 'sha256'), 'hex')
              and share_link.is_active = true
              and share_link.revoked_at is null
              and (share_link.expires_at is null or share_link.expires_at > timezone('utc', now()))
              and (share_link.max_uses is null or share_link.use_count < share_link.max_uses)
              and (
                (share_link.target_type = 'post' and share_link.target_id = asset.post_id)
                or (share_link.target_type = 'collaboration_project' and share_link.target_id = asset.project_id)
                or (share_link.target_type = 'song_version' and share_link.target_id = asset.song_version_id)
              )
          )
        )
      )
  );
$$;

create or replace function public.delete_message_attachment(target_attachment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_protected_asset_id uuid;
begin
  update public.message_attachments
  set deleted_at = timezone('utc', now())
  where id = target_attachment_id
    and owner_id = auth.uid()
    and deleted_at is null
  returning protected_asset_id into target_protected_asset_id;

  if not found then
    raise exception 'Attachment not found.';
  end if;

  return target_protected_asset_id;
end;
$$;

alter table public.message_attachments enable row level security;

create policy "message attachments conversation members select"
on public.message_attachments for select
using (public.can_access_message_attachment(id, auth.uid()));

create policy "message attachments sender insert"
on public.message_attachments for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.messages as message
    where message.id = message_attachments.message_id
      and message.sender_id = auth.uid()
      and public.is_conversation_member(message.conversation_id, auth.uid())
  )
);

create policy "message attachments owner update"
on public.message_attachments for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

grant execute on function public.can_access_message_attachment(uuid, uuid) to authenticated, service_role;
grant execute on function public.delete_message_attachment(uuid) to authenticated;
