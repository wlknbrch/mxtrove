begin;

-- V2 collaboration, sharing, and admin boundary checks.
-- These tests run against the local seed and roll back all generated data.

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select set_config(
  'mxshare.test_project_id',
  public.create_collaboration_project(
    'V2 RLS room',
    'ep',
    'Temporary collaboration test room.',
    'private'
  )::text,
  true
);

select set_config(
  'mxshare.test_track_id',
  public.add_project_track(
    current_setting('mxshare.test_project_id')::uuid,
    '55555555-5555-5555-5555-555555555551',
    '66666666-6666-6666-6666-666666666662',
    'Eternal Light'
  )::text,
  true
);

select set_config(
  'mxshare.test_invite_id',
  invite_id::text,
  true
)
from public.invite_project_member(
  current_setting('mxshare.test_project_id')::uuid,
  'reviewer',
  '22222222-2222-2222-2222-222222222222',
  null,
  1
);

-- An invite alone does not expose the project.
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.collaboration_projects
  where id = current_setting('mxshare.test_project_id')::uuid;
  if visible_count <> 0 then
    raise exception 'Pending invitees must not see private projects.';
  end if;
end;
$$;

select public.accept_project_invite_by_id(
  current_setting('mxshare.test_invite_id')::uuid
);

-- Accepted reviewers can read and review, but cannot edit project structure.
do $$
declare
  visible_count integer;
  feedback_id uuid;
begin
  select count(*) into visible_count
  from public.collaboration_projects
  where id = current_setting('mxshare.test_project_id')::uuid;
  if visible_count <> 1 then
    raise exception 'Accepted project members must see their project.';
  end if;

  if public.collaboration_member_role(
    current_setting('mxshare.test_project_id')::uuid,
    auth.uid()
  ) <> 'reviewer' then
    raise exception 'The accepted invitation must preserve its role.';
  end if;

  if public.can_edit_collaboration_project(
    current_setting('mxshare.test_project_id')::uuid,
    auth.uid()
  ) then
    raise exception 'Reviewers must not receive editor permissions.';
  end if;

  feedback_id := public.create_feedback_thread(
    current_setting('mxshare.test_project_id')::uuid,
    current_setting('mxshare.test_track_id')::uuid,
    '66666666-6666-6666-6666-666666666662',
    12.5,
    null,
    'Vocal entry',
    'Check the breath before this phrase.',
    'vocals',
    'normal',
    null
  );
  if feedback_id is null then
    raise exception 'Reviewers must be able to create feedback.';
  end if;

  begin
    insert into public.collaboration_project_tracks (
      project_id,
      song_id,
      track_title,
      track_number,
      created_by
    )
    values (
      current_setting('mxshare.test_project_id')::uuid,
      '55555555-5555-5555-5555-555555555551',
      'Unauthorized duplicate',
      2,
      auth.uid()
    );
    raise exception 'Reviewer track insert should have failed.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- Invitations are single-use and cannot be accepted twice.
do $$
begin
  begin
    perform public.accept_project_invite_by_id(
      current_setting('mxshare.test_invite_id')::uuid
    );
    raise exception 'An accepted invitation must not be accepted twice.';
  exception
    when raise_exception then
      if sqlerrm <> 'This invitation can no longer be accepted.' then
        raise;
      end if;
  end;
end;
$$;

