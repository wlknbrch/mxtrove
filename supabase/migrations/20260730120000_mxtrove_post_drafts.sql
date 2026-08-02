create table if not exists public.post_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  post_type text not null check (post_type in ('single', 'ep', 'album')),
  title text not null default '',
  current_step integer not null default 1 check (current_step between 1 and 20),
  schema_version integer not null default 1 check (schema_version > 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists post_drafts_owner_updated_idx
  on public.post_drafts (owner_id, updated_at desc);

drop trigger if exists post_drafts_set_updated_at on public.post_drafts;
create trigger post_drafts_set_updated_at
before update on public.post_drafts
for each row execute procedure public.set_updated_at();

alter table public.post_drafts enable row level security;

drop policy if exists "post drafts owner select" on public.post_drafts;
create policy "post drafts owner select"
on public.post_drafts
for select
using (owner_id = auth.uid());

drop policy if exists "post drafts owner insert" on public.post_drafts;
create policy "post drafts owner insert"
on public.post_drafts
for insert
with check (owner_id = auth.uid());

drop policy if exists "post drafts owner update" on public.post_drafts;
create policy "post drafts owner update"
on public.post_drafts
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "post drafts owner delete" on public.post_drafts;
create policy "post drafts owner delete"
on public.post_drafts
for delete
using (owner_id = auth.uid());

grant select, insert, update, delete on public.post_drafts to authenticated;
