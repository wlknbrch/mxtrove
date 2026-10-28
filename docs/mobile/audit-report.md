# Phase0 audit results

Date: **2026-10-27**. Evidence scope: local source and read-only GitHub main comparison; no live production inspection. Contract baseline0.1.0.

This report records the original Phase0 execution. Contract0.1.1 refreshes source evidence after subsequent security maintenance; see [security checks](../security-audit.md) and the mobile changelog. The source inventory remains complete, while the original test totals below describe that initial run, not the later security test suite.

| Deliverable | Evidence | Status |
|---|---|---|
| All routes / user actions / feature APIs | router AST, all source JSX events/navigation/useMutation, API signatures and exact calls; parity.json/source-inventory.md | Complete source inventory:52 /707 /173 |
| All application tables / SQL functions / policies |46 ordered migrations;51 tables,2 views,142 latest function identities,108 named policies and full grant/revoke/dynamic statement history | Complete checked-in source; live catalog unknown |
| Worker endpoint contracts |24 explicit registrations +11 Fastify automatic HEADs; reviewed OpenAPI3.1, request/response/auth/side-effect/error semantics | Complete current-source baseline |
| Model/enum/native mapping | exact declarations, source-derived JSON schemas, scalar/null/sparse-card/waveform conventions | Complete baseline; SQL takes precedence over casts |
| Roles / visibility | six-role helper and operation matrix, four post visibilities, profile/DM/admin/share/protected distinctions | Source verified; live negative tests remain staging gate |
| Media/OAuth/deployment/errors | lifecycle, native differences and official references, current/default versus deployed/configured, safe retry | Documented with discrepancies and dependencies |
| Android-ready fixtures |27 synthetic payloads +20 client-error cases +portable role/visibility matrix | Offline decoder/behavior tests pass |
| Additive changes / architecture | B0–B9 dependency order, owner files and migration/test plans; explicit decisions | Ready for planning; no features falsely marked shipped |
| iOS0.1 handoff | ios-0.1-prompt.md | Ready; no app created |

## Checks actually executed

- **57/57 mobile contract tests passed** (Node22): source drift, route/API/endpoint coverage, RPC/table resolution, enum/schema closure, positive/negative DTO fixtures, SQL-helper-to-role projection, error/retry cases and documentation links.
- **120/120 existing web tests passed**, web TypeScript check and production build passed. The credential-free temporary build reported expected missing VITE_APP_URL placeholders; it did not use production settings or connect to a live backend.
- **38/38 existing worker tests passed**, worker TypeScript check and build passed.
- **Local SQL execution unavailable:** `supabase test db --local` failed to connect to local PostgreSQL. New eight-assertion `supabase/tests/mobile_contracts.sql` was added for normal isolated DB CI but is **not claimed passed**. No local Docker daemon/DB was available here; no hosted DB was substituted.
- No Simulator/device test is applicable to a docs/backend-contract phase. No Xcode project, migration, credential or runtime source was changed. Production deployment/registrations/grants remain unverified.

## Consequential findings

Existing authenticated metadata/RPC/Realtime and foreground worker APIs can be reused by native clients with the same identities and permissions. Native OAuth/storage/player integration is client work; APNs, robust upload idempotency/resume, draft conflicts and stronger media revocation need separate additive work/configuration.

Do not lose these boundaries: already-issued HMAC media URLs can survive revocation until expiry; share-use rules vary by resolver/playback/review; compact-card previousVersion selection needs a permission/projection review for private history; account deletion returns a timestamp and cannot delete remote originals using nonexistent server-held user tokens; OneDrive public-link revocation is unimplemented; saved connection rows are not cloud sessions; a web disk cache is not a native privacy policy. See decisions.md for unresolved choices and gates.

Phase0 source/documentation work is complete for the audited revision. This does not assert that production is mobile-ready or that the unexecuted SQL/staging suites passed. Foundation0.1 can proceed independently; live integrations must satisfy the documented gates.