-- Admins cannot remove the owner, and ownership transfer updates the project
-- and both member roles atomically.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select public.change_project_member_role(
  current_setting('mxshare.test_project_id')::uuid,
  '22222222-2222-2222-2222-222222222222',
  'admin'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$
begin
  begin
    perform public.remove_project_member(
      current_setting('mxshare.test_project_id')::uuid,
      '11111111-1111-1111-1111-111111111111'
    );
    raise exception 'An admin must not remove the project owner.';
  exception
    when raise_exception then
      if sqlerrm <> 'The project owner cannot be removed.' then
        raise;
      end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select public.transfer_project_ownership(
  current_setting('mxshare.test_project_id')::uuid,
  '22222222-2222-2222-2222-222222222222'
);

do $$
declare
  stored_owner uuid;
begin
  select owner_id into stored_owner
  from public.collaboration_projects
  where id = current_setting('mxshare.test_project_id')::uuid;

  if stored_owner <> '22222222-2222-2222-2222-222222222222'::uuid
    or public.collaboration_member_role(
      current_setting('mxshare.test_project_id')::uuid,
      '22222222-2222-2222-2222-222222222222'
    ) <> 'owner'
    or public.collaboration_member_role(
      current_setting('mxshare.test_project_id')::uuid,
      '11111111-1111-1111-1111-111111111111'
    ) <> 'admin'
  then
    raise exception 'Ownership transfer did not update all records atomically.';
  end if;
end;
$$;

-- Contributors can add their own project versions, editors can select them,
-- and viewers cannot create feedback.
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
insert into public.songs (id, owner_id, title, notes)
values (
  'eeeeeeee-0000-0000-0000-000000000001',
  auth.uid(),
  'V2 contributor test song',
  'Rolled back after the RLS suite.'
);

select set_config(
  'mxshare.contributor_track_id',
  public.add_project_track(
    current_setting('mxshare.test_project_id')::uuid,
    'eeeeeeee-0000-0000-0000-000000000001',
    null,
    'Contributor test'
  )::text,
  true
);

select public.change_project_member_role(
  current_setting('mxshare.test_project_id')::uuid,
  '11111111-1111-1111-1111-111111111111',
  'contributor'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
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
  owner_id,
  collaboration_project_id,
  collaboration_track_id,
  sharing_mode
)
values (
  'eeeeeeee-0000-0000-0000-000000000002',
  'eeeeeeee-0000-0000-0000-000000000001',
  '44444444-4444-4444-4444-444444444441',
  '44444444-4444-4444-4444-444444444442',
  1,
  'Contributor draft',
  'Draft',
  'RLS contributor test.',
  false,
  auth.uid(),
  current_setting('mxshare.test_project_id')::uuid,
  current_setting('mxshare.contributor_track_id')::uuid,
  'project_members'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select public.change_project_member_role(
  current_setting('mxshare.test_project_id')::uuid,
  '11111111-1111-1111-1111-111111111111',
  'editor'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select public.select_project_track_version(
  current_setting('mxshare.test_project_id')::uuid,
  current_setting('mxshare.contributor_track_id')::uuid,
  'eeeeeeee-0000-0000-0000-000000000002'
);

do $$
begin
  if not exists (
    select 1
    from public.collaboration_project_tracks
    where id = current_setting('mxshare.contributor_track_id')::uuid
      and active_version_id = 'eeeeeeee-0000-0000-0000-000000000002'
  ) then
    raise exception 'An editor must be able to select a project version.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select public.change_project_member_role(
  current_setting('mxshare.test_project_id')::uuid,
  '11111111-1111-1111-1111-111111111111',
  'viewer'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
do $$
begin
  begin
    perform public.create_feedback_thread(
      current_setting('mxshare.test_project_id')::uuid,
      current_setting('mxshare.contributor_track_id')::uuid,
      'eeeeeeee-0000-0000-0000-000000000002',
      8,
      null,
      'Viewer feedback',
      'This must be rejected.',
      'general',
      'normal',
      null
    );
    raise exception 'A viewer must not be able to create feedback.';
  exception
    when raise_exception then
      if sqlerrm <> 'You cannot add feedback to this project.' then
        raise;
      end if;
  end;
end;
$$;

-- Only an app-admin role can use the moderation RPC.
do $$
begin
  begin
    perform public.moderate_report_v2(
      gen_random_uuid(),
      'dismissed',
      null,
      false,
      null
    );
    raise exception 'Non-admin moderation should have failed.';
  exception
    when raise_exception then
      if sqlerrm <> 'Administrator access required.' then
        raise;
      end if;
  end;
end;
$$;

-- Share links are hash-only, enforce max-use limits, and stay invalid after revocation.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('mxshare.test_share_id', share_link_id::text, true),
       set_config('mxshare.test_share_token', share_token, true)
from public.create_share_link(
  'song_version',
  '66666666-6666-6666-6666-666666666662',
  'view',
  timezone('utc', now()) + interval '1 hour',
  1
);

select *
from public.resolve_share_link(current_setting('mxshare.test_share_token'), 'view');

do $$
begin
  begin
    perform public.resolve_share_link(current_setting('mxshare.test_share_token'), 'view');
    raise exception 'A max-use share link should have failed on its second use.';
  exception
    when raise_exception then
      if sqlerrm <> 'This share link is invalid or has expired.' then
        raise;
      end if;
  end;
end;
$$;

select set_config('mxshare.test_revoked_share_id', share_link_id::text, true),
       set_config('mxshare.test_revoked_share_token', share_token, true)
from public.create_share_link(
  'song_version',
  '66666666-6666-6666-6666-666666666662',
  'review',
  timezone('utc', now()) + interval '1 hour',
  null
);

select public.revoke_share_link(current_setting('mxshare.test_revoked_share_id')::uuid);

do $$
begin
  begin
    perform public.resolve_share_link(current_setting('mxshare.test_revoked_share_token'), 'view');
    raise exception 'A revoked share link should have failed.';
  exception
    when raise_exception then
      if sqlerrm <> 'This share link is invalid or has expired.' then
        raise;
      end if;
  end;
end;
$$;

-- Message references are visible only to members of their conversation.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config(
  'mxshare.test_attachment_id',
  (
    public.create_message_reference_attachment(
      'cccccccc-0000-0000-0000-000000000001',
      'post_reference',
      '77777777-7777-7777-7777-777777777771'
    )
  ).id::text,
  true
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$
begin
  if not exists (
    select 1
    from public.message_attachments
    where id = current_setting('mxshare.test_attachment_id')::uuid
  ) then
    raise exception 'Conversation members must see message attachments.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
do $$
begin
  if exists (
    select 1
    from public.message_attachments
    where id = current_setting('mxshare.test_attachment_id')::uuid
  ) then
    raise exception 'Non-members must not see message attachments.';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from public.follows
    where follower_id in (
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222'
    )
       or followed_id in (
         '11111111-1111-1111-1111-111111111111',
         '22222222-2222-2222-2222-222222222222'
       )
  ) then
    raise exception 'Unrelated accounts must not enumerate raw follow relationships.';
  end if;
end;
$$;

-- Follower-only access is evaluated against the current relationship.
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
update public.posts
set visibility = 'followers'
where id = '77777777-7777-7777-7777-777777777771';

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
do $$
begin
  if not public.can_view_post(
    '77777777-7777-7777-7777-777777777771',
    auth.uid()
  ) then
    raise exception 'A current follower must see a follower-only post.';
  end if;

  delete from public.follows
  where follower_id = auth.uid()
    and followed_id = '22222222-2222-2222-2222-222222222222';

  if public.can_view_post(
    '77777777-7777-7777-7777-777777777771',
    auth.uid()
  ) then
    raise exception 'Unfollow must end follower-only access immediately.';
  end if;
end;
$$;

-- Anonymous/public metadata reads cannot disclose a follower-only release.
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
do $$
begin
  if exists (
    select 1
    from public.posts
    where id = '77777777-7777-7777-7777-777777777771'
  ) then
    raise exception 'Follower-only releases must not be public OG data sources.';
  end if;
end;
$$;
set local role authenticated;

-- Expired links never resolve, even when their token is otherwise valid.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('mxshare.test_expired_share_token', share_token, true)
from public.create_share_link(
  'song_version',
  '66666666-6666-6666-6666-666666666662',
  'view',
  timezone('utc', now()) - interval '1 second',
  null
);

do $$
begin
  begin
    perform public.resolve_share_link(
      current_setting('mxshare.test_expired_share_token'),
      'view'
    );
    raise exception 'An expired share link should have failed.';
  exception
    when raise_exception then
      if sqlerrm <> 'This share link is invalid or has expired.' then
        raise;
      end if;
  end;
end;
$$;

-- Message privacy requires both follow directions when configured for mutual
-- follows, and blocking takes precedence over that relationship.
insert into public.follows (follower_id, followed_id)
values (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
)
on conflict do nothing;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select public.update_privacy_settings(
  'public',
  'mutual_follows',
  'everyone',
  true,
  true,
  true,
  true
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
do $$
begin
  if public.can_message_profile(
    auth.uid(),
    '22222222-2222-2222-2222-222222222222'
  ) then
    raise exception 'A one-way follow must not satisfy mutual-follow messaging.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
insert into public.follows (follower_id, followed_id)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111'
)
on conflict do nothing;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
do $$
begin
  if not public.can_message_profile(
    auth.uid(),
    '22222222-2222-2222-2222-222222222222'
  ) then
    raise exception 'Mutual follows must satisfy the message privacy rule.';
  end if;
end;
$$;

select public.block_profile('22222222-2222-2222-2222-222222222222');

do $$
begin
  if public.can_message_profile(
    auth.uid(),
    '22222222-2222-2222-2222-222222222222'
  ) then
    raise exception 'Blocked accounts must not be able to message one another.';
  end if;
end;
$$;

select public.unblock_profile('22222222-2222-2222-2222-222222222222');

-- Account deletion requires recent first-factor authentication and remains
-- recoverable during the configured grace period.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '11111111-1111-1111-1111-111111111111',
    'role', 'authenticated',
    'amr', jsonb_build_array(
      jsonb_build_object(
        'method', 'password',
        'timestamp', extract(epoch from timezone('utc', now()))::bigint
      )
    )
  )::text,
  true
);

select public.request_account_deletion(14, false);

do $$
declare
  deletion_status text;
  scheduled_at timestamptz;
begin
  select status, scheduled_for
  into deletion_status, scheduled_at
  from public.account_deletion_requests
  where profile_id = auth.uid();

  if deletion_status <> 'scheduled'
    or scheduled_at <= timezone('utc', now()) + interval '13 days'
  then
    raise exception 'Account deletion grace period was not scheduled correctly.';
  end if;
end;
$$;

select public.cancel_account_deletion();

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '11111111-1111-1111-1111-111111111111',
    'role', 'authenticated',
    'amr', jsonb_build_array(
      jsonb_build_object(
        'method', 'password',
        'timestamp',
        extract(epoch from timezone('utc', now()) - interval '1 hour')::bigint
      )
    )
  )::text,
  true
);

do $$
begin
  begin
    perform public.request_account_deletion(14, false);
    raise exception 'A stale authentication proof should have failed.';
  exception
    when raise_exception then
      if sqlerrm <> 'Recent authentication required.' then
        raise;
      end if;
  end;
end;
$$;

rollback;
