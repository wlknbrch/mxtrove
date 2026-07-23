-- MxShare V2: prevent legacy public relation policies from bypassing privacy.

create or replace function public.get_follow_state_v2(target_profile_id uuid)
returns table (
  viewer_follows_profile boolean,
  profile_follows_viewer boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    case
      when auth.uid() is null
        or target_profile_id = auth.uid()
        or public.is_profile_blocked_pair(auth.uid(), target_profile_id)
        then false
      else public.follows_profile(auth.uid(), target_profile_id)
    end,
    case
      when auth.uid() is null
        or target_profile_id = auth.uid()
        or public.is_profile_blocked_pair(auth.uid(), target_profile_id)
        then false
      else public.follows_profile(target_profile_id, auth.uid())
    end;
$$;

drop policy if exists "follows readable" on public.follows;
create policy "follows visible to either participant"
on public.follows for select
using (
  follower_id = auth.uid()
  or followed_id = auth.uid()
);

drop policy if exists "post hearts readable" on public.post_hearts;
create policy "post hearts readable with release access"
on public.post_hearts for select
using (
  profile_id = auth.uid()
  or public.can_view_post(post_id, auth.uid())
);

drop policy if exists "version hearts readable" on public.version_hearts;
create policy "version hearts readable with version access"
on public.version_hearts for select
using (
  profile_id = auth.uid()
  or public.can_profile_view_song_version(song_version_id, auth.uid())
);

revoke all on function public.get_follow_state_v2(uuid) from public;
grant execute on function public.get_follow_state_v2(uuid) to authenticated;
