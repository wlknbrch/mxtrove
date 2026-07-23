-- MxShare V2: account-synced appearance preferences and multi-cloud connection metadata.
-- OAuth access/refresh tokens remain browser/session-side and are never stored here.

alter table public.cloud_connections
  drop constraint if exists cloud_connections_provider_check;

alter table public.cloud_connections
  add constraint cloud_connections_provider_check
  check (provider in ('google_drive', 'dropbox', 'onedrive'));

alter table public.cloud_connections
  add column is_default boolean not null default false,
  add column connection_status text not null default 'connected',
  add column provider_account_id text,
  add column capabilities jsonb not null default '{}'::jsonb,
  add column last_error text,
  add column exports_folder_id text,
  add column updated_at timestamptz not null default timezone('utc', now()),
  add constraint cloud_connections_status_check
    check (connection_status in ('connected', 'expired', 'disconnected', 'error'));

alter table public.assets
  drop constraint if exists assets_provider_check;

alter table public.assets
  add constraint assets_provider_check
  check (provider in ('google_drive', 'dropbox', 'onedrive'));

create unique index cloud_connections_one_default_idx
  on public.cloud_connections (profile_id)
  where is_default = true and connection_status = 'connected';

create index cloud_connections_profile_status_idx
  on public.cloud_connections (profile_id, connection_status, provider);

create index assets_provider_owner_created_idx
  on public.assets (owner_id, provider, created_at desc);

create table public.profile_appearance_settings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'dark',
  accent text not null default 'violet',
  interface_density text not null default 'comfortable',
  show_waveforms boolean not null default true,
  reduced_motion boolean not null default false,
  autoplay_next boolean not null default true,
  remember_volume boolean not null default true,
  player_volume numeric(4, 3) not null default 0.8,
  increase_contrast boolean not null default false,
  reduce_transparency boolean not null default false,
  reduce_motion boolean not null default false,
  larger_ui_text boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profile_appearance_theme_check
    check (theme in ('system', 'dark', 'light')),
  constraint profile_appearance_accent_check
    check (accent in ('violet', 'rose', 'cyan', 'emerald', 'amber')),
  constraint profile_appearance_density_check
    check (interface_density in ('comfortable', 'compact')),
  constraint profile_appearance_volume_check
    check (player_volume between 0 and 1)
);

create trigger cloud_connections_set_updated_at
before update on public.cloud_connections
for each row execute procedure public.set_updated_at();

create trigger profile_appearance_settings_set_updated_at
before update on public.profile_appearance_settings
for each row execute procedure public.set_updated_at();

create or replace function public.ensure_profile_appearance_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profile_appearance_settings (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

create trigger profiles_create_appearance_settings
after insert on public.profiles
for each row execute procedure public.ensure_profile_appearance_settings();

insert into public.profile_appearance_settings (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;

update public.cloud_connections as connection
set is_default = true
where connection.id = (
  select candidate.id
  from public.cloud_connections as candidate
  where candidate.profile_id = connection.profile_id
  order by candidate.connected_at asc
  limit 1
)
and not exists (
  select 1
  from public.cloud_connections as current_default
  where current_default.profile_id = connection.profile_id
    and current_default.is_default = true
);

create or replace function public.set_default_cloud_provider(target_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if not exists (
    select 1
    from public.cloud_connections
    where id = target_connection_id
      and profile_id = current_user_id
      and connection_status = 'connected'
  ) then
    raise exception 'Connected cloud provider not found.';
  end if;

  update public.cloud_connections
  set is_default = false
  where profile_id = current_user_id
    and is_default = true;

  update public.cloud_connections
  set is_default = true
  where id = target_connection_id
    and profile_id = current_user_id;
end;
$$;

create or replace function public.update_appearance_settings(
  next_theme text,
  next_accent text,
  next_interface_density text,
  next_show_waveforms boolean,
  next_reduced_motion boolean,
  next_autoplay_next boolean,
  next_remember_volume boolean,
  next_player_volume numeric,
  next_increase_contrast boolean,
  next_reduce_transparency boolean,
  next_reduce_motion boolean,
  next_larger_ui_text boolean
)
returns public.profile_appearance_settings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_settings public.profile_appearance_settings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  insert into public.profile_appearance_settings (
    profile_id,
    theme,
    accent,
    interface_density,
    show_waveforms,
    reduced_motion,
    autoplay_next,
    remember_volume,
    player_volume,
    increase_contrast,
    reduce_transparency,
    reduce_motion,
    larger_ui_text
  )
  values (
    auth.uid(),
    next_theme,
    next_accent,
    next_interface_density,
    next_show_waveforms,
    next_reduced_motion,
    next_autoplay_next,
    next_remember_volume,
    next_player_volume,
    next_increase_contrast,
    next_reduce_transparency,
    next_reduce_motion,
    next_larger_ui_text
  )
  on conflict (profile_id)
  do update set
    theme = excluded.theme,
    accent = excluded.accent,
    interface_density = excluded.interface_density,
    show_waveforms = excluded.show_waveforms,
    reduced_motion = excluded.reduced_motion,
    autoplay_next = excluded.autoplay_next,
    remember_volume = excluded.remember_volume,
    player_volume = excluded.player_volume,
    increase_contrast = excluded.increase_contrast,
    reduce_transparency = excluded.reduce_transparency,
    reduce_motion = excluded.reduce_motion,
    larger_ui_text = excluded.larger_ui_text
  returning * into updated_settings;

  return updated_settings;
end;
$$;

alter table public.profile_appearance_settings enable row level security;

create policy "appearance settings owner select"
on public.profile_appearance_settings for select
using (profile_id = auth.uid());

grant execute on function public.set_default_cloud_provider(uuid) to authenticated;
grant execute on function public.update_appearance_settings(text, text, text, boolean, boolean, boolean, boolean, numeric, boolean, boolean, boolean, boolean) to authenticated;
