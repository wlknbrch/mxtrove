-- MxTrove: versioned Terms acceptance for new and existing accounts.

create table if not exists public.terms_acceptances (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default timezone('utc', now()),
  constraint terms_acceptances_version_length_check
    check (char_length(btrim(terms_version)) between 1 and 40)
);

alter table public.terms_acceptances enable row level security;

revoke all on table public.terms_acceptances from anon;
grant select on table public.terms_acceptances to authenticated;

drop policy if exists "terms acceptance readable by account owner"
  on public.terms_acceptances;
create policy "terms acceptance readable by account owner"
  on public.terms_acceptances
  for select
  using (profile_id = auth.uid());

create or replace function public.accept_terms_of_service(accepted_version text)
returns public.terms_acceptances
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_terms_version constant text := '2026-08-05';
  result_acceptance public.terms_acceptances%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to accept the Terms of Service.';
  end if;

  if btrim(coalesce(accepted_version, '')) <> current_terms_version then
    raise exception 'The Terms of Service version is no longer current. Reload and review the latest version.';
  end if;

  insert into public.terms_acceptances (profile_id, terms_version, accepted_at)
  values (auth.uid(), current_terms_version, timezone('utc', now()))
  on conflict (profile_id) do update
    set terms_version = excluded.terms_version,
        accepted_at = excluded.accepted_at
  returning * into result_acceptance;

  return result_acceptance;
end;
$$;

revoke all on function public.accept_terms_of_service(text) from public;
grant execute on function public.accept_terms_of_service(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  accepted_version text := new.raw_user_meta_data ->> 'terms_accepted_version';
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    'user_' || substring(new.id::text from 1 for 8),
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      'New artist'
    )
  )
  on conflict (id) do nothing;

  if accepted_version = '2026-08-05' then
    insert into public.terms_acceptances (profile_id, terms_version, accepted_at)
    values (new.id, accepted_version, timezone('utc', now()))
    on conflict (profile_id) do update
      set terms_version = excluded.terms_version,
          accepted_at = excluded.accepted_at;
  end if;

  return new;
end;
$$;
