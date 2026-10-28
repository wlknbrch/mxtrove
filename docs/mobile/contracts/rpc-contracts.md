# Supabase RPC and table contracts

For **all 142 SQL function identities**, [source-inventory.md](source-inventory.md) provides the latest signature, argument defaults, return type, SECURITY DEFINER status and source link. `inventory.json.functions[].sql` includes the entire effective function body, not an invented response schema. `calls` maps exact request argument objects to their web/worker callers; `sqlSecurityStatements` preserves ordered grants, revokes and dynamic SQL. Internal trigger functions are included, but not advertised as native endpoints.

Base transport: `${SUPABASE_URL}/rest/v1/rpc/<function>`, usually **POST JSON**, publishable `apikey`, current user `Authorization: Bearer <JWT>` for authenticated calls. Anonymous resolvers use the configured anonymous SDK context. Supabase Auth and Realtime have their own SDK contracts. Never use the worker's service-role calls from native.

## Required result conventions

| SQL return | JSON result | Native handling |
|---|---|---|
| `returns table (...)`, `setof` | array, including empty array | Don't decode as a single object even when one row expected |
| `returns jsonb` | arbitrary object/array/null as defined in body | Use dedicated response DTO and preserve version/discriminator |
| UUID/text/boolean/numeric | scalar | Do not require `{id:...}` or `{ok:...}` wrapper |
| void | empty/null according to PostgREST representation | Accept successful no-content; don't require JSON object |
| row composite | row object / SDK representation | Verify exact shape in local/staging catalog before a native write |
| RLS filtered table read | empty array/null often 200 | Not-found and not-authorized are intentionally indistinguishable |
| raised exception without ERRCODE | PostgREST error, commonly `P0001` | Human message is not a stable machine permission/error code |

## High-use contracts and side effects

| RPC / operation | Request / result / caveat |
|---|---|
| `get_resolved_post_cards` | `{target_post_ids: UUID[]}` → `[{post_id,card}]`; readable only, hard SQL limit 50, compact peaks; order restored client-side |
| `list_home_feed_post_ids`, `list_trending_public_post_ids` | limit_count/offset_count, exact defaults in generated signature; feed then bulk card RPC; do not query full relations per visible card |
| `search_public_catalog`, `search_v2_catalog`, `list_public_creators` | Exact arguments/casts in feed/search/follows API; result-kind discriminator determines destination |
| `get_current_profile_v2`, `get_profile_by_username_v2`, `get_profile_metrics_v2` | Privacy-aware projections, not interchangeable with unrestricted table `select *` |
| `follow_profile`, `unfollow_profile`, `toggle_version_heart` | Named target IDs; follow/unfollow are intent operations, toggle is not retry-safe after unknown outcome |
| `create_single_post`, `create_release_post`, `update_release_post` | SQL creation/update transaction does not encompass provider file publication or all client orchestration |
| `replace_release_credits`, `replace_release_external_links` | Replace whole collection, preserve ordering/authorization; avoid replay over concurrent edits |
| `resolve_share_link_target` | `{supplied_token}` → target type/null; checks active/expiry/use limit; does not consume a use |
| `resolve_shared_post`, `resolve_shared_project` | `{supplied_token}` → object; **consume share use and insert access log**; do not prefetch or automatically retry as a harmless GET |
| `create_share_link`, `revoke_share_link` | Owner/manager guards; raw token returned by creation; do not store token in analytics/fixture URLs |
| `create_shared_feedback_thread` | Share token plus version/track/timestamps/content; review permission and current target scope required, not general member rights |
| `request_media_processing_job`, `finalize_media_processing_job`, `cancel_media_processing_job` | Existing DB half of workflow, distinct from HTTP worker ack; see media lifecycle; finalization checks owner and preview relationship |
| `request_data_export` | export_format `json`/`json_csv` → UUID; poll own data_export_requests; worker produces a protected asset |
| `request_account_deletion` | grace_period_days/remove_cloud_files → scheduled `timestamptz` string, **not UUID**; recent auth within 10 minutes from JWT `amr`; clamps grace period to 1–30 days (default 14); cancellation separate |
| `update_appearance_settings`, `update_privacy_settings` | next_* arguments exactly match checked-in feature API; preserve existing defaults and unknown returned fields |

All 173 exported API functions, including direct table mutations and helpers, have individual call/argument records. Functions with no direct backend calls may orchestrate imported functions/provider adapters; they are not missing new endpoints. The dynamic resolve/reopen feedback choice is expanded and tested in parity generation.

## Grants and deployment verification

`20261020120000_mxtrove_explicit_api_privileges.sql` deliberately grants table SQL operations based on existing RLS policies; it does not mean all rows become readable or every helper becomes a client RPC. SECURITY DEFINER requires function-specific guards and explicit execute grants. Tables can have no native write operation even when a service-role worker writes them.

Before native staging integration, capture with a **local/staging** migrated database: `pg_proc` identities/arguments/results and function privileges for anon/authenticated, `pg_policies`, table grants, `pg_attribute` nullability and CHECK/FK constraints. Compare that catalog to the generated migration evidence. The static scanner preserves dynamic statements but does not evaluate them; production migration state is unknown. Do not repair/reset production migration history to match this document.
