# Mobile contract baseline — Phase 0

Contract baseline **0.1.1**, updated **2026-10-27**. This is a source audit and executable contract package for iOS and Android; no native app, migration, credential change or deployment is included.

## Evidence and scope

- Original Phase0 checkout: `fc3ee23cf2182f5f8d2a4617183fe3207050eedf` (`v1.2.1`), clean before Phase0. Contract0.1.1 includes the subsequent local security-maintenance changes; generated hashes describe the current source, not the unmodified base commit. Pin the commit containing these artifacts when integrating a native client.
- Masterplan / observed GitHub `main`: `c4afc05ba2cb614ca6e1d3be4838093877e854bc`. GitHub compare verified that the only intervening changes are README and eight real screenshots. Runtime source, migrations and worker are identical. The local checkout is deliberately not pulled/reset as part of this audit.
- Input: `MxTrove_iOS_Masterplan.md`, dated 2026-10-27, SHA256 `e9ea0ce065460648b16a74bf6f40dc336bd3eb0b7b6f1a85266aa873abbe5d54`. Its roadmap is a target, not proof of implemented or deployed APIs. Current code takes precedence; discrepancies are in [compatibility](compatibility.md).
- Production worker revision, applied database migrations, Supabase Auth redirect settings, signing algorithm and provider registrations: **unverified**. No production account, database, VPS or provider was accessed.
- Machine inventory: **52 web routes, 173 exported feature API functions, 707 UI event/navigation/mutation sites, 51 public tables, 142 SQL function identities, 108 surviving named policies, 24 explicitly registered worker method/path pairs**. Fastify also supplies implicit HEAD for GET routes unless explicitly registered; see OpenAPI.

## Read in this order

1. [Feature parity and action coverage](feature-parity.md), [exact generated route/API/SQL inventory](contracts/source-inventory.md), [machine inventory](contracts/inventory.json).
2. [Model/enum/SQL mapping](contracts/schema-map.md), [exact TypeScript declarations](contracts/models.md), [RPC conventions](contracts/rpc-contracts.md).
3. [Worker HTTP contracts](contracts/endpoints.md), [OpenAPI 3.1](contracts/api.openapi.yaml).
4. [Roles, visibility and authorization](authorization.md), [media lifecycle](contracts/media-lifecycle.md), [native OAuth](native-oauth.md).
5. [Errors and retry](contracts/errors.md), [cache/sync and deployment compatibility](compatibility.md), [ordered additive backlog and decisions](decisions.md).
6. [Portable fixtures](contracts/fixtures/README.md), [verification and staging gates](verification.md), [audit results](audit-report.md), [ready-to-run iOS 0.1 prompt](ios-0.1-prompt.md).

## Keeping the baseline honest

```sh
npm run mobile:contracts:generate
npm run mobile:contracts:check
```

Generation reads only checked-in source directories; it never reads `.env`, credentials, a linked database or remote service. The check is part of `npm run check`, so CI rejects stale source inventories, missing route/API/endpoint coverage and invalid fixtures. Source extraction is a TypeScript AST scan plus a quote-aware SQL statement scanner, **not** a PostgreSQL migration executor. Full SQL bodies and ordered grant/revoke/dynamic statements remain in the JSON so trigger helpers cannot be mistaken for public RPCs. CI's existing fresh-database/RLS suite is still required; local static checks do not establish a live security guarantee.

The native repositories must pin both a backend source revision and this contract version. No API advertised as a future addition here may be treated as deployed.
