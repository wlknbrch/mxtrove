-- Agree and disagree represent one opinion and must be mutually exclusive.
with ranked_opinions as (
  select
    thread_id,
    profile_id,
    reaction,
    row_number() over (
      partition by thread_id, profile_id
      order by created_at desc, reaction asc
    ) as reaction_rank
  from public.feedback_reactions
  where reaction in ('agree', 'disagree')
)
delete from public.feedback_reactions as reaction
using ranked_opinions as ranked
where reaction.thread_id = ranked.thread_id
  and reaction.profile_id = ranked.profile_id
  and reaction.reaction = ranked.reaction
  and ranked.reaction_rank > 1;

create unique index if not exists feedback_reactions_one_opinion_per_profile_idx
on public.feedback_reactions (thread_id, profile_id)
where reaction in ('agree', 'disagree');

create or replace function public.set_feedback_reaction(
  target_thread_id uuid,
  target_reaction text,
  target_active boolean
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  opposing_reaction text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_reaction not in ('agree', 'disagree', 'done', 'important') then
    raise exception 'Unsupported feedback reaction.';
  end if;

  if not target_active then
    delete from public.feedback_reactions
    where thread_id = target_thread_id
      and profile_id = current_user_id
      and reaction = target_reaction;
    return;
  end if;

  opposing_reaction := case target_reaction
    when 'agree' then 'disagree'
    when 'disagree' then 'agree'
    else null
  end;

  if opposing_reaction is not null then
    delete from public.feedback_reactions
    where thread_id = target_thread_id
      and profile_id = current_user_id
      and reaction = opposing_reaction;
  end if;

  insert into public.feedback_reactions (thread_id, profile_id, reaction)
  values (target_thread_id, current_user_id, target_reaction)
  on conflict do nothing;
end;
$$;

revoke all on function public.set_feedback_reaction(uuid, text, boolean) from public;
grant execute on function public.set_feedback_reaction(uuid, text, boolean) to authenticated;
