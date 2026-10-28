# Verification and exit evidence

## Offline checks (no production services)

```sh
# Node22, npm ci first only if dependencies are absent
npm run mobile:contracts:generate
npm run mobile:contracts:check
npm run check
npm --prefix services/media-worker run typecheck
npm --prefix services/media-worker test
npm --prefix services/media-worker run build
```

Contract checks verify source drift, exhaustive route/API/worker coverage, every referenced RPC/table, known enum/field schemas, portable positive/negative payloads, role fixture alignment with actual SQL helper thresholds, explicit retry safety and readable links. They do not start a server, read environment files, or mutate a database. Existing CI web job invokes npm run check, including the new contracts command.

## Local database enforcement

Only in an isolated development database with synthetic seed:

```sh
supabase db start
supabase test db
```

The new `supabase/tests/mobile_contracts.sql` checks compact waveform semantics, actual RPC return types, card limit and denied private IDs under anonymous JWT. It runs transactionally/rolls back and complements, not replaces, v1_rls.sql/v2_rls.sql. These commands require local container runtime; never substitute `db reset --linked` or run a synthetic seed on production. Record whether this suite actually ran; a source-only test is not its result.

## Required staging authorization matrix

Use synthetic owner, unrelated, follower, blocked, invited/removed and one user per accepted role (owner/admin/editor/contributor/reviewer/viewer). No personal production account/data. Verify direct HTTP/PostgREST calls, not just hidden controls:

| Scenario | Required evidence |
|---|---|
| Four post visibilities | owner/unrelated/anon/follower/linked-project member, blocked/deactivated/hidden; canonical URL versus valid share; public single with newer private previousVersion metadata |
| Project roles | read/edit/upload/review/member-role/remove/leave/transfer/delete, admin-vs-admin and owner protections |
| Version/source IDs | foreign song/original, allowed project version, removed member and altered target IDs |
| Protected bytes | signed/expired/forged URL, guest share read-url, invalid JWT, GET/HEAD/Range416, file gone410, deletion and residual signed URL after revoke |
| Share counters | resolve consumes once, target discovery doesn't, max_uses exhausted, read <= limit boundary, feedback review max-use decision |
| Messages/attachments | unrelated conversation, sender ownership, block/DM preference, references to inaccessible entities, signature/MIME mismatch, quota/limits |
| Profiles/social/admin | members_only guest denial, private follows, private notifications, public-only moderation, self-moderation prohibition |
| Auth/Terms/account | same IDs in web/native, consent versions, auth cancellation/recovery, recent auth deletion, grace/cancel, export access |
| Failure/retry | lost response on create/upload/send, worker restart, full upload interruption, provider reauth/revoke, stale draft overwrite |
| Cost/cache | warm navigate no duplicate list fetch, compact page request counts/bytes, no Edge Function media-body bytes, bounded protected URL/image prefetch |
| Realtime | snapshot/subscribe race, reconnect/foreground, permission removal, event dedup, account switch with active player |

A real native-device run comes later: Background Audio, interruptions/route changes, AVPlayer Range/expiry/seek and network transitions; each provider's actual iOS authorization; lock screen, battery and private cache purging. No Simulator or device evidence is claimed by Phase0.

## Exit interpretation

The checked-in source inventory/contract package can be complete while production compatibility is unknown. Unknown deployed state, OAuth registrations, local DB enforcement and architectural gates must remain visible. iOS0.1 foundation is independent of them. Any source drift adds a failing contract check and requires human review of parity/security semantics, not merely regeneration of JSON.
