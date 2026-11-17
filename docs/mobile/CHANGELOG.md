# Mobile contract changelog

## 2026-11-17 — additive release downloads and preview reliability

- Added author-only `GET /v1/releases/:postId/download-manifest`; native iOS/Android can reuse its versioned manifest and their existing private provider OAuth, then build the archive locally.
- Added input responses 409/413/422/507, exact-length validation and durable acceptance of complete queued files. Repeated input for active/finished jobs is rejected.
- Worker restarts resume queued files that remain on the configured volume; this does not provide resumable partial uploads or cross-device transfer sessions.
- No production deployment or database migration is required by the schema; web and worker builds must be deployed together for the new endpoint.

## 0.1.1 — 2026-10-27

- Refreshed source hashes/contracts after security maintenance; row/RPC schemas and route parity remain compatible.
- Documented strict public-media redirects, readiness rate limiting and bounded social image downloads; dependency migrations preserve native wire behavior.
- Native integrations must pin the containing source revision; production deployment remains unverified.

## 0.1.0 — 2026-10-27

- Established Phase0 source baseline for native iOS and later Android: complete route/action/API/table/function/policy/worker inventories and feature parity mapping.
- Added source-derived model/enum schemas, existing Worker OpenAPI, synthetic cross-platform payload/error/authorization fixtures, drift/coverage/decoder/retry tests and transactional SQL contract assertions.
- Documented native OAuth/session differences, media lifecycle, cache/egress constraints, deployed-version uncertainty and dependency-ordered additive backlog.
- Recorded current limits including residual signed-URL validity, inconsistent share-use checks, OneDrive public-link revocation, missing cloud account-deletion cleanup, draft concurrency and native push.
- Added isolated iOS0.1 foundation prompt. No runtime API, migration, credential, application UI or deployment change.
