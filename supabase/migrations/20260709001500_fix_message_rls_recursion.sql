begin;

create or replace function public.is_conversation_member(
  target_conversation_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = target_conversation_id
      and profile_id = target_profile_id
  );
$$;

grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;
grant execute on function public.is_conversation_member(uuid, uuid) to service_role;

drop policy if exists "conversations member only" on public.conversations;
create policy "conversations member only"
on public.conversations for select
using (public.is_conversation_member(conversations.id));

drop policy if exists "conversation members readable by members" on public.conversation_members;
create policy "conversation members readable by members"
on public.conversation_members for select
using (public.is_conversation_member(conversation_members.conversation_id));

drop policy if exists "messages member only" on public.messages;
create policy "messages member only"
on public.messages for select
using (public.is_conversation_member(messages.conversation_id));

drop policy if exists "messages insert by sender membership" on public.messages;
create policy "messages insert by sender membership"
on public.messages for insert
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(messages.conversation_id)
);

drop policy if exists "messages update own" on public.messages;
create policy "messages update own"
on public.messages for update
using (
  sender_id = auth.uid()
  and public.is_conversation_member(messages.conversation_id)
)
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(messages.conversation_id)
);

commit;
