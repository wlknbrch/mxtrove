-- Fresh Supabase projects do not necessarily grant API roles table privileges.
-- Mirror only operations already governed by RLS policies, without granting
-- TRUNCATE, ownership, or access to tables that have no applicable policy.
grant usage on schema public to anon, authenticated, service_role;

do $$
declare
  policy record;
  column_info record;
  sequence_name text;
  operations text;
begin
  for policy in
    select distinct policies.tablename, policies.cmd, api_role.name as role_name
    from pg_policies as policies
    join pg_namespace as namespace on namespace.nspname = policies.schemaname
    join pg_class as relation
      on relation.relnamespace = namespace.oid
      and relation.relname = policies.tablename
    cross join (values ('anon'), ('authenticated')) as api_role(name)
    where policies.schemaname = 'public'
      and relation.relrowsecurity
      and relation.relkind in ('r', 'p')
      and (
        'public' = any(policies.roles)
        or api_role.name = any(policies.roles::text[])
      )
  loop
    operations := case policy.cmd
      when 'ALL' then 'SELECT, INSERT, UPDATE, DELETE'
      when 'SELECT' then 'SELECT'
      when 'INSERT' then 'INSERT'
      when 'UPDATE' then 'UPDATE'
      when 'DELETE' then 'DELETE'
    end;
    if operations is not null then
      execute format('grant %s on table public.%I to %I',
        operations, policy.tablename, policy.role_name);
    end if;

    if policy.cmd in ('ALL', 'INSERT') then
      for column_info in
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = policy.tablename
      loop
        sequence_name := pg_get_serial_sequence(
          format('public.%I', policy.tablename), column_info.column_name
        );
        if sequence_name is not null then
          execute format('grant usage on sequence %s to %I',
            sequence_name, policy.role_name);
        end if;
      end loop;
    end if;
  end loop;
end;
$$;

-- These API views execute with the caller's permissions and underlying RLS.
alter view public.post_public_metrics set (security_invoker = true);
alter view public.profile_public_metrics set (security_invoker = true);
grant select on public.post_public_metrics, public.profile_public_metrics
  to anon, authenticated;

-- The server-only worker role already bypasses RLS, but still needs SQL grants.
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
