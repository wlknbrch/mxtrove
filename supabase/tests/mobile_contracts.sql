begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

select is(
  pg_get_function_result('public.request_account_deletion(integer,boolean)'::regprocedure),
  'timestamp with time zone',
  'Account deletion returns scheduled timestamp, not a UUID'
);
select is(
  pg_get_function_result('public.request_data_export(text)'::regprocedure),
  'uuid',
  'Data export returns request UUID'
);
select is(
  public.compact_post_card_waveform(null::jsonb),
  null::jsonb,
  'Missing waveform stays null, never fabricated'
);
select is(
  jsonb_array_length(public.compact_post_card_waveform(
    (select jsonb_agg(jsonb_build_array(-0.5, 0.5)) from generate_series(1, 1000))
  )),
  250,
  'Compact card waveform stride respects bounded default 320'
);
select is(
  (public.compact_post_card_waveform(
    jsonb_build_object('version', 1, 'bucketCount', 1000, 'peaks',
      (select jsonb_agg(jsonb_build_array(-0.5, 0.5)) from generate_series(1, 1000)))
  ) ->> 'bucketCount')::integer,
  250,
  'V1 compact waveform bucketCount is updated with peaks'
);
select ok(
  not has_function_privilege('anon', 'public.request_account_deletion(integer,boolean)', 'EXECUTE'),
  'Anonymous users cannot invoke account deletion'
);

-- Synthetic local seed user; all changes roll back. No production data is read.
insert into public.posts (id, owner_id, post_type, title, visibility)
values ('90000000-0000-4000-8000-000000000001',
        '11111111-1111-1111-1111-111111111111', 'single', 'Mobile private contract fixture', 'private');
insert into public.posts (id, owner_id, post_type, title, visibility)
select ('90000000-0000-4000-8000-' || lpad((n + 1)::text, 12, '0'))::uuid,
       '11111111-1111-1111-1111-111111111111', 'single', 'Mobile bounded fixture ' || n, 'public'
from generate_series(1, 60) as fixtures(n);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is(
  (select count(*)::integer from public.get_resolved_post_cards(
    array['90000000-0000-4000-8000-000000000001'::uuid]
  )),
  0,
  'Compact card resolver does not reveal an anonymous private post'
);
select is(
  (select count(*)::integer from public.get_resolved_post_cards(
    array(select ('90000000-0000-4000-8000-' || lpad((n + 1)::text, 12, '0'))::uuid
          from generate_series(1, 60) as fixtures(n))
  )),
  50,
  'Card resolver caps 60 independently visible requested cards at 50'
);
reset role;
select * from finish();
rollback;
