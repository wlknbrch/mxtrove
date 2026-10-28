# Client errors and retry contract

Separate three layers: Supabase Auth SDK errors, PostgREST `{code,message,details,hint}`, and current worker `{error:string}` or upstream non-JSON. **There is no new server error envelope in Phase 0.** `ClientError` in wire-schemas.json is a portable native normalization target, not a claimed HTTP response.

| Client kind | Observable evidence | Required behavior |
|---|---|---|
| auth_required | validated auth/session failure; worker401 | refresh session at most once, then login; never replace with service role |
| reauth_required | recent-auth account gate / supported Auth error | explicit supported reauth; do not loop a write with old JWT |
| forbidden | explicit HTTP403 or PostgreSQL42501 | stop, rollback optimistic UI, purge unauthorized cached item |
| unavailable | RLS empty/null,404/410, missing file | neutral unavailable UI; do not distinguish private/nonexistent by probing |
| share_unavailable | share resolver invalid/expired/revoked/limit error | stop automatic open/refresh; user can request another link; no private ID fallback |
| quota_exceeded | explicit documented quota code/field if introduced | preserve committed original, show storage/quota remediation; current worker413 alone is ambiguous |
| payload_too_large | HTTP413 | size/quota UI; no retry of same bytes; current worker merges some quota and size exceptions |
| unsupported_media / validation | HTTP415/422/400 or validated field error | correct type/fields, preserve draft/local file |
| conflict |409 or future revision-conflict code | reconcile state, not automatic last-writer-wins overwrite |
| rate_limited |429 + Retry-After if present | parse seconds/date, bounded backoff+jitter on safe operations only |
| transient | network interruption/timeout/502/503/504 | retry bounded only when operation is safe; mutation timeout outcome may be unknown |
| cancelled | native task/URLSession cancellation or auth cancel | no scary server failure, no automatic resubmit |
| unknown | unexpected enum/status/non-JSON/malformed response | safe generic message, sanitized diagnostics, no content/credential logging |

The worker preserves the maintained limiter's429 response. For other exceptions it classifies by substrings: “bearer token”/“JWT” →401; “quota”/“size limit” →413; otherwise500 (generic text in production). SQL denials thrown from worker may become500; not all JWT library failures contain matching text. Never infer permission or retryability by English message matching in a new native client. Stable `code`, `retryable`, and a request ID are backlog B3.

Job failure `error_code` currently includes `processing_failed` and `worker_restart`; this is distinct from HTTP `{error}`. Unknown future job status should stop destructive recovery while allowing status refresh. 409 preview-not-ready is expected polling state; reading preview also mutates status. HEAD for automatically generated GET routes can retain GET side effects.

## Operation semantics beat HTTP verb

- Retry-safe reads: ordinary metadata list/get, job status, authenticated media byte range under current permission. Deduplicate concurrent requests and cap attempts/total time.
- Read-url POST: may be retried after auth/current permission check, but don't cache it as a permanent access grant; each result may expire at a different instant.
- **Not safe automatically**: send message, create release/song/version/job/attachment/share, consume share resolver, toggle heart/reaction, publish, destructive delete, cloud public-link edits, worker input upload, preview GET/implicit HEAD, account mutations.
- Existing job lookup reduces duplicate work but has a query/insert race and no durable idempotency ledger. POST timeout → operation status reconciliation, not unconditional retry.
- `upsertPostDraft` retry could overwrite a newer edit from another client. It has no revision precondition today.

Portable cases in fixtures cover null/not-found, share failure, auth/forbidden, quota/size,429,5xx, ambiguous network mutation and cancellation. They are intended as common decoder/behavior tests in Swift and Kotlin. Server-side rollout of codes must remain backwards-compatible with web's error string.
